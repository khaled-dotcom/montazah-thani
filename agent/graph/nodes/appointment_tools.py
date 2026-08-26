from langchain_core.tools import tool

from software_services.appointment_services import AppointmentService, AppointmentResult


@tool
def save_appointment_tool(
    name: str,
    phone: str,
    details: str,
    date: str,
    district: str = None,
    national_id: str = None,
    email: str = None,
    session_id: str = None,
) -> AppointmentResult:
    """
    Save a confirmed appointment for a district procedure.

    Returns an AppointmentResult carrying the created appointment and its
    reference number.
    """
    return AppointmentService.create_appointment(
        name=name,
        phone_number=phone,
        details=details,
        date=date,
        district_name=district,
        national_id=national_id,
        email=email,
        session_id=session_id,
        comes_from="website",
    )
