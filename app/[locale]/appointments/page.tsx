import type { Metadata } from 'next';

import { AppointmentForm } from '@/components/appointment-form';
import { DetailRow, Notice, PageHeader, Section } from '@/components/primitives';
import { bookingHours, offices } from '@/content/appointments';
import { site } from '@/content/site';
import { ui } from '@/content/ui';
import type { Locale } from '@/lib/i18n';
import { altLinks } from '@/lib/metadata';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: ui.bookingTitle[locale],
    description:
      locale === 'ar'
        ? 'احجز موعدًا مسبقًا في شبابيك حي منتزه ثاني بالإسكندرية: اختر الغرض والمقر واليوم والوقت.'
        : 'Book a counter appointment at the El Montazah II district offices: choose the purpose, office, day and time.',
    alternates: altLinks(`/appointments`, locale),
  };
}

const rules = {
  ar: [
    'احضر قبل موعدك بعشر دقائق ومعك الرقم المرجعي.',
    'الموعد يخص صاحب الطلب؛ لغيره يلزم توكيل رسمي.',
    'التأخير أكثر من ربع ساعة يُلغي الموعد ويستلزم حجزًا جديدًا.',
    'مواعيد الشبابيك لا تُغني عن استيفاء المستندات — الطلب الناقص لا يُستكمل في نفس الزيارة.',
  ],
  en: [
    'Arrive ten minutes early, with your reference number.',
    'The appointment belongs to the applicant; anyone else needs a formal power of attorney.',
    'Arriving more than fifteen minutes late cancels the slot and needs a new booking.',
    'A counter appointment does not replace complete paperwork — an incomplete file cannot be finished in the same visit.',
  ],
};

export default async function AppointmentsPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;

  return (
    <>
      <PageHeader
        eyebrow={locale === 'ar' ? 'الخدمات' : 'Services'}
        title={ui.bookingTitle[locale]}
        lead={
          locale === 'ar'
            ? 'احجز دورك في الشباك قبل ما تيجي، واعرف المستندات المطلوبة قبل ما تتحرك من مكانك.'
            : 'Take your place at the counter before you set out, and see what to bring before you leave home.'
        }
      />

      <Section>
        <div className="grid gap-12 lg:grid-cols-[1.6fr_1fr]">
          <div>
            <div className="mb-8">
              <Notice>{ui.bookingNotWired[locale]}</Notice>
            </div>
            <AppointmentForm locale={locale} />
          </div>

          <aside className="space-y-4 lg:sticky lg:top-32 lg:self-start">
            <div className="card p-5">
              <h2 className="font-[family-name:--font-display] font-bold">
                {locale === 'ar' ? 'مواعيد الشبابيك' : 'Counter hours'}
              </h2>
              <dl className="mt-3">
                <DetailRow label={locale === 'ar' ? 'أيام العمل' : 'Working days'}>
                  {locale === 'ar' ? 'الأحد إلى الخميس' : 'Sunday to Thursday'}
                </DetailRow>
                <DetailRow label={locale === 'ar' ? 'ساعات الحجز' : 'Bookable hours'}>
                  <span className="tnum">
                    {bookingHours.start} — {bookingHours.end}
                  </span>
                </DetailRow>
                <DetailRow label={locale === 'ar' ? 'الحجز المتاح حتى' : 'Booking horizon'}>
                  <span className="tnum">
                    {bookingHours.horizonDays} {locale === 'ar' ? 'يومًا' : 'days ahead'}
                  </span>
                </DetailRow>
              </dl>
              <p className="mt-4 text-xs text-fg-muted">
                {locale === 'ar'
                  ? 'العطلات الرسمية غير مستثناة تلقائيًا بعد؛ يلزم ربط تقويم إجازات الحي.'
                  : 'Public holidays are not excluded automatically yet; the district holiday calendar still needs wiring in.'}
              </p>
            </div>

            <div className="card p-5">
              <h2 className="font-[family-name:--font-display] font-bold">
                {locale === 'ar' ? 'المقار' : 'Offices'}
              </h2>
              <ul className="mt-3 space-y-3">
                {offices.map((office) => (
                  <li key={office.id} className="border-b border-line pb-3 last:border-0 last:pb-0">
                    <p className="text-sm font-semibold">{office.name[locale]}</p>
                    <p className="text-xs text-fg-muted">{office.where[locale]}</p>
                  </li>
                ))}
              </ul>
            </div>

            <div className="card p-5">
              <h2 className="font-[family-name:--font-display] font-bold">
                {locale === 'ar' ? 'قواعد الموعد' : 'Appointment rules'}
              </h2>
              <ul className="mt-3 space-y-2.5">
                {rules[locale].map((rule) => (
                  <li key={rule} className="flex gap-2.5 text-sm text-fg-muted">
                    <span
                      aria-hidden="true"
                      className="mt-2 size-1.5 shrink-0 rounded-full bg-accent"
                    />
                    <span>{rule}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="card p-5">
              <h2 className="font-[family-name:--font-display] font-bold">
                {locale === 'ar' ? 'تفضّل الاتصال؟' : 'Prefer to call?'}
              </h2>
              <p className="mt-2 text-sm text-fg-muted">{site.address[locale]}</p>
              <p className="tnum mt-2 text-sm">
                <a href={`tel:${site.phone.replace(/\s/g, '')}`} className="font-semibold text-brand hover:underline">
                  {site.phone}
                </a>
              </p>
              <p className="mt-2 text-xs text-fg-muted">{site.hours[locale]}</p>
            </div>
          </aside>
        </div>
      </Section>
    </>
  );
}
