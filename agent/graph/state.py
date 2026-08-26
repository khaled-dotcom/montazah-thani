from typing import Any, TypedDict, Optional

from graph.schemas.intent_schema import RefinedQuery


class AgentState(TypedDict):

    # ── session ───────────────────────────────────────────────────────────────
    # هوية المحادثة على الويب: session_id المتولّد في المتصفح
    session_id: Optional[str]

    # الحي اللي الـ widget متركّب على موقعه (لو موجود) — بيخلي البوت
    # ميسألش المواطن "انت تابع أنهي حي؟" وهو أصلاً داخل من موقع الحي
    district_id: Optional[int]
    district_name: Optional[str]

    # ── conversation ──────────────────────────────────────────────────────────
    user_message: str
    response: Optional[str]

    # ── routing ───────────────────────────────────────────────────────────────
    intent: Optional[str]
    refined_queries: Optional[list[RefinedQuery]]

    # ── memory ────────────────────────────────────────────────────────────────
    summary: Optional[str]
    last_bot_message: Optional[str]

    # المسار المفتوح من الدور السابق: "complaint" | "appointment" | None
    active_flow: Optional[str]

    # الحقول المتجمّعة في المسار المفتوح — المصدر الموثوق، مش الملخص
    draft: Optional[dict]

    # هوية المواطن (اسم/رقم قومي/تليفون/إيميل) — بتعيش عبر كل المسارات
    identity: Optional[dict]

    # الاسم + الرقم القومي + التليفون كلهم متسجلين؟ لو لأ، الرسالة
    # بتروح لبوابة الاستقبال قبل أي حاجة
    identity_complete: Optional[bool]
    intake_complete: Optional[bool]

    # ── flags ─────────────────────────────────────────────────────────────────
    complaint_saved: Optional[bool]
    appointment_saved: Optional[bool]

    # ── references produced this turn ─────────────────────────────────────────
    complaint_reference: Optional[str]
    appointment_reference: Optional[str]
    appointment_ticket: Optional[bytes]

    # ── retrieval ─────────────────────────────────────────────────────────────
    rag_context: Optional[str]
    search_results: Optional[list[Any]]
    top_score: Optional[float]

    # ── usage ─────────────────────────────────────────────────────────────────
    intent_usage: Optional[dict]
    inquiry_usage: Optional[dict]
    complaint_usage: Optional[dict]
    appointment_usage: Optional[dict]
    intake_usage: Optional[dict]
    direct_usage: Optional[dict]
