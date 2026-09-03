'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Image as ImageIcon,
  Search,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  X,
  Loader2,
  RefreshCw,
  Filter,
  Layers,
  MapPin,
  Building2,
  Eye,
  Check,
  Trash2,
  Compass,
  ArrowRight,
  ArrowLeft,
  Info,
  Globe,
  SlidersHorizontal,
  FolderOpen,
  Plus,
  BookOpen,
  Newspaper,
  Calendar,
  Tag,
  Share2,
  FileText,
  CheckCircle,
  Play,
  Pause,
  Square,
  Cpu,
  Zap,
  ListOrdered
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { searchWikimediaImages, cleanPlaceQuery, WikimediaImageResult } from '@/lib/wikipediaCommons';
import { extractPlacesFromTitle } from '@/lib/locationExtractor';
import { getDbInstance } from '@/lib/firebase';
import { doc, updateDoc, collection, getDocs, orderBy, query } from 'firebase/firestore';

export interface BlogItem {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  content?: string;
  coverImage?: string;
  category?: string;
  tags?: string[];
  author?: string;
  published?: boolean;
  publishedAt?: string;
  updatedAt?: string;
  metaTitle?: string;
  metaDescription?: string;
  readTime?: string;
  views?: number;
  hasPhoto: boolean;
  photoPlaces?: string[]; // AI-extracted landmark & place names for images
}

export interface QueueItem {
  id: string;
  blogId: string;
  title: string;
  category: string;
  status: 'pending' | 'analyzing' | 'success' | 'failed' | 'skipped';
  extractedPlaces?: string[];
  error?: string;
  timeTaken?: number;
}

export interface QueueLog {
  id: string;
  timestamp: string;
  type: 'info' | 'success' | 'error' | 'warn';
  message: string;
}

interface AdminBlogPhotoManagerProps {
  initialBlogs?: BlogItem[];
  initialListings?: any[];
  onBlogUpdated?: (updatedBlog: BlogItem) => void;
}

// Known common destinations and landmarks for fast entity matching
const FAMOUS_DESTINATIONS_MAP: { [key: string]: string[] } = {
  kedarnath: ['Kedarnath Temple', 'Kedarnath', 'Garhwal Himalayas'],
  badrinath: ['Badrinath Temple', 'Badrinath', 'Chamoli'],
  nainital: ['Nainital Lake', 'Nainital', 'Naini Peak'],
  mussoorie: ['Mussoorie', 'Kempty Falls', 'Mall Road Mussoorie'],
  rishikesh: ['Rishikesh', 'Laxman Jhula', 'Triveni Ghat Rishikesh'],
  haridwar: ['Haridwar', 'Har Ki Pauri', 'Ganga Aarti Haridwar'],
  auli: ['Auli', 'Auli Skiing', 'Auli Ropeway', 'Nanda Devi'],
  'jim corbett': ['Jim Corbett National Park', 'Corbett Tiger Reserve'],
  chopta: ['Chopta', 'Tungnath Temple', 'Chandrashila'],
  tungnath: ['Tungnath Temple', 'Chopta', 'Chandrashila'],
  'valley of flowers': ['Valley of Flowers National Park', 'Hemkund Sahib'],
  uttarakhand: ['Uttarakhand', 'Garhwal', 'Himalayas India'],
  manali: ['Manali', 'Solang Valley', 'Rohtang Pass'],
  shimla: ['Shimla', 'Mall Road Shimla', 'Jakhoo Temple'],
  goa: ['Goa Beaches', 'Calangute Beach', 'Old Goa Churches'],
  kerala: ['Kerala Backwaters', 'Alleppey Houseboat', 'Munnar Tea Gardens'],
  kashmir: ['Dal Lake Srinagar', 'Gulmarg Snow', 'Pahalgam Valley'],
  ladakh: ['Pangong Lake Ladakh', 'Nubra Valley', 'Leh Ladakh'],
  rajasthan: ['Jaipur Hawa Mahal', 'Udaipur City Palace', 'Jaisalmer Fort'],
  jaipur: ['Hawa Mahal Jaipur', 'Amber Fort Jaipur', 'City Palace Jaipur'],
  udaipur: ['Lake Pichola Udaipur', 'City Palace Udaipur'],
  andaman: ['Radhanagar Beach Havelock', 'Cellular Jail Port Blair', 'Andaman Islands'],
  dubai: ['Burj Khalifa Dubai', 'Dubai Marina', 'Dubai Skyline'],
  bali: ['Bali Temple', 'Ubud Rice Terrace', 'Tanah Lot Bali'],
  maldives: ['Maldives Resort Overwater', 'Maldives Beach'],
  thailand: ['Bangkok Grand Palace', 'Phuket Island', 'Phi Phi Islands'],
  vietnam: ['Ha Long Bay Vietnam', 'Hoi An Ancient Town'],
  singapore: ['Marina Bay Sands Singapore', 'Gardens by the Bay']
};

// Strict Blacklist of non-place English words, guide verbs, and noise tokens
const NON_PLACE_WORDS = new Set([
  'think', 'thinking', 'thought', 'why', 'what', 'when', 'where', 'which', 'who', 'whom', 'whose', 'how',
  'how to', 'use', 'using', 'used', 'instead', 'instead of', 'honest', 'reality', 'check', 'checking',
  'online', 'offline', 'book', 'booking', 'booked', 'agency', 'agencies', 'agent', 'agents',
  'difference', 'differences', 'compare', 'comparing', 'comparison', 'versus', 'vs',
  'better', 'best', 'worst', 'pros', 'cons', 'benefits', 'advantage', 'advantages', 'disadvantage', 'disadvantages',
  'tips', 'tip', 'tricks', 'trick', 'hacks', 'hack', 'secrets', 'secret', 'mistakes', 'mistake', 'rules', 'rule',
  'guide', 'guides', 'guidelines', 'guideline', 'review', 'reviews', 'rating', 'ratings',
  'cost', 'costs', 'budget', 'budgets', 'price', 'prices', 'pricing', 'cheap', 'expensive', 'affordable',
  'money', 'save', 'saving', 'plan', 'planning', 'planner', 'plans', 'itinerary', 'itineraries',
  'package', 'packages', 'deal', 'deals', 'offer', 'offers', 'advice', 'option', 'options',
  'reason', 'reasons', 'things', 'thing', 'places', 'place', 'visit', 'visiting', 'visited',
  'travel', 'travelling', 'traveling', 'traveler', 'travelers', 'traveller', 'travellers',
  'trip', 'trips', 'tour', 'tours', 'tourism', 'holiday', 'holidays', 'vacation', 'vacations',
  'experience', 'experiences', 'destination', 'destinations', 'overview', 'summary', 'introduction',
  'conclusion', 'faq', 'faqs', 'question', 'questions', 'answer', 'answers', 'essential', 'essentials',
  'complete', 'ultimate', 'definitive', 'conquering', 'simple', 'easy', 'step', 'steps', 'season', 'seasons',
  'weather', 'climate', 'month', 'months', 'year', 'years', '2024', '2025', '2026', '2027', '2028', '2029', '2030',
  'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december',
  'spring', 'summer', 'monsoon', 'autumn', 'winter', 'hotel', 'hotels', 'resort', 'resorts', 'stay', 'staying',
  'accommodation', 'accommodations', 'flight', 'flights', 'train', 'trains', 'bus', 'buses', 'taxi', 'taxis',
  'cab', 'cabs', 'car', 'cars', 'rental', 'rentals', 'insurance', 'safety', 'safe', 'secure', 'danger',
  'dangerous', 'warning', 'warnings', 'permit', 'permits', 'visa', 'visas', 'passport', 'passports',
  'packing', 'pack', 'luggage', 'baggage', 'clothes', 'clothing', 'wear', 'wearing', 'dress', 'food',
  'foodie', 'dishes', 'cuisine', 'eat', 'eating', 'drink', 'drinks', 'shopping', 'souvenir', 'souvenirs',
  'scam', 'scams', 'avoid', 'avoiding', 'dos', 'donts', 'culture', 'etiquette', 'customs', 'language',
  'internet', 'sim', 'wifi', 'currency', 'exchange', 'atm', 'cards', 'cash', 'emergency', 'help',
  'explore', 'exploring', 'discover', 'discovering', 'conquer', 'adventure', 'adventures', 'trek', 'treks',
  'valley', 'lake', 'falls', 'temple', 'peak', 'glacier', 'mountain', 'hill', 'river', 'beach', 'island', 'fort'
]);

function isValidPlaceChip(name: string): boolean {
  if (!name || typeof name !== 'string') return false;
  const clean = name.trim().replace(/^[\s,.\-–—:|()?!"]+|[\s,.\-–—:|()?!"]+$/g, '');
  if (clean.length < 3) return false;

  // Discard if contains sentence punctuation, question marks, or comparison phrases
  if (clean.includes('?') || clean.includes('!') || clean.includes(' vs ') || clean.includes(' versus ')) {
    return false;
  }

  const lower = clean.toLowerCase();

  // Direct blacklist match
  if (NON_PLACE_WORDS.has(lower)) return false;

  // Single word checks
  const words = clean.split(/\s+/);
  if (words.length === 1 && NON_PLACE_WORDS.has(words[0].toLowerCase())) {
    return false;
  }

  // Check if every word in a multi-word phrase is noise
  const allNoise = words.every(w => NON_PLACE_WORDS.has(w.toLowerCase()) || w.length <= 2);
  if (allNoise) return false;

  // Discard conversational phrases and headlines
  if (
    lower.startsWith('why ') ||
    lower.startsWith('how to ') ||
    lower.startsWith('how ') ||
    lower.startsWith('is ') ||
    lower.startsWith('should you ') ||
    lower.startsWith('what is ') ||
    lower.startsWith('what ') ||
    lower.startsWith('where to ') ||
    lower.startsWith('when to ') ||
    lower.startsWith('explore ') ||
    lower.startsWith('exploring ') ||
    lower.startsWith('discover ') ||
    lower.startsWith('discovering ') ||
    lower.includes('instead of') ||
    lower.includes('reality check') ||
    lower.includes('honest review') ||
    lower.includes('everything you need') ||
    lower.includes('complete guide to')
  ) {
    return false;
  }

  return true;
}

function getConceptualTravelThemes(title: string, category: string = ''): Array<{ name: string; query: string }> {
  const t = `${title} ${category}`.toLowerCase();

  if (t.includes('agency') || t.includes('agent') || t.includes('booking') || t.includes('online')) {
    return [
      { name: 'Travel Planning', query: 'Travel Planning' },
      { name: 'Vacation Planning', query: 'Vacation Planning' },
      { name: 'Travel Luggage', query: 'Travel Luggage' },
      { name: 'Airplane Travel', query: 'Airplane Travel' }
    ];
  }

  if (t.includes('packing') || t.includes('clothes') || t.includes('luggage') || t.includes('backpack')) {
    return [
      { name: 'Travel Suitcase', query: 'Travel Suitcase Packing' },
      { name: 'Travel Backpack', query: 'Travel Backpack Luggage' },
      { name: 'Travel Planning', query: 'Travel Planning' }
    ];
  }

  if (t.includes('budget') || t.includes('cost') || t.includes('cheap') || t.includes('money') || t.includes('save')) {
    return [
      { name: 'Travel Planning', query: 'Travel Planning' },
      { name: 'Backpacker Travel', query: 'Backpacker Map Travel' },
      { name: 'Airplane Window', query: 'Airplane Window View' }
    ];
  }

  if (t.includes('solo') || t.includes('safety') || t.includes('safe') || t.includes('female')) {
    return [
      { name: 'Solo Traveler', query: 'Solo Traveler Scenic View' },
      { name: 'Travel Backpacking', query: 'Backpacker Mountain Landscape' },
      { name: 'Scenic Viewpoint', query: 'Scenic Mountain Viewpoint' }
    ];
  }

  if (t.includes('flight') || t.includes('airport') || t.includes('airline') || t.includes('ticket')) {
    return [
      { name: 'Airplane Flight', query: 'Airplane Wing Sky' },
      { name: 'Airport Travel', query: 'Airport Travel Departure' },
      { name: 'Passport & Ticket', query: 'Passport Boarding Pass Travel' }
    ];
  }

  if (t.includes('hotel') || t.includes('resort') || t.includes('stay') || t.includes('room')) {
    return [
      { name: 'Luxury Resort', query: 'Luxury Resort Pool View' },
      { name: 'Boutique Hotel', query: 'Boutique Hotel Room Landscape' },
      { name: 'Resort View', query: 'Resort Ocean Mountain' }
    ];
  }

  if (t.includes('food') || t.includes('cuisine') || t.includes('eat') || t.includes('dining')) {
    return [
      { name: 'Travel Dining', query: 'Local Street Food Travel' },
      { name: 'Traditional Cuisine', query: 'Traditional Cuisine Feast' }
    ];
  }

  return [
    { name: 'Travel Planning', query: 'Travel Planning' },
    { name: 'Scenic Landscape', query: 'Scenic Travel Landscape Mountains' },
    { name: 'Vacation View', query: 'Beautiful Vacation View' },
    { name: 'Travel Adventure', query: 'Travel Adventure Scenic' }
  ];
}

/**
 * Extracts smart searchable destination/topic chips from blog's AI photoPlaces or title/content
 */
function extractBlogTopics(blog: BlogItem): { name: string; query: string }[] {
  const topics: { name: string; query: string }[] = [];
  const added = new Set<string>();

  // 1. Highest Priority: AI-extracted photoPlaces (Strictly validated)
  if (Array.isArray(blog.photoPlaces) && blog.photoPlaces.length > 0) {
    blog.photoPlaces.forEach(place => {
      if (typeof place === 'string' && isValidPlaceChip(place)) {
        const cleaned = place.trim();
        const lower = cleaned.toLowerCase();
        if (!added.has(lower)) {
          added.add(lower);
          topics.push({ name: cleaned, query: cleaned });
        }
      }
    });
  }

  const fullText = `${blog.title} ${blog.category || ''} ${(blog.tags || []).join(' ')} ${blog.excerpt || ''}`.toLowerCase();

  // 2. Check known destination keywords
  for (const [key, searchTerms] of Object.entries(FAMOUS_DESTINATIONS_MAP)) {
    if (fullText.includes(key)) {
      searchTerms.forEach(term => {
        if (isValidPlaceChip(term)) {
          const lower = term.toLowerCase();
          if (!added.has(lower)) {
            added.add(lower);
            topics.push({ name: term, query: term });
          }
        }
      });
    }
  }

  // 3. Extract title segments by cleaning title
  const titlePlaces = extractPlacesFromTitle(blog.title, blog.category);
  titlePlaces.forEach(place => {
    const cleaned = cleanPlaceQuery(place);
    if (cleaned && isValidPlaceChip(cleaned)) {
      const lower = cleaned.toLowerCase();
      if (!added.has(lower)) {
        added.add(lower);
        topics.push({ name: cleaned, query: cleaned });
      }
    }
  });

  // 4. If no physical landmarks found, provide clean curated aesthetic travel themes
  if (topics.length === 0) {
    const themes = getConceptualTravelThemes(blog.title, blog.category);
    themes.forEach(theme => {
      const lower = theme.name.toLowerCase();
      if (!added.has(lower)) {
        added.add(lower);
        topics.push(theme);
      }
    });
  }

  return topics.slice(0, 10);
}

export default function AdminBlogPhotoManager({
  initialBlogs = [],
  initialListings = [],
  onBlogUpdated
}: AdminBlogPhotoManagerProps) {
  const [blogs, setBlogs] = useState<BlogItem[]>(initialBlogs);
  const [loading, setLoading] = useState(false);
  const [isAutoFilling, setIsAutoFilling] = useState(false);
  const [activeTab, setActiveTab] = useState<'missing' | 'all' | 'completed' | 'drafts' | 'unanalyzed'>('missing');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'grouped' | 'list'>('grid');

  // Modal State
  const [activeBlog, setActiveBlog] = useState<BlogItem | null>(null);
  const [customSearchQuery, setCustomSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'wikimedia' | 'wikipedia' | 'flickr'>('all');
  const [isSearchingWiki, setIsSearchingWiki] = useState(false);
  const [isAnalyzingSingle, setIsAnalyzingSingle] = useState(false);
  const [wikiResults, setWikiResults] = useState<WikimediaImageResult[]>([]);
  const [selectedImage, setSelectedImage] = useState<WikimediaImageResult | null>(null);
  const [manualImageUrl, setManualImageUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [previewFullImageUrl, setPreviewFullImageUrl] = useState<string | null>(null);

  // Extracted Smart Topics
  const [extractedTopics, setExtractedTopics] = useState<{ name: string; query: string }[]>([]);
  const [activeTopicQuery, setActiveTopicQuery] = useState<string>('');

  // ─── AI BATCH QUEUE STATE ───
  const [isQueueModalOpen, setIsQueueModalOpen] = useState(false);
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [queueRunning, setQueueRunning] = useState(false);
  const [queuePaused, setQueuePaused] = useState(false);
  const [queueCurrentIndex, setQueueCurrentIndex] = useState(-1);
  const [queueLogs, setQueueLogs] = useState<QueueLog[]>([]);
  const [queueDelaySeconds, setQueueDelaySeconds] = useState(1);

  const queueRunningRef = useRef(false);
  const queuePausedRef = useRef(false);
  const logsEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    queueRunningRef.current = queueRunning;
  }, [queueRunning]);

  useEffect(() => {
    queuePausedRef.current = queuePaused;
  }, [queuePaused]);

  const addQueueLog = (type: 'info' | 'success' | 'error' | 'warn', message: string) => {
    const newLog: QueueLog = {
      id: `${Date.now()}-${Math.random()}`,
      timestamp: new Date().toLocaleTimeString(),
      type,
      message
    };
    setQueueLogs(prev => [newLog, ...prev.slice(0, 150)]);
  };

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Fetch blogs directly from Firestore on mount or refresh
  const fetchAllBlogs = async () => {
    setLoading(true);
    try {
      const db = getDbInstance();
      if (!db) {
        // Fallback to REST API
        const res = await fetch('/api/blog?all=true');
        if (res.ok) {
          const data = await res.json();
          const items: BlogItem[] = (data.blogs || []).map((b: any) => ({
            ...b,
            photoPlaces: Array.isArray(b.photoPlaces) ? b.photoPlaces : [],
            hasPhoto: !!(b.coverImage && b.coverImage.trim().length > 0)
          }));
          setBlogs(items);
          showToast(`Loaded ${items.length} blogs.`, 'info');
        }
        setLoading(false);
        return;
      }

      const q = query(collection(db, 'blogs'), orderBy('updatedAt', 'desc'));
      const snapshot = await getDocs(q);
      const items: BlogItem[] = snapshot.docs.map(docSnap => {
        const d = docSnap.data();
        const cover = d.coverImage || '';
        return {
          id: docSnap.id,
          title: d.title || 'Untitled Blog',
          slug: d.slug || docSnap.id,
          excerpt: d.excerpt || '',
          content: d.content || '',
          coverImage: cover,
          category: d.category || 'Travel Guides',
          tags: Array.isArray(d.tags) ? d.tags : [],
          author: d.author || 'TripDM Team',
          published: d.published ?? false,
          publishedAt: d.publishedAt || '',
          updatedAt: d.updatedAt || '',
          metaTitle: d.metaTitle || '',
          metaDescription: d.metaDescription || '',
          readTime: d.readTime || '5 min read',
          views: d.views || 0,
          photoPlaces: Array.isArray(d.photoPlaces) ? d.photoPlaces : [],
          hasPhoto: !!(cover && cover.trim().length > 0)
        };
      });

      setBlogs(items);
      showToast(`Refreshed ${items.length} blogs from Firestore.`, 'info');
    } catch (err: any) {
      console.error('Error fetching blogs:', err);
      showToast('Failed to load blogs. Retrying...', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialBlogs && initialBlogs.length > 0) {
      setBlogs(
        initialBlogs.map(b => ({
          ...b,
          photoPlaces: Array.isArray(b.photoPlaces) ? b.photoPlaces : [],
          hasPhoto: !!(b.coverImage && b.coverImage.trim().length > 0)
        }))
      );
    } else {
      fetchAllBlogs();
    }
  }, [initialBlogs]);

  // Global Known Photos Map from Package Listings & Existing Blogs
  const knownDestinationPhotos = useMemo(() => {
    const map = new Map<string, string[]>();

    // 1. From existing blogs with cover photos
    blogs.forEach(b => {
      if (b.coverImage && b.coverImage.trim()) {
        const topics = extractBlogTopics(b);
        topics.forEach(t => {
          const k = t.query.toLowerCase().trim();
          if (!map.has(k)) map.set(k, []);
          const arr = map.get(k)!;
          if (!arr.includes(b.coverImage!)) arr.push(b.coverImage!);
        });
      }
    });

    // 2. From package listings
    initialListings.forEach((pkg: any) => {
      if (!pkg) return;
      if (Array.isArray(pkg.itinerary)) {
        pkg.itinerary.forEach((day: any) => {
          const urls: string[] = Array.isArray(day.imageUrls)
            ? day.imageUrls.filter(Boolean)
            : day.imageUrl
            ? [day.imageUrl]
            : [];
          if (urls.length > 0 && day.placeName) {
            const cleanKey = cleanPlaceQuery(day.placeName).toLowerCase().trim();
            if (cleanKey) {
              if (!map.has(cleanKey)) map.set(cleanKey, []);
              const arr = map.get(cleanKey)!;
              urls.forEach(u => {
                if (!arr.includes(u)) arr.push(u);
              });
            }
          }
        });
      }
    });

    return map;
  }, [blogs, initialListings]);

  // Find known photos for a blog
  const findKnownBlogPhotos = (blog: BlogItem, topics: { name: string; query: string }[]): string[] => {
    for (const t of topics) {
      const k = t.query.toLowerCase().trim();
      if (knownDestinationPhotos.has(k) && (knownDestinationPhotos.get(k)?.length ?? 0) > 0) {
        return knownDestinationPhotos.get(k)!;
      }
    }
    return [];
  };

  // Stats
  const stats = useMemo(() => {
    const totalBlogs = blogs.length;
    const missingPhotos = blogs.filter(b => !b.hasPhoto).length;
    const completedPhotos = totalBlogs - missingPhotos;
    const publishedCount = blogs.filter(b => b.published).length;
    const draftCount = totalBlogs - publishedCount;
    const coveragePercent = totalBlogs > 0 ? Math.round((completedPhotos / totalBlogs) * 100) : 100;
    const unanalyzedCount = blogs.filter(b => !b.photoPlaces || b.photoPlaces.length === 0).length;

    // Count how many missing can be filled from existing database photos
    const autoFillableCount = blogs.filter(b => {
      if (b.hasPhoto) return false;
      const topics = extractBlogTopics(b);
      const known = findKnownBlogPhotos(b, topics);
      return known.length > 0;
    }).length;

    return {
      totalBlogs,
      missingPhotos,
      completedPhotos,
      publishedCount,
      draftCount,
      coveragePercent,
      unanalyzedCount,
      autoFillableCount
    };
  }, [blogs, knownDestinationPhotos]);

  // Categories
  const categoriesList = useMemo(() => {
    const set = new Set<string>();
    blogs.forEach(b => {
      if (b.category) set.add(b.category);
    });
    return Array.from(set).sort();
  }, [blogs]);

  // Filtered Blogs
  const filteredBlogs = useMemo(() => {
    return blogs.filter(blog => {
      if (activeTab === 'missing' && blog.hasPhoto) return false;
      if (activeTab === 'completed' && !blog.hasPhoto) return false;
      if (activeTab === 'drafts' && blog.published) return false;
      if (activeTab === 'unanalyzed' && (blog.photoPlaces?.length ?? 0) > 0) return false;

      if (selectedCategory !== 'all' && blog.category !== selectedCategory) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = blog.title.toLowerCase().includes(q);
        const matchesSlug = blog.slug.toLowerCase().includes(q);
        const matchesCat = (blog.category || '').toLowerCase().includes(q);
        const matchesExcerpt = (blog.excerpt || '').toLowerCase().includes(q);
        const matchesTags = (blog.tags || []).some(t => t.toLowerCase().includes(q));
        const matchesPlaces = (blog.photoPlaces || []).some(p => p.toLowerCase().includes(q));
        if (!matchesTitle && !matchesSlug && !matchesCat && !matchesExcerpt && !matchesTags && !matchesPlaces) {
          return false;
        }
      }

      return true;
    });
  }, [blogs, activeTab, selectedCategory, searchQuery]);

  // Grouped by Category
  const groupedByCategory = useMemo(() => {
    const groups: { [cat: string]: BlogItem[] } = {};
    filteredBlogs.forEach(b => {
      const cat = b.category || 'Uncategorized';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(b);
    });
    return Object.entries(groups).map(([category, items]) => ({
      category,
      items
    }));
  }, [filteredBlogs]);

  // Open Modal for Blog Photo
  const handleOpenPhotoSelector = async (blog: BlogItem) => {
    setActiveBlog(blog);
    setWikiResults([]);
    setManualImageUrl('');

    let topics = extractBlogTopics(blog);
    setExtractedTopics(topics);

    // Initial selected photo
    let initialSelected: WikimediaImageResult | null = null;
    if (blog.coverImage && blog.coverImage.trim()) {
      initialSelected = {
        id: `current-${blog.id}`,
        title: blog.title,
        thumbUrl: blog.coverImage,
        fullUrl: blog.coverImage,
        width: 1200,
        height: 675,
        source: 'Wikimedia Commons',
        license: 'Current Cover Photo'
      };
    }

    setSelectedImage(initialSelected);

    // If blog has no photoPlaces extracted yet, trigger fast on-demand AI analysis
    if (!blog.photoPlaces || blog.photoPlaces.length === 0) {
      triggerOnDemandAIAnalysis(blog, initialSelected !== null);
    } else {
      const initialQuery = topics[0]?.query || cleanPlaceQuery(blog.title);
      setCustomSearchQuery(initialQuery);
      setActiveTopicQuery(initialQuery);
      await performSearch(initialQuery, initialSelected !== null);
    }
  };

  // Trigger On-Demand AI Location Analysis for Single Blog
  const triggerOnDemandAIAnalysis = async (blog: BlogItem, hasPreselected: boolean) => {
    setIsAnalyzingSingle(true);
    try {
      const res = await fetch('/api/admin/blogs/analyze-photo-places/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blogId: blog.id,
          title: blog.title,
          excerpt: blog.excerpt,
          content: blog.content,
          category: blog.category
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.photoPlaces) && data.photoPlaces.length > 0) {
          const db = getDbInstance();
          if (db) {
            const now = new Date().toISOString();
            updateDoc(doc(db, 'blogs', blog.id), {
              photoPlaces: data.photoPlaces,
              updatedAt: now
            }).catch(e => console.warn('Firestore updateDoc error:', e));
          }

          const updatedBlog: BlogItem = {
            ...blog,
            photoPlaces: data.photoPlaces
          };

          // Update local blogs state
          setBlogs(prev => prev.map(b => (b.id === blog.id ? updatedBlog : b)));
          setActiveBlog(updatedBlog);

          const newTopics = extractBlogTopics(updatedBlog);
          setExtractedTopics(newTopics);

          const bestQuery = newTopics[0]?.query || data.photoPlaces[0];
          setCustomSearchQuery(bestQuery);
          setActiveTopicQuery(bestQuery);

          showToast(`⚡ AI extracted ${data.photoPlaces.length} photogenic places!`, 'success');
          await performSearch(bestQuery, hasPreselected);
          return;
        }
      }
    } catch (err) {
      console.warn('AI analysis error:', err);
    } finally {
      setIsAnalyzingSingle(false);
    }

    // Fallback to local topics
    const fallbackTopics = extractBlogTopics(blog);
    const fallbackQuery = fallbackTopics[0]?.query || cleanPlaceQuery(blog.title);
    setCustomSearchQuery(fallbackQuery);
    setActiveTopicQuery(fallbackQuery);
    await performSearch(fallbackQuery, hasPreselected);
  };

  // Perform search across Wikimedia Commons, Wikipedia Lead & Flickr
  const performSearch = async (queryText: string, hasPreselected: boolean = false) => {
    if (!queryText.trim()) return;

    setIsSearchingWiki(true);
    try {
      const results = await searchWikimediaImages(queryText, {
        limit: 30,
        width: 1200,
        includeWikipediaLead: true,
        includeFlickr: true,
        sourceFilter: sourceFilter
      });

      setWikiResults(results);
    } catch (err: any) {
      console.error('Search error:', err);
      showToast('Error searching images. Please try another query keyword.', 'error');
    } finally {
      setIsSearchingWiki(false);
    }
  };

  // Switch Active Topic Chip
  const handleSelectTopic = (topic: { name: string; query: string }) => {
    setActiveTopicQuery(topic.query);
    setCustomSearchQuery(topic.query);
    performSearch(topic.query, selectedImage !== null);
  };

  // Save Selected Cover Photo
  const handleSavePhoto = async (autoAdvance: boolean = false) => {
    if (!activeBlog) return;

    const photoUrl = manualImageUrl.trim() || selectedImage?.fullUrl || selectedImage?.thumbUrl || '';

    if (!photoUrl) {
      showToast('Please select or paste an image before saving.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const db = getDbInstance();
      const now = new Date().toISOString();

      if (db) {
        await updateDoc(doc(db, 'blogs', activeBlog.id), {
          coverImage: photoUrl,
          ...(activeBlog.photoPlaces ? { photoPlaces: activeBlog.photoPlaces } : {}),
          updatedAt: now
        });
      }

      fetch('/api/admin/blogs/update-photo/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blogId: activeBlog.id,
          coverImage: photoUrl
        })
      }).catch(e => console.warn('Server API update-photo background error:', e));

      const updatedBlog: BlogItem = {
        ...activeBlog,
        coverImage: photoUrl,
        hasPhoto: true,
        updatedAt: now
      };

      setBlogs(prev => prev.map(b => (b.id === activeBlog.id ? updatedBlog : b)));

      if (onBlogUpdated) {
        onBlogUpdated(updatedBlog);
      }

      showToast(`Saved cover photo for: "${activeBlog.title.slice(0, 40)}..."`, 'success');

      if (autoAdvance) {
        const nextMissing = blogs.find(b => !b.hasPhoto && b.id !== activeBlog.id);
        if (nextMissing) {
          handleOpenPhotoSelector(nextMissing);
          return;
        } else {
          showToast('🎉 All blogs now have cover photos!', 'success');
          setActiveBlog(null);
        }
      } else {
        setActiveBlog(null);
      }
    } catch (err: any) {
      console.error('Error saving blog photo:', err);
      showToast('Failed to save photo. Please try again.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Remove Cover Photo
  const handleRemovePhoto = async (blog: BlogItem) => {
    if (!confirm(`Are you sure you want to remove the cover photo for "${blog.title}"?`)) return;

    try {
      const db = getDbInstance();
      const now = new Date().toISOString();

      if (db) {
        await updateDoc(doc(db, 'blogs', blog.id), {
          coverImage: '',
          updatedAt: now
        });
      }

      fetch('/api/admin/blogs/update-photo/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blogId: blog.id,
          coverImage: ''
        })
      }).catch(e => console.warn(e));

      const updatedBlog: BlogItem = {
        ...blog,
        coverImage: '',
        hasPhoto: false,
        updatedAt: now
      };

      setBlogs(prev => prev.map(b => (b.id === blog.id ? updatedBlog : b)));
      if (onBlogUpdated) onBlogUpdated(updatedBlog);

      showToast(`Removed cover photo for: "${blog.title.slice(0, 35)}..."`, 'info');
      if (activeBlog?.id === blog.id) {
        setSelectedImage(null);
      }
    } catch (err: any) {
      console.error('Error removing photo:', err);
      showToast('Failed to remove photo.', 'error');
    }
  };

  // Auto-Fill All Matching Missing Blogs with 1-Click
  const handleAutoFillMatchingBlogs = async () => {
    setIsAutoFilling(true);
    try {
      const db = getDbInstance();
      let filledCount = 0;
      const updatedBlogs = [...blogs];
      const now = new Date().toISOString();

      for (let i = 0; i < updatedBlogs.length; i++) {
        const b = updatedBlogs[i];
        if (!b.hasPhoto) {
          const topics = extractBlogTopics(b);
          const known = findKnownBlogPhotos(b, topics);
          if (known.length > 0) {
            const photoUrl = known[0];
            updatedBlogs[i] = {
              ...b,
              coverImage: photoUrl,
              hasPhoto: true,
              updatedAt: now
            };

            if (db) {
              await updateDoc(doc(db, 'blogs', b.id), {
                coverImage: photoUrl,
                updatedAt: now
              });
            }

            filledCount++;
          }
        }
      }

      setBlogs(updatedBlogs);
      showToast(`🎉 Auto-filled cover photos for ${filledCount} blogs!`, 'success');
    } catch (err: any) {
      console.error('Auto-fill error:', err);
      showToast('Failed to auto-fill matching blogs.', 'error');
    } finally {
      setIsAutoFilling(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // ─── AI QUEUE PROCESSOR FOR PREVIOUS/EXISTING BLOGS ───
  // ═══════════════════════════════════════════════════════════════════════════

  // Open Queue Modal and initialize items
  const handleOpenQueueModal = (filterMode: 'all' | 'unanalyzed' | 'missingPhotos' = 'all') => {
    let targetBlogs = [...blogs];
    if (filterMode === 'unanalyzed') {
      targetBlogs = blogs.filter(b => !b.photoPlaces || b.photoPlaces.length === 0);
    } else if (filterMode === 'missingPhotos') {
      targetBlogs = blogs.filter(b => !b.hasPhoto);
    }

    const items: QueueItem[] = targetBlogs.map(b => ({
      id: b.id,
      blogId: b.id,
      title: b.title,
      category: b.category || 'Travel Guides',
      status: b.photoPlaces && b.photoPlaces.length > 0 ? 'success' : 'pending',
      extractedPlaces: b.photoPlaces || []
    }));

    setQueueItems(items);
    setQueueRunning(false);
    setQueuePaused(false);
    setQueueCurrentIndex(-1);
    setQueueLogs([]);
    setIsQueueModalOpen(true);
    addQueueLog('info', `📋 Initialized AI location analysis queue with ${items.length} articles.`);
  };

  // Start Queue Processing
  const handleStartQueue = async () => {
    if (queueItems.length === 0) return;

    setQueueRunning(true);
    queueRunningRef.current = true;
    setQueuePaused(false);
    queuePausedRef.current = false;
    addQueueLog('info', `🚀 Starting AI Location Analysis Queue for ${queueItems.length} blogs...`);

    const db = getDbInstance();

    for (let i = 0; i < queueItems.length; i++) {
      if (!queueRunningRef.current) break;

      while (queuePausedRef.current) {
        await new Promise(r => setTimeout(r, 500));
        if (!queueRunningRef.current) break;
      }
      if (!queueRunningRef.current) break;

      const item = queueItems[i];
      // Skip if already successfully analyzed
      if (item.status === 'success' && item.extractedPlaces && item.extractedPlaces.length > 0) {
        continue;
      }

      setQueueCurrentIndex(i);
      setQueueItems(prev =>
        prev.map((it, idx) => (idx === i ? { ...it, status: 'analyzing', error: undefined } : it))
      );

      const targetBlog = blogs.find(b => b.id === item.blogId);
      addQueueLog('info', `🤖 [${i + 1}/${queueItems.length}] Analyzing: "${item.title.slice(0, 45)}..."`);

      const startTime = Date.now();
      try {
        const res = await fetch('/api/admin/blogs/analyze-photo-places/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            blogId: item.blogId,
            title: targetBlog?.title || item.title,
            excerpt: targetBlog?.excerpt || '',
            content: targetBlog?.content || '',
            category: targetBlog?.category || item.category
          })
        });

        const timeTaken = Math.round((Date.now() - startTime) / 1000);

        if (res.ok) {
          const data = await res.json();
          const places: string[] = data.photoPlaces || [];

          if (places.length > 0) {
            // Write to client Firestore
            if (db) {
              const now = new Date().toISOString();
              updateDoc(doc(db, 'blogs', item.blogId), {
                photoPlaces: places,
                updatedAt: now
              }).catch(e => console.warn('Firestore updateDoc error:', e));
            }

            // Update local blogs state
            setBlogs(prev =>
              prev.map(b => (b.id === item.blogId ? { ...b, photoPlaces: places } : b))
            );

            // Update queue item
            setQueueItems(prev =>
              prev.map((it, idx) =>
                idx === i
                  ? {
                      ...it,
                      status: 'success',
                      extractedPlaces: places,
                      timeTaken
                    }
                  : it
              )
            );

            addQueueLog(
              'success',
              `✅ [${timeTaken}s] "${item.title.slice(0, 35)}..." -> Places: ${places.slice(0, 4).join(', ')}${
                places.length > 4 ? ` (+${places.length - 4})` : ''
              }`
            );
          } else {
            throw new Error('No places returned by AI');
          }
        } else {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `HTTP ${res.status}`);
        }
      } catch (err: any) {
        const timeTaken = Math.round((Date.now() - startTime) / 1000);
        addQueueLog('error', `❌ Failed "${item.title.slice(0, 35)}...": ${err.message}`);
        setQueueItems(prev =>
          prev.map((it, idx) =>
            idx === i
              ? {
                  ...it,
                  status: 'failed',
                  error: err.message,
                  timeTaken
                }
              : it
          )
        );
      }

      // Small delay between requests to guard rate limits
      if (i < queueItems.length - 1 && queueRunningRef.current) {
        await new Promise(r => setTimeout(r, queueDelaySeconds * 1000));
      }
    }

    setQueueRunning(false);
    queueRunningRef.current = false;
    setQueueCurrentIndex(-1);
    addQueueLog('success', '🎉 Batch AI location analysis queue finished!');
    showToast('Batch AI Location Analysis complete!', 'success');
  };

  const handlePauseQueue = () => {
    setQueuePaused(p => !p);
    addQueueLog('warn', !queuePaused ? '⏸ Pausing queue processing...' : '▶ Resuming queue processing...');
  };

  const handleStopQueue = () => {
    setQueueRunning(false);
    queueRunningRef.current = false;
    setQueuePaused(false);
    queuePausedRef.current = false;
    addQueueLog('error', '⏹ Queue processing stopped by user.');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* ─── TOAST NOTIFICATION ─── */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div
            className={`px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 text-white text-sm font-medium ${
              toast.type === 'success'
                ? 'bg-emerald-600'
                : toast.type === 'error'
                ? 'bg-red-600'
                : 'bg-indigo-600'
            }`}
          >
            {toast.type === 'success' && <CheckCircle2 className="h-5 w-5 shrink-0" />}
            {toast.type === 'error' && <AlertCircle className="h-5 w-5 shrink-0" />}
            {toast.type === 'info' && <Info className="h-5 w-5 shrink-0" />}
            <span>{toast.message}</span>
            <button onClick={() => setToast(null)} className="ml-2 text-white/80 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ─── TOP HEADER & ACTIONS ─── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 text-white rounded-xl shadow-sm">
              <BookOpen className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold text-gray-900">Blog Photo Manager</h1>
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs font-semibold">
                  Wikimedia &amp; AI Place Engine
                </Badge>
              </div>
              <p className="text-sm text-gray-500 mt-0.5">
                AI analyzes blog content in queue to extract verified landmark names &amp; queries high-res Wikimedia photography
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-end md:self-auto flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchAllBlogs}
            disabled={loading}
            className="flex items-center gap-2 text-gray-700 hover:bg-gray-50 rounded-xl"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>

          {/* AI Queue Analysis Button */}
          <Button
            size="sm"
            onClick={() => handleOpenQueueModal('all')}
            className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-2 shadow-sm font-semibold rounded-xl"
            title="Analyze all previous blogs in a queue with AI to extract precise tourist landmark place names"
          >
            <Cpu className="h-4 w-4 text-purple-200" />
            <span>Run AI Location Queue ({stats.totalBlogs})</span>
          </Button>

          {stats.autoFillableCount > 0 && (
            <Button
              size="sm"
              onClick={handleAutoFillMatchingBlogs}
              disabled={loading || isAutoFilling}
              className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2 shadow-sm font-semibold rounded-xl"
              title="Auto-fill matching destination photos from packages & existing blogs"
            >
              {isAutoFilling ? (
                <Loader2 className="h-4 w-4 animate-spin text-white" />
              ) : (
                <Sparkles className="h-4 w-4 text-emerald-200" />
              )}
              <span>Auto-Fill ({stats.autoFillableCount})</span>
            </Button>
          )}

          {stats.missingPhotos > 0 && (
            <Button
              size="sm"
              onClick={() => {
                const firstMissing = blogs.find(b => !b.hasPhoto);
                if (firstMissing) handleOpenPhotoSelector(firstMissing);
              }}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white flex items-center gap-2 shadow-sm rounded-xl font-medium"
            >
              <Sparkles className="h-4 w-4 text-blue-200" />
              <span>Fast Populate</span>
            </Button>
          )}

          <a
            href="/blogtripdm"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-indigo-600 bg-gray-100 hover:bg-indigo-50 rounded-xl transition-colors"
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Blog Admin Hub</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>

      {/* ─── STATS DASHBOARD ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white border-gray-200/80 shadow-sm hover:shadow-md transition-shadow rounded-2xl">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Articles</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalBlogs}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {stats.publishedCount} Published &bull; {stats.draftCount} Drafts
                </p>
              </div>
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                <Newspaper className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className={`border shadow-sm hover:shadow-md transition-shadow rounded-2xl ${
            stats.missingPhotos > 0 ? 'bg-amber-50/40 border-amber-200' : 'bg-white border-gray-200/80'
          }`}
        >
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Missing Cover Photos</p>
                <p className="text-2xl font-bold text-amber-900 mt-1">{stats.missingPhotos}</p>
                <p className="text-xs text-amber-600 mt-0.5">Need photo assignment</p>
              </div>
              <div className="p-3 bg-amber-100 text-amber-700 rounded-xl">
                <AlertCircle className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-gray-200/80 shadow-sm hover:shadow-md transition-shadow rounded-2xl">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-purple-700 uppercase tracking-wider">AI Places Analyzed</p>
                <p className="text-2xl font-bold text-purple-900 mt-1">
                  {stats.totalBlogs - stats.unanalyzedCount}{' '}
                  <span className="text-sm font-normal text-gray-500">/ {stats.totalBlogs}</span>
                </p>
                <p className="text-xs text-purple-600 mt-0.5">
                  {stats.unanalyzedCount > 0 ? `${stats.unanalyzedCount} need AI analysis` : '100% analyzed!'}
                </p>
              </div>
              <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                <Zap className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-gray-200/80 shadow-sm hover:shadow-md transition-shadow rounded-2xl">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="w-full mr-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wider">Photo Coverage</p>
                  <span className="text-sm font-bold text-indigo-600">{stats.coveragePercent}%</span>
                </div>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {stats.completedPhotos} <span className="text-sm font-normal text-gray-500">/ {stats.totalBlogs}</span>
                </p>
                <div className="w-full bg-gray-100 rounded-full h-2 mt-2 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${stats.coveragePercent}%` }}
                  />
                </div>
              </div>
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl shrink-0">
                <ImageIcon className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── SEARCH & FILTER CONTROLS ─── */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4">
          {/* Filter Tabs */}
          <div className="flex items-center gap-1 bg-gray-100/80 p-1 rounded-xl flex-wrap">
            <button
              onClick={() => setActiveTab('missing')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'missing'
                  ? 'bg-white text-amber-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <AlertCircle className="h-4 w-4 text-amber-500" />
              <span>Missing Photos</span>
              <span className="bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded-full font-bold">
                {stats.missingPhotos}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('all')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'all'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Layers className="h-4 w-4 text-gray-500" />
              <span>All Articles</span>
              <span className="bg-gray-200 text-gray-700 text-xs px-2 py-0.5 rounded-full font-medium">
                {stats.totalBlogs}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('completed')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'completed'
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span>With Photos</span>
              <span className="bg-emerald-100 text-emerald-800 text-xs px-2 py-0.5 rounded-full font-medium">
                {stats.completedPhotos}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('unanalyzed')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'unanalyzed'
                  ? 'bg-white text-purple-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Cpu className="h-4 w-4 text-purple-500" />
              <span>Need AI Places</span>
              <span className="bg-purple-100 text-purple-800 text-xs px-2 py-0.5 rounded-full font-bold">
                {stats.unanalyzedCount}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('drafts')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'drafts'
                  ? 'bg-white text-gray-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <FileText className="h-4 w-4 text-gray-500" />
              <span>Drafts</span>
              <span className="bg-gray-200 text-gray-700 text-xs px-2 py-0.5 rounded-full font-medium">
                {stats.draftCount}
              </span>
            </button>
          </div>

          {/* View mode switcher */}
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl text-xs font-medium">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'grid' ? 'bg-white text-gray-900 font-semibold shadow-sm' : 'text-gray-600'
              }`}
            >
              Grid View
            </button>
            <button
              onClick={() => setViewMode('grouped')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'grouped' ? 'bg-white text-gray-900 font-semibold shadow-sm' : 'text-gray-600'
              }`}
            >
              By Category
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'list' ? 'bg-white text-gray-900 font-semibold shadow-sm' : 'text-gray-600'
              }`}
            >
              List View
            </button>
          </div>
        </div>

        {/* Search & Category Filter Bar */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search blog title, AI place names, destination, or tags..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10 pr-10 rounded-xl bg-gray-50 border-gray-200 focus:bg-white transition-all text-sm h-10"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500 shrink-0" />
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="h-10 px-3 text-sm rounded-xl border border-gray-200 bg-gray-50 hover:bg-white transition-all text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Categories ({blogs.length})</option>
              {categoriesList.map(cat => {
                const count = blogs.filter(b => b.category === cat).length;
                return (
                  <option key={cat} value={cat}>
                    {cat} ({count})
                  </option>
                );
              })}
            </select>
          </div>
        </div>
      </div>

      {/* ─── BLOGS DISPLAY AREA ─── */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 bg-white rounded-2xl border border-gray-200/80">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-sm font-medium text-gray-500">Loading blog directory...</p>
        </div>
      ) : filteredBlogs.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-gray-200/80 p-8">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">No articles found in this filter</h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto mt-1">
            {activeTab === 'missing'
              ? 'Awesome work! All blogs matching the filter have cover photos assigned.'
              : activeTab === 'unanalyzed'
              ? 'All articles have been analyzed with AI location extraction.'
              : 'Try clearing your search keyword or switching category filters.'}
          </p>
          {(searchQuery || selectedCategory !== 'all' || activeTab !== 'all') && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
                setActiveTab('all');
              }}
              className="mt-4 rounded-xl"
            >
              Reset Filters
            </Button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredBlogs.map(blog => {
            const hasAiPlaces = blog.photoPlaces && blog.photoPlaces.length > 0;

            return (
              <Card
                key={blog.id}
                className={`overflow-hidden border transition-all duration-200 hover:shadow-lg flex flex-col rounded-2xl group ${
                  blog.hasPhoto ? 'bg-white border-gray-200' : 'bg-amber-50/20 border-amber-200/90'
                }`}
              >
                {/* Blog Cover Photo Box */}
                <div className="relative aspect-[16/9] bg-gray-100 overflow-hidden group">
                  {blog.coverImage ? (
                    <>
                      <img
                        src={blog.coverImage}
                        alt={blog.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-3">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setPreviewFullImageUrl(blog.coverImage || null)}
                          className="bg-white/90 hover:bg-white text-gray-900 text-xs h-7 px-2.5 rounded-lg shadow-sm"
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" /> Preview
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleRemovePhoto(blog)}
                          className="text-xs h-7 px-2.5 rounded-lg shadow-sm"
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1" /> Remove
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50/50 p-4 text-center">
                      <div className="p-3 bg-amber-100 text-amber-700 rounded-full mb-2 shadow-sm">
                        <ImageIcon className="h-6 w-6" />
                      </div>
                      <p className="text-xs font-bold text-amber-800">No Cover Photo</p>
                      <p className="text-[11px] text-amber-600 mt-0.5">Click "Choose Photo" to populate</p>
                    </div>
                  )}

                  {/* Status Badges Overlay */}
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                    <Badge
                      className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md ${
                        blog.published
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-purple-600 text-white shadow-sm'
                      }`}
                    >
                      {blog.published ? 'Published' : 'Draft'}
                    </Badge>
                    <Badge variant="secondary" className="bg-black/60 backdrop-blur-sm text-white text-[10px] px-2 py-0.5 rounded-md border-0">
                      {blog.category || 'Article'}
                    </Badge>
                  </div>

                  {blog.readTime && (
                    <div className="absolute top-2.5 right-2.5">
                      <span className="bg-black/60 backdrop-blur-sm text-white text-[10px] px-2 py-0.5 rounded-md flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {blog.readTime}
                      </span>
                    </div>
                  )}
                </div>

                {/* Card Content */}
                <CardContent className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <h3
                      className="font-bold text-gray-900 line-clamp-2 text-sm leading-snug group-hover:text-blue-600 transition-colors"
                      title={blog.title}
                    >
                      {blog.title}
                    </h3>
                    {blog.excerpt && (
                      <p className="text-xs text-gray-500 line-clamp-2 mt-1.5 leading-relaxed">{blog.excerpt}</p>
                    )}
                  </div>

                  {/* AI Extracted Places Chips */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                        <MapPin className="h-2.5 w-2.5 text-blue-500" />
                        <span>AI Places:</span>
                      </span>
                      {!hasAiPlaces && (
                        <span className="text-[10px] text-purple-600 font-semibold">Not analyzed</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {hasAiPlaces ? (
                        blog.photoPlaces!.slice(0, 3).map((place, i) => (
                          <span
                            key={i}
                            className="bg-blue-50 text-blue-700 border border-blue-100 text-[10px] px-2 py-0.5 rounded-md font-medium truncate max-w-[160px]"
                            title={place}
                          >
                            📍 {place}
                          </span>
                        ))
                      ) : (
                        <span className="text-[10px] text-gray-400 italic">Auto-extracts when opened in selector</span>
                      )}
                      {hasAiPlaces && blog.photoPlaces!.length > 3 && (
                        <span className="text-[10px] text-gray-400 self-center">
                          +{blog.photoPlaces!.length - 3}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleOpenPhotoSelector(blog)}
                      className={`flex-1 text-xs h-8 rounded-xl font-semibold flex items-center justify-center gap-1.5 ${
                        blog.hasPhoto
                          ? 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                          : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                      }`}
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>{blog.hasPhoto ? 'Change Photo' : 'Select Photo'}</span>
                    </Button>

                    <a
                      href={`/blog/${blog.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="View public post"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : viewMode === 'grouped' ? (
        <div className="space-y-8">
          {groupedByCategory.map(({ category, items }) => (
            <div key={category} className="space-y-4">
              <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-blue-600" />
                  <h3 className="font-bold text-gray-900 text-base">{category}</h3>
                  <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-700">
                    {items.length} articles
                  </Badge>
                </div>
                <span className="text-xs text-gray-500">
                  {items.filter(i => i.hasPhoto).length}/{items.length} with photos
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map(blog => (
                  <Card
                    key={blog.id}
                    className={`overflow-hidden border rounded-2xl hover:shadow-md transition-all ${
                      blog.hasPhoto ? 'bg-white border-gray-200' : 'bg-amber-50/20 border-amber-200'
                    }`}
                  >
                    <div className="flex gap-3 p-3">
                      <div className="relative w-28 h-20 bg-gray-100 rounded-xl overflow-hidden shrink-0">
                        {blog.coverImage ? (
                          <img src={blog.coverImage} alt={blog.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-amber-50 text-amber-700">
                            <ImageIcon className="h-5 w-5" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                          <h4 className="text-xs font-bold text-gray-900 line-clamp-2 leading-snug">
                            {blog.title}
                          </h4>
                          <span className="text-[10px] text-gray-400 mt-1 block">
                            {blog.photoPlaces?.[0] ? `📍 ${blog.photoPlaces[0]}` : (blog.readTime || '5 min')}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <Button
                            size="sm"
                            onClick={() => handleOpenPhotoSelector(blog)}
                            className="h-6 text-[11px] px-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            {blog.hasPhoto ? 'Edit' : 'Add Photo'}
                          </Button>
                          <a
                            href={`/blog/${blog.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-400 hover:text-blue-600 p-1"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* List View */
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 text-xs uppercase font-semibold">
                <tr>
                  <th className="py-3.5 px-4">Photo Preview</th>
                  <th className="py-3.5 px-4">Article Title &amp; Slug</th>
                  <th className="py-3.5 px-4">AI Landmark Places</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredBlogs.map(blog => (
                  <tr key={blog.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <div className="w-16 h-10 bg-gray-100 rounded-lg overflow-hidden shrink-0 border border-gray-200">
                        {blog.coverImage ? (
                          <img
                            src={blog.coverImage}
                            alt=""
                            className="w-full h-full object-cover cursor-pointer hover:opacity-80"
                            onClick={() => setPreviewFullImageUrl(blog.coverImage || null)}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-amber-50 text-amber-700 text-[10px] font-bold">
                            Missing
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 max-w-sm">
                      <p className="font-semibold text-gray-900 text-sm line-clamp-1">{blog.title}</p>
                      <span className="text-xs text-gray-400">/{blog.slug}</span>
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      {blog.photoPlaces && blog.photoPlaces.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {blog.photoPlaces.slice(0, 2).map((p, idx) => (
                            <span key={idx} className="bg-blue-50 text-blue-700 text-[10px] px-1.5 py-0.5 rounded font-medium truncate max-w-[120px]">
                              📍 {p}
                            </span>
                          ))}
                          {blog.photoPlaces.length > 2 && (
                            <span className="text-[10px] text-gray-400 self-center">+{blog.photoPlaces.length - 2}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-purple-600 font-medium">Pending AI Queue</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="secondary" className="text-xs font-normal">
                        {blog.category || 'Travel'}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <Badge
                        className={`text-xs ${
                          blog.published ? 'bg-emerald-100 text-emerald-800' : 'bg-purple-100 text-purple-800'
                        }`}
                      >
                        {blog.published ? 'Published' : 'Draft'}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleOpenPhotoSelector(blog)}
                          className="h-8 text-xs rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium"
                        >
                          <Sparkles className="h-3.5 w-3.5 mr-1" />
                          {blog.hasPhoto ? 'Change Photo' : 'Select Photo'}
                        </Button>
                        <a
                          href={`/blog/${blog.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════
          ─── PHOTO SELECTOR MODAL (Wikimedia Commons + AI Extractor) ───
         ═══════════════════════════════════════════════════════════════════════════ */}
      {activeBlog && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-5xl max-h-[92vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-gray-200 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <Badge className="bg-blue-600 text-white text-xs">{activeBlog.category || 'Blog'}</Badge>
                  <Badge variant="outline" className="text-xs">
                    /{activeBlog.slug}
                  </Badge>
                  {activeBlog.published ? (
                    <Badge className="bg-emerald-100 text-emerald-800 text-xs">Published</Badge>
                  ) : (
                    <Badge className="bg-purple-100 text-purple-800 text-xs">Draft</Badge>
                  )}
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 line-clamp-1">{activeBlog.title}</h2>
              </div>

              <button
                onClick={() => setActiveBlog(null)}
                className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors shrink-0"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
              {/* Smart Extracted Topic Chips */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                    <span>AI-Extracted Photogenic Landmarks &amp; Search Queries</span>
                  </label>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => triggerOnDemandAIAnalysis(activeBlog, selectedImage !== null)}
                    disabled={isAnalyzingSingle}
                    className="h-7 text-xs px-2.5 rounded-lg border-purple-200 text-purple-700 hover:bg-purple-50 flex items-center gap-1.5"
                  >
                    {isAnalyzingSingle ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Zap className="h-3 w-3 text-purple-600" />
                    )}
                    <span>Re-Analyze with AI</span>
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {extractedTopics.map((topic, idx) => {
                    const isSelected = activeTopicQuery === topic.query;
                    return (
                      <button
                        key={idx}
                        onClick={() => handleSelectTopic(topic)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-600/30'
                            : 'bg-blue-50/70 hover:bg-blue-100 text-blue-800 border border-blue-200/60'
                        }`}
                      >
                        <MapPin className="h-3 w-3 text-blue-500" />
                        <span>{topic.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Search & Source Bar */}
              <div className="bg-gray-50/80 p-4 rounded-2xl border border-gray-200/80 space-y-3">
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="Type custom landmark/city query (e.g. Nainital Lake, Kedarnath Temple)..."
                      value={customSearchQuery}
                      onChange={e => setCustomSearchQuery(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          performSearch(customSearchQuery, false);
                        }
                      }}
                      className="pl-10 rounded-xl bg-white border-gray-200 text-sm h-10"
                    />
                  </div>

                  <Button
                    onClick={() => performSearch(customSearchQuery, false)}
                    disabled={isSearchingWiki || !customSearchQuery.trim()}
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-10 px-5 font-semibold text-xs shrink-0"
                  >
                    {isSearchingWiki ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4 mr-1.5" />}
                    <span>Search Media</span>
                  </Button>
                </div>

                {/* Direct Manual Image URL Paste */}
                <div className="pt-2 border-t border-gray-200/70 flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-500 shrink-0">Or Direct URL:</span>
                  <Input
                    type="url"
                    placeholder="https://images.unsplash.com/... or any high-res image link"
                    value={manualImageUrl}
                    onChange={e => setManualImageUrl(e.target.value)}
                    className="h-8 text-xs bg-white rounded-lg"
                  />
                  {manualImageUrl && (
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedImage({
                          id: `manual-${Date.now()}`,
                          title: 'Direct URL Photo',
                          thumbUrl: manualImageUrl,
                          fullUrl: manualImageUrl,
                          width: 1200,
                          height: 675,
                          source: 'Wikimedia Commons',
                          license: 'Direct Link'
                        });
                        showToast('Applied custom image URL', 'info');
                      }}
                      className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shrink-0 px-3"
                    >
                      Use URL
                    </Button>
                  )}
                </div>
              </div>

              {/* Selected Photo Tray / Active Selection */}
              {selectedImage && (
                <div className="p-4 bg-blue-50/70 rounded-2xl border border-blue-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="relative w-24 h-16 bg-gray-200 rounded-xl overflow-hidden shrink-0 shadow-sm border border-blue-200">
                      <img
                        src={selectedImage.thumbUrl || selectedImage.fullUrl}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                        <Check className="h-5 w-5 text-white drop-shadow" />
                      </div>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-emerald-600 text-white text-[10px] px-1.5 py-0">Active Cover Choice</Badge>
                        <span className="text-[11px] text-gray-500">{selectedImage.source}</span>
                      </div>
                      <p className="text-xs font-bold text-gray-900 truncate mt-0.5">{selectedImage.title}</p>
                      <p className="text-[11px] text-gray-500 truncate">
                        {selectedImage.license || 'Free Creative Commons'} &bull; {selectedImage.width || 1200} &times;{' '}
                        {selectedImage.height || 675}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPreviewFullImageUrl(selectedImage.fullUrl || selectedImage.thumbUrl)}
                      className="h-8 text-xs bg-white text-gray-700 rounded-xl"
                    >
                      <Eye className="h-3.5 w-3.5 mr-1" /> Full View
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setSelectedImage(null)}
                      className="h-8 text-xs rounded-xl px-2.5"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Wikimedia Search Results Grid */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Globe className="h-3.5 w-3.5 text-blue-600" />
                    <span>Wikimedia &amp; Free Media Results ({wikiResults.length})</span>
                  </h4>
                  {isSearchingWiki && (
                    <span className="text-xs text-blue-600 flex items-center gap-1">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Searching...
                    </span>
                  )}
                </div>

                {isSearchingWiki ? (
                  <div className="py-16 flex flex-col items-center justify-center gap-2 bg-gray-50 rounded-2xl">
                    <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
                    <p className="text-xs font-medium text-gray-500">Searching Wikimedia Commons &amp; Wikipedia...</p>
                  </div>
                ) : wikiResults.length === 0 ? (
                  <div className="py-12 text-center bg-gray-50 rounded-2xl p-6">
                    <p className="text-sm font-semibold text-gray-700">No images returned for "{customSearchQuery}"</p>
                    <p className="text-xs text-gray-500 mt-1">Try one of the keyword chips above or paste an image URL.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
                    {wikiResults.map(img => {
                      const isChosen =
                        selectedImage?.fullUrl === img.fullUrl || selectedImage?.thumbUrl === img.thumbUrl;

                      return (
                        <div
                          key={img.id}
                          onClick={() => setSelectedImage(img)}
                          className={`group relative rounded-2xl overflow-hidden border-2 cursor-pointer transition-all duration-200 flex flex-col bg-white hover:shadow-md ${
                            isChosen
                              ? 'border-blue-600 ring-4 ring-blue-600/20 shadow-md'
                              : 'border-gray-200 hover:border-blue-400'
                          }`}
                        >
                          <div className="relative aspect-[16/10] bg-gray-100 overflow-hidden">
                            <img
                              src={img.thumbUrl}
                              alt={img.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              loading="lazy"
                            />

                            {/* Overlay check icon */}
                            {isChosen && (
                              <div className="absolute inset-0 bg-blue-600/30 flex items-center justify-center backdrop-blur-[1px]">
                                <div className="p-1.5 bg-blue-600 text-white rounded-full shadow-lg">
                                  <Check className="h-5 w-5" />
                                </div>
                              </div>
                            )}

                            {/* Source Pill */}
                            <div className="absolute top-1.5 left-1.5">
                              <span className="bg-black/60 backdrop-blur-sm text-white text-[9px] px-1.5 py-0.5 rounded font-medium">
                                {img.source}
                              </span>
                            </div>

                            {/* Full view button */}
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                setPreviewFullImageUrl(img.fullUrl || img.thumbUrl);
                              }}
                              className="absolute top-1.5 right-1.5 p-1 bg-black/60 text-white rounded hover:bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Zoom"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          <div className="p-2 flex-1 flex flex-col justify-between">
                            <p className="text-[11px] font-semibold text-gray-800 line-clamp-1" title={img.title}>
                              {img.title}
                            </p>
                            <div className="flex items-center justify-between text-[10px] text-gray-400 mt-1">
                              <span>
                                {img.width} &times; {img.height}
                              </span>
                              <span className="truncate max-w-[80px]">{img.license || 'Free'}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-gray-100 bg-gray-50/80 flex items-center justify-between gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveBlog(null)}
                className="rounded-xl text-xs"
              >
                Cancel
              </Button>

              <div className="flex items-center gap-2.5">
                <Button
                  size="sm"
                  onClick={() => handleSavePhoto(false)}
                  disabled={isSaving || !selectedImage}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold px-4 shadow-sm"
                >
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Check className="h-4 w-4 mr-1.5" />}
                  <span>Save Cover Photo</span>
                </Button>

                {stats.missingPhotos > 1 && (
                  <Button
                    size="sm"
                    onClick={() => handleSavePhoto(true)}
                    disabled={isSaving || !selectedImage}
                    className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-semibold px-4 shadow-sm"
                    title="Save current photo and jump straight to the next blog needing a photo"
                  >
                    <Sparkles className="h-4 w-4 mr-1.5 text-emerald-200" />
                    <span>Save &amp; Next Missing Blog</span>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════
          ─── AI LOCATION ANALYSIS BATCH QUEUE MODAL ───
         ═══════════════════════════════════════════════════════════════════════════ */}
      {isQueueModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-in fade-in">
          <div className="bg-white w-full max-w-4xl max-h-[92vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-gray-200">
            {/* Queue Modal Header */}
            <div className="p-5 sm:p-6 border-b border-gray-100 bg-gradient-to-r from-purple-50 via-indigo-50 to-white flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-purple-600 text-white rounded-xl shadow-sm">
                    <Cpu className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">AI Location Analysis Queue</h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Extracts verified tourist landmarks &amp; photogenic place names from previous blog articles
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  if (queueRunning) {
                    if (!confirm('Queue is currently running. Are you sure you want to close?')) return;
                    handleStopQueue();
                  }
                  setIsQueueModalOpen(false);
                }}
                className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Queue Body */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
              {/* Progress & Controls Box */}
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200/80 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">Queue Progress</span>
                    <p className="text-xl font-bold text-gray-900 mt-0.5">
                      {queueItems.filter(it => it.status === 'success').length} / {queueItems.length} Analyzed
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {!queueRunning ? (
                      <Button
                        onClick={handleStartQueue}
                        className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl h-9 px-4 text-xs font-semibold flex items-center gap-1.5 shadow-sm"
                      >
                        <Play className="h-3.5 w-3.5 fill-white" />
                        <span>Start AI Queue</span>
                      </Button>
                    ) : (
                      <>
                        <Button
                          onClick={handlePauseQueue}
                          variant="outline"
                          className="h-9 px-3 text-xs font-semibold rounded-xl"
                        >
                          {queuePaused ? (
                            <>
                              <Play className="h-3.5 w-3.5 mr-1" /> Resume
                            </>
                          ) : (
                            <>
                              <Pause className="h-3.5 w-3.5 mr-1" /> Pause
                            </>
                          )}
                        </Button>
                        <Button
                          onClick={handleStopQueue}
                          variant="destructive"
                          className="h-9 px-3 text-xs font-semibold rounded-xl"
                        >
                          <Square className="h-3.5 w-3.5 mr-1 fill-white" /> Stop
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 h-2.5 rounded-full transition-all duration-300"
                    style={{
                      width: `${
                        queueItems.length > 0
                          ? Math.round(
                              (queueItems.filter(it => it.status === 'success').length / queueItems.length) * 100
                            )
                          : 0
                      }%`
                    }}
                  />
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                  <ListOrdered className="h-3.5 w-3.5 text-purple-600" />
                  <span>Queue Items ({queueItems.length})</span>
                </h4>

                <div className="max-h-60 overflow-y-auto divide-y divide-gray-100 border border-gray-200 rounded-2xl bg-white">
                  {queueItems.map((item, idx) => (
                    <div
                      key={item.id}
                      className={`p-3 text-xs flex items-center justify-between gap-3 ${
                        queueCurrentIndex === idx ? 'bg-purple-50/80 font-medium' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-gray-400 text-[10px]">#{idx + 1}</span>
                          <p className="font-semibold text-gray-900 truncate">{item.title}</p>
                        </div>
                        {item.extractedPlaces && item.extractedPlaces.length > 0 && (
                          <p className="text-[11px] text-purple-700 mt-0.5 truncate">
                            📍 {item.extractedPlaces.join(', ')}
                          </p>
                        )}
                      </div>

                      <div>
                        {item.status === 'analyzing' && (
                          <Badge className="bg-purple-100 text-purple-800 border-0 flex items-center gap-1">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            <span>Analyzing</span>
                          </Badge>
                        )}
                        {item.status === 'success' && (
                          <Badge className="bg-emerald-100 text-emerald-800 border-0 flex items-center gap-1">
                            <Check className="h-3 w-3" />
                            <span>Ready</span>
                          </Badge>
                        )}
                        {item.status === 'failed' && (
                          <Badge className="bg-red-100 text-red-800 border-0">Failed</Badge>
                        )}
                        {item.status === 'pending' && (
                          <Badge variant="secondary" className="text-gray-500">
                            Queued
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Console Live Logs */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-gray-500" />
                  <span>Real-Time Logs</span>
                </h4>
                <div className="p-3 bg-slate-900 text-slate-200 font-mono text-[11px] rounded-2xl h-40 overflow-y-auto space-y-1.5 border border-slate-800">
                  {queueLogs.length === 0 ? (
                    <p className="text-slate-500 italic">Click "Start AI Queue" to begin analyzing articles...</p>
                  ) : (
                    queueLogs.map(log => (
                      <div key={log.id} className="flex items-start gap-2">
                        <span className="text-slate-500 shrink-0">[{log.timestamp}]</span>
                        <span
                          className={
                            log.type === 'success'
                              ? 'text-emerald-400'
                              : log.type === 'error'
                              ? 'text-red-400'
                              : log.type === 'warn'
                              ? 'text-amber-300'
                              : 'text-slate-200'
                          }
                        >
                          {log.message}
                        </span>
                      </div>
                    ))
                  )}
                  <div ref={logsEndRef} />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-gray-100 bg-gray-50 flex items-center justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (queueRunning) handleStopQueue();
                  setIsQueueModalOpen(false);
                }}
                className="rounded-xl text-xs"
              >
                Close Queue Window
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── FULL IMAGE PREVIEW LIGHTBOX ─── */}
      {previewFullImageUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setPreviewFullImageUrl(null)}
        >
          <div className="relative max-w-5xl max-h-[90vh] flex flex-col items-center" onClick={e => e.stopPropagation()}>
            <img
              src={previewFullImageUrl}
              alt="High Resolution Preview"
              className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl"
            />
            <div className="flex items-center gap-3 mt-3">
              <a
                href={previewFullImageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white text-xs bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg flex items-center gap-1.5 backdrop-blur-sm"
              >
                <span>Open Full Size</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
              <button
                onClick={() => setPreviewFullImageUrl(null)}
                className="text-white text-xs bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg backdrop-blur-sm"
              >
                Close (ESC)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
