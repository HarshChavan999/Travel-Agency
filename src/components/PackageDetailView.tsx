import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useComparison } from '@/contexts/ComparisonContext';
import { optimizeImageUrl, preloadImage } from '@/lib/imageOptimization';
import { getDbInstance } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import {
  Star,
  Share2,
  Scale,
  Heart,
  MapPin,
  Calendar,
  ChevronRight,
  ChevronLeft,
  Camera,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  MessageCircle,
  CheckCircle2,
  AlertCircle,
  Building2,
  ShieldCheck,
  Banknote,
  Plus,
  Utensils,
  Home,
  Tag,
  Sunrise,
  Compass,
  Hotel,
  Clock,
  Globe,
  Users,
  User,
} from 'lucide-react';

interface PackageDetailViewProps {
  listing: any;
  onBack: () => void;
  onBook: (listing: any) => void;
  onChat: (listing: any) => void;
  onWishlist: (listingId: string) => void;
  isWishlisted?: boolean;
}

// Sample FAQ data
const defaultFAQs = [
  {
    question: "What is the best time to visit?",
    answer: "The best time to visit depends on the destination. Generally, spring (March-May) and autumn (September-November) offer pleasant weather for most locations."
  },
  {
    question: "Is travel insurance included?",
    answer: "Travel insurance is not included by default but can be added as an optional extra during booking. We recommend all travelers have comprehensive travel insurance."
  },
  {
    question: "Can I customize the itinerary?",
    answer: "Yes! We offer flexible itineraries. You can discuss customization options with our travel experts after booking. Additional charges may apply for major changes."
  },
  {
    question: "What is the cancellation policy?",
    answer: "Cancellations made 30+ days before departure receive a full refund. 15-30 days: 75% refund. 7-14 days: 50% refund. Less than 7 days: no refund."
  },
  {
    question: "Are meals included in the package?",
    answer: "Meal inclusions vary by package. Please check the Tour Inclusion section for specific meal plan details for this package."
  }
];

// Pure Real Review Data Processor (No Static / Mock Reviews)
function getReviewsData(listing: any, userDbReviews: any[]) {
  const locationName = listing?.packageType === 'international' ? listing?.countryName : listing?.stateName;
  const packageTitle = listing?.title || locationName || 'Travel Package';
  const embeddedReviews = Array.isArray(listing?.reviews) ? listing.reviews : [];

  // Combine real user reviews from Firestore database & embedded listing reviews
  const allRawUserReviews = [...userDbReviews, ...embeddedReviews];

  const formattedUserReviews = allRawUserReviews.map((r, i) => ({
    id: r.id || `user-rev-${i}`,
    name: r.name || r.userName || "Verified Traveller",
    date: r.createdAt
      ? `Reviewed: ${new Date(r.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`
      : (r.date ? `Reviewed: ${r.date}` : "Reviewed recently"),
    rating: Number(r.rating) || 5.0,
    booked: packageTitle,
    travelledFrom: r.travelledFrom || "",
    text: r.comment || r.text || r.reviewText || "",
    images: r.photos || r.images || []
  }));

  const totalReviewsCount = formattedUserReviews.length;

  // Calculate real average rating
  let avgRating = 0;
  if (totalReviewsCount > 0) {
    const totalSum = formattedUserReviews.reduce((acc, r) => acc + r.rating, 0);
    avgRating = Math.round((totalSum / totalReviewsCount) * 10) / 10;
  }

  // Calculate real rating breakdown
  const breakdownCounts: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  formattedUserReviews.forEach(r => {
    const star = Math.min(5, Math.max(1, Math.round(r.rating)));
    breakdownCounts[star] = (breakdownCounts[star] || 0) + 1;
  });

  const ratingBreakdown = [5, 4, 3, 2, 1].map(stars => {
    const count = breakdownCounts[stars] || 0;
    const percentage = totalReviewsCount > 0 ? Math.round((count / totalReviewsCount) * 100) : 0;
    return { stars, count, percentage };
  });

  // Extract traveller photos uploaded in real reviews
  const travellerImages: string[] = [];
  formattedUserReviews.forEach(r => {
    if (Array.isArray(r.images) && r.images.length > 0) {
      travellerImages.push(...r.images);
    }
  });

  return {
    packageTitle,
    userReviews: formattedUserReviews,
    totalReviewsCount,
    avgRating,
    ratingBreakdown,
    travellerImages
  };
}

// Helper to format hotel types beautifully
const getFormattedHotelTypes = (types: any) => {
  if (!types) return 'Standard';
  if (Array.isArray(types)) {
    if (types.length === 0) return 'Standard';
    return types.map((h: string) => {
      if (typeof h !== 'string') return String(h);
      return h.charAt(0).toUpperCase() + h.slice(1).toLowerCase();
    }).join(' | ');
  }
  if (typeof types === 'string') {
    return types.split(',')
      .map(t => t.trim())
      .filter(Boolean)
      .map(t => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase())
      .join(' | ');
  }
  return 'Standard';
};

// Helper to format meal plans beautifully
const getFormattedMealPlan = (plan: any) => {
  const formatSingle = (m: string) => {
    if (m === 'breakfast-dinner') return 'Breakfast & Dinner';
    if (m === 'all-meals') return 'All Meals';
    if (m === 'no-meal') return 'No Meal';
    return m.charAt(0).toUpperCase() + m.slice(1).toLowerCase();
  };

  if (!plan) return 'No Meals';
  if (Array.isArray(plan)) {
    if (plan.length === 0) return 'No Meals';
    return plan.map((m: string) => formatSingle(m)).join(' | ');
  }
  if (typeof plan === 'string') {
    return plan.split(',')
      .map(t => t.trim())
      .filter(Boolean)
      .map(m => formatSingle(m))
      .join(' | ');
  }
  return 'No Meals';
};

export default function PackageDetailView({
  listing,
  onBack,
  onBook,
  onChat,
  onWishlist,
  isWishlisted
}: PackageDetailViewProps) {
  const { user } = useAuth();
  const [expandedDays, setExpandedDays] = useState<number[]>([]);
  const [expandedFAQs, setExpandedFAQs] = useState<number[]>([]);
  const [showAllPhotos, setShowAllPhotos] = useState(false);
  const [showCompareToast, setShowCompareToast] = useState(false);
  const [compareToastMessage, setCompareToastMessage] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(true);
  const [showStickyBar, setShowStickyBar] = useState(false);
  const [selectedGalleryImage, setSelectedGalleryImage] = useState<string | null>(null);

  const observerRef = useRef<HTMLDivElement>(null);
  const autoSlideRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Review specific states
  const [userDbReviews, setUserDbReviews] = useState<any[]>([]);
  const [showWriteReviewModal, setShowWriteReviewModal] = useState(false);
  const [newReview, setNewReview] = useState({
    name: '',
    travelledFrom: '',
    rating: 5,
    tripType: 'Family',
    comment: '',
    photoUrl: ''
  });
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Sticky bar observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowStickyBar(entry.isIntersecting || entry.boundingClientRect.top < 0);
      },
      { threshold: 0, rootMargin: "0px 0px -100px 0px" }
    );
    if (observerRef.current) observer.observe(observerRef.current);
    return () => {
      if (observerRef.current) observer.unobserve(observerRef.current);
    };
  }, []);

  // Fetch reviews
  useEffect(() => {
    const fetchPackageReviews = async () => {
      const listingId = listing?.id || listing?.docId;
      if (!listingId) return;
      try {
        const res = await fetch(`/api/reviews?listingId=${encodeURIComponent(listingId)}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.reviews)) { setUserDbReviews(data.reviews); return; }
        }
        const db = getDbInstance();
        if (db) {
          const q = query(collection(db, 'reviews'), where('listingId', '==', listingId));
          const querySnapshot = await getDocs(q);
          const fetched: any[] = [];
          querySnapshot.forEach((doc) => { fetched.push({ id: doc.id, ...doc.data() }); });
          setUserDbReviews(fetched);
        }
      } catch (error) { console.error('Error fetching package reviews:', error); }
    };
    fetchPackageReviews();
  }, [listing?.id, listing?.docId]);

  // Get all images from placesCovered
  const getAllImages = () => {
    const images: string[] = [];
    if (listing.placesCovered && listing.placesCovered.length > 0) {
      listing.placesCovered.forEach((place: any) => {
        if (place.imageUrls && place.imageUrls.length > 0) images.push(...place.imageUrls);
      });
    }
    if (images.length === 0 && listing.itinerary && listing.itinerary.length > 0) {
      listing.itinerary.forEach((day: any) => {
        if (day.imageUrls && day.imageUrls.length > 0) {
          images.push(...day.imageUrls);
        } else if (day.imageUrl) {
          images.push(day.imageUrl);
        }
      });
    }
    return images;
  };
  const allImages = getAllImages();

  const loopImages = allImages.length >= 2 
    ? [...allImages, allImages[0], allImages[1]] 
    : allImages;

  // Auto-slide every 4 seconds, infinite loop
  useEffect(() => {
    if (allImages.length <= 1) return;
    autoSlideRef.current = setInterval(() => {
      setCurrentIndex(prev => prev + 1);
    }, 4000);
    return () => {
      if (autoSlideRef.current) clearInterval(autoSlideRef.current);
    };
  }, [allImages.length]);

  // Handle infinite loop transitions seamlessly
  useEffect(() => {
    if (currentIndex >= allImages.length) {
      const timer = setTimeout(() => {
        setIsTransitioning(false);
        setCurrentIndex(0);
      }, 800);
      return () => clearTimeout(timer);
    } else {
      setIsTransitioning(true);
    }
  }, [currentIndex, allImages.length]);

  const displayImageIndex = allImages.length > 0 ? (currentIndex % allImages.length) : 0;

  const handleNext = () => {
    if (allImages.length <= 1) return;
    setCurrentIndex(prev => prev + 1);
  };

  const handlePrev = () => {
    if (allImages.length <= 1) return;
    if (currentIndex === 0) {
      setIsTransitioning(false);
      setCurrentIndex(allImages.length);
      setTimeout(() => {
        setIsTransitioning(true);
        setCurrentIndex(allImages.length - 1);
      }, 50);
    } else {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleDotClick = (idx: number) => {
    setIsTransitioning(true);
    setCurrentIndex(idx);
  };

  // Preload all listing images on mount
  useEffect(() => {
    if (allImages.length > 0) {
      allImages.forEach(imgUrl => {
        const optimized = optimizeImageUrl(imgUrl, { width: 1200, quality: 85, format: 'auto', cacheBust: false });
        preloadImage(optimized).catch(() => {});
      });
    }
  }, [allImages]);

  const handleAddReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReview.comment.trim()) return;
    setIsSubmittingReview(true);
    const listingId = listing?.id || listing?.docId || 'default-package';
    const reviewData = {
      listingId,
      name: newReview.name.trim() || 'Verified Traveller',
      travelledFrom: newReview.travelledFrom.trim() || 'Guest',
      rating: newReview.rating,
      tripType: newReview.tripType || 'Family',
      comment: newReview.comment.trim(),
      photos: newReview.photoUrl.trim() ? [newReview.photoUrl.trim()] : [],
      createdAt: new Date().toISOString()
    };
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reviewData)
      });
      if (!res.ok) {
        const db = getDbInstance();
        if (db) await addDoc(collection(db, 'reviews'), reviewData);
      }
    } catch (error) { console.warn('API review submission fallback:', error); }
    finally {
      setUserDbReviews(prev => [reviewData, ...prev]);
      setShowWriteReviewModal(false);
      setNewReview({ name: '', travelledFrom: '', rating: 5, tripType: 'Family', comment: '', photoUrl: '' });
      setCompareToastMessage('Thank you! Your review has been submitted.');
      setShowCompareToast(true);
      setTimeout(() => setShowCompareToast(false), 3000);
      setIsSubmittingReview(false);
    }
  };

  const reviewsData = getReviewsData(listing, userDbReviews);
  const { addToComparison, isInComparison, canAddMore, comparisonList } = useComparison();

  const duration = listing.itinerary?.length || listing.duration || 0;
  const nights = duration > 0 ? duration - 1 : 0;

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: listing.title || 'Travel Package',
          text: `Check out this amazing travel package: ${listing.title || 'Travel Package'}!`,
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        setCompareToastMessage('Link copied to clipboard!');
        setShowCompareToast(true);
        setTimeout(() => setShowCompareToast(false), 3000);
      }
    } catch (err) { console.error('Error sharing:', err); }
  };

  // Parse inclusions and exclusions into arrays
  const parseList = (input: any) => {
    if (!input) return [];
    if (Array.isArray(input)) return input.filter(item => typeof item === 'string' && item.trim() !== '');
    return String(input).split('\n').filter(item => item.trim() !== '');
  };

  const inclusions = parseList(listing.inclusions);
  const exclusions = parseList(listing.exclusions);

  const toggleDay = (day: number) => {
    setExpandedDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  };

  const toggleFAQ = (index: number) => {
    setExpandedFAQs(prev => prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]);
  };

  // Get unique places to display
  const getDisplayPlaces = () => {
    const cleanPlaceName = (rawName: string): string[] => {
      if (!rawName) return [];
      // Normalize separators: dash, en-dash, em-dash, " to ", " & ", " and ", " / "
      const normalized = rawName
        .replace(/[-–—]/g, ',')
        .replace(/\bto\b/gi, ',')
        .replace(/\b&\b/gi, ',')
        .replace(/\band\b/gi, ',')
        .replace(/\b\/\b/gi, ',');
      
      const result: string[] = [];
      const noiseWords = /^(arrival|departure|transfer|sightseeing|local|tour|airport|station|railway|hotel|resort|day|visit|trip|journey|welcome|tourist|spot|spots)$/i;
      
      normalized.split(',').forEach(part => {
        let cleaned = part.trim();
        // Remove common introductory prepositions/prefixes
        cleaned = cleaned.replace(/^(at|from|in|to|for|via|by|towards)\s+/i, '').trim();
        
        // Remove trailing prepositions/prefixes if any are left
        cleaned = cleaned.replace(/\s+(at|from|in|to|for|via|by|towards)$/i, '').trim();
        
        if (cleaned && !noiseWords.test(cleaned)) {
          // Capitalize first letter of each word to make it look professional
          const capitalized = cleaned.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
          result.push(capitalized);
        }
      });
      return result;
    };

    let rawPlaces: string[] = [];
    const covered = listing.placesCovered?.map((p: any) => p.name?.trim()).filter((name: any) => name && name !== 'photos') || [];
    if (covered.length > 0 && !(covered.length === 1 && covered[0] === '')) {
      rawPlaces = covered;
    } else {
      rawPlaces = listing.itinerary?.map((d: any) => d.placeName?.trim()).filter(Boolean) || [];
    }
    
    const cleanedPlaces = new Set<string>();
    rawPlaces.forEach((place: string) => {
      cleanPlaceName(place).forEach(c => cleanedPlaces.add(c));
    });
    
    return Array.from(cleanedPlaces);
  };

  // Generate breadcrumb
  const getBreadcrumb = () => {
    const parts: string[] = ['Home'];
    if (listing.packageType === 'domestic') {
      parts.push('Domestic');
      const states = listing.stateNames && listing.stateNames.length > 0 ? listing.stateNames.join(', ') : listing.stateName;
      if (states) parts.push(states);
    } else {
      parts.push('International');
      const countries = listing.countryNames && listing.countryNames.length > 0 ? listing.countryNames.join(', ') : listing.countryName;
      if (countries) parts.push(countries);
    }
    const locationName = listing.packageType === 'international' ? listing.countryName : listing.stateName;
    parts.push(listing.title || locationName || 'Package');
    return parts;
  };

  const locationName = listing.packageType === 'international' ? listing.countryName : listing.stateName;
  const detailTitle = listing.title || locationName || 'Travel Package';
  const breadcrumb = getBreadcrumb();
  const packageCode = `PKG${listing.id?.slice(-4).toUpperCase() || '0000'}`;

  // Gather all tags for the badge row
  const tags: string[] = [];
  if (Array.isArray(listing.tourCategories) && listing.tourCategories.length > 0) {
    listing.tourCategories.forEach((c: string) => tags.push(`${c} Tour`));
  } else {
    tags.push('Family Tour');
  }
  if (Array.isArray(listing.experienceType)) {
    tags.push(...listing.experienceType);
  } else if (typeof listing.experienceType === 'string' && listing.experienceType) {
    tags.push(listing.experienceType);
  }
  if (listing.season) {
    tags.push(listing.season === 'all-seasons' ? 'All Seasons' : `${listing.season} Season`);
  }

  const currencySymbol = listing.packageType === 'international' ? '$' : '₹';

  // Round price to remove .99 decimals (same logic as ListingCard)
  const rawCost = listing.cost || listing.price;
  const displayPrice = rawCost
    ? (!isNaN(Number(rawCost)) ? Math.round(Number(rawCost)).toString() : String(rawCost))
    : null;

  // Compact info items for sidebar (all 7 required fields)
  const infoItems = [
    {
      icon: Tag,
      label: 'Tour Category',
      value: Array.isArray(listing.tourCategories) && listing.tourCategories.length > 0
        ? listing.tourCategories.join(', ')
        : 'General'
    },
    {
      icon: Sunrise,
      label: 'Seasonal',
      value: listing.season
        ? (listing.season === 'all-seasons' ? 'All Seasons' : listing.season.charAt(0).toUpperCase() + listing.season.slice(1))
        : 'All Year'
    },
    {
      icon: Compass,
      label: 'Experience Type',
      value: Array.isArray(listing.experienceType) && listing.experienceType.length > 0
        ? listing.experienceType.join(', ')
        : (typeof listing.experienceType === 'string' && listing.experienceType
            ? listing.experienceType
            : 'Adventure')
    },
    {
      icon: Utensils,
      label: 'Meal Plan',
      value: getFormattedMealPlan(listing.mealPlan)
    },
    {
      icon: Clock,
      label: 'Duration',
      value: `${duration}D / ${nights}N`
    },
    {
      icon: MapPin,
      label: 'City',
      value: getDisplayPlaces().join(', ') || 'N/A'
    },
    {
      icon: Hotel,
      label: 'Hotel Type',
      value: getFormattedHotelTypes(listing.hotelTypes)
    },
    ...(listing.packageType === 'domestic' ? [{
      icon: Globe,
      label: 'State(s)',
      value: listing.stateNames && listing.stateNames.length > 0 ? listing.stateNames.join(', ') : (listing.stateName || 'N/A')
    }] : [{
      icon: Globe,
      label: 'Country/Countries',
      value: listing.countryNames && listing.countryNames.length > 0 ? listing.countryNames.join(', ') : (listing.countryName || 'N/A')
    }])
  ];

  return (
    <div className="min-h-screen" style={{ background: '#ffffff', fontFamily: "var(--font-inter, 'Inter', sans-serif)" }}>

      {/* ─── HERO IMAGE SECTION ─────────────────────────────────── */}
      <div className="relative w-full" style={{ height: '480px' }}>
        {allImages.length > 0 ? (
          <div className="absolute inset-0 overflow-hidden">
            {allImages.length === 1 ? (
              <img
                src={optimizeImageUrl(allImages[0], { width: 1400, quality: 90, format: 'auto', cacheBust: false })}
                alt={listing.title}
                className="w-full h-full object-cover"
                loading="eager"
              />
            ) : (
              <div 
                className="flex h-full"
                style={{
                  width: `${loopImages.length * 50}%`,
                  transform: `translateX(-${(100 / loopImages.length) * currentIndex}%)`,
                  transition: isTransitioning ? 'transform 800ms cubic-bezier(0.16, 1, 0.3, 1)' : 'none',
                }}
              >
                {loopImages.map((img, idx) => (
                  <div 
                    key={idx} 
                    style={{ width: `${100 / loopImages.length}%` }} 
                    className="h-full relative px-[2px] bg-stone-900"
                  >
                    <img
                      src={optimizeImageUrl(img, { width: 1000, quality: 90, format: 'auto', cacheBust: false })}
                      alt={`${listing.title} photo ${idx + 1}`}
                      className="w-full h-full object-cover"
                      loading={idx < 2 ? 'eager' : 'lazy'}
                    />
                  </div>
                ))}
              </div>
            )}
            {/* Dark gradient overlay */}
            <div
              className="absolute inset-0 z-10 pointer-events-none"
              style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.15) 45%, rgba(0,0,0,0.65) 100%)' }}
            />
          </div>
        ) : (
          <div className="absolute inset-0 bg-stone-800 flex items-center justify-center">
            <Camera className="h-20 w-20 text-stone-500" />
          </div>
        )}

        {/* Hero content overlay */}
        <div className="relative z-20 h-full flex flex-col justify-between px-6 py-5 max-w-7xl mx-auto">
          {/* Top row: breadcrumb + action buttons */}
          <div className="flex items-center justify-between">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-1.5 text-xs text-white/80">
              <button onClick={onBack} className="hover:text-white transition-colors flex items-center gap-1">
                <Home className="h-3.5 w-3.5" /> Home
              </button>
              {breadcrumb.slice(1).map((part, i) => (
                <React.Fragment key={i}>
                  <ChevronRight className="h-3 w-3 text-white/50" />
                  <span className={i === breadcrumb.length - 2 ? 'text-white font-medium' : 'hover:text-white cursor-pointer transition-colors'}>{part}</span>
                </React.Fragment>
              ))}
            </nav>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={onBack}
                className="flex items-center gap-1.5 text-white/90 hover:text-white bg-black/30 hover:bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-medium transition-all border border-white/20"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back
              </button>
              <button
                onClick={handleShare}
                className="flex items-center gap-1.5 text-white/90 hover:text-white bg-black/30 hover:bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-medium transition-all border border-white/20"
              >
                <Share2 className="h-3.5 w-3.5" /> Share
              </button>
              <button
                onClick={() => onWishlist?.(listing.id)}
                className={`flex items-center gap-1.5 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${isWishlisted ? 'bg-red-500/80 text-white border-red-400' : 'text-white/90 hover:text-white bg-black/30 hover:bg-black/50 border-white/20'}`}
              >
                <Heart className={`h-3.5 w-3.5 ${isWishlisted ? 'fill-current' : ''}`} />
                {isWishlisted ? 'Saved' : 'Save'}
              </button>
              <button
                onClick={() => {
                  if (isInComparison(listing.id)) {
                    setCompareToastMessage('This package is already in your comparison list!');
                    setShowCompareToast(true);
                    setTimeout(() => setShowCompareToast(false), 3000);
                  } else if (!canAddMore) {
                    setCompareToastMessage('You can only compare up to 3 packages. Remove one to add this.');
                    setShowCompareToast(true);
                    setTimeout(() => setShowCompareToast(false), 3000);
                  } else {
                    const success = addToComparison({
                      id: listing.id,
                      title: listing.title,
                      description: listing.description,
                      cost: listing.cost,
                      price: listing.price,
                      packageType: listing.packageType,
                      stateName: listing.stateName,
                      countryName: listing.countryName,
                      stateNames: listing.stateNames,
                      countryNames: listing.countryNames,
                      duration: listing.duration,
                      itinerary: listing.itinerary,
                      placesCovered: listing.placesCovered,
                      hotelTypes: listing.hotelTypes,
                      inclusions: listing.inclusions,
                      exclusions: listing.exclusions,
                      agencyName: listing.agencyName,
                      agencyId: listing.agencyId,
                      agencyData: listing.agencyData,
                      photos: listing.photos,
                      rating: listing.rating,
                      reviewsCount: listing.reviewsCount,
                      tourCategories: listing.tourCategories,
                    });
                    if (success) {
                      setCompareToastMessage(`Added to comparison! (${comparisonList.length + 1}/3 packages)`);
                      setShowCompareToast(true);
                      setTimeout(() => setShowCompareToast(false), 3000);
                    }
                  }
                }}
                className={`flex items-center gap-1.5 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${isInComparison(listing.id) ? 'bg-blue-500/80 text-white border-blue-400' : 'text-white/90 hover:text-white bg-black/30 hover:bg-black/50 border-white/20'}`}
              >
                <Scale className="h-3.5 w-3.5" />
                {isInComparison(listing.id) ? 'Comparing' : 'Compare'}
              </button>
            </div>
          </div>

          {/* Bottom: title, tags, image indicators */}
          <div>
            {/* Category badges */}
            <div className="flex flex-wrap gap-2 mb-3">
              {tags.map((tag, i) => (
                <span
                  key={i}
                  className="text-[11px] font-semibold uppercase tracking-wider text-white bg-white/20 backdrop-blur-sm border border-white/30 px-3 py-1 rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* Location Tagline (if custom title is present) */}
            {listing.title && locationName && (
              <div className="text-[12px] font-bold uppercase tracking-widest text-orange-400 mb-2" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.4)' }}>
                {locationName}
              </div>
            )}

            {/* Package Title */}
            <h1
              className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3 leading-tight"
              style={{ fontFamily: "var(--font-playfair, 'Playfair Display', Georgia, serif)", textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}
            >
              {detailTitle}
            </h1>

            {/* Places, duration, rating row */}
            <div className="flex items-center flex-wrap gap-3 text-white/90 text-sm mb-4">
              <span className="flex items-center gap-1.5 text-xs bg-black/30 backdrop-blur-sm px-3 py-1 rounded-full border border-white/20">
                <MapPin className="h-3.5 w-3.5" />
                {getDisplayPlaces().join(' · ') || 'Multiple Destinations'}
              </span>
              <span className="flex items-center gap-1.5 text-xs bg-black/30 backdrop-blur-sm px-3 py-1 rounded-full border border-white/20">
                <Clock className="h-3.5 w-3.5" />
                {duration}D / {nights}N
              </span>
              {reviewsData.totalReviewsCount > 0 && (
                <span className="flex items-center gap-1.5 text-xs bg-amber-500/80 backdrop-blur-sm px-3 py-1 rounded-full border border-amber-400/50">
                  <Star className="h-3.5 w-3.5 fill-current" />
                  {reviewsData.avgRating.toFixed(1)} · {reviewsData.totalReviewsCount} reviews
                </span>
              )}
            </div>

            {/* Image dot indicators */}
            {allImages.length > 1 && (
              <div className="flex items-center gap-2">
                {allImages.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleDotClick(idx)}
                    className={`transition-all duration-300 rounded-full ${idx === displayImageIndex ? 'w-6 h-2 bg-white' : 'w-2 h-2 bg-white/50 hover:bg-white/75'}`}
                  />
                ))}
                <span className="text-white/60 text-xs ml-2">{displayImageIndex + 1} / {allImages.length}</span>
                <button
                  onClick={() => setShowAllPhotos(true)}
                  className="ml-auto flex items-center gap-1.5 text-white/90 hover:text-white bg-black/30 hover:bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-medium transition-all border border-white/20"
                >
                  <Camera className="h-3.5 w-3.5" /> View All ({allImages.length})
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Prev/Next arrows on hero */}
        {allImages.length > 1 && (
          <>
            <button
              onClick={handlePrev}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-20 bg-white/20 hover:bg-white/40 backdrop-blur-sm text-white rounded-full p-2.5 transition-all border border-white/30 hover:scale-110 cursor-pointer"
              aria-label="Previous image"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={handleNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-20 bg-white/20 hover:bg-white/40 backdrop-blur-sm text-white rounded-full p-2.5 transition-all border border-white/30 hover:scale-110 cursor-pointer"
              aria-label="Next image"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}
      </div>

      {/* ─── MAIN CONTENT ────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* ── LEFT / MAIN COLUMN ───────────────────────────────── */}
          <div className="lg:col-span-2 space-y-7">

            {/* Description */}
            {listing.description && (
              <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6 md:p-8">
                <p className="text-gray-700 leading-relaxed text-base">
                  {listing.description}
                </p>
              </div>
            )}

            {/* ── ITINERARY ── magazine editorial layout */}
            <div>
              <div className="py-6 border-b border-stone-100 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: '#b84814' }}>
                  <Calendar className="h-4 w-4 text-white" />
                </div>
                <h2 className="text-xl font-bold text-gray-900" style={{ fontFamily: "var(--font-playfair, 'Playfair Display', Georgia, serif)" }}>Itinerary</h2>
              </div>

              {listing.itinerary && listing.itinerary.length > 0 ? (
                <div className="divide-y divide-stone-100">
                  {listing.itinerary.map((day: any, index: number) => {
                    // Convert number to ordinal word (one, two, three…)
                    const dayWords = ['ONE','TWO','THREE','FOUR','FIVE','SIX','SEVEN','EIGHT','NINE','TEN',
                      'ELEVEN','TWELVE','THIRTEEN','FOURTEEN','FIFTEEN','SIXTEEN','SEVENTEEN','EIGHTEEN','NINETEEN','TWENTY'];
                    const dayLabel = dayWords[(day.day || index + 1) - 1] || `${day.day || index + 1}`;

                    // Find the image for this day
                    let dayImage: string | null = null;
                    if (day.imageUrls && day.imageUrls.length > 0) {
                      dayImage = day.imageUrls[0];
                    } else if (day.imageUrl) {
                      dayImage = day.imageUrl;
                    }
                    
                    if (!dayImage && listing.placesCovered) {
                      const matchedPlace = listing.placesCovered.find(
                        (p: any) => p.name?.trim().toLowerCase() === (day.placeName || '').trim().toLowerCase()
                      );
                      if (matchedPlace?.imageUrls?.length > 0) {
                        dayImage = matchedPlace.imageUrls[0];
                      }
                    }
                    // Fallback: cycle through allImages
                    if (!dayImage && allImages.length > 0) {
                      dayImage = allImages[index % allImages.length];
                    }

                    return (
                      <div key={day.id || index} className="py-8">
                        {/* Day label with dot */}
                        <div className="flex items-center gap-2.5 mb-3">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ background: '#b84814' }}
                          />
                          <span
                            className="text-[10px] font-bold uppercase tracking-[0.2em]"
                            style={{ color: '#b84814' }}
                          >
                            Day {dayLabel}
                          </span>
                        </div>

                        {/* Title */}
                        <h3
                          className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight mb-5"
                          style={{ fontFamily: "var(--font-playfair, 'Playfair Display', Georgia, serif)" }}
                        >
                          {day.placeName || `Day ${day.day} Activities`}
                        </h3>

                        {/* 2-column: text left, image right */}
                        <div className={`flex gap-6 ${dayImage ? 'flex-col md:flex-row' : ''}`}>
                          {/* Description */}
                          <div className={dayImage ? 'md:flex-1 md:max-w-[55%]' : 'w-full'}>
                            <p className="text-gray-600 leading-relaxed text-[15px]">
                              {day.description || 'Detailed itinerary for this day will be shared upon booking confirmation.'}
                            </p>
                          </div>

                          {/* Image */}
                          {dayImage && (
                            <div className="md:w-[42%] shrink-0">
                              <div className="rounded-lg overflow-hidden" style={{ height: '200px' }}>
                                <img
                                  src={optimizeImageUrl(dayImage, { width: 600, quality: 85, format: 'auto', cacheBust: false })}
                                  alt={day.placeName || `Day ${day.day}`}
                                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                                  loading="lazy"
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Italic tip/note — shown when day has a tip/note field, otherwise a gentle quote */}
                        {(day.tip || day.note || day.highlight) && (
                          <div className="mt-5 pl-5 border-l-2 border-stone-200">
                            <p className="text-sm text-stone-400 italic leading-relaxed">
                              "{day.tip || day.note || day.highlight}"
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-10 text-center text-gray-400">
                  <Calendar className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">Detailed itinerary will be available soon.</p>
                </div>
              )}
            </div>

            {/* ── INCLUSIONS & EXCLUSIONS ── */}
            <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
              <div className="px-6 py-5 border-b border-stone-100 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900" style={{ fontFamily: "var(--font-playfair, 'Playfair Display', Georgia, serif)" }}>Inclusions & Exclusions</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-stone-100">
                {/* Inclusions */}
                <div className="p-6">
                  <h3 className="flex items-center gap-2 text-sm font-bold text-emerald-700 mb-4 uppercase tracking-wide">
                    <CheckCircle2 className="h-4 w-4" /> What's Included
                  </h3>
                  {inclusions.length > 0 ? (
                    <ul className="space-y-3">
                      {inclusions.map((item: string, i: number) => (
                        <li key={i} className="flex items-start gap-3">
                          <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Check className="h-3 w-3 text-emerald-600" strokeWidth={2.5} />
                          </div>
                          <span className="text-sm text-gray-700 leading-relaxed">{item}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-stone-400 italic">Inclusions will be listed here.</p>
                  )}
                </div>
                {/* Exclusions */}
                <div className="p-6">
                  <h3 className="flex items-center gap-2 text-sm font-bold text-red-600 mb-4 uppercase tracking-wide">
                    <X className="h-4 w-4" strokeWidth={2.5} /> Not Included
                  </h3>
                  {exclusions.length > 0 ? (
                    <ul className="space-y-3">
                      {exclusions.map((item: string, i: number) => (
                        <li key={i} className="flex items-start gap-3">
                          <div className="w-5 h-5 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <X className="h-3 w-3 text-red-500" strokeWidth={2.5} />
                          </div>
                          <span className="text-sm text-gray-700 leading-relaxed">{item}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-stone-400 italic">Exclusions will be listed here.</p>
                  )}
                </div>
              </div>
            </div>

            {/* ── IMAGE GALLERY STRIP (auto-slide) ── */}
            {allImages.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
                <div className="px-6 py-5 border-b border-stone-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center">
                      <Camera className="h-4 w-4 text-stone-600" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900" style={{ fontFamily: "var(--font-playfair, 'Playfair Display', Georgia, serif)" }}>Moments of Adventure</h2>
                  </div>
                  <button
                    onClick={() => setShowAllPhotos(true)}
                    className="text-xs font-semibold text-orange-600 hover:text-orange-700 underline underline-offset-2 transition-colors"
                  >
                    View All ({allImages.length})
                  </button>
                </div>
                <div className="p-4">
                  {/* Grid gallery that follows auto-slide */}
                  <div className="grid grid-cols-3 gap-2" style={{ height: '280px' }}>
                    {/* Large featured image */}
                    <div
                      className="col-span-2 relative rounded-lg overflow-hidden cursor-pointer group"
                      onClick={() => setShowAllPhotos(true)}
                    >
                      <img
                        src={optimizeImageUrl(allImages[displayImageIndex], { width: 800, quality: 85, format: 'auto' })}
                        alt="Featured"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                    </div>
                    {/* Two smaller side images */}
                    <div className="grid grid-rows-2 gap-2">
                      {[1, 2].map(offset => {
                        const idx = (displayImageIndex + offset) % allImages.length;
                        return (
                          <div
                            key={offset}
                            className="relative rounded-lg overflow-hidden cursor-pointer group"
                            onClick={() => setShowAllPhotos(true)}
                          >
                            {allImages[idx] && (
                              <>
                                <img
                                  src={optimizeImageUrl(allImages[idx], { width: 400, quality: 80, format: 'auto' })}
                                  alt={`Gallery ${offset}`}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                />
                                {offset === 2 && allImages.length > 3 && (
                                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                    <span className="text-white font-bold text-sm">+{allImages.length - 3} more</span>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  {/* Dot navigation */}
                  {allImages.length > 1 && (
                    <div className="flex justify-center gap-1.5 mt-3">
                      {allImages.slice(0, Math.min(allImages.length, 10)).map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleDotClick(idx)}
                          className={`rounded-full transition-all duration-300 ${idx === displayImageIndex ? 'w-5 h-2 bg-orange-500' : 'w-2 h-2 bg-stone-300 hover:bg-stone-400'}`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── RIGHT SIDEBAR ────────────────────────────────────── */}
          <div className="lg:col-span-1" style={{ fontFamily: "var(--font-dm-sans, 'DM Sans', 'Inter', sans-serif)" }}>
            <div className="sticky top-4 space-y-0">

              {/* ── Price block — floats on page, no card ── */}
              <div className="pb-5 border-b border-stone-200">
                <p
                  className="text-[10px] uppercase tracking-[0.18em] text-stone-400 mb-1"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  Starting From
                </p>
                <div className="flex items-baseline gap-1.5">
                  <span
                    className="text-4xl font-bold text-gray-900 leading-none"
                    style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: '-0.02em' }}
                  >
                    {currencySymbol}{displayPrice || '—'}
                  </span>
                  <span className="text-sm text-stone-400 font-normal">/ person</span>
                </div>
              </div>

              {/* ── Info rows — clean label/value list, no box ── */}
              <div className="py-2 border-b border-stone-200 space-y-0">
                {infoItems.map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-center gap-3 py-3 border-b border-stone-100 last:border-0">
                    <div className="w-7 h-7 rounded-full bg-orange-50 flex items-center justify-center shrink-0">
                      <Icon className="h-3.5 w-3.5 text-orange-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-[9px] uppercase tracking-[0.15em] text-stone-400 leading-none mb-0.5"
                        style={{ fontFamily: "'DM Sans', sans-serif" }}
                      >
                        {label}
                      </p>
                      <p
                        className="text-[13px] font-semibold text-gray-800 capitalize leading-snug"
                        style={{ fontFamily: "'DM Sans', sans-serif" }}
                        title={value}
                      >
                        {value}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* ── Agency — no card, just open block ── */}
              <div className="py-5 border-b border-stone-200">
                <p
                  className="text-[9px] uppercase tracking-[0.18em] text-stone-400 mb-4"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  Offered By
                </p>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full border border-stone-200 overflow-hidden shrink-0 bg-orange-50 flex items-center justify-center">
                    {(listing.agencyData?.logoUrl || listing.agencyData?.agencyLogo || listing.agencyData?.avatarUrl) ? (
                      <img
                        src={listing.agencyData?.logoUrl || listing.agencyData?.agencyLogo || listing.agencyData?.avatarUrl}
                        alt={listing.agencyName || 'Agency Logo'}
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    ) : (
                      <Building2 className="h-6 w-6 text-orange-400" />
                    )}
                  </div>
                  <div>
                    <p
                      className="font-bold text-gray-900 text-[15px] leading-tight"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
                      {listing.agencyName || 'Travel Agency'}
                    </p>
                    {listing.agencyData?.verified && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full mt-1">
                        <ShieldCheck className="h-3 w-3" /> Verified Agency
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => {
                    console.log('Chat with Agency button clicked in PackageDetailView, listing:', listing);
                    onChat(listing);
                  }}
                  className="w-full flex items-center justify-center gap-2 text-white font-semibold rounded-lg py-3 text-sm transition-all hover:opacity-90 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
                  style={{ background: 'linear-gradient(135deg, #b84814 0%, #e25c1a 100%)', fontFamily: "'DM Sans', sans-serif" }}
                >
                  <MessageCircle className="h-4 w-4" />
                  Chat with Agency
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── FULL WIDTH REVIEWS & FAQ ── */}
        <div ref={observerRef} className="mt-10 space-y-6">

          {/* Reviews Section */}
          <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
            <div className="px-6 py-5 border-b border-stone-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                  <Star className="h-4 w-4 text-amber-500 fill-current" />
                </div>
                <h2 className="text-xl font-bold text-gray-900" style={{ fontFamily: "var(--font-playfair, 'Playfair Display', Georgia, serif)" }}>
                  Guest Reviews <span className="text-stone-400 text-base font-normal">({reviewsData.totalReviewsCount})</span>
                </h2>
              </div>
              {user ? (
                <button
                  onClick={() => setShowWriteReviewModal(true)}
                  className="flex items-center gap-1.5 text-sm font-semibold text-white px-4 py-2 rounded-lg cursor-pointer transition-all hover:opacity-90"
                  style={{ background: '#b84814' }}
                >
                  <Plus className="h-4 w-4" /> Write a Review
                </button>
              ) : (
                <button
                  onClick={() => {
                    const authBtn = document.querySelector('header button');
                    if (authBtn) (authBtn as HTMLButtonElement).click();
                    else alert("Please login to write a review");
                  }}
                  className="flex items-center gap-1.5 text-sm font-semibold text-orange-600 bg-orange-50 hover:bg-orange-100 px-4 py-2 rounded-lg cursor-pointer transition-all"
                >
                  <User className="h-4 w-4" /> Please login to review
                </button>
              )}
            </div>

            <div className="p-6">
              {/* Rating overview */}
              <div className="flex flex-col md:flex-row gap-8 mb-8 p-6 rounded-xl bg-stone-50 border border-stone-100">
                <div className="flex flex-col items-center justify-center shrink-0 px-4">
                  {reviewsData.totalReviewsCount > 0 ? (
                    <>
                      <div className="text-6xl font-bold text-gray-900 mb-1">{reviewsData.avgRating.toFixed(1)}</div>
                      <div className="flex text-amber-400 mb-1">
                        {[1, 2, 3, 4, 5].map(s => (
                          <Star key={s} className={`h-5 w-5 ${reviewsData.avgRating >= s ? 'fill-current' : 'text-stone-300'}`} />
                        ))}
                      </div>
                      <div className="text-xs text-stone-500">Based on {reviewsData.totalReviewsCount} review{reviewsData.totalReviewsCount > 1 ? 's' : ''}</div>
                    </>
                  ) : (
                    <>
                      <div className="flex text-stone-300 mb-2">{[1, 2, 3, 4, 5].map(s => <Star key={s} className="h-5 w-5" />)}</div>
                      <div className="text-base font-bold text-stone-400">No ratings yet</div>
                      <div className="text-xs text-stone-400">Be the first to review</div>
                    </>
                  )}
                </div>
                <div className="flex-1 flex flex-col justify-center space-y-2 md:border-l md:pl-8 border-stone-200">
                  {reviewsData.ratingBreakdown.map(row => (
                    <div key={row.stars} className="flex items-center gap-3">
                      <div className="flex items-center w-8 text-xs text-stone-500">
                        {row.stars} <Star className="h-3 w-3 fill-current text-amber-400 ml-0.5" />
                      </div>
                      <div className="flex-1 h-1.5 bg-stone-200 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: `${row.percentage}%` }} />
                      </div>
                      <div className="w-6 text-right text-xs text-stone-400">{row.count}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Inline write review form */}
              {showWriteReviewModal && (
                <div className="mb-8 border border-orange-200 rounded-xl overflow-hidden animate-in fade-in duration-200">
                  <div className="bg-orange-50 border-b border-orange-100 p-5 flex justify-between items-center">
                    <div>
                      <h4 className="text-base font-bold text-gray-900 flex items-center gap-2">
                        <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                        Write a Review for {reviewsData.packageTitle}
                      </h4>
                      <p className="text-xs text-stone-500 mt-0.5">Share your authentic travel experience to guide future travellers</p>
                    </div>
                    <button onClick={() => setShowWriteReviewModal(false)} className="text-stone-400 hover:text-stone-700 p-1 rounded transition-colors cursor-pointer">
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="p-6 bg-white space-y-5">
                    <form onSubmit={handleAddReviewSubmit} className="space-y-5">
                      {/* Rating */}
                      <div className="bg-stone-50 p-4 rounded-lg border border-stone-200">
                        <Label className="text-sm font-semibold text-gray-800">Overall Rating</Label>
                        <div className="flex items-center gap-4 mt-2">
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map(star => (
                              <button type="button" key={star} onClick={() => setNewReview({ ...newReview, rating: star })} className="p-1 hover:scale-110 transition-transform focus:outline-none cursor-pointer">
                                <Star className={`h-8 w-8 ${newReview.rating >= star ? 'fill-amber-400 text-amber-400' : 'text-stone-300'}`} />
                              </button>
                            ))}
                          </div>
                          <Badge className="bg-amber-100 text-amber-800 text-xs font-semibold px-3 py-1 rounded-full border border-amber-200">
                            {newReview.rating === 5 ? '5.0 - Excellent' : newReview.rating === 4 ? '4.0 - Very Good' : newReview.rating === 3 ? '3.0 - Average' : newReview.rating === 2 ? '2.0 - Fair' : '1.0 - Poor'}
                          </Badge>
                        </div>
                      </div>
                      {/* Trip type */}
                      <div>
                        <Label className="text-sm font-semibold text-gray-800">Who did you travel with?</Label>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {['Family', 'Couples', 'Friends', 'Solo', 'Business'].map(type => (
                            <button type="button" key={type} onClick={() => setNewReview({ ...newReview, tripType: type })} className={`px-4 py-1.5 text-xs font-medium rounded-full border transition-colors cursor-pointer ${newReview.tripType === type ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-700 border-stone-300 hover:bg-stone-50'}`}>
                              {type}
                            </button>
                          ))}
                        </div>
                      </div>
                      {/* Name & city */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="rev-name" className="text-xs font-semibold text-gray-700">Your Full Name *</Label>
                          <Input id="rev-name" required placeholder="e.g. Amit Kumar" value={newReview.name} onChange={e => setNewReview({ ...newReview, name: e.target.value })} className="mt-1 rounded-lg" />
                        </div>
                        <div>
                          <Label htmlFor="rev-city" className="text-xs font-semibold text-gray-700">City / Origin *</Label>
                          <Input id="rev-city" required placeholder="e.g. Mumbai, Delhi, London..." value={newReview.travelledFrom} onChange={e => setNewReview({ ...newReview, travelledFrom: e.target.value })} className="mt-1 rounded-lg" />
                        </div>
                      </div>
                      {/* Detailed review */}
                      <div>
                        <Label htmlFor="rev-comment" className="text-xs font-semibold text-gray-700">Detailed Review *</Label>
                        <Textarea id="rev-comment" required rows={4} placeholder="Tell us about your experience: hotel stay, sightseeing highlights, driver/guide assistance, and overall value..." value={newReview.comment} onChange={e => setNewReview({ ...newReview, comment: e.target.value })} className="mt-1 leading-relaxed rounded-lg" />
                      </div>
                      {/* Photo URL */}
                      <div>
                        <Label htmlFor="rev-photo" className="text-xs font-semibold text-gray-700">Attach Trip Photo URL (Optional)</Label>
                        <Input id="rev-photo" placeholder="https://images.unsplash.com/..." value={newReview.photoUrl} onChange={e => setNewReview({ ...newReview, photoUrl: e.target.value })} className="mt-1 text-xs rounded-lg" />
                      </div>
                      {/* Actions */}
                      <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-100">
                        <button type="button" onClick={() => setShowWriteReviewModal(false)} className="px-6 py-2 text-sm font-medium text-stone-600 hover:text-stone-900 border border-stone-300 rounded-lg transition-colors cursor-pointer">
                          Cancel
                        </button>
                        <button type="submit" disabled={isSubmittingReview || !newReview.comment.trim() || !newReview.name.trim()} className="px-8 py-2 text-sm font-semibold text-white rounded-lg transition-all disabled:opacity-50 cursor-pointer" style={{ background: '#b84814' }}>
                          {isSubmittingReview ? 'Posting Review...' : 'Submit Review'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Traveller Image Gallery */}
              {reviewsData.travellerImages.length > 0 && (
                <div className="mb-8">
                  <h4 className="font-bold text-gray-900 mb-3 text-sm">Traveller Photos</h4>
                  <div className="grid grid-cols-4 gap-2" style={{ height: '260px' }}>
                    <div
                      className="col-span-2 row-span-2 relative rounded-lg overflow-hidden group cursor-pointer"
                      onClick={() => setSelectedGalleryImage(reviewsData.travellerImages[0])}
                    >
                      <img src={reviewsData.travellerImages[0]} alt="Traveller 1" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      {reviewsData.travellerImages.length > 1 && (
                        <button
                          onClick={e => { e.stopPropagation(); setSelectedGalleryImage(reviewsData.travellerImages[0]); }}
                          className="absolute bottom-3 left-3 bg-black/55 backdrop-blur-md text-white border border-white/30 px-3 py-1 rounded-lg text-xs font-medium hover:bg-black/70 transition-colors cursor-pointer"
                        >
                          View all ({reviewsData.travellerImages.length})
                        </button>
                      )}
                    </div>
                    {reviewsData.travellerImages.slice(1, 5).map((img, idx) => (
                      <div
                        key={idx}
                        className="rounded-lg overflow-hidden group cursor-pointer"
                        onClick={() => setSelectedGalleryImage(img)}
                      >
                        <img src={img} alt={`Traveller ${idx + 2}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Real User Reviews List */}
              <div className="space-y-4">
                {reviewsData.totalReviewsCount > 0 ? (
                  reviewsData.userReviews.map((review: any) => (
                    <div key={review.id} className="border border-stone-200 rounded-xl p-5 bg-white hover:border-stone-300 transition-colors">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center font-bold text-sm">
                            {review.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900 text-sm">{review.name}</h4>
                            <p className="text-xs text-stone-400">{review.date}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-sm font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                          <Star className="h-3.5 w-3.5 fill-current" /> {review.rating}/5
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-500 border-y border-stone-100 py-2 my-3">
                        <span>Booked: <span className="text-orange-600 font-medium">{review.booked}</span></span>
                        {review.travelledFrom && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-stone-400" />
                            From: <span className="font-medium text-gray-700 ml-0.5">{review.travelledFrom}</span>
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed">{review.text}</p>
                      {review.images && review.images.length > 0 && (
                        <div className="flex gap-2 overflow-x-auto pt-3 pb-1">
                          {review.images.map((img: string, i: number) => (
                            <div
                              key={i}
                              className="w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden cursor-pointer border border-stone-200"
                              onClick={() => setSelectedGalleryImage(img)}
                            >
                              <img src={img} alt={`Review image ${i + 1}`} className="w-full h-full object-cover hover:scale-105 transition-transform" />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="border-2 border-dashed border-stone-200 rounded-xl p-10 text-center">
                    <div className="w-12 h-12 rounded-full bg-orange-50 text-orange-400 flex items-center justify-center mx-auto mb-3">
                      <MessageCircle className="h-6 w-6" />
                    </div>
                    <h4 className="font-bold text-gray-800 text-base mb-1">No reviews yet for this package</h4>
                    <p className="text-xs text-stone-400 max-w-sm mx-auto mb-4">
                      Have you travelled on this trip? Be the first traveller to write an authentic review!
                    </p>
                    {user ? (
                      <button
                        onClick={() => setShowWriteReviewModal(true)}
                        className="inline-flex items-center gap-2 text-sm font-semibold text-white px-5 py-2.5 rounded-lg cursor-pointer transition-all hover:opacity-90"
                        style={{ background: '#b84814' }}
                      >
                        <Plus className="h-4 w-4" /> Write a Review
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          const authBtn = document.querySelector('header button');
                          if (authBtn) (authBtn as HTMLButtonElement).click();
                          else alert("Please login to write a review");
                        }}
                        className="inline-flex items-center gap-2 text-sm font-semibold text-orange-600 bg-orange-50 hover:bg-orange-100 px-5 py-2.5 rounded-lg cursor-pointer transition-all"
                      >
                        <User className="h-4 w-4" /> Please login to review
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* FAQ Section */}
          <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
            <div className="px-6 py-5 border-b border-stone-100 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                <MessageCircle className="h-4 w-4 text-blue-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900" style={{ fontFamily: "var(--font-playfair, 'Playfair Display', Georgia, serif)" }}>Frequently Asked Questions</h2>
            </div>
            <div className="divide-y divide-stone-100">
              {defaultFAQs.map((faq, index) => (
                <div key={index}>
                  <button
                    className="w-full flex items-center justify-between p-5 text-left hover:bg-stone-50 transition-colors cursor-pointer"
                    onClick={() => toggleFAQ(index)}
                  >
                    <span className="font-semibold text-gray-900 text-sm pr-4">{faq.question}</span>
                    {expandedFAQs.includes(index)
                      ? <ChevronUp className="h-4 w-4 text-stone-400 shrink-0" />
                      : <ChevronDown className="h-4 w-4 text-stone-400 shrink-0" />
                    }
                  </button>
                  {expandedFAQs.includes(index) && (
                    <div className="px-5 pb-5 border-t border-stone-50 bg-stone-50/30">
                      <p className="text-sm text-gray-600 leading-relaxed pt-3">{faq.answer}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ─── SCROLL-TRIGGERED STICKY CHAT BAR ───────────────────── */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-[150] bg-white border-t border-stone-200 shadow-[0_-4px_24px_-4px_rgba(0,0,0,0.12)] p-4 flex justify-between items-center transition-transform duration-500 ease-in-out ${showStickyBar ? 'translate-y-0' : 'translate-y-full'}`}
      >
        <div className="max-w-7xl mx-auto w-full flex justify-between items-center px-4 md:px-8">
          <div className="hidden md:block">
            <h3 className="font-bold text-gray-900 line-clamp-1 text-sm">{listing.title || 'Package'}</h3>
            <p className="font-bold text-base" style={{ color: '#b84814' }}>
              {currencySymbol}{displayPrice || 'Contact Us'}
            </p>
          </div>
          <Button
            className="w-full md:w-auto text-white font-bold rounded-full px-8 h-12 text-base transition-all hover:-translate-y-0.5 hover:shadow-lg cursor-pointer border-0"
            style={{ background: 'linear-gradient(135deg, #b84814 0%, #e25c1a 100%)' }}
            onClick={() => onChat(listing)}
          >
            <MessageCircle className="h-5 w-5 mr-2" />
            Chat with Agency
          </Button>
        </div>
      </div>

      {/* ─── COMPARE TOAST NOTIFICATION ─────────────────────────── */}
      {showCompareToast && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 fade-in duration-300">
          <div className={`flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl text-white text-sm font-medium ${compareToastMessage.includes('already') || compareToastMessage.includes('only compare') ? 'bg-amber-500' : 'bg-emerald-500'}`}>
            {compareToastMessage.includes('already') || compareToastMessage.includes('only compare')
              ? <AlertCircle className="h-4 w-4" />
              : <CheckCircle2 className="h-4 w-4" />
            }
            <span>{compareToastMessage}</span>
          </div>
        </div>
      )}

      {/* ─── FULL SCREEN PHOTO GALLERY MODAL ────────────────────── */}
      {showAllPhotos && (
        <div className="fixed inset-0 bg-white z-[200] flex flex-col animate-in fade-in zoom-in-95 duration-200">
          <div className="sticky top-0 bg-white border-b border-stone-200 z-10 px-4 md:px-8 py-3 flex items-center shadow-sm">
            <button
              className="flex items-center gap-2 text-gray-900 font-bold hover:bg-stone-100 px-3 md:px-4 py-2 rounded-lg transition-colors"
              onClick={() => setShowAllPhotos(false)}
            >
              <ArrowLeft className="h-5 w-5" /> Back
            </button>
            <div className="flex-1 flex justify-center overflow-x-auto">
              <div className="flex items-center gap-6 md:gap-10 text-sm font-medium text-stone-500 whitespace-nowrap">
                <button className="text-orange-600 border-b-2 border-orange-500 pb-1 px-2">
                  All Images ({allImages.length})
                </button>
                <button className="hover:text-stone-900 pb-1 px-2 transition-colors">Destinations</button>
                <button className="hover:text-stone-900 pb-1 px-2 transition-colors">Activities</button>
                <button className="hover:text-stone-900 pb-1 px-2 transition-colors">Stays</button>
              </div>
            </div>
            <div className="w-[100px] hidden md:block" />
          </div>

          <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-stone-50">
            <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
              {allImages.map((image, index) => (
                <div
                  key={index}
                  className="aspect-video rounded-xl overflow-hidden bg-stone-200 group cursor-pointer"
                  onClick={() => setSelectedGalleryImage(image)}
                >
                  <img
                    src={optimizeImageUrl(image, { width: 1200, quality: 85, format: 'auto', cacheBust: false })}
                    alt={`Gallery Image ${index + 1}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                    loading={index < 4 ? 'eager' : 'lazy'}
                    decoding="async"
                  />
                </div>
              ))}
            </div>
            {allImages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-64 text-stone-400">
                <Camera className="h-16 w-16 mb-4 opacity-40" />
                <p className="text-lg">No photos available for this package.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── TRAVELLER PHOTO LIGHTBOX MODAL ─────────────────────── */}
      {selectedGalleryImage && (
        <div
          className="fixed inset-0 bg-black/92 z-[300] flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setSelectedGalleryImage(null)}
        >
          <button
            onClick={() => setSelectedGalleryImage(null)}
            className="absolute top-6 right-6 text-white hover:text-stone-300 bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors cursor-pointer"
          >
            <X className="h-6 w-6" />
          </button>
          <div className="max-w-4xl max-h-[85vh] overflow-hidden rounded-xl" onClick={e => e.stopPropagation()}>
            <img src={selectedGalleryImage} alt="Full size photo" className="w-full h-full object-contain" />
          </div>
        </div>
      )}
    </div>
  );
}
