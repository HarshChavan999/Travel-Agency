'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export interface ComparisonPackage {
  id: string;
  title: string;
  description?: string;
  cost: string | number;
  price?: string | number;
  packageType: 'domestic' | 'international';
  stateName?: string;
  countryName?: string;
  duration?: number;
  itinerary?: any[];
  placesCovered?: any[];
  hotelTypes?: string[];
  inclusions?: string;
  exclusions?: string;
  agencyName?: string;
  agencyId?: string;
  agencyData?: any;
  photos?: string[];
  rating?: number;
  reviewsCount?: number;
  tourCategories?: string[];
  mealsIncluded?: boolean;
  transferIncluded?: boolean;
  sightseeingIncluded?: boolean;
  hotelDetails?: {
    city: string;
    hotels: string[];
    nights: number;
    rating?: number;
  }[];
}

interface ComparisonContextType {
  comparisonList: ComparisonPackage[];
  addToComparison: (pkg: ComparisonPackage) => boolean;
  removeFromComparison: (id: string) => void;
  clearComparison: () => void;
  isInComparison: (id: string) => boolean;
  canAddMore: boolean;
  maxPackages: number;
}

const ComparisonContext = createContext<ComparisonContextType | undefined>(undefined);

const MAX_PACKAGES = 3;
const STORAGE_KEY = 'travel_comparison_list';

export const ComparisonProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [comparisonList, setComparisonList] = useState<ComparisonPackage[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setComparisonList(parsed);
      } catch (e) {
        console.error('Error parsing comparison list:', e);
      }
    }
    setIsHydrated(true);
  }, []);

  // Save to localStorage whenever comparisonList changes
  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(comparisonList));
    }
  }, [comparisonList, isHydrated]);

  const addToComparison = useCallback((pkg: ComparisonPackage): boolean => {
    if (comparisonList.length >= MAX_PACKAGES) {
      return false;
    }
    
    if (comparisonList.some(p => p.id === pkg.id)) {
      return true; // Already in comparison
    }

    setComparisonList(prev => [...prev, pkg]);
    return true;
  }, [comparisonList]);

  const removeFromComparison = useCallback((id: string) => {
    setComparisonList(prev => prev.filter(p => p.id !== id));
  }, []);

  const clearComparison = useCallback(() => {
    setComparisonList([]);
  }, []);

  const isInComparison = useCallback((id: string) => {
    return comparisonList.some(p => p.id === id);
  }, [comparisonList]);

  const canAddMore = comparisonList.length < MAX_PACKAGES;

  return (
    <ComparisonContext.Provider value={{
      comparisonList,
      addToComparison,
      removeFromComparison,
      clearComparison,
      isInComparison,
      canAddMore,
      maxPackages: MAX_PACKAGES
    }}>
      {children}
    </ComparisonContext.Provider>
  );
};

export const useComparison = () => {
  const context = useContext(ComparisonContext);
  if (context === undefined) {
    throw new Error('useComparison must be used within a ComparisonProvider');
  }
  return context;
};
