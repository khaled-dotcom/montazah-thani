import type { Metadata } from 'next';
import Link from 'next/link';

import { MotifChip } from '@/components/motif';
import { Notice, PageHeader, Section } from '@/components/primitives';
import { audiences, services, type Audience } from '@/content/services';
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
    title: ui.servicesTitle[locale],
    description:
      locale === 'ar'
        ? 'خدمات حي منتزه ثاني بالإسكندرية: تراخيص البناء والمحال، الإشغالات، النظافة، الإنارة، الإبلاغ عن المشكلات، ودعم المشروعات.'
        : 'El Montazah II district services: building and shop licences, occupancy, waste, lighting, issue reporting and enterprise support.',
    alternates: altLinks(`/services`, locale),
  };
}

export default async function ServicesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ for?: string }>;
}) {
  const { locale } = await params;
  const { for: audienceParam } = await searchParams;
  const active = audiences.find((a) => a.id === audienceParam)?.id;

  const groups: { id: Audience; label: string; blurb: string }[] = audiences
    .filter((a) => !active || a.id === active)
    .map((a) => ({ id: a.id, label: a.label[locale], blurb: a.blurb[locale] }));

  return (
    <>
      <PageHeader
        eyebrow={locale === 'ar' ? 'المعاملات' : 'Transactions'}
        title={ui.servicesTitle[locale]}
        lead={
          locale === 'ar'
            ? 'كل خدمة هنا تعرض من يمكنه التقديم، والمستندات المطلوبة، وخطوات التقديم، والرسوم والمدة — قبل أن تتحرك من مكانك.'
            : 'Every service here lists who can apply, the documents needed, the steps, the fee and the timescale — before you set out.'
        }
      />

      <div className="page-width pt-8">
        <Notice tone="warn">{ui.serviceDisclaimer[locale]}</Notice>
      </div>

      <Section>
        <nav aria-label={ui.filterBy[locale]} className="mb-10">
          <ul className="flex flex-wrap gap-2">
            <li>
              <Link
                href={link('/services', locale)}
                aria-current={!active ? 'true' : undefined}
                className={`inline-block rounded-full border px-4 py-1.5 text-sm font-medium ${
                  !active ? 'border-brand bg-brand text-brand-fg' : 'border-line-strong hover:bg-surface-2'
                }`}
              >
                {ui.all[locale]}
              </Link>
            </li>
            {audiences.map((audience) => (
              <li key={audience.id}>
                <Link
                  href={`${link('/services', locale)}?for=${audience.id}`}
                  aria-current={active === audience.id ? 'true' : undefined}
                  className={`inline-block rounded-full border px-4 py-1.5 text-sm font-medium ${
                    active === audience.id
                      ? 'border-brand bg-brand text-brand-fg'
                      : 'border-line-strong hover:bg-surface-2'
                  }`}
                >
                  {audience.label[locale]}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="space-y-14">
          {groups.map((group) => {
            const items = services.filter((s) => s.audience === group.id);
            return (
              <section key={group.id} aria-labelledby={`group-${group.id}`}>
                <h2
                  id={`group-${group.id}`}
                  className="rule-accent text-2xl font-extrabold"
                >
                  {group.label}
                </h2>
                <p className="mt-1 text-fg-muted">{group.blurb}</p>
                <ul className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {items.map((service) => (
                    <li key={service.slug}>
                      <Link
                        href={link(`/services/${service.slug}`, locale)}
                        className="card flex h-full gap-4 p-5 transition-shadow hover:shadow-lg"
                      >
                        <MotifChip name={service.motif} />
                        <span>
                          <span className="block font-[family-name:--font-display] font-bold">
                            {service.title[locale]}
                          </span>
                          <span className="mt-1.5 block text-sm text-fg-muted">
                            {service.summary[locale]}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      </Section>
    </>
  );
}
