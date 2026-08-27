"""
graph/forms.py

الفورمات اللي بتتعرض جوّه الشات — الوصف بتاعها والتحقق منها والحفظ.

ليه فورم مش سؤال وجواب:

جمع سبع حقول بالمحادثة معناه سبع لفّات بين المواطن والموديل، وكل لفّة فيها
احتمال إن الموديل يسأل تاني على حاجة اتقالت، أو يعتبر كلمة "تمام" اترمت في
أي سياق تأكيدًا على بيانات المواطن أصلًا مشافهاش. الفورم بيشيل ده كله:
المواطن بيشوف كل الحقول مرة واحدة، بيملاها بإيده، وبيبعتها.

والأهم: الحفظ بيعدّي من هنا — كود بيتحقق من كل حقل، مش موديل بيقرر إن
البيانات كاملة. الموديل دوره الوحيد في المسار ده إنه يملّى حقول مبدئية
من كلام المواطن، وأي حاجة غلط فيها المواطن بيصلّحها قدام عينه قبل ما يبعت.

الوصف اللي بيتبعت للمتصفح عام عن قصد: الـ widget بيرسم الحقول من غير ما
يعرف حاجة عن المواعيد أو البلاغات، فإضافة حقل هنا ما بتحتاجش تعديل في
الواجهة.
"""

import os
import re
from datetime import date as date_cls, datetime, timedelta

from models.models import (
    Appointment, AppointmentStatus, CityService, ComplaintCategory, District, db,
)
from software_services.appointment_services import AppointmentService
from software_services.citizen_services import CitizenService
from software_services.complaint_services import ComplaintService


# ── سياسة المواعيد ────────────────────────────────────────────────────────────
# نفس سياسة الموقع في content/appointments.ts: الشباك بيفتح من الأحد للخميس،
# ٩ الصبح لـ ١:٣٠، كل نص ساعة، والحجز بيفتح من بكرة لحد ٢١ يوم قدام.
# متغيّرات البيئة موجودة عشان الحي يغيّر مواعيده من غير ما يلمس الكود.

def _env_int(key: str, default: int) -> int:
    try:
        return int(os.environ.get(key, "") or default)
    except ValueError:
        return default


def _env_time(key: str, default: str) -> str:
    raw = (os.environ.get(key) or "").strip()
    return raw if re.fullmatch(r"\d{2}:\d{2}", raw) else default


# Monday=0 … Sunday=6 في بايثون. الجمعة (4) والسبت (5) إجازة.
CLOSED_WEEKDAYS = {4, 5}

BOOKING_START     = _env_time("BOOKING_START", "09:00")
BOOKING_END       = _env_time("BOOKING_END", "13:30")
BOOKING_STEP_MIN  = _env_int("BOOKING_STEP_MINUTES", 30)
BOOKING_LEAD_DAYS = _env_int("BOOKING_LEAD_DAYS", 1)
BOOKING_HORIZON   = _env_int("BOOKING_HORIZON_DAYS", 21)

AR_WEEKDAYS = {
    0: "الاثنين", 1: "الثلاثاء", 2: "الأربعاء", 3: "الخميس",
    4: "الجمعة", 5: "السبت", 6: "الأحد",
}

AR_MONTHS = [
    "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
    "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
]

DATE_PATTERN = re.compile(r"^\d{4}-\d{2}-\d{2}$")
TIME_PATTERN = re.compile(r"^\d{2}:\d{2}$")
SLOT_PATTERN = re.compile(r"^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$")
NATIONAL_ID_PATTERN = re.compile(r"^\d{14}$")
PHONE_PATTERN = re.compile(r"^01[0125]\d{8}$")
EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s.]+\.[^@\s]{2,}$")


# ── التاريخ والوقت ────────────────────────────────────────────────────────────

def _minutes(hhmm: str) -> int:
    hours, minutes = hhmm.split(":")
    return int(hours) * 60 + int(minutes)


def _hhmm(total: int) -> str:
    return f"{total // 60:02d}:{total % 60:02d}"


def open_dates(today: date_cls | None = None) -> list[str]:
    """الأيام اللي الشباك بيشتغل فيها، من بعد مهلة الحجز لحد الأفق."""
    today = today or datetime.now().date()
    dates = []

    for offset in range(BOOKING_LEAD_DAYS, BOOKING_HORIZON + 1):
        day = today + timedelta(days=offset)
        if day.weekday() not in CLOSED_WEEKDAYS:
            dates.append(day.isoformat())

    return dates


def day_slots() -> list[str]:
    """كل مواعيد اليوم الواحد، بغض النظر عن المحجوز منها."""
    end = _minutes(BOOKING_END)
    step = max(BOOKING_STEP_MIN, 5)

    slots = []
    minute = _minutes(BOOKING_START)
    while minute < end:
        slots.append(_hhmm(minute))
        minute += step

    return slots


def format_date_ar(iso_date: str) -> str:
    """«الأحد 30 أغسطس» — الشكل اللي المواطن بيقرأه في الفورم."""
    try:
        day = date_cls.fromisoformat(iso_date)
    except ValueError:
        return iso_date
    return f"{AR_WEEKDAYS[day.weekday()]} {day.day} {AR_MONTHS[day.month - 1]}"


def format_time_ar(hhmm: str) -> str:
    """«9:30 ص» بالنظام الاتناشري، زي ما الموقع بيعرضه."""
    if not TIME_PATTERN.match(hhmm or ""):
        return hhmm
    hour, minute = (int(part) for part in hhmm.split(":"))
    suffix = "ص" if hour < 12 else "م"
    display = hour % 12 or 12
    return f"{display}:{minute:02d} {suffix}"


def format_slot_ar(canonical: str) -> str:
    """«الأحد 30 أغسطس — 10:00 ص» من "2026-08-30 10:00"."""
    parts = (canonical or "").split(" ")
    if len(parts) != 2:
        return canonical
    return f"{format_date_ar(parts[0])} — {format_time_ar(parts[1])}"


def _taken_slots(district_id) -> set[str]:
    """
    المواعيد المحجوزة فعلاً في الحي ده، بشكل "YYYY-MM-DD HH:MM".

    الحجوزات القديمة بتاريخ نصي حر مش بتطابق الشكل ده وبتتجاهل — وده صح:
    ما ينفعش نقفل خانة على مواطن بسبب صف قديم محدش يعرف هو امتى بالظبط.
    """
    try:
        query = Appointment.query.filter(
            Appointment.status != AppointmentStatus.CANCELLED
        )
        if district_id:
            query = query.filter(Appointment.district_id == district_id)

        return {
            row.date.strip()
            for row in query.with_entities(Appointment.date).all()
            if row.date and SLOT_PATTERN.match(row.date.strip())
        }
    except Exception as e:
        print(f"[forms] could not read taken slots: {e}")
        return set()


def slot_options(district_id) -> tuple[list[dict], dict[str, list[dict]]]:
    """
    (خيارات الأيام، مواعيد كل يوم) — بعد شيل المحجوز.

    اليوم اللي اتحجز بالكامل بيتشال من القايمة خالص بدل ما المواطن يدوس عليه
    ويلاقي مفيش مواعيد.
    """
    taken = _taken_slots(district_id)
    times = day_slots()

    dates: list[dict] = []
    by_date: dict[str, list[dict]] = {}

    for iso in open_dates():
        free = [t for t in times if f"{iso} {t}" not in taken]
        if not free:
            continue
        dates.append({"value": iso, "label": format_date_ar(iso)})
        by_date[iso] = [{"value": t, "label": format_time_ar(t)} for t in free]

    return dates, by_date


# ── خيارات القوائم ────────────────────────────────────────────────────────────

def district_options() -> list[dict]:
    try:
        return [
            {"value": d.name, "label": d.name}
            for d in District.query.filter_by(is_active=True).order_by(District.name).all()
        ]
    except Exception as e:
        print(f"[forms] could not read districts: {e}")
        return []


def service_options(district_id=None) -> list[dict]:
    """الخدمات اللي بتقبل حجز موعد — بتاعة الحي ده والخدمات العامة."""
    try:
        query = CityService.query.filter(
            CityService.is_active.is_(True),
            CityService.is_bookable.is_(True),
        )
        if district_id:
            query = query.filter(
                db.or_(
                    CityService.district_id == district_id,
                    CityService.district_id.is_(None),
                )
            )

        return [
            {"value": s.name, "label": s.name}
            for s in query.order_by(CityService.name).all()
        ]
    except Exception as e:
        print(f"[forms] could not read services: {e}")
        return []


def category_options() -> list[dict]:
    return [{"value": c.value, "label": c.value} for c in ComplaintCategory]


# ── وصف الفورم ────────────────────────────────────────────────────────────────

def _identity_fields(known: dict) -> list[dict]:
    """الحقول الشخصية — واحدة في كل فورم، ومتملّية من الجلسة لو معروفة."""
    return [
        {
            "name": "name",
            "label": "الاسم بالكامل",
            "type": "text",
            "required": True,
            "maxLength": 120,
            "autoComplete": "name",
            "value": known.get("name") or "",
        },
        {
            "name": "national_id",
            "label": "الرقم القومي",
            "type": "text",
            "required": True,
            "maxLength": 14,
            "inputMode": "numeric",
            "hint": "14 رقم",
            "value": known.get("national_id") or "",
        },
        {
            "name": "phone",
            "label": "رقم الموبايل",
            "type": "tel",
            "required": True,
            "maxLength": 15,
            "inputMode": "tel",
            "placeholder": "01xxxxxxxxx",
            "autoComplete": "tel",
            "value": known.get("phone") or "",
        },
        {
            "name": "email",
            "label": "الإيميل",
            "type": "email",
            "required": False,
            "maxLength": 150,
            "autoComplete": "email",
            "hint": "اختياري — عشان يوصلك تحديثات على طلبك",
            "value": known.get("email") or "",
        },
    ]


def _district_field(district_name: str | None, options: list[dict]) -> dict:
    """
    الحي. لو الـ widget متركّب على موقع حي معيّن، بيتقفل على حيّه —
    مفيش معنى إن حد داخل من موقع الحي يختار حي تاني من قايمة.
    """
    if district_name and any(o["value"] == district_name for o in options):
        return {
            "name": "district",
            "label": "الحي",
            "type": "fixed",
            "required": True,
            "value": district_name,
        }

    return {
        "name": "district",
        "label": "الحي",
        "type": "select",
        "required": True,
        "options": options,
        "value": district_name or "",
    }


def appointment_form(district_id=None, district_name=None,
                     known: dict | None = None, prefill: dict | None = None) -> dict:

    known = {**(known or {}), **{k: v for k, v in (prefill or {}).items() if v}}
    dates, by_date = slot_options(district_id)
    services = service_options(district_id)

    fields = _identity_fields(known)
    fields.append(_district_field(district_name, district_options()))

    fields.append({
        "name": "service",
        "label": "الخدمة المطلوبة",
        "type": "select",
        "required": True,
        "options": services,
        "allowOther": True,
        "otherLabel": "خدمة تانية (اكتبها)",
        "value": known.get("service") or "",
    })

    fields.append({
        "name": "date",
        "label": "اليوم",
        "type": "chips",
        "required": True,
        "options": dates,
        "value": "",
    })

    fields.append({
        "name": "time",
        "label": "الوقت",
        "type": "chips",
        "required": True,
        # المواعيد بتتغيّر حسب اليوم المختار، فبتتبعت كلها مرة واحدة
        # بدل نداء تاني على الشبكة مع كل ضغطة يوم
        "options": [],
        "optionsBy": "date",
        "optionsByValue": by_date,
        "value": "",
    })

    fields.append({
        "name": "note",
        "label": "ملاحظات",
        "type": "textarea",
        "required": False,
        "maxLength": 500,
        "rows": 2,
        "hint": "اختياري",
        "value": "",
    })

    return {
        "kind": "appointment",
        "title": "حجز موعد",
        "intro": "املا البيانات دي وهيتسجّل الموعد على طول.",
        "submitLabel": "تأكيد الحجز",
        "fields": fields,
        # مفيش يوم فاضي في الأفق كله — الفورم بيتعرض ومعاه السبب
        "unavailable": None if dates else "مفيش مواعيد متاحة حاليًا. جرّب تاني بعدين أو اتصل بالحي.",
    }


def complaint_form(district_id=None, district_name=None,
                   known: dict | None = None, prefill: dict | None = None) -> dict:

    known = {**(known or {}), **{k: v for k, v in (prefill or {}).items() if v}}

    fields = _identity_fields(known)
    fields.append(_district_field(district_name, district_options()))

    fields.append({
        "name": "category",
        "label": "نوع الشكوى",
        "type": "select",
        "required": True,
        "options": category_options(),
        "value": known.get("category") or "",
    })

    fields.append({
        "name": "address",
        "label": "المكان بالتحديد",
        "type": "text",
        "required": True,
        "maxLength": 250,
        "hint": "الشارع، رقم العقار، أو علامة مميزة",
        "value": known.get("address") or "",
    })

    fields.append({
        "name": "complaint_text",
        "label": "وصف المشكلة",
        "type": "textarea",
        "required": True,
        "maxLength": 1500,
        "rows": 4,
        "value": known.get("complaint_text") or "",
    })

    return {
        "kind": "complaint",
        "title": "تقديم بلاغ",
        "intro": "املا البيانات دي وهيتسجّل البلاغ ويتحوّل للإدارة المختصة.",
        "submitLabel": "إرسال البلاغ",
        "fields": fields,
        "unavailable": None,
    }


FORM_BUILDERS = {
    "appointment": appointment_form,
    "complaint": complaint_form,
}


# ── التحقق ────────────────────────────────────────────────────────────────────

class ValidationError(Exception):
    """حقول غلط، مع رسالة لكل حقل عشان الـ widget يعلّم عليه."""

    def __init__(self, fields: dict[str, str]):
        super().__init__("validation")
        self.fields = fields


def _clean(values: dict, key: str, limit: int = 500) -> str:
    value = values.get(key)
    if value is None:
        return ""
    return str(value).strip()[:limit]


def _digits(text: str) -> str:
    """
    بيحوّل الأرقام العربية والفارسية للإنجليزي وبيشيل المسافات والشرط.

    المواطن اللي كيبورده عربي بيكتب ٠١٠… ولو رفضناها هيفضل يحاول من غير ما
    يعرف إيه الغلط.
    """
    arabic = "٠١٢٣٤٥٦٧٨٩"
    persian = "۰۱۲۳۴۵۶۷۸۹"
    table = str.maketrans(arabic + persian, "0123456789" * 2)
    return re.sub(r"[\s\-()+]", "", text.translate(table))


def _validate_identity(values: dict, errors: dict) -> dict:
    name = _clean(values, "name", 120)
    if len(name) < 3:
        errors["name"] = "اكتب الاسم بالكامل"

    national_id = _digits(_clean(values, "national_id", 30))
    if not NATIONAL_ID_PATTERN.match(national_id):
        errors["national_id"] = "الرقم القومي لازم يكون 14 رقم"

    phone = _digits(_clean(values, "phone", 30))
    if phone.startswith("20"):
        phone = "0" + phone[2:]
    if not PHONE_PATTERN.match(phone):
        errors["phone"] = "رقم موبايل مصري صحيح، 11 رقم يبدأ بـ 01"

    email = _clean(values, "email", 150)
    if email and not EMAIL_PATTERN.match(email):
        errors["email"] = "الإيميل مش مكتوب صح"

    return {
        "name": name,
        "national_id": national_id,
        "phone": phone,
        "email": email or None,
    }


def _validate_district(values: dict, errors: dict, fallback_name: str | None) -> str | None:
    district = _clean(values, "district", 120) or (fallback_name or "")
    if not district:
        errors["district"] = "اختار الحي"
        return None

    names = {o["value"] for o in district_options()}
    if names and district not in names:
        errors["district"] = "اختار حي من القايمة"
        return None

    return district


# ── الحفظ ─────────────────────────────────────────────────────────────────────

def submit_appointment(session_id, values: dict, district_name=None,
                       district_id=None) -> dict:
    """
    بيتحقق من الفورم وبيحجز الموعد. بيرمي ValidationError لو فيه حقل غلط.

    كل حاجة بتتراجع من الأول هنا — الحقول، اليوم، الوقت — حتى لو الـ widget
    عرضها. الطلب ممكن ييجي من غير المتصفح أصلًا، والخانة ممكن تكون اتحجزت
    وإحنا بنملا الفورم.
    """
    errors: dict[str, str] = {}
    identity = _validate_identity(values, errors)
    district = _validate_district(values, errors, district_name)

    service = _clean(values, "service", 200)
    if not service:
        errors["service"] = "اختار الخدمة المطلوبة"

    date = _clean(values, "date", 10)
    time = _clean(values, "time", 5)

    if not DATE_PATTERN.match(date) or date not in open_dates():
        errors["date"] = "اختار يوم من الأيام المتاحة"
    elif not TIME_PATTERN.match(time) or time not in day_slots():
        errors["time"] = "اختار وقت من المواعيد المتاحة"

    resolved_district_id = district_id
    if district and not resolved_district_id:
        row = District.query.filter(District.name.ilike(district)).first()
        resolved_district_id = row.id if row else None

    slot = f"{date} {time}"

    # الخانة ممكن تكون اتحجزت والمواطن بيملا الفورم — دي آخر فرصة نمسكها
    # قبل ما اتنين يقفوا على نفس الشباك في نفس الدقيقة
    if not errors and slot in _taken_slots(resolved_district_id):
        errors["time"] = "الميعاد ده اتحجز توّه. اختار وقت تاني."

    if errors:
        raise ValidationError(errors)

    note = _clean(values, "note", 500)
    details = f"{service} — {note}" if note else service

    result = AppointmentService.create_appointment(
        name=identity["name"],
        phone_number=identity["phone"],
        details=details,
        # الخدمة لوحدها عشان الربط بالكتالوج يشتغل — الملاحظة اللي المواطن
        # كتبها جوّه details ما تخليش الاسم يطابق أي خدمة
        service_name=service,
        date=slot,
        district_name=district,
        national_id=identity["national_id"],
        email=identity["email"],
        session_id=session_id,
        comes_from="chat-form",
    )

    if not result.success or not result.appointment:
        raise RuntimeError(result.message or "تعذّر حفظ الموعد")

    CitizenService.remember_identity(session_id, **identity)

    reference = result.appointment.reference_id

    return {
        "reference": reference,
        "reply": (
            f"تم تأكيد الحجز ✅\n"
            f"رقم الموعد: {reference}\n"
            f"الموعد: {format_slot_ar(slot)}\n"
            f"الخدمة: {service}\n"
            f"احتفظ بالرقم ده وقدّمه عند الحضور، واحضر قبل الموعد بـ 15 دقيقة "
            f"ومعاك الأوراق المطلوبة."
        ),
        "ticket": {
            "name": identity["name"],
            "phone": identity["phone"],
            "date": format_slot_ar(slot),
            "details": service,
            "district": district,
            "reference_id": reference,
        },
    }


def submit_complaint(session_id, values: dict, district_name=None) -> dict:
    """بيتحقق من الفورم وبيسجّل البلاغ ويوجّهه للإدارة المختصة."""
    errors: dict[str, str] = {}
    identity = _validate_identity(values, errors)
    district = _validate_district(values, errors, district_name)

    category = _clean(values, "category", 120)
    if category not in {c.value for c in ComplaintCategory}:
        errors["category"] = "اختار نوع الشكوى"

    address = _clean(values, "address", 250)
    if len(address) < 3:
        errors["address"] = "اكتب المكان بالتحديد"

    complaint_text = _clean(values, "complaint_text", 1500)
    if len(complaint_text) < 10:
        errors["complaint_text"] = "اكتب وصف المشكلة بشوية تفصيل"

    if errors:
        raise ValidationError(errors)

    result = ComplaintService.create_complaint(
        phone_number=identity["phone"],
        complaint_text=complaint_text,
        citizen_name=identity["name"],
        district_name=district,
        category_value=category,
        address=address,
        session_id=session_id,
        comes_from="chat-form",
        national_id=identity["national_id"],
        email=identity["email"],
    )

    if not result.success or not result.complaint:
        raise RuntimeError(result.message or "تعذّر تسجيل البلاغ")

    CitizenService.remember_identity(session_id, **identity)

    complaint = result.complaint
    reference = complaint.reference_id
    department = complaint.department.name if complaint.department else None

    routing = (
        f"اتحوّل لـ{department}.\n" if department
        else "هيتحوّل للإدارة المختصة بالحي.\n"
    )

    return {
        "reference": reference,
        "reply": (
            f"تم تسجيل بلاغك ✅\n"
            f"رقم البلاغ: {reference}\n"
            f"{routing}"
            f"احتفظ بالرقم ده عشان تتابع حالة البلاغ في أي وقت."
        ),
        "ticket": None,
    }
