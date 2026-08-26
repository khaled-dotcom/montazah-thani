'use client';

/**
 * Last-resort boundary: this replaces the root layout, so it must render its
 * own <html> and cannot rely on the site's fonts, tokens or stylesheet — by the
 * time it shows, the thing that would have loaded those is what failed.
 * Everything here is therefore inline and self-contained.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          padding: '2rem',
          background: '#fbf9f5',
          color: '#14212b',
          fontFamily: 'system-ui, "Segoe UI", sans-serif',
          textAlign: 'center',
        }}
      >
        <main style={{ maxWidth: '32rem' }}>
          <h1 style={{ fontSize: '1.75rem', margin: '0 0 .5rem' }}>تعذّر تحميل الموقع</h1>
          <p style={{ fontSize: '1.1rem', margin: '0 0 1.5rem', color: '#55656f' }}>
            The site could not be loaded
          </p>
          <p style={{ margin: '0 0 1.5rem', color: '#55656f' }}>
            نعتذر عن الخلل. برجاء المحاولة مرة أخرى.
            <br />
            We are sorry. Please try again.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              border: 0,
              borderRadius: '.5rem',
              background: '#0e4262',
              color: '#fff',
              padding: '.85rem 1.75rem',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            إعادة المحاولة — Try again
          </button>
          <p style={{ marginTop: '2rem', fontSize: '.9rem', color: '#55656f' }}>
            الشكاوى الحكومية —{' '}
            <a href="tel:16528" style={{ color: '#0e4262', fontWeight: 700 }}>
              16528
            </a>
          </p>
          {error.digest && (
            <p style={{ marginTop: '1.5rem', fontSize: '.75rem', color: '#8a969d' }}>
              Error reference: {error.digest}
            </p>
          )}
        </main>
      </body>
    </html>
  );
}
