"""
Builds the district blocks that get injected into the node system prompts.

Districts are a small, fixed list, so they are injected in full rather than
retrieved through RAG — that way the agent can always resolve "أنا تابع لأنهي
حي؟" and can never invent a district that does not exist.
"""

from models.models import ComplaintCategory, District


class DistrictDataService:

    # ── lookup ────────────────────────────────────────────────────────────────

    @staticmethod
    def get_district(district_id):
        if not district_id:
            return None
        try:
            return District.query.filter_by(id=district_id, is_active=True).first()
        except Exception as e:
            print(f"[DistrictDataService] DB error in get_district: {e}")
            return None

    @staticmethod
    def get_by_name(name: str):
        if not name:
            return None
        try:
            return District.query.filter(
                District.name.ilike(name.strip()),
                District.is_active.is_(True),
            ).first()
        except Exception as e:
            print(f"[DistrictDataService] DB error in get_by_name: {e}")
            return None

    @staticmethod
    def resolve_id(name: str):
        """Returns the district id for a district name, or None."""
        district = DistrictDataService.get_by_name(name)
        return district.id if district else None

    @staticmethod
    def all_districts():
        try:
            return District.query.filter_by(is_active=True).order_by(District.name).all()
        except Exception as e:
            print(f"[DistrictDataService] DB error in all_districts: {e}")
            return []

    # ── prompt blocks ─────────────────────────────────────────────────────────

    @staticmethod
    def districts_list_block() -> str:
        """Names only — used where the model just has to pick a valid district."""
        districts = DistrictDataService.all_districts()

        if not districts:
            return "(No districts configured yet.)"

        lines = []
        for d in districts:
            line = f"- {d.name}"
            if d.zone:
                line += f"  (المنطقة: {d.zone})"
            if d.coverage:
                line += f"  — يغطي: {d.coverage}"
            lines.append(line)

        return "\n".join(lines)

    @staticmethod
    def district_info_block(district_id) -> str:
        """Full contact details for one district."""
        district = DistrictDataService.get_district(district_id)

        if not district:
            return "(No district selected. Ask the citizen which district they belong to.)"

        parts = [f"District Name: {district.name}"]

        for value, label in (
            (district.zone, "Zone"),
            (district.address, "Address"),
            (district.phone, "Phone"),
            (district.hotline, "Hotline"),
            (district.email, "Email"),
            (district.working_hours, "Working Hours"),
            (district.head_name, "Head of District"),
            (district.coverage, "Areas Covered"),
            (district.info, "Additional Info"),
            (district.map_url, "Map Link"),
        ):
            if value:
                parts.append(f"{label}: {value}")

        return "\n".join(parts)

    @staticmethod
    def all_districts_info_block() -> str:
        """Full contact details for every district — used by the direct node."""
        districts = DistrictDataService.all_districts()

        if not districts:
            return "(No districts configured yet.)"

        return "\n\n".join(
            DistrictDataService.district_info_block(d.id) for d in districts
        )

    @staticmethod
    def categories_block() -> str:
        return "\n".join(f"- {c.value}" for c in ComplaintCategory)
