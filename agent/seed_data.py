"""
seed_data.py

Initial data for the Alexandria districts assistant.

IMPORTANT — what is deliberately left blank:
    Addresses, phone numbers, hotlines, working hours, head-of-district names,
    fees, required documents, and coverage areas are NOT seeded. Those are
    facts about real government offices, and a chatbot that invents them would
    send citizens to the wrong place. Fill them in from the dashboard.

    The assistant is built so that a blank field is simply never mentioned to
    the citizen — it will say it does not have the information rather than
    guess. So an unfinished record is safe, just less useful.

Run with:
    flask seed-districts
"""

from models.models import CityService, District, db


# اسم الحي والمنطقة الإدارية التابع لها.
# باقي البيانات (العنوان، التليفون، مواعيد العمل، النطاق الجغرافي) تُملأ من لوحة التحكم.
ALEXANDRIA_DISTRICTS = [
    ("حي المنتزه أول",   "المنتزه"),
    ("حي المنتزه ثان",   "المنتزه"),
    ("حي شرق",           "شرق"),
    ("حي وسط",           "وسط"),
    ("حي غرب",           "غرب"),
    ("حي الجمرك",        "الجمرك"),
    ("حي العامرية أول",  "العامرية"),
    ("حي العامرية ثان",  "العامرية"),
    ("حي الدخيلة",       "الدخيلة"),
    ("مدينة برج العرب",       "برج العرب"),
    ("مدينة برج العرب الجديدة", "برج العرب"),
]


# ══════════════════════════════════════════════════════════════════════════
#  كتالوج خدمات الأحياء
#
#  كل خدمة: (الاسم، التصنيف، الإدارة المختصة، الأوراق المطلوبة، مدة الإنجاز)
#
#  الأوراق المطلوبة هنا هي المتعارف عليه في الأحياء المصرية، ومحطوطة عشان
#  المساعد يبقى مفيد من أول يوم. لكنها بتختلف من حي لحي ومن سنة لسنة —
#  فراجعها مع الحي قبل التشغيل الحقيقي وعدّل من لوحة التحكم.
#
#  الرسوم مسيبة فاضية عن قصد. دي أرقام رسمية بتتغير بقرارات، واختراعها
#  معناه إن مواطن يروح الحي بمبلغ غلط. املأها من الحي.
# ══════════════════════════════════════════════════════════════════════════

COMMON_SERVICES = [
    # ── تراخيص المحال ──────────────────────────────────────────────────────
    ("ترخيص محل تجاري", "تراخيص", "إدارة التراخيص",
     "صورة بطاقة الرقم القومي\nعقد الإيجار أو سند الملكية\nالسجل التجاري\n"
     "البطاقة الضريبية\nشهادة موافقة الحماية المدنية\nرسم كروكي للمحل",
     "١٥ يوم عمل"),

    ("تجديد ترخيص محل تجاري", "تراخيص", "إدارة التراخيص",
     "أصل الرخصة السابقة\nصورة بطاقة الرقم القومي\nإيصال سداد آخر رسوم\n"
     "شهادة سارية من الحماية المدنية",
     "٧ أيام عمل"),

    ("بدل فاقد أو تالف لرخصة محل", "تراخيص", "إدارة التراخيص",
     "محضر إثبات فقد من قسم الشرطة\nصورة بطاقة الرقم القومي\nصورة من الرخصة إن وجدت",
     "٧ أيام عمل"),

    ("تعديل نشاط أو بيانات رخصة", "تراخيص", "إدارة التراخيص",
     "أصل الرخصة\nصورة بطاقة الرقم القومي\nالمستندات المؤيدة للتعديل",
     "١٠ أيام عمل"),

    ("ترخيص مزاولة حرفة", "تراخيص", "إدارة التراخيص",
     "صورة بطاقة الرقم القومي\nعقد المكان\nشهادة الخبرة أو المؤهل الحرفي",
     "١٥ يوم عمل"),

    # ── إعلانات وإشغالات ───────────────────────────────────────────────────
    ("ترخيص لافتة أو إعلان", "إعلانات", "إدارة الإعلانات",
     "صورة بطاقة الرقم القومي\nصورة رخصة المحل\nرسم أو صورة للافتة بمقاساتها\n"
     "عقد الإيجار أو الملكية",
     "١٠ أيام عمل"),

    ("تصريح إشغال طريق مؤقت", "إشغالات", "إدارة الإشغالات",
     "صورة بطاقة الرقم القومي\nصورة رخصة المحل\nتحديد المساحة والمدة المطلوبة",
     "٥ أيام عمل"),

    ("تصريح إقامة سرادق أو مناسبة", "إشغالات", "إدارة الإشغالات",
     "صورة بطاقة الرقم القومي\nتحديد المكان والمدة\nموافقة قسم الشرطة",
     "٣ أيام عمل"),

    ("تصريح حفر بالطريق العام", "إشغالات", "إدارة الطرق والرصف",
     "خطاب من جهة المرفق\nرسم كروكي لمسار الحفر\nتأمين رد الشيء لأصله",
     "١٥ يوم عمل"),

    ("تصريح نقل أثاث أو مخلفات بناء", "إشغالات", "إدارة النظافة والتجميل",
     "صورة بطاقة الرقم القومي\nتحديد العنوان والمدة",
     "يوم عمل واحد"),

    # ── تنظيم ومباني ───────────────────────────────────────────────────────
    ("رخصة بناء", "تنظيم ومباني", "إدارة التنظيم والمباني",
     "سند ملكية الأرض\nصورة بطاقة الرقم القومي\nالرسومات الهندسية معتمدة من نقابة المهندسين\n"
     "الدراسات الإنشائية\nشهادة صلاحية الموقع للبناء",
     "٣٠ يوم عمل"),

    ("تصريح ترميم أو تشطيب عقار", "تنظيم ومباني", "إدارة التنظيم والمباني",
     "سند الملكية أو عقد الإيجار\nصورة بطاقة الرقم القومي\nبيان بأعمال الترميم المطلوبة",
     "١٠ أيام عمل"),

    ("طلب تصالح على مخالفات البناء", "تنظيم ومباني", "إدارة التنظيم والمباني",
     "استمارة التصالح\nسند الملكية\nصورة بطاقة الرقم القومي\n"
     "الرسومات الهندسية للوضع القائم\nتقرير سلامة إنشائية",
     "يحدده الحي حسب الحالة"),

    ("شهادة صلاحية للإشغال", "تنظيم ومباني", "إدارة التنظيم والمباني",
     "رخصة البناء\nشهادة إتمام الأعمال\nتقرير سلامة إنشائية",
     "١٥ يوم عمل"),

    ("طلب إزالة عقار آيل للسقوط", "تنظيم ومباني", "إدارة التنظيم والمباني",
     "صورة بطاقة الرقم القومي\nسند الملكية\nتقرير هندسي بحالة العقار",
     "يحدده الحي حسب الحالة"),

    # ── مساحة وبيانات ──────────────────────────────────────────────────────
    ("شهادة بيانات عقارية", "مساحة", "إدارة المساحة",
     "صورة بطاقة الرقم القومي\nسند الملكية\nتحديد العنوان بدقة",
     "٧ أيام عمل"),

    ("رسم كروكي معتمد", "مساحة", "إدارة المساحة",
     "صورة بطاقة الرقم القومي\nسند الملكية أو عقد الإيجار",
     "٥ أيام عمل"),

    ("شهادة رقم عقاري", "مساحة", "إدارة المساحة",
     "صورة بطاقة الرقم القومي\nسند الملكية\nإيصال مرافق حديث",
     "٥ أيام عمل"),

    # ── شؤون صحية وبيئية ───────────────────────────────────────────────────
    ("شهادة صحية لمحل أغذية", "شؤون صحية", "إدارة الشؤون الصحية",
     "صورة رخصة المحل\nشهادات صحية للعاملين\nتقرير معاينة صحية للمكان",
     "١٠ أيام عمل"),

    ("تصريح تربية حيوانات أو طيور", "شؤون صحية", "إدارة الطب البيطري",
     "صورة بطاقة الرقم القومي\nتحديد المكان والنوع والعدد\nموافقة الجيران",
     "١٠ أيام عمل"),

    # ── خدمات عامة ─────────────────────────────────────────────────────────
    ("طلب توصيل مرافق لعقار", "مرافق", "إدارة المرافق",
     "سند الملكية\nصورة بطاقة الرقم القومي\nرخصة البناء",
     "٢١ يوم عمل"),

    ("طلب تركيب مطبات صناعية", "طرق", "إدارة الطرق والرصف",
     "طلب موقّع من سكان المنطقة\nتحديد الموقع بدقة",
     "يحدده الحي حسب الحالة"),

    ("طلب صيانة رصف أو رصيف", "طرق", "إدارة الطرق والرصف",
     "تحديد الموقع بدقة\nصور توضح الحالة",
     "يحدده الحي حسب الحالة"),

    ("شكوى أو تظلم إداري", "خدمة المواطنين", "مكتب شكاوى المواطنين",
     "صورة بطاقة الرقم القومي\nصورة من الطلب أو القرار محل التظلم",
     "١٥ يوم عمل"),
]


def seed_alexandria_districts():
    """
    Inserts the district list. Existing districts are left untouched, so this
    is safe to re-run after you have already filled in contact details.

    A district already loaded from a website export counts as existing even
    though it is spelled differently — the governorate writes «حي المنتزه ثان»
    and a district's own site writes «حي المنتزه الثانية». Matching on the
    exact string alone created both, leaving one row with the services and
    departments and another with nothing, either of which a citizen could be
    routed to. `_district_key` compares the words that name the place, so
    seeding and importing can run in either order and still produce one row.

    Returns (created_count, skipped_count).
    """
    from site_knowledge.importer import _district_key

    existing_keys = {_district_key(d.name) for d in District.query.all()}

    created = 0
    skipped = 0

    for name, zone in ALEXANDRIA_DISTRICTS:
        if _district_key(name) in existing_keys:
            skipped += 1
            continue

        db.session.add(District(name=name, zone=zone))
        existing_keys.add(_district_key(name))
        created += 1

    db.session.commit()
    return created, skipped


def seed_common_services():
    """
    Inserts the service catalogue as district-independent services
    (district_id = None), meaning "available in every district".

    Existing services are updated with any documents/duration/department that
    are still blank, but never overwritten — so re-running this after you have
    corrected a service from the dashboard is safe.

    Returns (created_count, updated_count).
    """
    created = 0
    updated = 0

    for name, category, department, documents, duration in COMMON_SERVICES:
        existing = CityService.query.filter(
            CityService.name == name,
            CityService.district_id.is_(None),
        ).first()

        if existing:
            changed = False

            # نملأ الفاضي بس — اللي الأدمن كتبه بإيده ما بيتغيّرش
            for field, value in (
                ("category", category),
                ("department", department),
                ("required_documents", documents),
                ("duration", duration),
            ):
                if not getattr(existing, field, None):
                    setattr(existing, field, value)
                    changed = True

            if changed:
                updated += 1
            continue

        db.session.add(
            CityService(
                name=name,
                category=category,
                department=department,
                required_documents=documents,
                duration=duration,
                district_id=None,
                is_bookable=True,
            )
        )
        created += 1

    db.session.commit()
    return created, updated
