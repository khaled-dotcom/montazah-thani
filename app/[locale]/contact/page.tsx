import type { Metadata } from 'next';
import { Suspense } from 'react';

import { ContactForm } from '@/components/contact-form';
import { PageHeader, Section } from '@/components/primitives';
import { faqs } from '@/content/about';
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
    title: ui.contactTitle[locale],
    description:
      locale === 'ar'
        ? 'اتصل بحي منتزه ثاني بالإسكندرية: العنوان ومواعيد العمل وأرقام الطوارئ ونموذج المراسلة والإبلاغ.'
        : 'Contact El Montazah II District, Alexandria: address, working hours, emergency numbers and a message or reporting form.',
    alternates: altLinks(`/contact`, locale),
  };
}

export default async function ContactPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;

  return (
    <>
      <PageHeader
        eyebrow={locale === 'ar' ? 'تواصل' : 'Get in touch'}
        title={ui.contactTitle[locale]}
        lead={
          locale === 'ar'
            ? 'للاستفسارات والبلاغات ومتابعة الطلبات. للحالات العاجلة استخدم أرقام الطوارئ مباشرة.'
            : 'For enquiries, reports and application follow-up. In an emergency, use the emergency numbers directly.'
        }
      />

      <Section>
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <h2 className="rule-accent mb-6 text-2xl font-extrabold">
              {locale === 'ar' ? 'أرسل رسالة' : 'Send a message'}
            </h2>
            <Suspense fallback={null}>
              <ContactForm locale={locale} />
            </Suspense>
          </div>

          <aside className="space-y-4">
            <div className="card p-6">
              <h2 className="font-[family-name:--font-display] text-lg font-bold">
                {site.name[locale]}
              </h2>
              <dl className="mt-4 space-y-4 text-sm">
                <div>
                  <dt className="font-semibold">{ui.address[locale]}</dt>
                  <dd className="mt-0.5 text-fg-muted">{site.address[locale]}</dd>
                </div>
                <div>
                  <dt className="font-semibold">{ui.workingHours[locale]}</dt>
                  <dd className="mt-0.5 text-fg-muted">{site.hours[locale]}</dd>
                </div>
                <div>
                  <dt className="font-semibold">{ui.phone[locale]}</dt>
                  <dd className="tnum mt-0.5">
                    <a
                      href={`tel:${site.phone.replace(/\s/g, '')}`}
                      className="text-brand hover:underline"
                    >
                      {site.phone}
                    </a>
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold">
                    {locale === 'ar' ? 'فاكس' : 'Fax'}
                  </dt>
                  <dd className="tnum mt-0.5 text-fg-muted">{site.fax}</dd>
                </div>
                <div>
                  <dt className="font-semibold">{ui.email[locale]}</dt>
                  <dd className="mt-0.5">
                    <a href={`mailto:${site.email}`} className="text-brand hover:underline">
                      {site.email}
                    </a>
                  </dd>
                </div>
              </dl>
            </div>

            <div className="card p-6">
              <h2 className="font-[family-name:--font-display] text-lg font-bold">
                {ui.emergencyTitle[locale]}
              </h2>
              <ul className="mt-4 divide-y divide-line">
                {site.hotlines.map((hotline) => (
                  <li key={hotline.key} className="flex items-center justify-between gap-3 py-2.5">
                    <span className="text-sm text-fg-muted">{hotline.label[locale]}</span>
                    <a
                      href={`tel:${hotline.number}`}
                      className="tnum text-lg font-extrabold text-brand hover:underline"
                    >
                      {hotline.number}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </Section>

      <Section tone="alt" title={ui.faqTitle[locale]}>
        <div id="faq" className="max-w-3xl scroll-mt-32">
          <ul className="space-y-3">
            {faqs.map((faq) => (
              <li key={faq.q.en}>
                <details className="card group p-0">
                  <summary className="cursor-pointer list-none px-5 py-4 font-semibold marker:content-none">
                    <span className="flex items-start justify-between gap-4">
                      {faq.q[locale]}
                      <svg
                        viewBox="0 0 20 20"
                        aria-hidden="true"
                        className="mt-1 size-4 shrink-0 transition-transform group-open:rotate-180"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M5 8l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  </summary>
                  <p className="border-t border-line px-5 py-4 text-sm text-fg-muted">
                    {faq.a[locale]}
                  </p>
                </details>
              </li>
            ))}
          </ul>
        </div>
      </Section>
    </>
  );
}
