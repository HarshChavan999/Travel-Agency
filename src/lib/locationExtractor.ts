import { GoogleGenerativeAI } from '@google/generative-ai';
import { cleanPlaceQuery } from './wikipediaCommons';

export interface ExtractedLocation {
  id: string;
  name: string;
  query: string;
  contextSnippet?: string;
  category?: 'attraction' | 'monument' | 'nature' | 'transit' | 'area' | 'other';
  sequenceIndex: number;
}

/**
 * Common non-place noise words & phrases that appear in travel itineraries
 */
const TRAVEL_NOISE_WORDS = new Set([
  'hotel', 'resort', 'dinner', 'breakfast', 'lunch', 'meal', 'meals', 'overnight', 'stay', 'night', 'nights',
  'morning', 'evening', 'afternoon', 'day', 'today', 'rest', 'leisure', 'relaxation', 'free time', 'time',
  'flight', 'train', 'station', 'airport', 'ferry', 'cruise', 'speed boat', 'boat', 'private cab', 'cab',
  'vehicle', 'car', 'driver', 'representative', 'scheduled', 'available', 'pre-booked', 'service', 'services',
  'assistance', 'formalities', 'check-in', 'checkout', 'departure', 'arrival', 'transfer',
  'local markets', 'local market', 'markets', 'market', 'bazaar', 'souvenirs', 'handicrafts', 'island specialties',
  'specialties', 'shopping', 'water sports', 'activities', 'scuba diving', 'snorkeling', 'sea walk', 'jet ski',
  'banana ride', 'parasailing', 'trekking', 'sightseeing', 'enjoy', 'explore', 'experience', 'board', 'spend',
  'relax', 'head', 'drive', 'visit', 'proceed', 'arrive', 'depart', 'transfer', 'room', 'rooms',
  'your', 'the', 'our', 'this', 'that', 'their', 'and', 'or', 'for', 'with', 'from', 'into', 'onto', 'after',
  'before', 'upon', 'ends', 'begins', 'starts', 'escape', 'tour', 'trip', 'package', 'highlights', 'city'
]);

/**
 * Marketing subtitle patterns to discard (e.g. "| Island Escape Ends", "- Departure Day", "| Free Day at Leisure")
 */
const MARKETING_SLOGAN_PATTERNS = [
  /^(island\s+)?escape\s+ends/i,
  /^tour\s+(ends|concludes|begins|starts)/i,
  /^trip\s+(ends|concludes|begins|starts)/i,
  /^departure(\s+day)?/i,
  /^arrival(\s+day)?/i,
  /^leisure(\s+day)?/i,
  /^free\s+day/i,
  /^good\s*bye/i,
  /^island\s+escape/i,
  /^journey\s+(ends|begins)/i,
  /^day\s+at\s+leisure/i,
  /^rest\s+day/i,
  /^overnight\s+stay/i,
  /^sightseeing(\s+tour)?$/i,
  /^city\s+tour$/i
];

/**
 * Splits a compound day title into singular clean place names
 * e.g. "Shaheed Dweep to Port Blair | Island Escape Ends" -> ["Shaheed Dweep", "Port Blair"]
 * e.g. "Havelock Island - Radhanagar Beach & Elephant Beach" -> ["Havelock Island", "Radhanagar Beach", "Elephant Beach"]
 */
export function extractPlacesFromTitle(placeTitle: string, destinationHint: string = ''): string[] {
  if (!placeTitle) return [];

  // Remove day prefixes like "Day 1:", "Day 02 -", "Day 3 (Arrival):"
  let cleanTitle = placeTitle.replace(/^Day\s*\d+[\s:\-–—\.]*/i, '').trim();

  // Remove parenthetical noise like "(Overnight Stay)", "(Breakfast Included)"
  cleanTitle = cleanTitle.replace(/\([^\)]*(stay|transfer|night|meal|flight|drive|check-in|optional|payment|tickets|entry|departure|leisure)[^\)]*\)/gi, '').trim();

  // Split title by pipe '|', em-dash '—', en-dash '–', colon ':', or hyphen '-'
  const sections = cleanTitle.split(/[|—–:\-]/).map(s => s.trim()).filter(Boolean);

  const candidatePlaces: string[] = [];

  for (const section of sections) {
    // If section matches a marketing slogan / status phrase, skip it
    const isSlogan = MARKETING_SLOGAN_PATTERNS.some(p => p.test(section.trim()));
    if (isSlogan) continue;

    // Split section by route connectors: ' to ', ' -> ', ' via ', ' enroute ', ' en route ', ','
    // Note: for '&' and 'and', avoid splitting "Sound & Light Show" or "Light and Sound Show"
    const normalized = section.replace(/\b(?:Light\s+and\s+Sound|Sound\s+(?:&|and)\s+Light)(?:\s+Show)?\b/gi, '___LIGHT_SOUND___');
    const subParts = normalized.split(/\s+(?:to|->|via|enroute|en\s+route|and|&)\s+|,/i);

    for (const rawPart of subParts) {
      let part = rawPart.replace(/___LIGHT_SOUND___/g, 'Light and Sound Show').trim();

      // Remove meal/activity suffixes like "with BBQ Dinner", "with Dinner", "with Lunch", "with transfers"
      part = part.replace(/\s+(?:with|including)\s+(?:bbq\s+)?(?:dinner|breakfast|lunch|meals|transfers|guide).*$/i, '').trim();

      // Remove trailing words like "Sightseeing", "Tour", "Excursion" (e.g. "Jaipur Sightseeing" -> "Jaipur")
      part = part.replace(/\s+(?:sightseeing|tour|excursion|trip)$/i, '').trim();

      // Remove noise prefixes like "Arrival in", "Departure from", "Sightseeing at", "Visit to", "Transfer to", "Excursion to"
      part = part.replace(/^(?:welcome to|arrival in|arrival at|arrive in|arrive at|departure from|depart from|transfer to|drive to|travel to|explore|visit to|visiting|trip to|journey to|sightseeing of|sightseeing at|sightseeing in|sightseeing|leisure day in|guided tour of|tour to|excursion to|excursion|check-in at|stay at|head to|proceed to)\s+/i, '').trim();
      part = part.replace(/^[,\-\:\s\/\&]+|[,\-\:\s\/\&]+$/g, '').trim();

      // Check if it has alternate place in parentheses, e.g. "Neil Island (Shaheed Dweep)"
      const altMatch = part.match(/^([^()]+)\s*\(([^()]+)\)$/);
      if (altMatch) {
        const primary = altMatch[1].trim();
        const secondary = altMatch[2].trim();
        if (isValidPlaceName(primary)) candidatePlaces.push(primary);
        if (isValidPlaceName(secondary)) candidatePlaces.push(secondary);
        continue;
      }

      if (isValidPlaceName(part)) {
        candidatePlaces.push(part);
      }
    }
  }

  return candidatePlaces;
}

/**
 * Validates if a string represents a legitimate singular place/landmark name
 */
function isValidPlaceName(name: string): boolean {
  if (!name) return false;
  const trimmed = name.trim();

  // Length sanity check
  if (trimmed.length < 3 || trimmed.length > 50) return false;

  // Must not contain sentence punctuation (., !, ?)
  if (/[.!?]/.test(trimmed)) return false;

  // Check lowercase version against noise word list
  const lower = trimmed.toLowerCase();
  if (TRAVEL_NOISE_WORDS.has(lower)) return false;

  // Standalone noise words that shouldn't be place names
  if (/^(excursion|sightseeing|tour|trip|safari|highlights|package|activities|entertainment)$/i.test(lower)) {
    return false;
  }

  // Check if it matches marketing slogans
  if (MARKETING_SLOGAN_PATTERNS.some(p => p.test(trimmed))) return false;

  // Must not contain common verbs or phrase fragments
  if (/\b(enjoy|enjoying|explore|exploring|transfer|transferring|spend|spending|relax|relaxing|board|boarding|available|pickup|drop|stay|overnight|souvenirs|handicrafts|specialties|markets|hotel|resort)\b/i.test(trimmed)) {
    return false;
  }

  // Must not start or end with stopwords / prepositions
  if (/^(the|your|our|this|that|and|or|for|with|from|into|onto|after|before|upon|at|in|to|by|a|an)\s+/i.test(trimmed)) {
    return false;
  }

  if (/\s+(the|your|our|this|that|and|or|for|with|from|into|onto|after|before|upon|at|in|to|by|a|an)$/i.test(trimmed)) {
    return false;
  }

  // Must have at least one capitalized letter (proper noun)
  if (!/[A-Z]/.test(trimmed)) return false;

  return true;
}

/**
 * Deterministic NLP heuristic place extractor
 * Extracts genuine landmarks, monuments, and locations in sequential order from itinerary text
 */
export function extractLocationsHeuristic(
  text: string,
  placeTitle: string = '',
  destinationHint: string = ''
): ExtractedLocation[] {
  if (!text && !placeTitle) return [];

  const results: ExtractedLocation[] = [];
  const seenNames = new Set<string>();

  // 1. First, extract clean singular places from placeTitle
  const titlePlaces = extractPlacesFromTitle(placeTitle, destinationHint);
  for (const place of titlePlaces) {
    const lower = place.toLowerCase();
    if (!seenNames.has(lower)) {
      seenNames.add(lower);
      results.push({
        id: `spot-${results.length + 1}`,
        name: place,
        query: place,
        contextSnippet: `Day Title: ${place}`,
        category: 'attraction',
        sequenceIndex: results.length
      });
    }
  }

  // 2. Specific landmark keyword matcher for description text
  const landmarkKeywords = [
    'Fort', 'Palace', 'Mahal', 'Haveli', 'Temple', 'Mandir', 'Gurudwara', 'Church', 'Cathedral',
    'Mosque', 'Masjid', 'Ashram', 'Monastery', 'Stupa', 'Ghat', 'Museum', 'Memorial', 'Monument',
    'Jail', 'Beach', 'Lighthouse', 'Cove', 'Bay', 'Island', 'Isle', 'Reef', 'Coral',
    'Lake', 'River', 'Dam', 'Falls', 'Waterfall', 'Springs', 'Valley', 'Pass', 'Peak', 'Hill',
    'Cliff', 'Gorge', 'Canyon', 'National Park', 'Wildlife Sanctuary', 'Sanctuary', 'Safari',
    'Zoo', 'Botanical Garden', 'Garden', 'Park', 'Viewpoint', 'Sunset Point', 'Sunrise Point',
    'Bridge', 'Promenade', 'Tower', 'Caves', 'Aquarium', 'Harbour', 'Port'
  ];

  // Regex matching Title Cased Proper Nouns ending in a Landmark Keyword
  // e.g. "Amer Fort", "Cellular Jail", "Radhanagar Beach", "Elephant Beach", "Laxmanpur Beach", "Solang Valley"
  const landmarkRegex = new RegExp(
    `\\b([A-Z][a-zA-Z0-9'\\-]*(?:\\s+[A-Z][a-zA-Z0-9'\\-]*)*(?:\\s+(?:of|and|&|the|at|in)\\s+[A-Z][a-zA-Z0-9'\\-]*)*\\s+(?:${landmarkKeywords.join(
      '|'
    )}))\\b`,
    'g'
  );

  let match: RegExpExecArray | null;
  const matchesWithIndex: { name: string; index: number; context: string }[] = [];

  const combinedText = text || '';

  while ((match = landmarkRegex.exec(combinedText)) !== null) {
    const rawMatch = match[1].trim();
    if (isValidPlaceName(rawMatch)) {
      const startIndex = match.index;
      const contextSnippet = combinedText.substring(
        Math.max(0, startIndex - 20),
        Math.min(combinedText.length, startIndex + rawMatch.length + 30)
      ).trim();

      matchesWithIndex.push({
        name: rawMatch,
        index: startIndex,
        context: contextSnippet
      });
    }
  }

  // Sort landmarks by chronological appearance order in description
  matchesWithIndex.sort((a, b) => a.index - b.index);

  // Add deduplicated landmark items
  for (const item of matchesWithIndex) {
    const cleanName = item.name.trim();
    const lowerName = cleanName.toLowerCase();

    // Check if already captured or is substring/superstring of an already added place
    const alreadyExists = Array.from(seenNames).some(
      seen => seen === lowerName || seen.includes(lowerName) || lowerName.includes(seen)
    );

    if (!alreadyExists) {
      seenNames.add(lowerName);

      results.push({
        id: `spot-${results.length + 1}`,
        name: cleanName,
        query: cleanName,
        contextSnippet: item.context,
        category: 'attraction',
        sequenceIndex: results.length
      });
    }
  }

  // 3. If after all extraction no places were found, use clean place title or destination hint safely
  if (results.length === 0) {
    const fallback = cleanPlaceQuery(placeTitle, destinationHint);
    if (fallback && isValidPlaceName(fallback)) {
      results.push({
        id: 'spot-1',
        name: fallback,
        query: fallback,
        contextSnippet: placeTitle,
        category: 'attraction',
        sequenceIndex: 0
      });
    } else if (destinationHint && isValidPlaceName(destinationHint)) {
      results.push({
        id: 'spot-1',
        name: destinationHint,
        query: destinationHint,
        contextSnippet: destinationHint,
        category: 'area',
        sequenceIndex: 0
      });
    }
  }

  return results;
}

/**
 * AI-powered location extractor using Gemini (with fallback to heuristic NLP)
 */
export async function extractLocationsWithAI(
  description: string,
  placeTitle: string = '',
  destinationHint: string = '',
  packageTitle: string = ''
): Promise<ExtractedLocation[]> {
  // If no Gemini key is available, use our deterministic heuristic directly
  if (!process.env.GEMINI_API_KEY) {
    return extractLocationsHeuristic(description, placeTitle, destinationHint);
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `
You are an expert travel landmark extractor.
Given the following itinerary day details, extract ONLY specific, singular tourist attractions, landmarks, beaches, islands, temples, monuments, natural sights, viewpoints, or historical sites in the EXACT sequential order they are visited.

Package Title: ${packageTitle || 'N/A'}
Destination Region: ${destinationHint || 'N/A'}
Day Title / Place: ${placeTitle || 'N/A'}
Day Description:
"${description}"

CRITICAL EXTRACTION RULES:
1. Extract ONLY specific, singular places (e.g. "Shaheed Dweep", "Port Blair", "Cellular Jail", "Radhanagar Beach", "Elephant Beach", "Amer Fort").
2. If the day title has multiple places connected by 'to', 'via', or '|' (e.g. "Shaheed Dweep to Port Blair | Island Escape Ends"), split them into individual places: ["Shaheed Dweep", "Port Blair"].
3. NEVER extract generic sentences, marketing slogans, hotel transfers, meals, or leisure mentions (e.g., NEVER return "Island Escape Ends", "your hotel and enjoy the", "local markets", "leisure day", "transfer to hotel", "island specialties").
4. For each place, specify a clean, concise search query (the place name itself, e.g. "Shaheed Dweep", "Port Blair", "Cellular Jail").
5. Return ONLY a valid JSON array of objects. No markdown formatting, no backticks.

Format:
[
  {
    "id": "spot-1",
    "name": "Shaheed Dweep",
    "query": "Shaheed Dweep",
    "contextSnippet": "Neil Island / Shaheed Dweep",
    "category": "nature",
    "sequenceIndex": 0
  },
  {
    "id": "spot-2",
    "name": "Port Blair",
    "query": "Port Blair",
    "contextSnippet": "Cruise back to Port Blair",
    "category": "attraction",
    "sequenceIndex": 1
  }
]
`;

    const response = await model.generateContent(prompt);
    const textResponse = response.response.text().trim();

    // Clean JSON response
    const cleanJson = textResponse.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
    const parsed = JSON.parse(cleanJson);

    if (Array.isArray(parsed) && parsed.length > 0) {
      const validItems = parsed.filter(item => item && item.name && isValidPlaceName(item.name));
      if (validItems.length > 0) {
        return validItems.map((item, idx) => ({
          id: `spot-${idx + 1}`,
          name: item.name.trim(),
          query: (item.query || item.name).trim(),
          contextSnippet: item.contextSnippet || '',
          category: item.category || 'attraction',
          sequenceIndex: idx
        }));
      }
    }

    return extractLocationsHeuristic(description, placeTitle, destinationHint);
  } catch (error) {
    console.warn('Gemini extraction failed, falling back to heuristic:', error);
    return extractLocationsHeuristic(description, placeTitle, destinationHint);
  }
}

