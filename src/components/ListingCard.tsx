import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from './ui/badge';
import { useComparison } from '@/contexts/ComparisonContext';
import { Star, MapPin, Calendar, DollarSign, Users, Eye, Edit, Trash2, Heart, Scale, CheckCircle2, Camera, Bus, Bed, Utensils, ChevronLeft, ChevronRight, ShieldCheck, MessageSquare } from 'lucide-react';
import { optimizeImageUrl, generateBlurPlaceholder, preloadImage } from '@/lib/imageOptimization';
import { injectImageStyles } from '@/lib/imageStyles';
import Link from 'next/link';
interface ListingCardProps {
  listing: any;
  onView?: (listing: any) => void;
  onEdit?: (listing: any) => void;
  onDelete?: (listingId: string) => void;
  onBook?: (listing: any) => void;
  onChat?: (listing: any) => void;
  onWishlist?: (listingId: string) => void;
  isWishlisted?: boolean;
  showActions?: boolean;
  variant?: 'user' | 'agency';
  showCompare?: boolean;
}

export default function ListingCard({ 
  listing, 
  onView, 
  onEdit, 
  onDelete, 
  onBook, 
  onChat, 
  onWishlist,
  isWishlisted,
  showActions = true,
  variant = 'user',
  showCompare = true
}: ListingCardProps) {
  const { addToComparison, isInComparison, canAddMore } = useComparison();
  const [showCompareToast, setShowCompareToast] = useState(false);
  const [compareToastMessage, setCompareToastMessage] = useState('');

  // Get main image from placesCovered or photos
  const getMainImage = () => {
    if (listing.placesCovered && listing.placesCovered.length > 0 && 
        listing.placesCovered[0].imageUrls && listing.placesCovered[0].imageUrls.length > 0) {
      return listing.placesCovered[0].imageUrls[0];
    }
    if (listing.photos && listing.photos.length > 0) {
      return listing.photos[0];
    }
    if (listing.itinerary && listing.itinerary.length > 0) {
      for (const day of listing.itinerary) {
        if (day.imageUrls && day.imageUrls.length > 0) return day.imageUrls[0];
        if (day.imageUrl) return day.imageUrl;
      }
    }
    return null;
  };

  // Get all images from placesCovered and photos
  const getAllImages = () => {
    const images: string[] = [];
    if (listing.placesCovered && listing.placesCovered.length > 0) {
      listing.placesCovered.forEach((place: any) => {
        if (place.imageUrls && place.imageUrls.length > 0) {
          images.push(...place.imageUrls);
        }
      });
    }
    if (listing.photos && listing.photos.length > 0) {
      listing.photos.forEach((photo: string) => {
        if (photo && !images.includes(photo)) {
          images.push(photo);
        }
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

  const mainImage = getMainImage();
  const allImages = getAllImages();
  const duration = listing.itinerary?.length || 0;
  const nights = duration > 0 ? duration - 1 : 0;
  let rawPrice = listing.cost || listing.price || 'N/A';
  if (rawPrice !== 'N/A') {
    const numPrice = Number(rawPrice);
    if (!isNaN(numPrice)) {
      rawPrice = Math.round(numPrice).toString();
    }
  }
  const price = rawPrice;
  const packageType = listing.packageType === 'international' ? 'International' : 'Domestic';
  const currencySymbol = listing.packageType === 'international' ? '$' : '₹';
  const location = listing.packageType === 'international' 
    ? (listing.countryName || 'Country not specified')
    : (listing.stateName || 'State not specified');

  const packageCode = listing.id ? listing.id.slice(-4).toUpperCase() : '1045';
  const pickupLocation = listing.pickUpLocation || listing.placesCovered?.[0]?.name?.trim() || listing.stateName || 'Delhi';
  const dropLocation = listing.dropLocation || listing.placesCovered?.[listing.placesCovered.length - 1]?.name?.trim() || listing.stateName || 'Delhi';
  const cardTitle = listing.title || (listing.packageType === 'international' ? listing.countryName : listing.stateName) || `${packageType} Package`;
  const locationName = listing.packageType === 'international' ? listing.countryName : listing.stateName;
  const placesText = listing.placesCovered && listing.placesCovered.length > 0 
    ? listing.placesCovered.map((p: any) => p.name?.trim()).filter(Boolean).join(' | ') 
    : location;

  // Generate optimized image URL with caching parameters
  const optimizedImageUrl = mainImage ? optimizeImageUrl(mainImage, {
    quality: 85,
    format: 'auto',
    cacheBust: false
  }) : null;

  // Image loading states
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  const handleImageError = () => {
    setImageError(true);
    setImageLoaded(true); // Stop showing loading state
  };

  // Preload all listing images on mount for instant navigation
  useEffect(() => {
    if (allImages.length > 0) {
      allImages.forEach((imgUrl) => {
        const optimized = optimizeImageUrl(imgUrl, {
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

  // Generate a blur placeholder SVG
  const blurPlaceholder = generateBlurPlaceholder(400, 300, '#f3f4f6');

  const handleCompareToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isInComparison(listing.id)) {
      setCompareToastMessage('Already in comparison!');
      setShowCompareToast(true);
      setTimeout(() => setShowCompareToast(false), 2000);
    } else if (!canAddMore) {
      setCompareToastMessage('Max 3 packages allowed');
      setShowCompareToast(true);
      setTimeout(() => setShowCompareToast(false), 2000);
    } else {
      addToComparison({
        id: listing.id,
        title: cardTitle,
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
      window.dispatchEvent(new CustomEvent('floating-effect', {
        detail: { x: e.clientX, y: e.clientY, type: 'compare' }
      }));
      setCompareToastMessage('Added to compare!');
      setShowCompareToast(true);
      setTimeout(() => setShowCompareToast(false), 2000);
    }
  };

  const cardContent = (
    <div className="pictorial-card bg-slate-900 rounded-md shadow-[0_4px_25px_rgba(0,0,0,0.12)] hover:shadow-[0_20px_45px_rgba(0,0,0,0.35)] transition-all duration-300 relative overflow-hidden group flex flex-col w-full max-w-[420px] h-[400px] sm:h-[430px] border border-white/10 select-none cursor-pointer">
      {/* Compare Toast */}
      {showCompareToast && (
        <div className="absolute top-4 right-4 z-40 animate-in fade-in duration-200">
          <div className="bg-gray-900/95 backdrop-blur-md text-white text-xs px-3.5 py-2 rounded-sm shadow-2xl border border-white/20 font-medium">
            {compareToastMessage}
          </div>
        </div>
      )}

      {/* Top Floating Action Badges */}
      <div className="absolute top-3.5 left-3.5 right-3.5 z-30 flex items-center justify-between pointer-events-none">
        <div className="flex gap-2 pointer-events-auto">
          {/* Package Type Pill */}
          <span className="bg-black/50 backdrop-blur-md text-white px-3 py-1 rounded-full text-[11px] font-semibold tracking-wide border border-white/20 shadow-sm flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            {packageType}
          </span>
          {/* Category Pill */}
          {listing.tourCategories && listing.tourCategories.length > 0 && (
            <span className="bg-amber-500/80 backdrop-blur-md text-white px-3 py-1 rounded-full text-[11px] font-semibold tracking-wide border border-white/20 shadow-sm">
              {listing.tourCategories[0]}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Verification badge */}
          {listing.agencyData?.verified && listing.approved && (
            <Badge variant="outline" className="bg-emerald-500/90 backdrop-blur-md text-white border-none text-[10px] px-2.5 py-1 shadow-sm flex items-center gap-1 font-semibold rounded-full">
              <ShieldCheck className="h-3 w-3 text-white" />
              Verified
            </Badge>
          )}

          {/* Compare Button */}
          {showCompare && variant === 'user' && (
            <button
              onClick={handleCompareToggle}
              className={`p-2 rounded-full backdrop-blur-md transition-all duration-200 shadow-md cursor-pointer ${
                isInComparison(listing.id)
                  ? 'bg-blue-600 text-white border border-blue-400'
                  : 'bg-black/50 hover:bg-black/80 text-white/90 border border-white/20'
              }`}
              title={isInComparison(listing.id) ? "In comparison list" : "Add to comparison"}
            >
              <Scale className="h-4 w-4" />
            </button>
          )}

          {/* Wishlist Button */}
          {variant === 'user' && onWishlist && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onWishlist(listing.id);
              }}
              className={`p-2 rounded-full backdrop-blur-md transition-all duration-200 shadow-md cursor-pointer ${
                isWishlisted
                  ? 'bg-rose-500 text-white border border-rose-400'
                  : 'bg-black/50 hover:bg-black/80 text-white/90 border border-white/20'
              }`}
              title={isWishlisted ? "Remove from Wishlist" : "Save to Wishlist"}
            >
              <Heart className={`h-4 w-4 ${isWishlisted ? 'fill-white' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* Full Bleed Visual Image Canvas */}
      <div className="absolute inset-0 w-full h-full bg-slate-950 overflow-hidden">
        {/* Loading Skeleton */}
        {!imageLoaded && (
          <div className="absolute inset-0 bg-slate-800 animate-pulse">
            <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-900"></div>
          </div>
        )}

        {/* Image Error State */}
        {imageError && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900 text-slate-500">
            <Camera className="h-10 w-10 stroke-[1.5]" />
          </div>
        )}

        {/* Dynamic Image Carousel or Single Image */}
        {allImages.length > 1 ? (
          <div className="relative w-full h-full group/image overflow-hidden">
            <div 
              className="flex w-full h-full transition-transform duration-500 ease-out"
              style={{ transform: `translateX(-${currentImageIndex * 100}%)` }}
            >
              {allImages.map((imgUrl, idx) => (
                <div key={idx} className="w-full h-full shrink-0 relative overflow-hidden">
                  <img
                    src={optimizeImageUrl(imgUrl, {
                      quality: 85,
                      format: 'auto',
                      cacheBust: false
                    })}
                    alt={locationName ? `${locationName} - ${cardTitle} - Photo ${idx + 1}` : `${cardTitle} photo ${idx + 1}`}
                    className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                    loading={idx === 0 ? "eager" : "lazy"}
                    decoding="async"
                    onLoad={idx === currentImageIndex ? handleImageLoad : undefined}
                    onError={idx === currentImageIndex ? handleImageError : undefined}
                  />
                </div>
              ))}
            </div>

            {/* Navigation Arrows */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setCurrentImageIndex((prev) => (prev === 0 ? allImages.length - 1 : prev - 1));
              }}
              className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/80 text-white rounded-full p-2 backdrop-blur-sm shadow-lg transition-all opacity-0 group-hover/image:opacity-100 cursor-pointer z-20"
              aria-label="Previous image"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setCurrentImageIndex((prev) => (prev === allImages.length - 1 ? 0 : prev + 1));
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/80 text-white rounded-full p-2 backdrop-blur-sm shadow-lg transition-all opacity-0 group-hover/image:opacity-100 cursor-pointer z-20"
              aria-label="Next image"
            >
              <ChevronRight className="h-4 w-4" />
            </button>

            {/* Pagination Dots */}
            <div className="absolute bottom-[130px] sm:bottom-[140px] left-1/2 -translate-x-1/2 flex gap-1.5 bg-black/50 backdrop-blur-md px-2.5 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20">
              {allImages.slice(0, 5).map((_, idx) => (
                <span
                  key={idx}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    idx === currentImageIndex ? 'w-4 bg-white' : 'w-1.5 bg-white/50'
                  }`}
                />
              ))}
            </div>
          </div>
        ) : optimizedImageUrl && !imageError ? (
          <>
            {!imageLoaded && (
              <img
                src={blurPlaceholder}
                alt=""
                className="absolute inset-0 w-full h-full object-cover blur-sm"
              />
            )}
            <img
              src={optimizedImageUrl}
              alt={locationName ? `${locationName} - ${cardTitle}` : cardTitle}
              className={`w-full h-full object-cover transition-transform duration-700 ease-out ${
                imageLoaded ? 'opacity-100' : 'opacity-0'
              } group-hover:scale-105`}
              onLoad={handleImageLoad}
              onError={handleImageError}
              loading="lazy"
            />
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-slate-900 text-slate-500 text-sm">
            No Image Available
          </div>
        )}

        {/* Ambient Dark Gradient Shade */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/40 to-transparent pointer-events-none"></div>
      </div>

      {/* CLEAN PERMANENT CARD FOOTER (Direct details & price always visible) */}
      <div className="absolute bottom-0 inset-x-0 p-5 z-20 flex flex-col gap-2 text-white">
        {/* Location & Duration Tag */}
        <div className="flex items-center justify-between text-white/80 text-xs font-medium tracking-wide">
          <span className="flex items-center gap-1 truncate max-w-[220px]">
            <MapPin className="h-3.5 w-3.5 text-orange-400 shrink-0" />
            <span className="truncate">{location}</span>
          </span>
          <span className="bg-white/15 backdrop-blur-md px-2.5 py-0.5 rounded-sm text-[11px] font-semibold text-white">
            {duration > 0 ? `${duration}D / ${nights}N` : 'Custom'}
          </span>
        </div>

        {/* Title */}
        <h3 className="font-heading font-extrabold text-xl sm:text-2xl text-white tracking-tight leading-snug line-clamp-1 drop-shadow-sm group-hover:text-orange-400 transition-colors">
          {cardTitle}
        </h3>

        {/* Places covered snippet */}
        {placesText && (
          <p className="text-xs text-slate-300/90 line-clamp-1 font-normal">
            {placesText}
          </p>
        )}

        {/* Bottom Info: Price, Rating & CTA */}
        <div className="flex items-end justify-between pt-2 border-t border-white/15 mt-1">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-orange-400 tracking-wider">Starting at</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-white tracking-tight font-heading">
                {price && price !== 'N/A' ? `${currencySymbol}${price}` : 'On Request'}
              </span>
              {price && price !== 'N/A' && <span className="text-xs text-white/70 font-normal">/ person</span>}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Star Rating Pill */}
            <div className="flex items-center gap-1 bg-black/50 backdrop-blur-md px-2.5 py-1 rounded-sm border border-white/15 text-xs text-amber-300 font-semibold">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              <span>{listing.rating || '4.9'}</span>
            </div>

            {/* Chat Direct CTA Button */}
            {variant === 'user' && onChat && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onChat(listing);
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-sm shadow-md transition-all flex items-center gap-1 cursor-pointer"
                title="Chat Direct with Agent"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Chat</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  if (variant === 'user') {
    return (
      <Link href={`/package/${listing.id}`} className="block w-full max-w-[420px]">
        {cardContent}
      </Link>
    );
  }

  return (
    <div onClick={() => onView?.(listing)} className="w-full max-w-[420px]">
      {cardContent}
    </div>
  );
}