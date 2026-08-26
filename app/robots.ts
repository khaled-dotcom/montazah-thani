import type { MetadataRoute } from 'next';

const base = process.env.NEXT_PUBLIC_SITE_URL;

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/api/', '/ar/search', '/en/search'] }],
    sitemap: base ? `${base}/sitemap.xml` : undefined,
  };
}
