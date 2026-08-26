'use client';

import { useSearchParams } from 'next/navigation';
import { useState } from 'react';

import { ui } from '@/content/ui';
import type { Locale } from '@/lib/i18n';

type Status =
  | { kind: 'idle' }
  | { kind: 'sending' }
  | { kind: 'sent'; reference: string }
  | { kind: 'error'; fields?: string[] };

const subjects = [
  { id: 'enquiry', key: 'subjectEnquiry' },
  { id: 'report', key: 'subjectReport' },
  { id: 'permit', key: 'subjectPermit' },
  { id: 'listing', key: 'subjectListing' },
  { id: 'other', key: 'subjectOther' },
] as const;

export function ContactForm({ locale }: { locale: Locale }) {
  const searchParams = useSearchParams();
  const preset = searchParams.get('subject');
  const [subject, setSubject] = useState(
    subjects.some((s) => s.id === preset) ? (preset as string) : 'enquiry',
  );
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    setStatus({ kind: 'sending' });

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = (await response.json()) as { reference?: string; fields?: string[] };

      if (!response.ok || !result.reference) {
        setStatus({ kind: 'error', fields: result.fields });
        return;
      }

      setStatus({ kind: 'sent', reference: result.reference });
      form.reset();
    } catch {
      setStatus({ kind: 'error' });
    }
  }

  if (status.kind === 'sent') {
    return (
      <div className="card p-6" role="status">
        <p className="font-semibold">{ui.formSuccess[locale]}</p>
        <p className="tnum mt-4 rounded-lg bg-surface-2 px-4 py-3 text-lg font-bold text-brand">
          {ui.formReference[locale]}: {status.reference}
        </p>
        <p className="mt-3 text-sm text-fg-muted">{ui.contactReferenceNote[locale]}</p>
        <button
          type="button"
          onClick={() => setStatus({ kind: 'idle' })}
          className="mt-5 rounded-lg border border-line-strong px-4 py-2 text-sm font-medium hover:bg-surface-2"
        >
          {locale === 'ar' ? 'إرسال رسالة أخرى' : 'Send another message'}
        </button>
      </div>
    );
  }

  const invalid = status.kind === 'error' ? (status.fields ?? []) : [];
  const fieldClass =
    'w-full rounded-lg border border-line-strong bg-canvas px-3.5 py-2.5 text-sm';

  return (
    <form onSubmit={onSubmit} className="card space-y-5 p-6" noValidate>
      {/* Honeypot — hidden from people, catches naive bots. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="mb-1.5 block text-sm font-semibold">
            {ui.formName[locale]} <span className="text-terracotta-500">*</span>
          </label>
          <input
            id="name"
            name="name"
            required
            maxLength={120}
            autoComplete="name"
            aria-invalid={invalid.includes('name') || undefined}
            className={fieldClass}
          />
        </div>

        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-semibold">
            {ui.formEmail[locale]} <span className="text-terracotta-500">*</span>
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            maxLength={160}
            autoComplete="email"
            aria-invalid={invalid.includes('email') || undefined}
            className={fieldClass}
          />
        </div>

        <div>
          <label htmlFor="phone" className="mb-1.5 block text-sm font-semibold">
            {ui.formPhone[locale]}
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            maxLength={40}
            autoComplete="tel"
            className={fieldClass}
          />
        </div>

        <div>
          <label htmlFor="subject" className="mb-1.5 block text-sm font-semibold">
            {ui.formSubject[locale]} <span className="text-terracotta-500">*</span>
          </label>
          <select
            id="subject"
            name="subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className={fieldClass}
          >
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {ui[s.key][locale]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {subject === 'report' && (
        <div>
          <label htmlFor="location" className="mb-1.5 block text-sm font-semibold">
            {ui.formLocation[locale]}
          </label>
          <input id="location" name="location" maxLength={240} className={fieldClass} />
        </div>
      )}

      <div>
        <label htmlFor="message" className="mb-1.5 block text-sm font-semibold">
          {ui.formMessage[locale]} <span className="text-terracotta-500">*</span>
        </label>
        <textarea
          id="message"
          name="message"
          required
          rows={6}
          maxLength={4000}
          aria-invalid={invalid.includes('message') || undefined}
          aria-describedby="message-hint"
          className={`${fieldClass} resize-y`}
        />
        <p id="message-hint" className="mt-1.5 text-xs text-fg-muted">
          {locale === 'ar'
            ? 'لا ترسل رقمك القومي أو بيانات بنكية عبر هذا النموذج.'
            : 'Do not send your national ID number or bank details through this form.'}
        </p>
      </div>

      {status.kind === 'error' && (
        <p role="alert" className="rounded-lg border border-terracotta-500 bg-terracotta-400/10 px-4 py-3 text-sm text-terracotta-600 dark:text-terracotta-400">
          {ui.formErrorGeneric[locale]}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={status.kind === 'sending'}
          className="rounded-lg bg-brand px-6 py-2.5 font-semibold text-brand-fg hover:opacity-90 disabled:opacity-50"
        >
          {status.kind === 'sending' ? ui.formSending[locale] : ui.formSubmit[locale]}
        </button>
        <p className="text-xs text-fg-muted">
          <span className="text-terracotta-500">*</span> {ui.formRequired[locale]}
        </p>
      </div>
    </form>
  );
}
