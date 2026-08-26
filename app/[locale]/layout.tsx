import type { Metadata, Viewport } from 'next';
import { Cairo, Tajawal } from 'next/font/google';
import { notFound } from 'next/navigation';
import '../globals.css';

import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { ChatWidget } from '@/components/chat-widget';
import { themeScript } from '@/components/theme-toggle';
import { ui } from '@/content/ui';
import { site } from '@/content/site';
import { agentConfigured } from '@/lib/agent';
import { dir, isLocale, locales, type Locale } from '@/lib/i18n';
import { heroScene } from '@/content/photos';
import { altLinks, ogImage } from '@/lib/metadata';

const heading = Cairo({
  subsets: ['arabic', 'latin'],
  weight: ['600', '700', '800'],
  variable: '--font-heading',
  display: 'swap',
});

const body = Tajawal({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '700'],
  variable: '--font-body',
  display: 'swap',
});

/* Not `dynamicParams = false`.
   That is set on the layout, so it governs this whole subtree and a child route
   cannot loosen it — which meant a news item published from the dashboard after
   the build 404'd with NoFallbackError instead of rendering on demand. The
   locale is still strictly checked: the component below calls notFound() for
   anything that is not 'ar' or 'en', which is what the flag was protecting. */
export const dynamicParams = true;

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fbf9f5' },
    { media: '(prefers-color-scheme: dark)', color: '#0b1620' },
  ],
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const l: Locale = isLocale(locale) ? locale : 'ar';
  const base = process.env.NEXT_PUBLIC_SITE_URL;

  return {
    metadataBase: base ? new URL(base) : undefined,
    title: {
      default: `${site.longName[l]}`,
      template: `%s — ${site.name[l]}`,
    },
    description: site.description[l],
    alternates: altLinks('/', l),
    openGraph: {
      type: 'website',
      locale: l === 'ar' ? 'ar_EG' : 'en_GB',
      title: site.longName[l],
      description: site.description[l],
      siteName: site.name[l],
      images: ogImage(heroScene, l),
    },
    twitter: {
      card: 'summary_large_image',
      title: site.longName[l],
      description: site.description[l],
      images: ogImage(heroScene, l),
    },
    robots: { index: true, follow: true },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  return (
    <html
      lang={locale}
      dir={dir(locale)}
      data-theme="light"
      className={`${heading.variable} ${body.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Must run before paint, so it cannot be a component or an effect. */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen antialiased">
        <a href="#main" className="skip-link">
          {ui.skipToContent[locale]}
        </a>
        <div className="flex min-h-screen flex-col">
          <SiteHeader locale={locale} />
          <main id="main" className="flex-1">
            {children}
          </main>
          <SiteFooter locale={locale} />
        </div>
        <ChatWidget locale={locale} serviceMode={agentConfigured()} />
      </body>
    </html>
  );
}
