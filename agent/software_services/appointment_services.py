"""
software_services/appointment_services.py
"""

from dataclasses import dataclass

from models.models import Appointment, AppointmentStatus, CityService, District, db
from graph.utils import APPOINTMENT_PREFIX, generate_reference


@dataclass
class AppointmentResult:
    success: bool
    appointment: object
    message: str


class AppointmentService:

    # ── list / search ─────────────────────────────────────────────────────────

    @staticmethod
    def get_all(page=1, per_page=15, search=None, status=None, district_id=None):
        query = Appointment.query

        if search:
            query = query.filter(
                db.or_(
                    Appointment.reference_id.ilike(f"%{search}%"),
                    Appointment.name.ilike(f"%{search}%"),
                    Appointment.phone_number.ilike(f"%{search}%"),
                    Appointment.details.ilike(f"%{search}%"),
                )
            )

        if status:
            try:
                query = query.filter(Appointment.status == AppointmentStatus(status))
            except ValueError:
                pass

        if district_id:
            query = query.filter(Appointment.district_id == district_id)

        query = query.order_by(Appointment.created_at.desc())

        try:
            pagination = query.paginate(page=page, per_page=per_page, error_out=False)
            return pagination, "تم العثور على المواعيد"
        except Exception as e:
            return None, f"حدث خطأ أثناء الجلب: {str(e)}"

    # ── single ────────────────────────────────────────────────────────────────

    @staticmethod
    def get_by_id(appointment_id):
        appointment = db.session.get(Appointment, appointment_id)
        if not appointment:
            return None, "الموعد غير موجود"
        return appointment, "تم العثور على الموعد"

    @staticmethod
    def get_by_reference(reference_id):
        if not reference_id:
            return None, "رقم الموعد مطلوب"

        appointment = Appointment.query.filter(
            Appointment.reference_id == reference_id.strip().upper()
        ).first()

        if not appointment:
            return None, "الموعد غير موجود"
        return appointment, "تم العثور على الموعد"

    @staticmethod
    def get_recent_by_phone(phone_number, limit=3):
        if not phone_number:
            return []
        return (
            Appointment.query
            .filter(Appointment.phone_number == phone_number.strip())
            .order_by(Appointment.created_at.desc())
            .limit(limit)
            .all()
        )

    # ── create ────────────────────────────────────────────────────────────────

    @staticmethod
    def create_appointment(name, phone_number, details=None, date=None,
                           district_name=None, national_id=None,
                           session_id=None, comes_from="website", email=None):

        if not name or not str(name).strip():
            return AppointmentResult(False, None, "اسم المواطن مطلوب")

        if not phone_number or not str(phone_number).strip():
            return AppointmentResult(False, None, "رقم الهاتف مطلوب")

        district_id = None
        if district_name:
            district = District.query.filter(
                District.name.ilike(str(district_name).strip())
            ).first()
            if district:
                district_id = district.id

        # نحاول نربط الموعد بالخدمة المسجلة عشان لوحة التحكم تعرف
        # الأوراق المطلوبة من غير قراءة النص
        service_id = None
        if details:
            service_query = CityService.query.filter(
                CityService.name.ilike(f"%{str(details).strip()}%")
            )
            if district_id:
                service_query = service_query.filter(
                    db.or_(
                        CityService.district_id == district_id,
                        CityService.district_id.is_(None),
                    )
                )
            service = service_query.first()
            if service:
                service_id = service.id

        last_error = None
        for _ in range(5):
            try:
                appointment = Appointment(
                    reference_id=generate_reference(APPOINTMENT_PREFIX),
                    district_id=district_id,
                    service_id=service_id,
                    name=str(name).strip(),
                    phone_number=str(phone_number).strip(),
                    email=(email or "").strip() or None,
                    national_id=(national_id or "").strip() or None,
                    details=(details or "").strip() or None,
                    date=date,
                    status=AppointmentStatus.PENDING,
                    session_id=session_id,
                    comes_from=comes_from,
                )
                db.session.add(appointment)
                db.session.commit()

                AppointmentService._notify(appointment, registered=True)

                return AppointmentResult(True, appointment, "تم إنشاء الموعد بنجاح")

            except Exception as e:
                db.session.rollback()
                last_error = e

        from notified_center.EmailSender import send_production_alert
        send_production_alert(
            subject="AppointmentService create_appointment Exception",
            body_or_error=last_error,
            context={"name": name, "phone": phone_number, "session_id": session_id},
        )
        return AppointmentResult(False, None, f"حدث خطأ أثناء إنشاء الموعد: {last_error}")

    # ── update ────────────────────────────────────────────────────────────────

    @staticmethod
    def update_appointment(appointment_id, **fields):
        appointment = db.session.get(Appointment, appointment_id)
        if not appointment:
            return AppointmentResult(False, None, "الموعد غير موجود")

        for key in ("name", "phone_number", "national_id", "email",
                    "details", "date", "staff_note"):
            if key in fields and fields[key] is not None:
                value = str(fields[key]).strip()
                if key in ("name", "phone_number") and not value:
                    return AppointmentResult(False, None, "الاسم ورقم الهاتف مطلوبان")
                setattr(appointment, key, value or None)

        if "district_id" in fields:
            district_id = fields["district_id"] or None
            if district_id and not db.session.get(District, district_id):
                return AppointmentResult(False, None, "الحي غير موجود")
            appointment.district_id = district_id

        try:
            db.session.commit()
            return AppointmentResult(True, appointment, "تم تحديث الموعد بنجاح")
        except Exception as e:
            db.session.rollback()
            return AppointmentResult(False, None, f"حدث خطأ أثناء التحديث: {str(e)}")

    @staticmethod
    def _notify(appointment, registered=False):
        """
        Emails the citizen. Values are copied into a plain dict because the send
        runs on a background thread where an ORM object would be detached.
        """
        if not appointment.email:
            return

        try:
            payload = {
                "email":        appointment.email,
                "reference_id": appointment.reference_id,
                "name":         appointment.name,
                "details":      appointment.details,
                "district":     appointment.district.name if appointment.district else None,
                "date":         appointment.date,
                "status":       appointment.status.value if appointment.status else None,
                "staff_note":   appointment.staff_note,
            }

            from notified_center.citizen_notifier import (
                notify_appointment_registered, notify_appointment_status,
            )

            if registered:
                notify_appointment_registered(payload)
            else:
                notify_appointment_status(payload)

        except Exception as e:
            print(f"[AppointmentService] notification failed: {e}")

    @staticmethod
    def update_status(appointment_id, new_status, staff_note=None):
        appointment = db.session.get(Appointment, appointment_id)
        if not appointment:
            return AppointmentResult(False, None, "الموعد غير موجود")

        try:
            status = AppointmentStatus(new_status)
        except ValueError:
            return AppointmentResult(False, None, "حالة غير صحيحة")

        # ملاحظة من غير تغيير حالة ما تستاهلش إشعار "الحالة اتغيرت"
        status_changed = appointment.notified_status != status.value

        appointment.status = status

        if staff_note is not None:
            appointment.staff_note = staff_note.strip() or None

        if status_changed:
            appointment.notified_status = status.value

        try:
            db.session.commit()

            if status_changed:
                AppointmentService._notify(appointment, registered=False)

            return AppointmentResult(True, appointment, "تم تحديث حالة الموعد")
        except Exception as e:
            db.session.rollback()
            return AppointmentResult(False, None, f"حدث خطأ: {str(e)}")

    # ── delete ────────────────────────────────────────────────────────────────

    @staticmethod
    def delete_appointment(appointment_id):
        appointment = db.session.get(Appointment, appointment_id)
        if not appointment:
            return AppointmentResult(False, None, "الموعد غير موجود")

        try:
            db.session.delete(appointment)
            db.session.commit()
            return AppointmentResult(True, appointment, "تم حذف الموعد بنجاح")
        except Exception as e:
            db.session.rollback()
            return AppointmentResult(False, None, f"حدث خطأ أثناء الحذف: {str(e)}")

    # ── stats ─────────────────────────────────────────────────────────────────

    @staticmethod
    def get_stats(district_id=None):
        query = Appointment.query
        if district_id:
            query = query.filter(Appointment.district_id == district_id)

        def count(status=None):
            q = query
            if status:
                q = q.filter(Appointment.status == status)
            return q.count()

        return {
            "total":     count(),
            "pending":   count(AppointmentStatus.PENDING),
            "confirmed": count(AppointmentStatus.CONFIRMED),
            "attended":  count(AppointmentStatus.ATTENDED),
            "no_show":   count(AppointmentStatus.NO_SHOW),
            "cancelled": count(AppointmentStatus.CANCELLED),
        }
