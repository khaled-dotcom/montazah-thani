"""
software_services/complaint_services.py
"""

from dataclasses import dataclass
from datetime import datetime, timezone

from models.models import (
    Complaint, ComplaintCategory, ComplaintStatus, Department, District, db,
)
from graph.utils import COMPLAINT_PREFIX, generate_reference


@dataclass
class ComplaintResult:
    success: bool
    complaint: object
    message: str


def _resolve_category(value):
    """Accepts either the Arabic label or the enum name; falls back to OTHER."""
    if not value:
        return ComplaintCategory.OTHER

    if isinstance(value, ComplaintCategory):
        return value

    text = str(value).strip()

    for category in ComplaintCategory:
        if category.value == text or category.name.lower() == text.lower():
            return category

    # مطابقة جزئية عشان الموديل ممكن يكتب "قمامة" بدل "نظافة وقمامة"
    for category in ComplaintCategory:
        if text in category.value or category.value in text:
            return category

    return ComplaintCategory.OTHER


class ComplaintService:

    # ── list / search ─────────────────────────────────────────────────────────

    @staticmethod
    def get_all(page=1, per_page=15, search=None, status=None,
                district_id=None, category=None):
        query = Complaint.query

        if search:
            query = query.filter(
                db.or_(
                    Complaint.reference_id.ilike(f"%{search}%"),
                    Complaint.citizen_name.ilike(f"%{search}%"),
                    Complaint.phone_number.ilike(f"%{search}%"),
                    Complaint.address.ilike(f"%{search}%"),
                    Complaint.complaint_text.ilike(f"%{search}%"),
                )
            )

        if status:
            try:
                query = query.filter(Complaint.status == ComplaintStatus(status))
            except ValueError:
                pass

        if district_id:
            query = query.filter(Complaint.district_id == district_id)

        if category:
            resolved = _resolve_category(category)
            query = query.filter(Complaint.category == resolved)

        query = query.order_by(Complaint.created_at.desc())

        try:
            pagination = query.paginate(page=page, per_page=per_page, error_out=False)
            return pagination, "تم العثور على البلاغات"
        except Exception as e:
            return None, f"حدث خطأ أثناء الجلب: {str(e)}"

    # ── single ────────────────────────────────────────────────────────────────

    @staticmethod
    def get_by_id(complaint_id):
        complaint = db.session.get(Complaint, complaint_id)
        if not complaint:
            return None, "البلاغ غير موجود"
        return complaint, "تم العثور على البلاغ"

    @staticmethod
    def get_by_reference(reference_id):
        if not reference_id:
            return None, "رقم البلاغ مطلوب"

        complaint = Complaint.query.filter(
            Complaint.reference_id == reference_id.strip().upper()
        ).first()

        if not complaint:
            return None, "البلاغ غير موجود"
        return complaint, "تم العثور على البلاغ"

    @staticmethod
    def get_recent_by_phone(phone_number, limit=3):
        if not phone_number:
            return []
        return (
            Complaint.query
            .filter(Complaint.phone_number == phone_number.strip())
            .order_by(Complaint.created_at.desc())
            .limit(limit)
            .all()
        )

    # ── create ────────────────────────────────────────────────────────────────

    @staticmethod
    def create_complaint(phone_number, complaint_text, citizen_name=None,
                         district_name=None, category_value=None, address=None,
                         session_id=None, comes_from="website", attachment=None,
                         national_id=None, email=None):

        if not phone_number or not str(phone_number).strip():
            return ComplaintResult(False, None, "رقم الهاتف مطلوب")

        if not complaint_text or not str(complaint_text).strip():
            return ComplaintResult(False, None, "وصف الشكوى مطلوب")

        district_id = None
        if district_name:
            district = District.query.filter(
                District.name.ilike(str(district_name).strip())
            ).first()
            if district:
                district_id = district.id

        category = _resolve_category(category_value)

        # نجرب أكتر من رقم مرجع لو حصل تصادم نادر
        last_error = None
        for _ in range(5):
            try:
                complaint = Complaint(
                    reference_id=generate_reference(COMPLAINT_PREFIX),
                    district_id=district_id,
                    category=category,
                    citizen_name=(citizen_name or "").strip() or None,
                    national_id=(national_id or "").strip() or None,
                    phone_number=str(phone_number).strip(),
                    email=(email or "").strip() or None,
                    address=(address or "").strip() or None,
                    complaint_text=str(complaint_text).strip(),
                    status=ComplaintStatus.PENDING,
                    attachment=attachment,
                    session_id=session_id,
                    comes_from=comes_from,
                )
                db.session.add(complaint)
                db.session.commit()

                # التوجيه قبل الإشعار عشان رسالة المواطن تقوله راح لمين
                ComplaintService.route(complaint)
                ComplaintService._notify(complaint, registered=True)

                return ComplaintResult(True, complaint, "تم تسجيل البلاغ بنجاح")

            except Exception as e:
                db.session.rollback()
                last_error = e

        from notified_center.EmailSender import send_production_alert
        send_production_alert(
            subject="ComplaintService create_complaint Exception",
            body_or_error=last_error,
            context={"phone": phone_number, "session_id": session_id},
        )
        return ComplaintResult(False, None, f"حدث خطأ أثناء تسجيل البلاغ: {last_error}")

    # ── routing ───────────────────────────────────────────────────────────────

    @staticmethod
    def resolve_department(district_id, category):
        """The department responsible for this category in this district."""
        if not district_id or not category:
            return None

        return Department.query.filter_by(
            district_id=district_id,
            category=category,
            is_active=True,
        ).first()

    @staticmethod
    def route(complaint):
        """
        Assigns the complaint to the responsible department and emails them.

        Runs right after the complaint is saved, so it reaches the dashboard
        already routed instead of sitting in an unassigned pile.
        """
        department = ComplaintService.resolve_department(
            complaint.district_id, complaint.category
        )

        if not department:
            return None

        try:
            complaint.department_id = department.id
            complaint.routed_at = datetime.now(timezone.utc)
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            print(f"[ComplaintService] routing failed: {e}")
            return None

        # نبلّغ الإدارة نفسها لو ليها إيميل
        if department.email:
            try:
                from notified_center.citizen_notifier import notify_department_new_complaint

                notify_department_new_complaint({
                    "email":          department.email,
                    "department":     department.name,
                    "manager":        department.manager,
                    "reference_id":   complaint.reference_id,
                    "category":       complaint.category.value if complaint.category else None,
                    "district":       complaint.district.name if complaint.district else None,
                    "address":        complaint.address,
                    "complaint_text": complaint.complaint_text,
                    "citizen_name":   complaint.citizen_name,
                    "phone":          complaint.phone_number,
                })
            except Exception as e:
                print(f"[ComplaintService] department notification failed: {e}")

        return department

    # ── notifications ─────────────────────────────────────────────────────────

    @staticmethod
    def _notify(complaint, registered=False):
        """
        Emails the citizen. Reads everything into a plain dict first because the
        send happens on a background thread where an ORM object would be
        detached from the session.
        """
        if not complaint.email:
            return

        try:
            payload = {
                "email":          complaint.email,
                "reference_id":   complaint.reference_id,
                "citizen_name":   complaint.citizen_name,
                "category":       complaint.category.value if complaint.category else None,
                "district":       complaint.district.name if complaint.district else None,
                "address":        complaint.address,
                "complaint_text": complaint.complaint_text,
                "status":         complaint.status.value if complaint.status else None,
                "staff_note":     complaint.staff_note,
                "department":     complaint.department.name if complaint.department else None,
            }

            from notified_center.citizen_notifier import (
                notify_complaint_registered, notify_complaint_status,
            )

            if registered:
                notify_complaint_registered(payload)
            else:
                notify_complaint_status(payload)

        except Exception as e:
            print(f"[ComplaintService] notification failed: {e}")

    # ── update ────────────────────────────────────────────────────────────────

    @staticmethod
    def update_status(complaint_id, new_status, staff_note=None):
        complaint = db.session.get(Complaint, complaint_id)
        if not complaint:
            return ComplaintResult(False, None, "البلاغ غير موجود")

        try:
            status = ComplaintStatus(new_status)
        except ValueError:
            return ComplaintResult(False, None, "حالة غير صحيحة")

        # الموظف ممكن يحفظ ملاحظة من غير ما يغيّر الحالة — ساعتها
        # مش هنبعت إشعار "الحالة اتغيرت" على حالة هي هي
        status_changed = complaint.notified_status != status.value

        try:
            complaint.status = status

            if staff_note is not None:
                complaint.staff_note = staff_note.strip() or None

            complaint.resolved_at = (
                datetime.now(timezone.utc)
                if status in (ComplaintStatus.RESOLVED, ComplaintStatus.REJECTED)
                else None
            )

            if status_changed:
                complaint.notified_status = status.value

            db.session.commit()

            if status_changed:
                ComplaintService._notify(complaint, registered=False)

            return ComplaintResult(True, complaint, "تم تحديث حالة البلاغ")

        except Exception as e:
            db.session.rollback()
            return ComplaintResult(False, None, f"حدث خطأ: {str(e)}")

    @staticmethod
    def assign_district(complaint_id, district_id):
        complaint = db.session.get(Complaint, complaint_id)
        if not complaint:
            return ComplaintResult(False, None, "البلاغ غير موجود")

        if district_id and not db.session.get(District, district_id):
            return ComplaintResult(False, None, "الحي غير موجود")

        try:
            complaint.district_id = district_id or None
            db.session.commit()
            return ComplaintResult(True, complaint, "تم تحويل البلاغ للحي")
        except Exception as e:
            db.session.rollback()
            return ComplaintResult(False, None, f"حدث خطأ: {str(e)}")

    # ── delete ────────────────────────────────────────────────────────────────

    @staticmethod
    def delete_complaint(complaint_id):
        complaint = db.session.get(Complaint, complaint_id)
        if not complaint:
            return ComplaintResult(False, None, "البلاغ غير موجود")

        try:
            db.session.delete(complaint)
            db.session.commit()
            return ComplaintResult(True, complaint, "تم حذف البلاغ بنجاح")
        except Exception as e:
            db.session.rollback()
            return ComplaintResult(False, None, f"حدث خطأ أثناء الحذف: {str(e)}")

    # ── stats ─────────────────────────────────────────────────────────────────

    @staticmethod
    def get_stats(district_id=None):
        query = Complaint.query
        if district_id:
            query = query.filter(Complaint.district_id == district_id)

        def count(status=None):
            q = query
            if status:
                q = q.filter(Complaint.status == status)
            return q.count()

        return {
            "total":       count(),
            "pending":     count(ComplaintStatus.PENDING),
            "in_progress": count(ComplaintStatus.IN_PROGRESS),
            "resolved":    count(ComplaintStatus.RESOLVED),
            "rejected":    count(ComplaintStatus.REJECTED),
        }

    @staticmethod
    def get_category_breakdown(district_id=None):
        query = db.session.query(
            Complaint.category, db.func.count(Complaint.id)
        )
        if district_id:
            query = query.filter(Complaint.district_id == district_id)

        rows = query.group_by(Complaint.category).all()

        return [
            {"category": c.value if c else "غير محدد", "count": n}
            for c, n in sorted(rows, key=lambda r: r[1], reverse=True)
        ]
