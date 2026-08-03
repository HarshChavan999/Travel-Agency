import { Metadata } from 'next';
import Link from 'next/link';
import BlogClient from './BlogClient';

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'travel-agent-management-29c27';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Travel Blog | Expert Tips, Guides & Destinations | TripDM',
  description: 'Explore travel tips, destination guides, and expert advice from TripDM. Find inspiration for your next trip with our curated travel blog.',
  keywords: ['travel blog', 'travel tips', 'destination guides', 'India travel', 'TripDM blog'],
  openGraph: {
    title: 'TripDM Travel Blog – Expert Tips & Destination Guides',
    description: 'Discover travel tips, destination guides, and insider advice from TripDM travel experts.',
    type: 'website',
    url: 'https://tripdm.com/blog',
    siteName: 'TripDM',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TripDM Travel Blog',
    description: 'Expert travel tips, destination guides, and travel inspiration.',
  },
  alternates: {
    canonical: 'https://tripdm.com/blog',
  },
};

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

async function getPublishedBlogs(): Promise<Blog[]> {
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery`;
    const query = {
      structuredQuery: {
        from: [{ collectionId: 'blogs' }],
        where: {
          fieldFilter: {
            field: { fieldPath: 'published' },
            op: 'EQUAL',
            value: { booleanValue: true },
          },
        },
        orderBy: [{ field: { fieldPath: 'publishedAt' }, direction: 'DESCENDING' }],
        limit: 500,
      },
    };
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(query),
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data
      .filter((item: any) => item.document)
      .map((item: any) => {
        const doc = item.document;
        const fields = doc.fields || {};
        const nameParts = doc.name.split('/');
        return {
          id: nameParts[nameParts.length - 1],
          title: fields.title?.stringValue || '',
          slug: fields.slug?.stringValue || '',
          excerpt: fields.excerpt?.stringValue || '',
          coverImage: fields.coverImage?.stringValue || '',
          category: fields.category?.stringValue || 'Travel',
          tags: fields.tags?.arrayValue?.values?.map((v: any) => v.stringValue) || [],
          author: fields.author?.stringValue || 'TripDM Team',
          publishedAt: fields.publishedAt?.stringValue || '',
          readTime: fields.readTime?.stringValue || '5 min read',
        };
      })
      .sort((a: Blog, b: Blog) => {
        const dateA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
        const dateB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
        return dateB - dateA;
      });
  } catch { return []; }
}

function formatDate(d: string) {
  if (!d) return '';
  try { return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); }
  catch { return d; }
}

const CATEGORY_PALETTE: Record<string, { bg: string; text: string; border: string }> = {
  'Travel Tips':        { bg: 'rgba(249,115,22,0.12)', text: '#ea580c', border: 'rgba(249,115,22,0.25)' },
  'Destinations':       { bg: 'rgba(167,139,250,0.12)', text: '#7c3aed', border: 'rgba(167,139,250,0.25)' },
  'Budget Travel':      { bg: 'rgba(52,211,153,0.12)', text: '#059669', border: 'rgba(52,211,153,0.25)' },
  'Luxury Travel':      { bg: 'rgba(251,191,36,0.12)', text: '#d97706', border: 'rgba(251,191,36,0.25)' },
  'Adventure':          { bg: 'rgba(239,68,68,0.12)', text: '#dc2626', border: 'rgba(239,68,68,0.25)' },
  'India Travel':       { bg: 'rgba(99,179,237,0.12)', text: '#3182ce', border: 'rgba(99,179,237,0.25)' },
  'Family Travel':      { bg: 'rgba(236,72,153,0.12)', text: '#db2777', border: 'rgba(236,72,153,0.25)' },
  'Solo Travel':        { bg: 'rgba(34,211,238,0.12)', text: '#0891b2', border: 'rgba(34,211,238,0.25)' },
  'default':            { bg: 'rgba(249,115,22,0.12)', text: '#ea580c', border: 'rgba(249,115,22,0.25)' },
};

const FALLBACK_GRADIENTS = [
  'linear-gradient(135deg,#f8fafc 0%,#e2e8f0 100%)',
  'linear-gradient(135deg,#fdf4ff 0%,#f3e8ff 100%)',
  'linear-gradient(135deg,#f0fdf4 0%,#dcfce7 100%)',
  'linear-gradient(135deg,#fff7ed 0%,#ffedd5 100%)',
];

export default async function BlogPage() {
  const blogs = await getPublishedBlogs();
  const featured = blogs[0];
  const rest = blogs.slice(1);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: 'TripDM Travel Blog',
    description: 'Expert travel tips, destination guides, and travel inspiration from TripDM.',
    url: 'https://tripdm.com/blog',
    publisher: { '@type': 'Organization', name: 'TripDM', url: 'https://tripdm.com' },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', sans-serif; background: #f8fafc; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        @keyframes shimmer { 0%,100%{opacity:0.4} 50%{opacity:1} }
        .blog-card { transition: transform 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease; }
        .blog-card:hover { transform: translateY(-4px); border-color: rgba(249,115,22,0.25) !important; box-shadow: 0 20px 48px rgba(0,0,0,0.08) !important; }
        .featured-card { transition: box-shadow 0.3s ease; }
        .featured-card:hover { box-shadow: 0 30px 70px rgba(0,0,0,0.1) !important; }
        .nav-link:hover { color: #0f172a !important; }
        .tag-chip:hover { background: rgba(249,115,22,0.15) !important; color: #f97316 !important; }
        ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.2); border-radius: 3px; }
      `}</style>

      <div style={{ minHeight: '100vh', background: '#f8fafc', color: '#334155', fontFamily: 'Inter, sans-serif' }}>

        {/* ── Navigation ────────────────────────────────────────────────────── */}
        <nav style={{ position: 'sticky', top: 0, zIndex: 50, borderBottom: '1px solid rgba(0,0,0,0.06)', background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(20px)' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', height: 58, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
              <img src="/tripdm-logo.png" alt="TripDM Logo" style={{ height: 48, width: 'auto', objectFit: 'contain' }} />
              <span style={{ background: 'rgba(249,115,22,0.12)', border: '1px solid rgba(249,115,22,0.25)', color: '#ea580c', fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20, letterSpacing: 0.5 }}>BLOG</span>
            </Link>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Link href="/" className="nav-link" style={{ color: '#64748b', fontSize: 13, fontWeight: 500, textDecoration: 'none', padding: '6px 12px', borderRadius: 8, transition: 'color 0.2s' }}>Home</Link>
              <Link href="/package" className="nav-link" style={{ color: '#64748b', fontSize: 13, fontWeight: 500, textDecoration: 'none', padding: '6px 12px', borderRadius: 8, transition: 'color 0.2s' }}>Packages</Link>
              <Link href="/" style={{ background: 'rgba(249,115,22,0.12)', border: '1px solid rgba(249,115,22,0.25)', color: '#ea580c', fontSize: 12, fontWeight: 600, textDecoration: 'none', padding: '7px 16px', borderRadius: 8 }}>
                Find Travel Agents →
              </Link>
            </div>
          </div>
        </nav>

        {/* ── Hero ──────────────────────────────────────────────────────────── */}
        <section style={{ padding: '72px 24px 56px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
          {/* Background grid */}
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(249,115,22,0.15) 1px, transparent 1px)', backgroundSize: '32px 32px', pointerEvents: 'none' }} />
          {/* Glow */}
          <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 600, height: 300, background: 'radial-gradient(ellipse, rgba(249,115,22,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)', borderRadius: 20, padding: '5px 14px', marginBottom: 24, fontSize: 12, color: '#ea580c', fontWeight: 600, letterSpacing: 0.5 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ea580c', animation: 'shimmer 2s infinite' }} />
              TRIPDM TRAVEL BLOG
            </div>

            <h1 style={{ fontSize: 'clamp(36px,6vw,64px)', fontWeight: 900, color: '#0f172a', lineHeight: 1.1, marginBottom: 20, letterSpacing: '-1.5px' }}>
              Travel Smarter,{' '}
              <span style={{ background: 'linear-gradient(135deg,#f97316,#fbbf24)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                Explore More
              </span>
            </h1>
            <p style={{ fontSize: 17, color: '#64748b', maxWidth: 560, margin: '0 auto 32px', lineHeight: 1.7 }}>
              Expert destination guides, budget tips, and travel inspiration curated by TripDM's team of travel specialists.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, fontSize: 13, color: '#475569' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: '#ea580c' }}>✦</span> {blogs.length} Articles
              </span>
              <span style={{ width: 1, height: 14, background: 'rgba(0,0,0,0.1)' }} />
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: '#ea580c' }}>✦</span> Expert Writers
              </span>
              <span style={{ width: 1, height: 14, background: 'rgba(0,0,0,0.1)' }} />
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: '#ea580c' }}>✦</span> SEO Optimized
              </span>
            </div>
          </div>
        </section>

        {blogs.length === 0 ? (
          <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px 80px' }}>
            <div style={{ textAlign: 'center', padding: '80px 40px', background: '#ffffff', borderRadius: 20, border: '1px solid rgba(0,0,0,0.06)' }}>
              <div style={{ fontSize: 56, marginBottom: 16 }}>🌏</div>
              <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>Coming Soon</h2>
              <p style={{ color: '#64748b', marginBottom: 28 }}>Our travel blog is launching soon. Check back for expert travel guides!</p>
              <Link href="/" style={{ display: 'inline-block', background: 'linear-gradient(135deg,#f97316,#ea580c)', color: '#fff', textDecoration: 'none', borderRadius: 10, padding: '12px 28px', fontWeight: 600, fontSize: 14 }}>
                Explore Travel Packages →
              </Link>
            </div>
          </div>
        ) : (
          <BlogClient initialBlogs={blogs} />
        )}

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <footer style={{ borderTop: '1px solid rgba(0,0,0,0.06)', padding: '24px', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <div style={{ width: 24, height: 24, background: 'linear-gradient(135deg,#f97316,#ea580c)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#fff', fontWeight: 800 }}>✈</div>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#64748b' }}>TripDM Blog</span>
          </div>
          <p style={{ color: '#94a3b8', fontSize: 12 }}>© {new Date().getFullYear()} TripDM. All rights reserved. Expert travel content for the modern traveler.</p>
        </footer>
      </div>
    </>
  );
}
