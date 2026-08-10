import { NextResponse } from 'next/server';
import { initializeFirebase } from '@/lib/auth';
import { getFirestore } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    initializeFirebase();
    const db = getFirestore();

    const snapshot = await db.collection('destination_stories').get();
    const stories: any[] = [];

    snapshot.forEach((doc) => {
      stories.push({
        id: doc.id,
        ...doc.data()
      });
    });

    // Sort by published first, then createdAt descending
    stories.sort((a, b) => {
      if (a.published !== b.published) return a.published ? -1 : 1;
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });

    return NextResponse.json({ success: true, stories });
  } catch (error: any) {
    console.error('Error fetching destination stories:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to fetch stories' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    initializeFirebase();
    const db = getFirestore();

    // If payload contains an array of stories (bulk save/publish)
    if (Array.isArray(body.stories)) {
      const batch = db.batch();
      body.stories.forEach((story: any) => {
        const docId = story.id || `story-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const ref = db.collection('destination_stories').doc(docId);
        batch.set(ref, {
          ...story,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      });
      await batch.commit();
      return NextResponse.json({ success: true, message: `Successfully saved ${body.stories.length} stories.` });
    }

    // Single story save/update
    const story = body;
    const docId = story.id || `story-${Date.now()}`;
    const storyRef = db.collection('destination_stories').doc(docId);

    await storyRef.set({
      ...story,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    return NextResponse.json({ success: true, story: { id: docId, ...story } });
  } catch (error: any) {
    console.error('Error saving destination story:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to save story' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Story ID is required' }, { status: 400 });
    }

    initializeFirebase();
    const db = getFirestore();

    await db.collection('destination_stories').doc(id).delete();
    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    console.error('Error deleting destination story:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to delete story' }, { status: 500 });
  }
}
