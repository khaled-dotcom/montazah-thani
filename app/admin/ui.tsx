import Link from 'next/link';
import type { ReactNode } from 'react';

import { logout } from './login/actions';

/** Small shared pieces for the staff screens. Arabic only — this is a counter tool. */

export function AdminNav({
  current,
}: {
  current: 'home' | 'appointments' | 'messages' | 'news' | 'landmarks';
}) {
  const items = [
    { id: 'home', href: '/admin', label: 'الرئيسية' },
    { id: 'appointments', href: '/admin/appointments', label: 'الحجوزات' },
    { id: 'messages', href: '/admin/messages', label: 'الرسائل' },
    { id: 'news', href: '/admin/news', label: 'الأخبار' },
    { id: 'landmarks', href: '/admin/landmarks', label: 'المعالم' },
  ] as const;

  return (
    <nav aria-label="أقسام اللوحة" className="border-b border-line bg-surface">
      <div className="page-width flex flex-wrap items-center justify-between gap-1 py-2">
        <div className="flex flex-wrap gap-1">
          {items.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              aria-current={current === item.id ? 'page' : undefined}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                current === item.id
                  ? 'bg-brand text-brand-fg'
                  : 'text-fg-muted hover:bg-surface-2 hover:text-fg'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
        <form action={logout}>
          <button
            type="submit"
            className="rounded-lg px-3 py-2 text-sm font-semibold text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
          >
            خروج
          </button>
        </form>
      </div>
    </nav>
  );
}

export function AdminHeading({ title, lead }: { title: string; lead?: string }) {
  return (
    <div className="mb-6">
      <h1 className="font-[family-name:--font-display] text-2xl font-extrabold">{title}</h1>
      {lead && <p className="mt-1 text-sm text-fg-muted">{lead}</p>}
    </div>
  );
}

export function Banner({ tone, children }: { tone: 'ok' | 'error'; children: ReactNode }) {
  const tones = {
    ok: 'border-verdigris-400 bg-verdigris-400/15 text-verdigris-600',
    error: 'border-terracotta-400 bg-terracotta-400/15 text-terracotta-600',
  } as const;
  return (
    <p role="status" className={`mb-6 rounded-lg border px-4 py-3 text-sm font-medium ${tones[tone]}`}>
      {children}
    </p>
  );
}

/** A labelled field. `invalid` comes from the error list the action redirects with. */
export function Field({
  name,
  label,
  hint,
  invalid,
  children,
}: {
  name: string;
  label: string;
  hint?: string;
  invalid?: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-semibold">
        {label}
      </label>
      {hint && <p className="mt-0.5 text-xs text-fg-muted">{hint}</p>}
      <div className="mt-1.5">{children}</div>
      {invalid && (
        <p className="mt-1 text-xs font-medium text-terracotta-600">
          هذا الحقل مطلوب أو غير صالح.
        </p>
      )}
    </div>
  );
}

export const inputClass =
  'w-full rounded-lg border border-line-strong bg-surface px-3 py-2.5 text-sm';

/**
 * Both languages, side by side.
 *
 * The site promises a complete translation in both directions, so an editor who
 * can only see one language while typing will eventually ship a half-English
 * page. Showing the pair together makes the gap obvious before saving.
 */
export function BilingualRow({
  base,
  labelAr,
  labelEn,
  errors,
  rows,
  valueAr = '',
  valueEn = '',
  hint,
}: {
  base: string;
  labelAr: string;
  labelEn: string;
  errors: string[];
  rows?: number;
  valueAr?: string;
  valueEn?: string;
  hint?: string;
}) {
  const arName = `${base}Ar`;
  const enName = `${base}En`;
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Field name={arName} label={labelAr} hint={hint} invalid={errors.includes(arName)}>
        {rows ? (
          <textarea id={arName} name={arName} rows={rows} defaultValue={valueAr} className={inputClass} />
        ) : (
          <input id={arName} name={arName} defaultValue={valueAr} className={inputClass} />
        )}
      </Field>
      <Field name={enName} label={labelEn} invalid={errors.includes(enName)}>
        {rows ? (
          <textarea
            id={enName}
            name={enName}
            rows={rows}
            dir="ltr"
            defaultValue={valueEn}
            className={inputClass}
          />
        ) : (
          <input id={enName} name={enName} dir="ltr" defaultValue={valueEn} className={inputClass} />
        )}
      </Field>
    </div>
  );
}
