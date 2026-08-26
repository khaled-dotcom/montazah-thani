import type { Metadata } from 'next';

import { Notice, PageHeader, Section } from '@/components/primitives';
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
    title: ui.privacyTitle[locale],
    alternates: altLinks(`/privacy`, locale),
  };
}

type Block = { heading: string; paragraphs: string[]; bullets?: string[] };

const content: Record<Locale, Block[]> = {
  ar: [
    {
      heading: 'ما الذي نجمعه',
      paragraphs: [
        'نحاول جمع أقل قدر ممكن من البيانات. لا يتطلب تصفح الموقع تسجيل دخول أو حسابًا، ولا نستخدم حاليًا أي أدوات تتبّع إعلانية.',
      ],
      bullets: [
        'نموذج التواصل والبلاغات: الاسم والبريد الإلكتروني، ورقم الهاتف إن أدخلته، وموضوع الرسالة ونصها، وموقع المشكلة إن كان بلاغًا.',
        'المساعد الذكي: نص الرسائل التي تكتبها في نافذة المحادثة.',
        'سجلات الخادم التقنية: عنوان IP ونوع المتصفح ووقت الطلب، وتُستخدم لتأمين الخدمة ومنع إساءة الاستخدام.',
        'تخزين المتصفح: نحفظ داخل متصفحك فقط موافقتك على تنبيه المساعد، ونص المحادثة الحالية. لا يُرسَل أي منهما إلى خوادمنا للحفظ.',
      ],
    },
    {
      heading: 'المساعد الذكي',
      paragraphs: [
        'عند إرسال سؤال إلى المساعد، تُرسَل رسالتك مع مقتطفات من صفحات هذا الموقع إلى خدمة نماذج لغوية خارجية لتوليد الإجابة. لا تُرسَل معها هويتك ولا بريدك ولا سجل تصفحك.',
        'لهذا السبب تحديدًا: لا تكتب في المحادثة رقمك القومي أو بياناتك البنكية أو أي معلومات شخصية حساسة. المساعد لا يحتاجها ولا يمكنه فتح أو إغلاق طلب نيابةً عنك.',
        'إذا لم تُفعَّل خدمة النموذج اللغوي، يجيب المساعد من محتوى الموقع مباشرةً دون إرسال أي شيء خارج الخادم.',
      ],
    },
    {
      heading: 'لماذا نستخدم هذه البيانات',
      paragraphs: [
        'نستخدم بيانات النماذج للرد على استفساراتك وتحويل بلاغاتك إلى الإدارة المختصة ومتابعتها. ونستخدم السجلات التقنية لحماية الخدمة. لا نبيع بياناتك ولا نشاركها لأغراض تسويقية.',
      ],
    },
    {
      heading: 'مدة الحفظ',
      paragraphs: [
        'تُحفظ البلاغات والاستفسارات للمدة اللازمة لإنهاء الطلب ووفقًا لقواعد حفظ المستندات المعمول بها في الجهة. تُحذف بيانات المحادثة المخزنة في متصفحك بمجرد إغلاق التبويب أو عند اختيارك «محادثة جديدة».',
      ],
    },
    {
      heading: 'حقوقك',
      paragraphs: [
        'يمكنك طلب الاطلاع على بياناتك أو تصحيحها أو حذفها، ما لم يكن الاحتفاظ بها مطلوبًا قانونًا لإتمام إجراء إداري. للتقدم بطلب، استخدم صفحة الاتصال.',
      ],
    },
  ],
  en: [
    {
      heading: 'What we collect',
      paragraphs: [
        'We try to collect as little as possible. Browsing this site needs no login or account, and we currently run no advertising or tracking tools.',
      ],
      bullets: [
        'Contact and reporting form: your name and email, your phone number if you enter one, the subject and text of your message, and the location of the problem if it is a report.',
        'The assistant: the text of the messages you type into the chat panel.',
        'Technical server logs: IP address, browser type and request time, used to secure the service and prevent abuse.',
        'Browser storage: your acknowledgement of the assistant notice and the current conversation are kept in your browser only. Neither is sent to us for storage.',
      ],
    },
    {
      heading: 'The assistant',
      paragraphs: [
        'When you send a question to the assistant, your message and extracts from this site’s pages are sent to an external language-model service to generate the answer. Your identity, email and browsing history are not sent with it.',
        'For that reason: do not type your national ID number, bank details or other sensitive personal information into the chat. The assistant does not need them and cannot open or close a case on your behalf.',
        'If the language-model service is not enabled, the assistant answers from the site’s own content without anything leaving the server.',
      ],
    },
    {
      heading: 'Why we use this data',
      paragraphs: [
        'Form data is used to answer your enquiry and route and follow up your report with the responsible department. Technical logs protect the service. We do not sell your data or share it for marketing.',
      ],
    },
    {
      heading: 'How long we keep it',
      paragraphs: [
        'Reports and enquiries are kept for as long as needed to complete the request, and in line with the organisation’s records-retention rules. Conversation data held in your browser is cleared when you close the tab or choose “new conversation”.',
      ],
    },
    {
      heading: 'Your rights',
      paragraphs: [
        'You can ask to see, correct or delete your data, unless it must be retained by law to complete an administrative process. To make a request, use the contact page.',
      ],
    },
  ],
};

export default async function PrivacyPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;

  return (
    <>
      <PageHeader
        title={ui.privacyTitle[locale]}
        lead={
          locale === 'ar'
            ? 'ما الذي يجمعه هذا الموقع، ولماذا، وكم يبقى، وكيف تتحكم فيه.'
            : 'What this site collects, why, how long it stays, and how you control it.'
        }
      />

      <Section>
        <div className="max-w-3xl space-y-10">
          <Notice tone="warn">
            {locale === 'ar'
              ? 'هذه صياغة أولية تحتاج مراجعة قانونية ومطابقة مع قانون حماية البيانات الشخصية المصري وسياسات المحافظة قبل النشر الرسمي.'
              : 'This is a first draft. It needs legal review and alignment with Egypt’s personal data protection law and the governorate’s own policies before official publication.'}
          </Notice>

          {content[locale].map((block) => (
            <section key={block.heading}>
              <h2 className="rule-accent text-2xl font-extrabold">{block.heading}</h2>
              {block.paragraphs.map((paragraph) => (
                <p key={paragraph} className="mt-4 text-fg-muted">
                  {paragraph}
                </p>
              ))}
              {block.bullets && (
                <ul className="mt-4 space-y-2.5">
                  {block.bullets.map((bullet) => (
                    <li key={bullet} className="flex gap-3 text-sm">
                      <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />
                      <span className="text-fg-muted">{bullet}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}

          <section>
            <h2 className="rule-accent text-2xl font-extrabold">
              {locale === 'ar' ? 'للتواصل بشأن الخصوصية' : 'Privacy contact'}
            </h2>
            <p className="mt-4 text-fg-muted">
              {site.address[locale]} —{' '}
              <a href={`mailto:${site.email}`} className="text-brand hover:underline">
                {site.email}
              </a>
            </p>
          </section>
        </div>
      </Section>
    </>
  );
}
