from collections import defaultdict

from sqlalchemy import bindparam, text

from knowledge.schemas import EntityType
from knowledge.utils import main_session
from search.schemas import SearchResult


TABLE_BY_TYPE = {
    EntityType.SERVICE: "city_services",
    EntityType.DISTRICT: "districts",
}


def _fetch_rows(results: list[SearchResult]) -> dict:

    grouped = defaultdict(list)

    for result in results:
        grouped[result.type].append(result.id)

    rows = {}

    with main_session() as session:

        for entity_type, ids in grouped.items():

            if entity_type == EntityType.SERVICE:
                query = text("""
                    SELECT
                        s.id,
                        s.name,
                        s.description,
                        s.category,
                        s.department,
                        s.fees,
                        s.fees_note,
                        s.required_documents,
                        s.duration,
                        s.steps,
                        s.is_bookable,
                        d.name AS district_name
                    FROM city_services s
                    LEFT JOIN districts d ON d.id = s.district_id
                    WHERE s.id IN :ids
                """).bindparams(bindparam("ids", expanding=True))

            else:
                query = text("""
                    SELECT
                        id,
                        name,
                        description,
                        zone,
                        address,
                        phone,
                        hotline,
                        email,
                        working_hours,
                        head_name,
                        coverage,
                        info
                    FROM districts
                    WHERE id IN :ids
                """).bindparams(bindparam("ids", expanding=True))

            result_rows = session.execute(query, {"ids": ids}).mappings()

            for row in result_rows:
                rows[(entity_type, row["id"])] = dict(row)

    return rows


# الحقول اللي المواطن بيسأل عنها، واسمها العربي اللي الموديل هيستخدمه
# لما يقول للمواطن إيه اللي مش مسجّل عندنا
CITIZEN_FACING_FIELDS = [
    ("fees",               "الرسوم"),
    ("required_documents", "الأوراق المطلوبة"),
    ("duration",           "مدة الإنجاز"),
    ("department",         "الإدارة المختصة"),
    ("steps",              "خطوات الإنجاز"),
]


def _service_block(row: dict) -> str:
    block = [f"Service: {row['name']}"]

    if row.get("district_name"):
        block.append(f"District: {row['district_name']}")
    else:
        block.append("District: متاحة في جميع الأحياء")

    if row.get("category"):
        block.append(f"Category: {row['category']}")

    if row.get("department"):
        block.append(f"Responsible Department: {row['department']}")

    if row.get("description"):
        block.append(f"Description: {row['description']}")

    if row.get("fees") is not None:
        block.append(f"Fees (EGP): {row['fees']}")

    if row.get("fees_note"):
        block.append(f"Fees Note: {row['fees_note']}")

    if row.get("required_documents"):
        block.append(f"Required Documents:\n{row['required_documents']}")

    if row.get("duration"):
        block.append(f"Processing Duration: {row['duration']}")

    if row.get("steps"):
        block.append(f"Steps:\n{row['steps']}")

    block.append(
        f"Accepts Appointment Booking: {'yes' if row.get('is_bookable') else 'no'}"
    )

    # نقول للموديل صراحةً إيه الناقص، عشان يقدر يسمّيه للمواطن بدقة
    # بدل ما يرد برد عام "ما عنديش معلومات عن الخدمة دي".
    # الخدمة نفسها موجودة ومؤكدة — الناقص حقول بعينها.
    missing = [
        label for key, label in CITIZEN_FACING_FIELDS
        if row.get(key) in (None, "")
    ]

    if missing:
        block.append(
            "NOT RECORDED YET (this service exists and is confirmed — only "
            f"these specific fields are missing): {'، '.join(missing)}"
        )

    return "\n".join(block)


def _district_block(row: dict) -> str:
    block = [f"District: {row['name']}"]

    for key, label in (
        ("zone", "Zone"),
        ("description", "Description"),
        ("coverage", "Areas Covered"),
        ("address", "Address"),
        ("phone", "Phone"),
        ("hotline", "Hotline"),
        ("email", "Email"),
        ("working_hours", "Working Hours"),
        ("head_name", "Head of District"),
        ("info", "Additional Info"),
    ):
        if row.get(key):
            block.append(f"{label}: {row[key]}")

    return "\n".join(block)


def build_context(results: list[SearchResult]) -> str:

    rows = _fetch_rows(results)

    sections = []

    for result in results:

        row = rows.get((result.type, result.id))

        if row is None:
            continue

        if result.type == EntityType.SERVICE:
            sections.append(_service_block(row))
        else:
            sections.append(_district_block(row))

    if not sections:
        return ""

    return "\n\n" + "\n\n".join(sections)
