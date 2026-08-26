from langchain_core.messages import HumanMessage, SystemMessage

from graph.state import AgentState
from graph.utils import org_name
from llm.model import invoke_structured
from graph.schemas.intent_schema import IntentResponse, IntentType


INTENT_SYSTEM_PROMPT = """
You are the router for the citizen-services assistant of {ORG}.

You are responsible ONLY for routing and search query generation.

You NEVER answer the citizen.

You ONLY return the structured output.

====================================================
TASK 1 : Intent Classification
====================================================

Choose exactly ONE intent.

complaint
The citizen reports a problem in the street or neighbourhood that the district
is responsible for: garbage, sewage overflow, broken street lighting, damaged
roads, illegal street occupancy, illegal construction, water leaks, neglected
parks, stray dogs, and similar field problems.
Also chosen when the citizen is continuing an existing complaint flow or is
providing complaint information such as the location or their phone number.
Examples:
"القمامة مترميه في الشارع من اسبوع"
"عمود النور مطفي في شارع كذا"
"في مبنى بيتبني مخالف جنبنا"
"الصرف طافح"

inquiry
The citizen asks about a district service or procedure: required documents,
fees, processing time, which department handles it, how to complete it, or
which district covers a given area.
Examples:
"عايز اطلع رخصة محل، محتاج ايه؟"
"رسوم شهادة كذا كام؟"
"سيدي بشر تابعه انهي حي؟"
"الاوراق المطلوبة لترخيص اعلان"

appointment
The citizen wants to book, continue booking, confirm, or provide information
for an appointment to complete a procedure at the district office.
Examples:
"عايز احجز ميعاد"
"ممكن ميعاد الاحد الجاي"
"اسمي احمد ورقمي 010..."

track
The citizen asks about the status of an existing complaint or appointment, or
mentions a reference number.
Examples:
"البلاغ بتاعي وصل لفين؟"
"رقم الطلب A1B2C3، ايه اخباره؟"
"حجزت ميعاد امبارح عايز اتأكد"

direct
Greetings, thanks, small talk, working hours, addresses, phone numbers,
and anything that is not one of the above.
Examples:
"السلام عليكم"
"الحي بيفتح الساعة كام؟"
"شكرا"

====================================================
TASK 2 : Refined Search Queries
====================================================

Extract ONE search object for EVERY district service, procedure, document, or
district/area name mentioned by the citizen.

Each search object MUST contain:

• query
The canonical name of the service or district.

• aliases
Equivalent names that refer to EXACTLY the same service or district.

Include when highly confident:
- the formal administrative name
- the colloquial Egyptian name people actually use
- common spelling variations
- the English name if commonly used

Example of valid aliases:

رخصة محل
ترخيص محل
تصريح مزاولة نشاط
رخصة تشغيل

Do NOT include:
- related but different services
- department names
- misspellings and typing mistakes

• keywords
Retrieval keywords related to the service.

Example:

رخصة محل

keywords:
تراخيص
مزاولة نشاط
عقد ايجار
سجل تجاري
بطاقة ضريبية
حماية مدنية

• description
A very short description (one sentence maximum) used ONLY to improve semantic
retrieval.

====================================================
Rules
====================================================

- Create one search object per service or district entity.
- Do not merge unrelated services.
- Do not invent services that do not exist.
- Only generate aliases and keywords when highly confident.
- If no service or district entity exists in the message, return an empty list.
- Never answer the citizen's question.
- Never state fees, documents, or procedures.

====================================================
Conversation Continuation
====================================================

If the conversation summary indicates the citizen is already inside a flow
(complaint, appointment), keep that same intent even if the latest message is
short, such as:

"تمام"
"اكمل"
"ايوة"
"yes"
"اه"
"01012345678"

A bare phone number, name, or address is almost always a continuation of the
flow that is currently open in the summary — not a new intent.

====================================================

Return ONLY the structured output.
"""


def intent_node(state: AgentState):

    user_message = state["user_message"]
    summary = state.get("summary", "")
    active_flow = state.get("active_flow")

    flow_block = (
        f"""
IMPORTANT — AN UNFINISHED {active_flow.upper()} IS IN PROGRESS.

The citizen is in the middle of filing a {active_flow} and has not finished it.
Any message that supplies information (a name, a national ID, a phone number,
an address, a district, an email, a date, a confirmation) belongs to that flow.
Classify it as "{active_flow}".

Only choose a different intent if the citizen clearly changes the subject —
for example asking about the fees of a service, or asking to track a different
request by its reference number.
"""
        if active_flow else ""
    )

    messages = [
        SystemMessage(
            content=f"""
{INTENT_SYSTEM_PROMPT.replace('{ORG}', org_name())}
{flow_block}
Conversation Summary:
{summary or "(no previous conversation)"}
"""
        ),
        HumanMessage(content=user_message),
    ]

    try:
        parsed, raw = invoke_structured(IntentResponse, messages)

    except Exception as e:
        print(f"[Intent Node] LLM error: {e}")
        # لو فيه مسار مفتوح، الرجوع لـ direct بيمسح البيانات المتجمّعة —
        # نفضل في المسار بدل ما نضيّع شغل المواطن
        return {
            "intent": active_flow or IntentType.DIRECT.value,
            "refined_queries": [],
            "intent_usage": None,
        }

    usage = getattr(raw, "usage_metadata", None)

    intent_usage = None

    if usage:
        intent_usage = {
            "input_tokens": usage.get("input_tokens", 0),
            "output_tokens": usage.get("output_tokens", 0),
            "total_tokens": usage.get("total_tokens", 0),
        }

    intent = parsed.intent.value

    # حارس حتمي: "direct" هو سلة المهملات اللي بيقع فيها أي كلام مش واضح.
    # لو فيه مسار مفتوح ووقعت الرسالة في السلة دي، ده تصنيف غلط شبه أكيد —
    # وعقدة direct بتعيد كتابة الملخص وتمسح البيانات المتجمّعة، فالمواطن
    # يرجع من الأول. نية صريحة تانية (استعلام/متابعة) بتعدي عادي.
    if active_flow and intent == IntentType.DIRECT.value:
        print(f"[Intent Node] direct -> {active_flow} (unfinished flow)")
        intent = active_flow

    return {
        "intent": intent,
        "refined_queries": parsed.refined_queries,
        "intent_usage": intent_usage,
    }
