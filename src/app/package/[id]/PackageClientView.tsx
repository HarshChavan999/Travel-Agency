"use client";
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import PackageDetailView from '@/components/PackageDetailView';



export default function PackageClientView({ listing }: { listing: any }) {
  const router = useRouter();
  
  return (
    <div className="min-h-screen flex flex-col">
      <header className="header-transition text-white z-[100] relative bg-[#0B0F19] shadow-sm border-b border-gray-800 h-16 flex items-center">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 w-full h-full">
          <div 
            className="flex items-center cursor-pointer"
            onClick={() => router.push('/')}
          >
            <img src="/tripdm-logo.png" alt="TripDM Logo" className="h-16 w-auto object-contain" />
          </div>
          
          <button 
            onClick={() => router.push('/')}
            className="flex items-center gap-2 text-sm font-semibold hover:text-orange-400 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </button>
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
