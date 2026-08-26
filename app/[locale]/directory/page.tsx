import type { Metadata } from 'next';
import Link from 'next/link';

import { DirectoryBrowser, type FlatListing } from '@/components/directory-browser';
import { Notice, PageHeader, Section } from '@/components/primitives';
import { directoryCategories, listings } from '@/content/directory';
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
    title: ui.directoryTitle[locale],
    description:
      locale === 'ar'
        ? 'دليل المحال والخدمات في حي المنتزه الثانية بالإسكندرية: مطاعم ومقاهٍ، متاجر، إقامة، صحة، خدمات وحرف.'
        : 'A directory of shops and services in El Montazah II, Alexandria: food, retail, places to stay, health, services and crafts.',
    alternates: altLinks(`/directory`, locale),
  };
}

export default async function DirectoryPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;

  const flat: FlatListing[] = listings.map((listing) => ({
    id: listing.id,
    name: listing.name[locale],
    category: listing.category,
    categoryLabel:
      directoryCategories.find((c) => c.id === listing.category)?.label[locale] ?? '',
    section: listing.section[locale],
    street: listing.street[locale],
    blurb: listing.blurb[locale],
    verified: listing.verified,
    accessible: Boolean(listing.accessible),
  }));

  const sections = [...new Set(flat.map((l) => l.section))].sort();

  return (
    <>
      <PageHeader
        eyebrow={locale === 'ar' ? 'الأعمال المحلية' : 'Local business'}
        title={ui.directoryTitle[locale]}
        lead={ui.directoryIntro[locale]}
      />

      <Section>
        <div className="mb-8">
          <Notice tone="warn">
            {locale === 'ar'
              ? 'القوائم المعروضة نماذج تجريبية لبناء الدليل واختباره، وليست أنشطة حقيقية. بيانات الاتصال تُنشر فقط بعد تحقق الحي من الترخيص وموافقة صاحب النشاط.'
              : 'The listings shown are samples used to build and test the directory, not real businesses. Contact details are published only after the district verifies the licence and the owner confirms them.'}
          </Notice>
        </div>

        <DirectoryBrowser
          locale={locale}
          listings={flat}
          categories={directoryCategories.map((c) => ({ id: c.id, label: c.label[locale] }))}
          sections={sections}
        />

        <div className="card mt-10 flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-[family-name:--font-display] text-lg font-bold">
              {ui.addListing[locale]}
            </h2>
            <p className="mt-1 text-sm text-fg-muted">
              {locale === 'ar'
                ? 'إذا كان نشاطك مرخّصًا داخل نطاق الحي، أرسل بياناتك لإضافتها بعد التحقق.'
                : 'If your business is licensed within the district, send us your details and we will add it after verification.'}
            </p>
          </div>
          <Link
            href={`${link('/contact', locale)}?subject=listing`}
            className="shrink-0 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-brand-fg hover:opacity-90"
          >
            {ui.contactTitle[locale]}
          </Link>
        </div>
      </Section>
    </>
  );
}
