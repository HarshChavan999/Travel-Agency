import { MetadataRoute } from 'next';

export const revalidate = 3600; // Revalidate sitemap every hour

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'travel-agent-management-29c27';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://tripdm.com';
  let packageUrls: MetadataRoute.Sitemap = [];
  let blogUrls: MetadataRoute.Sitemap = [];

  // Fetch listing URLs for sitemap
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/listings?pageSize=1000`;
    const res = await fetch(url, { next: { revalidate: 3600 } });
    
    if (res.ok) {
      const data = await res.json();
      if (data.documents && Array.isArray(data.documents)) {
        packageUrls = data.documents.map((doc: any) => {
          // Document name is formatted as projects/{project_id}/databases/{database_id}/documents/listings/{document_id}
          const nameParts = doc.name.split('/');
          const id = nameParts[nameParts.length - 1];
          const updateTime = doc.updateTime;
          
          return {
            url: `${baseUrl}/package/${id}`,
            lastModified: updateTime ? new Date(updateTime) : new Date(),
            changeFrequency: 'weekly' as const,
            priority: 0.8,
          };
        });
      }
    } else {
      console.error("Failed to fetch listings for sitemap:", res.status, res.statusText);
    }
  } catch (error) {
    console.error("Error fetching listings for sitemap:", error);
  }

  // Fetch published blog URLs for sitemap
  try {
    const blogQueryUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery`;
    const blogQuery = {
      structuredQuery: {
        from: [{ collectionId: 'blogs' }],
        where: {
          fieldFilter: {
            field: { fieldPath: 'published' },
            op: 'EQUAL',
            value: { booleanValue: true },
          },
        },
        orderBy: [{ field: { fieldPath: 'publishedAt' }, direction: 'DESCENDING' }],
        limit: 1000,
      },
    };

    const blogRes = await fetch(blogQueryUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(blogQuery),
      next: { revalidate: 3600 },
    });

    if (blogRes.ok) {
      const blogData = await blogRes.json();
      blogUrls = blogData
        .filter((item: any) => item.document)
        .map((item: any) => {
          const fields = item.document.fields || {};
          const slug = fields.slug?.stringValue || '';
          const updatedAt = fields.updatedAt?.stringValue || fields.publishedAt?.stringValue || '';
          return {
            url: `${baseUrl}/blog/${slug}`,
            lastModified: updatedAt ? new Date(updatedAt) : new Date(),
            changeFrequency: 'weekly' as const,
            priority: 0.7,
          };
        })
        .filter((entry: any) => entry.url !== `${baseUrl}/blog/`);
    }
  } catch (error) {
    console.error("Error fetching blogs for sitemap:", error);
  }

  const staticUrls: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 1,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/policies/conditions-of-use`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    },
    {
      url: `${baseUrl}/policies/internet-based-policy`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    },
    {
      url: `${baseUrl}/policies/privacy-notice`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    },
  ];

  return [...staticUrls, ...packageUrls, ...blogUrls];
}
