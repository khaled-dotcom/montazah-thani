from enum import Enum

from pydantic import BaseModel, Field


class IntentType(str, Enum):
    COMPLAINT   = "complaint"     # بلاغ أو شكوى
    INQUIRY     = "inquiry"       # استعلام عن خدمة/أوراق/رسوم
    APPOINTMENT = "appointment"   # حجز موعد لإنهاء معاملة
    TRACK       = "track"         # متابعة حالة بلاغ أو موعد برقم مرجعي
    DIRECT      = "direct"        # ترحيب، عناوين، مواعيد عمل، كلام عام


class RefinedQuery(BaseModel):

    query: str = Field(
        description="The canonical name of the district service or district."
    )

    aliases: list[str] = Field(
        default_factory=list,
        description=(
            "Equivalent names and colloquial Egyptian phrasings that refer to "
            "exactly the same service or district."
        ),
    )

    keywords: list[str] = Field(
        default_factory=list,
        description="Retrieval keywords related to this service or district.",
    )

    description: str = Field(
        description="Short description used only to improve semantic retrieval."
    )


class IntentResponse(BaseModel):

    intent: IntentType

    refined_queries: list[RefinedQuery] = Field(
        default_factory=list
    )
