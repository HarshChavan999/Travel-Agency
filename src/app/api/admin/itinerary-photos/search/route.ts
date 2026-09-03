import { NextResponse } from 'next/server';
import { searchWikimediaImages } from '@/lib/wikipediaCommons';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q') || '';
    const destination = searchParams.get('destination') || '';
    const limit = parseInt(searchParams.get('limit') || '24', 10);

    if (!query && !destination) {
      return NextResponse.json({ error: 'Search query or destination is required.' }, { status: 400 });
    }

    const images = await searchWikimediaImages(query, {
      destination,
      limit,
      width: 1000,
      includeWikipediaLead: true
    });

    return NextResponse.json({ images, count: images.length });
  } catch (error: any) {
    console.error('Error searching Wikimedia images:', error);
    return NextResponse.json({ error: error.message || 'Failed to search images' }, { status: 500 });
  }
}
