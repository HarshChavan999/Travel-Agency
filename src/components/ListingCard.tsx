import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from './ui/badge';
import { useComparison } from '@/contexts/ComparisonContext';
import { Star, MapPin, Calendar, DollarSign, Users, Eye, Edit, Trash2, Heart, Scale, CheckCircle2, Camera, Bus, Bed, Utensils, ChevronLeft, ChevronRight, ShieldCheck } from 'lucide-react';
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

  return (
    <div className="bg-white/95 backdrop-blur-sm rounded-[18px] shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:shadow-[0_16px_36px_rgba(0,0,0,0.1)] transition-all duration-300 hover:-translate-y-1 relative overflow-hidden group flex flex-col w-full max-w-[420px] border border-slate-100/90">
      {/* Compare Toast */}
      {showCompareToast && (
        <div className="absolute top-4 right-4 z-20 animate-in fade-in duration-200">
          <div className="bg-gray-900 text-white text-xs px-3 py-1.5 rounded-lg shadow-lg">
            {compareToastMessage}
          </div>
        </div>
      )}

      {/* Status Badge */}
      {!listing.approved && (
        <div className="absolute top-3 right-3 z-20">
          <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200 shadow-sm px-2 py-0.5">
            Pending
          </Badge>
        </div>
      )}

      {/* Verification badge */}
      {listing.agencyData?.verified && listing.approved && (
        <div className="absolute top-3 right-3 z-20">
          <Badge variant="outline" className="bg-white/90 backdrop-blur-md text-emerald-700 border-white/40 text-[10px] px-2 py-1 shadow-sm flex items-center gap-1">
            <ShieldCheck className="h-3 w-3 text-emerald-600" />
            Verified
          </Badge>
        </div>
      )}

      {/* Image Section (Top, full width) */}
      <div className="relative w-full h-[200px] sm:h-[220px] bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
        {/* Pills overlay */}
        <div className="absolute top-3 left-3 z-20 flex gap-2">
          {/* Domestic/International badge */}
          <span className="bg-[#DCEBF4]/90 backdrop-blur-md text-[#1a5f7a] px-3 py-1 rounded-full text-[11px] font-semibold shadow-sm border border-white/20">
            {packageType}
          </span>
          {/* Tour Categories badge */}
          {listing.tourCategories && listing.tourCategories.length > 0 && (
            <span className="bg-[#F8E7C0]/90 backdrop-blur-md text-[#8C6D1F] px-3 py-1 rounded-full text-[11px] font-semibold shadow-sm border border-white/20">
              {listing.tourCategories[0]} Tour
            </span>
          )}
        </div>

        {/* Loading Skeleton */}
        {!imageLoaded && (
          <div className="absolute inset-0 bg-gray-200 animate-pulse">
            <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300"></div>
          </div>
        )}

        {/* Error State */}
        {imageError && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
            <Camera className="h-8 w-8 text-gray-400" />
          </div>
        )}

        {/* Image content */}
        {allImages.length > 1 ? (
          <div className="relative w-full h-full group/image overflow-hidden">
            <div 
              className="flex w-full h-full transition-transform duration-300 ease-out"
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
                    className="w-full h-full object-cover transition-transform duration-700 ease-out scale-100 group-hover/image:scale-105"
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
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 rounded-full p-1.5 shadow-sm hover:shadow transition-all duration-200 opacity-100 sm:opacity-0 sm:group-hover/image:opacity-100 hover:scale-110 active:scale-95 focus:outline-none z-20 cursor-pointer"
              aria-label="Previous image"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                setCurrentImageIndex((prev) => (prev === allImages.length - 1 ? 0 : prev + 1));
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 rounded-full p-1.5 shadow-sm hover:shadow transition-all duration-200 opacity-100 sm:opacity-0 sm:group-hover/image:opacity-100 hover:scale-110 active:scale-95 focus:outline-none z-20 cursor-pointer"
              aria-label="Next image"
            >
              <ChevronRight className="h-4 w-4" />
            </button>

            {/* Dot Indicators */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 bg-black/30 backdrop-blur-[2px] px-2 py-1 rounded-full opacity-100 sm:opacity-0 sm:group-hover/image:opacity-100 transition-all duration-200 z-20">
              {allImages.map((_, idx) => (
                <span
                  key={idx}
                  className={`h-1.5 rounded-full transition-all duration-200 ${
                    idx === currentImageIndex ? 'w-4 bg-white' : 'w-1.5 bg-white/60'
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
                style={{ filter: 'blur(5px)' }}
              />
            )}
            <img
              src={optimizedImageUrl}
              alt={locationName ? `${locationName} - ${cardTitle}` : cardTitle}
              className={`w-full h-full object-cover transition-transform duration-700 ease-out ${
                imageLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
              } group-hover:scale-105`}
              onLoad={handleImageLoad}
              onError={handleImageError}
              loading="lazy"
              decoding="async"
            />
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-400 text-sm">
            No image available
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="p-4 flex flex-col gap-4">
        
        {/* Title and Rating */}
        <div>
          <h3 className="font-bold text-[18px] text-gray-900 leading-[1.3] line-clamp-2" title={cardTitle}>
            {cardTitle}
          </h3>
          {listing.title && location && (
            <div className="flex items-center gap-1 text-gray-500 text-[12px] mt-1.5 font-medium">
              <MapPin className="h-3.5 w-3.5 text-orange-500 shrink-0" />
              <span className="truncate" title={location}>{location}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 mt-1.5">
            <div className="flex items-center">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star 
                  key={s} 
                  className={`h-[14px] w-[14px] ${
                    s <= (listing.rating || 5) ? 'fill-[#FFC107] text-[#FFC107]' : 'text-gray-300'
                  }`} 
                />
              ))}
            </div>
            <span className="text-gray-500 font-medium text-[12px]">Google Rating</span>
          </div>
        </div>

        {/* Icons Row */}
        <div className="flex justify-between items-center px-1">
          <div className="flex flex-col items-center gap-1.5">
            <Camera className="h-5 w-5 text-gray-600 stroke-[1.5]" />
            <span className="text-[12px] font-medium text-gray-700">Sightseeing</span>
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <Bus className="h-5 w-5 text-gray-600 stroke-[1.5]" />
            <span className="text-[12px] font-medium text-gray-700">Transport</span>
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <Bed className="h-5 w-5 text-gray-600 stroke-[1.5]" />
            <span className="text-[12px] font-medium text-gray-700">Hotel Stay</span>
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <Utensils className="h-5 w-5 text-gray-600 stroke-[1.5]" />
            <span className="text-[12px] font-medium text-gray-700">Meals</span>
          </div>
        </div>

        {/* Divider */}
        <hr className="border-gray-800 w-full" />

        {/* 3 Columns Details */}
        <div className="grid grid-cols-3 gap-2">
          <div className="flex flex-col text-left">
            <span className="text-[12px] text-gray-500 mb-0.5">Duration</span>
            <span className="text-[14px] text-gray-900 font-medium">
              {duration}D | {nights}N
            </span>
          </div>
          <div className="flex flex-col text-left border-l border-gray-800 pl-3">
            <span className="text-[12px] text-gray-500 mb-0.5">Pick-up</span>
            <span className="text-[14px] text-gray-900 font-medium truncate" title={pickupLocation}>
              {pickupLocation}
            </span>
          </div>
          <div className="flex flex-col text-left border-l border-gray-800 pl-3">
            <span className="text-[12px] text-gray-500 mb-0.5">Drop</span>
            <span className="text-[14px] text-gray-900 font-medium truncate" title={dropLocation}>
              {dropLocation}
            </span>
          </div>
        </div>

        {/* Divider */}
        <hr className="border-gray-800 w-full" />

        {/* Bottom Actions Row */}
        <div className="flex items-end justify-between pt-1">
          {/* Price Column */}
          <div className="flex flex-col min-w-[90px] self-stretch justify-end pb-1">
            <span className="text-[12px] text-gray-500">Starting from</span>
            {price && price !== 'N/A' && price !== '' ? (
              <div className="flex flex-col mt-0.5">
                <span className="text-[22px] font-bold text-gray-900 leading-none tracking-tight mb-1">
                  {currencySymbol}{price}
                </span>
                <span className="text-[12px] text-gray-500 leading-none">per person</span>
              </div>
            ) : (
              <span className="text-[14px] font-bold text-gray-900 mt-1">Contact Agent</span>
            )}
          </div>

          {/* Buttons Column */}
          {showActions && (
            <div className="flex gap-2 w-full max-w-[280px]">
              {variant === 'user' ? (
                <>
                  <Link href={`/package/${listing.id}`} className="block flex-1">
                    <Button className="w-full h-[48px] bg-orange-400 hover:bg-orange-600 text-white font-medium text-[14px] rounded-xl shadow-sm transition-colors">
                      View Details
                    </Button>
                  </Link>
                  
                  {/* Chat Button */}
                  <Button 
                    className="w-[124px] h-[48px] bg-[#D84315] hover:bg-[#BF360C] text-white font-medium text-[12px] rounded-xl shadow-sm transition-colors flex items-center justify-center gap-1.5 px-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      onChat?.(listing);
                    }}
                  >
                    <div className="h-5 w-5 shrink-0">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
                        <path d="M8 12h.01" />
                        <path d="M12 12h.01" />
                        <path d="M16 12h.01" />
                      </svg>
                    </div>
                    <span className="text-left leading-[1.15]">Chat with<br/>Agency</span>
                  </Button>
                </>
              ) : (
                <>
                  <Button className="flex-1 h-[48px] bg-orange-500 hover:bg-orange-600 text-white font-medium text-[14px] rounded-xl shadow-sm transition-colors" onClick={() => onView?.(listing)}>
                    View Details
                  </Button>
                  <div className="flex flex-col gap-1.5 w-[88px]">
                    <Button
                      variant="outline"
                      className="flex-1 h-[21px] border-[#1961CA] text-[#1961CA] hover:bg-[#F0F6FF] font-medium text-[11px] rounded-md transition-colors"
                      onClick={() => onEdit?.(listing)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      className="flex-1 h-[21px] bg-[#FEF2F2] text-[#DC2626] hover:bg-[#FEE2E2] border border-[#FEE2E2] font-medium text-[11px] rounded-md shadow-none transition-colors"
                      onClick={() => onDelete?.(listing.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}