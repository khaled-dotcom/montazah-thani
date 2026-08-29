import type { Metadata } from 'next';
import { Cairo, Tajawal } from 'next/font/google';

import '../globals.css';

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

export const metadata: Metadata = {
  title: 'لوحة الموظفين — حي منتزه ثاني',
  // Belt and braces with the header the proxy sets.
  robots: { index: false, follow: false },
};

/**
 * The staff area deliberately does not use the public layout: no site header,
 * no assistant widget, no language switch. It is a counter tool, Arabic only,
 * and it should not look like the public site — a clerk should never be unsure
 * which one they are typing into.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" data-theme="light" className={`${heading.variable} ${body.variable}`}>
      <body className="min-h-screen antialiased">
        <header className="border-b border-line bg-sea-800 text-sand-100">
          <div className="page-width flex flex-wrap items-center justify-between gap-3 py-3">
            <p className="font-[family-name:--font-display] font-bold">
              حي منتزه ثاني — لوحة الموظفين
            </p>
            <p className="text-xs opacity-80">بيانات المواطنين: للاستخدام الرسمي فقط</p>
          </div>
        </header>
        {/* Each screen renders its own nav strip and page-width wrapper, so the
            layout must not add a second one. */}
        <main>{children}</main>
      </body>
    </html>
  );
}
