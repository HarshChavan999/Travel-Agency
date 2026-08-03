'use client';

import React, { useState, useEffect } from 'react';
import { 
  MapPin, CheckCircle, Pencil, Save, Camera, 
  Shield, Users, Plus, Phone, Briefcase, User, ChevronRight,
  Heart, Scale, MessageSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { doc, updateDoc } from 'firebase/firestore';
import { getDbInstance } from '@/lib/firebase';

interface UserProfileProps {
  user: any;
  userData: any;
  wishlist: any[];
  coTravellers: any[];
  setCoTravellers: (val: any[]) => void;
  profileName: string;
  setProfileName: (val: string) => void;
  profilePhone: string;
  setProfilePhone: (val: string) => void;
  profilePhotoUrl: string | null;
  handleProfilePhotoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isEditingProfile: boolean;
  setIsEditingProfile: (val: boolean) => void;
  savingProfile: boolean;
  handleSaveProfile: () => void;
  onNavigateToWishlist: () => void;
  onNavigateToCompare?: () => void;
  onNavigateToChat?: () => void;
}

export default function UserProfile({
  user,
  userData,
  wishlist,
  coTravellers,
  setCoTravellers,
  profileName,
  setProfileName,
  profilePhone,
  setProfilePhone,
  profilePhotoUrl,
  handleProfilePhotoChange,
  isEditingProfile,
  setIsEditingProfile,
  savingProfile,
  handleSaveProfile,
  onNavigateToWishlist,
  onNavigateToCompare,
  onNavigateToChat
}: UserProfileProps) {
  const [scrollY, setScrollY] = useState(0);
  const [activeTab, setActiveTab] = useState<'account' | 'cotravellers'>('account');
  const [showAddCoTraveller, setShowAddCoTraveller] = useState(false);
  const [newCoTraveller, setNewCoTraveller] = useState({ name: '', contact: '', relationship: 'Spouse' });
  const [realLocation, setRealLocation] = useState('');

  // Parallax scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fetch highly accurate real location if not provided in user data
  useEffect(() => {
    if (userData?.city) return;

    const fetchIpLocation = async () => {
      try {
        const res = await fetch('https://ipapi.co/json/');
        const data = await res.json();
        if (data && data.city) {
          setRealLocation(`${data.city}${data.country_name ? `, ${data.country_name}` : ''}`);
        }
      } catch (e) {
        console.error('Failed to fetch location', e);
      }
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`);
            const data = await res.json();
            if (data && (data.locality || data.city)) {
               const locationName = data.locality || data.city;
               setRealLocation(`${locationName}${data.countryName ? `, ${data.countryName}` : ''}`);
            } else {
               fetchIpLocation();
            }
          } catch (err) {
            console.error('Error reverse geocoding coordinates:', err);
            fetchIpLocation();
          }
        },
        (error) => {
          console.warn('GPS location denied or timeout. Falling back to IP location:', error);
          fetchIpLocation();
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      fetchIpLocation();
    }
  }, [userData]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24 font-inter">
      {/* CINEMATIC HERO BANNER WITH PARALLAX */}
      <div className="relative h-[480px] w-full overflow-hidden bg-[#0B1F3A]">
        {/* Parallax Background */}
        <div 
          className="absolute inset-0 w-full h-[120%] bg-cover bg-center bg-no-repeat transition-transform duration-75 ease-out will-change-transform"
          style={{
            backgroundImage: 'url("https://images.unsplash.com/photo-1506929562872-bb421503ef21?q=80&w=2968&auto=format&fit=crop")',
            transform: `translateY(-${scrollY * 0.4}px)`
          }}
        />
        {/* Dark Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B1F3A] via-[#0B1F3A]/60 to-transparent" />
        
        {/* Hero Content & Glassmorphism Card */}
        <div className="absolute inset-0 flex items-end pb-8">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
            <div className="bg-white/10 backdrop-blur-md border border-white/20 shadow-2xl rounded-sm p-6 md:p-8 flex flex-col md:flex-row items-center md:items-start gap-6 relative overflow-hidden">
              {/* Decorative accent */}
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-400 to-yellow-300" />
              
              {/* Avatar */}
              <div className="relative shrink-0 group">
                <div className="w-28 h-28 md:w-32 md:h-32 rounded-full overflow-hidden border-4 border-white/20 shadow-xl bg-[#0B1F3A] flex items-center justify-center relative z-10">
                  {profilePhotoUrl ? (
                    <img src={profilePhotoUrl} alt={profileName} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-4xl font-bold text-white">{profileName?.charAt(0) || 'U'}</span>
                  )}
                </div>
                <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity z-20">
                  <Camera className="text-white w-8 h-8" />
                  <input type="file" accept="image/*" onChange={handleProfilePhotoChange} className="hidden" />
                </label>
               
              </div>

              {/* User Info */}
              <div className="flex-1 text-center md:text-left z-10 mt-4 md:mt-2">
                <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-2 drop-shadow-md">
                  {profileName || userData?.name || 'Traveler'}
                </h1>
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm text-gray-200 mb-4 font-medium">
                  <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-orange-400" /> {userData?.city || realLocation || 'Locating...'}</span>
                  <span className="flex items-center gap-1.5 opacity-80">Explorer • Adventure Lover</span>
                 </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* LEFT SIDEBAR: NAVIGATION */}
          <div className="lg:col-span-1">
            <div className="bg-white border border-[#E5E7EB] rounded-sm shadow-sm p-4 sticky top-24 space-y-6">
              <div>
              
                <nav className="space-y-1.5">
                  <button
                    onClick={() => setActiveTab('account')}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-sm text-sm transition-all duration-200 ${
                      activeTab === 'account' 
                        ? 'bg-orange-400 text-white font-bold shadow-md' 
                        : 'text-[#6B7280] font-semibold hover:bg-orange-50 hover:text-orange-600'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Shield className={`w-5 h-5 ${activeTab === 'account' ? 'text-white' : 'text-gray-400'}`} />
                      Account Details
                    </div>
                    {activeTab === 'account' && <ChevronRight className="w-4 h-4 text-white" />}
                  </button>
                </nav>
              </div>

              <div>
                <nav className="space-y-1.5">
                  <button
                    onClick={onNavigateToWishlist}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-sm text-sm font-semibold text-[#6B7280] hover:bg-orange-50 hover:text-orange-600 transition-all duration-200 cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <Heart className="w-5 h-5 text-gray-500" />
                      Wishlist
                    </div>
                    <span className="text-xs font-bold bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full">
                      {wishlist?.length || 0}
                    </span>
                  </button>

                  <button
                    onClick={onNavigateToCompare}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-sm text-sm font-semibold text-[#6B7280] hover:bg-orange-50 hover:text-orange-600 transition-all duration-200 cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <Scale className="w-5 h-5 text-gray-500" />
                      Compare
                    </div>
                   
                  </button>

                  <button
                    onClick={onNavigateToChat}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-sm text-sm font-semibold text-[#6B7280] hover:bg-orange-50 hover:text-orange-600 transition-all duration-200 cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <MessageSquare className="w-5 h-5 text-gray-500" />
                      Chat with Agencies
                    </div>
                    
                  </button>
                </nav>
              </div>
            </div>
          </div>

          {/* RIGHT CONTENT AREA */}
          <div className="lg:col-span-3">
            
            {/* Account Settings Tab */}
            {activeTab === 'account' && (
              <div className="bg-white border border-[#E5E7EB] rounded-sm shadow-sm p-6 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between border-b border-gray-100 pb-6 mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-sm bg-orange-50 flex items-center justify-center">
                      <Shield className="w-6 h-6 text-orange-400" />
                    </div>
                    <div>
                      <h2 className="text-xl font-extrabold text-[#111827]">Account Details</h2>
                      <p className="text-sm font-medium text-[#6B7280]">Manage your personal credentials and contact information.</p>
                    </div>
                  </div>

                  {!isEditingProfile && (
                    <Button 
                      onClick={() => setIsEditingProfile(true)}
                      className="bg-orange-400 hover:bg-orange-500 text-white font-bold rounded-sm px-5 py-2.5 shadow-md transition-all flex items-center gap-2 text-xs cursor-pointer"
                    >
                      <Pencil className="w-4 h-4" /> Edit Profile
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div>
                    <Label className="text-xs font-bold text-[#6B7280] mb-2 block uppercase tracking-wider">Full Name</Label>
                    <Input 
                      disabled={!isEditingProfile}
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      className={`rounded-sm border-[#E5E7EB] p-4 text-sm font-semibold h-auto ${!isEditingProfile ? 'bg-gray-50 text-gray-500' : 'bg-white focus-visible:ring-orange-400'}`}
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-bold text-[#6B7280] mb-2 block uppercase tracking-wider">Phone Number</Label>
                    <Input 
                      disabled={!isEditingProfile}
                      value={profilePhone}
                      onChange={(e) => setProfilePhone(e.target.value)}
                      className={`rounded-sm border-[#E5E7EB] p-4 text-sm font-semibold h-auto ${!isEditingProfile ? 'bg-gray-50 text-gray-500' : 'bg-white focus-visible:ring-orange-400'}`}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-xs font-bold text-[#6B7280] mb-2 block uppercase tracking-wider">Email Address</Label>
                    <Input 
                      disabled
                      value={user?.email || ''}
                      className="rounded-sm border-[#E5E7EB] p-4 text-sm font-semibold h-auto bg-gray-50 text-gray-500"
                    />
                  </div>
                </div>

                {isEditingProfile && (
                  <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                    <Button variant="outline" onClick={() => setIsEditingProfile(false)} className="rounded-sm font-bold px-6 border-gray-200 hover:bg-gray-50 text-gray-700">Cancel</Button>
                    <Button onClick={handleSaveProfile} disabled={savingProfile} className="rounded-sm font-bold px-8 bg-orange-400 hover:bg-orange-500 text-white border-none shadow-md">
                      {savingProfile ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
