import type { MetadataRoute } from 'next';

const SITE_URL = 'https://cvly.in';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/dashboard', '/history', '/settings', '/api/', '/auth/'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
