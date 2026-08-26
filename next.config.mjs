/**
 * @type {import('next').NextConfig}
 *
 * Deployment note: bookings, messages and published content live in Postgres
 * (lib/sql.ts), reached over the network. The container therefore holds no
 * state of its own and can be rebuilt and replaced freely — what has to survive
 * is the database volume, not this image.
 *
 * `standalone` emits a self-contained server directory: the traced node_modules
 * plus a server.js, which is what the Dockerfile copies into its runtime stage.
 * A host that builds the app itself (Vercel) runs its own file tracer, which
 * conflicts with standalone's — there it is turned off below.
 */

/* The assistant widget and the booking form talk only to this origin, and the
   only third party the pages touch is OpenStreetMap's map embed on /map plus
   Google Fonts. Everything else is denied, so an injected script has nowhere to
   send what it steals.

   'unsafe-inline' on script-src is required by the pre-paint theme script in
   the layout, which has to run before hydration and therefore cannot be a
   module. Nonces are the better answer, but they force every page to render
   dynamically, which would give up the static prerendering the whole site is
   built on. The trade is deliberate. */
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  "object-src 'none'",
  "script-src 'self' 'unsafe-inline'" + (process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : ''),
  // next/font downloads Cairo and Tajawal at build time and serves them from
  // /_next/static/media, so no Google Fonts origin is needed — and allowing one
  // would only widen the policy for requests the site never makes.
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "img-src 'self' data: blob:",
  "connect-src 'self'" + (process.env.NODE_ENV === 'development' ? ' ws: http://localhost:*' : ''),
  // The /map page embeds an OpenStreetMap iframe.
  'frame-src https://www.openstreetmap.org',
  "manifest-src 'self'",
  'upgrade-insecure-requests',
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self), payment=()' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  // Two years, and only meaningful once the domain is served over HTTPS.
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
];

const nextConfig = {
  reactStrictMode: true,
  // Standalone only makes sense where we ship our own container. On Vercel the
  // platform traces the build itself and fails on standalone's .nft.json.
  ...(process.env.VERCEL ? {} : { output: 'standalone' }),
  poweredByHeader: false,
  /* Belt and braces. Nothing reads from ./data any more — the SQLite file it
     held is gone — but a stale one on a build machine holds residents' names
     and telephone numbers, and it must never be traced into a deployment. */
  outputFileTracingExcludes: {
    '/**/*': ['./data/**/*'],
  },
  experimental: {
    /* Prerendering 106 pages across the default 15 workers crashes them
       intermittently on Windows (STATUS_STACK_BUFFER_OVERRUN, exit 3221226505)
       — roughly one build in two. Four workers builds the site in about the
       same wall time and has not reproduced it. */
    cpus: 4,
  },
  async redirects() {
    return [{ source: '/', destination: '/ar', permanent: false }];
  },
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      {
        // Fingerprinted build assets never change under the same URL.
        source: '/_next/static/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        // Photographs are replaced by editing the file, so they are revalidated
        // rather than pinned for a year. Two folders hold them: /photos are the
        // Wikimedia Commons images the site shipped with, /images those the
        // district supplied.
        source: '/photos/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=3600, must-revalidate' }],
      },
      {
        source: '/images/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=3600, must-revalidate' }],
      },
    ];
  },
};

export default nextConfig;
