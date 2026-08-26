"""
Status tracking for complaints and appointments.

This node is deliberately deterministic — no LLM call. A citizen asking "where
is my complaint?" must get the status that is literally in the database, so
there is nothing here for a model to get creative about. It also makes the
most-repeated question in the system free to answer.
"""

import re

from graph.state import AgentState
from graph.utils import detect_language_fallback
from software_services.citizen_services import CitizenService
from software_services.complaint_services import ComplaintService
from software_services.appointment_services import AppointmentService

# أرقام المرجع: حرف نوع + 7 خانات من أبجدية بدون حروف متشابهة
REFERENCE_PATTERN = re.compile(r"\b([CA][ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{7})\b", re.IGNORECASE)

PHONE_PATTERN = re.compile(r"\b(01[0-9]{9})\b")


COMPLAINT_STATUS_AR = {
    "Pending":     "تم استلام البلاغ وجاري تحويله للإدارة المختصة",
    "In Progress": "جاري العمل على البلاغ",
    "Resolved":    "تم حل البلاغ",
    "Rejected":    "البلاغ خارج اختصاص الحي",
}

APPOINTMENT_STATUS_AR = {
    "Pending":   "الموعد مسجّل وفي انتظار التأكيد من الحي",
    "Confirmed": "الموعد مؤكد",
    "Attended":  "تم الحضور",
    "No Show":   "لم يتم الحضور في الموعد المحدد",
    "Cancelled": "الموعد ملغي",
}


def _format_complaint(complaint) -> str:
    status_text = COMPLAINT_STATUS_AR.get(
        complaint.status.value if complaint.status else "",
        "غير محددة",
    )

    lines = [
        "📋 حالة البلاغ",
        "",
        f"رقم البلاغ: {complaint.reference_id}",
        f"الحالة: {status_text}",
    ]

    if complaint.district:
        lines.append(f"الحي: {complaint.district.name}")

    if complaint.category:
        lines.append(f"النوع: {complaint.category.value}")

    if complaint.department:
        lines.append(f"الإدارة المختصة: {complaint.department.name}")

    if complaint.created_at:
        lines.append(f"تاريخ التسجيل: {complaint.created_at.strftime('%Y-%m-%d')}")

    if complaint.staff_note:
        lines.append("")
        lines.append(f"ملاحظة من الحي: {complaint.staff_note}")

    return "\n".join(lines)


def _format_appointment(appointment) -> str:
    status_text = APPOINTMENT_STATUS_AR.get(
        appointment.status.value if appointment.status else "",
        "غير محددة",
    )

    lines = [
        "🗓️ حالة الموعد",
        "",
        f"رقم الموعد: {appointment.reference_id}",
        f"الحالة: {status_text}",
    ]

    if appointment.district:
        lines.append(f"الحي: {appointment.district.name}")

    if appointment.details:
        lines.append(f"الخدمة: {appointment.details}")

    if appointment.date:
        lines.append(f"الموعد: {appointment.date}")

    if appointment.staff_note:
        lines.append("")
        lines.append(f"ملاحظة من الحي: {appointment.staff_note}")

    return "\n".join(lines)


def _lookup(user_message: str, summary: str):
    """
    Tries the reference number in the current message first, then any reference
    the citizen already got earlier in this conversation, then their phone.
    Returns a list of formatted blocks (possibly empty).
    """
    haystacks = [user_message, summary or ""]

    references = []
    for text in haystacks:
        for match in REFERENCE_PATTERN.finditer(text):
            reference = match.group(1).upper()
            if reference not in references:
                references.append(reference)

    blocks = []

    for reference in references:
        if reference.startswith("C"):
            complaint, _ = ComplaintService.get_by_reference(reference)
            if complaint:
                blocks.append(_format_complaint(complaint))
        else:
            appointment, _ = AppointmentService.get_by_reference(reference)
            if appointment:
                blocks.append(_format_appointment(appointment))

    if blocks:
        return blocks

    # مفيش رقم مرجع صالح — نجرب رقم التليفون
    phones = PHONE_PATTERN.findall(user_message) or PHONE_PATTERN.findall(summary or "")

    for phone in phones[:1]:
        for complaint in ComplaintService.get_recent_by_phone(phone, limit=3):
            blocks.append(_format_complaint(complaint))
        for appointment in AppointmentService.get_recent_by_phone(phone, limit=3):
            blocks.append(_format_appointment(appointment))

    return blocks


def track_node(state: AgentState) -> dict:

    session_id = state.get("session_id")
    user_message = state["user_message"]
    current_summary = state.get("summary") or ""

    try:
        blocks = _lookup(user_message, current_summary)
    except Exception as e:
        print(f"[Track Node] Lookup error: {e}")
        blocks = []

    if blocks:
        reply = "\n\n———\n\n".join(blocks)

    elif REFERENCE_PATTERN.search(user_message) or PHONE_PATTERN.search(user_message):
        # المواطن أدى رقم بس مش موجود في قاعدة البيانات
        reply = detect_language_fallback(
            user_message,
            arabic=(
                "معرفتش ألاقي أي بلاغ أو موعد بالرقم ده.\n"
                "اتأكد من الرقم وابعته تاني، أو ابعت رقم الموبايل اللي سجّلت بيه."
            ),
            default=(
                "I could not find any complaint or appointment with that number.\n"
                "Please double-check it, or send the phone number you registered with."
            ),
        )

    else:
        reply = detect_language_fallback(
            user_message,
            arabic=(
                "تحت أمرك 👍\n"
                "ابعتلي رقم البلاغ أو رقم الموعد عشان أقولك آخر حالة،\n"
                "أو ابعت رقم الموبايل اللي سجّلت بيه وهجيبلك آخر الطلبات."
            ),
            default=(
                "Sure 👍\n"
                "Send me your complaint or appointment reference number and I will "
                "check its status, or send the phone number you registered with."
            ),
        )

    try:
        CitizenService.update_memory(
            session_id=session_id,
            summary=current_summary,
            last_bot_message=reply,
        )
    except Exception as e:
        print(f"[Track Node] Persist error: {e}")

    return {
        "response": reply,
        "summary": current_summary,
        "last_bot_message": reply,
    }
