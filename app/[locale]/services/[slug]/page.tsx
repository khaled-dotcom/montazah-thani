import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { DocumentChecklist } from '@/components/document-checklist';
import { LegalBasis } from '@/components/legal-basis';
import { MotifChip } from '@/components/motif';
import { Breadcrumbs, DetailRow, Notice, Section } from '@/components/primitives';
import { audiences, getService, services } from '@/content/services';
import { ui } from '@/content/ui';
import { link, locales, type Locale } from '@/lib/i18n';
import { altLinks } from '@/lib/metadata';

export function generateStaticParams() {
  return locales.flatMap((locale) => services.map((s) => ({ locale, slug: s.slug })));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const service = getService(slug);
  if (!service) return {};
  return {
    title: service.title[locale],
    description: service.summary[locale],
    alternates: altLinks(`/services/${slug}`, locale),
  };
}

export default async function ServicePage({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>;
}) {
  const { locale, slug } = await params;
  const service = getService(slug);
  if (!service) notFound();

  const audience = audiences.find((a) => a.id === service.audience);
  const related = services
    .filter((s) => s.audience === service.audience && s.slug !== service.slug)
    .slice(0, 3);

  return (
    <>
      <Breadcrumbs
        locale={locale}
        trail={[
          { href: link('/services', locale), label: ui.servicesTitle[locale] },
          {
            href: `${link('/services', locale)}?for=${service.audience}`,
            label: audience?.label[locale] ?? '',
          },
          { href: '#', label: service.title[locale] },
        ]}
      />

      <div className="page-width py-8 md:py-10">
        <div className="flex items-start gap-4">
          <MotifChip name={service.motif} className="size-14 rounded-xl" iconClassName="size-8" />
          <div>
            <p className="text-sm font-semibold text-accent uppercase">{audience?.label[locale]}</p>
            <h1 className="mt-1 max-w-3xl text-3xl font-extrabold md:text-4xl">
              {service.title[locale]}
            </h1>
          </div>
        </div>
        <p className="mt-5 max-w-3xl text-lg text-fg-muted">{service.summary[locale]}</p>
      </div>

      <div className="page-width grid gap-12 pb-12 lg:grid-cols-[1.6fr_1fr]">
        <article className="space-y-10">
          <section>
            <h2 className="rule-accent text-xl font-extrabold">{ui.whoCanApply[locale]}</h2>
            <ul className="mt-4 space-y-2.5">
              {service.eligibility[locale].map((item) => (
                <li key={item} className="flex gap-2.5 text-sm">
                  <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <DocumentChecklist
            items={service.documents[locale]}
            locale={locale}
            title={service.title[locale]}
          />

          <section>
            <h2 className="rule-accent text-xl font-extrabold">{ui.howToApply[locale]}</h2>
            <ol className="mt-4 space-y-4">
              {service.steps[locale].map((step, i) => (
                <li key={step} className="flex gap-4">
                  <span className="tnum flex size-8 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-bold text-brand-fg">
                    {i + 1}
                  </span>
                  <span className="pt-1 text-sm">{step}</span>
                </li>
              ))}
            </ol>
          </section>

          <LegalBasis ids={service.legal} locale={locale} />

          {service.external && (
            <section className="card p-5">
              <h2 className="font-bold">{ui.externalPortal[locale]}</h2>
              <a
                href={service.external.href}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block text-sm font-semibold text-brand underline"
              >
                {service.external.label[locale]} ↗
              </a>
            </section>
          )}
        </article>

        <aside className="space-y-4 lg:sticky lg:top-32 lg:self-start">
          <div className="card p-5">
            <dl>
              <DetailRow label={ui.fee[locale]}>{service.fee[locale]}</DetailRow>
              <DetailRow label={ui.duration[locale]}>{service.duration[locale]}</DetailRow>
              <DetailRow label={ui.whereToApply[locale]}>{service.channel[locale]}</DetailRow>
            </dl>
            <Link
              href={link('/contact', locale)}
              className="mt-4 block rounded-lg bg-brand px-4 py-2.5 text-center text-sm font-semibold text-brand-fg hover:opacity-90"
            >
              {ui.contactTitle[locale]}
            </Link>
          </div>
          <Notice tone="warn">{ui.serviceDisclaimer[locale]}</Notice>
        </aside>
      </div>

      {related.length > 0 && (
        <Section tone="alt" title={audience?.label[locale]}>
          <ul className="grid gap-4 sm:grid-cols-3">
            {related.map((item) => (
              <li key={item.slug}>
                <Link
                  href={link(`/services/${item.slug}`, locale)}
                  className="card block h-full p-5 transition-shadow hover:shadow-lg"
                >
                  <h3 className="font-bold">{item.title[locale]}</h3>
                  <p className="mt-2 text-sm text-fg-muted">{item.summary[locale]}</p>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </>
  );
}
