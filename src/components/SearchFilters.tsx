import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Select } from '@/components/ui/select';

interface SearchFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filters: {
    priceRange: [number, number];
    duration: string;
    type: string;
    rating: number;
    destination: string;
    packageType: string;
    amenities: string[];
  };
  setFilters: (filters: any) => void;
  showFilters: boolean;
  setShowFilters: (show: boolean) => void;
  onSearch: () => void;
}

const packageTypes = [
  { value: '', label: 'All Types' },
  { value: 'international', label: '🌍 International' },
  { value: 'domestic', label: '🏠 Domestic' }
];

const packageCategories = [
  { value: '', label: 'All Categories' },
  { value: 'adventure', label: '🏔️ Adventure' },
  { value: 'luxury', label: '🏨 Luxury' },
  { value: 'budget', label: '💰 Budget' },
  { value: 'cultural', label: '🏛️ Cultural' },
  { value: 'family', label: '👨‍👩‍👧‍👦 Family' },
  { value: 'romantic', label: '💘 Romantic' },
  { value: 'honeymoon', label: '💑 Honeymoon' },
  { value: 'group', label: '👥 Group' }
];

const amenities = [
  'Wi-Fi',
  'Breakfast Included',
  'Airport Transfer',
  'Guide Included',
  'Travel Insurance',
  '24/7 Support',
  'Customizable Itinerary',
  'All Inclusive'
];

const durationOptions = [
  { value: '', label: 'All Durations' },
  { value: '1-3', label: '1-3 days' },
  { value: '4-7', label: '4-7 days' },
  { value: '8-14', label: '1-2 weeks' },
  { value: '15+', label: '2+ weeks' }
];

export default function SearchFilters({
  searchTerm,
  setSearchTerm,
  filters,
  setFilters,
  showFilters,
  setShowFilters,
  onSearch
}: SearchFiltersProps) {
  const handlePriceChange = (values: number[]) => {
    setFilters({ ...filters, priceRange: [values[0], values[1]] });
  };

  const handleAmenityToggle = (amenity: string) => {
    const currentAmenities = filters.amenities || [];
    const newAmenities = currentAmenities.includes(amenity)
      ? currentAmenities.filter(a => a !== amenity)
      : [...currentAmenities, amenity];
    setFilters({ ...filters, amenities: newAmenities });
  };

  const clearFilters = () => {
    setFilters({
      priceRange: [0, 10000],
      duration: '',
      type: '',
      rating: 0,
      destination: '',
      packageType: '',
      amenities: []
    });
    setSearchTerm('');
  };

  const applyFilters = () => {
    onSearch();
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg">Search & Filters</CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              {showFilters ? 'Hide Filters' : 'Show Filters'} {showFilters ? '▲' : '▼'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={clearFilters}
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              Clear All
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Main Search Bar */}
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="flex-1">
            <Label htmlFor="search" className="sr-only">Search packages</Label>
            <div className="relative">
              <Input
                id="search"
                placeholder="Search destinations, packages, activities..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                onKeyPress={(e) => e.key === 'Enter' && onSearch()}
              />
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                🔍
              </div>
            </div>
          </div>
          <Button onClick={applyFilters} className="bg-blue-600 hover:bg-blue-700">
            Search Packages
          </Button>
        </div>

        {/* Quick Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-2 block">Package Type</Label>
            <Select
              value={filters.packageType}
              onChange={(e) => setFilters({ ...filters, packageType: e.target.value })}
            >
              {packageTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label className="text-sm font-medium text-gray-700 mb-2 block">Category</Label>
            <Select
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
            >
              {packageCategories.map((category) => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label className="text-sm font-medium text-gray-700 mb-2 block">Duration</Label>
            <Select
              value={filters.duration}
              onChange={(e) => setFilters({ ...filters, duration: e.target.value })}
            >
              {durationOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label className="text-sm font-medium text-gray-700 mb-2 block">Min Rating</Label>
            <Select
              value={filters.rating.toString()}
              onChange={(e) => setFilters({ ...filters, rating: parseInt(e.target.value) })}
            >
              <option value="0">Any Rating</option>
              <option value="3">3+ Stars</option>
              <option value="4">4+ Stars</option>
              <option value="5">5 Stars</option>
            </Select>
          </div>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="border-t pt-4 animate-in slide-in-from-top-2 duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Price Range */}
              <div className="space-y-4">
                <Label className="text-sm font-medium text-gray-700">Price Range (USD)</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="minPrice" className="text-xs text-gray-600">Min Price</Label>
                    <Input
                      id="minPrice"
                      type="number"
                      placeholder="0"
                      value={filters.priceRange[0]}
                      onChange={(e) => setFilters({ 
                        ...filters, 
                        priceRange: [parseInt(e.target.value) || 0, filters.priceRange[1]] 
                      })}
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="maxPrice" className="text-xs text-gray-600">Max Price</Label>
                    <Input
                      id="maxPrice"
                      type="number"
                      placeholder="10000"
                      value={filters.priceRange[1]}
                      onChange={(e) => setFilters({ 
                        ...filters, 
                        priceRange: [filters.priceRange[0], parseInt(e.target.value) || 10000] 
                      })}
                      className="text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Destination */}
              <div className="space-y-4">
                <Label htmlFor="destination" className="text-sm font-medium text-gray-700">Destination</Label>
                <Input
                  id="destination"
                  placeholder="Enter destination (e.g., Bali, Paris)"
                  value={filters.destination}
                  onChange={(e) => setFilters({ ...filters, destination: e.target.value })}
                />
              </div>

              {/* Package Type */}
              <div className="space-y-4">
                <Label className="text-sm font-medium text-gray-700">Package Type</Label>
                <div className="space-y-2">
                  {packageTypes.slice(1).map((type) => (
                    <label key={type.value} className="flex items-center space-x-2">
                      <Checkbox
                        checked={filters.packageType === type.value}
                        onChange={(e) => {
                          const target = e.target as HTMLInputElement;
                          setFilters({ 
                            ...filters, 
                            packageType: target.checked ? type.value : '' 
                          });
                        }}
                      />
                      <span className="text-sm">{type.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Amenities */}
              <div className="space-y-4">
                <Label className="text-sm font-medium text-gray-700">Amenities</Label>
                <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                  {amenities.map((amenity) => (
                    <label key={amenity} className="flex items-center space-x-2 text-sm">
                      <Checkbox
                        checked={filters.amenities.includes(amenity)}
                        onChange={(e) => {
                          const target = e.target as HTMLInputElement;
                          if (target.checked) {
                            setFilters({ 
                              ...filters, 
                              amenities: [...filters.amenities, amenity] 
                            });
                          } else {
                            setFilters({ 
                              ...filters, 
                              amenities: filters.amenities.filter(a => a !== amenity) 
                            });
                          }
                        }}
                      />
                      <span>{amenity}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Filter Actions */}
            <div className="flex justify-end space-x-2 mt-6 pt-4 border-t">
              <Button
                variant="outline"
                onClick={clearFilters}
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                Clear Filters
              </Button>
              <Button onClick={applyFilters} className="bg-green-600 hover:bg-green-700">
                Apply Filters
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}