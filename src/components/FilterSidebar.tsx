import React, { useState } from 'react';
import { Button } from '@/components/ui/button';

export interface FilterState {
  duration: number;
  budget: number;
  budgetCategory: string | null;
  hotelCategory: string | null;
}

interface FilterSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (filters: FilterState) => void;
  initialFilters: FilterState;
}

export default function FilterSidebar({ isOpen, onClose, onApply, initialFilters }: FilterSidebarProps) {
  const [duration, setDuration] = useState(initialFilters.duration);
  const [budget, setBudget] = useState(initialFilters.budget);
  const [budgetCategory, setBudgetCategory] = useState<string | null>(initialFilters.budgetCategory);
  const [hotelCategory, setHotelCategory] = useState<string | null>(initialFilters.hotelCategory);

  // Sync state if initialFilters change externally
  React.useEffect(() => {
    setDuration(initialFilters.duration);
    setBudget(initialFilters.budget);
    setBudgetCategory(initialFilters.budgetCategory);
    setHotelCategory(initialFilters.hotelCategory);
  }, [initialFilters]);

  if (!isOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0 z-[100]"
        onClick={onClose}
      />
      <div className="absolute right-0 top-full mt-2 w-[320px] max-w-[90vw] bg-white z-[101] shadow-[0_8px_30px_rgb(0,0,0,0.15)] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 rounded-xl border border-gray-200">
        
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
            onClick={() => {
              onApply({ duration, budget, budgetCategory, hotelCategory });
              onClose();
            }}
          >
            APPLY
          </Button>
        </div>
      </div>
    </>
  );
}
