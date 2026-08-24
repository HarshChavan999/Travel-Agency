/**
 * Discovery & Merchandising Engine for Travel Marketplace
 * Uses strictly real package fields existing in the codebase schema.
 * Zero hardcoded package IDs, zero fake counts, zero fake data signals.
 */

export interface PackageListing {
  id: string;
  title: string;
  description?: string;
  cost?: string | number;
  price?: string | number;
  duration?: string | number;
  destination?: string;
  packageType?: 'international' | 'domestic';
  countryName?: string;
  stateName?: string;
  countryNames?: string[];
  stateNames?: string[];
  pickUpLocation?: string;
  dropLocation?: string;
  placesCovered?: Array<{ name?: string; imageUrls?: string[]; image?: string }>;
  tourCategories?: string[];
  hotelTypes?: string[] | string;
  mealPlan?: string[] | string;
  itinerary?: Array<{ dayNumber?: number; title?: string; placeName?: string; imageUrl?: string; imageUrls?: string[] }>;
  inclusions?: string[];
  exclusions?: string[];
  experienceType?: string[] | string;
  discountCategory?: string;
  isTrending?: boolean;
  season?: string;
  eventType?: string;
  photos?: string[];
  rating?: number;
  reviewsCount?: number;
  createdAt?: any;
  agencyId?: string;
  agencyName?: string;
  approved?: boolean;
  [key: string]: any;
}

/**
 * Calculates a data-driven discovery score based strictly on real available listing fields.
 */
export function calculateDiscoveryScore(listing: PackageListing): number {
  let score = 0;

  if (typeof listing.rating === 'number' && listing.rating > 0) {
    score += listing.rating * 10;
  }
  if (typeof listing.reviewsCount === 'number' && listing.reviewsCount > 0) {
    score += Math.min(listing.reviewsCount, 50) * 1.5;
  }
  if (listing.isTrending === true) {
    score += 15;
  }

  const photosCount = Array.isArray(listing.photos) ? listing.photos.length : 0;
  const placesCount = Array.isArray(listing.placesCovered) ? listing.placesCovered.length : 0;
  const itineraryCount = Array.isArray(listing.itinerary) ? listing.itinerary.length : 0;
  const inclusionsCount = Array.isArray(listing.inclusions) ? listing.inclusions.length : 0;

  score += Math.min(photosCount, 5) * 3;
  score += Math.min(placesCount, 5) * 2;
  score += Math.min(itineraryCount, 7) * 2;
  if (inclusionsCount > 0) score += 5;

  if (listing.createdAt) {
    try {
      let createdMs = 0;
      if (typeof listing.createdAt === 'number') {
        createdMs = listing.createdAt;
      } else if (listing.createdAt?.seconds) {
        createdMs = listing.createdAt.seconds * 1000;
      } else if (typeof listing.createdAt === 'string') {
        createdMs = new Date(listing.createdAt).getTime();
      }

      if (createdMs > 0) {
        const daysOld = (Date.now() - createdMs) / (1000 * 60 * 60 * 24);
        if (daysOld < 7) score += 20;
        else if (daysOld < 30) score += 10;
        else if (daysOld < 90) score += 5;
      }
    } catch {
      // fallback
    }
  }

  return score;
}

/**
 * Extracts and calculates popular destinations dynamically from real database listings.
 */
export interface DestinationCard {
  name: string;
  type: 'state' | 'country' | 'city';
  packageCount: number;
  coverImage: string | null;
  startingPrice: number | null;
  listings: PackageListing[];
}

export function getPopularDestinations(listings: PackageListing[], minCount = 1): DestinationCard[] {
  const destMap = new Map<string, PackageListing[]>();

  listings.forEach((listing) => {
    if (listing.approved === false) return;

    const names = new Set<string>();

    const addCleanName = (raw: string) => {
      if (!raw) return;
      const parts = raw.split(/,|\/|\band\b/i).map((p) => p.trim());
      parts.forEach((p) => {
        if (p.length > 2 && !/package|tour|trip|holiday/i.test(p)) {
          names.add(p);
        }
      });
    };

    if (listing.stateName) addCleanName(listing.stateName);
    if (listing.countryName) addCleanName(listing.countryName);
    if (Array.isArray(listing.stateNames)) listing.stateNames.forEach((s) => addCleanName(s));
    if (Array.isArray(listing.countryNames)) listing.countryNames.forEach((c) => addCleanName(c));
    if (listing.destination) addCleanName(listing.destination);

    names.forEach((name) => {
      const key = name.toLowerCase();
      if (!destMap.has(key)) {
        destMap.set(key, []);
      }
      if (!destMap.get(key)!.some((p) => p.id === listing.id)) {
        destMap.get(key)!.push(listing);
      }
    });
  });

  const destinations: DestinationCard[] = [];

  destMap.forEach((pkgList, key) => {
    if (pkgList.length < minCount) return;

    const displayName = key.split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

    let coverImage: string | null = null;
    let minPrice: number | null = null;

    pkgList.forEach((pkg) => {
      if (!coverImage) {
        if (pkg.placesCovered?.[0]?.imageUrls?.[0]) coverImage = pkg.placesCovered[0].imageUrls[0];
        else if (pkg.photos?.[0]) coverImage = pkg.photos[0];
        else if (pkg.itinerary?.[0]?.imageUrl) coverImage = pkg.itinerary[0].imageUrl;
      }

      const rawPrice = pkg.cost || pkg.price;
      if (rawPrice) {
        const pNum = parseFloat(String(rawPrice).replace(/[^0-9.]/g, ''));
        if (!isNaN(pNum) && pNum > 0) {
          if (minPrice === null || pNum < minPrice) {
            minPrice = pNum;
          }
        }
      }
    });

    destinations.push({
      name: displayName,
      type: 'state',
      packageCount: pkgList.length,
      coverImage: coverImage || null,
      startingPrice: minPrice,
      listings: pkgList,
    });
  });

  return destinations
    .sort((a, b) => b.packageCount - a.packageCount)
    .slice(0, 12);
}

/**
 * Editorial State Story Model (STATE -> STORY -> PLACES -> EXPERIENCES -> PACKAGES)
 * Extracted 100% dynamically from real database listings.
 */
export interface StateStory {
  stateName: string;
  packageCount: number;
  coverImage: string | null;
  startingPrice: number | null;
  discoveredPlaces: string[];
  experienceTags: string[];
  listings: PackageListing[];
}

export function getStateStories(listings: PackageListing[]): StateStory[] {
  const stateMap = new Map<string, PackageListing[]>();

  listings.forEach((listing) => {
    if (listing.approved === false) return;

    const states = new Set<string>();
    if (listing.stateName && listing.stateName.trim()) states.add(listing.stateName.trim());
    if (Array.isArray(listing.stateNames)) {
      listing.stateNames.forEach((s) => s && states.add(s.trim()));
    }

    states.forEach((state) => {
      const key = state.toLowerCase();
      if (!stateMap.has(key)) stateMap.set(key, []);
      if (!stateMap.get(key)!.some((p) => p.id === listing.id)) {
        stateMap.get(key)!.push(listing);
      }
    });
  });

  const stories: StateStory[] = [];

  stateMap.forEach((pkgList, key) => {
    if (pkgList.length === 0) return;

    const stateName = key.split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

    let coverImage: string | null = null;
    let minPrice: number | null = null;
    const placesSet = new Set<string>();
    const expSet = new Set<string>();

    pkgList.forEach((pkg) => {
      if (!coverImage) {
        if (pkg.placesCovered?.[0]?.imageUrls?.[0]) coverImage = pkg.placesCovered[0].imageUrls[0];
        else if (pkg.photos?.[0]) coverImage = pkg.photos[0];
        else if (pkg.itinerary?.[0]?.imageUrl) coverImage = pkg.itinerary[0].imageUrl;
      }

      const rawPrice = pkg.cost || pkg.price;
      if (rawPrice) {
        const pNum = parseFloat(String(rawPrice).replace(/[^0-9.]/g, ''));
        if (!isNaN(pNum) && pNum > 0) {
          if (minPrice === null || pNum < minPrice) minPrice = pNum;
        }
      }

      // Collect real places covered
      if (Array.isArray(pkg.placesCovered)) {
        pkg.placesCovered.forEach((p) => {
          if (p?.name && p.name.trim().length > 2) placesSet.add(p.name.trim());
        });
      }

      // Collect real experiences
      if (pkg.experienceType) {
        const raw = Array.isArray(pkg.experienceType) ? pkg.experienceType.join(',') : String(pkg.experienceType);
        raw.split(/[,;\n]+/).forEach((e) => {
          const trimmed = e.trim();
          if (trimmed && trimmed.length < 30) expSet.add(trimmed);
        });
      }
      if (Array.isArray(pkg.tourCategories)) {
        pkg.tourCategories.forEach((tc) => {
          if (tc) {
            String(tc).split(/[,;\n]+/).forEach((t) => {
              const trimmed = t.trim();
              if (trimmed && trimmed.length < 30) expSet.add(trimmed);
            });
          }
        });
      }
    });

    stories.push({
      stateName,
      packageCount: pkgList.length,
      coverImage: coverImage || null,
      startingPrice: minPrice,
      discoveredPlaces: Array.from(placesSet).slice(0, 6),
      experienceTags: Array.from(expSet).slice(0, 4),
      listings: pkgList,
    });
  });

  return stories.sort((a, b) => b.packageCount - a.packageCount);
}

/**
 * Dynamic Attribute-Based Category Collection Engine
 * Groups listings into real attribute collections for 2x2 multi-item cards.
 */
export interface CategoryCollection {
  id: string;
  title: string;
  description: string;
  categoryKey: string;
  subcategoryKey?: string;
  badgeText?: string;
  listings: PackageListing[];
}

export function getCategoryCollections(listings: PackageListing[]): CategoryCollection[] {
  const approvedListings = listings.filter((l) => l.approved !== false);
  const collections: CategoryCollection[] = [];

  const matchCategory = (filterFn: (pkg: PackageListing) => boolean) => {
    return approvedListings.filter(filterFn);
  };

  // 1. Family Vacations
  const familyListings = matchCategory((pkg) => {
    const cats = Array.isArray(pkg.tourCategories) ? pkg.tourCategories : [];
    const title = (pkg.title || '').toLowerCase();
    const desc = (pkg.description || '').toLowerCase();
    return cats.some((c) => /family/i.test(c)) || title.includes('family') || desc.includes('family');
  });
  if (familyListings.length >= 2) {
    collections.push({
      id: 'family-holidays',
      title: 'Family Vacations',
      description: 'Curated packages designed for memorable family trips',
      categoryKey: 'tourCategory',
      subcategoryKey: 'Family Tour',
      badgeText: `${familyListings.length} Packages`,
      listings: familyListings,
    });
  }

  // 2. Honeymoon & Romantic
  const honeymoonListings = matchCategory((pkg) => {
    const cats = Array.isArray(pkg.tourCategories) ? pkg.tourCategories : [];
    const title = (pkg.title || '').toLowerCase();
    const desc = (pkg.description || '').toLowerCase();
    return cats.some((c) => /honeymoon|romantic/i.test(c)) || title.includes('honeymoon') || desc.includes('honeymoon');
  });
  if (honeymoonListings.length >= 2) {
    collections.push({
      id: 'honeymoon-couples',
      title: 'Honeymoon & Couples',
      description: 'Romantic getaways and private holiday retreats',
      categoryKey: 'tourCategory',
      subcategoryKey: 'Honeymoon Tour',
      badgeText: `${honeymoonListings.length} Packages`,
      listings: honeymoonListings,
    });
  }

  // 3. Adventure & Outdoors
  const adventureListings = matchCategory((pkg) => {
    const exp = Array.isArray(pkg.experienceType)
      ? pkg.experienceType.join(' ')
      : String(pkg.experienceType || '');
    const title = (pkg.title || '').toLowerCase();
    const type = (pkg.type || '').toLowerCase();
    return /trekking|adventure|snow|water|mountain/i.test(exp) || /adventure|trek/i.test(title) || type === 'adventure';
  });
  if (adventureListings.length >= 2) {
    collections.push({
      id: 'adventure-outdoors',
      title: 'Adventure & Outdoors',
      description: 'Thrilling treks, outdoor activities, and nature tours',
      categoryKey: 'experiences',
      subcategoryKey: 'Adventure',
      badgeText: `${adventureListings.length} Packages`,
      listings: adventureListings,
    });
  }

  // 4. Spiritual & Heritage
  const spiritualListings = matchCategory((pkg) => {
    const cats = Array.isArray(pkg.tourCategories) ? pkg.tourCategories : [];
    const title = (pkg.title || '').toLowerCase();
    const desc = (pkg.description || '').toLowerCase();
    return cats.some((c) => /religious|spiritual|pilgrimage/i.test(c)) || /temple|darshan|char dham|spiritual|heritage/i.test(title) || /spiritual|pilgrimage/i.test(desc);
  });
  if (spiritualListings.length >= 2) {
    collections.push({
      id: 'spiritual-cultural',
      title: 'Spiritual & Heritage',
      description: 'Sacred pilgrimages, temple tours, and cultural journeys',
      categoryKey: 'tourCategory',
      subcategoryKey: 'Religious Tour',
      badgeText: `${spiritualListings.length} Packages`,
      listings: spiritualListings,
    });
  }

  // 5. Domestic Journeys
  const domesticListings = matchCategory((pkg) => pkg.packageType === 'domestic');
  if (domesticListings.length >= 2) {
    collections.push({
      id: 'domestic-packages',
      title: 'Domestic Journeys',
      description: 'Explore incredible destinations across the country',
      categoryKey: 'domestic',
      badgeText: `${domesticListings.length} Packages`,
      listings: domesticListings,
    });
  }

  // 6. International Holidays
  const intlListings = matchCategory((pkg) => pkg.packageType === 'international');
  if (intlListings.length >= 2) {
    collections.push({
      id: 'international-packages',
      title: 'International Holidays',
      description: 'Unforgettable journeys to top global destinations',
      categoryKey: 'international',
      badgeText: `${intlListings.length} Packages`,
      listings: intlListings,
    });
  }

  return collections;
}

/**
 * Dynamic Experience Discovery Engine
 * Scans real listings for experience attributes and returns only experience groups supported by real package data.
 */
export interface DynamicExperience {
  name: string;
  tagKey: string;
  packageCount: number;
  startingPrice?: number | null;
  coverImage: string | null;
  listings: PackageListing[];
}

export function getDynamicExperiences(listings: PackageListing[]): DynamicExperience[] {
  const approvedListings = listings.filter((l) => l.approved !== false);
  const expMap = new Map<string, PackageListing[]>();

  const normalizeTag = (tag: string): string => {
    let t = tag.trim();
    if (/family/i.test(t)) return 'Family Vacations';
    if (/honeymoon|couple/i.test(t)) return 'Honeymoon & Couples';
    if (/adventure|trek|outdoors/i.test(t)) return 'Adventure & Outdoors';
    if (/spiritual|heritage|temple|religious|pilgrimage/i.test(t)) return 'Spiritual & Heritage';
    if (/nature|wildlife|safari/i.test(t)) return 'Nature & Wildlife';
    if (/weekend|short/i.test(t)) return 'Weekend Escapes';
    if (/group|departure/i.test(t)) return 'Group Departures';
    if (/holiday|tour|local|sightseeing/i.test(t)) return 'Sightseeing & Local Tours';
    return t.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  };

  approvedListings.forEach((pkg) => {
    const rawTags = new Set<string>();

    if (pkg.experienceType) {
      const exps = Array.isArray(pkg.experienceType) ? pkg.experienceType : [pkg.experienceType];
      exps.forEach((e) => e && rawTags.add(String(e).trim()));
    }
    if (Array.isArray(pkg.tourCategories)) {
      pkg.tourCategories.forEach((c) => c && rawTags.add(c.trim()));
    }
    if (pkg.eventType) {
      rawTags.add(pkg.eventType.trim());
    }

    rawTags.forEach((rawTag) => {
      const normalized = normalizeTag(rawTag);
      if (!expMap.has(normalized)) expMap.set(normalized, []);
      if (!expMap.get(normalized)!.some((p) => p.id === pkg.id)) {
        expMap.get(normalized)!.push(pkg);
      }
    });
  });

  const experiences: DynamicExperience[] = [];

  expMap.forEach((pkgList, name) => {
    if (pkgList.length === 0) return;

    let coverImage: string | null = null;
    let minPrice: number | null = null;

    pkgList.forEach((pkg) => {
      if (!coverImage) {
        if (pkg.placesCovered?.[0]?.imageUrls?.[0]) coverImage = pkg.placesCovered[0].imageUrls[0];
        else if (pkg.photos?.[0]) coverImage = pkg.photos[0];
        else if (pkg.itinerary?.[0]?.imageUrl) coverImage = pkg.itinerary[0].imageUrl;
      }
      const rawCost = pkg.cost || pkg.price;
      if (rawCost) {
        const num = parseFloat(String(rawCost).replace(/[^0-9.]/g, ''));
        if (!isNaN(num) && num > 0) {
          if (minPrice === null || num < minPrice) minPrice = num;
        }
      }
    });

    experiences.push({
      name,
      tagKey: name.toLowerCase(),
      packageCount: pkgList.length,
      startingPrice: minPrice,
      coverImage: coverImage || null,
      listings: pkgList,
    });
  });

  return experiences.sort((a, b) => b.packageCount - a.packageCount).slice(0, 8);
}

/**
 * Returns Recently Added packages sorted by createdAt timestamp (newest to oldest).
 */
export function getRecentlyAddedPackages(listings: PackageListing[], limit = 10): PackageListing[] {
  return [...listings]
    .filter((l) => l.approved !== false)
    .sort((a, b) => {
      const getMs = (l: PackageListing) => {
        if (typeof l.createdAt === 'number') return l.createdAt;
        if (l.createdAt?.seconds) return l.createdAt.seconds * 1000;
        if (typeof l.createdAt === 'string') return new Date(l.createdAt).getTime();
        return 0;
      };
      return getMs(b) - getMs(a);
    })
    .slice(0, limit);
}

/**
 * Intent Rails: Returns customized rails for horizontal browsing based on real attributes.
 */
export interface IntentRail {
  id: string;
  title: string;
  subtitle: string;
  listings: PackageListing[];
}

export function getIntentRails(listings: PackageListing[]): IntentRail[] {
  const approved = listings.filter((l) => l.approved !== false);
  const rails: IntentRail[] = [];

  // Rail 1: Weekend Getaways & Short Escapes (duration <= 4 days/nights)
  const shortTrips = approved.filter((l) => {
    const dur = parseInt(String(l.duration || '0')) || (Array.isArray(l.itinerary) ? l.itinerary.length : 0);
    const ev = (l.eventType || '').toLowerCase();
    return (dur > 0 && dur <= 4) || ev === 'weekend';
  });
  if (shortTrips.length >= 2) {
    rails.push({
      id: 'weekend-escapes',
      title: 'Weekend Getaways & Short Escapes',
      subtitle: 'Quick 2 to 4-day trips perfect for a weekend recharge',
      listings: shortTrips,
    });
  }

  // Rail 2: Fixed Departure & Group Escapes
  const fixDepartures = approved.filter((l) => {
    const cats = Array.isArray(l.tourCategories) ? l.tourCategories : [];
    return cats.some((c) => /fix departure|group|friends/i.test(c));
  });
  if (fixDepartures.length >= 2) {
    rails.push({
      id: 'fix-departures',
      title: 'Fixed Departure & Group Escapes',
      subtitle: 'Guaranteed departures with curated itineraries for group travel',
      listings: fixDepartures,
    });
  }

  return rails;
}

/**
 * Dynamic Destination Section Auto-Creation Engine (Thrillophilia Style)
 * Groups listings by destination (State for Domestic, Country/Region for International).
 * Automatically creates a section (e.g., "Assam", "Europe", "Kashmir") whenever listings exist for that location.
 */
export interface DestinationSection {
  id: string;
  name: string;
  packageType: 'domestic' | 'international';
  packageCount: number;
  coverImage: string | null;
  startingPrice: number | null;
  listings: PackageListing[];
}

export function getDynamicDestinationSections(
  listings: PackageListing[],
  packageTypeFilter: 'all' | 'domestic' | 'international' = 'all'
): DestinationSection[] {
  const approvedListings = listings.filter((l) => l.approved !== false);
  const destMap = new Map<string, { name: string; packageType: 'domestic' | 'international'; listings: PackageListing[] }>();

  approvedListings.forEach((listing) => {
    const isIntl = listing.packageType === 'international';
    const pkgType: 'domestic' | 'international' = isIntl ? 'international' : 'domestic';

    const locationNames = new Set<string>();

    const cleanAndAdd = (raw: string) => {
      if (!raw) return;
      const parts = raw.split(/,|\/|\band\b/i).map((p) => p.trim());
      parts.forEach((p) => {
        if (p.length > 2 && !/package|tour|trip|holiday|deal|special/i.test(p)) {
          // Capitalize title case
          const formatted = p.split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
          locationNames.add(formatted);
        }
      });
    };

    // Check if package covers multiple states or countries
    const isMultiState = !isIntl && (
      (Array.isArray(listing.stateNames) && listing.stateNames.filter(Boolean).length > 1) ||
      (typeof listing.stateName === 'string' && /,|\/|\band\b/i.test(listing.stateName))
    );

    const isMultiCountry = isIntl && (
      (Array.isArray(listing.countryNames) && listing.countryNames.filter(Boolean).length > 1) ||
      (typeof listing.countryName === 'string' && /,|\/|\band\b/i.test(listing.countryName))
    );

    if (isMultiState) {
      locationNames.add("Multi State");
    } else if (isMultiCountry) {
      locationNames.add("Multi Country");
    } else if (isIntl) {
      if (listing.countryName) cleanAndAdd(listing.countryName);
      if (Array.isArray(listing.countryNames)) listing.countryNames.forEach(cleanAndAdd);
      if (listing.destination) cleanAndAdd(listing.destination);
    } else {
      if (listing.stateName) cleanAndAdd(listing.stateName);
      if (Array.isArray(listing.stateNames)) listing.stateNames.forEach(cleanAndAdd);
      if (listing.destination) cleanAndAdd(listing.destination);
    }

    // Fallback if no specific state/country was provided
    if (locationNames.size === 0) {
      if (listing.stateName) cleanAndAdd(listing.stateName);
      if (listing.countryName) cleanAndAdd(listing.countryName);
      if (listing.destination) cleanAndAdd(listing.destination);
    }

    locationNames.forEach((name) => {
      const key = name.toLowerCase();
      if (!destMap.has(key)) {
        destMap.set(key, { name, packageType: pkgType, listings: [] });
      }
      const item = destMap.get(key)!;
      if (!item.listings.some((p) => p.id === listing.id)) {
        item.listings.push(listing);
      }
    });
  });

  const sections: DestinationSection[] = [];

  destMap.forEach((group, key) => {
    if (group.listings.length === 0) return;

    // Filter by packageTypeFilter if requested
    if (packageTypeFilter === 'domestic' && group.packageType !== 'domestic') return;
    if (packageTypeFilter === 'international' && group.packageType !== 'international') return;

    let coverImage: string | null = null;
    let minPrice: number | null = null;

    group.listings.forEach((pkg) => {
      if (!coverImage) {
        if (pkg.placesCovered?.[0]?.imageUrls?.[0]) coverImage = pkg.placesCovered[0].imageUrls[0];
        else if (pkg.photos?.[0]) coverImage = pkg.photos[0];
        else if (pkg.itinerary?.[0]?.imageUrl) coverImage = pkg.itinerary[0].imageUrl;
      }

      const rawPrice = pkg.cost || pkg.price;
      if (rawPrice) {
        const pNum = parseFloat(String(rawPrice).replace(/[^0-9.]/g, ''));
        if (!isNaN(pNum) && pNum > 0) {
          if (minPrice === null || pNum < minPrice) minPrice = pNum;
        }
      }
    });

    const safeId = `dest-${key.replace(/[^a-z0-9]/g, '-')}`;

    sections.push({
      id: safeId,
      name: group.name,
      packageType: group.packageType,
      packageCount: group.listings.length,
      coverImage,
      startingPrice: minPrice,
      listings: group.listings,
    });
  });

  return sections.sort((a, b) => b.packageCount - a.packageCount);
}

/**
 * Returns list of distinct discovered destination names for tab pills navigation
 */
export function getDiscoveredDestinationPills(
  listings: PackageListing[],
  packageTypeFilter: 'all' | 'domestic' | 'international' = 'all'
): Array<{ name: string; packageType: 'domestic' | 'international'; count: number }> {
  const sections = getDynamicDestinationSections(listings, packageTypeFilter);
  return sections.map((s) => ({
    name: s.name,
    packageType: s.packageType,
    count: s.packageCount,
  }));
}

