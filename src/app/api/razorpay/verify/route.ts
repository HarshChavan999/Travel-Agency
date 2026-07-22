import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { initializeFirebase } from '@/lib/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

export async function POST(req: Request) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, agencyId, targetPlan, isAddon, creditsToBuy } = await req.json();

    const secret = process.env.RAZORPAY_KEY_SECRET || '';

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(razorpay_order_id + '|' + razorpay_payment_id)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return NextResponse.json({ error: 'Payment verification failed' }, { status: 400 });
    }

    initializeFirebase();
    const db = getFirestore();
    
    const agencyRef = db.collection('users').doc(agencyId);
    const docSnap = await agencyRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({ error: 'Agency not found' }, { status: 404 });
    }

    const updates: any = {};

    if (isAddon) {
      updates.credits = FieldValue.increment(creditsToBuy || 0);
    } else if (targetPlan) {
      updates.plan = targetPlan;
      
      let maxListings = 2;
      let initCredits = 100;

      if (targetPlan === 'starter') {
        maxListings = 10;
        initCredits = 2000;
      } else if (targetPlan === 'premium') {
        maxListings = 50;
        initCredits = 5000;
      } else if (targetPlan === 'vip') {
        maxListings = 10000;
        initCredits = 10000;
      }
      
      updates.listingLimit = maxListings;
      updates.credits = initCredits;
    }

    await agencyRef.update(updates);

    return NextResponse.json({ success: true, plan: targetPlan });
  } catch (error: any) {
    console.error('Error verifying Razorpay payment:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
