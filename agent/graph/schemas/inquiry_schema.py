from pydantic import BaseModel, Field


class InquiryResponse(BaseModel):

    reply: str = Field(
        description=(
            "Reply that will be sent to the citizen. "
            "Keep it short, clear, respectful, and suitable for chat. "
            "Avoid long paragraphs and unnecessary repetition."
        )
    )

    summary: str = Field(
        description=(
            "Persistent English conversation memory.\n\n"

            "Update this memory after every conversation turn while preserving "
            "all previously collected information.\n\n"

            "Never rewrite the memory from scratch.\n"
            "Never remove valid information unless the citizen explicitly changes it.\n"
            "Always merge new information into the existing memory.\n\n"

            "Always preserve important information including:\n"
            "- Citizen name and phone number\n"
            "- The district the citizen belongs to\n"
            "- Services and procedures already discussed\n"
            "- Services the citizen wants to book an appointment for\n"
            "- Existing appointment information and booking progress\n"
            "- Existing complaint information and its reference number\n"
            "- Any important preferences or conversation context\n\n"

            "If the citizen asks about additional services, append them to the "
            "memory instead of replacing previous inquiries.\n\n"

            "If the citizen later decides to book an appointment, keep the previous "
            "inquiry context so the booking flow can continue naturally without "
            "asking again which service they wanted.\n\n"

            "If information changes, update only the affected part while keeping "
            "everything else unchanged.\n\n"

            "Write the memory in natural conversational English, not JSON or "
            "key-value format."
        )
    )
