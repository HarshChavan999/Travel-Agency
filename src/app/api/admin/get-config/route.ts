import { NextResponse } from 'next/server';
import { initializeFirebase } from '@/lib/auth';
import { getFirestore } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    initializeFirebase();
    const db = getFirestore();

    const configDoc = await db.collection('admin').doc('config').get();
    
    if (configDoc.exists) {
      return NextResponse.json(configDoc.data());
    } else {
      return NextResponse.json({
        starterPrice: 2000,
        premiumPrice: 5000,
        vipPrice: 10000,
        addonCreditPrice: 1
      });
    }
  } catch (error: any) {
    console.error('Error fetching admin config:', error);
    return NextResponse.json({ error: error.message || 'Something went wrong' }, { status: 500 });
  }
}
