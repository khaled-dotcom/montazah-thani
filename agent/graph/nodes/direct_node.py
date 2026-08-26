from langchain_core.messages import HumanMessage, SystemMessage
from pydantic import BaseModel, Field

from graph.prompt_service.district_data import DistrictDataService
from graph.state import AgentState
from graph.utils import detect_language_fallback, org_name, org_name_en
from llm.model import invoke_structured
from software_services.citizen_services import CitizenService


class DirectResponse(BaseModel):
    reply: str = Field(description="The response message to the citizen.")
    summary: str = Field(
        description=(
            "An updated English summary of the conversation. Preserve every "
            "previously collected detail — name, phone, district, complaint and "
            "appointment progress and reference numbers."
        )
    )


DIRECT_SYSTEM_PROMPT = """
You are the front-desk assistant for {ORG}.

You handle greetings, small talk, and direct questions about the districts
themselves: addresses, working hours, phone numbers, hotlines, and who heads
each district.

====================
RULES
====================

1. Be polite, warm, and brief. This is a chat, not a letter.
2. Rely ONLY on the DISTRICTS DATA below. Never invent an address, a phone
   number, a hotline, working hours, or a name.
3. If the information is not in DISTRICTS DATA, say plainly that you do not
   have it, and offer what you can do instead.
4. Match the citizen's language and tone (Egyptian Arabic if they write Arabic).
5. If the citizen names a street or an area, use the coverage information to
   tell them which district it belongs to.

====================
FIRST MESSAGE / GREETING
====================

When greeting a citizen for the first time, introduce what you can do in one
short line each:

• تقديم بلاغ أو شكوى
• الاستعلام عن خدمة والأوراق المطلوبة
• حجز موعد لإنهاء معاملة
• متابعة حالة بلاغ أو موعد

Do not repeat this menu in every reply — only when it is actually useful.

====================
WHAT YOU MUST NOT DO
====================

- Never give legal advice or interpret regulations.
- Never state fees or required documents here — that is the inquiry flow's job.
- Never ask for national ID or any payment.
- Never promise anything on behalf of the district.
"""


def direct_node(state: AgentState) -> dict:

    session_id = state.get("session_id")
    user_message = state["user_message"]
    current_summary = state.get("summary") or ""
    last_bot_message = state.get("last_bot_message") or ""
    scoped_district_id = state.get("district_id")

    # لو الشات مفتوح من موقع حي معيّن نحقن بيانات الحي ده بس،
    # وإلا نحقن كل الأحياء عشان يقدر يجاوب على أي واحد فيهم
    if scoped_district_id:
        districts_block = DistrictDataService.district_info_block(scoped_district_id)
    else:
        districts_block = DistrictDataService.all_districts_info_block()


    system_prompt = f"""
{DIRECT_SYSTEM_PROMPT.replace('{ORG}', org_name())}

====================
DISTRICTS DATA
====================
{districts_block}

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
        parsed, raw_response = invoke_structured(DirectResponse, messages)

        clean_reply = parsed.reply
        new_summary = parsed.summary

    except Exception as e:
        print(f"[Direct Node] LLM error: {e}")

        clean_reply = detect_language_fallback(
            user_message,
            arabic=(
                f"أهلاً بيك في {org_name()} 👋\n"
                "أقدر أساعدك في:\n"
                "• تقديم بلاغ أو شكوى\n"
                "• الاستعلام عن خدمة والأوراق المطلوبة\n"
                "• حجز موعد لإنهاء معاملة\n"
                "• متابعة حالة بلاغ أو موعد"
            ),
            default=(
                f"Welcome to {org_name_en()} 👋\n"
                "I can help you with:\n"
                "• Filing a complaint\n"
                "• Asking about a service and its required documents\n"
                "• Booking an appointment\n"
                "• Tracking a complaint or appointment"
            ),
        )
        new_summary = current_summary
        raw_response = None

    usage = getattr(raw_response, "usage_metadata", None) if raw_response else None

    direct_usage = (
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
        print(f"[Direct Node] Persist error: {e}")

    return {
        "response": clean_reply,
        "summary": new_summary,
        "last_bot_message": clean_reply,
        "direct_usage": direct_usage,
    }
