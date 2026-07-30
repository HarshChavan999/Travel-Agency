import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { initializeFirebase } from '@/lib/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-static';

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const signature = req.headers.get('x-razorpay-signature');
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || '';

    if (!signature || !secret) {
      return NextResponse.json({ error: 'Invalid signature or secret' }, { status: 400 });
    }

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');

    if (expectedSignature !== signature) {
      return NextResponse.json({ error: 'Signature mismatch' }, { status: 400 });
    }

    const event = JSON.parse(body);

    // We only care about successful payments
    if (event.event === 'payment.captured' || event.event === 'order.paid') {
      const paymentEntity = event.payload.payment?.entity || event.payload.order?.entity;
      const notes = paymentEntity.notes;

      if (!notes || !notes.agencyId) {
         return NextResponse.json({ received: true, note: 'No agency info attached' });
      }

      initializeFirebase();
      const db = getFirestore();
      
      const agencyRef = db.collection('users').doc(notes.agencyId);
      const docSnap = await agencyRef.get();

      if (!docSnap.exists) {
        return NextResponse.json({ error: 'Agency not found' }, { status: 404 });
      }

      const isAddon = notes.isAddon === 'true';
      const targetPlan = notes.targetPlan;
      const amountStr = notes.amount;
      const amountCredits = parseInt(amountStr || '0', 10);

      const updates: any = {};

      if (isAddon) {
        updates.credits = FieldValue.increment(amountCredits);
      } else if (targetPlan) {
        updates.plan = targetPlan;
        
        let maxListings = 2;
        let initCredits = 100;
        
        if (targetPlan === 'starter') {
          maxListings = 10;
          initCredits = 2000;
        }
        else if (targetPlan === 'premium') {
          maxListings = 50;
          initCredits = 5000;
        }
        else if (targetPlan === 'vip') {
          maxListings = 10000;
          initCredits = 10000;
        }
        
        updates.listingLimit = maxListings;
        updates.credits = initCredits;
      }

      await agencyRef.update(updates);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Error processing Razorpay webhook:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
