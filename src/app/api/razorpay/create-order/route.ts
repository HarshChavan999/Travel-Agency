import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { initializeFirebase } from '@/lib/auth';
import { getFirestore } from 'firebase-admin/firestore';

export async function POST(req: Request) {
  try {
    const { creditsToBuy, currency = 'INR', receipt, agencyId, targetPlan, isAddon } = await req.json();

    if (!targetPlan && !isAddon) {
      return NextResponse.json({ error: 'Target plan or addon flag is required' }, { status: 400 });
    }

    // Initialize Firebase Admin securely
    initializeFirebase();
    const db = getFirestore();

    // Fetch dynamic pricing from database
    const configDoc = await db.collection('admin').doc('config').get();
    const config = configDoc.exists ? configDoc.data() : {
      starterPrice: 2000,
      premiumPrice: 5000,
      vipPrice: 10000,
      addonCreditPrice: 1
    };

    let finalAmount = 0;
    if (isAddon) {
      finalAmount = (creditsToBuy || 0) * (config?.addonCreditPrice || 1);
    } else if (targetPlan === 'starter') {
      finalAmount = config?.starterPrice || 2000;
    } else if (targetPlan === 'premium') {
      finalAmount = config?.premiumPrice || 5000;
    } else if (targetPlan === 'vip') {
      finalAmount = config?.vipPrice || 10000;
    }

    if (!finalAmount || finalAmount <= 0) {
      return NextResponse.json({ error: 'Calculated amount is invalid' }, { status: 400 });
    }

    const instance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID || '',
      key_secret: process.env.RAZORPAY_KEY_SECRET || '',
    });

    const options = {
      amount: finalAmount * 100, // amount in the smallest currency unit (paise for INR)
      currency,
      receipt: receipt || `receipt_${new Date().getTime()}`,
      notes: {
        agencyId: agencyId || '',
        targetPlan: targetPlan || '',
        isAddon: isAddon ? 'true' : 'false',
        amount: isAddon ? (creditsToBuy || 0).toString() : '0' // Pass original credits so webhook knows how many to add
      }
    };

    const order = await instance.orders.create(options);

    return NextResponse.json(order);
  } catch (error: any) {
    console.error('Error creating Razorpay order:', error);
    return NextResponse.json({ error: error.message || 'Something went wrong' }, { status: 500 });
  }
}
