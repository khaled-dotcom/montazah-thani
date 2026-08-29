import type { Metadata } from 'next';

import { Photo } from '@/components/photo';
import { PageHeader, Prose, Section } from '@/components/primitives';
import { scenes } from '@/content/photos';
import { intro, pillars, timeline } from '@/content/about';
import { sections, site } from '@/content/site';
import type { Locale } from '@/lib/i18n';
import { altLinks } from '@/lib/metadata';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === 'ar' ? 'عن الحي — التاريخ والهوية' : 'About the district — history and identity',
    description:
      locale === 'ar'
        ? 'تاريخ حي منتزه ثاني بالإسكندرية وهويته: من كانوبوس القديمة ومعركة أبي قير إلى حدائق المنتزه ومصايف المعمورة، ومناطقه الست الرئيسية.'
        : 'The history and identity of El Montazah II, Alexandria: from ancient Canopus and the Battle of the Nile to the Montazah Gardens and the Maamoura shores, and its six principal areas.',
    alternates: altLinks(`/about`, locale),
  };
}

export default async function AboutPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;

  return (
    <>
      <PageHeader
        image={scenes.find((s) => s.id === 'montaza-sea')}
        locale={locale}
        eyebrow={locale === 'ar' ? 'عن الحي' : 'About'}
        title={locale === 'ar' ? 'الشمال الشرقي للإسكندرية' : 'Alexandria’s north-eastern shore'}
        lead={
          locale === 'ar'
            ? 'حي منتزه ثاني ليس ضاحية سكنية فقط، بل شريط كامل من تاريخ المدينة: حدائق ملكية على البحر، وخليج حمل اسم معركة غيّرت مصر، ومصايف تعرفها أجيال الإسكندرية.'
            : 'El Montazah II is more than a residential quarter — it is a whole strip of the city’s story: royal gardens on the sea, a bay that carries the name of a battle that changed Egypt, and bathing shores Alexandria’s families have known for generations.'
        }
      />

      <Section>
        <div className="grid gap-10 lg:grid-cols-[1.5fr_1fr]">
          <Prose paragraphs={intro[locale]} />
          <div className="card overflow-hidden">
            <Photo
              slug="manshia-square"
              motif="square"
              locale={locale}
              ratio="aspect-[4/3]"
              sizes="(min-width: 1024px) 33vw, 100vw"
            />
            <dl className="grid grid-cols-2 gap-4 p-5">
              {site.stats.map((stat) => (
                <div key={stat.label.en}>
                  <dt className="text-xs text-fg-muted">{stat.label[locale]}</dt>
                  <dd className="num mt-0.5 font-[family-name:--font-display] text-xl font-extrabold text-brand">
                    {stat.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </Section>

      <Section
        tone="alt"
        title={locale === 'ar' ? 'الأقسام الإدارية' : 'Administrative sections'}
        lead={
          locale === 'ar'
            ? 'ستة أقسام لكل منها طابعه العمراني واحتياجاته.'
            : 'Six sections, each with its own urban character and needs.'
        }
      >
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sections.map((section) => (
            <li key={section.en} className="card p-5">
              <h3 className="font-[family-name:--font-display] text-lg font-bold">
                {locale === 'ar' ? section.ar : section.en}
              </h3>
              <p className="mt-1 text-xs text-fg-muted">
                {locale === 'ar' ? section.en : section.ar}
              </p>
              <p className="mt-3 text-sm text-fg-muted">{section.note[locale]}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section title={locale === 'ar' ? 'خط الزمن' : 'Timeline'}>
        <ol className="relative space-y-8 border-s-2 border-line ps-6 md:ps-8">
          {timeline.map((entry) => (
            <li key={entry.title.en} className="relative">
              <span
                aria-hidden="true"
                className="absolute -start-[calc(1.5rem+7px)] top-2 size-3 rounded-full border-2 border-canvas bg-accent md:-start-[calc(2rem+7px)]"
              />
              <p className="tnum text-sm font-bold text-accent">{entry.period[locale]}</p>
              <h3 className="mt-1 font-[family-name:--font-display] text-xl font-bold">
                {entry.title[locale]}
              </h3>
              <p className="mt-2 max-w-3xl text-fg-muted">{entry.text[locale]}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section
        tone="alt"
        title={locale === 'ar' ? 'أولويات العمل' : 'Our priorities'}
        lead={
          locale === 'ar'
            ? 'أربعة التزامات تحكم قرارات الحي اليومية.'
            : 'Four commitments that govern the district’s day-to-day decisions.'
        }
      >
        <ul className="grid gap-6 sm:grid-cols-2">
          {pillars.map((pillar, i) => (
            <li key={pillar.title.en} className="card p-6">
              <span className="tnum font-[family-name:--font-display] text-3xl font-extrabold text-line-strong">
                {String(i + 1).padStart(2, '0')}
              </span>
              <h3 className="mt-2 font-[family-name:--font-display] text-lg font-bold">
                {pillar.title[locale]}
              </h3>
              <p className="mt-2 text-sm text-fg-muted">{pillar.text[locale]}</p>
            </li>
          ))}
        </ul>
      </Section>
    </>
  );
}
