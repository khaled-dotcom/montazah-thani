from typing import Optional

from pydantic import BaseModel, Field


class ComplaintData(BaseModel):

    citizen_name: Optional[str] = Field(
        None,
        description="Full name of the citizen filing the complaint. Never invent it."
    )

    national_id: Optional[str] = Field(
        None,
        description=(
            "Egyptian national ID number, 14 digits. Never invent it and never "
            "correct a number the citizen gave — record it exactly as stated."
        )
    )

    phone: Optional[str] = Field(
        None,
        description="Citizen phone number. Never invent a phone number."
    )

    email: Optional[str] = Field(
        None,
        description=(
            "Citizen email, used only to send them updates on this complaint. "
            "Optional — leave empty if the citizen does not have one or declines. "
            "Never invent an email address."
        )
    )

    district: Optional[str] = Field(
        None,
        description=(
            "The district (حي) the complaint belongs to. MUST be one of the "
            "district names listed in the DISTRICTS section of the system prompt, "
            "written exactly as listed. Leave empty if not yet determined."
        )
    )

    category: Optional[str] = Field(
        None,
        description=(
            "Complaint category. MUST be exactly one of the categories listed in "
            "the CATEGORIES section of the system prompt. Leave empty if unclear."
        )
    )

    address: Optional[str] = Field(
        None,
        description=(
            "Exact location of the problem: street, landmark, building number. "
            "The more precise the better, because the field team uses it."
        )
    )

    complaint_text: Optional[str] = Field(
        None,
        description=(
            "The problem described clearly and completely, as understood from "
            "the whole conversation — not just the last message."
        )
    )


class ComplaintResponse(BaseModel):

    reply: str = Field(
        description=(
            "Reply that will be sent to the citizen. Short, respectful, and "
            "suitable for chat. Never longer than a few lines."
        )
    )

    summary: str = Field(
        description=(
            "Persistent English conversation memory.\n\n"

            "Update this memory after every turn while preserving all previously "
            "collected information. Never rewrite it from scratch and never drop "
            "valid information unless the citizen explicitly changes it.\n\n"

            "Always preserve:\n"
            "- Citizen name and phone number\n"
            "- District and exact address of the problem\n"
            "- Complaint category and full description\n"
            "- Whether the complaint was confirmed\n"
            "- Whether the complaint was already saved, and its reference number\n"
            "- Any appointment or inquiry context from earlier in the conversation\n\n"

            "If a complaint was already saved, state that clearly along with its "
            "reference number, and note that no new complaint should be created "
            "unless the citizen explicitly asks to file a different one.\n\n"

            "Write it in natural conversational English, not JSON."
        )
    )

    complaint: ComplaintData = Field(
        description=(
            "Structured complaint information extracted from the whole conversation. "
            "Populate only what is actually known."
        )
    )

    confirmed: bool = Field(
        description=(
            "True ONLY if the citizen explicitly confirms submission AFTER the "
            "assistant has shown a complaint summary and asked for confirmation.\n\n"
            "Words like 'تمام', 'أيوة', 'ابعتها', 'Yes', 'Confirm' count as "
            "confirmation ONLY in response to a confirmation request."
        )
    )

    ready_to_save: bool = Field(
        description=(
            "True ONLY if ALL of these exist:\n"
            "- citizen_name\n"
            "- national_id\n"
            "- phone\n"
            "- district\n"
            "- category\n"
            "- address\n"
            "- complaint_text\n"
            "- confirmed is True\n\n"
            "email is NOT required — it is optional.\n\n"
            "Never return True if any required field is missing.\n"
            "Never return True for a complaint that was already saved unless the "
            "citizen explicitly starts a completely new complaint."
        )
    )
