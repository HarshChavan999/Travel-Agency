import { NextRequest, NextResponse } from 'next/server';

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'travel-agent-management-29c27';
const BLOG_ADMIN_EMAIL = 'tripdm26@gmail.com';

// Helper to generate slug from title
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

// Helper to estimate reading time
function estimateReadTime(content: string): string {
  const wordsPerMinute = 200;
  const words = content.trim().split(/\s+/).length;
  const minutes = Math.ceil(words / wordsPerMinute);
  return `${minutes} min read`;
}

// GET - Fetch all published blogs (public) or all blogs (admin)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const all = searchParams.get('all') === 'true'; // admin mode

    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery`;

    const query = all
      ? {
          structuredQuery: {
            from: [{ collectionId: 'blogs' }],
            orderBy: [{ field: { fieldPath: 'publishedAt' }, direction: 'DESCENDING' }],
            limit: 100,
          },
        }
      : {
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
            limit: 50,
          },
        };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(query),
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      console.error('Failed to fetch blogs:', await res.text());
      return NextResponse.json({ blogs: [] });
    }

    const data = await res.json();

    const blogs = data
      .filter((item: any) => item.document)
      .map((item: any) => {
        const doc = item.document;
        const nameParts = doc.name.split('/');
        const id = nameParts[nameParts.length - 1];
        const fields = doc.fields || {};

        return {
          id,
          title: fields.title?.stringValue || '',
          slug: fields.slug?.stringValue || '',
          excerpt: fields.excerpt?.stringValue || '',
          coverImage: fields.coverImage?.stringValue || '',
          category: fields.category?.stringValue || '',
          tags: fields.tags?.arrayValue?.values?.map((v: any) => v.stringValue) || [],
          author: fields.author?.stringValue || 'TripDM Team',
          published: fields.published?.booleanValue || false,
          publishedAt: fields.publishedAt?.stringValue || '',
          updatedAt: fields.updatedAt?.stringValue || '',
          metaTitle: fields.metaTitle?.stringValue || '',
          metaDescription: fields.metaDescription?.stringValue || '',
          readTime: fields.readTime?.stringValue || '5 min read',
          content: fields.content?.stringValue || '',
        };
      });

    return NextResponse.json({ blogs });
  } catch (error) {
    console.error('Error fetching blogs:', error);
    return NextResponse.json({ blogs: [] });
  }
}

// POST - Create a new blog post (admin only)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { authorEmail, ...blogData } = body;

    // Verify blog admin
    if (authorEmail !== BLOG_ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Auto-generate slug if not provided
    const slug = blogData.slug || generateSlug(blogData.title);
    // Auto-estimate read time
    const readTime = estimateReadTime(blogData.content || '');
    const now = new Date().toISOString();

    const documentData = {
      fields: {
        title: { stringValue: blogData.title || '' },
        slug: { stringValue: slug },
        excerpt: { stringValue: blogData.excerpt || '' },
        content: { stringValue: blogData.content || '' },
        coverImage: { stringValue: blogData.coverImage || '' },
        category: { stringValue: blogData.category || 'Travel' },
        tags: {
          arrayValue: {
            values: (blogData.tags || []).map((tag: string) => ({ stringValue: tag })),
          },
        },
        author: { stringValue: blogData.author || 'TripDM Team' },
        published: { booleanValue: blogData.published || false },
        publishedAt: { stringValue: blogData.published ? now : '' },
        updatedAt: { stringValue: now },
        metaTitle: { stringValue: blogData.metaTitle || blogData.title || '' },
        metaDescription: { stringValue: blogData.metaDescription || blogData.excerpt || '' },
        readTime: { stringValue: readTime },
      },
    };

    // Create document in Firestore via REST API
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/blogs?documentId=${slug}-${Date.now()}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(documentData),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('Failed to create blog:', errorText);
      return NextResponse.json({ error: 'Failed to create blog' }, { status: 500 });
    }

    const created = await res.json();
    return NextResponse.json({ success: true, document: created });
  } catch (error) {
    console.error('Error creating blog:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
