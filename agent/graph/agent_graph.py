from langgraph.graph import StateGraph, END

from graph.nodes.appointment_node import appointment_node
from graph.nodes.complaint_node import complaint_node
from graph.nodes.direct_node import direct_node
from graph.nodes.inquiry_node import inquiry_node
from graph.nodes.intent_node import intent_node
from graph.nodes.rag_node import rag_node
from graph.nodes.track_node import track_node
from graph.state import AgentState

__agent_graph = None


def route_intent(state: AgentState) -> str:
    return state.get("intent") or "direct"


def build_graph():
    """
    كل رسالة بتروح على التصنيف الأول.

    قبل كده كانت فيه بوابة تسجيل قبل التصنيف: أي رسالة والبيانات ناقصة كانت
    بتروح لعقدة استقبال بتسأل على الاسم والرقم القومي والتليفون. النتيجة إن
    مواطن بيسأل "الحي بيفتح الساعة كام؟" كان بيترد عليه بطلب رقمه القومي.
    والبيانات دي محدش محتاجها غير لما المواطن يقدّم بلاغ أو يحجز موعد، وفي
    الحالتين دول الفورم هو اللي بيجمعها — فالبوابة اتشالت.
    """

    graph = StateGraph(AgentState)

    # ── Nodes ─────────────────────────────────────────────────────────────────
    graph.add_node("intent", intent_node)
    graph.add_node("rag", rag_node)
    graph.add_node("inquiry", inquiry_node)
    graph.add_node("appointment", appointment_node)
    graph.add_node("complaint", complaint_node)
    graph.add_node("track", track_node)
    graph.add_node("direct", direct_node)

    graph.set_entry_point("intent")

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
