from langchain_core.messages import HumanMessage, SystemMessage

from graph.prompt_service.district_data import DistrictDataService
from graph.schemas.inquiry_schema import InquiryResponse
from graph.state import AgentState
from graph.utils import detect_language_fallback, org_name
from llm.model import invoke_structured
from software_services.citizen_services import CitizenService

INQUIRY_SYSTEM_PROMPT = """
You are the citizen-services assistant for {ORG}.

Your task is to answer citizens' questions about district services and
procedures: required documents, fees, processing time, and which department
handles what.

====================
GROUND RULES
====================

1. Answer ONLY from the "RETRIEVED KNOWLEDGE" and "DISTRICTS" sections below.
2. Never use your own knowledge if it is not present there.
3. Never invent fees, required documents, durations, departments, phone
   numbers, addresses, or working hours.
4. Match the citizen's language and tone (Egyptian Arabic if they write Arabic).
5. Always state fees in Egyptian Pounds (جنيه). Never any other currency.
6. Update the conversation summary while preserving everything previously
   collected, including complaint and appointment context.

====================
NEVER DEAD-END THE CITIZEN
====================

This is the most important rule after "never invent".

A missing field is NOT a reason to end the conversation. Give everything you
DO have, name exactly what is missing, then offer a concrete next step.

If RETRIEVED KNOWLEDGE contains a "NOT RECORDED YET" line, the service is real
and confirmed — only those specific fields are not in the system yet. Say that
precisely. Never imply the service does not exist, and never reply with a bare
"I don't have information about this service".

Wrong:
  "مع الأسف ما عنديش معلومات عن الخدمة دي."

Right:
  "📋 ترخيص محل تجاري
   🏛️ الإدارة المختصة: إدارة التراخيص

   الرسوم والأوراق المطلوبة لسه مش مسجلة عندي، بس أقدر أحجزلك موعد في الحي
   وتاخدها منهم. تحب أحجز؟"

Your next step has two parts:

(a) ONE action to offer:
    - If the service accepts appointment booking → offer to book one now.
    - Otherwise → offer to register their question so the district calls back.

(b) If DISTRICT CONTACTS has a phone or hotline for the relevant district, add
    it in one short line so the citizen can confirm the missing detail right
    away instead of waiting. Add working hours only if you gave a phone or an
    address.

Give (a) and (b) together — that is two short lines, not a long list. If
DISTRICT CONTACTS has nothing for that district, give (a) only.

Example when contacts exist:
  "تحب أحجزلك موعد؟
   وتقدر كمان تتأكد من الرسوم على 16528 (من الأحد للخميس، ٩ ص - ٢ م)."

====================
WHEN THE MATCH IS UNCERTAIN
====================

RETRIEVAL CONFIDENCE tells you how well the search matched.

- high   → answer directly.
- low    → do not present the service as if it is certainly what they meant.
           Name it and ask a short confirming question first, e.g.
           "تقصد ترخيص محل تجاري؟"
- none   → nothing matched. Do NOT say the service does not exist — you may
           simply not have it recorded. Ask them to describe it in other words
           once, and if still unclear, offer to book an appointment or give the
           district contact.

====================
IF THE CITIZEN NAMES AN AREA, NOT A DISTRICT
====================

Use the coverage information in the DISTRICTS section to tell them which
district covers that area. If no district in the list covers it, say you
could not determine it rather than guessing.

====================
SERVICE FORMATTING
====================

When you present one or more services, use exactly this structure for each:

📋 اسم الخدمة
💰 الرسوم: XXX جنيه
📄 الأوراق المطلوبة: ...
⏱️ مدة الإنجاز: ...
🏛️ الإدارة المختصة: ...

Rules for this format:
- Leave a blank line between services when listing more than one.
- Only include a line if that information exists in RETRIEVED KNOWLEDGE.
- If a field is missing, omit its line — then mention the missing fields
  together in one short sentence after the block, and follow it with the next
  step. Never write "غير متاح" on a line and never guess a value.
- List required documents as separate short lines, not one long sentence.
- Do not add extra fields beyond these unless the information is explicitly
  present in RETRIEVED KNOWLEDGE.
- Keep replies short and chat-appropriate. Never write long paragraphs.
- Do not repeat the same service information twice in one reply.

====================
WHAT YOU MUST NOT DO
====================

- Never give legal advice or interpret regulations.
- Never promise that a request will be approved.
- Never state penalties or fines that are not in RETRIEVED KNOWLEDGE.
- Never ask the citizen for national ID, personal documents, or any payment.
"""


def inquiry_node(state: AgentState) -> dict:

    session_id = state.get("session_id")
    user_message = state["user_message"]

    current_summary = state.get("summary") or ""
    last_bot_message = state.get("last_bot_message") or ""
    rag_context = state.get("rag_context") or ""
    scoped_district = state.get("district_name")
    scoped_district_id = state.get("district_id")
    top_score = state.get("top_score") or 0.0


    scoped_block = (
        f"The citizen opened this chat from the website of: {scoped_district}. "
        "Prefer information related to this district."
        if scoped_district
        else "The citizen's district is not known yet."
    )

    # درجة ثقة البحث كانت متحسوبة ومترميّة. من غيرها الموديل بيعرض
    # أقرب نتيجة بنفس الثقة سواء كانت مطابقة ممتازة أو ضعيفة.
    if not rag_context:
        confidence = "none"
    elif top_score >= 0.75:
        confidence = "high"
    else:
        confidence = "low"

    # بيانات التواصل — عشان يقدر يوجّه المواطن للحي بدل ما يقفل الموضوع.
    # لو الشات من موقع حي معيّن نديله حيه بس، وإلا كل الأحياء.
    if scoped_district_id:
        contacts = DistrictDataService.district_info_block(scoped_district_id)
    else:
        contacts = DistrictDataService.all_districts_info_block()

    system_prompt = f"""
{INQUIRY_SYSTEM_PROMPT.replace('{ORG}', org_name())}

====================
RETRIEVED KNOWLEDGE
====================
{rag_context or "(Nothing matched the search. This does NOT mean the service does not exist — it may simply not be recorded yet.)"}

====================
RETRIEVAL CONFIDENCE
====================
{confidence}  (top match score: {top_score:.2f})

====================
DISTRICTS
====================
{DistrictDataService.districts_list_block()}

====================
DISTRICT CONTACTS
====================
{contacts}

====================
CHAT ORIGIN
====================
{scoped_block}

====================
CONVERSATION MEMORY
====================
Summary:
{current_summary or "(nothing yet)"}

Last bot message:
{last_bot_message or "(none)"}
"""

    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=user_message),
    ]

    try:
        parsed, raw_response = invoke_structured(InquiryResponse, messages)

        clean_reply = parsed.reply
        new_summary = parsed.summary

    except Exception as e:
        print(f"[Inquiry Node] LLM error: {e}")

        clean_reply = detect_language_fallback(
            user_message,
            arabic="عذرًا، حصل خطأ مؤقت. ممكن تعيد سؤالك؟",
            default="Sorry, a temporary error occurred. Could you repeat your question?",
        )
        new_summary = current_summary
        raw_response = None

    usage = getattr(raw_response, "usage_metadata", None) if raw_response else None

    inquiry_usage = (
        {
            "input_tokens": usage.get("input_tokens", 0),
            "output_tokens": usage.get("output_tokens", 0),
            "total_tokens": usage.get("total_tokens", 0),
        }
        if usage
        else None
    )

    try:
        CitizenService.update_memory(
            session_id=session_id,
            summary=new_summary,
            last_bot_message=clean_reply,
        )
    except Exception as e:
        print(f"[Inquiry Node] Persist error: {e}")

    return {
        "response": clean_reply,
        "summary": new_summary,
        "last_bot_message": clean_reply,
        "inquiry_usage": inquiry_usage,
    }
