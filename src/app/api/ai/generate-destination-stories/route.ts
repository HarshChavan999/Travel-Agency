import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { parseFirestoreDocument } from '@/lib/firestoreParser';

export const dynamic = 'force-dynamic';

async function fetchLiveListings(limitCount: number = 20) {
  try {
    const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'travel-agent-management-29c27';
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery`;
    
    const query = {
      structuredQuery: {
        from: [{ collectionId: "listings" }],
        where: {
          fieldFilter: {
            field: { fieldPath: "approved" },
            op: "EQUAL",
            value: { booleanValue: true }
          }
        },
        limit: Math.max(5, Math.min(limitCount, 50))
      }
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(query),
      cache: 'no-store'
    });

    if (!res.ok) {
      console.error("Error fetching live listings for AI stories:", await res.text());
      return [];
    }

    const data = await res.json();
    return data
      .filter((item: any) => item.document)
      .map((item: any) => parseFirestoreDocument(item.document));
  } catch (err) {
    console.error("Failed fetching listings for AI stories:", err);
    return [];
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      packagesCount = 15,
      storiesCount = 3,
      seoKeywords = '',
      customApiKey = '',
      stateFilter = ''
    } = body;

    // Use dedicated stories key first, then custom key if provided, then standard fallback
    const apiKey = customApiKey || process.env.GEMINI_STORIES_API_KEY || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'Gemini Stories API Key is not configured. Please set GEMINI_STORIES_API_KEY in .env.local or enter a key in admin.' },
        { status: 500 }
      );
    }

    // 1. Fetch live active packages
    let livePackages = await fetchLiveListings(packagesCount);

    if (stateFilter && stateFilter.trim() !== '') {
      const cleanFilter = stateFilter.trim().toLowerCase();
      livePackages = livePackages.filter((p: any) => 
        p.stateName?.toLowerCase().includes(cleanFilter) ||
        p.stateNames?.some((s: string) => s.toLowerCase().includes(cleanFilter))
      );
    }

    if (!livePackages || livePackages.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No active live travel packages were found in database to generate stories.' },
        { status: 400 }
      );
    }

    // 2. Prepare concise summary of live packages for prompt
    const packageSummaries = livePackages.map((p: any) => {
      const price = p.cost || p.price || 0;
      const places = Array.isArray(p.placesCovered)
        ? p.placesCovered.map((pl: any) => pl?.name || pl).filter(Boolean).join(', ')
        : '';
      const state = p.stateName || (Array.isArray(p.stateNames) ? p.stateNames[0] : 'India');
      const tourTypes = Array.isArray(p.tourCategories) ? p.tourCategories.join(', ') : (p.experienceType || '');
      const coverImg = p.placesCovered?.[0]?.imageUrls?.[0] || p.photos?.[0] || p.itinerary?.[0]?.imageUrl || '';

      return {
        id: p.id,
        title: p.title || p.packageTitle || 'Travel Package',
        state,
        price,
        duration: p.duration || 'N/A',
        places,
        tourTypes,
        coverImg
      };
    });

    const genAI = new GoogleGenerativeAI(apiKey);
    const today = new Date().toISOString().split('T')[0];

    const prompt = `
You are a SENIOR TRAVEL JOURNALIST and GOOGLE EEAT CONTENT EXPERT with 15 years of experience writing high-converting destination guides for Lonely Planet, Condé Nast Traveler, and TripAdvisor.

YOUR MISSION:
Analyze the following ${packageSummaries.length} real live travel packages and generate ${storiesCount} distinct, deeply engaging, SEO-optimized "Destination Stories".

TARGET SEO KEYWORDS / THEME FOCUS:
${seoKeywords ? seoKeywords : 'High demand travel destinations, trending itineraries, budget & luxury vacation packages'}

LIVE PACKAGES DATA AVAILABLE:
${JSON.stringify(packageSummaries, null, 2)}

STRICT RULES FOR PROSE & CONTENT:
1. Each story must focus on a key State/Region represented in the live packages (e.g. Kashmir, Kerala, Himachal Pradesh, Rajasthan, Goa, Ladakh, Sikkim, Meghalaya, etc.).
2. Title ("title"): An irresistible, click-worthy SEO headline (50-75 chars) tailored for Google search intent.
3. Narrative ("narrative"): Must be an AUTHENTIC, IMMERSIVE 2-3 PARAGRAPH TRAVEL STORY (approx 150-250 words total).
   - Paragraph 1: Authentic traveler's opening hook introducing the landscape, atmosphere, and signature experience.
   - Paragraph 2: Real travel highlights, specific place names, local food, culture, and key activities.
   - Paragraph 3: Practical travel advice, best season/months to visit, airport/station connectivity, and a natural call to action.
   - STRICT PROSE CONSTRAINT: Write grounded, human, expert travel prose. DO NOT use overly poetic or AI clichés ("breathes softly", "nestled", "tapestry", "delve", "vibrant", "bustling", "symphony", "serenade").
   - Separate paragraphs cleanly using "\\n\\n".
4. "seoKeywords": Provide 4-6 clean search keyword phrases in plain text (no # hashtags) for backend indexing.
5. "discoveredPlaces": 4-6 specific places extracted from the package data.
6. "experienceTags": 3-5 experience badges.
7. "coverImage": Select the best valid image URL from the corresponding state's packages.
8. "featuredPackageIds": Array of package IDs that belong to this story.

Return ONLY a valid JSON array of ${storiesCount} story objects with this EXACT structure:
[
  {
    "id": "story-${today}-state-slug",
    "stateName": "State or Destination Name",
    "title": "SEO Optimized Catchy Headline",
    "narrative": "Paragraph 1: Immersive opening story hook...\\n\\nParagraph 2: Key places, activities, and local experiences...\\n\\nParagraph 3: Practical travel advice and booking recommendation.",
    "seoKeywords": ["destination tour packages", "best places to visit", "family vacation guide"],
    "discoveredPlaces": ["Place 1", "Place 2", "Place 3"],
    "experienceTags": ["Boating", "Trekking", "Heritage Walk"],
    "packageCount": 3,
    "coverImage": "https://... (valid image URL from provided package summaries, or empty if none)",
    "featuredPackageIds": ["pkg_id_1", "pkg_id_2"],
    "published": true,
    "createdAt": "${new Date().toISOString()}"
  }
]
`;

    const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

    // Try Gemini models with exponential fallback retry
    const tryModels = [
      'gemini-pro-latest', 'gemini-flash-latest', 'gemini-flash-lite-latest'
    ];

    let generatedText = '';
    let usedModel = '';
    let lastError: any = null;

    for (const modelName of tryModels) {
      let attempts = 0;
      const maxAttempts = 2;
      
      while (attempts < maxAttempts) {
        try {
          attempts++;
          console.log(`[Destination Stories AI] Trying model: ${modelName} (Attempt ${attempts})`);
          const model = genAI.getGenerativeModel({
            model: modelName,
            generationConfig: {
              temperature: 0.7,
              topK: 40,
              topP: 0.95,
              responseMimeType: 'application/json'
            }
          });

          const result = await model.generateContent(prompt);
          generatedText = result.response.text();
          usedModel = modelName;
          console.log(`[Destination Stories AI] Success with model: ${modelName}`);
          break;
        } catch (err: any) {
          console.warn(`[Destination Stories AI] Model ${modelName} (Attempt ${attempts}) failed:`, err.message);
          lastError = err;
          
          if (err.message?.includes('503') || err.message?.includes('429') || err.message?.includes('high demand')) {
            await delay(1500 * attempts);
          } else {
            break;
          }
        }
      }

      if (generatedText) break;
    }

    if (!generatedText) {
      return NextResponse.json(
        {
          success: false,
          error: `Failed to generate destination stories: ${lastError?.message || 'AI service unavailable'}`
        },
        { status: 500 }
      );
    }

    // Parse JSON
    let stories = [];
    try {
      stories = JSON.parse(generatedText);
    } catch (parseErr) {
      // Clean up markdown fences if present
      const cleanJson = generatedText.replace(/```json\n?|\n?```/g, '').trim();
      stories = JSON.parse(cleanJson);
    }

    return NextResponse.json({
      success: true,
      stories,
      usedModel,
      packageCountAnalyzed: livePackages.length
    });
  } catch (error: any) {
    console.error('Error generating destination stories:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
