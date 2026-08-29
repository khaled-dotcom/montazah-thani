import type { Metadata } from 'next';
import Link from 'next/link';

import { Notice, PageHeader, Section } from '@/components/primitives';
import { laws } from '@/content/legal';
import { services } from '@/content/services';
import { ui } from '@/content/ui';
import { link, type Locale } from '@/lib/i18n';
import { altLinks } from '@/lib/metadata';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: ui.lawsTitle[locale],
    description:
      locale === 'ar'
        ? 'القوانين واللوائح التي تصدر بموجبها تراخيص وخدمات حي منتزه ثاني بالإسكندرية، وأي خدمة ينظّمها كل قانون.'
        : 'The laws and regulations under which El Montazah II district permits and services are issued, and which service each one governs.',
    alternates: altLinks(`/laws`, locale),
  };
}

export default async function LawsPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const anyUnverified = laws.some((l) => !l.verified);

  return (
    <>
      <PageHeader
        eyebrow={locale === 'ar' ? 'المرجع' : 'Reference'}
        title={ui.lawsTitle[locale]}
        lead={
          locale === 'ar'
            ? 'كل ترخيص أو خدمة يصدر بموجب قانون. هذه قائمة بالقوانين المنظِّمة، وما تغطيه، وأي خدمات الحي تخضع لها.'
            : 'Every permit and service is issued under a law. These are the governing statutes, what each covers, and which district services fall under it.'
        }
      />

      <Section>
        <div className="mb-8 max-w-3xl">
          <Notice tone={anyUnverified ? 'warn' : 'info'}>
            {anyUnverified
              ? ui.legalNoticeUnverified[locale]
              : ui.legalNotice[locale]}
          </Notice>
        </div>

        <ul className="space-y-5">
          {laws.map((law) => {
            const governed = services.filter((s) => s.legal.includes(law.id));
            return (
              <li key={law.id} className="card p-6">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <h2 className="font-[family-name:--font-display] text-lg font-bold">
                    {law.name[locale]}
                  </h2>
                  {law.citation[locale] !== '—' && (
                    <span className="tnum font-semibold text-brand">{law.citation[locale]}</span>
                  )}
                  {law.amended && (
                    <span className="rounded-full bg-surface-2 px-2.5 py-0.5 text-xs text-fg-muted">
                      {ui.legalAmended[locale]}
                    </span>
                  )}
                  {!law.verified && (
                    <span className="rounded-full bg-gold-400/25 px-2.5 py-0.5 text-xs font-semibold text-gold-600 dark:bg-gold-600/25 dark:text-gold-400">
                      {ui.legalUnverified[locale]}
                    </span>
                  )}
                </div>

                <p className="mt-2 max-w-3xl text-sm text-fg-muted">{law.covers[locale]}</p>

                {governed.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs font-semibold text-fg uppercase">
                      {ui.lawsGoverns[locale]}
                    </p>
                    <ul className="mt-2 flex flex-wrap gap-2">
                      {governed.map((service) => (
                        <li key={service.slug}>
                          <Link
                            href={link(`/services/${service.slug}`, locale)}
                            className="inline-block rounded-full border border-line-strong px-3 py-1 text-xs font-medium hover:bg-surface-2"
                          >
                            {service.title[locale]}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {law.href && (
                  <a
                    href={law.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-block text-sm font-semibold text-brand underline"
                  >
                    {ui.legalOfficialText[locale]} ↗
                  </a>
                )}
              </li>
            );
          })}
        </ul>

        <div className="mt-12 max-w-3xl">
          <h2 className="rule-accent text-xl font-extrabold">
            {locale === 'ar' ? 'لماذا لا تُذكر أرقام المواد؟' : 'Why no article numbers?'}
          </h2>
          <p className="mt-3 text-sm text-fg-muted">
            {locale === 'ar'
              ? 'التفاصيل التنفيذية — الرسوم، والمهل، والمستندات — تصدر بلوائح وقرارات تُعدَّل أكثر من القانون نفسه. ذكر مادة بعينها هنا قد يصبح غير صحيح دون أن ننتبه، فنكتفي بالقانون الأصلي ونحيلك إلى الشباك للّائحة السارية وقت تقديمك.'
              : 'The operative detail — fees, deadlines, documents — sits in executive regulations and decrees that are amended more often than the parent statute. Citing a specific article here could quietly become wrong, so we name the principal law and send you to the counter for the regulation in force on the day you apply.'}
          </p>
        </div>
      </Section>
    </>
  );
}
