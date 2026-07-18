'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PackageDetailView from '@/components/PackageDetailView';
import { MapPin, User, Scale, Heart, MessageSquare, Shield, Search } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function PackageClientView({ listing }: { listing: any }) {
  const router = useRouter();
  const { userData } = useAuth();
  const [pincode, setPincode] = useState<string>('Select City');

  useEffect(() => {
    const fetchIpPincode = async () => {
      try {
        const res = await fetch('https://ipwho.is/');
        const data = await res.json();
        if (data && data.postal) {
          setPincode(`Pincode ${data.postal}`);
        } else if (data && data.city) {
          setPincode(data.city);
        }
      } catch (e) {
        console.error('IP geolocation fallback error:', e);
      }
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            let gotPincode = false;

            // 1. Try BigDataCloud
            try {
              const bdcResponse = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`);
              const bdcData = await bdcResponse.json();
              if (bdcData && bdcData.postcode) {
                setPincode(`Pincode ${bdcData.postcode}`);
                gotPincode = true;
              }
            } catch (err) {
              console.error('BigDataCloud geocoding error:', err);
            }

            // 2. Try Nominatim (secondary fallback)
            if (!gotPincode) {
              try {
                const nomResponse = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
                const nomData = await nomResponse.json();
                if (nomData && nomData.address && nomData.address.postcode) {
                  setPincode(`Pincode ${nomData.address.postcode}`);
                  gotPincode = true;
                }
              } catch (err) {
                console.error('Nominatim geocoding error:', err);
              }
            }

            // 3. Try IP geolocation if geocoding requests failed
            if (!gotPincode) {
              await fetchIpPincode();
            }
          } catch (error) {
            console.error('Error in coordinates geocoding waterfall:', error);
            await fetchIpPincode();
          }
        },
        async (error) => {
          console.warn('Geolocation permission denied or error. Falling back to IP-based location:', error);
          await fetchIpPincode();
        },
        { timeout: 8000 }
      );
    } else {
      fetchIpPincode();
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <header className="header-transition text-white z-[100] relative bg-[#0B0F19] shadow-sm border-b border-gray-800 min-h-16 flex items-center py-2 md:py-0">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 px-4 w-full h-full">
          {/* Logo & Search */}
          <div className="flex items-center gap-4 flex-1 w-full h-full py-2">
            <div 
              className="flex items-center gap-1 sm:gap-2 font-extrabold tracking-tight cursor-pointer"
              onClick={() => router.push('/')}
            >
              <img src="/tripdm-logo.png" alt="TripDM Logo" className="h-16 w-auto object-contain" />
            </div>
            
            <div className="relative w-full max-w-xl hidden sm:block cursor-text" onClick={() => router.push('/')}>
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input 
                type="text"
                readOnly
                placeholder="Search your Holiday Destination"
                className="w-full pl-10 pr-4 py-1.5 rounded-full text-black bg-white focus:outline-none border-none text-sm h-10 shadow-inner cursor-pointer"
              />
            </div>
          </div>

          {/* Right Icons */}
          <div className="flex items-center gap-2.5 w-full md:w-auto overflow-x-auto hide-scrollbar pb-2 md:pb-0 pt-1 md:pt-0 shrink-0">
            {/* Location */}
            <div className="flex items-center gap-2 text-xs text-white select-none bg-white/5 border border-white/10 px-3.5 py-1.5 rounded-full hover-lift shadow-sm transition-all cursor-pointer shrink-0" onClick={() => router.push('/')}>
              <MapPin className="h-4 w-4 text-orange-500" />
              <div className="flex flex-col leading-tight hidden sm:flex">
                <span className="font-bold text-gray-200">{pincode}</span>
                <span className="text-[9px] text-gray-400 font-medium">Location</span>
              </div>
            </div>

            {/* Compare */}
            <div className="flex items-center gap-2 cursor-pointer transition-all text-xs bg-white/5 border border-white/10 px-3.5 py-1.5 rounded-full hover-lift shadow-sm hover:text-orange-400 shrink-0" onClick={() => router.push(`/?view=compare&returnUrl=/package/${listing.id}`)}>
              <Scale className="h-4 w-4" />
              <div className="flex flex-col leading-tight hidden sm:flex">
                <span className="font-semibold text-gray-200">Compare</span>
                <span className="text-[9px] text-gray-400 font-medium">Packages</span>
              </div>
            </div>

            {/* Wishlist */}
            <div className="flex items-center gap-2 cursor-pointer transition-all text-xs bg-white/5 border border-white/10 px-3.5 py-1.5 rounded-full hover-lift shadow-sm hover:text-orange-400 shrink-0" onClick={() => router.push(`/?view=wishlist&returnUrl=/package/${listing.id}`)}>
              <Heart className="h-4 w-4" />
              <div className="flex flex-col leading-tight hidden sm:flex">
                <span className="font-semibold text-gray-200">Wishlist</span>
                <span className="text-[9px] text-gray-400 font-medium">Saved</span>
              </div>
            </div>

            {/* Messages */}
            <div className="flex items-center gap-2 cursor-pointer transition-all text-xs bg-white/5 border border-white/10 px-3.5 py-1.5 rounded-full hover-lift shadow-sm hover:text-orange-400 shrink-0" onClick={() => router.push(`/?view=messages&returnUrl=/package/${listing.id}`)}>
              <MessageSquare className="h-4 w-4" />
              <div className="flex flex-col leading-tight hidden sm:flex">
                <span className="font-semibold text-gray-200">Messages</span>
                <span className="text-[9px] text-gray-400 font-medium">Agencies</span>
              </div>
            </div>

            {/* Support */}
            <div className="!hidden flex items-center gap-2 cursor-pointer transition-all text-xs bg-white/5 border border-white/10 px-3.5 py-1.5 rounded-full hover-lift shadow-sm hover:text-orange-400 shrink-0" onClick={() => router.push('/?view=support')}>
              <Shield className="h-4 w-4" />
              <div className="flex flex-col leading-tight hidden sm:flex">
                <span className="font-semibold text-gray-200">Support</span>
                <span className="text-[9px] text-gray-400 font-medium">Help</span>
              </div>
            </div>

            {/* Profile */}
            {userData ? (
              <div className="flex items-center gap-2 cursor-pointer transition-all text-xs bg-white/5 border border-white/10 px-3.5 py-1.5 rounded-full hover-lift shadow-sm hover:text-orange-400 shrink-0 ml-2" onClick={() => router.push('/?view=profile')}>
                <User className="h-4 w-4" />
                <div className="flex flex-col leading-tight hidden sm:flex">
                  <span className="font-semibold text-gray-200">Hi, {userData.name ? userData.name.split(' ')[0] : 'User'}</span>
                  <span className="text-[9px] text-gray-400">Account</span>
                </div>
              </div>
            ) : (
              <button 
                onClick={() => router.push('/?login=true')} 
                className="bg-blue-600 hover:bg-blue-700 text-white border-0 shadow-lg px-6 py-2 h-auto text-sm font-bold tracking-wide rounded-full ml-2"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>


      <div className="max-w-7xl mx-auto px-4 mt-6">
        <PackageDetailView 
          listing={listing}
          onBack={() => router.push('/')}
          onChat={(agencyId) => {
            router.push(`/?chat=${agencyId}`);
          }}
          onBook={() => {
            router.push(`/?book=${listing.id}`);
          }}
          onWishlist={() => {
            router.push(`/?wishlist=${listing.id}`);
          }}
        />
      </div>
    </div>
  );
}
