import { NextRequest, NextResponse } from 'next/server';

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'travel-agent-management-29c27';
const BLOG_ADMIN_EMAIL = 'tripdm26@gmail.com';

// GET - Fetch a single blog by slug
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery`;

    const query = {
      structuredQuery: {
        from: [{ collectionId: 'blogs' }],
        where: {
          fieldFilter: {
            field: { fieldPath: 'slug' },
            op: 'EQUAL',
            value: { stringValue: slug },
          },
        },
        limit: 1,
      },
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(query),
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const data = await res.json();
    const item = data.find((d: any) => d.document);

    if (!item) {
      return NextResponse.json({ error: 'Blog not found' }, { status: 404 });
    }

    const doc = item.document;
    const nameParts = doc.name.split('/');
    const id = nameParts[nameParts.length - 1];
    const fields = doc.fields || {};

    const blog = {
      id,
      title: fields.title?.stringValue || '',
      slug: fields.slug?.stringValue || '',
      excerpt: fields.excerpt?.stringValue || '',
      content: fields.content?.stringValue || '',
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
    };

    return NextResponse.json({ blog });
  } catch (error) {
    console.error('Error fetching blog by slug:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - Update a blog (toggle publish, update fields)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const body = await request.json();
    const { authorEmail, docId, ...updates } = body;

    if (authorEmail !== BLOG_ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (!docId) {
      return NextResponse.json({ error: 'Document ID required' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const fields: Record<string, any> = { updatedAt: { stringValue: now } };

    if (updates.published !== undefined) {
      fields.published = { booleanValue: updates.published };
      if (updates.published) {
        fields.publishedAt = { stringValue: now };
      }
    }
    if (updates.title) fields.title = { stringValue: updates.title };
    if (updates.content) fields.content = { stringValue: updates.content };
    if (updates.excerpt) fields.excerpt = { stringValue: updates.excerpt };
    if (updates.metaTitle) fields.metaTitle = { stringValue: updates.metaTitle };
    if (updates.metaDescription) fields.metaDescription = { stringValue: updates.metaDescription };

    const updateMask = Object.keys(fields)
      .map((f) => `updateMask.fieldPaths=${f}`)
      .join('&');

    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/blogs/${docId}?${updateMask}`;

    const res = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields }),
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating blog:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete a blog post
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const body = await request.json();
    const { authorEmail, docId } = body;

    if (authorEmail !== BLOG_ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (!docId) {
      return NextResponse.json({ error: 'Document ID required' }, { status: 400 });
    }

    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/blogs/${docId}`;

    const res = await fetch(url, { method: 'DELETE' });

    if (!res.ok && res.status !== 404) {
      return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting blog:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
