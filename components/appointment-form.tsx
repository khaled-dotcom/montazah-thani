'use client';

import { useEffect, useMemo, useState } from 'react';

import { MotifChip } from '@/components/motif';
import { Notice } from '@/components/primitives';
import { appointmentTopics, getTopic, offices } from '@/content/appointments';
import { ui } from '@/content/ui';
import { formatSlotDate, formatSlotTime, openDates, slotsForDate } from '@/lib/slots';
import type { Locale } from '@/lib/i18n';

type Status =
  | { kind: 'idle' }
  | { kind: 'sending' }
  | { kind: 'booked'; reference: string }
  | { kind: 'error'; fields?: string[] };

/**
 * Booking runs top to bottom: what for, where, which day, which time, who you
 * are. The slot list is derived from the same lib/slots.ts the API route uses,
 * so what the form offers and what the server accepts cannot drift apart.
 *
 * Dates are computed once per mount. A tab left open past midnight could offer
 * a stale first day — the server would reject it, which is the right outcome,
 * and the error tells the visitor to pick again.
 */
export function AppointmentForm({ locale }: { locale: Locale }) {
  const dates = useMemo(() => openDates(), []);

  const [topic, setTopic] = useState(appointmentTopics[0]!.id);
  const [office, setOffice] = useState(offices[0]!.id);
  const [date, setDate] = useState(dates[0] ?? '');
  const [pickedTime, setTime] = useState('');
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  const slots = useMemo(() => (date ? slotsForDate(date) : []), [date]);
  const chosenTopic = getTopic(topic);
  const invalid = (field: string) => status.kind === 'error' && status.fields?.includes(field);

  /* Which of those slots are already spoken for. Empty until the answer lands,
     so the list renders immediately rather than flashing a spinner; a slot that
     fills in the meantime is caught on submit by the 409 below. */
  const [taken, setTaken] = useState<Set<string>>(new Set());
  const [loadingSlots, setLoadingSlots] = useState(false);

  useEffect(() => {
    if (!date || !office) return;
    const controller = new AbortController();
    // Synchronising React with a network request is what effects are for; the
    // lint rule cannot tell this apart from a render-triggered cascade.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoadingSlots(true);
    fetch(`/api/appointments/slots?office=${office}&date=${date}`, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('slots'))))
      .then((data: { slots: { time: string; taken: boolean }[] }) => {
        setTaken(new Set(data.slots.filter((s) => s.taken).map((s) => s.time)));
      })
      .catch(() => {
        // Offering every slot is the safe failure: the write still arbitrates.
        setTaken(new Set());
      })
      .finally(() => setLoadingSlots(false));
    return () => controller.abort();
  }, [office, date]);

  /* A slot the visitor picked can be taken by someone else while the form is
     open. Derived rather than corrected in an effect, so there is never a
     render where a struck-through slot still looks selected. */
  const time = pickedTime && taken.has(pickedTime) ? '' : pickedTime;

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!time) {
      setStatus({ kind: 'error', fields: ['slot'] });
      return;
    }
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    setStatus({ kind: 'sending' });

    try {
      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, topic, office, date, time }),
      });
      const result = (await response.json()) as {
        reference?: string;
        error?: string;
        fields?: string[];
      };

      // Someone took the slot between the page loading and this submit.
      if (response.status === 409) {
        setTaken((prev) => new Set(prev).add(time));
        setTime('');
        setStatus({ kind: 'error', fields: ['taken'] });
        return;
      }

      if (!response.ok || !result.reference) {
        setStatus({ kind: 'error', fields: result.fields });
        return;
      }
      setStatus({ kind: 'booked', reference: result.reference });
      form.reset();
    } catch {
      setStatus({ kind: 'error' });
    }
  }

  if (status.kind === 'booked') {
    return (
      <div className="card p-6" role="status">
        <p className="font-semibold">{ui.bookingSuccess[locale]}</p>
        <dl className="mt-4 grid gap-2 rounded-lg bg-surface-2 p-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-fg-muted">{ui.bookingTopic[locale]}</dt>
            <dd className="font-semibold">{chosenTopic?.label[locale]}</dd>
          </div>
          <div>
            <dt className="text-fg-muted">{ui.bookingOffice[locale]}</dt>
            <dd className="font-semibold">
              {offices.find((o) => o.id === office)?.name[locale]}
            </dd>
          </div>
          <div>
            <dt className="text-fg-muted">{ui.bookingWhen[locale]}</dt>
            <dd className="font-semibold">
              {formatSlotDate(date, locale)} — {formatSlotTime(time, locale)}
            </dd>
          </div>
          <div>
            <dt className="text-fg-muted">{ui.formReference[locale]}</dt>
            <dd className="tnum font-bold text-brand">{status.reference}</dd>
          </div>
        </dl>
        <p className="mt-4 text-sm text-fg-muted">{ui.bookingLookupHint[locale]}</p>
        <button
          type="button"
          onClick={() => {
            setStatus({ kind: 'idle' });
            setTime('');
          }}
          className="mt-5 rounded-lg border border-line-strong px-4 py-2 text-sm font-medium hover:bg-surface-2"
        >
          {ui.bookingAnother[locale]}
        </button>
      </div>
    );
  }

  if (dates.length === 0) {
    return <Notice tone="warn">{ui.bookingNoDates[locale]}</Notice>;
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8" noValidate>
      {/* 1 — what for */}
      <fieldset>
        <legend className="text-lg font-bold">
          <span className="tnum text-accent">1.</span> {ui.bookingStepTopic[locale]}
        </legend>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {appointmentTopics.map((item) => (
            <label
              key={item.id}
              className={`card flex cursor-pointer items-center gap-3 p-4 transition-colors ${
                topic === item.id ? 'border-brand ring-2 ring-brand' : 'hover:bg-surface-2'
              }`}
            >
              <input
                type="radio"
                name="topicChoice"
                value={item.id}
                checked={topic === item.id}
                onChange={() => setTopic(item.id)}
                className="sr-only"
              />
              <MotifChip name={item.motif} className="size-10" iconClassName="size-5" />
              <span>
                <span className="block text-sm font-bold">{item.label[locale]}</span>
                <span className="tnum block text-xs text-fg-muted">
                  {item.minutes} {ui.bookingMinutes[locale]}
                </span>
              </span>
            </label>
          ))}
        </div>
        {chosenTopic && (
          <div className="mt-4 rounded-lg border border-line bg-surface-2 p-4">
            <p className="text-sm font-semibold">{ui.bookingBring[locale]}</p>
            <ul className="mt-2 space-y-1.5">
              {chosenTopic.bring[locale].map((item) => (
                <li key={item} className="flex gap-2.5 text-sm text-fg-muted">
                  <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </fieldset>

      {/* 2 — where */}
      <fieldset>
        <legend className="text-lg font-bold">
          <span className="tnum text-accent">2.</span> {ui.bookingStepOffice[locale]}
        </legend>
        <div className="mt-4 space-y-3">
          {offices.map((item) => (
            <label
              key={item.id}
              className={`card flex cursor-pointer items-start gap-3 p-4 transition-colors ${
                office === item.id ? 'border-brand ring-2 ring-brand' : 'hover:bg-surface-2'
              }`}
            >
              <input
                type="radio"
                name="officeChoice"
                value={item.id}
                checked={office === item.id}
                onChange={() => setOffice(item.id)}
                className="mt-1 accent-[var(--color-brand)]"
              />
              <span>
                <span className="block text-sm font-bold">{item.name[locale]}</span>
                <span className="block text-xs text-fg-muted">{item.where[locale]}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {/* 3 — which day */}
      <fieldset>
        <legend className="text-lg font-bold">
          <span className="tnum text-accent">3.</span> {ui.bookingStepDate[locale]}
        </legend>
        <p className="mt-1 text-sm text-fg-muted">{ui.bookingDateHint[locale]}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {dates.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => {
                setDate(item);
                setTime('');
              }}
              aria-pressed={date === item}
              className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                date === item
                  ? 'border-brand bg-brand text-brand-fg'
                  : 'border-line-strong hover:bg-surface-2'
              }`}
            >
              {formatSlotDate(item, locale)}
            </button>
          ))}
        </div>
      </fieldset>

      {/* 4 — which time */}
      <fieldset>
        <legend className="text-lg font-bold">
          <span className="tnum text-accent">4.</span> {ui.bookingStepTime[locale]}
        </legend>
        <div
          className={`mt-4 flex flex-wrap gap-2 transition-opacity ${loadingSlots ? 'opacity-60' : ''}`}
          aria-busy={loadingSlots}
        >
          {slots.map((item) => {
            const isTaken = taken.has(item);
            return (
              <button
                key={item}
                type="button"
                disabled={isTaken}
                onClick={() => setTime(item)}
                aria-pressed={time === item}
                title={isTaken ? ui.bookingSlotTaken[locale] : undefined}
                className={`tnum rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                  isTaken
                    ? 'cursor-not-allowed border-line bg-surface-2 text-fg-muted line-through opacity-60'
                    : time === item
                      ? 'border-brand bg-brand text-brand-fg'
                      : 'border-line-strong hover:bg-surface-2'
                }`}
              >
                {formatSlotTime(item, locale)}
              </button>
            );
          })}
          {slots.length > 0 && slots.every((s) => taken.has(s)) && (
            <p className="text-sm text-fg-muted">{ui.bookingDayFull[locale]}</p>
          )}
        </div>
        {invalid('slot') && (
          <p className="mt-3 text-sm font-medium text-terracotta-600 dark:text-terracotta-400">
            {ui.bookingPickSlot[locale]}
          </p>
        )}
        {invalid('taken') && (
          <p className="mt-3 text-sm font-medium text-terracotta-600 dark:text-terracotta-400">
            {ui.bookingSlotJustTaken[locale]}
          </p>
        )}
      </fieldset>

      {/* 5 — who */}
      <fieldset>
        <legend className="text-lg font-bold">
          <span className="tnum text-accent">5.</span> {ui.bookingStepYou[locale]}
        </legend>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="booking-name" className="block text-sm font-medium">
              {ui.formName[locale]} <span className="text-terracotta-600">*</span>
            </label>
            <input
              id="booking-name"
              name="name"
              required
              maxLength={120}
              autoComplete="name"
              aria-invalid={invalid('name') || undefined}
              className="mt-1.5 w-full rounded-lg border border-line-strong bg-surface px-3 py-2.5"
            />
            {invalid('name') && (
              <p className="mt-1 text-xs text-terracotta-600 dark:text-terracotta-400">
                {ui.formRequired[locale]}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="booking-phone" className="block text-sm font-medium">
              {ui.bookingPhone[locale]} <span className="text-terracotta-600">*</span>
            </label>
            <input
              id="booking-phone"
              name="phone"
              required
              inputMode="tel"
              autoComplete="tel"
              placeholder="01xxxxxxxxx"
              maxLength={40}
              aria-invalid={invalid('phone') || undefined}
              aria-describedby="booking-phone-hint"
              className="tnum mt-1.5 w-full rounded-lg border border-line-strong bg-surface px-3 py-2.5"
            />
            <p
              id="booking-phone-hint"
              className={`mt-1 text-xs ${invalid('phone') ? 'text-terracotta-600 dark:text-terracotta-400' : 'text-fg-muted'}`}
            >
              {ui.bookingPhoneHint[locale]}
            </p>
          </div>
        </div>
        <div className="mt-4">
          <label htmlFor="booking-note" className="block text-sm font-medium">
            {ui.bookingNote[locale]}{' '}
            <span className="text-fg-muted">({ui.formOptional[locale]})</span>
          </label>
          <textarea
            id="booking-note"
            name="note"
            rows={3}
            maxLength={600}
            className="mt-1.5 w-full rounded-lg border border-line-strong bg-surface px-3 py-2.5"
          />
        </div>
      </fieldset>

      {/* Honeypot — hidden from people, catches naive bots. The zero box and
          overflow-hidden matter: without them the offset child widens the
          document, and in an RTL page that becomes a horizontal scrollbar. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="booking-website">Website</label>
        <input id="booking-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      {status.kind === 'error' && !status.fields && (
        <Notice tone="warn">{ui.formErrorGeneric[locale]}</Notice>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={status.kind === 'sending'}
          className="rounded-lg bg-brand px-6 py-3 font-semibold text-brand-fg transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {status.kind === 'sending' ? ui.formSending[locale] : ui.bookingSubmit[locale]}
        </button>
        {time && (
          <p className="text-sm text-fg-muted">
            {formatSlotDate(date, locale)} — {formatSlotTime(time, locale)}
          </p>
        )}
      </div>
    </form>
  );
}
