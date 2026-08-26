"""
graph/nodes/intake_node.py

بوابة الدخول: بتجمع بيانات المواطن الأساسية قبل أي مهمة.

ليه خطوة مستقلة مش أسئلة متفرقة جوه كل مسار:

- البيانات بتتجمع مرة واحدة وتتخزن على الجلسة، فأي مهمة بعد كده — بلاغ،
  موعد، استعلام — بتلاقيها جاهزة وما بتسألش عليها تاني.
- المواطن بيعرف من الأول إن ده تسجيل رسمي، مش دردشة.
- الكود بيقفل المسار ده بشرط حتمي (الاسم + الرقم القومي + التليفون)،
  مش بمزاج الموديل.

المسار ده بيتخطى نداء تصنيف النية بالكامل — لو البيانات ناقصة مفيش داعي
نعرف هو عايز إيه، بنسجّل كلامه في pending_request ونكمّل بيه بعد ما نخلص.
"""

from langchain_core.messages import HumanMessage, SystemMessage

from graph.schemas.intake_schema import IntakeResponse
from graph.state import AgentState
from graph.utils import detect_language_fallback, org_name, org_name_en
from llm.model import invoke_structured
from software_services.citizen_services import CitizenService

INTAKE_SYSTEM_PROMPT = """
You are the registration desk for {ORG}.
Introduce yourself with that name and no other body's.

Before anything else, you register the citizen. Nothing they ask for can be
processed until their basic details are on file, exactly as at a government
counter where the clerk takes your ID first.

====================
WHAT YOU COLLECT
====================

REQUIRED — in this order:
1. name          الاسم بالكامل
2. national_id   الرقم القومي (14 رقم)
3. phone         رقم الموبايل (11 رقم يبدأ بـ 01)

OPTIONAL — ask once, at the end:
4. email         الإيميل

====================
HOW TO ASK — ALL AT ONCE, NEVER ONE BY ONE
====================

Ask for EVERYTHING still missing in a SINGLE message, as a short list.

Dragging a citizen through four separate questions to collect four fields is
the fastest way to lose them. They can type it all in one go — let them.

FIRST MESSAGE — ask for all three required fields together:

  "أهلاً بيك في {ORG} 👋
   عشان أسجّل طلبك، محتاج البيانات دي:

   • الاسم بالكامل
   • الرقم القومي (14 رقم)
   • رقم الموبايل

   ابعتهم في رسالة واحدة عادي."

IF THEY ALREADY SAID WHAT THEY WANT — acknowledge in one clause first:

  "تمام، بلاغ عن القمامة. عشان أسجّله محتاج:
   • الاسم بالكامل
   • الرقم القومي (14 رقم)
   • رقم الموبايل"

Put what they wanted into pending_request, in their own words, and keep
carrying that same value on every later turn.

READING THEIR REPLY
Expect several fields in one message and take them all. You can tell them
apart by shape, not by order:
  - 14 digits  → national_id
  - 11 digits starting with 01 → phone
  - text with an @ → email
  - Arabic words that are a person's name → name

"احمد محمد 29805152101234 01012345678" contains all three. Take all three.
Never ask again for anything you just extracted.

FOLLOW-UP MESSAGES
List ONLY what is still missing, in one message:

  "ناقص:
   • الرقم القومي
   • رقم الموبايل"

If only one field is missing, ask for it in one plain line without a list.
Never repeat a question about a field you already have.

====================
VALIDATION
====================

NATIONAL ID — 14 digits.
- If they give a different number of digits, say so once and ask them to
  check: "الرقم القومي المفروض 14 رقم، ممكن تتأكد؟"
- If they repeat the same value, accept it and move on. Do not argue twice.
- Never invent, pad, or correct a number.

PHONE — 11 digits starting with 01.
- Same rule: flag once, accept on repeat.

EMAIL — optional, and asked TOGETHER with the last required field, never as
a separate round trip. Add it as one extra bullet:

  "ناقص:
   • رقم الموبايل
   • الإيميل (اختياري — لو عايز يوصلك تحديثات)"

- Any refusal — "لأ", "مش عندي", "مش عايز" — is a complete answer. Move on
  immediately and never mention email again.
- If the required fields all arrived in one message and email was not among
  them, do NOT hold the citizen for one more round just to ask about it.
  Mention it in the completion message instead and finish:

  "تمام يا أحمد، اتسجّلت بياناتك ✅
   (لو حابب توصلك التحديثات على الإيميل ابعته في أي وقت.)"

  In that case set complete=true — email is never a blocker.

====================
IF THEY REFUSE A REQUIRED FIELD
====================

Explain once, honestly: the details are needed to register the request
officially in the district's system and to follow up with them.

If they still refuse, do not argue and do not keep asking. Tell them you
cannot register the request without it, and that they can call the district
directly instead. Leave the field empty.

====================
WHEN YOU ARE DONE
====================

Set complete=true only when name, national_id and phone are all present AND
you have asked about email once.

Your final message confirms the details back and hands over — nothing else:

  "تمام يا أحمد، اتسجّلت بياناتك ✅
   دلوقتي قولّي، محتاج إيه؟"

If pending_request has a value, say you are continuing with it instead:

  "تمام يا أحمد، اتسجّلت بياناتك ✅
   نكمّل في بلاغ القمامة."

====================
WHAT YOU MUST NOT DO
====================

- Never answer questions about services, fees, or documents. That is another
  step's job — if they ask, say you will get to it right after registration.
- Never register a complaint or book an appointment here.
- Never invent any value.
- Never ask for anything beyond the four fields above.
"""


def intake_node(state: AgentState) -> dict:

    session_id = state.get("session_id")
    user_message = state["user_message"]
    last_bot_message = state.get("last_bot_message") or ""

    identity = state.get("identity") or {}
    draft = state.get("draft") or {}

    # المعروف لحد دلوقتي: الهوية المخزّنة + أي حاجة اتقالت في المسودة
    known = {
        "name":        identity.get("name") or draft.get("name"),
        "national_id": identity.get("national_id") or draft.get("national_id"),
        "phone":       identity.get("phone") or draft.get("phone"),
        "email":       identity.get("email") or draft.get("email"),
    }

    LABELS = [
        ("name",        "الاسم"),
        ("national_id", "الرقم القومي"),
        ("phone",       "رقم الموبايل"),
        ("email",       "الإيميل (اختياري)"),
    ]

    have = [f"{label}: {known[key]}" for key, label in LABELS if known.get(key)]
    need = [label for key, label in LABELS if not known.get(key) and key != "email"]

    pending = draft.get("pending_request")

    system_prompt = f"""
{INTAKE_SYSTEM_PROMPT.replace('{ORG}', org_name())}

====================
COLLECTED SO FAR
====================
{chr(10).join(have) if have else "(nothing yet — this is the start)"}

STILL MISSING (ask about the FIRST one only):
{chr(10).join(need) if need else "(nothing required is missing)"}

Asked about email already: {"yes" if known.get("email") or "إيميل" in last_bot_message else "no"}

====================
WHAT THE CITIZEN CAME FOR
====================
{pending or "(not stated yet)"}

====================
YOUR PREVIOUS MESSAGE
====================
{last_bot_message or "(none — this is the first message)"}
"""

    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=user_message),
    ]

    try:
        parsed, raw_response = invoke_structured(IntakeResponse, messages)

    except Exception as e:
        print(f"[Intake Node] LLM error: {e}")

        fallback = detect_language_fallback(
            user_message,
            arabic=(
                f"أهلاً بيك في {org_name()} 👋\n"
                "عشان أقدر أسجّل طلبك، محتاج بياناتك الأول.\n"
                "ممكن اسمك بالكامل؟"
            ),
            default=(
                f"Welcome to {org_name_en()} 👋\n"
                "I need your details before I can register your request.\n"
                "Could you give me your full name?"
            ),
        )

        return {
            "response": fallback,
            "last_bot_message": fallback,
            "intake_usage": None,
        }

    usage = getattr(raw_response, "usage_metadata", None)

    intake_usage = (
        {
            "input_tokens": usage.get("input_tokens", 0),
            "output_tokens": usage.get("output_tokens", 0),
            "total_tokens": usage.get("total_tokens", 0),
        }
        if usage
        else None
    )

    # ندمج فوق المعروف — القيمة الفاضية ما بتمسحش القديمة
    collected = CitizenService.merge_draft(
        known, parsed.data.model_dump(exclude_none=True)
    )

    if parsed.pending_request:
        collected["pending_request"] = parsed.pending_request
    elif pending:
        collected["pending_request"] = pending

    # الاكتمال بيتحدد بالكود مش بالموديل — الموديل ممكن يقول complete=true
    # وهو ناقص حقل، وساعتها المواطن يدخل مسار من غير بياناته
    required_present = all(collected.get(k) for k in ("name", "national_id", "phone"))
    is_complete = bool(parsed.complete and required_present)

    clean_reply = parsed.reply

    try:
        if is_complete:
            # الهوية بتتثبّت على الجلسة، والمسودة بتفضل شايلة الطلب المعلّق
            CitizenService.remember_identity(
                session_id,
                name=collected.get("name"),
                national_id=collected.get("national_id"),
                phone=collected.get("phone"),
                email=collected.get("email"),
            )

            CitizenService.update_memory(
                session_id=session_id,
                last_bot_message=clean_reply,
                active_flow=None,
                draft={"pending_request": collected["pending_request"]}
                if collected.get("pending_request") else None,
            )
        else:
            CitizenService.update_memory(
                session_id=session_id,
                last_bot_message=clean_reply,
                active_flow="intake",
                draft=collected,
            )

    except Exception as e:
        print(f"[Intake Node] Persist error: {e}")

    print(
        f"[Intake Node] complete={is_complete} | "
        f"have={[k for k in ('name','national_id','phone','email') if collected.get(k)]}"
    )

    return {
        "response": clean_reply,
        "last_bot_message": clean_reply,
        "intake_complete": is_complete,
        "intake_usage": intake_usage,
    }
