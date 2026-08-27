"""
graph/nodes/complaint_node.py

بيفتح فورم البلاغ.

نفس السبب اللي في appointment_node: جمع سبع حقول بالمحادثة كان بياخد سبع
لفّات، وكل لفّة فيها احتمال إن الموديل يسأل تاني على حاجة اتقالت أو يعتبر
كلمة "أيوة" تأكيدًا على بلاغ هيتسجّل باسم المواطن ورقمه القومي وهو مشاف
البيانات أصلاً.

دلوقتي العقدة بترد بسطر قصير وبتفتح الفورم، والتسجيل والتوجيه للإدارة
المختصة بيحصلوا في graph/forms.py بعد تحقق كامل من كل حقل.
"""

from langchain_core.messages import HumanMessage, SystemMessage

from graph.forms import category_options, complaint_form
from graph.schemas.form_schema import ComplaintFormResponse
from graph.state import AgentState
from graph.utils import detect_language_fallback, org_name
from llm.model import invoke_structured
from software_services.citizen_services import CitizenService

COMPLAINT_SYSTEM_PROMPT = """
You are the complaints officer assistant for {ORG}.

A complaint FORM is about to open in the chat, directly under your reply. It
collects every field itself: full name, national ID, phone, email, district,
category, exact location and a description of the problem.

====================
YOUR ONLY JOB
====================

1. Write one or two short lines acknowledging the problem the citizen
   described and telling them the form is open below.
2. Fill in `category` from the CATEGORIES list when their message makes it
   clear, copied exactly as written there.
3. Fill in `complaint_text` with the problem in one clear sentence, and
   `address` if they already named a place.

Everything you fill in appears in the form as a starting point, and the
citizen can correct it before sending. So fill in what they actually said —
and nothing they did not.

====================
NEVER ASK FOR A FIELD
====================

Never ask the citizen for their name, national ID, phone number, email,
district or address. The form asks for all of it. Asking again is the single
worst thing you can do here — they will answer in chat, the form will still be
empty, and they will think the system is broken.

Wrong: "تمام، ممكن اسمك بالكامل ورقم الموبايل؟"
Right: "تمام، بلاغ عن القمامة. املا البيانات في الفورم اللي تحت وهيتسجّل ويتحوّل
        للإدارة المختصة."

====================
NEVER PROMISE AN OUTCOME
====================

Do not say when the problem will be fixed, or that it will be. Registering and
routing the report is what you can promise; a repair date is not yours to give.

====================
IF IT IS NOT THE DISTRICT'S JOB
====================

Electricity, telephone lines, gas and the metro belong to other authorities. Say
so plainly in one line and do not pretend the district will handle it — but if
the citizen still wants it on record, let them fill the form in.

====================
TONE
====================

Match the citizen's language and dialect. Someone reporting sewage in their
street is not having a good day: acknowledge it once, briefly, without
performing sympathy. Keep it to one or two lines — the form is doing the
talking, not you.
"""


def _categories_block() -> str:
    return "\n".join(f"- {o['label']}" for o in category_options())


def complaint_node(state: AgentState) -> dict:

    session_id = state.get("session_id")
    user_message = state["user_message"]
    district_id = state.get("district_id")
    district_name = state.get("district_name")

    identity = state.get("identity") or {}

    system_prompt = f"""
{COMPLAINT_SYSTEM_PROMPT.replace('{ORG}', org_name())}

====================
CATEGORIES (copy one of these exactly, or leave empty)
====================
{_categories_block()}

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
    complaint_usage = None

    try:
        parsed, raw_response = invoke_structured(ComplaintFormResponse, messages)

        reply = parsed.reply
        prefill = {
            "category": parsed.category,
            "address": parsed.address,
            "complaint_text": parsed.complaint_text,
        }

        usage = getattr(raw_response, "usage_metadata", None)
        if usage:
            complaint_usage = {
                "input_tokens": usage.get("input_tokens", 0),
                "output_tokens": usage.get("output_tokens", 0),
                "total_tokens": usage.get("total_tokens", 0),
            }

    except Exception as e:
        # الموديل وقع — الفورم بيتعرض بردو. المواطن جاي يبلّغ، وأقل حاجة
        # نقدر نعملها إننا نديله المكان اللي يكتب فيه بدل رسالة اعتذار
        print(f"[Complaint Node] LLM error: {e}")

        reply = detect_language_fallback(
            user_message,
            arabic="تمام، املا بيانات البلاغ في الفورم اللي تحت.",
            default="Understood — fill in the report form below.",
        )
        prefill = {"complaint_text": user_message}

    form = complaint_form(
        district_id=district_id,
        district_name=district_name,
        known=identity,
        prefill=prefill,
    )

    # مفيش مسار مفتوح بعد كده — الفورم شايل كل الحقول، فالرسالة الجاية
    # بتتصنّف من أول وجديد بدل ما تتحبس في مسار البلاغ
    try:
        CitizenService.update_memory(
            session_id=session_id,
            last_bot_message=reply,
            active_flow=None,
            draft=None,
        )
    except Exception as e:
        print(f"[Complaint Node] Persist error: {e}")

    print(f"[Complaint Node] form opened | prefill_category={prefill.get('category')}")

    return {
        "response": reply,
        "last_bot_message": reply,
        "form": form,
        "complaint_saved": False,
        "complaint_reference": None,
        "complaint_usage": complaint_usage,
    }
