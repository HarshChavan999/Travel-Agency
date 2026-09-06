import { NextResponse } from 'next/server';
import { initializeFirebase } from '@/lib/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { agencyId, targetPlan, couponCode, originalAmount } = await req.json();

    if (!agencyId || !targetPlan || !couponCode) {
      return NextResponse.json({ error: 'Agency ID, target plan, and coupon code are required.' }, { status: 400 });
    }

    const cleanCode = couponCode.trim().toUpperCase();

    initializeFirebase();
    const db = getFirestore();

    // 1. Fetch Coupon
    const couponQuery = await db.collection('coupons').where('code', '==', cleanCode).get();
    if (couponQuery.empty) {
      return NextResponse.json({ error: 'Coupon code not found.' }, { status: 404 });
    }

    const couponDoc = couponQuery.docs[0];
    const couponData = couponDoc.data();

    // 2. Validate Coupon Server-Side
    if (!couponData.isActive) {
      return NextResponse.json({ error: 'Coupon is inactive.' }, { status: 400 });
    }

    const now = Date.now();
    if (couponData.validFrom && new Date(couponData.validFrom).getTime() > now) {
      return NextResponse.json({ error: 'Coupon is not active yet.' }, { status: 400 });
    }
    if (couponData.validUntil && new Date(couponData.validUntil).getTime() < now) {
      return NextResponse.json({ error: 'Coupon has expired.' }, { status: 400 });
    }
    if (couponData.usageLimit !== null && couponData.usageLimit !== undefined && couponData.usedCount >= couponData.usageLimit) {
      return NextResponse.json({ error: 'Coupon usage limit reached.' }, { status: 400 });
    }

    const allowedPlans = couponData.applicablePlans || ['all'];
    if (!allowedPlans.includes('all') && !allowedPlans.includes(targetPlan)) {
      return NextResponse.json({ error: `Coupon not applicable for ${targetPlan} plan.` }, { status: 400 });
    }

    // Calculate discount
    const orig = Number(originalAmount) || 0;
    let discountAmount = 0;
    if (couponData.discountType === 'percentage') {
      const calculated = (orig * Number(couponData.discountValue)) / 100;
      discountAmount = couponData.maxDiscount ? Math.min(calculated, Number(couponData.maxDiscount)) : calculated;
    } else {
      discountAmount = Math.min(orig, Number(couponData.discountValue));
    }

    const finalAmount = Math.max(0, orig - discountAmount);

    if (finalAmount > 0) {
      return NextResponse.json({ error: `Coupon does not reduce the payable amount to zero (Payable: ₹${finalAmount}). Please complete payment via Razorpay.` }, { status: 400 });
    }

    // 3. Fetch Agency Doc
    const agencyRef = db.collection('users').doc(agencyId);
    const agencySnap = await agencyRef.get();

    if (!agencySnap.exists) {
      return NextResponse.json({ error: 'Agency not found.' }, { status: 404 });
    }

    const agencyData = agencySnap.data();

    // 4. Update Agency Subscription
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

    const txId = `TX-CPN-${cleanCode}-${Math.random().toString(36).substr(2, 7).toUpperCase()}`;

    const txHistoryEntry = {
      id: txId,
      type: 'plan-change',
      description: `Upgraded to ${targetPlan.toUpperCase()} Plan (100% Coupon: ${cleanCode})`,
      amount: targetPlan,
      amountPaid: 0,
      discountAmount: orig,
      couponCode: cleanCode,
      timestamp: Date.now()
    };

    await agencyRef.update({
      plan: targetPlan,
      listingLimit: maxListings,
      credits: initCredits,
      creditHistory: FieldValue.arrayUnion(txHistoryEntry)
    });

    // 5. Save to top-level transactions collection
    await db.collection('transactions').add({
      agencyId,
      agencyName: agencyData?.companyName || agencyData?.name || '',
      type: 'plan-upgrade-free-coupon',
      description: `100% Discount Plan Upgrade to ${targetPlan.toUpperCase()} via ${cleanCode}`,
      plan: targetPlan,
      amountPaid: 0,
      discountAmount: orig,
      couponCode: cleanCode,
      timestamp: Date.now(),
      status: 'success'
    });

    // 6. Update Coupon Document
    const redemptionEntry = {
      agencyId,
      agencyName: agencyData?.companyName || agencyData?.name || agencyData?.email || 'Agency',
      plan: targetPlan,
      discountAmount: orig,
      amountPaid: 0,
      timestamp: Date.now()
    };

    await couponDoc.ref.update({
      usedCount: FieldValue.increment(1),
      redemptions: FieldValue.arrayUnion(redemptionEntry)
    });

    return NextResponse.json({
      success: true,
      message: `Plan updated to ${targetPlan.toUpperCase()} successfully with coupon!`,
      plan: targetPlan
    });
  } catch (error: any) {
    console.error('Error applying free coupon:', error);
    return NextResponse.json({ error: error.message || 'Failed to apply free plan coupon' }, { status: 500 });
  }
}
