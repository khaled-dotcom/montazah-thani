from langchain_core.messages import HumanMessage, SystemMessage

from graph.nodes.complaint_tools import save_complaint_tool
from graph.prompt_service.district_data import DistrictDataService
from graph.schemas.complaint_schema import ComplaintResponse
from graph.state import AgentState
from graph.utils import detect_language_fallback, org_name
from llm.model import invoke_structured
from software_services.citizen_services import CitizenService

COMPLAINT_SYSTEM_PROMPT = """
You are the complaints officer assistant for {ORG}.

Your task is to register citizen complaints accurately and respectfully, so the
field team can act on them without calling the citizen back for missing details.

====================
REQUIRED FIELDS
====================

بيانات مقدّم البلاغ:
- citizen_name     الاسم بالكامل
- national_id      الرقم القومي (14 رقم)
- phone            رقم الهاتف

بيانات البلاغ:
- district         الحي التابع له البلاغ
- category         تصنيف الشكوى
- address          المكان بالتحديد (شارع / علامة مميزة / رقم عقار)
- complaint_text   وصف المشكلة

اختياري:
- email            الإيميل — لإرسال تحديثات حالة البلاغ

====================
COLLECTING IDENTITY DATA
====================

The district needs a complete record to act on a complaint and to contact the
citizen back, so name, national ID and phone are all required.

NATIONAL ID
- It is 14 digits. If the citizen gives a different length, say so once and ask
  them to check — but if they insist, record what they gave.
- Never invent, complete, or "fix" a number.
- If the citizen asks why you need it, answer honestly: it is to register the
  complaint officially in the district's system and to follow up on it.
- If the citizen refuses outright after you explained why, do not argue and do
  not keep asking. Tell them the complaint cannot be registered officially
  without it, and offer the district's phone number so they can report it
  directly instead.

EMAIL — OPTIONAL, ASK ONCE
- Ask for it once, framed as a benefit: "عايز تستقبل تحديثات حالة البلاغ على
  إيميلك؟ لو عندك إيميل ابعته، ولو مش عايز عادي جدًا."
- If they decline, say nothing more about it and continue. Never ask twice.
- Never treat a missing email as a blocker.
- If what they send is clearly not an email address, ask once to confirm.

====================
REUSING WHAT THE CITIZEN ALREADY TOLD US
====================

If the COLLECTED SO FAR block already lists a value, the citizen gave it to you
earlier in this same conversation — possibly while filing something else.

- NEVER ask for it again. Not to "confirm", not to "make sure".
- Use it silently and move to the first field that is genuinely empty.
- It still appears in the confirmation summary, so the citizen sees exactly
  what is being submitted and can correct anything before confirming.
- Only re-ask if the citizen themself says the value changed.

Asking a citizen for their national ID twice in one conversation is the
fastest way to make them give up.

====================
FLOW RULES
====================

1. Ask for EVERYTHING still missing in ONE message, as a short bullet list.
   Never walk the citizen through one question per field — they can type it
   all in one go, and making them wait four turns is how you lose them.
2. Read several fields out of a single reply. A message like
   "حي المنتزه، شارع 45 جنب الصيدلية، القمامة مترمية من اسبوع" carries the
   district, the address and the description. Take all three.
3. Never ask for information you already have.
4. Never invent any field. If you do not know it, ask.
5. Match the citizen's language and tone (Egyptian Arabic if they write Arabic).
6. Never overwrite previously collected information unless the citizen
   explicitly changes it.
7. Infer the category yourself from the description. Never ask the citizen to
   pick from a list.
8. Infer the district from the address whenever the coverage data allows it.
   Only ask when you genuinely cannot work it out.

WHAT ASKING LOOKS LIKE

Several fields missing:

  "تمام. عشان أسجّل البلاغ محتاج:

   • الحي
   • المكان بالتحديد (الشارع وعلامة مميزة)"

One field missing — plain line, no list:

  "المكان فين بالتحديد؟ الشارع وعلامة مميزة تكفي."

====================
DISTRICT RESOLUTION
====================

- The district value you output MUST be copied exactly from the DISTRICTS list.
- If the citizen names a street or an area instead of a district, use the
  "يغطي" coverage information to work out the district yourself.
- If you cannot work it out, ask the citizen which district they belong to and
  offer the closest options from the list.
- Never invent a district that is not in the list.

====================
WHEN A FIELD IS GOOD ENOUGH — DO NOT OVER-ASK
====================

This is critical. Asking for detail you do not need makes citizens abandon the
complaint. A field is DONE the moment it meets the bar below. Never ask a
follow-up about a field that is already done.

complaint_text — DONE as soon as it names the problem well enough that a field
  team knows what they will find. These are all COMPLETE, ask nothing more:
     "الصرف طافح في الشارع"
     "القمامة مترميه من اسبوع"
     "عمود النور مطفي"
  Never ask about "حجم المشكلة" or "الوقت اللي حصلت فيه". If the citizen wants
  to add detail they will.

address — DONE once it has a street/area name AND one locator (landmark,
  building number, or "أمام/جنب X"). "شارع سيدي بشر البحري أمام الصيدلية" is
  COMPLETE. Only push back on a truly unusable address like "في شارع عندنا"
  or "جنب البيت", and only once.

citizen_name — DONE if it is a plausible name. Never ask them to add more names.

national_id — DONE if they gave 14 digits.

====================
NEVER LOOP
====================

- Never ask for a field that already has a value.
- Never repeat the question from your previous message. If you asked for
  something and the citizen replied with anything at all, either accept their
  answer or move on — never re-ask the same thing.
- If the citizen volunteers a field you did not ask for, record it immediately
  and do not ask for it later.
- Before writing your reply, work out which required fields are still genuinely
  empty and ask for ALL of them in one message. If none are empty, the system
  shows the confirmation summary — say nothing extra.

====================
CONFIRMATION
====================

Once everything is collected, summarise the complaint before asking for
confirmation:

الاسم:
الرقم القومي:
رقم التواصل:
الإيميل:            ← اكتب السطر ده بس لو المواطن أداه
الحي:
نوع الشكوى:
المكان:
الوصف:

Then ask: "أأكد إرسال البلاغ؟"

Only after an explicit confirmation may confirmed=true.

Words like نعم، أيوة، تمام، ابعتها، أكد، Confirm، Yes count as confirmation
ONLY if the assistant has just asked for confirmation.

====================
SAFETY
====================

Never register the same complaint twice.

If the summary indicates a complaint has already been saved:
- never return ready_to_save=true
- never call the complaint tool again

unless the citizen explicitly asks to file a NEW and DIFFERENT complaint.

Messages such as شكرا، تمام، أوكي، 👍، Done، Thanks after a saved complaint are
acknowledgements only.

====================
WHAT YOU MUST NOT DO
====================

- Never promise a specific resolution date.
- Never state fees, penalties, or legal outcomes.
- Never claim a field team "is on the way".
- Never blame or argue with the citizen, however angry they are.
- Keep replies short and suitable for chat. No long paragraphs.
"""


def complaint_node(state: AgentState) -> dict:

    session_id = state.get("session_id")
    user_message = state["user_message"]
    current_summary = state.get("summary") or ""
    last_bot_message = state.get("last_bot_message") or ""

    # الحي اللي الـ widget متركّب على موقعه، لو موجود
    scoped_district = state.get("district_name")


    scoped_block = (
        f"The citizen opened this chat from the website of: {scoped_district}.\n"
        "Use this district by default and do not ask which district they belong "
        "to, unless the citizen says the problem is somewhere else."
        if scoped_district
        else "The citizen's district is not known yet."
    )

    # المسودة المخزّنة هي المصدر الموثوق للحقول، مش الملخص النصي.
    # وبنبدأ من هوية المواطن المعروفة من أي مسار سابق في نفس الجلسة —
    # اللي قال اسمه ورقمه القومي عشان يحجز موعد مالوش لازمة يقولهم تاني
    # عشان يبلّغ عن قمامة.
    identity = state.get("identity") or {}

    identity_base = {}
    if identity.get("name"):
        identity_base["citizen_name"] = identity["name"]
    for key in ("national_id", "phone", "email"):
        if identity.get(key):
            identity_base[key] = identity[key]

    draft = {**identity_base, **(state.get("draft") or {})}

    FIELD_LABELS = [
        ("citizen_name",   "الاسم"),
        ("national_id",    "الرقم القومي"),
        ("phone",          "رقم التواصل"),
        ("email",          "الإيميل (اختياري)"),
        ("district",       "الحي"),
        ("category",       "نوع الشكوى"),
        ("address",        "المكان"),
        ("complaint_text", "وصف المشكلة"),
    ]

    have = [f"{label}: {draft[key]}" for key, label in FIELD_LABELS if draft.get(key)]
    need = [label for key, label in FIELD_LABELS
            if not draft.get(key) and key != "email"]

    draft_block = (
        "ALREADY CAPTURED (authoritative — never ask for any of these again):\n"
        + ("\n".join(have) if have else "(nothing yet)")
        + "\n\nSTILL MISSING (ask about the FIRST one only):\n"
        + ("\n".join(need) if need else "(nothing — go straight to the confirmation summary)")
    )

    system_prompt = f"""
{COMPLAINT_SYSTEM_PROMPT.replace('{ORG}', org_name())}

====================
COLLECTED SO FAR
====================
{draft_block}

====================
DISTRICTS
====================
{DistrictDataService.districts_list_block()}

====================
CATEGORIES
====================
{DistrictDataService.categories_block()}

====================
CHAT ORIGIN
====================
{scoped_block}

====================
ALREADY COLLECTED
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

    # ── LLM call ──────────────────────────────────────────────────────────────
    try:
        parsed, raw_response = invoke_structured(ComplaintResponse, messages)

    except Exception as e:
        print(f"[Complaint Node] LLM error: {e}")

        fallback = detect_language_fallback(
            user_message,
            arabic="عذرًا، حصل خطأ مؤقت. ممكن تحاول تاني؟",
            default="Sorry, a temporary error occurred. Please try again.",
        )

        return {
            "response": fallback,
            "summary": current_summary,
            "last_bot_message": fallback,
            "complaint_saved": False,
            "complaint_reference": None,
            "complaint_usage": None,
        }

    # ── usage ─────────────────────────────────────────────────────────────────
    usage = getattr(raw_response, "usage_metadata", None)

    complaint_usage = (
        {
            "input_tokens": usage.get("input_tokens", 0),
            "output_tokens": usage.get("output_tokens", 0),
            "total_tokens": usage.get("total_tokens", 0),
        }
        if usage
        else None
    )

    # ندمج استخراج الدور ده فوق المسودة — القيمة الفاضية ما بتمسحش القديمة
    complaint_data = CitizenService.merge_draft(
        draft,
        parsed.complaint.model_dump(exclude_none=True),
    )

    # الإيميل مش هنا عن قصد — اختياري
    required_fields = [
        "citizen_name",
        "national_id",
        "phone",
        "district",
        "category",
        "address",
        "complaint_text",
    ]

    all_fields_present = all(
        complaint_data.get(field)
        for field in required_fields
    )

    complaint_saved = False
    complaint_reference = None
    new_summary = parsed.summary

    # المواطن لازم يكون شاف بياناته قبل ما تتسجّل رسميًا باسمه.
    # الموديل بيقول confirmed=true أحيانًا على "تمام" اترمت في أي سياق،
    # فالشرط هنا حتمي: الملخص لازم يكون اتعرض في دور سابق فعلاً.
    summary_was_shown = bool(draft.get("awaiting_confirm"))

    # ── save ──────────────────────────────────────────────────────────────────
    if parsed.ready_to_save and parsed.confirmed and all_fields_present and summary_was_shown:

        try:
            save_result = save_complaint_tool.invoke(
                input={
                    **complaint_data,
                    "session_id": session_id,
                }
            )

            if save_result.success and save_result.complaint:
                complaint_saved = True
                complaint_reference = save_result.complaint.reference_id

                # الهوية بتفضل بعد ما البلاغ يتقفل عشان المسار الجاي يستخدمها
                CitizenService.remember_identity(
                    session_id,
                    name=complaint_data.get("citizen_name"),
                    national_id=complaint_data.get("national_id"),
                    phone=complaint_data.get("phone"),
                    email=complaint_data.get("email"),
                )

                # الإدارة اتحددت أوتوماتيك وقت الحفظ — نقول للمواطن راح لمين
                saved = save_result.complaint
                routed_to = saved.department.name if saved.department else None

                routing_line = (
                    f"تم تحويله لـ{routed_to}.\n"
                    if routed_to
                    else "هيتم تحويله للإدارة المختصة بالحي.\n"
                )

                clean_reply = detect_language_fallback(
                    user_message,
                    arabic=(
                        f"تم تسجيل بلاغك بنجاح ✅\n"
                        f"رقم البلاغ: *{complaint_reference}*\n"
                        f"{routing_line}"
                        f"احتفظ بالرقم ده عشان تقدر تتابع حالة البلاغ في أي وقت."
                    ),
                    default=(
                        f"Your complaint has been registered ✅\n"
                        f"Reference: *{complaint_reference}*\n"
                        f"Keep this number to track your complaint at any time.\n"
                        f"It has been forwarded to the responsible department."
                    ),
                )

            else:
                raise ValueError(save_result.message)

        except Exception as e:
            print(f"[Complaint Node] Tool error: {e}")

            complaint_saved = False
            new_summary = current_summary   # rollback الملخص عشان الحفظ يتعاد

            clean_reply = detect_language_fallback(
                user_message,
                arabic="حصل خطأ أثناء تسجيل البلاغ. ممكن تحاول تاني؟",
                default="An error occurred while saving your complaint. Please try again.",
            )

    else:
        clean_reply = parsed.reply

        # أول ما البيانات تكمل، الملخص بيتبني هنا — مش من الموديل.
        #
        # الموديل ساعات بيكتفي بـ"أأكد إرسال البلاغ؟" من غير ما يعرض حاجة،
        # فالمواطن يأكّد على بيانات مشافهاش وتتسجّل باسمه ورقمه القومي.
        # بناء الملخص في الكود بيضمن إنه بيشوف بالظبط اللي هيتبعت.
        if all_fields_present and not summary_was_shown:
            lines = [
                "راجع البيانات قبل الإرسال:",
                "",
                f"الاسم: {complaint_data.get('citizen_name')}",
                f"الرقم القومي: {complaint_data.get('national_id')}",
                f"رقم التواصل: {complaint_data.get('phone')}",
            ]

            if complaint_data.get("email"):
                lines.append(f"الإيميل: {complaint_data['email']}")

            lines += [
                f"الحي: {complaint_data.get('district')}",
                f"نوع الشكوى: {complaint_data.get('category')}",
                f"المكان: {complaint_data.get('address')}",
                f"الوصف: {complaint_data.get('complaint_text')}",
                "",
                "أأكد إرسال البلاغ؟",
            ]

            clean_reply = "\n".join(lines)
            complaint_data["awaiting_confirm"] = True

    # ── persist conversation state ────────────────────────────────────────────
    try:
        CitizenService.update_memory(
            session_id=session_id,
            summary=new_summary,
            last_bot_message=clean_reply,
            # المسار والمسودة يفضلوا لحد ما البلاغ يتحفظ فعلاً
            active_flow=None if complaint_saved else "complaint",
            draft=None if complaint_saved else complaint_data,
        )
    except Exception as e:
        print(f"[Complaint Node] Persist error: {e}")

    print(
        f"[Complaint Node] done | saved={complaint_saved} "
        f"| ref={complaint_reference} | usage={complaint_usage}"
    )

    return {
        "response": clean_reply,
        "summary": new_summary,
        "last_bot_message": clean_reply,
        "complaint_saved": complaint_saved,
        "complaint_reference": complaint_reference,
        "complaint_usage": complaint_usage,
    }
