import { NextResponse } from 'next/server';
import { initializeFirebase } from '@/lib/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { slug, id } = body;

    if (!slug && !id) {
      return NextResponse.json({ error: 'Slug or ID is required.' }, { status: 400 });
    }

    initializeFirebase();
    const db = getFirestore();

    let docRef: any = null;
    let currentViews = 0;

    if (id) {
      const ref = db.collection('blogs').doc(id);
      const doc = await ref.get();
      if (doc.exists) {
        docRef = ref;
        currentViews = doc.data()?.views || doc.data()?.viewsCount || 0;
      }
    }

    if (!docRef && slug) {
      const query = await db.collection('blogs').where('slug', '==', slug).limit(1).get();
      if (!query.empty) {
        docRef = query.docs[0].ref;
        currentViews = query.docs[0].data()?.views || query.docs[0].data()?.viewsCount || 0;
      }
    }

    if (!docRef) {
      return NextResponse.json({ error: 'Blog post not found.' }, { status: 404 });
    }

    let newViews = 1;
    if (typeof currentViews === 'number' && currentViews > 0) {
      await docRef.update({
        views: FieldValue.increment(1)
      });
      newViews = currentViews + 1;
    } else {
      await docRef.set({
        views: 1
      }, { merge: true });
      newViews = 1;
    }

    return NextResponse.json({ success: true, views: newViews });
  } catch (error: any) {
    console.error('Error incrementing blog views:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
