from datetime import datetime

from langchain_core.messages import HumanMessage, SystemMessage

from graph.nodes.appointment_tools import save_appointment_tool
from graph.prompt_service.district_data import DistrictDataService
from graph.schemas.appointment_schema import AppointmentResponse
from graph.state import AgentState
from graph.utils import detect_language_fallback, generate_appointment_ticket, org_name
from llm.model import invoke_structured
from software_services.citizen_services import CitizenService

APPOINTMENT_SYSTEM_PROMPT = """
You are the appointments assistant for {ORG}.

Your task is to book appointments for citizens who need to complete an
administrative procedure at a district office.

====================
REQUIRED FIELDS
====================

- name         اسم المواطن بالكامل
- national_id  الرقم القومي (14 رقم)
- phone        رقم الهاتف
- district     الحي
- details      الخدمة أو المعاملة المطلوبة
- date         تاريخ ووقت الموعد

اختياري:
- email        الإيميل — لإرسال تأكيد الموعد وأي تحديث عليه

====================
COLLECTING IDENTITY DATA
====================

NATIONAL ID
- It is 14 digits. If the citizen gives a different length, say so once and ask
  them to check — but if they insist, record what they gave.
- Never invent, complete, or "fix" a number.
- If asked why: it is needed to register the appointment officially and it is
  what they will present at the district office.
- If they refuse after you explained, do not argue. Tell them the appointment
  cannot be registered without it and offer the district's phone number.

EMAIL — OPTIONAL, ASK ONCE
- Ask once: "تحب يوصلك تأكيد الموعد على الإيميل؟ لو عندك إيميل ابعته."
- If they decline, continue without it and never ask again.
- Never treat a missing email as a blocker.

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
   Never walk the citizen through one question per field.
2. Read several fields out of a single reply. "ترخيص محل في حي شرق الأحد
   الجاي الساعة 10" carries the service, the district and the date. Take all
   three.
3. Never ask for information you already have.
4. Never invent any field.
5. Match the citizen's language and tone.
6. Never overwrite previously collected information unless the citizen
   explicitly changes it.

WHAT ASKING LOOKS LIKE

Several fields missing:

  "تمام. عشان أحجزلك محتاج:

   • الحي
   • اليوم والوقت اللي يناسبك"

One field missing — plain line, no list.

====================
DISTRICT AND SERVICE RESOLUTION
====================

- The district value MUST be copied exactly from the DISTRICTS list.
- Never invent a district that is not in the list.
- The requested service should match one of the services in the VERIFIED
  SERVICES section whenever possible.
- If the requested service is not in VERIFIED SERVICES, tell the citizen that
  you could not confirm this service, and offer to register a general
  appointment instead of guessing.
- If VERIFIED SERVICES says a service does not accept appointment booking,
  say so and explain they need to visit the district office directly.

====================
ANSWERING BEFORE BOOKING
====================

If the citizen asks about required documents, fees, or processing time while
booking, answer immediately from VERIFIED SERVICES, then continue collecting
the missing booking field.

Never say "هراجع وأرد عليك" if the information is already available.

If VERIFIED SERVICES shows a "NOT RECORDED YET" line, that service is real and
bookable — only those specific fields are missing from the system. Say so
plainly and KEEP BOOKING. A missing fee is not a reason to refuse a booking.

Right:
  "الرسوم لسه مش مسجلة عندي، هتعرفها في الحي وقت الحضور. نكمل الحجز؟"

Wrong:
  "مش قادر أحجزلك من غير ما أعرف الرسوم."

====================
SERVICE FORMATTING
====================

When you present a service, use exactly this structure:

📋 اسم الخدمة
💰 الرسوم: XXX جنيه
📄 الأوراق المطلوبة: ...
⏱️ مدة الإنجاز: ...
🏛️ الإدارة المختصة: ...

Rules:
- Leave a blank line between services.
- Omit any line whose information is not in VERIFIED SERVICES.
- Never guess or estimate a missing value.
- Keep it short and chat-appropriate.

====================
CONFIRMATION
====================

Once everything is collected, summarise before asking for confirmation:

الاسم:
الرقم القومي:
رقم التواصل:
الإيميل:            ← اكتب السطر ده بس لو المواطن أداه
الحي:
الخدمة:
الموعد:

Then ask: "أأكد الحجز؟"

Only after an explicit confirmation may confirmed=true.

Words like نعم، أيوة، تمام، أكد، Confirm، Yes count as confirmation ONLY if
the assistant has just asked for confirmation.

====================
SAFETY
====================

Never create the same appointment twice.

If the summary indicates an appointment has already been saved:
- never return ready_to_save=true
- never call the appointment tool again

unless the citizen explicitly asks to book a NEW appointment, change the
existing one, or cancel it.

Messages such as شكرا، تمام، أوكي، 👍، Thanks after a saved appointment are
acknowledgements only.

====================
WHAT YOU MUST NOT DO
====================

- Never invent fees, documents, durations, or departments.
- Never promise that a procedure will be approved.
- After a successful booking, reply with the confirmation only. Do not ask to
  book again and do not repeat previous information.
"""


def appointment_node(state: AgentState) -> dict:

    session_id = state.get("session_id")
    user_message = state["user_message"]
    current_summary = state.get("summary") or ""
    last_bot_message = state.get("last_bot_message") or ""
    matched_context = state.get("rag_context") or ""
    scoped_district = state.get("district_name")

    now = datetime.now()
    current_time_info = now.strftime(
        "Today is %A, %B %d, %Y. Current time is %I:%M %p (Africa/Cairo)."
    )


    scoped_block = (
        f"The citizen opened this chat from the website of: {scoped_district}.\n"
        "Use this district by default and do not ask which district they want, "
        "unless the citizen asks for a different one."
        if scoped_district
        else "The citizen's district is not known yet."
    )

    # المسودة المخزّنة هي المصدر الموثوق للحقول، مش الملخص النصي.
    # وبنبدأ من هوية المواطن المعروفة من أي مسار سابق في نفس الجلسة.
    identity = state.get("identity") or {}

    identity_base = {
        key: identity[key]
        for key in ("name", "national_id", "phone", "email")
        if identity.get(key)
    }

    draft = {**identity_base, **(state.get("draft") or {})}

    FIELD_LABELS = [
        ("name",        "الاسم"),
        ("national_id", "الرقم القومي"),
        ("phone",       "رقم التواصل"),
        ("email",       "الإيميل (اختياري)"),
        ("district",    "الحي"),
        ("details",     "الخدمة المطلوبة"),
        ("date",        "الموعد"),
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
{APPOINTMENT_SYSTEM_PROMPT.replace('{ORG}', org_name())}

====================
COLLECTED SO FAR
====================
{draft_block}

====================
CRITICAL: CURRENT TEMPORAL CONTEXT
====================
{current_time_info}
Use this to resolve relative dates such as "بكرا", "الأحد الجاي", "بعد بكرة".
Never book a date in the past. District offices are closed on Friday and
Saturday unless the district working hours say otherwise.

====================
DISTRICTS
====================
{DistrictDataService.districts_list_block()}

====================
VERIFIED SERVICES (Retrieved from Knowledge Base)
====================
{matched_context or "(No matching service found. Do not invent fees, documents, or procedures.)"}

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
        parsed, raw_response = invoke_structured(AppointmentResponse, messages)

    except Exception as e:
        print(f"[Appointment Node] LLM error: {e}")

        fallback = detect_language_fallback(
            user_message,
            arabic="عذرًا، حصل خطأ مؤقت. ممكن تحاول تاني؟",
            default="Sorry, a temporary error occurred. Please try again.",
        )

        return {
            "response": fallback,
            "summary": current_summary,
            "last_bot_message": fallback,
            "appointment_saved": False,
            "appointment_reference": None,
            "appointment_ticket": None,
            "appointment_usage": None,
        }

    # ── usage ─────────────────────────────────────────────────────────────────
    usage = getattr(raw_response, "usage_metadata", None)

    appointment_usage = (
        {
            "input_tokens": usage.get("input_tokens", 0),
            "output_tokens": usage.get("output_tokens", 0),
            "total_tokens": usage.get("total_tokens", 0),
        }
        if usage
        else None
    )

    # ندمج استخراج الدور ده فوق المسودة — القيمة الفاضية ما بتمسحش القديمة
    appointment_data = CitizenService.merge_draft(
        draft,
        parsed.appointment.model_dump(exclude_none=True),
    )

    # الإيميل مش هنا عن قصد — اختياري
    required_fields = ["name", "national_id", "phone", "district", "details", "date"]

    all_fields_present = all(
        appointment_data.get(field)
        for field in required_fields
    )

    appointment_saved = False
    appointment_reference = None
    appointment_ticket = None
    new_summary = parsed.summary

    # المواطن لازم يكون شاف بياناته قبل ما الموعد يتسجّل باسمه.
    # الموديل بيقول confirmed=true أحيانًا على "تمام" اترمت في أي سياق.
    summary_was_shown = bool(draft.get("awaiting_confirm"))

    # ── save ──────────────────────────────────────────────────────────────────
    if parsed.ready_to_save and parsed.confirmed and all_fields_present and summary_was_shown:

        try:
            save_result = save_appointment_tool.invoke(
                input={
                    **appointment_data,
                    "session_id": session_id,
                }
            )

            if save_result.success and save_result.appointment:
                appointment_saved = True
                appointment_reference = save_result.appointment.reference_id

                # الهوية بتفضل بعد ما الموعد يتقفل عشان المسار الجاي يستخدمها
                CitizenService.remember_identity(
                    session_id,
                    name=appointment_data.get("name"),
                    national_id=appointment_data.get("national_id"),
                    phone=appointment_data.get("phone"),
                    email=appointment_data.get("email"),
                )

                appointment_ticket = generate_appointment_ticket(
                    name=appointment_data.get("name"),
                    phone=appointment_data.get("phone"),
                    date=appointment_data.get("date"),
                    details=appointment_data.get("details"),
                    district=appointment_data.get("district"),
                    reference_id=appointment_reference,
                )

                clean_reply = detect_language_fallback(
                    user_message,
                    arabic=(
                        f"تم تأكيد الحجز بنجاح ✅\n"
                        f"رقم الموعد: *{appointment_reference}*\n"
                        f"احتفظ بالرقم ده وقدّمه عند الحضور.\n"
                        f"برجاء الحضور قبل الموعد بـ ١٥ دقيقة ومعك الأوراق المطلوبة."
                    ),
                    default=(
                        f"Your appointment is confirmed ✅\n"
                        f"Reference: *{appointment_reference}*\n"
                        f"Keep this number and present it on arrival.\n"
                        f"Please arrive 15 minutes early with the required documents."
                    ),
                )

            else:
                raise ValueError(save_result.message)

        except Exception as e:
            print(f"[Appointment Node] Tool error: {e}")

            appointment_saved = False
            appointment_ticket = None
            new_summary = current_summary   # rollback الملخص عشان الحجز يتعاد

            clean_reply = detect_language_fallback(
                user_message,
                arabic="حصل خطأ أثناء حفظ الحجز. ممكن تحاول تاني؟",
                default="An error occurred while saving your appointment. Please try again.",
            )

    else:
        clean_reply = parsed.reply

        # أول ما البيانات تكمل، الملخص بيتبني هنا — مش من الموديل، اللي
        # ساعات بيكتفي بـ"أأكد الحجز؟" من غير ما يعرض حاجة
        if all_fields_present and not summary_was_shown:
            lines = [
                "راجع بيانات الحجز قبل التأكيد:",
                "",
                f"الاسم: {appointment_data.get('name')}",
                f"الرقم القومي: {appointment_data.get('national_id')}",
                f"رقم التواصل: {appointment_data.get('phone')}",
            ]

            if appointment_data.get("email"):
                lines.append(f"الإيميل: {appointment_data['email']}")

            lines += [
                f"الحي: {appointment_data.get('district')}",
                f"الخدمة: {appointment_data.get('details')}",
                f"الموعد: {appointment_data.get('date')}",
                "",
                "أأكد الحجز؟",
            ]

            clean_reply = "\n".join(lines)
            appointment_data["awaiting_confirm"] = True

    # ── persist conversation state ────────────────────────────────────────────
    try:
        CitizenService.update_memory(
            session_id=session_id,
            summary=new_summary,
            last_bot_message=clean_reply,
            # المسار والمسودة يفضلوا لحد ما الموعد يتحفظ فعلاً
            active_flow=None if appointment_saved else "appointment",
            draft=None if appointment_saved else appointment_data,
        )
    except Exception as e:
        print(f"[Appointment Node] Persist error: {e}")

    print(
        f"[Appointment Node] done | saved={appointment_saved} "
        f"| ref={appointment_reference} | usage={appointment_usage}"
    )

    return {
        "response": clean_reply,
        "summary": new_summary,
        "last_bot_message": clean_reply,
        "appointment_saved": appointment_saved,
        "appointment_reference": appointment_reference,
        "appointment_ticket": appointment_ticket,
        "appointment_usage": appointment_usage,
    }
