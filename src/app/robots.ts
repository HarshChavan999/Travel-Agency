import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/api/'], // Disallowing admin and api routes from being indexed
    },
    sitemap: 'https://tripdm.com/sitemap.xml',
  };
}
