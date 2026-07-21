'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { MapPin, User, Scale, Heart, MessageSquare, Shield, Search } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import Footer from '@/components/Footer';
import AuthModal from '@/components/AuthModal';

export default function PoliciesLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, userData, signIn, signInWithGoogle, register } = useAuth();
  const [pincode, setPincode] = useState<string>('Select City');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'signup'>('login');

  const handleAuthModalRegister = async (emailArg: string, passwordArg: string, role: 'user', data: { name: string; phone?: string }) => {
    if (register) {
      await register(emailArg, passwordArg, role, data);
    }
  };

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

  const tabs = [
    { name: 'Conditions of Use and Sale', href: '/policies/conditions-of-use' },
    { name: 'Privacy Notice', href: '/policies/privacy-notice' },
    { name: 'Internet-Based Policy', href: '/policies/internet-based-policy' },
  ];

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Global Header */}
      <header className="header-transition bg-white text-gray-900 z-[100] relative shadow-sm border-b border-gray-200 min-h-[72px] flex items-center py-2 md:py-0">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 px-6 w-full h-full">
          {/* Logo & Search */}
          <div className="flex items-center gap-6 flex-1 w-full h-full py-2">
            <div 
              className="flex items-center gap-1 sm:gap-2 font-black tracking-tight cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => router.push('/')}
            >
              <img src="/tripdm-logo.png" alt="TripDM Logo" className="h-20 w-auto object-contain" />
            </div>
            
            <div className="relative w-full max-w-xl hidden sm:block">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search your Holiday Destination" 
                className="w-full pl-10 pr-4 py-1.5 rounded-md text-black bg-gray-50 border border-gray-200 text-sm h-10 shadow-inner focus:outline-none focus:ring-2 focus:ring-orange-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    router.push('/');
                  }
                }}
              />
            </div>
          </div>

          {/* Right Links */}
          <div className="flex items-center gap-5 w-full md:w-auto justify-between md:justify-end flex-wrap pl-4">
            
            {/* Location */}
            <div className="flex items-center gap-1.5 text-gray-700 select-none mr-2">
              <MapPin className="h-4 w-4 text-orange-500" />
              <div className="flex flex-col leading-[1.1] hidden sm:flex">
                <span className="font-semibold text-gray-900 text-[13px]">{pincode}</span>
                <span className="text-[9px] text-gray-500 font-medium tracking-wide">Location</span>
              </div>
            </div>

            {/* Compare */}
            <span
              className="cursor-pointer transition-all text-[15px] font-medium text-gray-800 hover:text-orange-400 flex items-center gap-1.5"
              onClick={() => router.push('/?section=compare')}
            >
              <Scale className="h-4 w-4 text-orange-400" /> Compare
            </span>

            {/* Wishlist */}
            <span
              className="cursor-pointer transition-all text-[15px] font-medium text-gray-800 hover:text-orange-400 flex items-center gap-1.5"
              onClick={() => router.push('/?section=wishlist')}
            >
              <Heart className="h-4 w-4 text-orange-400" /> Wishlist
            </span>

            {/* Messages */}
            <span
              className="cursor-pointer transition-all text-[15px] font-medium text-gray-800 hover:text-orange-400 flex items-center gap-1.5"
              onClick={() => router.push('/?section=chat')}
            >
              <MessageSquare className="h-4 w-4 text-orange-400" /> Messages
            </span>

            {/* Profile / Sign In */}
            {user && userData ? (
              <div className="flex items-center gap-3 ml-2 border-l border-gray-200 pl-5">
                <div
                  className="flex items-center gap-2 cursor-pointer transition-all text-[15px] font-medium text-gray-800 hover:text-orange-500"
                  onClick={() => router.push('/?section=profile')}
                >
                  {userData.avatarUrl ? (
                    <img src={userData.avatarUrl} alt="Profile" className="w-7 h-7 rounded-full object-cover" />
                  ) : (
                    <div className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 border border-gray-200">
                      <User className="h-4 w-4" />
                    </div>
                  )}
                  <span className="hidden sm:inline">Hi, {userData?.name ? userData.name.split(' ')[0] : 'User'}</span>
                </div>
                
                <span
                  className="text-[13px] text-gray-500 hover:text-orange-500 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    const auth = useAuth();
                    auth.signOut?.();
                  }}
                >
                  Sign Out
                </span>
              </div>
            ) : (
              <button
                onClick={() => { setAuthModalTab('login'); setShowAuthModal(true); }}
                className="bg-orange-500 hover:bg-orange-600 text-white shadow-sm px-6 py-2 h-auto text-[15px] font-bold tracking-wide rounded-md ml-2 transition-colors flex items-center gap-1.5"
              >
                <User className="h-4 w-4" /> Login
              </button>
            )}
          </div>
        </div>
      </header>
      {/* Top Navigation Tabs */}
      <div className="border-b border-gray-200 sticky top-0 bg-white z-10 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8 overflow-x-auto hide-scrollbar" aria-label="Tabs">
            {tabs.map((tab) => {
              const isActive = pathname === tab.href;
              return (
                <Link
                  key={tab.name}
                  href={tab.href}
                  className={`
                    whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors
                    ${
                      isActive
                        ? 'border-orange-500 text-orange-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  {tab.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Page Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16 flex-1 w-full">
        {children}
      </div>

      <Footer />

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialTab={authModalTab}
        onLogin={signIn || (async () => {})}
        onRegister={handleAuthModalRegister}
        onGoogleSignIn={signInWithGoogle || (async () => {})}
        googleUser={user}
      />
    </div>
  );
}
