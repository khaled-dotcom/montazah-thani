"""
service/message_processor.py

Entry point between the web chat API and the LangGraph agent.
"""

import os
import re
import uuid

from graph.agent_graph import get_agent_graph
from graph.agent_response import AgentResponse
from graph.utils import count_request
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
        ("intake_usage",      result.get("intake_usage")),
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


def _save_ticket(reference_id: str, ticket_bytes: bytes) -> str | None:
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
        print(f"[_save_ticket] Error: {e}")
        return None


def run_agent(message: IncomingMessage) -> dict:
    """
    Runs one conversation turn.

    Returns a dict ready to be serialised straight to the chat widget:
        reply, intent, reference, ticket_url
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

    identity = CitizenService.get_identity(message.session_id)
    identity_complete = all(identity.get(k) for k in ("name", "national_id", "phone"))

    user_text = message.text or ""

    # بعد ما التسجيل يخلص، أول رسالة بعده بتحمل معاها الطلب اللي المواطن
    # قاله قبل ما نوقفه للتسجيل — عشان ما يضطرش يعيده
    draft = (citizen.draft if citizen else None) or {}
    pending = draft.get("pending_request")

    if identity_complete and pending:
        user_text = f"{user_text}\n\n[طلب سابق من نفس المواطن]: {pending}"

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
        "identity_complete": identity_complete,

        "intent": None,
        "refined_queries": [],

        "rag_context": "",
        "search_results": [],
        "top_score": 0.0,

        "response": None,

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

    ticket_url = _save_ticket(
        result.get("appointment_reference"),
        result.get("appointment_ticket"),
    )

    _log_metrics(message, district_name, intent, usage)

    return {
        "reply": response_obj.response,
        "intent": intent,
        "reference": reference,
        "ticket_url": ticket_url,
    }


def new_session_id() -> str:
    return uuid.uuid4().hex
