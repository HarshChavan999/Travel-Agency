'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';

interface Blog {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  coverImage: string;
  category: string;
  tags: string[];
  author: string;
  publishedAt: string;
  readTime: string;
}

const CATEGORIES = [
  'All',
  'Travel Tips',
  'Destinations',
  'Budget Travel',
  'Luxury Travel',
  'Adventure',
  'Family Travel',
  'Solo Travel',
  'Food & Culture',
  'Travel Guides',
  'India Travel',
  'International Travel',
  'News & Updates'
];

const CATEGORY_PALETTE: Record<string, { bg: string; text: string; border: string }> = {
  'Travel Tips':        { bg: 'rgba(249,115,22,0.12)', text: '#ea580c', border: 'rgba(249,115,22,0.25)' },
  'Destinations':       { bg: 'rgba(167,139,250,0.12)', text: '#7c3aed', border: 'rgba(167,139,250,0.25)' },
  'Budget Travel':      { bg: 'rgba(52,211,153,0.12)', text: '#059669', border: 'rgba(52,211,153,0.25)' },
  'Luxury Travel':      { bg: 'rgba(251,191,36,0.12)', text: '#d97706', border: 'rgba(251,191,36,0.25)' },
  'Adventure':          { bg: 'rgba(239,68,68,0.12)', text: '#dc2626', border: 'rgba(239,68,68,0.25)' },
  'India Travel':       { bg: 'rgba(99,179,237,0.12)', text: '#3182ce', border: 'rgba(99,179,237,0.25)' },
  'Family Travel':      { bg: 'rgba(236,72,153,0.12)', text: '#db2777', border: 'rgba(236,72,153,0.25)' },
  'Solo Travel':        { bg: 'rgba(34,211,238,0.12)', text: '#0891b2', border: 'rgba(34,211,238,0.25)' },
  'Food & Culture':     { bg: 'rgba(244,63,94,0.12)', text: '#e11d48', border: 'rgba(244,63,94,0.25)' },
  'Travel Guides':      { bg: 'rgba(124,58,237,0.12)', text: '#6d28d9', border: 'rgba(124,58,237,0.25)' },
  'International Travel':{ bg: 'rgba(59,130,246,0.12)', text: '#2563eb', border: 'rgba(59,130,246,0.25)' },
  'News & Updates':     { bg: 'rgba(75,85,99,0.12)', text: '#4b5563', border: 'rgba(75,85,99,0.25)' },
  'default':            { bg: 'rgba(249,115,22,0.12)', text: '#ea580c', border: 'rgba(249,115,22,0.25)' },
};

const FALLBACK_GRADIENTS = [
  'linear-gradient(135deg,#f8fafc 0%,#e2e8f0 100%)',
  'linear-gradient(135deg,#fdf4ff 0%,#f3e8ff 100%)',
  'linear-gradient(135deg,#f0fdf4 0%,#dcfce7 100%)',
  'linear-gradient(135deg,#fff7ed 0%,#ffedd5 100%)',
];

function formatDate(d: string) {
  if (!d) return '';
  try { return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); }
  catch { return d; }
}

function getRelativeTime(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    if (diffMs < 60000) return 'Just now';
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

export default function BlogClient({ initialBlogs }: { initialBlogs: Blog[] }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const filteredBlogs = useMemo(() => {
    return initialBlogs.filter(blog => {
      const matchesSearch = blog.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        blog.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
        blog.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCategory = selectedCategory === 'All' || blog.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [initialBlogs, searchQuery, selectedCategory]);

  const featured = useMemo(() => {
    // If we're filtering, don't separate a featured post
    if (searchQuery || selectedCategory !== 'All') return null;
    return filteredBlogs[0] || null;
  }, [filteredBlogs, searchQuery, selectedCategory]);

  const restBlogs = useMemo(() => {
    if (featured) return filteredBlogs.slice(1);
    return filteredBlogs;
  }, [filteredBlogs, featured]);

  return (
    <div>
      {/* ── Search & Filter Section ────────────────────────────────────────── */}
      <section style={s.searchSection}>
        <div style={s.searchContainer}>
          <div style={s.searchBarWrapper}>
            <span style={s.searchIcon}>🔍</span>
            <input
              type="text"
              placeholder="Search travel stories, destinations, or tags..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={s.searchInput}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} style={s.clearBtn}>×</button>
            )}
          </div>

          <div style={s.categoryList}>
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                style={{
                  ...s.categoryBtn,
                  ...(selectedCategory === cat ? s.categoryBtnActive : {})
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px 80px' }}>
        {filteredBlogs.length === 0 ? (
          <div style={s.noResultsCard}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🔍</div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>No Articles Found</h2>
            <p style={{ color: '#64748b', marginBottom: 20 }}>We couldn't find any articles matching your search or category filter.</p>
            <button
              onClick={() => { setSearchQuery(''); setSelectedCategory('All'); }}
              style={s.resetBtn}
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <>
            {/* ── Featured Post ──────────────────────────────────────────── */}
            {featured && (
              <section style={{ marginBottom: 60 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#ea580c', textTransform: 'uppercase', letterSpacing: 1.5 }}>Featured Story</span>
                  <div style={{ flex: 1, height: 1, background: 'rgba(0,0,0,0.06)' }} />
                </div>

                <Link href={`/blog/${featured.slug}`} style={{ textDecoration: 'none', display: 'block' }}>
                  <article className="featured-card" style={s.featuredCard}>
                    {/* Image */}
                    <div style={{ position: 'relative', overflow: 'hidden', minHeight: 360 }}>
                      {featured.coverImage ? (
                        <img src={featured.coverImage} alt={featured.title} style={s.featuredImg} />
                      ) : (
                        <div style={{ height: '100%', minHeight: 360, background: FALLBACK_GRADIENTS[0], display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontSize: 80, opacity: 0.3 }}>✈</span>
                        </div>
                      )}
                      <div style={s.featuredImgOverlay} />
                    </div>

                    {/* Content */}
                    <div style={{ padding: '40px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <div style={s.cardMetaRow}>
                        {(() => { const p = CATEGORY_PALETTE[featured.category] || CATEGORY_PALETTE.default; return (
                          <span style={{ background: p.bg, color: p.text, border: `1px solid ${p.border}`, fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20 }}>
                            {featured.category}
                          </span>
                        ); })()}
                         <span>Written {getRelativeTime(featured.publishedAt)}</span>
                      </div>

                      <h2 style={s.featuredTitle}>{featured.title}</h2>
                      <p style={s.featuredExcerpt}>{featured.excerpt}</p>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={s.avatar}>{featured.author.charAt(0)}</div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{featured.author}</div>
                            <div style={{ fontSize: 11, color: '#64748b' }}>Travel Expert</div>
                          </div>
                        </div>
                        <span style={s.readLink}>Read Article →</span>
                      </div>
                    </div>
                  </article>
                </Link>
              </section>
            )}

            {/* ── All Posts Grid ─────────────────────────────────────────── */}
            {restBlogs.length > 0 && (
              <section>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1.5 }}>
                    {searchQuery || selectedCategory !== 'All' ? 'Filtered Stories' : 'Latest Stories'}
                  </span>
                  <div style={{ flex: 1, height: 1, background: 'rgba(0,0,0,0.06)' }} />
                  <span style={{ fontSize: 12, color: '#64748b' }}>{restBlogs.length} {restBlogs.length === 1 ? 'article' : 'articles'}</span>
                </div>

                <div style={s.grid}>
                  {restBlogs.map((blog, i) => {
                    const palette = CATEGORY_PALETTE[blog.category] || CATEGORY_PALETTE.default;
                    return (
                      <Link key={blog.id} href={`/blog/${blog.slug}`} style={{ textDecoration: 'none' }}>
                        <article className="blog-card" style={s.card}>
                          {/* Thumbnail */}
                          <div style={{ position: 'relative', height: 200, overflow: 'hidden', flexShrink: 0 }}>
                            {blog.coverImage ? (
                              <img src={blog.coverImage} alt={blog.title} style={s.cardImg} />
                            ) : (
                              <div style={{ width: '100%', height: '100%', background: FALLBACK_GRADIENTS[i % FALLBACK_GRADIENTS.length], display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <span style={{ fontSize: 52, opacity: 0.25 }}>✈</span>
                              </div>
                            )}
                            <div style={s.cardImgOverlay} />
                            <span style={{ position: 'absolute', top: 14, left: 14, background: palette.bg, color: palette.text, border: `1px solid ${palette.border}`, fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 20, backdropFilter: 'blur(8px)' }}>
                              {blog.category}
                            </span>
                          </div>

                          {/* Body */}
                          <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <div style={s.cardBodyMeta}>
                               <span>Written {getRelativeTime(blog.publishedAt)}</span>
                            </div>

                            <h3 style={s.cardTitle}>{blog.title}</h3>
                            <p style={s.cardExcerpt}>
                              {blog.excerpt?.slice(0, 110)}{blog.excerpt?.length > 110 ? '...' : ''}
                            </p>

                            <div style={s.cardFooter}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                                <div style={s.smallAvatar}>{blog.author.charAt(0)}</div>
                                <span style={{ fontSize: 12, color: '#475569', fontWeight: 500 }}>{blog.author}</span>
                              </div>
                              <span style={{ fontSize: 12, fontWeight: 600, color: '#ea580c' }}>Read →</span>
                            </div>
                          </div>
                        </article>
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  searchSection: {
    padding: '0 24px 40px',
    position: 'relative',
    zIndex: 10
  },
  searchContainer: {
    maxWidth: 800,
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 20,
    alignItems: 'center'
  },
  searchBarWrapper: {
    position: 'relative',
    width: '100%',
    maxWidth: 600,
    background: '#ffffff',
    border: '1px solid rgba(0,0,0,0.08)',
    borderRadius: 30,
    padding: '4px 6px 4px 18px',
    display: 'flex',
    alignItems: 'center',
    boxShadow: '0 4px 20px rgba(0,0,0,0.02)'
  },
  searchIcon: {
    fontSize: 16,
    color: '#94a3b8',
    marginRight: 10
  },
  searchInput: {
    flex: 1,
    border: 'none',
    outline: 'none',
    fontSize: 15,
    color: '#0f172a',
    padding: '10px 0',
    fontFamily: 'inherit'
  },
  clearBtn: {
    background: '#f1f5f9',
    border: 'none',
    color: '#64748b',
    borderRadius: '50%',
    width: 24,
    height: 24,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    marginRight: 8,
    fontSize: 14,
    fontWeight: 700
  },
  categoryList: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap' as const,
    justifyContent: 'center',
    maxWidth: '100%'
  },
  categoryBtn: {
    background: '#ffffff',
    border: '1px solid rgba(0,0,0,0.06)',
    borderRadius: 20,
    padding: '6px 14px',
    fontSize: 12,
    fontWeight: 500,
    color: '#64748b',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  categoryBtnActive: {
    background: '#ea580c',
    color: '#ffffff',
    borderColor: '#ea580c',
    boxShadow: '0 4px 12px rgba(234,88,12,0.2)'
  },
  noResultsCard: {
    textAlign: 'center',
    padding: '80px 40px',
    background: '#ffffff',
    borderRadius: 20,
    border: '1px solid rgba(0,0,0,0.06)'
  },
  resetBtn: {
    background: 'linear-gradient(135deg,#f97316,#ea580c)',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    padding: '12px 28px',
    fontWeight: 600,
    fontSize: 14,
    cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(249,115,22,0.2)'
  },
  featuredCard: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    borderRadius: 20,
    overflow: 'hidden',
    border: '1px solid rgba(0,0,0,0.06)',
    background: '#ffffff',
    boxShadow: '0 10px 40px rgba(0,0,0,0.04)',
    cursor: 'pointer',
    width: '100%'
  },
  featuredImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    minHeight: 360,
    display: 'block'
  },
  featuredImgOverlay: {
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(to right, transparent 60%, rgba(255,255,255,0.8))'
  },
  cardMetaRow: {
    display: 'flex',
    gap: 8,
    color: '#64748b',
    fontSize: 12,
    marginBottom: 16,
    alignItems: 'center'
  },
  featuredTitle: {
    fontSize: 'clamp(20px,2.5vw,28px)',
    fontWeight: 800,
    color: '#0f172a',
    lineHeight: 1.3,
    marginBottom: 16,
    letterSpacing: '-0.5px'
  },
  featuredExcerpt: {
    color: '#475569',
    fontSize: 15,
    lineHeight: 1.7,
    marginBottom: 28
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    background: 'linear-gradient(135deg,#f97316,#ea580c)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 13,
    fontWeight: 700,
    color: '#fff'
  },
  readLink: {
    fontSize: 13,
    fontWeight: 600,
    color: '#ea580c'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: 20
  },
  card: {
    background: '#ffffff',
    border: '1px solid rgba(0,0,0,0.06)',
    borderRadius: 16,
    overflow: 'hidden',
    cursor: 'pointer',
    height: '100%',
    display: 'flex',
    flexDirection: 'column'
  },
  cardImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block'
  },
  cardImgOverlay: {
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(to top, rgba(255,255,255,1) 0%, transparent 60%)'
  },
  cardBodyMeta: {
    display: 'flex',
    gap: 10,
    fontSize: 11,
    color: '#64748b',
    marginBottom: 10
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: '#0f172a',
    lineHeight: 1.4,
    marginBottom: 10,
    letterSpacing: '-0.2px'
  },
  cardExcerpt: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 1.6,
    marginBottom: 16,
    flex: 1
  },
  cardFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 14,
    borderTop: '1px solid rgba(0,0,0,0.05)'
  },
  smallAvatar: {
    width: 24,
    height: 24,
    borderRadius: '50%',
    background: 'linear-gradient(135deg,#f97316,#ea580c)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 10,
    fontWeight: 700,
    color: '#fff',
    flexShrink: 0
  }
};
