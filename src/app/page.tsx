'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import AgencyListingForm from '@/components/AgencyListingForm';
import BulkUploadForm from '@/components/BulkUploadForm';
import SearchFilters from '@/components/SearchFilters';
import ListingCard from '@/components/ListingCard';
import PackageDetailView from '@/components/PackageDetailView';
import PackageComparison from '@/components/PackageComparison';
import { useComparison } from '@/contexts/ComparisonContext';
import { collection, query, where, getDocs, updateDoc, doc, getDoc, addDoc, deleteDoc, onSnapshot, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getDbInstance, getStorageInstance } from '@/lib/firebase';
import { getFirestore } from 'firebase/firestore';
import { compressMultipleImages, isValidImageFile, validateFileSize } from '@/lib/imageUtils';

export default function Home() {
  const { user, userData, loading, signIn, signInWithGoogle, signOut, register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [isAgencyRegistration, setIsAgencyRegistration] = useState(true);
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  // Agency Registration Fields
  const [contactNumber, setContactNumber] = useState('');
  const [businessLocation, setBusinessLocation] = useState('');
  const [fullAddress, setFullAddress] = useState('');
  const [panCard, setPanCard] = useState<File | null>(null);
  const [gstCertificate, setGstCertificate] = useState<File | null>(null);
  const [businessProof, setBusinessProof] = useState<File | null>(null);
  const [agencyDescription, setAgencyDescription] = useState('');
  const [operatingFromHome, setOperatingFromHome] = useState(false);
  const [operatingFromOffice, setOperatingFromOffice] = useState(false);
  const [officeAddress, setOfficeAddress] = useState('');
  const [uploadOfficePhotos, setUploadOfficePhotos] = useState(false);
  const [uploadBranding, setUploadBranding] = useState(false);
  const [agencyPhotos, setAgencyPhotos] = useState<File[]>([]);
  const [refundPolicy, setRefundPolicy] = useState('');
  const [declarationChecked, setDeclarationChecked] = useState(false);
  const [pendingAgencies, setPendingAgencies] = useState<any[]>([]);
  const [activeSection, setActiveSection] = useState('overview');
  const [allAgencies, setAllAgencies] = useState<any[]>([]);
  const [pendingListings, setPendingListings] = useState<any[]>([]);
  const [agencyActiveSection, setAgencyActiveSection] = useState('listings');
  const [userActiveSection, setUserActiveSection] = useState('listings');
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [currentChatAgency, setCurrentChatAgency] = useState<string>('agency1');
  const [currentChatAgencyName, setCurrentChatAgencyName] = useState<string>('Adventure Travels');
  const [listings, setListings] = useState<any[]>([]);
  const [agencyListings, setAgencyListings] = useState<any[]>([]);
  const [newListing, setNewListing] = useState({
    title: '',
    description: '',
    price: '',
    duration: '',
    destination: '',
    type: 'adventure',
    photos: [] as string[],
    rating: 0,
    reviewsCount: 0
  });
  const [agencyChatMessages, setAgencyChatMessages] = useState<any[]>([]);
  const [agencyChatInput, setAgencyChatInput] = useState('');
  const [agencyConversations, setAgencyConversations] = useState<any[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [showListingForm, setShowListingForm] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [editingListing, setEditingListing] = useState<any>(null);
  const [viewingListing, setViewingListing] = useState<any>(null);
  const [tempPhotoFiles, setTempPhotoFiles] = useState<File[]>([]);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [bookingListing, setBookingListing] = useState<any>(null);
  const [bookingStep, setBookingStep] = useState(1);
  const [bookingData, setBookingData] = useState({
    travelers: 1,
    travelDate: '',
    specialRequests: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    preferences: [] as string[],
    paymentMethod: 'pay_later',
    insurance: false,
    termsAccepted: false,
    emergencyContact: '',
    dietaryRestrictions: '',
    accessibilityNeeds: '',
    bookingNotes: ''
  });
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [agencyBookings, setAgencyBookings] = useState<any[]>([]);
  const [userBookings, setUserBookings] = useState<any[]>([]);
  const [userConversations, setUserConversations] = useState<any[]>([]);
  // Customer Support & Dispute Resolution States
  const [supportTickets, setSupportTickets] = useState<any[]>([]);
  const [submittingSupportTicket, setSubmittingSupportTicket] = useState(false);
  const [supportBookingId, setSupportBookingId] = useState('');
  const [supportReason, setSupportReason] = useState('Agency is not responding after payment');
  const [supportSubject, setSupportSubject] = useState('');
  const [supportDescription, setSupportDescription] = useState('');
  const [showJourneyModal, setShowJourneyModal] = useState(false);
  const [selectedJourneyBooking, setSelectedJourneyBooking] = useState<any>(null);
  const [viewingAgency, setViewingAgency] = useState<any>(null);
  // User Experience Enhancements
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    priceRange: [0, 10000] as [number, number],
    duration: '',
    type: '',
    rating: 0,
    destination: '',
    packageType: '',
    amenities: [] as string[]
  });
  const [showFilters, setShowFilters] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  // Reviews & Ratings
  const [reviews, setReviews] = useState<any[]>([]);
  const [newReview, setNewReview] = useState({
    listingId: '',
    rating: 5,
    comment: '',
    photos: [] as string[]
  });
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewListing, setReviewListing] = useState<any>(null);
  // Wishlist functionality
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [showWishlist, setShowWishlist] = useState(false);
  const [pincode, setPincode] = useState<string>('Pincode 400605');
  
  // Pincode Modal States
  const [showPincodeModal, setShowPincodeModal] = useState(false);
  const [pincodeInput, setPincodeInput] = useState('');

  // Profile States
  const [profileName, setProfileName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profilePhotoUrl, setProfilePhotoUrl] = useState('');
  const [coTravellers, setCoTravellers] = useState<any[]>([]);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [showAddCoTraveller, setShowAddCoTraveller] = useState(false);
  const [newCoTraveller, setNewCoTraveller] = useState({
    name: '',
    contact: '',
    relationship: 'Spouse'
  });
  const [savingProfile, setSavingProfile] = useState(false);

  // Credit & Subscription System States
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [chatUnlockTarget, setChatUnlockTarget] = useState<{ agencyId: string, agencyName: string, packageTitle: string } | null>(null);
  const [isPurchasingCredits, setIsPurchasingCredits] = useState(false);
  const [purchaseStatusText, setPurchaseStatusText] = useState('');

  // Profile Sub-tab Navigation state
  const [profileTab, setProfileTab] = useState<'account' | 'credits'>('account');

  // Custom premium Toast states and wrapper
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
  };

  // Shadow global alert to show premium toast notification banner
  const alert = (message: string) => {
    let type: 'success' | 'error' | 'info' = 'info';
    const lower = message.toLowerCase();
    if (
      lower.includes('success') || 
      lower.includes('complete') || 
      lower.includes('added') || 
      lower.includes('unlocked') || 
      lower.includes('approved') || 
      lower.includes('bonus') ||
      lower.includes('copied')
    ) {
      type = 'success';
    } else if (
      lower.includes('failed') || 
      lower.includes('error') || 
      lower.includes('insufficient') || 
      lower.includes('not supported') || 
      lower.includes('invalid') ||
      lower.includes('please fill')
    ) {
      type = 'error';
    }
    showToast(message, type);
  };

  // Load Profile States from userData & user
  useEffect(() => {
    if (user && userData && userData.role === 'user') {
      setProfileName(userData.name || '');
      setProfilePhone(userData.phone || userData.contactNumber || '');
      setProfileEmail(user.email || '');
      setProfilePhotoUrl(userData.avatarUrl || user.photoURL || '');
      setCoTravellers(userData.coTravellers || []);
    }
  }, [user, userData]);

  // Fetch user's pincode automatically with robust API waterfall & IP fallback
  useEffect(() => {
    if (userData?.role === 'user') {
      const fetchIpPincode = async () => {
        try {
          const res = await fetch('https://ipapi.co/json/');
          const data = await res.json();
          if (data && data.postal) {
            setPincode(`Pincode ${data.postal}`);
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
              
              // 1. Try BigDataCloud (fast, reliable CORS client-side geocoding)
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
    }
  }, [userData?.role]);

  // Save profile modifications to Firestore
  const handleSaveProfile = async () => {
    if (!user) return;
    const dbInstance = getDbInstance();
    if (!dbInstance) return;

    setSavingProfile(true);
    try {
      await updateDoc(doc(dbInstance, 'users', user.uid), {
        name: profileName,
        phone: profilePhone,
        coTravellers: coTravellers
      });
      alert('Profile details saved successfully!');
      setIsEditingProfile(false);
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Failed to save profile details. Please try again.');
    } finally {
      setSavingProfile(false);
    }
  };

  // Upload avatar to Firebase Storage and update user document
  const handleProfilePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !user) return;
    const selectedFile = e.target.files[0];
    
    if (!isValidImageFile(selectedFile)) {
      alert('Please select a valid image file (PNG, JPG, WEBP, JPEG).');
      return;
    }

    const storageInstance = getStorageInstance();
    const dbInstance = getDbInstance();
    if (!storageInstance || !dbInstance) return;

    try {
      const compressedFiles = await compressMultipleImages([selectedFile]);
      const fileToUpload = compressedFiles[0];

      const storageRef = ref(storageInstance, `avatars/${user.uid}/${Date.now()}_${fileToUpload.name}`);
      await uploadBytes(storageRef, fileToUpload);
      const downloadUrl = await getDownloadURL(storageRef);

      await updateDoc(doc(dbInstance, 'users', user.uid), {
        avatarUrl: downloadUrl
      });

      setProfilePhotoUrl(downloadUrl);
      alert('Profile picture updated successfully!');
    } catch (error) {
      console.error('Error uploading profile photo:', error);
      alert('Failed to upload profile picture.');
    }
  };

  // Credit system auto-migration hook for existing users
  useEffect(() => {
    const migrateExistingUser = async () => {
      if (user && userData && userData.role === 'user' && userData.plan === undefined) {
        const dbInstance = getDbInstance();
        if (!dbInstance) return;
        try {
          await updateDoc(doc(dbInstance, 'users', user.uid), {
            plan: 'free',
            credits: 0,
            freeChats: 2,
            unlockedAgencies: [],
            creditHistory: [
              {
                id: 'TX-MIG',
                type: 'reset',
                amount: 2,
                description: 'Migration Bonus: Initialized Free Plan (2 Free Chats)',
                timestamp: Date.now()
              }
            ]
          });
          console.log('User credit system successfully migrated');
        } catch (e) {
          console.error('Migration failed:', e);
        }
      }
    };
    migrateExistingUser();
  }, [user, userData]);

  // Intercept chat request and check unlock status
  const handleInitiateChat = (listingData: any) => {
    console.log('handleInitiateChat called with listing:', listingData);
    if (!user || !userData) {
      alert('Please log in to chat with travel agencies.');
      return;
    }
    
    // Check if the user is an agency (agencies don't need to unlock anything)
    if (userData.role !== 'user') {
      alert('Only travelers can initiate chats with agencies.');
      return;
    }

    const agencyId = listingData.agencyId;
    const agencyName = listingData.agencyName || 'Travel Agency';
    const packageTitle = listingData.title || 'Selected Tour Package';

    // Check if this agency is already unlocked
    const unlockedList = userData.unlockedAgencies || [];
    if (unlockedList.includes(agencyId)) {
      // Direct redirect
      setCurrentChatAgency(agencyId);
      setCurrentChatAgencyName(agencyName);
      setUserActiveSection('chat');
      setViewingListing(null);
    } else {
      // Trigger modal
      setChatUnlockTarget({ agencyId, agencyName, packageTitle });
      setShowUnlockModal(true);
    }
  };

  // Deduct credits/chats and unlock the agency connection
  const unlockChat = async (agencyId: string, agencyName: string) => {
    if (!user || !userData) return;
    
    const dbInstance = getDbInstance();
    if (!dbInstance) return;

    const currentPlan = userData.plan || 'free';
    const currentFreeChats = userData.freeChats ?? 0;
    const currentCredits = userData.credits ?? 0;
    const unlockedList = userData.unlockedAgencies || [];

    let updatedFreeChats = currentFreeChats;
    let updatedCredits = currentCredits;
    let costAmount = 0;
    let costType = 'free-chat';

    // Determine cost
    if (currentPlan === 'free') {
      if (currentFreeChats <= 0) {
        alert('Insufficient free chats. Please upgrade your plan.');
        return;
      }
      updatedFreeChats = currentFreeChats - 1;
      costAmount = 1;
      costType = 'deduction';
    } else if (currentPlan === 'starter') {
      if (currentCredits < 200) {
        alert('Insufficient credits. Please purchase a top-up pack or change your plan.');
        return;
      }
      updatedCredits = currentCredits - 200;
      costAmount = 200;
      costType = 'deduction';
    } else if (currentPlan === 'premium') {
      if (currentFreeChats > 0) {
        updatedFreeChats = currentFreeChats - 1;
        costAmount = 1;
        costType = 'deduction';
      } else {
        if (currentCredits < 150) {
          alert('Insufficient credits. Please purchase a top-up pack.');
          return;
        }
        updatedCredits = currentCredits - 150;
        costAmount = 150;
        costType = 'deduction';
      }
    }

    const txId = 'TX-CH-' + Math.random().toString(36).substr(2, 9).toUpperCase();
    const newTransaction = {
      id: txId,
      type: 'deduction',
      amount: costAmount,
      description: `Unlocked chat connection with agent: ${agencyName}`,
      timestamp: Date.now()
    };

    try {
      await updateDoc(doc(dbInstance, 'users', user.uid), {
        freeChats: updatedFreeChats,
        credits: updatedCredits,
        unlockedAgencies: [...unlockedList, agencyId],
        creditHistory: [newTransaction, ...(userData.creditHistory || [])]
      });

      // Clear modal and open chat
      setShowUnlockModal(false);
      setChatUnlockTarget(null);
      setCurrentChatAgency(agencyId);
      setCurrentChatAgencyName(agencyName);
      setUserActiveSection('chat');
      setViewingListing(null);

      alert(`Successfully unlocked connection with ${agencyName}!`);
    } catch (err) {
      console.error('Error unlocking chat:', err);
      alert('Failed to unlock conversation. Please try again.');
    }
  };

  // Simulate client-side plans upgrade/downgrade
  const upgradePlan = async (targetPlan: 'free' | 'starter' | 'premium') => {
    if (!user || !userData) return;
    const dbInstance = getDbInstance();
    if (!dbInstance) return;

    let initCredits = 0;
    let initFreeChats = 0;
    let cost = 0;
    let desc = '';

    if (targetPlan === 'free') {
      initFreeChats = 2;
      desc = 'Switched to Free Plan (2 Free Chats / month)';
    } else if (targetPlan === 'starter') {
      initCredits = 2000;
      cost = 2000;
      desc = 'Upgraded to Starter Plan (2,000 credits / month, ₹2,000/yr)';
    } else if (targetPlan === 'premium') {
      initFreeChats = 20;
      cost = 5000;
      desc = 'Upgraded to Premium Plan (20 Free Chats / month, ₹5,000/yr)';
    }

    const txId = 'TX-PL-' + Math.random().toString(36).substr(2, 9).toUpperCase();
    const newTransaction = {
      id: txId,
      type: 'plan-change',
      amount: cost,
      description: desc,
      timestamp: Date.now()
    };

    try {
      await updateDoc(doc(dbInstance, 'users', user.uid), {
        plan: targetPlan,
        credits: initCredits,
        freeChats: initFreeChats,
        creditHistory: [newTransaction, ...(userData.creditHistory || [])]
      });
      alert(`Plan updated to ${targetPlan.toUpperCase()} successfully!`);
    } catch (e) {
      console.error('Failed to change plan:', e);
      alert('Failed to update subscription. Please try again.');
    }
  };

  // Simulate purchasing credits
  const buyCredits = async (amount: number, price: number) => {
    if (!user || !userData) return;
    const dbInstance = getDbInstance();
    if (!dbInstance) return;

    if (userData.plan === 'free') {
      alert('Purchase not supported on Free Plan. Please upgrade to Starter or Premium plan.');
      return;
    }

    setIsPurchasingCredits(true);
    setPurchaseStatusText(`Connecting to secure gateway. Processing payment of ₹${price}...`);

    setTimeout(async () => {
      setPurchaseStatusText('Validating transaction with bank... Adding credits...');
      
      const txId = 'TX-TP-' + Math.random().toString(36).substr(2, 9).toUpperCase();
      const newTransaction = {
        id: txId,
        type: 'top-up',
        amount: amount,
        description: `Purchased Credit Pack (Add-on +${amount} credits)`,
        timestamp: Date.now()
      };

      try {
        await updateDoc(doc(dbInstance, 'users', user.uid), {
          credits: (userData.credits || 0) + amount,
          creditHistory: [newTransaction, ...(userData.creditHistory || [])]
        });
        setIsPurchasingCredits(false);
        alert(`Success! Added ${amount} credits to your account.`);
      } catch (err) {
        console.error('Payment error:', err);
        setIsPurchasingCredits(false);
        alert('Transaction failed. Please try again.');
      }
    }, 2500);
  };

  // Reset helper for developers
  const simulateResetCredits = async (targetPlan: 'free' | 'starter' | 'premium') => {
    if (!user) return;
    const dbInstance = getDbInstance();
    if (!dbInstance) return;

    let initCredits = 0;
    let initFreeChats = 0;
    if (targetPlan === 'free') initFreeChats = 2;
    else if (targetPlan === 'starter') initCredits = 2000;
    else if (targetPlan === 'premium') initFreeChats = 20;

    const txId = 'TX-RST-' + Math.random().toString(36).substr(2, 9).toUpperCase();
    const newTransaction = {
      id: txId,
      type: 'reset',
      amount: initCredits || initFreeChats,
      description: `Developer Reset to ${targetPlan.toUpperCase()}`,
      timestamp: Date.now()
    };

    try {
      await updateDoc(doc(getDbInstance()!, 'users', user.uid), {
        plan: targetPlan,
        credits: initCredits,
        freeChats: initFreeChats,
        unlockedAgencies: [],
        creditHistory: [newTransaction]
      });
      alert(`Developer simulation reset complete: Plan set to ${targetPlan.toUpperCase()}`);
    } catch (e) {
      console.error(e);
    }
  };

  // Comparison functionality
  const { comparisonList, clearComparison } = useComparison();

  // Fetch user's wishlist from Firestore with real-time listener
  useEffect(() => {
    if (user && userData?.role === 'user') {
      const dbInstance = getDbInstance();
      if (!dbInstance) return;

      // Set up real-time listener for wishlist changes
      const unsubscribe = onSnapshot(doc(dbInstance, 'users', user.uid), (docSnapshot) => {
        if (docSnapshot.exists()) {
          const userData = docSnapshot.data();
          console.log('🔍 User document data:', userData);
          console.log('🔍 Wishlist field value:', userData.wishlist);
          console.log('🔍 Wishlist field type:', typeof userData.wishlist);
          console.log('🔍 Is wishlist array?', Array.isArray(userData.wishlist));
          
          // Safely handle wishlist field - initialize as empty array if it doesn't exist
          const wishlistData = userData.wishlist && Array.isArray(userData.wishlist) 
            ? userData.wishlist 
            : [];
          console.log('🎯 Final wishlist data to set:', wishlistData);
          setWishlist(wishlistData);
          
          // If wishlist field doesn't exist in Firestore, initialize it
          if (!userData.wishlist) {
            console.log('📝 Initializing wishlist field in Firestore');
            updateDoc(doc(dbInstance, 'users', user.uid), {
              wishlist: []
            }).then(() => {
              console.log('✅ Wishlist field initialized successfully');
              // Update the local state immediately after initializing
              setWishlist([]);
            }).catch((error) => {
              console.error('❌ Error initializing wishlist field:', error);
            });
          }
        } else {
          console.log('❌ User document does not exist');
        }
      });

      // Cleanup function to unsubscribe from the listener
      return () => unsubscribe();
    }
  }, [user, userData]);

  // Function to update wishlist in Firestore
  const updateWishlistInFirestore = async (newWishlist: string[]) => {
    if (!user) return;
    const dbInstance = getDbInstance();
    if (!dbInstance) return;
    try {
      console.log('🔄 Updating wishlist in Firestore:', newWishlist);
      await updateDoc(doc(dbInstance, 'users', user.uid), {
        wishlist: newWishlist
      });
      console.log('✅ Wishlist successfully updated in Firestore');
    } catch (error) {
      console.error('❌ Error updating wishlist:', error);
    }
  };

  // Handle wishlist toggle with persistence
  const handleWishlistToggle = (listingId: string) => {
    setWishlist(prev => {
      const newWishlist = prev.includes(listingId)
        ? prev.filter(id => id !== listingId)
        : [...prev, listingId];
      
      // Persist to Firestore
      updateWishlistInFirestore(newWishlist);
      return newWishlist;
    });
  };

  useEffect(() => {
    // Fetch user's bookings with real-time updates
    if (user && userData?.role === 'user') {
      const dbInstance = getDbInstance();
      if (!dbInstance) return;

      // Use simple query without orderBy to avoid index requirement
      // Sorting will be done client-side
      const userBookingsQuery = query(
        collection(dbInstance, 'bookings'), 
        where('userId', '==', user.uid)
      );

      // Set up real-time listener
      const unsubscribe = onSnapshot(userBookingsQuery, (snapshot) => {
        const bookingsData = snapshot.docs.map(doc => {
          const data = doc.data() as any;
          return { 
            id: doc.id, 
            ...data,
            // Ensure createdAt is properly formatted
            createdAtFormatted: data.createdAt?.toDate?.() 
              ? data.createdAt.toDate().toLocaleDateString('en-IN', { 
                  day: 'numeric', 
                  month: 'short', 
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })
              : new Date(data.createdAt).toLocaleDateString('en-IN', { 
                  day: 'numeric', 
                  month: 'short', 
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })
          };
        });
        
        // Sort client-side by createdAt in descending order (most recent first)
        bookingsData.sort((a, b) => {
          const dateA = (a as any).createdAt?.toDate?.() || new Date((a as any).createdAt);
          const dateB = (b as any).createdAt?.toDate?.() || new Date((b as any).createdAt);
          return dateB.getTime() - dateA.getTime();
        });
        
        setUserBookings(bookingsData);
      }, (error) => {
        console.error('Error fetching bookings:', error);
      });

      // Cleanup subscription
      return () => unsubscribe();
    }
  }, [user, userData]);

  // Fetch user's support tickets with real-time updates
  useEffect(() => {
    if (user && userData?.role === 'user') {
      const dbInstance = getDbInstance();
      if (!dbInstance) return;

      const supportTicketsQuery = query(
        collection(dbInstance, 'support_tickets'), 
        where('userId', '==', user.uid)
      );

      const unsubscribe = onSnapshot(supportTicketsQuery, (snapshot) => {
        const ticketsData = snapshot.docs.map(doc => {
          const data = doc.data() as any;
          return { 
            id: doc.id, 
            ...data,
            createdAtFormatted: data.createdAt?.toDate?.() 
              ? data.createdAt.toDate().toLocaleDateString('en-IN', { 
                  day: 'numeric', 
                  month: 'short', 
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })
              : new Date(data.createdAt).toLocaleDateString('en-IN', { 
                  day: 'numeric', 
                  month: 'short', 
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })
          };
        });
        
        // Sort client-side by createdAt descending
        ticketsData.sort((a, b) => {
          const dateA = (a as any).createdAt?.toDate?.() || new Date((a as any).createdAt);
          const dateB = (b as any).createdAt?.toDate?.() || new Date((b as any).createdAt);
          return dateB.getTime() - dateA.getTime();
        });
        
        setSupportTickets(ticketsData);
      }, (error) => {
        console.error('Error fetching support tickets:', error);
      });

      return () => unsubscribe();
    }
  }, [user, userData]);

  // Reset scroll position when user switches tabs in the dashboard
  useEffect(() => {
    const scrollContainer = document.getElementById('user-dashboard-scroll-container');
    if (scrollContainer) {
      scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [userActiveSection]);

  useEffect(() => {
    if (userData?.role === 'admin') {
      const fetchPending = async () => {
        const dbInstance = getDbInstance();
        if (!dbInstance) return;
        const q = query(collection(dbInstance, 'users'), where('approved', '==', false), where('role', '==', 'agency'));
        const querySnapshot = await getDocs(q);
        const agencies = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setPendingAgencies(agencies);
      };

      const fetchAllAgencies = async () => {
        const dbInstance = getDbInstance();
        if (!dbInstance) return;
        const q = query(collection(dbInstance, 'users'), where('role', '==', 'agency'));
        const querySnapshot = await getDocs(q);
        const agencies = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAllAgencies(agencies);
      };

      const fetchPendingListings = async () => {
        const dbInstance = getDbInstance();
        if (!dbInstance) return;
        const q = query(collection(dbInstance, 'listings'), where('approved', '==', false));
        const querySnapshot = await getDocs(q);
        const listings = await Promise.all(querySnapshot.docs.map(async (docSnapshot) => {
          const listingData = docSnapshot.data() as any;
          // Get agency name
          const agencyDoc = await getDoc(doc(dbInstance, 'users', listingData.agencyId));
          const agencyName = agencyDoc.exists() ? (agencyDoc.data() as any).companyName : 'Unknown Agency';
          return { id: docSnapshot.id, ...listingData, agencyName };
        }));
        setPendingListings(listings);
      };

      const fetchAllListings = async () => {
        const dbInstance = getDbInstance();
        if (!dbInstance) return;
        const q = query(collection(dbInstance, 'listings'));
        const querySnapshot = await getDocs(q);
        const allListingsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAgencyListings(allListingsData);
      };

      fetchPending();
      fetchAllAgencies();
      fetchPendingListings();
      fetchAllListings();
    }
  }, [userData]);

  useEffect(() => {
    if (user && userData?.role === 'user') {
      const dbInstance = getDbInstance();
      if (!dbInstance) return;

      // Function to process messages and update conversations
      const processMessages = async (messages: any[]) => {
        // Sort messages by timestamp
        messages.sort((a, b) => a.timestamp - b.timestamp);
        setChatMessages(messages);

        // Create conversations list with agencies the user has chatted with
        const conversationsMap = new Map();
        const fetchConversations = async () => {
          for (const msg of messages) {
            try {
              // For user conversations, we want the other party (agency)
              const otherUserId = msg.sender === user.uid ? msg.receiverId : msg.sender;

              // Skip messages with invalid user IDs
              if (!otherUserId || typeof otherUserId !== 'string' || otherUserId.trim() === '') {
                console.warn('Skipping message with invalid user ID:', msg);
                continue;
              }

              if (!conversationsMap.has(otherUserId)) {
                try {
                  // Fetch agency name
                  const agencyDoc = await getDoc(doc(getDbInstance()!, 'users', otherUserId));
                  const agencyData = agencyDoc.exists() ? agencyDoc.data() as any : null;
                  const agencyName = agencyData?.companyName || 'Unknown Agency';

                  conversationsMap.set(otherUserId, {
                    agencyId: otherUserId,
                    agencyName,
                    chatId: msg.chatId,
                    lastMessage: msg.text,
                    lastMessageTime: msg.timestamp,
                    unreadCount: 0, // Could implement read status
                  });
                } catch (error) {
                  console.warn('Error fetching agency data for conversation:', error);
                  // Still add conversation with default name
                  conversationsMap.set(otherUserId, {
                    agencyId: otherUserId,
                    agencyName: 'Unknown Agency',
                    chatId: msg.chatId,
                    lastMessage: msg.text,
                    lastMessageTime: msg.timestamp,
                    unreadCount: 0,
                  });
                }
              }
            } catch (error) {
              console.warn('Error processing message for conversation:', error, msg);
              continue;
            }
          }
          const conversations = Array.from(conversationsMap.values());
          setUserConversations(conversations);
        };
        fetchConversations();
      };

      // Listen to web app messages collection
      const unsubscribeWebMessages = onSnapshot(collection(dbInstance, 'messages'), (snapshot) => {
        const webMessages: any[] = [];
        snapshot.forEach((doc) => {
          const msgData = doc.data();
          // Include messages where user is sender OR receiver
          if (msgData.sender === user.uid || msgData.receiverId === user.uid) {
            webMessages.push({ id: doc.id, ...msgData });
          }
        });
        processMessages(webMessages);
      });

      // Also listen to mobile app messages collection (chat_messages)
      const unsubscribeMobileMessages = onSnapshot(collection(dbInstance, 'chat_messages'), (snapshot) => {
        const mobileMessages: any[] = [];
        snapshot.forEach((doc) => {
          const msgData = doc.data();
          // Convert mobile app format to web app format
          // Include messages where user is sender OR receiver
          if (msgData.from_user_id === user.uid || msgData.to_user_id === user.uid) {
            // Create consistent chatId by sorting user IDs
            const chatId = [msgData.from_user_id, msgData.to_user_id].sort().join('_');
            const convertedMessage = {
              id: doc.id,
              text: msgData.content,
              sender: msgData.from_user_id,
              receiverId: msgData.to_user_id,
              chatId: chatId,
              timestamp: msgData.timestamp,
              status: msgData.status
            };
            mobileMessages.push(convertedMessage);
          }
        });

        // Combine with existing messages if any
        setChatMessages(currentMessages => {
          const combined = [...currentMessages, ...mobileMessages];
          // Remove duplicates based on id
          const unique = combined.filter((msg, index, self) =>
            index === self.findIndex(m => m.id === msg.id)
          );
          processMessages(unique);
          return unique;
        });
      });

      return () => {
        unsubscribeWebMessages();
        unsubscribeMobileMessages();
      };
    }
  }, [user, userData]);

  useEffect(() => {
    if (user && userData?.role === 'agency') {
      const dbInstance = getDbInstance();
      if (!dbInstance) return;

      // Function to process messages and update state
      const processMessages = async (messages: any[]) => {
        // Sort messages by timestamp
        messages.sort((a, b) => a.timestamp - b.timestamp);
        setAgencyChatMessages(messages);

        // Create conversations list with user names
        const conversationsMap = new Map();
        const fetchConversations = async () => {
          for (const msg of messages) {
            try {
              // For conversations, we want the other party (not the agency)
              const otherUserId = msg.sender === user.uid ? msg.receiverId : msg.sender;

              // Skip messages with invalid user IDs
              if (!otherUserId || typeof otherUserId !== 'string' || otherUserId.trim() === '') {
                console.warn('Skipping message with invalid user ID:', msg);
                continue;
              }

              if (!conversationsMap.has(otherUserId)) {
                try {
                  // Fetch user name
                  const userDoc = await getDoc(doc(getDbInstance()!, 'users', otherUserId));
                  const userName = userDoc.exists() ? (userDoc.data() as any).name || 'Unknown User' : 'Unknown User';

                  conversationsMap.set(otherUserId, {
                    userId: otherUserId,
                    userName,
                    chatId: msg.chatId,
                    lastMessage: msg.text,
                    lastMessageTime: msg.timestamp,
                    unreadCount: 0, // Could implement read status
                  });
                } catch (error) {
                  console.warn('Error fetching user data for conversation:', error);
                  // Still add conversation with default name
                  conversationsMap.set(otherUserId, {
                    userId: otherUserId,
                    userName: 'Unknown User',
                    chatId: msg.chatId,
                    lastMessage: msg.text,
                    lastMessageTime: msg.timestamp,
                    unreadCount: 0,
                  });
                }
              }
            } catch (error) {
              console.warn('Error processing message for conversation:', error, msg);
              continue;
            }
          }
          const conversations = Array.from(conversationsMap.values());
          setAgencyConversations(conversations);

          // Auto-select first conversation if none selected
          if (!selectedConversation && conversations.length > 0) {
            setSelectedConversation(conversations[0]);
          }
        };
        fetchConversations();
      };

      // Listen to web app messages collection
      const unsubscribeWebMessages = onSnapshot(collection(dbInstance, 'messages'), (snapshot) => {
        const webMessages: any[] = [];
        snapshot.forEach((doc) => {
          const msgData = doc.data();
          // Include messages where agency is sender OR receiver
          if (msgData.sender === user.uid || msgData.receiverId === user.uid) {
            webMessages.push({ id: doc.id, ...msgData });
          }
        });
        processMessages(webMessages);
      });

      // Also listen to mobile app messages collection (chat_messages)
      const unsubscribeMobileMessages = onSnapshot(collection(dbInstance, 'chat_messages'), (snapshot) => {
        const mobileMessages: any[] = [];
        snapshot.forEach((doc) => {
          const msgData = doc.data();
          // Convert mobile app format to web app format
          // Include messages where agency is sender OR receiver
          if (msgData.from_user_id === user.uid || msgData.to_user_id === user.uid) {
            // Create consistent chatId by sorting user IDs
            const chatId = [msgData.from_user_id, msgData.to_user_id].sort().join('_');
            const convertedMessage = {
              id: doc.id,
              text: msgData.content,
              sender: msgData.from_user_id,
              receiverId: msgData.to_user_id,
              chatId: chatId,
              timestamp: msgData.timestamp,
              status: msgData.status
            };
            mobileMessages.push(convertedMessage);
          }
        });

        // Combine with existing messages if any
        setAgencyChatMessages(currentMessages => {
          const combined = [...currentMessages, ...mobileMessages];
          // Remove duplicates based on id
          const unique = combined.filter((msg, index, self) =>
            index === self.findIndex(m => m.id === msg.id)
          );
          processMessages(unique);
          return unique;
        });
      });

      return () => {
        unsubscribeWebMessages();
        unsubscribeMobileMessages();
      };
    }
  }, [user, userData, selectedConversation]);

  useEffect(() => {
    // Fetch listings for users - only when user is authenticated
    if (user) {
      const dbInstance = getDbInstance();
      if (!dbInstance) return;
      
      // Use real-time listener for listings to automatically update when admin approves
      const listingsQuery = query(collection(dbInstance, 'listings'), where('approved', '==', true));
      
      const unsubscribe = onSnapshot(listingsQuery, async (snapshot) => {
        const listingsData = await Promise.all(snapshot.docs.map(async (docSnapshot) => {
          const listingData = docSnapshot.data() as any;
          // Get agency name
          const agencyDoc = await getDoc(doc(dbInstance, 'users', listingData.agencyId));
          const agencyData = agencyDoc.exists() ? agencyDoc.data() as any : null;
          const agencyName = agencyData?.companyName || 'Unknown Agency';
          
          // Debug: Log the listing data structure
          console.log('Listing data structure:', {
            id: docSnapshot.id,
            title: listingData.title,
            packageType: listingData.packageType,
            placesCovered: listingData.placesCovered,
            photos: listingData.photos,
            hasPlacesCovered: !!listingData.placesCovered,
            placesCoveredLength: listingData.placesCovered?.length || 0,
            firstPlaceHasImages: listingData.placesCovered?.[0]?.imageUrls?.length > 0 || false,
            photosLength: listingData.photos?.length || 0
          });
          
          return { id: docSnapshot.id, ...listingData, agencyName, agencyData };
        }));
        setListings(listingsData);
      });

      // Cleanup function to unsubscribe from the listener
      return () => unsubscribe();
    }
  }, [user]);

  useEffect(() => {
    // Fetch agency's own listings
    if (user && userData?.role === 'agency') {
      const fetchAgencyListings = async () => {
        const dbInstance = getDbInstance();
        if (!dbInstance) return;
        const agencyListingsQuery = query(collection(dbInstance, 'listings'), where('agencyId', '==', user.uid));
        const querySnapshot = await getDocs(agencyListingsQuery);
        const listingsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAgencyListings(listingsData);
      };
      fetchAgencyListings();
    }
  }, [user, userData]);

  useEffect(() => {
    // Fetch agency's bookings
    if (user && userData?.role === 'agency') {
      const fetchAgencyBookings = async () => {
        const dbInstance = getDbInstance();
        if (!dbInstance) return;
        const bookingsQuery = query(collection(dbInstance, 'bookings'), where('agencyId', '==', user.uid));
        const querySnapshot = await getDocs(bookingsQuery);
        const bookingsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Sort bookings by createdAt in descending order (most recent first)
        bookingsData.sort((a, b) => new Date((b as any).createdAt).getTime() - new Date((a as any).createdAt).getTime());
        setAgencyBookings(bookingsData);
      };
      fetchAgencyBookings();
    }
  }, [user, userData]);

  const approveAgency = async (id: string) => {
    try {
      const dbInstance = getDbInstance();
      if (!dbInstance) return;
      await updateDoc(doc(dbInstance, 'users', id), { approved: true });
      setPendingAgencies(prev => prev.filter(agency => agency.id !== id));
      // Refresh all agencies data
      const q = query(collection(dbInstance, 'users'), where('role', '==', 'agency'));
      const querySnapshot = await getDocs(q);
      const agencies = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAllAgencies(agencies);
      alert('Agency approved successfully!');
    } catch (error) {
      console.error('Error approving agency:', error);
      alert('Failed to approve agency. Please try again.');
    }
  };

  const approveListing = async (id: string) => {
    try {
      const dbInstance = getDbInstance();
      if (!dbInstance) return;
      await updateDoc(doc(dbInstance, 'listings', id), { approved: true });
      setPendingListings(prev => prev.filter(listing => listing.id !== id));
      alert('Listing approved successfully!');
    } catch (error) {
      console.error('Error approving listing:', error);
      alert('Failed to approve listing. Please try again.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isLogin) {
        await signIn(email, password);
      } else {
        const role = isAgencyRegistration ? 'agency' : 'user';

        if (isAgencyRegistration) {
          // Validate mandatory fields
          if (!declarationChecked) {
            throw new Error('Please accept the declaration to proceed with registration.');
          }

          if (!contactNumber || !businessLocation || !fullAddress || !agencyDescription || !refundPolicy) {
            throw new Error('Please fill in all required fields.');
          }

          if (operatingFromOffice && !officeAddress) {
            throw new Error('Please provide office address when operating from office.');
          }

          // Create agency data object
          const agencyData = {
            contactNumber,
            businessLocation,
            fullAddress,
            agencyDescription,
            refundPolicy,
            operatingFromHome,
            operatingFromOffice,
            officeAddress: operatingFromOffice ? officeAddress : '',
            uploadOfficePhotos,
            uploadBranding,
            // Files will be handled separately
          };

          // For now, we'll use the existing register function but pass the additional data
          // In a real implementation, you would extend the AuthContext to handle all this data
          const userDataInput = { name, companyName, ...agencyData };
          await register(email, password, role, userDataInput, file || undefined);

          // Handle file uploads (this would need to be implemented in the AuthContext)
          console.log('Agency registration data:', {
            panCard,
            gstCertificate,
            businessProof,
            agencyPhotos
          });
        } else {
          // User registration
          const userDataInput = { name };
          await register(email, password, role, userDataInput, file || undefined);
        }

        alert(`Registration successful! ${role === 'agency' ? 'Please wait for admin approval.' : ''}`);
        setIsLogin(true);
      }
      setError('');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const sendMessage = async () => {
    if (!chatInput.trim() || !user) return;

    // Send to mobile app's "chat_messages" collection with correct format
    const messageData = {
      from_user_id: user.uid,
      to_user_id: currentChatAgency,
      content: chatInput,
      timestamp: Date.now(),
      status: 'sent'
    };

    const dbInstance = getDbInstance();
    if (!dbInstance) return;
    await addDoc(collection(dbInstance, 'chat_messages'), messageData);
    setChatInput('');
  };

  const sendAgencyMessage = async () => {
    if (!agencyChatInput.trim() || !user || !selectedConversation) return;

    // Send to mobile app's "chat_messages" collection with correct format
    const messageData = {
      from_user_id: user.uid,
      to_user_id: selectedConversation.userId,
      content: agencyChatInput,
      timestamp: Date.now(),
      status: 'sent'
    };

    const dbInstance = getDbInstance();
    if (!dbInstance) return;
    await addDoc(collection(dbInstance, 'chat_messages'), messageData);
    setAgencyChatInput('');
  };

  const selectConversation = (conversation: any) => {
    setSelectedConversation(conversation);
  };

  const handleAddListing = async () => {
    if (!user || !newListing.title.trim()) return;
    try {
      // Upload photos if any
      const photoUrls: string[] = [];
      if (tempPhotoFiles.length > 0) {
        const storageInstance = getStorageInstance();
        if (!storageInstance) return;
        for (const file of tempPhotoFiles) {
          const storageRef = ref(storageInstance, `listings/${user.uid}/${Date.now()}_${file.name}`);
          await uploadBytes(storageRef, file);
          const downloadURL = await getDownloadURL(storageRef);
          photoUrls.push(downloadURL);
        }
      }

      const dbInstance = getDbInstance();
      if (!dbInstance) return;
      await addDoc(collection(dbInstance, 'listings'), {
        ...newListing,
        photos: photoUrls,
        agencyId: user.uid,
        approved: false, // Agencies need admin approval for listings
        createdAt: new Date(),
      });
      setNewListing({ title: '', description: '', price: '', duration: '', destination: '', type: 'adventure', photos: [], rating: 0, reviewsCount: 0 });
      setTempPhotoFiles([]);
      setShowListingForm(false);
      // Refresh listings
      const agencyListingsQuery = query(collection(dbInstance, 'listings'), where('agencyId', '==', user.uid));
      const querySnapshot = await getDocs(agencyListingsQuery);
      const listingsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAgencyListings(listingsData);
      alert('Listing submitted for approval!');
    } catch (error) {
      console.error('Error adding listing:', error);
      alert('Failed to add listing. Please try again.');
    }
  };

  const handleEditListing = (listing: any) => {
    setEditingListing(listing);
    setNewListing({
      title: listing.title,
      description: listing.description,
      price: listing.price,
      duration: listing.duration,
      destination: listing.destination,
      type: listing.type || 'adventure',
      photos: listing.photos || [],
      rating: listing.rating || 0,
      reviewsCount: listing.reviewsCount || 0,
    });
    setShowListingForm(true);
  };

  const handleUpdateListing = async () => {
    if (!editingListing || !newListing.title.trim()) return;
    try {
      const dbInstance = getDbInstance();
      if (!dbInstance) return;
      await updateDoc(doc(dbInstance, 'listings', editingListing.id), {
        ...newListing,
        updatedAt: new Date(),
      });
      setEditingListing(null);
      setNewListing({ title: '', description: '', price: '', duration: '', destination: '', type: 'adventure', photos: [], rating: 0, reviewsCount: 0 });
      setShowListingForm(false);
      // Refresh listings
      const agencyListingsQuery = query(collection(dbInstance, 'listings'), where('agencyId', '==', user?.uid));
      const querySnapshot = await getDocs(agencyListingsQuery);
      const listingsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAgencyListings(listingsData);
      alert('Listing updated successfully!');
    } catch (error) {
      console.error('Error updating listing:', error);
      alert('Failed to update listing. Please try again.');
    }
  };

  const handleDeleteListing = async (listingId: string) => {
    if (!confirm('Are you sure you want to delete this listing?')) return;
    try {
      const dbInstance = getDbInstance();
      if (!dbInstance) return;
      await deleteDoc(doc(dbInstance, 'listings', listingId));
      // Refresh listings
      const agencyListingsQuery = query(collection(dbInstance, 'listings'), where('agencyId', '==', user?.uid));
      const querySnapshot = await getDocs(agencyListingsQuery);
      const listingsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAgencyListings(listingsData);
      alert('Listing deleted successfully!');
    } catch (error) {
      console.error('Error deleting listing:', error);
      alert('Failed to delete listing. Please try again.');
    }
  };

  const handleViewListing = (listing: any) => {
    setViewingListing(listing);
  };

  const startBooking = (listing: any) => {
    setBookingListing(listing);
    setShowBookingForm(true);
    setBookingStep(1);
    // Pre-fill user data
    setBookingData({
      travelers: 1,
      travelDate: '',
      specialRequests: '',
      contactName: userData?.name || '',
      contactEmail: user?.email || '',
      contactPhone: '',
      preferences: [],
      paymentMethod: 'pay_later',
      insurance: false,
      termsAccepted: false,
      emergencyContact: '',
      dietaryRestrictions: '',
      accessibilityNeeds: '',
      bookingNotes: ''
    });
  };

  const nextBookingStep = () => {
    if (bookingStep < 4) {
      setBookingStep(bookingStep + 1);
    }
  };

  const prevBookingStep = () => {
    if (bookingStep > 1) {
      setBookingStep(bookingStep - 1);
    }
  };

  const submitBooking = async () => {
    if (!user || !bookingListing) return;

    try {
      // Debug: Log the booking listing data
      console.log('Booking listing data:', bookingListing);
      
      const bookingDoc = {
        userId: user.uid,
        userName: bookingData.contactName,
        userEmail: bookingData.contactEmail,
        userPhone: bookingData.contactPhone,
        listingId: bookingListing.id,
        listingTitle: bookingListing.title || 'Unknown Package',
        agencyId: bookingListing.agencyId,
        agencyName: bookingListing.agencyName || 'Unknown Agency',
        packageType: bookingListing.packageType || 'domestic', // Save package type for currency display
        travelers: bookingData.travelers,
        travelDate: bookingData.travelDate,
        specialRequests: bookingData.specialRequests,
        preferences: bookingData.preferences,
        totalAmount: parseFloat(bookingListing.price || bookingListing.cost || '0') * bookingData.travelers,
        status: 'pending',
        createdAt: new Date(),
        bookingReference: `BK${Date.now().toString().slice(-6)}`,
      };

      console.log('Booking document to be created:', bookingDoc);

      const dbInstance = getDbInstance();
      if (!dbInstance) return;
      await addDoc(collection(dbInstance, 'bookings'), bookingDoc);

      alert(`Booking submitted successfully! Reference: ${bookingDoc.bookingReference}`);
      setShowBookingForm(false);
      setBookingListing(null);
      setBookingStep(1);
      setBookingData({
        travelers: 1,
        travelDate: '',
        specialRequests: '',
        contactName: '',
        contactEmail: '',
        contactPhone: '',
        preferences: [],
        paymentMethod: 'pay_later',
        insurance: false,
        termsAccepted: false,
        emergencyContact: '',
        dietaryRestrictions: '',
        accessibilityNeeds: '',
        bookingNotes: ''
      });
      
      // Note: Real-time listener will automatically update the bookings list
      // No need to manually refresh as onSnapshot is now being used
      
    } catch (error) {
      console.error('Error submitting booking:', error);
      alert('Failed to submit booking. Please try again.');
    }
  };

  const submitSupportTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!supportSubject.trim() || !supportDescription.trim()) {
      alert('Please fill out the subject and description.');
      return;
    }

    setSubmittingSupportTicket(true);
    try {
      const dbInstance = getDbInstance();
      if (!dbInstance) throw new Error('Database not initialized');

      // Find selected booking reference or agency details if a booking was chosen
      const chosenBooking = userBookings.find(b => b.id === supportBookingId);

      const ticketDoc = {
        userId: user.uid,
        userName: userData?.name || user.displayName || user.email?.split('@')[0] || 'User',
        userEmail: user.email || '',
        bookingId: supportBookingId || null,
        bookingRef: chosenBooking?.bookingReference || null,
        agencyId: chosenBooking?.agencyId || null,
        agencyName: chosenBooking?.agencyName || null,
        reason: supportReason,
        subject: supportSubject,
        description: supportDescription,
        status: 'pending', // pending, in-review, resolved
        createdAt: new Date(),
      };

      await addDoc(collection(dbInstance, 'support_tickets'), ticketDoc);
      
      // Clear form
      setSupportBookingId('');
      setSupportReason('Agency is not responding after payment');
      setSupportSubject('');
      setSupportDescription('');

      alert('Dispute ticket submitted successfully! Our platform administrators will review this and contact you within 24 hours.');
    } catch (error) {
      console.error('Error submitting support ticket:', error);
      alert('Failed to submit support ticket. Please try again.');
    } finally {
      setSubmittingSupportTicket(false);
    }
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
  }

  if (user && userData) {
    if (userData.role === 'admin') {
      return (
        <div className="flex h-screen bg-gray-100">
          {/* Sidebar */}
          <div className="w-64 bg-white shadow-card rounded-3xl my-4 ml-4 overflow-hidden border border-gray-100 sidebar-scroll">
            <div className="p-6 border-b">
              <h2 className="text-2xl font-bold text-gray-800">Travel Agency</h2>
              <p className="text-sm text-gray-600">Admin Dashboard</p>
            </div>
            <nav className="p-4">
              <div className="space-y-2">
                {/* <button
                  onClick={() => setAgencyActiveSection('listings')}
                  className={`w-full text-left px-4 py-2 rounded-lg ${
                    agencyActiveSection === 'listings'
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                   Listings
                </button> */}
                <button
                  onClick={() => setActiveSection('overview')}
                  className={`w-full text-left px-4 py-2 rounded-lg ${
                    activeSection === 'overview'
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                   Overview
                </button>
                <button
                  onClick={() => setActiveSection('analytics')}
                  className={`w-full text-left px-4 py-2 rounded-lg ${
                    activeSection === 'analytics'
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                   Analytics
                </button>
                <button
                  onClick={() => setActiveSection('agencies')}
                  className={`w-full text-left px-4 py-2 rounded-lg ${
                    activeSection === 'agencies'
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                   Agencies
                </button>
                <button
                  onClick={() => setActiveSection('listings')}
                  className={`w-full text-left px-4 py-2 rounded-lg ${
                    activeSection === 'listings'
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                    Listings
                </button>
                <button
                  onClick={() => setActiveSection('settings')}
                  className={`w-full text-left px-4 py-2 rounded-lg ${
                    activeSection === 'settings'
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                   Settings
                </button>
              </div>
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1 dashboard-scroll mr-4 mt-4">
            <header className="sticky top-0 z-10 bg-white shadow-card rounded-3xl p-6 mb-4 border border-gray-100 gpu-accelerated">
              <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-900">
                  {activeSection === 'dashboard' && 'Admin Dashboard'}
                  {activeSection === 'approvals' && 'Agency Approvals'}
                  {activeSection === 'listings' && 'Listing Approvals'}
                  {activeSection === 'analytics' && 'Analytics & Reports'}
                  {activeSection === 'agencies' && 'All Agencies'}
                  {activeSection === 'settings' && 'Settings'}
                </h1>
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-600">Welcome, {userData.name}</span>
                  <Button variant="outline" size="sm" onClick={signOut}>Sign Out</Button>
                </div>
              </div>
            </header>

            <main className="p-6">
              {activeSection === 'overview' && (
                <>
                  {/* Analytics Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <span className="text-2xl">👥</span>
                          </div>
                          <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Total Agencies</p>
                            <p className="text-2xl font-bold text-gray-900">{allAgencies.length}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center">
                          <div className="p-2 bg-green-100 rounded-lg">
                            <span className="text-2xl">✅</span>
                          </div>
                          <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Approved</p>
                            <p className="text-2xl font-bold text-gray-900">{allAgencies.filter(a => a.approved).length}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center">
                          <div className="p-2 bg-yellow-100 rounded-lg">
                            <span className="text-2xl">⏳</span>
                          </div>
                          <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Pending</p>
                            <p className="text-2xl font-bold text-gray-900">{pendingAgencies.length}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center">
                          <div className="p-2 bg-purple-100 rounded-lg">
                            <span className="text-2xl">📈</span>
                          </div>
                          <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Total Listings</p>
                            <p className="text-2xl font-bold text-gray-900">{listings.length}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* System Overview */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <span className="mr-2">📊</span>
                        System Overview
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="text-sm font-medium">Active Travel Packages</p>
                            <p className="text-xs text-gray-500">Approved listings available to users</p>
                          </div>
                          <span className="text-lg font-bold text-blue-600">{listings.length}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="text-sm font-medium">Pending Approvals</p>
                            <p className="text-xs text-gray-500">Listings and agencies awaiting review</p>
                          </div>
                          <span className="text-lg font-bold text-yellow-600">{pendingListings.length + pendingAgencies.length}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="text-sm font-medium">System Status</p>
                            <p className="text-xs text-gray-500">All services operational</p>
                          </div>
                          <span className="text-sm font-semibold text-green-600">✅ Online</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}

              {activeSection === 'approvals' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <span className="mr-2">⏳</span>
                      Pending Agency Approvals
                    </CardTitle>
                    <CardDescription>
                      Review and approve new travel agency applications
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {pendingAgencies.length === 0 ? (
                      <p className="text-gray-500 text-center py-8">No pending approvals</p>
                    ) : (
                      <div className="space-y-4">
                        {pendingAgencies.map(agency => (
                          <div key={agency.id} className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center space-x-4">
                              <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                                <span className="text-lg">🏢</span>
                              </div>
                              <div>
                                <h3 className="font-semibold">{agency.companyName}</h3>
                                <p className="text-sm text-gray-600">{agency.name} • {agency.email || 'No email'}</p>
                              </div>
                            </div>
                            <div className="flex space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {/* Reject logic */}}
                              >
                                Reject
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => approveAgency(agency.id)}
                              >
                                Approve
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {activeSection === 'analytics' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Revenue Analytics</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                          <p className="text-gray-500"> Revenue Chart Coming Soon</p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>User Growth</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                          <p className="text-gray-500">📈 Growth Chart Coming Soon</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle>All Agencies</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {allAgencies.filter(a => a.approved).length === 0 ? (
                          <p className="text-gray-500 text-center py-8">No approved agencies yet</p>
                        ) : (
                          allAgencies.filter(a => a.approved).slice(0, 5).map(agency => (
                            <div key={agency.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                  <span className="text-sm">🏢</span>
                                </div>
                                <div>
                                  <p className="font-medium">{agency.companyName}</p>
                                  <p className="text-sm text-gray-600">{agencyListings.filter(l => l.agencyId === agency.id).length} listings</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-blue-600">{agencyListings.filter(l => l.agencyId === agency.id && l.approved).length}</p>
                                <p className="text-xs text-gray-500">Active</p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {activeSection === 'agencies' && !viewingAgency && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <span className="mr-2">👥</span>
                      All Agencies
                    </CardTitle>
                    <CardDescription>
                      Manage all registered travel agencies
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {allAgencies.map(agency => (
                        <div key={agency.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                              <span className="text-lg">🏢</span>
                            </div>
                            <div>
                              <h3 className="font-semibold">{agency.companyName}</h3>
                              <p className="text-sm text-gray-600">{agency.name} • {agency.email || 'No email'}</p>
                              <p className="text-xs text-gray-500">
                                Status: {agency.approved ? '✅ Approved' : '⏳ Pending'}
                              </p>
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm" onClick={() => setViewingAgency(agency)}>
                              View Details
                            </Button>
                            {!agency.approved && (
                              <Button
                                size="sm"
                                onClick={() => approveAgency(agency.id)}
                              >
                                Approve
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {viewingAgency && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center">
                        <span className="mr-2">🏢</span>
                        {viewingAgency.companyName} - Details
                      </CardTitle>
                      <Button variant="outline" size="sm" onClick={() => setViewingAgency(null)}>
                        Back 
                      </Button>
                    </div>
                    <CardDescription>
                      Complete information about the travel agency
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Basic Information */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h3 className="font-semibold text-lg mb-4">Basic Information</h3>
                        <div className="space-y-3">
                          <div>
                            <p className="text-sm text-gray-600">Agency Name</p>
                            <p className="font-medium">{viewingAgency.companyName}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Owner Name</p>
                            <p className="font-medium">{viewingAgency.name}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Email</p>
                            <p className="font-medium">{viewingAgency.email || 'No email provided'}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Contact Number</p>
                            <p className="font-medium">{viewingAgency.contactNumber || 'No contact number'}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Business Location</p>
                            <p className="font-medium">{viewingAgency.businessLocation || 'No location specified'}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Status</p>
                            <p className={`font-medium ${viewingAgency.approved ? 'text-green-600' : 'text-yellow-600'}`}>
                              {viewingAgency.approved ? '✅ Approved' : '⏳ Pending'}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 className="font-semibold text-lg mb-4">Operating Details</h3>
                        <div className="space-y-3">
                          <div>
                            <p className="text-sm text-gray-600">Operating From</p>
                            <p className="font-medium">
                              {viewingAgency.operatingFromHome && viewingAgency.operatingFromOffice ? 'Home & Office' : 
                               viewingAgency.operatingFromHome ? 'Home' : 
                               viewingAgency.operatingFromOffice ? 'Office' : 'Not specified'}
                            </p>
                          </div>
                          {viewingAgency.operatingFromOffice && (
                            <div>
                              <p className="text-sm text-gray-600">Office Address</p>
                              <p className="font-medium">{viewingAgency.officeAddress || 'No office address'}</p>
                            </div>
                          )}
                          <div>
                            <p className="text-sm text-gray-600">Website</p>
                            <p className="font-medium">{viewingAgency.companyName ? viewingAgency.companyName : 'No website'}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Upload Office Photos</p>
                            <p className="font-medium">{viewingAgency.uploadOfficePhotos ? 'Yes' : 'No'}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Upload Branding</p>
                            <p className="font-medium">{viewingAgency.uploadBranding ? 'Yes' : 'No'}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Full Address */}
                    <div>
                      <h3 className="font-semibold text-lg mb-4">Full Address</h3>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="font-medium">{viewingAgency.fullAddress || 'No address provided'}</p>
                      </div>
                    </div>

                    {/* Agency Description */}
                    <div>
                      <h3 className="font-semibold text-lg mb-4">Agency Description</h3>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="font-medium">{viewingAgency.agencyDescription || 'No description provided'}</p>
                      </div>
                    </div>

                    {/* Refund Policy */}
                    <div>
                      <h3 className="font-semibold text-lg mb-4">Refund & Cancellation Policy</h3>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="font-medium">{viewingAgency.refundPolicy || 'No refund policy provided'}</p>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex space-x-2 pt-4">
                      {!viewingAgency.approved && (
                        <Button onClick={() => approveAgency(viewingAgency.id)}>
                          Approve Agency
                        </Button>
                      )}
                      <Button variant="outline" onClick={() => setViewingAgency(null)}>
                        Back 
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {activeSection === 'listings' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <span className="mr-2">🏖️</span>
                      Pending Listing Approvals
                    </CardTitle>
                    <CardDescription>
                      Review and approve new travel packages from agencies
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {pendingListings.length === 0 ? (
                      <p className="text-gray-500 text-center py-8">No pending listing approvals</p>
                    ) : (
                      <div className="space-y-4">
                        {pendingListings.map(listing => (
                          <div key={listing.id} className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center space-x-4">
                              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                <span className="text-lg">🏖️</span>
                              </div>
                              <div>
                                <h3 className="font-semibold">{listing.title}</h3>
                                <p className="text-sm text-gray-600 font-semibold">
                                  {listing.packageType === 'international' ? ' International' : ' Domestic'} • {listing.packageType === 'international' ? (listing.countryName || 'Country not specified') : (listing.stateName || 'State not specified')}
                                </p>
                                <p className="text-sm text-gray-600">
                                  {listing.itinerary?.length || 0} days • ${listing.cost || listing.price || 'N/A'}
                                </p>
                                {listing.placesCovered && listing.placesCovered.length > 0 && (
                                  <p className="text-xs text-gray-500">
                                    Places: {listing.placesCovered.map((place: any) => place.name).join(', ')}
                                  </p>
                                )}
                                <p className="text-xs text-gray-500 mt-1">
                                  By: {listing.agencyName}
                                </p>
                              </div>
                            </div>
                            <div className="flex space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  // For now, show listing details in alert since modal has CSS issues
                                  const details = `Title: ${listing.title}\nPackage Type: ${listing.packageType === 'international' ? 'International' : 'Domestic'}\nPlaces: ${listing.placesCovered?.map((place: any) => place.name).join(', ') || 'Not specified'}\nDuration: ${listing.itinerary?.length || 0} days\nCost: ${listing.cost || listing.price || 'N/A'}\nDescription: ${listing.description || 'Not provided'}`;
                                  alert(`Listing Details:\n\n${details}`);
                                }}
                              >
                                View Details
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => approveListing(listing.id)}
                              >
                                Approve
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {activeSection === 'settings' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <span className="mr-2">⚙️</span>
                      Admin Settings
                    </CardTitle>
                    <CardDescription>
                      Configure system settings and preferences
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <Label htmlFor="adminEmail">Admin Email</Label>
                        <Input id="adminEmail" value={process.env.NEXT_PUBLIC_ADMIN_EMAIL} disabled />
                      </div>
                      <div>
                        <Label htmlFor="notifications">Email Notifications</Label>
                        <select className="w-full p-2 border rounded-lg" defaultValue="enabled">
                          <option value="enabled">Enabled</option>
                          <option value="disabled">Disabled</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold mb-4">Security Settings</h3>
                      <div className="space-y-3">
                        <label className="flex items-center">
                          <input type="checkbox" className="mr-2" defaultChecked />
                          <span className="text-sm">Require document verification for agencies</span>
                        </label>
                        <label className="flex items-center">
                          <input type="checkbox" className="mr-2" defaultChecked />
                          <span className="text-sm">Enable two-factor authentication</span>
                        </label>
                        <label className="flex items-center">
                          <input type="checkbox" className="mr-2" defaultChecked />
                          <span className="text-sm">Auto-approve agencies from trusted domains</span>
                        </label>
                      </div>
                    </div>

                    <Button>Save Settings</Button>
                  </CardContent>
                </Card>
              )}
            </main>
          </div>
        </div>
      );
    } else if (userData.role === 'user') {
      // User Dashboard
      return (
        <div className="flex flex-col h-screen bg-gray-100">
          {/* Top Navigation Bar */}
          <header className="bg-[#1C1F26] text-white py-3 px-6 shadow-md z-20 sticky top-0">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
              {/* Logo & Search */}
              <div className="flex items-center gap-6 flex-1 w-full">
                <div 
                  className="text-3xl font-extrabold tracking-wider cursor-pointer"
                  onClick={() => setUserActiveSection('listings')}
                >
                  <span className="text-white">BOM</span><span className="text-orange-500">TRA</span>
                </div>
                <div className="relative w-full max-w-xl">
                  <Input 
                    type="text" 
                    placeholder="Search your Holiday Destination" 
                    className="w-full pl-10 pr-4 py-2 rounded-full text-black bg-white focus:ring-orange-500 focus:outline-none border-none"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500">🔍</span>
                  </div>
                </div>
              </div>

              {/* Right Icons */}
              <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
                <div 
                  className="flex items-center gap-2 cursor-pointer hover:text-orange-400 transition-colors text-sm"
                  onClick={() => {
                    setPincodeInput(pincode.replace('Pincode ', ''));
                    setShowPincodeModal(true);
                  }}
                >
                  <span className="text-xl">📍</span>
                  <div className="flex flex-col leading-tight hidden xl:flex">
                    <span className="font-semibold">{pincode}</span>
                    <span className="text-xs text-gray-400">Location</span>
                  </div>
                </div>
                
                <div 
                  className={`flex items-center gap-2 cursor-pointer hover:text-orange-400 transition-colors text-sm group relative ${userActiveSection === 'profile' ? 'text-orange-500 font-bold' : ''}`}
                  onClick={() => setUserActiveSection('profile')}
                >
                  <span className="text-xl">👤</span>
                  <div className="flex flex-col leading-tight hidden xl:flex">
                    <span className="font-semibold">Hi, {userData?.name ? userData.name.split(' ')[0] : 'User'}</span>
                    <span 
                      className="text-xs text-gray-400 hover:text-white" 
                      onClick={(e) => {
                        e.stopPropagation();
                        signOut();
                      }}
                    >
                      Sign Out
                    </span>
                  </div>
                  {/* Mobile Sign Out */}
                  <span 
                    className="xl:hidden absolute top-8 right-0 bg-black text-white p-2 rounded shadow opacity-0 group-hover:opacity-100" 
                    onClick={(e) => {
                      e.stopPropagation();
                      signOut();
                    }}
                  >
                    Sign Out
                  </span>
                </div>

                <div 
                  className="flex items-center gap-2 cursor-pointer hover:text-orange-400 transition-colors text-sm"
                  onClick={() => setUserActiveSection('bookings')}
                >
                  <span className="text-xl">🚶</span>
                  <div className="flex flex-col leading-tight hidden xl:flex">
                    <span className="font-semibold">My Tour</span>
                    <span className="text-xs text-gray-400">& Cancellation</span>
                  </div>
                </div>

                <div 
                  className="flex items-center gap-2 cursor-pointer hover:text-orange-400 transition-colors text-sm"
                  onClick={() => setUserActiveSection('wishlist')}
                >
                  <span className="text-xl">⚖️</span>
                  <div className="flex flex-col leading-tight hidden xl:flex">
                    <span className="font-semibold">Compare</span>
                    <span className="text-xs text-gray-400">& Wishlist</span>
                  </div>
                </div>

                <div 
                  className="flex items-center gap-2 cursor-pointer hover:text-orange-400 transition-colors text-sm"
                  onClick={() => setUserActiveSection('chat')}
                >
                  <span className="text-xl">💬</span>
                  <div className="flex flex-col leading-tight hidden xl:flex">
                    <span className="font-semibold">Messages</span>
                    <span className="text-xs text-gray-400">Agencies</span>
                  </div>
                </div>

                <div 
                  className={`flex items-center gap-2 cursor-pointer hover:text-orange-400 transition-colors text-sm ${userActiveSection === 'support' ? 'text-orange-500 font-bold' : ''}`}
                  onClick={() => setUserActiveSection('support')}
                >
                  <span className="text-xl">🛡️</span>
                  <div className="flex flex-col leading-tight hidden xl:flex">
                    <span className="font-semibold">Support</span>
                    <span className="text-xs text-gray-400">Dispute & Help</span>
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Secondary Nav Bar */}
          <nav className="bg-[#14161C] border-t border-gray-800 shadow-sm z-10 hidden lg:block">
            <div className="max-w-7xl mx-auto px-6 py-2 flex items-center justify-between text-sm text-gray-300 font-medium">
              <div className="flex items-center gap-8">
                <button className="flex items-center gap-1 hover:text-white transition-colors" onClick={() => setUserActiveSection('listings')}>
                 
                </button>
              </div>
            </div>
          </nav>

          {/* Main Dashboard Scroll Area */}
          <div 
            className="flex-1 overflow-y-auto w-full pb-10 dashboard-scroll fast-scroll"
            id="user-dashboard-scroll-container"
          >
            {userActiveSection === 'listings' && !viewingListing && !showBookingForm && !showComparison && (
              <div className="w-full bg-gradient-to-r from-[#2B58C4] to-[#407BFF] py-16 px-6 shadow-inner relative overflow-hidden mb-8">
                {/* Airplane Illustration placeholder */}
                <div className="absolute top-4 right-10 md:right-40 opacity-30 pointer-events-none">
                  <span className="text-8xl">✈️</span>
                </div>
                <div className="absolute bottom-4 left-10 md:left-40 opacity-30 pointer-events-none">
                  <span className="text-8xl">🛳️</span>
                </div>
                <div className="max-w-4xl mx-auto text-center relative z-10 text-white">
                  <div className="inline-block bg-[#FDB813] text-black px-4 py-1 font-bold text-sm mb-6 rounded shadow-sm tracking-wide">
                    BEST TRAVEL AGENTS AT ONE PLACE
                  </div>
                  <h1 className="text-4xl md:text-6xl font-extrabold mb-4 tracking-tight drop-shadow-lg">
                    BOOK YOUR TOUR WITH US
                  </h1>
                  <p className="text-lg md:text-xl text-blue-100 font-medium tracking-wide">
                    Domestic Tour | International tour
                  </p>
                </div>
              </div>
            )}

            <main className="px-6 max-w-7xl mx-auto w-full">
              {/* Header logic adjusted for non-listings sections (excludes bookings and profile which have their own layouts) */}
              {userActiveSection !== 'listings' && userActiveSection !== 'bookings' && userActiveSection !== 'profile' && (
                <div className="mb-6 flex justify-between items-center border-b pb-4 border-gray-200 mt-6">
                  <h1 className="text-3xl font-bold text-gray-900">
                    {userActiveSection === 'chat' && 'Messages'}
                    {userActiveSection === 'wishlist' && 'My Wishlist'}
                  </h1>
                </div>
              )}

              {userActiveSection === 'listings' && !viewingListing && !showBookingForm && !showComparison && (
                <>

                  {/* Comparison Bar */}
                  {comparisonList.length > 0 && (
                    <Card className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 shadow-md">
                      <CardContent className="p-4">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-lg">⚖️</span>
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-gray-900">
                                Comparing {comparisonList.length} of 3 packages
                              </p>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {comparisonList.map(pkg => (
                                  <span key={pkg.id} className="bg-white px-2 py-0.5 rounded text-xs border border-blue-200 truncate max-w-[150px]">
                                    {pkg.title ? `${pkg.title.slice(0, 25)}${pkg.title.length > 25 ? '...' : ''}` : 'Untitled Package'}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2 w-full sm:w-auto">
                            <Button 
                              size="sm" 
                              onClick={() => setShowComparison(true)}
                              className="flex-1 sm:flex-none"
                            >
                              Compare Now ({comparisonList.length})
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={clearComparison}
                              className="flex-1 sm:flex-none"
                            >
                              Clear
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {listings.length === 0 ? (
                      <div className="col-span-full text-center py-12">
                        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <span className="text-3xl">🏖️</span>
                        </div>
                        <p className="text-gray-500">No travel packages available yet.</p>
                      </div>
                    ) : (
                      listings
                        .filter(listing => {
                          // Apply search filter - search across all relevant fields
                          if (searchTerm) {
                            const searchLower = searchTerm.toLowerCase();
                            const title = (listing.title || '').toLowerCase();
                            const description = (listing.description || '').toLowerCase();
                            const destination = (listing.destination || '').toLowerCase();
                            const stateName = (listing.stateName || '').toLowerCase();
                            const countryName = (listing.countryName || '').toLowerCase();
                            const packageType = (listing.packageType || '').toLowerCase();
                            const type = (listing.type || '').toLowerCase();
                            const price = (listing.price || listing.cost || '').toString().toLowerCase();
                            const duration = (listing.duration || '').toString().toLowerCase();
                            const itineraryDays = (listing.itinerary?.length || '').toString();
                            
                            // Check if search term matches any field
                            const matches = title.includes(searchLower) ||
                                          description.includes(searchLower) ||
                                          destination.includes(searchLower) ||
                                          stateName.includes(searchLower) ||
                                          countryName.includes(searchLower) ||
                                          packageType.includes(searchLower) ||
                                          type.includes(searchLower) ||
                                          price.includes(searchLower) ||
                                          duration.includes(searchLower) ||
                                          itineraryDays.includes(searchLower);
                                          
                            if (!matches) {
                              return false;
                            }
                          }

                          return true;
                        })
                        .map((listing) => (
                          <ListingCard
                            key={listing.id}
                            listing={listing}
                            onView={setViewingListing}
                            onBook={startBooking}
                            onChat={handleInitiateChat}
                            onWishlist={handleWishlistToggle}
                            isWishlisted={wishlist.includes(listing.id)}
                            variant="user"
                          />
                        ))
                    )}
                  </div>
                </>
              )}

              {showBookingForm && userActiveSection === 'listings' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <span className="mr-2">📅</span>
                      Book Your Trip - Step {bookingStep} of 4
                    </CardTitle>
                    <CardDescription>
                      {bookingListing?.title} • By {bookingListing?.agencyName}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Progress Indicator */}
                    <div className="flex items-center space-x-4 mb-6">
                      {[1, 2, 3, 4].map((step) => (
                        <div key={step} className="flex items-center">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                            step <= bookingStep ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-500'
                          }`}>
                            {step}
                          </div>
                          {step < 4 && (
                            <div className={`w-12 h-1 mx-2 ${
                              step < bookingStep ? 'bg-blue-500' : 'bg-gray-200'
                            }`} />
                          )}
                        </div>
                      ))}
                    </div>

                    {bookingStep === 1 && (
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Package Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="travelers">Number of Travelers</Label>
                            <select
                              id="travelers"
                              className="w-full p-2 border rounded-lg"
                              value={bookingData.travelers}
                              onChange={(e) => setBookingData({ ...bookingData, travelers: parseInt(e.target.value) })}
                            >
                              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                                <option key={num} value={num}>{num} {num === 1 ? 'Traveler' : 'Travelers'}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <Label htmlFor="travelDate">Preferred Travel Date</Label>
                            <Input
                              id="travelDate"
                              type="date"
                              value={bookingData.travelDate}
                              onChange={(e) => setBookingData({ ...bookingData, travelDate: e.target.value })}
                              min={new Date().toISOString().split('T')[0]}
                            />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="specialRequests">Special Requests or Notes</Label>
                          <textarea
                            id="specialRequests"
                            className="w-full p-2 border rounded-lg"
                            rows={3}
                            value={bookingData.specialRequests}
                            onChange={(e) => setBookingData({ ...bookingData, specialRequests: e.target.value })}
                            placeholder="Any special requirements, dietary restrictions, or preferences..."
                          />
                        </div>
                      </div>
                    )}

                    {bookingStep === 2 && (
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Travel Preferences</h3>
                        <div className="space-y-3">
                          <Label>Select your interests (optional)</Label>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {['Adventure', 'Culture', 'Food', 'Relaxation', 'Shopping', 'Nightlife'].map(pref => (
                              <label key={pref} className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  checked={bookingData.preferences.includes(pref)}
                                  onChange={(e) => {
                                    const newPrefs = e.target.checked
                                      ? [...bookingData.preferences, pref]
                                      : bookingData.preferences.filter(p => p !== pref);
                                    setBookingData({ ...bookingData, preferences: newPrefs });
                                  }}
                                  className="rounded"
                                />
                                <span className="text-sm">{pref}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {bookingStep === 3 && (
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Contact Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="contactName">Full Name</Label>
                            <Input
                              id="contactName"
                              value={bookingData.contactName}
                              onChange={(e) => setBookingData({ ...bookingData, contactName: e.target.value })}
                              placeholder="Enter your full name"
                            />
                          </div>
                          <div>
                            <Label htmlFor="contactEmail">Email Address</Label>
                            <Input
                              id="contactEmail"
                              type="email"
                              value={bookingData.contactEmail}
                              onChange={(e) => setBookingData({ ...bookingData, contactEmail: e.target.value })}
                              placeholder="Enter your email"
                            />
                          </div>
                          <div className="md:col-span-2">
                            <Label htmlFor="contactPhone">Phone Number</Label>
                            <Input
                              id="contactPhone"
                              value={bookingData.contactPhone}
                              onChange={(e) => setBookingData({ ...bookingData, contactPhone: e.target.value })}
                              placeholder="Enter your phone number"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {bookingStep === 4 && (
                      <div className="space-y-6">
                        <h3 className="text-lg font-semibold">Booking Summary</h3>
                        <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                          <div className="flex justify-between">
                            <span>Package:</span>
                            <span className="font-semibold">{bookingListing?.title}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Package Type:</span>
                            <span className={`font-semibold ${bookingListing?.packageType === 'international' ? 'text-blue-600' : 'text-green-600'}`}>
                              {bookingListing?.packageType === 'international' ? 'International' : 'Domestic'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Travelers:</span>
                            <span>{bookingData.travelers}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Travel Date:</span>
                            <span>{bookingData.travelDate || 'Not specified'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Price per person:</span>
                            <span className="font-semibold">
                              {bookingListing?.packageType === 'international' ? '$' : '₹'}
                              {(bookingListing?.price || bookingListing?.cost || '0')}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Subtotal:</span>
                            <span className="font-semibold">
                              {bookingListing?.packageType === 'international' ? '$' : '₹'}
                              {((parseFloat(bookingListing?.price || bookingListing?.cost || '0') * bookingData.travelers)).toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Service Fee (5%):</span>
                            <span className="font-semibold">
                              {bookingListing?.packageType === 'international' ? '$' : '₹'}
                              {((parseFloat(bookingListing?.price || bookingListing?.cost || '0') * bookingData.travelers * 0.05)).toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between font-bold text-lg border-t pt-2">
                            <span>Total Amount:</span>
                            <span className="text-green-600 font-extrabold">
                              {bookingListing?.packageType === 'international' ? '$' : '₹'}
                              {((parseFloat(bookingListing?.price || bookingListing?.cost || '0') * bookingData.travelers * 1.05)).toFixed(2)}
                            </span>
                          </div>
                        </div>
                        
                        {/* Additional User Features */}
                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold">Additional Services</h3>
                          
                          {/* Travel Insurance */}
                          <div className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center space-x-3">
                              <input
                                type="checkbox"
                                checked={bookingData.insurance}
                                onChange={(e) => setBookingData({...bookingData, insurance: e.target.checked})}
                                className="h-4 w-4 text-blue-600"
                              />
                              <div>
                                <div className="font-medium">Travel Insurance</div>
                                <div className="text-sm text-gray-600">Covers medical emergencies and trip cancellations</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold">
                                {bookingListing?.packageType === 'international' ? '$' : '₹'}{(bookingData.travelers * 50).toFixed(2)}
                              </div>
                              <div className="text-xs text-gray-500">One-time fee</div>
                            </div>
                          </div>

                          {/* Airport Transfer */}
                          <div className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center space-x-3">
                              <input
                                type="checkbox"
                                checked={bookingData.paymentMethod === 'pay_later'}
                                onChange={(e) => setBookingData({...bookingData, paymentMethod: e.target.checked ? 'pay_later' : 'pay_now'})}
                                className="h-4 w-4 text-blue-600"
                              />
                              <div>
                                <div className="font-medium">Airport Transfer</div>
                                <div className="text-sm text-gray-600">Pickup and drop from airport</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold">
                                {bookingListing?.packageType === 'international' ? '$' : '₹'}{(bookingData.travelers * 25).toFixed(2)}
                              </div>
                              <div className="text-xs text-gray-500">Round trip</div>
                            </div>
                          </div>

                          {/* Special Requirements */}
                          <div className="space-y-2">
                            <Label htmlFor="emergencyContact">Emergency Contact</Label>
                            <Input
                              id="emergencyContact"
                              placeholder="Emergency contact name and phone"
                              value={bookingData.emergencyContact}
                              onChange={(e) => setBookingData({...bookingData, emergencyContact: e.target.value})}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="dietaryRestrictions">Dietary Restrictions</Label>
                            <Input
                              id="dietaryRestrictions"
                              placeholder="Any dietary restrictions or allergies"
                              value={bookingData.dietaryRestrictions}
                              onChange={(e) => setBookingData({...bookingData, dietaryRestrictions: e.target.value})}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="accessibilityNeeds">Accessibility Needs</Label>
                            <Input
                              id="accessibilityNeeds"
                              placeholder="Any mobility or accessibility requirements"
                              value={bookingData.accessibilityNeeds}
                              onChange={(e) => setBookingData({...bookingData, accessibilityNeeds: e.target.value})}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="bookingNotes">Additional Notes</Label>
                            <textarea
                              id="bookingNotes"
                              className="w-full p-3 border rounded-lg"
                              rows={3}
                              placeholder="Any other special requests or information"
                              value={bookingData.bookingNotes}
                              onChange={(e) => setBookingData({...bookingData, bookingNotes: e.target.value})}
                            />
                          </div>
                        </div>

                        <div className="bg-blue-50 p-4 rounded-lg">
                          <h4 className="font-semibold text-blue-800 mb-2">Important Notes:</h4>
                          <ul className="text-sm text-blue-700 space-y-1">
                            <li>• Booking will be confirmed within 24 hours</li>
                            <li>• Payment details will be shared after confirmation</li>
                            <li>• You can modify or cancel your booking before payment</li>
                            <li>• Travel insurance covers medical emergencies up to $10,000</li>
                            <li>• Airport transfer available 24/7 with advance notice</li>
                          </ul>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-between pt-4">
                      <Button
                        variant="outline"
                        onClick={prevBookingStep}
                        disabled={bookingStep === 1}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setShowBookingForm(false)}
                      >
                        Cancel
                      </Button>
                      {bookingStep < 4 ? (
                        <Button onClick={nextBookingStep}>
                          Next
                        </Button>
                      ) : (
                        <Button onClick={submitBooking} className="bg-green-600 hover:bg-green-700">
                          Confirm Booking
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {viewingListing && userActiveSection === 'listings' && !showComparison && (
                <PackageDetailView 
                  listing={viewingListing}
                  onBack={() => setViewingListing(null)}
                  onBook={startBooking}
                  onChat={handleInitiateChat}
                  onWishlist={(listingId) => {
                    setWishlist(prev => 
                      prev.includes(listingId) 
                        ? prev.filter(id => id !== listingId)
                        : [...prev, listingId]
                    );
                  }}
                  isWishlisted={wishlist.includes(viewingListing.id)}
                />
              )}

              {/* Package Comparison View */}
              {showComparison && userActiveSection === 'listings' && (
                <PackageComparison
                  onBack={() => setShowComparison(false)}
                  onBook={(listing) => {
                    setShowComparison(false);
                    startBooking(listing);
                  }}
                />
              )}

              {userActiveSection === 'bookings' && (
                <div className="min-h-screen bg-gray-50 -mx-6">
                  {/* Hero Banner for Bookings */}
                  <div className="w-full bg-gradient-to-r from-[#1C1F26] to-[#2B2F3A] py-12 px-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 opacity-5 text-[200px] leading-none pointer-events-none select-none">✈️</div>
                    <div className="absolute bottom-0 left-20 opacity-5 text-[150px] leading-none pointer-events-none select-none">🗺️</div>
                    <div className="max-w-5xl mx-auto relative z-10">
                      <div className="inline-block bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded mb-4 tracking-widest uppercase">My Travel History</div>
                      <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-3 tracking-tight">My Tours & Cancellations</h1>
                      <p className="text-gray-400 text-lg">Track your bookings, view itineraries, and manage your travel plans.</p>
                      {userBookings.length > 0 && (
                        <div className="flex gap-6 mt-6 flex-wrap">
                          <div className="bg-white/10 backdrop-blur-sm rounded-xl px-5 py-3 border border-white/10">
                            <div className="text-2xl font-bold text-white">{userBookings.length}</div>
                            <div className="text-xs text-gray-400 uppercase tracking-wider">Total Bookings</div>
                          </div>
                          <div className="bg-white/10 backdrop-blur-sm rounded-xl px-5 py-3 border border-white/10">
                            <div className="text-2xl font-bold text-green-400">{userBookings.filter((b: any) => b.status === 'confirmed').length}</div>
                            <div className="text-xs text-gray-400 uppercase tracking-wider">Confirmed</div>
                          </div>
                          <div className="bg-white/10 backdrop-blur-sm rounded-xl px-5 py-3 border border-white/10">
                            <div className="text-2xl font-bold text-yellow-400">{userBookings.filter((b: any) => b.status === 'pending').length}</div>
                            <div className="text-xs text-gray-400 uppercase tracking-wider">Pending</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="max-w-5xl mx-auto px-4 py-10 space-y-6">
                  {userBookings.length === 0 ? (
                    <div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden">
                      <div className="bg-gradient-to-r from-[#2B58C4] to-[#407BFF] h-2 w-full" />
                      <div className="p-16 text-center">
                        <div className="w-28 h-28 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl">
                          <span className="text-6xl">✈️</span>
                        </div>
                        <h3 className="text-3xl font-extrabold text-gray-900 mb-3">No Trips Booked Yet</h3>
                        <p className="text-gray-500 text-lg max-w-md mx-auto mb-8 leading-relaxed">
                          Your travel adventures will appear here. Explore our amazing packages and book your first unforgettable trip!
                        </p>
                        <button
                          onClick={() => setUserActiveSection('listings')}
                          className="bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-full px-10 py-4 text-lg font-bold shadow-xl hover:shadow-orange-300/50 transition-all duration-300 hover:-translate-y-1"
                        >
                          🌍 Explore Packages
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-5">
                      {userBookings.map((booking) => {
                        const isConfirmed = booking.status === 'confirmed';
                        const isPending = booking.status === 'pending';
                        const isCancelled = booking.status === 'cancelled';
                        const isIntl = booking.packageType === 'international';
                        const currency = isIntl ? '$' : '₹';
                        const totalAmt = typeof booking.totalAmount === 'number'
                          ? booking.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                          : parseFloat(booking.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

                        return (
                          <div key={booking.id} className={`rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 border ${
                            isConfirmed ? 'border-green-200' : isPending ? 'border-amber-200' : 'border-red-200'
                          }`}>

                            {/* ── TICKET HEADER ── */}
                            <div className={`relative px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                              isConfirmed
                                ? 'bg-gradient-to-r from-[#0F4C35] to-[#1a6647]'
                                : isPending
                                ? 'bg-gradient-to-r from-[#7B4F00] to-[#A86800]'
                                : 'bg-gradient-to-r from-[#6B1616] to-[#8B2020]'
                            }`}>
                              {/* Decorative circles (ticket punch) */}
                              <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 bg-gray-100 rounded-full hidden sm:block z-10" />
                              <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-6 h-6 bg-gray-100 rounded-full hidden sm:block z-10" />

                              <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-xl bg-white/15 flex items-center justify-center text-3xl shadow-inner shrink-0">
                                  {isIntl ? '🌍' : '🏔️'}
                                </div>
                                <div>
                                  <p className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-0.5">{isIntl ? 'International Tour' : 'Domestic Tour'}</p>
                                  <h3 className="text-white font-extrabold text-xl leading-tight">{booking.listingTitle || 'Travel Package'}</h3>
                                  <p className="text-white/70 text-sm mt-0.5">by <span className="font-semibold text-white/90">{booking.agencyName}</span></p>
                                </div>
                              </div>

                              <div className="flex flex-col items-start sm:items-end gap-2 shrink-0">
                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest border ${
                                  isConfirmed ? 'bg-green-400/20 text-green-200 border-green-400/40' :
                                  isPending ? 'bg-amber-400/20 text-amber-200 border-amber-400/40' :
                                  'bg-red-400/20 text-red-200 border-red-400/40'
                                }`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${isConfirmed ? 'bg-green-400' : isPending ? 'bg-amber-400' : 'bg-red-400'} animate-pulse`} />
                                  {isConfirmed ? 'Confirmed' : isPending ? 'Pending Review' : 'Cancelled'}
                                </span>
                                <span className="text-white/50 text-xs font-mono bg-white/10 px-2 py-0.5 rounded">
                                  #{booking.bookingReference}
                                </span>
                              </div>
                            </div>

                            {/* ── TICKET BODY ── */}
                            <div className="bg-white">
                              {/* Dashed divider - ticket tear line */}
                              <div className="flex items-center px-4">
                                <div className="w-5 h-5 rounded-full bg-gray-100 -ml-7 shrink-0 hidden sm:block border border-gray-200" />
                                <div className="flex-1 border-t-2 border-dashed border-gray-200 mx-2" />
                                <div className="w-5 h-5 rounded-full bg-gray-100 -mr-7 shrink-0 hidden sm:block border border-gray-200" />
                              </div>

                              {/* Key Details Row */}
                              <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-gray-100 border-b border-gray-100">
                                {[
                                  { label: 'DEPARTURE DATE', value: booking.travelDate || 'TBD', icon: '📅' },
                                  { label: 'PASSENGERS', value: `${booking.travelers} ${booking.travelers === 1 ? 'Person' : 'People'}`, icon: '👤' },
                                  { label: 'TOTAL FARE', value: `${currency}${totalAmt}`, icon: '💳', green: true },
                                  { label: 'BOOKED ON', value: booking.createdAtFormatted || '—', icon: '🗓️' },
                                ].map((item, i) => (
                                  <div key={i} className="px-5 py-4">
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1 flex items-center gap-1">
                                      <span>{item.icon}</span> {item.label}
                                    </p>
                                    <p className={`font-bold text-sm ${item.green ? 'text-emerald-600' : 'text-gray-900'}`}>{item.value}</p>
                                  </div>
                                ))}
                              </div>

                              {/* Passenger + Requests Row */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 divide-y sm:divide-y-0 sm:divide-x divide-gray-100 border-b border-gray-100">
                                {/* Passenger Info */}
                                <div className="px-6 py-5">
                                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1">
                                    <span>👤</span> Passenger Info
                                  </p>
                                  <div className="space-y-2.5">
                                    {[
                                      { label: 'Full Name', value: booking.userName },
                                      { label: 'Email', value: booking.userEmail },
                                      { label: 'Mobile', value: booking.userPhone },
                                    ].map((row, i) => (
                                      <div key={i} className="flex justify-between items-center text-sm">
                                        <span className="text-gray-400 font-medium w-20 shrink-0">{row.label}</span>
                                        <span className="text-gray-800 font-semibold text-right truncate ml-2">{row.value || '—'}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                {/* Status + Preferences */}
                                <div className="px-6 py-5">
                                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1">
                                    <span>📋</span> {isConfirmed ? 'Booking Status' : isPending ? 'Status Update' : 'Cancellation'}
                                  </p>
                                  {isConfirmed && (
                                    <div className="flex items-start gap-3">
                                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                                        <span className="text-base">✅</span>
                                      </div>
                                      <div>
                                        <p className="text-green-700 font-bold text-sm">Booking Confirmed</p>
                                        <p className="text-gray-500 text-xs mt-0.5">Your spot is reserved. Check journey details below.</p>
                                      </div>
                                    </div>
                                  )}
                                  {isPending && (
                                    <div className="flex items-start gap-3">
                                      <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                                        <span className="text-base">⏳</span>
                                      </div>
                                      <div>
                                        <p className="text-amber-700 font-bold text-sm">Under Review by {booking.agencyName}</p>
                                        <p className="text-gray-500 text-xs mt-0.5">You'll be notified once confirmed.</p>
                                      </div>
                                    </div>
                                  )}
                                  {isCancelled && (
                                    <div className="flex items-start gap-3">
                                      <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                                        <span className="text-base">❌</span>
                                      </div>
                                      <div>
                                        <p className="text-red-700 font-bold text-sm">Booking Cancelled</p>
                                        <p className="text-gray-500 text-xs mt-0.5">Contact {booking.agencyName} for refund info.</p>
                                      </div>
                                    </div>
                                  )}
                                  {booking.preferences && booking.preferences.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mt-3">
                                      {booking.preferences.map((pref: string, idx: number) => (
                                        <span key={idx} className="bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full text-xs font-medium border border-gray-200">
                                          {pref}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Journey Preview for Confirmed */}
                              {isConfirmed && booking.journeyDetails && (
                                <div className="border-b border-gray-100 bg-slate-50 px-6 py-4">
                                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1">
                                    <span>🗺️</span> Journey Preview
                                  </p>
                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    {booking.journeyDetails.flight && (
                                      <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
                                        <p className="text-[10px] text-blue-500 font-bold uppercase tracking-wider mb-1">✈️ Flight</p>
                                        <p className="text-sm text-gray-700 font-medium">{booking.journeyDetails.flight}</p>
                                      </div>
                                    )}
                                    {booking.journeyDetails.hotel && (
                                      <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
                                        <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider mb-1">🏨 Hotel</p>
                                        <p className="text-sm text-gray-700 font-medium">{booking.journeyDetails.hotel}</p>
                                      </div>
                                    )}
                                    {booking.journeyDetails.itinerary && (
                                      <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
                                        <p className="text-[10px] text-purple-500 font-bold uppercase tracking-wider mb-1">📋 Itinerary</p>
                                        <p className="text-sm text-gray-700 font-medium line-clamp-2">{booking.journeyDetails.itinerary}</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* ── ACTION BAR ── */}
                              <div className="px-6 py-4 bg-gray-50 flex flex-col sm:flex-row justify-between items-center gap-3">
                                <p className="text-xs text-gray-400 font-mono">
                                  Booking Ref: <span className="text-gray-600 font-bold">{booking.bookingReference}</span>
                                </p>
                                <div className="flex gap-2 w-full sm:w-auto">
                                  {(isConfirmed || isPending) && (
                                    <button
                                      className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 bg-[#1C1F26] hover:bg-black text-white rounded-xl px-5 py-2.5 font-bold text-sm shadow-md transition-all hover:-translate-y-0.5"
                                      onClick={() => {
                                        setSelectedJourneyBooking(booking);
                                        setShowJourneyModal(true);
                                      }}
                                    >
                                      <span>📄</span> View Details
                                    </button>
                                  )}
                                  {isConfirmed && (
                                    <button
                                      className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 border border-gray-300 bg-white hover:bg-gray-100 text-gray-700 rounded-xl px-5 py-2.5 font-semibold text-sm transition-all"
                                      onClick={() => window.print()}
                                    >
                                      <span>🖨️</span> Print
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  </div>
                </div>
              )}

              {userActiveSection === 'chat' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Conversations List */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <span className="mr-2">🏢</span>
                        Agencies
                      </CardTitle>
                      <CardDescription>
                        Agencies you've contacted
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {userConversations.length === 0 ? (
                          <p className="text-gray-500 text-center py-4">No conversations yet</p>
                        ) : (
                          userConversations.map((conversation) => (
                            <div
                              key={conversation.agencyId}
                              onClick={() => {
                                setCurrentChatAgency(conversation.agencyId);
                                setCurrentChatAgencyName(conversation.agencyName);
                              }}
                              className={`p-3 rounded-lg cursor-pointer border ${
                                currentChatAgency === conversation.agencyId
                                  ? 'bg-blue-50 border-blue-200'
                                  : 'bg-gray-50 hover:bg-gray-100'
                              }`}
                            >
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                  <span className="text-sm">🏢</span>
                                </div>
                                <div className="flex-1">
                                  <p className="font-medium text-sm">{conversation.agencyName}</p>
                                  <p className="text-xs text-gray-600 truncate">{conversation.lastMessage}</p>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Chat Messages */}
                  <div className="md:col-span-2">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center">
                          <span className="mr-2">💬</span>
                          {currentChatAgencyName ? `Chat with ${currentChatAgencyName}` : 'Select an agency'}
                        </CardTitle>
                        <CardDescription>
                          {currentChatAgencyName ? 'Ask questions about packages and get personalized recommendations' : 'Choose an agency from the list to start chatting'}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {currentChatAgency ? (
                          <div className="h-96 bg-gray-50 rounded-lg p-4 flex flex-col">
                            <div className="flex-1 overflow-y-auto space-y-3 mb-4">
                              {[...chatMessages]
                                .filter(msg => msg.chatId === [user?.uid, currentChatAgency].sort().join('_'))
                                .sort((a, b) => a.timestamp - b.timestamp)
                                .map((msg, index) => (
                                  <div key={msg.id || index} className={`flex ${msg.sender === user?.uid ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-xs px-3 py-2 rounded-lg ${msg.sender === user?.uid ? 'bg-blue-500 text-white' : 'bg-white text-gray-800'}`}>
                                      <p className="text-sm">{msg.text}</p>
                                      <p className="text-xs opacity-75">{new Date(msg.timestamp).toLocaleTimeString()}</p>
                                    </div>
                                  </div>
                                ))}
                            </div>
                            <div className="flex space-x-2">
                              <Input
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                placeholder="Type your message..."
                                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                              />
                              <Button onClick={sendMessage} disabled={!chatInput.trim()}>
                                Send
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="h-96 bg-gray-50 rounded-lg p-4 flex items-center justify-center">
                            <p className="text-gray-500">Select an agency to start chatting</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}

              {userActiveSection === 'wishlist' && (
                <div className="space-y-6">
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Your Wishlist</h2>
                    <p className="text-gray-600">Save your favorite travel packages for later</p>
                  </div>

                  {wishlist.length === 0 ? (
                    <Card className="text-center py-12">
                      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-3xl">❤️</span>
                      </div>
                      <h3 className="text-lg font-semibold mb-2">Your wishlist is empty</h3>
                      <p className="text-gray-600 mb-6">
                        Add travel packages to your wishlist by clicking the heart icon on any listing.
                      </p>
                      <Button 
                        onClick={() => setUserActiveSection('listings')}
                        className="bg-gray-600 hover:bg-gray-700"
                      >
                        Browse Travel Packages
                      </Button>
                    </Card>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {listings
                        .filter(listing => wishlist.includes(listing.id))
                        .map((listing) => (
                          <ListingCard
                            key={listing.id}
                            listing={listing}
                            onView={setViewingListing}
                            onBook={startBooking}
                            onChat={(listingData) => {
                              setCurrentChatAgency(listingData.agencyId);
                              setCurrentChatAgencyName(listingData.agencyName);
                              setUserActiveSection('chat');
                            }}
                            onWishlist={(listingId) => {
                              setWishlist(prev => 
                                prev.includes(listingId) 
                                  ? prev.filter(id => id !== listingId)
                                  : [...prev, listingId]
                              );
                            }}
                            isWishlisted={wishlist.includes(listing.id)}
                            variant="user"
                          />
                        ))
                      }
                    </div>
                  )}
                </div>
              )}

              {userActiveSection === 'profile' && (
                <div className="py-6 animate-in fade-in duration-200">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* LEFT COLUMN: PROFILE CARD */}
                    <div className="lg:col-span-1">
                      <Card className="bg-white border border-gray-200 shadow-md rounded-2xl overflow-hidden">
                        <div className="relative pt-8 pb-6 px-6 text-center border-b border-gray-100 bg-gradient-to-b from-[#1C1F26]/5 to-transparent">
                          {/* Avatar Display */}
                          <div className="relative w-32 h-32 mx-auto mb-4 group">
                            {profilePhotoUrl ? (
                              <img 
                                src={profilePhotoUrl} 
                                alt={profileName} 
                                className="w-full h-full rounded-full object-cover border-4 border-white shadow-lg"
                              />
                            ) : (
                              <div className="w-full h-full rounded-full bg-gradient-to-br from-orange-500 to-yellow-500 flex items-center justify-center text-white text-4xl font-extrabold shadow-lg border-4 border-white">
                                {profileName ? profileName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U'}
                              </div>
                            )}
                            {/* Camera Icon Overlay */}
                            <label className="absolute bottom-1 right-1 bg-orange-500 hover:bg-orange-600 text-white rounded-full p-2.5 shadow-md cursor-pointer transition-all duration-200 group-hover:scale-105 border-2 border-white flex items-center justify-center">
                              <span className="text-sm font-bold">📷+</span>
                              <input 
                                type="file" 
                                accept="image/*" 
                                onChange={handleProfilePhotoChange} 
                                className="hidden" 
                              />
                            </label>
                          </div>

                          {/* Profile Quick Info */}
                          <h3 className="text-xl font-bold text-gray-900 leading-snug">{profileName || 'User'}</h3>
                          <div className="mt-1 flex flex-col gap-1 text-sm text-gray-500">
                            <div className="flex items-center justify-center gap-1">
                              <span>{profileEmail}</span>
                              {user?.emailVerified ? (
                                <span className="text-emerald-500 text-xs" title="Verified email">✓</span>
                              ) : (
                                <span className="text-blue-500 hover:underline text-xs font-semibold cursor-pointer" onClick={() => alert('Verification email sent!')} title="Click to verify">Verify</span>
                              )}
                            </div>
                            {profilePhone && (
                              <div className="flex items-center justify-center gap-1.5 text-xs text-gray-600 font-medium">
                                <span>{profilePhone}</span>
                                <span className="inline-flex items-center justify-center bg-emerald-100 text-emerald-800 rounded-full w-4 h-4 text-[10px] font-bold">✓</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Navigation Links mimicking the Mockup */}
                        <div className="p-4 space-y-1">
                          <button 
                            className={`w-full flex items-center gap-3 px-4 py-3 text-sm rounded-xl transition-all duration-205 ${
                              profileTab === 'account' 
                                ? 'font-bold text-[#2B58C4] bg-[#2B58C4]/10' 
                                : 'font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                            }`}
                            onClick={() => {
                              setProfileTab('account');
                              setUserActiveSection('profile');
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                          >
                            <span className="text-lg">👤</span>
                            <span>My Account</span>
                          </button>
                          <button 
                            className={`w-full flex items-center gap-3 px-4 py-3 text-sm rounded-xl transition-all duration-205 ${
                              profileTab === 'credits' 
                                ? 'font-bold text-[#2B58C4] bg-[#2B58C4]/10' 
                                : 'font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                            }`}
                            onClick={() => {
                              setProfileTab('credits');
                              setUserActiveSection('profile');
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                          >
                            <span className="text-lg">💳</span>
                            <span>Plan & Credits</span>
                          </button>
                          <button 
                            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-all duration-205"
                            onClick={() => setUserActiveSection('bookings')}
                          >
                            <span className="text-lg">📅</span>
                            <span>My Booking</span>
                          </button>
                          <button 
                            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-all duration-205"
                            onClick={() => setUserActiveSection('wishlist')}
                          >
                            <span className="text-lg">🛒</span>
                            <span>My Holiday Cart</span>
                          </button>
                          <button 
                            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-all duration-205"
                            onClick={() => setUserActiveSection('wishlist')}
                          >
                            <span className="text-lg">❤️</span>
                            <span>Wishlist</span>
                          </button>
                        </div>
                      </Card>
                    </div>

                    {/* RIGHT COLUMN: ACCOUNT DETAILS */}
                    <div className="lg:col-span-2 space-y-6">
                      {profileTab === 'account' && (
                        <>
                          {/* Personal Details Card */}
                      <Card className="bg-white border border-gray-200 shadow-md rounded-2xl p-6">
                        <div className="flex justify-between items-center pb-4 border-b border-gray-100 mb-6">
                          <h2 className="text-lg font-bold text-gray-955">Your Personal Details</h2>
                          {!isEditingProfile ? (
                            <Button 
                              onClick={() => setIsEditingProfile(true)}
                              variant="outline"
                              className="border-[#2B58C4] text-[#2B58C4] hover:bg-[#2B58C4]/5 text-xs font-semibold rounded-xl px-4 py-2 h-auto"
                            >
                              ✏️ Edit Profile
                            </Button>
                          ) : (
                            <div className="flex gap-2">
                              <Button 
                                onClick={handleSaveProfile}
                                disabled={savingProfile}
                                className="bg-[#2B58C4] hover:bg-[#1E439B] text-white text-xs font-semibold rounded-xl px-4 py-2 h-auto"
                              >
                                {savingProfile ? 'Saving...' : '💾 Save'}
                              </Button>
                              <Button 
                                onClick={() => {
                                  // Restore old states
                                  setProfileName(userData?.name || '');
                                  setProfilePhone(userData?.phone || userData?.contactNumber || '');
                                  setIsEditingProfile(false);
                                }}
                                variant="outline"
                                className="border-gray-300 text-gray-700 hover:bg-gray-50 text-xs font-semibold rounded-xl px-4 py-2 h-auto"
                              >
                                Cancel
                              </Button>
                            </div>
                          )}
                        </div>

                        {/* Details Panel */}
                        <div className="space-y-4">
                          {!isEditingProfile ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <p className="text-xs text-gray-405 font-semibold uppercase tracking-wider">Name</p>
                                <p className="text-sm font-semibold text-gray-800 mt-1">{profileName || '—'}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-405 font-semibold uppercase tracking-wider">Contact</p>
                                <p className="text-sm font-semibold text-gray-800 mt-1">{profilePhone || '—'}</p>
                              </div>
                              <div className="md:col-span-2">
                                <p className="text-xs text-gray-405 font-semibold uppercase tracking-wider">Email ID</p>
                                <p className="text-sm font-semibold text-gray-800 mt-1 flex items-center gap-2">
                                  {profileEmail}
                                  {user?.emailVerified && (
                                    <span className="inline-flex items-center justify-center bg-emerald-100 text-emerald-800 rounded-full w-4 h-4 text-[10px] font-bold">✓</span>
                                  )}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <Label htmlFor="editName" className="text-xs font-semibold text-gray-500">Name</Label>
                                  <Input 
                                    id="editName"
                                    type="text"
                                    value={profileName}
                                    onChange={(e) => setProfileName(e.target.value)}
                                    className="mt-1 bg-white border-gray-200 text-gray-800 rounded-xl"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="editPhone" className="text-xs font-semibold text-gray-500">Contact</Label>
                                  <Input 
                                    id="editPhone"
                                    type="text"
                                    value={profilePhone}
                                    onChange={(e) => setProfilePhone(e.target.value)}
                                    placeholder="e.g. +91 932 329 4525"
                                    className="mt-1 bg-white border-gray-200 text-gray-800 rounded-xl"
                                  />
                                </div>
                              </div>
                              <div>
                                <Label className="text-xs font-semibold text-gray-500">Email ID (Cannot be changed)</Label>
                                <Input 
                                  type="text"
                                  value={profileEmail}
                                  disabled
                                  className="mt-1 bg-gray-50 border-gray-200 text-gray-500 rounded-xl cursor-not-allowed"
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Co-traveller details Section */}
                        <div className="mt-8 pt-8 border-t border-gray-150">
                          <div className="flex justify-between items-center mb-4">
                            <div>
                              <h3 className="text-base font-bold text-gray-900">Co-traveller details</h3>
                              <p className="text-xs text-gray-400 mt-0.5">Manage details of passengers traveling with you</p>
                            </div>
                            <button 
                              onClick={() => setShowAddCoTraveller(true)}
                              className="w-10 h-10 bg-gray-100 hover:bg-gray-205 text-gray-700 flex items-center justify-center rounded-full shadow-sm hover:shadow-md transition-all duration-200 font-bold text-xl"
                              title="Add Co-traveller"
                            >
                              ＋
                            </button>
                          </div>

                          {/* Inline Add Co-traveller Form */}
                          {showAddCoTraveller && (
                            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 mb-4 space-y-4 animate-in slide-in-from-top-4 duration-200">
                              <h4 className="text-sm font-bold text-gray-805">Add New Co-traveller</h4>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                  <Label htmlFor="coName" className="text-xs text-gray-500">Name</Label>
                                  <Input 
                                    id="coName"
                                    placeholder="Full Name"
                                    value={newCoTraveller.name}
                                    onChange={(e) => setNewCoTraveller({...newCoTraveller, name: e.target.value})}
                                    className="mt-1 bg-white rounded-xl text-xs"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="coContact" className="text-xs text-gray-500">Contact Number</Label>
                                  <Input 
                                    id="coContact"
                                    placeholder="Phone"
                                    value={newCoTraveller.contact}
                                    onChange={(e) => setNewCoTraveller({...newCoTraveller, contact: e.target.value})}
                                    className="mt-1 bg-white rounded-xl text-xs"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="coRelation" className="text-xs text-gray-500">Relationship</Label>
                                  <select
                                    id="coRelation"
                                    value={newCoTraveller.relationship}
                                    onChange={(e) => setNewCoTraveller({...newCoTraveller, relationship: e.target.value})}
                                    className="mt-1 block w-full rounded-xl border-gray-200 bg-white p-2.5 text-xs text-gray-800 shadow-sm focus:border-[#2B58C4] focus:ring-[#2B58C4]"
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
                              <div className="flex gap-2 justify-end">
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
                                    
                                    // Save instantly to database if user is saved
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
                                  className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs px-3 py-1.5 h-auto rounded-xl border-none"
                                >
                                  Add Traveler
                                </Button>
                                <Button 
                                  variant="outline"
                                  onClick={() => setShowAddCoTraveller(false)}
                                  className="border-gray-200 text-gray-750 text-xs px-3 py-1.5 h-auto rounded-xl"
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          )}

                          {/* List of Co-travellers */}
                          {coTravellers.length === 0 ? (
                            <p className="text-sm text-gray-500 italic text-center py-4 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                              No co-travellers added yet. Click the ＋ icon to add your travel companions.
                            </p>
                          ) : (
                            <div className="space-y-3">
                              {coTravellers.map((traveller) => (
                                <div 
                                  key={traveller.id} 
                                  className="flex justify-between items-center p-4 bg-gray-50 border border-gray-150 rounded-2xl hover:bg-gray-100/70 transition-all duration-150 shadow-sm animate-in fade-in"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-[#2B58C4]/10 rounded-full flex items-center justify-center text-[#2B58C4] font-bold">
                                      👤
                                    </div>
                                    <div>
                                      <p className="text-sm font-semibold text-gray-800">{traveller.name}</p>
                                      <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                                        <span>📞 {traveller.contact}</span>
                                        <span>•</span>
                                        <span className="bg-[#2B58C4]/5 text-[#2B58C4] px-2 py-0.5 rounded-full font-medium text-[10px]">{traveller.relationship}</span>
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
                                    className="text-gray-400 hover:text-red-500 p-2 hover:bg-red-50 rounded-full transition-all duration-150"
                                    title="Remove Traveler"
                                  >
                                    🗑️
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </Card>
                      </>
                      )}

                      {profileTab === 'credits' && (
                        <div id="plans-and-credits-card" className="space-y-6">
                        <div className="flex justify-between items-center">
                          <div>
                            <h2 className="text-xl font-bold text-gray-900">Plan & Message Credits</h2>
                            <p className="text-xs text-gray-500 mt-0.5">Manage subscription plans, buy add-on credits, and track transaction history</p>
                          </div>
                        </div>

                        {/* Hero Header */}
                        <div className="bg-gradient-to-r from-[#1E293B] to-[#0F172A] text-white rounded-3xl p-6 shadow-lg relative overflow-hidden">
                          <div className="absolute right-10 bottom-0 opacity-10 text-[120px] pointer-events-none select-none">💳</div>
                          <div className="relative z-10 max-w-3xl">
                            <div className="inline-flex items-center gap-1.5 bg-[#3B82F6]/20 backdrop-blur-sm text-[#93C5FD] text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full mb-3 border border-[#3B82F6]/30">
                              💳 Billing & Subscription Control Panel
                            </div>
                            <h1 className="text-2xl font-extrabold mb-1 tracking-tight">
                              Premium Messaging Credits
                            </h1>
                            <p className="text-slate-300 text-xs leading-relaxed opacity-90 max-w-2xl">
                              Select subscription plans or purchase add-on credit packages to start secure chats with travel agencies.
                            </p>
                          </div>
                        </div>

                        {/* Current Plan Summary Card & Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <Card className="md:col-span-1 bg-white border border-gray-200 shadow-md rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between">
                            <div>
                              <div className="flex justify-between items-center mb-4">
                                <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Current Plan</h3>
                                <Badge className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide border ${
                                  userData?.plan === 'premium' ? 'bg-purple-100 text-purple-700 border-purple-200' :
                                  userData?.plan === 'starter' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                                  'bg-blue-100 text-blue-700 border-blue-200'
                                }`}>
                                  {userData?.plan || 'Free'} Plan
                                </Badge>
                              </div>
                              <div className="space-y-3">
                                <div>
                                  <p className="text-2xl font-extrabold text-gray-900">
                                    {userData?.plan === 'starter' ? `${userData?.credits ?? 0} Credits` : 
                                     userData?.plan === 'premium' ? `${userData?.freeChats ?? 0} Free Chats` : 
                                     `${userData?.freeChats ?? 0} Free Chats`}
                                  </p>
                                  <p className="text-[10px] text-gray-500 mt-0.5">Cycle balance remaining</p>
                                </div>
                                <div className="border-t pt-3 space-y-1.5 text-[11px]">
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">Cycle Ends</span>
                                    <span className="font-semibold text-gray-800">July 16, 2026</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">Unlocked</span>
                                    <span className="font-semibold text-gray-800">{(userData?.unlockedAgencies || []).length} Agencies</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </Card>

                          {/* Quick Stats Grid */}
                          <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Card className="bg-white border border-gray-200 shadow-md rounded-2xl p-4 flex items-center justify-between">
                              <div className="space-y-0.5">
                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Per Chat Cost</p>
                                <h4 className="text-sm font-bold text-gray-900">
                                  {userData?.plan === 'free' && '1 Free Chat'}
                                  {userData?.plan === 'starter' && '200 Credits'}
                                  {userData?.plan === 'premium' && '1 Free Chat'}
                                </h4>
                                <p className="text-[10px] text-gray-500 leading-snug">
                                  {userData?.plan === 'premium' && '150 cr after free chats deplete'}
                                  {userData?.plan === 'free' && 'Unlock uses 1 free chat'}
                                  {userData?.plan === 'starter' && 'Deducted per unlock'}
                                </p>
                              </div>
                              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 text-lg">
                                💬
                              </div>
                            </Card>

                            <Card className="bg-white border border-gray-200 shadow-md rounded-2xl p-4 flex items-center justify-between">
                              <div className="space-y-0.5">
                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Transactions</p>
                                <h4 className="text-sm font-bold text-gray-900">
                                  {(userData?.creditHistory || []).length} Operations
                                </h4>
                                <p className="text-[10px] text-gray-500 leading-snug">Logs of top-ups & usage</p>
                              </div>
                              <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 text-lg">
                                📋
                              </div>
                            </Card>
                          </div>
                        </div>

                        {/* Developer Testing Panel inside Dashboard */}
                        <Card className="bg-gradient-to-r from-red-50 to-orange-50 border border-orange-200 rounded-2xl p-4 shadow-sm">
                          <h4 className="text-xs font-bold text-orange-850 flex items-center gap-1.5 mb-1.5">
                            🛠️ Developer Billing & Credits Simulator
                          </h4>
                          <p className="text-[10px] text-orange-700 mb-3 leading-relaxed">
                            Use these controls to simulate plan resets, add credits, and verify unlock behavior. Changes reflect in Firebase Firestore immediately.
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <Button 
                              onClick={() => simulateResetCredits('free')}
                              variant="outline" 
                              className="bg-white hover:bg-gray-100 text-[10px] border-gray-300 font-semibold rounded-xl text-blue-700 py-1.5 h-auto border-gray-300"
                            >
                              Reset to Free
                            </Button>
                            <Button 
                              onClick={() => simulateResetCredits('starter')}
                              variant="outline"
                              className="bg-white hover:bg-gray-100 text-[10px] border-gray-300 font-semibold rounded-xl text-amber-700 py-1.5 h-auto border-gray-300"
                            >
                              Reset to Starter
                            </Button>
                            <Button 
                              onClick={() => simulateResetCredits('premium')}
                              variant="outline"
                              className="bg-white hover:bg-gray-100 text-[10px] border-gray-300 font-semibold rounded-xl text-purple-705 py-1.5 h-auto border-gray-300"
                            >
                              Reset to Premium
                            </Button>
                            <Button 
                              onClick={async () => {
                                if (!user || !userData) return;
                                const currentCredits = userData.credits || 0;
                                const txId = 'TX-SIM-' + Math.random().toString(36).substr(2, 9).toUpperCase();
                                const newTransaction = {
                                  id: txId,
                                  type: 'top-up',
                                  amount: 500,
                                  description: 'Simulated Developer top-up',
                                  timestamp: Date.now()
                                };
                                await updateDoc(doc(getDbInstance()!, 'users', user.uid), {
                                  credits: currentCredits + 500,
                                  creditHistory: [newTransaction, ...(userData.creditHistory || [])]
                                });
                                alert('Simulated: Added 500 Credits');
                              }}
                              variant="outline"
                              className="bg-white hover:bg-gray-100 text-[10px] border-gray-300 font-semibold rounded-xl text-green-750 py-1.5 h-auto border-gray-300"
                            >
                              +500 Credits
                            </Button>
                          </div>
                        </Card>

                        {/* Plan Grid */}
                        <div id="plans-comparison-grid" className="pt-2">
                          <div className="mb-4">
                            <h2 className="text-base font-bold text-gray-900 mb-0.5">Subscription Plans</h2>
                            <p className="text-[11px] text-gray-500">Select the perfect tier for your travel search needs. Upgrade or downgrade anytime.</p>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {/* Free Plan */}
                            <Card className={`bg-white border rounded-2xl p-4 shadow-sm flex flex-col justify-between plan-card-hover glow-free ${
                              userData?.plan === 'free' || !userData?.plan ? 'ring-2 ring-blue-500' : 'border-gray-200'
                            }`}>
                              <div>
                                <div className="mb-2">
                                  <span className="text-[8px] font-bold text-blue-600 uppercase tracking-widest bg-blue-50 px-2.5 py-0.5 rounded-full">Basic Tier</span>
                                </div>
                                <h3 className="text-sm font-bold text-gray-900 mb-0.5">Free Plan</h3>
                                <div className="flex items-baseline gap-1 my-1.5">
                                  <span className="text-lg font-extrabold text-gray-900">₹0</span>
                                  <span className="text-[9px] text-gray-500 font-medium">/ year</span>
                                </div>
                                <p className="text-[10px] text-gray-605 mb-4 leading-relaxed">Perfect for simple search and quick agency queries.</p>
                                <ul className="space-y-2 text-[10px] text-gray-600 border-t pt-3 mb-4">
                                  <li className="flex items-center gap-1.5">
                                    <span className="text-green-500 font-bold">✓</span>
                                    <span><strong>2 Free Chats</strong> monthly</span>
                                  </li>
                                  <li className="flex items-center gap-1.5">
                                    <span className="text-green-500 font-bold">✓</span>
                                    <span>Standard speeds</span>
                                  </li>
                                  <li className="flex items-center gap-1.5 text-gray-400">
                                    <span className="text-gray-300 font-bold">✗</span>
                                    <span>Add-on top-ups</span>
                                  </li>
                                </ul>
                              </div>
                              <Button 
                                onClick={() => upgradePlan('free')}
                                disabled={userData?.plan === 'free' || !userData?.plan}
                                className={`w-full text-[10px] font-bold py-2.5 rounded-xl ${
                                  userData?.plan === 'free' || !userData?.plan
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed hover:bg-gray-100 border-none' 
                                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                                }`}
                              >
                                {userData?.plan === 'free' || !userData?.plan ? 'Current Plan' : 'Select Free Plan'}
                              </Button>
                            </Card>

                            {/* Starter Plan */}
                            <Card className={`bg-white border rounded-2xl p-4 shadow-sm flex flex-col justify-between plan-card-hover glow-starter ${
                              userData?.plan === 'starter' ? 'ring-2 ring-amber-500' : 'border-gray-200'
                            }`}>
                              <div>
                                <div className="mb-2 flex justify-between items-center">
                                  <span className="text-[8px] font-bold text-amber-600 uppercase tracking-widest bg-amber-50 px-2.5 py-0.5 rounded-full">Most Popular</span>
                                </div>
                                <h3 className="text-sm font-bold text-gray-900 mb-0.5">Starter Plan</h3>
                                <div className="flex items-baseline gap-1 my-1.5">
                                  <span className="text-lg font-extrabold text-gray-900">₹2,000</span>
                                  <span className="text-[9px] text-gray-500 font-medium">/ year</span>
                                </div>
                                <p className="text-[10px] text-gray-605 mb-4 leading-relaxed">Best for active travelers planning holiday details.</p>
                                <ul className="space-y-2 text-[10px] text-gray-650 border-t pt-3 mb-4">
                                  <li className="flex items-center gap-1.5">
                                    <span className="text-green-500 font-bold">✓</span>
                                    <span><strong>2,000 Credits</strong> monthly</span>
                                  </li>
                                  <li className="flex items-center gap-1.5">
                                    <span className="text-green-500 font-bold">✓</span>
                                    <span>Starter cost: <strong>200 cr / chat</strong></span>
                                  </li>
                                  <li className="flex items-center gap-1.5">
                                    <span className="text-green-500 font-bold">✓</span>
                                    <span>Buy credit top-up packs</span>
                                  </li>
                                </ul>
                              </div>
                              <Button 
                                onClick={() => upgradePlan('starter')}
                                disabled={userData?.plan === 'starter'}
                                className={`w-full text-[10px] font-bold py-2.5 rounded-xl ${
                                  userData?.plan === 'starter'
                                    ? 'bg-gray-100 text-gray-405 cursor-not-allowed hover:bg-gray-100 border-none' 
                                    : 'bg-amber-500 hover:bg-amber-600 text-white'
                                }`}
                              >
                                {userData?.plan === 'starter' ? 'Current Plan' : 'Upgrade to Starter'}
                              </Button>
                            </Card>

                            {/* Premium Plan */}
                            <Card className={`bg-white border rounded-2xl p-4 shadow-sm flex flex-col justify-between plan-card-hover glow-premium ${
                              userData?.plan === 'premium' ? 'ring-2 ring-purple-500' : 'border-gray-200'
                            }`}>
                              <div>
                                <div className="mb-2">
                                  <span className="text-[8px] font-bold text-purple-600 uppercase tracking-widest bg-purple-50 px-2.5 py-0.5 rounded-full">Power User</span>
                                </div>
                                <h3 className="text-sm font-bold text-gray-900 mb-0.5">Premium Plan</h3>
                                <div className="flex items-baseline gap-1 my-1.5">
                                  <span className="text-lg font-extrabold text-gray-900">₹5,000</span>
                                  <span className="text-[9px] text-gray-500 font-medium">/ year</span>
                                </div>
                                <p className="text-[10px] text-gray-605 mb-4 leading-relaxed">For frequent travelers looking for ultimate options.</p>
                                <ul className="space-y-2 text-[10px] text-gray-650 border-t pt-3 mb-4">
                                  <li className="flex items-center gap-1.5">
                                    <span className="text-green-500 font-bold">✓</span>
                                    <span><strong>20 Free Chats</strong> monthly</span>
                                  </li>
                                  <li className="flex items-center gap-1.5">
                                    <span className="text-green-500 font-bold">✓</span>
                                    <span>Thereafter: <strong>150 cr / chat</strong></span>
                                  </li>
                                  <li className="flex items-center gap-1.5">
                                    <span className="text-green-500 font-bold">✓</span>
                                    <span>Mediation agent dispute help</span>
                                  </li>
                                </ul>
                              </div>
                              <Button 
                                onClick={() => upgradePlan('premium')}
                                disabled={userData?.plan === 'premium'}
                                className={`w-full text-[10px] font-bold py-2.5 rounded-xl ${
                                  userData?.plan === 'premium'
                                    ? 'bg-gray-105 text-gray-400 cursor-not-allowed hover:bg-gray-100 border-none' 
                                    : 'bg-purple-600 hover:bg-purple-700 text-white'
                                }`}
                              >
                                {userData?.plan === 'premium' ? 'Current Plan' : 'Upgrade to Premium'}
                              </Button>
                            </Card>
                          </div>
                        </div>

                        {/* Add-on Credit Packages */}
                        <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm">
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
                            <div>
                              <h3 className="text-sm font-bold text-gray-900">Buy Add-on Credits</h3>
                              <p className="text-[10px] text-gray-500">Need more credits? Buy extra packs instantly (Requires Starter or Premium plan).</p>
                            </div>
                            <Badge variant="outline" className="text-[10px] bg-gray-50 text-gray-555 mt-2 sm:mt-0 font-medium">
                              Plan: {userData?.plan || 'free'}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {[
                              { name: 'Starter Pack', credits: 500, price: 100, desc: 'Ideal for 2 extra agency unlocks' },
                              { name: 'Growth Pack', credits: 1000, price: 180, desc: 'Best Value! 5 unlocks (Starter)', recommended: true },
                              { name: 'Pro Pack', credits: 2500, price: 400, desc: 'For heavy research needs' }
                            ].map((pack) => (
                              <div 
                                key={pack.name} 
                                className={`border rounded-2xl p-4 flex flex-col justify-between relative bg-slate-50/50 hover:bg-slate-50 transition-all ${
                                  pack.recommended ? 'border-amber-400 ring-1 ring-amber-400' : 'border-gray-200'
                                }`}
                              >
                                {pack.recommended && (
                                  <span className="absolute -top-2 right-3 bg-amber-400 text-amber-950 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider">
                                    Best Value
                                  </span>
                                )}
                                <div className="mb-3">
                                  <h4 className="font-bold text-xs text-gray-900">{pack.name}</h4>
                                  <p className="text-base font-extrabold text-blue-600 my-1">+{pack.credits} Credits</p>
                                  <p className="text-[10px] text-gray-500 leading-snug">{pack.desc}</p>
                                </div>
                                <div className="pt-3 border-t flex items-center justify-between gap-2">
                                  <span className="font-extrabold text-xs text-gray-800">₹{pack.price}</span>
                                  <Button 
                                    onClick={() => buyCredits(pack.credits, pack.price)}
                                    disabled={!userData?.plan || userData.plan === 'free'}
                                    className="text-[10px] font-bold px-3 py-1.5 h-auto rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed border-none"
                                  >
                                    Buy Pack
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Transaction History Logs */}
                        <Card className="bg-white border border-gray-200 shadow-md rounded-3xl p-6">
                          <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-1.5">
                            <span>📋</span> Credit Transaction History
                          </h3>

                          {(!userData?.creditHistory || userData.creditHistory.length === 0) ? (
                            <div className="text-center py-10 text-gray-400 text-xs italic bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                              No transactions recorded.
                            </div>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full text-left border-collapse text-[10px]">
                                <thead>
                                  <tr className="border-b text-gray-400 font-bold uppercase tracking-wider">
                                    <th className="pb-3 pr-4">Transaction ID</th>
                                    <th className="pb-3 pr-4">Type</th>
                                    <th className="pb-3 pr-4">Description</th>
                                    <th className="pb-3 pr-4 text-right">Amount</th>
                                    <th className="pb-3 text-right">Date</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                                  {userData.creditHistory.map((tx) => (
                                    <tr key={tx.id} className="transaction-row">
                                      <td className="py-3 font-mono text-gray-400">{tx.id}</td>
                                      <td className="py-3 pr-4">
                                        <Badge className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wide border ${
                                          tx.type === 'top-up' ? 'bg-green-50 text-green-700 border-green-200' :
                                          tx.type === 'plan-change' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                          tx.type === 'reset' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                          'bg-red-50 text-red-700 border-red-200'
                                        }`}>
                                          {tx.type}
                                        </Badge>
                                      </td>
                                      <td className="py-3 pr-4">{tx.description}</td>
                                      <td className={`py-3 pr-4 text-right font-extrabold text-xs ${
                                        tx.type === 'top-up' ? 'text-green-600' : 
                                        tx.type === 'plan-change' ? 'text-purple-600' : 
                                        tx.type === 'reset' ? 'text-blue-600' :
                                        'text-red-600'
                                      }`}>
                                        {tx.type === 'top-up' && '+'}
                                        {tx.type === 'deduction' && '-'}
                                        {tx.amount}
                                        {userData.plan === 'starter' && tx.type !== 'plan-change' && tx.type !== 'reset' ? ' cr' : ''}
                                        {userData.plan !== 'starter' && tx.type !== 'plan-change' && tx.type !== 'reset' ? ' chat' : ''}
                                        {tx.type === 'plan-change' && ' ₹'}
                                      </td>
                                      <td className="py-3 text-right text-gray-400">
                                        {new Date(tx.timestamp).toLocaleString('en-IN', {
                                          day: 'numeric',
                                          month: 'short',
                                          year: 'numeric',
                                          hour: '2-digit',
                                          minute: '2-digit'
                                        })}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </Card>
                      </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {userActiveSection === 'support' && (
                <div className="py-6 animate-in fade-in duration-200">
                  {/* HERO HEADER */}
                  <div className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white rounded-3xl p-8 mb-8 shadow-lg relative overflow-hidden">
                    <div className="absolute right-10 bottom-0 opacity-10 text-[180px] pointer-events-none select-none">🛡️</div>
                    <div className="relative z-10 max-w-2xl">
                      <div className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full mb-4">
                        🛡️ Platform Dispute Resolution Center
                      </div>
                      <h1 className="text-3xl md:text-4xl font-extrabold mb-3 tracking-tight">
                        Safe Travel Guarantee
                      </h1>
                      <p className="text-blue-100 text-sm md:text-base leading-relaxed opacity-90">
                        Our platform mediation team is here to assist you. If you face issues with a travel agency—such as payment disputes, lack of communication, or failure to deliver services—submit a ticket below and we will investigate immediately.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* LEFT COLUMN: TICKET SUBMISSION FORM */}
                    <div className="lg:col-span-2">
                      <Card className="bg-white border border-gray-200 shadow-md rounded-2xl p-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                          <span>📝</span> Submit a Dispute / Help Ticket
                        </h2>
                        
                        <form onSubmit={submitSupportTicket} className="space-y-5">
                          {/* Booking Selector */}
                          <div>
                            <Label htmlFor="supportBooking" className="text-sm font-semibold text-gray-800">
                              Associated Booking / Transaction (Optional)
                            </Label>
                            <select
                              id="supportBooking"
                              value={supportBookingId}
                              onChange={(e) => setSupportBookingId(e.target.value)}
                              className="mt-1.5 block w-full p-3 border border-gray-200 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-blue-500 rounded-xl text-sm font-medium transition-colors"
                            >
                              <option value="">-- No booking linked / General dispute --</option>
                              {userBookings.map((b: any) => (
                                <option key={b.id} value={b.id}>
                                  {b.listingTitle} • Ref: {b.bookingReference || b.id.slice(-6).toUpperCase()} • Date: {b.travelDate || 'TBD'}
                                </option>
                              ))}
                            </select>
                            <p className="text-xs text-gray-400 mt-1.5">
                              Linking a booking helps our team trace payment records and agency details automatically.
                            </p>
                          </div>

                          {/* Reason Selector */}
                          <div>
                            <Label htmlFor="supportReason" className="text-sm font-semibold text-gray-800">
                              Primary Reason for Dispute
                            </Label>
                            <select
                              id="supportReason"
                              value={supportReason}
                              onChange={(e) => setSupportReason(e.target.value)}
                              className="mt-1.5 block w-full p-3 border border-gray-200 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-blue-500 rounded-xl text-sm font-medium transition-colors animate-none"
                            >
                              <option value="Agency is not responding after payment">Agency is not responding after payment</option>
                              <option value="Promised service/itinerary was not provided">Promised service/itinerary was not provided</option>
                              <option value="Travel dates changed without user consent">Travel dates changed without user consent</option>
                              <option value="Refund or booking cancellation issue">Refund or booking cancellation issue</option>
                              <option value="Other agency behavior dispute">Other agency behavior dispute</option>
                            </select>
                          </div>

                          {/* Subject */}
                          <div>
                            <Label htmlFor="supportSubject" className="text-sm font-semibold text-gray-800">
                              Subject
                            </Label>
                            <Input
                              id="supportSubject"
                              type="text"
                              placeholder="Brief summary of the issue (e.g., Paid ₹30,000 and agency stopped replying)"
                              value={supportSubject}
                              onChange={(e) => setSupportSubject(e.target.value)}
                              className="mt-1.5 w-full p-3 border border-gray-200 rounded-xl text-sm"
                              required
                            />
                          </div>

                          {/* Detailed Description */}
                          <div>
                            <Label htmlFor="supportDesc" className="text-sm font-semibold text-gray-800">
                              Detailed Description
                            </Label>
                            <textarea
                              id="supportDesc"
                              rows={5}
                              placeholder="Please provide full details of your interaction, including dates, agreed pricing, amount paid, and what exactly went wrong. Our team will read this description to start investigation."
                              value={supportDescription}
                              onChange={(e) => setSupportDescription(e.target.value)}
                              className="mt-1.5 block w-full p-3 border border-gray-200 focus:bg-white focus:ring-2 focus:ring-blue-500 rounded-xl text-sm transition-colors"
                              required
                            />
                          </div>

                          {/* Submit Button */}
                          <div className="pt-2">
                            <Button
                              type="submit"
                              disabled={submittingSupportTicket}
                              className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition-colors border-none cursor-pointer"
                            >
                              {submittingSupportTicket ? 'Submitting Ticket...' : 'Submit Support Ticket'}
                            </Button>
                          </div>
                        </form>
                      </Card>
                    </div>

                    {/* RIGHT COLUMN: MEDIATION POLICY / DISPUTE HISTORY */}
                    <div className="lg:col-span-1 space-y-6">
                      {/* PLATFORM PROTECTION CARD */}
                      <Card className="bg-white border border-gray-200 shadow-md rounded-2xl p-5">
                        <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-1.5">
                          <span className="text-blue-500 text-lg">🛡️</span> Platform Protection Policy
                        </h3>
                        <ul className="space-y-4 text-xs text-gray-600">
                          <li className="flex gap-2">
                            <span className="text-blue-500 font-bold">1.</span>
                            <div>
                              <strong className="text-gray-800 block">Strict Agency Verification</strong>
                              All registered agencies go through background documentation checks before listing packages.
                            </div>
                          </li>
                          <li className="flex gap-2">
                            <span className="text-blue-500 font-bold">2.</span>
                            <div>
                              <strong className="text-gray-800 block">24-Hour Investigation</strong>
                              Once a ticket is submitted, platform admins review transaction logs and contact the agency within 24 hours.
                            </div>
                          </li>
                          <li className="flex gap-2">
                            <span className="text-blue-500 font-bold">3.</span>
                            <div>
                              <strong className="text-gray-800 block">Fair Dispute Resolution</strong>
                              If an agency violates terms or defrauds users, their listings are suspended, and details are shared to assist in refund recoveries.
                            </div>
                          </li>
                        </ul>
                      </Card>

                      {/* MY TICKETS LIST */}
                      <Card className="bg-white border border-gray-200 shadow-md rounded-2xl p-5">
                        <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-1.5">
                          <span>📋</span> Dispute Tickets History ({supportTickets.length})
                        </h3>

                        {supportTickets.length === 0 ? (
                          <div className="text-center py-6 text-gray-405 text-xs italic bg-gray-50 rounded-xl border border-dashed border-gray-200">
                            No support tickets submitted yet.
                          </div>
                        ) : (
                          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                            {supportTickets.map((ticket) => (
                              <div key={ticket.id} className="p-3 border border-gray-150 rounded-xl hover:bg-gray-50/50 transition-colors text-xs space-y-2">
                                <div className="flex justify-between items-start">
                                  <span className="font-bold text-gray-800 truncate max-w-[120px]" title={ticket.subject}>
                                    {ticket.subject}
                                  </span>
                                  <Badge 
                                    className={`
                                      ${ticket.status === 'pending' ? 'bg-yellow-50 text-yellow-750 border-yellow-200 hover:bg-yellow-50' : ''}
                                      ${ticket.status === 'in-review' ? 'bg-blue-50 text-blue-750 border-blue-200 hover:bg-blue-50' : ''}
                                      ${ticket.status === 'resolved' ? 'bg-emerald-50 text-emerald-755 border-emerald-200 hover:bg-emerald-50' : ''}
                                      border px-1.5 py-0 rounded text-[9px] font-bold uppercase
                                    `}
                                  >
                                    {ticket.status}
                                  </Badge>
                                </div>
                                <p className="text-[10px] text-gray-500 line-clamp-2">
                                  {ticket.description}
                                </p>
                                <div className="flex justify-between text-[9px] text-gray-400 border-t pt-1.5 mt-1 border-gray-100">
                                  <span>ID: {ticket.id.slice(-6).toUpperCase()}</span>
                                  <span>{ticket.createdAtFormatted || 'Just now'}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </Card>
                    </div>
                  </div>
                </div>
              )}
            </main>
          </div>

          {/* Journey Details Modal */}
          {showJourneyModal && selectedJourneyBooking && (
            <JourneyDetailsModal
              booking={selectedJourneyBooking}
              onClose={() => {
                setShowJourneyModal(false);
                setSelectedJourneyBooking(null);
              }}
            />
          )}

          {/* Review Modal */}
          {showReviewModal && reviewListing && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <Card className="w-full max-w-2xl mx-4">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <span className="mr-2">⭐</span>
                    Write a Review for {reviewListing.title}
                  </CardTitle>
                  <CardDescription>
                    Share your experience to help other travelers
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Rating */}
                  <div>
                    <Label className="text-base font-medium">Your Rating</Label>
                    <div className="flex gap-1 mt-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => setNewReview({...newReview, rating: star})}
                          className={`text-2xl ${newReview.rating >= star ? 'text-yellow-400' : 'text-gray-300'}`}
                        >
                          ⭐
                        </button>
                      ))}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {newReview.rating === 0 ? 'Select a rating' :
                       newReview.rating === 1 ? 'Poor' :
                       newReview.rating === 2 ? 'Fair' :
                       newReview.rating === 3 ? 'Good' :
                       newReview.rating === 4 ? 'Very Good' : 'Excellent'}
                    </p>
                  </div>

                  {/* Review Text */}
                  <div>
                    <Label htmlFor="reviewComment">Your Review</Label>
                    <textarea
                      id="reviewComment"
                      className="w-full p-3 border rounded-lg mt-1"
                      rows={4}
                      value={newReview.comment}
                      onChange={(e) => setNewReview({...newReview, comment: e.target.value})}
                      placeholder="Tell others about your experience..."
                    />
                  </div>

                  {/* Photo Upload */}
                  <div>
                    <Label htmlFor="reviewPhotos">Add Photos (Optional)</Label>
                    <Input
                      id="reviewPhotos"
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(e) => {
                        console.log('Photos selected:', e.target.files);
                      }}
                      className="mt-1"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Share photos from your trip to help others visualize the experience
                    </p>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button
                      onClick={() => {
                        alert('Review submitted successfully!');
                        setShowReviewModal(false);
                        setNewReview({ listingId: '', rating: 5, comment: '', photos: [] });
                        setReviewListing(null);
                      }}
                      disabled={newReview.rating === 0 || !newReview.comment.trim()}
                      className="flex-1"
                    >
                      Submit Review
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowReviewModal(false);
                        setNewReview({ listingId: '', rating: 5, comment: '', photos: [] });
                        setReviewListing(null);
                      }}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Pincode Change Modal */}
          {showPincodeModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-in fade-in duration-200">
              <Card className="w-full max-w-sm mx-4 bg-[#1C1F26] border-gray-800 text-white shadow-2xl">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <span className="text-xl">📍</span> Update Location
                  </CardTitle>
                  <CardDescription className="text-xs text-gray-405">
                    Enter your 6-digit postal code to customize your experience
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input
                    type="text"
                    maxLength={6}
                    placeholder="e.g. 400001"
                    value={pincodeInput}
                    onChange={(e) => setPincodeInput(e.target.value.replace(/\D/g, ''))}
                    className="bg-gray-900 border-gray-800 text-white text-center text-lg tracking-widest font-mono"
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        if (pincodeInput.length !== 6) {
                          alert('Please enter a valid 6-digit pincode');
                          return;
                        }
                        setPincode(`Pincode ${pincodeInput}`);
                        setShowPincodeModal(false);
                      }}
                      className="flex-1 bg-orange-500 hover:bg-orange-605"
                    >
                      Save
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowPincodeModal(false)}
                      className="flex-1 border-gray-700 text-gray-300 hover:bg-gray-800"
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ── REDESIGNED PREMIUM UNLOCK CHAT CONVERSATION MODAL ── */}
          {showUnlockModal && chatUnlockTarget && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
              <Card className="max-w-md w-full bg-white shadow-2xl rounded-3xl border border-gray-150 overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Visual Premium Header */}
                <div className="bg-gradient-to-r from-blue-700 to-indigo-800 p-6 text-white relative">
                  <div className="absolute top-6 right-6 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/20">
                    Verified Agent
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-white text-blue-700 rounded-2xl flex items-center justify-center text-3xl font-bold shadow-md">
                      🏢
                    </div>
                    <div>
                      <h3 className="text-xl font-extrabold tracking-tight">{chatUnlockTarget.agencyName}</h3>
                      <p className="text-xs text-blue-200 mt-0.5">Connect and discuss "{chatUnlockTarget.packageTitle}"</p>
                    </div>
                  </div>
                </div>
                
                <div className="p-6 space-y-6">
                  {/* Explanation and Features List */}
                  <div className="space-y-3">
                    <p className="text-sm text-gray-705 font-bold leading-relaxed">
                      Unlock direct messaging and customized itineraries:
                    </p>
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div className="flex items-center gap-2 text-xs text-gray-650 bg-gray-50 border p-2.5 rounded-xl">
                        <span className="text-blue-500 font-bold text-sm">💬</span>
                        <div>
                          <p className="font-bold text-gray-900 leading-tight">Direct Chat</p>
                          <p className="text-[9px] text-gray-505 mt-0.5">Unlimited messaging</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-650 bg-gray-50 border p-2.5 rounded-xl">
                        <span className="text-blue-500 font-bold text-sm">📄</span>
                        <div>
                          <p className="font-bold text-gray-900 leading-tight">Custom Quotes</p>
                          <p className="text-[9px] text-gray-505 mt-0.5">Personalized plans</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-650 bg-gray-50 border p-2.5 rounded-xl">
                        <span className="text-blue-500 font-bold text-sm">📞</span>
                        <div>
                          <p className="font-bold text-gray-900 leading-tight">Direct Call</p>
                          <p className="text-[9px] text-gray-505 mt-0.5">Callbacks enabled</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-650 bg-gray-50 border p-2.5 rounded-xl">
                        <span className="text-blue-500 font-bold text-sm">⚡</span>
                        <div>
                          <p className="font-bold text-gray-900 leading-tight">Mediation Help</p>
                          <p className="text-[9px] text-gray-505 mt-0.5">100% Secure & safe</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Transaction Box */}
                  <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 space-y-4">
                    <div className="flex justify-between items-center text-[10px] font-bold uppercase text-gray-400 tracking-wider">
                      <span>Connection Details</span>
                      <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md text-[9px]">
                        Plan: {userData?.plan || 'Free'}
                      </span>
                    </div>
                    
                    {/* Visual credit deduction flow */}
                    <div className="flex items-center justify-between gap-4 py-1">
                      <div className="text-center flex-1">
                        <span className="text-[9px] text-gray-455 font-bold uppercase tracking-wider">Your Balance</span>
                        <div className="text-lg font-black text-gray-800 mt-0.5">
                          {userData?.plan === 'starter' && `${userData?.credits ?? 0}`}
                          {userData?.plan === 'premium' && `${userData?.freeChats ?? 0}`}
                          {(userData?.plan === 'free' || !userData?.plan) && `${userData?.freeChats ?? 0}`}
                        </div>
                        <span className="text-[9px] text-gray-505 font-medium">
                          {userData?.plan === 'starter' ? 'Credits' : 'Free Chats'}
                        </span>
                      </div>
                      
                      <div className="flex flex-col items-center">
                        <span className="text-[9px] text-blue-600 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full font-black">
                          -{userData?.plan === 'starter' ? '200' : '1'}
                        </span>
                        <span className="text-sm text-blue-600 mt-0.5">➔</span>
                      </div>

                      <div className="text-center flex-1">
                        <span className="text-[9px] text-gray-450 font-bold uppercase tracking-wider">After Unlock</span>
                        <div className="text-lg font-black text-blue-600 mt-0.5">
                          {userData?.plan === 'starter' && `${Math.max(0, (userData?.credits ?? 0) - 200)}`}
                          {userData?.plan === 'premium' && `${Math.max(0, (userData?.freeChats ?? 0) - 1)}`}
                          {(userData?.plan === 'free' || !userData?.plan) && `${Math.max(0, (userData?.freeChats ?? 0) - 1)}`}
                        </div>
                        <span className="text-[9px] text-gray-500 font-medium">
                          {userData?.plan === 'starter' ? 'Credits left' : 'Free Chats left'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Check if user has sufficient credits */}
                  {((userData?.plan === 'starter' && (userData?.credits ?? 0) < 200) ||
                    (userData?.plan === 'premium' && (userData?.freeChats ?? 0) <= 0 && (userData?.credits ?? 0) < 150) ||
                    ((userData?.plan === 'free' || !userData?.plan) && (userData?.freeChats ?? 0) <= 0)) ? (
                    
                    <div className="bg-red-50 text-red-800 border border-red-150 rounded-2xl p-4 flex items-start gap-3 shadow-sm">
                      <span className="text-xl leading-none">⚠️</span>
                      <div className="text-xs">
                        <p className="font-extrabold text-red-905">Insufficient Balance</p>
                        <p className="text-red-750 mt-1 leading-relaxed">
                          You need at least {userData?.plan === 'starter' ? '200 Credits' : '1 Free Chat'} to connect with this agency. Top up credits or change plans to continue.
                        </p>
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="p-4 bg-gray-50 border-t flex flex-row gap-3">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowUnlockModal(false)}
                    className="flex-1 rounded-xl text-xs font-bold border-gray-300 py-3.5 text-gray-700 bg-white hover:bg-gray-100 transition-all border"
                  >
                    Cancel
                  </Button>

                  {((userData?.plan === 'starter' && (userData?.credits ?? 0) < 200) ||
                    (userData?.plan === 'premium' && (userData?.freeChats ?? 0) <= 0 && (userData?.credits ?? 0) < 150) ||
                    ((userData?.plan === 'free' || !userData?.plan) && (userData?.freeChats ?? 0) <= 0)) ? (
                    
                    <Button 
                      onClick={() => {
                        setShowUnlockModal(false);
                        setProfileTab('credits');
                        setUserActiveSection('profile');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="flex-1 bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-xl text-xs font-bold border-none transition-all hover:scale-[1.02] active:scale-[0.98] shadow-md cursor-pointer"
                    >
                      Top Up / Upgrade Plan
                    </Button>
                  ) : (
                    <Button 
                      onClick={() => unlockChat(chatUnlockTarget.agencyId, chatUnlockTarget.agencyName)}
                      className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white rounded-xl text-xs font-extrabold border-none transition-all hover:scale-[1.02] active:scale-[0.98] shadow-md cursor-pointer"
                    >
                      Confirm & Connect ⚡
                    </Button>
                  )}
                </div>
              </Card>
            </div>
          )}

          {/* ── TRANSACTION LOADING MODAL ── */}
          {isPurchasingCredits && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
              <Card className="max-w-xs w-full bg-white shadow-2xl rounded-3xl border border-gray-150 p-8 text-center animate-in zoom-in-95 duration-150">
                <div className="relative w-16 h-16 mx-auto mb-6">
                  <div className="w-16 h-16 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center text-xl">
                    💳
                  </div>
                </div>
                <h4 className="font-extrabold text-gray-905 mb-2">Secure Checkout</h4>
                <p className="text-xs text-gray-505 font-medium leading-relaxed">
                  {purchaseStatusText}
                </p>
                <p className="text-[10px] text-gray-405 font-semibold tracking-wider uppercase mt-6 border-t pt-4">
                  Do not close this window
                </p>
              </Card>
            </div>
          )}

          {/* Premium Custom Toast Notification */}
          {toast && (
            <div className="fixed bottom-6 right-6 z-[200] animate-in slide-in-from-bottom-5 fade-in duration-300">
              <div className={`flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl border backdrop-blur-md transition-all duration-300 ${
                toast.type === 'success' ? 'bg-emerald-50/90 border-emerald-200 text-emerald-900 shadow-emerald-100/50' :
                toast.type === 'error' ? 'bg-rose-50/90 border-rose-200 text-rose-900 shadow-rose-100/50' :
                'bg-sky-50/90 border-sky-200 text-sky-900 shadow-sky-100/50'
              }`}>
                <span className="text-xl">
                  {toast.type === 'success' && '✨'}
                  {toast.type === 'error' && '⚠️'}
                  {toast.type === 'info' && 'ℹ️'}
                </span>
                <div className="text-xs font-bold tracking-wide">
                  {toast.message}
                </div>
                <button 
                  onClick={() => setToast(null)}
                  className="text-gray-400 hover:text-gray-650 transition-colors ml-2 font-bold focus:outline-none"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

        </div>
      );
    } else {
      // Agency Dashboard
      return (
        <div className="flex h-screen bg-gray-100">
          <div className="w-64 bg-white shadow-card rounded-3xl my-4 ml-4 overflow-hidden border border-gray-100 sidebar-scroll">
            <div className="p-6 border-b">
              <h2 className="text-2xl font-bold text-gray-800">Travel Agency</h2>
              <p className="text-sm text-gray-600">{userData.companyName}</p>
            </div>
            <nav className="p-4">
              <div className="space-y-2">
                <button
                  onClick={() => setAgencyActiveSection('listings')}
                  className={`w-full text-left px-4 py-2 rounded-lg ${
                    agencyActiveSection === 'listings'
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                   Listings
                </button>
                { <button
                  onClick={() => setAgencyActiveSection('overview')}
                  className={`w-full text-left px-4 py-2 rounded-lg ${
                    agencyActiveSection === 'overview'
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                   Overview
                </button> }
                { <button
                  onClick={() => setAgencyActiveSection('analytics')}
                  className={`w-full text-left px-4 py-2 rounded-lg ${
                    agencyActiveSection === 'analytics'
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                   Analytics
                </button> }
                {/* <button
                  onClick={() => setAgencyActiveSection('bookings')}
                  className={`w-full text-left px-4 py-2 rounded-lg ${
                    agencyActiveSection === 'bookings'
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                   Bookings
                </button> */}
                { <button
                  onClick={() => setAgencyActiveSection('revenue')}
                  className={`w-full text-left px-4 py-2 rounded-lg ${
                    agencyActiveSection === 'revenue'
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                   Revenue
                </button> }
                {<button
                  onClick={() => setAgencyActiveSection('chat')}
                  className={`w-full text-left px-4 py-2 rounded-lg ${
                    agencyActiveSection === 'chat'
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                   Customer Chat
                </button> }
                { <button
                  onClick={() => setAgencyActiveSection('settings')}
                  className={`w-full text-left px-4 py-2 rounded-lg ${
                    agencyActiveSection === 'settings'
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                   Settings
                </button> }
              </div>
            </nav>
          </div>

          <div className="flex-1 dashboard-scroll mr-4 mt-4">
           <header className="sticky top-0 z-10 bg-white shadow-card rounded-3xl p-6 mb-4 border border-gray-100 gpu-accelerated">
              <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-900">
                  {agencyActiveSection === 'overview' && 'Agency Overview'}
                  {agencyActiveSection === 'listings' && 'Travel Listings'}
                  {agencyActiveSection === 'analytics' && 'Agency Analytics'}
                  {agencyActiveSection === 'bookings' && 'Booking Management'}
                  {agencyActiveSection === 'revenue' && 'Revenue Dashboard'}
                  {agencyActiveSection === 'chat' && 'Customer Chat'}
                  {agencyActiveSection === 'settings' && 'Agency Settings'}
                </h1>
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-600">Status: {userData.approved ? '✅ Approved' : '⏳ Pending'}</span>
                  <Button variant="outline" size="sm" onClick={signOut}>Sign Out</Button>
                </div>
              </div>
            </header>

            <main className="p-6">
              {userData.approved ? (
                <>
                  {agencyActiveSection === 'overview' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                      <Card>
                        <CardContent className="p-6">
                          <div className="flex items-center">
                            <div className="p-2 bg-blue-100 rounded-lg">
                              <span className="text-2xl">👥</span>
                            </div>
                            <div className="ml-4">
                              <p className="text-sm font-medium text-gray-600">Total Agencies</p>
                              <p className="text-2xl font-bold text-gray-900">{allAgencies.length}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-6">
                          <div className="flex items-center">
                            <div className="p-2 bg-green-100 rounded-lg">
                              <span className="text-2xl">✅</span>
                            </div>
                            <div className="ml-4">
                              <p className="text-sm font-medium text-gray-600">Approved Agencies</p>
                              <p className="text-2xl font-bold text-gray-900">{allAgencies.filter(a => a.approved).length}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-6">
                          <div className="flex items-center">
                            <div className="p-2 bg-yellow-100 rounded-lg">
                              <span className="text-2xl">⏳</span>
                            </div>
                            <div className="ml-4">
                              <p className="text-sm font-medium text-gray-600">Pending Approvals</p>
                              <p className="text-2xl font-bold text-gray-900">{pendingAgencies.length}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {agencyActiveSection === 'listings' && (
                    <div className="space-y-6">
                      {/* Navigation Buttons */}
                      <div className="flex gap-4 mb-6">
                        <Button
                          variant={(!showListingForm && !showBulkUpload) ? 'default' : 'outline'}
                          onClick={() => {
                            setShowListingForm(false);
                            setShowBulkUpload(false);
                            setEditingListing(null);
                            setViewingListing(null);
                          }}
                          className="flex items-center gap-2"
                        >
                          📋 My Listings
                        </Button>
                        <Button
                          variant={showListingForm ? 'default' : 'outline'}
                          onClick={() => {
                            setShowListingForm(true);
                            setShowBulkUpload(false);
                            setEditingListing(null);
                            setViewingListing(null);
                          }}
                          className="flex items-center gap-2"
                        >
                          ➕ New Listing
                        </Button>
                        <Button
                          variant={showBulkUpload ? 'default' : 'outline'}
                          onClick={() => {
                            setShowBulkUpload(true);
                            setShowListingForm(false);
                            setEditingListing(null);
                            setViewingListing(null);
                          }}
                          className="flex items-center gap-2"
                        >
                          📥 Bulk Import CSV
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setAgencyActiveSection('chat')}
                          className="flex items-center gap-2"
                        >
                          💬 Chat
                        </Button>
                      </div>

                      {/* New Listing Form */}
                      {showListingForm && (
                        <AgencyListingForm
                          agencyId={user?.uid || ''}
                          onSuccess={() => {
                            setShowListingForm(false);
                            setShowBulkUpload(false);
                            setEditingListing(null);
                            setViewingListing(null);
                            // Refresh listings
                            const fetchAgencyListings = async () => {
                              const dbInstance = getDbInstance();
                              if (!dbInstance) return;
                              const agencyListingsQuery = query(collection(dbInstance, 'listings'), where('agencyId', '==', user?.uid));
                              const querySnapshot = await getDocs(agencyListingsQuery);
                              const listingsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                              setAgencyListings(listingsData);
                            };
                            fetchAgencyListings();
                          }}
                          initialData={editingListing || undefined}
                        />
                      )}

                      {/* Bulk Upload Form */}
                      {showBulkUpload && (
                        <BulkUploadForm
                          agencyId={user?.uid || ''}
                          onSuccess={() => {
                            setShowListingForm(false);
                            setShowBulkUpload(false);
                            setEditingListing(null);
                            setViewingListing(null);
                            // Refresh listings
                            const fetchAgencyListings = async () => {
                              const dbInstance = getDbInstance();
                              if (!dbInstance) return;
                              const agencyListingsQuery = query(collection(dbInstance, 'listings'), where('agencyId', '==', user?.uid));
                              const querySnapshot = await getDocs(agencyListingsQuery);
                              const listingsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                              setAgencyListings(listingsData);
                            };
                            fetchAgencyListings();
                          }}
                        />
                      )}

                      {/* My Listings */}
                      {!showListingForm && !showBulkUpload && !viewingListing && (
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center">
                              <span className="mr-2">🏖️</span>
                              Your Travel Listings
                            </CardTitle>
                            <CardDescription>
                              Manage your travel packages and destinations
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-4">
                              {agencyListings.length === 0 ? (
                                <div className="text-center py-8">
                                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <span className="text-2xl">📋</span>
                                  </div>
                                  <h3 className="text-lg font-semibold mb-2">No Listings Yet</h3>
                                  <p className="text-gray-600 mb-4">
                                    Create your first travel package to start attracting customers.
                                  </p>
                                  <Button
                                    onClick={() => {
                                      setShowListingForm(true);
                                      setShowBulkUpload(false);
                                      setEditingListing(null);
                                    }}
                                    className="flex items-center gap-2"
                                  >
                                    ➕ Create Your First Listing
                                  </Button>
                                </div>
                              ) : (
                                agencyListings.map((listing) => (
                                  <div key={listing.id} className="flex items-center justify-between p-4 border rounded-lg">
                                    <div className="flex items-center space-x-4">
                                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                        <span className="text-lg">🏖️</span>
                                      </div>
                                      <div>
                                        <h3 className="font-semibold">{listing.title}</h3>
                                        {listing.packageType && (
                                          <p className="text-sm text-gray-600 mb-1 font-semibold">
                                            {listing.packageType === 'international' ? ' International' : ' Domestic'}
                                            {listing.packageType === 'international' && listing.countryName && ` • ${listing.countryName}`}
                                            {listing.packageType === 'domestic' && listing.stateName && ` • ${listing.stateName}`}
                                          </p>
                                        )}
                                        <p className="text-sm text-gray-600">
                                          {listing.itinerary?.length || 0} days • {listing.packageType === 'international' ? '$' : '₹'}{listing.cost || listing.price || 'N/A'}
                                          <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                                            listing.approved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                          }`}>
                                            {listing.approved ? 'Approved' : 'Pending'}
                                          </span>
                                        </p>
                                        {listing.placesCovered && listing.placesCovered.length > 0 && (
                                          <p className="text-xs text-gray-500 mt-1">
                                            Places: {listing.placesCovered.map((place: any) => place.name).join(', ')}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex space-x-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleViewListing(listing)}
                                      >
                                        View
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          setShowListingForm(true);
                                          setShowBulkUpload(false);
                                          setEditingListing(listing);
                                        }}
                                      >
                                        Edit
                                      </Button>
                                      <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => handleDeleteListing(listing.id)}
                                      >
                                        Delete
                                      </Button>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  )}

                  {agencyActiveSection === 'analytics' && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <Card>
                          <CardContent className="p-6">
                            <div className="flex items-center">
                              <div className="p-2 bg-green-100 rounded-lg">
                                <span className="text-2xl">💰</span>
                              </div>
                              <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                                <p className="text-2xl font-bold text-gray-900">
                                  ₹{agencyBookings.reduce((sum, b) => sum + parseFloat(b.totalAmount || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardContent className="p-6">
                            <div className="flex items-center">
                              <div className="p-2 bg-blue-100 rounded-lg">
                                <span className="text-2xl">📊</span>
                              </div>
                              <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Conversion Rate</p>
                                <p className="text-2xl font-bold text-gray-900">
                                  {agencyBookings.length > 0 ? ((agencyBookings.filter(b => b.status === 'confirmed').length / agencyBookings.length) * 100).toFixed(1) : 0}%
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardContent className="p-6">
                            <div className="flex items-center">
                              <div className="p-2 bg-purple-100 rounded-lg">
                                <span className="text-2xl">⭐</span>
                              </div>
                              <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Avg Rating</p>
                                <p className="text-2xl font-bold text-gray-900">
                                  {agencyListings.length > 0 ?
                                    (agencyListings.reduce((sum, l) => sum + (l.rating || 0), 0) / agencyListings.length).toFixed(1) :
                                    'N/A'}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardContent className="p-6">
                            <div className="flex items-center">
                              <div className="p-2 bg-orange-100 rounded-lg">
                                <span className="text-2xl">👥</span>
                              </div>
                              <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Total Customers</p>
                                <p className="text-2xl font-bold text-gray-900">
                                  {new Set(agencyBookings.map(b => b.userId)).size}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card>
                          <CardHeader>
                            <CardTitle>📍 Popular Destinations</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3">
                              {agencyListings.length > 0 ? (
                                // Group listings by destination and count
                                Object.entries(
                                  agencyListings.reduce((acc: Record<string, number>, listing) => {
                                    const dest = listing.destination || 'Unknown';
                                    acc[dest] = (acc[dest] || 0) + 1;
                                    return acc;
                                  }, {} as Record<string, number>)
                                )
                                .sort(([,a], [,b]) => b - a)
                                .slice(0, 5)
                                .map(([destination, count]) => (
                                  <div key={destination} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                    <span className="font-medium">{destination}</span>
                                    <span className="text-sm text-gray-600">{count} listings</span>
                                  </div>
                                ))
                              ) : (
                                <p className="text-gray-500 text-center py-8">No listings yet</p>
                              )}
                            </div>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader>
                            <CardTitle>📈 Performance Metrics</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-4">
                              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                                <div>
                                  <p className="font-medium">Approved Listings</p>
                                  <p className="text-sm text-gray-600">Ready for customers</p>
                                </div>
                                <span className="text-lg font-bold text-green-600">
                                  {agencyListings.filter(l => l.approved).length}
                                </span>
                              </div>
                              <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
                                <div>
                                  <p className="font-medium">Pending Listings</p>
                                  <p className="text-sm text-gray-600">Awaiting approval</p>
                                </div>
                                <span className="text-lg font-bold text-yellow-600">
                                  {agencyListings.filter(l => !l.approved).length}
                                </span>
                              </div>
                              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                                <div>
                                  <p className="font-medium">Active Chats</p>
                                  <p className="text-sm text-gray-600">Customer conversations</p>
                                </div>
                                <span className="text-lg font-bold text-blue-600">
                                  {agencyConversations.length}
                                </span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      <Card>
                        <CardHeader>
                          <CardTitle>Recent Activity</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {agencyBookings.length > 0 ? (
                              agencyBookings.slice(0, 5).map((booking) => (
                                <div key={booking.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                  <div>
                                    <p className="font-medium">{booking.listingTitle}</p>
                                    <p className="text-sm text-gray-600">
                                      {booking.userName} • ${booking.totalAmount} • {booking.status}
                                    </p>
                                  </div>
                                  <span className="text-xs text-gray-500">
                                    {new Date(booking.createdAt?.toDate?.() || booking.createdAt).toLocaleDateString()}
                                  </span>
                                </div>
                              ))
                            ) : (
                              <div className="text-center py-8">
                                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                  <span className="text-3xl">📊</span>
                                </div>
                                <h3 className="text-lg font-semibold mb-2">No Activity Yet</h3>
                                <p className="text-gray-600">
                                  Your booking and customer activity will appear here once you start receiving inquiries.
                                </p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {agencyActiveSection === 'bookings' && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card>
                          <CardContent className="p-6">
                            <div className="flex items-center">
                              <div className="p-2 bg-blue-100 rounded-lg">
                                <span className="text-2xl">📅</span>
                              </div>
                              <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Total Bookings</p>
                                <p className="text-2xl font-bold text-gray-900">{agencyBookings.length}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardContent className="p-6">
                            <div className="flex items-center">
                              <div className="p-2 bg-yellow-100 rounded-lg">
                                <span className="text-2xl">⏳</span>
                              </div>
                              <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Pending</p>
                                <p className="text-2xl font-bold text-gray-900">{agencyBookings.filter(b => b.status === 'pending').length}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardContent className="p-6">
                            <div className="flex items-center">
                              <div className="p-2 bg-green-100 rounded-lg">
                                <span className="text-2xl">✅</span>
                              </div>
                              <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Confirmed</p>
                                <p className="text-2xl font-bold text-gray-900">{agencyBookings.filter(b => b.status === 'confirmed').length}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center">
                            <span className="mr-2">📅</span>
                            Recent Bookings
                          </CardTitle>
                          <CardDescription>
                            Manage customer bookings and inquiries
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          {agencyBookings.length === 0 ? (
                            <div className="text-center py-12">
                              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="text-2xl">📅</span>
                              </div>
                              <h3 className="text-lg font-semibold mb-2">No Bookings Yet</h3>
                              <p className="text-gray-600 mb-4">
                                When customers book your travel packages, they will appear here for you to manage.
                              </p>
                              <p className="text-sm text-gray-500">
                                You can confirm bookings, communicate with customers, and track payments.
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {agencyBookings.map((booking) => (
                                <div key={booking.id} className="flex items-center justify-between p-4 border rounded-lg">
                                  <div className="flex items-center space-x-4">
                                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                      <span className="text-lg">👤</span>
                                    </div>
                                    <div>
                                      <h3 className="font-semibold">{booking.userName}</h3>
                                      <p className="text-sm text-gray-600">
                                        {booking.listingTitle} • {booking.travelers} traveler{booking.travelers > 1 ? 's' : ''} • ${booking.totalAmount}
                                      </p>
                                      <p className="text-xs text-gray-500">
                                        Travel Date: {booking.travelDate || 'Not specified'} • Ref: {booking.bookingReference}
                                      </p>
                                      <p className="text-xs text-gray-500">
                                        {booking.userEmail} • {booking.userPhone || 'No phone'}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex flex-col items-end space-y-2">
                                    <span className={`px-2 py-1 rounded-full text-xs ${
                                      booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                                      booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                      'bg-red-100 text-red-800'
                                    }`}>
                                      {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                                    </span>
                                    <div className="flex space-x-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          // TODO: Implement booking details modal
                                          alert(`Booking Details:\n\n${booking.specialRequests || 'No special requests'}\n\nPreferences: ${booking.preferences.join(', ') || 'None'}`);
                                        }}
                                      >
                                        Details
                                      </Button>
                                      {booking.status === 'pending' && (
                                        <Button
                                          size="sm"
                                          onClick={async () => {
                                            try {
                                              const dbInstance = getDbInstance();
                                              if (!dbInstance) return;
                                              await updateDoc(doc(dbInstance, 'bookings', booking.id), { status: 'confirmed' });
                                              // Refresh bookings
                                              const updatedBookings = agencyBookings.map(b =>
                                                b.id === booking.id ? { ...b, status: 'confirmed' } : b
                                              );
                                              setAgencyBookings(updatedBookings);
                                              alert('Booking confirmed successfully!');
                                            } catch (error) {
                                              console.error('Error confirming booking:', error);
                                              alert('Failed to confirm booking. Please try again.');
                                            }
                                          }}
                                        >
                                          Confirm
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {agencyActiveSection === 'revenue' && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <Card>
                          <CardContent className="p-6">
                            <div className="text-center">
                              <p className="text-2xl font-bold text-green-600">
                                ₹{agencyBookings
                                  .filter(b => {
                                    const bookingDate = new Date(b.createdAt?.toDate?.() || b.createdAt);
                                    const now = new Date();
                                    return bookingDate.getMonth() === now.getMonth() && bookingDate.getFullYear() === now.getFullYear();
                                  })
                                  .reduce((sum, b) => sum + parseFloat(b.totalAmount || 0), 0)
                                  .toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </p>
                              <p className="text-sm text-gray-600">This Month</p>
                            </div>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardContent className="p-6">
                            <div className="text-center">
                              <p className="text-2xl font-bold text-blue-600">
                                ₹{agencyBookings
                                  .filter(b => {
                                    const bookingDate = new Date(b.createdAt?.toDate?.() || b.createdAt);
                                    const now = new Date();
                                    return bookingDate.getFullYear() === now.getFullYear();
                                  })
                                  .reduce((sum, b) => sum + parseFloat(b.totalAmount || 0), 0)
                                  .toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </p>
                              <p className="text-sm text-gray-600">This Year</p>
                            </div>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardContent className="p-6">
                            <div className="text-center">
                              <p className="text-2xl font-bold text-purple-600">{agencyBookings.length}</p>
                              <p className="text-sm text-gray-600">Total Bookings</p>
                            </div>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardContent className="p-6">
                            <div className="text-center">
                              <p className="text-2xl font-bold text-yellow-600">
                                {agencyListings.length > 0 ?
                                  (agencyListings.reduce((sum, l) => sum + (l.rating || 0), 0) / agencyListings.length).toFixed(1) :
                                  'N/A'}
                              </p>
                              <p className="text-sm text-gray-600">Avg Rating</p>
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card>
                          <CardHeader>
                            <CardTitle>💰 Revenue Breakdown</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-4">
                              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                                <div>
                                  <p className="font-medium">Total Revenue</p>
                                  <p className="text-sm text-gray-600">Lifetime earnings</p>
                                </div>
                                <span className="text-lg font-bold text-green-600">
                                  ₹{agencyBookings.reduce((sum, b) => sum + parseFloat(b.totalAmount || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              </div>
                              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                                <div>
                                  <p className="font-medium">Confirmed Bookings Revenue</p>
                                  <p className="text-sm text-gray-600">From confirmed bookings</p>
                                </div>
                                <span className="text-lg font-bold text-blue-600">
                                  ₹{agencyBookings
                                    .filter(b => b.status === 'confirmed')
                                    .reduce((sum, b) => sum + parseFloat(b.totalAmount || 0), 0)
                                    .toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              </div>
                              <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
                                <div>
                                  <p className="font-medium">Pending Revenue</p>
                                  <p className="text-sm text-gray-600">From pending bookings</p>
                                </div>
                                <span className="text-lg font-bold text-yellow-600">
                                  ₹{agencyBookings
                                    .filter(b => b.status === 'pending')
                                    .reduce((sum, b) => sum + parseFloat(b.totalAmount || 0), 0)
                                    .toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader>
                            <CardTitle>📊 Monthly Performance</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3">
                              {agencyBookings.length > 0 ? (
                                // Group bookings by month and calculate revenue
                                Object.entries(
                                  agencyBookings.reduce((acc: Record<string, number>, booking) => {
                                    const date = new Date(booking.createdAt?.toDate?.() || booking.createdAt);
                                    const monthKey = date.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
                                    acc[monthKey] = (acc[monthKey] || 0) + parseFloat(booking.totalAmount || 0);
                                    return acc;
                                  }, {} as Record<string, number>)
                                )
                                .sort(([,a], [,b]) => b - a)
                                .slice(0, 6)
                                .map(([month, revenue]) => (
                                  <div key={month} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                    <span className="font-medium">{month}</span>
                                    <span className="text-sm font-semibold text-green-600">₹{revenue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                  </div>
                                ))
                              ) : (
                                <div className="text-center py-8">
                                  <p className="text-gray-500">No revenue data yet</p>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      <Card>
                        <CardHeader>
                          <CardTitle>Recent Transactions</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {agencyBookings.length > 0 ? (
                              agencyBookings.slice(0, 5).map((booking) => (
                                <div key={booking.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                  <div>
                                    <p className="font-medium">{booking.listingTitle}</p>
                                    <p className="text-sm text-gray-600">
                                      {booking.userName} • {new Date(booking.createdAt?.toDate?.() || booking.createdAt).toLocaleDateString('en-IN')}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-semibold text-green-600">₹{parseFloat(booking.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                    <p className={`text-xs ${booking.status === 'confirmed' ? 'text-green-600' : 'text-yellow-600'}`}>
                                      {booking.status === 'confirmed' ? '✅ Confirmed' : '⏳ Pending'}
                                    </p>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="text-center py-8">
                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                  <span className="text-3xl">💰</span>
                                </div>
                                <p className="text-gray-500">No transactions yet</p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {agencyActiveSection === 'chat' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Conversations List */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center">
                            <span className="mr-2">👥</span>
                            Conversations
                          </CardTitle>
                          <CardDescription>
                            Customers who contacted you
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2 max-h-96 overflow-y-auto">
                            {agencyConversations.length === 0 ? (
                              <p className="text-gray-500 text-center py-4">No conversations yet</p>
                            ) : (
                              agencyConversations.map((conversation) => (
                                <div
                                  key={conversation.userId}
                                  onClick={() => selectConversation(conversation)}
                                  className={`p-3 rounded-lg cursor-pointer border ${
                                    selectedConversation?.userId === conversation.userId
                                      ? 'bg-blue-50 border-blue-200'
                                      : 'bg-gray-50 hover:bg-gray-100'
                                  }`}
                                >
                                  <div className="flex items-center space-x-3">
                                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                      <span className="text-sm">👤</span>
                                    </div>
                                    <div className="flex-1">
                                      <p className="font-medium text-sm">{conversation.userName}</p>
                                      <p className="text-xs text-gray-600 truncate">{conversation.lastMessage}</p>
                                    </div>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </CardContent>
                      </Card>

                      {/* Chat Messages */}
                      <div className="md:col-span-2">
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center">
                              <span className="mr-2">💬</span>
                              {selectedConversation ? `Chat with Customer ${selectedConversation.userId.slice(0, 8)}` : 'Select a conversation'}
                            </CardTitle>
                            <CardDescription>
                              {selectedConversation ? 'Respond to customer inquiries' : 'Choose a conversation from the list'}
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            {selectedConversation ? (
                              <div className="h-96 bg-gray-50 rounded-lg p-4 flex flex-col">
                                <div className="flex-1 overflow-y-auto space-y-3 mb-4">
                                  {[...agencyChatMessages]
                                    .filter(msg => msg.chatId === selectedConversation.chatId)
                                    .sort((a, b) => a.timestamp - b.timestamp)
                                    .map((msg, index) => (
                                      <div key={msg.id || index} className={`flex ${msg.sender === user?.uid ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-xs px-3 py-2 rounded-lg ${msg.sender === user?.uid ? 'bg-blue-500 text-white' : 'bg-white text-gray-800'}`}>
                                          <p className="text-sm">{msg.text}</p>
                                          <p className="text-xs opacity-75">{new Date(msg.timestamp).toLocaleTimeString()}</p>
                                        </div>
                                      </div>
                                    ))}
                                </div>
                                <div className="flex space-x-2">
                                  <Input
                                    value={agencyChatInput}
                                    onChange={(e) => setAgencyChatInput(e.target.value)}
                                    placeholder="Type your reply..."
                                    onKeyPress={(e) => e.key === 'Enter' && sendAgencyMessage()}
                                  />
                                  <Button onClick={sendAgencyMessage} disabled={!agencyChatInput.trim()}>
                                    Send
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="h-96 bg-gray-50 rounded-lg p-4 flex items-center justify-center">
                                <p className="text-gray-500">Select a conversation to start chatting</p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  )}

                  {agencyActiveSection === 'settings' && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center">
                          <span className="mr-2">⚙️</span>
                          Agency Settings
                        </CardTitle>
                        <CardDescription>
                          Manage your agency profile and preferences
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <Label htmlFor="agencyName">Agency Name</Label>
                            <Input id="agencyName" defaultValue={userData.companyName} />
                          </div>
                          <div>
                            <Label htmlFor="contactEmail">Contact Email</Label>
                            <Input id="contactEmail" defaultValue={user?.email || ''} />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="description">Agency Description</Label>
                          <textarea
                            id="description"
                            className="w-full p-2 border rounded-lg"
                            rows={4}
                            placeholder="Tell travelers about your agency..."
                          />
                        </div>

                        <div>
                          <h3 className="text-lg font-semibold mb-4">Notification Preferences</h3>
                          <div className="space-y-3">
                            <label className="flex items-center">
                              <input type="checkbox" className="mr-2" defaultChecked />
                              <span className="text-sm">Email notifications for new bookings</span>
                            </label>
                            <label className="flex items-center">
                              <input type="checkbox" className="mr-2" defaultChecked />
                              <span className="text-sm">SMS notifications for urgent updates</span>
                            </label>
                            <label className="flex items-center">
                              <input type="checkbox" className="mr-2" />
                              <span className="text-sm">Marketing emails and promotions</span>
                            </label>
                          </div>
                        </div>

                        <Button>Save Settings</Button>
                      </CardContent>
                    </Card>
                  )}
                </>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-3xl">⏳</span>
                    </div>
                    <h3 className="text-xl font-semibold mb-2">Account Pending Approval</h3>
                    <p className="text-gray-600 mb-4">
                      Your agency registration is being reviewed by our admin team.
                      You'll receive access to your dashboard once approved.
                    </p>
                    <p className="text-sm text-gray-500">
                      Usually takes 24-48 hours for review.
                    </p>
                  </CardContent>
                </Card>
              )}
            </main>
          </div>
        </div>
      );
    }
  }

  // Journey Details Modal Component
  function JourneyDetailsModal({ booking, onClose }: { booking: any; onClose: () => void }) {
    console.log('Modal component rendering with booking:', booking);
    
    if (!booking) return null;

    const currencySymbol = booking.packageType === 'international' ? '$' : '₹';
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold">Journey Details</h2>
                <p className="text-blue-100 mt-1">{booking.listingTitle}</p>
              </div>
              <button 
                onClick={onClose}
                className="bg-white/20 hover:bg-white/30 rounded-full p-2 transition-colors"
              >
                <span className="text-xl">✕</span>
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Status Badge */}
            <div className="flex items-center justify-between">
              <span className={`px-4 py-2 rounded-full text-sm font-medium ${
                booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {booking.status === 'confirmed' ? '✅ Confirmed' : 
                 booking.status === 'pending' ? '⏳ Pending' : '❌ Cancelled'}
              </span>
              <span className="text-gray-500 text-sm">
                Booked on {booking.createdAtFormatted}
              </span>
            </div>

            {/* Booking Info */}
            <div className="bg-gray-50 p-5 rounded-xl">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                📅 Booking Information
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-white p-3 rounded-lg">
                  <span className="text-gray-500 text-xs uppercase tracking-wide block">Reference</span>
                  <p className="font-mono font-semibold text-gray-800">{booking.bookingReference}</p>
                </div>
                <div className="bg-white p-3 rounded-lg">
                  <span className="text-gray-500 text-xs uppercase tracking-wide block">Travel Date</span>
                  <p className="font-semibold text-gray-800">{booking.travelDate || 'Not specified'}</p>
                </div>
                <div className="bg-white p-3 rounded-lg">
                  <span className="text-gray-500 text-xs uppercase tracking-wide block">Travelers</span>
                  <p className="font-semibold text-gray-800">{booking.travelers} {booking.travelers === 1 ? 'person' : 'people'}</p>
                </div>
                <div className="bg-white p-3 rounded-lg">
                  <span className="text-gray-500 text-xs uppercase tracking-wide block">Package Type</span>
                  <p className="font-semibold text-gray-800">
                    {booking.packageType === 'international' ? '🌍 International' : '🏠 Domestic'}
                  </p>
                </div>
                <div className="bg-white p-3 rounded-lg col-span-2">
                  <span className="text-gray-500 text-xs uppercase tracking-wide block">Agency</span>
                  <p className="font-semibold text-gray-800">{booking.agencyName}</p>
                </div>
              </div>
            </div>

            {/* Journey Details */}
            {booking.journeyDetails ? (
              <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  ✈️ Travel Itinerary
                </h3>
                
                {booking.journeyDetails.flight && (
                  <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
                    <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                      ✈️ Flight Information
                    </h4>
                    <p className="text-blue-800 whitespace-pre-line">{booking.journeyDetails.flight}</p>
                  </div>
                )}

                {booking.journeyDetails.hotel && (
                  <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-lg">
                    <h4 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
                      🏨 Hotel Accommodation
                    </h4>
                    <p className="text-green-800 whitespace-pre-line">{booking.journeyDetails.hotel}</p>
                  </div>
                )}

                {booking.journeyDetails.itinerary && (
                  <div className="bg-purple-50 border-l-4 border-purple-500 p-4 rounded-r-lg">
                    <h4 className="font-semibold text-purple-900 mb-2 flex items-center gap-2">
                      📋 Day-by-Day Itinerary
                    </h4>
                    <div className="text-purple-800 whitespace-pre-line leading-relaxed">
                      {booking.journeyDetails.itinerary}
                    </div>
                  </div>
                )}

                {booking.journeyDetails.additionalNotes && (
                  <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-r-lg">
                    <h4 className="font-semibold text-yellow-900 mb-2 flex items-center gap-2">
                      📝 Additional Notes
                    </h4>
                    <p className="text-yellow-800">{booking.journeyDetails.additionalNotes}</p>
                  </div>
                )}

                {!booking.journeyDetails.flight && !booking.journeyDetails.hotel && !booking.journeyDetails.itinerary && (
                  <div className="bg-yellow-50 p-4 rounded-lg text-center">
                    <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <span className="text-2xl">⏳</span>
                    </div>
                    <h3 className="font-semibold mb-2">Journey Details Being Prepared</h3>
                    <p className="text-yellow-800">
                      Your agency is finalizing your complete travel itinerary. Check back soon!
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 p-6 rounded-xl text-center">
                <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">⏳</span>
                </div>
                <h3 className="font-semibold text-lg mb-2">Journey Details Coming Soon</h3>
                <p className="text-yellow-800">
                  Your agency is preparing your complete travel itinerary. You'll receive flight, hotel, and activity details within 24 hours of booking confirmation.
                </p>
              </div>
            )}

            {/* Special Requests */}
            {booking.specialRequests && (
              <div className="bg-pink-50 border-l-4 border-pink-500 p-4 rounded-r-lg">
                <h4 className="font-semibold text-pink-900 mb-2">📝 Your Special Requests</h4>
                <p className="text-pink-800">{booking.specialRequests}</p>
              </div>
            )}

            {/* Payment Summary */}
            <div className="bg-gray-50 p-5 rounded-xl">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                💰 Payment Summary
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Package Cost ({booking.travelers} traveler{booking.travelers > 1 ? 's' : ''})</span>
                  <span className="font-medium">
                    {currencySymbol}{parseFloat(booking.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="border-t pt-2 flex justify-between">
                  <span className="font-semibold">Total Paid</span>
                  <span className="font-bold text-green-600 text-xl">
                    {currencySymbol}{parseFloat(booking.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="bg-blue-50 p-5 rounded-xl">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                📞 Contact & Emergency Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-blue-700 font-medium block">Agency</span>
                  <p className="text-blue-900">{booking.agencyName}</p>
                </div>
                <div>
                  <span className="text-blue-700 font-medium block">Your Contact</span>
                  <p className="text-blue-900">{booking.userName} • {booking.userPhone || 'No phone'}</p>
                </div>
                {booking.journeyDetails?.emergencyContact && (
                  <div className="md:col-span-2">
                    <span className="text-blue-700 font-medium block">Emergency Contact</span>
                    <p className="text-blue-900">{booking.journeyDetails.emergencyContact}</p>
                  </div>
                )}
              </div>
              <p className="text-xs text-blue-600 mt-4 bg-blue-100 p-2 rounded">
                💡 Keep this information handy during your travels. Contact your agency for any assistance.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 pt-4 border-t">
              <Button onClick={onClose} variant="outline" className="flex-1">
                Close
              </Button>
              <Button 
                onClick={() => window.print()} 
                variant="outline"
                className="flex-1"
              >
                🖨️ Print Details
              </Button>
              {booking.status === 'confirmed' && (
                <Button 
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  onClick={() => {
                    // Share functionality
                    if (navigator.share) {
                      navigator.share({
                        title: `My Travel Booking - ${booking.listingTitle}`,
                        text: `Booking Reference: ${booking.bookingReference}\nTravel Date: ${booking.travelDate || 'TBD'}`,
                      });
                    } else {
                      alert('Booking details copied to clipboard!');
                    }
                  }}
                >
                  📤 Share
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-gray-50">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle>{isLogin ? 'Login' : `Register as ${isAgencyRegistration ? 'Agency' : 'User'}`}</CardTitle>
          <CardDescription>
            {isLogin ? 'Sign in to your account' : `Create a new ${isAgencyRegistration ? 'agency' : 'user'} account`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isLogin && (
            <div className="mb-4">
              <Button
                type="button"
                variant={isAgencyRegistration ? 'default' : 'outline'}
                size="sm"
                onClick={() => setIsAgencyRegistration(true)}
                className="mr-2"
              >
                Agency
              </Button>
              <Button
                type="button"
                variant={!isAgencyRegistration ? 'default' : 'outline'}
                size="sm"
                onClick={() => setIsAgencyRegistration(false)}
              >
                User
              </Button>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && !isAgencyRegistration ? (
              // User Registration - Email and Password fields
              <>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </>
            ) : isLogin ? (
              // Login - Email and Password fields
              <>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </>
            ) : (
              // Agency Registration - No email and password fields
              <></>
            )}
            {!isLogin && (
              <>
                {isAgencyRegistration ? (
                  // Agency Registration Form
                  <>
                    <div className="space-y-6">
                      {/* 1. Agency Basic Details */}
                      <div className="border rounded-lg p-4">
                        <h3 className="font-semibold text-lg mb-4">1. Agency Basic Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="agencyName">Agency Name</Label>
                            <Input
                              id="agencyName"
                              value={name}
                              onChange={(e) => setName(e.target.value)}
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="websiteUrl">Website URL (optional)</Label>
                            <Input
                              id="websiteUrl"
                              value={companyName}
                              onChange={(e) => setCompanyName(e.target.value)}
                              placeholder="https://your-agency.com"
                            />
                          </div>
                          <div>
                            <Label htmlFor="email">Email Address</Label>
                            <Input
                              id="email"
                              type="email"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="contactNumber">Contact Number</Label>
                            <Input
                              id="contactNumber"
                              type="tel"
                              value={contactNumber}
                              onChange={(e) => setContactNumber(e.target.value)}
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="businessLocation">Business Location (City, State)</Label>
                            <Input
                              id="businessLocation"
                              value={businessLocation}
                              onChange={(e) => setBusinessLocation(e.target.value)}
                              required
                            />
                          </div>
                          <div className="md:col-span-2">
                            <Label htmlFor="fullAddress">Full Address</Label>
                            <textarea
                              id="fullAddress"
                              className="w-full p-2 border rounded-lg"
                              rows={3}
                              value={fullAddress}
                              onChange={(e) => setFullAddress(e.target.value)}
                              required
                            />
                          </div>
                        </div>
                      </div>

                      {/* 2. Legal & Verification Documents */}
                      <div className="border rounded-lg p-4">
                        <h3 className="font-semibold text-lg mb-4">2. Legal & Verification Documents</h3>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="panCard">Upload PAN Card (PDF/JPG/PNG)</Label>
                            <Input
                              id="panCard"
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png"
                              onChange={(e) => setPanCard(e.target.files?.[0] || null)}
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="gstCertificate">Upload GST Certificate (PDF/JPG/PNG)</Label>
                            <Input
                              id="gstCertificate"
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png"
                              onChange={(e) => setGstCertificate(e.target.files?.[0] || null)}
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="businessProof">Upload Registration / Shop Act / Other Business Proof (PDF/JPG/PNG)</Label>
                            <Input
                              id="businessProof"
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png"
                              onChange={(e) => setBusinessProof(e.target.files?.[0] || null)}
                              required
                            />
                          </div>
                        </div>
                      </div>

                      {/* 3. Agency Description */}
                      <div className="border rounded-lg p-4">
                        <h3 className="font-semibold text-lg mb-4">3. Agency Description</h3>
                        <div>
                          <Label htmlFor="agencyDescription">Text area for agency overview (Max 500 words)</Label>
                          <p className="text-xs text-gray-500 mb-2">Should describe experience, services, and specialization</p>
                          <textarea
                            id="agencyDescription"
                            className="w-full p-2 border rounded-lg"
                            rows={6}
                            value={agencyDescription}
                            onChange={(e) => setAgencyDescription(e.target.value)}
                            maxLength={500}
                            required
                          />
                          <p className="text-xs text-gray-500 mt-1">{agencyDescription.length}/500 words</p>
                        </div>
                      </div>

                      {/* 4. Operating Details */}
                      <div className="border rounded-lg p-4">
                        <h3 className="font-semibold text-lg mb-4">4. Operating Details</h3>
                        <div>
                          <Label>Operating From (select one or more):</Label>
                          <div className="space-y-2 mt-2">
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={operatingFromHome}
                                onChange={(e) => setOperatingFromHome(e.target.checked)}
                                className="mr-2"
                              />
                              <span>Home</span>
                            </label>
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={operatingFromOffice}
                                onChange={(e) => setOperatingFromOffice(e.target.checked)}
                                className="mr-2"
                              />
                              <span>Office</span>
                            </label>
                          </div>
                          {operatingFromOffice && (
                            <div className="mt-4">
                              <Label htmlFor="officeAddress">Office Address</Label>
                              <textarea
                                id="officeAddress"
                                className="w-full p-2 border rounded-lg"
                                rows={3}
                                value={officeAddress}
                                onChange={(e) => setOfficeAddress(e.target.value)}
                                required
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 5. Media Uploads */}
                      <div className="border rounded-lg p-4">
                        <h3 className="font-semibold text-lg mb-4">5. Media Uploads</h3>
                        <div className="space-y-4">
                          <div>
                            <Label>Upload agency photos:</Label>
                            <div className="space-y-2">
                              <label className="flex items-center">
                                <input
                                  type="checkbox"
                                  checked={uploadOfficePhotos}
                                  onChange={(e) => setUploadOfficePhotos(e.target.checked)}
                                  className="mr-2"
                                />
                                <span>Office photos</span>
                              </label>
                              <label className="flex items-center">
                                <input
                                  type="checkbox"
                                  checked={uploadBranding}
                                  onChange={(e) => setUploadBranding(e.target.checked)}
                                  className="mr-2"
                                />
                                <span>Branding or certificates</span>
                              </label>
                            </div>
                          </div>
                          <div>
                            <Label>Upload Photos (Multiple allowed)</Label>
                            <Input
                              type="file"
                              multiple
                              accept="image/*"
                              onChange={(e) => setAgencyPhotos(Array.from(e.target.files || []))}
                            />
                          </div>
                        </div>
                      </div>

                      {/* 6. Refund Policy */}
                      <div className="border rounded-lg p-4">
                        <h3 className="font-semibold text-lg mb-4">6. Refund Policy</h3>
                        <div>
                          <Label htmlFor="refundPolicy">Text area for agency refund & cancellation policy</Label>
                          <p className="text-xs text-gray-500 mb-2">Required field</p>
                          <textarea
                            id="refundPolicy"
                            className="w-full p-2 border rounded-lg"
                            rows={4}
                            value={refundPolicy}
                            onChange={(e) => setRefundPolicy(e.target.value)}
                            required
                          />
                        </div>
                      </div>

                      {/* 7. Declaration */}
                      <div className="border rounded-lg p-4">
                        <h3 className="font-semibold text-lg mb-4">7. Declaration</h3>
                        <label className="flex items-start">
                          <input
                            type="checkbox"
                            checked={declarationChecked}
                            onChange={(e) => setDeclarationChecked(e.target.checked)}
                            className="mr-2 mt-1"
                            required
                          />
                          <span className="text-sm">
                            I declare that all the information provided is true and correct, and I agree to the platform's terms and policies.
                          </span>
                        </label>
                      </div>
                    </div>
                  </>
                ) : (
                  // User Registration Form
                  <>
                    <div>
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                      />
                    </div>
                  </>
                )}
              </>
            )}
            {error && <p className="text-red-500 text-sm">{error}</p>}
            {isLogin && (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => signInWithGoogle()}
              >
                Sign in with Google
              </Button>
            )}
            <Button type="submit" className="w-full">
              {isLogin ? 'Sign In' : 'Register'}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <Button variant="link" onClick={() => setIsLogin(!isLogin)}>
              {isLogin ? 'Need to register?' : 'Already have an account?'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Journey Details Modal */}
      {showJourneyModal && selectedJourneyBooking && (
        <JourneyDetailsModal
          booking={selectedJourneyBooking}
          onClose={() => {
            setShowJourneyModal(false);
            setSelectedJourneyBooking(null);
          }}
        />
      )}

      {/* Review Modal */}
      {showReviewModal && reviewListing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl mx-4">
            <CardHeader>
              <CardTitle className="flex items-center">
                <span className="mr-2">⭐</span>
                Write a Review for {reviewListing.title}
              </CardTitle>
              <CardDescription>
                Share your experience to help other travelers
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Rating */}
              <div>
                <Label className="text-base font-medium">Your Rating</Label>
                <div className="flex gap-1 mt-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setNewReview({...newReview, rating: star})}
                      className={`text-2xl ${newReview.rating >= star ? 'text-yellow-400' : 'text-gray-300'}`}
                    >
                      ⭐
                    </button>
                  ))}
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  {newReview.rating === 0 ? 'Select a rating' :
                   newReview.rating === 1 ? 'Poor' :
                   newReview.rating === 2 ? 'Fair' :
                   newReview.rating === 3 ? 'Good' :
                   newReview.rating === 4 ? 'Very Good' : 'Excellent'}
                </p>
              </div>

              {/* Review Text */}
              <div>
                <Label htmlFor="reviewComment">Your Review</Label>
                <textarea
                  id="reviewComment"
                  className="w-full p-3 border rounded-lg mt-1"
                  rows={4}
                  value={newReview.comment}
                  onChange={(e) => setNewReview({...newReview, comment: e.target.value})}
                  placeholder="Tell others about your experience..."
                />
              </div>

              {/* Photo Upload */}
              <div>
                <Label htmlFor="reviewPhotos">Add Photos (Optional)</Label>
                <Input
                  id="reviewPhotos"
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => {
                    // Handle photo upload here
                    console.log('Photos selected:', e.target.files);
                  }}
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Share photos from your trip to help others visualize the experience
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={() => {
                    // Submit review logic
                    alert('Review submitted successfully!');
                    setShowReviewModal(false);
                    setNewReview({ listingId: '', rating: 5, comment: '', photos: [] });
                    setReviewListing(null);
                  }}
                  disabled={newReview.rating === 0 || !newReview.comment.trim()}
                  className="flex-1"
                >
                  Submit Review
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowReviewModal(false);
                    setNewReview({ listingId: '', rating: 5, comment: '', photos: [] });
                    setReviewListing(null);
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Pincode Change Modal */}
      {showPincodeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-in fade-in duration-200">
          <Card className="w-full max-w-sm mx-4 bg-[#1C1F26] border-gray-800 text-white shadow-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <span className="text-xl">📍</span> Update Location
              </CardTitle>
              <CardDescription className="text-xs text-gray-400">
                Enter your 6-digit postal code to customize your experience
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="pincodeInput" className="text-xs font-semibold text-gray-300">Pincode</Label>
                <Input
                  id="pincodeInput"
                  type="text"
                  maxLength={6}
                  placeholder="e.g., 400605"
                  className="bg-gray-900 border-gray-800 text-white mt-1 w-full tracking-wider font-mono text-center text-lg focus:ring-orange-500 focus:border-orange-500"
                  value={pincodeInput}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setPincodeInput(val);
                  }}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button
                  onClick={() => {
                    if (pincodeInput.length === 6) {
                      setPincode(`Pincode ${pincodeInput}`);
                      setShowPincodeModal(false);
                    } else {
                      alert('Please enter a valid 6-digit pincode');
                    }
                  }}
                  className="flex-1 bg-gradient-to-r from-orange-500 to-yellow-500 text-white hover:from-orange-600 hover:to-yellow-600 border-none font-semibold transition-all duration-200"
                >
                  Save Location
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowPincodeModal(false)}
                  className="flex-1 border-gray-750 text-gray-300 hover:bg-gray-800 hover:text-white"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── REDESIGNED PREMIUM UNLOCK CHAT CONVERSATION MODAL ── */}
      {showUnlockModal && chatUnlockTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="max-w-md w-full bg-white shadow-2xl rounded-3xl border border-gray-150 overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Visual Premium Header */}
            <div className="bg-gradient-to-r from-blue-700 to-indigo-800 p-6 text-white relative">
              <div className="absolute top-6 right-6 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/20">
                Verified Agent
              </div>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white text-blue-700 rounded-2xl flex items-center justify-center text-3xl font-bold shadow-md">
                  🏢
                </div>
                <div>
                  <h3 className="text-xl font-extrabold tracking-tight">{chatUnlockTarget.agencyName}</h3>
                  <p className="text-xs text-blue-200 mt-0.5">Connect and discuss "{chatUnlockTarget.packageTitle}"</p>
                </div>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Explanation and Features List */}
              <div className="space-y-3">
                <p className="text-sm text-gray-705 font-bold leading-relaxed">
                  Unlock direct messaging and customized itineraries:
                </p>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="flex items-center gap-2 text-xs text-gray-650 bg-gray-50 border p-2.5 rounded-xl">
                    <span className="text-blue-500 font-bold text-sm">💬</span>
                    <div>
                      <p className="font-bold text-gray-900 leading-tight">Direct Chat</p>
                      <p className="text-[9px] text-gray-500 mt-0.5">Unlimited messaging</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-650 bg-gray-50 border p-2.5 rounded-xl">
                    <span className="text-blue-500 font-bold text-sm">📄</span>
                    <div>
                      <p className="font-bold text-gray-900 leading-tight">Custom Quotes</p>
                      <p className="text-[9px] text-gray-500 mt-0.5">Personalized plans</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-650 bg-gray-50 border p-2.5 rounded-xl">
                    <span className="text-blue-500 font-bold text-sm">📞</span>
                    <div>
                      <p className="font-bold text-gray-900 leading-tight">Direct Call</p>
                      <p className="text-[9px] text-gray-500 mt-0.5">Callbacks enabled</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-650 bg-gray-50 border p-2.5 rounded-xl">
                    <span className="text-blue-500 font-bold text-sm">⚡</span>
                    <div>
                      <p className="font-bold text-gray-900 leading-tight">Mediation Help</p>
                      <p className="text-[9px] text-gray-500 mt-0.5">100% Secure & safe</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Transaction Box */}
              <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 space-y-4">
                <div className="flex justify-between items-center text-[10px] font-bold uppercase text-gray-400 tracking-wider">
                  <span>Connection Details</span>
                  <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md text-[9px]">
                    Plan: {userData?.plan || 'Free'}
                  </span>
                </div>
                
                {/* Visual credit deduction flow */}
                <div className="flex items-center justify-between gap-4 py-1">
                  <div className="text-center flex-1">
                    <span className="text-[9px] text-gray-450 font-bold uppercase tracking-wider">Your Balance</span>
                    <div className="text-lg font-black text-gray-800 mt-0.5">
                      {userData?.plan === 'starter' && `${userData?.credits ?? 0}`}
                      {userData?.plan === 'premium' && `${userData?.freeChats ?? 0}`}
                      {(userData?.plan === 'free' || !userData?.plan) && `${userData?.freeChats ?? 0}`}
                    </div>
                    <span className="text-[9px] text-gray-500 font-medium">
                      {userData?.plan === 'starter' ? 'Credits' : 'Free Chats'}
                    </span>
                  </div>
                  
                  <div className="flex flex-col items-center">
                    <span className="text-[9px] text-blue-600 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full font-black">
                      -{userData?.plan === 'starter' ? '200' : '1'}
                    </span>
                    <span className="text-sm text-blue-600 mt-0.5">➔</span>
                  </div>

                  <div className="text-center flex-1">
                    <span className="text-[9px] text-gray-450 font-bold uppercase tracking-wider">After Unlock</span>
                    <div className="text-lg font-black text-blue-600 mt-0.5">
                      {userData?.plan === 'starter' && `${Math.max(0, (userData?.credits ?? 0) - 200)}`}
                      {userData?.plan === 'premium' && `${Math.max(0, (userData?.freeChats ?? 0) - 1)}`}
                      {(userData?.plan === 'free' || !userData?.plan) && `${Math.max(0, (userData?.freeChats ?? 0) - 1)}`}
                    </div>
                    <span className="text-[9px] text-gray-500 font-medium">
                      {userData?.plan === 'starter' ? 'Credits left' : 'Free Chats left'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Check if user has sufficient credits */}
              {((userData?.plan === 'starter' && (userData?.credits ?? 0) < 200) ||
                (userData?.plan === 'premium' && (userData?.freeChats ?? 0) <= 0 && (userData?.credits ?? 0) < 150) ||
                ((userData?.plan === 'free' || !userData?.plan) && (userData?.freeChats ?? 0) <= 0)) ? (
                
                <div className="bg-red-50 text-red-800 border border-red-150 rounded-2xl p-4 flex items-start gap-3 shadow-sm">
                  <span className="text-xl leading-none">⚠️</span>
                  <div className="text-xs">
                    <p className="font-extrabold text-red-905">Insufficient Balance</p>
                    <p className="text-red-750 mt-1 leading-relaxed">
                      You need at least {userData?.plan === 'starter' ? '200 Credits' : '1 Free Chat'} to connect with this agency. Top up credits or change plans to continue.
                    </p>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="p-4 bg-gray-50 border-t flex flex-row gap-3">
              <Button 
                variant="outline" 
                onClick={() => setShowUnlockModal(false)}
                className="flex-1 rounded-xl text-xs font-bold border-gray-300 py-3.5 text-gray-700 bg-white hover:bg-gray-100 transition-all border"
              >
                Cancel
              </Button>

              {((userData?.plan === 'starter' && (userData?.credits ?? 0) < 200) ||
                (userData?.plan === 'premium' && (userData?.freeChats ?? 0) <= 0 && (userData?.credits ?? 0) < 150) ||
                ((userData?.plan === 'free' || !userData?.plan) && (userData?.freeChats ?? 0) <= 0)) ? (
                
                <Button 
                  onClick={() => {
                    setShowUnlockModal(false);
                    setProfileTab('credits');
                    setUserActiveSection('profile');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="flex-1 bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-xl text-xs font-bold border-none transition-all hover:scale-[1.02] active:scale-[0.98] shadow-md cursor-pointer"
                >
                  Top Up / Upgrade Plan
                </Button>
              ) : (
                <Button 
                  onClick={() => unlockChat(chatUnlockTarget.agencyId, chatUnlockTarget.agencyName)}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white rounded-xl text-xs font-extrabold border-none transition-all hover:scale-[1.02] active:scale-[0.98] shadow-md cursor-pointer"
                >
                  Confirm & Connect ⚡
                </Button>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* ── TRANSACTION LOADING MODAL ── */}
      {isPurchasingCredits && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <Card className="max-w-xs w-full bg-white shadow-2xl rounded-3xl border border-gray-150 p-8 text-center animate-in zoom-in-95 duration-150">
            <div className="relative w-16 h-16 mx-auto mb-6">
              <div className="w-16 h-16 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center text-xl">
                💳
              </div>
            </div>
            <h4 className="font-extrabold text-gray-900 mb-2">Secure Checkout</h4>
            <p className="text-xs text-gray-500 font-medium leading-relaxed">
              {purchaseStatusText}
            </p>
            <p className="text-[10px] text-gray-405 font-semibold tracking-wider uppercase mt-6 border-t pt-4">
              Do not close this window
            </p>
          </Card>
        </div>
      )}
      {/* Premium Custom Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[200] animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className={`flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl border backdrop-blur-md transition-all duration-300 ${
            toast.type === 'success' ? 'bg-emerald-50/90 border-emerald-200 text-emerald-900 shadow-emerald-100/50' :
            toast.type === 'error' ? 'bg-rose-50/90 border-rose-200 text-rose-900 shadow-rose-100/50' :
            'bg-sky-50/90 border-sky-200 text-sky-900 shadow-sky-100/50'
          }`}>
            <span className="text-xl">
              {toast.type === 'success' && '✨'}
              {toast.type === 'error' && '⚠️'}
              {toast.type === 'info' && 'ℹ️'}
            </span>
            <div className="text-xs font-bold tracking-wide">
              {toast.message}
            </div>
            <button 
              onClick={() => setToast(null)}
              className="text-gray-400 hover:text-gray-650 transition-colors ml-2 font-bold focus:outline-none"
            >
              ✕
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
