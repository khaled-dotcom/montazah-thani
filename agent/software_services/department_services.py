"""
software_services/department_services.py
"""

from models.models import ComplaintCategory, Department, District, db
from software_services.base_service import BaseService


# الإدارة اللي بتتولى كل تصنيف شكوى في الحي.
# الأسماء دي شائعة في الأحياء المصرية — تقدر تغيّرها من لوحة التحكم،
# والتليفونات والإيميلات مسيبة فاضية عشان تملأها ببيانات الحي الحقيقية.
DEFAULT_DEPARTMENTS = {
    ComplaintCategory.CLEANING:   "إدارة النظافة والتجميل",
    ComplaintCategory.SEWAGE:     "إدارة الصرف الصحي",
    ComplaintCategory.LIGHTING:   "إدارة الإنارة",
    ComplaintCategory.ROADS:      "إدارة الطرق والرصف",
    ComplaintCategory.OCCUPANCY:  "إدارة الإشغالات",
    ComplaintCategory.BUILDINGS:  "إدارة التنظيم والمباني",
    ComplaintCategory.WATER:      "إدارة المياه",
    ComplaintCategory.PARKS:      "إدارة الحدائق والتشجير",
    ComplaintCategory.STRAY:      "إدارة الطب البيطري",
    ComplaintCategory.MARKETS:    "إدارة الأسواق",
    ComplaintCategory.ADVERTS:    "إدارة الإعلانات",
    ComplaintCategory.NOISE:      "إدارة الشؤون البيئية",
    ComplaintCategory.RAINWATER:  "إدارة الصرف الصحي",
    ComplaintCategory.CEMETERIES: "إدارة المدافن",
    ComplaintCategory.VEHICLES:   "إدارة الإشغالات",
    ComplaintCategory.STAFF:      "مكتب شكاوى المواطنين",
    ComplaintCategory.OTHER:      "مكتب خدمة المواطنين",
}


class DepartmentService:

    @staticmethod
    def get_for_district(district_id):
        return (
            Department.query
            .filter_by(district_id=district_id)
            .order_by(Department.name.asc())
            .all()
        )

    @staticmethod
    def get_by_id(department_id):
        department = db.session.get(Department, department_id)
        if not department:
            return None, "الإدارة غير موجودة"
        return department, "تم العثور على الإدارة"

    @staticmethod
    def get_all_flat():
        return Department.query.order_by(Department.name.asc()).all()

    # ── create / update ───────────────────────────────────────────────────────

    @staticmethod
    def upsert(district_id, category, name, manager=None, phone=None,
               email=None, is_active=True):
        """
        One department per (district, category) — so saving the same pair twice
        updates it rather than creating a second one that would make routing
        ambiguous.
        """
        if not district_id or not db.session.get(District, district_id):
            return None, "الحي غير موجود"

        if not name or not name.strip():
            return None, "اسم الإدارة مطلوب"

        if not isinstance(category, ComplaintCategory):
            try:
                category = ComplaintCategory(category)
            except ValueError:
                return None, "تصنيف غير صحيح"

        department = Department.query.filter_by(
            district_id=district_id, category=category
        ).first()

        if not department:
            department = Department(district_id=district_id, category=category)
            db.session.add(department)

        department.name = name.strip()
        department.manager = (manager or "").strip() or None
        department.phone = (phone or "").strip() or None
        department.email = (email or "").strip() or None
        department.is_active = bool(is_active)

        return BaseService.update_commit(
            department,
            success_msg="تم حفظ الإدارة بنجاح",
            error_prefix="حدث خطأ أثناء الحفظ",
        )

    @staticmethod
    def delete(department_id):
        department = db.session.get(Department, department_id)
        if not department:
            return None, "الإدارة غير موجودة"

        return BaseService.delete(
            department,
            success_msg="تم حذف الإدارة",
            error_prefix="حدث خطأ أثناء الحذف",
        )

    # ── seeding ───────────────────────────────────────────────────────────────

    @staticmethod
    def seed_defaults(district_id=None):
        """
        Gives every district a department per complaint category, so a complaint
        is never left unrouted. Existing rows are left alone.

        Returns the number created.
        """
        districts = (
            [db.session.get(District, district_id)] if district_id
            else District.query.all()
        )

        created = 0

        for district in districts:
            if not district:
                continue

            existing = {
                d.category for d in Department.query.filter_by(district_id=district.id).all()
            }

            for category, name in DEFAULT_DEPARTMENTS.items():
                if category in existing:
                    continue
                db.session.add(
                    Department(district_id=district.id, category=category, name=name)
                )
                created += 1

        try:
            db.session.commit()
        except Exception:
            db.session.rollback()
            return 0

        return created
