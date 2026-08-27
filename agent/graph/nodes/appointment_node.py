"""
graph/nodes/appointment_node.py

بيفتح فورم حجز الموعد.

العقدة دي كانت بتجمع سبع حقول بالمحادثة: تسأل على الاسم، تستنى، تسأل على
الرقم القومي، تستنى... وكل دورة فيها احتمال إن الموديل يسأل تاني على حاجة
اتقالت خلاص، أو يقرا "تمام" على إنها تأكيد لبيانات المواطن مشافهاش.

دلوقتي بتعمل حاجة واحدة: بترد بسطر قصير وبتفتح الفورم. المواطن بيشوف كل
الحقول مرة واحدة، بيملاها، وبيبعتها — والحفظ بيعدّي على تحقق كامل في
graph/forms.py، مش على قرار من الموديل.
"""

from langchain_core.messages import HumanMessage, SystemMessage

from graph.forms import appointment_form, service_options
from graph.schemas.form_schema import AppointmentFormResponse
from graph.state import AgentState
from graph.utils import detect_language_fallback, org_name
from llm.model import invoke_structured
from software_services.citizen_services import CitizenService

APPOINTMENT_SYSTEM_PROMPT = """
You are the appointments assistant for {ORG}.

A booking FORM is about to open in the chat, directly under your reply. It
collects every field itself: full name, national ID, phone, email, district,
service, day, time and notes.

====================
YOUR ONLY JOB
====================

1. Write one or two short lines telling the citizen the form is open below and
   asking them to fill it in.
2. Fill in `service` when what they asked for matches one of the SERVICE
   OPTIONS, copied exactly as written there.
3. Put any extra detail about the visit in `note`.

====================
NEVER ASK FOR A FIELD
====================

Never ask the citizen for their name, national ID, phone number, email,
district, preferred day or time. The form asks for all of it. Asking again is
the single worst thing you can do here — they will answer in chat, the form
will still be empty, and they will think the system is broken.

Wrong: "تمام، ممكن اسمك بالكامل والرقم القومي؟"
Right: "تمام، هحجزلك موعد. املا البيانات في الفورم اللي تحت وهيتسجّل على طول."

====================
ANSWERING A QUESTION FIRST
====================

If they asked about fees, required documents, or processing time, answer it in
ONE short line from VERIFIED SERVICES, then point them at the form.

A fee is usually recorded as a rule rather than a figure — a `Fees Note` line
such as «تختلف حسب النشاط والمساحة وفق اللائحة التنفيذية». That IS the answer;
give it as it stands and never call it a missing fee.

  "رسوم ترخيص المحل بتختلف حسب النشاط والمساحة وفق اللائحة التنفيذية.
   املا الفورم تحت وهحجزلك."

Never invent a fee, a document, or a duration. If VERIFIED SERVICES genuinely
does not have it, say it is not recorded and that they will know it at the
district — that is never a reason to hold up the booking.

====================
SERVICE MATCHING
====================

`service` MUST be copied character for character from SERVICE OPTIONS, or left
empty. Never reword it, never shorten it, never invent one. An empty value is
correct and harmless — the citizen picks from the list themselves, and the
list lets them type their own service if it is not there.

====================
TONE
====================

Match the citizen's language and dialect. Keep it to one or two lines — the
form is doing the talking, not you.
"""


def _options_block(options: list[dict]) -> str:
    if not options:
        return "(no services recorded — leave `service` empty)"
    return "\n".join(f"- {o['label']}" for o in options)


def appointment_node(state: AgentState) -> dict:

    session_id = state.get("session_id")
    user_message = state["user_message"]
    matched_context = state.get("rag_context") or ""
    district_id = state.get("district_id")
    district_name = state.get("district_name")

    identity = state.get("identity") or {}
    options = service_options(district_id)

    system_prompt = f"""
{APPOINTMENT_SYSTEM_PROMPT.replace('{ORG}', org_name())}

====================
SERVICE OPTIONS (copy one of these exactly, or leave empty)
====================
{_options_block(options)}

====================
VERIFIED SERVICES (retrieved from the knowledge base)
====================
{matched_context or "(nothing matched — do not invent fees, documents, or procedures)"}

====================
CHAT ORIGIN
====================
{
    f"The citizen opened this chat from the website of {district_name}, so the "
    "form already has their district filled in."
    if district_name
    else "The citizen's district is not known — the form asks them to pick it."
}
"""

    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=user_message),
    ]

    prefill: dict = {}
    appointment_usage = None

    try:
        parsed, raw_response = invoke_structured(AppointmentFormResponse, messages)

        reply = parsed.reply
        prefill = {"service": parsed.service, "note": parsed.note}

        usage = getattr(raw_response, "usage_metadata", None)
        if usage:
            appointment_usage = {
                "input_tokens": usage.get("input_tokens", 0),
                "output_tokens": usage.get("output_tokens", 0),
                "total_tokens": usage.get("total_tokens", 0),
            }

    except Exception as e:
        # الموديل وقع — الفورم هو الشغل الحقيقي وهو مش محتاجه، فبيتعرض
        # بردو مع سطر ثابت بدل ما المواطن يتقاله "حصل خطأ" وهو مش محتاج
        # غير إنه يملا بياناته
        print(f"[Appointment Node] LLM error: {e}")

        reply = detect_language_fallback(
            user_message,
            arabic="تمام، املا بيانات الحجز في الفورم اللي تحت.",
            default="Sure — fill in the booking form below.",
        )

    form = appointment_form(
        district_id=district_id,
        district_name=district_name,
        known=identity,
        prefill=prefill,
    )

    # مفيش مسار مفتوح بعد كده: الفورم شايل كل الحقول، فالرسالة الجاية من
    # المواطن رسالة جديدة مش استكمال لمسار — والسؤال بيتصنّف من أول وجديد
    try:
        CitizenService.update_memory(
            session_id=session_id,
            last_bot_message=reply,
            active_flow=None,
            draft=None,
        )
    except Exception as e:
        print(f"[Appointment Node] Persist error: {e}")

    print(f"[Appointment Node] form opened | prefill_service={prefill.get('service')}")

    return {
        "response": reply,
        "last_bot_message": reply,
        "form": form,
        "appointment_saved": False,
        "appointment_reference": None,
        "appointment_ticket": None,
        "appointment_usage": appointment_usage,
    }
