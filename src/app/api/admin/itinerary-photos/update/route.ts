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

    // Keep placesCovered and front thumbnail in sync
    if (Array.isArray(listingData.placesCovered)) {
      const placesCovered = listingData.placesCovered.map((p: any) => ({ ...p }));
      const targetPlaceName = (placeName || currentDay.placeName || '').trim().toLowerCase();
      let changed = false;

      if (finalImageUrls.length > 0) {
        // Adding / Updating photo
        if (targetPlaceName) {
          for (let i = 0; i < placesCovered.length; i++) {
            const p = placesCovered[i];
            if (p.name && p.name.trim().toLowerCase() === targetPlaceName) {
              placesCovered[i] = {
                ...p,
                imageUrls: finalImageUrls
              };
              changed = true;
            }
          }
        }
        // If Day 1, update front thumbnail
        if (targetIndex === 0 && placesCovered.length > 0) {
          placesCovered[0] = {
            ...placesCovered[0],
            imageUrls: finalImageUrls
          };
          changed = true;
        }
      } else {
        // Removing / Deleting photo
        const oldDayUrls = [
          ...(currentDay.imageUrls || []),
          currentDay.imageUrl || ''
        ].filter(Boolean);

        for (let i = 0; i < placesCovered.length; i++) {
          const p = placesCovered[i];
          const isNameMatch = targetPlaceName && p.name && p.name.trim().toLowerCase() === targetPlaceName;
          let pUrls: string[] = Array.isArray(p.imageUrls) ? [...p.imageUrls] : [];

          if (isNameMatch) {
            pUrls = [];
            changed = true;
          } else if (oldDayUrls.length > 0) {
            const prevLen = pUrls.length;
            pUrls = pUrls.filter(u => !oldDayUrls.some(ou => ou.split('?')[0].toLowerCase() === u.split('?')[0].toLowerCase()));
            if (pUrls.length !== prevLen) changed = true;
          }

          placesCovered[i] = { ...p, imageUrls: pUrls };
        }

        // If front thumbnail was affected, sync with next available itinerary photo
        if (targetIndex === 0 && placesCovered.length > 0) {
          let nextValidPhoto: string | null = null;
          for (const day of itinerary) {
            const dUrls = Array.isArray(day.imageUrls) ? day.imageUrls : day.imageUrl ? [day.imageUrl] : [];
            if (dUrls.length > 0) {
              nextValidPhoto = dUrls[0];
              break;
            }
          }
          placesCovered[0] = {
            ...placesCovered[0],
            imageUrls: nextValidPhoto ? [nextValidPhoto] : []
          };
          changed = true;
        }
      }

      if (changed) {
        updatePayload.placesCovered = placesCovered;
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
