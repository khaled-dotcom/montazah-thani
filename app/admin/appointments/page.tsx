import Link from 'next/link';
import { revalidatePath } from 'next/cache';

import { getOffice, getTopic, offices } from '@/content/appointments';
import { countsForDate, listBookings, setStatus, type BookingStatus } from '@/lib/db';
import { formatSlotDate, formatSlotTime, today } from '@/lib/slots';
import { AdminNav } from '../ui';

export const dynamic = 'force-dynamic';

/* The date beside these comes from Intl in ar-EG, which gives Arabic-Indic
   digits. Raw JS numbers would render Latin, mixing both systems inside one
   sentence, so the counts go through the same locale. References and phone
   numbers stay Latin on purpose — they get read out, dialled and typed. */
const arabicNumber = (n: number) => n.toLocaleString('ar-EG');

const statusLabel: Record<BookingStatus, string> = {
  booked: 'محجوز',
  attended: 'حضر',
  cancelled: 'ملغى',
  no_show: 'لم يحضر',
};

const statusClass: Record<BookingStatus, string> = {
  booked: 'bg-sea-100 text-sea-700',
  attended: 'bg-verdigris-400/25 text-verdigris-600',
  cancelled: 'bg-surface-2 text-fg-muted line-through',
  no_show: 'bg-terracotta-400/25 text-terracotta-600',
};

/**
 * Changing a booking's status.
 *
 * A Server Action rather than an API route: it keeps the mutation next to the
 * only screen that performs it, and the page re-reads from the store afterwards
 * so the clerk always sees the committed state rather than an optimistic guess.
 */
async function updateStatus(formData: FormData) {
  'use server';
  const reference = String(formData.get('reference') ?? '');
  const status = String(formData.get('status') ?? '') as BookingStatus;
  if (!['booked', 'attended', 'cancelled', 'no_show'].includes(status)) return;
  await setStatus(reference, status);
  revalidatePath('/admin/appointments');
}

export default async function AdminAppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; office?: string; q?: string }>;
}) {
  const { date: dateParam, office: officeParam, q } = await searchParams;

  // A search should look across every day; otherwise the clerk sees one date.
  const searching = Boolean(q);
  const date = searching ? undefined : (dateParam ?? today());
  const office = getOffice(officeParam) ? officeParam : undefined;

  const [bookings, counts] = await Promise.all([
    listBookings({ date, office, query: q }),
    countsForDate(date ?? today()),
  ]);

  return (
    <>
      <AdminNav current="appointments" />
      <div className="page-width py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-[family-name:--font-display] text-2xl font-extrabold">
            حجوزات المواعيد
          </h1>
          <p className="mt-1 text-sm text-fg-muted">
            {searching ? (
              <>نتائج البحث عن «{q}»</>
            ) : (
              <>
                {formatSlotDate(date!, 'ar')} — <span className="tnum">{arabicNumber(counts.booked)}</span>{' '}
                محجوز، <span className="tnum">{arabicNumber(counts.attended)}</span> حضر،{' '}
                <span className="tnum">{arabicNumber(counts.no_show)}</span> لم يحضر،{' '}
                <span className="tnum">{arabicNumber(counts.cancelled)}</span> ملغى
              </>
            )}
          </p>
        </div>
      </div>

      {/* Filters are a plain GET form: bookmarkable, and works without JS. */}
      <form method="get" className="mt-6 flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="date" className="block text-xs font-semibold">
            اليوم
          </label>
          <input
            id="date"
            name="date"
            type="date"
            defaultValue={date ?? ''}
            className="tnum mt-1 rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="office" className="block text-xs font-semibold">
            المقر
          </label>
          <select
            id="office"
            name="office"
            defaultValue={office ?? ''}
            className="mt-1 rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm"
          >
            <option value="">كل المقار</option>
            {offices.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name.ar}
              </option>
            ))}
          </select>
        </div>
        <div className="grow sm:grow-0">
          <label htmlFor="q" className="block text-xs font-semibold">
            بحث بالرقم المرجعي أو الاسم أو الموبايل
          </label>
          <input
            id="q"
            name="q"
            defaultValue={q ?? ''}
            placeholder="MW-20260826-00012"
            className="mt-1 w-full rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm sm:w-72"
          />
        </div>
        <button
          type="submit"
          className="rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-brand-fg"
        >
          عرض
        </button>
        <Link
          href="/admin/appointments"
          className="rounded-lg border border-line-strong px-4 py-2 text-sm font-medium"
        >
          اليوم
        </Link>
      </form>

      {bookings.length === 0 ? (
        <p className="mt-10 rounded-lg border border-line bg-surface-2 px-4 py-8 text-center text-sm text-fg-muted">
          لا توجد حجوزات مطابقة.
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[60rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-line-strong text-start">
                <th scope="col" className="py-2.5 pe-3 text-start font-semibold">الموعد</th>
                <th scope="col" className="py-2.5 pe-3 text-start font-semibold">الرقم المرجعي</th>
                <th scope="col" className="py-2.5 pe-3 text-start font-semibold">المواطن</th>
                <th scope="col" className="py-2.5 pe-3 text-start font-semibold">الغرض</th>
                <th scope="col" className="py-2.5 pe-3 text-start font-semibold">المقر</th>
                <th scope="col" className="py-2.5 pe-3 text-start font-semibold">الحالة</th>
                <th scope="col" className="py-2.5 text-start font-semibold">إجراء</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((booking) => (
                <tr key={booking.reference} className="border-b border-line align-top">
                  <td className="tnum py-3 pe-3 whitespace-nowrap">
                    <span className="font-semibold">{formatSlotTime(booking.time, 'ar')}</span>
                    {searching && (
                      <span className="block text-xs text-fg-muted">
                        {formatSlotDate(booking.date, 'ar')}
                      </span>
                    )}
                  </td>
                  <td className="tnum py-3 pe-3 whitespace-nowrap font-mono text-xs">
                    {booking.reference}
                  </td>
                  <td className="py-3 pe-3">
                    <span className="block font-medium">{booking.name}</span>
                    <a href={`tel:${booking.phone}`} className="tnum text-xs text-brand hover:underline">
                      {booking.phone}
                    </a>
                  </td>
                  <td className="py-3 pe-3">
                    {getTopic(booking.topic)?.label.ar ?? booking.topic}
                    {booking.note && (
                      <span className="mt-1 block max-w-[22rem] text-xs text-fg-muted">
                        {booking.note}
                      </span>
                    )}
                  </td>
                  <td className="py-3 pe-3 text-xs">
                    {getOffice(booking.office)?.name.ar ?? booking.office}
                  </td>
                  <td className="py-3 pe-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusClass[booking.status]}`}
                    >
                      {statusLabel[booking.status]}
                    </span>
                  </td>
                  <td className="py-3">
                    <form action={updateStatus} className="flex flex-wrap gap-1.5">
                      <input type="hidden" name="reference" value={booking.reference} />
                      {(['attended', 'no_show', 'cancelled', 'booked'] as BookingStatus[])
                        .filter((s) => s !== booking.status)
                        .map((s) => (
                          <button
                            key={s}
                            type="submit"
                            name="status"
                            value={s}
                            className="rounded-md border border-line-strong px-2 py-1 text-xs font-medium hover:bg-surface-2"
                          >
                            {statusLabel[s]}
                          </button>
                        ))}
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-8 text-xs text-fg-muted">
        إلغاء الحجز يُعيد الموعد للإتاحة على الموقع فورًا. يُعرض حتى{' '}
        <span className="tnum">{arabicNumber(200)}</span> حجز.
      </p>
      </div>
    </>
  );
}
