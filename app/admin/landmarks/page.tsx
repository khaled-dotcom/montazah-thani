import Link from 'next/link';

import { landmarkCategories } from '@/content/landmarks';
import { getLandmarkById, joinParagraphs, listPublishedLandmarks } from '@/lib/cms';
import { removeLandmark, saveLandmark } from '../actions';
import { AdminHeading, AdminNav, Banner, BilingualRow, Field, inputClass } from '../ui';

export const dynamic = 'force-dynamic';

/* The line drawing shown until a photograph exists for the landmark. Only the
   subjects that make sense for a place are offered. */
const motifChoices: { id: string; label: string }[] = [
  { id: 'column', label: 'عمود أثري' },
  { id: 'theatre', label: 'مسرح / مدرَّج' },
  { id: 'catacomb', label: 'مقابر منحوتة' },
  { id: 'museum', label: 'متحف' },
  { id: 'library', label: 'مكتبة' },
  { id: 'book', label: 'بيت أديب' },
  { id: 'stage', label: 'مسرح عروض' },
  { id: 'synagogue', label: 'دار عبادة' },
  { id: 'square', label: 'ميدان' },
  { id: 'street', label: 'شارع' },
  { id: 'market', label: 'سوق' },
  { id: 'garden', label: 'حديقة' },
  { id: 'tram', label: 'ترام' },
  { id: 'train', label: 'محطة قطار' },
  { id: 'sea', label: 'بحر / كورنيش' },
  { id: 'palette', label: 'فنون' },
];

export default async function AdminLandmarksPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; error?: string; saved?: string; deleted?: string }>;
}) {
  const { edit, error, saved, deleted } = await searchParams;

  const [editing, items] = await Promise.all([
    edit ? getLandmarkById(Number(edit)) : Promise.resolve(undefined),
    listPublishedLandmarks(true),
  ]);
  const errors = error ? error.split(',') : [];

  return (
    <>
      <AdminNav current="landmarks" />
      <div className="page-width py-8">
        <AdminHeading
          title="المعالم"
          lead="المعلم المنشور هنا يظهر في دليل المعالم وفي المعرض وعلى الخريطة."
        />

        {saved && <Banner tone="ok">تم الحفظ والنشر: {saved}</Banner>}
        {deleted && <Banner tone="ok">تم حذف المعلم.</Banner>}
        {errors.includes('slug') && (
          <Banner tone="error">المعرّف (slug) مستخدم بالفعل — قد يكون لمعلم موجود في ملفات المحتوى.</Banner>
        )}
        {(errors.includes('lat') || errors.includes('lng')) && (
          <Banner tone="error">
            الإحداثيات خارج نطاق الإسكندرية. خط العرض بين 30.9 و31.4، وخط الطول بين 29.5 و30.3.
          </Banner>
        )}
        {errors.length > 0 && !errors.includes('slug') && (
          <Banner tone="error">راجع الحقول المُعلَّمة بالأحمر.</Banner>
        )}

        <div className="grid gap-10 lg:grid-cols-[1fr_20rem]">
          <form action={saveLandmark} className="card space-y-5 p-6">
            <h2 className="font-[family-name:--font-display] text-lg font-bold">
              {editing ? `تعديل: ${editing.name.ar}` : 'معلم جديد'}
            </h2>
            {editing && <input type="hidden" name="id" value={editing.id} />}

            <BilingualRow
              base="name"
              labelAr="الاسم (عربي)"
              labelEn="Name (English)"
              errors={errors}
              valueAr={editing?.name.ar}
              valueEn={editing?.name.en}
            />

            <div className="grid gap-4 md:grid-cols-3">
              <Field name="category" label="التصنيف" invalid={errors.includes('category')}>
                <select
                  id="category"
                  name="category"
                  defaultValue={editing?.category ?? 'urban'}
                  className={inputClass}
                >
                  {landmarkCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label.ar}
                    </option>
                  ))}
                </select>
              </Field>
              <Field
                name="motif"
                label="الرسم الخطي"
                hint="يظهر بدل الصورة"
                invalid={errors.includes('motif')}
              >
                <select
                  id="motif"
                  name="motif"
                  defaultValue={editing?.motif ?? 'square'}
                  className={inputClass}
                >
                  {motifChoices.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field
                name="slug"
                label="المعرّف في الرابط"
                hint="يُشتق من الاسم الإنجليزي"
                invalid={errors.includes('slug')}
              >
                <input
                  id="slug"
                  name="slug"
                  dir="ltr"
                  defaultValue={editing?.slug}
                  placeholder="auto"
                  className={inputClass}
                />
              </Field>
            </div>

            <BilingualRow
              base="section"
              labelAr="المنطقة (عربي)"
              labelEn="Area (English)"
              errors={errors}
              valueAr={editing?.section.ar}
              valueEn={editing?.section.en}
              hint="مثل: العطارين، المنشية"
            />

            <div className="grid gap-4 md:grid-cols-2">
              <Field
                name="lat"
                label="خط العرض"
                hint="اختياري — من خرائط الحي"
                invalid={errors.includes('lat')}
              >
                <input
                  id="lat"
                  name="lat"
                  dir="ltr"
                  inputMode="decimal"
                  defaultValue={editing?.coords.lat || ''}
                  placeholder="31.1975"
                  className={`tnum ${inputClass}`}
                />
              </Field>
              <Field name="lng" label="خط الطول" invalid={errors.includes('lng')}>
                <input
                  id="lng"
                  name="lng"
                  dir="ltr"
                  inputMode="decimal"
                  defaultValue={editing?.coords.lng || ''}
                  placeholder="29.9097"
                  className={`tnum ${inputClass}`}
                />
              </Field>
            </div>

            <BilingualRow
              base="summary"
              labelAr="وصف مختصر (عربي)"
              labelEn="Short summary (English)"
              errors={errors}
              rows={2}
              valueAr={editing?.summary.ar}
              valueEn={editing?.summary.en}
            />

            <BilingualRow
              base="body"
              labelAr="النص الكامل (عربي)"
              labelEn="Full text (English)"
              errors={errors}
              rows={8}
              valueAr={editing ? joinParagraphs(editing.body.ar) : ''}
              valueEn={editing ? joinParagraphs(editing.body.en) : ''}
              hint="افصل بين الفقرات بسطر فارغ"
            />

            <label className="flex items-center gap-2.5 text-sm font-medium">
              <input
                type="checkbox"
                name="published"
                defaultChecked={editing ? editing.published : true}
                className="size-4 accent-[var(--color-brand)]"
              />
              منشور على الموقع
            </label>

            <div className="flex flex-wrap gap-3 border-t border-line pt-4">
              <button
                type="submit"
                className="rounded-lg bg-brand px-6 py-2.5 text-sm font-semibold text-brand-fg hover:opacity-90"
              >
                {editing ? 'حفظ التعديلات' : 'نشر المعلم'}
              </button>
              {editing && (
                <Link
                  href="/admin/landmarks"
                  className="rounded-lg border border-line-strong px-4 py-2.5 text-sm font-medium"
                >
                  إلغاء
                </Link>
              )}
            </div>
          </form>

          <aside>
            <h2 className="font-[family-name:--font-display] font-bold">
              المنشور من اللوحة{' '}
              <span className="tnum text-fg-muted">({items.length.toLocaleString('ar-EG')})</span>
            </h2>

            {items.length === 0 ? (
              <p className="mt-3 rounded-lg border border-line bg-surface-2 px-4 py-6 text-center text-sm text-fg-muted">
                لم يُنشر معلم من اللوحة بعد.
              </p>
            ) : (
              <ul className="mt-3 space-y-3">
                {items.map((item) => (
                  <li key={item.id} className="card p-4">
                    <p className="text-sm font-bold">{item.name.ar}</p>
                    <p className="mt-0.5 text-xs text-fg-muted">
                      {item.section.ar}
                      {!item.published && ' — مسودة'}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Link
                        href={`/admin/landmarks?edit=${item.id}`}
                        className="rounded-md border border-line-strong px-2.5 py-1 text-xs font-medium hover:bg-surface-2"
                      >
                        تعديل
                      </Link>
                      <Link
                        href={`/ar/landmarks/${item.slug}`}
                        target="_blank"
                        className="rounded-md border border-line-strong px-2.5 py-1 text-xs font-medium hover:bg-surface-2"
                      >
                        معاينة ↗
                      </Link>
                      <form action={removeLandmark}>
                        <input type="hidden" name="id" value={item.id} />
                        <button
                          type="submit"
                          className="rounded-md border border-terracotta-400 px-2.5 py-1 text-xs font-medium text-terracotta-600 hover:bg-terracotta-400/15"
                        >
                          حذف
                        </button>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <p className="mt-6 text-xs text-fg-muted">
              المعالم الستة عشر الأصلية محرَّرة في ملفات المحتوى مع مواعيد الزيارة والتذاكر، ولا
              تظهر هنا. المعلم المنشور من اللوحة يعرض الاسم والوصف والنص فقط.
            </p>
          </aside>
        </div>
      </div>
    </>
  );
}
