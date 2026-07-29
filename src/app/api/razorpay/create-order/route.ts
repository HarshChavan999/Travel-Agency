import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { initializeFirebase } from '@/lib/auth';
import { getFirestore } from 'firebase-admin/firestore';

export async function POST(req: Request) {
  try {
    const { creditsToBuy, currency = 'INR', receipt, agencyId, targetPlan, isAddon, couponCode } = await req.json();

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

    let baseAmount = 0;
    if (isAddon) {
      baseAmount = (creditsToBuy || 0) * (config?.addonCreditPrice || 1);
    } else if (targetPlan === 'starter') {
      baseAmount = config?.starterPrice || 2000;
    } else if (targetPlan === 'premium') {
      baseAmount = config?.premiumPrice || 5000;
    } else if (targetPlan === 'vip') {
      baseAmount = config?.vipPrice || 10000;
    }

    if (!baseAmount || baseAmount <= 0) {
      return NextResponse.json({ error: 'Calculated amount is invalid' }, { status: 400 });
    }

    let discountAmount = 0;
    let appliedCouponCode = '';

    // Verify coupon code server-side if provided
    if (couponCode) {
      const cleanCode = couponCode.trim().toUpperCase();
      const couponQuery = await db.collection('coupons').where('code', '==', cleanCode).get();
      
      if (!couponQuery.empty) {
        const couponDoc = couponQuery.docs[0];
        const cData = couponDoc.data();
        const now = Date.now();

        const isNotExpired = !cData.validUntil || new Date(cData.validUntil).getTime() >= now;
        const isStarted = !cData.validFrom || new Date(cData.validFrom).getTime() <= now;
        const withinLimit = cData.usageLimit === null || cData.usageLimit === undefined || cData.usedCount < cData.usageLimit;
        const minMet = !cData.minOrderAmount || baseAmount >= cData.minOrderAmount;
        const allowedPlans = cData.applicablePlans || ['all'];
        const planAllowed = allowedPlans.includes('all') || allowedPlans.includes(targetPlan);

        if (cData.isActive && isNotExpired && isStarted && withinLimit && minMet && planAllowed) {
          appliedCouponCode = cleanCode;
          if (cData.discountType === 'percentage') {
            const rawDisc = (baseAmount * Number(cData.discountValue)) / 100;
            discountAmount = cData.maxDiscount ? Math.min(rawDisc, Number(cData.maxDiscount)) : rawDisc;
          } else {
            discountAmount = Math.min(baseAmount, Number(cData.discountValue));
          }
        }
      }
    }

    const finalAmount = Math.max(0, baseAmount - discountAmount);

    if (finalAmount <= 0) {
      return NextResponse.json({
        error: 'Amount is 0 after coupon discount. Please use direct coupon activation.'
      }, { status: 400 });
    }

    const instance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID || '',
      key_secret: process.env.RAZORPAY_KEY_SECRET || '',
    });

    const options = {
      amount: Math.round(finalAmount * 100), // amount in paise
      currency,
      receipt: receipt || `receipt_${new Date().getTime()}`,
      notes: {
        agencyId: agencyId || '',
        targetPlan: targetPlan || '',
        isAddon: isAddon ? 'true' : 'false',
        amount: isAddon ? (creditsToBuy || 0).toString() : '0',
        couponCode: appliedCouponCode,
        discountAmount: discountAmount.toString(),
        originalAmount: baseAmount.toString()
      }
    };

    const order = await instance.orders.create(options);

    return NextResponse.json({
      ...order,
      discountAmount,
      originalAmount: baseAmount,
      couponCode: appliedCouponCode
    });
  } catch (error: any) {
    console.error('Error creating Razorpay order:', error);
    return NextResponse.json({ error: error.message || 'Something went wrong' }, { status: 500 });
  }
}
