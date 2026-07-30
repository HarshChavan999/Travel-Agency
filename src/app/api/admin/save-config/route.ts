import { NextResponse } from 'next/server';
import { initializeFirebase } from '@/lib/auth';
import { getFirestore } from 'firebase-admin/firestore';

export const dynamic = 'force-static';

export async function POST(req: Request) {
  try {
    const config = await req.json();

    initializeFirebase();
    const db = getFirestore();

    // Use firebase-admin to save the config, bypassing client security rules
    await db.collection('admin').doc('config').set(config, { merge: true });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error saving admin config:', error);
    return NextResponse.json({ error: error.message || 'Something went wrong' }, { status: 500 });
  }
}
