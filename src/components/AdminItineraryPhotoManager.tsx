'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Image as ImageIcon,
  Search,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  X,
  Loader2,
  RefreshCw,
  Filter,
  Layers,
  MapPin,
  Building2,
  Eye,
  Check,
  Trash2,
  Compass,
  ArrowRight,
  ArrowLeft,
  Info,
  Globe,
  SlidersHorizontal,
  FolderOpen,
  Plus,
  MoveLeft,
  MoveRight,
  Bot,
  Link2,
  AlertTriangle,
  Table as TableIcon,
  LayoutGrid
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { searchWikimediaImages, cleanPlaceQuery, WikimediaImageResult } from '@/lib/wikipediaCommons';
import { extractLocationsHeuristic, extractPlacesFromTitle, ExtractedLocation } from '@/lib/locationExtractor';
import { getDbInstance } from '@/lib/firebase';
import { doc, updateDoc, collection, getDocs } from 'firebase/firestore';

export interface ItineraryPlaceItem {
  id: string; // composite key: listingId_dayIndex
  listingId: string;
  listingTitle: string;
  packageType: 'domestic' | 'international' | string;
  destination: string;
  agencyName?: string;
  dayIndex: number;
  dayNumber: number;
  dayId?: string;
  placeName: string;
  description?: string;
  imageUrl?: string | null;
  imageUrls?: string[];
  hasPhoto: boolean;
}

// Extract human-readable image title/filename from URL (Wikimedia, R2, etc.)
export function extractImageTitleFromUrl(url: string): string {
  if (!url) return 'Unknown Asset';
  try {
    const cleanUrl = url.split('?')[0].split('#')[0];
    const parts = cleanUrl.split('/').filter(Boolean);
    if (parts.length === 0) return 'Unknown Asset';

    const thumbIdx = parts.indexOf('thumb');
    let rawFilename = '';
    if (thumbIdx !== -1 && parts.length > thumbIdx + 3) {
      // For Wikimedia thumb URLs, the original filename is thumb/x/xx/FileName.ext/...
      rawFilename = parts[thumbIdx + 3];
    } else {
      rawFilename = parts[parts.length - 1];
      rawFilename = rawFilename.replace(/^\d+px-/, '');
    }

    let decoded = decodeURIComponent(rawFilename);
    // Remove extension (.jpg, .png, .webp, etc.)
    decoded = decoded.replace(/\.(jpg|jpeg|png|webp|gif|svg|avif|tiff)$/i, '');
    // Replace underscores, dashes, pluses with spaces
    decoded = decoded.replace(/[-_+]+/g, ' ').replace(/\s+/g, ' ').trim();
    return decoded || 'Photo Asset';
  } catch (e) {
    return 'Photo Asset';
  }
}

// Compare image title and place name to detect whether photo matches the place
export function checkImageAndPlaceMatch(
  imageTitle: string,
  placeName: string,
  destination?: string
): {
  isMatch: boolean;
  score: number;
  matchedKeywords: string[];
  reason: string;
} {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2);

  const imgWords = norm(imageTitle);
  const placeWords = norm(placeName);
  const destWords = destination ? norm(destination) : [];

  // Common stop words to exclude from keyword overlap
  const stopWords = new Set([
    'day', 'sightseeing', 'tour', 'visit', 'city', 'the', 'and', 'near',
    'from', 'photo', 'image', 'trip', 'overview', 'drive', 'arrival',
    'departure', 'stay', 'night', 'morning', 'afternoon', 'evening', 'full', 'half'
  ]);

  const cleanImgWords = imgWords.filter(w => !stopWords.has(w));
  const cleanPlaceWords = placeWords.filter(w => !stopWords.has(w));

  // Overlapping place keywords with image title
  const matched = cleanPlaceWords.filter(w =>
    cleanImgWords.some(iw => iw.includes(w) || w.includes(iw))
  );

  // Check destination match as secondary signal
  const destMatched = destWords.filter(
    w => !stopWords.has(w) && cleanImgWords.some(iw => iw.includes(w) || w.includes(iw))
  );

  if (matched.length > 0) {
    return {
      isMatch: true,
      score: matched.length / Math.max(1, cleanPlaceWords.length),
      matchedKeywords: matched,
      reason: `Matches place keyword: "${matched.join(', ')}"`
    };
  }

  if (destMatched.length > 0 && cleanPlaceWords.length === 0) {
    return {
      isMatch: true,
      score: 0.5,
      matchedKeywords: destMatched,
      reason: `Matches destination: "${destMatched.join(', ')}"`
    };
  }

  return {
    isMatch: false,
    score: 0,
    matchedKeywords: [],
    reason: `Place name "${placeName}" does not match image title`
  };
}

// Compare two URLs ignoring query params and Wikimedia thumbnail dimensions
export function isMatchingUrl(urlA?: string | null, urlB?: string | null): boolean {
  if (!urlA || !urlB) return false;
  const cleanA = urlA.split('?')[0].split('#')[0].trim().toLowerCase();
  const cleanB = urlB.split('?')[0].split('#')[0].trim().toLowerCase();
  if (cleanA === cleanB) return true;

  try {
    const fileA = cleanA.split('/').filter(Boolean).pop()?.replace(/^\d+px-/, '');
    const fileB = cleanB.split('/').filter(Boolean).pop()?.replace(/^\d+px-/, '');
    if (fileA && fileB && fileA === fileB) return true;
  } catch {}

  return false;
}

// Synchronize all listing photo collections (itinerary, placesCovered, photos, imageUrls, imageUrl)
// to ensure main front thumbnail on the package page stays perfectly in sync with itinerary changes
export function syncPackageListingPhotos(
  pkg: any,
  options: {
    removeDayIndex?: number;
    removedUrls?: string[];
    updateDayIndex?: number;
    newUrls?: string[];
    placeName?: string;
  }
): {
  updatedPkg: any;
  firestorePayload: Record<string, any>;
} {
  const itinerary = Array.isArray(pkg.itinerary)
    ? pkg.itinerary.map((day: any) => ({ ...day }))
    : [];

  const removedUrls = (options.removedUrls || []).filter(Boolean);

  // 1. Update itinerary
  if (
    typeof options.removeDayIndex === 'number' &&
    options.removeDayIndex >= 0 &&
    options.removeDayIndex < itinerary.length
  ) {
    itinerary[options.removeDayIndex] = {
      ...itinerary[options.removeDayIndex],
      imageUrl: '',
      imageUrls: []
    };
  }

  if (
    typeof options.updateDayIndex === 'number' &&
    options.updateDayIndex >= 0 &&
    options.updateDayIndex < itinerary.length &&
    options.newUrls &&
    options.newUrls.length > 0
  ) {
    itinerary[options.updateDayIndex] = {
      ...itinerary[options.updateDayIndex],
      imageUrl: options.newUrls[0],
      imageUrls: options.newUrls
    };
  }

  // 2. Find remaining valid itinerary photos across all days
  const remainingItineraryPhotos: string[] = [];
  itinerary.forEach((d: any) => {
    const dayUrls = Array.isArray(d.imageUrls) ? d.imageUrls : d.imageUrl ? [d.imageUrl] : [];
    dayUrls.forEach((u: string) => {
      if (u && !removedUrls.some(ru => isMatchingUrl(ru, u))) {
        if (!remainingItineraryPhotos.includes(u)) {
          remainingItineraryPhotos.push(u);
        }
      }
    });
  });

  // 3. Update placesCovered (primary source for main front thumbnail in package page and listing cards)
  let placesCovered = Array.isArray(pkg.placesCovered)
    ? pkg.placesCovered.map((place: any) => ({ ...place }))
    : [];

  if (placesCovered.length > 0) {
    const targetPlaceName = (options.placeName || '').trim().toLowerCase();

    placesCovered = placesCovered.map((place: any) => {
      let placeUrls: string[] = Array.isArray(place.imageUrls)
        ? [...place.imageUrls]
        : place.imageUrl
        ? [place.imageUrl]
        : [];

      // Remove any blacklisted / deleted URLs
      if (removedUrls.length > 0) {
        placeUrls = placeUrls.filter(u => !removedUrls.some(ru => isMatchingUrl(ru, u)));
      }

      // If place name matches the edited place
      if (targetPlaceName && place.name && place.name.trim().toLowerCase() === targetPlaceName) {
        if (options.removeDayIndex !== undefined) {
          placeUrls = [];
        } else if (options.newUrls && options.newUrls.length > 0) {
          placeUrls = options.newUrls;
        }
      }

      return {
        ...place,
        imageUrls: placeUrls,
        ...(place.imageUrl !== undefined ? { imageUrl: placeUrls[0] || '' } : {})
      };
    });

    // Ensure the front thumbnail (placesCovered[0]) is updated
    if (options.updateDayIndex === 0 && options.newUrls && options.newUrls.length > 0) {
      placesCovered[0] = {
        ...placesCovered[0],
        imageUrls: options.newUrls,
        ...(placesCovered[0].imageUrl !== undefined ? { imageUrl: options.newUrls[0] } : {})
      };
    } else {
      // If placesCovered[0] has had its photo deleted (or is empty), sync it with the next valid photo
      const frontUrls = (placesCovered[0].imageUrls || []).filter(
        (u: string) => !removedUrls.some(ru => isMatchingUrl(ru, u))
      );

      if (frontUrls.length === 0) {
        placesCovered[0] = {
          ...placesCovered[0],
          imageUrls: remainingItineraryPhotos.length > 0 ? [remainingItineraryPhotos[0]] : [],
          ...(placesCovered[0].imageUrl !== undefined
            ? { imageUrl: remainingItineraryPhotos[0] || '' }
            : {})
        };
      }
    }
  }

  // 4. Update photos array
  let photos = Array.isArray(pkg.photos) ? [...pkg.photos] : [];
  if (removedUrls.length > 0) {
    photos = photos.filter(u => !removedUrls.some(ru => isMatchingUrl(ru, u)));
  }
  if (
    options.newUrls &&
    options.newUrls.length > 0 &&
    (photos.length === 0 || options.updateDayIndex === 0)
  ) {
    photos = [options.newUrls[0], ...photos.filter(u => u !== options.newUrls![0])];
  }

  // 5. Update top-level imageUrls
  let imageUrls = Array.isArray(pkg.imageUrls) ? [...pkg.imageUrls] : [];
  if (removedUrls.length > 0) {
    imageUrls = imageUrls.filter(u => !removedUrls.some(ru => isMatchingUrl(ru, u)));
  }
  if (
    options.newUrls &&
    options.newUrls.length > 0 &&
    (imageUrls.length === 0 || options.updateDayIndex === 0)
  ) {
    imageUrls = [options.newUrls[0], ...imageUrls.filter(u => u !== options.newUrls![0])];
  }

  // 6. Update top-level imageUrl
  let mainImageUrl = pkg.imageUrl || '';
  if (removedUrls.some(ru => isMatchingUrl(ru, mainImageUrl))) {
    mainImageUrl = placesCovered[0]?.imageUrls?.[0] || remainingItineraryPhotos[0] || '';
  }
  if (options.updateDayIndex === 0 && options.newUrls && options.newUrls.length > 0) {
    mainImageUrl = options.newUrls[0];
  }

  const firestorePayload: Record<string, any> = {
    itinerary,
    ...(placesCovered.length > 0 ? { placesCovered } : {}),
    photos,
    imageUrls,
    imageUrl: mainImageUrl,
    updatedAt: new Date()
  };

  const updatedPkg = {
    ...pkg,
    ...firestorePayload
  };

  return { updatedPkg, firestorePayload };
}

interface AdminItineraryPhotoManagerProps {
  initialListings?: any[];
  allAgencies?: any[];
  onListingUpdated?: (updatedListing: any) => void;
}

export default function AdminItineraryPhotoManager({
  initialListings = [],
  allAgencies = [],
  onListingUpdated
}: AdminItineraryPhotoManagerProps) {
  const [allListings, setAllListings] = useState<any[]>(initialListings);
  const [loading, setLoading] = useState(false);
  const [isAutoFillingRepeated, setIsAutoFillingRepeated] = useState(false);
  const [activeTab, setActiveTab] = useState<'missing' | 'all' | 'completed' | 'audit'>('missing');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'domestic' | 'international'>('all');
  const [selectedDestination, setSelectedDestination] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'grouped'>('grid');

  // Modal State for Photo Selection
  const [activePlace, setActivePlace] = useState<ItineraryPlaceItem | null>(null);
  const [customSearchQuery, setCustomSearchQuery] = useState('');
  const [isSearchingWiki, setIsSearchingWiki] = useState(false);
  const [isExtractingLocations, setIsExtractingLocations] = useState(false);

  // Extracted sequential spots from description
  const [extractedSpots, setExtractedSpots] = useState<ExtractedLocation[]>([]);
  const [activeSpotId, setActiveSpotId] = useState<string>('all');

  // Image search results & multi-image selection tray
  const [wikiResults, setWikiResults] = useState<WikimediaImageResult[]>([]);
  const [selectedImages, setSelectedImages] = useState<WikimediaImageResult[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [updatePlacesCovered, setUpdatePlacesCovered] = useState(true);
  const [previewFullImageUrl, setPreviewFullImageUrl] = useState<string | null>(null);

  // Duplicate images table & bulk selection state
  const [duplicateViewMode, setDuplicateViewMode] = useState<Record<string, 'table' | 'cards'>>({});
  const [duplicateFilter, setDuplicateFilter] = useState<Record<string, 'all' | 'mismatched' | 'matching'>>({});
  const [bulkSelectedPlaceIds, setBulkSelectedPlaceIds] = useState<Record<string, string[]>>({});

  // Toast Notification
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Sync initialListings when prop changes
  useEffect(() => {
    if (initialListings && initialListings.length > 0) {
      setAllListings(initialListings);
    }
  }, [initialListings]);

  // Fetch / Refresh Listings directly from Firestore
  const fetchAllListings = async () => {
    setLoading(true);
    try {
      const db = getDbInstance();
      if (!db) {
        setLoading(false);
        return;
      }
      const snapshot = await getDocs(collection(db, 'listings'));
      const listData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setAllListings(listData);
      showToast(`Refreshed ${listData.length} package listings.`, 'info');
    } catch (err: any) {
      console.error('Error fetching listings:', err);
      showToast('Failed to refresh listings from database.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Build a global lookup index of all known place photos across packages
  const knownPlacePhotosMap = useMemo(() => {
    const map = new Map<string, string[]>();

    allListings.forEach((pkg: any) => {
      if (!pkg) return;

      // 1. From all itinerary days across packages
      if (Array.isArray(pkg.itinerary)) {
        pkg.itinerary.forEach((day: any) => {
          const urls: string[] = Array.isArray(day.imageUrls)
            ? day.imageUrls.filter(Boolean)
            : day.imageUrl
            ? [day.imageUrl]
            : [];

          if (urls.length > 0 && day.placeName) {
            const rawKey = day.placeName.toLowerCase().trim();
            if (!map.has(rawKey)) map.set(rawKey, urls);

            const cleanedKey = cleanPlaceQuery(day.placeName).toLowerCase().trim();
            if (cleanedKey && !map.has(cleanedKey)) map.set(cleanedKey, urls);

            // Also index split title places
            const splitPlaces = extractPlacesFromTitle(day.placeName);
            splitPlaces.forEach(p => {
              const pKey = p.toLowerCase().trim();
              if (pKey && !map.has(pKey)) map.set(pKey, urls);
            });
          }
        });
      }

      // 2. From all placesCovered across packages
      if (Array.isArray(pkg.placesCovered)) {
        pkg.placesCovered.forEach((p: any) => {
          const urls: string[] = Array.isArray(p.imageUrls)
            ? p.imageUrls.filter(Boolean)
            : p.imageUrl
            ? [p.imageUrl]
            : [];

          if (urls.length > 0 && p.name) {
            const key = cleanPlaceQuery(p.name).toLowerCase().trim();
            if (key && !map.has(key)) map.set(key, urls);
          }
        });
      }
    });

    return map;
  }, [allListings]);

  // Helper to find photos for a place from known saved places
  const findKnownPhotos = (placeName: string, spots: ExtractedLocation[] = []): string[] => {
    if (!placeName) return [];
    const lowerRaw = placeName.toLowerCase().trim();
    if (knownPlacePhotosMap.has(lowerRaw)) return knownPlacePhotosMap.get(lowerRaw)!;

    const lowerClean = cleanPlaceQuery(placeName).toLowerCase().trim();
    if (knownPlacePhotosMap.has(lowerClean)) return knownPlacePhotosMap.get(lowerClean)!;

    const splitPlaces = extractPlacesFromTitle(placeName);
    for (const sp of splitPlaces) {
      const k = sp.toLowerCase().trim();
      if (knownPlacePhotosMap.has(k)) return knownPlacePhotosMap.get(k)!;
    }

    for (const spot of spots) {
      const k = spot.name.toLowerCase().trim();
      if (knownPlacePhotosMap.has(k)) return knownPlacePhotosMap.get(k)!;
    }

    return [];
  };

  // Flatten and process all itinerary places from packages
  const allItineraryPlaces = useMemo(() => {
    const places: ItineraryPlaceItem[] = [];

    allListings.forEach((pkg: any) => {
      if (!pkg || !Array.isArray(pkg.itinerary)) return;

      const destination =
        pkg.packageType === 'international'
          ? pkg.countryName || 'International'
          : pkg.stateName || 'Domestic';

      const agency = allAgencies.find(a => a.id === pkg.agencyId);
      const agencyName = agency?.companyName || pkg.agencyName || 'Agency';

      pkg.itinerary.forEach((day: any, idx: number) => {
        const rawUrls: string[] = Array.isArray(day.imageUrls)
          ? day.imageUrls.filter(Boolean)
          : day.imageUrl
          ? [day.imageUrl]
          : [];

        const hasPhoto = rawUrls.length > 0;
        const currentImage = rawUrls[0] || null;

        places.push({
          id: `${pkg.id}_day_${idx}`,
          listingId: pkg.id,
          listingTitle: pkg.title || `${destination} Trip`,
          packageType: pkg.packageType || 'domestic',
          destination: destination,
          agencyName: agencyName,
          dayIndex: idx,
          dayNumber: typeof day.day === 'number' ? day.day : idx + 1,
          dayId: day.id,
          placeName: day.placeName || `Day ${idx + 1} Sightseeing`,
          description: day.description || '',
          imageUrl: currentImage,
          imageUrls: rawUrls,
          hasPhoto: hasPhoto
        });
      });
    });

    return places;
  }, [allListings, allAgencies]);

  // ─────────────────────────────────────────────────────────────────────────────
  // AUDIT REPORT: quality analysis of all itinerary place+image data
  // ─────────────────────────────────────────────────────────────────────────────
  const auditReport = useMemo(() => {
    // 1. Duplicate place names
    const nameMap = new Map<string, Array<ItineraryPlaceItem>>();
    allItineraryPlaces.forEach(p => {
      const key = p.placeName.toLowerCase().trim();
      if (!key || /^day \d+ sightseeing$/.test(key)) return;
      if (!nameMap.has(key)) nameMap.set(key, []);
      nameMap.get(key)!.push(p);
    });

    const duplicateNames: Array<{
      placeName: string;
      occurrences: Array<ItineraryPlaceItem>;
      type: 'cross-package' | 'same-package';
    }> = [];

    nameMap.forEach((occurrences) => {
      if (occurrences.length < 2) return;
      const listingIds = new Set(occurrences.map(o => o.listingId));
      duplicateNames.push({
        placeName: occurrences[0].placeName,
        occurrences,
        type: listingIds.size === 1 ? 'same-package' : 'cross-package'
      });
    });

    // 2. Duplicate images (same URL for different place names)
    const imageMap = new Map<string, Array<ItineraryPlaceItem>>();
    allItineraryPlaces.forEach(p => {
      if (!p.imageUrl) return;
      const url = p.imageUrl.trim();
      if (!imageMap.has(url)) imageMap.set(url, []);
      imageMap.get(url)!.push(p);
    });

    const duplicateImages: Array<{
      imageUrl: string;
      imageTitle: string;
      usages: Array<ItineraryPlaceItem>;
      mismatchedCount: number;
      matchingCount: number;
    }> = [];
    imageMap.forEach((usages, url) => {
      if (usages.length < 2) return;
      const uniqueNames = new Set(usages.map(u => u.placeName.toLowerCase().trim()));
      if (uniqueNames.size > 1) {
        const imageTitle = extractImageTitleFromUrl(url);
        let mismatchedCount = 0;
        let matchingCount = 0;
        usages.forEach(u => {
          const match = checkImageAndPlaceMatch(imageTitle, u.placeName, u.destination);
          if (match.isMatch) matchingCount++;
          else mismatchedCount++;
        });
        duplicateImages.push({ imageUrl: url, imageTitle, usages, mismatchedCount, matchingCount });
      }
    });

    // 3. Empty / missing place names
    const emptyNames = allItineraryPlaces.filter(p => {
      const name = p.placeName.toLowerCase().trim();
      return !name || /^day \d+ sightseeing$/.test(name);
    });

    // 4. Suspicious name-image mismatches
    const suspiciousMismatches: Array<{ listingId: string; listingTitle: string; dayNumber: number; placeName: string; imageUrl: string; reason: string }> = [];
    allItineraryPlaces.forEach(p => {
      if (!p.imageUrl || !p.placeName) return;
      const urlLower = p.imageUrl.toLowerCase();
      const nameParts = p.placeName.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter((w: string) => w.length > 3);
      if (nameParts.length === 0) return;
      const urlHasNameKeyword = nameParts.some((word: string) => urlLower.includes(word));
      if (!urlHasNameKeyword && (urlLower.includes('wikimedia') || urlLower.includes('wikipedia') || urlLower.includes('upload.wiki'))) {
        suspiciousMismatches.push({
          listingId: p.listingId,
          listingTitle: p.listingTitle,
          dayNumber: p.dayNumber,
          placeName: p.placeName,
          imageUrl: p.imageUrl,
          reason: 'Image filename has no keyword overlap with place name "' + p.placeName + '"'
        });
      }
    });

    // 5. Per-package health scores
    const packageHealth: Array<{ listingId: string; listingTitle: string; totalDays: number; withPhoto: number; missingPhoto: number; emptyNameDays: number; score: number }> = [];
    allListings.forEach((pkg: any) => {
      if (!pkg || !Array.isArray(pkg.itinerary)) return;
      const days = pkg.itinerary;
      const totalDays = days.length;
      const withPhoto = days.filter((d: any) => (Array.isArray(d.imageUrls) && d.imageUrls.length > 0) || !!d.imageUrl).length;
      const missingPhoto = totalDays - withPhoto;
      const emptyNameDays = days.filter((d: any) => {
        const n = (d.placeName || '').toLowerCase().trim();
        return !n || /^day \d+ sightseeing$/.test(n);
      }).length;
      const rawScore = totalDays === 0 ? 100 : Math.round((withPhoto / totalDays) * 100) - emptyNameDays * 5;
      packageHealth.push({ listingId: pkg.id, listingTitle: pkg.title || 'Untitled Package', totalDays, withPhoto, missingPhoto, emptyNameDays, score: Math.max(0, rawScore) });
    });
    packageHealth.sort((a, b) => a.score - b.score);

    // 6. Packages where the front thumbnail in placesCovered[0] is orphaned (photo was deleted from itinerary)
    const orphanedFrontThumbnails: Array<{
      listingId: string;
      listingTitle: string;
      destination: string;
      agencyName?: string;
      thumbnailUrl: string;
      suggestedPhoto: string | null;
    }> = [];

    allListings.forEach((pkg: any) => {
      if (!pkg || !Array.isArray(pkg.placesCovered) || pkg.placesCovered.length === 0) return;
      const frontPhoto = pkg.placesCovered[0]?.imageUrls?.[0];
      if (!frontPhoto) return;

      // Check if this front photo exists in any itinerary day
      const existsInItinerary = Array.isArray(pkg.itinerary) && pkg.itinerary.some((d: any) => {
        const urls = Array.isArray(d.imageUrls) ? d.imageUrls : d.imageUrl ? [d.imageUrl] : [];
        return urls.some((u: string) => isMatchingUrl(u, frontPhoto));
      });

      if (!existsInItinerary) {
        let firstValid: string | null = null;
        if (Array.isArray(pkg.itinerary)) {
          for (const d of pkg.itinerary) {
            const urls = Array.isArray(d.imageUrls) ? d.imageUrls : d.imageUrl ? [d.imageUrl] : [];
            if (urls.length > 0) {
              firstValid = urls[0];
              break;
            }
          }
        }

        const agency = allAgencies.find(a => a.id === pkg.agencyId);
        const destination = pkg.packageType === 'international' ? pkg.countryName || 'International' : pkg.stateName || 'Domestic';

        orphanedFrontThumbnails.push({
          listingId: pkg.id,
          listingTitle: pkg.title || 'Untitled Package',
          destination,
          agencyName: agency?.companyName || pkg.agencyName,
          thumbnailUrl: frontPhoto,
          suggestedPhoto: firstValid
        });
      }
    });

    const totalIssues =
      duplicateNames.length +
      duplicateImages.length +
      emptyNames.length +
      suspiciousMismatches.length +
      orphanedFrontThumbnails.length;

    return {
      duplicateNames,
      duplicateImages,
      emptyNames,
      suspiciousMismatches,
      orphanedFrontThumbnails,
      packageHealth,
      totalIssues
    };
  }, [allItineraryPlaces, allListings, allAgencies]);

  // Statistics & Fillable Count for repeated places
  const stats = useMemo(() => {
    const totalPlaces = allItineraryPlaces.length;
    const missingPlaces = allItineraryPlaces.filter(p => !p.hasPhoto).length;
    const completedPlaces = totalPlaces - missingPlaces;
    const coveragePercent = totalPlaces > 0 ? Math.round((completedPlaces / totalPlaces) * 100) : 100;
    const totalPackages = allListings.length;

    // Count how many missing places can be auto-filled immediately from repeated place photos
    const repeatedFillableCount = allItineraryPlaces.filter(p => {
      if (p.hasPhoto) return false;
      const known = findKnownPhotos(p.placeName);
      return known.length > 0;
    }).length;

    return {
      totalPackages,
      totalPlaces,
      missingPlaces,
      completedPlaces,
      coveragePercent,
      repeatedFillableCount
    };
  }, [allItineraryPlaces, allListings, knownPlacePhotosMap]);

  // Unique destinations list for dropdown filter
  const destinationsList = useMemo(() => {
    const destSet = new Set<string>();
    allItineraryPlaces.forEach(p => {
      if (p.destination) destSet.add(p.destination);
    });
    return Array.from(destSet).sort();
  }, [allItineraryPlaces]);

  // Filtered places according to active tab, search, and type
  const filteredPlaces = useMemo(() => {
    return allItineraryPlaces.filter(place => {
      // Tab filter
      if (activeTab === 'missing' && place.hasPhoto) return false;
      if (activeTab === 'completed' && !place.hasPhoto) return false;

      // Package type filter
      if (typeFilter !== 'all' && place.packageType !== typeFilter) return false;

      // Destination filter
      if (selectedDestination !== 'all' && place.destination !== selectedDestination) return false;

      // Search query filter
      if (searchQuery.trim()) {
        const queryLower = searchQuery.toLowerCase().trim();
        const matchesPlace = place.placeName.toLowerCase().includes(queryLower);
        const matchesPkg = place.listingTitle.toLowerCase().includes(queryLower);
        const matchesDest = place.destination.toLowerCase().includes(queryLower);
        const matchesAgency = (place.agencyName || '').toLowerCase().includes(queryLower);
        const matchesDesc = (place.description || '').toLowerCase().includes(queryLower);
        if (!matchesPlace && !matchesPkg && !matchesDest && !matchesAgency && !matchesDesc) {
          return false;
        }
      }

      return true;
    });
  }, [allItineraryPlaces, activeTab, typeFilter, selectedDestination, searchQuery]);

  // Group filtered places by package
  const groupedByPackage = useMemo(() => {
    const groups: { [listingId: string]: { listingTitle: string; destination: string; packageType: string; agencyName?: string; places: ItineraryPlaceItem[] } } = {};

    filteredPlaces.forEach(place => {
      if (!groups[place.listingId]) {
        groups[place.listingId] = {
          listingTitle: place.listingTitle,
          destination: place.destination,
          packageType: place.packageType,
          agencyName: place.agencyName,
          places: []
        };
      }
      groups[place.listingId].places.push(place);
    });

    return Object.entries(groups).map(([listingId, data]) => ({
      listingId,
      ...data
    }));
  }, [filteredPlaces]);

  // Auto-Fill All Repeated Places across packages in 1 click
  const handleAutoFillAllRepeatedPlaces = async () => {
    setIsAutoFillingRepeated(true);
    try {
      const db = getDbInstance();
      if (!db) {
        setIsAutoFillingRepeated(false);
        return;
      }

      let totalFilled = 0;
      const updatedListings = [...allListings];

      for (let i = 0; i < updatedListings.length; i++) {
        const pkg = updatedListings[i];
        if (!pkg || !Array.isArray(pkg.itinerary)) continue;

        let pkgChanged = false;
        const itineraryCopy = [...pkg.itinerary];

        itineraryCopy.forEach((day: any, idx: number) => {
          const hasPhoto = (Array.isArray(day.imageUrls) && day.imageUrls.length > 0) || !!day.imageUrl;
          if (!hasPhoto && day.placeName) {
            const matchingPhotos = findKnownPhotos(day.placeName);
            if (matchingPhotos.length > 0) {
              itineraryCopy[idx] = {
                ...day,
                imageUrl: matchingPhotos[0],
                imageUrls: matchingPhotos
              };
              pkgChanged = true;
              totalFilled++;
            }
          }
        });

        if (pkgChanged) {
          updatedListings[i] = { ...pkg, itinerary: itineraryCopy };
          await updateDoc(doc(db, 'listings', pkg.id), {
            itinerary: itineraryCopy
          });
        }
      }

      setAllListings(updatedListings);
      showToast(`🎉 Auto-filled photos for ${totalFilled} repeated itinerary places!`, 'success');
    } catch (err: any) {
      console.error('Error auto-filling repeated places:', err);
      showToast('Failed to auto-fill repeated places.', 'error');
    } finally {
      setIsAutoFillingRepeated(false);
    }
  };

  // Open Image Selection Modal for a Place
  const handleOpenPhotoSelector = async (place: ItineraryPlaceItem) => {
    setActivePlace(place);
    setWikiResults([]);

    // Initialize existing photos in the tray if any
    let initialSelected: WikimediaImageResult[] = [];
    if (place.imageUrls && place.imageUrls.length > 0) {
      initialSelected = place.imageUrls.map((url, idx) => ({
        id: `existing-${idx}-${url}`,
        title: `Existing Photo #${idx + 1}`,
        thumbUrl: url,
        fullUrl: url,
        width: 800,
        height: 600,
        source: 'Wikimedia Commons',
        license: 'Saved Photo'
      }));
    }

    // Step 1: Extract sequential locations from description and title
    setIsExtractingLocations(true);
    let extracted: ExtractedLocation[] = [];

    try {
      // Call AI endpoint
      const response = await fetch('/api/admin/itinerary-photos/extract-locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: place.description,
          placeTitle: place.placeName,
          destinationHint: place.destination,
          packageTitle: place.listingTitle
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data.locations) && data.locations.length > 0) {
          extracted = data.locations;
        }
      }
    } catch (err) {
      console.warn('AI extraction fetch failed, using local heuristic:', err);
    }

    // Fallback to local heuristic if needed
    if (!extracted || extracted.length === 0) {
      extracted = extractLocationsHeuristic(place.description || '', place.placeName, place.destination);
    }

    setExtractedSpots(extracted);
    setIsExtractingLocations(false);

    setSelectedImages(initialSelected);

    // Step 2: Set primary search query and trigger search
    const firstSpot = extracted[0];
    const initialQuery = firstSpot ? firstSpot.query : cleanPlaceQuery(place.placeName, place.destination);
    setCustomSearchQuery(initialQuery);
    setActiveSpotId(firstSpot ? firstSpot.id : 'all');

    await performWikimediaSearch(initialQuery, place.destination);
  };

  // Perform search on Wikimedia Commons & Wikipedia
  const performWikimediaSearch = async (queryText: string, destinationHint?: string) => {
    if (!queryText.trim()) return;

    setIsSearchingWiki(true);
    try {
      const results = await searchWikimediaImages(queryText, {
        destination: destinationHint || activePlace?.destination,
        limit: 28,
        width: 1000,
        includeWikipediaLead: true
      });

      setWikiResults(results);
    } catch (err: any) {
      console.error('Wikimedia search error:', err);
      showToast('Error searching Wikimedia images. Please try another query.', 'error');
    } finally {
      setIsSearchingWiki(false);
    }
  };

  // Switch active sequential spot
  const handleSelectSpot = (spot: ExtractedLocation) => {
    setActiveSpotId(spot.id);
    setCustomSearchQuery(spot.query);
    performWikimediaSearch(spot.query, activePlace?.destination);
  };

  // Toggle or add image to multi-selection tray
  const handleToggleImageSelection = (img: WikimediaImageResult) => {
    const isAlreadySelected = selectedImages.some(item => item.fullUrl === img.fullUrl || item.thumbUrl === img.thumbUrl);

    if (isAlreadySelected) {
      // Remove from tray
      setSelectedImages(prev => prev.filter(item => item.fullUrl !== img.fullUrl && item.thumbUrl !== img.thumbUrl));
    } else {
      // Add to tray
      setSelectedImages(prev => [...prev, img]);
    }
  };

  // Remove single image from tray
  const handleRemoveFromTray = (indexToRemove: number) => {
    setSelectedImages(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // Move image left/right in sequence
  const handleMoveImage = (index: number, direction: 'left' | 'right') => {
    const newIndex = direction === 'left' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= selectedImages.length) return;

    const copy = [...selectedImages];
    const temp = copy[index];
    copy[index] = copy[newIndex];
    copy[newIndex] = temp;
    setSelectedImages(copy);
  };

  // Save selected photos to Itinerary
  const handleSavePhotos = async (autoAdvance: boolean = false) => {
    if (!activePlace) return;

    if (selectedImages.length === 0) {
      showToast('Please select at least 1 image to save.', 'error');
      return;
    }

    setIsSaving(true);
    const chosenUrls = selectedImages.map(img => img.fullUrl || img.thumbUrl).filter(Boolean);
    const primaryUrl = chosenUrls[0] || '';

    try {
      // 1. Update via Server API route
      const response = await fetch('/api/admin/itinerary-photos/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingId: activePlace.listingId,
          dayIndex: activePlace.dayIndex,
          dayId: activePlace.dayId,
          imageUrl: primaryUrl,
          imageUrls: chosenUrls,
          updateMatchingPlaceCovered: updatePlacesCovered,
          placeName: activePlace.placeName
        })
      });

      // 2. Direct client Firestore update fallback for guaranteed sync
      const db = getDbInstance();
      if (db) {
        const pkgIndex = allListings.findIndex(p => p.id === activePlace.listingId);
        if (pkgIndex !== -1) {
          const oldUrls = [
            ...(activePlace.imageUrls || []),
            activePlace.imageUrl || ''
          ].filter(Boolean);

          const { updatedPkg, firestorePayload } = syncPackageListingPhotos(allListings[pkgIndex], {
            updateDayIndex: activePlace.dayIndex,
            newUrls: chosenUrls,
            placeName: activePlace.placeName,
            removedUrls: oldUrls
          });

          // Write all synced fields to Firestore client
          await updateDoc(doc(db, 'listings', activePlace.listingId), firestorePayload);

          // Update in local state
          const updatedAll = [...allListings];
          updatedAll[pkgIndex] = updatedPkg;
          setAllListings(updatedAll);

          if (onListingUpdated) {
            onListingUpdated(updatedPkg);
          }
        }
      }

      showToast(
        `Saved ${chosenUrls.length} photo(s) for Day ${activePlace.dayNumber}: ${activePlace.placeName}`,
        'success'
      );

      // Check for auto-advance to next missing place
      if (autoAdvance) {
        const currentId = activePlace.id;
        // First look for next missing place in the same package
        const nextInSamePkg = allItineraryPlaces.find(
          p => p.listingId === activePlace.listingId && !p.hasPhoto && p.id !== currentId && p.dayNumber > activePlace.dayNumber
        );
        if (nextInSamePkg) {
          handleOpenPhotoSelector(nextInSamePkg);
          return;
        }
        // Otherwise find any next missing place globally
        const missingList = allItineraryPlaces.filter(p => !p.hasPhoto && p.id !== currentId);
        if (missingList.length > 0) {
          const nextPlace = missingList[0];
          handleOpenPhotoSelector(nextPlace);
          return;
        } else {
          showToast('🎉 All itinerary places now have photos!', 'success');
          setActivePlace(null);
        }
      } else {
        // Keep activePlace updated with newly saved photos so user sees current state
        setActivePlace(prev => prev ? {
          ...prev,
          hasPhoto: chosenUrls.length > 0,
          imageUrl: primaryUrl,
          imageUrls: chosenUrls
        } : null);
      }
    } catch (err: any) {
      console.error('Error saving photo:', err);
      showToast('Failed to save photo. Please try again.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Helper for jumping to next place without saving
  const handleSkipToNextPlace = () => {
    if (!activePlace) return;
    const currentId = activePlace.id;
    const nextInSamePkg = allItineraryPlaces.find(
      p => p.listingId === activePlace.listingId && !p.hasPhoto && p.id !== currentId && p.dayNumber > activePlace.dayNumber
    );
    if (nextInSamePkg) {
      handleOpenPhotoSelector(nextInSamePkg);
      return;
    }
    const missingList = allItineraryPlaces.filter(p => !p.hasPhoto && p.id !== currentId);
    if (missingList.length > 0) {
      handleOpenPhotoSelector(missingList[0]);
    } else {
      showToast('No more missing places to process.', 'info');
    }
  };

  // Current package days for day switcher in dedicated view
  const currentPackageDays = useMemo(() => {
    if (!activePlace) return [];
    return allItineraryPlaces.filter(p => p.listingId === activePlace.listingId);
  }, [activePlace, allItineraryPlaces]);

  // Remove all photos from itinerary day
  const handleRemoveAllPhotos = async (place: ItineraryPlaceItem) => {
    if (!confirm(`Are you sure you want to remove all photos for Day ${place.dayNumber}: ${place.placeName}?\n\nThis will also remove this photo from the package front thumbnail and photo galleries.`)) {
      return;
    }

    try {
      const db = getDbInstance();
      if (!db) return;

      const pkgIndex = allListings.findIndex(p => p.id === place.listingId);
      if (pkgIndex === -1) return;

      const oldUrls = [
        ...(place.imageUrls || []),
        place.imageUrl || ''
      ].filter(Boolean);

      const { updatedPkg, firestorePayload } = syncPackageListingPhotos(allListings[pkgIndex], {
        removeDayIndex: place.dayIndex,
        removedUrls: oldUrls,
        placeName: place.placeName
      });

      await updateDoc(doc(db, 'listings', place.listingId), firestorePayload);

      const updatedAll = [...allListings];
      updatedAll[pkgIndex] = updatedPkg;
      setAllListings(updatedAll);

      if (onListingUpdated) {
        onListingUpdated(updatedPkg);
      }

      if (activePlace && activePlace.id === place.id) {
        setActivePlace({
          ...activePlace,
          imageUrl: null,
          imageUrls: [],
          hasPhoto: false
        });
        setSelectedImages([]);
      }

      showToast(`Removed all photos for Day ${place.dayNumber} and updated front thumbnail.`, 'info');
    } catch (err: any) {
      console.error('Error removing photo:', err);
      showToast('Failed to remove photo.', 'error');
    }
  };

  // Quick direct URL update for a place
  const handleQuickSetPhoto = async (place: ItineraryPlaceItem, newUrl: string) => {
    if (!newUrl || !newUrl.trim()) return;
    const url = newUrl.trim();
    const db = getDbInstance();
    if (!db) return;

    try {
      const pkgIndex = allListings.findIndex(p => p.id === place.listingId);
      if (pkgIndex === -1) return;

      const oldUrls = [
        ...(place.imageUrls || []),
        place.imageUrl || ''
      ].filter(Boolean);

      const { updatedPkg, firestorePayload } = syncPackageListingPhotos(allListings[pkgIndex], {
        updateDayIndex: place.dayIndex,
        newUrls: [url],
        placeName: place.placeName,
        removedUrls: oldUrls
      });

      await updateDoc(doc(db, 'listings', place.listingId), firestorePayload);

      const updatedAll = [...allListings];
      updatedAll[pkgIndex] = updatedPkg;
      setAllListings(updatedAll);

      if (onListingUpdated) {
        onListingUpdated(updatedPkg);
      }

      if (activePlace && activePlace.id === place.id) {
        setActivePlace({
          ...activePlace,
          imageUrl: url,
          imageUrls: [url],
          hasPhoto: true
        });
      }

      showToast(`Updated photo for Day ${place.dayNumber}: ${place.placeName} (front thumbnail synced).`, 'success');
    } catch (err: any) {
      console.error('Error updating photo:', err);
      showToast('Failed to update photo.', 'error');
    }
  };

  // Bulk remove photos across multiple selected places and packages
  const handleBulkRemovePhotos = async (placesToRemove: ItineraryPlaceItem[], imageUrl: string) => {
    if (!placesToRemove || placesToRemove.length === 0) {
      showToast('Please select at least 1 place to remove photos.', 'error');
      return;
    }

    if (
      !confirm(
        `Are you sure you want to remove this photo from ${placesToRemove.length} place(s)?\n\nThis will remove the photo from itineraries AND clear it from package front thumbnails and place covers.`
      )
    ) {
      return;
    }

    setIsSaving(true);
    const db = getDbInstance();
    if (!db) {
      setIsSaving(false);
      return;
    }

    try {
      // Group places by listingId for batch package updates
      const byListing = new Map<string, ItineraryPlaceItem[]>();
      placesToRemove.forEach(p => {
        if (!byListing.has(p.listingId)) byListing.set(p.listingId, []);
        byListing.get(p.listingId)!.push(p);
      });

      const updatedAll = [...allListings];

      for (const [listingId, places] of byListing.entries()) {
        const pkgIndex = updatedAll.findIndex(p => p.id === listingId);
        if (pkgIndex === -1) continue;

        let currentPkg = { ...updatedAll[pkgIndex] };

        // Process each place removal sequentially on the package
        places.forEach(place => {
          const removedList = [
            imageUrl,
            ...(place.imageUrls || []),
            place.imageUrl || ''
          ].filter(Boolean);

          const { updatedPkg } = syncPackageListingPhotos(currentPkg, {
            removeDayIndex: place.dayIndex,
            removedUrls: removedList,
            placeName: place.placeName
          });
          currentPkg = updatedPkg;
        });

        // Also purge the target imageUrl from package placesCovered and cover fields
        const { updatedPkg: finalPkg, firestorePayload } = syncPackageListingPhotos(currentPkg, {
          removedUrls: [imageUrl]
        });

        await updateDoc(doc(db, 'listings', listingId), firestorePayload);

        updatedAll[pkgIndex] = finalPkg;

        if (onListingUpdated) {
          onListingUpdated(finalPkg);
        }
      }

      setAllListings(updatedAll);

      // Clear selection for this image
      setBulkSelectedPlaceIds(prev => ({
        ...prev,
        [imageUrl]: []
      }));

      showToast(`Successfully removed photo from ${placesToRemove.length} place(s) and synced front thumbnails.`, 'success');
    } catch (err: any) {
      console.error('Error bulk removing photos:', err);
      showToast('Failed to bulk remove photos.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Sync and clean all orphaned front thumbnails across packages
  const handleSyncAllOrphanedThumbnails = async () => {
    if (auditReport.orphanedFrontThumbnails.length === 0) return;
    if (
      !confirm(
        `Sync and clean front thumbnails for ${auditReport.orphanedFrontThumbnails.length} package(s)?\n\nThis will remove deleted photos from the package front thumbnail and sync them with the active itinerary photos.`
      )
    ) {
      return;
    }

    setIsSaving(true);
    const db = getDbInstance();
    if (!db) {
      setIsSaving(false);
      return;
    }

    try {
      const updatedAll = [...allListings];
      for (const item of auditReport.orphanedFrontThumbnails) {
        const pkgIndex = updatedAll.findIndex(p => p.id === item.listingId);
        if (pkgIndex === -1) continue;

        const { updatedPkg, firestorePayload } = syncPackageListingPhotos(updatedAll[pkgIndex], {
          removedUrls: [item.thumbnailUrl]
        });

        await updateDoc(doc(db, 'listings', item.listingId), firestorePayload);
        updatedAll[pkgIndex] = updatedPkg;
        if (onListingUpdated) {
          onListingUpdated(updatedPkg);
        }
      }

      setAllListings(updatedAll);
      showToast(
        `🎉 Successfully cleaned and synced front thumbnails for ${auditReport.orphanedFrontThumbnails.length} package(s)!`,
        'success'
      );
    } catch (e: any) {
      console.error('Error syncing front thumbnails:', e);
      showToast('Failed to sync front thumbnails.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Sync a single orphaned thumbnail
  const handleSyncSingleOrphanedThumbnail = async (item: {
    listingId: string;
    thumbnailUrl: string;
    listingTitle: string;
  }) => {
    setIsSaving(true);
    const db = getDbInstance();
    if (!db) {
      setIsSaving(false);
      return;
    }

    try {
      const pkgIndex = allListings.findIndex(p => p.id === item.listingId);
      if (pkgIndex === -1) return;

      const { updatedPkg, firestorePayload } = syncPackageListingPhotos(allListings[pkgIndex], {
        removedUrls: [item.thumbnailUrl]
      });

      await updateDoc(doc(db, 'listings', item.listingId), firestorePayload);

      const updatedAll = [...allListings];
      updatedAll[pkgIndex] = updatedPkg;
      setAllListings(updatedAll);

      if (onListingUpdated) {
        onListingUpdated(updatedPkg);
      }

      showToast(`Cleaned front thumbnail for "${item.listingTitle}".`, 'success');
    } catch (e: any) {
      console.error('Error syncing front thumbnail:', e);
      showToast('Failed to clean front thumbnail.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER: DEDICATED FULL-PAGE EDITOR SCREEN (WHEN activePlace IS SELECTED)
  // ─────────────────────────────────────────────────────────────────────────────
  if (activePlace) {
    const currentPkgIndex = currentPackageDays.findIndex(p => p.id === activePlace.id);
    const prevPlace = currentPkgIndex > 0 ? currentPackageDays[currentPkgIndex - 1] : null;
    const nextPlace = currentPkgIndex < currentPackageDays.length - 1 ? currentPackageDays[currentPkgIndex + 1] : null;
    const missingInPkgCount = currentPackageDays.filter(p => !p.hasPhoto).length;

    return (
      <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
        {/* ─── TOAST NOTIFICATION ─── */}
        {toast && (
          <div className="fixed bottom-20 right-6 z-50 animate-in fade-in slide-in-from-bottom-5">
            <div
              className={`flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl text-white text-sm font-medium border ${
                toast.type === 'success'
                  ? 'bg-emerald-600 border-emerald-500 shadow-emerald-900/20'
                  : toast.type === 'error'
                  ? 'bg-rose-600 border-rose-500 shadow-rose-900/20'
                  : 'bg-slate-800 border-slate-700 shadow-slate-900/20'
              }`}
            >
              {toast.type === 'success' && <CheckCircle2 className="h-5 w-5 shrink-0" />}
              {toast.type === 'error' && <AlertCircle className="h-5 w-5 shrink-0" />}
              {toast.type === 'info' && <Info className="h-5 w-5 shrink-0" />}
              <span>{toast.message}</span>
              <button onClick={() => setToast(null)} className="ml-2 text-white/80 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* ─── DEDICATED PAGE HEADER & NAVIGATION ─── */}
        <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 shadow-xl border border-indigo-950/50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActivePlace(null)}
                  className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs font-semibold flex items-center gap-2 rounded-xl transition-all"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>{activeTab === 'audit' ? 'Back to Quality Audit' : 'Back to Packages List'}</span>
                </Button>

                <span className="text-indigo-400 text-xs font-semibold">
                  Package #{activePlace.listingId.substring(0, 8)}
                </span>
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                    Day {activePlace.dayNumber}
                  </span>
                  <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">
                    {activePlace.placeName}
                  </h1>
                </div>
                <p className="text-xs text-indigo-200/80 mt-1 flex items-center gap-2 flex-wrap">
                  <span>Package: <strong className="text-white">{activePlace.listingTitle}</strong></span>
                  <span>&bull;</span>
                  <span>Destination: <strong className="text-white">{activePlace.destination}</strong></span>
                  <span>&bull;</span>
                  <span>Agency: <strong className="text-white">{activePlace.agencyName || 'Verified Partner'}</strong></span>
                </p>
              </div>
            </div>

            {/* Quick Day Hop / Switcher */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 bg-white/5 p-2 rounded-xl border border-white/10 shrink-0">
              <div className="flex items-center gap-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => prevPlace && handleOpenPhotoSelector(prevPlace)}
                  disabled={!prevPlace}
                  className="text-white hover:bg-white/15 h-8 px-2 text-xs disabled:opacity-30"
                  title="Previous Day in this Package"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" /> Prev Day
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => nextPlace && handleOpenPhotoSelector(nextPlace)}
                  disabled={!nextPlace}
                  className="text-white hover:bg-white/15 h-8 px-2 text-xs disabled:opacity-30"
                  title="Next Day in this Package"
                >
                  Next Day <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>

              {/* Day Pills Bar for this package */}
              <div className="flex items-center gap-1 overflow-x-auto max-w-[280px] p-0.5 scrollbar-thin">
                {currentPackageDays.map(p => {
                  const isCurrent = p.id === activePlace.id;
                  const hasPic = p.hasPhoto;

                  return (
                    <button
                      key={p.id}
                      onClick={() => handleOpenPhotoSelector(p)}
                      className={`h-7 px-2.5 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-1 ${
                        isCurrent
                          ? 'bg-indigo-500 text-white shadow-md ring-2 ring-indigo-300'
                          : hasPic
                          ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
                          : 'bg-white/10 text-gray-300 hover:bg-white/20'
                      }`}
                      title={`Day ${p.dayNumber}: ${p.placeName} (${hasPic ? 'Has Photo' : 'Missing Photo'})`}
                    >
                      <span>D{p.dayNumber}</span>
                      {hasPic && <Check className="h-3 w-3 text-emerald-300" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ─── DESCRIPTION BANNER ─── */}
        {activePlace.description && (
          <div className="bg-indigo-50/80 border border-indigo-100/90 rounded-2xl p-4 px-6 text-sm text-indigo-950 flex items-start gap-3 shadow-sm">
            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl shrink-0 mt-0.5">
              <Info className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <span className="font-bold text-indigo-900 text-xs uppercase tracking-wider block">
                Itinerary Day Description
              </span>
              <p className="text-xs md:text-sm text-indigo-900/90 leading-relaxed">
                {activePlace.description}
              </p>
            </div>
          </div>
        )}

        {/* ─── AI SEQUENTIAL LOCATIONS & SEARCH CONTROLS ─── */}
        <div className="bg-white rounded-2xl border border-gray-200/90 shadow-sm p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                <Sparkles className="h-4 w-4" />
              </div>
              <span className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                Sequential Places in Description ({extractedSpots.length})
              </span>
            </div>
            {isExtractingLocations && (
              <span className="text-xs text-indigo-600 font-medium flex items-center gap-1.5 bg-indigo-50 px-3 py-1 rounded-full">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> AI analyzing text...
              </span>
            )}
          </div>

          {/* Sequential Spot Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {extractedSpots.map((spot, idx) => {
              const isActive = activeSpotId === spot.id;

              return (
                <button
                  key={spot.id}
                  onClick={() => handleSelectSpot(spot)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 transition-all border ${
                    isActive
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-md ring-2 ring-indigo-200'
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      isActive ? 'bg-white text-indigo-700' : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <span>{spot.name}</span>
                </button>
              );
            })}

            <button
              onClick={() => {
                setActiveSpotId('custom');
                performWikimediaSearch(customSearchQuery, activePlace.destination);
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 transition-all border ${
                activeSpotId === 'custom'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-md ring-2 ring-indigo-200'
                  : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
              }`}
            >
              Custom Search
            </button>
          </div>

          {/* Search Bar Input */}
          <div className="flex items-center gap-2 pt-1">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                value={customSearchQuery}
                onChange={e => setCustomSearchQuery(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    performWikimediaSearch(customSearchQuery, activePlace.destination);
                  }
                }}
                placeholder="Search Wikimedia Commons / Wikipedia for this place..."
                className="pl-10 h-11 bg-gray-50 border-gray-200 focus:bg-white text-sm font-medium rounded-xl"
              />
              {customSearchQuery && (
                <button
                  onClick={() => setCustomSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <Button
              onClick={() => performWikimediaSearch(customSearchQuery, activePlace.destination)}
              disabled={isSearchingWiki}
              className="h-11 px-5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-sm"
            >
              {isSearchingWiki ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              <span>Search Photos</span>
            </Button>
          </div>
        </div>

        {/* ─── SELECTED PHOTOS TRAY ─── */}
        <div className="p-4 px-6 bg-slate-900 text-white rounded-2xl shadow-md border border-slate-800 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                <ImageIcon className="h-4 w-4 text-indigo-400" />
                Selected Photos ({selectedImages.length})
              </span>
              <span className="text-[11px] text-gray-400">
                (Click any photo below to add/remove. Drag or use arrows to order left-to-right)
              </span>
            </div>

            {selectedImages.length > 0 && (
              <button
                onClick={() => setSelectedImages([])}
                className="text-xs text-rose-400 hover:text-rose-300 font-semibold underline self-end sm:self-auto"
              >
                Clear All ({selectedImages.length})
              </button>
            )}
          </div>

          {selectedImages.length === 0 ? (
            <div className="py-4 text-center bg-slate-950/60 rounded-xl border border-dashed border-slate-800">
              <p className="text-xs text-amber-300 font-medium">
                No photos selected yet. Click any photo from the search results below to select it for this day.
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-3 overflow-x-auto py-2 scrollbar-thin">
              {selectedImages.map((img, idx) => (
                <div
                  key={img.id || idx}
                  className="relative group rounded-xl overflow-hidden border-2 border-indigo-400 w-20 h-20 shrink-0 bg-black shadow-md"
                >
                  <img src={img.thumbUrl} alt={img.title} className="w-full h-full object-cover" />
                  {/* Sequence Badge */}
                  <span className="absolute top-0 left-0 bg-indigo-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-br-lg shadow-sm">
                    #{idx + 1}
                  </span>
                  {/* Action Overlays */}
                  <div className="absolute inset-0 bg-black/75 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                    {idx > 0 && (
                      <button
                        onClick={() => handleMoveImage(idx, 'left')}
                        className="text-white hover:text-indigo-300 p-1 bg-white/20 rounded hover:bg-white/30"
                        title="Move Earlier in Sequence"
                      >
                        <ArrowLeft className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => handleRemoveFromTray(idx)}
                      className="text-rose-400 hover:text-rose-300 p-1 bg-white/20 rounded hover:bg-rose-900/60"
                      title="Remove"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                    {idx < selectedImages.length - 1 && (
                      <button
                        onClick={() => handleMoveImage(idx, 'right')}
                        className="text-white hover:text-indigo-300 p-1 bg-white/20 rounded hover:bg-white/30"
                        title="Move Later in Sequence"
                      >
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ─── WIKIMEDIA COMMONS & WIKIPEDIA PHOTO GRID ─── */}
        <div className="bg-white rounded-2xl border border-gray-200/90 shadow-sm p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-gray-100">
            <div>
              <p className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                {wikiResults.length > 0 ? `Found ${wikiResults.length} Location Photos` : 'Image Search Results'}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Query: <span className="font-semibold text-indigo-600">"{customSearchQuery}"</span> &bull; Click photos to select or deselect
              </p>
            </div>

            {/* Source Legend / Badges */}
            <div className="flex items-center gap-1.5 text-[10px] flex-wrap">
              <span className="bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full font-bold border border-emerald-200">
                Wikimedia Commons (Primary)
              </span>
              <span className="bg-blue-100 text-blue-800 px-2.5 py-1 rounded-full font-bold border border-blue-200">
                Wikipedia Lead
              </span>
              <span className="bg-pink-100 text-pink-800 px-2.5 py-1 rounded-full font-bold border border-pink-200">
                Flickr CC
              </span>
            </div>
          </div>

          {isSearchingWiki ? (
            <div className="h-72 flex flex-col items-center justify-center text-center">
              <Loader2 className="h-10 w-10 text-indigo-600 animate-spin mb-3" />
              <p className="text-sm font-bold text-gray-800">
                Querying Wikimedia Commons (Primary), Wikipedia & Flickr...
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Fetching high-resolution verified place photos
              </p>
            </div>
          ) : wikiResults.length === 0 ? (
            <div className="h-72 flex flex-col items-center justify-center text-center p-6 bg-gray-50/70 rounded-2xl border border-dashed border-gray-200">
              <div className="w-14 h-14 bg-gray-200 text-gray-500 rounded-full flex items-center justify-center mb-3">
                <Search className="h-6 w-6" />
              </div>
              <h4 className="text-base font-bold text-gray-800">No photos found for "{customSearchQuery}"</h4>
              <p className="text-xs text-gray-500 max-w-sm mt-1">
                Try searching with simpler terms (e.g. landmark name, city name, or select another sequential spot above).
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {wikiResults.map(img => {
                const selectedIndex = selectedImages.findIndex(
                  item => item.fullUrl === img.fullUrl || item.thumbUrl === img.thumbUrl
                );
                const isSelected = selectedIndex !== -1;

                const isCommons = img.source === 'Wikimedia Commons';
                const isWiki = img.source === 'Wikipedia';
                const isFlickr = img.source === 'Flickr (CC)';

                return (
                  <div
                    key={img.id}
                    onClick={() => handleToggleImageSelection(img)}
                    className={`group relative rounded-2xl overflow-hidden border-2 cursor-pointer transition-all duration-200 bg-white flex flex-col justify-between shadow-sm ${
                      isSelected
                        ? 'border-indigo-600 ring-4 ring-indigo-500/20 shadow-lg scale-[1.02]'
                        : 'border-transparent hover:border-indigo-300 hover:shadow-md'
                    }`}
                  >
                    {/* Image Box */}
                    <div className="relative h-40 w-full bg-gray-200 overflow-hidden">
                      <img
                        src={img.thumbUrl}
                        alt={img.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />

                      {/* Selected Sequence Badge */}
                      {isSelected ? (
                        <div className="absolute top-2 right-2 bg-indigo-600 text-white rounded-full px-2.5 py-1 text-xs font-black shadow-md flex items-center gap-1 animate-in zoom-in-75">
                          <Check className="h-3.5 w-3.5 stroke-[3]" />
                          <span>#{selectedIndex + 1}</span>
                        </div>
                      ) : (
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 bg-black/60 text-white rounded-full p-1 transition-opacity">
                          <Plus className="h-4 w-4" />
                        </div>
                      )}

                      {/* Preview Button */}
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          setPreviewFullImageUrl(img.fullUrl || img.thumbUrl);
                        }}
                        className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 bg-black/60 text-white rounded-full p-1 transition-opacity hover:bg-black/80"
                        title="Preview Full Image"
                      >
                        <Eye className="h-4 w-4" />
                      </button>

                      {/* Source Badge with dynamic colors */}
                      <div
                        className={`absolute bottom-2 left-2 backdrop-blur-md text-[10px] font-bold px-2 py-0.5 rounded-lg shadow-sm ${
                          isCommons
                            ? 'bg-emerald-950/90 text-emerald-200 border border-emerald-400/30'
                            : isWiki
                            ? 'bg-blue-950/90 text-blue-200 border border-blue-400/30'
                            : isFlickr
                            ? 'bg-pink-950/90 text-pink-200 border border-pink-400/30'
                            : 'bg-black/70 text-white'
                        }`}
                      >
                        {img.source}
                      </div>

                      {/* Resolution Badge */}
                      {img.width > 0 && (
                        <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-md text-white text-[10px] px-1.5 py-0.5 rounded font-mono">
                          {img.width}x{img.height}
                        </div>
                      )}
                    </div>

                    {/* Image Details */}
                    <div className="p-3 text-left space-y-1 bg-white">
                      <p className="text-xs font-bold text-gray-800 line-clamp-1" title={img.title}>
                        {img.title}
                      </p>
                      <div className="flex items-center justify-between text-[10px] text-gray-500">
                        <span className="truncate max-w-[100px]" title={img.license}>
                          {img.license || 'CC BY-SA'}
                        </span>
                        {img.sourceUrl && (
                          <a
                            href={img.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5 font-medium"
                            title="View on Source Site"
                          >
                            <span>View Source</span>
                            <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ─── STICKY BOTTOM ACTION BAR (GUARANTEED VISIBLE AT SCREEN BOTTOM) ─── */}
        <div className="sticky bottom-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-[0_-4px_25px_rgba(0,0,0,0.12)] p-4 px-6 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-xs text-gray-700">
            <label className="flex items-center gap-2 cursor-pointer select-none font-semibold">
              <input
                type="checkbox"
                checked={updatePlacesCovered}
                onChange={e => setUpdatePlacesCovered(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
              />
              <span>Also update matching Place in Package Highlights</span>
            </label>

            <span className="text-gray-400">|</span>

            <span className="font-bold text-gray-900">
              {selectedImages.length} Photo{selectedImages.length === 1 ? '' : 's'} Selected
            </span>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto shrink-0 flex-wrap">
            <Button
              variant="outline"
              onClick={() => setActivePlace(null)}
              disabled={isSaving}
              className="text-xs font-semibold rounded-xl"
            >
              Back to List
            </Button>

            <Button
              variant="ghost"
              onClick={handleSkipToNextPlace}
              disabled={isSaving}
              className="text-xs font-semibold text-gray-600 hover:text-gray-900 rounded-xl"
              title="Skip this day and move to next missing place"
            >
              <span>Skip Place</span>
              <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>

            <Button
              onClick={() => handleSavePhotos(false)}
              disabled={selectedImages.length === 0 || isSaving}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-2 shadow-sm"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              <span>Save {selectedImages.length} Photo{selectedImages.length === 1 ? '' : 's'}</span>
            </Button>

            <Button
              onClick={() => handleSavePhotos(true)}
              disabled={selectedImages.length === 0 || isSaving}
              className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-xs px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-500/25 transition-all transform hover:scale-[1.02]"
              title="Save photos for this day and immediately open next missing place"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              <span>Save & Next Place</span>
            </Button>
          </div>
        </div>

        {/* ─── FULL SIZE IMAGE PREVIEW LIGHTBOX ─── */}
        {previewFullImageUrl && (
          <div
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 animate-in fade-in"
            onClick={() => setPreviewFullImageUrl(null)}
          >
            <div className="relative max-w-5xl max-h-[90vh] overflow-hidden rounded-2xl">
              <button
                onClick={() => setPreviewFullImageUrl(null)}
                className="absolute top-4 right-4 bg-black/60 text-white p-2 rounded-full hover:bg-black/90 transition-colors z-10"
              >
                <X className="h-6 w-6" />
              </button>
              <img
                src={previewFullImageUrl}
                alt="Full preview"
                className="max-h-[85vh] w-auto max-w-full object-contain rounded-2xl"
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER: OVERVIEW DASHBOARD & PACKAGES / PLACES LISTING VIEW
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* ─── TOAST NOTIFICATION ─── */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-5">
          <div
            className={`flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl text-white text-sm font-medium border ${
              toast.type === 'success'
                ? 'bg-emerald-600 border-emerald-500 shadow-emerald-900/20'
                : toast.type === 'error'
                ? 'bg-rose-600 border-rose-500 shadow-rose-900/20'
                : 'bg-slate-900 border-slate-700 shadow-slate-950/30'
            }`}
          >
            {toast.type === 'success' && <CheckCircle2 className="h-5 w-5 shrink-0" />}
            {toast.type === 'error' && <AlertCircle className="h-5 w-5 shrink-0" />}
            {toast.type === 'info' && <Info className="h-5 w-5 shrink-0" />}
            <span>{toast.message}</span>
            <button onClick={() => setToast(null)} className="ml-2 text-white/80 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ─── TOP HEADER & ACTIONS ─── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-xl shadow-sm">
              <ImageIcon className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Itinerary Photo Manager</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                AI extracts sequential landmarks from itinerary descriptions & fetches free-to-use Wikipedia / Wikimedia photos with multi-photo support
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end md:self-auto flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchAllListings}
            disabled={loading}
            className="flex items-center gap-2 text-gray-700 hover:bg-gray-50 rounded-xl"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Listings</span>
          </Button>

          {stats.repeatedFillableCount > 0 && (
            <Button
              size="sm"
              onClick={handleAutoFillAllRepeatedPlaces}
              disabled={loading || isAutoFillingRepeated}
              className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2 shadow-sm font-semibold rounded-xl animate-in fade-in"
              title="Automatically copy photos to matching missing places across all packages"
            >
              {isAutoFillingRepeated ? (
                <Loader2 className="h-4 w-4 animate-spin text-white" />
              ) : (
                <Sparkles className="h-4 w-4 text-emerald-200" />
              )}
              <span>Auto-Fill {stats.repeatedFillableCount} Repeated Places</span>
            </Button>
          )}

          {stats.missingPlaces > 0 && (
            <Button
              size="sm"
              onClick={() => {
                const firstMissing = allItineraryPlaces.find(p => !p.hasPhoto);
                if (firstMissing) handleOpenPhotoSelector(firstMissing);
              }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2 shadow-sm rounded-xl font-bold"
            >
              <Sparkles className="h-4 w-4 text-indigo-200" />
              <span>Start Fast Auto-Populate</span>
            </Button>
          )}
        </div>
      </div>

      {/* ─── STATS DASHBOARD ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white border-gray-200/80 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Packages Scanned</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalPackages}</p>
                <p className="text-xs text-gray-500 mt-0.5">Across all agencies</p>
              </div>
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                <FolderOpen className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-gray-200/80 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Itinerary Days</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalPlaces}</p>
                <p className="text-xs text-gray-500 mt-0.5">Place stops & activities</p>
              </div>
              <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                <Layers className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`border shadow-sm hover:shadow-md transition-shadow ${stats.missingPlaces > 0 ? 'bg-amber-50/40 border-amber-200' : 'bg-white border-gray-200/80'}`}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Missing Photos</p>
                <p className="text-2xl font-bold text-amber-900 mt-1">{stats.missingPlaces}</p>
                <p className="text-xs text-amber-600 mt-0.5">Need photo upload</p>
              </div>
              <div className="p-3 bg-amber-100 text-amber-700 rounded-xl">
                <AlertCircle className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-gray-200/80 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="w-full mr-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Photo Coverage</p>
                  <span className="text-sm font-bold text-emerald-600">{stats.coveragePercent}%</span>
                </div>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.completedPlaces} <span className="text-sm font-normal text-gray-500">/ {stats.totalPlaces}</span></p>
                {/* Progress Bar */}
                <div className="w-full bg-gray-100 rounded-full h-2 mt-2 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-emerald-500 to-teal-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${stats.coveragePercent}%` }}
                  />
                </div>
              </div>
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl shrink-0">
                <CheckCircle2 className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── SEARCH & FILTER CONTROLS ─── */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm space-y-4">
        {/* Filter Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4">
          <div className="flex items-center gap-1 bg-gray-100/80 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('missing')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'missing'
                  ? 'bg-white text-amber-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <AlertCircle className="h-4 w-4 text-amber-500" />
              <span>Missing Photos</span>
              <span className="bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded-full font-bold">
                {stats.missingPlaces}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('all')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'all'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Layers className="h-4 w-4 text-gray-500" />
              <span>All Places</span>
              <span className="bg-gray-200 text-gray-700 text-xs px-2 py-0.5 rounded-full font-medium">
                {stats.totalPlaces}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('completed')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'completed'
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span>With Photos</span>
              <span className="bg-emerald-100 text-emerald-800 text-xs px-2 py-0.5 rounded-full font-medium">
                {stats.completedPlaces}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('audit')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'audit'
                  ? 'bg-white text-rose-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <AlertCircle className="h-4 w-4 text-rose-500" />
              <span>Audit Report</span>
              {auditReport.totalIssues > 0 ? (
                <span className="bg-rose-100 text-rose-800 text-xs px-2 py-0.5 rounded-full font-bold">
                  {auditReport.totalIssues} issues
                </span>
              ) : (
                <span className="bg-emerald-100 text-emerald-800 text-xs px-2 py-0.5 rounded-full font-bold">
                  ✓ Clean
                </span>
              )}
            </button>
          </div>

          {/* View mode toggle */}
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl text-xs font-medium">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'grid' ? 'bg-white text-gray-900 font-semibold shadow-sm' : 'text-gray-600'
              }`}
            >
              Grid View
            </button>
            <button
              onClick={() => setViewMode('grouped')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'grouped' ? 'bg-white text-gray-900 font-semibold shadow-sm' : 'text-gray-600'
              }`}
            >
              Group by Package
            </button>
          </div>
        </div>

        {/* Search Inputs & Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1">
          <div className="sm:col-span-6 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by place name, package title, destination, or agency..."
              className="pl-10 h-10 bg-gray-50 border-gray-200 focus:bg-white text-sm rounded-xl"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="sm:col-span-3">
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value as any)}
              className="w-full h-10 px-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Package Types</option>
              <option value="domestic">Domestic Packages</option>
              <option value="international">International Packages</option>
            </select>
          </div>

          <div className="sm:col-span-3">
            <select
              value={selectedDestination}
              onChange={e => setSelectedDestination(e.target.value)}
              className="w-full h-10 px-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Destinations ({destinationsList.length})</option>
              {destinationsList.map(dest => (
                <option key={dest} value={dest}>
                  {dest}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ─── AUDIT REPORT PANEL (only when audit tab is active) ─── */}
      {activeTab === 'audit' && (
        <div className="space-y-6">
          {/* ── Summary Banner ── */}
          <div className={`rounded-2xl p-6 border shadow-sm ${
            auditReport.totalIssues === 0
              ? 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200'
              : 'bg-gradient-to-r from-rose-50 via-orange-50 to-amber-50 border-rose-200'
          }`}>
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-sm font-black ${
                  auditReport.totalIssues === 0 ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
                }`}>
                  {auditReport.totalIssues === 0 ? '✅' : '🔍'}
                </div>
                <div>
                  <h2 className={`text-xl font-black ${
                    auditReport.totalIssues === 0 ? 'text-emerald-800' : 'text-rose-800'
                  }`}>
                    {auditReport.totalIssues === 0
                      ? 'All Clear — No Issues Found!'
                      : `${auditReport.totalIssues} Quality Issues Detected`}
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Scanned <strong>{stats.totalPackages}</strong> packages · <strong>{stats.totalPlaces}</strong> itinerary days · <strong>{stats.completedPlaces}</strong> days with photos
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 shrink-0">
                {[
                  { label: 'Duplicate Names', count: auditReport.duplicateNames.length, bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
                  { label: 'Duplicate Images', count: auditReport.duplicateImages.length, bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
                  { label: 'Empty Names', count: auditReport.emptyNames.length, bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
                  { label: 'Front Thumbnails', count: auditReport.orphanedFrontThumbnails.length, bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
                  { label: 'Mismatches', count: auditReport.suspiciousMismatches.length, bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
                ].map(item => (
                  <div key={item.label} className={`${item.bg} rounded-xl p-3 text-center border ${item.border} shadow-sm`}>
                    <p className={`text-2xl font-black ${item.text}`}>{item.count}</p>
                    <p className="text-[11px] font-semibold text-gray-500 mt-0.5">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Orphaned Front Thumbnails Alert & 1-Click Fix ── */}
          {auditReport.orphanedFrontThumbnails.length > 0 && (
            <div className="bg-rose-50/80 border-2 border-rose-300 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-rose-600 text-white rounded-xl shadow-sm shrink-0">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-rose-950 text-base flex items-center gap-2">
                      <span>Front Thumbnails Contain Deleted / Mismatched Photos</span>
                      <span className="bg-rose-200 text-rose-800 text-xs px-2.5 py-0.5 rounded-full font-black">
                        {auditReport.orphanedFrontThumbnails.length} package{auditReport.orphanedFrontThumbnails.length > 1 ? 's' : ''}
                      </span>
                    </h3>
                    <p className="text-xs text-rose-700 mt-1">
                      These packages still display a deleted photo on the main package page because cover photos are cached in the package's places list. Click below to clean them instantly.
                    </p>
                  </div>
                </div>

                <Button
                  onClick={handleSyncAllOrphanedThumbnails}
                  disabled={isSaving}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs h-9 px-4 rounded-xl shadow-md flex items-center gap-2 shrink-0 transition-all"
                >
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  <span>Sync & Fix All Front Thumbnails ({auditReport.orphanedFrontThumbnails.length})</span>
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
                {auditReport.orphanedFrontThumbnails.map(item => (
                  <div
                    key={item.listingId}
                    className="bg-white border border-rose-200 rounded-xl p-3 flex items-center gap-3 shadow-2xs"
                  >
                    <div
                      onClick={() => setPreviewFullImageUrl(item.thumbnailUrl)}
                      className="w-14 h-14 rounded-lg overflow-hidden border border-rose-200 shrink-0 bg-gray-100 cursor-pointer relative group"
                      title="Click to preview current front thumbnail"
                    >
                      <img
                        src={item.thumbnailUrl}
                        alt="Current thumbnail"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        onError={e => { (e.target as HTMLImageElement).style.opacity = '0.3'; }}
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px]">
                        <Eye className="h-3 w-3" />
                      </div>
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-xs text-gray-900 truncate" title={item.listingTitle}>
                        {item.listingTitle}
                      </p>
                      <p className="text-[11px] text-gray-500 truncate">
                        {item.destination} {item.agencyName ? `· ${item.agencyName}` : ''}
                      </p>
                      <p className="text-[10px] text-rose-600 font-semibold mt-0.5">
                        {item.suggestedPhoto ? '✓ Will sync with active itinerary photo' : '✗ No other photos in package'}
                      </p>
                    </div>

                    <button
                      onClick={() => handleSyncSingleOrphanedThumbnail(item)}
                      disabled={isSaving}
                      className="px-2.5 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-800 text-[11px] font-bold rounded-lg transition-colors shrink-0"
                      title="Clean this front thumbnail"
                    >
                      Fix
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Package Health Scores ── */}
          {auditReport.packageHealth.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-gray-100 flex items-center gap-3 bg-gray-50/50">
                <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl"><Layers className="h-5 w-5" /></div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base">Package Health Scores</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Sorted by worst health score first. Score = photo coverage % minus penalty for unnamed days.</p>
                </div>
              </div>
              <div className="divide-y divide-gray-100">
                {auditReport.packageHealth.map(pkg => (
                  <div key={pkg.listingId} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-gray-50/60 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate">{pkg.listingTitle}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {pkg.withPhoto}/{pkg.totalDays} days have photos
                        {pkg.emptyNameDays > 0 && (
                          <span className="ml-2 text-amber-600 font-semibold">· {pkg.emptyNameDays} unnamed day{pkg.emptyNameDays > 1 ? 's' : ''}</span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="w-28 bg-gray-100 rounded-full h-2.5 overflow-hidden">
                        <div
                          className={`h-2.5 rounded-full transition-all ${
                            pkg.score >= 80 ? 'bg-emerald-500' : pkg.score >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                          }`}
                          style={{ width: `${pkg.score}%` }}
                        />
                      </div>
                      <span className={`text-sm font-black w-10 text-right ${
                        pkg.score >= 80 ? 'text-emerald-600' : pkg.score >= 50 ? 'text-amber-600' : 'text-rose-600'
                      }`}>
                        {pkg.score}%
                      </span>
                      {pkg.missingPhoto > 0 ? (
                        <span className="bg-amber-100 text-amber-800 text-[11px] px-2.5 py-1 rounded-full font-bold">{pkg.missingPhoto} missing</span>
                      ) : (
                        <span className="bg-emerald-100 text-emerald-700 text-[11px] px-2.5 py-1 rounded-full font-bold">✓ Complete</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Duplicate Place Names ── */}
          {auditReport.duplicateNames.length > 0 && (
            <div className="bg-white rounded-2xl border border-orange-200 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-orange-100 flex items-center gap-3 bg-orange-50/50">
                <div className="p-2 bg-orange-100 text-orange-600 rounded-xl"><MapPin className="h-5 w-5" /></div>
                <div>
                  <h3 className="font-bold text-orange-900 text-base">Duplicate Place Names ({auditReport.duplicateNames.length})</h3>
                  <p className="text-xs text-orange-700 mt-0.5">Same place name found in multiple packages or multiple times within one package.</p>
                </div>
              </div>
              <div className="divide-y divide-orange-50">
                {auditReport.duplicateNames.map((dn, i) => (
                  <div key={i} className="p-5">
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      <span className="font-bold text-gray-900">{dn.placeName}</span>
                      <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                        dn.type === 'same-package'
                          ? 'bg-rose-100 text-rose-700 border-rose-200'
                          : 'bg-orange-100 text-orange-700 border-orange-200'
                      }`}>
                        {dn.type === 'same-package' ? '⚠ Same-Package Duplicate' : '↗ Cross-Package'}
                      </span>
                      <span className="text-xs text-gray-400">{dn.occurrences.length} occurrences</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {dn.occurrences.map((occ, j) => (
                        <div key={j} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3 border border-gray-100">
                          <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0 bg-gray-200 border border-gray-200">
                            {occ.imageUrl ? (
                              <img src={occ.imageUrl} alt={dn.placeName} className="w-full h-full object-cover"
                                onError={e => { (e.target as HTMLImageElement).style.opacity = '0.3'; }} />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-amber-400">
                                <AlertCircle className="h-5 w-5" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-gray-800">Day {occ.dayNumber}</p>
                            <p className="text-[11px] text-gray-500 truncate">{occ.listingTitle}</p>
                            <span className={`text-[10px] font-semibold ${
                              occ.hasPhoto ? 'text-emerald-600' : 'text-amber-600'
                            }`}>
                              {occ.hasPhoto ? '✓ Has photo' : '✗ Missing photo'}
                            </span>
                          </div>
                          <button
                            onClick={() => handleOpenPhotoSelector(occ)}
                            className="ml-auto shrink-0 text-[10px] bg-orange-500 hover:bg-orange-600 text-white px-2.5 py-1 rounded-lg font-bold transition-colors"
                          >
                            Edit
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Duplicate Images ── */}
          {auditReport.duplicateImages.length > 0 && (
            <div className="bg-white rounded-2xl border border-purple-200 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-purple-100 flex items-center justify-between gap-3 bg-purple-50/50 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 text-purple-600 rounded-xl"><Globe className="h-5 w-5" /></div>
                  <div>
                    <h3 className="font-bold text-purple-900 text-base">Duplicate Images — Same Photo on Different Places ({auditReport.duplicateImages.length})</h3>
                    <p className="text-xs text-purple-700 mt-0.5">
                      One image URL is shared across multiple places. View the table below to check place names against the image title and bulk delete mismatched photo assignments with 1 click.
                    </p>
                  </div>
                </div>
              </div>

              <div className="divide-y divide-purple-100">
                {auditReport.duplicateImages.map((di, i) => {
                  const mode = duplicateViewMode[di.imageUrl] || 'table';
                  const filter = duplicateFilter[di.imageUrl] || 'all';
                  const selectedIds = bulkSelectedPlaceIds[di.imageUrl] || [];

                  // Filtered usages for this duplicate group
                  const filteredUsages = di.usages.filter(u => {
                    const match = checkImageAndPlaceMatch(di.imageTitle, u.placeName, u.destination);
                    if (filter === 'mismatched') return !match.isMatch;
                    if (filter === 'matching') return match.isMatch;
                    return true;
                  });

                  const mismatchedList = di.usages.filter(
                    u => !checkImageAndPlaceMatch(di.imageTitle, u.placeName, u.destination).isMatch
                  );
                  const mismatchedIds = mismatchedList.map(u => u.id);

                  const isAllVisibleSelected =
                    filteredUsages.length > 0 &&
                    filteredUsages.every(u => selectedIds.includes(u.id));

                  const handleToggleSelectAllVisible = () => {
                    if (isAllVisibleSelected) {
                      const visibleSet = new Set(filteredUsages.map(u => u.id));
                      setBulkSelectedPlaceIds(prev => ({
                        ...prev,
                        [di.imageUrl]: (prev[di.imageUrl] || []).filter(id => !visibleSet.has(id))
                      }));
                    } else {
                      const combined = new Set([...selectedIds, ...filteredUsages.map(u => u.id)]);
                      setBulkSelectedPlaceIds(prev => ({
                        ...prev,
                        [di.imageUrl]: Array.from(combined)
                      }));
                    }
                  };

                  const handleSelectOnlyMismatched = () => {
                    setBulkSelectedPlaceIds(prev => ({
                      ...prev,
                      [di.imageUrl]: mismatchedIds
                    }));
                  };

                  const handleSelectRow = (placeId: string) => {
                    setBulkSelectedPlaceIds(prev => {
                      const current = prev[di.imageUrl] || [];
                      const next = current.includes(placeId)
                        ? current.filter(id => id !== placeId)
                        : [...current, placeId];
                      return { ...prev, [di.imageUrl]: next };
                    });
                  };

                  const selectedPlaces = di.usages.filter(u => selectedIds.includes(u.id));

                  return (
                    <div key={i} className="p-5 space-y-4 hover:bg-purple-50/15 transition-colors">
                      {/* Top Asset & Match Summary Bar */}
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-purple-50/70 border border-purple-100 p-4 rounded-2xl">
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div
                            onClick={() => setPreviewFullImageUrl(di.imageUrl)}
                            className="relative group w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border-2 border-purple-200 shadow-sm bg-gray-100 shrink-0 cursor-pointer"
                            title="Click to preview full photo"
                          >
                            <img
                              src={di.imageUrl}
                              alt="Shared duplicate"
                              className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                              onError={e => { (e.target as HTMLImageElement).style.opacity = '0.3'; }}
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold">
                              <Eye className="h-4 w-4" />
                            </div>
                          </div>

                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[11px] text-purple-700 font-bold uppercase tracking-wider">Image Title / Subject:</span>
                              <span className="text-xs sm:text-sm font-black text-purple-950 bg-white px-2.5 py-0.5 rounded-lg border border-purple-200 shadow-2xs">
                                {di.imageTitle}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap text-xs text-purple-800">
                              <span className="font-semibold">Used on {di.usages.length} places:</span>
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-100/70 border border-rose-200 px-2 py-0.5 rounded-md">
                                <AlertCircle className="h-3 w-3 text-rose-600" />
                                {di.mismatchedCount} Not Matching
                              </span>
                              {di.matchingCount > 0 && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100/70 border border-emerald-200 px-2 py-0.5 rounded-md">
                                  <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                  {di.matchingCount} Matching
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* View Switcher & Action Controls */}
                        <div className="flex items-center gap-2 flex-wrap shrink-0">
                          <div className="inline-flex rounded-lg border border-purple-200 bg-white p-0.5 shadow-2xs">
                            <button
                              onClick={() => setDuplicateViewMode(prev => ({ ...prev, [di.imageUrl]: 'table' }))}
                              className={`px-2.5 py-1 text-xs font-bold rounded-md flex items-center gap-1 transition-all ${
                                mode === 'table' ? 'bg-purple-600 text-white shadow-xs' : 'text-purple-700 hover:bg-purple-50'
                              }`}
                            >
                              <TableIcon className="h-3.5 w-3.5" />
                              <span>Table View</span>
                            </button>
                            <button
                              onClick={() => setDuplicateViewMode(prev => ({ ...prev, [di.imageUrl]: 'cards' }))}
                              className={`px-2.5 py-1 text-xs font-bold rounded-md flex items-center gap-1 transition-all ${
                                mode === 'cards' ? 'bg-purple-600 text-white shadow-xs' : 'text-purple-700 hover:bg-purple-50'
                              }`}
                            >
                              <LayoutGrid className="h-3.5 w-3.5" />
                              <span>Cards View</span>
                            </button>
                          </div>

                          <button
                            onClick={() => setPreviewFullImageUrl(di.imageUrl)}
                            className="px-2.5 py-1.5 text-xs font-semibold text-purple-700 hover:text-purple-900 bg-white hover:bg-purple-100 border border-purple-200 rounded-lg transition-colors flex items-center gap-1 shadow-2xs"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>Preview</span>
                          </button>
                        </div>
                      </div>

                      {/* Filter Tabs & Bulk Actions Bar */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-purple-100">
                        {/* Filter Pills */}
                        <div className="flex items-center gap-1.5 flex-wrap text-xs">
                          <button
                            onClick={() => setDuplicateFilter(prev => ({ ...prev, [di.imageUrl]: 'all' }))}
                            className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                              filter === 'all' ? 'bg-purple-100 text-purple-800' : 'text-gray-600 hover:bg-gray-100'
                            }`}
                          >
                            All Places ({di.usages.length})
                          </button>
                          <button
                            onClick={() => setDuplicateFilter(prev => ({ ...prev, [di.imageUrl]: 'mismatched' }))}
                            className={`px-2.5 py-1 rounded-lg font-bold transition-colors flex items-center gap-1 ${
                              filter === 'mismatched' ? 'bg-rose-100 text-rose-800' : 'text-rose-600 hover:bg-rose-50'
                            }`}
                          >
                            <AlertCircle className="h-3 w-3" />
                            <span>Not Matching ({di.mismatchedCount})</span>
                          </button>
                          {di.matchingCount > 0 && (
                            <button
                              onClick={() => setDuplicateFilter(prev => ({ ...prev, [di.imageUrl]: 'matching' }))}
                              className={`px-2.5 py-1 rounded-lg font-bold transition-colors flex items-center gap-1 ${
                                filter === 'matching' ? 'bg-emerald-100 text-emerald-800' : 'text-emerald-600 hover:bg-emerald-50'
                              }`}
                            >
                              <CheckCircle2 className="h-3 w-3" />
                              <span>Matching ({di.matchingCount})</span>
                            </button>
                          )}
                        </div>

                        {/* Bulk Action Controls */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {di.mismatchedCount > 0 && (
                            <button
                              onClick={handleSelectOnlyMismatched}
                              className="text-xs font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs"
                              title="Select all places where place name does not match image title"
                            >
                              <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                              <span>Select All Not Matching ({di.mismatchedCount})</span>
                            </button>
                          )}

                          {selectedIds.length > 0 && (
                            <button
                              onClick={() => setBulkSelectedPlaceIds(prev => ({ ...prev, [di.imageUrl]: [] }))}
                              className="text-xs text-gray-500 hover:text-gray-800 underline px-1.5 py-1 font-medium"
                            >
                              Clear Selection ({selectedIds.length})
                            </button>
                          )}

                          <Button
                            onClick={() => handleBulkRemovePhotos(selectedPlaces, di.imageUrl)}
                            disabled={selectedIds.length === 0 || isSaving}
                            variant="destructive"
                            size="sm"
                            className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs h-8 px-3 rounded-lg shadow-sm flex items-center gap-1.5 transition-all disabled:opacity-40"
                            title="Bulk delete/unlink this wrong image from selected places"
                          >
                            {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                            <span>Bulk Delete Selected ({selectedIds.length})</span>
                          </Button>
                        </div>
                      </div>

                      {/* View Mode: Table Format */}
                      {mode === 'table' ? (
                        <div className="overflow-x-auto rounded-xl border border-purple-200 shadow-xs bg-white">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="bg-purple-100/70 border-b border-purple-200 text-purple-950 font-bold">
                                <th className="p-3 w-10 text-center">
                                  <input
                                    type="checkbox"
                                    checked={isAllVisibleSelected}
                                    onChange={handleToggleSelectAllVisible}
                                    className="rounded border-purple-300 text-purple-600 focus:ring-purple-500 h-4 w-4 cursor-pointer"
                                    title="Select / Deselect all visible"
                                  />
                                </th>
                                <th className="p-3">Day & Package</th>
                                <th className="p-3">Place Name</th>
                                <th className="p-3">Image Subject</th>
                                <th className="p-3">Match Status</th>
                                <th className="p-3 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-purple-100">
                              {filteredUsages.length === 0 ? (
                                <tr>
                                  <td colSpan={6} className="p-6 text-center text-gray-500">
                                    No places found matching the current filter.
                                  </td>
                                </tr>
                              ) : (
                                filteredUsages.map(u => {
                                  const isSelected = selectedIds.includes(u.id);
                                  const match = checkImageAndPlaceMatch(di.imageTitle, u.placeName, u.destination);
                                  return (
                                    <tr
                                      key={u.id}
                                      className={`transition-colors ${
                                        isSelected
                                          ? 'bg-purple-100/60'
                                          : match.isMatch
                                          ? 'hover:bg-emerald-50/30'
                                          : 'bg-rose-50/25 hover:bg-rose-50/45'
                                      }`}
                                    >
                                      <td className="p-3 text-center">
                                        <input
                                          type="checkbox"
                                          checked={isSelected}
                                          onChange={() => handleSelectRow(u.id)}
                                          className="rounded border-purple-300 text-purple-600 focus:ring-purple-500 h-4 w-4 cursor-pointer"
                                        />
                                      </td>
                                      <td className="p-3">
                                        <div className="flex items-center gap-2">
                                          <span className="w-6 h-6 rounded-md bg-purple-200 text-purple-800 font-black text-[11px] flex items-center justify-center shrink-0">
                                            D{u.dayNumber}
                                          </span>
                                          <div className="min-w-0 max-w-[240px]">
                                            <p className="font-semibold text-gray-800 truncate" title={u.listingTitle}>
                                              {u.listingTitle}
                                            </p>
                                            <p className="text-[10px] text-gray-500 truncate">
                                              {u.destination} {u.agencyName ? `· ${u.agencyName}` : ''}
                                            </p>
                                          </div>
                                        </div>
                                      </td>
                                      <td className="p-3">
                                        <span className="font-bold text-gray-900 text-xs">{u.placeName}</span>
                                      </td>
                                      <td className="p-3">
                                        <span
                                          className="text-[11px] font-mono text-gray-700 bg-gray-100 px-2 py-0.5 rounded border border-gray-200 truncate block max-w-[200px]"
                                          title={di.imageTitle}
                                        >
                                          {di.imageTitle}
                                        </span>
                                      </td>
                                      <td className="p-3">
                                        {match.isMatch ? (
                                          <span
                                            className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full"
                                            title={match.reason}
                                          >
                                            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                            <span>Matching</span>
                                          </span>
                                        ) : (
                                          <span
                                            className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full"
                                            title={match.reason}
                                          >
                                            <AlertCircle className="h-3 w-3 text-rose-600" />
                                            <span>Not Matching</span>
                                          </span>
                                        )}
                                      </td>
                                      <td className="p-3 text-right">
                                        <div className="inline-flex items-center gap-1.5 justify-end">
                                          <button
                                            onClick={() => handleRemoveAllPhotos(u)}
                                            className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                            title={`Delete/unlink photo from ${u.placeName}`}
                                          >
                                            <Trash2 className="h-3.5 w-3.5" />
                                          </button>
                                          <button
                                            onClick={() => {
                                              const newUrl = window.prompt(`Paste new image URL for "${u.placeName}" (Day ${u.dayNumber}):`);
                                              if (newUrl && newUrl.trim()) {
                                                handleQuickSetPhoto(u, newUrl.trim());
                                              }
                                            }}
                                            className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                            title="Quick paste new image URL"
                                          >
                                            <Link2 className="h-3.5 w-3.5" />
                                          </button>
                                          <button
                                            onClick={() => handleOpenPhotoSelector(u)}
                                            className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-[11px] font-bold transition-all shadow-2xs inline-flex items-center gap-1"
                                            title={`Change photo for ${u.placeName}`}
                                          >
                                            <Sparkles className="h-3 w-3" />
                                            <span>Change</span>
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })
                              )}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        /* Cards View */
                        <div className="space-y-2">
                          {filteredUsages.map(u => {
                            const isSelected = selectedIds.includes(u.id);
                            const match = checkImageAndPlaceMatch(di.imageTitle, u.placeName, u.destination);
                            return (
                              <div
                                key={u.id}
                                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 border rounded-xl p-3 transition-colors ${
                                  isSelected
                                    ? 'bg-purple-100/70 border-purple-300'
                                    : match.isMatch
                                    ? 'bg-purple-50/60 border-purple-100 hover:bg-purple-50'
                                    : 'bg-rose-50/20 border-rose-100 hover:bg-rose-50/40'
                                }`}
                              >
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => handleSelectRow(u.id)}
                                    className="rounded border-purple-300 text-purple-600 focus:ring-purple-500 h-4 w-4 cursor-pointer"
                                  />
                                  <div className="w-7 h-7 rounded-lg bg-purple-200 text-purple-800 font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                                    D{u.dayNumber}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-xs sm:text-sm font-bold text-gray-900">{u.placeName}</span>
                                      {match.isMatch ? (
                                        <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded font-semibold">
                                          ✓ Matching
                                        </span>
                                      ) : (
                                        <span className="text-[10px] bg-rose-50 text-rose-700 border border-rose-200 px-1.5 py-0.5 rounded font-semibold">
                                          ✗ Not Matching
                                        </span>
                                      )}
                                      {u.destination && (
                                        <span className="text-[10px] bg-white text-purple-700 px-1.5 py-0.5 rounded border border-purple-200 font-medium">
                                          {u.destination}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[11px] text-gray-500 truncate">
                                      <span className="font-medium text-gray-700">{u.listingTitle}</span>
                                      {u.agencyName ? ` · ${u.agencyName}` : ''}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                                  <button
                                    onClick={() => {
                                      const newUrl = window.prompt(`Paste new image URL for "${u.placeName}" (Day ${u.dayNumber}):`);
                                      if (newUrl && newUrl.trim()) {
                                        handleQuickSetPhoto(u, newUrl.trim());
                                      }
                                    }}
                                    className="text-[11px] font-semibold text-purple-700 hover:text-purple-900 bg-white hover:bg-purple-100 border border-purple-200 px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1 shadow-2xs"
                                    title="Quick paste image URL"
                                  >
                                    <Link2 className="h-3 w-3" />
                                    <span>Paste URL</span>
                                  </button>

                                  <button
                                    onClick={() => handleOpenPhotoSelector(u)}
                                    className="text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 active:scale-95 px-3 py-1.5 rounded-lg shadow-sm hover:shadow transition-all flex items-center gap-1.5"
                                    title={`Search and select a photo for ${u.placeName}`}
                                  >
                                    <Sparkles className="h-3.5 w-3.5" />
                                    <span>Change Photo</span>
                                  </button>

                                  <button
                                    onClick={() => handleRemoveAllPhotos(u)}
                                    className="text-gray-400 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg transition-colors"
                                    title={`Remove photo from ${u.placeName}`}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Empty / Missing Place Names ── */}
          {auditReport.emptyNames.length > 0 && (
            <div className="bg-white rounded-2xl border border-amber-200 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-amber-100 flex items-center gap-3 bg-amber-50/50">
                <div className="p-2 bg-amber-100 text-amber-600 rounded-xl"><AlertCircle className="h-5 w-5" /></div>
                <div>
                  <h3 className="font-bold text-amber-900 text-base">Empty / Missing Place Names ({auditReport.emptyNames.length})</h3>
                  <p className="text-xs text-amber-700 mt-0.5">Days using auto-generated fallback names like "Day X Sightseeing" — these should have real place names added.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-5">
                {auditReport.emptyNames.map((place, i) => (
                  <div key={i} className="flex items-center gap-3 bg-amber-50/60 border border-amber-100 rounded-xl p-3">
                    <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center shrink-0 text-amber-700">
                      <span className="font-black text-sm">D{place.dayNumber}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-amber-900">{place.placeName}</p>
                      <p className="text-[11px] text-gray-500 truncate">{place.listingTitle}</p>
                    </div>
                    <button
                      onClick={() => handleOpenPhotoSelector(place)}
                      className="ml-auto shrink-0 text-[10px] bg-amber-500 hover:bg-amber-600 text-white px-2.5 py-1 rounded-lg font-bold transition-colors"
                    >
                      Edit
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Suspicious Name-Image Mismatches ── */}
          {auditReport.suspiciousMismatches.length > 0 && (
            <div className="bg-white rounded-2xl border border-red-200 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-red-100 flex items-center gap-3 bg-red-50/50">
                <div className="p-2 bg-red-100 text-red-600 rounded-xl"><AlertCircle className="h-5 w-5" /></div>
                <div>
                  <h3 className="font-bold text-red-900 text-base">Suspicious Name-Image Mismatches ({auditReport.suspiciousMismatches.length})</h3>
                  <p className="text-xs text-red-700 mt-0.5">Image URL filename keywords don't match the place name — likely a wrong photo assignment. Click "Replace Photo" to fix.</p>
                </div>
              </div>
              <div className="divide-y divide-red-50">
                {auditReport.suspiciousMismatches.map((m, i) => (
                  <div key={i} className="p-5 flex flex-col sm:flex-row gap-4 hover:bg-red-50/20 transition-colors">
                    <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 border-2 border-red-200 shadow-sm">
                      <img
                        src={m.imageUrl}
                        alt={m.placeName}
                        className="w-full h-full object-cover"
                        onError={e => { (e.target as HTMLImageElement).style.opacity = '0.3'; }}
                      />
                    </div>
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-gray-900">{m.placeName}</span>
                        <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-red-200">⚠ Possible Mismatch</span>
                      </div>
                      <p className="text-[11px] text-gray-500">Day {m.dayNumber} · {m.listingTitle}</p>
                      <p className="text-[11px] text-red-600 bg-red-50 p-2 rounded-lg border border-red-100">{m.reason}</p>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setPreviewFullImageUrl(m.imageUrl)}
                          className="text-[11px] text-blue-600 hover:underline font-semibold flex items-center gap-1"
                        >
                          <Eye className="h-3 w-3" /> Preview
                        </button>
                        <span className="text-gray-300">·</span>
                        <button
                          onClick={() => {
                            const place = allItineraryPlaces.find(p => p.listingId === m.listingId && p.dayNumber === m.dayNumber);
                            if (place) handleOpenPhotoSelector(place);
                          }}
                          className="text-[11px] text-indigo-600 hover:underline font-semibold flex items-center gap-1"
                        >
                          <Sparkles className="h-3 w-3" /> Replace Photo
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── All Clear State ── */}
          {auditReport.totalIssues === 0 && (
            <div className="bg-white rounded-2xl border border-emerald-200 p-12 text-center shadow-sm">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-bold text-emerald-900">🎉 Perfect Health — No Issues Found!</h3>
              <p className="text-sm text-gray-500 max-w-md mx-auto mt-2">
                All itinerary place names are unique, all photos are correctly assigned, and no suspicious mismatches were detected across {stats.totalPackages} packages.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ─── PLACES LISTING / GRID (hidden on audit tab) ─── */}
      {activeTab !== 'audit' && filteredPlaces.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-12 text-center">
          <div className="w-16 h-16 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="h-8 w-8 text-emerald-500" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">
            {activeTab === 'missing'
              ? 'No Missing Photos Found!'
              : 'No matching itinerary places found'}
          </h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto mt-1">
            {activeTab === 'missing'
              ? 'Awesome! All itinerary items matching your current filters have photos assigned.'
              : 'Try clearing your search query or adjusting your filters.'}
          </p>
        </div>
      ) : activeTab !== 'audit' && viewMode === 'grid' ? (
        /* ─── FLAT GRID VIEW ─── */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredPlaces.map(place => {
            const hasMultiple = (place.imageUrls || []).length > 1;

            return (
              <div
                key={place.id}
                className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden flex flex-col justify-between ${
                  !place.hasPhoto
                    ? 'border-amber-200/90 shadow-sm hover:shadow-md hover:border-amber-300 ring-1 ring-amber-100'
                    : 'border-gray-200 shadow-sm hover:shadow-md'
                }`}
              >
                <div>
                  {/* Top Image Preview or Missing Placeholder */}
                  <div className="relative h-44 w-full bg-gray-100 overflow-hidden group">
                    {place.hasPhoto && place.imageUrl ? (
                      <>
                        <img
                          src={place.imageUrl}
                          alt={place.placeName}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-3">
                          <button
                            onClick={() => setPreviewFullImageUrl(place.imageUrl || null)}
                            className="bg-black/60 backdrop-blur-md text-white text-xs px-2.5 py-1 rounded-lg flex items-center gap-1 hover:bg-black/80"
                          >
                            <Eye className="h-3.5 w-3.5" /> Preview
                          </button>
                          <button
                            onClick={() => handleRemoveAllPhotos(place)}
                            className="bg-rose-600/80 backdrop-blur-md text-white text-xs px-2 py-1 rounded-lg flex items-center gap-1 hover:bg-rose-700"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <Badge className="absolute top-3 right-3 bg-emerald-600/90 backdrop-blur-md text-white text-[11px] font-semibold border-none shadow-sm">
                          <Check className="h-3 w-3 mr-1" />
                          {hasMultiple ? `${place.imageUrls?.length} Photos` : 'Photo Uploaded'}
                        </Badge>
                      </>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-amber-50/70 to-orange-50/50 border-b border-amber-100">
                        <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mb-2">
                          <ImageIcon className="h-6 w-6" />
                        </div>
                        <span className="text-xs font-semibold text-amber-800">No Photo Uploaded</span>
                        <p className="text-[11px] text-amber-600/90 mt-0.5">AI extracts sequential places & fetches photos</p>
                        <Badge className="absolute top-3 right-3 bg-amber-500 text-white text-[11px] font-semibold border-none shadow-sm animate-pulse">
                          Missing Photo
                        </Badge>
                      </div>
                    )}

                    {/* Day Badge */}
                    <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-md text-white text-xs px-2.5 py-1 rounded-lg font-bold">
                      Day {place.dayNumber}
                    </div>
                  </div>

                  {/* Multi-photo thumbnail strip (if more than 1 photo) */}
                  {place.imageUrls && place.imageUrls.length > 1 && (
                    <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex items-center gap-2 overflow-x-auto">
                      <span className="text-[10px] font-semibold text-gray-500 shrink-0">Photos:</span>
                      {place.imageUrls.map((url, i) => (
                        <div
                          key={i}
                          onClick={() => setPreviewFullImageUrl(url)}
                          className="w-8 h-8 rounded-lg overflow-hidden shrink-0 border border-gray-200 cursor-pointer hover:opacity-80 transition-opacity"
                        >
                          <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Place & Package Details */}
                  <div className="p-5 space-y-2.5">
                    <div>
                      <h3 className="font-bold text-gray-900 text-base leading-snug line-clamp-1">
                        {place.placeName}
                      </h3>
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-1 font-medium">
                        <MapPin className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                        <span className="truncate">{place.destination}</span>
                      </p>
                    </div>

                    <div className="pt-2 border-t border-gray-100">
                      <p className="text-xs text-gray-700 font-semibold truncate">
                        {place.listingTitle}
                      </p>
                      <p className="text-[11px] text-gray-500 truncate mt-0.5">
                        Agency: {place.agencyName || 'Verified Partner'}
                      </p>
                    </div>

                    {place.description && (
                      <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed bg-gray-50/80 p-2.5 rounded-lg border border-gray-100">
                        {place.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Action Button */}
                <div className="p-5 pt-0">
                  <Button
                    onClick={() => handleOpenPhotoSelector(place)}
                    className={`w-full text-sm font-semibold flex items-center justify-center gap-2 rounded-xl transition-all shadow-sm ${
                      !place.hasPhoto
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-indigo-200'
                        : 'bg-gray-100 hover:bg-indigo-50 hover:text-indigo-600 text-gray-700 border border-gray-200'
                    }`}
                  >
                    <Sparkles className="h-4 w-4" />
                    <span>{place.hasPhoto ? 'Manage & Add Photos' : 'AI Extract & Find Photos'}</span>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : activeTab !== 'audit' ? (
        /* ─── GROUPED BY PACKAGE VIEW ─── */
        <div className="space-y-6">
          {groupedByPackage.map(group => {
            const missingInPkg = group.places.filter(p => !p.hasPhoto).length;

            return (
              <div key={group.listingId} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                {/* Package Header */}
                <div className="bg-gray-50/80 p-4 px-6 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-gray-900 text-base">{group.listingTitle}</h3>
                      <Badge variant="outline" className="text-xs bg-white">
                        {group.destination}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Agency: {group.agencyName} &bull; Total {group.places.length} Days
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {missingInPkg > 0 ? (
                      <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200">
                        {missingInPkg} Missing Photos
                      </Badge>
                    ) : (
                      <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200">
                        <Check className="h-3 w-3 mr-1" /> All Days Have Photos
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Days Rows */}
                <div className="divide-y divide-gray-100">
                  {group.places.map(place => (
                    <div
                      key={place.id}
                      className="p-4 px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        {/* Thumbnail or Multi-Thumbnail */}
                        <div className="w-16 h-16 rounded-xl bg-gray-100 overflow-hidden shrink-0 border border-gray-200 relative">
                          {place.imageUrl ? (
                            <img
                              src={place.imageUrl}
                              alt={place.placeName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-amber-50 flex items-center justify-center text-amber-500">
                              <ImageIcon className="h-6 w-6" />
                            </div>
                          )}
                          <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] text-center font-bold py-0.5">
                            D{place.dayNumber}
                          </span>
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-gray-900 text-sm">{place.placeName}</h4>
                            {!place.hasPhoto ? (
                              <Badge className="bg-amber-500 text-white text-[10px] py-0">Missing</Badge>
                            ) : (
                              (place.imageUrls || []).length > 1 && (
                                <Badge className="bg-indigo-100 text-indigo-700 text-[10px] py-0 border-indigo-200">
                                  {place.imageUrls?.length} Photos
                                </Badge>
                              )
                            )}
                          </div>
                          {place.description && (
                            <p className="text-xs text-gray-500 line-clamp-1 max-w-xl mt-0.5">
                              {place.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                        {place.imageUrl && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveAllPhotos(place)}
                            className="text-gray-400 hover:text-rose-600 hover:bg-rose-50 h-8 w-8 p-0"
                            title="Remove All Photos"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          onClick={() => handleOpenPhotoSelector(place)}
                          className={`text-xs font-semibold rounded-lg ${
                            !place.hasPhoto
                              ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                              : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                          }`}
                        >
                          <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                          {place.hasPhoto ? 'Manage Photos' : 'AI Select Photos'}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {/* ─── FULL SIZE IMAGE PREVIEW LIGHTBOX ─── */}
      {previewFullImageUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setPreviewFullImageUrl(null)}
        >
          <div className="relative max-w-5xl max-h-[90vh] overflow-hidden rounded-2xl">
            <button
              onClick={() => setPreviewFullImageUrl(null)}
              className="absolute top-4 right-4 bg-black/60 text-white p-2 rounded-full hover:bg-black/90 transition-colors z-10"
            >
              <X className="h-6 w-6" />
            </button>
            <img
              src={previewFullImageUrl}
              alt="Full preview"
              className="max-h-[85vh] w-auto max-w-full object-contain rounded-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}
