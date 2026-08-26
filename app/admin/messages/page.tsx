import { revalidatePath } from 'next/cache';
import Link from 'next/link';

import {
  listMessages,
  setMessageStatus,
  unreadMessageCount,
  type MessageStatus,
} from '@/lib/db';
import { AdminHeading, AdminNav, Banner } from '../ui';

export const dynamic = 'force-dynamic';

const n = (value: number) => value.toLocaleString('ar-EG');

const statusLabel: Record<MessageStatus, string> = {
  new: 'جديدة',
  read: 'مقروءة',
  answered: 'تم الرد',
  closed: 'مغلقة',
};

const statusClass: Record<MessageStatus, string> = {
  new: 'bg-sea-100 text-sea-700',
  read: 'bg-surface-2 text-fg-muted',
  answered: 'bg-verdigris-400/25 text-verdigris-600',
  closed: 'bg-surface-2 text-fg-muted line-through',
};

const subjectLabel: Record<string, string> = {
  enquiry: 'استفسار عام',
  report: 'بلاغ عن مشكلة',
  permit: 'متابعة طلب ترخيص',
  listing: 'إضافة نشاط للدليل',
  other: 'موضوع آخر',
};

async function updateStatus(formData: FormData) {
  'use server';
  const reference = String(formData.get('reference') ?? '');
  const status = String(formData.get('status') ?? '') as MessageStatus;
  if (!['new', 'read', 'answered', 'closed'].includes(status)) return;
  await setMessageStatus(reference, status);
  revalidatePath('/admin/messages');
}

/**
 * The contact inbox.
 *
 * Full message bodies are shown inline rather than behind a click: they are
 * short, and a clerk triaging twenty reports should not have to open twenty
 * pages to see which one is a burst water main.
 */
export default async function AdminMessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; done?: string }>;
}) {
  const { status: statusParam, q, done } = await searchParams;

  const status = (['new', 'read', 'answered', 'closed'] as const).find((s) => s === statusParam);
  const [messages, unread] = await Promise.all([
    listMessages({ status, query: q }),
    unreadMessageCount(),
  ]);

  const filters = [
    { id: undefined, label: 'الكل' },
    { id: 'new' as const, label: `جديدة (${n(unread)})` },
    { id: 'read' as const, label: 'مقروءة' },
    { id: 'answered' as const, label: 'تم الرد' },
    { id: 'closed' as const, label: 'مغلقة' },
  ];

  return (
    <>
      <AdminNav current="messages" />
      <div className="page-width py-8">
        <AdminHeading
          title="الرسائل والبلاغات"
          lead="ما يرسله المواطنون من صفحة «اتصل بنا». الرقم المرجعي هو ما يقرأه المواطن عليك في التليفون."
        />

        {done && <Banner tone="ok">تم تحديث حالة الرسالة.</Banner>}

        <form method="get" className="mb-6 flex flex-wrap items-end gap-3">
          <div className="flex flex-wrap gap-2">
            {filters.map((f) => (
              <Link
                key={f.label}
                href={f.id ? `/admin/messages?status=${f.id}` : '/admin/messages'}
                aria-current={status === f.id ? 'true' : undefined}
                className={`rounded-full border px-4 py-1.5 text-sm font-medium ${
                  status === f.id
                    ? 'border-brand bg-brand text-brand-fg'
                    : 'border-line-strong hover:bg-surface-2'
                }`}
              >
                {f.label}
              </Link>
            ))}
          </div>
          <div className="grow sm:grow-0">
            <label htmlFor="q" className="block text-xs font-semibold">
              بحث بالرقم المرجعي أو الاسم أو البريد أو نص الرسالة
            </label>
            <input
              id="q"
              name="q"
              defaultValue={q ?? ''}
              placeholder="WS-20260824-00012"
              className="mt-1 w-full rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm sm:w-80"
            />
          </div>
          <button
            type="submit"
            className="rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-brand-fg"
          >
            بحث
          </button>
        </form>

        {messages.length === 0 ? (
          <p className="rounded-lg border border-line bg-surface-2 px-4 py-10 text-center text-sm text-fg-muted">
            لا توجد رسائل مطابقة.
          </p>
        ) : (
          <ul className="space-y-4">
            {messages.map((message) => (
              <li key={message.reference} className="card p-5">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="tnum font-mono text-xs text-fg-muted">{message.reference}</span>
                  <span className="font-bold">{message.name}</span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusClass[message.status]}`}
                  >
                    {statusLabel[message.status]}
                  </span>
                  <span className="rounded-full bg-surface-2 px-2.5 py-0.5 text-xs text-fg-muted">
                    {subjectLabel[message.subject] ?? message.subject}
                  </span>
                  <time
                    dateTime={message.createdAt}
                    className="tnum ms-auto text-xs text-fg-muted"
                  >
                    {new Date(message.createdAt).toLocaleString('ar-EG', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                      timeZone: 'Africa/Cairo',
                    })}
                  </time>
                </div>

                <p className="mt-3 text-sm whitespace-pre-wrap">{message.body}</p>

                {message.location && (
                  <p className="mt-2 text-xs text-fg-muted">
                    الموقع: <span className="text-fg">{message.location}</span>
                  </p>
                )}

                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line pt-3 text-xs">
                  <a href={`mailto:${message.email}`} className="text-brand hover:underline">
                    {message.email}
                  </a>
                  {message.phone && (
                    <a href={`tel:${message.phone}`} className="tnum text-brand hover:underline">
                      {message.phone}
                    </a>
                  )}
                  <form action={updateStatus} className="ms-auto flex flex-wrap gap-1.5">
                    <input type="hidden" name="reference" value={message.reference} />
                    {(['read', 'answered', 'closed', 'new'] as MessageStatus[])
                      .filter((s) => s !== message.status)
                      .map((s) => (
                        <button
                          key={s}
                          type="submit"
                          name="status"
                          value={s}
                          className="rounded-md border border-line-strong px-2.5 py-1 font-medium hover:bg-surface-2"
                        >
                          {statusLabel[s]}
                        </button>
                      ))}
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-8 text-xs text-fg-muted">
          يُعرض حتى <span className="tnum">{n(200)}</span> رسالة. الرد يتم من بريدك مباشرةً — الموقع
          لا يرسل بريدًا.
        </p>
      </div>
    </>
  );
}
