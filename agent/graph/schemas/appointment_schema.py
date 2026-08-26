from typing import Optional

from pydantic import BaseModel, Field


class AppointmentData(BaseModel):

    name: Optional[str] = Field(
        None,
        description="Full name of the citizen. Never invent it."
    )

    phone: Optional[str] = Field(
        None,
        description="Citizen phone number. Never invent a phone number."
    )

    national_id: Optional[str] = Field(
        None,
        description=(
            "Egyptian national ID number, 14 digits. Never invent it and never "
            "correct a number the citizen gave — record it exactly as stated."
        )
    )

    email: Optional[str] = Field(
        None,
        description=(
            "Citizen email, used only to send them updates on this appointment. "
            "Optional — leave empty if the citizen does not have one or declines. "
            "Never invent an email address."
        )
    )

    district: Optional[str] = Field(
        None,
        description=(
            "The district (حي) where the appointment will take place. MUST be one "
            "of the district names listed in the DISTRICTS section of the system "
            "prompt, written exactly as listed."
        )
    )

    details: Optional[str] = Field(
        None,
        description=(
            "The service or procedure the citizen wants to complete, taken from "
            "the VERIFIED SERVICES section when it matches. Never leave empty when "
            "ready_to_save is true."
        )
    )

    date: Optional[str] = Field(
        None,
        description=(
            "Resolved appointment date and time. Resolve relative expressions "
            "like 'بكرا' or 'الأحد الجاي' using the temporal context provided."
        )
    )


class AppointmentResponse(BaseModel):

    reply: str = Field(
        description=(
            "Reply that will be sent to the citizen. Keep it short, respectful, "
            "and suitable for chat. Avoid long paragraphs."
        )
    )

    summary: str = Field(
        description=(
            "Persistent English conversation memory.\n\n"

            "Update this memory after every turn while preserving all previously "
            "collected information. Never rewrite it from scratch and never drop "
            "valid information unless the citizen explicitly changes it.\n\n"

            "Always preserve:\n"
            "- Citizen name, phone number, and national ID\n"
            "- District and the requested service\n"
            "- Appointment date and time\n"
            "- Booking progress and whether it was confirmed\n"
            "- Whether the appointment was already saved, and its reference number\n"
            "- Any complaint or inquiry context from earlier in the conversation\n\n"

            "If an appointment was already saved, state that clearly along with its "
            "reference number, and note that no new appointment should be created "
            "unless the citizen explicitly asks for another one.\n\n"

            "Write it in natural conversational English, not JSON."
        )
    )

    appointment: AppointmentData = Field(
        description=(
            "Structured appointment information extracted from the whole "
            "conversation. Populate only what is actually known."
        )
    )

    confirmed: bool = Field(
        description=(
            "True ONLY if the citizen explicitly confirms the appointment AFTER "
            "the assistant has shown a summary and asked for confirmation.\n\n"
            "Words like 'تمام', 'أيوة', 'أكد', 'Yes', 'Confirm' count as "
            "confirmation ONLY in response to a confirmation request."
        )
    )

    ready_to_save: bool = Field(
        description=(
            "True ONLY if ALL of these exist:\n"
            "- name\n"
            "- national_id\n"
            "- phone\n"
            "- district\n"
            "- details (the requested service)\n"
            "- date\n"
            "- confirmed is True\n\n"
            "email is NOT required — it is optional.\n\n"
            "Never return True if any required field is missing.\n"
            "Never return True for an appointment that was already saved unless "
            "the citizen explicitly starts a completely new booking."
        )
    )
