import React, { useState } from 'react';
import ListingCard from '@/components/ListingCard';
import { event } from '@/lib/gtag';
import {
  PackageListing,
  getCategoryCollections,
  getPopularDestinations,
  getRecentlyAddedPackages,
  getIntentRails,
  getStateStories,
  getDynamicExperiences,
  getDynamicDestinationSections,
  getDiscoveredDestinationPills,
} from '@/lib/discoveryEngine';
import {
  ChevronLeft,
  ChevronRight,
  MapPin,
  Compass,
  ArrowRight,
  Globe,
  Map,
} from 'lucide-react';

interface LandingDiscoveryProps {
  listings: PackageListing[];
  onView: (listing: PackageListing) => void;
  onBook: (listing: PackageListing) => void;
  onChat: (listing: PackageListing) => void;
  onWishlist: (listingId: string) => void;
  wishlist: string[];
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  allDestinations: string[];
  onSelectCategoryFilter: (filter: { category: string; subcategory?: string; title: string }) => void;
  initialPackageTypeTab?: 'all' | 'domestic' | 'international';
}

export default function LandingDiscovery({
  listings,
  onView,
  onBook,
  onChat,
  onWishlist,
  wishlist,
  searchTerm,
  setSearchTerm,
  allDestinations,
  onSelectCategoryFilter,
  initialPackageTypeTab,
}: LandingDiscoveryProps) {
  // Tab state for Domestic vs International
  const [packageTypeTab, setPackageTypeTab] = useState<'all' | 'domestic' | 'international'>(
    initialPackageTypeTab || 'all'
  );

  React.useEffect(() => {
    if (initialPackageTypeTab) {
      setPackageTypeTab(initialPackageTypeTab);
    }
  }, [initialPackageTypeTab]);

  // Counts
  const approvedListings = listings.filter((l) => l.approved !== false);
  const domesticCount = approvedListings.filter((l) => l.packageType !== 'international').length;
  const intlCount = approvedListings.filter((l) => l.packageType === 'international').length;

  const [aiStories, setAiStories] = useState<any[]>([]);

  React.useEffect(() => {
    async function loadPublishedStories() {
      try {
        const res = await fetch('/api/admin/destination-stories');
        const data = await res.json();
        if (data.success && Array.isArray(data.stories)) {
          const publishedOnly = data.stories.filter((s: any) => s.published !== false);
          if (publishedOnly.length > 0) {
            setAiStories(publishedOnly);
          }
        }
      } catch (err) {
        console.warn('Could not load custom AI destination stories:', err);
      }
    }
    loadPublishedStories();
  }, []);

  // Dynamic auto-created destination sections & navigation pills
  const destinationSections = getDynamicDestinationSections(listings, packageTypeTab);
  const destinationPills = getDiscoveredDestinationPills(listings, packageTypeTab);

  // Data collections
  const popularDestinations = getPopularDestinations(listings, 1);
  const displayStories = aiStories;
  const categoryCollections = getCategoryCollections(listings);
  const dynamicExperiences = getDynamicExperiences(listings);
  const recentlyAdded = getRecentlyAddedPackages(listings, 12);
  const intentRails = getIntentRails(listings);

  // Horizontal scroll helper
  const scrollRail = (railId: string, direction: 'left' | 'right') => {
    const el = document.getElementById(railId);
    if (el) {
      const scrollAmount = direction === 'left' ? -380 : 380;
      el.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // Thumbnail helper
  const getThumbnail = (pkg: PackageListing) => {
    if (pkg.placesCovered?.[0]?.imageUrls?.[0]) return pkg.placesCovered[0].imageUrls[0];
    if (pkg.photos?.[0]) return pkg.photos[0];
    if (pkg.itinerary?.[0]?.imageUrl) return pkg.itinerary[0].imageUrl;
    return null;
  };

  // Price formatting helper
  const formatPrice = (rawCost: any) => {
    if (!rawCost) return null;
    const num = parseFloat(String(rawCost).replace(/[^0-9.]/g, ''));
    if (isNaN(num) || num <= 0) return null;
    return `₹${num.toLocaleString('en-IN')}`;
  };

  return (
    <div className="w-full bg-white text-slate-900 font-sans pb-16 pt-2">
      {/* ==========================================
          TOP DESTINATION PILLS STRIP (THRILLOPHILIA STYLE)
          ========================================== */}
      {/* {packageTypeTab !== 'all' && destinationPills.length > 0 && (
        <div className="w-full bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-2xs py-2.5 px-4 sm:px-8 mb-6">
          <div className="max-w-[1600px] mx-auto flex items-center gap-3 overflow-x-auto scrollbar-hide py-0.5">
            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider shrink-0">
              Top Destinations:
            </span>
            {destinationPills.map((pill) => (
              <button
                key={pill.name}
                onClick={() => {
                  const secId = `section-dest-${pill.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
                  const el = document.getElementById(secId);
                  if (el) {
                    el.scrollIntoView({ behavior: 'smooth' });
                  } else {
                    setSearchTerm(pill.name);
                  }
                }}
                className="px-3.5 py-1.5 rounded-full bg-slate-50 hover:bg-orange-500 hover:text-white text-slate-800 text-xs font-bold transition-all shrink-0 border border-slate-200/80 shadow-2xs hover:shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <span>{pill.name}</span>
                <span className="text-[10px] opacity-75 font-mono px-1.5 py-0.2 bg-black/5 rounded-full">
                  {pill.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      )} */}

      {/* ==========================================
          DYNAMIC DESTINATION SECTIONS (THRILLOPHILIA STYLE)
          Only rendered when user clicks Domestic or International!
          Auto-created whenever agency posts a listing (Assam, Europe, Kashmir, Goa, etc.)
          ========================================== */}
      {packageTypeTab !== 'all' && destinationSections.length > 0 && (
        <div className="space-y-4 border-b border-slate-200/80 pb-8 mb-6">
          <div className="px-4 sm:px-8 lg:px-12 w-full max-w-[1600px] mx-auto pt-2 flex items-center justify-between">
            <div>
              {/* <span className="text-xs font-extrabold text-orange-600 uppercase tracking-wider">
                {packageTypeTab === 'domestic' ? '🇮🇳 Domestic Destination Cards' : '✈️ International Destination Cards'}
              </span> */}
              {/* <h2 
                className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-0.5"
                style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}
              >
                Packages by Destination ({destinationSections.length} Locations)
              </h2> */}
            </div>
          </div>
          {destinationSections.map((sec) => (
            <section
              key={sec.id}
              id={`section-${sec.id}`}
              className="py-8 px-4 sm:px-8 lg:px-12 w-full max-w-[1600px] mx-auto border-b border-slate-100 scroll-mt-28"
            >
              {/* Section Header: Unique Font for State / Country Name */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <h2 
                    className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight drop-shadow-xs"
                    style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}
                  >
                    {sec.name}
                  </h2>
                  {/* <span className="bg-gradient-to-r from-orange-50 to-amber-50 text-orange-700 text-[11px] font-extrabold px-3 py-1 rounded-full border border-orange-200/80 shadow-2xs flex items-center gap-1">
                    <span>{sec.packageType === 'international' ? '✈️ Country' : '🇮🇳 State'}</span>
                    <span>•</span>
                    <span>{sec.packageCount} {sec.packageCount === 1 ? 'Package' : 'Packages'}</span>
                  </span> */}
                </div>

                <button
                  onClick={() => setSearchTerm(sec.name)}
                  className="flex items-center gap-2 text-xs font-extrabold text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 px-4 py-2 rounded-full transition-all group border border-orange-200/60 shadow-2xs"
                >
                  <span>View All</span>
                  <div className="w-5 h-5 rounded-full bg-orange-500 text-white flex items-center justify-center group-hover:translate-x-0.5 transition-transform shadow-xs">
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </button>
              </div>

              {/* Horizontal Scroll Rail / Carousel */}
              <div className="relative group/rail">
                {sec.listings.length > 3 && (
                  <>
                    <button
                      onClick={() => scrollRail(`rail-${sec.id}`, 'left')}
                      className="absolute -left-4 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-white shadow-md border border-slate-200 text-slate-700 hover:bg-orange-500 hover:text-white flex items-center justify-center transition-all opacity-0 group-hover/rail:opacity-100 hover:scale-110 active:scale-95"
                      aria-label="Scroll left"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => scrollRail(`rail-${sec.id}`, 'right')}
                      className="absolute -right-4 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-white shadow-md border border-slate-200 text-slate-700 hover:bg-orange-500 hover:text-white flex items-center justify-center transition-all opacity-0 group-hover/rail:opacity-100 hover:scale-110 active:scale-95"
                      aria-label="Scroll right"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}

                <div
                  id={`rail-${sec.id}`}
                  className="flex gap-6 overflow-x-auto pb-4 pt-1 scrollbar-hide snap-x scroll-smooth w-full"
                >
                  {sec.listings.map((pkg) => (
                    <div key={pkg.id} className="min-w-[280px] sm:min-w-[320px] md:min-w-[350px] max-w-[380px] snap-start shrink-0 flex flex-col h-full self-stretch">
                      <ListingCard
                        listing={pkg}
                        onView={onView}
                        onBook={onBook}
                        onChat={onChat}
                        onWishlist={onWishlist}
                        isWishlisted={wishlist.includes(pkg.id)}
                        variant="user"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Empty state when Domestic or International has 0 packages */}
      {packageTypeTab !== 'all' && destinationSections.length === 0 && (
        <div className="py-16 px-4 text-center flex flex-col items-center justify-center bg-slate-50/60 rounded-3xl border border-slate-200 border-dashed my-8 max-w-4xl mx-auto">
          <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mb-4 shadow-xs">
            <Globe className="w-8 h-8 text-orange-500" />
          </div>
          <h3 className="text-xl font-black text-slate-900 mb-2">
            No {packageTypeTab === 'international' ? 'International' : 'Domestic'} Packages Posted Yet
          </h3>
          <p className="text-sm text-slate-500 max-w-md mb-6">
            Agencies have not added any {packageTypeTab === 'international' ? 'international' : 'domestic'} package listings yet. Switch tabs to discover available packages!
          </p>
          <button
            onClick={() => setPackageTypeTab(packageTypeTab === 'international' ? 'domestic' : 'all')}
            className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs rounded-full shadow-sm transition-all cursor-pointer"
          >
            Explore {packageTypeTab === 'international' ? 'Domestic Packages' : 'All Packages'}
          </button>
        </div>
      )}

      {/* Generic Categories Page Sections — Only shown when 'Explore All' (Categories) tab is active */}
      {packageTypeTab === 'all' && (
        <>
          {/* ==========================================
              SECTION 1 — Asymmetric Destination Discovery (Explore Destinations)
              ========================================== */}
          {popularDestinations.length > 0 && (
            <section className="py-8 px-4 sm:px-8 lg:px-12 w-full max-w-[1600px] mx-auto border-b border-slate-100">
              <div className="flex items-end justify-between mb-8">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">
                    Explore Popular Destinations
                  </h2>
                </div>
              </div>

          {/* Uniform Grid Layout */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 w-full">
            {popularDestinations.slice(0, 8).map((dest) => (
              <div
                key={dest.name}
                onClick={() => setSearchTerm(dest.name)}
                className="group cursor-pointer relative rounded-md overflow-hidden bg-slate-900 border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-300 h-52 sm:h-56 w-full flex flex-col justify-end p-5"
              >
                {dest.coverImage ? (
                  <img
                    src={dest.coverImage}
                    alt={dest.name}
                    className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:scale-108 transition-transform duration-500"
                  />
                ) : (
                  <div className="absolute inset-0 bg-slate-800 flex items-center justify-center text-slate-500">
                    <MapPin className="w-8 h-8" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/30 to-transparent opacity-85 group-hover:opacity-70 transition-opacity" />

                <div className="relative z-10">
                  <span className="bg-orange-500 text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-sm inline-block mb-1.5 shadow-xs">
                    {dest.packageCount} {dest.packageCount === 1 ? 'Package' : 'Packages'}
                  </span>
                  <h4 className="text-base font-black text-white line-clamp-1">{dest.name}</h4>
                  {dest.startingPrice && (
                    <p className="text-xs font-bold text-amber-300 mt-0.5">
                      From ₹{dest.startingPrice.toLocaleString('en-IN')}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ==========================================
          SECTION 2 — State → Story → Places → Experiences (Editorial Storytelling)
          ========================================== */}
      {displayStories.length > 0 && (
        <>
          {/* Schema.org JSON-LD Structured Data for Google Indexing */}
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "ItemList",
                "name": "Featured Destination Stories",
                "description": "Curated travel stories, guides and itineraries generated from verified packages.",
                "itemListElement": displayStories.map((story: any, idx: number) => ({
                  "@type": "ListItem",
                  "position": idx + 1,
                  "item": {
                    "@type": "TouristDestination",
                    "name": story.title || story.stateName,
                    "description": story.narrative,
                    "image": story.coverImage || undefined,
                    "address": {
                      "@type": "PostalAddress",
                      "addressRegion": story.stateName,
                      "addressCountry": "India"
                    },
                    "keywords": Array.isArray(story.seoKeywords) ? story.seoKeywords.join(', ') : undefined
                  }
                }))
              })
            }}
          />

          <section className="py-12 px-4 sm:px-8 lg:px-12 w-full max-w-[1600px] mx-auto border-b border-slate-100">
            <div className="mb-8">
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">
                Destination Stories
              </h2>
            </div>

            <div className="space-y-12">
            {displayStories.map((story: any, index: number) => (
              <div
                key={story.id || story.stateName || index}
                className="py-4"
              >
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                  {/* Left Column: Visual Photography */}
                  <div className="lg:col-span-5 relative aspect-[16/10] sm:aspect-[4/3] rounded-md overflow-hidden bg-slate-200 border border-slate-200/80 shadow-inner group">
                    {story.coverImage ? (
                      <img
                        src={story.coverImage}
                        alt={story.title || story.stateName}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400">
                        <Compass className="w-12 h-12" />
                      </div>
                    )}
                    <span className="absolute top-4 left-4 bg-slate-900/80 backdrop-blur-md text-white text-xs font-black px-3.5 py-1.5 rounded-sm border border-white/20">
                      {story.packageCount || 1} {(story.packageCount || 1) === 1 ? 'Package Available' : 'Packages Available'}
                    </span>
                  </div>

                  {/* Right Column: State Story Details */}
                  <div className="lg:col-span-7 flex flex-col justify-between">
                    <div>
                      <h3 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight mb-4">
                        {story.title || story.stateName}
                      </h3>

                      <div className="text-xs sm:text-sm text-slate-600 font-medium mb-6 leading-relaxed space-y-2">
                        {(story.narrative || story.description || `Explore verified itineraries across ${story.stateName} covering major cultural landmarks, scenic routes, and local experiences.`)
                          .split('\n\n')
                          .map((paragraph: string, pIdx: number) => (
                            <p key={pIdx}>{paragraph}</p>
                          ))}
                      </div>
                    </div>

                    {/* CTA Button */}
                    <div>
                      <button
                        onClick={() => {
                          setSearchTerm(story.stateName);
                          if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="px-6 py-3 rounded-md bg-slate-900 hover:bg-orange-600 text-white text-xs font-extrabold transition-all shadow-sm flex items-center gap-2 group/btn"
                      >
                        <span>Explore {story.stateName} Packages</span>
                        <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </>
    )}

      {/* ==========================================
          SECTION 3 — Unified Experience & Theme Explorer
          ========================================== */}
      {dynamicExperiences.length > 0 && (
        <section className="py-12 px-4 sm:px-8 lg:px-12 w-full max-w-[1600px] mx-auto border-b border-slate-100">
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">
                Find Trips by Experience
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 w-full">
            {dynamicExperiences.map((exp) => (
              <div
                key={exp.name}
                onClick={() => setSearchTerm(exp.name)}
                className="group cursor-pointer relative rounded-md overflow-hidden bg-slate-900 border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-300 p-5 flex flex-col justify-end h-52 sm:h-56 w-full"
              >
                {exp.coverImage ? (
                  <img
                    src={exp.coverImage}
                    alt={exp.name}
                    className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:scale-108 transition-transform duration-700"
                  />
                ) : (
                  <div className="absolute inset-0 bg-slate-800 flex items-center justify-center text-slate-500">
                    <Compass className="w-10 h-10" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/35 to-transparent opacity-85 group-hover:opacity-70 transition-opacity" />

                <div className="relative z-10">
                  <span className="bg-orange-500 text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-sm inline-block mb-1.5 shadow-xs">
                    {exp.packageCount} {exp.packageCount === 1 ? 'Package' : 'Packages'}
                  </span>
                  <h3 className="text-lg sm:text-xl font-black text-white line-clamp-1 drop-shadow-xs">{exp.name}</h3>
                  {exp.startingPrice && (
                    <p className="text-xs font-bold text-amber-300 mt-0.5">
                      From ₹{exp.startingPrice.toLocaleString('en-IN')}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ==========================================
          SECTION 5 — Marketplace Product Rails (Weekend Getaways, Group Escapes, etc.)
          ========================================== */}
      {intentRails.map((rail) => (
        <section key={rail.id} className="py-12 px-4 sm:px-8 lg:px-12 w-full max-w-[1600px] mx-auto border-b border-slate-100">
          <div className="flex items-end justify-between mb-6">
            <div>
             
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">
                {rail.title}
              </h2>
            </div>
            {rail.listings.length > 3 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => scrollRail(`rail-${rail.id}`, 'left')}
                  className="w-9 h-9 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center justify-center transition-colors shadow-xs hover:border-orange-300"
                  aria-label="Scroll left"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => scrollRail(`rail-${rail.id}`, 'right')}
                  className="w-9 h-9 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center justify-center transition-colors shadow-xs hover:border-orange-300"
                  aria-label="Scroll right"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>

          <div
            id={`rail-${rail.id}`}
            className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide snap-x scroll-smooth w-full"
          >
            {rail.listings.map((pkg) => (
              <div key={pkg.id} className="min-w-[280px] sm:min-w-[320px] md:min-w-[350px] max-w-[380px] snap-start shrink-0 flex flex-col h-full self-stretch">
                <ListingCard
                  listing={pkg}
                  onView={onView}
                  onBook={onBook}
                  onChat={onChat}
                  onWishlist={onWishlist}
                  isWishlisted={wishlist.includes(pkg.id)}
                  variant="user"
                />
              </div>
            ))}
          </div>
        </section>
      ))}

      {/* ==========================================
          SECTION 6 — "Recently Added Packages" Rail
          ========================================== */}
      {recentlyAdded.length > 0 && (
        <section className="py-12 px-4 sm:px-8 lg:px-12 w-full max-w-[1600px] mx-auto">
          <div className="flex items-end justify-between mb-6">
            <div>
              
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">
                Recently Added Packages
              </h2>
            
            </div>
            {recentlyAdded.length > 3 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => scrollRail('rail-recently-added', 'left')}
                  className="w-9 h-9 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center justify-center transition-colors shadow-xs hover:border-orange-300"
                  aria-label="Scroll left"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => scrollRail('rail-recently-added', 'right')}
                  className="w-9 h-9 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center justify-center transition-colors shadow-xs hover:border-orange-300"
                  aria-label="Scroll right"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>

          <div
            id="rail-recently-added"
            className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide snap-x scroll-smooth w-full"
          >
            {recentlyAdded.map((pkg) => (
              <div key={pkg.id} className="min-w-[280px] sm:min-w-[320px] md:min-w-[350px] max-w-[380px] snap-start shrink-0 flex flex-col h-full self-stretch">
                <ListingCard
                  listing={pkg}
                  onView={onView}
                  onBook={onBook}
                  onChat={onChat}
                  onWishlist={onWishlist}
                  isWishlisted={wishlist.includes(pkg.id)}
                  variant="user"
                />
              </div>
            ))}
          </div>
        </section>
      )}
        </>
      )}
    </div>
  );
}
