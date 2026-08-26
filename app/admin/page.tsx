import Link from 'next/link';

import { getOffice, getTopic } from '@/content/appointments';
import { listPublishedLandmarks, listPublishedNews } from '@/lib/cms';
import { countsForDate, listBookings, unreadMessageCount } from '@/lib/db';
import { formatDate } from '@/lib/i18n';
import { formatSlotDate, formatSlotTime, openDates, today } from '@/lib/slots';
import { AdminNav } from './ui';

export const dynamic = 'force-dynamic';

const n = (value: number) => value.toLocaleString('ar-EG');

/**
 * What a clerk opens in the morning.
 *
 * Today's counter list first, because that is the thing with a queue attached
 * to it, then the two publishing shortcuts. Tomorrow is shown alongside so a
 * quiet morning is not mistaken for a quiet week.
 */
export default async function AdminHomePage() {
  const date = today();
  const upcoming = openDates()[0];

  /* Six independent reads. Issued together rather than in sequence: against a
     network database, awaiting them one after another makes the dashboard as
     slow as the sum of them. */
  const [counts, todayBookings, tomorrowBookings, unread, news, landmarks] = await Promise.all([
    countsForDate(date),
    listBookings({ date }),
    upcoming ? listBookings({ date: upcoming }) : Promise.resolve([]),
    unreadMessageCount(),
    listPublishedNews(true),
    listPublishedLandmarks(true),
  ]);

  const tomorrowCount = tomorrowBookings.length;
  const recentNews = news.slice(0, 4);
  const recentLandmarks = landmarks.slice(0, 4);

  const tiles = [
    { label: 'حجوزات اليوم', value: counts.booked, tone: 'bg-sea-100 text-sea-700' },
    { label: 'حضروا', value: counts.attended, tone: 'bg-verdigris-400/25 text-verdigris-600' },
    { label: 'لم يحضروا', value: counts.no_show, tone: 'bg-terracotta-400/25 text-terracotta-600' },
    { label: 'ملغاة', value: counts.cancelled, tone: 'bg-surface-2 text-fg-muted' },
  ];

  return (
    <>
      <AdminNav current="home" />
      <div className="page-width py-8">
        <h1 className="font-[family-name:--font-display] text-2xl font-extrabold">
          صباح الخير — {formatSlotDate(date, 'ar')}
        </h1>

        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {tiles.map((tile) => (
            <li key={tile.label} className={`rounded-xl px-5 py-4 ${tile.tone}`}>
              <p className="text-sm font-medium opacity-80">{tile.label}</p>
              <p className="tnum mt-1 font-[family-name:--font-display] text-3xl font-extrabold">
                {n(tile.value)}
              </p>
            </li>
          ))}
        </ul>

        <div className="mt-10 grid gap-10 lg:grid-cols-[1.5fr_1fr]">
          {/* --------------------------------------------------- today's list */}
          <section>
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <h2 className="rule-accent text-xl font-extrabold">مواعيد اليوم</h2>
              <Link
                href="/admin/appointments"
                className="text-sm font-semibold text-brand hover:underline"
              >
                كل الحجوزات ←
              </Link>
            </div>

            {todayBookings.length === 0 ? (
              <p className="rounded-lg border border-line bg-surface-2 px-4 py-8 text-center text-sm text-fg-muted">
                لا حجوزات اليوم.
                {upcoming && tomorrowCount > 0 && (
                  <>
                    {' '}
                    أقرب يوم فيه حجوزات: {formatSlotDate(upcoming, 'ar')} —{' '}
                    <span className="tnum">{n(tomorrowCount)}</span>.
                  </>
                )}
              </p>
            ) : (
              <ul className="space-y-2">
                {todayBookings.map((booking) => (
                  <li
                    key={booking.reference}
                    className="card flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-sm"
                  >
                    <span className="tnum w-16 font-bold">
                      {formatSlotTime(booking.time, 'ar')}
                    </span>
                    <span className="font-medium">{booking.name}</span>
                    <span className="text-fg-muted">
                      {getTopic(booking.topic)?.label.ar ?? booking.topic}
                    </span>
                    <span className="text-xs text-fg-muted">
                      {getOffice(booking.office)?.name.ar}
                    </span>
                    <a
                      href={`tel:${booking.phone}`}
                      className="tnum ms-auto text-xs text-brand hover:underline"
                    >
                      {booking.phone}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* ------------------------------------------------------ publishing */}
          <section>
            <h2 className="rule-accent mb-4 text-xl font-extrabold">النشر اليومي</h2>

            <div className="grid gap-3">
              <Link
                href="/admin/messages"
                className="card flex items-center justify-between p-4 transition-shadow hover:shadow-lg"
              >
                <span>
                  <span className="block font-bold">الرسائل والبلاغات</span>
                  <span className="block text-xs text-fg-muted">
                    {unread > 0 ? `${n(unread)} رسالة لم تُقرأ` : 'لا رسائل جديدة'}
                  </span>
                </span>
                <span
                  aria-hidden="true"
                  className={`rounded-full px-2.5 py-0.5 text-sm font-bold ${
                    unread > 0 ? 'bg-terracotta-400/25 text-terracotta-600' : 'text-fg-muted'
                  }`}
                >
                  {n(unread)}
                </span>
              </Link>

              <Link
                href="/admin/news"
                className="card flex items-center justify-between p-4 transition-shadow hover:shadow-lg"
              >
                <span>
                  <span className="block font-bold">أضف خبرًا</span>
                  <span className="block text-xs text-fg-muted">
                    {recentNews.length > 0
                      ? `آخر خبر: ${formatDate(recentNews[0]!.date, 'ar')}`
                      : 'لم يُنشر خبر من اللوحة بعد'}
                  </span>
                </span>
                <span aria-hidden="true" className="text-2xl text-brand">
                  +
                </span>
              </Link>

              <Link
                href="/admin/landmarks"
                className="card flex items-center justify-between p-4 transition-shadow hover:shadow-lg"
              >
                <span>
                  <span className="block font-bold">أضف معلمًا</span>
                  <span className="block text-xs text-fg-muted">
                    <span className="tnum">{n(recentLandmarks.length)}</span> معلم منشور من اللوحة
                  </span>
                </span>
                <span aria-hidden="true" className="text-2xl text-brand">
                  +
                </span>
              </Link>
            </div>

            {recentNews.length > 0 && (
              <>
                <h3 className="mt-8 text-sm font-bold">آخر ما نُشر</h3>
                <ul className="mt-2 space-y-2">
                  {recentNews.map((item) => (
                    <li key={item.id} className="text-sm">
                      <Link
                        href={`/admin/news?edit=${item.id}`}
                        className="hover:text-brand hover:underline"
                      >
                        {item.title.ar}
                      </Link>
                      <span className="tnum ms-2 text-xs text-fg-muted">
                        {formatDate(item.date, 'ar')}
                        {!item.published && ' — مسودة'}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
