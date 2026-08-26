from typing import Optional

from pydantic import BaseModel, Field


class IntakeData(BaseModel):
    """بيانات المواطن الأساسية — بتتجمع مرة واحدة في أول المحادثة."""

    name: Optional[str] = Field(
        None,
        description=(
            "Full name of the citizen, as they wrote it. Never invent it and "
            "never shorten or 'correct' it."
        )
    )

    national_id: Optional[str] = Field(
        None,
        description=(
            "Egyptian national ID, 14 digits. Record exactly what the citizen "
            "typed. Never invent, complete, or correct a number."
        )
    )

    phone: Optional[str] = Field(
        None,
        description=(
            "Egyptian mobile number, 11 digits starting with 01. "
            "Never invent a number."
        )
    )

    email: Optional[str] = Field(
        None,
        description=(
            "Email address — OPTIONAL. Leave empty if the citizen has none or "
            "declines. Never invent one."
        )
    )


class IntakeResponse(BaseModel):

    reply: str = Field(
        description=(
            "The message sent to the citizen. Short and warm. Ask for exactly "
            "ONE missing field, or confirm completion."
        )
    )

    data: IntakeData = Field(
        description=(
            "Everything known so far, including values the citizen gave in "
            "earlier turns. Populate only what is genuinely known."
        )
    )

    complete: bool = Field(
        description=(
            "True ONLY when name, national_id and phone are all present and "
            "the citizen has been asked about email once (whatever they "
            "answered). email itself is never required."
        )
    )

    pending_request: Optional[str] = Field(
        None,
        description=(
            "What the citizen originally came for, in their own words, if they "
            "mentioned it before or during intake — for example "
            "'القمامة مترميه في الشارع' or 'عايز اعرف رسوم رخصة محل'. "
            "Leave empty if they have not said what they need yet. Carry the "
            "same value forward on every turn once you have it."
        )
    )
