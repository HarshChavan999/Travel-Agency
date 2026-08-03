import { MetadataRoute } from 'next';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeFirebase } from '@/lib/auth';

// Revalidate sitemap every hour so new packages and blogs automatically appear
export const revalidate = 3600;

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'travel-agent-management-29c27';

async function fetchAllListings(baseUrl: string): Promise<MetadataRoute.Sitemap> {
  const packageUrls: MetadataRoute.Sitemap = [];

  try {
    initializeFirebase();
    const db = getFirestore();

    const snapshot = await db.collection('listings').get();
    for (const doc of snapshot.docs) {
      const data = doc.data();

      // Only include public (approved) packages
      if (data.approved === false) continue;

      const updateTime = data.updatedAt || data.createdAt || doc.updateTime;

      packageUrls.push({
        url: `${baseUrl}/package/${doc.id}`,
        lastModified: updateTime ? new Date(updateTime.seconds ? updateTime.seconds * 1000 : updateTime) : new Date(),
        changeFrequency: 'weekly',
        priority: 0.8,
      });
    }
  } catch (error) {
    console.error("Error fetching listings for sitemap:", error);
  }

  return packageUrls;
}

async function fetchAllBlogs(baseUrl: string): Promise<MetadataRoute.Sitemap> {
  const blogUrls: MetadataRoute.Sitemap = [];

  try {
    initializeFirebase();
    const db = getFirestore();

    const snapshot = await db.collection('blogs').get();
    for (const doc of snapshot.docs) {
      const data = doc.data();

      // Only include published blogs
      if (data.published === false) continue;

      const slug = data.slug || doc.id;
      if (!slug || slug === 'undefined') continue;

      const updatedAt = data.updatedAt || data.publishedAt || doc.updateTime;

      blogUrls.push({
        url: `${baseUrl}/blog/${slug}`,
        lastModified: updatedAt ? new Date(updatedAt) : new Date(),
        changeFrequency: 'weekly',
        priority: 0.7,
      });
    }
  } catch (error) {
    console.error("Error fetching blogs for sitemap:", error);
  }

  return blogUrls;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://tripdm.com';

  const [packageUrls, blogUrls] = await Promise.all([
    fetchAllListings(baseUrl),
    fetchAllBlogs(baseUrl),
  ]);

  const staticUrls: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/policies/conditions-of-use`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/policies/internet-based-policy`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/policies/privacy-notice`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ];

  return [...staticUrls, ...packageUrls, ...blogUrls];
}
