import { MetadataRoute } from 'next';

export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/blogtripdm/', '/api/'], // Disallowing admin, blog admin, and api routes from being indexed
    },
    sitemap: 'https://tripdm.com/sitemap.xml',
  };
}
