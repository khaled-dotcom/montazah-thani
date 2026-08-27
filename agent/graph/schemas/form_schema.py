"""
graph/schemas/form_schema.py

مخرجات العقد اللي بتفتح فورم.

الموديل هنا مالوش سلطة على الحفظ خالص — كل اللي بيعمله إنه يكتب سطر رد
قصير ويملّى حقول مبدئية من كلام المواطن. لو غلط في حقل، المواطن شايفه
قدامه في الفورم وبيصلّحه قبل ما يبعت. عشان كده مفيش هنا لا `confirmed`
ولا `ready_to_save` — الحفظ بيتقرر في graph/forms.py بعد تحقق كامل.
"""

from typing import Optional

from pydantic import BaseModel, Field


class AppointmentFormResponse(BaseModel):

    reply: str = Field(
        description=(
            "One or two short lines to the citizen, in their own language and "
            "dialect, telling them the booking form is open below and to fill "
            "it in. Never ask them for a name, a national ID, a phone number, "
            "a date, or any other field — the form collects all of that. If "
            "they asked something answerable from VERIFIED SERVICES (fees, "
            "documents, duration), answer it in one line first."
        )
    )

    service: Optional[str] = Field(
        None,
        description=(
            "The service the citizen wants, copied EXACTLY as written in the "
            "SERVICE OPTIONS list when one of them matches what they asked "
            "for. Leave empty if nothing in the list matches — never invent a "
            "service name and never reword one."
        )
    )

    note: Optional[str] = Field(
        None,
        description=(
            "Any extra detail the citizen gave about the visit that does not "
            "fit the service name. Leave empty when there is none."
        )
    )


class ComplaintFormResponse(BaseModel):

    reply: str = Field(
        description=(
            "One or two short lines to the citizen, in their own language and "
            "dialect, acknowledging the problem they described and telling "
            "them the report form is open below. Never ask them for a name, a "
            "national ID, a phone number, or an address — the form collects "
            "all of that."
        )
    )

    category: Optional[str] = Field(
        None,
        description=(
            "The complaint category, copied EXACTLY as written in the "
            "CATEGORIES list. Leave empty if the message does not make the "
            "category clear — never invent a category name."
        )
    )

    address: Optional[str] = Field(
        None,
        description=(
            "The location of the problem if the citizen already named it — a "
            "street, a building number, a landmark. Leave empty otherwise; "
            "never guess a location."
        )
    )

    complaint_text: Optional[str] = Field(
        None,
        description=(
            "The problem described in one clear sentence, based only on what "
            "the citizen actually said. Leave empty if they have not described "
            "a problem yet."
        )
    )
