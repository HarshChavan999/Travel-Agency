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
  ChevronLeft,
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
        <div className="flex flex-col gap-2 mb-2">
          {onBack && (
            <div>
              <Button 
                variant="ghost" 
                onClick={onBack}
                className="mb-2 -ml-2 text-gray-500 hover:text-gray-900 font-semibold hover:bg-gray-100 rounded-lg px-3 py-2 group transition-all"
              >
                <ChevronLeft className="h-4 w-4 mr-1 group-hover:-translate-x-1 transition-transform" /> Back
              </Button>
            </div>
          )}
        </div>

        {/* MY WISHLISTS LISTING SECTION */}
        <div>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Wishlists</h1>
              <p className="text-sm text-gray-500 mt-1 font-medium">Save and manage your favorite travel destinations.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full md:w-auto">
              <div className="relative flex-1 sm:flex-none">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input 
                  placeholder="Search Wishlists" 
                  className="pl-9 pr-4 py-2 w-full sm:w-56 md:w-64 rounded-xl border-gray-200 bg-white shadow-sm text-sm"
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
              let mainImage = (item.photos && item.photos.length > 0) ? item.photos[0] : 
                               (item.placesCovered && item.placesCovered.length > 0 && item.placesCovered[0].imageUrls && item.placesCovered[0].imageUrls.length > 0) 
                               ? item.placesCovered[0].imageUrls[0] : '';
              if (!mainImage && item.itinerary && item.itinerary.length > 0) {
                for (const day of item.itinerary) {
                  if (day.imageUrls && day.imageUrls.length > 0) {
                    mainImage = day.imageUrls[0];
                    break;
                  } else if (day.imageUrl) {
                    mainImage = day.imageUrl;
                    break;
                  }
                }
              }
              
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

      </div>
    </div>
  );
}
