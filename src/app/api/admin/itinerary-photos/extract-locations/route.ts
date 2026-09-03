import { NextResponse } from 'next/server';
import { extractLocationsWithAI } from '@/lib/locationExtractor';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { description, placeTitle, destinationHint, packageTitle } = await req.json();

    if (!description && !placeTitle) {
      return NextResponse.json({ error: 'Description or placeTitle is required' }, { status: 400 });
    }

    const locations = await extractLocationsWithAI(
      description || '',
      placeTitle || '',
      destinationHint || '',
      packageTitle || ''
    );

    return NextResponse.json({
      success: true,
      locations,
      count: locations.length
    });
  } catch (error: any) {
    console.error('Error extracting itinerary locations:', error);
    return NextResponse.json({ error: error.message || 'Failed to extract locations' }, { status: 500 });
  }
}
