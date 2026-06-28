import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search } from 'lucide-react';

interface SearchFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  onSearch: () => void;
}

export default function SearchFilters({
  searchTerm,
  setSearchTerm,
  onSearch
}: SearchFiltersProps) {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-lg">Search Travel Packages</CardTitle>
      </CardHeader>
      
      <CardContent>
        {/* Main Search Bar */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Label htmlFor="search" className="sr-only">Search packages</Label>
            <div className="relative">
              <Input
                id="search"
                placeholder="Search destinations, packages, activities, agencies..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                onKeyPress={(e) => e.key === 'Enter' && onSearch()}
              />
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                <Search className="h-4 w-4" />
              </div>
            </div>
          </div>
          <Button onClick={onSearch} className="bg-blue-600 hover:bg-blue-700">
            Search Packages
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}