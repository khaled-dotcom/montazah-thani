import hmac
import json
import os
import re
import sys
import time
import traceback
import uuid
from datetime import datetime, timedelta, timezone

# الردود والبيانات كلها عربي. لو الكونسول مش UTF-8 (ويندوز بيستخدم cp1252
# افتراضيًا)، أي print فيه حرف عربي بيرمي UnicodeEncodeError ويحوّل رد سليم
# لـ 500. نخلي الترميز آمن من البداية بدل ما نلاحق كل print.
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8", errors="replace")
    except (AttributeError, ValueError):
        pass

import click
from dotenv import load_dotenv
from flask import (
    Flask, abort, flash, g, jsonify, make_response, redirect,
    render_template, request, url_for,
)
from flask.cli import with_appcontext
from flask_login import (
    LoginManager, current_user, login_required, login_user, logout_user,
)
from flask_migrate import Migrate

load_dotenv()

from knowledge.pipeline import regenerate, run_post_approval_stage, run_pre_approval_stage
from knowledge.schemas import EntityType, GeneratedKnowledge, KnowledgeGenerationRequest
from knowledge.vector_store import ensure_vector_table
from models.models import (
    Appointment, AppointmentStatus, ChatMessage, Citizen, CityService,
    Complaint, ComplaintCategory, ComplaintStatus, District, RateLimitHit,
    RequestCounter, UsageLog, User, db,
)
from service.message_processor import IncomingMessage, run_agent
from software_services.appointment_services import AppointmentService
from software_services.citizen_services import CitizenService
from software_services.city_service_services import CityServiceService
from software_services.complaint_services import ComplaintService
from software_services.department_services import DepartmentService
from software_services.district_services import DistrictService
from software_services.user_services import UserService

# ── App & Config ──────────────────────────────────────────────────────────────

app = Flask(__name__)

secret_key = os.environ.get("SECRET_KEY")
if not secret_key:
    raise RuntimeError("SECRET_KEY must be set in environment — no default allowed in production")

db_uri = os.environ.get("SQLALCHEMY_DATABASE_URI")
if not db_uri:
    raise RuntimeError("SQLALCHEMY_DATABASE_URI must be set in environment")

app.config["SECRET_KEY"] = secret_key
app.config["SQLALCHEMY_DATABASE_URI"] = db_uri
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

# اتصالات ميتة بتحصل لما البوستجرس يقفل اتصال خامل — pre_ping بيكتشفها
# قبل ما الاستعلام يفشل قدام المواطن
app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
    "pool_pre_ping": True,
    "pool_recycle": 280,
}

# ── أمان الجلسة ───────────────────────────────────────────────────────────────
# SECURE_COOKIES=0 للتطوير المحلي على http. في الإنتاج لازم تفضل 1.
_secure_cookies = os.environ.get("SECURE_COOKIES", "1") != "0"

app.config.update(
    SESSION_COOKIE_HTTPONLY=True,     # جافاسكريبت ما تقدرش تقرأ كوكي الجلسة
    SESSION_COOKIE_SAMESITE="Lax",    # ما تتبعتش مع طلبات من مواقع تانية
    SESSION_COOKIE_SECURE=_secure_cookies,
    PERMANENT_SESSION_LIFETIME=timedelta(hours=12),
    MAX_CONTENT_LENGTH=4 * 1024 * 1024,   # سقف حجم الطلب
)

# ── ورا بروكسي ────────────────────────────────────────────────────────────────
# الخدمة دي عمرها ما بتواجه الإنترنت لوحدها: في compose قدامها nginx، وعلى
# Hugging Face Spaces قدامها بروكسي المنصّة. الاتنين بيفكّوا الـ TLS عندهم
# وبيوصّلوا الطلب جوّه على http، فـ Flask بيشوف السكيم http والـ IP بتاع
# البروكسي مش بتاع المواطن.
#
# ده مش تفصيلة شكلية: block_cross_site_writes تحت بيقارن الـ Origin اللي
# المتصفح باعته (https://…) بـ request.host_url، ومن غير التصحيح ده بتطلع
# http://… — يعني كل POST في الداشبورد بيرجع 403. والـ rate limit بيقرا
# remote_addr، ومن غير التصحيح ده بيبقى عنوان البروكسي، فكل المواطنين
# بيتحاسبوا على دلو واحد.
#
# TRUST_PROXY = عدد الهوبات اللي بينك وبين المواطن. الرقم ده مهم: ProxyFix
# بياخد العنصر رقم N من آخر X-Forwarded-For، والباقي على شماله العميل نفسه
# يقدر يكتبه. تحطه أكبر من الحقيقة يبقى أي حد ينتحل أي IP؛ أصغر تبقى
# بتحاسب البروكسي بدل المواطن.
#   1  = بروكسي واحد (nginx في compose) — الافتراضي
#   0  = من غير بروكسي خالص (flask run محلي)
# على منصّة سحابية اتأكد من الرقم بعد أول نشر: /whoami بيطبع اللي وصل.
_trust_proxy = int(os.environ.get("TRUST_PROXY", "1") or 0)
if _trust_proxy > 0:
    from werkzeug.middleware.proxy_fix import ProxyFix

    app.wsgi_app = ProxyFix(
        app.wsgi_app,
        x_for=_trust_proxy,
        x_proto=_trust_proxy,
        x_host=_trust_proxy,
        x_prefix=_trust_proxy,
    )

# اسم الجهة اللي بيظهر في الواجهة والـ widget
app.config["ORG_NAME"] = os.environ.get("ORG_NAME", "أحياء محافظة الإسكندرية")
app.config["ORG_SHORT"] = os.environ.get("ORG_SHORT", "خدمة المواطن")

db.init_app(app)
migrate = Migrate(app, db)

login_manager = LoginManager(app)
login_manager.login_view = "login"
login_manager.login_message = "يجب تسجيل الدخول أولاً"
login_manager.login_message_category = "error"

with app.app_context():
    ensure_vector_table()


# ── CORS for the embeddable widget ────────────────────────────────────────────
# الـ widget بيتركب على مواقع تانية، فالمتصفح محتاج إذن صريح.
# المسموح بيه بيتحدد من ALLOWED_ORIGINS، و"*" معناها أي موقع.
ALLOWED_ORIGINS = [
    o.strip() for o in os.environ.get("ALLOWED_ORIGINS", "*").split(",") if o.strip()
]


def _cors_origin():
    origin = request.headers.get("Origin", "")
    if "*" in ALLOWED_ORIGINS:
        return origin or "*"
    return origin if origin in ALLOWED_ORIGINS else None


# ── Shared secret for the site → assistant hop ────────────────────────────────
# في compose الخدمة دي بتعيش على شبكة داخلية ومحدش من برة يوصلها. على
# استضافة سحابية (Hugging Face Spaces مثلًا) الـ ingress عام، يعني أي حد
# يعرف العنوان يقدر يفتح شكاوى بأسماء مواطنين. الـ CORS مش بيمنع ده —
# هو بيقيّد المتصفحات بس، وأي curl بيعدّي منه.
#
# لو AGENT_TOKEN متظبط، /api/chat وبطاقات المواعيد بيطلبوا
# "Authorization: Bearer <token>" — والموقع بيبعته من الخادم (lib/agent.ts).
# سيبه فاضي وتفضل الخدمة مفتوحة زي الأول، وده الصح ورا شبكة خاصة بس.
#
# ملاحظة: تفعيله بيقفل الـ widget القابل للتركيب على مواقع تانية، لأن
# المتصفح مش هيقدر يحمل السر. ده مقصود — الـ Space ده بيخدم موقع واحد.
AGENT_TOKEN = os.environ.get("AGENT_TOKEN", "").strip()

# المسارات اللي السر بيحميها. البطاقة فيها اسم المواطن وميعاده، فهي
# مش أقل حساسية من المحادثة نفسها.
_PROTECTED_PREFIXES = ("/api/chat", "/static/uploads/tickets/", "/whoami")


@app.before_request
def require_agent_token():
    if not AGENT_TOKEN:
        return None

    # الـ preflight بيتبعت من غير هيدرز مخصصة، فرفضه بيكسر الطلب اللي بعده.
    if request.method == "OPTIONS":
        return None

    if not request.path.startswith(_PROTECTED_PREFIXES):
        return None

    header = request.headers.get("Authorization", "")
    scheme, _, presented = header.partition(" ")

    # compare_digest عشان المقارنة تاخد نفس الوقت مهما كان السر غلط.
    if scheme.lower() != "bearer" or not hmac.compare_digest(presented.strip(), AGENT_TOKEN):
        app.logger.warning("Rejected unauthenticated call to %s", request.path)
        return jsonify({
            "error": "unauthorized",
            "message": "عذرًا، الخدمة دي مش متاحة من هنا.",
        }), 401

    # الطلب جاي من الموقع نفسه، مش من متصفح مواطن على طول.
    g.trusted_caller = True
    return None


@app.before_request
def block_cross_site_writes():
    """
    CSRF defence for the dashboard.

    Every state-changing dashboard request must come from our own origin. A
    form auto-submitted from an attacker's page carries their Origin (or a
    foreign Referer), so it is rejected — the admin's session cookie alone is
    not enough to act on their behalf.

    Origin-checking is used instead of per-form tokens because it needs no
    change to any template, so there is no form that can be forgotten.
    /api/ is excluded on purpose: it is a public, cookie-less endpoint meant
    to be called from other sites, and it carries no privilege.
    """
    if request.method in ("GET", "HEAD", "OPTIONS"):
        return None

    if request.path.startswith("/api/"):
        return None

    origin = request.headers.get("Origin")
    referer = request.headers.get("Referer")
    host = request.host_url.rstrip("/")

    if origin:
        if origin.rstrip("/") != host:
            app.logger.warning("Blocked cross-origin write from %s to %s", origin, request.path)
            abort(403)
        return None

    if referer:
        if not referer.startswith(host + "/"):
            app.logger.warning("Blocked cross-site write (referer %s) to %s", referer, request.path)
            abort(403)
        return None

    # مفيش Origin ولا Referer — المتصفحات بتبعت واحد منهم على الأقل في
    # طلبات الفورم، فده على الأرجح عميل آلي. مسموح بيه من نفس الجهاز فقط
    # عشان أوامر الصيانة، ومرفوض غير كده.
    if request.remote_addr not in ("127.0.0.1", "::1"):
        app.logger.warning("Blocked write with no Origin/Referer to %s", request.path)
        abort(403)

    return None


@app.after_request
def apply_security_headers(response):
    """Baseline hardening headers for the dashboard and chat pages."""
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("Referrer-Policy", "same-origin")

    # صفحات الشات لازم تفضل قابلة للتحميل في iframe على مواقع الأحياء،
    # لكن باقي الموقع — وأهمه الداشبورد — لأ
    if request.path not in ("/widget",) and not request.path.startswith("/static/"):
        response.headers.setdefault("X-Frame-Options", "SAMEORIGIN")

    return response


@app.after_request
def apply_cors(response):
    if request.path.startswith("/api/") or request.path == "/embed.js":
        origin = _cors_origin()
        if origin:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Vary"] = "Origin"
            response.headers["Access-Control-Allow-Headers"] = "Content-Type"
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    return response


# ── Rate limiting ─────────────────────────────────────────────────────────────
# /api/chat مفتوح للعامة وكل طلب بيكلف tokens، فمحتاج سقف.

RATE_LIMIT_WINDOW = 60          # ثانية
RATE_LIMIT_MAX = int(os.environ.get("CHAT_RATE_LIMIT", "12"))   # رسالة في الدقيقة


def _rate_limited(key: str) -> bool:
    """
    Counts requests in the shared database, not in process memory.

    An in-memory counter is per-worker: with two gunicorn workers the real
    limit is double the configured one, and it resets on every deploy. Since
    each request costs LLM tokens, that gap is money.
    """
    try:
        cutoff = datetime.now(timezone.utc) - timedelta(seconds=RATE_LIMIT_WINDOW)

        db.session.execute(
            db.text("DELETE FROM rate_limit_hits WHERE created_at < :cutoff"),
            {"cutoff": datetime.now(timezone.utc) - timedelta(seconds=RATE_LIMIT_WINDOW * 10)},
        )

        used = db.session.execute(
            db.text(
                "SELECT COUNT(*) FROM rate_limit_hits "
                "WHERE bucket_key = :key AND created_at >= :cutoff"
            ),
            {"key": key, "cutoff": cutoff},
        ).scalar() or 0

        if used >= RATE_LIMIT_MAX:
            db.session.commit()
            return True

        db.session.execute(
            db.text(
                "INSERT INTO rate_limit_hits (bucket_key, created_at) "
                "VALUES (:key, :now)"
            ),
            {"key": key, "now": datetime.now(timezone.utc)},
        )
        db.session.commit()
        return False

    except Exception as e:
        # لو العدّاد نفسه وقع، ما نمنعش المواطن من الخدمة
        db.session.rollback()
        app.logger.warning("Rate limiter unavailable: %s", e)
        return False


# ── Auth plumbing ─────────────────────────────────────────────────────────────

@login_manager.user_loader
def load_user(user_id):
    return db.session.get(User, int(user_id))


@app.context_processor
def inject_globals():
    pending_complaints = 0
    pending_appointments = 0

    try:
        if current_user.is_authenticated:
            scope = _scoped_district_id()
            complaint_query = Complaint.query.filter_by(status=ComplaintStatus.PENDING)
            appointment_query = Appointment.query.filter_by(status=AppointmentStatus.PENDING)

            if scope:
                complaint_query = complaint_query.filter_by(district_id=scope)
                appointment_query = appointment_query.filter_by(district_id=scope)

            pending_complaints = complaint_query.count()
            pending_appointments = appointment_query.count()
    except Exception:
        pass

    return {
        "pending_complaints_count": pending_complaints,
        "pending_appointments_count": pending_appointments,
        "org_name": app.config["ORG_NAME"],
        "current_year": datetime.now().year,
    }


def _scoped_district_id():
    """
    موظف الحي بيشوف بيانات حيه بس. المدير العام (district_id = None) بيشوف الكل.
    """
    try:
        if current_user.is_authenticated and current_user.district_id:
            return current_user.district_id
    except Exception:
        pass
    return None


def _int_arg(name, default=None):
    raw = request.args.get(name) or request.form.get(name)
    if raw in (None, "", "None"):
        return default
    try:
        return int(raw)
    except (TypeError, ValueError):
        return default


# ══════════════════════════════════════════════════════════════════════════════
#  PUBLIC — chat
# ══════════════════════════════════════════════════════════════════════════════

SESSION_ID_PATTERN = re.compile(r"^[A-Za-z0-9_-]{8,64}$")
MAX_MESSAGE_LENGTH = 1500


@app.route("/")
def index():
    return redirect(url_for("chat_page"))


@app.route("/chat")
def chat_page():
    """صفحة الشات الكاملة."""
    district_id = _int_arg("district")
    district = db.session.get(District, district_id) if district_id else None

    return render_template(
        "chat/page.html",
        district=district,
        districts=DistrictService.get_all_flat(),
    )


@app.route("/widget")
def chat_widget():
    """محتوى الـ iframe اللي بيتحط جوه الفقاعة."""
    district_id = _int_arg("district")
    district = db.session.get(District, district_id) if district_id else None

    response = make_response(
        render_template("chat/widget.html", district=district)
    )
    # الصفحة دي المفروض تتحمّل جوه iframe على مواقع تانية
    response.headers.pop("X-Frame-Options", None)
    return response


@app.route("/embed.js")
def embed_script():
    """
    سكريبت التضمين. سطر واحد في أي موقع بيركّب فقاعة الشات:

        <script src="https://HOST/embed.js" data-district="3" defer></script>
    """
    # الملف ده .js فمفيش autoescaping — نمرّر الرابط كـ JSON literal
    response = make_response(
        render_template(
            "chat/embed.js",
            base_url=json.dumps(request.url_root.rstrip("/")),
        )
    )
    response.headers["Content-Type"] = "application/javascript; charset=utf-8"
    response.headers["Cache-Control"] = "public, max-age=300"
    return response


@app.route("/api/session", methods=["GET", "POST", "OPTIONS"])
def api_session():
    """يولّد معرّف جلسة جديد للمتصفح."""
    if request.method == "OPTIONS":
        return ("", 204)
    return jsonify({"session_id": uuid.uuid4().hex})


@app.route("/api/chat", methods=["POST", "OPTIONS"])
def api_chat():
    if request.method == "OPTIONS":
        return ("", 204)

    payload = request.get_json(silent=True) or {}

    session_id = str(payload.get("session_id") or "").strip()
    message_text = str(payload.get("message") or "").strip()
    district_id = payload.get("district_id")

    # ── validation ────────────────────────────────────────────────────────────
    if not session_id or not SESSION_ID_PATTERN.match(session_id):
        return jsonify({"error": "invalid_session", "message": "جلسة غير صالحة"}), 400

    if not message_text:
        return jsonify({"error": "empty_message", "message": "الرسالة فارغة"}), 400

    if len(message_text) > MAX_MESSAGE_LENGTH:
        return jsonify({
            "error": "message_too_long",
            "message": f"الرسالة طويلة جدًا. الحد الأقصى {MAX_MESSAGE_LENGTH} حرف.",
        }), 400

    try:
        district_id = int(district_id) if district_id else None
    except (TypeError, ValueError):
        district_id = None

    # ── rate limit ────────────────────────────────────────────────────────────
    # remote_addr بعد ProxyFix هو آخر عنوان في X-Forwarded-For — اللي البروكسي
    # بتاعنا كتبه بنفسه. قراية الهيدر بالإيد وأخد أول عنصر فيه كانت بتاخد اللي
    # العميل كتبه، وهو يقدر يحط أي حاجة — يعني حد عايز يعدّي حد الرسايل كان
    # بس بيغيّر الهيدر كل مرة.
    client_ip = (request.remote_addr or "").strip()

    # دلو الجلسة بيتحاسب دايمًا: ده بيحمي كل محادثة لوحدها.
    #
    # دلو الـ IP لأ. الموقع بيكلّم المساعد من الخادم، يعني كل مواطنين الحي
    # بيوصلوا من IP واحد — بتاع Vercel. لو حاسبنا عليه، الـ 12 رسالة في
    # الدقيقة بتبقى سقف الحي كله، والمواطن رقم 13 بيتقاله "بعتّ رسائل كتير"
    # وهو باعت واحدة. الموقع أصلًا بيحدّد لكل مواطن على حدة قبل ما يوصلنا
    # (app/api/chat/route.ts)، فالتحديد موجود، بس فوق مش هنا.
    #
    # الطلبات اللي مش من الموقع بتفضل متحاسبة بالـ IP زي الأول.
    limited = _rate_limited(session_id)
    if not limited and not getattr(g, "trusted_caller", False):
        limited = _rate_limited(f"ip:{client_ip}")

    if limited:
        return jsonify({
            "error": "rate_limited",
            "message": "بعتّ رسائل كتير بسرعة. استنى شوية وحاول تاني.",
        }), 429

    # ── run the agent ─────────────────────────────────────────────────────────
    message = IncomingMessage(
        session_id=session_id,
        text=message_text,
        district_id=district_id,
        user_agent=request.headers.get("User-Agent"),
        ip_address=client_ip,
    )

    result = run_agent(message)

    return jsonify({
        "reply":      result["reply"],
        "intent":     result["intent"],
        "reference":  result["reference"],
        "ticket_url": result["ticket_url"],
        "session_id": session_id,
    })


@app.errorhandler(Exception)
def handle_unexpected_error(error):
    """
    A citizen mid-conversation should never see a raw 500. API callers get a
    JSON apology they can render in the chat bubble; dashboard users get the
    normal Flask error page so problems stay visible to staff.
    """
    # نسيب أخطاء HTTP المقصودة (404, 403, 429...) تعدي زي ما هي
    if hasattr(error, "code") and isinstance(error.code, int):
        return error

    app.logger.error("Unhandled error on %s: %s", request.path, traceback.format_exc())

    if request.path.startswith("/api/"):
        return jsonify({
            "error": "server_error",
            "message": "عذرًا، حصل خطأ مؤقت. ممكن تحاول تاني بعد لحظات؟",
        }), 500

    raise error


@app.route("/api/districts", methods=["GET", "OPTIONS"])
def api_districts():
    """قائمة الأحياء — الـ widget بيستخدمها لو الموقع مش مربوط بحي معين."""
    if request.method == "OPTIONS":
        return ("", 204)

    return jsonify([
        {"id": d.id, "name": d.name, "zone": d.zone}
        for d in DistrictService.get_all_flat()
    ])


@app.route("/whoami")
def whoami():
    """
    بيقول إيه اللي وصل للتطبيق بعد البروكسي — عشان تظبط TRUST_PROXY.

    اللي يهمك حاجتين: `scheme` لازم يبقى https (لو http يبقى الداشبورد
    هيرجّع 403 على كل POST)، و`client` لازم يبقى IP المواطن مش IP البروكسي.
    لو `client` طلع عنوان داخلي، زوّد TRUST_PROXY هوب وجرّب تاني.

    محمي بـ AGENT_TOKEN زي /api/chat — عناوين المواطنين مش حاجة تتنشر.
    """
    return jsonify({
        "scheme": request.scheme,
        "host_url": request.host_url,
        "client": request.remote_addr,
        "x_forwarded_for": request.headers.get("X-Forwarded-For"),
        "x_forwarded_proto": request.headers.get("X-Forwarded-Proto"),
        "trust_proxy": _trust_proxy,
        # لو true، دلو الـ IP في rate limiting بيتخطى — شوف api_chat.
        "trusted_caller": bool(getattr(g, "trusted_caller", False)),
    })


@app.route("/health")
def health():
    try:
        db.session.execute(db.text("SELECT 1"))
        return jsonify({"status": "ok"}), 200
    except Exception as e:
        return jsonify({"status": "degraded", "error": str(e)}), 503


# ══════════════════════════════════════════════════════════════════════════════
#  ADMIN — auth
# ══════════════════════════════════════════════════════════════════════════════

@app.route("/login", methods=["GET", "POST"])
def login():
    if current_user.is_authenticated:
        return redirect(url_for("dashboard"))

    if request.method == "POST":
        username = (request.form.get("username") or "").strip().lower()
        password = request.form.get("password") or ""

        user, message = UserService.login_user(username, password)

        if user:
            login_user(user)
            return redirect(url_for("dashboard"))

        flash(message, "error")

    return render_template("login.html")


@app.route("/logout")
@login_required
def logout():
    logout_user()
    flash("تم تسجيل الخروج بنجاح", "success")
    return redirect(url_for("login"))


# ══════════════════════════════════════════════════════════════════════════════
#  ADMIN — dashboard
# ══════════════════════════════════════════════════════════════════════════════

@app.route("/dashboard")
@login_required
def dashboard():
    scope = _scoped_district_id()

    complaint_stats = ComplaintService.get_stats(district_id=scope)
    appointment_stats = AppointmentService.get_stats(district_id=scope)
    category_breakdown = ComplaintService.get_category_breakdown(district_id=scope)

    recent_complaints_query = Complaint.query
    recent_appointments_query = Appointment.query

    if scope:
        recent_complaints_query = recent_complaints_query.filter_by(district_id=scope)
        recent_appointments_query = recent_appointments_query.filter_by(district_id=scope)

    recent_complaints = (
        recent_complaints_query.order_by(Complaint.created_at.desc()).limit(6).all()
    )
    recent_appointments = (
        recent_appointments_query.order_by(Appointment.created_at.desc()).limit(6).all()
    )

    # نشاط الشات آخر ٧ أيام
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    chat_sessions_week = Citizen.query.filter(Citizen.created_at >= week_ago).count()
    messages_week = ChatMessage.query.filter(ChatMessage.created_at >= week_ago).count()

    cost_week = (
        db.session.query(db.func.coalesce(db.func.sum(UsageLog.cost_usd), 0.0))
        .filter(UsageLog.created_at >= week_ago)
        .scalar()
    )

    return render_template(
        "dashboard.html",
        complaint_stats=complaint_stats,
        appointment_stats=appointment_stats,
        category_breakdown=category_breakdown,
        recent_complaints=recent_complaints,
        recent_appointments=recent_appointments,
        districts_count=District.query.count(),
        services_count=CityService.query.count(),
        chat_sessions_week=chat_sessions_week,
        messages_week=messages_week,
        cost_week=cost_week or 0.0,
    )


# ══════════════════════════════════════════════════════════════════════════════
#  ADMIN — districts
# ══════════════════════════════════════════════════════════════════════════════

@app.route("/districts")
@login_required
def list_districts():
    pagination, _ = DistrictService.get_all(
        page=_int_arg("page", 1),
        search=request.args.get("search"),
    )
    return render_template("districts/list.html", pagination=pagination,
                           search=request.args.get("search", ""))


@app.route("/districts/create", methods=["GET", "POST"])
@login_required
def create_district():
    if request.method == "POST":
        district, message = DistrictService.create(
            name=request.form.get("name"),
            zone=request.form.get("zone"),
            address=request.form.get("address"),
            phone=request.form.get("phone"),
            hotline=request.form.get("hotline"),
            email=request.form.get("email"),
            working_hours=request.form.get("working_hours"),
            head_name=request.form.get("head_name"),
            map_url=request.form.get("map_url"),
            coverage=request.form.get("coverage"),
            info=request.form.get("info"),
        )
        flash(message, "success" if district else "error")
        if district:
            return redirect(url_for("list_districts"))

    return render_template("districts/create.html")


@app.route("/districts/<int:district_id>/edit", methods=["GET", "POST"])
@login_required
def edit_district(district_id):
    district, message = DistrictService.get_by_id(district_id)
    if not district:
        flash(message, "error")
        return redirect(url_for("list_districts"))

    if request.method == "POST":
        updated, message = DistrictService.update(
            district_id,
            name=request.form.get("name"),
            zone=request.form.get("zone"),
            address=request.form.get("address"),
            phone=request.form.get("phone"),
            hotline=request.form.get("hotline"),
            email=request.form.get("email"),
            working_hours=request.form.get("working_hours"),
            head_name=request.form.get("head_name"),
            map_url=request.form.get("map_url"),
            coverage=request.form.get("coverage"),
            info=request.form.get("info"),
            is_active=bool(request.form.get("is_active")),
        )
        flash(message, "success" if updated else "error")
        if updated:
            return redirect(url_for("list_districts"))

    return render_template("districts/edit.html", district=district)


@app.route("/districts/<int:district_id>/departments", methods=["GET", "POST"])
@login_required
def district_departments(district_id):
    """الإدارات المختصة داخل الحي — هي اللي البلاغات بتتحوّل ليها."""
    district, message = DistrictService.get_by_id(district_id)
    if not district:
        flash(message, "error")
        return redirect(url_for("list_districts"))

    if request.method == "POST":
        if request.form.get("action") == "seed":
            created = DepartmentService.seed_defaults(district_id)
            flash(f"تم إنشاء {created} إدارة افتراضية — املأ التليفونات والإيميلات",
                  "success" if created else "error")
        else:
            saved, message = DepartmentService.upsert(
                district_id=district_id,
                category=request.form.get("category"),
                name=request.form.get("name"),
                manager=request.form.get("manager"),
                phone=request.form.get("phone"),
                email=request.form.get("email"),
                is_active=bool(request.form.get("is_active")),
            )
            flash(message, "success" if saved else "error")

        return redirect(url_for("district_departments", district_id=district_id))

    return render_template(
        "districts/departments.html",
        district=district,
        departments=DepartmentService.get_for_district(district_id),
        categories=list(ComplaintCategory),
    )


@app.route("/departments/<int:department_id>/delete", methods=["POST"])
@login_required
def delete_department(department_id):
    department, _ = DepartmentService.get_by_id(department_id)
    district_id = department.district_id if department else None

    deleted, message = DepartmentService.delete(department_id)
    flash(message, "success" if deleted else "error")

    if district_id:
        return redirect(url_for("district_departments", district_id=district_id))
    return redirect(url_for("list_districts"))


@app.route("/districts/<int:district_id>/delete", methods=["POST"])
@login_required
def delete_district(district_id):
    deleted, message = DistrictService.delete(district_id)
    flash(message, "success" if deleted else "error")
    return redirect(url_for("list_districts"))


# ══════════════════════════════════════════════════════════════════════════════
#  ADMIN — services
# ══════════════════════════════════════════════════════════════════════════════

@app.route("/services")
@login_required
def list_services():
    pagination, _ = CityServiceService.get_all(
        page=_int_arg("page", 1),
        search=request.args.get("search"),
        district_id=_int_arg("district") or _scoped_district_id(),
        category=request.args.get("category"),
    )
    return render_template(
        "services/list.html",
        pagination=pagination,
        districts=DistrictService.get_all_flat(),
        categories=CityServiceService.get_categories(),
        search=request.args.get("search", ""),
    )


@app.route("/services/create", methods=["GET", "POST"])
@login_required
def create_service():
    if request.method == "POST":
        service, message = CityServiceService.create(
            name=request.form.get("name"),
            district_id=_int_arg("district_id"),
            category=request.form.get("category"),
            department=request.form.get("department"),
            description=request.form.get("description"),
            fees=request.form.get("fees"),
            fees_note=request.form.get("fees_note"),
            required_documents=request.form.get("required_documents"),
            duration=request.form.get("duration"),
            steps=request.form.get("steps"),
            is_bookable=bool(request.form.get("is_bookable")),
        )
        flash(message, "success" if service else "error")
        if service:
            return redirect(url_for("list_services"))

    return render_template("services/create.html", districts=DistrictService.get_all_flat())


@app.route("/services/<int:service_id>/edit", methods=["GET", "POST"])
@login_required
def edit_service(service_id):
    service, message = CityServiceService.get_by_id(service_id)
    if not service:
        flash(message, "error")
        return redirect(url_for("list_services"))

    if request.method == "POST":
        updated, message = CityServiceService.update(
            service_id,
            name=request.form.get("name"),
            district_id=_int_arg("district_id"),
            category=request.form.get("category"),
            department=request.form.get("department"),
            description=request.form.get("description"),
            fees=request.form.get("fees"),
            fees_note=request.form.get("fees_note"),
            required_documents=request.form.get("required_documents"),
            duration=request.form.get("duration"),
            steps=request.form.get("steps"),
            is_bookable=bool(request.form.get("is_bookable")),
            is_active=bool(request.form.get("is_active")),
        )
        flash(message, "success" if updated else "error")
        if updated:
            return redirect(url_for("list_services"))

    return render_template(
        "services/edit.html",
        service=service,
        districts=DistrictService.get_all_flat(),
    )


@app.route("/services/<int:service_id>/delete", methods=["POST"])
@login_required
def delete_service(service_id):
    deleted, message = CityServiceService.delete(service_id)
    flash(message, "success" if deleted else "error")
    return redirect(url_for("list_services"))


# ══════════════════════════════════════════════════════════════════════════════
#  ADMIN — knowledge pipeline
# ══════════════════════════════════════════════════════════════════════════════

_KNOWLEDGE_TARGETS = {
    "service": (CityService, EntityType.SERVICE, "list_services"),
    "district": (District, EntityType.DISTRICT, "list_districts"),
}


def _knowledge_request(entity, entity_type: EntityType) -> KnowledgeGenerationRequest:
    if entity_type == EntityType.SERVICE:
        return KnowledgeGenerationRequest(
            name=entity.name,
            category=entity.category,
            department=entity.department,
            required_documents=entity.required_documents,
            duration=entity.duration,
            fees=entity.fees,
            entity_type=entity_type,
            entity_id=entity.id,
        )

    return KnowledgeGenerationRequest(
        name=entity.name,
        category=entity.zone,
        required_documents=entity.coverage,
        entity_type=entity_type,
        entity_id=entity.id,
    )


@app.route("/knowledge/<target>/<int:entity_id>")
@login_required
def review_knowledge(target, entity_id):
    if target not in _KNOWLEDGE_TARGETS:
        abort(404)

    model, entity_type, _ = _KNOWLEDGE_TARGETS[target]
    entity = db.session.get(model, entity_id)
    if not entity:
        abort(404)

    return render_template(
        "knowledge/review.html",
        target=target,
        entity=entity,
        entity_type=entity_type.value,
        generated=None,
    )


@app.route("/knowledge/<target>/<int:entity_id>/generate", methods=["POST"])
@login_required
def generate_knowledge_route(target, entity_id):
    if target not in _KNOWLEDGE_TARGETS:
        abort(404)

    model, entity_type, _ = _KNOWLEDGE_TARGETS[target]
    entity = db.session.get(model, entity_id)
    if not entity:
        abort(404)

    knowledge_request = _knowledge_request(entity, entity_type)

    previous_raw = request.form.get("previous_output")
    feedback = request.form.get("admin_feedback")

    try:
        if previous_raw:
            import json
            previous = GeneratedKnowledge(**json.loads(previous_raw))
            generated = regenerate(knowledge_request, previous, feedback)
        else:
            generated = run_pre_approval_stage(knowledge_request)

    except Exception as e:
        flash(f"فشل توليد المعرفة: {e}", "error")
        return redirect(url_for("review_knowledge", target=target, entity_id=entity_id))

    return render_template(
        "knowledge/review.html",
        target=target,
        entity=entity,
        entity_type=entity_type.value,
        generated=generated,
    )


@app.route("/knowledge/<target>/<int:entity_id>/approve", methods=["POST"])
@login_required
def approve_knowledge_route(target, entity_id):
    if target not in _KNOWLEDGE_TARGETS:
        abort(404)

    model, entity_type, redirect_endpoint = _KNOWLEDGE_TARGETS[target]
    entity = db.session.get(model, entity_id)
    if not entity:
        abort(404)

    description = (request.form.get("description") or "").strip()
    aliases = [a.strip() for a in (request.form.get("aliases") or "").split(",") if a.strip()]
    keywords = [k.strip() for k in (request.form.get("keywords") or "").split(",") if k.strip()]

    if not description:
        flash("الوصف مطلوب قبل الاعتماد", "error")
        return redirect(url_for("review_knowledge", target=target, entity_id=entity_id))

    final = GeneratedKnowledge(description=description, aliases=aliases, keywords=keywords)
    final.construct_search_text(entity.name)

    try:
        run_post_approval_stage(
            entity_id=entity.id,
            entity_type=entity_type,
            name=entity.name,
            final_knowledge=final,
        )
        flash("تم اعتماد المعرفة وإضافتها لمحرك البحث", "success")

    except Exception as e:
        flash(f"فشل اعتماد المعرفة: {e}", "error")

    return redirect(url_for(redirect_endpoint))


# ══════════════════════════════════════════════════════════════════════════════
#  ADMIN — complaints
# ══════════════════════════════════════════════════════════════════════════════

@app.route("/complaints")
@login_required
def list_complaints():
    pagination, _ = ComplaintService.get_all(
        page=_int_arg("page", 1),
        search=request.args.get("search"),
        status=request.args.get("status"),
        district_id=_int_arg("district") or _scoped_district_id(),
        category=request.args.get("category"),
    )
    return render_template(
        "complaints/list.html",
        pagination=pagination,
        districts=DistrictService.get_all_flat(),
        statuses=list(ComplaintStatus),
        categories=list(ComplaintCategory),
        search=request.args.get("search", ""),
    )


@app.route("/complaints/<int:complaint_id>")
@login_required
def complaint_detail(complaint_id):
    complaint, message = ComplaintService.get_by_id(complaint_id)
    if not complaint:
        flash(message, "error")
        return redirect(url_for("list_complaints"))

    return render_template(
        "complaints/detail.html",
        complaint=complaint,
        statuses=list(ComplaintStatus),
        districts=DistrictService.get_all_flat(),
        chat_messages=(
            CitizenService.get_messages(complaint.session_id)
            if complaint.session_id else []
        ),
    )


@app.route("/complaints/<int:complaint_id>/status", methods=["POST"])
@login_required
def update_complaint_status(complaint_id):
    result = ComplaintService.update_status(
        complaint_id,
        request.form.get("status"),
        staff_note=request.form.get("staff_note"),
    )
    flash(result.message, "success" if result.success else "error")
    return redirect(url_for("complaint_detail", complaint_id=complaint_id))


@app.route("/complaints/<int:complaint_id>/assign", methods=["POST"])
@login_required
def assign_complaint(complaint_id):
    result = ComplaintService.assign_district(complaint_id, _int_arg("district_id"))
    flash(result.message, "success" if result.success else "error")
    return redirect(url_for("complaint_detail", complaint_id=complaint_id))


@app.route("/complaints/<int:complaint_id>/delete", methods=["POST"])
@login_required
def delete_complaint(complaint_id):
    result = ComplaintService.delete_complaint(complaint_id)
    flash(result.message, "success" if result.success else "error")
    return redirect(url_for("list_complaints"))


# ══════════════════════════════════════════════════════════════════════════════
#  ADMIN — appointments
# ══════════════════════════════════════════════════════════════════════════════

@app.route("/appointments")
@login_required
def list_appointments():
    pagination, _ = AppointmentService.get_all(
        page=_int_arg("page", 1),
        search=request.args.get("search"),
        status=request.args.get("status"),
        district_id=_int_arg("district") or _scoped_district_id(),
    )
    return render_template(
        "appointments/list.html",
        pagination=pagination,
        districts=DistrictService.get_all_flat(),
        statuses=list(AppointmentStatus),
        search=request.args.get("search", ""),
    )


@app.route("/appointments/<int:appointment_id>")
@login_required
def appointment_detail(appointment_id):
    appointment, message = AppointmentService.get_by_id(appointment_id)
    if not appointment:
        flash(message, "error")
        return redirect(url_for("list_appointments"))

    return render_template(
        "appointments/detail.html",
        appointment=appointment,
        statuses=list(AppointmentStatus),
        districts=DistrictService.get_all_flat(),
        chat_messages=(
            CitizenService.get_messages(appointment.session_id)
            if appointment.session_id else []
        ),
    )


@app.route("/appointments/new", methods=["GET", "POST"])
@login_required
def create_appointment():
    if request.method == "POST":
        district_id = _int_arg("district_id")
        district = db.session.get(District, district_id) if district_id else None

        result = AppointmentService.create_appointment(
            name=request.form.get("name"),
            phone_number=request.form.get("phone_number"),
            details=request.form.get("details"),
            date=request.form.get("date"),
            district_name=district.name if district else None,
            national_id=request.form.get("national_id"),
            email=request.form.get("email"),
            comes_from="dashboard",
        )
        flash(result.message, "success" if result.success else "error")
        if result.success:
            return redirect(url_for("list_appointments"))

    return render_template("appointments/create.html", districts=DistrictService.get_all_flat())


@app.route("/appointments/<int:appointment_id>/edit", methods=["GET", "POST"])
@login_required
def edit_appointment(appointment_id):
    appointment, message = AppointmentService.get_by_id(appointment_id)
    if not appointment:
        flash(message, "error")
        return redirect(url_for("list_appointments"))

    if request.method == "POST":
        result = AppointmentService.update_appointment(
            appointment_id,
            name=request.form.get("name"),
            phone_number=request.form.get("phone_number"),
            national_id=request.form.get("national_id"),
            email=request.form.get("email"),
            details=request.form.get("details"),
            date=request.form.get("date"),
            district_id=_int_arg("district_id"),
        )
        flash(result.message, "success" if result.success else "error")
        if result.success:
            return redirect(url_for("appointment_detail", appointment_id=appointment_id))

    return render_template(
        "appointments/edit.html",
        appointment=appointment,
        districts=DistrictService.get_all_flat(),
    )


@app.route("/appointments/<int:appointment_id>/status", methods=["POST"])
@login_required
def update_appointment_status(appointment_id):
    result = AppointmentService.update_status(
        appointment_id,
        request.form.get("status"),
        staff_note=request.form.get("staff_note"),
    )
    flash(result.message, "success" if result.success else "error")
    return redirect(url_for("appointment_detail", appointment_id=appointment_id))


@app.route("/appointments/<int:appointment_id>/delete", methods=["POST"])
@login_required
def delete_appointment(appointment_id):
    result = AppointmentService.delete_appointment(appointment_id)
    flash(result.message, "success" if result.success else "error")
    return redirect(url_for("list_appointments"))


# ══════════════════════════════════════════════════════════════════════════════
#  ADMIN — conversations
# ══════════════════════════════════════════════════════════════════════════════

@app.route("/conversations")
@login_required
def list_conversations():
    pagination, _ = CitizenService.get_all(
        page=_int_arg("page", 1),
        search=request.args.get("search"),
        district_id=_scoped_district_id(),
    )
    return render_template(
        "conversations/list.html",
        pagination=pagination,
        search=request.args.get("search", ""),
    )


@app.route("/conversations/<session_id>")
@login_required
def conversation_detail(session_id):
    citizen = CitizenService.get(session_id)
    if not citizen:
        flash("المحادثة غير موجودة", "error")
        return redirect(url_for("list_conversations"))

    return render_template(
        "conversations/detail.html",
        citizen=citizen,
        messages=CitizenService.get_messages(session_id),
        complaints=Complaint.query.filter_by(session_id=session_id).all(),
        appointments=Appointment.query.filter_by(session_id=session_id).all(),
    )


@app.route("/conversations/<session_id>/delete", methods=["POST"])
@login_required
def delete_conversation(session_id):
    deleted, message = CitizenService.delete_session(session_id)
    flash(message, "success" if deleted else "error")
    return redirect(url_for("list_conversations"))


# ══════════════════════════════════════════════════════════════════════════════
#  ADMIN — users
# ══════════════════════════════════════════════════════════════════════════════

@app.route("/users")
@login_required
def users():
    return render_template(
        "users.html",
        users=UserService.get_all_users(),
        districts=DistrictService.get_all_flat(),
    )


@app.route("/users/new", methods=["GET", "POST"])
@login_required
def create_user():
    if request.method == "POST":
        user, message = UserService.create_user(
            request.form.get("username"),
            request.form.get("password"),
            district_id=_int_arg("district_id"),
        )
        flash(message, "success" if user else "error")
        if user:
            return redirect(url_for("users"))

    return render_template("create_user.html", districts=DistrictService.get_all_flat())


@app.route("/users/<int:user_id>/edit", methods=["GET", "POST"])
@login_required
def edit_user(user_id):
    user, message = UserService.get_user_by_id(user_id)
    if not user:
        flash(message, "error")
        return redirect(url_for("users"))

    if request.method == "POST":
        updated, message = UserService.update_user(
            user_id,
            name=request.form.get("username"),
            password=request.form.get("password") or None,
            district_id=_int_arg("district_id"),
        )
        flash(message, "success" if updated else "error")
        if updated:
            return redirect(url_for("users"))

    return render_template("edit_user.html", user=user, districts=DistrictService.get_all_flat())


# ══════════════════════════════════════════════════════════════════════════════
#  ADMIN — embed instructions
# ══════════════════════════════════════════════════════════════════════════════

@app.route("/embed")
@login_required
def embed_instructions():
    return render_template(
        "embed.html",
        base_url=request.url_root.rstrip("/"),
        districts=DistrictService.get_all_flat(),
    )


# ══════════════════════════════════════════════════════════════════════════════
#  CLI
# ══════════════════════════════════════════════════════════════════════════════

def ensure_schema_updates():
    """
    Adds columns introduced after the first deploy.

    db.create_all() only creates missing *tables* — it never alters an existing
    one, so a new column would silently be absent on an already-running
    database. These statements are idempotent and safe to run on every boot.
    """
    statements = [
        "ALTER TABLE complaints   ADD COLUMN IF NOT EXISTS email VARCHAR(150)",
        "ALTER TABLE complaints   ADD COLUMN IF NOT EXISTS national_id VARCHAR(20)",
        "ALTER TABLE complaints   ADD COLUMN IF NOT EXISTS notified_status VARCHAR(30)",
        "ALTER TABLE appointments ADD COLUMN IF NOT EXISTS email VARCHAR(150)",
        "ALTER TABLE appointments ADD COLUMN IF NOT EXISTS notified_status VARCHAR(30)",
        "ALTER TABLE citizens     ADD COLUMN IF NOT EXISTS active_flow VARCHAR(20)",
        "ALTER TABLE citizens     ADD COLUMN IF NOT EXISTS draft JSONB",
        "ALTER TABLE citizens     ADD COLUMN IF NOT EXISTS national_id VARCHAR(20)",
        "ALTER TABLE citizens     ADD COLUMN IF NOT EXISTS email VARCHAR(150)",
        "ALTER TABLE complaints   ADD COLUMN IF NOT EXISTS department_id INTEGER REFERENCES departments(id)",
        "ALTER TABLE complaints   ADD COLUMN IF NOT EXISTS routed_at TIMESTAMP",
    ]

    # توسيع أنواع الـ enum. بوستجرس بيعمل النوع مرة واحدة وقت إنشاء الجدول،
    # وأي قيمة جديدة بتتضاف للكود لازم تتضاف للنوع كمان — من غير كده أي حفظ
    # بالقيمة الجديدة بيفشل. مولّدة من الـ enum نفسه عشان تفضل متسقة.
    for category in ComplaintCategory:
        statements.append(
            f"ALTER TYPE complaintcategory ADD VALUE IF NOT EXISTS '{category.name}'"
        )

    for statement in statements:
        try:
            db.session.execute(db.text(statement))
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            # SQLite مش بيدعم IF NOT EXISTS في ALTER — مش مشكلة، الجداول
            # هناك بتتعمل من الموديل مباشرة
            print(f"[ensure_schema_updates] skipped: {e}")


@app.cli.command("init-db")
@with_appcontext
def init_db():
    """Creates every table plus the pgvector table."""
    db.create_all()
    ensure_schema_updates()
    ensure_vector_table()
    if not RequestCounter.query.first():
        db.session.add(RequestCounter(count=100000))
        db.session.commit()
    print("Database ready.")


@app.cli.command("create-admin")
@click.option("--username", prompt=True)
@click.option("--password", prompt=True, hide_input=True)
@click.option("--district", default=None, help="District id — omit for a super admin")
@with_appcontext
def create_admin(username, password, district):
    """Creates a dashboard user."""
    user, message = UserService.create_user(
        username, password, district_id=int(district) if district else None
    )
    print(message)


@app.cli.command("list-admins")
@with_appcontext
def list_admins():
    for user in UserService.get_all_users():
        scope = user.district.name if user.district else "كل الأحياء"
        print(f"{user.id}\t{user.username}\t{scope}")


@app.cli.command("delete-admin")
@click.option("--username", prompt=True)
@with_appcontext
def delete_admin(username):
    user = User.query.filter_by(username=username.strip().lower()).first()
    if not user:
        print("User not found")
        return
    db.session.delete(user)
    db.session.commit()
    print("Deleted")


@app.cli.command("seed-districts")
@click.option("--with-services", is_flag=True, help="Also seed the common service list")
@with_appcontext
def seed_districts(with_services):
    """Seeds the Alexandria districts with names only — contacts stay empty."""
    from seed_data import seed_alexandria_districts, seed_common_services

    created, skipped = seed_alexandria_districts()
    print(f"Districts: created {created}, skipped {skipped} that already existed.")

    if with_services:
        created, updated = seed_common_services()
        print(f"Services : created {created}, filled blanks on {updated} existing.")

    print("\nNext step: fill in addresses, phones, working hours, and the")
    print("coverage areas of each district from the dashboard — they are")
    print("intentionally blank so the assistant never invents them.")


@app.cli.command("import-site-knowledge")
@click.option("--file", "path", default=None,
              help="Export to read (default: site_knowledge/montazah-thani.json)")
@click.option("--no-embed", is_flag=True,
              help="Skip the vector stage — text search only, semantic search stays stale")
@click.option("--prune", is_flag=True,
              help="Deactivate services on this district that the export no longer lists")
@with_appcontext
def import_site_knowledge_command(path, no_embed, prune):
    """
    Loads the district website's content as the assistant's knowledge base.

    The website is the source of truth for what a service needs and how long it
    takes; this pulls that across so the chat panel and the page behind it can
    never disagree. Generate the export first, on the website side:

        npm run knowledge:export
    """
    from site_knowledge import import_site_knowledge

    report = import_site_knowledge(path, embed=not no_embed, prune=prune)

    for line in report.lines():
        print(line)

    if no_embed:
        print()
        print("Embeddings skipped. Semantic search will not find anything new")
        print("until you re-run this without --no-embed.")
    elif report.problems:
        print()
        print("Some rows were saved but not embedded. They are findable by text")
        print("search only. Check EMBEDDING_MODEL and the vector table, then re-run.")


@app.cli.command("seed-departments")
@click.option("--district", default=None, help="District id — omit for all districts")
@with_appcontext
def seed_departments(district):
    """Creates a department per complaint category so complaints route themselves."""
    created = DepartmentService.seed_defaults(int(district) if district else None)
    print(f"Created {created} departments.")
    print("Fill in each department's phone and email from the dashboard so the")
    print("responsible team is notified when a complaint lands.")


@app.cli.command("check-models")
@with_appcontext
def check_models():
    """
    Verifies every model in the fallback chain still exists on this account.

    Groq retires models. A chain entry that 404s is worse than no entry at all:
    the request spends a full round trip discovering it before moving on, while
    a citizen watches the typing indicator. Nothing surfaces this at runtime —
    the reply still arrives, just slower and from a weaker model — so it has to
    be checked deliberately.
    """
    import json
    import urllib.error
    import urllib.request

    from llm.model import get_model_chain

    chain = get_model_chain()

    key = os.environ.get("GROQ_API_KEY", "")
    if not key:
        print("GROQ_API_KEY is not set — cannot check.")
        raise SystemExit(1)

    request = urllib.request.Request(
        "https://api.groq.com/openai/v1/models",
        headers={
            "Authorization": f"Bearer {key}",
            # Groq's edge answers 403 to the default "Python-urllib/3.x" agent.
            # The key is fine; the request never reaches the API without this.
            "User-Agent": "montazah-thani-agent/1.0",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            available = {m["id"] for m in json.load(response).get("data", [])}
    except urllib.error.HTTPError as error:
        print(f"Groq refused the model list: {error.code} {error.reason}")
        raise SystemExit(1)

    missing = []
    print("Model chain, in the order it is tried:")
    for position, model in enumerate(chain):
        ok = model in available
        role = "primary " if position == 0 else f"fallback {position}"
        print(f"  {'OK     ' if ok else 'MISSING'}  {role}  {model}")
        if not ok:
            missing.append(model)

    if missing:
        print()
        print(f"{len(missing)} model(s) in the chain do not exist on this account.")
        print("Set GROQ_MODEL / GROQ_MODEL_FALLBACKS to models from this list:")
        for model in sorted(available):
            if not any(k in model for k in ("whisper", "tts", "guard")):
                print(f"  - {model}")
        raise SystemExit(1)

    print()
    print(f"All {len(chain)} models in the chain are available.")


@app.cli.command("warm-embeddings")
@with_appcontext
def warm_embeddings():
    """
    Downloads and loads the embedding model before serving traffic.

    Without this the first citizen to send a message would wait for a
    multi-gigabyte download.
    """
    from llm.embeddings import get_dimension, get_embedding_model, get_model_name

    print(f"Loading embedding model '{get_model_name()}'...")
    get_embedding_model()
    print(f"Embedding model ready ({get_dimension()} dimensions).")


@app.cli.command("purge-sessions")
@click.option("--days", default=90)
@with_appcontext
def purge_sessions(days):
    """Deletes chat sessions older than N days."""
    print(f"Deleted {CitizenService.purge_older_than(days)} sessions.")


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "4500"))
    app.run(host="0.0.0.0", port=port, debug=os.environ.get("FLASK_DEBUG") == "1")
