from langchain_core.tools import tool

from software_services.complaint_services import ComplaintService, ComplaintResult


@tool
def save_complaint_tool(
    phone: str,
    complaint_text: str,
    citizen_name: str = None,
    national_id: str = None,
    email: str = None,
    district: str = None,
    category: str = None,
    address: str = None,
    session_id: str = None,
) -> ComplaintResult:
    """
    Save a confirmed citizen complaint to the database.

    Returns a ComplaintResult carrying the created complaint and its
    reference number.
    """
    return ComplaintService.create_complaint(
        phone_number=phone,
        complaint_text=complaint_text,
        citizen_name=citizen_name,
        national_id=national_id,
        email=email,
        district_name=district,
        category_value=category,
        address=address,
        session_id=session_id,
        comes_from="website",
    )
