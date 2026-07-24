import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useComparison } from '@/contexts/ComparisonContext';
import { optimizeImageUrl, preloadImage } from '@/lib/imageOptimization';
import { getDbInstance } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import {
  Star,
  Share2,
  Scale,
  Heart,
  MapPin,
  Calendar,

  ChevronRight,
  ChevronLeft,
  Home,

  Camera,
  Video,
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
  Utensils
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

// Sample accommodation data
const defaultAccommodations = [
  { city: "Chandigarh", hotels: ["Hotel Mount View", "Taj Chandigarh", "JW Marriott"], nights: 1 },
  { city: "Manali", hotels: ["Solang Valley Resort", "Manuallaya The Resort & Spa", "The Himalayan"], nights: 2 },
  { city: "Shimla", hotels: ["Wildflower Hall", "The Oberoi Cecil", "Radisson Hotel Shimla"], nights: 2 }
];

// Pure Real Review Data Processor (No Static / Mock Reviews)
function getReviewsData(listing: any, userDbReviews: any[]) {
  const packageTitle = listing?.title || 'Travel Package';
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
  const [activeTab, setActiveTab] = useState<'itinerary' | 'inclusions'>('itinerary');
  const [activeImageTab, setActiveImageTab] = useState<'sightseeing' | 'hotel' | 'video'>('sightseeing');
  const [expandedDays, setExpandedDays] = useState<number[]>([]);
  const [expandedFAQs, setExpandedFAQs] = useState<number[]>([]);
  const [showAllPhotos, setShowAllPhotos] = useState(false);
  const [showCompareToast, setShowCompareToast] = useState(false);
  const [compareToastMessage, setCompareToastMessage] = useState('');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Review specific states
  const [userDbReviews, setUserDbReviews] = useState<any[]>([]);
  const [showWriteReviewModal, setShowWriteReviewModal] = useState(false);
  const [selectedGalleryImage, setSelectedGalleryImage] = useState<string | null>(null);
  const [newReview, setNewReview] = useState({
    name: '',
    travelledFrom: '',
    rating: 5,
    tripType: 'Family',
    comment: '',
    photoUrl: ''
  });
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  useEffect(() => {
    const fetchPackageReviews = async () => {
      const listingId = listing?.id || listing?.docId;
      if (!listingId) return;

      try {
        // Try server API route first (bypasses client firestore security rules)
        const res = await fetch(`/api/reviews?listingId=${encodeURIComponent(listingId)}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.reviews)) {
            setUserDbReviews(data.reviews);
            return;
          }
        }

        // Fallback to client Firestore query if needed
        const db = getDbInstance();
        if (db) {
          const q = query(
            collection(db, 'reviews'),
            where('listingId', '==', listingId)
          );
          const querySnapshot = await getDocs(q);
          const fetched: any[] = [];
          querySnapshot.forEach((doc) => {
            fetched.push({ id: doc.id, ...doc.data() });
          });
          setUserDbReviews(fetched);
        }
      } catch (error) {
        console.error('Error fetching package reviews:', error);
      }
    };

    fetchPackageReviews();
  }, [listing?.id, listing?.docId]);

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
      // Try server API endpoint first to bypass client permission restrictions
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reviewData)
      });

      if (!res.ok) {
        const db = getDbInstance();
        if (db) {
          await addDoc(collection(db, 'reviews'), reviewData);
        }
      }
    } catch (error) {
      console.warn('API review submission fallback:', error);
    } finally {
      // Always update UI state immediately
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
    const shareData = {
      title: listing.title || 'Travel Package',
      text: `Check out this amazing travel package: ${listing.title || 'Travel Package'}!`,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        setCompareToastMessage('Link copied to clipboard!');
        setShowCompareToast(true);
        setTimeout(() => setShowCompareToast(false), 3000);
      }
    } catch (err) {
      console.error('Error sharing:', err);
    }
  };

  // Get all images from placesCovered
  const getAllImages = () => {
    const images: string[] = [];
    if (listing.placesCovered && listing.placesCovered.length > 0) {
      listing.placesCovered.forEach((place: any) => {
        if (place.imageUrls && place.imageUrls.length > 0) {
          images.push(...place.imageUrls);
        }
      });
    }
    return images;
  };

  const allImages = getAllImages();
  const mainImage = allImages.length > 0 ? allImages[0] : null;
  const remainingImages = allImages.slice(1, 4); // Get up to 3 more images for side panel

  // Preload all listing images on mount for instant navigation
  useEffect(() => {
    if (allImages.length > 0) {
      allImages.forEach((imgUrl) => {
        const optimized = optimizeImageUrl(imgUrl, {
          width: 1200,
          quality: 85,
          format: 'auto',
          cacheBust: false
        });
        preloadImage(optimized).catch(() => {
          // Ignore preload errors
        });
      });
    }
  }, [allImages]);

  // Parse inclusions and exclusions into arrays
  const parseList = (input: any) => {
    if (!input) return [];
    if (Array.isArray(input)) return input.filter(item => typeof item === 'string' && item.trim() !== '');
    return String(input).split('\n').filter(item => item.trim() !== '');
  };

  const inclusions = parseList(listing.inclusions);
  const exclusions = parseList(listing.exclusions);

  const toggleDay = (day: number) => {
    setExpandedDays(prev =>
      prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  const toggleFAQ = (index: number) => {
    setExpandedFAQs(prev =>
      prev.includes(index)
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  // Get unique places to display based on itinerary fallback
  const getDisplayPlaces = () => {
    const covered = listing.placesCovered?.map((p: any) => p.name?.trim()).filter(Boolean) || [];
    if (covered.length > 0) return covered;
    // Fallback to itinerary place names
    const itineraryPlaces = listing.itinerary?.map((d: any) => d.placeName?.trim()).filter(Boolean) || [];
    return Array.from(new Set(itineraryPlaces));
  };

  // Generate breadcrumb
  const getBreadcrumb = () => {
    const parts = ['Home'];
    if (listing.packageType === 'domestic') {
      parts.push('Domestic');
      if (listing.stateName) parts.push(listing.stateName);
    } else {
      parts.push('International');
      if (listing.countryName) parts.push(listing.countryName);
    }
    parts.push(listing.title || 'Package');
    return parts;
  };

  const breadcrumb = getBreadcrumb();

  // Generate package code
  const packageCode = `PKG${listing.id?.slice(-4).toUpperCase() || '0000'}`;

  // Gather all tags for the badge row
  const tags: string[] = [];

  // Categories
  if (Array.isArray(listing.tourCategories) && listing.tourCategories.length > 0) {
    listing.tourCategories.forEach((c: string) => tags.push(`${c} Tour`));
  } else {
    tags.push('Family Tour');
  }

  // Experience Types
  if (Array.isArray(listing.experienceType)) {
    tags.push(...listing.experienceType);
  } else if (typeof listing.experienceType === 'string' && listing.experienceType) {
    tags.push(listing.experienceType);
  }

  // Season
  if (listing.season) {
    tags.push(listing.season === 'all-seasons' ? 'All Seasons' : `${listing.season} Season`);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Breadcrumb */}
          <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-4">
            {breadcrumb.map((part, index) => (
              <React.Fragment key={index}>
                <span className={index === breadcrumb.length - 1 ? 'text-gray-900 font-medium' : 'hover:text-gray-700 cursor-pointer'}>
                  {part}
                </span>
                {index < breadcrumb.length - 1 && (
                  <ChevronRight className="h-4 w-4" />
                )}
              </React.Fragment>
            ))}
          </nav>

          {/* Title and Actions Row */}
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {listing.title || 'Travel Package'}
              </h1>

              {/* Tags Row */}
              <div className="flex flex-wrap items-center gap-3 mb-3">
                {tags.map((tag: string, index: number) => (
                  <Badge
                    key={index}
                    className="bg-orange-100 text-orange-700 hover:bg-orange-200 border-orange-200 rounded-none capitalize"
                  >
                    {tag}
                  </Badge>
                ))}
                <Badge variant="outline" className="text-gray-600 rounded-none">
                  {/* Code: {packageCode} */}
                </Badge>
                <div className="flex items-center gap-1 text-yellow-500">
                  <Star className="h-4 w-4 fill-current" />
                  <Star className="h-4 w-4 fill-current" />
                  <Star className="h-4 w-4 fill-current" />
                  <Star className="h-4 w-4 fill-current" />
                  <Star className="h-4 w-4 fill-current" />
                  <span className="text-sm text-gray-600 ml-1">Google Rating</span>
                </div>
              </div>

              {/* Location tags */}
              <div className="flex flex-wrap gap-2 text-sm text-gray-600">
                {getDisplayPlaces().map((name: string, index: number, arr: string[]) => (
                  <span key={index} className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {name}
                    {index < arr.length - 1 && <span className="mx-1">|</span>}
                  </span>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col items-end gap-3">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex items-center gap-1.5 text-gray-500 hover:text-gray-900 font-semibold hover:bg-gray-100 rounded-none group transition-all"
                  onClick={onBack}
                >
                  <ChevronLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                  Back
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2 rounded-none"
                  onClick={handleShare}
                >
                  <Share2 className="h-4 w-4" />
                  Share
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className={`flex items-center gap-2 rounded-none ${isInComparison(listing.id) ? 'bg-blue-50 text-blue-600 border-blue-200' : ''}`}
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
                >
                  {isInComparison(listing.id) ? (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Added
                    </>
                  ) : (
                    <>
                      <Scale className="h-4 w-4" />
                      Compare
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className={`flex items-center gap-2 rounded-none ${isWishlisted ? 'text-red-500 border-red-200 bg-red-50' : ''}`}
                  onClick={() => onWishlist?.(listing.id)}
                >
                  <Heart className={`h-4 w-4 ${isWishlisted ? 'fill-current' : ''}`} />
                  Wishlist
                </Button>
              </div>

              {/* <Button 
                className="bg-gray-500 hover:bg-gray-600 text-white px-8"
                onClick={() => onBook(listing)}
              >
                View Price for My Tour
              </Button> */}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Photo Gallery Section - Thrillophilia Style */}
        <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-2 mb-8 h-[300px] sm:h-[400px] lg:h-[460px]">
          {/* Main Photo */}
          <div className="lg:col-span-8 h-full relative group rounded-none lg:rounded-none overflow-hidden">
            {allImages.length > 0 ? (
              <div className="relative w-full h-full overflow-hidden">
                <div
                  className="flex w-full h-full transition-transform duration-300 ease-out"
                  style={{ transform: `translateX(-${currentImageIndex * 100}%)` }}
                >
                  {allImages.map((imgUrl, idx) => (
                    <div
                      key={idx}
                      className="w-full h-full shrink-0 relative cursor-pointer overflow-hidden"
                      onClick={() => setShowAllPhotos(true)}
                    >
                      <img
                        src={optimizeImageUrl(imgUrl, { width: 1200, quality: 85, format: 'auto', cacheBust: false })}
                        alt={`${listing.title} photo ${idx + 1}`}
                        className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                        loading={idx === 0 ? "eager" : "lazy"}
                        decoding="async"
                      />
                    </div>
                  ))}
                </div>

                {/* Navigation Arrows */}
                {allImages.length > 1 && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentImageIndex((prev) => (prev === 0 ? allImages.length - 1 : prev - 1));
                      }}
                      className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 rounded-none p-2 shadow-md hover:shadow-lg transition-all duration-200 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 hover:scale-110 active:scale-95 focus:outline-none z-20 cursor-pointer"
                      aria-label="Previous image"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentImageIndex((prev) => (prev === allImages.length - 1 ? 0 : prev + 1));
                      }}
                      className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 rounded-none p-2 shadow-md hover:shadow-lg transition-all duration-200 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 hover:scale-110 active:scale-95 focus:outline-none z-20 cursor-pointer"
                      aria-label="Next image"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </>
                )}

                {/* Dot Indicators for Mobile */}
                {allImages.length > 1 && (
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex lg:hidden gap-1.5 bg-black/30 backdrop-blur-[2px] px-2.5 py-1.5 rounded-none opacity-100 transition-all duration-200 z-20">
                    {allImages.map((_, idx) => (
                      <span
                        key={idx}
                        className={`h-1.5 rounded-none transition-all duration-200 ${idx === currentImageIndex ? 'w-4 bg-white' : 'w-1.5 bg-white/60'
                          }`}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-200 cursor-pointer rounded-none" onClick={() => setShowAllPhotos(true)}>
                <Camera className="h-16 w-16 text-gray-400" />
                <span className="ml-2 text-gray-500">No photos available</span>
              </div>
            )}

            {/* Desktop View All Button overlay on Main Image if side photos aren't shown, 
                or just keep mobile view all button */}
            <div className="lg:hidden absolute bottom-14 right-4 z-20">
              <Button onClick={(e) => { e.stopPropagation(); setShowAllPhotos(true); }} className="bg-white/90 text-black hover:bg-white flex items-center gap-2 shadow-md rounded-none h-9 text-xs">
                <Camera className="h-4 w-4" />
                All
              </Button>
            </div>
          </div>

          {/* Side Photo Grid (Desktop Only) */}
          <div className="lg:col-span-4 h-full hidden lg:grid grid-cols-2 grid-rows-2 gap-2">
            {[1, 2, 3, 4].map((idx) => {
              const imgIndex = idx;
              const hasImage = imgIndex < allImages.length;
              const image = hasImage ? allImages[imgIndex] : null;

              return (
                <div
                  key={idx}
                  className={`relative overflow-hidden group cursor-pointer bg-gray-100 ${idx === 2 ? 'rounded-none' : ''} ${idx === 4 ? 'rounded-none' : ''}`}
                  onClick={() => setShowAllPhotos(true)}
                >
                  {hasImage && image ? (
                    <img
                      src={optimizeImageUrl(image, { width: 600, quality: 85, format: 'auto' })}
                      alt={`${listing.title} ${idx + 1}`}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 rounded-none"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-100 rounded-none"></div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Desktop View All Button (Floating at bottom right) */}
          <div className="hidden lg:block absolute bottom-4 right-4 z-10">
            <Button onClick={() => setShowAllPhotos(true)} className="bg-white text-black hover:bg-gray-100 flex items-center gap-2 shadow-md rounded-none font-semibold px-4 py-2 border border-gray-200">
              <Camera className="h-4 w-4" />
              View All Images
            </Button>
          </div>
        </div>

        {/* Package Summary Bar */}
        <div className="mb-8 pt-2 pb-6 border-b border-gray-100">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            
            {/* Duration Box */}
            <div className="border border-gray-200 bg-white p-4 flex items-center gap-4 rounded-none shadow-sm">
              
              <div>
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider  mb-0.5">Duration</p>
                <p className="font-bold text-gray-900 text-sm leading-tight">{duration}D / {nights}N</p>
              </div>
            </div>

            {/* Places Box */}
            <div className="border border-gray-200 bg-white p-4 flex items-center gap-4 rounded-none shadow-sm">
             
              <div>
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-0.5">Places</p>
                <p className="font-bold text-gray-900 text-sm leading-tight">{getDisplayPlaces().length || 0} Cities</p>
              </div>
            </div>

            {/* Hotel Type Box */}
            <div className="border border-gray-200 bg-white p-4 flex items-center gap-4 rounded-none shadow-sm">
             
              <div>
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-0.5">Hotel Type</p>
                <p className="font-bold text-gray-900 text-sm leading-tight capitalize line-clamp-2">
                  {getFormattedHotelTypes(listing.hotelTypes)}
                </p>
              </div>
            </div>

            {/* Meal Plan Box */}
            <div className="border border-gray-200 bg-white p-4 flex items-center gap-4 rounded-none shadow-sm">
              
              <div>
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-0.5">Meal Plan</p>
                <p className="font-bold text-gray-900 text-sm leading-tight capitalize line-clamp-2">
                  {getFormattedMealPlan(listing.mealPlan)}
                </p>
              </div>
            </div>

            {/* Starting From Box */}
            <div className="border border-gray-200 bg-white p-4 flex items-center gap-4 rounded-none shadow-sm">
              
              <div>
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-0.5">Starting From</p>
                <p className="font-bold text-orange-655 text-base leading-tight">
                  {listing.packageType === 'international' ? '$' : '₹'}{listing.cost || 'Contact Us'}
                </p>
              </div>
            </div>

          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Main Content (Tabbed) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Rectangular Tab Buttons */}
            <div className="flex border border-gray-200 bg-white overflow-x-auto scrollbar-none rounded-none shadow-sm">
              {(['itinerary', 'inclusions'] as const).map((tab) => {
                const label = tab === 'itinerary' ? 'Itinerary' : 'Inclusions & Exclusions';
                const Icon = tab === 'itinerary' ? Calendar : ShieldCheck;
                const isActive = activeTab === tab;
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 min-w-[120px] whitespace-nowrap px-4 py-4 text-xs sm:text-sm font-semibold border-b-2 transition-colors rounded-none cursor-pointer flex items-center justify-center gap-2 ${
                      isActive
                        ? 'border-orange-500 text-orange-600 bg-orange-50/20 font-bold'
                        : 'border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Tab Content Box */}
            <Card className="rounded-none border-gray-200 shadow-sm">
              <CardContent className="p-4 sm:p-6 bg-white">
                {activeTab === 'itinerary' && (
                  <div>
                    {listing.itinerary && listing.itinerary.length > 0 ? (
                      <div className="space-y-3">
                        {listing.itinerary.map((day: any, index: number) => (
                          <div key={day.id || index} className="bg-white border border-gray-200 rounded-none shadow-none overflow-hidden transition-all hover:border-gray-300">
                            <button
                              className="w-full flex items-center justify-between text-left px-4 py-3 sm:px-5 sm:py-3.5 bg-white rounded-none cursor-pointer"
                              onClick={() => toggleDay(day.day)}
                            >
                              <div className="flex items-center gap-3">
                                <div className="bg-[#b84814] text-white px-3 py-1 rounded-none text-xs font-bold tracking-wider shrink-0 shadow-none">
                                  DAY {day.day}
                                </div>
                                <h3 className="text-base font-semibold text-gray-900 leading-tight">
                                  {day.placeName || `Day ${day.day} Activities`}
                                </h3>
                              </div>
                              {expandedDays.includes(day.day) ? (
                                <ChevronUp className="h-5 w-5 text-gray-650 shrink-0 ml-4" strokeWidth={2.5} />
                              ) : (
                                <ChevronDown className="h-5 w-5 text-gray-655 shrink-0 ml-4" strokeWidth={2.5} />
                              )}
                            </button>

                            {expandedDays.includes(day.day) && (
                              <div className="px-5 pb-5 pt-2 border-t border-gray-100 bg-gray-50/30">
                                <p className="text-gray-700 leading-relaxed sm:ml-[88px] text-sm">
                                  {day.description || 'Detailed itinerary for this day will be shared upon booking confirmation.'}
                                </p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-8 text-center text-gray-500">
                        <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                        <p>Detailed itinerary will be available soon.</p>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'inclusions' && (
                  <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-gray-200">
                    {/* Inclusions */}
                    <div className="flex-1 pb-6 md:pb-0 md:pr-6">
                      <h3 className="font-bold text-gray-900 mb-4 text-base flex items-center gap-2 border-b border-gray-100 pb-2">
                        <CheckCircle2 className="h-5 w-5 text-emerald-500" /> Inclusions
                      </h3>
                      {inclusions.length > 0 ? (
                        <ul className="space-y-3">
                          {inclusions.map((item: string, index: number) => (
                            <li key={index} className="flex items-start gap-3">
                              <div className="w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                              </div>
                              <span className="text-sm text-gray-600 leading-relaxed">{item}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-gray-500">Inclusions will be listed here.</p>
                      )}
                    </div>
                    {/* Exclusions */}
                    <div className="flex-1 pt-6 md:pt-0 md:pl-6">
                      <h3 className="font-bold text-gray-900 mb-4 text-base flex items-center gap-2 border-b border-gray-100 pb-2">
                        <X className="h-5 w-5 text-red-500" strokeWidth={3} /> Exclusions
                      </h3>
                      {exclusions.length > 0 ? (
                        <ul className="space-y-3">
                          {exclusions.map((item: string, index: number) => (
                            <li key={index} className="flex items-start gap-3">
                              <div className="w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <X className="h-4 w-4 text-red-500" strokeWidth={3} />
                              </div>
                              <span className="text-sm text-gray-600 leading-relaxed">{item}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-gray-500">Exclusions will be listed here.</p>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Reviews Section (Permanently Displayed Below Tab Card) */}
            <Card className="rounded-none border-gray-200 shadow-sm mt-6">
              <CardContent className="p-6 bg-white">
                <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-4">
                  <h3 className="text-lg font-bold text-gray-900">
                    Guest Reviews ({reviewsData.totalReviewsCount})
                  </h3>
                  <Button
                    onClick={() => setShowWriteReviewModal(true)}
                    className="bg-orange-500 hover:bg-orange-600 text-white font-semibold flex items-center gap-2 rounded-none shadow-none cursor-pointer h-9 text-sm"
                  >
                    <Plus className="h-4 w-4" />
                    Write a Review
                  </Button>
                </div>

                {/* Reviews Overview */}
                <div className="flex flex-col md:flex-row gap-8 mb-10 p-6 bg-gray-50/50 border border-gray-200 rounded-none">
                  {/* Overall Rating */}
                  <div className="flex flex-col items-center justify-center shrink-0 px-4">
                    {reviewsData.totalReviewsCount > 0 ? (
                      <>
                        <div className="flex text-amber-500 mb-2">
                          {[1, 2, 3, 4, 5].map(star => (
                            <Star key={star} className={`h-6 w-6 ${reviewsData.avgRating >= star ? 'fill-current' : 'text-gray-300'}`} />
                          ))}
                        </div>
                        <div className="text-5xl font-bold text-gray-900 mb-1">
                          {reviewsData.avgRating.toFixed(1)}
                        </div>
                        <div className="text-xs text-gray-500 font-medium">
                          Based on {reviewsData.totalReviewsCount} review{reviewsData.totalReviewsCount > 1 ? 's' : ''}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex text-gray-300 mb-2">
                          {[1, 2, 3, 4, 5].map(star => (
                            <Star key={star} className="h-6 w-6 text-gray-300" />
                          ))}
                        </div>
                        <div className="text-xl font-bold text-gray-400 mb-1">No ratings yet</div>
                        <div className="text-xs text-gray-400">Be the first to review this trip</div>
                      </>
                    )}
                  </div>

                  {/* Rating Breakdown */}
                  <div className="flex-1 flex flex-col justify-center space-y-2 md:border-l md:pl-8 border-gray-200">
                    {reviewsData.ratingBreakdown.map((row) => (
                      <div key={row.stars} className="flex items-center gap-3">
                        <div className="flex items-center w-8 text-xs text-gray-600">
                          {row.stars} <Star className="h-3 w-3 fill-current text-amber-400 ml-1" />
                        </div>
                        <div className="flex-1 h-2 bg-gray-200 rounded-none overflow-hidden">
                          <div
                            className="h-full bg-orange-500 rounded-none transition-all"
                            style={{ width: `${row.percentage}%` }}
                          ></div>
                        </div>
                        <div className="w-8 text-right text-xs text-gray-500">{row.count}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Standard Travel Platform Inline Review Form */}
                {showWriteReviewModal && (
                  <div className="mb-10 border border-orange-200 bg-orange-50/10 shadow-none rounded-none overflow-hidden animate-in fade-in duration-200">
                    <div className="bg-white border-b border-orange-100 p-5 flex justify-between items-center">
                      <div>
                        <h4 className="text-base font-bold text-gray-900 flex items-center gap-2">
                          <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                          Write a Review for {reviewsData.packageTitle}
                        </h4>
                        <p className="text-xs text-gray-500 mt-1">
                          Share your authentic travel experience to guide future travellers
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowWriteReviewModal(false)}
                        className="text-gray-400 hover:text-gray-700 rounded-none cursor-pointer"
                      >
                        <X className="h-5 w-5" />
                      </Button>
                    </div>
                    <div className="p-6 bg-white space-y-6">
                      <form onSubmit={handleAddReviewSubmit} className="space-y-6">
                        {/* Rating Selector */}
                        <div className="bg-gray-55 p-4 rounded-none border border-gray-200">
                          <Label className="text-sm font-semibold text-gray-800">Overall Rating</Label>
                          <div className="flex items-center gap-4 mt-2">
                            <div className="flex gap-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                  type="button"
                                  key={star}
                                  onClick={() => setNewReview({ ...newReview, rating: star })}
                                  className="p-1 hover:scale-110 transition-transform focus:outline-none cursor-pointer"
                                >
                                  <Star className={`h-8 w-8 ${newReview.rating >= star ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} />
                                </button>
                              ))}
                            </div>
                            <Badge className="bg-amber-100 text-amber-805 text-xs font-semibold px-3 py-1 rounded-none border border-amber-200">
                              {newReview.rating === 5 ? '5.0 - Excellent' :
                                newReview.rating === 4 ? '4.0 - Very Good' :
                                  newReview.rating === 3 ? '3.0 - Average' :
                                    newReview.rating === 2 ? '2.0 - Fair' : '1.0 - Poor'}
                            </Badge>
                          </div>
                        </div>

                        {/* Travel Type Selector */}
                        <div>
                          <Label className="text-sm font-semibold text-gray-800">Who did you travel with?</Label>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {['Family', 'Couples', 'Friends', 'Solo', 'Business'].map((type) => (
                              <button
                                type="button"
                                key={type}
                                onClick={() => setNewReview({ ...newReview, tripType: type })}
                                className={`px-4 py-2 text-xs font-medium rounded-none border transition-colors cursor-pointer ${newReview.tripType === type ? 'bg-orange-500 text-white border-orange-500 shadow-none' : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'}`}
                              >
                                {type}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Name & Origin City */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="rev-name" className="text-xs font-semibold text-gray-700">Your Full Name *</Label>
                            <Input
                              id="rev-name"
                              required
                              placeholder="e.g. Amit Kumar"
                              value={newReview.name}
                              onChange={(e) => setNewReview({ ...newReview, name: e.target.value })}
                              className="mt-1 rounded-none"
                            />
                          </div>
                          <div>
                            <Label htmlFor="rev-city" className="text-xs font-semibold text-gray-700">City / Origin *</Label>
                            <Input
                              id="rev-city"
                              required
                              placeholder="e.g. Mumbai, Delhi, London..."
                              value={newReview.travelledFrom}
                              onChange={(e) => setNewReview({ ...newReview, travelledFrom: e.target.value })}
                              className="mt-1 rounded-none"
                            />
                          </div>
                        </div>

                        {/* Detailed Review */}
                        <div>
                          <Label htmlFor="rev-comment" className="text-xs font-semibold text-gray-700">Detailed Review *</Label>
                          <Textarea
                            id="rev-comment"
                            required
                            rows={4}
                            placeholder="Tell us about your experience: hotel stay, sightseeing highlights, driver/guide assistance, and overall value..."
                            value={newReview.comment}
                            onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
                            className="mt-1 leading-relaxed rounded-none"
                          />
                        </div>

                        {/* Photo Attachment URL */}
                        <div>
                          <Label htmlFor="rev-photo" className="text-xs font-semibold text-gray-700">Attach Trip Photo URL (Optional)</Label>
                          <Input
                            id="rev-photo"
                            placeholder="https://images.unsplash.com/..."
                            value={newReview.photoUrl}
                            onChange={(e) => setNewReview({ ...newReview, photoUrl: e.target.value })}
                            className="mt-1 text-xs rounded-none"
                          />
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-end gap-3 pt-4 border-t">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowWriteReviewModal(false)}
                            className="px-6 rounded-none cursor-pointer"
                          >
                            Cancel
                          </Button>
                          <Button
                            type="submit"
                            disabled={isSubmittingReview || !newReview.comment.trim() || !newReview.name.trim()}
                            className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-8 shadow-none rounded-none cursor-pointer"
                          >
                            {isSubmittingReview ? 'Posting Review...' : 'Submit Review'}
                          </Button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}

                {/* Traveller Image Gallery */}
                {reviewsData.travellerImages.length > 0 && (
                  <div className="mb-10">
                    <h4 className="font-bold text-gray-900 mb-4 text-sm">Traveller Image Gallery</h4>
                    <div className="grid grid-cols-4 grid-rows-2 gap-2 h-[300px]">
                      <div
                        className="col-span-2 row-span-2 relative rounded-none overflow-hidden group cursor-pointer"
                        onClick={() => setSelectedGalleryImage(reviewsData.travellerImages[0])}
                      >
                        <img src={reviewsData.travellerImages[0]} alt="Traveller 1" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        {reviewsData.travellerImages.length > 1 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedGalleryImage(reviewsData.travellerImages[0]);
                            }}
                            className="absolute bottom-4 left-4 bg-black/55 backdrop-blur-md text-white border border-white/30 px-3 py-1.5 rounded-none text-sm font-medium hover:bg-black/70 transition-colors cursor-pointer"
                          >
                            View all ({reviewsData.travellerImages.length})
                          </button>
                        )}
                      </div>
                      {reviewsData.travellerImages.slice(1, 5).map((img, idx) => (
                        <div
                          key={idx}
                          className="col-span-1 row-span-1 rounded-none overflow-hidden group cursor-pointer"
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
                      <Card key={review.id} className="shadow-none border-gray-200 rounded-none bg-white">
                        <CardContent className="p-5">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-orange-100 text-orange-700 rounded-none flex items-center justify-center font-bold text-sm overflow-hidden">
                                {review.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <h4 className="font-semibold text-gray-900 text-sm">{review.name}</h4>
                                <p className="text-xs text-gray-500">{review.date}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 text-green-600 text-sm font-semibold bg-green-50 px-2.5 py-1 border border-green-150">
                              <Star className="h-3.5 w-3.5 fill-current" /> {review.rating}/5
                            </div>
                          </div>
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 border-y border-gray-100 py-2 my-2">
                            <div className="text-xs text-orange-600 flex items-center gap-1">
                              <span className="text-gray-500">Booked:</span> {review.booked}
                            </div>
                            {review.travelledFrom && (
                              <div className="text-xs text-gray-505 flex items-center gap-1">
                                Travelled From: <MapPin className="h-3 w-3 text-gray-400" /> <span className="font-medium text-gray-700">{review.travelledFrom}</span>
                              </div>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 leading-relaxed">
                            {review.text}
                          </p>
                          {/* Review Images */}
                          {review.images && review.images.length > 0 && (
                            <div className="flex gap-2 overflow-x-auto pt-3 pb-1 hide-scrollbar">
                              {review.images.map((img: string, i: number) => (
                                <div
                                  key={i}
                                  className="w-20 h-20 md:w-24 md:h-24 flex-shrink-0 rounded-none overflow-hidden relative cursor-pointer border border-gray-200"
                                  onClick={() => setSelectedGalleryImage(img)}
                                >
                                  <img src={img} alt={`Review image ${i + 1}`} className="w-full h-full object-cover hover:scale-105 transition-transform" />
                                </div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <Card className="border-dashed border-2 border-gray-200 bg-gray-50/50 p-8 text-center rounded-none shadow-none">
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <div className="w-12 h-12 rounded-none bg-orange-100 text-orange-500 flex items-center justify-center border border-orange-200">
                          <MessageCircle className="h-6 w-6" />
                        </div>
                        <h4 className="font-bold text-gray-800 text-base">No reviews yet for this package</h4>
                        <p className="text-xs text-gray-500 max-w-md">
                          Have you travelled on this trip? Be the first traveller to write an authentic review!
                        </p>
                        <Button
                          onClick={() => setShowWriteReviewModal(true)}
                          className="bg-orange-500 hover:bg-orange-600 text-white font-medium mt-2 flex items-center gap-2 rounded-none cursor-pointer"
                        >
                          <Plus className="h-4 w-4" />
                          Write a Review
                        </Button>
                      </div>
                    </Card>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* FAQ Section (Permanently Displayed Below Reviews Card) */}
            <Card className="rounded-none border-gray-200 shadow-sm mt-6">
              <CardContent className="p-6 bg-white">
                <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2 border-b border-gray-100 pb-4">
                  <MessageCircle className="h-5 w-5 text-orange-600" /> Frequently Asked Questions
                </h3>
                <div className="space-y-3">
                  {defaultFAQs.map((faq, index) => (
                    <div key={index} className="border border-gray-200 rounded-none bg-white transition-colors hover:border-gray-300">
                      <button
                        className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 rounded-none cursor-pointer"
                        onClick={() => toggleFAQ(index)}
                      >
                        <span className="font-semibold text-gray-900 text-sm">{faq.question}</span>
                        {expandedFAQs.includes(index) ? (
                          <ChevronUp className="h-5 w-5 text-gray-500 flex-shrink-0" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-gray-500 flex-shrink-0" />
                        )}
                      </button>
                      {expandedFAQs.includes(index) && (
                        <div className="px-4 pb-4 pt-1 border-t border-gray-100 bg-gray-50/30">
                          <p className="text-gray-600 leading-relaxed text-sm">{faq.answer}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

          </div>

          {/* Right Column - Sidebar */}
          <div className="lg:col-span-1 flex flex-col gap-4">
            <div className="sticky top-4 space-y-4">
              {/* Agency Info */}
              <Card className="rounded-none border-gray-200 shadow-sm">
                <CardContent className="p-5">
                  <h3 className="font-bold text-gray-900 text-base mb-3 border-b border-gray-100 pb-2">Offered By</h3>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-orange-100 rounded-none flex items-center justify-center border border-orange-200 shrink-0">
                      <Building2 className="h-6 w-6 text-orange-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-gray-900">{listing.agencyName || 'Travel Agency'}</p>
                      {listing.agencyData?.verified && (
                        <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 flex items-center gap-1 rounded-none mt-1">
                          <ShieldCheck className="h-3 w-3 text-emerald-600" />
                          Verified
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    className="w-full bg-orange-600 hover:bg-orange-750 text-white shadow-none rounded-none cursor-pointer h-10 font-semibold"
                    onClick={() => {
                      console.log('Chat with Agency button clicked in PackageDetailView, listing:', listing);
                      onChat(listing);
                    }}
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Chat with Agency
                  </Button>
                </CardContent>
              </Card>

            

            </div>
          </div>
        </div>
      </div>

      {/* Compare Toast Notification */}
      {showCompareToast && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 fade-in duration-300">
          <div className={`flex items-center gap-2 px-4 py-3 rounded-sm shadow-lg ${compareToastMessage.includes('already') || compareToastMessage.includes('only compare')
              ? 'bg-amber-500 text-white'
              : 'bg-green-500 text-white'
            }`}>
            {compareToastMessage.includes('already') || compareToastMessage.includes('only compare') ? (
              <AlertCircle className="h-5 w-5" />
            ) : (
              <CheckCircle2 className="h-5 w-5" />
            )}
            <span className="font-medium">{compareToastMessage}</span>
          </div>
        </div>
      )}

      {/* Full Screen Photo Gallery Modal - Thrillophilia Style */}
      {showAllPhotos && (
        <div className="fixed inset-0 bg-white z-[200] flex flex-col animate-in fade-in zoom-in-95 duration-200">
          <div className="sticky top-0 bg-white border-b z-10 px-4 md:px-8 py-3 flex items-center shadow-sm">
            <button
              className="flex items-center gap-2 text-gray-900 font-bold hover:bg-gray-100 px-3 md:px-4 py-2 rounded-sm transition-colors"
              onClick={() => setShowAllPhotos(false)}
            >
              <ArrowLeft className="h-5 w-5" /> Back
            </button>
            <div className="flex-1 flex justify-center overflow-x-auto hide-scrollbar">
              <div className="flex items-center gap-6 md:gap-10 text-sm font-medium text-gray-500 whitespace-nowrap">
                <button className="text-orange-600 border-b-2 border-orange-600 pb-1 px-2">
                  All Images ({allImages.length})
                </button>
                <button className="hover:text-gray-900 pb-1 px-2 transition-colors">
                  Destinations
                </button>
                <button className="hover:text-gray-900 pb-1 px-2 transition-colors">
                  Activities
                </button>
                <button className="hover:text-gray-900 pb-1 px-2 transition-colors">
                  Stays
                </button>
              </div>
            </div>
            <div className="w-[100px] hidden md:block"></div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 md:p-10 bg-white">
            <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              {allImages.map((image, index) => (
                <div key={index} className="aspect-[4/3] md:aspect-video rounded-sm overflow-hidden bg-gray-100 group">
                  <img
                    src={optimizeImageUrl(image, { width: 1200, quality: 85, format: 'auto', cacheBust: false })}
                    alt={`Gallery Image ${index + 1}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                    loading={index < 4 ? "eager" : "lazy"}
                    decoding="async"
                  />
                </div>
              ))}
            </div>

            {allImages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                <Camera className="h-16 w-16 mb-4 opacity-50" />
                <p className="text-lg">No photos available for this package.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Traveller Photo Lightbox Modal */}
      {selectedGalleryImage && (
        <div className="fixed inset-0 bg-black/90 z-[300] flex items-center justify-center p-4 animate-in fade-in">
          <button
            onClick={() => setSelectedGalleryImage(null)}
            className="absolute top-6 right-6 text-white hover:text-gray-300 bg-white/10 p-2 rounded-sm transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
          <div className="max-w-4xl max-h-[85vh] overflow-hidden rounded-sm">
            <img src={selectedGalleryImage} alt="Traveller photo" className="w-full h-full object-contain" />
          </div>
        </div>
      )}
    </div>
  );
}
