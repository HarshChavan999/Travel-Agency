import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'travel-agent-management-29c27';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { blogId, coverImage } = body;

    if (!blogId) {
      return NextResponse.json({ error: 'Missing required parameter: blogId' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const patchUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/blogs/${encodeURIComponent(blogId)}?updateMask.fieldPaths=coverImage&updateMask.fieldPaths=updatedAt`;

    const res = await fetch(patchUrl, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          coverImage: { stringValue: coverImage || '' },
          updatedAt: { stringValue: now }
        }
      })
    });

    if (!res.ok) {
      console.warn('Firestore REST update failed in update-photo:', await res.text());
    }

    return NextResponse.json({
      success: true,
      message: 'Blog cover photo updated successfully',
      blogId,
      coverImage: coverImage || '',
      updatedAt: now
    });
  } catch (error: any) {
    console.error('Error updating blog photo:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update blog photo' },
      { status: 500 }
    );
  }
}
