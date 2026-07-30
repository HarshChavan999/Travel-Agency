import { NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { initializeFirebase } from '@/lib/auth';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-static';

const REVIEWS_FILE = path.join(process.cwd(), 'data', 'reviews.json');

function getLocalReviews(): any[] {
  try {
    if (fs.existsSync(REVIEWS_FILE)) {
      const content = fs.readFileSync(REVIEWS_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.error('Error reading local reviews file:', err);
  }
  return [];
}

function saveLocalReview(review: any) {
  try {
    const dir = path.dirname(REVIEWS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const current = getLocalReviews();
    current.unshift(review);
    fs.writeFileSync(REVIEWS_FILE, JSON.stringify(current, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving local review:', err);
  }
}

export async function GET(request: Request) {
  let listingId: string | null = null;
  try {
    const { searchParams } = new URL(request.url);
    listingId = searchParams.get('listingId');

    if (!listingId) {
      return NextResponse.json({ reviews: [] });
    }

    const localReviews = getLocalReviews().filter((r: any) => String(r.listingId) === String(listingId));

    let remoteReviews: any[] = [];
    try {
      initializeFirebase();
      const db = admin.firestore();
      const snapshot = await db.collection('reviews').where('listingId', '==', String(listingId)).get();
      snapshot.forEach(doc => {
        remoteReviews.push({ id: doc.id, ...doc.data() });
      });
    } catch (adminError) {
      console.warn('Firebase Admin GET reviews fallback:', adminError);
    }

    // Merge remote and local reviews, deduplicating by ID
    const reviewMap = new Map<string, any>();
    [...localReviews, ...remoteReviews].forEach(r => {
      if (r && r.id) reviewMap.set(r.id, r);
    });

    return NextResponse.json({ reviews: Array.from(reviewMap.values()) });
  } catch (error) {
    console.error('Exception in GET /api/reviews:', error);
    const fallbackLocal = listingId ? getLocalReviews().filter((r: any) => String(r.listingId) === String(listingId)) : [];
    return NextResponse.json({ reviews: fallbackLocal });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { listingId, name, travelledFrom, rating, tripType, comment, photos } = body;

    if (!listingId || !comment) {
      return NextResponse.json({ error: 'listingId and comment are required' }, { status: 400 });
    }

    const reviewId = `rev-${Date.now()}`;
    const reviewData = {
      id: reviewId,
      listingId: String(listingId),
      name: String(name || 'Verified Traveller'),
      travelledFrom: String(travelledFrom || ''),
      rating: Number(rating) || 5.0,
      tripType: String(tripType || 'Family'),
      comment: String(comment),
      photos: Array.isArray(photos) ? photos : [],
      createdAt: new Date().toISOString()
    };

    // 1. Save to local persistent storage (guarantees reviews stay on refresh)
    saveLocalReview(reviewData);

    // 2. Also attempt saving to Firestore
    try {
      initializeFirebase();
      const db = admin.firestore();
      await db.collection('reviews').doc(reviewId).set(reviewData);
    } catch (adminError) {
      console.warn('Firebase Admin POST review fallback used local disk:', adminError);
    }

    return NextResponse.json({ success: true, review: reviewData });
  } catch (error) {
    console.error('Exception in POST /api/reviews:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
