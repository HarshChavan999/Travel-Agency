import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Heart, 
  MapPin, 
  Users, 
  Mail, 
  Search, 
  ChevronDown, 
  LayoutGrid, 
  List, 
  MoreVertical, 
  Calendar, 
  Plus,
  Send,
  Trash2
} from 'lucide-react';
import { optimizeImageUrl } from '@/lib/imageOptimization';

interface WishlistViewProps {
  wishlist: string[];
  listings: any[];
  onWishlistToggle: (id: string, e: React.MouseEvent) => void;
  onView: (listing: any) => void;
  onExplore?: () => void;
  onBack?: () => void;
}

const fallbackImages = [
  'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=400&q=80',
];

export default function WishlistView({ wishlist = [], listings = [], onWishlistToggle, onView, onExplore, onBack }: WishlistViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('recent');

  const wishlistedItems = (listings || []).filter(listing => (wishlist || []).includes(listing?.id));
  const topListings = [...(listings || [])].sort((a, b) => {
    const aIsAmbaji = a?.title?.toLowerCase().includes('ambaji');
    const bIsAmbaji = b?.title?.toLowerCase().includes('ambaji');
    if (aIsAmbaji && !bIsAmbaji) return -1;
    if (!aIsAmbaji && bIsAmbaji) return 1;

    const aIsEscape = a?.agencyName?.toLowerCase().includes('escape');
    const bIsEscape = b?.agencyName?.toLowerCase().includes('escape');
    if (aIsEscape && !bIsEscape) return -1;
    if (!aIsEscape && bIsEscape) return 1;
    return 0;
  }).slice(0, 4);
  
  const filteredItems = wishlistedItems.filter(item => {
    const query = searchQuery.toLowerCase();
    return (
      (item?.title || '').toLowerCase().includes(query) || 
      (item?.countryName || '').toLowerCase().includes(query) ||
      (item?.stateName || '').toLowerCase().includes(query) ||
      (item?.destination || '').toLowerCase().includes(query) ||
      (item?.agencyName || '').toLowerCase().includes(query)
    );
  }).sort((a, b) => {
    if (sortBy === 'name_asc') return (a.title || '').localeCompare(b.title || '');
    if (sortBy === 'name_desc') return (b.title || '').localeCompare(a.title || '');
    return 0;
  });

  return (
    <div className="w-full bg-[#fcfdfd] min-h-screen py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-12">
        
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center justify-center w-10 h-10 rounded-full border border-gray-200 hover:bg-gray-100 text-gray-750 transition-all hover:scale-105 active:scale-95 text-lg font-bold shadow-sm bg-white"
              title="Go back"
            >
              ←
            </button>
          )}
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">My Wishlist</h1>
        </div>

        {/* HERO SECTION */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-12">
          {/* Left: Text Content */}
          <div className="flex-1 space-y-6 z-10">
            <h1 className="text-5xl lg:text-6xl font-extrabold text-[#0B1528] leading-tight tracking-tight">
              Plan Your <br />
              <span className="text-[#FF6B00]">Dream</span> Journey
            </h1>
            <p className="text-gray-500 text-lg max-w-md leading-relaxed font-medium">
              Save destinations, collaborate with friends, and vote together to plan the perfect trip.
            </p>
            
          </div>

          {/* Right: Tilted Cards Container */}
          <div className="flex-1 relative h-[450px] w-full flex items-center justify-center lg:justify-end pr-4">
            {/* Background dashed path */}
            <svg className="absolute inset-0 w-full h-full text-orange-200 opacity-50 z-0 pointer-events-none" viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice">
              <path d="M50,300 C150,350 250,50 350,150" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="6 6" />
            </svg>
            <div className="absolute top-10 right-10 text-orange-500 opacity-60 z-0">
               <Send className="w-6 h-6 transform -rotate-45" />
            </div>

            <div className="relative flex items-center justify-center z-10 w-full">
              {topListings.map((card, index) => {
                // Calculate rotation and translation based on index to recreate the fan effect
                let rotation = 'rotate-0';
                let translation = 'translate-x-0 translate-y-0';
                let zIndex = 'z-10';
                let scale = 'scale-100';

                if (index === 0) { rotation = 'rotate-0'; translation = '-translate-x-12 -translate-y-8'; zIndex = 'z-30'; scale = 'scale-110 shadow-2xl'; }
                if (index === 1) { rotation = '-rotate-6'; translation = '-translate-x-32 translate-y-4'; zIndex = 'z-10'; scale = 'scale-95'; }
                if (index === 2) { rotation = 'rotate-6'; translation = 'translate-x-12 translate-y-2'; zIndex = 'z-20'; scale = 'scale-100'; }
                if (index === 3) { rotation = 'rotate-12'; translation = 'translate-x-32 translate-y-12'; zIndex = 'z-10'; scale = 'scale-90'; }
                
                const cardImage = (card.photos && card.photos.length > 0) ? card.photos[0] : 
                                 (card.placesCovered && card.placesCovered.length > 0 && card.placesCovered[0].imageUrls && card.placesCovered[0].imageUrls.length > 0) 
                                 ? card.placesCovered[0].imageUrls[0] : '';
                const rating = card.rating || 4;
                const finalImage = cardImage ? optimizeImageUrl(cardImage, { quality: 80, format: 'auto' }) : fallbackImages[index % fallbackImages.length];

                return (
                  <div key={card.id || index} className={`absolute w-40 h-64 rounded-2xl overflow-hidden shadow-xl border-4 border-white transition-all duration-500 ${rotation} ${translation} ${zIndex} ${scale}`}>
                    <img src={finalImage} className="w-full h-full object-cover" alt={card.title || 'Destination'} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                    <div className="absolute bottom-4 left-4 right-4">
                      <h4 className="text-white font-bold text-sm mb-1 line-clamp-1">{card.title}</h4>
                      <div className="flex items-center justify-between">
                        <div className="flex gap-0.5">
                          {[...Array(5)].map((_, i) => (
                            <svg key={i} className={`w-2.5 h-2.5 ${i < rating ? 'text-orange-500 fill-orange-500' : 'text-gray-400'}`} viewBox="0 0 20 20" fill="currentColor">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          ))}
                        </div>
                      </div>
                      <p className="text-white/80 text-[9px] font-medium mt-1 flex items-center line-clamp-1">
                        <MapPin className="w-2.5 h-2.5 mr-1" />
                        {card.agencyName || 'Agency'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>


        {/* MY WISHLISTS LISTING SECTION */}
        <div className="pt-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <h2 className="text-2xl font-bold text-gray-900">My Wishlists</h2>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input 
                  placeholder="Search Wishlists" 
                  className="pl-9 pr-4 py-2 w-full md:w-64 rounded-xl border-gray-200 bg-white shadow-sm text-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="relative inline-block">
                <select 
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="recent">Recently Updated</option>
                  <option value="name_asc">Name (A-Z)</option>
                  <option value="name_desc">Name (Z-A)</option>
                </select>
                <Button variant="outline" className="border-gray-200 rounded-xl bg-white text-gray-600 shadow-sm text-sm font-semibold hover:bg-gray-50 pointer-events-none">
                  Sort by: {sortBy === 'recent' ? 'Recently Updated' : sortBy === 'name_asc' ? 'Name (A-Z)' : 'Name (Z-A)'}
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </div>
              <div className="flex bg-orange-50 p-1 rounded-xl">
                <button className="p-1.5 bg-white text-orange-500 rounded-lg shadow-sm"><LayoutGrid className="w-4 h-4" /></button>
                <button className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg"><List className="w-4 h-4" /></button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredItems.map((item, index) => {
              // Extract main image safely
              const mainImage = (item.photos && item.photos.length > 0) ? item.photos[0] : 
                               (item.placesCovered && item.placesCovered.length > 0 && item.placesCovered[0].imageUrls && item.placesCovered[0].imageUrls.length > 0) 
                               ? item.placesCovered[0].imageUrls[0] : '';
              
              const optimizedImage = mainImage ? optimizeImageUrl(mainImage, { quality: 80, format: 'auto' }) : fallbackImages[index % fallbackImages.length];
              
              // Real stats for the listing
              const placesCount = item.placesCovered?.length || 0;
              const duration = item.duration || item.itinerary?.length || 0;

              return (
                <div key={item.id} className="bg-white rounded-2xl shadow-[0_2px_15px_rgb(0,0,0,0.06)] border border-gray-100 overflow-hidden flex flex-col group cursor-pointer hover:shadow-lg transition-all" onClick={() => onView(item)}>
                  {/* Image Header */}
                  <div className="relative h-44 overflow-hidden">
                    <img src={optimizedImage} alt={item.title || 'Destination'} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <button className="absolute top-3 right-3 text-white hover:text-red-500 p-1.5 bg-black/40 hover:bg-black/60 rounded-md transition-colors z-10" onClick={(e) => { e.stopPropagation(); onWishlistToggle(item.id, e); }} title="Remove from Wishlist">
                      <Trash2 className="w-4 h-4" />
                    </button>
                    {/* Floating Heart Button */}
                    <button 
                      onClick={(e) => { e.stopPropagation(); onWishlistToggle(item.id, e); }}
                      className="absolute -bottom-4 right-4 bg-white p-2.5 rounded-full shadow-md text-red-500 hover:scale-110 transition-transform z-10"
                    >
                      <Heart className="w-4 h-4 fill-current" />
                    </button>
                  </div>
                  
                  {/* Card Body */}
                  <div className="p-4 pt-6 flex-1 flex flex-col">
                    <h3 className="font-bold text-gray-900 mb-1 line-clamp-1">{item.title}</h3>
                    <p className="text-[11px] text-gray-500 font-medium mb-4">
                      {placesCount} Place{placesCount !== 1 ? 's' : ''} {duration > 0 ? `• ${duration} Days` : ''}
                    </p>
                    
                    {/* Card Footer */}
                    <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-between">
                      <div className="flex items-center text-gray-400 text-[10px] font-medium line-clamp-1">
                        <MapPin className="w-3.5 h-3.5 mr-1.5" />
                        {item.agencyName || 'Agency'}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Create New Wishlist Dashed Card */}
            <div onClick={onExplore} className="border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center p-8 text-center min-h-[300px] hover:bg-gray-50 cursor-pointer transition-colors group">
              <div className="w-12 h-12 rounded-full bg-[#FF6B00] flex items-center justify-center text-white mb-4 shadow-lg shadow-orange-500/30 group-hover:scale-110 transition-transform">
                <Plus className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-gray-900 mb-2">Create New Wishlist</h3>
              <p className="text-xs text-gray-500 font-medium">Start adding your dream destinations now!</p>
            </div>
          </div>
        </div>

        {/* BOTTOM BANNER */}
        <div className="mt-12 mb-8 bg-[#FFF4ED] rounded-3xl p-8 relative overflow-hidden flex flex-col md:flex-row items-center justify-between border border-[#FFE4D6]">
          {/* Decorative dashes inside banner */}
          <svg className="absolute inset-0 w-full h-full text-orange-200/60 pointer-events-none" viewBox="0 0 1000 200" preserveAspectRatio="xMidYMid slice">
            <path d="M0,150 C300,200 600,50 1000,100" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="8 8" />
          </svg>
          
          <div className="flex items-center gap-6 z-10">
            <div className="bg-white w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm border border-orange-100 shrink-0 transform -rotate-12">
              <Send className="text-orange-500 w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-1">Dream it. Save it. Live it.</h3>
              <p className="text-sm text-gray-600 font-medium">The best journeys start with a wishlist.</p>
            </div>
          </div>
          {/* Little orange plane in top right corner of banner */}
          <Send className="absolute right-10 top-6 text-orange-400 w-5 h-5 transform -rotate-12 opacity-80" />
        </div>

      </div>
    </div>
  );
}
