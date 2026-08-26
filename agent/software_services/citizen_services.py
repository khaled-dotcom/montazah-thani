"""
software_services/citizen_services.py

Chat session state for website visitors. Replaces the old ClientService, which
was keyed by (platform_id, page_id, sender_id) for WhatsApp/Messenger. Here the
identity is a single session_id generated in the browser.
"""

import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy.exc import IntegrityError

from models.models import ChatMessage, Citizen, db

logger = logging.getLogger(__name__)

MAX_STORED_MESSAGES = 200   # سقف الرسائل المحفوظة للجلسة الواحدة

# حارس يفرّق بين "ما تلمسش المسار" و"امسح المسار"
NO_CHANGE = object()


class CitizenService:

    # ── read ──────────────────────────────────────────────────────────────────

    @staticmethod
    def get(session_id):
        if not session_id:
            return None
        return db.session.get(Citizen, str(session_id))

    @staticmethod
    def get_all(page=1, per_page=20, search=None, district_id=None):
        query = Citizen.query

        if search:
            query = query.filter(
                db.or_(
                    Citizen.session_id.ilike(f"%{search}%"),
                    Citizen.name.ilike(f"%{search}%"),
                    Citizen.phone.ilike(f"%{search}%"),
                )
            )

        if district_id:
            query = query.filter(Citizen.district_id == district_id)

        query = query.order_by(Citizen.last_seen_at.desc())

        try:
            pagination = query.paginate(page=page, per_page=per_page, error_out=False)
            return pagination, "تم العثور على المحادثات"
        except Exception as e:
            return None, f"حدث خطأ أثناء الجلب: {str(e)}"

    @staticmethod
    def get_messages(session_id, limit=200):
        if not session_id:
            return []
        return (
            ChatMessage.query
            .filter_by(session_id=str(session_id))
            .order_by(ChatMessage.created_at.asc())
            .limit(limit)
            .all()
        )

    # ── write ─────────────────────────────────────────────────────────────────

    @staticmethod
    def get_or_create(session_id, district_id=None, user_agent=None, ip_address=None):
        """
        Returns the Citizen row for this browser session, creating it on first
        contact. Never raises — a failure here must not block the reply.
        """
        session_id = str(session_id)

        citizen = db.session.get(Citizen, session_id)

        if citizen:
            # الحي بيتحدّث لو الـ widget اتنقل لموقع حي تاني
            if district_id and citizen.district_id != district_id:
                citizen.district_id = district_id
            citizen.last_seen_at = datetime.now(timezone.utc)
            try:
                db.session.commit()
            except Exception:
                db.session.rollback()
            return citizen

        citizen = Citizen(
            session_id=session_id,
            district_id=district_id,
            summary="",
            last_bot_message="",
            user_agent=(user_agent or "")[:300] or None,
            ip_address=(ip_address or "")[:64] or None,
        )

        try:
            db.session.add(citizen)
            db.session.commit()
            return citizen

        except IntegrityError:
            # سباق بين طلبين من نفس الجلسة
            db.session.rollback()
            return db.session.get(Citizen, session_id)

        except Exception:
            db.session.rollback()
            logger.exception("Failed to create citizen session %s", session_id)
            return db.session.get(Citizen, session_id)

    @staticmethod
    def merge_draft(existing: dict | None, incoming: dict | None) -> dict:
        """
        Merges this turn's extraction over what we already had.

        An empty incoming value never erases a stored one — the model omitting
        a field it mentioned two turns ago is the normal failure mode, and
        letting that wipe the field is what sends citizens round in circles.
        """
        merged = dict(existing or {})

        for key, value in (incoming or {}).items():
            if value is None:
                continue
            if isinstance(value, str) and not value.strip():
                continue
            merged[key] = value

        return merged

    @staticmethod
    def update_memory(session_id, summary=None, last_bot_message=None,
                      active_flow=NO_CHANGE, draft=NO_CHANGE):
        """
        Persists the rolling conversation memory after each agent turn.

        `active_flow` uses a sentinel rather than None as its default, because
        None is a meaningful value here — it means "the flow just finished,
        clear it". Passing nothing leaves the flow untouched.
        """
        if not session_id:
            return None, "لا توجد جلسة"

        citizen = db.session.get(Citizen, str(session_id))

        if not citizen:
            citizen = Citizen(
                session_id=str(session_id),
                summary=summary,
                last_bot_message=last_bot_message,
                active_flow=None if active_flow is NO_CHANGE else active_flow,
                draft=None if draft is NO_CHANGE else draft,
            )
            db.session.add(citizen)
        else:
            if summary is not None:
                citizen.summary = summary
            if last_bot_message is not None:
                citizen.last_bot_message = last_bot_message
            if active_flow is not NO_CHANGE:
                citizen.active_flow = active_flow
            if draft is not NO_CHANGE:
                citizen.draft = draft
            citizen.last_seen_at = datetime.now(timezone.utc)

        try:
            db.session.commit()
            return citizen, "تم حفظ حالة المحادثة"
        except Exception as e:
            db.session.rollback()
            logger.exception("Failed to persist memory for %s", session_id)
            return None, f"حدث خطأ أثناء حفظ حالة المحادثة: {str(e)}"

    @staticmethod
    def log_message(session_id, role, content, intent=None):
        """Appends one message to the transcript. Never raises."""
        if not session_id or not content:
            return

        try:
            db.session.add(
                ChatMessage(
                    session_id=str(session_id),
                    role=role,
                    content=content,
                    intent=intent,
                )
            )

            if role == "user":
                citizen = db.session.get(Citizen, str(session_id))
                if citizen:
                    citizen.message_count = (citizen.message_count or 0) + 1

            db.session.commit()

        except Exception:
            db.session.rollback()
            logger.exception("Failed to log %s message for %s", role, session_id)

    # بيانات بتخص الشخص، مش الطلب — بتعيش أطول من أي مسار
    IDENTITY_FIELDS = ("name", "national_id", "phone", "email")

    @staticmethod
    def remember_contact(session_id, name=None, phone=None):
        """Caches the citizen's name/phone once known so the dashboard shows it."""
        CitizenService.remember_identity(session_id, name=name, phone=phone)

    @staticmethod
    def remember_identity(session_id, **fields):
        """
        Stores the citizen's identity on the session so later flows can reuse it.

        A stored value is only replaced by a newer non-empty one — so a model
        that omits a field this turn never erases what the citizen already told
        us, and the citizen is never asked for their national ID twice.
        """
        if not session_id:
            return

        citizen = db.session.get(Citizen, str(session_id))
        if not citizen:
            return

        limits = {"name": 120, "national_id": 20, "phone": 50, "email": 150}
        changed = False

        for key in CitizenService.IDENTITY_FIELDS:
            value = fields.get(key)
            if not value or not str(value).strip():
                continue

            value = str(value).strip()[: limits[key]]
            if getattr(citizen, key, None) != value:
                setattr(citizen, key, value)
                changed = True

        if changed:
            try:
                db.session.commit()
            except Exception:
                db.session.rollback()

    @staticmethod
    def get_identity(session_id) -> dict:
        """The identity fields known for this session, empties omitted."""
        if not session_id:
            return {}

        citizen = db.session.get(Citizen, str(session_id))
        if not citizen:
            return {}

        return {
            key: getattr(citizen, key)
            for key in CitizenService.IDENTITY_FIELDS
            if getattr(citizen, key, None)
        }

    # ── maintenance ───────────────────────────────────────────────────────────

    @staticmethod
    def delete_session(session_id):
        citizen = db.session.get(Citizen, str(session_id))
        if not citizen:
            return None, "الجلسة غير موجودة"

        try:
            db.session.delete(citizen)
            db.session.commit()
            return citizen, "تم حذف المحادثة"
        except Exception as e:
            db.session.rollback()
            return None, f"حدث خطأ أثناء الحذف: {str(e)}"

    @staticmethod
    def purge_older_than(days=90):
        """Deletes stale sessions. Intended to be run from a scheduled job."""
        cutoff = datetime.now(timezone.utc) - timedelta(days=days)

        try:
            stale = Citizen.query.filter(Citizen.last_seen_at < cutoff).all()
            count = len(stale)
            for citizen in stale:
                db.session.delete(citizen)
            db.session.commit()
            return count
        except Exception:
            db.session.rollback()
            logger.exception("Failed to purge old sessions")
            return 0
