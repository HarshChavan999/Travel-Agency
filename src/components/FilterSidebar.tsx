import React, { useState } from 'react';
import { Button } from '@/components/ui/button';

interface FilterSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function FilterSidebar({ isOpen, onClose }: FilterSidebarProps) {
  const [duration, setDuration] = useState(7);
  const [flightPreference, setFlightPreference] = useState<string | null>(null);
  const [budget, setBudget] = useState(77000);
  const [budgetCategory, setBudgetCategory] = useState<string | null>(null);
  const [hotelCategory, setHotelCategory] = useState<string | null>(null);

  if (!isOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0 z-[100]"
        onClick={onClose}
      />
      <div className="absolute right-0 top-full mt-3 w-[360px] max-w-[90vw] bg-white z-[101] shadow-[0_8px_30px_rgb(0,0,0,0.15)] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 rounded-xl border border-gray-200">
        
        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto max-h-[60vh] p-5 space-y-6 scrollbar-thin">
          
          {/* Duration */}
          <div className="space-y-3">
            <div className="flex items-baseline gap-1">
              <h3 className="text-[13px] font-semibold text-gray-900">Duration (in Nights)</h3>
              <span className="text-[11px] text-gray-500">.(1N - 7N)</span>
            </div>
            <div className="relative pt-2 px-1 pb-1">
              <input
                type="range"
                min="1"
                max="7"
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value))}
                className="w-full h-[3px] rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #81d4fa ${(duration - 1) / 6 * 100}%, #e0f2fe ${(duration - 1) / 6 * 100}%)`
                }}
              />
              <div className="absolute top-[5px] w-[14px] h-[14px] bg-white border border-gray-300 rounded-full pointer-events-none shadow-sm" style={{ left: `calc(${(duration - 1) / 6 * 100}% - 7px)` }}></div>
            </div>
          </div>
          
          <hr className="border-gray-100" />



          {/* Budget */}
          <div className="space-y-4">
            <div className="flex items-baseline gap-1">
              <h3 className="text-[13px] font-semibold text-gray-900">Budget (per person)</h3>
              <span className="text-[11px] text-gray-500">.(₹2,000 - ₹77,000)</span>
            </div>
            <div className="relative pt-2 px-1 mb-2">
              <input
                type="range"
                min="2000"
                max="77000"
                step="1000"
                value={budget}
                onChange={(e) => setBudget(parseInt(e.target.value))}
                className="w-full h-[3px] rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #81d4fa ${(budget - 2000) / 75000 * 100}%, #e0f2fe ${(budget - 2000) / 75000 * 100}%)`
                }}
              />
              <div className="absolute top-[5px] w-[14px] h-[14px] bg-white border border-gray-300 rounded-full pointer-events-none shadow-sm" style={{ left: `calc(${(budget - 2000) / 75000 * 100}% - 7px)` }}></div>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { label: '< ₹10,000', count: 37, val: '<10k' },
                { label: '₹10,000 - ₹15,000', count: 44, val: '10k-15k' },
                { label: '₹15,000 - ₹20,000', count: 39, val: '15k-20k' },
                { label: '> ₹20,000', count: 47, val: '>20k' }
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
                  {opt.label} <span className="text-gray-400 font-normal ml-0.5">({opt.count})</span>
                </button>
              ))}
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Hotel Category */}
          <div className="space-y-3 pb-4">
            <h3 className="text-[13px] font-semibold text-gray-900">Hotel Category</h3>
            <div className="flex flex-wrap gap-2">
              {[
                { label: '<3 ★', count: 1, val: '<3' },
                { label: '3 ★', count: 19, val: '3' },
                { label: '4 ★', count: 52, val: '4' },
                { label: '5 ★', count: 25, val: '5' }
              ].map((opt) => (
                <button
                  key={opt.val}
                  onClick={() => setHotelCategory(hotelCategory === opt.val ? null : opt.val)}
                  className={`px-3 py-1.5 border rounded text-[12px] transition-colors flex items-center justify-center min-w-[60px] ${
                    hotelCategory === opt.val
                      ? 'border-[#008cff] text-[#008cff] bg-[#f0f9ff]'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700 bg-white'
                  }`}
                >
                  {opt.label} <span className="text-gray-400 font-normal ml-1">({opt.count})</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer with Apply button */}
        <div className="p-4 border-t border-gray-100 bg-white flex justify-end">
          <Button 
            className="w-24 h-9 bg-[#008cff] hover:bg-[#0077e6] text-white font-bold text-[13px] rounded tracking-wide shadow-sm"
            onClick={onClose}
          >
            APPLY
          </Button>
        </div>
      </div>
    </>
  );
}
