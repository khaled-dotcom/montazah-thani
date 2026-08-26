from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timezone
from flask_login import UserMixin
from enum import Enum
from werkzeug.security import check_password_hash, generate_password_hash

db = SQLAlchemy()


# ── Enums ─────────────────────────────────────────────────────────────────────

class ComplaintStatus(Enum):
    PENDING     = "Pending"       # قيد الاستلام
    IN_PROGRESS = "In Progress"   # جاري المعالجة
    RESOLVED    = "Resolved"      # تم الحل
    REJECTED    = "Rejected"      # مرفوضة / خارج الاختصاص


class AppointmentStatus(Enum):
    PENDING   = "Pending"     # في انتظار التأكيد
    CONFIRMED = "Confirmed"   # مؤكد
    ATTENDED  = "Attended"    # حضر
    NO_SHOW   = "No Show"     # لم يحضر
    CANCELLED = "Cancelled"   # ملغي


class ComplaintCategory(Enum):
    CLEANING     = "نظافة وقمامة"
    SEWAGE       = "صرف صحي"
    LIGHTING     = "إنارة عامة"
    ROADS        = "طرق ورصف"
    OCCUPANCY    = "إشغالات ومخالفات"
    BUILDINGS    = "مبانٍ مخالفة"
    WATER        = "مياه"
    PARKS        = "حدائق وأشجار"
    STRAY        = "كلاب ضالة"
    MARKETS      = "أسواق وباعة جائلين"
    ADVERTS      = "لافتات وإعلانات مخالفة"
    NOISE        = "تلوث وضوضاء"
    RAINWATER    = "تجمع مياه أمطار"
    CEMETERIES   = "مدافن"
    VEHICLES     = "سيارات ومخلفات متروكة"
    STAFF        = "شكوى من موظف أو خدمة"
    OTHER        = "أخرى"


# ── Admin ─────────────────────────────────────────────────────────────────────

class User(db.Model, UserMixin):
    __tablename__ = "users"
    id       = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)

    # هاش مش نص عادي. الاسم اتساب "password" عشان الأعمدة الموجودة،
    # لكن اللي بيتخزن جواه scrypt hash عن طريق set_password().
    password = db.Column(db.String(255), nullable=False)

    def set_password(self, raw_password: str) -> None:
        self.password = generate_password_hash(raw_password)

    def check_password(self, raw_password: str) -> bool:
        """
        Verifies a password, transparently upgrading rows that were stored in
        plain text before hashing existed. Without this, every existing admin
        would be locked out by the upgrade.
        """
        stored = self.password or ""

        try:
            if check_password_hash(stored, raw_password):
                return True
        except Exception:
            # مش هاش صالح — يبقى قيمة قديمة بنص عادي
            pass

        if stored and stored == raw_password:
            self.set_password(raw_password)
            try:
                db.session.commit()
            except Exception:
                db.session.rollback()
            return True

        return False

    # الموظف ممكن يكون مسؤول عن حي واحد، أو None = مدير عام يشوف كل الأحياء
    district_id = db.Column(db.Integer, db.ForeignKey("districts.id"), nullable=True)
    is_admin    = db.Column(db.Boolean, default=True, nullable=False)

    district = db.relationship("District", backref="staff")


# ── Districts ─────────────────────────────────────────────────────────────────

class District(db.Model):
    """حي من أحياء محافظة الإسكندرية."""
    __tablename__ = "districts"

    id   = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False, unique=True)

    # المنطقة الإدارية التابع لها الحي (المنتزه / شرق / وسط / غرب / الجمرك / العامرية ...)
    zone = db.Column(db.String(120))

    address       = db.Column(db.String(300))
    phone         = db.Column(db.String(120))
    hotline       = db.Column(db.String(60))
    email         = db.Column(db.String(120))
    working_hours = db.Column(db.String(200))
    head_name     = db.Column(db.String(120))
    map_url       = db.Column(db.String(500))

    # وصف حر + نطاق الحي الجغرافي، بيتحقن في برومبت الـ agent
    info      = db.Column(db.Text)
    coverage  = db.Column(db.Text)

    # حقول الـ knowledge pipeline (بتتولد من الـ LLM وبيوافق عليها الأدمن)
    description = db.Column(db.Text)
    keywords    = db.Column(db.Text)
    alias_names = db.Column(db.Text)
    search_text = db.Column(db.Text)

    is_active  = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    services     = db.relationship("CityService", backref="district", lazy=True)
    complaints   = db.relationship("Complaint", backref="district", lazy=True)
    appointments = db.relationship("Appointment", backref="district", lazy=True)


class Department(db.Model):
    """
    الإدارة المختصة داخل الحي (النظافة، الصرف، الإشغالات...).

    البلاغ لوحده مالوش قيمة لو مش واصل لحد. الجدول ده بيربط
    (الحي + تصنيف الشكوى) بإدارة ليها مسؤول وتليفون وإيميل، فكل بلاغ
    بيوصل الداشبورد وهو متحوّل بالفعل بدل ما يستنى موظف يوزّعه يدوي.
    """
    __tablename__ = "departments"
    __table_args__ = (
        db.UniqueConstraint("district_id", "category", name="uq_department_district_category"),
    )

    id          = db.Column(db.Integer, primary_key=True)
    district_id = db.Column(db.Integer, db.ForeignKey("districts.id"), nullable=False)

    # تصنيف الشكاوى اللي الإدارة دي مسؤولة عنه
    category = db.Column(db.Enum(ComplaintCategory), nullable=False)

    name       = db.Column(db.String(200), nullable=False)
    manager    = db.Column(db.String(120))
    phone      = db.Column(db.String(120))
    email      = db.Column(db.String(150))
    is_active  = db.Column(db.Boolean, default=True)

    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    district = db.relationship("District", backref="departments")


class CityService(db.Model):
    """خدمة أو معاملة إدارية بيقدمها الحي (رخصة، شهادة، ترخيص ...)."""
    __tablename__ = "city_services"

    id = db.Column(db.Integer, primary_key=True)

    # None = خدمة متاحة في كل الأحياء
    district_id = db.Column(db.Integer, db.ForeignKey("districts.id"), nullable=True)

    name        = db.Column(db.String(200), nullable=False)
    category    = db.Column(db.String(120))     # تراخيص / إشغالات / مساحة / شؤون صحية ...
    department  = db.Column(db.String(200))     # الإدارة المختصة داخل الحي
    description = db.Column(db.Text)

    fees               = db.Column(db.Float)    # الرسوم بالجنيه — تُترك فارغة لو غير محددة
    fees_note          = db.Column(db.String(300))
    required_documents = db.Column(db.Text)     # الأوراق المطلوبة، سطر لكل ورقة
    duration           = db.Column(db.String(120))  # مدة الإنجاز
    steps              = db.Column(db.Text)     # خطوات إنهاء المعاملة

    # حقول الـ knowledge pipeline
    keywords    = db.Column(db.Text)
    alias_names = db.Column(db.Text)
    search_text = db.Column(db.Text)

    is_bookable = db.Column(db.Boolean, default=True)   # يقبل حجز موعد؟
    is_active   = db.Column(db.Boolean, default=True)

    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )


# ── Chat sessions ─────────────────────────────────────────────────────────────

class Citizen(db.Model):
    """
    جلسة محادثة لزائر الموقع. الهوية هي session_id المتولّد في المتصفح،
    بديل (platform_id, page_id, sender_id) اللي كانت مستخدمة في واتساب/ماسنجر.
    """
    __tablename__ = "citizens"

    session_id = db.Column(db.String(64), primary_key=True)

    # بيانات هوية المواطن — بتخص الشخص مش الطلب، فبتفضل بعد ما البلاغ
    # أو الموعد يتحفظ. من غير كده المواطن يقدّم بلاغ وبعده بدقيقة يتسأل
    # على اسمه ورقمه القومي تاني عشان يحجز موعد.
    name        = db.Column(db.String(120))
    national_id = db.Column(db.String(20))
    phone       = db.Column(db.String(50))
    email       = db.Column(db.String(150))

    summary          = db.Column(db.Text)
    last_bot_message = db.Column(db.Text)

    # المسار المفتوح حاليًا: "complaint" | "appointment" | None
    #
    # ده مش استنتاج من نص الملخص — ده حالة صريحة. من غيره، رسالة زي
    # "أنا في حي المنتزه" وسط تسجيل بلاغ بتتصنّف "direct"، وعقدة direct
    # بتعيد كتابة الملخص وتمسح البيانات اللي اتجمعت، فالمواطن يفضل
    # يلف في دايرة.
    active_flow = db.Column(db.String(20))

    # الحقول اللي اتجمعت لحد دلوقتي في المسار المفتوح، كـ JSON.
    #
    # الملخص النصي بيتولّد من جديد كل دور، والموديل بينسى حقل فيه من وقت
    # للتاني — وساعتها المواطن يتسأل على حاجة قالها. المسودة دي هي المصدر
    # الموثوق للحقول: بتتدمج كل دور والقيمة القديمة ما بتتمسحش بفاضي.
    # none_as_null: من غيرها مسح المسودة بيخزّن JSON null بدل SQL NULL،
    # فأي استعلام بـ "draft IS NULL" بيدّي نتيجة مضللة
    draft = db.Column(db.JSON(none_as_null=True))

    # الحي اللي الـ widget متركّب على موقعه، لو الشات مفتوح من موقع حي معين
    district_id = db.Column(db.Integer, db.ForeignKey("districts.id"), nullable=True)

    message_count = db.Column(db.Integer, default=0, nullable=False)
    user_agent    = db.Column(db.String(300))
    ip_address    = db.Column(db.String(64))

    created_at    = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    last_seen_at  = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    district = db.relationship("District")


class ChatMessage(db.Model):
    """سجل الرسائل — عشان الموظف يقدر يقرأ المحادثة كاملة من لوحة التحكم."""
    __tablename__ = "chat_messages"

    id         = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.String(64), db.ForeignKey("citizens.session_id"), nullable=False, index=True)
    role       = db.Column(db.String(20), nullable=False)   # "user" | "bot"
    content    = db.Column(db.Text, nullable=False)
    intent     = db.Column(db.String(40))
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    citizen = db.relationship("Citizen", backref=db.backref("messages", lazy="dynamic", cascade="all, delete-orphan"))


# ── Citizen requests ──────────────────────────────────────────────────────────

class Complaint(db.Model):
    """بلاغ أو شكوى من مواطن."""
    __tablename__ = "complaints"

    id           = db.Column(db.Integer, primary_key=True)
    reference_id = db.Column(db.String(20), unique=True, nullable=False, index=True)

    district_id   = db.Column(db.Integer, db.ForeignKey("districts.id"), nullable=True)
    category      = db.Column(db.Enum(ComplaintCategory), default=ComplaintCategory.OTHER)

    # الإدارة المختصة — بتتحدد أوتوماتيك من (الحي + التصنيف) عند التسجيل
    department_id = db.Column(db.Integer, db.ForeignKey("departments.id"), nullable=True)
    routed_at     = db.Column(db.DateTime)

    citizen_name   = db.Column(db.String(120))
    national_id    = db.Column(db.String(20))    # الرقم القومي — بيانات مقدّم البلاغ
    phone_number   = db.Column(db.String(50), nullable=False)
    email          = db.Column(db.String(150))   # اختياري — لإشعارات المتابعة
    address        = db.Column(db.String(400))
    complaint_text = db.Column(db.Text, nullable=False)

    # آخر حالة اتبعت للمواطن بالإيميل — يمنع تكرار نفس الإشعار
    notified_status = db.Column(db.String(30))

    status       = db.Column(db.Enum(ComplaintStatus), default=ComplaintStatus.PENDING)
    staff_note   = db.Column(db.Text)
    attachment   = db.Column(db.String(255))

    session_id  = db.Column(db.String(64))
    comes_from  = db.Column(db.String(100), default="website")
    created_at  = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at  = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
    resolved_at = db.Column(db.DateTime)

    department = db.relationship("Department")


class Appointment(db.Model):
    """حجز موعد لإنهاء معاملة في الحي."""
    __tablename__ = "appointments"

    id           = db.Column(db.Integer, primary_key=True)
    reference_id = db.Column(db.String(20), unique=True, nullable=False, index=True)

    district_id = db.Column(db.Integer, db.ForeignKey("districts.id"), nullable=True)
    service_id  = db.Column(db.Integer, db.ForeignKey("city_services.id"), nullable=True)

    name         = db.Column(db.String(120), nullable=False)
    phone_number = db.Column(db.String(50), nullable=False)
    email        = db.Column(db.String(150))   # اختياري — لإشعارات المتابعة
    national_id  = db.Column(db.String(20))
    details      = db.Column(db.Text)          # الخدمة المطلوبة كما ذكرها المواطن
    date         = db.Column(db.String(100))   # التاريخ/الوقت كما اتفق عليه

    status     = db.Column(db.Enum(AppointmentStatus), default=AppointmentStatus.PENDING)
    staff_note = db.Column(db.Text)

    # آخر حالة اتبعت للمواطن بالإيميل — يمنع تكرار نفس الإشعار
    notified_status = db.Column(db.String(30))

    session_id = db.Column(db.String(64))
    comes_from = db.Column(db.String(100), default="website")
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    service = db.relationship("CityService")


# ── Ops ───────────────────────────────────────────────────────────────────────

class RequestCounter(db.Model):
    __tablename__ = "request_counter"
    id    = db.Column(db.Integer, primary_key=True)
    count = db.Column(db.Integer, default=1000)

    def decrement(self):
        db.session.query(RequestCounter).filter(
            RequestCounter.id == self.id,
            RequestCounter.count > 0,
        ).update({RequestCounter.count: RequestCounter.count - 1})
        db.session.commit()


class RateLimitHit(db.Model):
    """
    عدّاد الطلبات — في الداتابيز عشان يبقى مشترك بين عمال جونيكورن.
    عدّاد في الذاكرة معناه إن كل عامل عنده حد مستقل.
    """
    __tablename__ = "rate_limit_hits"

    id         = db.Column(db.Integer, primary_key=True)
    bucket_key = db.Column(db.String(120), nullable=False, index=True)
    created_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        index=True,
    )


class UsageLog(db.Model):
    """تكلفة الـ tokens لكل رسالة — بديل جدول الاشتراكات القديم."""
    __tablename__ = "usage_log"

    id            = db.Column(db.Integer, primary_key=True)
    session_id    = db.Column(db.String(64), index=True)
    district_id   = db.Column(db.Integer, db.ForeignKey("districts.id"), nullable=True)
    intent        = db.Column(db.String(40))
    input_tokens  = db.Column(db.Integer, default=0)
    output_tokens = db.Column(db.Integer, default=0)
    total_tokens  = db.Column(db.Integer, default=0)
    cost_usd      = db.Column(db.Float, default=0.0)
    created_at    = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), index=True)
