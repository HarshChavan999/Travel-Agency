import { NextResponse } from 'next/server';
import { initializeFirebase } from '@/lib/auth';
import { getFirestore } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { code, targetPlan, originalAmount } = await req.json();

    if (!code || !targetPlan || originalAmount === undefined) {
      return NextResponse.json({ error: 'Coupon code, target plan, and original amount are required.' }, { status: 400 });
    }

    const cleanCode = code.trim().toUpperCase();

    initializeFirebase();
    const db = getFirestore();

    const snapshot = await db.collection('coupons').where('code', '==', cleanCode).get();

    if (snapshot.empty) {
      return NextResponse.json({ valid: false, error: 'Invalid coupon code.' }, { status: 404 });
    }

    const doc = snapshot.docs[0];
    const coupon = { id: doc.id, ...doc.data() } as any;

    // Validation 1: Is Active
    if (!coupon.isActive) {
      return NextResponse.json({ valid: false, error: 'This coupon code is currently inactive.' }, { status: 400 });
    }

    const now = Date.now();

    // Validation 2: Valid From
    const validFrom = coupon.validFrom;
    if (validFrom && new Date(validFrom).getTime() > now) {
      return NextResponse.json({ valid: false, error: 'This coupon is not valid yet.' }, { status: 400 });
    }

    // Validation 3: Valid Until (Expiry)
    const validUntil = coupon.validUntil || coupon.expiryDate;
    if (validUntil && new Date(validUntil).getTime() < now) {
      return NextResponse.json({ valid: false, error: 'This coupon code has expired.' }, { status: 400 });
    }

    // Validation 4: Usage Limit
    const usageLimit = coupon.usageLimit ?? coupon.maxUses;
    if (usageLimit !== null && usageLimit !== undefined && (coupon.usedCount || 0) >= usageLimit) {
      return NextResponse.json({ valid: false, error: 'This coupon code has reached its maximum usage limit.' }, { status: 400 });
    }

    // Validation 5: Minimum Order Amount
    const minOrder = coupon.minOrderAmount ?? coupon.minPurchaseAmount ?? 0;
    if (minOrder && Number(originalAmount) < minOrder) {
      return NextResponse.json({
        valid: false,
        error: `Minimum plan amount of ₹${minOrder.toLocaleString('en-IN')} required to apply this coupon.`
      }, { status: 400 });
    }

    // Validation 6: Applicable Plans
    const allowedPlans = coupon.applicablePlans || (coupon.targetPlan ? [coupon.targetPlan] : ['all']);
    if (!allowedPlans.includes('all') && !allowedPlans.includes(targetPlan)) {
      return NextResponse.json({
        valid: false,
        error: `This coupon is not applicable for the ${targetPlan.toUpperCase()} plan.`
      }, { status: 400 });
    }

    // Calculate discount
    let discountAmount = 0;
    const orig = Number(originalAmount);

    if (coupon.discountType === 'percentage') {
      const calculated = (orig * Number(coupon.discountValue)) / 100;
      if (coupon.maxDiscount && coupon.maxDiscount > 0) {
        discountAmount = Math.min(calculated, Number(coupon.maxDiscount));
      } else {
        discountAmount = calculated;
      }
    } else if (coupon.discountType === 'fixed' || coupon.discountType === 'flat') {
      discountAmount = Math.min(orig, Number(coupon.discountValue));
    }

    discountAmount = Math.round(discountAmount * 100) / 100;
    const finalAmount = Math.max(0, Math.round((orig - discountAmount) * 100) / 100);

    return NextResponse.json({
      valid: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue
      },
      originalAmount: orig,
      discountAmount,
      finalAmount
    });
  } catch (error: any) {
    console.error('Error validating coupon:', error);
    return NextResponse.json({ error: error.message || 'Failed to validate coupon' }, { status: 500 });
  }
}
