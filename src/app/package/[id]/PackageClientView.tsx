"use client";
import { useRouter } from 'next/navigation';
import { ArrowLeft, User } from 'lucide-react';
import PackageDetailView from '@/components/PackageDetailView';
import AuthModal from '@/components/AuthModal';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getDbInstance } from '@/lib/firebase';
import { doc, getDoc, onSnapshot, updateDoc } from 'firebase/firestore';


export default function PackageClientView({ listing }: { listing: any }) {
  const router = useRouter();
  const { user, userData, signIn, register, signInWithGoogle, signOut } = useAuth();
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [enrichedListing, setEnrichedListing] = useState(listing);

  useEffect(() => {
    async function fetchAgency() {
      if (listing.agencyId && !listing.agencyData) {
        const dbInstance = getDbInstance();
        if (dbInstance) {
          try {
            const agencyDoc = await getDoc(doc(dbInstance, 'users', listing.agencyId));
            if (agencyDoc.exists()) {
              const agencyData = agencyDoc.data();
              setEnrichedListing({
                ...listing,
                agencyData,
                agencyName: agencyData.companyName || 'Unknown Agency'
              });
            }
          } catch (e) {
            console.error("Error fetching agency client-side:", e);
          }
        }
      }
    }
    fetchAgency();
  }, [listing]);

  useEffect(() => {
    if (!user) return;
    const dbInstance = getDbInstance();
    if (!dbInstance) return;

    const unsubscribe = onSnapshot(doc(dbInstance, 'users', user.uid), (docSnapshot) => {
      if (docSnapshot.exists()) {
        const userData = docSnapshot.data();
        const wishlistData = userData.wishlist && Array.isArray(userData.wishlist)
          ? userData.wishlist
          : [];
        setWishlist(wishlistData);
        
        if (!userData.wishlist) {
          updateDoc(doc(dbInstance, 'users', user.uid), {
            wishlist: []
          }).catch(console.error);
        }
      }
    });

    return () => unsubscribe();
  }, [user]);

  const updateWishlistInFirestore = async (newWishlist: string[]) => {
    if (!user) return;
    const dbInstance = getDbInstance();
    if (!dbInstance) return;
    try {
      await updateDoc(doc(dbInstance, 'users', user.uid), {
        wishlist: newWishlist
      });
    } catch (error) {
      console.error('Error updating wishlist:', error);
    }
  };

  const handleWishlistToggle = (listingId: string) => {
    if (!user) {
      alert("Please login to add packages to your wishlist.");
      return;
    }
    setWishlist(prev => {
      const newWishlist = prev.includes(listingId)
        ? prev.filter(id => id !== listingId)
        : [...prev, listingId];
      updateWishlistInFirestore(newWishlist);
      return newWishlist;
    });
  };
  
  return (
    <div className="min-h-screen flex flex-col relative">
      <header className="header-transition absolute top-0 left-0 right-0 z-[100] bg-gradient-to-b from-white/25 via-white/5 to-transparent text-white h-16 flex items-center border-b border-white/20 shadow-[0_6px_25px_rgba(255,255,255,0.12)]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 px-4 w-full h-full">
          {/* Logo */}
          <div className="flex items-center gap-4 flex-1 w-full h-full">
            <div 
              className="flex items-center gap-1 sm:gap-2 font-black tracking-tight cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => router.push('/')}
            >
              <img src="/tripdm-logo.png" alt="TripDM Logo" className="h-16 w-auto object-contain brightness-125 filter drop-shadow" />
            </div>
          </div>

          {/* Right Links - Profile Settings */}
          <div className="flex items-center gap-5 w-full md:w-auto justify-between md:justify-end flex-wrap pl-4">
            {user && userData ? (
              <div className="flex items-center gap-3 ml-2">
                <div
                  className={`flex items-center gap-2 cursor-pointer transition-all text-sm font-semibold hover:text-orange-400 text-slate-200`}
                  onClick={() => router.push('/?section=profile')}
                >
                  {userData.avatarUrl ? (
                    <img src={userData.avatarUrl} alt="Profile" className="w-7 h-7 rounded-md object-cover border border-white/20" />
                  ) : (
                    <div className="w-7 h-7 bg-slate-800 rounded-md flex items-center justify-center text-slate-300 border border-white/20">
                      <User className="h-4 w-4" />
                    </div>
                  )}
                  <span className="hidden sm:inline">Hi, {userData?.name ? userData.name.split(' ')[0] : 'User'}</span>
                </div>
                
                <span
                  className="text-xs text-slate-400 hover:text-orange-400 cursor-pointer ml-3 border-l border-white/15 pl-3 transition-colors"
                  onClick={() => signOut?.()}
                >
                  Sign Out
                </span>
              </div>
            ) : (
              <span
                onClick={() => setShowAuthModal(true)}
                className="cursor-pointer transition-all text-[15px] font-medium text-gray-800 hover:text-gray-600 flex items-center gap-1.5"
              >
                <User className="h-4 w-4 text-gray-700" /> Login
              </span>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 bg-gray-50">
        <PackageDetailView 
          listing={enrichedListing} 
          onBack={() => router.push('/')}
          onBook={() => router.push(`/?action=book&packageId=${enrichedListing.id}`)}
          onChat={() => router.push(`/?action=chat&agencyId=${enrichedListing.agencyId}&agencyName=${encodeURIComponent(enrichedListing.agencyName || 'Travel Agency')}`)}
          onWishlist={handleWishlistToggle}
          isWishlisted={wishlist.includes(enrichedListing?.id)}
        />
      </div>

      {showAuthModal && (
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onLogin={signIn}
          onRegister={register}
          onGoogleSignIn={signInWithGoogle}
          googleUser={user}
        />
      )}
    </div>
  );
}
