"""
notified_center/citizen_notifier.py

Emails sent to the citizen about their own complaint or appointment.

Two rules shape this module:

1. Sending never blocks the chat. SMTP can take seconds, and the citizen is
   waiting on a reply, so every send runs on a background thread.

2. Sending never breaks anything. A misconfigured mail server, a typo in the
   address, or a dead SMTP host must not lose a complaint or turn a successful
   status update into an error page. Everything is wrapped and logged.
"""

import logging
import os
import re
import threading
from html import escape

from notified_center.EmailSender import email_client

logger = logging.getLogger(__name__)

EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[a-zA-Z]{2,}$")

ORG_NAME = os.environ.get("ORG_NAME", "أحياء محافظة الإسكندرية")

COMPLAINT_STATUS_AR = {
    "Pending":     "تم استلام البلاغ وجاري تحويله للإدارة المختصة",
    "In Progress": "جاري العمل على البلاغ",
    "Resolved":    "تم حل البلاغ",
    "Rejected":    "البلاغ خارج اختصاص الحي",
}

APPOINTMENT_STATUS_AR = {
    "Pending":   "الموعد مسجّل وفي انتظار التأكيد من الحي",
    "Confirmed": "تم تأكيد الموعد",
    "Attended":  "تم تسجيل حضورك",
    "No Show":   "لم يتم تسجيل حضورك في الموعد المحدد",
    "Cancelled": "تم إلغاء الموعد",
}


def is_valid_email(value: str) -> bool:
    return bool(value and EMAIL_PATTERN.match(value.strip()))


# ── HTML shell ────────────────────────────────────────────────────────────────

def _wrap(title: str, reference: str, rows: list[tuple[str, str]], note: str = "") -> str:
    """
    Builds a simple RTL email. Inline styles only — mail clients strip <style>.

    Every interpolated value is escaped. Most of them are written by the
    citizen (complaint text, address, name), so unescaped output would let
    anyone put arbitrary HTML — a fake login link, say — inside an email that
    arrives looking like official district correspondence.
    """
    cells = "".join(
        f"""<tr>
              <td style="padding:9px 14px;color:#64748b;font-size:13px;
                         white-space:nowrap;vertical-align:top">{escape(label)}</td>
              <td style="padding:9px 14px;color:#0f172a;font-size:14px;
                         font-weight:600">{escape(value)}</td>
            </tr>"""
        for label, value in rows if value
    )

    note_block = (
        f"""<div style="margin:18px 0 0;padding:13px 16px;background:#f1f5f9;
                        border-right:3px solid #0d6e54;border-radius:8px;
                        color:#334155;font-size:13.5px;line-height:1.8">{escape(note)}</div>"""
        if note else ""
    )

    return f"""<!DOCTYPE html>
<html lang="ar" dir="rtl"><head><meta charset="utf-8"></head>
<body style="margin:0;padding:24px;background:#f4f6f8;
             font-family:'Segoe UI',Tahoma,Arial,sans-serif">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:14px;
              overflow:hidden;box-shadow:0 2px 12px rgba(15,23,42,.08)">

    <div style="background:#0d6e54;padding:22px 24px;color:#fff">
      <div style="font-size:17px;font-weight:700">{escape(ORG_NAME)}</div>
      <div style="font-size:13px;opacity:.85;margin-top:3px">خدمة المواطن</div>
    </div>

    <div style="padding:24px">
      <div style="font-size:16px;font-weight:700;color:#0f172a;margin-bottom:6px">
        {escape(title)}
      </div>

      <div style="display:inline-block;margin:10px 0 18px;padding:9px 16px;
                  background:#e6f4ef;border:1px dashed #0d6e54;border-radius:9px;
                  font-size:17px;font-weight:700;color:#084f3c;letter-spacing:1px">
        {escape(reference)}
      </div>

      <table style="width:100%;border-collapse:collapse">{cells}</table>
      {note_block}
    </div>

    <div style="padding:16px 24px;background:#f8fafc;color:#94a3b8;font-size:12px;
                line-height:1.7;border-top:1px solid #e2e8f0">
      رسالة آلية — برجاء عدم الرد عليها.<br>
      للاستعلام عن حالة طلبك في أي وقت، افتح المحادثة وأرسل رقم الطلب.
    </div>

  </div>
</body></html>"""


def _plain(title: str, reference: str, rows: list[tuple[str, str]], note: str = "") -> str:
    lines = [ORG_NAME, "", title, "", f"رقم الطلب: {reference}", ""]
    lines += [f"{label}: {value}" for label, value in rows if value]
    if note:
        lines += ["", note]
    lines += ["", "رسالة آلية — برجاء عدم الرد عليها."]
    return "\n".join(lines)


# ── async send ────────────────────────────────────────────────────────────────

def _send_async(recipient: str, subject: str, plain: str, html: str) -> None:
    """Fire-and-forget so the citizen's chat reply is never held up by SMTP."""
    def _worker():
        try:
            sent = email_client.send_to(recipient, subject, plain, html)
            # print مش logger: تحت جونيكورن لوجات الـ threads الخلفية
            # بتتبلع، وde facto مش بتوصل stdout الحاوية
            print(
                f"[citizen-mail] {'sent' if sent else 'FAILED'} -> {recipient} | {subject}",
                flush=True,
            )
        except Exception as e:
            print(f"[citizen-mail] ERROR -> {recipient}: {e}", flush=True)
            logger.exception("Citizen notification failed for %s", recipient)

    threading.Thread(target=_worker, daemon=True, name="citizen-mail").start()


def _dispatch(recipient, title, subject, reference, rows, note=""):
    if not is_valid_email(recipient):
        return False

    _send_async(
        recipient.strip(),
        subject,
        _plain(title, reference, rows, note),
        _wrap(title, reference, rows, note),
    )
    return True


# ── complaints ────────────────────────────────────────────────────────────────

def notify_complaint_registered(data: dict) -> bool:
    """
    `data` is a plain dict, not an ORM object — the send happens on another
    thread where a detached SQLAlchemy instance would blow up.
    """
    department = data.get("department")

    note = (
        f"تم تحويل البلاغ إلى {department} بالحي، وهنبعتلك تحديث أول ما تتغير حالته. "
        "احتفظ برقم البلاغ لمتابعة حالته في أي وقت."
        if department else
        "احتفظ برقم البلاغ لمتابعة حالته. هيتم تحويل البلاغ للإدارة المختصة "
        "بالحي، وهنبعتلك تحديث أول ما تتغير حالته."
    )

    return _dispatch(
        recipient=data.get("email"),
        title="تم تسجيل بلاغك بنجاح",
        subject=f"تم تسجيل بلاغك — رقم {data.get('reference_id')}",
        reference=data.get("reference_id", ""),
        rows=[
            ("مقدّم البلاغ", data.get("citizen_name")),
            ("نوع الشكوى", data.get("category")),
            ("الحي", data.get("district")),
            ("الإدارة المختصة", department),
            ("المكان", data.get("address")),
            ("الوصف", data.get("complaint_text")),
            ("الحالة", COMPLAINT_STATUS_AR.get("Pending")),
        ],
        note=note,
    )


def notify_department_new_complaint(data: dict) -> bool:
    """
    Tells the responsible department a complaint just landed for them.

    Sent to the department, not the citizen — so it carries the citizen's
    contact details, which the citizen-facing emails never do.
    """
    return _dispatch(
        recipient=data.get("email"),
        title=f"بلاغ جديد — {data.get('category') or 'غير مصنّف'}",
        subject=f"بلاغ جديد {data.get('reference_id')} — {data.get('category') or ''}",
        reference=data.get("reference_id", ""),
        rows=[
            ("الإدارة", data.get("department")),
            ("المسؤول", data.get("manager")),
            ("الحي", data.get("district")),
            ("نوع الشكوى", data.get("category")),
            ("المكان", data.get("address")),
            ("الوصف", data.get("complaint_text")),
            ("مقدّم البلاغ", data.get("citizen_name")),
            ("رقم التواصل", data.get("phone")),
        ],
        note="برجاء متابعة البلاغ وتحديث حالته على لوحة التحكم.",
    )


def notify_complaint_status(data: dict) -> bool:
    status_ar = COMPLAINT_STATUS_AR.get(data.get("status"), data.get("status"))

    return _dispatch(
        recipient=data.get("email"),
        title="تحديث على حالة بلاغك",
        subject=f"تحديث بلاغك {data.get('reference_id')} — {status_ar}",
        reference=data.get("reference_id", ""),
        rows=[
            ("الحالة الجديدة", status_ar),
            ("نوع الشكوى", data.get("category")),
            ("الحي", data.get("district")),
            ("المكان", data.get("address")),
        ],
        note=data.get("staff_note") or "",
    )


# ── appointments ──────────────────────────────────────────────────────────────

def notify_appointment_registered(data: dict) -> bool:
    return _dispatch(
        recipient=data.get("email"),
        title="تم تأكيد حجز موعدك",
        subject=f"تأكيد موعدك — رقم {data.get('reference_id')}",
        reference=data.get("reference_id", ""),
        rows=[
            ("الاسم", data.get("name")),
            ("الخدمة", data.get("details")),
            ("الحي", data.get("district")),
            ("الموعد", data.get("date")),
            ("الحالة", APPOINTMENT_STATUS_AR.get("Pending")),
        ],
        note=(
            "برجاء الحضور قبل الموعد بـ ١٥ دقيقة ومعك الأوراق المطلوبة "
            "وبطاقة الرقم القومي."
        ),
    )


def notify_appointment_status(data: dict) -> bool:
    status_ar = APPOINTMENT_STATUS_AR.get(data.get("status"), data.get("status"))

    return _dispatch(
        recipient=data.get("email"),
        title="تحديث على موعدك",
        subject=f"تحديث موعدك {data.get('reference_id')} — {status_ar}",
        reference=data.get("reference_id", ""),
        rows=[
            ("الحالة الجديدة", status_ar),
            ("الخدمة", data.get("details")),
            ("الحي", data.get("district")),
            ("الموعد", data.get("date")),
        ],
        note=data.get("staff_note") or "",
    )
