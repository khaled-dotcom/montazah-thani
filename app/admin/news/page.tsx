import Link from 'next/link';

import { newsCategories } from '@/content/news';
import { getNewsById, joinParagraphs, listPublishedNews } from '@/lib/cms';
import { formatDate } from '@/lib/i18n';
import { today } from '@/lib/slots';
import { removeNews, saveNews } from '../actions';
import { AdminHeading, AdminNav, Banner, BilingualRow, Field, inputClass } from '../ui';

export const dynamic = 'force-dynamic';

export default async function AdminNewsPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; error?: string; saved?: string; deleted?: string }>;
}) {
  const { edit, error, saved, deleted } = await searchParams;

  const [editing, items] = await Promise.all([
    edit ? getNewsById(Number(edit)) : Promise.resolve(undefined),
    listPublishedNews(true),
  ]);
  const errors = error ? error.split(',') : [];

  return (
    <>
      <AdminNav current="news" />
      <div className="page-width py-8">
        <AdminHeading
          title="الأخبار"
          lead="ما يُنشر هنا يظهر على الموقع فورًا، بالعربية والإنجليزية معًا."
        />

        {saved && <Banner tone="ok">تم الحفظ والنشر: {saved}</Banner>}
        {deleted && <Banner tone="ok">تم حذف الخبر.</Banner>}
        {errors.includes('slug') && (
          <Banner tone="error">المعرّف (slug) مستخدم بالفعل. اختر عنوانًا إنجليزيًا مختلفًا أو حدّد معرّفًا يدويًا.</Banner>
        )}
        {errors.length > 0 && !errors.includes('slug') && (
          <Banner tone="error">راجع الحقول المُعلَّمة بالأحمر.</Banner>
        )}

        <div className="grid gap-10 lg:grid-cols-[1fr_20rem]">
          {/* ---------------------------------------------------------- form */}
          <form action={saveNews} className="card space-y-5 p-6">
            <h2 className="font-[family-name:--font-display] text-lg font-bold">
              {editing ? `تعديل: ${editing.title?.ar ?? ''}` : 'خبر جديد'}
            </h2>
            {editing && <input type="hidden" name="id" value={editing.id} />}

            <BilingualRow
              base="title"
              labelAr="العنوان (عربي)"
              labelEn="Title (English)"
              errors={errors}
              valueAr={editing?.title?.ar}
              valueEn={editing?.title?.en}
            />

            <div className="grid gap-4 md:grid-cols-3">
              <Field name="date" label="التاريخ" invalid={errors.includes('date')}>
                <input
                  id="date"
                  name="date"
                  type="date"
                  defaultValue={editing?.date ?? today()}
                  className={`tnum ${inputClass}`}
                />
              </Field>
              <Field name="category" label="التصنيف" invalid={errors.includes('category')}>
                <select
                  id="category"
                  name="category"
                  defaultValue={editing?.category ?? 'announcement'}
                  className={inputClass}
                >
                  {newsCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label.ar}
                    </option>
                  ))}
                </select>
              </Field>
              <Field
                name="slug"
                label="المعرّف في الرابط"
                hint="يُشتق من العنوان الإنجليزي إن تُرك فارغًا"
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
              base="summary"
              labelAr="ملخص قصير (عربي)"
              labelEn="Short summary (English)"
              errors={errors}
              rows={2}
              valueAr={editing?.summary?.ar}
              valueEn={editing?.summary?.en}
              hint="سطر أو سطران — يظهر في القوائم"
            />

            <BilingualRow
              base="body"
              labelAr="نص الخبر (عربي)"
              labelEn="Body (English)"
              errors={errors}
              rows={9}
              valueAr={editing?.body?.ar ? joinParagraphs(editing.body.ar) : ''}
              valueEn={editing?.body?.en ? joinParagraphs(editing.body.en) : ''}
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
                {editing ? 'حفظ التعديلات' : 'نشر الخبر'}
              </button>
              {editing && (
                <Link
                  href="/admin/news"
                  className="rounded-lg border border-line-strong px-4 py-2.5 text-sm font-medium"
                >
                  إلغاء
                </Link>
              )}
            </div>
          </form>

          {/* ---------------------------------------------------------- list */}
          <aside>
            <h2 className="font-[family-name:--font-display] font-bold">
              المنشور من اللوحة{' '}
              <span className="tnum text-fg-muted">({items.length.toLocaleString('ar-EG')})</span>
            </h2>

            {items.length === 0 ? (
              <p className="mt-3 rounded-lg border border-line bg-surface-2 px-4 py-6 text-center text-sm text-fg-muted">
                لم يُنشر خبر من اللوحة بعد.
              </p>
            ) : (
              <ul className="mt-3 space-y-3">
                {items.map((item) => (
                  <li key={item.id} className="card p-4">
                    <p className="text-sm font-bold">{item.title.ar}</p>
                    <p className="tnum mt-0.5 text-xs text-fg-muted">
                      {formatDate(item.date, 'ar')}
                      {!item.published && ' — مسودة'}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Link
                        href={`/admin/news?edit=${item.id}`}
                        className="rounded-md border border-line-strong px-2.5 py-1 text-xs font-medium hover:bg-surface-2"
                      >
                        تعديل
                      </Link>
                      <Link
                        href={`/ar/news/${item.slug}`}
                        target="_blank"
                        className="rounded-md border border-line-strong px-2.5 py-1 text-xs font-medium hover:bg-surface-2"
                      >
                        معاينة ↗
                      </Link>
                      <form action={removeNews}>
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
              الأخبار المكتوبة في ملفات المحتوى لا تظهر هنا ولا يمكن تعديلها من اللوحة — تُحرَّر مع
              الكود لأنها مراجَعة ومحفوظة في سجل التغييرات.
            </p>
          </aside>
        </div>
      </div>
    </>
  );
}
