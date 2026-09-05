import { NextResponse } from 'next/server';
import { initializeFirebase } from '@/lib/auth';
import { getFirestore } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    initializeFirebase();
    const db = getFirestore();

    const snapshot = await db.collection('coupons').orderBy('createdAt', 'desc').get();
    const coupons: any[] = [];
    
    snapshot.forEach((doc) => {
      coupons.push({
        id: doc.id,
        ...doc.data()
      });
    });

    return NextResponse.json({ coupons });
  } catch (error: any) {
    console.error('Error fetching admin coupons:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch coupons' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const {
      code,
      discountType,
      discountValue,
      maxDiscount,
      minOrderAmount,
      applicablePlans,
      usageLimit,
      validFrom,
      validUntil,
      isActive = true
    } = data;

    if (!code || !discountType || discountValue === undefined) {
      return NextResponse.json({ error: 'Code, discount type, and discount value are required.' }, { status: 400 });
    }

    const cleanCode = code.trim().toUpperCase();

    initializeFirebase();
    const db = getFirestore();

    // Check if code already exists
    const existing = await db.collection('coupons').where('code', '==', cleanCode).get();
    if (!existing.empty) {
      return NextResponse.json({ error: `Coupon code '${cleanCode}' already exists.` }, { status: 400 });
    }

    const newCoupon = {
      code: cleanCode,
      discountType, // 'percentage' | 'fixed'
      discountValue: Number(discountValue),
      maxDiscount: maxDiscount ? Number(maxDiscount) : null,
      minOrderAmount: minOrderAmount ? Number(minOrderAmount) : 0,
      applicablePlans: Array.isArray(applicablePlans) && applicablePlans.length > 0 ? applicablePlans : ['all'],
      usageLimit: usageLimit ? Number(usageLimit) : null,
      usedCount: 0,
      validFrom: validFrom || null,
      validUntil: validUntil || null,
      isActive: Boolean(isActive),
      createdAt: Date.now(),
      redemptions: []
    };

    const docRef = await db.collection('coupons').add(newCoupon);

    return NextResponse.json({
      success: true,
      coupon: {
        id: docRef.id,
        ...newCoupon
      }
    });
  } catch (error: any) {
    console.error('Error creating coupon:', error);
    return NextResponse.json({ error: error.message || 'Failed to create coupon' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const { id, ...updates } = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'Coupon ID is required for update.' }, { status: 400 });
    }

    initializeFirebase();
    const db = getFirestore();

    const couponRef = db.collection('coupons').doc(id);
    const snap = await couponRef.get();

    if (!snap.exists) {
      return NextResponse.json({ error: 'Coupon not found.' }, { status: 404 });
    }

    const payload: any = {};
    if (updates.code !== undefined) payload.code = updates.code.trim().toUpperCase();
    if (updates.discountType !== undefined) payload.discountType = updates.discountType;
    if (updates.discountValue !== undefined) payload.discountValue = Number(updates.discountValue);
    if (updates.maxDiscount !== undefined) payload.maxDiscount = updates.maxDiscount ? Number(updates.maxDiscount) : null;
    if (updates.minOrderAmount !== undefined) payload.minOrderAmount = Number(updates.minOrderAmount);
    if (updates.applicablePlans !== undefined) payload.applicablePlans = updates.applicablePlans;
    if (updates.usageLimit !== undefined) payload.usageLimit = updates.usageLimit ? Number(updates.usageLimit) : null;
    if (updates.validFrom !== undefined) payload.validFrom = updates.validFrom || null;
    if (updates.validUntil !== undefined) payload.validUntil = updates.validUntil || null;
    if (updates.isActive !== undefined) payload.isActive = Boolean(updates.isActive);

    await couponRef.update(payload);

    return NextResponse.json({ success: true, id, updates: payload });
  } catch (error: any) {
    console.error('Error updating coupon:', error);
    return NextResponse.json({ error: error.message || 'Failed to update coupon' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Coupon ID parameter is required' }, { status: 400 });
    }

    initializeFirebase();
    const db = getFirestore();

    await db.collection('coupons').doc(id).delete();

    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    console.error('Error deleting coupon:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete coupon' }, { status: 500 });
  }
}
