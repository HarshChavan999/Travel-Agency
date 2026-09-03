/**
 * Multi-Source Location-Specific Image Engine:
 * 1. Wikimedia Commons Media Repository (Primary - High-res place & landmark photos)
 * 2. Wikipedia Lead Articles (Landmark article thumbnail photos)
 * 3. Flickr Creative Commons (Geo-tagged, authentic visitor photos)
 */

export interface WikimediaImageResult {
  id: string;
  title: string;
  thumbUrl: string;
  fullUrl: string;
  width: number;
  height: number;
  description?: string;
  license?: string;
  artist?: string;
  source: 'Wikimedia Commons' | 'Wikipedia' | 'Flickr (CC)';
  sourceUrl?: string;
}

export interface WikimediaSearchOptions {
  limit?: number;
  width?: number;
  destination?: string;
  includeWikipediaLead?: boolean;
  includeFlickr?: boolean;
  sourceFilter?: 'all' | 'wikimedia' | 'wikipedia' | 'flickr';
}

/**
 * Cleans noisy place names commonly found in tour itineraries
 * e.g. "Shaheed Dweep to Port Blair | Island Escape Ends" -> "Shaheed Dweep"
 */
export function cleanPlaceQuery(rawName: string, destinationHint?: string): string {
  if (!rawName) return destinationHint || '';

  let cleaned = rawName;

  // 1. Remove day prefixes like "Day 1:", "Day 02 -", "Day 3 (Arrival):"
  cleaned = cleaned.replace(/^Day\s*\d+[\s:\-–—\.]*/i, '');

  // 2. Remove subtitle/marketing slogans after pipes, hyphens or em-dashes
  // e.g. "Shaheed Dweep to Port Blair | Island Escape Ends" -> "Shaheed Dweep to Port Blair"
  if (cleaned.includes('|')) {
    const parts = cleaned.split('|');
    cleaned = parts[0].trim();
  }

  // 3. Remove parenthetical noise like "(Breakfast Included)", "(Overnight Stay)", "(direct payment)"
  cleaned = cleaned.replace(/\([^\)]*(stay|transfer|night|meal|flight|drive|check-in|optional|payment|tickets|entrance|entry|tour ends|departure)[^\)]*\)/gi, '');

  // 4. Remove common travel itinerary noise prefixes
  const noisePrefixes = [
    /^(welcome to|arrival in|arrival at|arrive in|arrive at|departure from|depart from|transfer to|drive to|travel to|explore|visit to|visiting|trip to|journey to|sightseeing of|sightseeing at|sightseeing in|leisure day at|free day in|guided tour of|tour to|excursion to|check-in at|stay at|head to|proceed to)\s+/i
  ];

  for (const prefix of noisePrefixes) {
    cleaned = cleaned.replace(prefix, '').trim();
  }

  // 5. Remove common travel itinerary noise suffixes
  const noiseSuffixes = [
    /\s+(overnight stay|night stay|at hotel|in resort|airport drop|airport pickup|hotel transfer|local sightseeing|day tour|full day tour|half day tour|city tour|tour ends|island escape ends|escape ends)$/i
  ];

  for (const suffix of noiseSuffixes) {
    cleaned = cleaned.replace(suffix, '').trim();
  }

  // 6. Clean up punctuation and multiple spaces
  cleaned = cleaned.replace(/^[,\-\:\s\/\&|]+|[,\-\:\s\/\&|]+$/g, '').trim();

  // If after cleaning it's empty, fallback to raw or destination
  if (!cleaned) {
    cleaned = rawName.trim();
  }

  return cleaned;
}

/**
 * Strips HTML tags from Wikimedia extmetadata values
 */
function stripHtml(htmlStr?: string): string {
  if (!htmlStr) return '';
  return htmlStr
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Searches Wikimedia Commons (First Priority), Wikipedia, and Flickr for verified place photos
 */
export async function searchWikimediaImages(
  query: string,
  options: WikimediaSearchOptions = {}
): Promise<WikimediaImageResult[]> {
  const {
    limit = 32,
    width = 1000,
    destination = '',
    includeWikipediaLead = true,
    includeFlickr = true,
    sourceFilter = 'all'
  } = options;

  const results: WikimediaImageResult[] = [];
  const seenUrls = new Set<string>();

  const cleanedQuery = cleanPlaceQuery(query, destination);
  if (!cleanedQuery && !destination) return [];

  // Build clean primary search string (e.g. "Shaheed Dweep" or "Port Blair" or "Amer Fort Jaipur")
  const primarySearch = destination && !cleanedQuery.toLowerCase().includes(destination.toLowerCase())
    ? `${cleanedQuery} ${destination}`.trim()
    : cleanedQuery.trim();

  try {
    // ─── 1. WIKIMEDIA COMMONS DEEP SEARCH (PRIMARY / TOP PRIORITY) ───
    const commonsPromise = (async () => {
      try {
        const commonsLimit = Math.min(limit, 28);
        const commonsUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(
          primarySearch
        )}&gsrnamespace=6&gsrlimit=${commonsLimit}&prop=imageinfo&iiprop=url|size|extmetadata|dimensions&iiurlwidth=${width}&format=json&origin=*`;

        const res = await fetch(commonsUrl, { signal: AbortSignal.timeout(7000) });
        if (!res.ok) return null;
        return await res.json();
      } catch (err) {
        console.warn('Wikimedia Commons error:', err);
        return null;
      }
    })();

    // ─── 2. WIKIPEDIA LEAD ARTICLE SEARCH (SECONDARY) ───
    const wikiPromise = includeWikipediaLead
      ? (async () => {
          try {
            const wikiUrl = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(
              cleanedQuery || primarySearch
            )}&gsrlimit=4&prop=pageimages|extracts&pithumbsize=${width}&exintro=1&explaintext=1&format=json&origin=*`;

            const res = await fetch(wikiUrl, { signal: AbortSignal.timeout(6000) });
            if (!res.ok) return null;
            const data = await res.json();
            const pages = Object.values(data.query?.pages || {}) as any[];

            const wikiLeadItems: WikimediaImageResult[] = [];

            for (const page of pages) {
              if (page.thumbnail?.source) {
                const rawUrl = page.thumbnail.source;
                const lowerUrl = rawUrl.toLowerCase();

                if (
                  !lowerUrl.endsWith('.svg') &&
                  !lowerUrl.includes('flag_of') &&
                  !lowerUrl.includes('map') &&
                  !lowerUrl.includes('coat_of_arms') &&
                  !lowerUrl.includes('icon')
                ) {
                  wikiLeadItems.push({
                    id: `wiki-${page.pageid}`,
                    title: page.title || cleanedQuery,
                    thumbUrl: rawUrl,
                    fullUrl: page.original?.source || rawUrl,
                    width: page.thumbnail.width || width,
                    height: page.thumbnail.height || Math.round(width * 0.66),
                    description: page.extract ? page.extract.slice(0, 220) + '...' : page.title,
                    license: 'Wikipedia Lead / CC BY-SA',
                    artist: 'Wikipedia Contributors',
                    source: 'Wikipedia',
                    sourceUrl: `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, '_'))}`
                  });
                }
              }
            }

            return wikiLeadItems;
          } catch (e) {
            console.warn('Wikipedia Lead error:', e);
            return null;
          }
        })()
      : Promise.resolve(null);

    // ─── 3. FLICKR CREATIVE COMMONS SEARCH (TERTIARY VIA OPENVERSE CC INDEX) ───
    const flickrPromise = includeFlickr
      ? (async () => {
          try {
            const ovUrl = `https://api.openverse.org/v1/images/?q=${encodeURIComponent(
              primarySearch
            )}&source=flickr&license_type=commercial,modification&page_size=10`;

            const res = await fetch(ovUrl, {
              headers: { 'User-Agent': 'TripDM-App/1.0 (travel photos)' },
              signal: AbortSignal.timeout(6000)
            });
            if (!res.ok) return null;
            const data = await res.json();
            return Array.isArray(data.results) ? data.results : [];
          } catch (err) {
            console.warn('Flickr/Openverse search error:', err);
            return null;
          }
        })()
      : Promise.resolve(null);

    // Execute all searches in parallel
    const [commonsData, wikiLeadItems, flickrData] = await Promise.all([commonsPromise, wikiPromise, flickrPromise]);

    // 1. FIRST PRIORITY: Add Wikimedia Commons Files
    if (commonsData?.query?.pages) {
      const commonsPages = Object.values(commonsData.query.pages) as any[];
      for (const page of commonsPages) {
        const info = page.imageinfo?.[0];
        if (!info || !info.url) continue;

        const thumbUrl = info.thumburl || info.url;
        const fullUrl = info.url;

        // Skip non-photo formats
        const mime = (info.mime || '').toLowerCase();
        const urlLower = fullUrl.toLowerCase();
        if (
          mime.includes('svg') ||
          mime.includes('pdf') ||
          mime.includes('audio') ||
          mime.includes('video') ||
          urlLower.endsWith('.svg') ||
          urlLower.endsWith('.pdf') ||
          urlLower.endsWith('.webm') ||
          urlLower.endsWith('.ogv')
        ) {
          continue;
        }

        const rawTitle = (page.title || '').replace(/^File:/i, '');
        const titleLower = rawTitle.toLowerCase();

        // Skip non-place assets (flags, maps, logos, diagrams)
        if (
          titleLower.startsWith('flag of') ||
          titleLower.startsWith('coat of arms') ||
          titleLower.startsWith('location map') ||
          titleLower.startsWith('locator map') ||
          titleLower.startsWith('icon ') ||
          titleLower.includes('map of')
        ) {
          continue;
        }

        if (!seenUrls.has(fullUrl) && !seenUrls.has(thumbUrl)) {
          seenUrls.add(fullUrl);
          seenUrls.add(thumbUrl);

          const ext = info.extmetadata || {};
          const description = stripHtml(
            ext.ImageDescription?.value ||
            ext.ObjectName?.value ||
            rawTitle.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ')
          );

          results.push({
            id: `commons-${page.pageid || Math.random().toString(36).substr(2, 9)}`,
            title: rawTitle.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' '),
            thumbUrl: thumbUrl,
            fullUrl: fullUrl,
            width: info.width || width,
            height: info.height || Math.round(width * 0.66),
            description: description.length > 250 ? description.slice(0, 247) + '...' : description,
            license: stripHtml(ext.LicenseShortName?.value || 'CC BY-SA / Public Domain'),
            artist: stripHtml(ext.Artist?.value || 'Wikimedia Commons User'),
            source: 'Wikimedia Commons',
            sourceUrl: `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, '_'))}`
          });
        }
      }
    }

    // 2. SECOND PRIORITY: Add Wikipedia Lead landmark photos
    if (Array.isArray(wikiLeadItems) && wikiLeadItems.length > 0) {
      for (const item of wikiLeadItems) {
        if (!seenUrls.has(item.fullUrl) && !seenUrls.has(item.thumbUrl)) {
          seenUrls.add(item.fullUrl);
          seenUrls.add(item.thumbUrl);
          results.push(item);
        }
      }
    }

    // 3. TERTIARY PRIORITY: Add Flickr Creative Commons results
    if (Array.isArray(flickrData) && flickrData.length > 0) {
      for (const fItem of flickrData) {
        if (fItem.url && !seenUrls.has(fItem.url)) {
          seenUrls.add(fItem.url);
          const thumb = fItem.thumbnail || fItem.url;
          seenUrls.add(thumb);

          results.push({
            id: `flickr-${fItem.id}`,
            title: fItem.title || cleanedQuery,
            thumbUrl: thumb,
            fullUrl: fItem.url,
            width: fItem.width || width,
            height: fItem.height || Math.round(width * 0.66),
            description: fItem.title || `Flickr visitor photo of ${cleanedQuery}`,
            license: `Flickr CC (${(fItem.license || 'CC BY').toUpperCase()})`,
            artist: fItem.creator || 'Flickr Photographer',
            source: 'Flickr (CC)',
            sourceUrl: fItem.foreign_landing_url || fItem.url
          });
        }
      }
    }

    // Filter by source if requested
    if (sourceFilter && sourceFilter !== 'all') {
      return results.filter(r => {
        if (sourceFilter === 'wikimedia') return r.source === 'Wikimedia Commons';
        if (sourceFilter === 'wikipedia') return r.source === 'Wikipedia';
        if (sourceFilter === 'flickr') return r.source === 'Flickr (CC)';
        return true;
      });
    }

    return results;
  } catch (error) {
    console.error('Error fetching multi-source images:', error);
    return results;
  }
}

