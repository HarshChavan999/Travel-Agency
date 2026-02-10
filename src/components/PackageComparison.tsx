'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  X,
  ArrowLeft,
  Scale,
  Star,
  MapPin,
  Calendar,
  DollarSign,
  Hotel,
  Utensils,
  Bus,
  Camera,
  Check,
  ShoppingCart,
  AlertCircle,
  Trash2
} from 'lucide-react';
import { ComparisonPackage, useComparison } from '@/contexts/ComparisonContext';
import { optimizeImageUrl } from '@/lib/imageOptimization';

interface PackageComparisonProps {
  onBack: () => void;
  onBook: (listing: any) => void;
}

// Helper function to get main image
const getMainImage = (pkg: ComparisonPackage) => {
  if (pkg.placesCovered && pkg.placesCovered.length > 0 && 
      pkg.placesCovered[0].imageUrls && pkg.placesCovered[0].imageUrls.length > 0) {
    return pkg.placesCovered[0].imageUrls[0];
  }
  if (pkg.photos && pkg.photos.length > 0) {
    return pkg.photos[0];
  }
  return null;
};

// Helper to parse inclusions/exclusions
const parseList = (text?: string) => {
  if (!text) return [];
  return text.split('\n').filter(item => item.trim() !== '');
};

// Generate hotel details from placesCovered
const getHotelDetails = (pkg: ComparisonPackage) => {
  if (pkg.placesCovered && pkg.placesCovered.length > 0) {
    return pkg.placesCovered.map((place: any, index: number) => ({
      city: place.name || place.city || `Destination ${index + 1}`,
      hotels: place.hotels || ['Standard Hotel'],
      nights: place.nights || 1,
      rating: 4
    }));
  }
  return [];
};

// Get meal plan details
const getMealPlan = (inclusions?: string) => {
  if (!inclusions) return 'Meals as per itinerary';
  const meals = [];
  if (inclusions.toLowerCase().includes('breakfast')) meals.push('Breakfast');
  if (inclusions.toLowerCase().includes('lunch')) meals.push('Lunch');
  if (inclusions.toLowerCase().includes('dinner')) meals.push('Dinner');
  return meals.length > 0 ? meals.join(', ') : 'Meals as per itinerary';
};

// Get transfer details
const getTransferDetails = (inclusions?: string) => {
  if (!inclusions) return 'Airport transfers included';
  if (inclusions.toLowerCase().includes('private transfer')) return 'Private Transfers';
  if (inclusions.toLowerCase().includes('shared transfer')) return 'Shared Transfers';
  return 'Airport & Inter-city Transfers';
};

// Get sightseeing details
const getSightseeingDetails = (pkg: ComparisonPackage) => {
  const inclusions = parseList(pkg.inclusions);
  const sightseeing = inclusions.filter(i => 
    i.toLowerCase().includes('sightseeing') || 
    i.toLowerCase().includes('guide') ||
    i.toLowerCase().includes('tour')
  );
  return sightseeing.length > 0 ? sightseeing : ['Guided sightseeing tours'];
};

// Get tour highlights from itinerary
const getTourHighlights = (pkg: ComparisonPackage) => {
  const highlights = [];
  
  // From inclusions
  const inclusions = parseList(pkg.inclusions);
  highlights.push(...inclusions.slice(0, 5));
  
  // From itinerary
  if (pkg.itinerary && pkg.itinerary.length > 0) {
    pkg.itinerary.forEach((day: any) => {
      if (day.description) {
        highlights.push(`Day ${day.day}: ${day.description.substring(0, 60)}...`);
      }
    });
  }
  
  return highlights.slice(0, 8);
};

const PackageCard: React.FC<{
  pkg: ComparisonPackage;
  onRemove: () => void;
  onBook: () => void;
}> = ({ pkg, onRemove, onBook }) => {
  const mainImage = getMainImage(pkg);
  const optimizedImage = mainImage ? optimizeImageUrl(mainImage, { quality: 85, format: 'auto' }) : null;
  const duration = pkg.itinerary?.length || pkg.duration || 0;
  const nights = duration > 0 ? duration - 1 : 0;
  const price = pkg.cost || pkg.price || 0;
  const currency = pkg.packageType === 'international' ? '$' : '₹';
  const hotelDetails = getHotelDetails(pkg);
  const inclusionsList = parseList(pkg.inclusions);
  const exclusionsList = parseList(pkg.exclusions);

  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Package Image */}
      <div className="relative h-48 bg-gray-100">
        {optimizedImage ? (
          <img
            src={optimizedImage}
            alt={pkg.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-100 to-blue-200">
            <Camera className="h-12 w-12 text-blue-400" />
          </div>
        )}
        <button
          onClick={onRemove}
          className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
          <Badge className="bg-orange-500 text-white border-0">
            {pkg.packageType === 'international' ? 'International' : 'Domestic'}
          </Badge>
        </div>
      </div>

      {/* Package Info */}
      <div className="p-4 flex-1 flex flex-col">
        <h3 className="font-bold text-lg text-gray-900 mb-1 line-clamp-2">{pkg.title}</h3>
        <p className="text-sm text-gray-500 mb-3">By {pkg.agencyName || 'Travel Agency'}</p>

        {/* Rating */}
        <div className="flex items-center gap-1 mb-3">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={`h-4 w-4 ${star <= (pkg.rating || 4) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
            />
          ))}
          <span className="text-sm text-gray-600 ml-1">{pkg.rating || 4}/5</span>
        </div>

        {/* Price */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-3 rounded-lg mb-4">
          <p className="text-xs opacity-90">Starting from</p>
          <p className="text-2xl font-bold">{currency}{price}</p>
          <p className="text-xs opacity-90">per person</p>
        </div>

        {/* Duration */}
        <div className="flex items-center gap-2 mb-4 text-sm">
          <Calendar className="h-4 w-4 text-blue-600" />
          <span className="font-medium">{duration} Days / {nights} Nights</span>
        </div>

        {/* Hotel Details */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Hotel className="h-4 w-4 text-purple-600" />
            <span className="font-semibold text-sm">Hotels</span>
          </div>
          <div className="space-y-2">
            {hotelDetails.slice(0, 3).map((hotel, idx) => (
              <div key={idx} className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                <div className="flex items-center gap-1 mb-1">
                  <MapPin className="h-3 w-3" />
                  <span className="font-medium">{hotel.city}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                  <span>{hotel.hotels[0]}</span>
                  <span className="text-gray-400">({hotel.nights}N)</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Meal Plan */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Utensils className="h-4 w-4 text-green-600" />
            <span className="font-semibold text-sm">Meal Plan</span>
          </div>
          <p className="text-xs text-gray-600 bg-green-50 p-2 rounded">{getMealPlan(pkg.inclusions)}</p>
        </div>

        {/* Transfers */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Bus className="h-4 w-4 text-blue-600" />
            <span className="font-semibold text-sm">Transfers</span>
          </div>
          <p className="text-xs text-gray-600 bg-blue-50 p-2 rounded">{getTransferDetails(pkg.inclusions)}</p>
        </div>

        {/* Sightseeing */}
        <div className="mb-4 flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Camera className="h-4 w-4 text-pink-600" />
            <span className="font-semibold text-sm">Sightseeing</span>
          </div>
          <ul className="text-xs text-gray-600 space-y-1">
            {getSightseeingDetails(pkg).slice(0, 3).map((item, idx) => (
              <li key={idx} className="flex items-start gap-1">
                <Check className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="line-clamp-2">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Tour Highlights */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Star className="h-4 w-4 text-yellow-600" />
            <span className="font-semibold text-sm">Tour Highlights</span>
          </div>
          <ul className="text-xs text-gray-600 space-y-1 max-h-32 overflow-y-auto">
            {getTourHighlights(pkg).slice(0, 5).map((highlight, idx) => (
              <li key={idx} className="flex items-start gap-1">
                <div className="w-1.5 h-1.5 bg-orange-400 rounded-full mt-1.5 flex-shrink-0" />
                <span className="line-clamp-2">{highlight}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Inclusions Summary */}
        <div className="mb-4">
          <p className="font-semibold text-sm mb-2">Inclusions</p>
          <div className="flex flex-wrap gap-1">
            {inclusionsList.slice(0, 4).map((item, idx) => (
              <Badge key={idx} variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                <Check className="h-3 w-3 mr-1" />
                {item.substring(0, 20)}{item.length > 20 ? '...' : ''}
              </Badge>
            ))}
          </div>
        </div>

        {/* Add to Cart Button */}
        <Button 
          onClick={onBook}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white"
        >
          <ShoppingCart className="h-4 w-4 mr-2" />
          Add to Cart
        </Button>
      </div>
    </div>
  );
};

const ComparisonRow: React.FC<{
  label: string;
  icon: React.ReactNode;
  values: React.ReactNode[];
}> = ({ label, icon, values }) => (
  <div className="grid grid-cols-4 gap-4 py-3 border-b border-gray-100 last:border-0">
    <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
      {icon}
      {label}
    </div>
    {values.map((value, idx) => (
      <div key={idx} className="text-sm text-gray-600">
        {value}
      </div>
    ))}
  </div>
);

export default function PackageComparison({ onBack, onBook }: PackageComparisonProps) {
  const { comparisonList, removeFromComparison, clearComparison, canAddMore, maxPackages } = useComparison();

  const handleBook = (pkg: ComparisonPackage) => {
    onBook(pkg);
  };

  // Create empty slots for comparison
  const emptySlots = maxPackages - comparisonList.length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" onClick={onBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Scale className="h-6 w-6 text-blue-600" />
                  Compare Packages
                </h1>
                <p className="text-sm text-gray-500">
                  Comparing {comparisonList.length} of {maxPackages} packages
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {!canAddMore && (
                <div className="flex items-center gap-2 text-amber-600 text-sm">
                  <AlertCircle className="h-4 w-4" />
                  Maximum packages selected
                </div>
              )}
              <Button variant="outline" size="sm" onClick={clearComparison} className="text-red-600 hover:text-red-700">
                <Trash2 className="h-4 w-4 mr-2" />
                Clear All
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {comparisonList.length === 0 ? (
          <Card className="text-center py-16">
            <CardContent>
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Scale className="h-10 w-10 text-gray-400" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">No Packages to Compare</h2>
              <p className="text-gray-500 mb-6 max-w-md mx-auto">
                Add packages to comparison by clicking the compare button on any travel package. You can compare up to 3 packages at a time.
              </p>
              <Button onClick={onBack}>
                Browse Packages
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Side-by-Side Comparison Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {comparisonList.map((pkg) => (
                <PackageCard
                  key={pkg.id}
                  pkg={pkg}
                  onRemove={() => removeFromComparison(pkg.id)}
                  onBook={() => handleBook(pkg)}
                />
              ))}
              
              {/* Empty Slot Placeholders */}
              {Array.from({ length: emptySlots }).map((_, idx) => (
                <Card key={`empty-${idx}`} className="border-dashed border-2 border-gray-300 bg-gray-50/50">
                  <CardContent className="flex flex-col items-center justify-center h-full min-h-[400px] text-center p-6">
                    <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-4">
                      <Scale className="h-8 w-8 text-gray-400" />
                    </div>
                    <p className="text-gray-500 font-medium mb-2">Add another package</p>
                    <p className="text-sm text-gray-400">
                      Select another package to compare
                    </p>
                    <Button variant="outline" className="mt-4" onClick={onBack}>
                      Browse More
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Detailed Comparison Table */}
            {comparisonList.length > 1 && (
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle className="text-lg">Detailed Comparison</CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Header Row with Package Names */}
                  <div className="grid grid-cols-4 gap-4 py-3 border-b-2 border-gray-200 font-semibold">
                    <div className="text-gray-900">Feature</div>
                    {comparisonList.map((pkg) => (
                      <div key={pkg.id} className="text-blue-600 truncate">
                        {pkg.title}
                      </div>
                    ))}
                    {emptySlots > 0 && (
                      <div className="text-gray-400">-</div>
                    )}
                  </div>

                  {/* Price Row */}
                  <ComparisonRow
                    label="Price"
                    icon={<DollarSign className="h-4 w-4" />}
                    values={comparisonList.map(pkg => {
                      const price = pkg.cost || pkg.price || 0;
                      const currency = pkg.packageType === 'international' ? '$' : '₹';
                      return (
                        <span className="font-bold text-orange-600">
                          {currency}{price}
                        </span>
                      );
                    })}
                  />

                  {/* Duration Row */}
                  <ComparisonRow
                    label="Duration"
                    icon={<Calendar className="h-4 w-4" />}
                    values={comparisonList.map(pkg => {
                      const duration = pkg.itinerary?.length || pkg.duration || 0;
                      const nights = duration > 0 ? duration - 1 : 0;
                      return `${duration}D / ${nights}N`;
                    })}
                  />

                  {/* Destinations Row */}
                  <ComparisonRow
                    label="Destinations"
                    icon={<MapPin className="h-4 w-4" />}
                    values={comparisonList.map(pkg => {
                      if (pkg.packageType === 'international') {
                        return pkg.countryName || 'International';
                      }
                      return pkg.stateName || pkg.placesCovered?.map((p: any) => p.name).join(', ') || 'Domestic';
                    })}
                  />

                  {/* Hotel Type Row */}
                  <ComparisonRow
                    label="Hotel Type"
                    icon={<Hotel className="h-4 w-4" />}
                    values={comparisonList.map(pkg => {
                      const types = pkg.hotelTypes || ['Standard'];
                      return types[0];
                    })}
                  />

                  {/* Rating Row */}
                  <ComparisonRow
                    label="Rating"
                    icon={<Star className="h-4 w-4" />}
                    values={comparisonList.map(pkg => (
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                        <span>{pkg.rating || 4}/5</span>
                      </div>
                    ))}
                  />

                  {/* Agency Row */}
                  <ComparisonRow
                    label="Agency"
                    icon={<Check className="h-4 w-4" />}
                    values={comparisonList.map(pkg => pkg.agencyName || 'Travel Agency')}
                  />

                  {/* Places Covered Row */}
                  <ComparisonRow
                    label="Places"
                    icon={<MapPin className="h-4 w-4" />}
                    values={comparisonList.map(pkg => {
                      const count = pkg.placesCovered?.length || 0;
                      return `${count} destination${count !== 1 ? 's' : ''}`;
                    })}
                  />
                </CardContent>
              </Card>
            )}

            {/* Summary Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Comparison Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {comparisonList.map((pkg) => {
                    const price = Number(pkg.cost || pkg.price || 0);
                    const minPrice = Math.min(...comparisonList.map(p => Number(p.cost || p.price || 0)));
                    const isBestValue = price === minPrice;
                    
                    return (
                      <div key={pkg.id} className={`p-4 rounded-lg border-2 ${isBestValue ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}>
                        <h4 className="font-semibold text-gray-900 mb-2 truncate">{pkg.title}</h4>
                        {isBestValue && (
                          <Badge className="bg-green-500 text-white mb-2">Best Value</Badge>
                        )}
                        <p className="text-2xl font-bold text-orange-600 mb-1">
                          {pkg.packageType === 'international' ? '$' : '₹'}{price}
                        </p>
                        <p className="text-sm text-gray-500 mb-3">per person</p>
                        <Button 
                          onClick={() => handleBook(pkg)}
                          className="w-full bg-orange-500 hover:bg-orange-600"
                        >
                          <ShoppingCart className="h-4 w-4 mr-2" />
                          Book Now
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
