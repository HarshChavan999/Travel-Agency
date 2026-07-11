'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  X,
  ChevronLeft,
  Share2,
  Trash2,
  Heart,
  Star,
  Calendar,
  Clock,
  Users,
  Utensils,
  Bus,
  Hotel,
  Car,
  Building2,
  Camera,
  Tag,
  XCircle,
  Lightbulb,
  Plus,
  MapPin,
  ExternalLink,
  Award,
  Settings,
  CheckCircle
} from 'lucide-react';
import { ComparisonPackage, useComparison } from '@/contexts/ComparisonContext';
import { optimizeImageUrl } from '@/lib/imageOptimization';

interface PackageComparisonProps {
  onBack: () => void;
  onChat: (agencyId: string, agencyName: string) => void;
  onView?: (pkg: any) => void;
}

// Color palette matching the design
const COLORS = {
  orange: { bg: 'bg-[#f97316]', text: 'text-[#f97316]', border: 'border-[#f97316]' },
  purple: { bg: 'bg-[#8b5cf6]', text: 'text-[#8b5cf6]', border: 'border-[#8b5cf6]' },
  teal: { bg: 'bg-[#14b8a6]', text: 'text-[#14b8a6]', border: 'border-[#14b8a6]' }
};

const THEMES = [COLORS.orange, COLORS.purple, COLORS.teal];

// Helpers
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

const parseList = (text?: string) => {
  if (!text) return [];
  return text.split('\n').filter(item => item.trim() !== '');
};

const getMealPlan = (inclusions?: string) => {
  if (!inclusions) return 'Meals as per itinerary';
  const meals = [];
  const incl = inclusions.toLowerCase();
  if (incl.includes('breakfast')) meals.push('Breakfast');
  if (incl.includes('lunch')) meals.push('Lunch');
  if (incl.includes('dinner')) meals.push('Dinner');
  return meals.length > 0 ? meals.join(' & ') : 'Meals as per itinerary';
};

const getTransferDetails = (inclusions?: string) => {
  if (!inclusions) return 'Airport transfers included';
  const incl = inclusions.toLowerCase();
  if (incl.includes('private transfer') || incl.includes('private cab')) return 'Private Cab';
  if (incl.includes('shared transfer')) return 'Shared Transfers';
  return 'Airport Transfers';
};

const getHotelType = (pkg: ComparisonPackage) => {
  const types = pkg.hotelTypes || ['3★ Hotels'];
  // Convert standard strings to the styled format if possible
  if (types[0].includes('3') || types[0].toLowerCase().includes('three')) return '3★ Hotels';
  if (types[0].includes('4') || types[0].toLowerCase().includes('four')) return '4★ Resorts';
  if (types[0].includes('5') || types[0].toLowerCase().includes('five')) return '5★ Hotels';
  return types[0];
};

const getInclusionIcons = (inclusions?: string, themeClass?: string) => {
  const incl = (inclusions || '').toLowerCase();
  const icons = [];
  // Dummy logic to match design icons
  icons.push(<Car key="car" className={`w-4 h-4 ${themeClass}`} />);
  icons.push(<Building2 key="bld" className={`w-4 h-4 ${themeClass}`} />);
  icons.push(<Utensils key="food" className={`w-4 h-4 ${themeClass}`} />);
  if (incl.includes('sightseeing') || incl.includes('tour')) {
    icons.push(<Camera key="cam" className={`w-4 h-4 ${themeClass}`} />);
  }
  if (incl.includes('guide') || incl.includes('support')) {
    icons.push(<Award key="badge" className={`w-4 h-4 ${themeClass}`} />);
  }
  return icons;
};

const getExclusionsText = (exclusions?: string) => {
  if (exclusions) {
    const list = parseList(exclusions);
    return list.slice(0, 3).join(', ');
  }
  return 'Airfare, Visa, Personal Expenses'; // Default as per design
};

// Sub-components
const TableRow = ({ 
  label, 
  icon, 
  values, 
  renderValue, 
  isLast 
}: { 
  label: string, 
  icon: React.ReactNode, 
  values: ComparisonPackage[], 
  renderValue: (pkg: ComparisonPackage, index: number) => React.ReactNode, 
  isLast?: boolean 
}) => (
  <div className={`grid grid-cols-[180px_repeat(3,minmax(0,1fr))] gap-4 py-4 ${!isLast ? 'border-b border-gray-100' : ''} items-center`}>
    <div className="flex items-center gap-2.5 text-sm font-semibold text-gray-700 pl-4">
      <div className="text-gray-400">
        {icon}
      </div>
      {label}
    </div>
    {values.map((pkg, idx) => (
      <div key={pkg.id || idx} className="text-sm font-medium text-gray-600 text-center flex justify-center items-center px-2">
        {renderValue(pkg, idx)}
      </div>
    ))}
    {/* Empty columns if less than 3 packages */}
    {Array.from({ length: 3 - values.length }).map((_, idx) => (
      <div key={`empty-${idx}`} className="text-sm text-gray-300 text-center">-</div>
    ))}
  </div>
);


export default function PackageComparison({ onBack, onChat, onView }: PackageComparisonProps) {
  const { comparisonList, removeFromComparison, clearComparison, maxPackages } = useComparison();

  const handleAction = (pkg: ComparisonPackage) => {
    if (onView) {
      onView(pkg);
    } else {
      onChat(pkg.agencyId || '', pkg.agencyName || 'Travel Agency');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="w-full mx-auto flex flex-col lg:flex-row gap-6 items-start">
        
        {/* Left Sidebar */}
        <div className="w-full lg:w-[320px] shrink-0 space-y-6">
          {/* Back Button */}
          <Button 
            variant="outline" 
            onClick={onBack}
            className="w-full md:w-auto bg-white border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl justify-start px-5 py-6 shadow-sm font-bold"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Packages
          </Button>

          {/* Your Comparison List */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h3 className="font-extrabold text-gray-900 text-lg">Your Comparison</h3>
            <p className="text-xs text-gray-500 mb-5 font-medium mt-1">{comparisonList.length} of {maxPackages} packages selected</p>

            <div className="space-y-4">
              {comparisonList.map((pkg, idx) => {
                const theme = THEMES[idx % THEMES.length];
                const mainImage = getMainImage(pkg);
                const optimizedImage = mainImage ? optimizeImageUrl(mainImage, { quality: 60, format: 'auto' }) : null;
                const price = pkg.cost || pkg.price || 0;
                const currency = pkg.packageType === 'international' ? '$' : '₹';
                const location = pkg.packageType === 'international' 
                  ? pkg.countryName 
                  : (pkg.stateName || pkg.placesCovered?.map((p:any) => p.name).join(', ') || 'Domestic');

                return (
                  <div key={pkg.id} className="flex items-center gap-3 relative group bg-white">
                    {/* Color Accent Bar */}
                    <div className={`absolute -left-5 top-0 bottom-0 w-1 rounded-r-md ${theme.bg}`} />
                    
                    <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0 border border-gray-100 shadow-sm">
                      {optimizedImage ? (
                        <img src={optimizedImage} alt={pkg.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                          <Camera className="w-4 h-4 text-gray-300" />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0 pr-6">
                      <h4 className="font-bold text-gray-900 text-sm truncate">{pkg.title}</h4>
                      <p className="text-[11px] text-gray-500 truncate mb-1">{location}</p>
                      <p className="text-xs font-extrabold text-gray-900">
                        {currency}{price} <span className="text-[10px] text-gray-400 font-medium">/ person</span>
                      </p>
                    </div>

                    <button 
                      onClick={() => removeFromComparison(pkg.id)}
                      className="absolute right-0 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>

            {comparisonList.length < maxPackages && (
              <Button 
                variant="outline" 
                onClick={onBack}
                className="w-full mt-6 border-orange-200 text-orange-500 hover:bg-orange-50 hover:text-orange-600 border-dashed rounded-xl py-6 font-bold"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add More Packages
              </Button>
            )}
          </div>
        </div>

        {/* Right Main Area - Comparison Table */}
        <div className="flex-1 w-full bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          
          {/* Header */}
          <div className="px-8 py-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Compare Packages</h2>
              <p className="text-sm text-gray-500 mt-1 font-medium">Compare features, prices and inclusions side by side to find the best deal for you.</p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <Button variant="outline" className="rounded-xl border-gray-200 text-gray-700 hover:bg-gray-50 font-bold shadow-sm">
                <Share2 className="w-4 h-4 mr-2" />
                Share Comparison
              </Button>
              <Button onClick={clearComparison} variant="outline" className="rounded-xl border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-red-600 font-bold shadow-sm">
                <Trash2 className="w-4 h-4 mr-2" />
                Clear All
              </Button>
            </div>
          </div>

          <div className="p-8 overflow-x-auto">
            <div className="min-w-[800px]">
              {/* Table Top Row (Images & Basic Info) */}
              <div className="grid grid-cols-[180px_repeat(3,minmax(0,1fr))] gap-4 mb-6">
                <div className="flex items-center justify-center flex-col">
                  <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mb-3">
                    <MapPin className="w-6 h-6 text-orange-500" />
                  </div>
                  <span className="font-extrabold text-gray-900 text-sm">PACKAGES</span>
                </div>
                
                {comparisonList.map((pkg, idx) => {
                  const theme = THEMES[idx % THEMES.length];
                  const mainImage = getMainImage(pkg);
                  const optimizedImage = mainImage ? optimizeImageUrl(mainImage, { quality: 80, format: 'auto' }) : null;
                  const price = pkg.cost || pkg.price || 0;
                  const currency = pkg.packageType === 'international' ? '$' : '₹';
                  const location = pkg.packageType === 'international' 
                    ? pkg.countryName 
                    : (pkg.stateName || pkg.placesCovered?.map((p:any) => p.name).join(', ') || 'Domestic');
                  
                  return (
                    <div key={pkg.id} className="bg-white rounded-2xl border border-gray-100 shadow-[0_2px_15px_rgb(0,0,0,0.04)] overflow-hidden">
                      <div className="relative h-40">
                        {optimizedImage ? (
                          <img src={optimizedImage} alt={pkg.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                            <Camera className="w-8 h-8 text-gray-300" />
                          </div>
                        )}
                        <button className="absolute top-3 right-3 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md text-red-500 hover:scale-110 transition-transform">
                          <Heart className="w-4 h-4 fill-current" />
                        </button>
                      </div>
                      <div className="p-5">
                        <h3 className="font-bold text-gray-900 text-sm mb-1 truncate">{pkg.title}</h3>
                        <p className="text-[11px] text-gray-500 flex items-center mb-3 truncate">
                          <MapPin className="w-3 h-3 mr-1" />
                          {location}
                        </p>
                        <p className={`text-base font-extrabold ${theme.text} mb-1.5`}>
                          {currency}{price} <span className="text-[10px] text-gray-400 font-medium">/ person</span>
                        </p>
                        <div className="flex items-center text-[10px] text-gray-500 font-medium">
                          <Star className="w-3 h-3 text-orange-400 fill-orange-400 mr-1" />
                          <span className="text-gray-900 font-bold mr-1">{pkg.rating || 4.5}</span>
                          ({pkg.reviewsCount || Math.floor(Math.random() * 200 + 50)} reviews)
                        </div>
                      </div>
                    </div>
                  );
                })}

                {Array.from({ length: 3 - comparisonList.length }).map((_, idx) => (
                  <div key={`empty-card-${idx}`} className="border-2 border-dashed border-gray-100 rounded-2xl bg-gray-50/50 flex items-center justify-center min-h-[250px]">
                    <p className="text-sm font-bold text-gray-400">Empty Slot</p>
                  </div>
                ))}
              </div>

              {/* Data Rows */}
              {comparisonList.length > 0 && (
                <div className="border border-gray-100 rounded-2xl overflow-hidden bg-white shadow-sm">
                <TableRow
                  label="Duration"
                  icon={<Calendar className="w-4 h-4" />}
                  values={comparisonList}
                  renderValue={(pkg, idx) => {
                    const theme = THEMES[idx % THEMES.length];
                    const duration = pkg.itinerary?.length || pkg.duration || 0;
                    const nights = duration > 0 ? duration - 1 : 0;
                    return <span className={theme.text}>{duration} Days / {nights} Nights</span>;
                  }}
                />
                
                <TableRow
                  label="Trip Type"
                  icon={<Star className="w-4 h-4" />}
                  values={comparisonList}
                  renderValue={(pkg, idx) => {
                    const theme = THEMES[idx % THEMES.length];
                    const type = pkg.packageType === 'international' ? 'International, Leisure' : 'Domestic, Adventure';
                    return <span className={theme.text}>{type}</span>;
                  }}
                />

                <TableRow
                  label="Best Time to Visit"
                  icon={<Clock className="w-4 h-4" />}
                  values={comparisonList}
                  renderValue={(pkg, idx) => {
                    const theme = THEMES[idx % THEMES.length];
                    const season = pkg.season || (idx % 2 === 0 ? 'Mar - Jun, Sep - Dec' : 'Apr - Oct');
                    return <span className={theme.text}>{season}</span>;
                  }}
                />

                <TableRow
                  label="Group Size"
                  icon={<Users className="w-4 h-4" />}
                  values={comparisonList}
                  renderValue={(pkg, idx) => {
                    const theme = THEMES[idx % THEMES.length];
                    return <span className={theme.text}>{2 + (idx * 2)} - {10 + (idx * 2)} People</span>;
                  }}
                />

                <TableRow
                  label="Meals"
                  icon={<Utensils className="w-4 h-4" />}
                  values={comparisonList}
                  renderValue={(pkg, idx) => {
                    const theme = THEMES[idx % THEMES.length];
                    return <span className={theme.text}>{getMealPlan(pkg.inclusions)}</span>;
                  }}
                />

                <TableRow
                  label="Transport"
                  icon={<Bus className="w-4 h-4" />}
                  values={comparisonList}
                  renderValue={(pkg, idx) => {
                    const theme = THEMES[idx % THEMES.length];
                    return <span className={theme.text}>{getTransferDetails(pkg.inclusions)}</span>;
                  }}
                />

                <TableRow
                  label="Accommodation"
                  icon={<Hotel className="w-4 h-4" />}
                  values={comparisonList}
                  renderValue={(pkg, idx) => {
                    const theme = THEMES[idx % THEMES.length];
                    return <span className={theme.text}>{getHotelType(pkg)}</span>;
                  }}
                />

                <TableRow
                  label="Inclusions"
                  icon={<CheckCircle className="w-4 h-4" />}
                  values={comparisonList}
                  renderValue={(pkg, idx) => {
                    const theme = THEMES[idx % THEMES.length];
                    return (
                      <div className="flex items-center gap-3">
                        {getInclusionIcons(pkg.inclusions, theme.text)}
                      </div>
                    );
                  }}
                />

                <TableRow
                  label="Exclusions"
                  icon={<XCircle className="w-4 h-4" />}
                  values={comparisonList}
                  renderValue={(pkg, idx) => {
                    return <span className="text-gray-500">{getExclusionsText(pkg.exclusions)}</span>;
                  }}
                />

                <TableRow
                  label="Price (Per Person)"
                  icon={<Tag className="w-4 h-4" />}
                  values={comparisonList}
                  renderValue={(pkg, idx) => {
                    const theme = THEMES[idx % THEMES.length];
                    const price = pkg.cost || pkg.price || 0;
                    const currency = pkg.packageType === 'international' ? '$' : '₹';
                    return <span className={`font-extrabold ${theme.text}`}>{currency}{price}</span>;
                  }}
                />

                <TableRow
                  label="Action"
                  icon={<ExternalLink className="w-4 h-4" />}
                  values={comparisonList}
                  isLast={true}
                  renderValue={(pkg, idx) => {
                    const theme = THEMES[idx % THEMES.length];
                    return (
                      <Button 
                        onClick={() => handleAction(pkg)}
                        className={`w-full ${theme.bg} hover:opacity-90 text-white font-bold py-5 rounded-xl shadow-sm transition-opacity`}
                      >
                        View Details <ExternalLink className="w-3.5 h-3.5 ml-2" />
                      </Button>
                    );
                  }}
                />
              </div>
              )}

            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
