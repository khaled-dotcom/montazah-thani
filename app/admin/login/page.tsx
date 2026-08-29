import { AdminHeading, Banner, Field, inputClass } from '../ui';
import { login } from './actions';

export const dynamic = 'force-dynamic';

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;

  return (
    <div className="page-width flex min-h-[calc(100vh-57px)] items-center justify-center py-8">
      <div className="w-full max-w-sm">
        <AdminHeading title="تسجيل الدخول" lead="لوحة موظفي حي منتزه ثاني" />

        {error === 'disabled' && (
          <Banner tone="error">لوحة الموظفين غير مُفعّلة على هذا الخادم.</Banner>
        )}
        {error === '1' && <Banner tone="error">اسم المستخدم أو كلمة المرور غير صحيحة.</Banner>}

        {/* Plain form POST — works with JavaScript off. */}
        <form action={login} className="card space-y-5 p-6">
          <input type="hidden" name="next" value={next ?? '/admin'} />

          <Field name="username" label="اسم المستخدم">
            <input
              id="username"
              name="username"
              autoComplete="username"
              autoFocus
              required
              className={inputClass}
            />
          </Field>

          <Field name="password" label="كلمة المرور">
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className={inputClass}
            />
          </Field>

          <button
            type="submit"
            className="w-full rounded-lg bg-brand px-6 py-2.5 text-sm font-semibold text-brand-fg hover:opacity-90"
          >
            دخول
          </button>
        </form>
      </div>
    </div>
  );
}
