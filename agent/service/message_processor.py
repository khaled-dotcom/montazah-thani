"""
service/message_processor.py

Entry point between the web chat API and the LangGraph agent.
"""

import os
import re
import uuid

from graph import forms
from graph.agent_graph import get_agent_graph
from graph.agent_response import AgentResponse
from graph.utils import count_request, generate_appointment_ticket
from llm.model import get_model_name, get_pricing
from models.models import UsageLog, db
from software_services.citizen_services import CitizenService


class IncomingMessage:
    def __init__(self, session_id, text, district_id=None,
                 user_agent=None, ip_address=None):
        self.session_id  = session_id
        self.text        = text
        self.district_id = district_id
        self.user_agent  = user_agent
        self.ip_address  = ip_address


PHONE_PATTERN = re.compile(r"\b(01[0-9]{9})\b")

TICKETS_DIRNAME = os.path.join("static", "uploads", "tickets")


def _calc_total_usage(result: dict) -> dict:
    """
    Pure calculation — turns the per-node usage dicts into a token/cost
    breakdown. No DB writes here.
    """
    nodes = [
        ("intent_usage",      result.get("intent_usage")),
        ("inquiry_usage",     result.get("inquiry_usage")),
        ("complaint_usage",   result.get("complaint_usage")),
        ("appointment_usage", result.get("appointment_usage")),
        ("direct_usage",      result.get("direct_usage")),
    ]

    # السعر بييجي من الموديل المضبوط في GROQ_MODEL، مش رقم ثابت في الكود
    price_in, price_out = get_pricing()
    input_cost_per_token = price_in / 1_000_000
    output_cost_per_token = price_out / 1_000_000

    total_in = total_out = total = 0
    total_cost_usd = 0.0
    breakdown = {}

    for key, usage in nodes:
        if not usage:
            continue

        i = usage.get("input_tokens", 0) or 0
        o = usage.get("output_tokens", 0) or 0
        t = usage.get("total_tokens", 0) or (i + o)

        if not (i or o):
            continue

        node_cost = (i * input_cost_per_token) + (o * output_cost_per_token)

        breakdown[key] = {
            "input": i,
            "output": o,
            "total": t,
            "cost_usd": node_cost,
        }

        total_in  += i
        total_out += o
        total     += t
        total_cost_usd += node_cost

    return {
        "breakdown":        breakdown,
        "total_input":      total_in,
        "total_output":     total_out,
        "total_tokens":     total,
        "total_cost_usd":   total_cost_usd,
        "total_cost_cents": total_cost_usd * 100,
        "req_per_dollar":   int(1.0 / total_cost_usd) if total_cost_usd > 0 else 0,
    }


def _log_usage(message: "IncomingMessage", intent: str, usage: dict) -> None:
    """Records what this turn cost. A logging failure never breaks the reply."""
    try:
        db.session.add(
            UsageLog(
                session_id=message.session_id,
                district_id=message.district_id,
                intent=intent,
                input_tokens=usage["total_input"],
                output_tokens=usage["total_output"],
                total_tokens=usage["total_tokens"],
                cost_usd=usage["total_cost_usd"],
            )
        )
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        print(f"[_log_usage] Error: {e}")


def _log_metrics(message: "IncomingMessage", district_name, intent, usage: dict) -> None:
    """
    Prints the per-request cost breakdown.

    Kept ASCII-only and wrapped in try/except on purpose: this is diagnostics,
    and on a Windows console (cp1252) a non-encodable character raises
    UnicodeEncodeError — which would otherwise turn a perfectly good reply into
    a 500 for the citizen.
    """
    try:
        lines = [
            "",
            "=" * 76,
            " REQUEST METRICS & COST",
            f" Model  : {get_model_name()}",
            f" Session: {message.session_id} | District: {district_name or '-'} | Intent: {intent}",
            "-" * 76,
        ]

        for node, u in usage["breakdown"].items():
            lines.append(
                f"    - {node:<20} in={u['input']:>5} | out={u['output']:>5} "
                f"| cost=${u['cost_usd']:.8f}"
            )

        lines += [
            "-" * 76,
            f"    Total tokens : {usage['total_tokens']:,}",
            f"    Real cost    : ${usage['total_cost_usd']:.8f} USD",
        ]

        if usage["req_per_dollar"] > 0:
            lines.append(f"    Capacity     : ~{usage['req_per_dollar']:,} requests per $1.00")

        lines.append("=" * 76 + "\n")

        print("\n".join(lines), flush=True)

    except Exception:
        pass


def save_ticket(reference_id: str, ticket_bytes: bytes) -> str | None:
    """
    Writes the appointment ticket PNG to disk and returns its public URL.
    Returns None if it could not be written — the reply still goes out, just
    without a downloadable ticket.
    """
    if not ticket_bytes or not reference_id:
        return None

    try:
        project_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        tickets_dir = os.path.join(project_dir, TICKETS_DIRNAME)
        os.makedirs(tickets_dir, exist_ok=True)

        safe_reference = re.sub(r"[^A-Za-z0-9_-]", "", reference_id)
        if not safe_reference:
            return None

        path = os.path.join(tickets_dir, f"{safe_reference}.png")

        with open(path, "wb") as f:
            f.write(ticket_bytes)

        return f"/static/uploads/tickets/{safe_reference}.png"

    except Exception as e:
        print(f"[save_ticket] Error: {e}")
        return None


def run_agent(message: IncomingMessage) -> dict:
    """
    Runs one conversation turn.

    Returns a dict ready to be serialised straight to the chat widget:
        reply, intent, reference, ticket_url, form

    `form` is set when the turn opened a booking or complaint form. Nothing is
    written to the appointments or complaints tables here — that happens when
    the citizen submits the form, through /api/forms.
    """
    citizen = CitizenService.get_or_create(
        session_id=message.session_id,
        district_id=message.district_id,
        user_agent=message.user_agent,
        ip_address=message.ip_address,
    )

    district_id = message.district_id or (citizen.district_id if citizen else None)
    district_name = None

    if district_id:
        from graph.prompt_service.district_data import DistrictDataService
        district = DistrictDataService.get_district(district_id)
        district_name = district.name if district else None

    # الهوية بتتقرا عشان الفورمات تتعرض متملّية بيها، مش عشان تتحط شرط
    # على المحادثة — المواطن بيسأل ويتجاوب معاه سواء بياناته متسجلة أو لأ
    identity = CitizenService.get_identity(message.session_id)
    draft = (citizen.draft if citizen else None) or {}

    user_text = message.text or ""

    CitizenService.log_message(message.session_id, "user", message.text)

    state = {
        "session_id":    message.session_id,
        "district_id":   district_id,
        "district_name": district_name,

        "user_message":     user_text,
        "summary":          (citizen.summary if citizen else "") or "",
        "last_bot_message": (citizen.last_bot_message if citizen else "") or "",
        "active_flow":      citizen.active_flow if citizen else None,
        "draft":            draft,
        "identity":         identity,

        "intent": None,
        "refined_queries": [],

        "rag_context": "",
        "search_results": [],
        "top_score": 0.0,

        "response": None,
        "form": None,

        "intent_usage": None,
        "inquiry_usage": None,
        "complaint_usage": None,
        "appointment_usage": None,
        "direct_usage": None,

        "complaint_saved": None,
        "appointment_saved": None,
        "complaint_reference": None,
        "appointment_reference": None,
        "appointment_ticket": None,
    }

    try:
        result = get_agent_graph().invoke(state)
        response_obj = AgentResponse.from_result(result)

    except Exception as e:
        print(f"[run_agent] Error: {e}")

        from notified_center.EmailSender import send_production_alert
        send_production_alert(
            subject="Agent Graph Execution Failure",
            body_or_error=e,
            context={
                "session_id": message.session_id,
                "district_id": message.district_id,
            },
        )

        return {
            "reply": "عذرًا، حصل خطأ مؤقت. ممكن تحاول تاني بعد لحظات؟",
            "intent": None,
            "reference": None,
            "ticket_url": None,
            "form": None,
        }

    intent = result.get("intent")
    usage = _calc_total_usage(result)

    _log_usage(message, intent, usage)
    count_request()

    CitizenService.log_message(message.session_id, "bot", response_obj.response, intent=intent)

    # نحفظ رقم التليفون في ملف الجلسة أول ما يظهر عشان الموظف يشوفه
    phone_match = PHONE_PATTERN.search(message.text or "")
    if phone_match:
        CitizenService.remember_contact(message.session_id, phone=phone_match.group(1))

    reference = (
        result.get("appointment_reference")
        or result.get("complaint_reference")
    )

    ticket_url = save_ticket(
        result.get("appointment_reference"),
        result.get("appointment_ticket"),
    )

    _log_metrics(message, district_name, intent, usage)

    return {
        "reply": response_obj.response,
        "intent": intent,
        "reference": reference,
        "ticket_url": ticket_url,
        "form": response_obj.form,
    }


def submit_form(session_id: str, kind: str, values: dict,
                district_id=None) -> dict:
    """
    Records a form the citizen filled in inside the chat.

    This is the write path for appointments and complaints — no model runs
    here, and none has a say in whether the record is created. Everything is
    re-validated in graph/forms.py against the district list, the service
    list, the open days and the free slots, because the browser is free to
    post whatever it likes and the last turn's form may be minutes stale.

    Both sides of the exchange are written to the transcript, so a clerk
    reading the conversation later sees the submission where it happened
    rather than a silent gap between two chat messages.
    """
    citizen = CitizenService.get_or_create(session_id=session_id, district_id=district_id)

    district_id = district_id or (citizen.district_id if citizen else None)
    district_name = None

    if district_id:
        from graph.prompt_service.district_data import DistrictDataService
        district = DistrictDataService.get_district(district_id)
        district_name = district.name if district else None

    if kind == "appointment":
        result = forms.submit_appointment(
            session_id, values,
            district_name=district_name,
            district_id=district_id,
        )
    elif kind == "complaint":
        result = forms.submit_complaint(
            session_id, values,
            district_name=district_name,
        )
    else:
        raise ValueError(f"unknown form kind: {kind}")

    label = "حجز موعد" if kind == "appointment" else "بلاغ"
    CitizenService.log_message(session_id, "user", f"[أرسل فورم {label}]")
    CitizenService.log_message(session_id, "bot", result["reply"], intent=kind)

    # الملخص بيتحدّث بالكود عشان لو المواطن كمّل كلام بعد كده، الموديل يبقى
    # عارف إن الطلب اتسجّل خلاص وما يفتحش فورم تاني من نفس النوع
    try:
        CitizenService.update_memory(
            session_id=session_id,
            summary=(
                f"The citizen submitted the {kind} form. It is saved with "
                f"reference {result['reference']}. Do not open another "
                f"{kind} form unless they explicitly ask for a new one."
            ),
            last_bot_message=result["reply"],
            active_flow=None,
            draft=None,
        )
    except Exception as e:
        print(f"[submit_form] Persist error: {e}")

    ticket_url = None
    ticket = result.get("ticket")

    if ticket:
        try:
            ticket_url = save_ticket(
                result["reference"],
                generate_appointment_ticket(**ticket),
            )
        except Exception as e:
            # البطاقة زينة، مش الحجز. الحجز اتسجّل خلاص ورقمه مع المواطن
            print(f"[submit_form] Ticket error: {e}")

    return {
        "reply": result["reply"],
        "reference": result["reference"],
        "ticket_url": ticket_url,
        "intent": kind,
    }


def new_session_id() -> str:
    return uuid.uuid4().hex
