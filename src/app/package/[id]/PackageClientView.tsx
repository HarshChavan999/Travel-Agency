"use client";
import { useRouter } from 'next/navigation';
import { ArrowLeft, User } from 'lucide-react';
import PackageDetailView from '@/components/PackageDetailView';
import AuthModal from '@/components/AuthModal';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getDbInstance } from '@/lib/firebase';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';


export default function PackageClientView({ listing }: { listing: any }) {
  const router = useRouter();
  const { user, userData, signIn, register, signInWithGoogle, signOut } = useAuth();
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [showAuthModal, setShowAuthModal] = useState(false);

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

          {/* Right Links - Profile Settings */}
          <div className="flex items-center gap-5 w-full md:w-auto justify-between md:justify-end flex-wrap pl-4">
            {user && userData ? (
              <div className="flex items-center gap-3 ml-2">
                <div
                  className={`flex items-center gap-2 cursor-pointer transition-all text-[15px] font-medium hover:text-orange-400 text-gray-800`}
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
                  className="text-[13px] text-gray-500 hover:text-orange-500 cursor-pointer ml-3 border-l border-gray-200 pl-3"
                  onClick={() => signOut?.()}
                >
                  Sign Out
                </span>
              </div>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="bg-orange-500 hover:bg-orange-600 text-white shadow-sm px-6 py-2 h-auto text-[15px] font-bold tracking-wide rounded-md ml-2 transition-colors flex items-center gap-1.5"
              >
                <User className="h-4 w-4" /> Login
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 bg-gray-50">
        <PackageDetailView 
          listing={listing} 
          onBack={() => router.push('/')}
          onBook={() => router.push(`/?action=book&packageId=${listing.id}`)}
          onChat={() => router.push(`/?action=chat&agencyId=${listing.agencyId}&agencyName=${encodeURIComponent(listing.agencyName || 'Travel Agency')}`)}
          onWishlist={handleWishlistToggle}
          isWishlisted={wishlist.includes(listing?.id)}
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
