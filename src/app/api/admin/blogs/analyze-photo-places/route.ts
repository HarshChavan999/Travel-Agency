import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const dynamic = 'force-dynamic';

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'travel-agent-management-29c27';

// Strict Blacklist of non-place English words, guide verbs, and noise tokens
const NON_PLACE_WORDS = new Set([
  'think', 'thinking', 'thought', 'why', 'what', 'when', 'where', 'which', 'who', 'whom', 'whose', 'how',
  'how to', 'use', 'using', 'used', 'instead', 'instead of', 'honest', 'reality', 'check', 'checking',
  'online', 'offline', 'book', 'booking', 'booked', 'agency', 'agencies', 'agent', 'agents',
  'difference', 'differences', 'compare', 'comparing', 'comparison', 'versus', 'vs',
  'better', 'best', 'worst', 'pros', 'cons', 'benefits', 'advantage', 'advantages', 'disadvantage', 'disadvantages',
  'tips', 'tip', 'tricks', 'trick', 'hacks', 'hack', 'secrets', 'secret', 'mistakes', 'mistake', 'rules', 'rule',
  'guide', 'guides', 'guidelines', 'guideline', 'review', 'reviews', 'rating', 'ratings',
  'cost', 'costs', 'budget', 'budgets', 'price', 'prices', 'pricing', 'cheap', 'expensive', 'affordable',
  'money', 'save', 'saving', 'plan', 'planning', 'planner', 'plans', 'itinerary', 'itineraries',
  'package', 'packages', 'deal', 'deals', 'offer', 'offers', 'advice', 'option', 'options',
  'reason', 'reasons', 'things', 'thing', 'places', 'place', 'visit', 'visiting', 'visited',
  'travel', 'travelling', 'traveling', 'traveler', 'travelers', 'traveller', 'travellers',
  'trip', 'trips', 'tour', 'tours', 'tourism', 'holiday', 'holidays', 'vacation', 'vacations',
  'experience', 'experiences', 'destination', 'destinations', 'overview', 'summary', 'introduction',
  'conclusion', 'faq', 'faqs', 'question', 'questions', 'answer', 'answers', 'essential', 'essentials',
  'complete', 'ultimate', 'definitive', 'conquering', 'simple', 'easy', 'step', 'steps', 'season', 'seasons',
  'weather', 'climate', 'month', 'months', 'year', 'years', '2024', '2025', '2026', '2027', '2028', '2029', '2030',
  'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december',
  'spring', 'summer', 'monsoon', 'autumn', 'winter', 'hotel', 'hotels', 'resort', 'resorts', 'stay', 'staying',
  'accommodation', 'accommodations', 'flight', 'flights', 'train', 'trains', 'bus', 'buses', 'taxi', 'taxis',
  'cab', 'cabs', 'car', 'cars', 'rental', 'rentals', 'insurance', 'safety', 'safe', 'secure', 'danger',
  'dangerous', 'warning', 'warnings', 'permit', 'permits', 'visa', 'visas', 'passport', 'passports',
  'packing', 'pack', 'luggage', 'baggage', 'clothes', 'clothing', 'wear', 'wearing', 'dress', 'food',
  'foodie', 'dishes', 'cuisine', 'eat', 'eating', 'drink', 'drinks', 'shopping', 'souvenir', 'souvenirs',
  'scam', 'scams', 'avoid', 'avoiding', 'dos', 'donts', 'culture', 'etiquette', 'customs', 'language',
  'internet', 'sim', 'wifi', 'currency', 'exchange', 'atm', 'cards', 'cash', 'emergency', 'help',
  'explore', 'exploring', 'discover', 'discovering', 'conquer', 'adventure', 'adventures', 'trek', 'treks',
  'valley', 'lake', 'falls', 'temple', 'peak', 'glacier', 'mountain', 'hill', 'river', 'beach', 'island', 'fort'
]);

export function isValidPlaceChip(name: string): boolean {
  if (!name || typeof name !== 'string') return false;
  const clean = name.trim().replace(/^[\s,.\-–—:|()?!"]+|[\s,.\-–—:|()?!"]+$/g, '');
  if (clean.length < 3) return false;

  // Discard if contains sentence punctuation, question marks, or comparison phrases
  if (clean.includes('?') || clean.includes('!') || clean.includes(' vs ') || clean.includes(' versus ')) {
    return false;
  }

  const lower = clean.toLowerCase();

  // Direct blacklist match
  if (NON_PLACE_WORDS.has(lower)) return false;

  // Single word checks
  const words = clean.split(/\s+/);
  if (words.length === 1 && NON_PLACE_WORDS.has(words[0].toLowerCase())) {
    return false;
  }

  // Check if every word in a multi-word phrase is noise
  const allNoise = words.every(w => NON_PLACE_WORDS.has(w.toLowerCase()) || w.length <= 2);
  if (allNoise) return false;

  // Discard conversational phrases and headlines
  if (
    lower.startsWith('why ') ||
    lower.startsWith('how to ') ||
    lower.startsWith('how ') ||
    lower.startsWith('is ') ||
    lower.startsWith('should you ') ||
    lower.startsWith('what is ') ||
    lower.startsWith('what ') ||
    lower.startsWith('where to ') ||
    lower.startsWith('when to ') ||
    lower.startsWith('explore ') ||
    lower.startsWith('exploring ') ||
    lower.startsWith('discover ') ||
    lower.startsWith('discovering ') ||
    lower.includes('instead of') ||
    lower.includes('reality check') ||
    lower.includes('honest review') ||
    lower.includes('everything you need') ||
    lower.includes('complete guide to')
  ) {
    return false;
  }

  return true;
}

/**
 * Returns curated high-aesthetic photography keywords for conceptual/editorial travel articles
 */
export function getConceptualTravelThemes(title: string, category: string = ''): Array<{ name: string; query: string }> {
  const t = `${title} ${category}`.toLowerCase();

  if (t.includes('agency') || t.includes('agent') || t.includes('booking') || t.includes('online')) {
    return [
      { name: 'Travel Planning', query: 'Travel Planning' },
      { name: 'Vacation Planning', query: 'Vacation Planning' },
      { name: 'Travel Luggage', query: 'Travel Luggage' },
      { name: 'Airplane Travel', query: 'Airplane Travel' }
    ];
  }

  if (t.includes('packing') || t.includes('clothes') || t.includes('luggage') || t.includes('backpack')) {
    return [
      { name: 'Travel Suitcase', query: 'Travel Suitcase Packing' },
      { name: 'Travel Backpack', query: 'Travel Backpack Luggage' },
      { name: 'Travel Planning', query: 'Travel Planning' }
    ];
  }

  if (t.includes('budget') || t.includes('cost') || t.includes('cheap') || t.includes('money') || t.includes('save')) {
    return [
      { name: 'Travel Planning', query: 'Travel Planning' },
      { name: 'Backpacker Travel', query: 'Backpacker Map Travel' },
      { name: 'Airplane Window', query: 'Airplane Window View' }
    ];
  }

  if (t.includes('solo') || t.includes('safety') || t.includes('safe') || t.includes('female')) {
    return [
      { name: 'Solo Traveler', query: 'Solo Traveler Scenic View' },
      { name: 'Travel Backpacking', query: 'Backpacker Mountain Landscape' },
      { name: 'Scenic Viewpoint', query: 'Scenic Mountain Viewpoint' }
    ];
  }

  if (t.includes('flight') || t.includes('airport') || t.includes('airline') || t.includes('ticket')) {
    return [
      { name: 'Airplane Flight', query: 'Airplane Wing Sky' },
      { name: 'Airport Travel', query: 'Airport Travel Departure' },
      { name: 'Passport & Ticket', query: 'Passport Boarding Pass Travel' }
    ];
  }

  if (t.includes('hotel') || t.includes('resort') || t.includes('stay') || t.includes('room')) {
    return [
      { name: 'Luxury Resort', query: 'Luxury Resort Pool View' },
      { name: 'Boutique Hotel', query: 'Boutique Hotel Room Landscape' },
      { name: 'Resort View', query: 'Resort Ocean Mountain' }
    ];
  }

  if (t.includes('food') || t.includes('cuisine') || t.includes('eat') || t.includes('dining')) {
    return [
      { name: 'Travel Dining', query: 'Local Street Food Travel' },
      { name: 'Traditional Cuisine', query: 'Traditional Cuisine Feast' }
    ];
  }

  return [
    { name: 'Travel Planning', query: 'Travel Planning' },
    { name: 'Scenic Landscape', query: 'Scenic Travel Landscape Mountains' },
    { name: 'Vacation View', query: 'Beautiful Vacation View' },
    { name: 'Travel Adventure', query: 'Travel Adventure Scenic' }
  ];
}

function extractBlogPlacesHeuristic(
  title: string,
  excerpt: string = '',
  content: string = '',
  category: string = ''
): Array<{ name: string; query: string }> {
  const placesMap = new Map<string, string>(); // lowerName -> formattedName

  const addPlace = (name: string, query?: string) => {
    if (!isValidPlaceChip(name)) return;
    const clean = name.trim().replace(/^[\s,.\-–—:|()]+|[\s,.\-–—:|()]+$/g, '');
    const lower = clean.toLowerCase();
    if (!placesMap.has(lower)) {
      placesMap.set(lower, query || clean);
    }
  };

  const rawTitle = title.replace(/\s+/g, ' ').trim();

  // Pattern 1: Landmark before Travel Guide (e.g. "Betaab Valley Travel Guide 2026", "Thajiwas Glacier Travel Guide")
  const landmarkGuideMatch = rawTitle.match(/^([A-Za-z\s]+?)\s+(?:Travel Guide|Trek Guide|Complete Guide|Tour Guide|Safari Guide|Temple Guide|City Guide|Guide)/i);
  if (landmarkGuideMatch && landmarkGuideMatch[1]) {
    addPlace(landmarkGuideMatch[1]);
  }

  // Pattern 2: Best Places to Visit in <Place> / Things to do in <Place>
  const inPlaceMatch = rawTitle.match(/(?:Places to Visit in|Things to Do in|How to Reach|Where to Stay in|Hidden Places Near|What to Wear in|Pony Ride in|River Rafting in|Best Time to Visit|Things to Know Before Visiting|Hotels in|Photography Spots in|Itinerary for|Adventure Activities in)\s+([A-Za-z\s]+?)(?:\s*\d{4}|\s*\(|\s*:|\s*-|\s*\||$)/i);
  if (inPlaceMatch && inPlaceMatch[1]) {
    addPlace(inPlaceMatch[1]);
  }

  // Pattern 3: <Place> 2-Day Itinerary / <Place> Trip Cost
  const itineraryMatch = rawTitle.match(/^([A-Za-z\s]+?)\s+(?:\d+[-–\s]*Day\s+Itinerary|Trip Cost|Budget Breakdown|Travel Budget|Road Trip|Tour Packages)/i);
  if (itineraryMatch && itineraryMatch[1]) {
    addPlace(itineraryMatch[1]);
  }

  // Pattern 4: Comparison <Place1> vs <Place2>
  if (rawTitle.toLowerCase().includes(' vs ') || rawTitle.toLowerCase().includes(' versus ')) {
    const parts = rawTitle.split(/\s+vs\.?\s+|\s+versus\s+/i);
    if (parts.length >= 2) {
      addPlace(parts[0].replace(/^(?:Which Is Better:?|Best Places in)\s+/i, ''));
      addPlace(parts[1].replace(/[\?:].*$/i, ''));
    }
  }

  // Pattern 5: Extract specific landmark phrases with real geographical suffixes
  const fullText = `${title}. ${excerpt}. ${(content || '').slice(0, 2000)}`;
  const landmarkRegex = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:Valley|Lake|Glacier|Pass|Peak|Falls|Waterfall|Waterfalls|Temple|Mandir|Ghat|Fort|Palace|Beach|Beaches|National Park|Tiger Reserve|Sanctuary|Gardens|Houseboat|Caves|Island|Ropeway|Gondola|Meadow|Trek|Point|Viewpoint|River|Monastery|Ashram|Hill|Hills))\b/g;
  let match;
  while ((match = landmarkRegex.exec(fullText)) !== null) {
    if (match[1]) {
      addPlace(match[1]);
    }
  }

  // If no physical places were identified (e.g. editorial/advice/tips articles), return clean curated aesthetic travel themes
  if (placesMap.size === 0) {
    return getConceptualTravelThemes(title, category);
  }

  return Array.from(placesMap.entries()).map(([_, val]) => ({ name: val, query: val }));
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { blogId, title, excerpt, content, category } = body;

    if (!blogId && !title) {
      return NextResponse.json({ error: 'blogId or title is required' }, { status: 400 });
    }

    let blogTitle = title || '';
    let blogExcerpt = excerpt || '';
    let blogContent = content || '';
    let blogCategory = category || '';

    // If blogId is passed and title/content wasn't provided, fetch via Firestore REST API
    if (blogId && (!blogTitle || !blogContent)) {
      try {
        const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/blogs/${encodeURIComponent(blogId)}`;
        const res = await fetch(url);
        if (res.ok) {
          const docData = await res.json();
          const fields = docData.fields || {};
          blogTitle = blogTitle || fields.title?.stringValue || '';
          blogExcerpt = blogExcerpt || fields.excerpt?.stringValue || '';
          blogContent = blogContent || fields.content?.stringValue || '';
          blogCategory = blogCategory || fields.category?.stringValue || '';
        }
      } catch (fetchErr) {
        console.warn('Could not fetch blog via REST:', fetchErr);
      }
    }

    // AI Analysis via Gemini
    let photoPlaces: string[] = [];
    let detailedPlaces: Array<{ name: string; query: string }> = [];

    if (process.env.GEMINI_API_KEY) {
      try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const tryModels = [
          'gemini-1.5-flash',
          'gemini-flash-latest',
          'gemini-pro-latest',
          'gemini-flash-lite-latest'
        ];

        const sampleContent = (blogContent || '')
          .replace(/<!--[\s\S]*?-->/g, '')
          .slice(0, 3500);

        const prompt = `
You are an expert travel journalist and Wikimedia Commons media researcher.
Analyze this travel blog and extract 5 to 7 specific, concrete, highly photogenic tourist landmarks, attractions, temples, monuments, lakes, valleys, waterfalls, beaches, viewpoints, or historical sights mentioned in this article.

Article Title: "${blogTitle}"
Category: "${blogCategory}"
Excerpt: "${blogExcerpt}"

Content Sample:
"""
${sampleContent}
"""

CRITICAL INSTRUCTIONS:
1. Extract ONLY specific, real physical places & landmarks (e.g. "Betaab Valley", "Baisaran Valley", "Aru Valley", "Chandanwari", "Lidder River", "Pahalgam", "Thajiwas Glacier", "Dal Lake", "Gulmarg Gondola").
2. DO NOT return article guide headlines, clickbait phrases, or generic words (NEVER return "Think", "Why", "Honest", "Travel Guide 2026", "Best Places to Visit", "Trip Cost Breakdown", "How to Reach", "Weather Guide", "Things to Do", "Travel Agency Instead of Booking Online").
3. If this article is a general travel guide, advice, booking tip, or comparison WITHOUT physical geographical landmarks, return an empty array [].
4. For each real place found, return:
   - "name": Clean name of the landmark (e.g. "Betaab Valley", "Baisaran Valley")
   - "query": Ideal search query for Wikipedia / Wikimedia Commons photo archive (e.g. "Betaab Valley Pahalgam", "Baisaran Valley Kashmir")
5. Return ONLY a valid JSON array of objects. No backticks, no markdown fence.
`;

        for (const modelName of tryModels) {
          try {
            const model = genAI.getGenerativeModel({
              model: modelName,
              generationConfig: {
                temperature: 0.2,
                topP: 0.95,
                maxOutputTokens: 2048,
                responseMimeType: 'application/json'
              }
            });

            const result = await model.generateContent(prompt);
            const textResponse = (await result.response).text().trim();

            const cleanJson = textResponse
              .replace(/^```json\s*/i, '')
              .replace(/^```\s*/i, '')
              .replace(/\s*```$/i, '')
              .trim();

            const parsed = JSON.parse(cleanJson);
            if (Array.isArray(parsed) && parsed.length > 0) {
              detailedPlaces = parsed
                .filter(item => item && (item.name || item.query) && isValidPlaceChip(item.name || item.query))
                .map(item => ({
                  name: (item.name || item.query).trim(),
                  query: (item.query || item.name).trim()
                }));

              photoPlaces = detailedPlaces.map(p => p.name);
              break;
            }
          } catch (modelErr: any) {
            console.warn(`Model ${modelName} failed in analyze-photo-places:`, modelErr.message);
          }
        }
      } catch (geminiErr) {
        console.error('Gemini extraction error in analyze-photo-places:', geminiErr);
      }
    }

    // High-quality deterministic heuristic fallback if AI returned empty or is unavailable
    if (photoPlaces.length === 0) {
      detailedPlaces = extractBlogPlacesHeuristic(blogTitle, blogExcerpt, blogContent, blogCategory);
      photoPlaces = detailedPlaces.map(p => p.name);
    }

    // Try updating Firestore via REST PATCH (non-blocking)
    if (blogId && photoPlaces.length > 0) {
      try {
        const patchUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/blogs/${encodeURIComponent(blogId)}?updateMask.fieldPaths=photoPlaces&updateMask.fieldPaths=updatedAt`;
        const now = new Date().toISOString();
        fetch(patchUrl, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fields: {
              photoPlaces: {
                arrayValue: {
                  values: photoPlaces.map(p => ({ stringValue: p }))
                }
              },
              updatedAt: { stringValue: now }
            }
          })
        }).catch(e => console.warn('Background REST update photoPlaces error:', e));
      } catch (patchErr) {
        console.warn('Could not patch photoPlaces via REST:', patchErr);
      }
    }

    return NextResponse.json({
      success: true,
      blogId,
      photoPlaces,
      detailedPlaces
    });
  } catch (error: any) {
    console.error('Error analyzing blog photo places:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to analyze blog photo places' },
      { status: 500 }
    );
  }
}
