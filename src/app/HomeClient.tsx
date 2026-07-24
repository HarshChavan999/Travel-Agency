'use client';
import { useSearchParams } from 'next/navigation';import { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import AgencyListingForm from '@/components/AgencyListingForm';
import AdminChatViewer from '@/components/AdminChatViewer';
import BulkUploadForm from '@/components/BulkUploadForm';
import SearchFilters from '@/components/SearchFilters';
import ListingCard from '@/components/ListingCard';
import PackageDetailView from '@/components/PackageDetailView';
import PackageComparison from '@/components/PackageComparison';
import AdminLoginView from '@/components/AdminLoginView';
import AgencyLoginView from '@/components/AgencyLoginView';
import Footer from '@/components/Footer';
import AutocompleteSearch from '@/components/AutocompleteSearch';
import WishlistView from '@/components/WishlistView';
import AuthModal from '@/components/AuthModal';
import FilterSidebar from '@/components/FilterSidebar';
import UserProfile from '@/components/UserProfile';
import { useComparison } from '@/contexts/ComparisonContext';
import { 
  User, 
  MapPin, 
  Scale, 
  MessageSquare, 
  Shield, 
  CreditCard, 
  ShoppingCart, 
  Heart, 
  Pencil, 
  Save, 
  Plus, 
  Trash2, 
  ArrowLeft, 
  ClipboardList, 
  Wrench,
  Camera,
  Search,
  LayoutGrid,
  Palmtree,
  Mountain,
  Globe,
  Flame,
  Compass,
  CheckCircle2,
  Clock,
  XCircle,
  ChevronLeft,
  Calendar,
  DollarSign,
  Check,
  X,
  Building2,
  Tag,
  Utensils,
  TrendingUp,
  Info,
  Users, 
  BarChart2, 
  Building, 
  Settings, 
  Plane, 
  Map as MapIcon, 
  Sparkles, 
  AlertCircle, 
  Send, 
  Star, 
  Phone, 
  Mail, 
  Lock, 
  Laptop, 
  HelpCircle, 
  CheckCircle, 
  Package,
  Smile,
  Printer,
  Share2,
  ThumbsUp,
  FileText,
  Zap,
  Home as HomeIcon,
  Upload,
  BarChart3,
  Briefcase
} from 'lucide-react';
import { collection, query, where, getDocs, updateDoc, doc, getDoc, addDoc, deleteDoc, onSnapshot, orderBy, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getDbInstance, getStorageInstance } from '@/lib/firebase';
import { getFirestore } from 'firebase/firestore';
import { compressMultipleImages, isValidImageFile, validateFileSize } from '@/lib/imageUtils';

const BUYER_QUICK_REPLIES = [
  "Is this package still available?",
  "Can you provide more details?",
  "Are dates flexible?",
  "Do you offer group discounts?"
];

const SELLER_QUICK_REPLIES = [
  "Yes, it's available. When are you planning to travel?",
  "Would you like me to send the complete itinerary?",
  "How many people are travelling?",
  "We have a special offer going on, would you like to hear about it?"
];

const getTabIcon = (id: string, className?: string) => {
  switch (id) {
    case 'all':
    case 'all_packages':
      return <Palmtree className={className || "h-4 w-4"} />;
    case 'domestic':
    case 'domestic_tab':
      return <Mountain className={className || "h-4 w-4"} />;
    case 'international':
    case 'intl_tab':
      return <Globe className={className || "h-4 w-4"} />;
    case 'all_categories':
      return <LayoutGrid className={className || "h-4 w-4"} />;
    case 'trending_tab':
      return <Flame className={className || "h-4 w-4"} />;
    case 'experience_tab':
      return <Compass className={className || "h-4 w-4"} />;
    case 'honeymoon_tab':
      return <Heart className={className || "h-4 w-4 fill-current text-current"} />;
    default:
      return null;
  }
};

const categoriesConfig = [
  {
    id: 'tourCategory',
    title: 'Tour by Category',
    subcategories: ['Family Tour', 'Group Tour', 'Fix Departure Tour', 'Honeymoon Tour'],
    linkText: 'See more'
  },
  {
    id: 'domestic',
    title: 'Domestic Packages',
    subcategories: ['Kashmir', 'Himachal', 'South', 'Rajasthan', 'North East'],
    linkText: 'See more'
  },
  {
    id: 'international',
    title: 'International Packages',
    subcategories: ['Dubai', 'Europe', 'Bali', 'Turkey'],
    linkText: 'Shop now'
  },
  {
    id: 'trending',
    title: 'Trending Destinations',
    subcategories: ['Baku', 'Singapore', 'Leh Ladakh', 'Manali'],
    linkText: 'See more'
  },
  {
    id: 'seasons',
    title: 'Seasonal Escapes',
    subcategories: ['Summer Retreats', 'Monsoon Magic', 'Winter Wonderland', 'Spring Getaways'],
    linkText: 'See more'
  },
  {
    id: 'events',
    title: 'Festive & Event Specials',
    subcategories: ['New Year & Christmas', 'Diwali Specials', 'Summer Vacations', 'Long Weekend Escapes'],
    linkText: 'See more'
  },
  {
    id: 'experiences',
    title: 'Experience Travel',
    subcategories: ['Trekking', 'Snow Enjoyment', 'Adventure', 'Water Sports'],
    linkText: 'Explore all'
  }
];

const subcategoryDescriptions: { [key: string]: string } = {
  'Family Tour': 'Create Memories with family',
  'Group Tour': 'Bring your group together to travel!',
  'Fix Departure Tour': 'Join groups, make friends!',
  'Honeymoon Tour': 'Make honeymoon memories!',
  'Kashmir': 'Paradise on Earth',
  'Himachal': 'Queen of Hills',
  'South': 'Backwaters & Temples',
  'Rajasthan': 'Land of Kings',
  'North East': 'Explore the Seven Sisters',
  'Dubai': 'Modern Oasis',
  'Europe': 'Classic Romance',
  'Bali': 'Tropical Heaven',
  'Turkey': 'East meets West',
  'Baku': 'Flame Towers & Caspian Sea',
  'Singapore': 'Lion City Adventure',
  'Leh Ladakh': 'High Mountain Passes',
  'Manali': 'Snowy Peak Escapes',
  '50% Off': 'Super Saver Deals',
  '10% Off': 'Special Season Discount',
  'Packages under 10K': 'Budget friendly tours',
  'Flash Deals': 'Limited time offers',
  'Trekking': 'Mountain Trails',
  'Snow Enjoyment': 'Winter Wonderland',
  'Adventure': 'Thrill seeker choice',
  'Water Sports': 'Beaches & Oceans',
  'Summer Retreats': 'Hill stations & cool escapes',
  'Monsoon Magic': 'Lush green scenic tours',
  'Winter Wonderland': 'Snow peaks & desert camps',
  'Spring Getaways': 'Pleasant sightseeing trips',
  'New Year & Christmas': 'Beach sides & year-end parties',
  'Diwali Specials': 'Heritage tours & palace stays',
  'Summer Vacations': 'Family beach & theme parks',
  'Long Weekend Escapes': 'Quick 2-3 day getaways'
};

const HERO_IMAGES = [
  'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=2074&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1434394354979-a235cd36269d?q=80&w=2070&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1542332213-9b5a5a3fad35?q=80&w=2070&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=2070&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1486870591958-9b9d0d1dda99?q=80&w=2070&auto=format&fit=crop',
];


export default function HomeClient({ initialListings = [], routeMode }: { initialListings?: any[], routeMode?: string }) {
  const { user, userData, loading, signIn, signInWithGoogle, signOut, register } = useAuth();
  
  const [currentHeroImage, setCurrentHeroImage] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentHeroImage((prev) => (prev + 1) % HERO_IMAGES.length);
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'signup'>('login');
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
  const [pricingConfig, setPricingConfig] = useState({ starterPrice: 2000, premiumPrice: 5000, vipPrice: 10000, addonCreditPrice: 1 });
  const searchParams = useSearchParams();
  const sectionParam = searchParams.get('section');
  
  useEffect(() => {
    if (sectionParam) {
      if (sectionParam === 'compare') {
        setUserActiveSection('listings');
        setShowComparison(true);
      } else {
        setUserActiveSection(sectionParam);
      }
    }
  }, [sectionParam]);

  useEffect(() => {
    const fetchPricingConfig = async () => {
      try {
        const response = await fetch('/api/admin/get-config');
        if (response.ok) {
          const data = await response.json();
          setPricingConfig(data);
        }
      } catch (e) {
        console.error('Error fetching pricing config:', e);
      }
    };
    fetchPricingConfig();
  }, []);

  const [userActiveSection, setUserActiveSection] = useState('listings');  const [fromSection, setFromSection] = useState('listings');
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [currentChatAgency, setCurrentChatAgency] = useState<string>('agency1');
  const [currentChatAgencyName, setCurrentChatAgencyName] = useState<string>('Adventure Travels');
  const [currentChatAgencyIsOnline, setCurrentChatAgencyIsOnline] = useState<boolean>(false);
  const [currentChatAgencyLogo, setCurrentChatAgencyLogo] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState<boolean>(false);
  const [chatSearchQuery, setChatSearchQuery] = useState<string>('');
  const [listings, setListings] = useState<any[]>(initialListings);
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
  const selectedConversationRef = useRef<any>(null);
  selectedConversationRef.current = selectedConversation;
  const hasManuallyClosedChatRef = useRef(false);
  const [agencyChatSearchQuery, setAgencyChatSearchQuery] = useState<string>('');
  const [showAgencyEmojiPicker, setShowAgencyEmojiPicker] = useState<boolean>(false);
  const [adminBuyerReplies, setAdminBuyerReplies] = useState<string[]>([]);
  const [adminSellerReplies, setAdminSellerReplies] = useState<string[]>([]);
  const [newBuyerReplyInput, setNewBuyerReplyInput] = useState('');
  const [newSellerReplyInput, setNewSellerReplyInput] = useState('');
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
  const [viewingAdminListing, setViewingAdminListing] = useState<any>(null);
  // User Experience Enhancements
  const [searchTerm, setSearchTerm] = useState('');

  const allDestinations = useMemo(() => {
    const dests = new Set<string>();
    const popular = ['Goa', 'Kerala', 'Manali', 'Kashmir', 'Dubai', 'Bali', 'Singapore', 'Maldives', 'Thailand', 'Europe', 'Gujarat', 'Rajasthan', 'Himachal Pradesh', 'Uttarakhand'];
    popular.forEach(p => dests.add(p));
    listings.forEach(l => {
      if (l.destination) dests.add(l.destination);
      if (l.stateName) dests.add(l.stateName);
      if (l.countryName) dests.add(l.countryName);
    });
    const blocklist = ['fdgdh', 'fdgh', 'test', 'asdf'];
    return Array.from(dests).filter(d => typeof d === 'string' && d.length > 2 && !blocklist.includes(d.toLowerCase().trim()));
  }, [listings]);

  const [filters, setFilters] = useState({
    priceRange: [0, 500000] as [number, number],
    duration: '',
    type: '',
    rating: 0,
    destination: '',
    packageType: '',
    amenities: [] as string[]
  });
  const [showFilters, setShowFilters] = useState(false);
  const [showComparison, setShowComparison] = useState(false);

  // Chat auto-scroll refs
  const userChatEndRef = useRef<HTMLDivElement>(null);
  const agencyChatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    userChatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, currentChatAgency]);

  useEffect(() => {
    agencyChatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [agencyChatMessages, selectedConversation]);

  // Deep linking for Chat, Book, and Wishlist from SEO routes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const chatAgencyId = urlParams.get('chat');
      const bookListingId = urlParams.get('book');
      const wishlistListingId = urlParams.get('wishlist');
      
      let shouldCleanUrl = false;

      if (chatAgencyId) {
        setUserActiveSection('chat');
        setCurrentChatAgency(chatAgencyId);
        shouldCleanUrl = true;
      }
      
      if (bookListingId) {
        // Find the listing from the fetched listings
        const listingToBook = listings.find(l => l.id === bookListingId);
        if (listingToBook) {
          setBookingListing(listingToBook);
          setShowBookingForm(true);
        }
        shouldCleanUrl = true;
      }

      if (wishlistListingId) {
        // Usually wishlist logic is handled per card, but we can set the active section
        setUserActiveSection('wishlist');
        shouldCleanUrl = true;
      }

      if (shouldCleanUrl) {
        // Clean URL to prevent reopening actions on refresh
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, [listings]);
  
  // Dynamic Scroll Listener for sticky header scroll animations
  const [isScrolled, setIsScrolled] = useState(false);
  useEffect(() => {
    const handleScroll = () => {
      const scrollContainer = document.getElementById('user-dashboard-scroll-container');
      const scrollTop = Math.max(window.scrollY, scrollContainer ? scrollContainer.scrollTop : 0);
      setIsScrolled(scrollTop > 50);
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    const scrollContainer = document.getElementById('user-dashboard-scroll-container');
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    }
    
    handleScroll();
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollContainer) scrollContainer.removeEventListener('scroll', handleScroll);
    };
  }, [userActiveSection]);

  // Hero Search Widget states
  const [heroSearchInput, setHeroSearchInput] = useState('');
  const [heroTypeSelect, setHeroTypeSelect] = useState<'all' | 'domestic' | 'international'>('all');

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

  // Wishlist and Compare sub-tab state


  // Floating effects queue state
  const [floatingEffects, setFloatingEffects] = useState<Array<{ id: number; x: number; y: number; type: 'wishlist' | 'compare' }>>([]);

  // Handle deep linking from PackageClientView
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const view = params.get('view');
      const action = params.get('action');
      const agencyId = params.get('agencyId');
      const agencyName = params.get('agencyName');
      const returnUrl = params.get('returnUrl');
      
      if (returnUrl) {
        sessionStorage.setItem('tripdm_return_url', returnUrl);
      }

      if (action === 'chat' && agencyId) {
        setUserActiveSection('chat');
        setCurrentChatAgency(agencyId);
        setCurrentChatAgencyName(agencyName || 'Travel Agency');
        window.history.replaceState({}, '', window.location.pathname);
      } else if (view === 'compare') {
        setUserActiveSection('listings');
        setShowComparison(true);
        window.history.replaceState({}, '', window.location.pathname);
      } else if (view === 'messages') {
        setUserActiveSection('chat');
        setShowComparison(false);
        window.history.replaceState({}, '', window.location.pathname);
      } else if (view === 'wishlist' || view === 'support' || view === 'profile') {
        setUserActiveSection(view);
        setShowComparison(false);
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, []);

  // Profile States
  const [profileName, setProfileName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profilePhotoUrl, setProfilePhotoUrl] = useState('');
  const [profileImageError, setProfileImageError] = useState(false);
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

  // Listen for custom floating-effect events
  useEffect(() => {
    const handleFloatingEffect = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && typeof customEvent.detail.x === 'number') {
        const { x, y, type } = customEvent.detail;
        const id = Date.now() + Math.random();
        setFloatingEffects((prev) => [...prev, { id, x, y, type }]);
        // Remove particle after animation ends (1.2s)
        setTimeout(() => {
          setFloatingEffects((prev) => prev.filter((effect) => effect.id !== id));
        }, 1200);
      }
    };
    window.addEventListener('floating-effect', handleFloatingEffect);
    return () => window.removeEventListener('floating-effect', handleFloatingEffect);
  }, []);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
  };

  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<{ category: string; subcategory?: string; title: string } | null>(null);
  const [dashboardViewMode, setDashboardViewMode] = useState<'categories' | 'all'>('categories');

  const getFilteredListingsForSubcategory = (category: string, subcategory: string) => {
    return listings.filter((listing) => {
      if (!listing.approved) return false;

      if (category === 'tourCategory') {
        const cats = listing.tourCategories || [];
        if (subcategory === 'Family Tour') return cats.includes('Family');
        if (subcategory === 'Group Tour') return cats.includes('Friends') || cats.includes('Group');
        if (subcategory === 'Fix Departure Tour') return cats.includes('Fix Departure');
        if (subcategory === 'Honeymoon Tour') return cats.includes('Honeymoon');
      }

      if (category === 'domestic') {
        if (listing.packageType !== 'domestic') return false;
        const state = (listing.stateName || '').toLowerCase();
        if (subcategory === 'Kashmir') return state.includes('kashmir') || state.includes('jammu');
        if (subcategory === 'Himachal') return state.includes('himachal');
        if (subcategory === 'South') return state.includes('kerala') || state.includes('karnataka') || state.includes('tamil') || state.includes('south') || state.includes('goa') || state.includes('andhra');
        if (subcategory === 'Rajasthan') return state.includes('rajasthan');
        if (subcategory === 'North East') return state.includes('assam') || state.includes('meghalaya') || state.includes('sikkim') || state.includes('arunachal') || state.includes('nagaland') || state.includes('manipur') || state.includes('mizoram') || state.includes('tripura') || state.includes('north east');
      }

      if (category === 'international') {
        if (listing.packageType !== 'international') return false;
        const country = (listing.countryName || '').toLowerCase();
        if (subcategory === 'Dubai') return country.includes('dubai') || country.includes('emirates') || country.includes('uae');
        if (subcategory === 'Europe') return country.includes('europe') || country.includes('switzerland') || country.includes('france') || country.includes('italy') || country.includes('germany') || country.includes('united kingdom') || country.includes('london');
        if (subcategory === 'Bali') return country.includes('bali') || country.includes('indonesia');
        if (subcategory === 'Turkey') return country.includes('turkey');
      }

      if (category === 'trending') {
        const dest = ((listing.countryName || '') + ' ' + (listing.stateName || '') + ' ' + (listing.title || '')).toLowerCase();
        if (subcategory === 'Baku') return dest.includes('baku') || dest.includes('azerbaijan');
        if (subcategory === 'Singapore') return dest.includes('singapore');
        if (subcategory === 'Leh Ladakh') return dest.includes('ladakh') || dest.includes('leh');
        if (subcategory === 'Manali') return dest.includes('manali');
      }

      if (category === 'seasons') {
        const seasonVal = (listing.season || '').toLowerCase();
        if (subcategory === 'Summer Retreats') return seasonVal === 'summer';
        if (subcategory === 'Monsoon Magic') return seasonVal === 'monsoon';
        if (subcategory === 'Winter Wonderland') return seasonVal === 'winter';
        if (subcategory === 'Spring Getaways') return seasonVal === 'spring';
      }

      if (category === 'events') {
        const ev = (listing.eventType || '').toLowerCase();
        if (subcategory === 'New Year & Christmas') return ev === 'new-year';
        if (subcategory === 'Diwali Specials') return ev === 'diwali';
        if (subcategory === 'Summer Vacations') return ev === 'summer-vacation';
        if (subcategory === 'Long Weekend Escapes') return ev === 'weekend';
      }

      if (category === 'offers') {
        const priceVal = parseFloat(listing.cost || listing.price || '0');
        if (subcategory === '50% Off') return listing.discountCategory === '50-off';
        if (subcategory === '10% Off') return listing.discountCategory === '10-off';
        if (subcategory === 'Packages under 10K') return priceVal > 0 && priceVal < 10000;
        if (subcategory === 'Flash Deals') return listing.discountCategory === 'flash-deals';
      }

      if (category === 'experiences') {
        let expArray: string[] = [];
        if (Array.isArray(listing.experienceType)) {
          expArray = listing.experienceType.map((e: string) => e.toLowerCase());
        } else if (typeof listing.experienceType === 'string' && listing.experienceType) {
          expArray = [listing.experienceType.toLowerCase()];
        }
        
        if (subcategory === 'Trekking') return expArray.includes('trekking');
        if (subcategory === 'Snow Enjoyment') return expArray.includes('snow') || expArray.includes('snow enjoyment');
        if (subcategory === 'Adventure') return expArray.includes('adventure');
        if (subcategory === 'Water Sports') return expArray.includes('water-sports') || expArray.includes('water sports');
      }

      return false;
    });
  };

  const getSubcategoryCoverImage = (category: string, subcategory: string, matchedListings: any[]) => {
    if (matchedListings && matchedListings.length > 0) {
      const firstListing = matchedListings[0];
      const image = firstListing.placesCovered?.[0]?.imageUrls?.[0] || firstListing.photos?.[0];
      if (image) return image;
    }

    const fallbacks: { [key: string]: string } = {
      'Family Tour': 'https://images.unsplash.com/photo-1543039625-14cbd3802e7d?auto=format&fit=crop&q=80&w=400',
      'Group Tour': 'https://images.unsplash.com/photo-1539635278303-d4002c07eae3?auto=format&fit=crop&q=80&w=400',
      'Fix Departure Tour': 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&q=80&w=400',
      'Honeymoon Tour': 'https://images.unsplash.com/photo-1510312305653-8ed496efae75?auto=format&fit=crop&q=80&w=400',
      'Kashmir': 'https://images.unsplash.com/photo-1566228015668-4c45dbc4e2f5?auto=format&fit=crop&q=80&w=400',
      'Himachal': 'https://images.unsplash.com/photo-1605649487212-47bdab064df7?auto=format&fit=crop&q=80&w=400',
      'South': 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&q=80&w=400',
      'Rajasthan': 'https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&q=80&w=400',
      'Dubai': 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&q=80&w=400',
      'Europe': 'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?auto=format&fit=crop&q=80&w=400',
      'Bali': 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&q=80&w=400',
      'Turkey': 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?auto=format&fit=crop&q=80&w=400',
      'Baku': 'https://images.unsplash.com/photo-1618083707368-b3823daa2726?auto=format&fit=crop&q=80&w=400',
      'Singapore': 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?auto=format&fit=crop&q=80&w=400',
      'Leh Ladakh': 'https://images.unsplash.com/photo-1621415263409-2259bdd2ac0d?auto=format&fit=crop&q=80&w=400',
      'Manali': 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&q=80&w=400',
      'Trekking': 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=80&w=400',
      'Snow Enjoyment': 'https://images.unsplash.com/photo-1482862549707-f63cb32c5fd9?auto=format&fit=crop&q=80&w=400',
      'Adventure': 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&q=80&w=400',
      'Water Sports': 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=400',
      'Summer Retreats': 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&q=80&w=400',
      'Monsoon Magic': 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&q=80&w=400',
      'Winter Wonderland': 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&q=80&w=400',
      'Spring Getaways': 'https://images.unsplash.com/photo-1492496913980-501348b61469?auto=format&fit=crop&q=80&w=400',
      'New Year & Christmas': 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&q=80&w=400',
      'Diwali Specials': 'https://images.unsplash.com/photo-1582650625119-3a31f8fa2699?auto=format&fit=crop&q=80&w=400',
      'Summer Vacations': 'https://images.unsplash.com/photo-1506929562872-bb421503ef21?auto=format&fit=crop&q=80&w=400',
      'Long Weekend Escapes': 'https://images.unsplash.com/photo-1501555088652-021faa106b9b?auto=format&fit=crop&q=80&w=400'
    };

    return fallbacks[subcategory] || 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&q=80&w=400';
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
      setProfileImageError(false);
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

      // Store under listings path to align with existing active storage security rules
      const storageRef = ref(storageInstance, `listings/${user.uid}/avatars/${Date.now()}_${fileToUpload.name}`);
      await uploadBytes(storageRef, fileToUpload);
      const downloadUrl = await getDownloadURL(storageRef);

      await updateDoc(doc(dbInstance, 'users', user.uid), {
        avatarUrl: downloadUrl
      });

      setProfilePhotoUrl(downloadUrl);
      setProfileImageError(false);
      alert('Profile picture updated successfully!');
    } catch (error) {
      console.error('Error uploading profile photo:', error);
      alert('Failed to upload profile picture.');
    }
  };

  // Agency Settings States (agencyDescription is defined at line 196)
  const [agencyCompanyName, setAgencyCompanyName] = useState('');
  const [agencyContactEmail, setAgencyContactEmail] = useState('');
  const [agencyLogoUrl, setAgencyLogoUrl] = useState('');
  const [agencyLogoError, setAgencyLogoError] = useState(false);
  const [savingAgencySettings, setSavingAgencySettings] = useState(false);

  // Load Agency States from userData & user
  useEffect(() => {
    if (user && userData && userData.role === 'agency') {
      setAgencyCompanyName(userData.companyName || userData.name || '');
      setAgencyContactEmail(userData.contactEmail || user.email || '');
      setAgencyDescription(userData.description || userData.agencyDescription || '');
      setAgencyLogoUrl(userData.logoUrl || userData.agencyLogo || userData.avatarUrl || '');
      setAgencyLogoError(false);
    }
  }, [user, userData]);

  // Upload Agency Logo to Firebase Storage and update user document
  const handleAgencyLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

      // Store under listings path to align with existing active storage security rules
      const storageRef = ref(storageInstance, `listings/${user.uid}/logos/${Date.now()}_${fileToUpload.name}`);
      await uploadBytes(storageRef, fileToUpload);
      const downloadUrl = await getDownloadURL(storageRef);

      await updateDoc(doc(dbInstance, 'users', user.uid), {
        logoUrl: downloadUrl
      });

      setAgencyLogoUrl(downloadUrl);
      setAgencyLogoError(false);
      alert('Agency logo updated successfully!');
    } catch (error) {
      console.error('Error uploading agency logo:', error);
      alert('Failed to upload agency logo. Please try again.');
    }
  };

  // Save Agency Settings to Firestore
  const handleSaveAgencySettings = async () => {
    if (!user) return;
    const dbInstance = getDbInstance();
    if (!dbInstance) return;

    setSavingAgencySettings(true);
    try {
      await updateDoc(doc(dbInstance, 'users', user.uid), {
        companyName: agencyCompanyName,
        contactEmail: agencyContactEmail,
        description: agencyDescription,
        agencyDescription: agencyDescription
      });
      alert('Agency settings saved successfully!');
    } catch (error) {
      console.error('Error saving agency settings:', error);
      alert('Failed to save agency settings. Please try again.');
    } finally {
      setSavingAgencySettings(false);
    }
  };

  // Credit system auto-migration hook for existing agencies
  useEffect(() => {
    const migrateExistingAgency = async () => {
      if (user && userData && userData.role === 'agency' && userData.plan === undefined) {
        const dbInstance = getDbInstance();
        if (!dbInstance) return;
        try {
          await updateDoc(doc(dbInstance, 'users', user.uid), {
            plan: 'free',
            credits: 0,
            freeChats: 2,
            unlockedUsers: [],
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
          console.log('Agency credit system successfully migrated');
        } catch (e) {
          console.error('Migration failed:', e);
        }
      }
    };
    migrateExistingAgency();
  }, [user, userData]);

  // Intercept chat request and direct to chat
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

    // Direct redirect without unlock requirements
    setCurrentChatAgency(agencyId);
    setCurrentChatAgencyName(agencyName);
    const matchedConv = userConversations.find(c => c.agencyId === agencyId);
    setCurrentChatAgencyIsOnline(matchedConv ? matchedConv.isOnline : false);
    setUserActiveSection('chat');
    setViewingListing(null);
  };

  // Deduct credits/chats and unlock the customer connection for the agency
  const unlockCustomerChat = async (userId: string, userName: string) => {
    if (!user || !userData) return;

    const dbInstance = getDbInstance();
    if (!dbInstance) return;

    const currentPlan = userData.plan || 'free';
    const currentCredits = userData.credits ?? 0;
    const unlockedList = userData.unlockedUsers || [];

    let updatedCredits = currentCredits;
    let costAmount = 0;

    // Determine cost
    if (currentPlan === 'free' || currentPlan === 'starter') {
      costAmount = 50;
    } else if (currentPlan === 'premium') {
      costAmount = 40;
    } else if (currentPlan === 'vip') {
      costAmount = 30;
    }

    if (currentCredits < costAmount) {
      alert('Insufficient credits. Please purchase a top-up pack or change your plan.');
      return;
    }

    updatedCredits = currentCredits - costAmount;

    const txId = 'TX-CH-' + Math.random().toString(36).substr(2, 9).toUpperCase();
    const newTransaction = {
      id: txId,
      type: 'deduction',
      amount: costAmount,
      description: `Unlocked chat connection with traveler: ${userName}`,
      timestamp: Date.now()
    };
    
    const expiryTimestamp = Date.now() + 15 * 24 * 60 * 60 * 1000; // 15 days
    const unlockRecord = { userId: userId, expiresAt: expiryTimestamp };

    try {
      await updateDoc(doc(dbInstance, 'users', user.uid), {
        credits: updatedCredits,
        unlockedUsers: [...unlockedList, unlockRecord],
        creditHistory: [newTransaction, ...(userData.creditHistory || [])]
      });

      alert(`Successfully unlocked connection with ${userName}!`);
    } catch (err) {
      console.error('Error unlocking chat:', err);
      alert('Failed to unlock conversation. Please try again.');
    }
  };

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if ((window as any).Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const upgradePlan = async (targetPlan: 'free' | 'starter' | 'premium' | 'vip') => {
    if (!user || !userData) return;
    
    if (targetPlan === 'free') {
      try {
        const dbInstance = getDbInstance();
        if (!dbInstance) return;
        await updateDoc(doc(dbInstance, 'users', user.uid), {
          plan: 'free',
          credits: 100,
          creditHistory: [{
            id: 'TX-PL-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
            type: 'plan-change',
            amount: 0,
            description: 'Switched to Free Plan (100 credits)',
            timestamp: Date.now()
          }, ...(userData.creditHistory || [])]
        });
        alert(`Plan updated to FREE successfully!`);
      } catch (e) {
        console.error(e);
      }
      return;
    }

    let cost = 0;
    if (targetPlan === 'starter') cost = 2000;
    else if (targetPlan === 'premium') cost = 5000;
    else if (targetPlan === 'vip') cost = 10000;

    const res = await loadRazorpayScript();
    if (!res) {
      alert('Razorpay SDK failed to load. Are you online?');
      return;
    }

    try {
      const response = await fetch('/api/razorpay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agencyId: user.uid,
          targetPlan: targetPlan,
          isAddon: false
        })
      });
      const order = await response.json();
      if (order.error) throw new Error(order.error);

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '',
        amount: order.amount,
        currency: order.currency,
        name: "Travel Agency",
        description: `Upgrade to ${targetPlan.toUpperCase()} Plan`,
        order_id: order.id,
        handler: async function (response: any) {
          try {
            const verifyRes = await fetch('/api/razorpay/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                agencyId: user.uid,
                targetPlan: targetPlan,
                isAddon: false
              })
            });
            const verifyData = await verifyRes.json();
            if (verifyData.success) {
              alert(`Payment verified! Your plan has been successfully updated to ${targetPlan.toUpperCase()}.`);
              window.location.reload(); // Reload to reflect changes
            } else {
              alert('Payment verified on Razorpay, but failed to update plan: ' + verifyData.error);
            }
          } catch (e) {
            console.error('Verification error', e);
            alert('Failed to verify payment with our servers, but payment may have succeeded.');
          }
        },
        prefill: {
          name: userData.companyName || userData.name || '',
          email: userData.email || '',
        },
        theme: {
          color: "#3B82F6"
        }
      };

      const rzp1 = new (window as any).Razorpay(options);
      rzp1.on('payment.failed', function (response: any){
        alert(response.error.description);
      });
      rzp1.open();
    } catch (e: any) {
      console.error('Failed to create order:', e);
      alert('Failed to initialize payment. Please try again.');
    }
  };

  const buyCredits = async (amount: number, price: number) => {
    if (!user || !userData) return;
    
    if (userData.plan === 'free') {
      alert('Purchase not supported on Free Plan. Please upgrade to Starter or Premium plan.');
      return;
    }

    const res = await loadRazorpayScript();
    if (!res) {
      alert('Razorpay SDK failed to load. Are you online?');
      return;
    }

    setIsPurchasingCredits(true);
    setPurchaseStatusText(`Connecting to secure gateway. Processing payment of ₹${price}...`);

    try {
      const response = await fetch('/api/razorpay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creditsToBuy: amount,
          agencyId: user.uid,
          isAddon: true,
          targetPlan: ''
        })
      });
      const order = await response.json();
      if (order.error) throw new Error(order.error);
      setIsPurchasingCredits(false);

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '',
        amount: order.amount,
        currency: order.currency,
        name: "Travel Agency",
        description: `Purchased Credit Pack (+${amount} credits)`,
        order_id: order.id,
        handler: async function (response: any) {
          try {
            const verifyRes = await fetch('/api/razorpay/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                agencyId: user.uid,
                isAddon: true,
                creditsToBuy: amount
              })
            });
            const verifyData = await verifyRes.json();
            if (verifyData.success) {
              alert(`Payment verified! ${amount} credits have been successfully added.`);
              window.location.reload(); // Reload to reflect changes
            } else {
              alert('Payment verified on Razorpay, but failed to add credits: ' + verifyData.error);
            }
          } catch (e) {
            console.error('Verification error', e);
            alert('Failed to verify payment with our servers, but payment may have succeeded.');
          }
        },
        prefill: {
          name: userData.companyName || userData.name || '',
          email: userData.email || '',
        },
        theme: {
          color: "#3B82F6"
        }
      };

      const rzp1 = new (window as any).Razorpay(options);
      rzp1.on('payment.failed', function (response: any){
        alert(response.error.description);
      });
      rzp1.open();
    } catch (err) {
      console.error('Payment error:', err);
      setIsPurchasingCredits(false);
      alert('Transaction failed to initialize. Please try again.');
    }
  };

  // Reset helper for developers
  const simulateResetCredits = async (targetPlan: 'free' | 'starter' | 'premium') => {
    if (!user) return;
    const dbInstance = getDbInstance();
    if (!dbInstance) return;

    let initCredits = 0;
    if (targetPlan === 'free') initCredits = 100;
    else if (targetPlan === 'starter') initCredits = 2000;
    else if (targetPlan === 'premium') initCredits = 5000;
    else if (targetPlan === 'vip') initCredits = 10000;

    const txId = 'TX-RST-' + Math.random().toString(36).substr(2, 9).toUpperCase();
    const newTransaction = {
      id: txId,
      type: 'reset',
      amount: initCredits,
      description: `Developer Reset to ${targetPlan.toUpperCase()}`,
      timestamp: Date.now()
    };

    try {
      await updateDoc(doc(getDbInstance()!, 'users', user.uid), {
        plan: targetPlan,
        credits: initCredits,
        unlockedUsers: [],
        creditHistory: [newTransaction]
      });
      alert(`Developer simulation reset complete: Plan set to ${targetPlan.toUpperCase()}`);
    } catch (e) {
      console.error(e);
    }
  };

  // Comparison functionality
  const { comparisonList, clearComparison } = useComparison();

  // Fetch admin custom quick replies
  useEffect(() => {
    const dbInstance = getDbInstance();
    if (!dbInstance) return;
    const unsubscribe = onSnapshot(doc(dbInstance, 'settings', 'quick_replies'), (docSnapshot) => {
      if (docSnapshot.exists()) {
        const data = docSnapshot.data();
        setAdminBuyerReplies(Array.isArray(data.buyerReplies) ? data.buyerReplies : []);
        setAdminSellerReplies(Array.isArray(data.sellerReplies) ? data.sellerReplies : []);
      } else {
        setAdminBuyerReplies([]);
        setAdminSellerReplies([]);
      }
    }, (error) => {
      console.error('Error fetching custom quick replies:', error);
    });
    return () => unsubscribe();
  }, []);

  const handleAddQuickReply = async (type: 'buyer' | 'seller') => {
    const dbInstance = getDbInstance();
    if (!dbInstance) return;
    const inputVal = type === 'buyer' ? newBuyerReplyInput.trim() : newSellerReplyInput.trim();
    if (!inputVal) return;

    try {
      const currentList = type === 'buyer' ? [...adminBuyerReplies, inputVal] : [...adminSellerReplies, inputVal];
      await setDoc(doc(dbInstance, 'settings', 'quick_replies'), {
        [type === 'buyer' ? 'buyerReplies' : 'sellerReplies']: currentList
      }, { merge: true });

      if (type === 'buyer') setNewBuyerReplyInput('');
      else setNewSellerReplyInput('');
      alert('Quick reply added successfully!');
    } catch (error) {
      console.error('Error adding quick reply:', error);
      alert('Failed to add quick reply.');
    }
  };

  const handleRemoveQuickReply = async (type: 'buyer' | 'seller', index: number) => {
    const dbInstance = getDbInstance();
    if (!dbInstance) return;

    try {
      const currentList = type === 'buyer' ? [...adminBuyerReplies] : [...adminSellerReplies];
      currentList.splice(index, 1);
      await setDoc(doc(dbInstance, 'settings', 'quick_replies'), {
        [type === 'buyer' ? 'buyerReplies' : 'sellerReplies']: currentList
      }, { merge: true });
      alert('Quick reply removed successfully!');
    } catch (error) {
      console.error('Error removing quick reply:', error);
      alert('Failed to remove quick reply.');
    }
  };

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
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const scrollContainer = document.getElementById('user-dashboard-scroll-container');
    if (scrollContainer) {
      scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [userActiveSection]);

  useEffect(() => {
    if (user && userData?.role === 'admin') {
      const fetchPending = async () => {
        try {
          const dbInstance = getDbInstance();
          if (!dbInstance) return;
          const q = query(collection(dbInstance, 'users'), where('approved', '==', false), where('role', '==', 'agency'));
          const querySnapshot = await getDocs(q);
          const agencies = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setPendingAgencies(agencies);
        } catch (error) {
          // Ignore cancelled requests on logout
        }
      };

      const fetchAllAgencies = async () => {
        try {
          const dbInstance = getDbInstance();
          if (!dbInstance) return;
          const q = query(collection(dbInstance, 'users'), where('role', '==', 'agency'));
          const querySnapshot = await getDocs(q);
          const agencies = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setAllAgencies(agencies);
        } catch (error) {
          // Ignore cancelled requests on logout
        }
      };

      const fetchPendingListings = async () => {
        try {
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
        } catch (error) {
          // Ignore cancelled requests on logout
        }
      };

      const fetchAllListings = async () => {
        try {
          const dbInstance = getDbInstance();
          if (!dbInstance) return;
          const q = query(collection(dbInstance, 'listings'));
          const querySnapshot = await getDocs(q);
          const allListingsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setAgencyListings(allListingsData);
        } catch (error) {
          // Ignore cancelled requests on logout
        }
      };

      fetchPending();
      fetchAllAgencies();
      fetchPendingListings();
      fetchAllListings();
    }
  }, [user, userData]);

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
                  const isOnline = agencyData?.isOnline || agencyData?.is_online || false;
                  const logoUrl = agencyData?.logoUrl || agencyData?.agencyLogo || agencyData?.avatarUrl || null;

                  conversationsMap.set(otherUserId, {
                    agencyId: otherUserId,
                    agencyName,
                    chatId: msg.chatId,
                    lastMessage: msg.text,
                    lastMessageTime: msg.timestamp,
                    unreadCount: 0, // Could implement read status
                    isOnline,
                    logoUrl,
                  });
                } catch (error) {
                  // Ignore cancelled requests on logout
                  // Still add conversation with default name
                  conversationsMap.set(otherUserId, {
                    agencyId: otherUserId,
                    agencyName: 'Unknown Agency',
                    chatId: msg.chatId,
                    lastMessage: msg.text,
                    lastMessageTime: msg.timestamp,
                    unreadCount: 0,
                    isOnline: false,
                    logoUrl: null,
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
                  // Ignore cancelled requests on logout
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

          // Auto-select first conversation if none selected (only on initial load, not after manual close)
          if (!selectedConversationRef.current && conversations.length > 0 && !hasManuallyClosedChatRef.current) {
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
  }, [user, userData]);

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
        try {
          const dbInstance = getDbInstance();
          if (!dbInstance) return;
          const agencyListingsQuery = query(collection(dbInstance, 'listings'), where('agencyId', '==', user.uid));
          const querySnapshot = await getDocs(agencyListingsQuery);
          const listingsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setAgencyListings(listingsData);
        } catch (error) {
          // Ignore cancelled requests on logout
        }
      };
      fetchAgencyListings();
    }
  }, [user, userData]);

  useEffect(() => {
    // Fetch agency's bookings
    if (user && userData?.role === 'agency') {
      const fetchAgencyBookings = async () => {
        try {
          const dbInstance = getDbInstance();
          if (!dbInstance) return;
          const bookingsQuery = query(collection(dbInstance, 'bookings'), where('agencyId', '==', user.uid));
          const querySnapshot = await getDocs(bookingsQuery);
          const bookingsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          // Sort bookings by createdAt in descending order (most recent first)
          bookingsData.sort((a, b) => new Date((b as any).createdAt).getTime() - new Date((a as any).createdAt).getTime());
          setAgencyBookings(bookingsData);
        } catch (error) {
          // Ignore cancelled requests on logout
        }
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

  const handleDeletePackage = async (packageId: string) => {
    if (!window.confirm('Are you sure you want to delete this package? This action cannot be undone.')) return;
    
    try {
      const dbInstance = getDbInstance();
      if (!dbInstance) return;
      await deleteDoc(doc(dbInstance, 'listings', packageId));
      alert('Package deleted successfully');
    } catch (error) {
      console.error('Error deleting package:', error);
      alert('Failed to delete package. Please try again.');
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
  const renderMessageText = (text: string, isFreePlan: boolean) => {
    if (!isFreePlan || !text) return text;
    
    // Regex matching phone number patterns (10-13 digits, allowing country code, spaces, dashes)
    const phoneRegex = /((?:\+?\d{1,3}[-\s]?)?(?:\d{10}|\d{3}[-\s]?\d{3}[-\s]?\d{4}))/g;
    const parts = text.split(phoneRegex);
    
    return parts.map((part, index) => {
      if (!part) return null;
      
      const digits = part.replace(/\D/g, '');
      const isPhoneNumber = digits.length >= 10 && digits.length <= 13;
      
      if (isPhoneNumber) {
        return (
          <span 
            key={index} 
            className="select-none inline-block bg-gray-250/50 rounded px-1"
            style={{ filter: 'blur(4px)' }}
            title="Upgrade plan to view phone number"
          >
            [Phone Blurred]
          </span>
        );
      }
      return part;
    });
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

    const isFreePlan = userData?.plan === 'free' || !userData?.plan;
    if (isFreePlan) {
      const digitsOnly = agencyChatInput.replace(/\D/g, '');
      if (digitsOnly.length >= 10 || /\d{10}/.test(digitsOnly)) {
        alert('Security Warning: Sharing phone numbers or contact details is not allowed on the Free Plan. Please upgrade to Starter or Premium plan.');
        return;
      }
    }

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

  // Handle register from AuthModal (user only)
  const handleAuthModalRegister = async (
    emailArg: string,
    passwordArg: string,
    role: 'user',
    data: { name: string; phone?: string }
  ) => {
    await register(emailArg, passwordArg, role, data);
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
  }

  // For admin/agency routes, force login immediately if not authenticated
  if (!user && routeMode === 'admin') {
    return <AdminLoginView />;
  }
  
  if (!user && routeMode === 'agency') {
    return <AgencyLoginView />;
  }

  if (user && userData) {
    if (userData.role === 'admin') {
      const allListingImages = viewingAdminListing
        ? [
            ...(viewingAdminListing.photos || []),
            ...(viewingAdminListing.placesCovered || []).flatMap((p: any) => p.imageUrls || [])
          ].filter(Boolean)
        : [];

      return (
        <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
          {/* Sidebar */}
          <div className="w-64 bg-white border-r border-gray-200 flex flex-col z-20 shrink-0">
            <div className="p-6 border-b border-gray-200 flex flex-col items-center text-center shrink-0">
              <div className="w-20 h-20 rounded-2xl bg-gray-100 border border-gray-200 shadow-sm flex items-center justify-center overflow-hidden mb-4 shrink-0">
                <Building2 className="h-8 w-8 text-indigo-500" />
              </div>
              <div className="w-full">
                <h2 className="text-base font-bold text-gray-900 truncate">Trip Dm</h2>
                <p className="text-xs text-gray-500 mt-0.5 truncate">Admin Dashboard</p>
              </div>
            </div>
            <nav className="p-4 flex-1 overflow-y-auto sidebar-scroll">
              <div className="space-y-1">
                <button
                  onClick={() => setActiveSection('overview')}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-3 ${activeSection === 'overview'
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                    }`}
                >
                  <HomeIcon className="h-4 w-4" /> Overview
                </button>

                <button
                  onClick={() => setActiveSection('agencies')}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-3 ${activeSection === 'agencies'
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                    }`}
                >
                  <Building className="h-4 w-4" /> Agencies
                </button>
                <button
                  onClick={() => setActiveSection('listings')}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-3 ${activeSection === 'listings'
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                    }`}
                >
                  <ClipboardList className="h-4 w-4" /> Listings
                </button>
                <button
                  onClick={() => setActiveSection('manage_packages')}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-3 ${activeSection === 'manage_packages'
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                    }`}
                >
                  <Package className="h-4 w-4" /> Manage Packages
                </button>
                <button
                  onClick={() => setActiveSection('settings')}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-3 ${activeSection === 'settings'
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                    }`}
                >
                  <Settings className="h-4 w-4" /> Settings
                </button>
                <button
                  onClick={() => setActiveSection('chats')}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-3 ${activeSection === 'chats'
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                    }`}
                >
                  <MessageSquare className="h-4 w-4" /> All Chats
                </button>
              </div>
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col min-w-0 bg-gray-50/50">
            <header className="h-16 sticky top-0 z-10 bg-white border-b border-gray-200 px-8 flex items-center justify-between shrink-0">
              <h1 className="text-xl font-semibold text-gray-900">
                {activeSection === 'dashboard' && 'Admin Dashboard'}
                {activeSection === 'approvals' && 'Agency Approvals'}
                {activeSection === 'listings' && 'Listing Approvals'}

                {activeSection === 'agencies' && 'All Agencies'}
                {activeSection === 'manage_packages' && 'Manage Packages'}
                {activeSection === 'settings' && 'Settings'}
                {activeSection === 'chats' && 'All Chats'}
              </h1>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">Welcome, {userData.name}</span>
                <Button variant="outline" size="sm" onClick={signOut}>Sign Out</Button>
              </div>
            </header>

            <main className="flex-1 overflow-y-auto p-8 dashboard-scroll">
              {activeSection === 'overview' && (
                <>
                  {/* Analytics Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <Users className="h-6 w-6 text-blue-600" />
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
                            <CheckCircle className="h-6 w-6 text-green-600" />
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
                            <Clock className="h-6 w-6 text-yellow-600" />
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
                            <TrendingUp className="h-6 w-6 text-purple-600" />
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
                        <BarChart2 className="mr-2 h-5 w-5 text-blue-600" />
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
                          <span className="flex items-center gap-1 text-sm font-semibold text-green-600"><CheckCircle className="h-4 w-4 text-green-600" /> Online</span>
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
                      <Clock className="mr-2 h-5 w-5 text-yellow-600" />
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
                                <Building className="h-6 w-6 text-gray-600" />
                              </div>
                              <div>
                                <h3 className="font-semibold">{agency.companyName}</h3>
                                <p className="text-sm text-gray-600">{agency.name} • {agency.authEmail || agency.email || agency.contactEmail || 'No email'}</p>
                              </div>
                            </div>
                            <div className="flex space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {/* Reject logic */ }}
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



              {activeSection === 'agencies' && !viewingAgency && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Users className="mr-2 h-5 w-5 text-blue-600" />
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
                              <Building className="h-6 w-6 text-gray-600" />
                            </div>
                            <div>
                              <h3 className="font-semibold">{agency.companyName}</h3>
                              <p className="text-sm text-gray-600">{agency.name} • {agency.authEmail || agency.email || agency.contactEmail || 'No email'}</p>
                              <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                Status: {agency.approved ? <span className="flex items-center gap-1 text-green-600 font-semibold"><CheckCircle className="h-3.5 w-3.5" /> Approved</span> : <span className="flex items-center gap-1 text-yellow-600 font-semibold"><Clock className="h-3.5 w-3.5" /> Pending</span>}
                              </div>
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
                        <Building className="mr-2 h-6 w-6 text-blue-600" />
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
                            <p className="font-medium">{viewingAgency.authEmail || viewingAgency.email || viewingAgency.contactEmail || 'No email provided'}</p>
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
                            <div className={`font-medium mt-1 flex items-center gap-1 ${viewingAgency.approved ? 'text-green-600' : 'text-yellow-600'}`}>
                              {viewingAgency.approved ? <><CheckCircle className="h-4 w-4" /> Approved</> : <><Clock className="h-4 w-4" /> Pending</>}
                            </div>
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

              {activeSection === 'listings' && !viewingAdminListing && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Palmtree className="mr-2 h-5 w-5 text-blue-600" />
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
                                <Palmtree className="h-6 w-6 text-blue-600" />
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
                                onClick={() => setViewingAdminListing(listing)}
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

              {activeSection === 'manage_packages' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Palmtree className="mr-2 h-5 w-5 text-blue-600" />
                      Manage Agency Packages
                    </CardTitle>
                    <CardDescription>
                      View and manage packages grouped by agency
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-8">
                      {allAgencies.map(agency => {
                        const agencyPkgs = agencyListings.filter(l => l.agencyId === agency.id);
                        if (agencyPkgs.length === 0) return null;
                        
                        return (
                          <div key={agency.id} className="border rounded-lg p-4 bg-gray-50">
                            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                              <Building className="h-5 w-5 text-gray-600" />
                              {agency.companyName} 
                              <span className="text-sm font-normal text-gray-500">({agencyPkgs.length} packages)</span>
                            </h3>
                            <div className="space-y-4">
                              {agencyPkgs.map(pkg => (
                                <div key={pkg.id} className="flex items-center justify-between p-3 bg-white border rounded-md shadow-sm">
                                  <div>
                                    <h4 className="font-semibold">{pkg.title || `${pkg.packageType === 'international' ? pkg.countryName : pkg.stateName} Package`}</h4>
                                    <p className="text-sm text-gray-600">ID: {pkg.id} | Status: {pkg.approved ? 'Approved' : 'Pending'}</p>
                                  </div>
                                  <Button 
                                    variant="destructive" 
                                    size="sm" 
                                    onClick={() => handleDeletePackage(pkg.id)}
                                  >
                                    <Trash2 className="h-4 w-4 mr-1" /> Delete
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                      {allAgencies.every(agency => agencyListings.filter(l => l.agencyId === agency.id).length === 0) && (
                         <p className="text-gray-500 text-center py-8">No packages found for any agency.</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {activeSection === 'listings' && viewingAdminListing && (() => {
                const allListingImages = [
                  ...(viewingAdminListing.photos || []),
                  ...(viewingAdminListing.placesCovered || []).flatMap((p: any) => p.imageUrls || [])
                ].filter(Boolean);
                return (
                  <div className="space-y-6 animate-in fade-in duration-300">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setViewingAdminListing(null)}
                          className="flex items-center justify-center p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-all border border-slate-200 bg-white shadow-sm"
                          title="Back to Listings"
                        >
                          <ChevronLeft className="h-5 w-5" />
                        </button>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Listing Details</span>
                            <span className="text-slate-300">•</span>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                              viewingAdminListing.approved
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}>
                              <span className={`h-1 w-1 rounded-full ${viewingAdminListing.approved ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
                              {viewingAdminListing.approved ? 'Approved' : 'Pending Review'}
                            </span>
                          </div>
                          <h2 className="text-xl font-bold text-slate-900 mt-0.5">{viewingAdminListing.title || 'Untitled Package'}</h2>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <Button
                          variant="outline"
                          onClick={() => setViewingAdminListing(null)}
                          className="rounded-xl border-slate-200 hover:bg-slate-50 text-slate-700 font-medium px-4 py-2 text-sm transition-all"
                        >
                          Back
                        </Button>
                        {!viewingAdminListing.approved && (
                          <Button
                            onClick={() => {
                              approveListing(viewingAdminListing.id);
                              setViewingAdminListing(null);
                            }}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl px-5 py-2 text-sm shadow-md hover:shadow-lg transition-all flex items-center gap-1.5"
                          >
                            <Check className="h-4 w-4" />
                            Approve Package
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                      <div className="lg:col-span-8 space-y-6">
                        {allListingImages.length > 0 ? (
                          <Card className="border-slate-200 shadow-sm overflow-hidden rounded-3xl bg-white">
                            <div className="relative h-64 md:h-80 w-full overflow-hidden bg-slate-950">
                              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/30 to-transparent z-10" />
                              <img
                                src={allListingImages[0]}
                                alt={viewingAdminListing.title}
                                className="w-full h-full object-cover opacity-90 hover:scale-105 transition-transform duration-700 ease-out"
                              />
                              <div className="absolute bottom-6 left-6 z-20 text-white">
                                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest bg-indigo-950/80 px-2.5 py-1 rounded-md border border-indigo-500/20">
                                  Primary Package Gallery
                                </span>
                                <h3 className="text-xl md:text-2xl font-black mt-3 text-white tracking-tight">
                                  {viewingAdminListing.title}
                                </h3>
                                <p className="text-xs text-slate-300 mt-1 font-medium flex items-center gap-1">
                                  <MapPin className="h-3.5 w-3.5 text-rose-500" />
                                  {viewingAdminListing.packageType === 'international' 
                                    ? (viewingAdminListing.countryName || 'Global') 
                                    : (viewingAdminListing.stateName || 'India')}
                                </p>
                              </div>
                              
                              {allListingImages.length > 1 && (
                                <div className="absolute bottom-6 right-6 z-20 bg-slate-950/80 backdrop-blur-md text-[10px] font-bold text-white px-3 py-1.5 rounded-xl border border-slate-800">
                                  {allListingImages.length} Package Images
                                </div>
                              )}
                            </div>
                            
                            {allListingImages.length > 1 && (
                              <div className="p-4 bg-slate-50 border-t border-slate-100 overflow-hidden">
                                <div className="flex gap-3 overflow-x-auto py-1 scrollbar-none">
                                  {allListingImages.map((img, idx) => (
                                    <div 
                                      key={idx} 
                                      className="h-16 w-24 rounded-lg overflow-hidden border border-slate-200 shadow-sm shrink-0 cursor-pointer hover:border-indigo-500 hover:scale-105 transition-all duration-300"
                                    >
                                      <img src={img} alt="Package Thumb" className="h-full w-full object-cover" />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </Card>
                        ) : (
                          <Card className="border-slate-200 shadow-sm overflow-hidden rounded-3xl bg-white">
                            <div className="relative h-48 w-full bg-gradient-to-r from-indigo-950 via-slate-950 to-slate-900 flex flex-col justify-end p-6 text-white overflow-hidden">
                              <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-indigo-500/10 blur-xl" />
                              <div className="z-10">
                                <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest bg-indigo-900/40 px-2 py-0.5 rounded border border-indigo-500/20">
                                  Administrative Review
                                </span>
                                <h3 className="text-lg md:text-xl font-bold mt-2 text-white">
                                  {viewingAdminListing.title}
                                </h3>
                                <p className="text-xs text-slate-400 mt-1">
                                  Review details, timeline itineraries, and specifications for this tour proposal.
                                </p>
                              </div>
                            </div>
                          </Card>
                        )}
                      
                      <Card className="border-slate-200 shadow-sm overflow-hidden rounded-2xl bg-white">
                        <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-4 px-6">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                              <Camera className="h-4 w-4 text-indigo-500" />
                              Destinations Gallery
                            </CardTitle>
                            <span className="text-xs text-slate-500 font-medium">
                              {viewingAdminListing.placesCovered?.length || 0} Places Covered
                            </span>
                          </div>
                        </CardHeader>
                        <CardContent className="p-6">
                          {viewingAdminListing.placesCovered && viewingAdminListing.placesCovered.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                              {viewingAdminListing.placesCovered.map((place: any, idx: number) => {
                                const placeImageUrl = (place.imageUrls && place.imageUrls.length > 0)
                                  ? place.imageUrls[0]
                                  : (viewingAdminListing.photos && viewingAdminListing.photos.length > 0)
                                    ? viewingAdminListing.photos[0]
                                    : null;

                                return (
                                  <div key={idx} className="group relative border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-slate-50 hover:shadow-md transition-all duration-300">
                                    <div className="h-44 overflow-hidden relative bg-slate-200 flex items-center justify-center">
                                      {placeImageUrl ? (
                                        <img
                                          src={placeImageUrl}
                                          alt={place.name}
                                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                                        />
                                      ) : (
                                        <div className="flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-slate-50 to-slate-100 text-slate-400 w-full h-full">
                                          <MapPin className="h-7 w-7 stroke-[1.5]" />
                                          <span className="text-[11px] font-medium">No photos</span>
                                        </div>
                                      )}
                                      <div className="absolute top-2 left-2 bg-slate-900/75 backdrop-blur-sm text-[10px] text-white px-2 py-0.5 rounded-md font-semibold tracking-wider uppercase">
                                        Location {idx + 1}
                                      </div>
                                    </div>
                                    <div className="p-3 bg-white border-t border-slate-100">
                                      <p className="font-semibold text-sm text-slate-900 truncate">{place.name || `Unnamed Place`}</p>
                                      {place.imageUrls && place.imageUrls.length > 1 && (
                                        <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-400 font-medium">
                                          <Camera className="h-3 w-3" />
                                          <span>{place.imageUrls.length} photos available</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 bg-slate-50/50">
                              <MapPin className="h-10 w-10 stroke-[1.5] mb-2 text-slate-300" />
                              <p className="text-sm font-medium">No places specified for this package</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      <Card className="border-slate-200 shadow-sm rounded-2xl bg-white">
                        <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-4 px-6">
                          <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                            <ClipboardList className="h-4 w-4 text-indigo-500" />
                            Detailed Tour Itinerary
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                          {viewingAdminListing.itinerary && viewingAdminListing.itinerary.length > 0 ? (
                            <div className="relative pl-6 sm:pl-8 space-y-8 before:absolute before:top-2 before:bottom-2 before:left-[18px] sm:before:left-[22px] before:w-[2px] before:bg-indigo-100">
                              {viewingAdminListing.itinerary.map((day: any, idx: number) => (
                                <div key={idx} className="relative group">
                                  <div className="absolute -left-[30px] sm:-left-[34px] top-1.5 w-6 h-6 rounded-full bg-white border-2 border-indigo-500 shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                    <span className="text-[10px] font-extrabold text-indigo-600">{day.day || idx + 1}</span>
                                  </div>
                                  
                                  <div className="bg-slate-50 hover:bg-slate-100/70 border border-slate-200/60 rounded-xl p-4 transition-all duration-300">
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 mb-2">
                                      <h4 className="font-bold text-sm text-slate-900 group-hover:text-indigo-600 transition-colors">
                                        Day {day.day || idx + 1}: {day.placeName || 'Destination Spot'}
                                      </h4>
                                    </div>
                                    <p className="text-xs text-slate-600 leading-relaxed font-normal">
                                      {day.description || 'No descriptive guide provided for this day of the tour.'}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 bg-slate-50/50">
                              <Calendar className="h-10 w-10 stroke-[1.5] mb-2 text-slate-300" />
                              <p className="text-sm font-medium">No day-by-day itinerary detailed</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card className="border-slate-200 shadow-sm rounded-2xl bg-white overflow-hidden">
                          <div className="border-b border-emerald-100 bg-emerald-50/40 py-3.5 px-5 flex items-center gap-2">
                            <div className="h-7 w-7 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600">
                              <Check className="h-4 w-4 stroke-[2.5]" />
                            </div>
                            <h3 className="font-bold text-sm text-slate-900">Inclusions</h3>
                          </div>
                          <CardContent className="p-5">
                            {viewingAdminListing.inclusions ? (
                              <ul className="space-y-3">
                                {viewingAdminListing.inclusions.split('\n').map((line: string, idx: number) => {
                                  if (!line.trim()) return null;
                                  return (
                                    <li key={idx} className="flex items-start gap-2.5">
                                      <span className="h-4 w-4 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-[10px] font-bold mt-0.5 border border-emerald-100 shrink-0">
                                        ✓
                                      </span>
                                      <p className="text-xs text-slate-600 leading-normal">{line.trim()}</p>
                                    </li>
                                  );
                                })}
                              </ul>
                            ) : (
                              <p className="text-xs text-slate-400 italic">No package inclusions specified</p>
                            )}
                          </CardContent>
                        </Card>

                        <Card className="border-slate-200 shadow-sm rounded-2xl bg-white overflow-hidden">
                          <div className="border-b border-rose-100 bg-rose-50/40 py-3.5 px-5 flex items-center gap-2">
                            <div className="h-7 w-7 rounded-lg bg-rose-100 flex items-center justify-center text-rose-600">
                              <X className="h-4 w-4 stroke-[2.5]" />
                            </div>
                            <h3 className="font-bold text-sm text-slate-900">Exclusions</h3>
                          </div>
                          <CardContent className="p-5">
                            {viewingAdminListing.exclusions ? (
                              <ul className="space-y-3">
                                {viewingAdminListing.exclusions.split('\n').map((line: string, idx: number) => {
                                  if (!line.trim()) return null;
                                  return (
                                    <li key={idx} className="flex items-start gap-2.5">
                                      <span className="h-4 w-4 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center text-[9px] font-bold mt-0.5 border border-rose-100 shrink-0">
                                        ✕
                                      </span>
                                      <p className="text-xs text-slate-600 leading-normal">{line.trim()}</p>
                                    </li>
                                  );
                                })}
                              </ul>
                            ) : (
                              <p className="text-xs text-slate-400 italic">No package exclusions specified</p>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    </div>

                    <div className="lg:col-span-4 space-y-6">
                      <Card className="border-slate-200 shadow-md rounded-2xl bg-[#0F172A] text-white overflow-hidden">
                        <div className="p-6 space-y-6">
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Total Price</span>
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider ${
                                viewingAdminListing.packageType === 'international'
                                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              }`}>
                                {viewingAdminListing.packageType === 'international' ? 'International' : 'Domestic'}
                              </span>
                            </div>
                            <div className="flex items-baseline gap-1">
                              <span className="text-3xl font-extrabold tracking-tight" style={{ color: '#ffffff' }}>
                                {viewingAdminListing.packageType === 'international' ? '$' : '₹'}
                                {viewingAdminListing.cost || viewingAdminListing.price || 'N/A'}
                              </span>
                              <span className="text-slate-400 text-xs font-medium">/ person</span>
                            </div>
                          </div>

                          <div className="h-px bg-slate-800" />

                          <div className="space-y-3.5">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-slate-400 flex items-center gap-1.5">
                                <Clock className="h-4 w-4 text-slate-400" />
                                Duration
                              </span>
                              <span className="font-bold text-white">
                                {viewingAdminListing.itinerary?.length || 0} Days / {Math.max(0, (viewingAdminListing.itinerary?.length || 1) - 1)} Nights
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-sm">
                              <span className="text-slate-400 flex items-center gap-1.5">
                                <MapPin className="h-4 w-4 text-slate-400" />
                                Location
                              </span>
                              <span className="font-bold text-white font-sans">
                                {viewingAdminListing.packageType === 'international' 
                                  ? (viewingAdminListing.countryName || 'Global') 
                                  : (viewingAdminListing.stateName || 'India')}
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-sm">
                              <span className="text-slate-400 flex items-center gap-1.5">
                                <TrendingUp className="h-4 w-4 text-slate-400" />
                                Trending status
                              </span>
                              <span className={`font-bold flex items-center gap-1 ${viewingAdminListing.isTrending ? 'text-amber-400' : 'text-slate-400'}`}>
                                {viewingAdminListing.isTrending ? 'High Demand' : 'Standard'}
                              </span>
                            </div>

                            {viewingAdminListing.discountCategory && viewingAdminListing.discountCategory !== 'none' && (
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-400 flex items-center gap-1.5">
                                  <Tag className="h-4 w-4 text-slate-400" />
                                  Active Promotion
                                </span>
                                <span className="font-bold text-rose-400 uppercase">
                                  {viewingAdminListing.discountCategory === '10-off' ? '10% Discount' :
                                    viewingAdminListing.discountCategory === '50-off' ? '50% Super Saver' :
                                      viewingAdminListing.discountCategory === 'flash-deals' ? 'Flash Deal' : viewingAdminListing.discountCategory}
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="h-px bg-slate-800" />

                          <div className="space-y-2.5">
                            {!viewingAdminListing.approved ? (
                              <>
                                <Button
                                  onClick={() => {
                                    approveListing(viewingAdminListing.id);
                                    setViewingAdminListing(null);
                                  }}
                                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 border-0"
                                >
                                  <Check className="h-4 w-4 stroke-[2.5]" />
                                  Approve & Go Live
                                </Button>
                                <p className="text-[10px] text-center text-slate-400 font-sans">
                                  Approving will make this package active on the user portal.
                                </p>
                              </>
                            ) : (
                              <div className="flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-semibold">
                                <Check className="h-4 w-4 stroke-[2.5]" />
                                Package Approved & Active
                              </div>
                            )}
                          </div>
                        </div>
                      </Card>

                      <Card className="border-slate-200 shadow-sm rounded-2xl bg-white overflow-hidden">
                        <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-4 px-6">
                          <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                            <Info className="h-4 w-4 text-indigo-500" />
                            Specifications
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-5 space-y-4">
                          <div>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1.5">Tour Categories</span>
                            <div className="flex flex-wrap gap-1.5">
                              {viewingAdminListing.tourCategories && viewingAdminListing.tourCategories.length > 0 ? (
                                viewingAdminListing.tourCategories.map((cat: string, idx: number) => (
                                  <span key={idx} className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                    {cat}
                                  </span>
                                ))
                              ) : (
                                <span className="text-xs text-slate-400 italic">None specified</span>
                              )}
                            </div>
                          </div>

                          <div>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1.5">Hotel Accommodations</span>
                            <div className="flex flex-wrap gap-1.5">
                              {viewingAdminListing.hotelTypes && viewingAdminListing.hotelTypes.length > 0 ? (
                                viewingAdminListing.hotelTypes.map((type: string, idx: number) => (
                                  <span key={idx} className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100 capitalize">
                                    {type}
                                  </span>
                                ))
                              ) : (
                                <span className="text-xs text-slate-400 italic">None specified</span>
                              )}
                            </div>
                          </div>

                          {viewingAdminListing.mealPlan && (
                            <div>
                              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1.5">Meal Plan</span>
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 capitalize">
                                <Utensils className="h-3 w-3" />
                                {Array.isArray(viewingAdminListing.mealPlan)
                                  ? (viewingAdminListing.mealPlan.length > 0
                                      ? viewingAdminListing.mealPlan.map((m: string) => {
                                          if (m === 'breakfast-dinner') return 'Breakfast & Dinner';
                                          if (m === 'all-meals') return 'All Meals';
                                          if (m === 'no-meal') return 'No Meal';
                                          return m.charAt(0).toUpperCase() + m.slice(1);
                                        }).join(' & ')
                                      : 'No Meals')
                                  : (viewingAdminListing.mealPlan === 'breakfast' ? 'Breakfast Included' :
                                      viewingAdminListing.mealPlan === 'breakfast-dinner' ? 'Breakfast & Dinner' :
                                        viewingAdminListing.mealPlan === 'all-meals' ? 'All Meals' : 
                                          (viewingAdminListing.mealPlan === 'no-meal' ? 'No Meals' : viewingAdminListing.mealPlan))}
                              </span>
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                            <div>
                              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Recommended Season</span>
                              <span className="text-xs font-bold text-slate-700 capitalize">
                                {viewingAdminListing.season ? (viewingAdminListing.season === 'all-seasons' ? 'All Seasons' : `${viewingAdminListing.season} season`) : 'Any season'}
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Activity Genre</span>
                              <span className="text-xs font-bold text-slate-700 capitalize">
                                {Array.isArray(viewingAdminListing.experienceType) && viewingAdminListing.experienceType.length > 0
                                  ? viewingAdminListing.experienceType.join(' | ')
                                  : (typeof viewingAdminListing.experienceType === 'string' && viewingAdminListing.experienceType
                                      ? viewingAdminListing.experienceType
                                      : 'Standard tour')}
                              </span>
                            </div>
                          </div>

                          {viewingAdminListing.eventType && viewingAdminListing.eventType !== '' && (
                            <div className="pt-2.5 border-t border-slate-100">
                              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Seasonal Event / Festival</span>
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-100 capitalize">
                                {viewingAdminListing.eventType === 'new-year' ? 'New Year / Christmas' :
                                  viewingAdminListing.eventType === 'diwali' ? 'Diwali Specials' :
                                    viewingAdminListing.eventType === 'summer-vacation' ? 'Summer Vacation' :
                                      viewingAdminListing.eventType === 'weekend' ? 'Long Weekend Special' : viewingAdminListing.eventType}
                              </span>
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      <Card className="border-slate-200 shadow-sm rounded-2xl bg-white overflow-hidden">
                        <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-4 px-6">
                          <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-indigo-500" />
                            Agency Profile
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-5 space-y-3.5 text-xs">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600 text-sm border border-slate-200">
                              {viewingAdminListing.agencyName ? viewingAdminListing.agencyName.charAt(0).toUpperCase() : 'A'}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 text-sm">{viewingAdminListing.agencyName || 'Unknown Agency'}</p>
                              <p className="text-[10px] text-slate-400 font-mono mt-0.5">ID: {viewingAdminListing.agencyId || 'N/A'}</p>
                            </div>
                          </div>

                          <div className="h-px bg-slate-100" />

                          <div className="grid grid-cols-2 gap-2 text-slate-500 font-medium">
                            <div>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Submission Date</p>
                              <p className="text-slate-800 font-bold mt-0.5">
                                {viewingAdminListing.createdAt
                                  ? new Date(viewingAdminListing.createdAt?.toDate?.() || viewingAdminListing.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                                  : 'N/A'}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Listing Reference</p>
                              <p className="text-slate-800 font-mono font-bold mt-0.5 truncate" title={viewingAdminListing.id}>
                                {viewingAdminListing.id ? viewingAdminListing.id.substring(0, 8) : 'N/A'}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </div>
              );
            })()}

              {activeSection === 'chats' && <AdminChatViewer />}
              {activeSection === 'settings' && (
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Settings className="mr-2 h-5 w-5 text-gray-700" />
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
                        <h3 className="text-lg font-semibold mb-4 text-blue-700">Dynamic Pricing Configuration (INR)</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <Label>Starter Plan</Label>
                            <Input type="number" value={pricingConfig.starterPrice} onChange={(e) => setPricingConfig({...pricingConfig, starterPrice: parseInt(e.target.value) || 0})} />
                          </div>
                          <div>
                            <Label>Premium Plan</Label>
                            <Input type="number" value={pricingConfig.premiumPrice} onChange={(e) => setPricingConfig({...pricingConfig, premiumPrice: parseInt(e.target.value) || 0})} />
                          </div>
                          <div>
                            <Label>VIP Plan</Label>
                            <Input type="number" value={pricingConfig.vipPrice} onChange={(e) => setPricingConfig({...pricingConfig, vipPrice: parseInt(e.target.value) || 0})} />
                          </div>
                          <div>
                            <Label>Add-on (per cr)</Label>
                            <Input type="number" value={pricingConfig.addonCreditPrice} onChange={(e) => setPricingConfig({...pricingConfig, addonCreditPrice: parseFloat(e.target.value) || 0})} />
                          </div>
                        </div>
                      </div>

                      <Button onClick={async () => {
                        try {
                          const response = await fetch('/api/admin/save-config', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(pricingConfig)
                          });
                          if (!response.ok) throw new Error('Failed to save configuration');
                          alert('Pricing configuration saved successfully!');
                        } catch (err) {
                          alert('Error saving config.');
                          console.error(err);
                        }
                      }}>Save Configuration</Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <MessageSquare className="mr-2 h-5 w-5 text-blue-600" />
                        Chat Quick Replies Management
                      </CardTitle>
                      <CardDescription>
                        Add or remove custom quick replies for travelers and agencies
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div>
                        <h3 className="text-lg font-semibold mb-3">Traveler (User) Quick Replies</h3>
                        <div className="flex gap-2 mb-4">
                          <Input
                            value={newBuyerReplyInput}
                            onChange={(e) => setNewBuyerReplyInput(e.target.value)}
                            placeholder="Type a new traveler quick reply..."
                            className="flex-1"
                          />
                          <Button onClick={() => handleAddQuickReply('buyer')}>Add</Button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {BUYER_QUICK_REPLIES.map((reply, idx) => (
                            <span key={`default-buyer-${idx}`} className="px-3 py-1.5 bg-gray-100 text-gray-600 text-xs rounded-full flex items-center gap-1 border border-gray-200">
                              {reply}
                              <span className="text-[10px] text-gray-400 italic ml-1">(Default)</span>
                            </span>
                          ))}
                          {adminBuyerReplies.map((reply, idx) => (
                            <span key={`admin-buyer-${idx}`} className="px-3 py-1.5 bg-blue-50 text-blue-700 text-xs rounded-full flex items-center gap-2 border border-blue-200">
                              {reply}
                              <button onClick={() => handleRemoveQuickReply('buyer', idx)} className="hover:bg-blue-200 rounded-full w-4 h-4 flex items-center justify-center font-bold text-blue-800">×</button>
                            </span>
                          ))}
                        </div>
                      </div>

                      <hr className="border-gray-200" />

                      <div>
                        <h3 className="text-lg font-semibold mb-3">Travel Agency (Seller) Quick Replies</h3>
                        <div className="flex gap-2 mb-4">
                          <Input
                            value={newSellerReplyInput}
                            onChange={(e) => setNewSellerReplyInput(e.target.value)}
                            placeholder="Type a new agency quick reply..."
                            className="flex-1"
                          />
                          <Button onClick={() => handleAddQuickReply('seller')}>Add</Button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {SELLER_QUICK_REPLIES.map((reply, idx) => (
                            <span key={`default-seller-${idx}`} className="px-3 py-1.5 bg-gray-100 text-gray-600 text-xs rounded-full flex items-center gap-1 border border-gray-200">
                              {reply}
                              <span className="text-[10px] text-gray-400 italic ml-1">(Default)</span>
                            </span>
                          ))}
                          {adminSellerReplies.map((reply, idx) => (
                            <span key={`admin-seller-${idx}`} className="px-3 py-1.5 bg-orange-50 text-orange-700 text-xs rounded-full flex items-center gap-2 border border-orange-200">
                              {reply}
                              <button onClick={() => handleRemoveQuickReply('seller', idx)} className="hover:bg-orange-200 rounded-full w-4 h-4 flex items-center justify-center font-bold text-orange-800">×</button>
                            </span>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </main>
          </div>
        </div>
      );
    }
  }

  // User Dashboard — render publicly for routeMode='user' (no login required)
  // Also renders when logged in as a user role
  if (routeMode === 'user' || (user && userData?.role === 'user')) {
      const showHeaderSearch = isScrolled || (userActiveSection !== 'listings' || !!viewingListing || showBookingForm || showComparison);
      return (
        <div className={`flex flex-col bg-gray-100 ${userActiveSection === 'chat' ? 'h-screen overflow-hidden' : 'min-h-screen'}`}>
          {/* Top Navigation Bar */}
          <header className="header-transition text-gray-900 z-[100] sticky top-0 bg-white shadow-sm border-b border-gray-200 h-16 flex items-center">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 px-4 w-full h-full">
              {/* Logo & Search */}
              <div className="flex items-center gap-4 flex-1 w-full h-full">
                <div
                  className="flex items-center gap-1 sm:gap-2 font-extrabold tracking-tight cursor-pointer"
                  onClick={() => {
                    setUserActiveSection('listings');
                    setViewingListing(null);
                    setSelectedCategoryFilter(null);
                    setDashboardViewMode('categories');
                    setSearchTerm('');
                    setFilters({
                      priceRange: [0, 500000],
                      duration: '',
                      type: '',
                      rating: 0,
                      destination: '',
                      packageType: '',
                      amenities: []
                    });
                    setShowBookingForm(false);
                    setShowComparison(false);
                  }}
                >
                  <img src="/tripdm-logo.png" alt="TripDM Logo" className="h-20 w-auto object-contain" />
                </div>
                <div className="relative w-full max-w-xl">
                  <AutocompleteSearch
                    placeholder="Search your Holiday Destination"
                    typewriterPrefix="Search for "
                    typewriter={["Gujarat", "Japan", "Rajasthan", "Kerala", "Goa"]}
                    value={searchTerm}
                    onChange={(val) => setSearchTerm(val)}
                    onSelect={(val) => {
                      setSearchTerm(val);
                    }}
                    suggestions={allDestinations}
                    inputClassName="w-full pl-10 pr-4 py-1.5 rounded-md text-black bg-gray-50 focus:ring-2 focus:ring-orange-500 focus:outline-none border border-gray-200 text-sm h-10 shadow-inner"
                    iconClassName="left-3 top-3 text-gray-400"
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
                  className={`cursor-pointer transition-all text-[15px] font-medium hover:text-orange-400 flex items-center gap-1.5 ${showComparison ? 'text-orange-500' : 'text-gray-800'}`}
                  onClick={() => {
                    setFromSection(userActiveSection);
                    setUserActiveSection('listings');
                    setShowComparison(true);
                  }}
                >
                  <Scale className="h-4 w-4 text-orange-400" /> Compare
                </span>

                {/* Wishlist */}
                <span
                  className={`cursor-pointer transition-all text-[15px] font-medium hover:text-orange-400 flex items-center gap-1.5 ${userActiveSection === 'wishlist' ? 'text-orange-500' : 'text-gray-800'}`}
                  onClick={() => {
                    setFromSection(userActiveSection);
                    setUserActiveSection('wishlist');
                    setShowComparison(false);
                  }}
                >
                  <Heart className="h-4 w-4 text-orange-500" /> Wishlist
                </span>

                {/* Messages */}
                <span
                  className={`cursor-pointer transition-all text-[15px] font-medium hover:text-orange-400 flex items-center gap-1.5 ${userActiveSection === 'chat' ? 'text-orange-500' : 'text-gray-800'}`}
                  onClick={() => {
                    setFromSection(userActiveSection);
                    setUserActiveSection('chat');
                  }}
                >
                  <MessageSquare className="h-4 w-4 text-orange-500" /> Messages
                </span>

                {/* Profile / Sign In */}
                {user && userData ? (
                  <div className="flex items-center gap-3 ml-2 border-l border-gray-200 pl-5">
                    <div
                      className={`flex items-center gap-2 cursor-pointer transition-all text-[15px] font-medium hover:text-orange-400 ${userActiveSection === 'profile' ? 'text-orange-500' : 'text-gray-800'}`}
                      onClick={() => {
                        setFromSection(userActiveSection);
                        setUserActiveSection('profile');
                      }}
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
                        signOut();
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


          {/* Main Dashboard Scroll Area */}
          <div
            className={`flex-1 w-full ${
              userActiveSection === 'chat' ? 'overflow-hidden flex flex-col h-full' : ''
            }`}
            id="user-dashboard-scroll-container"
          >
            {userActiveSection === 'listings' && !viewingListing && !showBookingForm && !showComparison && (
              <div className="w-full bg-gray-50 fixed top-16 left-0 right-0 z-0 h-[400px] flex flex-col justify-center items-center overflow-hidden">
                {/* Background image slider with fixed attachment for parallax */}
                {HERO_IMAGES.map((img, index) => (
                  <div 
                    key={index}
                    className={`absolute inset-0 bg-cover bg-center bg-fixed transition-opacity duration-1000 ease-in-out ${index === currentHeroImage ? 'opacity-90' : 'opacity-0'}`}
                    style={{ backgroundImage: `url('${img}')` }}
                  ></div>
                ))}
                {/* Gradient to fade into the gray-50 background below */}
                <div className="absolute inset-0 bg-gradient-to-t from-gray-50 via-gray-50/40 to-transparent pointer-events-none"></div>
              </div>
            )}

            <main className={`${(userActiveSection === 'profile' || userActiveSection === 'comparison' || (showComparison && userActiveSection === 'listings') || userActiveSection === 'wishlist' || userActiveSection === 'chat') ? 'w-full' : 'px-6 max-w-7xl mx-auto w-full'} ${userActiveSection === 'chat' ? 'flex-1 flex flex-col min-h-0 h-full' : (userActiveSection === 'wishlist' && wishlist.length === 0) ? 'pb-0' : (userActiveSection === 'comparison' || (showComparison && userActiveSection === 'listings') || userActiveSection === 'profile') ? 'pb-0' : 'pb-10'}`}>
              {/* Header logic adjusted for non-listings sections (excludes bookings and profile which have their own layouts) */}
              {userActiveSection !== 'listings' && userActiveSection !== 'bookings' && userActiveSection !== 'profile' && userActiveSection !== 'comparison' && userActiveSection !== 'wishlist' && userActiveSection !== 'chat' && (
                <div className="mb-6 mt-6 px-6 max-w-7xl mx-auto flex justify-between items-center border-b pb-4 border-gray-200">
                  <div className="flex items-center gap-3">
                    {userActiveSection === 'wishlist' && (
                      <button
                        onClick={() => setUserActiveSection(fromSection === 'wishlist' ? 'listings' : fromSection)}
                        className="flex items-center justify-center w-9 h-9 rounded-full border border-gray-200 hover:bg-gray-100 text-gray-750 transition-all hover:scale-105 active:scale-95 text-lg font-bold shadow-sm"
                        title="Go back"
                      >
                        ←
                      </button>
                    )}
                    <h1 className="text-3xl font-bold text-gray-900">
                      {userActiveSection === 'chat' && 'Messages'}
                      {userActiveSection === 'wishlist' && 'My Wishlist'}
                    </h1>
                  </div>
                </div>
              )}

              {userActiveSection === 'listings' && !viewingListing && !showBookingForm && !showComparison && (
                <div className="relative z-10 pt-[240px] w-full">

                  {/* Comparison Bar */}
                  {comparisonList.length > 0 && (
                    <Card className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 shadow-md">
                      <CardContent className="p-4">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <Scale className="h-6 w-6 text-blue-600" />
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
                              onClick={() => {
                                setUserActiveSection('listings');
                                setShowComparison(true);
                              }}
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

                  {/* Category Emoji Navigation Strip */}
                  <div id="category-nav-strip" className="w-full bg-white/95 border border-gray-200 rounded-3xl p-3 mb-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex items-center justify-between gap-4 py-2.5 sticky top-16 z-[90] backdrop-blur-md relative">
                    <div className="flex gap-2 sm:gap-3.5 w-full justify-start items-center min-w-max px-2 overflow-x-auto horizontal-scroll-nav scrollbar-hide">
                      {[
                        { id: 'all_categories', label: 'Categories', type: 'categories', filter: null },
                        { id: 'all_packages', label: 'All Packages', type: 'all', filter: null },
                        { id: 'domestic_tab', label: 'Domestic', type: 'all', filter: { category: 'domestic', title: 'Domestic Packages' } },
                        { id: 'intl_tab', label: 'International', type: 'all', filter: { category: 'international', title: 'International Packages' } },
                        { id: 'trending_tab', label: 'Trending', type: 'all', filter: { category: 'trending', title: 'Trending Destinations' } },
                        { id: 'experience_tab', label: 'Adventure', type: 'all', filter: { category: 'experiences', subcategory: 'Adventure', title: 'Experience Travel - Adventure' } },
                        { id: 'honeymoon_tab', label: 'Honeymoon', type: 'all', filter: { category: 'tourCategory', subcategory: 'Honeymoon Tour', title: 'Tour by Category - Honeymoon Tour' } }
                      ].map((item) => {
                        const isCategoriesActive = item.type === 'categories' && dashboardViewMode === 'categories' && !selectedCategoryFilter;
                        const isAllActive = item.type === 'all' && dashboardViewMode === 'all' && !selectedCategoryFilter && !item.filter;
                        const isFilterActive = item.filter && selectedCategoryFilter && 
                                               selectedCategoryFilter.category === item.filter.category && 
                                               selectedCategoryFilter.subcategory === item.filter.subcategory;
                        
                        const isActive = isCategoriesActive || isAllActive || isFilterActive;

                        return (
                          <button
                            key={item.id}
                            onClick={() => {
                              if (item.type === 'categories') {
                                setDashboardViewMode('categories');
                                setSelectedCategoryFilter(null);
                              } else {
                                setDashboardViewMode('all');
                                setSelectedCategoryFilter(item.filter);
                              }
                            }}
                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150 flex items-center gap-2 shrink-0 ${
                              isActive
                                ? 'bg-[#FF9900] text-white shadow-sm border border-[#FF9900]'
                                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900 hover:border-gray-300'
                            }`}
                          >
                            {getTabIcon(item.id, "h-3.5 w-3.5")}
                            {item.label}
                          </button>
                        );
                      })}
                    </div>
                    
                    <div className="h-6 w-px bg-gray-300 mx-1 shrink-0"></div>
                    
                    <div className="relative shrink-0 flex items-center">
                      <button
                        onClick={() => setShowFilters(!showFilters)}
                        className="px-4 py-2 rounded-full text-sm font-semibold transition-all duration-150 flex items-center gap-2 border bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900 hover:border-gray-300 shadow-sm"
                      >
                        <Settings className="h-4 w-4" />
                        Filter
                      </button>
                      <FilterSidebar isOpen={showFilters} onClose={() => setShowFilters(false)} />
                    </div>
                  </div>

                  {/* Category Details Banner */}
                  {selectedCategoryFilter && (
                    <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 mb-6 flex justify-between items-center shadow-sm">
                      <div>
                        <span className="text-[10px] text-orange-600 font-extrabold uppercase tracking-wider">Filtered Category</span>
                        <h2 className="text-lg sm:text-xl font-black text-gray-900 mt-0.5">
                          {selectedCategoryFilter.title} {selectedCategoryFilter.subcategory ? `• ${selectedCategoryFilter.subcategory}` : ''}
                        </h2>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedCategoryFilter(null)}
                        className="text-orange-700 hover:text-orange-955 hover:bg-orange-100 font-bold text-xs"
                      >
                        Clear Filter
                      </Button>
                    </div>
                  )}

                  {/* Search Term Banner */}
                  {searchTerm && (
                    <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-6 flex justify-between items-center shadow-sm">
                      <div>
                        <span className="text-[10px] text-blue-600 font-extrabold uppercase tracking-wider">Search Results For</span>
                        <h2 className="text-lg sm:text-xl font-black text-gray-900 mt-0.5">
                          "{searchTerm}"
                        </h2>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSearchTerm('')}
                        className="text-blue-700 hover:text-blue-955 hover:bg-blue-100 font-bold text-xs"
                      >
                        Clear Search
                      </Button>
                    </div>
                  )}

                  {/* Main View Controller */}
                  {dashboardViewMode === 'categories' && !selectedCategoryFilter && !searchTerm ? (
                    /* Category Landing Page */
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-10">

                      {/* Loop Categories Config */}
                      {categoriesConfig.map((category) => (
                        <div
                          key={category.id}
                          id={`section-${category.id}`}
                          className="scroll-mt-32 bg-white border border-slate-200/60 shadow-[0_4px_20px_rgba(0,0,0,0.02)] p-6 md:p-8 flex flex-col rounded-none overflow-hidden"
                        >
                          <h3 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight mb-6">
                            {category.title}
                          </h3>

                          <div className="grid grid-cols-2 gap-x-4 gap-y-6 flex-1">
                            {category.subcategories.map((sub) => {
                              const matched = getFilteredListingsForSubcategory(category.id, sub);
                              const img = getSubcategoryCoverImage(category.id, sub, matched);
                              const desc = subcategoryDescriptions[sub] || '';
                              return (
                                <div
                                  key={sub}
                                  className="flex flex-col cursor-pointer group/item"
                                  onClick={() => setSelectedCategoryFilter({
                                    category: category.id,
                                    subcategory: sub,
                                    title: `${category.title} - ${sub}`
                                  })}
                                >
                                  <div className="relative aspect-[16/10] rounded-none overflow-hidden bg-slate-50 border border-slate-200/40">
                                    <img
                                      src={img}
                                      alt={sub}
                                      className="w-full h-full object-cover transition-transform duration-500 group-hover/item:scale-105"
                                      loading="lazy"
                                    />
                                    <div className="absolute inset-0 bg-black/5 group-hover/item:bg-transparent transition-colors duration-300"></div>
                                  </div>
                                    <div className="mt-2.5 px-0.5">
                                      <p className="text-xs md:text-sm font-semibold text-slate-900 leading-snug group-hover/item:text-orange-500 transition-colors duration-200">
                                      {category.id === 'tourCategory' && desc
                                        ? `${sub} | ${desc}`
                                        : sub
                                      }
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          <div className="mt-6 flex items-center">
                            <button
                              onClick={() => setSelectedCategoryFilter({
                                category: category.id,
                                title: category.title
                              })}
                              className="text-sm font-bold text-orange-500 hover:text-orange-600 flex items-center gap-1 transition-colors group"
                            >
                              {category.linkText} <span className="transition-transform group-hover:translate-x-1">→</span>
                            </button>
                          </div>
                        </div>
                      ))}


                    </div>
                  ) : (
                    /* Filtered Listings Grid */
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {listings.length === 0 ? (
                        <div className="col-span-full py-16 flex flex-col items-center justify-center bg-gray-50/50 rounded-3xl border border-gray-100 border-dashed">
                          <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-6 shadow-inner relative overflow-hidden">
                            <Palmtree className="h-10 w-10 text-blue-600 animate-bounce" />
                          </div>
                          <h3 className="text-xl font-bold text-gray-800 mb-2">Fetching Best Deals</h3>
                          <p className="text-gray-500 font-medium text-center max-w-md">
                            We are looking for the perfect travel packages for you. If nothing appears, check back later!
                          </p>

                          {/* Fake skeletons below the text to simulate loading */}
                          <div className="w-full max-w-4xl mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 opacity-40">
                            {[1, 2, 3].map(i => (
                              <div key={i} className="bg-white border border-gray-100 rounded-3xl p-4 h-48 shadow-sm animate-pulse flex flex-col gap-4">
                                <div className="w-full h-24 bg-gray-200 rounded-2xl"></div>
                                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (() => {
                        const filtered = listings
                          .filter(listing => {
                            if (!listing.approved) return false;

                            // 1. Apply category filter if active
                            if (selectedCategoryFilter) {
                              const { category, subcategory } = selectedCategoryFilter;

                              if (category === 'tourCategory') {
                                const cats = listing.tourCategories || [];
                                const sub = subcategory || '';
                                if (sub === 'Family Tour' && !cats.includes('Family')) return false;
                                if (sub === 'Group Tour' && !(cats.includes('Friends') || cats.includes('Group'))) return false;
                                if (sub === 'Fix Departure Tour' && !cats.includes('Fix Departure')) return false;
                                if (sub === 'Honeymoon Tour' && !cats.includes('Honeymoon')) return false;
                                if (!sub && cats.length === 0) return false;
                              }

                              else if (category === 'domestic') {
                                if (listing.packageType !== 'domestic') return false;
                                if (subcategory) {
                                  const state = (listing.stateName || '').toLowerCase();
                                  if (subcategory === 'Kashmir' && !state.includes('kashmir') && !state.includes('jammu')) return false;
                                  if (subcategory === 'Himachal' && !state.includes('himachal')) return false;
                                  if (subcategory === 'South' && !state.includes('kerala') && !state.includes('karnataka') && !state.includes('tamil') && !state.includes('south') && !state.includes('goa') && !state.includes('andhra')) return false;
                                  if (subcategory === 'Rajasthan' && !state.includes('rajasthan')) return false;
                                }
                              }

                              else if (category === 'international') {
                                if (listing.packageType !== 'international') return false;
                                if (subcategory) {
                                  const country = (listing.countryName || '').toLowerCase();
                                  if (subcategory === 'Dubai' && !country.includes('dubai') && !country.includes('emirates') && !country.includes('uae')) return false;
                                  if (subcategory === 'Europe' && !country.includes('europe') && !country.includes('switzerland') && !country.includes('france') && !country.includes('italy') && !country.includes('germany') && !country.includes('united kingdom') && !country.includes('london')) return false;
                                  if (subcategory === 'Bali' && !country.includes('bali') && !country.includes('indonesia')) return false;
                                  if (subcategory === 'Turkey' && !country.includes('turkey')) return false;
                                }
                              }

                              else if (category === 'trending') {
                                if (subcategory) {
                                  const dest = ((listing.countryName || '') + ' ' + (listing.stateName || '') + ' ' + (listing.title || '')).toLowerCase();
                                  if (subcategory === 'Baku' && !dest.includes('baku') && !dest.includes('azerbaijan')) return false;
                                  if (subcategory === 'Singapore' && !dest.includes('singapore')) return false;
                                  if (subcategory === 'Leh Ladakh' && !dest.includes('ladakh') && !dest.includes('leh')) return false;
                                  if (subcategory === 'Manali' && !dest.includes('manali')) return false;
                                } else {
                                  if (!listing.isTrending) return false;
                                }
                              }

                              else if (category === 'offers') {
                                const priceVal = parseFloat(listing.cost || listing.price || '0');
                                if (subcategory) {
                                  if (subcategory === '50% Off' && listing.discountCategory !== '50-off') return false;
                                  if (subcategory === '10% Off' && listing.discountCategory !== '10-off') return false;
                                  if (subcategory === 'Packages under 10K' && !(priceVal > 0 && priceVal < 10000)) return false;
                                  if (subcategory === 'Flash Deals' && listing.discountCategory !== 'flash-deals') return false;
                                } else {
                                  const hasOffer = (listing.discountCategory && listing.discountCategory !== 'none') || (priceVal > 0 && priceVal < 10000);
                                  if (!hasOffer) return false;
                                }
                              }

                              else if (category === 'seasons') {
                                if (subcategory) {
                                  const seasonVal = (listing.season || '').toLowerCase();
                                  if (subcategory === 'Summer Retreats' && seasonVal !== 'summer') return false;
                                  if (subcategory === 'Monsoon Magic' && seasonVal !== 'monsoon') return false;
                                  if (subcategory === 'Winter Wonderland' && seasonVal !== 'winter') return false;
                                  if (subcategory === 'Spring Getaways' && seasonVal !== 'spring') return false;
                                }
                              }

                              else if (category === 'events') {
                                if (subcategory) {
                                  const ev = (listing.eventType || '').toLowerCase();
                                  if (subcategory === 'New Year & Christmas' && ev !== 'new-year') return false;
                                  if (subcategory === 'Diwali Specials' && ev !== 'diwali') return false;
                                  if (subcategory === 'Summer Vacations' && ev !== 'summer-vacation') return false;
                                  if (subcategory === 'Long Weekend Escapes' && ev !== 'weekend') return false;
                                }
                              }

                              else if (category === 'experiences') {
                                if (subcategory) {
                                  let expArray: string[] = [];
                                  if (Array.isArray(listing.experienceType)) {
                                    expArray = listing.experienceType.map((e: any) => (e || '').toLowerCase());
                                  } else if (typeof listing.experienceType === 'string' && listing.experienceType) {
                                    expArray = [listing.experienceType.toLowerCase()];
                                  }

                                  if (subcategory === 'Trekking' && !expArray.includes('trekking')) return false;
                                  if (subcategory === 'Snow Enjoyment' && !expArray.includes('snow') && !expArray.includes('snow enjoyment')) return false;
                                  if (subcategory === 'Adventure' && !expArray.includes('adventure')) return false;
                                  if (subcategory === 'Water Sports' && !expArray.includes('water-sports') && !expArray.includes('water sports')) return false;
                                }
                              }
                            }

                            // 2. Apply search filter
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

                              // Match dynamic card details
                              const pickup = (listing.placesCovered?.[0]?.name || listing.stateName || 'Delhi').toLowerCase();
                              const drop = (listing.placesCovered?.[listing.placesCovered.length - 1]?.name || listing.stateName || 'Delhi').toLowerCase();
                              const code = (listing.id ? listing.id.slice(-4) : '1045').toLowerCase();
                              const tourCats = (Array.isArray(listing.tourCategories) ? listing.tourCategories : typeof listing.tourCategories === 'string' ? [listing.tourCategories] : [])
                                .map((c: any) => String(c).toLowerCase()).join(' ');
                              const inclusions = (Array.isArray(listing.inclusions) ? listing.inclusions : typeof listing.inclusions === 'string' ? [listing.inclusions] : [])
                                .map((i: any) => String(i).toLowerCase()).join(' ');
                              const agencyName = (listing.agencyName || '').toLowerCase();
                              const places = (Array.isArray(listing.placesCovered) ? listing.placesCovered : [])
                                .map((p: any) => String(p?.name || '').toLowerCase()).join(' ');

                              const matches = title.includes(searchLower) ||
                                description.includes(searchLower) ||
                                destination.includes(searchLower) ||
                                stateName.includes(searchLower) ||
                                countryName.includes(searchLower) ||
                                packageType.includes(searchLower) ||
                                type.includes(searchLower) ||
                                price.includes(searchLower) ||
                                duration.includes(searchLower) ||
                                itineraryDays.includes(searchLower) ||
                                pickup.includes(searchLower) ||
                                drop.includes(searchLower) ||
                                code.includes(searchLower) ||
                                tourCats.includes(searchLower) ||
                                inclusions.includes(searchLower) ||
                                agencyName.includes(searchLower) ||
                                places.includes(searchLower) ||
                                'sightseeing'.includes(searchLower) ||
                                'transport'.includes(searchLower) ||
                                'hotel stay'.includes(searchLower) ||
                                'meal'.includes(searchLower);

                              if (!matches) {
                                return false;
                              }
                            }

                            // 3. Apply budget price range filter
                            const rawPrice = (listing.cost || listing.price || '0').toString();
                            const cleanedPrice = rawPrice.replace(/[^0-9.]/g, '');
                            const priceVal = parseFloat(cleanedPrice || '0');
                            if (priceVal > 0) {
                              const [minPrice, maxPrice] = filters.priceRange;
                              if (priceVal < minPrice || priceVal > maxPrice) {
                                return false;
                              }
                            }

                            return true;
                          });

                        if (filtered.length === 0) {
                          return (
                            <div className="col-span-full py-16 flex flex-col items-center justify-center bg-gray-50/50 rounded-3xl border border-gray-100 border-dashed">
                              <Search className="h-10 w-10 text-gray-400 mb-4" />
                              <h3 className="text-lg font-bold text-gray-800 mb-1">No packages match this filter</h3>
                              <p className="text-gray-500 text-sm text-center max-w-sm">
                                Try adjusting your filter category or searching for another destination!
                              </p>
                            </div>
                          );
                        }

                        return filtered.map((listing) => (
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
                        ));
                      })()}
                    </div>
                  )}

                </div>
              )}

              {showBookingForm && userActiveSection === 'listings' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Calendar className="mr-2 h-5 w-5 text-blue-600" />
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
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${step <= bookingStep ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-500'
                            }`}>
                            {step}
                          </div>
                          {step < 4 && (
                            <div className={`w-12 h-1 mx-2 ${step < bookingStep ? 'bg-blue-500' : 'bg-gray-200'
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
                                onChange={(e) => setBookingData({ ...bookingData, insurance: e.target.checked })}
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
                                onChange={(e) => setBookingData({ ...bookingData, paymentMethod: e.target.checked ? 'pay_later' : 'pay_now' })}
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
                              onChange={(e) => setBookingData({ ...bookingData, emergencyContact: e.target.value })}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="dietaryRestrictions">Dietary Restrictions</Label>
                            <Input
                              id="dietaryRestrictions"
                              placeholder="Any dietary restrictions or allergies"
                              value={bookingData.dietaryRestrictions}
                              onChange={(e) => setBookingData({ ...bookingData, dietaryRestrictions: e.target.value })}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="accessibilityNeeds">Accessibility Needs</Label>
                            <Input
                              id="accessibilityNeeds"
                              placeholder="Any mobility or accessibility requirements"
                              value={bookingData.accessibilityNeeds}
                              onChange={(e) => setBookingData({ ...bookingData, accessibilityNeeds: e.target.value })}
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
                              onChange={(e) => setBookingData({ ...bookingData, bookingNotes: e.target.value })}
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
                  onWishlist={handleWishlistToggle}
                  isWishlisted={wishlist.includes(viewingListing.id)}
                />
              )}

              {/* Package Comparison View */}
              {showComparison && userActiveSection === 'listings' && (
                <PackageComparison
                  onBack={() => {
                    const returnUrl = sessionStorage.getItem('tripdm_return_url');
                    if (returnUrl) {
                      sessionStorage.removeItem('tripdm_return_url');
                      window.location.href = returnUrl;
                    } else {
                      setShowComparison(false);
                    }
                  }}
                  onChat={(agencyId: string, agencyName: string) => {
                    setShowComparison(false);
                    setCurrentChatAgency(agencyId);
                    setCurrentChatAgencyName(agencyName);
                    const matchedConv = userConversations.find(c => c.agencyId === agencyId);
                    setCurrentChatAgencyIsOnline(matchedConv ? matchedConv.isOnline : false);
                    setUserActiveSection('chat');
                  }}
                  onView={(pkg) => {
                    setShowComparison(false);
                    setViewingListing(pkg);
                  }}
                />
              )}

              {userActiveSection === 'bookings' && (
                <div className="min-h-screen bg-gray-50 -mx-6">
                  {/* Hero Banner for Bookings */}
                  <div className="w-full bg-gradient-to-r from-[#1C1F26] to-[#2B2F3A] py-12 px-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 opacity-5 pointer-events-none select-none"><Plane className="w-64 h-64" /></div>
                    <div className="absolute bottom-0 left-20 opacity-5 pointer-events-none select-none"><MapIcon className="w-52 h-52" /></div>
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
                            <Plane className="h-16 w-16 text-white" />
                          </div>
                          <h3 className="text-3xl font-extrabold text-gray-900 mb-3">No Trips Booked Yet</h3>
                          <p className="text-gray-500 text-lg max-w-md mx-auto mb-8 leading-relaxed">
                            Your travel adventures will appear here. Explore our amazing packages and book your first unforgettable trip!
                          </p>
                          <button
                            onClick={() => setUserActiveSection('listings')}
                            className="bg-[#FF9900] hover:bg-[#E68A00] text-white rounded-full px-10 py-4 text-lg font-bold shadow-xl transition-all duration-300 hover:-translate-y-1"
                          >
                            <span className="flex items-center justify-center gap-2"><Globe className="h-5 w-5" /> Explore Packages</span>
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
                            <div key={booking.id} className={`rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 border ${isConfirmed ? 'border-green-200' : isPending ? 'border-amber-200' : 'border-red-200'
                              }`}>

                              {/* ── TICKET HEADER ── */}
                              <div className={`relative px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${isConfirmed
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
                                    {isIntl ? <Globe className="h-7 w-7 text-white" /> : <Mountain className="h-7 w-7 text-white" />}
                                  </div>
                                  <div>
                                    <p className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-0.5">{isIntl ? 'International Tour' : 'Domestic Tour'}</p>
                                    <h3 className="text-white font-extrabold text-xl leading-tight">{booking.listingTitle || 'Travel Package'}</h3>
                                    <p className="text-white/70 text-sm mt-0.5">by <span className="font-semibold text-white/90">{booking.agencyName}</span></p>
                                  </div>
                                </div>

                                <div className="flex flex-col items-start sm:items-end gap-2 shrink-0">
                                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest border ${isConfirmed ? 'bg-green-400/20 text-green-200 border-green-400/40' :
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
                                    { label: 'DEPARTURE DATE', value: booking.travelDate || 'TBD', icon: <Calendar className="h-3.5 w-3.5" /> },
                                    { label: 'PASSENGERS', value: `${booking.travelers} ${booking.travelers === 1 ? 'Person' : 'People'}`, icon: <User className="h-3.5 w-3.5" /> },
                                    { label: 'TOTAL FARE', value: `${currency}${totalAmt}`, icon: <CreditCard className="h-3.5 w-3.5" />, green: true },
                                    { label: 'BOOKED ON', value: booking.createdAtFormatted || '—', icon: <Calendar className="h-3.5 w-3.5" /> },
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
                                      <User className="h-3.5 w-3.5" /> Passenger Info
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
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                                      <ClipboardList className="h-3.5 w-3.5" /> {isConfirmed ? 'Booking Status' : isPending ? 'Status Update' : 'Cancellation'}
                                    </p>
                                    {isConfirmed && (
                                      <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                                          <CheckCircle2 className="h-5 w-5 text-green-600" />
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
                                          <Clock className="h-5 w-5 text-amber-600" />
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
                                          <XCircle className="h-5 w-5 text-red-600" />
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
                                      <MapIcon className="h-3.5 w-3.5" /> Journey Preview
                                    </p>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                      {booking.journeyDetails.flight && (
                                        <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
                                          <p className="text-[10px] text-blue-500 font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><Plane className="h-3 w-3" /> Flight</p>
                                          <p className="text-sm text-gray-700 font-medium">{booking.journeyDetails.flight}</p>
                                        </div>
                                      )}
                                      {booking.journeyDetails.hotel && (
                                        <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
                                          <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><Building className="h-3 w-3" /> Hotel</p>
                                          <p className="text-sm text-gray-700 font-medium">{booking.journeyDetails.hotel}</p>
                                        </div>
                                      )}
                                      {booking.journeyDetails.itinerary && (
                                        <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
                                          <p className="text-[10px] text-purple-500 font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><ClipboardList className="h-3 w-3" /> Itinerary</p>
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
                                        <ClipboardList className="h-4 w-4" /> View Details
                                      </button>
                                    )}
                                    {isConfirmed && (
                                      <button
                                        className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 border border-gray-300 bg-white hover:bg-gray-100 text-gray-705 rounded-xl px-5 py-2.5 font-semibold text-sm transition-all"
                                        onClick={() => window.print()}
                                      >
                                        <Info className="h-4 w-4" /> Print
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
                <div className="flex flex-col md:flex-row flex-1 min-h-0 w-full bg-white">
                  {/* Left Column: Conversations List */}
                  <div className="w-full md:w-80 flex-shrink-0 border-r border-gray-200 bg-white flex flex-col h-full z-10">
                    {/* Sidebar Header */}
                    <div className="p-4 border-b border-gray-200 bg-white shrink-0">
                      <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                        <MessageSquare className="h-5 w-5 text-blue-600" /> Messages
                      </h3>
                      <p className="text-[10px] text-gray-450 mt-0.5">Agencies you've contacted</p>
                    </div>

                    {/* Search Bar */}
                    <div className="px-4 pb-3 bg-white border-b border-gray-150 shrink-0">
                      <div className="relative">
                        <Input
                          type="text"
                          placeholder="Search conversations..."
                          className="w-full pl-8 pr-3 py-1.5 rounded-full text-[11px] border border-gray-200 bg-gray-50/80 focus-visible:ring-orange-500 focus-visible:bg-white h-8"
                          value={chatSearchQuery}
                          onChange={(e) => setChatSearchQuery(e.target.value)}
                        />
                        <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-gray-400" />
                      </div>
                    </div>

                    {/* Scrollable Agency List */}
                    <div className="flex-1 p-3 space-y-2 sidebar-scroll">
                      {userConversations.filter(c => c.agencyName.toLowerCase().includes(chatSearchQuery.toLowerCase())).length === 0 ? (
                        <div className="text-center py-12">
                          <Building className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                          <p className="text-xs text-gray-400 font-semibold">No conversations found</p>
                          <p className="text-[10px] text-gray-400 mt-1 px-4">Contact an agency from a listing card to start chatting.</p>
                        </div>
                      ) : (
                        userConversations
                          .filter(c => c.agencyName.toLowerCase().includes(chatSearchQuery.toLowerCase()))
                          .map((conversation) => {
                            const isActive = currentChatAgency === conversation.agencyId;
                            const initials = conversation.agencyName ? conversation.agencyName.slice(0, 2).toUpperCase() : 'AG';
                            return (
                              <div
                                key={conversation.agencyId}
                                onClick={() => {
                                  setCurrentChatAgency(conversation.agencyId);
                                  setCurrentChatAgencyName(conversation.agencyName);
                                  setCurrentChatAgencyIsOnline(conversation.isOnline || false);
                                  setCurrentChatAgencyLogo(conversation.logoUrl || null);
                                }}
                                className={`p-3 rounded-2xl cursor-pointer transition-all duration-200 flex items-center gap-3 border border-l-4 ${
                                  isActive
                                    ? 'bg-orange-50/45 border-orange-500 border-l-orange-600 shadow-sm ring-1 ring-orange-500/10'
                                    : 'bg-white/60 hover:bg-white border-transparent border-l-transparent hover:shadow-sm'
                                }`}
                              >
                                {/* Avatar */}
                                <div className={`w-9 h-9 text-white rounded-full flex items-center justify-center font-bold text-xs shrink-0 shadow-sm relative ${
                                  !conversation.logoUrl && conversation.isOnline ? 'bg-orange-600' : (!conversation.logoUrl ? 'bg-slate-900' : '')
                                }`}>
                                  {conversation.logoUrl ? (
                                    <img src={conversation.logoUrl} alt={initials} className="w-full h-full object-cover rounded-full" />
                                  ) : (
                                    initials
                                  )}
                                  {conversation.isOnline && (
                                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full z-10" />
                                  )}
                                </div>
                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between mb-0.5">
                                    <span className="font-semibold text-xs text-gray-900 truncate pr-2">
                                      {conversation.agencyName}
                                    </span>
                                    <span className={`text-[9px] font-semibold shrink-0 ${
                                      conversation.isOnline ? 'text-orange-600' : 'text-gray-400'
                                    }`}>
                                      {conversation.isOnline ? 'Online' : 'Offline'}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-gray-500 truncate">
                                    {conversation.lastMessage || "No messages yet"}
                                  </p>
                                </div>
                              </div>
                            );
                          })
                      )}
                    </div>
                  </div>

                  {/* Right Column: Chat Content */}
                  <div className="flex-1 flex flex-col h-full bg-[#efeae2] bg-[radial-gradient(#d1ccc5_1.2px,transparent_1.2px)] [background-size:20px_20px]">
                    {currentChatAgency ? (
                      <div className="flex flex-col h-full relative">
                        {/* Conversation Header */}
                        <div className="px-6 py-3 bg-[#f0f2f5] border-b border-gray-200 flex items-center justify-between z-10 shrink-0">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-orange-100 text-orange-755 rounded-full flex items-center justify-center font-bold text-xs shadow-inner">
                              {currentChatAgencyLogo ? (
                                <img src={currentChatAgencyLogo} alt={currentChatAgencyName || 'AG'} className="w-full h-full object-cover rounded-full" />
                              ) : (
                                currentChatAgencyName ? currentChatAgencyName.slice(0, 2).toUpperCase() : 'AG'
                              )}
                            </div>
                            <div>
                              <h4 className="font-bold text-xs text-gray-900">{currentChatAgencyName}</h4>
                              {currentChatAgencyIsOnline ? (
                                <span className="text-[9px] text-emerald-600 font-semibold flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                  Online
                                </span>
                              ) : (
                                <span className="text-[9px] text-gray-500 font-medium flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
                                  Offline
                                </span>
                              )}
                            </div>
                          </div>
                          
                          {/* Close/Back Button */}
                          <button 
                            onClick={() => {
                              setCurrentChatAgency('');
                              setCurrentChatAgencyName('');
                              setCurrentChatAgencyIsOnline(false);
                              setCurrentChatAgencyLogo(null);
                            }}
                            className="text-gray-400 hover:text-gray-650 p-1.5 hover:bg-gray-100 rounded-xl transition-all"
                            title="Close Chat"
                          >
                            ✕
                          </button>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 p-6 space-y-4 chat-scroll">
                          {[...chatMessages]
                            .filter(msg => msg.chatId === [user?.uid, currentChatAgency].sort().join('_'))
                            .sort((a, b) => a.timestamp - b.timestamp)
                            .map((msg, index) => {
                              const isSelf = msg.sender === user?.uid;
                              return (
                                <div key={msg.id || index} className={`flex ${isSelf ? 'justify-end' : 'justify-start'}`}>
                                  <div 
                                    className={`max-w-[75%] px-4 py-2.5 rounded-2xl shadow-sm leading-relaxed text-sm border-r-4 ${
                                      isSelf 
                                        ? 'bg-[#1C1F26] text-white rounded-tr-none border-r-orange-500 shadow-md shadow-slate-900/10' 
                                        : 'bg-white text-gray-900 border border-gray-150 rounded-tl-none border-r-transparent'
                                    }`}
                                  >
                                    <p className="break-words">{msg.text}</p>
                                    <span className={`text-[9px] mt-1.5 block text-right font-semibold ${isSelf ? 'text-orange-300' : 'text-gray-450'}`}>
                                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          <div ref={userChatEndRef} />
                        </div>

                        {/* Message Input Box & Quick Replies */}
                        <div className="bg-white border-t border-gray-150 flex flex-col shrink-0">
                          {/* Quick Replies */}
                          {(() => {
                            const currentChatMsgs = chatMessages.filter(msg => msg.chatId === [user?.uid, currentChatAgency].sort().join('_'));
                            const mySentTexts = new Set(currentChatMsgs.filter(msg => msg.sender === user?.uid).map(msg => msg.text));
                            const baseBuyerReplies = [...BUYER_QUICK_REPLIES, ...adminBuyerReplies];
                            if (profilePhone) {
                              baseBuyerReplies.push(`Here is my contact number: ${profilePhone}`);
                            } else if (profileEmail) {
                              baseBuyerReplies.push(`Please contact me at ${profileEmail}`);
                            }
                            const availableBuyerReplies = baseBuyerReplies.filter(reply => !mySentTexts.has(reply));
                            
                            if (availableBuyerReplies.length === 0) return null;
                            return (
                              <div className="px-4 pt-3 pb-1 flex flex-wrap gap-2">
                                {availableBuyerReplies.map((reply, idx) => (
                                  <button
                                    key={idx}
                                    onClick={async () => {
                                      if (!user) return;
                                      const messageData = {
                                        from_user_id: user.uid,
                                        to_user_id: currentChatAgency,
                                        content: reply,
                                        timestamp: Date.now(),
                                        status: 'sent'
                                      };
                                      const dbInstance = getDbInstance();
                                      if (dbInstance) await addDoc(collection(dbInstance, 'chat_messages'), messageData);
                                    }}
                                    className="shrink-0 px-3 py-1.5 bg-gray-50 hover:bg-orange-50 text-gray-600 hover:text-orange-600 border border-gray-200 hover:border-orange-200 text-xs rounded-full whitespace-nowrap transition-all shadow-sm active:scale-95"
                                  >
                                    {reply}
                                  </button>
                                ))}
                              </div>
                            );
                          })()}

                          <div className="px-4 py-3 bg-[#f0f2f5] flex items-center gap-3 relative shrink-0">
                            {/* Emoji Visual Indicator */}
                          <div className="relative shrink-0">
                            <button 
                              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                              className="text-gray-400 hover:text-gray-600 transition-colors text-lg focus:outline-none flex items-center justify-center" 
                              title="Add Emoji"
                            >
                              <Smile className="h-5 w-5 text-gray-500" />
                            </button>
                            
                            {showEmojiPicker && (
                              <div className="absolute bottom-12 left-0 bg-white border border-gray-200 rounded-3xl p-3 shadow-xl z-30 w-56 animate-in slide-in-from-bottom-2 duration-150">
                                <div className="grid grid-cols-6 gap-1.5 max-h-32 overflow-y-auto">
                                  {['😊', '😂', '🤣', '👍', '❤️', '🔥', '✈️', '🏝️', '🗺️', '🏨', '🚗', '👏', '😍', '🎉', '🙌', '🙏', '✨', '🌍', '🌅', '🎒', '💬', '🎫', '🏝', '⛰', '🌟', '🛶', '🏄', '🏔', '⛺', '🧭'].map((emoji) => (
                                    <button
                                      key={emoji}
                                      onClick={() => {
                                        setChatInput((prev) => prev + emoji);
                                        setShowEmojiPicker(false);
                                      }}
                                      className="hover:bg-gray-100 p-1.5 rounded-lg text-lg transition-all active:scale-90 flex items-center justify-center"
                                    >
                                      {emoji}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                          <Input
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            placeholder="Type your message..."
                            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                            className="flex-1 rounded-full border-gray-200 px-5 py-2.5 bg-gray-50/80 focus-visible:ring-orange-500 focus-visible:bg-white text-gray-900 text-xs h-10"
                          />
                          
                          <button 
                            onClick={sendMessage} 
                            disabled={!chatInput.trim()}
                            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all shadow-md shrink-0 ${
                              chatInput.trim()
                                ? 'bg-[#1C1F26] hover:bg-black text-white active:scale-95' 
                                : 'bg-gray-100 text-gray-300 cursor-not-allowed shadow-none'
                            }`}
                            title="Send Message"
                          >
                            <span className="text-xs font-bold leading-none transform translate-x-px -translate-y-px">➤</span>
                          </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-[#f0f2f5]">
                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-6">
                          <Plane className="h-8 w-8 text-blue-600" />
                        </div>
                        <h4 className="font-extrabold text-gray-900 text-sm mb-2">Your Inbox</h4>
                        <p className="text-xs text-gray-500 max-w-sm leading-relaxed">
                          Select an agency from the sidebar list to discuss itineraries, pricing details, or get support.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {userActiveSection === 'wishlist' && (
                <WishlistView 
                  wishlist={wishlist}
                  listings={listings}
                  onWishlistToggle={handleWishlistToggle}
                  onView={(listing) => {
                    setViewingListing(listing);
                    setUserActiveSection('listings');
                  }}
                  onExplore={() => setUserActiveSection('listings')}
                  onBack={() => {
                    const returnUrl = sessionStorage.getItem('tripdm_return_url');
                    if (returnUrl) {
                      sessionStorage.removeItem('tripdm_return_url');
                      window.location.href = returnUrl;
                    } else {
                      setUserActiveSection(fromSection === 'wishlist' ? 'listings' : fromSection);
                    }
                  }}
                />
              )}

              {userActiveSection === 'profile' && (
                <UserProfile
                  user={user}
                  userData={userData}
                  wishlist={wishlist}
                  coTravellers={coTravellers}
                  setCoTravellers={setCoTravellers}
                  profileName={profileName}
                  setProfileName={setProfileName}
                  profilePhone={profilePhone}
                  setProfilePhone={setProfilePhone}
                  profilePhotoUrl={profilePhotoUrl}
                  handleProfilePhotoChange={handleProfilePhotoChange}
                  isEditingProfile={isEditingProfile}
                  setIsEditingProfile={setIsEditingProfile}
                  savingProfile={savingProfile}
                  handleSaveProfile={handleSaveProfile}
                  onNavigateToWishlist={() => {
                    setFromSection('profile');
                    setUserActiveSection('wishlist');
                  }}
                />
              )}

              {userActiveSection === 'support' && (
                <div className="py-6 animate-in fade-in duration-200">
                  {/* HERO HEADER */}
                  <div className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white rounded-3xl p-8 mb-8 shadow-lg relative overflow-hidden">
                    <div className="absolute right-10 bottom-0 opacity-10 pointer-events-none select-none"><Shield className="w-56 h-56" /></div>
                    <div className="relative z-10 max-w-2xl">
                      <div className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full mb-4">
                        <Shield className="h-4 w-4 text-white" /> Platform Dispute Resolution Center
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
                          <Pencil className="h-5 w-5 text-blue-600" /> Submit a Dispute / Help Ticket
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
                              className="mt-1.5 block w-full p-3 border border-gray-200 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-orange-400 rounded-xl text-sm font-medium transition-colors"
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
                              className="mt-1.5 block w-full p-3 border border-gray-200 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-orange-400 rounded-xl text-sm font-medium transition-colors animate-none"
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
                              className="mt-1.5 block w-full p-3 border border-gray-200 focus:bg-white focus:ring-2 focus:ring-orange-400 rounded-xl text-sm transition-colors"
                              required
                            />
                          </div>

                          {/* Submit Button */}
                          <div className="pt-2">
                            <Button
                              type="submit"
                              disabled={submittingSupportTicket}
                              className="w-full sm:w-auto px-6 py-2.5 bg-orange-400 hover:bg-orange-500 text-white font-bold rounded-xl shadow-md transition-colors border-none cursor-pointer"
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
                          <Shield className="h-5 w-5 text-blue-500" /> Platform Protection Policy
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
                          <ClipboardList className="h-5 w-5 text-blue-600" /> Dispute Tickets History ({supportTickets.length})
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
            {userActiveSection !== 'chat' && userActiveSection !== 'wishlist' && userActiveSection !== 'profile' && !showComparison && userActiveSection !== 'comparison' && <Footer />}
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
                    <Star className="mr-2 h-6 w-6 text-yellow-500 fill-yellow-500" />
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
                          onClick={() => setNewReview({ ...newReview, rating: star })}
                          className={`p-1 ${newReview.rating >= star ? 'text-yellow-500' : 'text-gray-300'}`}
                        >
                          <Star className={`h-8 w-8 ${newReview.rating >= star ? 'fill-yellow-500 text-yellow-500' : 'text-gray-300'}`} />
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
                      onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
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

          {/* Pincode Change Modal Removed */}

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
                    <div className="w-16 h-16 bg-white text-blue-700 rounded-2xl flex items-center justify-center shadow-md">
                      <Building className="h-8 w-8 text-blue-700" />
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
                        <MessageSquare className="h-5 w-5 text-blue-500" />
                        <div>
                          <p className="font-bold text-gray-900 leading-tight">Direct Chat</p>
                          <p className="text-[9px] text-gray-505 mt-0.5">Unlimited messaging</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-650 bg-gray-50 border p-2.5 rounded-xl">
                        <ClipboardList className="h-5 w-5 text-blue-500" />
                        <div>
                          <p className="font-bold text-gray-900 leading-tight">Custom Quotes</p>
                          <p className="text-[9px] text-gray-505 mt-0.5">Personalized plans</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-650 bg-gray-50 border p-2.5 rounded-xl">
                        <Phone className="h-5 w-5 text-blue-500" />
                        <div>
                          <p className="font-bold text-gray-900 leading-tight">Direct Call</p>
                          <p className="text-[9px] text-gray-505 mt-0.5">Callbacks enabled</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-650 bg-gray-50 border p-2.5 rounded-xl">
                        <Sparkles className="h-5 w-5 text-blue-500" />
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
                      <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
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
                      onClick={() => unlockCustomerChat(chatUnlockTarget.agencyId, chatUnlockTarget.agencyName)}
                      className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white rounded-xl text-xs font-extrabold border-none transition-all hover:scale-[1.02] active:scale-[0.98] shadow-md cursor-pointer"
                    >
                      <span className="flex items-center justify-center gap-2">Confirm & Connect <Sparkles className="h-4 w-4" /></span>
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
                  <div className="absolute inset-0 flex items-center justify-center">
                    <CreditCard className="h-6 w-6 text-blue-600" />
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
              <div className={`flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl border backdrop-blur-md transition-all duration-300 ${toast.type === 'success' ? 'bg-emerald-50/90 border-emerald-200 text-emerald-900 shadow-emerald-100/50' :
                  toast.type === 'error' ? 'bg-rose-50/90 border-rose-200 text-rose-900 shadow-rose-100/50' :
                    'bg-sky-50/90 border-sky-200 text-sky-900 shadow-sky-100/50'
                }`}>
                <span className="flex items-center justify-center">
                  {toast.type === 'success' && <CheckCircle className="h-5 w-5 text-emerald-600" />}
                  {toast.type === 'error' && <AlertCircle className="h-5 w-5 text-rose-600" />}
                  {toast.type === 'info' && <Info className="h-5 w-5 text-sky-600" />}
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

          {/* Auth Modal overlay for User Dashboard */}
          <AuthModal
            isOpen={showAuthModal}
            onClose={() => setShowAuthModal(false)}
            initialTab={authModalTab}
            onLogin={signIn}
            onRegister={handleAuthModalRegister}
            onGoogleSignIn={signInWithGoogle}
            googleUser={user}
          />
        </div>
      );
    }

  // Agency Dashboard
  if (user && userData?.role === 'agency') {
    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
          <div className="w-64 bg-white border-r border-gray-200 flex flex-col z-20 shrink-0">
            <div className="p-6 border-b border-gray-200 flex flex-col items-center text-center shrink-0">
              <div className="w-20 h-20 rounded-2xl bg-white border border-gray-200 shadow-sm flex items-center justify-center overflow-hidden mb-4 shrink-0">
                {(agencyLogoUrl || userData?.logoUrl || userData?.agencyLogo) ? (
                  <img
                    src={agencyLogoUrl || userData?.logoUrl || userData?.agencyLogo}
                    alt={userData?.companyName || 'Agency Logo'}
                    className="w-full h-full object-contain p-1"
                    onError={() => setAgencyLogoError(true)}
                  />
                ) : (
                  <Building2 className="h-8 w-8 text-indigo-500" />
                )}
              </div>
              <div className="w-full">
                <h2 className="text-base font-bold text-gray-900 truncate">{userData?.companyName || 'Travel Agency'}</h2>
                <p className="text-xs text-gray-500 mt-0.5 truncate">{userData?.companyName ? 'Travel Agency Partner' : 'Registered Agency'}</p>
              </div>
            </div>
            
            <nav className="p-4 flex-1 overflow-y-auto sidebar-scroll">
              <div className="space-y-1">
                <button
                  onClick={() => setAgencyActiveSection('listings')}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-3 ${agencyActiveSection === 'listings'
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                    }`}
                >
                  <ClipboardList className="h-4 w-4" /> Listings
                </button>

                <button
                  onClick={() => setAgencyActiveSection('chat')}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-3 ${agencyActiveSection === 'chat'
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                    }`}
                >
                  <MessageSquare className="h-4 w-4" /> Customer Chat
                </button>

                <button
                  onClick={() => setAgencyActiveSection('credits')}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-3 ${agencyActiveSection === 'credits'
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                    }`}
                >
                  <CreditCard className="h-4 w-4" /> Plan & Credits
                </button>

                <button
                  onClick={() => setAgencyActiveSection('settings')}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-3 ${agencyActiveSection === 'settings'
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                    }`}
                >
                   <Settings className="h-4 w-4" /> Settings
                </button>
              </div>
            </nav>
            
            {userData?.approved && (
              <div className="p-4 border-t border-gray-200 bg-gray-50/50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">
                      Plan: <span className="text-blue-600">{userData?.plan || 'Free'}</span>
                    </p>
                    <p className="text-xs font-semibold text-gray-900">
                      {`${userData?.credits ?? 0} Credits`}
                    </p>
                  </div>
                  <button
                    onClick={() => setAgencyActiveSection('credits')}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded transition-colors"
                  >
                    Upgrade
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex-1 flex flex-col min-w-0 bg-gray-50/50">
            <header className="h-16 sticky top-0 z-10 bg-white border-b border-gray-200 px-8 flex items-center justify-between shrink-0">
              <h1 className="text-xl font-semibold text-gray-900">
                {agencyActiveSection === 'overview' && 'Agency Overview'}
                {agencyActiveSection === 'listings' && 'Travel Listings'}
                {agencyActiveSection === 'bookings' && 'Booking Management'}
                {agencyActiveSection === 'chat' && 'Customer Chat'}
                {agencyActiveSection === 'credits' && 'Plan & Credits'}
                {agencyActiveSection === 'settings' && 'Agency Settings'}
              </h1>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600 flex items-center gap-1">Status: {userData?.approved ? <span className="flex items-center gap-1"><CheckCircle className="h-4 w-4 text-green-600" /> Approved</span> : <span className="flex items-center gap-1"><Clock className="h-4 w-4 text-yellow-600" /> Pending</span>}</span>
                <Button variant="outline" size="sm" onClick={signOut}>Sign Out</Button>
              </div>
            </header>

            <main className={`overflow-y-auto dashboard-scroll ${agencyActiveSection === 'chat' ? 'flex-1 flex flex-col min-h-0 p-0' : 'flex-1 p-8'}`}>
              {userData?.approved ? (
                <>
                  {agencyActiveSection === 'overview' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                      <Card>
                        <CardContent className="p-6">
                          <div className="flex items-center">
                            <div className="p-2 bg-blue-100 rounded-lg">
                              <Users className="h-6 w-6 text-blue-600" />
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
                              <CheckCircle className="h-6 w-6 text-green-600" />
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
                              <Clock className="h-6 w-6 text-yellow-600" />
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
                          <ClipboardList className="h-4 w-4" /> My Listings
                        </Button>
                        <Button
                          variant={showListingForm ? 'default' : 'outline'}
                          onClick={() => {
                            const currentPlan = userData?.plan || 'free';
                            const maxListings = currentPlan === 'free' ? 2 : currentPlan === 'starter' ? 10 : currentPlan === 'premium' ? 50 : 10000;
                            if (agencyListings.length >= maxListings) {
                              alert(`Listing limit reached for your current plan (${maxListings} max). Please upgrade to add more listings.`);
                              return;
                            }
                            setShowListingForm(true);
                            setShowBulkUpload(false);
                            setEditingListing(null);
                            setViewingListing(null);
                          }}
                          className="flex items-center gap-2"
                        >
                          <Plus className="h-4 w-4" /> New Listing
                        </Button>
                        <Button
                          variant={showBulkUpload ? 'default' : 'outline'}
                          onClick={() => {
                            const currentPlan = userData?.plan || 'free';
                            const maxListings = currentPlan === 'free' ? 2 : currentPlan === 'starter' ? 10 : currentPlan === 'premium' ? 50 : 10000;
                            if (agencyListings.length >= maxListings) {
                              alert(`Listing limit reached for your current plan (${maxListings} max). Please upgrade to add more listings.`);
                              return;
                            }
                            setShowBulkUpload(true);
                            setShowListingForm(false);
                            setEditingListing(null);
                            setViewingListing(null);
                          }}
                          className="flex items-center gap-2"
                        >
                          <Upload className="h-4 w-4" /> Bulk Import CSV
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
                              <Palmtree className="mr-2 h-6 w-6 text-blue-600" />
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
                                    <ClipboardList className="h-8 w-8 text-blue-600" />
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
                                    <Plus className="h-4 w-4" /> Create Your First Listing
                                  </Button>
                                </div>
                              ) : (
                                agencyListings.map((listing) => (
                                  <div key={listing.id} className="flex items-center justify-between p-4 border rounded-lg">
                                    <div className="flex items-center space-x-4">
                                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                        <Palmtree className="h-6 w-6 text-blue-600" />
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
                                          <span className={`ml-2 px-2 py-1 rounded-full text-xs ${listing.approved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
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
                                      {/* <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleViewListing(listing)}
                                      >
                                        View
                                      </Button> */}
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

                  {agencyActiveSection === 'bookings' && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card>
                          <CardContent className="p-6">
                            <div className="flex items-center">
                              <div className="p-2 bg-blue-100 rounded-lg">
                                <Calendar className="h-6 w-6 text-blue-600" />
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
                                <Clock className="h-6 w-6 text-yellow-600" />
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
                                <CheckCircle className="h-6 w-6 text-green-600" />
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
                            <Calendar className="mr-2 h-6 w-6 text-blue-600" />
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
                                <Calendar className="h-8 w-8 text-blue-600" />
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
                                      <User className="h-6 w-6 text-blue-600" />
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
                                        {booking.userEmail} • {(userData?.role === 'agency' && (userData?.plan === 'free' || !userData?.plan)) && booking.userPhone ? (
                                          <span 
                                            className="select-none inline-block bg-gray-200/50 rounded px-1"
                                            style={{ filter: 'blur(4px)' }}
                                            title="Upgrade plan to view phone number"
                                          >
                                            [Phone Blurred]
                                          </span>
                                        ) : (
                                          booking.userPhone || 'No phone'
                                        )}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex flex-col items-end space-y-2">
                                    <span className={`px-2 py-1 rounded-full text-xs ${booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
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
                  {agencyActiveSection === 'chat' && (
                    <div className="bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-xl flex flex-col md:flex-row flex-1 min-h-0 min-w-0 w-full mb-6">
                      {/* Left Column: Conversations List */}
                      <div className="w-full md:w-80 flex-shrink-0 border-r border-gray-150 bg-gray-50/40 flex flex-col h-full">
                        {/* Sidebar Header */}
                        <div className="p-4 border-b border-gray-150 bg-white shrink-0">
                          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                            <Users className="h-5 w-5 text-blue-600" /> Conversations
                          </h3>
                          <p className="text-[10px] text-gray-450 mt-0.5">Customers who contacted you</p>
                        </div>

                        {/* Search Bar */}
                        <div className="px-4 pb-3 bg-white border-b border-gray-150 shrink-0">
                          <div className="relative">
                            <Input
                              type="text"
                              placeholder="Search conversations..."
                              className="w-full pl-8 pr-3 py-1.5 rounded-full text-[11px] border border-gray-200 bg-gray-50/80 focus-visible:ring-orange-500 focus-visible:bg-white h-8"
                              value={agencyChatSearchQuery}
                              onChange={(e) => setAgencyChatSearchQuery(e.target.value)}
                            />
                            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-gray-400" />
                          </div>
                        </div>

                        {/* Scrollable Customers List */}
                        <div className="flex-1 p-3 space-y-2 sidebar-scroll">
                          {agencyConversations.filter(c => c.userName.toLowerCase().includes(agencyChatSearchQuery.toLowerCase())).length === 0 ? (
                            <div className="text-center py-12">
                              <User className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                              <p className="text-xs text-gray-400 font-semibold">No conversations found</p>
                              <p className="text-[10px] text-gray-400 mt-1 px-4">Conversations will appear here once customers contact you.</p>
                            </div>
                          ) : (
                            agencyConversations
                              .filter(c => c.userName.toLowerCase().includes(agencyChatSearchQuery.toLowerCase()))
                              .map((conversation) => {
                                const isActive = selectedConversation?.userId === conversation.userId;
                                const initials = conversation.userName ? conversation.userName.slice(0, 2).toUpperCase() : 'US';
                                return (
                                  <div
                                    key={conversation.userId}
                                    onClick={() => {
                                      hasManuallyClosedChatRef.current = false;
                                      selectConversation(conversation);
                                    }}
                                    className={`p-3 rounded-2xl cursor-pointer transition-all duration-200 flex items-center gap-3 border border-l-4 ${
                                      isActive
                                        ? 'bg-orange-50/45 border-orange-500 border-l-orange-600 shadow-sm ring-1 ring-orange-500/10'
                                        : 'bg-white/60 hover:bg-white border-transparent border-l-transparent hover:shadow-sm'
                                    }`}
                                  >
                                    {/* Avatar */}
                                    <div className="w-9 h-9 text-white rounded-full flex items-center justify-center font-bold text-xs shrink-0 shadow-sm bg-slate-900 relative">
                                      {initials}
                                    </div>
                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center justify-between mb-0.5">
                                        <span className="font-semibold text-xs text-gray-900 truncate pr-2">
                                          {conversation.userName}
                                        </span>
                                      </div>
                                      <p className="text-[11px] text-gray-500 truncate">
                                        {conversation.lastMessage || "No messages yet"}
                                      </p>
                                    </div>
                                  </div>
                                );
                              })
                          )}
                        </div>
                      </div>

                      {/* Right Column: Chat Content */}
                      <div className="flex-1 flex flex-col h-full bg-[#FAF9F5] bg-[radial-gradient(#e5e7eb_1.2px,transparent_1.2px)] [background-size:20px_20px] min-w-0 overflow-hidden">
                        {selectedConversation ? (
                          <div className="flex flex-col h-full relative min-w-0 overflow-hidden">
                            {/* Conversation Header */}
                            {(() => {
                              const unlockRecord = (userData?.unlockedUsers as any[] || []).find((u: any) => typeof u === 'string' ? u === selectedConversation.userId : u.userId === selectedConversation.userId);
                              const isUnlocked = unlockRecord ? (typeof unlockRecord === 'string' ? true : (unlockRecord as any).expiresAt > Date.now()) : false;
                              const daysRemaining = (isUnlocked && unlockRecord && typeof unlockRecord !== 'string') 
                                ? Math.ceil(((unlockRecord as any).expiresAt - Date.now()) / (1000 * 60 * 60 * 24)) 
                                : null;

                              return (
                                <div className="px-6 py-3 bg-white border-b border-gray-150 flex items-center justify-between shadow-sm z-10 shrink-0">
                                  <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 bg-orange-100 text-orange-755 rounded-full flex items-center justify-center font-bold text-xs shadow-inner">
                                      {selectedConversation.userName ? selectedConversation.userName.slice(0, 2).toUpperCase() : 'US'}
                                    </div>
                                    <div>
                                      <h4 className="font-bold text-xs text-gray-900">{selectedConversation.userName}</h4>
                                      <span className="text-[9px] text-gray-500 font-medium flex items-center gap-2 mt-0.5">
                                        <span>Customer ID: {selectedConversation.userId.slice(0, 8)}</span>
                                        {daysRemaining !== null && (
                                          <span className="flex items-center gap-1 text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-100 font-bold">
                                            <Clock className="w-3 h-3" /> {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} left
                                          </span>
                                        )}
                                      </span>
                                    </div>
                                  </div>
                                  
                                  {/* Close/Back Button */}
                                  <button 
                                    onClick={() => {
                                      hasManuallyClosedChatRef.current = true;
                                      setSelectedConversation(null);
                                    }}
                                    className="text-gray-400 hover:text-gray-650 p-1.5 hover:bg-gray-100 rounded-xl transition-all"
                                    title="Close Chat"
                                  >
                                    ✕
                                  </button>
                                </div>
                              );
                            })()}

                            {/* Messages Area */}
                            <div className="flex-1 p-6 space-y-4 chat-scroll overflow-y-auto overflow-x-hidden w-full min-w-0">
                              {[...agencyChatMessages]
                                .filter(msg => msg.chatId === selectedConversation.chatId)
                                .sort((a, b) => a.timestamp - b.timestamp)
                                .map((msg, index) => {
                                  const isSelf = msg.sender === user?.uid;
                                  return (
                                    <div key={msg.id || index} className={`flex ${isSelf ? 'justify-end' : 'justify-start'}`}>
                                      <div 
                                        className={`max-w-[75%] px-4 py-2.5 rounded-2xl shadow-sm leading-relaxed text-sm border-r-4 ${
                                          isSelf 
                                            ? 'bg-[#1C1F26] text-white rounded-tr-none border-r-orange-500 shadow-md shadow-slate-900/10' 
                                            : 'bg-white text-gray-900 border border-gray-150 rounded-tl-none border-r-transparent'
                                        }`}
                                      >
                                        <p className="break-words">
                                          {renderMessageText(msg.text, userData?.role === 'agency' && (userData?.plan === 'free' || !userData?.plan))}
                                        </p>
                                        <span className={`text-[9px] mt-1.5 block text-right font-semibold ${isSelf ? 'text-orange-300' : 'text-gray-450'}`}>
                                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                              <div ref={agencyChatEndRef} />
                            </div>

                            {/* Message Input / Unlock Box */}
                            {(() => {
                              const checkIsUnlocked = (unlockedUsersList: any[], targetId: string) => {
                                const record = (unlockedUsersList || []).find((u: any) => typeof u === 'string' ? u === targetId : u.userId === targetId);
                                if (!record) return false;
                                if (typeof record === 'string') return true;
                                return (record as any).expiresAt > Date.now();
                              };
                              const isUnlocked = checkIsUnlocked(userData?.unlockedUsers || [], selectedConversation.userId);
                              const isFreePlan = (userData?.role as string) === 'agency' && (userData?.plan === 'free' || !userData?.plan);
                              const hasPhoneInInput = isFreePlan && agencyChatInput.replace(/\D/g, '').length >= 10;
                              return isUnlocked ? (
                                <div className="bg-white border-t border-gray-150 flex flex-col shrink-0 relative">
                                  {hasPhoneInInput && (
                                    <div className="absolute -top-8 left-4 text-[10px] font-bold text-red-500 bg-red-50 px-2.5 py-1 rounded-md border border-red-200 shadow-sm animate-pulse z-20">
                                      <span className="flex items-center gap-1"><AlertCircle className="h-3.5 w-3.5 text-red-500 shrink-0" /> Phone numbers cannot be sent on the Free Plan. Upgrade to Starter/Premium.</span>
                                    </div>
                                  )}

                                  {/* Quick Replies */}
                                  {(() => {
                                    const currentAgencyMsgs = agencyChatMessages.filter(msg => msg.chatId === [user?.uid, selectedConversation?.userId].sort().join('_'));
                                    const mySentAgencyTexts = new Set(currentAgencyMsgs.filter(msg => msg.sender === user?.uid).map(msg => msg.text));
                                    const availableSellerReplies = [...SELLER_QUICK_REPLIES, ...adminSellerReplies].filter(reply => !mySentAgencyTexts.has(reply));
                                    
                                    if (availableSellerReplies.length === 0) return null;
                                    return (
                                      <div className="px-4 pt-3 pb-1 flex flex-wrap gap-2">
                                        {availableSellerReplies.map((reply, idx) => (
                                          <button
                                            key={idx}
                                            onClick={async () => {
                                              if (!user || !selectedConversation) return;
                                              const messageData = {
                                                from_user_id: user.uid,
                                                to_user_id: selectedConversation.userId,
                                                content: reply,
                                                timestamp: Date.now(),
                                                status: 'sent'
                                              };
                                              const dbInstance = getDbInstance();
                                              if (dbInstance) await addDoc(collection(dbInstance, 'chat_messages'), messageData);
                                            }}
                                            className="shrink-0 px-3 py-1.5 bg-gray-50 hover:bg-orange-50 text-gray-600 hover:text-orange-600 border border-gray-200 hover:border-orange-200 text-xs rounded-full whitespace-nowrap transition-all shadow-sm active:scale-95"
                                          >
                                            {reply}
                                          </button>
                                        ))}
                                      </div>
                                    );
                                  })()}
                                  
                                  <div className="p-4 flex items-center gap-3 relative">
                                    {/* Emoji Visual Indicator */}
                                  <div className="relative shrink-0">
                                    <button 
                                      onClick={() => setShowAgencyEmojiPicker(!showAgencyEmojiPicker)}
                                      className="text-gray-400 hover:text-gray-600 transition-colors text-lg focus:outline-none flex items-center justify-center" 
                                      title="Add Emoji"
                                    >
                                      <Smile className="h-5 w-5 text-gray-500" />
                                    </button>
                                    
                                    {showAgencyEmojiPicker && (
                                      <div className="absolute bottom-12 left-0 bg-white border border-gray-200 rounded-3xl p-3 shadow-xl z-30 w-56 animate-in slide-in-from-bottom-2 duration-150">
                                        <div className="grid grid-cols-6 gap-1.5 max-h-32 overflow-y-auto">
                                          {['😊', '😂', '🤣', '👍', '❤️', '🔥', '✈️', '🏝️', '🗺️', '🏨', '🚗', '👏', '😍', '🎉', '🙌', '🙏', '✨', '🌍', '🌅', '🎒', '💬', '🎫', '🏝', '⛰', '🌟', '🛶', '🏄', '🏔', '⛺', '🧭'].map((emoji) => (
                                            <button
                                              key={emoji}
                                              onClick={() => {
                                                setAgencyChatInput((prev) => prev + emoji);
                                                setShowAgencyEmojiPicker(false);
                                              }}
                                              className="hover:bg-gray-100 p-1.5 rounded-lg text-lg transition-all active:scale-90 flex items-center justify-center"
                                            >
                                              {emoji}
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  <Input
                                    value={agencyChatInput}
                                    onChange={(e) => setAgencyChatInput(e.target.value)}
                                    placeholder="Type your reply..."
                                    onKeyPress={(e) => e.key === 'Enter' && !hasPhoneInInput && sendAgencyMessage()}
                                    className="flex-1 rounded-full border-gray-200 px-5 py-2.5 bg-gray-50/80 focus-visible:ring-orange-500 focus-visible:bg-white text-gray-900 text-xs h-10"
                                  />
                                  
                                  <button 
                                    onClick={sendAgencyMessage} 
                                    disabled={!agencyChatInput.trim() || hasPhoneInInput}
                                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-all shadow-md shrink-0 ${
                                      agencyChatInput.trim() && !hasPhoneInInput
                                        ? 'bg-[#1C1F26] hover:bg-black text-white active:scale-95' 
                                        : 'bg-gray-100 text-gray-300 cursor-not-allowed shadow-none'
                                    }`}
                                    title="Send Message"
                                  >
                                    <Send className="h-4 w-4" />
                                  </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="p-4 bg-white border-t border-gray-150 shrink-0">
                                  <div className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
                                    <div className="space-y-1 text-center sm:text-left">
                                      <h4 className="text-sm font-bold text-gray-805 flex items-center gap-1.5 justify-center sm:justify-start">
                                        <Lock className="h-4 w-4 text-gray-700" /> Conversation Locked
                                      </h4>
                                      <p className="text-xs text-gray-500">
                                        To reply to this traveler, you need to unlock the conversation. Cost: {
                                          userData?.plan === 'vip' ? '30 Credits' : 
                                          userData?.plan === 'premium' ? '40 Credits' : 
                                          '50 Credits'
                                        }.
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <div className="text-right hidden md:block">
                                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Your Balance</p>
                                        <p className="text-xs font-black text-gray-700">
                                          {`${userData?.credits ?? 0} Credits`}
                                        </p>
                                      </div>
                                      <Button
                                        onClick={() => unlockCustomerChat(selectedConversation.userId, selectedConversation.userName)}
                                        className="bg-orange-400 hover:bg-orange-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-sm flex items-center gap-1.5 border-none"
                                      >
                                        <Sparkles className="h-4 w-4" /> Unlock to Reply
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        ) : (
                          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-gray-55/30">
                            <div className="w-16 h-16 bg-white border border-gray-150 rounded-2xl flex items-center justify-center shadow-md mb-6">
                              <Plane className="h-8 w-8 text-blue-600" />
                            </div>
                            <h4 className="font-extrabold text-gray-900 text-sm mb-2">Your Inbox</h4>
                            <p className="text-xs text-gray-500 max-w-sm leading-relaxed">
                              Select a customer from the sidebar list to discuss itineraries, pricing details, or answer questions.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {agencyActiveSection === 'settings' && (
                    <Card className="bg-white border border-gray-200 shadow-md rounded-3xl overflow-hidden">
                      <CardHeader className="border-b border-gray-100 bg-gray-50/50 p-6 md:p-8">
                        <CardTitle className="flex items-center text-xl font-bold text-gray-900">
                          <Settings className="mr-2.5 h-6 w-6 text-gray-700" />
                          Profile Branding & Contact Information
                        </CardTitle>
                        <CardDescription className="text-xs text-gray-500 mt-1">
                          Manage your agency profile branding, contact info, and business description
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-6 md:p-8 space-y-8">
                        {/* Agency Logo Upload Section */}
                        <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 flex flex-col md:flex-row items-center gap-6 shadow-sm">
                          <div className="w-24 h-24 bg-white rounded-2xl border border-gray-200 shadow-sm flex items-center justify-center overflow-hidden shrink-0">
                            {(agencyLogoUrl || userData?.logoUrl || userData?.agencyLogo) && !agencyLogoError ? (
                              <img
                                src={agencyLogoUrl || userData?.logoUrl || userData?.agencyLogo}
                                alt="Agency Logo"
                                className="w-full h-full object-contain p-1"
                                onError={() => setAgencyLogoError(true)}
                              />
                            ) : (
                              <Building2 className="h-8 w-8 text-slate-400" />
                            )}
                          </div>
                          <div className="flex-1 text-center md:text-left">
                            <h3 className="text-sm font-bold text-gray-900">Agency Branding Logo</h3>
                            <p className="text-xs text-gray-500 mt-1 max-w-lg leading-relaxed">
                              Upload a clean, professional company logo to stand out in travel listings and customer chats. We recommend a high-resolution PNG or JPG.
                            </p>
                            <label className="mt-4 inline-flex items-center gap-2 bg-white hover:bg-gray-50 text-slate-800 text-xs font-bold px-4 py-2 rounded-xl border border-gray-200 shadow-sm cursor-pointer transition-all">
                              <span className="flex items-center gap-1.5"><Upload className="h-4 w-4" /> Upload New Logo</span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleAgencyLogoChange}
                                className="hidden"
                              />
                            </label>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <Label htmlFor="agencyName" className="text-xs font-semibold text-gray-600 mb-1.5 block">Agency Company Name</Label>
                            <Input
                              id="agencyName"
                              value={agencyCompanyName}
                              onChange={(e) => setAgencyCompanyName(e.target.value)}
                              className="bg-white border-gray-200 text-gray-800 rounded-2xl p-3.5 text-sm focus-visible:ring-orange-400 shadow-sm"
                            />
                          </div>
                          <div>
                            <Label htmlFor="contactEmail" className="text-xs font-semibold text-gray-600 mb-1.5 block">Contact Email</Label>
                            <Input
                              id="contactEmail"
                              value={agencyContactEmail}
                              onChange={(e) => setAgencyContactEmail(e.target.value)}
                              className="bg-white border-gray-200 text-gray-800 rounded-2xl p-3.5 text-sm focus-visible:ring-orange-400 shadow-sm"
                            />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="description" className="text-xs font-semibold text-gray-600 mb-1.5 block">Agency Description & Specialization</Label>
                          <textarea
                            id="description"
                            className="w-full p-4 border border-gray-200 rounded-2xl text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 shadow-sm"
                            rows={4}
                            value={agencyDescription}
                            onChange={(e) => setAgencyDescription(e.target.value)}
                            placeholder="Tell travelers about your agency's expertise, popular tour packages, and premium services..."
                          />
                        </div>

                        <div>
                          <h3 className="text-sm font-bold text-gray-900 mb-3">Notification Preferences</h3>
                          <div className="space-y-3 bg-gray-50/70 border border-gray-150 rounded-2xl p-5">
                            <label className="flex items-center gap-3 cursor-pointer">
                              <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-orange-400" defaultChecked />
                              <span className="text-xs font-semibold text-gray-700">Email notifications for new user bookings & inquiries</span>
                            </label>
                            <label className="flex items-center gap-3 cursor-pointer">
                              <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-orange-400" defaultChecked />
                              <span className="text-xs font-semibold text-gray-700">SMS notifications for urgent customer chat messages</span>
                            </label>
                            <label className="flex items-center gap-3 cursor-pointer">
                              <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-orange-400" />
                              <span className="text-xs font-semibold text-gray-700">Marketing emails, seasonal promotions & platform updates</span>
                            </label>
                          </div>
                        </div>

                        <div className="pt-2 flex justify-end">
                          <Button
                            onClick={handleSaveAgencySettings}
                            disabled={savingAgencySettings}
                            className="bg-orange-400 hover:bg-orange-500 text-white text-xs font-bold px-6 py-3 rounded-2xl shadow-md transition-all h-auto"
                          >
                            {savingAgencySettings ? 'Saving Settings...' : 'Save All Settings'}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {agencyActiveSection === 'credits' && (
                    <Card id="plans-and-credits-card" className="bg-white border border-gray-200 shadow-md rounded-3xl overflow-hidden">
                      <CardHeader className="border-b border-gray-100 bg-gray-50/50 p-6 md:p-8">
                        <CardTitle className="flex items-center text-xl font-bold text-gray-900">
                          <CreditCard className="mr-2.5 h-6 w-6 text-gray-700" />
                          Plan & Message Credits
                        </CardTitle>
                        <CardDescription className="text-xs text-gray-500 mt-1">
                          Manage subscription plans, buy add-on credits, and track transaction history
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-6 md:p-8 space-y-8">
                        {/* Hero Header */}
                        <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 flex flex-col md:flex-row items-center gap-6 shadow-sm">
                          <div className="w-24 h-24 bg-white rounded-2xl border border-gray-200 shadow-sm flex items-center justify-center overflow-hidden shrink-0">
                            <CreditCard className="h-8 w-8 text-slate-400" />
                          </div>
                          <div className="flex-1 text-center md:text-left">
                            <div className="inline-flex items-center gap-1.5 bg-white text-slate-800 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-xl border border-gray-200 shadow-sm mb-3">
                              <CreditCard className="w-3.5 h-3.5 mr-1 text-blue-600" /> Billing & Subscription Control Panel
                            </div>
                            <h3 className="text-sm font-bold text-gray-900">
                              Premium Reply Credits
                            </h3>
                            <p className="text-xs text-gray-500 mt-1 max-w-lg leading-relaxed">
                              Select subscription plans or purchase add-on credit packages to reply to traveler inquiries.
                            </p>
                          </div>
                        </div>

                        {/* Current Plan Summary Card & Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="md:col-span-1 bg-white border border-gray-200 shadow-sm rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between">
                            <div>
                              <div className="flex justify-between items-center mb-4">
                                <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Current Plan</h3>
                                <Badge className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide border ${userData?.plan === 'premium' ? 'bg-purple-100 text-purple-700 border-purple-200' :
                                    userData?.plan === 'starter' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                                      'bg-blue-100 text-blue-700 border-blue-200'
                                  }`}>
                                  {userData?.plan || 'Free'} Plan
                                </Badge>
                              </div>
                              <div className="space-y-3">
                                <div>
                                  <p className="text-2xl font-extrabold text-gray-900">
                                    {`${userData?.credits ?? 0} Credits`}
                                  </p>
                                  <p className="text-[10px] text-gray-500 mt-0.5">Cycle balance remaining</p>
                                </div>
                                <div className="border-t pt-3 space-y-1.5 text-[11px]">
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">Cycle Ends</span>
                                    <span className="font-semibold text-gray-800">July 16, 2026</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">Unlocked Travelers</span>
                                    <span className="font-semibold text-gray-800">
                                      {(userData?.unlockedUsers || []).filter((u: any) => typeof u === 'string' || u.expiresAt > Date.now()).length} Travelers
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Quick Stats Grid */}
                          <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-4 flex items-center justify-between">
                              <div className="space-y-0.5">
                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Per Reply Cost</p>
                                <h4 className="text-sm font-bold text-gray-900">
                                  {userData?.plan === 'free' && '50 Credits'}
                                  {userData?.plan === 'starter' && '50 Credits'}
                                  {userData?.plan === 'premium' && '40 Credits'}
                                  {userData?.plan === 'vip' && '30 Credits'}
                                </h4>
                                <p className="text-[10px] text-gray-500 leading-snug">
                                  Deducted per unlock
                                </p>
                              </div>
                              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 text-lg">
                                <MessageSquare className="w-5 h-5" />
                              </div>
                            </div>

                            <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-4 flex items-center justify-between">
                              <div className="space-y-0.5">
                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Transactions</p>
                                <h4 className="text-sm font-bold text-gray-900">
                                  {(userData?.creditHistory || []).length} Operations
                                </h4>
                                <p className="text-[10px] text-gray-500 leading-snug">Logs of top-ups & usage</p>
                              </div>
                              <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 text-lg">
                                <ClipboardList className="w-5 h-5" />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Developer Testing Panel inside Dashboard */}
                        <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-orange-200 rounded-2xl p-4 shadow-sm">
                          <h4 className="text-xs font-bold text-orange-850 flex items-center gap-1.5 mb-1.5">
                            <Wrench className="w-4 h-4 mr-1.5 text-orange-600" /> Developer Billing & Credits Simulator
                          </h4>
                          <p className="text-[10px] text-orange-700 mb-3 leading-relaxed">
                            Use these controls to simulate plan resets, add credits, and verify unlock behavior. Changes reflect in Firebase Firestore immediately.
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              onClick={() => simulateResetCredits('free')}
                              variant="outline"
                            className="bg-white hover:bg-gray-100 text-[10px] border-gray-300 font-semibold rounded-xl text-blue-700 py-1.5 h-auto"
                            >
                              Reset to Free
                            </Button>
                            <Button
                              onClick={() => simulateResetCredits('starter')}
                              variant="outline"
                            className="bg-white hover:bg-gray-100 text-[10px] border-gray-300 font-semibold rounded-xl text-amber-700 py-1.5 h-auto"
                            >
                              Reset to Starter
                            </Button>
                            <Button
                              onClick={() => simulateResetCredits('premium')}
                              variant="outline"
                            className="bg-white hover:bg-gray-100 text-[10px] border-gray-300 font-semibold rounded-xl text-purple-705 py-1.5 h-auto"
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
                            className="bg-white hover:bg-gray-100 text-[10px] border-gray-300 font-semibold rounded-xl text-green-750 py-1.5 h-auto"
                            >
                              +500 Credits
                            </Button>
                          </div>
                        </div>

                        {/* Plan Grid */}
                        <div id="plans-comparison-grid" className="pt-2">
                          <div className="mb-4">
                            <h2 className="text-base font-bold text-gray-900 mb-0.5">Subscription Plans</h2>
                            <p className="text-[11px] text-gray-505">Select the perfect tier to unlock and respond to traveler inquiries. Upgrade or downgrade anytime.</p>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {/* Free Plan */}
                            <div className={`bg-white border rounded-2xl p-4 shadow-sm flex flex-col justify-between plan-card-hover glow-free ${userData?.plan === 'free' || !userData?.plan ? 'ring-2 ring-orange-400' : 'border-gray-200'
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
                                <p className="text-[10px] text-gray-605 mb-4 leading-relaxed">Perfect for simple search and quick traveler responses.</p>
                                <ul className="space-y-2 text-[10px] text-gray-600 border-t pt-3 mb-4">
                                  <li className="flex items-center gap-1.5">
                                    <span className="text-green-500 font-bold">✓</span>
                                    <span><strong>2 Listings</strong></span>
                                  </li>
                                  <li className="flex items-center gap-1.5">
                                    <span className="text-green-500 font-bold">✓</span>
                                    <span><strong>2 Leads</strong></span>
                                  </li>
                                </ul>
                              </div>
                              <Button
                                onClick={() => upgradePlan('free')}
                                disabled={userData?.plan === 'free' || !userData?.plan}
                                className={`w-full text-[10px] font-bold py-2.5 rounded-xl ${userData?.plan === 'free' || !userData?.plan
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed hover:bg-gray-100 border-none'
                                    : 'bg-orange-400 hover:bg-orange-500 text-white'
                                  }`}
                              >
                                {userData?.plan === 'free' || !userData?.plan ? 'Current Plan' : 'Select Free Plan'}
                              </Button>
                            </div>

                            {/* Standard Plan */}
                            <div className={`bg-white border rounded-2xl p-4 shadow-sm flex flex-col justify-between plan-card-hover glow-starter ${userData?.plan === 'starter' ? 'ring-2 ring-amber-500' : 'border-gray-200'
                              }`}>
                              <div>
                                <div className="mb-2 flex justify-between items-center">
                                  <span className="text-[8px] font-bold text-amber-600 uppercase tracking-widest bg-amber-50 px-2.5 py-0.5 rounded-full">Most Popular</span>
                                </div>
                                <h3 className="text-sm font-bold text-gray-900 mb-0.5">Standard Plan</h3>
                                <div className="flex items-baseline gap-1 my-1.5">
                                  <span className="text-lg font-extrabold text-gray-900">₹{pricingConfig.starterPrice.toLocaleString('en-IN')}</span>
                                  <span className="text-[9px] text-gray-500 font-medium">/ year</span>
                                </div>
                                <p className="text-[10px] text-gray-650 mb-4 leading-relaxed">Best for active agencies replying to holiday inquiries.</p>
                                <ul className="space-y-2 text-[10px] text-gray-655 border-t pt-3 mb-4">
                                  <li className="flex items-center gap-1.5">
                                    <span className="text-green-500 font-bold">✓</span>
                                    <span><strong>10 Listings</strong></span>
                                  </li>
                                  <li className="flex items-center gap-1.5">
                                    <span className="text-green-500 font-bold">✓</span>
                                    <span><strong>200 credit</strong> per lead</span>
                                  </li>
                                </ul>
                              </div>
                              <Button
                                onClick={() => upgradePlan('starter')}
                                disabled={userData?.plan === 'starter'}
                                className={`w-full text-[10px] font-bold py-2.5 rounded-xl ${userData?.plan === 'starter'
                                    ? 'bg-gray-105 text-gray-400 cursor-not-allowed hover:bg-gray-100 border-none'
                                    : 'bg-orange-400 hover:bg-orange-500 text-white'
                                  }`}
                              >
                                {userData?.plan === 'starter' ? 'Current Plan' : 'Upgrade to Standard'}
                              </Button>
                            </div>

                            {/* Premium Plan */}
                            <div className={`bg-white border rounded-2xl p-4 shadow-sm flex flex-col justify-between plan-card-hover glow-premium ${userData?.plan === 'premium' ? 'ring-2 ring-purple-500' : 'border-gray-200'
                              }`}>
                              <div>
                                <div className="mb-2">
                                  <span className="text-[8px] font-bold text-purple-600 uppercase tracking-widest bg-purple-50 px-2.5 py-0.5 rounded-full">Power User</span>
                                </div>
                                <h3 className="text-sm font-bold text-gray-900 mb-0.5">Premium Plan</h3>
                                <div className="flex items-baseline gap-1 my-1.5">
                                  <span className="text-lg font-extrabold text-gray-900">₹{pricingConfig.premiumPrice.toLocaleString('en-IN')}</span>
                                  <span className="text-[9px] text-gray-500 font-medium">/ year</span>
                                </div>
                                <p className="text-[10px] text-gray-605 mb-4 leading-relaxed">For frequent high-volume agency messaging needs.</p>
                                <ul className="space-y-2 text-[10px] text-gray-655 border-t pt-3 mb-4">
                                  <li className="flex items-center gap-1.5">
                                    <span className="text-green-500 font-bold">✓</span>
                                    <span><strong>50 Listings</strong></span>
                                  </li>
                                  <li className="flex items-center gap-1.5">
                                    <span className="text-green-500 font-bold">✓</span>
                                    <span><strong>175 credit</strong> per lead</span>
                                  </li>
                                </ul>
                              </div>
                              <Button
                                onClick={() => upgradePlan('premium')}
                                disabled={userData?.plan === 'premium'}
                                className={`w-full text-[10px] font-bold py-2.5 rounded-xl ${userData?.plan === 'premium'
                                    ? 'bg-gray-105 text-gray-400 cursor-not-allowed hover:bg-gray-100 border-none'
                                    : 'bg-orange-400 hover:bg-orange-500 text-white'
                                  }`}
                              >
                                {userData?.plan === 'premium' ? 'Current Plan' : 'Upgrade to Premium'}
                              </Button>
                            </div>
                            
                            {/* VIP Plan */}
                            <div className={`bg-white border rounded-2xl p-4 shadow-sm flex flex-col justify-between plan-card-hover glow-premium ${userData?.plan === 'vip' ? 'ring-2 ring-rose-500' : 'border-gray-200'
                              }`}>
                              <div>
                                <div className="mb-2">
                                  <span className="text-[8px] font-bold text-rose-600 uppercase tracking-widest bg-rose-50 px-2.5 py-0.5 rounded-full">Elite Tier</span>
                                </div>
                                <h3 className="text-sm font-bold text-gray-900 mb-0.5">VIP Plan</h3>
                                <div className="flex items-baseline gap-1 my-1.5">
                                  <span className="text-lg font-extrabold text-gray-900">₹{pricingConfig.vipPrice.toLocaleString('en-IN')}</span>
                                  <span className="text-[9px] text-gray-500 font-medium">/ year</span>
                                </div>
                                <p className="text-[10px] text-gray-605 mb-4 leading-relaxed">Ultimate package for top agencies wanting maximum visibility.</p>
                                <ul className="space-y-2 text-[10px] text-gray-655 border-t pt-3 mb-4">
                                  <li className="flex items-center gap-1.5">
                                    <span className="text-green-500 font-bold">✓</span>
                                    <span><strong>Unlimited Listings</strong></span>
                                  </li>
                                  <li className="flex items-center gap-1.5">
                                    <span className="text-green-500 font-bold">✓</span>
                                    <span><strong>150 credit</strong> per lead</span>
                                  </li>
                                </ul>
                              </div>
                              <Button
                                onClick={() => upgradePlan('vip')}
                                disabled={userData?.plan === 'vip'}
                                className={`w-full text-[10px] font-bold py-2.5 rounded-xl ${userData?.plan === 'vip'
                                    ? 'bg-gray-105 text-gray-400 cursor-not-allowed hover:bg-gray-100 border-none'
                                    : 'bg-orange-400 hover:bg-orange-500 text-white'
                                  }`}
                              >
                                {userData?.plan === 'vip' ? 'Current Plan' : 'Upgrade to VIP'}
                              </Button>
                            </div>
                          </div>
                        </div>



                        {/* Transaction History Logs */}
                        <div className="bg-white border border-gray-200 shadow-sm rounded-3xl p-6">
                          <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-1.5">
                            <ClipboardList className="w-4 h-4 mr-1.5 text-gray-600" /> Credit Transaction History
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
                                        <Badge className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wide border ${tx.type === 'top-up' ? 'bg-green-50 text-green-700 border-green-200' :
                                            tx.type === 'plan-change' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                              tx.type === 'reset' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                'bg-red-50 text-red-700 border-red-200'
                                          }`}>
                                          {tx.type}
                                        </Badge>
                                      </td>
                                      <td className="py-3 pr-4">{tx.description}</td>
                                      <td className={`py-3 pr-4 text-right font-extrabold text-xs ${tx.type === 'top-up' ? 'text-green-600' :
                                          tx.type === 'plan-change' ? 'text-purple-600' :
                                            tx.type === 'reset' ? 'text-blue-600' :
                                              'text-red-600'
                                        }`}>
                                        {tx.type === 'top-up' && '+'}
                                        {tx.type === 'deduction' && '-'}
                                        {tx.amount}
                                        {userData.plan === 'starter' && tx.type !== 'plan-change' && tx.type !== 'reset' ? ' cr' : ''}
                                        {userData.plan !== 'starter' && tx.type !== 'plan-change' && tx.type !== 'reset' ? ' replies' : ''}
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
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Clock className="w-8 h-8 text-yellow-600" />
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
              <span className={`px-4 py-2 rounded-full text-sm font-medium ${booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                  booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                }`}>
                {booking.status === 'confirmed' ? <span className="flex items-center gap-1"><CheckCircle className="w-4 h-4 text-green-600" /> Confirmed</span> :
                  booking.status === 'pending' ? <span className="flex items-center gap-1"><Clock className="w-4 h-4 text-yellow-600" /> Pending</span> : <span className="flex items-center gap-1"><XCircle className="w-4 h-4 text-red-600" /> Cancelled</span>}
              </span>
              <span className="text-gray-500 text-sm">
                Booked on {booking.createdAtFormatted}
              </span>
            </div>

            {/* Booking Info */}
            <div className="bg-gray-50 p-5 rounded-xl">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-gray-700" /> Booking Information
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
                    {booking.packageType === 'international' ? <span className="flex items-center gap-1"><Globe className="w-4 h-4 text-blue-600" /> International</span> : <span className="flex items-center gap-1"><HomeIcon className="w-4 h-4 text-green-600" /> Domestic</span>}
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
                  <Plane className="w-5 h-5 text-gray-700" /> Travel Itinerary
                </h3>

                {booking.journeyDetails.flight && (
                  <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
                    <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                      <Plane className="w-4 h-4 text-blue-700" /> Flight Information
                    </h4>
                    <p className="text-blue-800 whitespace-pre-line">{booking.journeyDetails.flight}</p>
                  </div>
                )}

                {booking.journeyDetails.hotel && (
                  <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-lg">
                    <h4 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
                      <Building className="w-4 h-4 text-green-700" /> Hotel Accommodation
                    </h4>
                    <p className="text-green-800 whitespace-pre-line">{booking.journeyDetails.hotel}</p>
                  </div>
                )}

                {booking.journeyDetails.itinerary && (
                  <div className="bg-purple-50 border-l-4 border-purple-500 p-4 rounded-r-lg">
                    <h4 className="font-semibold text-purple-900 mb-2 flex items-center gap-2">
                      <ClipboardList className="w-4 h-4 text-purple-700" /> Day-by-Day Itinerary
                    </h4>
                    <div className="text-purple-800 whitespace-pre-line leading-relaxed">
                      {booking.journeyDetails.itinerary}
                    </div>
                  </div>
                )}

                {booking.journeyDetails.additionalNotes && (
                  <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-r-lg">
                    <h4 className="font-semibold text-yellow-900 mb-2 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-yellow-700" /> Additional Notes
                    </h4>
                    <p className="text-yellow-800">{booking.journeyDetails.additionalNotes}</p>
                  </div>
                )}

                {!booking.journeyDetails.flight && !booking.journeyDetails.hotel && !booking.journeyDetails.itinerary && (
                  <div className="bg-yellow-50 p-4 rounded-lg text-center">
                    <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Clock className="w-6 h-6 text-yellow-600" />
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
                  <Clock className="w-8 h-8 text-yellow-600" />
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
                <h4 className="font-semibold text-pink-900 mb-2 flex items-center gap-1.5"><FileText className="w-4 h-4 text-pink-700" /> Your Special Requests</h4>
                <p className="text-pink-800">{booking.specialRequests}</p>
              </div>
            )}

            {/* Payment Summary */}
            <div className="bg-gray-50 p-5 rounded-xl">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-gray-700" /> Payment Summary
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
                <Phone className="w-5 h-5 text-blue-700" /> Contact & Emergency Information
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
                <Info className="w-4 h-4 inline mr-1 text-blue-600" /> Keep this information handy during your travels. Contact your agency for any assistance.
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
                className="flex-1 flex items-center justify-center gap-1.5"
              >
                <Printer className="w-4 h-4" /> Print Details
              </Button>
              {booking.status === 'confirmed' && (
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-700 flex items-center justify-center gap-1.5"
                  onClick={() => {
                    // Share functionality
                    const shareData = {
                      title: `My Travel Booking - ${booking.listingTitle}`,
                      text: `Booking Reference: ${booking.bookingReference}\nTravel Date: ${booking.travelDate || 'TBD'}`,
                      url: window.location.href,
                    };
                    if (navigator.share) {
                      navigator.share(shareData).catch((err) => console.error('Error sharing:', err));
                    } else {
                      navigator.clipboard.writeText(shareData.url).then(() => {
                        alert('Booking details link copied to clipboard!');
                      });
                    }
                  }}
                >
                  <Share2 className="w-4 h-4" /> Share
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Fallback for unauthenticated admin/agency routes
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center bg-[url('https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=2021&auto=format&fit=crop')] bg-cover bg-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
      <div className="z-10 bg-white p-8 rounded-3xl shadow-2xl flex flex-col items-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Admin & Agency Portal</h2>
        <p className="text-gray-600 mb-6 text-center max-w-sm">Please log in to access your dashboard. The credentials must correspond to a registered administrative or agency account.</p>
        <button 
          onClick={() => setShowAuthModal(true)}
          className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-8 rounded-xl transition-all hover:scale-105 hover:shadow-lg"
        >
          Open Login
        </button>
      </div>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => {}} // Cannot close on restricted routes
        initialTab={routeMode === 'agency' ? 'signup' : 'login'}
        onLogin={signIn}
        onRegister={handleAuthModalRegister}
        onGoogleSignIn={signInWithGoogle}
        googleUser={user}
      />
    </div>
  );
}
