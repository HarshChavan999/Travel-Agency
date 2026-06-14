import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useComparison } from '@/contexts/ComparisonContext';
import { optimizeImageUrl } from '@/lib/imageOptimization';
import { 
  Star, 
  Share2, 
  Scale, 
  Heart, 
  MapPin, 
  Calendar, 
  DollarSign,
  ChevronRight,
  Home,
  Hotel,
  Camera,
  Video,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  MessageCircle,
  CheckCircle2,
  AlertCircle
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

export default function PackageDetailView({ 
  listing, 
  onBack, 
  onBook, 
  onChat,
  onWishlist,
  isWishlisted 
}: PackageDetailViewProps) {
  const [activeImageTab, setActiveImageTab] = useState<'sightseeing' | 'hotel' | 'video'>('sightseeing');
  const [expandedDays, setExpandedDays] = useState<number[]>([1]);
  const [expandedFAQs, setExpandedFAQs] = useState<number[]>([]);
  const [showAllPhotos, setShowAllPhotos] = useState(false);
  const [showCompareToast, setShowCompareToast] = useState(false);
  const [compareToastMessage, setCompareToastMessage] = useState('');
  
  const { addToComparison, isInComparison, canAddMore, comparisonList } = useComparison();

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

  // Parse inclusions and exclusions into arrays
  const parseList = (text: string) => {
    if (!text) return [];
    return text.split('\n').filter(item => item.trim() !== '');
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

  // Get tour categories
  const categories = listing.tourCategories || ['Family'];

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
                {categories.map((category: string, index: number) => (
                  <Badge 
                    key={index} 
                    className="bg-orange-100 text-orange-700 hover:bg-orange-200 border-orange-200"
                  >
                    {category} Tour
                  </Badge>
                ))}
                <Badge variant="outline" className="text-gray-600">
                  Code: {packageCode}
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
                {listing.placesCovered?.map((place: any, index: number) => (
                  <span key={index} className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {place.name}
                    {index < listing.placesCovered.length - 1 && <span className="mx-1">|</span>}
                  </span>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col items-end gap-3">
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex items-center gap-2"
                  onClick={onBack}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex items-center gap-2"
                  onClick={() => alert('Share functionality coming soon!')}
                >
                  <Share2 className="h-4 w-4" />
                  Share
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className={`flex items-center gap-2 ${isInComparison(listing.id) ? 'bg-blue-50 text-blue-600 border-blue-200' : ''}`}
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
                  className={`flex items-center gap-2 ${isWishlisted ? 'text-red-500 border-red-200 bg-red-50' : ''}`}
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
        {/* Photo Gallery Section */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-8">
          {/* Main Photo */}
          <div className="lg:col-span-3">
            <div className="relative aspect-[16/9] bg-gray-200 rounded-xl overflow-hidden">
              {mainImage ? (
                <img 
                  src={optimizeImageUrl(mainImage, { width: 1200, quality: 90, format: 'auto', cacheBust: true })} 
                  alt={listing.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Camera className="h-16 w-16 text-gray-400" />
                  <span className="ml-2 text-gray-500">No photos available</span>
                </div>
              )}
              {allImages.length > 1 && (
                <button 
                  className="absolute bottom-4 right-4 bg-black/70 text-white px-4 py-2 rounded-lg text-sm hover:bg-black/80"
                  onClick={() => setShowAllPhotos(true)}
                >
                  +{allImages.length - 1} Photos
                </button>
              )}
            </div>
          </div>

          {/* Side Photo Cards */}
          <div className="lg:col-span-1 flex flex-col gap-3">
            <div 
              className={`flex-1 bg-sky-100 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all ${
                activeImageTab === 'sightseeing' ? 'ring-2 ring-orange-500 bg-sky-200' : 'hover:bg-sky-200'
              }`}
              onClick={() => setActiveImageTab('sightseeing')}
            >
              <Camera className="h-8 w-8 text-sky-600 mb-2" />
              <span className="text-sm font-medium text-sky-800">Sightseeing Photos</span>
              <span className="text-xs text-sky-600 mt-1">{allImages.length} photos</span>
            </div>
            
            <div 
              className={`flex-1 bg-sky-100 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all ${
                activeImageTab === 'hotel' ? 'ring-2 ring-orange-500 bg-sky-200' : 'hover:bg-sky-200'
              }`}
              onClick={() => setActiveImageTab('hotel')}
            >
              <Hotel className="h-8 w-8 text-sky-600 mb-2" />
              <span className="text-sm font-medium text-sky-800">Hotel Photos</span>
              <span className="text-xs text-sky-600 mt-1">View hotels</span>
            </div>
            
            <div 
              className={`flex-1 bg-sky-100 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all ${
                activeImageTab === 'video' ? 'ring-2 ring-orange-500 bg-sky-200' : 'hover:bg-sky-200'
              }`}
              onClick={() => setActiveImageTab('video')}
            >
              <Video className="h-8 w-8 text-sky-600 mb-2" />
              <span className="text-sm font-medium text-sky-800">Video</span>
              <span className="text-xs text-sky-600 mt-1">Watch tour video</span>
            </div>
          </div>
        </div>

        {/* Package Summary Bar */}
        <div className="bg-white rounded-xl shadow-sm border p-4 mb-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Duration</p>
                <p className="font-semibold">{listing.itinerary?.length || 0}D / {listing.itinerary?.length > 0 ? listing.itinerary.length - 1 : 0}N</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <MapPin className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Places</p>
                <p className="font-semibold">{listing.placesCovered?.length || 0} Cities</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Hotel className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Hotel Type</p>
                <p className="font-semibold capitalize">{listing.hotelTypes?.[0] || 'Standard'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Starting From</p>
                <p className="font-semibold text-orange-600">
                  {listing.packageType === 'international' ? '$' : '₹'}{listing.cost || 'Contact Us'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Itinerary Section */}
            <Card>
              <CardHeader className="bg-gray-500 hover:bg-gray-600 text-white px-8">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Calendar className="h-5 w-5" />
                  Itinerary
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {listing.itinerary && listing.itinerary.length > 0 ? (
                  <div className="divide-y">
                    {listing.itinerary.map((day: any, index: number) => (
                      <div key={day.id || index} className="p-4">
                        <button 
                          className="w-full flex items-center justify-between text-left"
                          onClick={() => toggleDay(day.day)}
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                              <span className="font-bold text-gray-600">D{day.day}</span>
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900">Day 0{day.day}</h3>
                              <p className="text-sm text-gray-500">{day.placeName || 'TBD'}</p>
                            </div>
                          </div>
                          {expandedDays.includes(day.day) ? (
                            <ChevronUp className="h-5 w-5 text-gray-400" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-gray-400" />
                          )}
                        </button>
                        
                        {expandedDays.includes(day.day) && (
                          <div className="mt-4 ml-16 pl-4 border-l-2 border-gray-200">
                            <p className="text-gray-700 leading-relaxed">
                              {day.description || 'Detailed itinerary for this day will be shared upon booking confirmation.'}
                            </p>
                            {day.placeName && (
                              <div className="mt-3 flex items-center gap-2 text-sm text-gray-500">
                                <MapPin className="h-4 w-4" />
                                <span>Staying at: {day.placeName}</span>
                              </div>
                            )}
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
              </CardContent>
            </Card>

            {/* Accommodation Details */}
            <Card>
              <CardHeader className="bg-gradient-to-r from-gray-500 to-gray-600 text-white">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Hotel className="h-5 w-5" />
                  Accommodation Details
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-4">
                  {(listing.placesCovered || defaultAccommodations).map((place: any, index: number) => (
                    <div key={index} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Hotel className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">{place.name || place.city}</h4>
                        <div className="flex items-center gap-1 mt-1">
                          {[1, 2, 3, 4].map((star) => (
                            <Star key={star} className="h-4 w-4 text-yellow-400 fill-current" />
                          ))}
                          <span className="text-sm text-gray-500 ml-2">4 Star Properties</span>
                        </div>
                        {place.hotels && (
                          <div className="mt-2 text-sm text-gray-600">
                            <span className="font-medium">Suggested Hotels: </span>
                            {place.hotels.join(', ')}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-medium text-gray-600">
                          {place.nights || 1} Night{place.nights !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Tour Inclusions */}
            <Card>
              <CardHeader className="bg-gradient-to-r from-gray-500 to-gray-600 text-white">
                <CardTitle className="flex items-center gap-2 text-xl">
                  {/* <Check className="h-5 w-5" /> */}
                  Tour Inclusion Details
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                {inclusions.length > 0 ? (
                  <ul className="space-y-3">
                    {inclusions.map((item: string, index: number) => (
                      <li key={index} className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Check className="h-4 w-4 text-green-600" />
                        </div>
                        <span className="text-gray-700">{item}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-center text-gray-500 py-4">
                    <p>Inclusions will be listed here.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Tour Exclusions */}
            <Card>
              <CardHeader className="bg-gradient-to-r from-gray-500 to-gray-600 text-white">
                <CardTitle className="flex items-center gap-2 text-xl">
                  {/* <X className="h-5 w-5" /> */}
                  Tour Exclusion Details
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                {exclusions.length > 0 ? (
                  <ul className="space-y-3">
                    {exclusions.map((item: string, index: number) => (
                      <li key={index} className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <X className="h-4 w-4 text-red-600" />
                        </div>
                        <span className="text-gray-700">{item}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-center text-gray-500 py-4">
                    <p>Exclusions will be listed here.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* FAQ Section */}
            <Card>
              <CardHeader className="bg-gradient-to-r from-gray-500 to-gray-600 text-white">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <MessageCircle className="h-5 w-5" />
                  More Frequent Questions
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-2">
                  {defaultFAQs.map((faq, index) => (
                    <div key={index} className="border rounded-lg">
                      <button 
                        className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50"
                        onClick={() => toggleFAQ(index)}
                      >
                        <span className="font-medium text-gray-900">{faq.question}</span>
                        {expandedFAQs.includes(index) ? (
                          <ChevronUp className="h-5 w-5 text-gray-400 flex-shrink-0" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-gray-400 flex-shrink-0" />
                        )}
                      </button>
                      {expandedFAQs.includes(index) && (
                        <div className="px-4 pb-4">
                          <p className="text-gray-600 leading-relaxed">{faq.answer}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-4 space-y-4">
              {/* Quick Info Card */}
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-lg mb-4">Package Highlights</h3>
                  <ul className="space-y-3 text-sm">
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <span>Guided tours with expert local guides</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <span>Premium accommodation throughout</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <span>All transfers and transportation</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <span>24/7 customer support</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              {/* Agency Info */}
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-lg mb-3">Offered By</h3>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-xl">🏢</span>
                    </div>
                    <div>
                      <p className="font-medium">{listing.agencyName || 'Travel Agency'}</p>
                      {listing.agencyData?.verified && (
                        <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
                          ✅ Verified
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => onChat(listing)}
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Chat with Agency
                  </Button>
                </CardContent>
              </Card>

              {/* Price Card */}
              <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
                <CardContent className="p-4">
                  <p className="text-sm opacity-90">Starting from</p>
                  <p className="text-3xl font-bold my-2">
                    {listing.packageType === 'international' ? '$' : '₹'}{listing.cost || 'Contact Us'}
                  </p>
                  <p className="text-sm opacity-90">per person</p>
                  <Button 
                    className="w-full mt-4 bg-white text-orange-600 hover:bg-gray-100"
                    onClick={() => onBook(listing)}
                  >
                    Book Now
                  </Button>
                </CardContent>
              </Card>

              {/* Back Button */}
              <Button 
                variant="outline" 
                className="w-full"
                onClick={onBack}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Listings
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Compare Toast Notification */}
      {showCompareToast && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 fade-in duration-300">
          <div className={`flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg ${
            compareToastMessage.includes('already') || compareToastMessage.includes('only compare') 
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

      {/* Photo Gallery Modal */}
      {showAllPhotos && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
          <div className="max-w-5xl w-full max-h-[90vh] overflow-y-auto bg-white rounded-xl">
            <div className="sticky top-0 bg-white p-4 border-b flex items-center justify-between">
              <h3 className="text-xl font-bold">Photo Gallery</h3>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowAllPhotos(false)}
              >
                ✕ Close
              </Button>
            </div>
            <div className="p-4 grid grid-cols-2 md:grid-cols-3 gap-4">
              {allImages.map((image, index) => (
                <div key={index} className="aspect-square rounded-lg overflow-hidden">
                  <img 
                    src={optimizeImageUrl(image, { width: 800, quality: 90, format: 'auto', cacheBust: true })} 
                    alt={`Photo ${index + 1}`}
                    className="w-full h-full object-cover hover:scale-105 transition-transform"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
