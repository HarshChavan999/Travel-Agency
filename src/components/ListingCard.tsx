import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from './ui/badge';
import { useComparison } from '@/contexts/ComparisonContext';
import { Star, MapPin, Calendar, DollarSign, Users, Eye, Edit, Trash2, Heart, Scale, CheckCircle2, Camera, Bus, Bed, Utensils, ChevronLeft, ChevronRight, ShieldCheck } from 'lucide-react';
import { optimizeImageUrl, generateBlurPlaceholder, preloadImage } from '@/lib/imageOptimization';
import { injectImageStyles } from '@/lib/imageStyles';

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
    return images;
  };

  const mainImage = getMainImage();
  const allImages = getAllImages();
  const duration = listing.itinerary?.length || 0;
  const nights = duration > 0 ? duration - 1 : 0;
  const price = listing.cost || listing.price || 'N/A';
  const packageType = listing.packageType === 'international' ? 'International' : 'Domestic';
  const currencySymbol = listing.packageType === 'international' ? '$' : '₹';
  const location = listing.packageType === 'international' 
    ? (listing.countryName || 'Country not specified')
    : (listing.stateName || 'State not specified');

  const packageCode = listing.id ? listing.id.slice(-4).toUpperCase() : '1045';
  const pickupLocation = listing.placesCovered?.[0]?.name?.trim() || listing.stateName || 'Delhi';
  const dropLocation = listing.placesCovered?.[listing.placesCovered.length - 1]?.name?.trim() || listing.stateName || 'Delhi';
  const cardTitle = (listing.packageType === 'international' ? listing.countryName : listing.stateName) || listing.title || `${packageType} Package`;
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
    <div className="bg-white border border-gray-100 rounded-3xl p-4 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group flex flex-col gap-4">
      {/* Compare Toast */}
      {showCompareToast && (
        <div className="absolute top-4 right-4 z-10 animate-in fade-in duration-200">
          <div className="bg-gray-900 text-white text-xs px-3 py-1.5 rounded-lg shadow-lg">
            {compareToastMessage}
          </div>
        </div>
      )}

      {/* Status Badge */}
      {!listing.approved && (
        <div className="absolute top-2 right-2 z-10">
          <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">
            Pending
          </Badge>
        </div>
      )}

      {/* Top Portion: Flex Row of Image + Right Info */}
      <div className="flex gap-4 items-start">
        {/* Left Column: Image Container */}
        <div className="relative w-28 h-20 sm:w-32 sm:h-24 md:w-36 md:h-28 flex-shrink-0 bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-2xl overflow-hidden">
          {/* Loading Skeleton */}
          {!imageLoaded && (
            <div className="absolute inset-0 bg-gray-200 animate-pulse">
              <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300"></div>
            </div>
          )}

          {/* Error State */}
          {imageError && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
              <Camera className="h-6 w-6 text-gray-400" />
            </div>
          )}

          {/* Main Image or Multi-Image Interactive Carousel */}
          {allImages.length > 1 ? (
            <div className="relative w-full h-full group/image overflow-hidden">
              <img
                src={optimizeImageUrl(allImages[currentImageIndex], {
                  quality: 85,
                  format: 'auto',
                  cacheBust: false
                })}
                alt={`${cardTitle} photo ${currentImageIndex + 1}`}
                className="w-full h-full object-cover transition-transform duration-700 ease-out scale-100 group-hover/image:scale-110"
                loading="lazy"
                decoding="async"
              />
              
              {/* Navigation Arrows */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentImageIndex((prev) => (prev === 0 ? allImages.length - 1 : prev - 1));
                }}
                className="absolute left-1 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 rounded-full p-1 shadow-sm hover:shadow transition-all duration-200 opacity-100 sm:opacity-0 sm:group-hover/image:opacity-100 hover:scale-110 active:scale-95 focus:outline-none z-10 cursor-pointer"
                aria-label="Previous image"
              >
                <ChevronLeft className="h-3 w-3" />
              </button>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentImageIndex((prev) => (prev === allImages.length - 1 ? 0 : prev + 1));
                }}
                className="absolute right-1 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 rounded-full p-1 shadow-sm hover:shadow transition-all duration-200 opacity-100 sm:opacity-0 sm:group-hover/image:opacity-100 hover:scale-110 active:scale-95 focus:outline-none z-10 cursor-pointer"
                aria-label="Next image"
              >
                <ChevronRight className="h-3 w-3" />
              </button>

              {/* Dot Indicators */}
              <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex gap-1 bg-black/30 backdrop-blur-[2px] px-1.5 py-0.5 rounded-full opacity-100 sm:opacity-0 sm:group-hover/image:opacity-100 transition-all duration-200 z-10">
                {allImages.map((_, idx) => (
                  <span
                    key={idx}
                    className={`h-1 rounded-full transition-all duration-200 ${
                      idx === currentImageIndex ? 'w-2.5 bg-white' : 'w-1 bg-white/50'
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
                alt={cardTitle}
                className={`w-full h-full object-cover transition-all duration-700 ease-out ${
                  imageLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-110'
                } group-hover:scale-110`}
                onLoad={handleImageLoad}
                onError={handleImageError}
                loading="lazy"
                decoding="async"
              />
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-400 text-xs text-center p-2">
              No image
            </div>
          )}
          
          {/* Agency Badge over image if needed, or verified check */}
          {listing.agencyData?.verified && (
            <div className="absolute bottom-1.5 left-1.5 z-10">
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[9px] px-1.5 py-0.5 shadow-sm flex items-center gap-1">
                <ShieldCheck className="h-2.5 w-2.5 text-emerald-600" />
                Verified
              </Badge>
            </div>
          )}
        </div>

        {/* Right Column: Text & Badges Info */}
        <div className="flex-1 min-w-0 flex flex-col gap-1.5">
          {/* Pills row */}
          <div className="flex flex-wrap gap-1.5 items-center">
            <Badge className="bg-[#BEE5F5] hover:bg-[#BEE5F5] text-[#084298] border-none font-semibold text-[10px] md:text-xs px-2 py-0.5 rounded-full capitalize">
              {packageType}
            </Badge>

            {listing.tourCategories && listing.tourCategories.length > 0 ? (
              listing.tourCategories.slice(0, 1).map((cat: string, idx: number) => (
                <Badge 
                  key={idx} 
                  className={`${
                    cat.toLowerCase().includes('luxury') 
                      ? 'bg-[#E2E3E5] text-[#4F4F4F]' 
                      : 'bg-[#FFE0B2] text-[#E65100]'
                  } hover:opacity-90 border-none font-semibold text-[10px] md:text-xs px-2 py-0.5 rounded-full`}
                >
                  {cat} Tour
                </Badge>
              ))
            ) : (
              <>
                <Badge className="bg-[#FFE0B2] hover:bg-[#FFE0B2] text-[#E65100] border-none font-semibold text-[10px] md:text-xs px-2 py-0.5 rounded-full">
                  Family Tour
                </Badge>
                <Badge className="bg-[#E2E3E5] hover:bg-[#E2E3E5] text-[#4F4F4F] border-none font-semibold text-[10px] md:text-xs px-2 py-0.5 rounded-full">
                  Luxury
                </Badge>
              </>
            )}

            <Badge className="bg-[#CFD8DC] hover:bg-[#CFD8DC] text-[#37474F] border-none font-semibold text-[10px] md:text-xs px-2 py-0.5 rounded-full">
              code : {packageCode}
            </Badge>
          </div>

          {/* Title */}
          <h3 className="font-bold text-sm sm:text-base md:text-lg text-gray-900 leading-snug line-clamp-2" title={cardTitle}>
            {cardTitle}
          </h3>

          {/* Location details */}
          {placesText.length > 25 ? (
            <div className="relative w-full overflow-hidden whitespace-nowrap text-red-500 font-semibold text-[11px] sm:text-xs py-0.5">
              <div className="animate-marquee-text inline-block">
                {placesText} &nbsp;&nbsp;&bull;&nbsp;&nbsp; {placesText} &nbsp;&nbsp;&bull;&nbsp;&nbsp;
              </div>
            </div>
          ) : (
            <p className="text-red-500 font-semibold text-[11px] sm:text-xs line-clamp-1 py-0.5">
              {placesText}
            </p>
          )}

          {/* Star Ratings & Google Rating label */}
          <div className="flex items-center gap-1 mt-0.5">
            <div className="flex items-center">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star 
                  key={s} 
                  className={`h-3.5 w-3.5 sm:h-4 sm:w-4 text-[#0D6EFD] ${
                    s <= (listing.rating || 5) ? 'fill-[#0D6EFD]' : 'text-gray-200'
                  }`} 
                />
              ))}
            </div>
            <span className="text-red-500 font-bold text-[10px] sm:text-xs ml-1.5">Google Rating</span>
          </div>
        </div>
      </div>

      {/* Middle Section: Icons Row */}
      <div className="flex justify-around items-center py-2 px-1 bg-gray-50/50 rounded-2xl border border-gray-100">
        <div className="flex flex-col items-center gap-1">
          <div className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center text-red-500">
            <Camera className="h-4.5 w-4.5" />
          </div>
          <span className="text-[10px] font-semibold text-gray-700">SightSeeing</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <div className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center text-red-500">
            <Bus className="h-4.5 w-4.5" />
          </div>
          <span className="text-[10px] font-semibold text-gray-700">Transport</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <div className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center text-red-500">
            <Bed className="h-4.5 w-4.5" />
          </div>
          <span className="text-[10px] font-semibold text-gray-700">Hotel Stay</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <div className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center text-red-500">
            <Utensils className="h-4.5 w-4.5" />
          </div>
          <span className="text-[10px] font-semibold text-gray-700">Meal</span>
        </div>
      </div>

      {/* Divider */}
      <hr className="border-gray-200 w-full" />

      {/* 3 Columns details (Stay, Pick-up, Drop) */}
      <div className="grid grid-cols-3 gap-2">
        <div className="flex flex-col items-center text-center">
          <span className="font-extrabold text-[11px] sm:text-xs text-gray-900">Stay</span>
          <div className="w-full border border-sky-400 text-sky-600 bg-white font-bold py-1 px-1.5 rounded-full text-[10px] truncate mt-1">
            {duration}D | {nights}N
          </div>
        </div>
        <div className="flex flex-col items-center text-center">
          <span className="font-extrabold text-[11px] sm:text-xs text-gray-900">Pick-up</span>
          <div className="w-full border border-sky-400 text-sky-600 bg-white font-bold py-1 px-1.5 rounded-full text-[10px] truncate mt-1" title={pickupLocation}>
            {pickupLocation}
          </div>
        </div>
        <div className="flex flex-col items-center text-center">
          <span className="font-extrabold text-[11px] sm:text-xs text-gray-900">Drop</span>
          <div className="w-full border border-sky-400 text-sky-600 bg-white font-bold py-1 px-1.5 rounded-full text-[10px] truncate mt-1" title={dropLocation}>
            {dropLocation}
          </div>
        </div>
      </div>

      {/* Bottom Highlight Box */}
      <div className="bg-[#E3F2FD] border border-[#90CAF9] rounded-2xl p-3 flex flex-col gap-3">
        {/* EMI & pricing info */}
        <div className="flex justify-between items-center">
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-600 font-medium">Interest free EMI</span>
            <span className="text-sm font-extrabold text-gray-900">Available</span>
          </div>
          <div className="text-right">
            {price && price !== 'N/A' && price !== '' ? (
              <div className="flex flex-col">
                <span className="text-[10px] text-gray-600 font-medium">Starting Price</span>
                <span className="text-sm font-extrabold text-[#0D6EFD]">
                  {currencySymbol}{price}
                </span>
              </div>
            ) : (
              <span className="text-xs text-[#0D6EFD] font-extrabold">Contact Agent for Pricing</span>
            )}
          </div>
        </div>

        {/* Actions Row */}
        {showActions && (
          <div className="flex gap-2 items-center">
            {variant === 'user' ? (
              <>
                {showCompare && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 py-1.5 px-2 border border-[#0D6EFD] bg-white text-[#0D6EFD] hover:bg-[#E3F2FD] font-bold text-[10px] sm:text-xs rounded-xl flex items-center justify-center gap-1"
                    onClick={handleCompareToggle}
                  >
                    {isInComparison(listing.id) ? (
                      <>
                        <CheckCircle2 className="h-3 w-3" />
                        <span>Added</span>
                      </>
                    ) : (
                      <>
                        <Scale className="h-3 w-3" />
                        <span>Compare</span>
                      </>
                    )}
                  </Button>
                )}
                
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 py-1.5 px-2 border border-[#0D6EFD] bg-white text-[#0D6EFD] hover:bg-[#E3F2FD] font-bold text-[10px] sm:text-xs rounded-xl flex items-center justify-center gap-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    onWishlist?.(listing.id);
                    window.dispatchEvent(new CustomEvent('floating-effect', {
                      detail: { x: e.clientX, y: e.clientY, type: 'wishlist' }
                    }));
                  }}
                >
                  <Heart 
                    className={`h-3 w-3 ${isWishlisted ? 'text-red-500 fill-red-500' : 'text-[#0D6EFD]'}`} 
                  />
                  <span>Wishlist</span>
                </Button>

                <Button
                  size="sm"
                  className="flex-[1.5] py-1.5 px-2 bg-[#FFA000] hover:bg-[#FF8F00] text-black font-extrabold text-[11px] sm:text-xs rounded-xl flex items-center justify-center shadow-sm"
                  onClick={() => onView?.(listing)}
                >
                  View Itinerary
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 py-1.5 px-2 border border-gray-400 bg-white text-gray-700 hover:bg-gray-50 font-semibold text-[10px] sm:text-xs rounded-xl flex items-center justify-center gap-1"
                  onClick={() => onView?.(listing)}
                >
                  <Eye className="h-3 w-3" />
                  <span>View</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 py-1.5 px-2 border border-[#0D6EFD] bg-white text-[#0D6EFD] hover:bg-[#E3F2FD] font-semibold text-[10px] sm:text-xs rounded-xl flex items-center justify-center gap-1"
                  onClick={() => onEdit?.(listing)}
                >
                  <Edit className="h-3 w-3" />
                  <span>Edit</span>
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="flex-1 py-1.5 px-2 bg-red-600 hover:bg-red-700 text-white font-semibold text-[10px] sm:text-xs rounded-xl flex items-center justify-center gap-1"
                  onClick={() => onDelete?.(listing.id)}
                >
                  <Trash2 className="h-3 w-3" />
                  <span>Delete</span>
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}