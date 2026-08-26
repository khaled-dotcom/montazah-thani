"""
software_services/city_service_services.py
"""

from models.models import CityService, District, db
from software_services.base_service import BaseService


def _clean(value):
    if value is None:
        return None
    value = str(value).strip()
    return value or None


def _parse_fees(raw):
    """Fees are optional — an empty box means 'not published', not zero."""
    if raw is None or str(raw).strip() == "":
        return None, None
    try:
        return float(raw), None
    except (TypeError, ValueError):
        return None, "الرسوم غير صحيحة"


class CityServiceService:

    # ── list / search ─────────────────────────────────────────────────────────

    @staticmethod
    def get_all(page=1, per_page=15, search=None, district_id=None, category=None):
        query = CityService.query

        if search:
            query = query.filter(
                db.or_(
                    CityService.name.ilike(f"%{search}%"),
                    CityService.category.ilike(f"%{search}%"),
                    CityService.department.ilike(f"%{search}%"),
                    CityService.alias_names.ilike(f"%{search}%"),
                )
            )

        if district_id:
            # خدمات الحي نفسه + الخدمات العامة المتاحة في كل الأحياء
            query = query.filter(
                db.or_(
                    CityService.district_id == district_id,
                    CityService.district_id.is_(None),
                )
            )

        if category:
            query = query.filter(CityService.category == category)

        query = query.order_by(CityService.name.asc())
        return BaseService.paginate(query, page=page, per_page=per_page,
                                    success_msg="تم العثور على الخدمات")

    @staticmethod
    def get_all_flat():
        return CityService.query.order_by(CityService.name.asc()).all()

    @staticmethod
    def get_categories():
        rows = (
            db.session.query(CityService.category)
            .filter(CityService.category.isnot(None))
            .distinct()
            .all()
        )
        return sorted(r[0] for r in rows if r[0])

    @staticmethod
    def get_by_id(service_id):
        service = db.session.get(CityService, service_id)
        if not service:
            return None, "الخدمة غير موجودة"
        return service, "تم العثور على الخدمة"

    # ── create ────────────────────────────────────────────────────────────────

    @staticmethod
    def create(name, district_id=None, category=None, department=None,
               description=None, fees=None, fees_note=None,
               required_documents=None, duration=None, steps=None,
               is_bookable=True):

        if not name or not name.strip():
            return None, "اسم الخدمة مطلوب"

        clean_name = name.strip()

        # نفس الاسم مسموح في أحياء مختلفة، ممنوع في نفس الحي
        duplicate_query = CityService.query.filter(CityService.name.ilike(clean_name))

        if district_id:
            duplicate_query = duplicate_query.filter(CityService.district_id == district_id)
        else:
            duplicate_query = duplicate_query.filter(CityService.district_id.is_(None))

        if duplicate_query.first():
            return None, "الخدمة مسجلة بالفعل لنفس الحي"

        if district_id and not db.session.get(District, district_id):
            return None, "الحي غير موجود"

        fees_value, fees_error = _parse_fees(fees)
        if fees_error:
            return None, fees_error

        service = CityService(
            name=clean_name,
            district_id=district_id or None,
            category=_clean(category),
            department=_clean(department),
            description=_clean(description),
            fees=fees_value,
            fees_note=_clean(fees_note),
            required_documents=_clean(required_documents),
            duration=_clean(duration),
            steps=_clean(steps),
            is_bookable=bool(is_bookable),
        )

        return BaseService.commit(
            service,
            success_msg="تم إضافة الخدمة بنجاح",
            error_prefix="حدث خطأ أثناء إضافة الخدمة",
        )

    # ── update ────────────────────────────────────────────────────────────────

    @staticmethod
    def update(service_id, **fields):
        service = db.session.get(CityService, service_id)
        if not service:
            return None, "الخدمة غير موجودة"

        if "name" in fields and fields["name"] is not None:
            clean_name = str(fields["name"]).strip()
            if not clean_name:
                return None, "اسم الخدمة مطلوب"
            service.name = clean_name

        if "fees" in fields:
            fees_value, fees_error = _parse_fees(fields["fees"])
            if fees_error:
                return None, fees_error
            service.fees = fees_value

        if "district_id" in fields:
            district_id = fields["district_id"] or None
            if district_id and not db.session.get(District, district_id):
                return None, "الحي غير موجود"
            service.district_id = district_id

        for key in ("category", "department", "description", "fees_note",
                    "required_documents", "duration", "steps"):
            if key in fields and fields[key] is not None:
                setattr(service, key, _clean(fields[key]))

        for key in ("is_bookable", "is_active"):
            if key in fields and fields[key] is not None:
                setattr(service, key, bool(fields[key]))

        return BaseService.update_commit(
            service,
            success_msg="تم تحديث الخدمة بنجاح",
            error_prefix="حدث خطأ أثناء التحديث",
        )

    # ── delete ────────────────────────────────────────────────────────────────

    @staticmethod
    def delete(service_id):
        service = db.session.get(CityService, service_id)
        if not service:
            return None, "الخدمة غير موجودة"

        # حذف الـ embedding عشان الخدمة المحذوفة ماتظهرش في نتائج البحث
        try:
            from knowledge.schemas import EntityType
            from knowledge.vector_store import delete_vector
            delete_vector(service_id, EntityType.SERVICE)
        except Exception as e:
            print(f"[CityServiceService] vector delete failed: {e}")

        return BaseService.delete(
            service,
            success_msg="تم حذف الخدمة بنجاح",
            error_prefix="حدث خطأ أثناء الحذف",
        )
