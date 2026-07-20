'use client';

import React, { useState, useEffect } from 'react';
import { 
  MapPin, CheckCircle, Pencil, Save, Camera, 
  Shield, Users, Plus, Phone, Briefcase, User, ChevronRight
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
  onNavigateToWishlist
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

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row md:flex-col gap-3 shrink-0 z-10 w-full md:w-auto mt-4 md:mt-0 pt-4">
                <Button 
                  onClick={() => {
                    setActiveTab('account');
                    setIsEditingProfile(true);
                  }}
                  className="bg-orange-400 hover:bg-orange-500 text-white font-bold rounded-sm px-8 py-6 shadow-lg transition-all w-full md:w-auto flex items-center justify-center gap-2 text-sm"
                >
                  <Pencil className="w-4 h-4" /> Edit Profile
                </Button>
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
            <div className="bg-white border border-[#E5E7EB] rounded-sm shadow-sm p-4 sticky top-24">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 px-2">Settings</h3>
              <nav className="space-y-2">
                <button
                  onClick={() => setActiveTab('account')}
                  className={`w-full flex items-center justify-between px-4 py-3.5 rounded-sm text-sm transition-all duration-200 ${
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

                <button
                  onClick={() => setActiveTab('cotravellers')}
                  className={`w-full flex items-center justify-between px-4 py-3.5 rounded-sm text-sm transition-all duration-200 ${
                    activeTab === 'cotravellers' 
                      ? 'bg-orange-400 text-white font-bold shadow-md' 
                      : 'text-[#6B7280] font-semibold hover:bg-orange-50 hover:text-orange-600'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Users className={`w-5 h-5 ${activeTab === 'cotravellers' ? 'text-white' : 'text-gray-400'}`} />
                    Co-travellers
                  </div>
                  {activeTab === 'cotravellers' && <ChevronRight className="w-4 h-4 text-white" />}
                </button>
              </nav>
            </div>
          </div>

          {/* RIGHT CONTENT AREA */}
          <div className="lg:col-span-3">
            
            {/* Account Settings Tab */}
            {activeTab === 'account' && (
              <div className="bg-white border border-[#E5E7EB] rounded-sm shadow-sm p-6 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center gap-4 border-b border-gray-100 pb-6 mb-6">
                  <div className="w-12 h-12 rounded-sm bg-orange-50 flex items-center justify-center">
                    <Shield className="w-6 h-6 text-orange-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-extrabold text-[#111827]">Account Details</h2>
                    <p className="text-sm font-medium text-[#6B7280]">Manage your personal credentials and contact information.</p>
                  </div>
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

            {/* Co-Traveller Tab */}
            {activeTab === 'cotravellers' && (
              <Card className="bg-white border border-[#E5E7EB] shadow-sm rounded-sm p-6 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div>
                  <div className="flex justify-between items-center pb-6 border-b border-gray-100 mb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-orange-50 rounded-sm flex items-center justify-center shrink-0">
                        <Users className="h-6 w-6 text-orange-400" />
                      </div>
                      <div>
                        <h3 className="text-xl font-extrabold text-[#111827]">Co-traveller Details</h3>
                        <p className="text-sm text-[#6B7280] mt-1 font-medium">Manage details of passengers traveling with you</p>
                      </div>
                    </div>
                    <Button
                      onClick={() => setShowAddCoTraveller(true)}
                      className="bg-orange-400 hover:bg-orange-500 text-white rounded-sm font-bold shadow-md h-auto py-2.5 px-4 flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Add
                    </Button>
                  </div>

                  {/* Inline Add Co-traveller Form */}
                  {showAddCoTraveller && (
                    <div className="bg-blue-50/50 border border-blue-100 rounded-sm p-6 mb-8 space-y-5 animate-in slide-in-from-top-4 duration-200">
                      <h4 className="text-base font-bold text-gray-900">Add New Co-traveller</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="coName" className="text-xs font-semibold text-gray-600 mb-1.5 block uppercase tracking-wider">Full Name</Label>
                          <Input
                            id="coName"
                            placeholder="Full Name"
                            value={newCoTraveller.name}
                            onChange={(e) => setNewCoTraveller({ ...newCoTraveller, name: e.target.value })}
                            className="bg-white rounded-sm text-sm focus-visible:ring-orange-400 p-3.5 border-gray-200"
                          />
                        </div>
                        <div>
                          <Label htmlFor="coContact" className="text-xs font-semibold text-gray-600 mb-1.5 block uppercase tracking-wider">Contact Number</Label>
                          <Input
                            id="coContact"
                            placeholder="Phone"
                            value={newCoTraveller.contact}
                            onChange={(e) => setNewCoTraveller({ ...newCoTraveller, contact: e.target.value })}
                            className="bg-white rounded-sm text-sm focus-visible:ring-orange-400 p-3.5 border-gray-200"
                          />
                        </div>
                        <div>
                          <Label htmlFor="coRelation" className="text-xs font-semibold text-gray-600 mb-1.5 block uppercase tracking-wider">Relationship</Label>
                          <select
                            id="coRelation"
                            value={newCoTraveller.relationship}
                            onChange={(e) => setNewCoTraveller({ ...newCoTraveller, relationship: e.target.value })}
                            className="block w-full rounded-sm border-gray-200 bg-white p-3.5 text-sm text-gray-800 focus:border-orange-400 focus:ring-orange-400 focus-visible:ring-orange-400"
                          >
                            <option>Spouse</option>
                            <option>Child</option>
                            <option>Parent</option>
                            <option>Sibling</option>
                            <option>Friend</option>
                            <option>Other</option>
                          </select>
                        </div>
                      </div>
                      <div className="flex gap-3 justify-end pt-2">
                        <Button
                          variant="outline"
                          onClick={() => setShowAddCoTraveller(false)}
                          className="rounded-sm font-bold px-6 border-gray-200 text-gray-700"
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={async () => {
                            if (!newCoTraveller.name.trim() || !newCoTraveller.contact.trim()) {
                              alert('Please fill in Name and Contact number');
                              return;
                            }
                            const updatedList = [...coTravellers, {
                              id: `${Date.now()}`,
                              ...newCoTraveller
                            }];

                            const dbInstance = getDbInstance();
                            if (dbInstance && user) {
                              try {
                                await updateDoc(doc(dbInstance, 'users', user.uid), {
                                  coTravellers: updatedList
                                });
                              } catch (err) {
                                console.error('Error saving co-travellers list:', err);
                              }
                            }

                            setCoTravellers(updatedList);
                            setNewCoTraveller({ name: '', contact: '', relationship: 'Spouse' });
                            setShowAddCoTraveller(false);
                          }}
                          className="bg-orange-400 hover:bg-orange-500 text-white font-bold rounded-sm px-8 shadow-md"
                        >
                          Save Traveler
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* List of Co-travellers */}
                  {coTravellers.length === 0 ? (
                    <div className="py-14 px-4 bg-gray-50 rounded-sm text-center flex flex-col items-center">
                      <Briefcase className="h-14 w-14 text-gray-300 mb-4" />
                      <p className="text-[15px] font-extrabold text-gray-900 mb-2">No co-travellers added yet</p>
                      <p className="text-[13px] text-gray-500 max-w-xs mx-auto font-medium leading-relaxed">Add your family members or frequent travel companions for instant booking autofill.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {coTravellers.map((traveller) => (
                        <div
                          key={traveller.id}
                          className="flex justify-between items-center p-5 bg-white border border-gray-200 rounded-sm hover:border-orange-200 transition-all duration-200 shadow-sm group"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-blue-50 rounded-sm flex items-center justify-center text-blue-600 shrink-0 group-hover:scale-105 transition-all">
                              <User className="h-6 w-6" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-gray-900">{traveller.name}</p>
                              <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                                <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {traveller.contact}</span>
                                <span>•</span>
                                <span className="bg-blue-50 text-blue-600 border border-blue-100 px-2.5 py-0.5 rounded-sm font-bold text-[10px]">{traveller.relationship}</span>
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={async () => {
                              const updatedList = coTravellers.filter(t => t.id !== traveller.id);

                              const dbInstance = getDbInstance();
                              if (dbInstance && user) {
                                try {
                                  await updateDoc(doc(dbInstance, 'users', user.uid), {
                                    coTravellers: updatedList
                                  });
                                } catch (err) {
                                  console.error('Error deleting co-traveller:', err);
                                }
                              }

                              setCoTravellers(updatedList);
                            }}
                            className="text-gray-400 hover:text-red-500 p-2.5 hover:bg-red-50 rounded-sm transition-all duration-150"
                            title="Remove Traveler"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
