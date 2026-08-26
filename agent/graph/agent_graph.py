from langgraph.graph import StateGraph, END

from graph.nodes.appointment_node import appointment_node
from graph.nodes.complaint_node import complaint_node
from graph.nodes.direct_node import direct_node
from graph.nodes.intake_node import intake_node
from graph.nodes.inquiry_node import inquiry_node
from graph.nodes.intent_node import intent_node
from graph.nodes.rag_node import rag_node
from graph.nodes.track_node import track_node
from graph.state import AgentState

__agent_graph = None


def route_entry(state: AgentState) -> str:
    """
    Registration comes before anything else.

    While the citizen's name, national ID and phone are not on file, every
    message goes to intake. The intent classifier is skipped entirely for
    those turns — there is no point spending a model call working out what
    they want when the answer cannot be acted on yet, and whatever they said
    is preserved in the draft so nothing is lost.
    """
    if not state.get("identity_complete"):
        return "intake"
    return "intent"


def route_intent(state: AgentState) -> str:
    return state.get("intent") or "direct"


def build_graph():

    graph = StateGraph(AgentState)

    # ── Nodes ─────────────────────────────────────────────────────────────────
    graph.add_node("intake", intake_node)
    graph.add_node("intent", intent_node)
    graph.add_node("rag", rag_node)
    graph.add_node("inquiry", inquiry_node)
    graph.add_node("appointment", appointment_node)
    graph.add_node("complaint", complaint_node)
    graph.add_node("track", track_node)
    graph.add_node("direct", direct_node)

    # ── Entry: registration gate ──────────────────────────────────────────────
    graph.set_conditional_entry_point(
        route_entry,
        {
            "intake": "intake",
            "intent": "intent",
        },
    )

    # الاستقبال بيرد بنفسه ويقف — الدور اللي بعده بيعدي على التوجيه العادي
    graph.add_edge("intake", END)

    # ── Intent routing ────────────────────────────────────────────────────────
    # الاستعلام والحجز محتاجين بحث في الخدمات الأول،
    # الشكوى والمتابعة والكلام العام بيروحوا على طول
    graph.add_conditional_edges(
        "intent",
        route_intent,
        {
            "inquiry":     "rag",
            "appointment": "rag",
            "complaint":   "complaint",
            "track":       "track",
            "direct":      "direct",
        },
    )

    # ── After RAG ─────────────────────────────────────────────────────────────
    graph.add_conditional_edges(
        "rag",
        route_intent,
        {
            "inquiry":     "inquiry",
            "appointment": "appointment",
        },
    )

    graph.add_edge("inquiry", END)
    graph.add_edge("appointment", END)
    graph.add_edge("complaint", END)
    graph.add_edge("track", END)
    graph.add_edge("direct", END)

    return graph.compile()


def get_agent_graph():
    global __agent_graph

    if __agent_graph is None:
        __agent_graph = build_graph()

    return __agent_graph
