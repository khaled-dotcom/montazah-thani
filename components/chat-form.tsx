'use client';

import { useMemo, useState } from 'react';

import { ui } from '@/content/ui';
import type { AgentForm, AgentFormField, AgentFormOption } from '@/lib/agent-types';
import type { Locale } from '@/lib/i18n';

/**
 * The booking / report form the assistant opens inside the chat panel.
 *
 * Why a form and not a conversation: collecting seven fields by chat is seven
 * round trips, and each one is a chance for the model to ask again for
 * something already given, or to read a stray "تمام" as consent to file a
 * report under someone's name and national ID. Here the citizen sees every
 * field at once, corrects whatever the assistant prefilled wrongly, and sends
 * it in one go.
 *
 * Nothing about appointments or complaints is encoded here. The descriptor
 * arrives from the assistant (agent/graph/forms.py) carrying its own fields,
 * labels, options and prefilled values, so a field added there needs no change
 * in this file. The same is true of validation: the messages shown against
 * each field are the assistant's, because it is the side that can see whether
 * a slot was taken thirty seconds ago.
 */

export type SubmittedForm = {
  reply: string;
  reference: string | null;
  ticketUrl: string | null;
  intent: string | null;
};

type Status =
  | { kind: 'idle' }
  | { kind: 'sending' }
  | { kind: 'error'; message?: string };

/** Options for a field, following `optionsBy` when the list depends on another. */
function optionsFor(
  field: AgentFormField,
  values: Record<string, string>,
): AgentFormOption[] {
  if (!field.optionsBy) return field.options ?? [];
  const key = values[field.optionsBy] ?? '';
  return field.optionsByValue?.[key] ?? [];
}

export function ChatForm({
  form,
  locale,
  sessionId,
  onSubmitted,
}: {
  form: AgentForm;
  locale: Locale;
  sessionId: string;
  onSubmitted: (result: SubmittedForm) => void;
}) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(form.fields.map((f) => [f.name, f.value ?? ''])),
  );

  /* Which "pick from the list" fields the citizen switched to typing their own
     answer in. A prefilled value that is not on the list starts that way — the
     assistant matched a service the district has not recorded, and hiding it
     behind a dropdown would silently drop what they asked for. */
  const [typedOwn, setTypedOwn] = useState<Set<string>>(
    () =>
      new Set(
        form.fields
          .filter(
            (f) =>
              f.allowOther &&
              f.value &&
              !(f.options ?? []).some((o) => o.value === f.value),
          )
          .map((f) => f.name),
      ),
  );

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  const sending = status.kind === 'sending';

  /* Changing a field invalidates any field whose options were derived from it:
     picking a new day must not leave yesterday's time selected. Derived from
     the descriptor rather than hard-coded, so it holds for any such pair. */
  const dependents = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const field of form.fields) {
      if (!field.optionsBy) continue;
      (map[field.optionsBy] ??= []).push(field.name);
    }
    return map;
  }, [form.fields]);

  function setField(name: string, value: string) {
    setValues((prev) => {
      const next = { ...prev, [name]: value };
      for (const dependent of dependents[name] ?? []) next[dependent] = '';
      return next;
    });
    setErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending) return;

    /* A required field left empty is caught here so the citizen is not made to
       wait on the network to be told. Everything else — the shape of a
       national ID, whether a slot is still free — is the assistant's call, and
       is checked there whatever this does. */
    const missing: Record<string, string> = {};
    for (const field of form.fields) {
      if (field.required && !(values[field.name] ?? '').trim()) {
        missing[field.name] = ui.chatFormRequired[locale];
      }
    }

    if (Object.keys(missing).length > 0) {
      setErrors(missing);
      setStatus({ kind: 'error', message: ui.chatFormFix[locale] });
      return;
    }

    setErrors({});
    setStatus({ kind: 'sending' });

    try {
      const response = await fetch('/api/chat/form', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: form.kind, sessionId, locale, values }),
      });

      const data = (await response.json().catch(() => null)) as {
        reply?: string;
        reference?: string | null;
        ticketUrl?: string | null;
        intent?: string | null;
        message?: string;
        fields?: Record<string, string>;
      } | null;

      if (!response.ok) {
        if (data?.fields && Object.keys(data.fields).length > 0) {
          setErrors(data.fields);
          setStatus({ kind: 'error', message: data.message ?? ui.chatFormFix[locale] });
          return;
        }
        /* A timeout carries the assistant's own words: the row may have been
           written even though we stopped waiting, and telling someone it
           failed is how they end up booked twice. */
        setStatus({
          kind: 'error',
          message: data?.reply ?? ui.chatFormError[locale],
        });
        return;
      }

      onSubmitted({
        reply: data?.reply ?? ui.chatFormDone[locale],
        reference: data?.reference ?? null,
        ticketUrl: data?.ticketUrl ?? null,
        intent: data?.intent ?? null,
      });
    } catch {
      setStatus({ kind: 'error', message: ui.chatFormError[locale] });
    }
  }

  const inputClass =
    'mt-1 w-full rounded-lg border bg-canvas px-2.5 py-2 text-sm disabled:opacity-60';

  function renderField(field: AgentFormField) {
    const value = values[field.name] ?? '';
    const error = errors[field.name];
    const id = `cf-${form.kind}-${field.name}`;
    const describedBy = error ? `${id}-err` : field.hint ? `${id}-hint` : undefined;
    const border = error ? 'border-terracotta-500' : 'border-line-strong';

    if (field.type === 'fixed') {
      return (
        <div key={field.name}>
          <span className="block text-xs font-semibold text-fg-muted">{field.label}</span>
          <p className="mt-0.5 text-sm font-medium">{value}</p>
        </div>
      );
    }

    const label = (
      <label htmlFor={id} className="block text-xs font-semibold">
        {field.label}
        {field.required ? (
          <span className="text-terracotta-600" aria-hidden="true">
            {' '}
            *
          </span>
        ) : (
          <span className="font-normal text-fg-muted"> ({ui.chatFormOptional[locale]})</span>
        )}
      </label>
    );

    const messages = (
      <>
        {error && (
          <p id={`${id}-err`} className="mt-1 text-xs text-terracotta-600 dark:text-terracotta-400">
            {error}
          </p>
        )}
        {!error && field.hint && (
          <p id={`${id}-hint`} className="mt-1 text-xs text-fg-muted">
            {field.hint}
          </p>
        )}
      </>
    );

    if (field.type === 'textarea') {
      return (
        <div key={field.name}>
          {label}
          <textarea
            id={id}
            rows={field.rows ?? 3}
            value={value}
            maxLength={field.maxLength}
            disabled={sending}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            onChange={(e) => setField(field.name, e.target.value)}
            className={`${inputClass} ${border} resize-y`}
          />
          {messages}
        </div>
      );
    }

    if (field.type === 'chips') {
      const options = optionsFor(field, values);
      return (
        <div key={field.name}>
          <span className="block text-xs font-semibold">
            {field.label}
            {field.required && (
              <span className="text-terracotta-600" aria-hidden="true">
                {' '}
                *
              </span>
            )}
          </span>
          {options.length === 0 ? (
            <p className="mt-1 text-xs text-fg-muted">
              {field.optionsBy ? ui.chatFormPickDateFirst[locale] : '—'}
            </p>
          ) : (
            <div
              role="group"
              aria-label={field.label}
              className="mt-1.5 flex max-h-28 flex-wrap gap-1.5 overflow-y-auto"
            >
              {options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  disabled={sending}
                  aria-pressed={value === option.value}
                  onClick={() => setField(field.name, option.value)}
                  className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors disabled:opacity-60 ${
                    value === option.value
                      ? 'border-brand bg-brand text-brand-fg'
                      : 'border-line-strong hover:bg-surface-2'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
          {messages}
        </div>
      );
    }

    if (field.type === 'select') {
      const options = field.options ?? [];
      const own = typedOwn.has(field.name);

      return (
        <div key={field.name}>
          {label}
          {own ? (
            <input
              id={id}
              type="text"
              value={value}
              maxLength={field.maxLength}
              disabled={sending}
              aria-invalid={error ? true : undefined}
              aria-describedby={describedBy}
              onChange={(e) => setField(field.name, e.target.value)}
              className={`${inputClass} ${border}`}
            />
          ) : (
            <select
              id={id}
              value={value}
              disabled={sending}
              aria-invalid={error ? true : undefined}
              aria-describedby={describedBy}
              onChange={(e) => {
                if (field.allowOther && e.target.value === '__other__') {
                  setTypedOwn((prev) => new Set(prev).add(field.name));
                  setField(field.name, '');
                  return;
                }
                setField(field.name, e.target.value);
              }}
              className={`${inputClass} ${border}`}
            >
              <option value="">{ui.chatFormChoose[locale]}</option>
              {options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
              {field.allowOther && (
                <option value="__other__">{field.otherLabel ?? '…'}</option>
              )}
            </select>
          )}
          {own && options.length > 0 && (
            <button
              type="button"
              disabled={sending}
              onClick={() => {
                setTypedOwn((prev) => {
                  const next = new Set(prev);
                  next.delete(field.name);
                  return next;
                });
                setField(field.name, '');
              }}
              className="mt-1 text-xs text-brand underline"
            >
              {ui.chatFormChoose[locale]}
            </button>
          )}
          {messages}
        </div>
      );
    }

    return (
      <div key={field.name}>
        {label}
        <input
          id={id}
          type={field.type === 'tel' ? 'tel' : field.type === 'email' ? 'email' : 'text'}
          value={value}
          maxLength={field.maxLength}
          placeholder={field.placeholder}
          inputMode={field.inputMode as React.HTMLAttributes<HTMLInputElement>['inputMode']}
          autoComplete={field.autoComplete}
          disabled={sending}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          onChange={(e) => setField(field.name, e.target.value)}
          className={`${inputClass} ${border} ${field.inputMode === 'numeric' || field.type === 'tel' ? 'tnum' : ''}`}
        />
        {messages}
      </div>
    );
  }

  if (form.unavailable) {
    return (
      <div className="mt-3 rounded-lg border border-line-strong bg-canvas p-3">
        <p className="text-sm font-semibold">{form.title}</p>
        <p className="mt-1 text-xs text-fg-muted">{form.unavailable}</p>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mt-3 space-y-3 rounded-lg border border-line-strong bg-canvas p-3"
      noValidate
    >
      <div>
        <p className="font-[family-name:--font-display] text-sm font-bold">{form.title}</p>
        {form.intro && <p className="mt-0.5 text-xs text-fg-muted">{form.intro}</p>}
      </div>

      {form.fields.map(renderField)}

      {status.kind === 'error' && status.message && (
        <p role="alert" className="text-xs font-medium text-terracotta-600 dark:text-terracotta-400">
          {status.message}
        </p>
      )}

      <button
        type="submit"
        disabled={sending}
        className="w-full rounded-lg bg-brand px-3 py-2.5 text-sm font-semibold text-brand-fg disabled:opacity-60"
      >
        {sending ? ui.chatFormSending[locale] : form.submitLabel}
      </button>
    </form>
  );
}
