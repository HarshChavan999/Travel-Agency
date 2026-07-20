"use client";
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import PackageDetailView from '@/components/PackageDetailView';



export default function PackageClientView({ listing }: { listing: any }) {
  const router = useRouter();
  
  return (
    <div className="min-h-screen flex flex-col">
      <header className="header-transition bg-white text-gray-900 z-[100] relative shadow-sm border-b border-gray-200 min-h-[72px] flex items-center py-2 md:py-0">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 px-6 w-full h-full">
          {/* Logo */}
          <div className="flex items-center gap-6 flex-1 w-full h-full py-2">
            <div 
              className="flex items-center gap-1 sm:gap-2 font-black tracking-tight cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => router.push('/')}
            >
              <img src="/tripdm-logo.png" alt="TripDM Logo" className="h-20 w-auto object-contain" />
            </div>
          </div>

          {/* Right Links */}
          <div className="flex items-center gap-5 w-full md:w-auto justify-between md:justify-end flex-wrap pl-4">
            <span
              className="cursor-pointer transition-all text-[15px] font-medium text-gray-800 hover:text-orange-500"
              onClick={() => router.push('/')}
            >
              Home
            </span>
            <button 
              onClick={() => router.push('/')}
              className="flex items-center gap-2 text-[15px] font-medium text-gray-800 hover:text-orange-500 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 bg-gray-50">
        <PackageDetailView 
          listing={listing} 
          onBack={() => router.push('/')}
          onBook={() => router.push(`/?action=book&packageId=${listing.id}`)}
          onChat={() => router.push(`/?action=chat&agencyId=${listing.agencyId}&agencyName=${encodeURIComponent(listing.agencyName || 'Travel Agency')}`)}
          onWishlist={() => {}}
          isWishlisted={false}
        />
      </div>



    </div>
  );
}
