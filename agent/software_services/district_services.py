"""
software_services/district_services.py
"""

from models.models import District, db
from software_services.base_service import BaseService


class DistrictService:

    # ── list / search ─────────────────────────────────────────────────────────

    @staticmethod
    def get_all(page=1, per_page=15, search=None):
        query = District.query

        if search:
            query = query.filter(
                db.or_(
                    District.name.ilike(f"%{search}%"),
                    District.zone.ilike(f"%{search}%"),
                    District.coverage.ilike(f"%{search}%"),
                )
            )

        query = query.order_by(District.name.asc())
        return BaseService.paginate(query, page=page, per_page=per_page,
                                    success_msg="تم العثور على الأحياء")

    @staticmethod
    def get_all_flat():
        """Unpaginated list — used for dropdowns."""
        return District.query.order_by(District.name.asc()).all()

    @staticmethod
    def get_by_id(district_id):
        district = db.session.get(District, district_id)
        if not district:
            return None, "الحي غير موجود"
        return district, "تم العثور على الحي"

    @staticmethod
    def get_by_name(name):
        if not name:
            return None
        return District.query.filter(District.name.ilike(name.strip())).first()

    # ── create ────────────────────────────────────────────────────────────────

    @staticmethod
    def create(name, zone=None, address=None, phone=None, hotline=None,
               email=None, working_hours=None, head_name=None, map_url=None,
               coverage=None, info=None):

        if not name or not name.strip():
            return None, "اسم الحي مطلوب"

        clean_name = name.strip()

        if District.query.filter(District.name.ilike(clean_name)).first():
            return None, "الحي موجود بالفعل"

        district = District(
            name=clean_name,
            zone=(zone or "").strip() or None,
            address=(address or "").strip() or None,
            phone=(phone or "").strip() or None,
            hotline=(hotline or "").strip() or None,
            email=(email or "").strip() or None,
            working_hours=(working_hours or "").strip() or None,
            head_name=(head_name or "").strip() or None,
            map_url=(map_url or "").strip() or None,
            coverage=(coverage or "").strip() or None,
            info=(info or "").strip() or None,
        )

        return BaseService.commit(
            district,
            success_msg="تم إضافة الحي بنجاح",
            error_prefix="حدث خطأ أثناء إضافة الحي",
        )

    # ── update ────────────────────────────────────────────────────────────────

    @staticmethod
    def update(district_id, **fields):
        district = db.session.get(District, district_id)
        if not district:
            return None, "الحي غير موجود"

        editable = (
            "name", "zone", "address", "phone", "hotline", "email",
            "working_hours", "head_name", "map_url", "coverage", "info",
        )

        for key in editable:
            if key in fields and fields[key] is not None:
                value = str(fields[key]).strip()
                if key == "name" and not value:
                    return None, "اسم الحي مطلوب"
                setattr(district, key, value or None)

        if "is_active" in fields and fields["is_active"] is not None:
            district.is_active = bool(fields["is_active"])

        return BaseService.update_commit(
            district,
            success_msg="تم تحديث الحي بنجاح",
            error_prefix="حدث خطأ أثناء التحديث",
        )

    # ── delete ────────────────────────────────────────────────────────────────

    @staticmethod
    def delete(district_id):
        district = db.session.get(District, district_id)
        if not district:
            return None, "الحي غير موجود"

        if district.services:
            return None, "لا يمكن حذف حي مرتبط بخدمات. انقل الخدمات أو عطّل الحي بدلاً من حذفه"

        if district.complaints or district.appointments:
            return None, "لا يمكن حذف حي عليه بلاغات أو مواعيد. عطّل الحي بدلاً من حذفه"

        # حذف الـ embedding بتاع الحي عشان مايفضلش في البحث
        try:
            from knowledge.schemas import EntityType
            from knowledge.vector_store import delete_vector
            delete_vector(district_id, EntityType.DISTRICT)
        except Exception as e:
            print(f"[DistrictService] vector delete failed: {e}")

        return BaseService.delete(
            district,
            success_msg="تم حذف الحي بنجاح",
            error_prefix="حدث خطأ أثناء الحذف",
        )
