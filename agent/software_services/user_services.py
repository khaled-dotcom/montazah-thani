from models.models import District, User, db
from software_services.base_service import BaseService


class UserService:

    @staticmethod
    def create_user(name, password, district_id=None):
        if not name or not name.strip():
            return None, "اسم المستخدم مطلوب"

        if not password:
            return None, "كلمة المرور مطلوبة"

        name = name.strip().lower()

        if User.query.filter_by(username=name).first():
            return None, "اسم المستخدم موجود بالفعل"

        if district_id and not db.session.get(District, district_id):
            return None, "الحي غير موجود"

        new_user = User(username=name, district_id=district_id or None)
        new_user.set_password(password)

        return BaseService.commit(
            new_user,
            success_msg="تم إنشاء المستخدم بنجاح",
            error_prefix="حدث خطأ أثناء إنشاء المستخدم",
        )

    @staticmethod
    def update_user(user_id, name=None, password=None, district_id=None):
        user = db.session.get(User, user_id)

        if not user:
            return None, "المستخدم غير موجود"

        if name:
            name = name.strip().lower()
            if name != user.username:
                if User.query.filter_by(username=name).first():
                    return None, "اسم المستخدم موجود بالفعل"
                user.username = name

        if password:
            user.set_password(password)

        if district_id and not db.session.get(District, district_id):
            return None, "الحي غير موجود"

        user.district_id = district_id or None

        return BaseService.update_commit(
            user,
            success_msg="تم تحديث المستخدم بنجاح",
            error_prefix="حدث خطأ أثناء تحديث المستخدم",
        )

    @staticmethod
    def login_user(name, password):
        if not name or not password:
            return None, "اسم المستخدم أو كلمة المرور غير صحيحة"

        user = User.query.filter_by(username=name.strip().lower()).first()

        if user and user.check_password(password):
            return user, "تم تسجيل الدخول بنجاح"

        return None, "اسم المستخدم أو كلمة المرور غير صحيحة"

    @staticmethod
    def get_user_by_id(user_id):
        user = db.session.get(User, user_id)
        if user:
            return user, "تم العثور على المستخدم"
        return None, "المستخدم غير موجود"

    @staticmethod
    def get_all_users():
        return User.query.order_by(User.username.asc()).all()
