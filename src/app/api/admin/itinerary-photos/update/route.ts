import { NextResponse } from 'next/server';
import { initializeFirebase } from '@/lib/auth';
import { getFirestore } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      listingId,
      dayIndex,
      dayId,
      imageUrl,
      imageUrls,
      imageAttribution,
      updateMatchingPlaceCovered = false,
      placeName = ''
    } = body;

    const finalImageUrls: string[] = Array.isArray(imageUrls)
      ? imageUrls.filter(Boolean)
      : imageUrl
      ? [imageUrl]
      : [];

    const primaryImageUrl = finalImageUrls[0] || imageUrl || '';

    if (!listingId) {
      return NextResponse.json({ error: 'Missing required parameter: listingId' }, { status: 400 });
    }

    initializeFirebase();
    const db = getFirestore();
    const listingRef = db.collection('listings').doc(listingId);
    const listingDoc = await listingRef.get();

    if (!listingDoc.exists) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    const listingData = listingDoc.data() || {};
    let itinerary = Array.isArray(listingData.itinerary) ? [...listingData.itinerary] : [];

    // Find the target day either by dayId or by dayIndex
    let targetIndex = -1;
    if (dayId) {
      targetIndex = itinerary.findIndex((d: any) => d.id === dayId);
    }
    if (targetIndex === -1 && typeof dayIndex === 'number' && dayIndex >= 0 && dayIndex < itinerary.length) {
      targetIndex = dayIndex;
    }

    if (targetIndex === -1) {
      return NextResponse.json({ error: 'Itinerary day not found at specified index or id' }, { status: 404 });
    }

    // Update the itinerary day
    const currentDay = itinerary[targetIndex];
    itinerary[targetIndex] = {
      ...currentDay,
      imageUrl: primaryImageUrl,
      imageUrls: finalImageUrls,
      ...(imageAttribution ? { imageAttribution } : {})
    };

    const updatePayload: Record<string, any> = {
      itinerary: itinerary,
      updatedAt: new Date()
    };

    // Optionally update matching place in placesCovered if image is currently missing
    if (updateMatchingPlaceCovered && Array.isArray(listingData.placesCovered) && imageUrl) {
      const placesCovered = [...listingData.placesCovered];
      const targetPlaceName = (placeName || currentDay.placeName || '').trim().toLowerCase();

      if (targetPlaceName) {
        let changed = false;
        for (let i = 0; i < placesCovered.length; i++) {
          const p = placesCovered[i];
          if (p.name && p.name.trim().toLowerCase() === targetPlaceName) {
            if (!p.imageUrls || p.imageUrls.length === 0) {
              placesCovered[i] = {
                ...p,
                imageUrls: [imageUrl]
              };
              changed = true;
            }
          }
        }
        if (changed) {
          updatePayload.placesCovered = placesCovered;
        }
      }
    }

    await listingRef.update(updatePayload);

    return NextResponse.json({
      success: true,
      message: 'Itinerary photo updated successfully',
      updatedItinerary: itinerary
    });
  } catch (error: any) {
    console.error('Error updating itinerary photo:', error);
    return NextResponse.json({ error: error.message || 'Failed to update itinerary photo' }, { status: 500 });
  }
}
