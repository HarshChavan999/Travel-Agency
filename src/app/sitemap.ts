import { MetadataRoute } from 'next';

// Revalidate sitemap every hour so new packages and blogs automatically appear
export const revalidate = 3600;

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'travel-agent-management-29c27';

async function fetchAllListings(baseUrl: string): Promise<MetadataRoute.Sitemap> {
  const packageUrls: MetadataRoute.Sitemap = [];
  let pageToken = '';

  try {
    do {
      let url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/listings?pageSize=1000`;
      if (pageToken) {
        url += `&pageToken=${pageToken}`;
      }

      const res = await fetch(url, { next: { revalidate: 3600 } });
      if (!res.ok) {
        console.error("Failed to fetch listings for sitemap:", res.status, res.statusText);
        break;
      }

      const data = await res.json();
      if (data.documents && Array.isArray(data.documents)) {
        for (const doc of data.documents) {
          const nameParts = doc.name.split('/');
          const id = nameParts[nameParts.length - 1];
          const updateTime = doc.updateTime;

          packageUrls.push({
            url: `${baseUrl}/package/${id}`,
            lastModified: updateTime ? new Date(updateTime) : new Date(),
            changeFrequency: 'weekly',
            priority: 0.8,
          });
        }
      }

      pageToken = data.nextPageToken || '';
    } while (pageToken);
  } catch (error) {
    console.error("Error fetching listings for sitemap:", error);
  }

  return packageUrls;
}

async function fetchAllBlogs(baseUrl: string): Promise<MetadataRoute.Sitemap> {
  let blogUrls: MetadataRoute.Sitemap = [];
  let pageToken = '';

  try {
    do {
      let url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/blogs?pageSize=1000`;
      if (pageToken) {
        url += `&pageToken=${pageToken}`;
      }

      const res = await fetch(url, { next: { revalidate: 3600 } });
      if (!res.ok) {
        console.error("Failed to fetch blogs collection for sitemap:", res.status, res.statusText);
        break;
      }

      const data = await res.json();
      if (data.documents && Array.isArray(data.documents)) {
        for (const doc of data.documents) {
          const fields = doc.fields || {};
          // Check published field (if undefined, include by default or check booleanValue)
          const publishedVal = fields.published?.booleanValue;
          const isPublished = publishedVal !== undefined ? publishedVal : true;
          const slug = fields.slug?.stringValue;
          
          const nameParts = doc.name.split('/');
          const docId = nameParts[nameParts.length - 1];
          const blogSlug = slug || docId;

          if (isPublished && blogSlug && blogSlug !== 'undefined') {
            const updatedAt = fields.updatedAt?.stringValue || fields.publishedAt?.stringValue || doc.updateTime || '';
            blogUrls.push({
              url: `${baseUrl}/blog/${blogSlug}`,
              lastModified: updatedAt ? new Date(updatedAt) : new Date(),
              changeFrequency: 'weekly',
              priority: 0.7,
            });
          }
        }
      }

      pageToken = data.nextPageToken || '';
    } while (pageToken);
  } catch (error) {
    console.error("Error fetching blogs for sitemap:", error);
  }

  // Fallback: Use runQuery without orderBy if direct list returned nothing
  if (blogUrls.length === 0) {
    try {
      const blogQueryUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery`;
      const blogQuery = {
        structuredQuery: {
          from: [{ collectionId: 'blogs' }],
          limit: 10000,
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
        const queried = blogData
          .filter((item: any) => item.document)
          .map((item: any) => {
            const fields = item.document.fields || {};
            const publishedVal = fields.published?.booleanValue;
            const isPublished = publishedVal !== undefined ? publishedVal : true;
            const slug = fields.slug?.stringValue;
            const nameParts = item.document.name.split('/');
            const docId = nameParts[nameParts.length - 1];
            const blogSlug = slug || docId;
            const updatedAt = fields.updatedAt?.stringValue || fields.publishedAt?.stringValue || item.document.updateTime || '';

            if (!isPublished || !blogSlug) return null;

            return {
              url: `${baseUrl}/blog/${blogSlug}`,
              lastModified: updatedAt ? new Date(updatedAt) : new Date(),
              changeFrequency: 'weekly' as const,
              priority: 0.7,
            };
          })
          .filter((item: any): item is MetadataRoute.Sitemap[number] => item !== null);

        blogUrls = queried;
      }
    } catch (err) {
      console.error("Fallback query for blogs failed:", err);
    }
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
