import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { event } from '@/lib/gtag';
import { SlidersHorizontal, X, RotateCcw } from 'lucide-react';

export interface FilterState {
  duration: number;
  budget: number;
  budgetCategory: string | null;
  hotelCategory: string | null;
}

export interface CategoryFilterOption {
  category: string;
  subcategory?: string;
  title: string;
}

interface FilterSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (filters: FilterState) => void;
  initialFilters: FilterState;
  selectedCategory?: CategoryFilterOption | null;
  onSelectCategory?: (category: CategoryFilterOption | null) => void;
}

const CATEGORY_OPTIONS: { id: string; label: string; icon: string; filter: CategoryFilterOption | null }[] = [
  { id: 'all', label: 'All Packages', icon: '✨', filter: null },
  { id: 'domestic', label: 'Domestic', icon: '🇮🇳', filter: { category: 'domestic', title: 'Domestic Packages' } },
  { id: 'international', label: 'International', icon: '✈️', filter: { category: 'international', title: 'International Packages' } },
  { id: 'family', label: 'Family Tour', icon: '👨‍👩‍👧', filter: { category: 'tourCategory', subcategory: 'Family Tour', title: 'Family Tour' } },
  { id: 'honeymoon', label: 'Honeymoon', icon: '💍', filter: { category: 'tourCategory', subcategory: 'Honeymoon Tour', title: 'Honeymoon Tour' } },
  { id: 'adventure', label: 'Adventure', icon: '🧗', filter: { category: 'experiences', subcategory: 'Adventure', title: 'Adventure' } }
];

export default function FilterSidebar({ 
  isOpen, 
  onClose, 
  onApply, 
  initialFilters,
  selectedCategory = null,
  onSelectCategory
}: FilterSidebarProps) {
  const [duration, setDuration] = useState(initialFilters.duration);
  const [budget, setBudget] = useState(initialFilters.budget);
  const [budgetCategory, setBudgetCategory] = useState<string | null>(initialFilters.budgetCategory);
  const [hotelCategory, setHotelCategory] = useState<string | null>(initialFilters.hotelCategory);
  const [tempCategory, setTempCategory] = useState<CategoryFilterOption | null>(selectedCategory);

  // Sync state if initialFilters or selectedCategory change externally
  React.useEffect(() => {
    setDuration(initialFilters.duration);
    setBudget(initialFilters.budget);
    setBudgetCategory(initialFilters.budgetCategory);
    setHotelCategory(initialFilters.hotelCategory);
    setTempCategory(selectedCategory || null);
  }, [initialFilters, selectedCategory]);

  if (!isOpen) return null;

  const handleResetAll = () => {
    setDuration(7);
    setBudget(77000);
    setBudgetCategory(null);
    setHotelCategory(null);
    setTempCategory(null);
    onSelectCategory?.(null);
    onApply({ duration: 7, budget: 77000, budgetCategory: null, hotelCategory: null });
    onClose();
  };

  const handleApplyAll = () => {
    event({
      action: 'apply_filters',
      category: 'search_filter',
      label: `category:${tempCategory?.title || 'all'},duration:${duration}N,budget:${budget},cat:${budgetCategory || 'all'},hotel:${hotelCategory || 'all'}`,
    });
    onSelectCategory?.(tempCategory);
    onApply({ duration, budget, budgetCategory, hotelCategory });
    onClose();
  };

  const isCategorySelected = (optionFilter: CategoryFilterOption | null) => {
    if (!tempCategory && !optionFilter) return true;
    if (!tempCategory || !optionFilter) return false;
    return tempCategory.category === optionFilter.category && tempCategory.subcategory === optionFilter.subcategory;
  };

  return (
    <>
      {/* Dark Backdrop Overlay */}
      <div 
        className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
        onClick={onClose}
      />

      {/* =========================================================
          MOBILE VIEW: Sliding Window from Down (Bottom Sheet Drawer)
          ========================================================= */}
      <div className="sm:hidden fixed inset-x-0 bottom-0 z-[101] bg-white rounded-t-[28px] max-h-[85vh] flex flex-col shadow-[0_-12px_40px_rgba(0,0,0,0.25)] animate-in slide-in-from-bottom duration-300 overflow-hidden border-t border-slate-100">
        {/* Drag / Pull Handle */}
        <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mt-3 shrink-0" />

        {/* Header */}
        <div className="px-5 pt-3 pb-3 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center shrink-0 border border-orange-100">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 leading-tight">Filter Packages</h2>
              <p className="text-[11px] text-slate-400 font-medium">Choose travel style, budget & duration</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors text-sm font-bold"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Filter Options */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 scrollbar-thin">
          {/* Section 1: Travel Category / Style */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">Travel Style & Category</h3>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORY_OPTIONS.map((opt) => {
                const selected = isCategorySelected(opt.filter);
                return (
                  <button
                    key={opt.id}
                    onClick={() => setTempCategory(opt.filter)}
                    className={`px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border text-left cursor-pointer ${
                      selected
                        ? 'bg-orange-50 border-orange-400 text-orange-600 shadow-xs ring-1 ring-orange-400/50'
                        : 'bg-slate-50/70 border-slate-200/80 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span className="text-base">{opt.icon}</span>
                    <span className="truncate">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Section 2: Duration */}
          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">Duration</h3>
              <span className="text-xs text-orange-600 font-bold bg-orange-50 px-2 py-0.5 rounded-md">
                Up to {duration} Nights
              </span>
            </div>
            <div className="pt-2 px-1 pb-1">
              <input
                type="range"
                min="1"
                max="7"
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value))}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-slate-200 accent-orange-500"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-bold mt-1 px-1">
                <span>1 Night</span>
                <span>3 Nights</span>
                <span>5 Nights</span>
                <span>7+ Nights</span>
              </div>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Section 3: Budget */}
          <div className="space-y-2.5">
            <div className="flex items-baseline justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">Budget (per person)</h3>
              <span className="text-xs text-orange-600 font-bold bg-orange-50 px-2 py-0.5 rounded-md">
                Up to ₹{budget.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="pt-1 px-1 mb-2">
              <input
                type="range"
                min="2000"
                max="77000"
                step="1000"
                value={budget}
                onChange={(e) => setBudget(parseInt(e.target.value))}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-slate-200 accent-orange-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: '< ₹10,000', val: '<10k' },
                { label: '₹10k - ₹15k', val: '10k-15k' },
                { label: '₹15k - ₹20k', val: '15k-20k' },
                { label: '> ₹20,000', val: '>20k' }
              ].map((opt) => (
                <button
                  key={opt.val}
                  onClick={() => setBudgetCategory(budgetCategory === opt.val ? null : opt.val)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border text-center cursor-pointer ${
                    budgetCategory === opt.val
                      ? 'bg-orange-50 border-orange-400 text-orange-600 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Section 4: Hotel Category */}
          <div className="space-y-2.5 pb-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">Hotel Category</h3>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: '<3 ★', val: '<3' },
                { label: '3 ★', val: '3' },
                { label: '4 ★', val: '4' },
                { label: '5 ★', val: '5' }
              ].map((opt) => (
                <button
                  key={opt.val}
                  onClick={() => setHotelCategory(hotelCategory === opt.val ? null : opt.val)}
                  className={`py-2 px-1 rounded-xl text-xs font-bold transition-all border text-center cursor-pointer ${
                    hotelCategory === opt.val
                      ? 'bg-orange-50 border-orange-400 text-orange-600 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer with Reset & Apply */}
        <div className="p-4 border-t border-slate-100 bg-white/95 backdrop-blur-md flex items-center gap-3 shrink-0">
          <button 
            onClick={handleResetAll}
            className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset All</span>
          </button>
          <button 
            onClick={handleApplyAll}
            className="flex-[2] h-11 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black text-xs shadow-md shadow-orange-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
          >
            Apply Filters
          </button>
        </div>
      </div>

      {/* =========================================================
          DESKTOP VIEW: Popover Dropdown under Filter Button
          ========================================================= */}
      <div className="hidden sm:flex absolute right-0 top-full mt-2 w-[320px] max-w-[90vw] bg-white z-[101] shadow-[0_8px_30px_rgb(0,0,0,0.15)] flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 rounded-xl border border-gray-200">
        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto max-h-[60vh] p-4 space-y-4 scrollbar-thin">
          {/* Duration */}
          <div className="space-y-2">
            <div className="flex items-baseline gap-1 justify-between">
              <h3 className="text-[13px] font-semibold text-gray-900">Duration (in Nights)</h3>
              <span className="text-[12px] text-blue-600 font-medium">Up to {duration}N</span>
            </div>
            <div className="relative pt-2 px-1 pb-1">
              <input
                type="range"
                min="1"
                max="7"
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value))}
                className="w-full h-[3px] rounded-lg appearance-none cursor-pointer bg-gray-200"
                style={{
                  background: `linear-gradient(to right, #81d4fa ${(duration - 1) / 6 * 100}%, #e0f2fe ${(duration - 1) / 6 * 100}%)`
                }}
              />
            </div>
          </div>
          
          <hr className="border-gray-100" />

          {/* Budget */}
          <div className="space-y-2">
            <div className="flex items-baseline gap-1 justify-between">
              <h3 className="text-[13px] font-semibold text-gray-900">Budget (per person)</h3>
              <span className="text-[12px] text-blue-600 font-medium">Up to ₹{budget.toLocaleString()}</span>
            </div>
            <div className="relative pt-2 px-1 mb-2">
              <input
                type="range"
                min="2000"
                max="77000"
                step="1000"
                value={budget}
                onChange={(e) => setBudget(parseInt(e.target.value))}
                className="w-full h-[3px] rounded-lg appearance-none cursor-pointer bg-gray-200"
                style={{
                  background: `linear-gradient(to right, #81d4fa ${(budget - 2000) / 75000 * 100}%, #e0f2fe ${(budget - 2000) / 75000 * 100}%)`
                }}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { label: '< ₹10,000', val: '<10k' },
                { label: '₹10,000 - ₹15,000', val: '10k-15k' },
                { label: '₹15,000 - ₹20,000', val: '15k-20k' },
                { label: '> ₹20,000', val: '>20k' }
              ].map((opt) => (
                <button
                  key={opt.val}
                  onClick={() => setBudgetCategory(budgetCategory === opt.val ? null : opt.val)}
                  className={`px-3 py-1.5 border rounded text-[12px] transition-colors ${
                    budgetCategory === opt.val
                      ? 'border-[#008cff] text-[#008cff] bg-[#f0f9ff]'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700 bg-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Hotel Category */}
          <div className="space-y-2 pb-2">
            <h3 className="text-[13px] font-semibold text-gray-900">Hotel Category</h3>
            <div className="flex flex-wrap gap-2">
              {[
                { label: '<3 ★', val: '<3' },
                { label: '3 ★', val: '3' },
                { label: '4 ★', val: '4' },
                { label: '5 ★', val: '5' }
              ].map((opt) => (
                <button
                  key={opt.val}
                  onClick={() => setHotelCategory(hotelCategory === opt.val ? null : opt.val)}
                  className={`px-3 py-1.5 border rounded text-[12px] transition-colors flex items-center justify-center min-w-[50px] ${
                    hotelCategory === opt.val
                      ? 'border-[#008cff] text-[#008cff] bg-[#f0f9ff]'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700 bg-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer with Apply button */}
        <div className="p-3 border-t border-gray-100 bg-white flex justify-end">
          <Button 
            className="w-20 h-8 bg-[#008cff] hover:bg-[#0077e6] text-white font-bold text-[12px] rounded tracking-wide shadow-sm"
            onClick={handleApplyAll}
          >
            APPLY
          </Button>
        </div>
      </div>
    </>
  );
}

