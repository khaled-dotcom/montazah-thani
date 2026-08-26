import type { Metadata } from 'next';
import Link from 'next/link';

import { Notice, PageHeader, Section } from '@/components/primitives';
import { site } from '@/content/site';
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
    title: ui.accessibilityTitle[locale],
    alternates: altLinks(`/accessibility`, locale),
  };
}

const done = {
  ar: [
    'تباين ألوان يستوفي المستوى AA من WCAG 2.1 في الوضعين الفاتح والداكن.',
    'يمكن تشغيل الموقع بالكامل من لوحة المفاتيح، مع مؤشر تركيز واضح لا يُخفى أبدًا.',
    'رابط «تخطَّ إلى المحتوى» في بداية كل صفحة.',
    'بنية عناوين متدرجة ومعالم HTML دلالية (header، nav، main، footer).',
    'دعم كامل للاتجاه من اليمين إلى اليسار، مع انعكاس صحيح للأسهم والمسافات.',
    'احترام تفضيل «تقليل الحركة» في نظام التشغيل.',
    'حقول النماذج لها تسميات مرتبطة، ورسائل الخطأ تُعلَن لقارئات الشاشة.',
    'لا يُستخدم اللون وحده لنقل أي معلومة.',
    'يعمل الموقع بدون جافاسكربت في التصفح والتصفية الأساسية.',
  ],
  en: [
    'Colour contrast meeting WCAG 2.1 level AA in both light and dark themes.',
    'Full keyboard operation, with a visible focus indicator that is never suppressed.',
    'A “skip to content” link at the start of every page.',
    'A proper heading hierarchy and semantic HTML landmarks (header, nav, main, footer).',
    'Complete right-to-left support, with arrows and spacing mirrored correctly.',
    'The operating system’s “reduce motion” preference is respected.',
    'Form fields have associated labels, and error messages are announced to screen readers.',
    'Colour alone is never used to convey information.',
    'Browsing and the main filters work without JavaScript.',
  ],
};

const outstanding = {
  ar: [
    'لم يُجرَ بعد اختبار كامل مع قارئات الشاشة (NVDA وJAWS وVoiceOver) بالعربية.',
    'خريطة OpenStreetMap المضمّنة مكوّن خارجي لا نتحكم في إتاحته بالكامل — يوفَّر جدول بديل بالإحداثيات أسفلها.',
    'لم تُراجَع بعد نصوص المحتوى مع مختصّ لغة ميسّرة.',
    'لا توجد حتى الآن نسخ صوتية أو لغة إشارة للمحتوى التعريفي.',
  ],
  en: [
    'Full screen-reader testing (NVDA, JAWS, VoiceOver) in Arabic has not yet been carried out.',
    'The embedded OpenStreetMap is a third-party component whose accessibility we do not fully control — an alternative coordinates table is provided beneath it.',
    'The content has not yet been reviewed by a plain-language specialist.',
    'Audio versions and sign-language material for the introductory content do not yet exist.',
  ],
};

export default async function AccessibilityPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;

  return (
    <>
      <PageHeader
        title={ui.accessibilityTitle[locale]}
        lead={
          locale === 'ar'
            ? 'نهدف إلى أن يكون هذا الموقع قابلًا للاستخدام من الجميع، بما في ذلك من يستخدمون قارئات الشاشة أو لوحة المفاتيح فقط أو يحتاجون تكبير النص.'
            : 'We aim for this site to be usable by everyone, including people using screen readers, keyboard-only navigation, or text magnification.'
        }
      />

      <Section>
        <div className="max-w-3xl space-y-10">
          <Notice>
            {locale === 'ar'
              ? 'المعيار المستهدف هو WCAG 2.1 المستوى AA. هذا البيان يصف الحالة الفعلية للموقع، بما فيها ما لم يكتمل بعد.'
              : 'The target standard is WCAG 2.1 level AA. This statement describes the site’s actual state, including what is not yet done.'}
          </Notice>

          <section>
            <h2 className="rule-accent text-2xl font-extrabold">
              {locale === 'ar' ? 'ما هو متاح الآن' : 'What is in place'}
            </h2>
            <ul className="mt-4 space-y-2.5">
              {done[locale].map((item) => (
                <li key={item} className="flex gap-3 text-sm">
                  <svg
                    viewBox="0 0 20 20"
                    aria-hidden="true"
                    className="mt-0.5 size-4 shrink-0 text-verdigris-500"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <path d="M4 10.5l4 4 8-9" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="rule-accent text-2xl font-extrabold">
              {locale === 'ar' ? 'قيود معروفة' : 'Known limitations'}
            </h2>
            <ul className="mt-4 space-y-2.5">
              {outstanding[locale].map((item) => (
                <li key={item} className="flex gap-3 text-sm">
                  <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-gold-500" />
                  <span className="text-fg-muted">{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="rule-accent text-2xl font-extrabold">
              {locale === 'ar' ? 'أبلغنا عن عائق' : 'Report a barrier'}
            </h2>
            <p className="mt-4 text-fg-muted">
              {locale === 'ar'
                ? 'إذا واجهت صعوبة في استخدام أي جزء من الموقع، أخبرنا بالصفحة وما حدث وما الذي كنت تحاول فعله. نسعى للرد خلال خمسة أيام عمل.'
                : 'If you have difficulty using any part of this site, tell us the page, what happened and what you were trying to do. We aim to reply within five working days.'}
            </p>
            <p className="mt-4 flex flex-wrap gap-4 text-sm">
              <Link
                href={link('/contact', locale)}
                className="rounded-lg bg-brand px-5 py-2.5 font-semibold text-brand-fg hover:opacity-90"
              >
                {ui.contactTitle[locale]}
              </Link>
              <a
                href={`mailto:${site.email}`}
                className="rounded-lg border border-line-strong px-5 py-2.5 font-semibold hover:bg-surface-2"
              >
                {site.email}
              </a>
            </p>
          </section>
        </div>
      </Section>
    </>
  );
}
