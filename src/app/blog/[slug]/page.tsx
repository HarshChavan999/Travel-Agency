import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { initializeFirebase } from '@/lib/auth';
import { getFirestore } from 'firebase-admin/firestore';

export async function generateStaticParams() {
  try {
    initializeFirebase();
    const db = getFirestore();
    const snap = await db.collection('blogs').limit(1000).get();
    if (snap.empty) return [{ slug: 'default' }];
    const paths = snap.docs.map(d => ({ slug: d.data().slug || d.id }));
    return paths.length > 0 ? paths : [{ slug: 'default' }];
  } catch {
    return [{ slug: 'default' }];
  }
}

interface Blog {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage: string;
  category: string;
  tags: string[];
  author: string;
  published: boolean;
  publishedAt: string;
  updatedAt: string;
  metaTitle: string;
  metaDescription: string;
  readTime: string;
}

function parseBlogAdminData(id: string, data: any): Blog {
  if (!data) {
    return {
      id, title: '', slug: id, excerpt: '', content: '', coverImage: '',
      category: 'Travel Guides', tags: [], author: 'TripDM Team',
      published: false, publishedAt: '', updatedAt: '', metaTitle: '', metaDescription: '', readTime: '5 min read'
    };
  }
  return {
    id,
    title: data.title || '',
    slug: data.slug || id,
    excerpt: data.excerpt || '',
    content: data.content || '',
    coverImage: data.coverImage || '',
    category: data.category || 'Travel Guides',
    tags: Array.isArray(data.tags) ? data.tags : [],
    author: data.author || 'TripDM Team',
    published: Boolean(data.published),
    publishedAt: data.publishedAt || '',
    updatedAt: data.updatedAt || '',
    metaTitle: data.metaTitle || data.title || '',
    metaDescription: data.metaDescription || data.excerpt || '',
    readTime: data.readTime || '5 min read',
  };
}

async function getBlogBySlug(slugInput: string): Promise<Blog | null> {
  const slug = decodeURIComponent(slugInput).replace(/\/+$/, '').trim().toLowerCase();
  if (!slug) return null;

  try {
    initializeFirebase();
    const db = getFirestore();

    // 1. Direct doc ID lookup
    const docRef = db.collection('blogs').doc(slug);
    const docSnap = await docRef.get();
    if (docSnap.exists) {
      return parseBlogAdminData(docSnap.id, docSnap.data());
    }

    // 2. Query by 'slug' field
    const qSnap = await db.collection('blogs').where('slug', '==', slug).limit(1).get();
    if (!qSnap.empty) {
      const doc = qSnap.docs[0];
      return parseBlogAdminData(doc.id, doc.data());
    }

    // 3. Resilient fallback matching ID/slug prefix or substring
    const allSnap = await db.collection('blogs').limit(300).get();
    if (!allSnap.empty) {
      const allBlogs = allSnap.docs.map(d => parseBlogAdminData(d.id, d.data()));
      const match = allBlogs.find((b: Blog) =>
        b.slug.toLowerCase() === slug ||
        b.id.toLowerCase() === slug ||
        b.slug.toLowerCase().startsWith(slug) ||
        slug.startsWith(b.slug.toLowerCase()) ||
        b.id.toLowerCase().includes(slug) ||
        slug.includes(b.id.toLowerCase())
      );
      if (match) return match;
    }

    return null;
  } catch (err) {
    console.error('Error in getBlogBySlug with firebase-admin:', err);
    return null;
  }
}

async function getRelatedBlogs(category: string, currentSlug: string): Promise<Blog[]> {
  try {
    initializeFirebase();
    const db = getFirestore();
    const snap = await db.collection('blogs')
      .where('published', '==', true)
      .where('category', '==', category)
      .limit(5)
      .get();

    if (snap.empty) return [];

    return snap.docs
      .map(d => parseBlogAdminData(d.id, d.data()))
      .filter((b: Blog) => b.slug !== currentSlug && b.id !== currentSlug)
      .slice(0, 3);
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const blog = await getBlogBySlug(slug);
  if (!blog) return { title: 'Blog Not Found | TripDM', robots: { index: false, follow: false } };
  const title = blog.metaTitle || blog.title;
  const description = blog.metaDescription || blog.excerpt;
  const image = blog.coverImage || 'https://tripdm.com/og-default.jpg';
  return {
    title: `${title} | TripDM Blog`,
    description,
    keywords: [...(blog.tags || []), 'travel', 'TripDM', blog.category].filter(Boolean),
    authors: [{ name: blog.author }],
    openGraph: { title, description, type: 'article', url: `https://tripdm.com/blog/${slug}`, images: image ? [{ url: image, width: 1200, height: 630, alt: title }] : [], publishedTime: blog.publishedAt, modifiedTime: blog.updatedAt, authors: [blog.author], tags: blog.tags, section: blog.category },
    twitter: { card: 'summary_large_image', title, description, images: image ? [image] : [] },
    alternates: { canonical: `https://tripdm.com/blog/${slug}` },
  };
}

function renderContent(content: string): string {
  if (!content) return '';

  // Strip hidden HTML comment blocks (schema, keywords)
  let html = content.replace(/<!--[\s\S]*?-->/g, '');

  html = html
    // Blockquotes
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    // Headers with IDs for TOC anchor linking
    .replace(/^### (.+)$/gm, (_, t) => `<h3 id="${t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}">${t}</h3>`)
    .replace(/^## (.+)$/gm, (_, t) => `<h2 id="${t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}">${t}</h2>`)
    .replace(/^# (.+)$/gm, (_, t) => `<h1 id="${t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}">${t}</h1>`)
    // Bold & Italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Inline code
    .replace(/`(.+?)`/g, '<code>$1</code>')
    // Horizontal rule
    .replace(/^---$/gm, '<hr>')
    // Links
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    // Unordered lists - handle *, -, +
    .replace(/^[\*\-\+] (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
    // Ordered lists
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    // Tables
    .replace(/^\|(.+)\|$/gm, (match) => {
      const cells = match.split('|').filter((_, i, a) => i > 0 && i < a.length - 1);
      const isHeader = cells.every(c => /^\s*[-:]+\s*$/.test(c));
      if (isHeader) return '';
      const tag = 'td';
      return '<tr>' + cells.map(c => `<${tag}>${c.trim()}</${tag}>`).join('') + '</tr>';
    });

  // Wrap table rows
  html = html.replace(/(<tr>[\s\S]*?<\/tr>\n?)+/g, (match) => `<div class="table-wrap"><table>${match}</table></div>`);

  // Paragraphs
  html = html.split('\n\n').map(block => {
    const trimmed = block.trim();
    if (!trimmed) return '';
    if (/^<(h[1-6]|ul|ol|blockquote|hr|div|table|tr)/.test(trimmed)) return trimmed;
    return `<p>${trimmed.replace(/\n/g, '<br>')}</p>`;
  }).filter(Boolean).join('\n');

  return html;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  try { return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }); }
  catch { return dateStr; }
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

export default async function BlogPostPage({
  params,
  searchParams
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ preview?: string }>;
}) {
  const { slug } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const isPreview = resolvedSearchParams.preview === 'true';

  const blog = await getBlogBySlug(slug);
  if (!blog) notFound();
  if (!blog.published && !isPreview) notFound();

  const relatedBlogs = await getRelatedBlogs(blog.category, blog.slug);
  const contentHtml = renderContent(blog.content);

  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'Article',
    headline: blog.title, description: blog.metaDescription || blog.excerpt,
    image: blog.coverImage ? [blog.coverImage] : [],
    author: { '@type': 'Person', name: blog.author },
    publisher: { '@type': 'Organization', name: 'TripDM', url: 'https://tripdm.com', logo: { '@type': 'ImageObject', url: 'https://tripdm.com/logo.png' } },
    datePublished: blog.publishedAt, dateModified: blog.updatedAt || blog.publishedAt,
    mainEntityOfPage: { '@type': 'WebPage', '@id': `https://tripdm.com/blog/${blog.slug}` },
    keywords: blog.tags?.join(', '), articleSection: blog.category,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Merriweather:ital,wght@0,400;0,700;0,900;1,400&family=Inter:wght@400;500;600;700;800&display=swap');

        .blog-page * { box-sizing: border-box; }
        .blog-page { background: #fafaf9; min-height: 100vh; font-family: 'Inter', sans-serif; }

        /* Progress bar */
        .reading-progress { position: fixed; top: 0; left: 0; height: 3px; background: linear-gradient(90deg, #f97316, #ea580c); z-index: 1000; transition: width 0.1s; width: 0%; }

        /* Breadcrumb */
        .bp-breadcrumb { display: flex; align-items: center; gap: 8px; padding: 14px 24px; font-size: 12px; color: #6b7280; background: #fff; border-bottom: 1px solid #f3f4f6; }
        .bp-breadcrumb a { color: #6b7280; text-decoration: none; }
        .bp-breadcrumb a:hover { color: #f97316; }
        .bp-breadcrumb-sep { color: #d1d5db; }
        .bp-breadcrumb-current { color: #374151; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 300px; }

        /* Hero */
        .bp-hero { position: relative; height: 520px; overflow: hidden; background: #1c1917; }
        .bp-hero-img { width: 100%; height: 100%; object-fit: cover; opacity: 0.75; }
        .bp-hero-no-img { width: 100%; height: 100%; background: linear-gradient(135deg, #1c1917 0%, #292524 50%, #1c1917 100%); display: flex; align-items: center; justify-content: center; font-size: 80px; }
        .bp-hero-overlay { position: absolute; inset: 0; background: linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.3) 60%, transparent 100%); }
        .bp-hero-meta { position: absolute; bottom: 0; left: 0; right: 0; padding: 32px 40px; }
        .bp-hero-category { display: inline-block; background: #f97316; color: #fff; font-size: 11px; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase; padding: 5px 14px; border-radius: 4px; margin-bottom: 16px; text-decoration: none; }
        .bp-hero-title { font-family: 'Merriweather', Georgia, serif; font-size: clamp(24px, 4.5vw, 48px); font-weight: 900; color: #fff; line-height: 1.2; margin: 0 0 16px; max-width: 820px; text-shadow: 0 2px 20px rgba(0,0,0,0.5); }
        .bp-hero-bar { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
        .bp-hero-author { display: flex; align-items: center; gap: 10px; }
        .bp-hero-avatar { width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg, #f97316, #ea580c); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px; color: #fff; flex-shrink: 0; border: 2px solid rgba(255,255,255,0.4); }
        .bp-hero-author-name { font-size: 13px; font-weight: 600; color: #fff; }
        .bp-hero-author-role { font-size: 11px; color: rgba(255,255,255,0.65); }
        .bp-hero-divider { width: 1px; height: 24px; background: rgba(255,255,255,0.25); }
        .bp-hero-stat { font-size: 13px; color: rgba(255,255,255,0.8); display: flex; align-items: center; gap: 5px; }

        /* Layout */
        .bp-layout { max-width: 1180px; margin: 0 auto; padding: 48px 24px 80px; display: grid; grid-template-columns: 1fr 300px; gap: 56px; }
        @media (max-width: 900px) { .bp-layout { grid-template-columns: 1fr; } .bp-sidebar { display: none; } }

        /* Excerpt */
        .bp-excerpt { font-family: 'Merriweather', Georgia, serif; font-size: 19px; line-height: 1.8; color: #44403c; border-left: 4px solid #f97316; padding: 16px 24px; background: #fff7ed; border-radius: 0 8px 8px 0; margin-bottom: 32px; font-style: italic; }

        /* Tags */
        .bp-tags { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 40px; }
        .bp-tag { font-size: 12px; color: #78716c; background: #f5f5f4; border: 1px solid #e7e5e4; border-radius: 4px; padding: 4px 10px; text-decoration: none; transition: all 0.2s; }
        .bp-tag:hover { background: #fff7ed; color: #f97316; border-color: #fed7aa; }

        /* Share bar */
        .bp-share { display: flex; align-items: center; gap: 10px; margin-bottom: 40px; padding: 16px 20px; background: #fff; border: 1px solid #f3f4f6; border-radius: 10px; }
        .bp-share-label { font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.8px; margin-right: 4px; }
        .bp-share-btn { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 15px; cursor: pointer; border: 1px solid #e5e7eb; background: #fff; transition: all 0.2s; text-decoration: none; }
        .bp-share-btn:hover { background: #f97316; border-color: #f97316; }

        /* Article body */
        .bp-article-body { font-family: 'Merriweather', Georgia, serif; font-size: 17px; line-height: 1.9; color: #292524; }
        .bp-article-body h2 { font-family: 'Inter', sans-serif; font-size: 26px; font-weight: 800; color: #1c1917; margin: 52px 0 20px; padding-bottom: 12px; border-bottom: 2px solid #f3f4f6; line-height: 1.3; }
        .bp-article-body h3 { font-family: 'Inter', sans-serif; font-size: 20px; font-weight: 700; color: #292524; margin: 36px 0 14px; line-height: 1.4; }
        .bp-article-body h1 { font-family: 'Merriweather', Georgia, serif; font-size: 30px; font-weight: 900; color: #1c1917; margin: 40px 0 20px; }
        .bp-article-body p { margin: 0 0 22px; }
        .bp-article-body strong { font-weight: 700; color: #1c1917; }
        .bp-article-body em { font-style: italic; color: #44403c; }
        .bp-article-body a { color: #f97316; text-decoration: underline; text-decoration-color: rgba(249,115,22,0.4); font-weight: 500; transition: color 0.2s; }
        .bp-article-body a:hover { color: #ea580c; }
        .bp-article-body code { background: #f5f5f4; color: #dc2626; font-family: 'Courier New', monospace; font-size: 14px; padding: 2px 6px; border-radius: 4px; border: 1px solid #e7e5e4; }
        .bp-article-body blockquote { border-left: 4px solid #f97316; background: #fff7ed; padding: 16px 20px 16px 24px; margin: 28px 0; border-radius: 0 8px 8px 0; font-style: italic; color: #44403c; font-size: 17px; }
        .bp-article-body ul { margin: 0 0 24px 0; padding-left: 0; list-style: none; }
        .bp-article-body ul li { position: relative; padding-left: 24px; margin-bottom: 10px; }
        .bp-article-body ul li::before { content: '→'; position: absolute; left: 0; color: #f97316; font-weight: 700; }
        .bp-article-body ol li { margin-bottom: 10px; }
        .bp-article-body hr { border: none; border-top: 1px solid #e7e5e4; margin: 44px 0; }
        .bp-article-body .table-wrap { overflow-x: auto; margin: 28px 0; border-radius: 10px; border: 1px solid #e7e5e4; }
        .bp-article-body table { width: 100%; border-collapse: collapse; font-family: 'Inter', sans-serif; font-size: 14px; }
        .bp-article-body table tr:first-child td { background: #1c1917; color: #fff; font-weight: 700; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
        .bp-article-body table td { padding: 12px 16px; border-bottom: 1px solid #f3f4f6; vertical-align: top; color: #374151; }
        .bp-article-body table tr:nth-child(even) td { background: #fafaf9; }
        .bp-article-body table tr:hover td { background: #fff7ed; }

        /* CTA Box */
        .bp-cta { background: linear-gradient(135deg, #1c1917 0%, #292524 100%); border-radius: 16px; padding: 40px 36px; text-align: center; margin: 48px 0; position: relative; overflow: hidden; }
        .bp-cta::before { content: '✈️'; position: absolute; top: -10px; right: 20px; font-size: 80px; opacity: 0.08; }
        .bp-cta-label { font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #f97316; margin-bottom: 12px; }
        .bp-cta h3 { font-family: 'Merriweather', Georgia, serif; font-size: 24px; color: #fff; margin: 0 0 12px; font-weight: 900; }
        .bp-cta p { color: #a8a29e; font-size: 15px; line-height: 1.6; margin: 0 auto 24px; max-width: 480px; font-family: 'Inter', sans-serif; }
        .bp-cta-btn { display: inline-block; background: linear-gradient(135deg, #f97316, #ea580c); color: #fff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 700; font-size: 15px; font-family: 'Inter', sans-serif; transition: transform 0.2s, box-shadow 0.2s; box-shadow: 0 4px 20px rgba(249,115,22,0.4); }
        .bp-cta-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 28px rgba(249,115,22,0.5); }

        /* Tags section */
        .bp-tags-footer { margin: 40px 0; padding: 24px; background: #fff; border: 1px solid #f3f4f6; border-radius: 10px; }
        .bp-tags-footer-label { font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: #9ca3af; margin-bottom: 12px; font-family: 'Inter', sans-serif; }
        .bp-tag-large { display: inline-block; font-size: 13px; color: #374151; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 6px 14px; margin: 4px; font-family: 'Inter', sans-serif; text-decoration: none; transition: all 0.2s; }
        .bp-tag-large:hover { background: #fff7ed; color: #f97316; border-color: #fed7aa; }

        /* Related */
        .bp-related { border-top: 2px solid #f3f4f6; padding-top: 48px; margin-top: 48px; }
        .bp-related-header { display: flex; align-items: center; gap: 12px; margin-bottom: 28px; }
        .bp-related-header h2 { font-family: 'Inter', sans-serif; font-size: 20px; font-weight: 800; color: #1c1917; margin: 0; }
        .bp-related-header-line { flex: 1; height: 1px; background: #f3f4f6; }
        .bp-related-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 20px; }
        .bp-related-card { background: #fff; border: 1px solid #f3f4f6; border-radius: 12px; overflow: hidden; text-decoration: none; display: block; transition: transform 0.2s, box-shadow 0.2s; }
        .bp-related-card:hover { transform: translateY(-3px); box-shadow: 0 12px 32px rgba(0,0,0,0.08); }
        .bp-related-img { width: 100%; height: 140px; object-fit: cover; }
        .bp-related-img-placeholder { width: 100%; height: 140px; background: linear-gradient(135deg, #f5f5f4, #e7e5e4); display: flex; align-items: center; justify-content: center; font-size: 32px; }
        .bp-related-body { padding: 16px; }
        .bp-related-cat { font-size: 10px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: #f97316; margin-bottom: 6px; display: block; font-family: 'Inter', sans-serif; }
        .bp-related-title { font-size: 14px; font-weight: 700; color: #1c1917; line-height: 1.45; margin: 0 0 8px; font-family: 'Inter', sans-serif; }
        .bp-related-time { font-size: 11px; color: #9ca3af; font-family: 'Inter', sans-serif; }

        /* Back button */
        .bp-back { text-align: center; padding-top: 32px; }
        .bp-back-btn { display: inline-flex; align-items: center; gap: 8px; color: #6b7280; background: #fff; text-decoration: none; border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px 20px; font-size: 14px; font-family: 'Inter', sans-serif; font-weight: 500; transition: all 0.2s; }
        .bp-back-btn:hover { border-color: #f97316; color: #f97316; }

        /* Sidebar */
        .bp-sidebar { position: sticky; top: 24px; height: fit-content; }
        .bp-sidebar-card { background: #fff; border: 1px solid #f3f4f6; border-radius: 12px; padding: 20px; margin-bottom: 20px; }
        .bp-sidebar-title { font-size: 11px; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase; color: #9ca3af; margin-bottom: 16px; font-family: 'Inter', sans-serif; }
        .bp-toc-list { list-style: none; padding: 0; margin: 0; }
        .bp-toc-item { border-left: 2px solid #f3f4f6; padding-left: 12px; margin-bottom: 8px; transition: border-color 0.2s; }
        .bp-toc-item:hover { border-color: #f97316; }
        .bp-toc-link { font-size: 13px; color: #6b7280; text-decoration: none; font-family: 'Inter', sans-serif; line-height: 1.4; display: block; transition: color 0.2s; }
        .bp-toc-link:hover { color: #f97316; }
        .bp-sidebar-cta { background: linear-gradient(135deg, #1c1917, #292524); border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 20px; }
        .bp-sidebar-cta h3 { font-family: 'Merriweather', serif; color: #fff; font-size: 16px; margin: 0 0 8px; }
        .bp-sidebar-cta p { color: #a8a29e; font-size: 13px; margin: 0 0 16px; font-family: 'Inter', sans-serif; line-height: 1.5; }
        .bp-sidebar-cta-btn { display: block; background: #f97316; color: #fff; text-decoration: none; padding: 10px 16px; border-radius: 8px; font-size: 13px; font-weight: 700; font-family: 'Inter', sans-serif; transition: background 0.2s; }
        .bp-sidebar-cta-btn:hover { background: #ea580c; }

        /* Reading progress script */
        .bp-progress-script {}
      `}</style>

      {/* Reading progress bar */}
      <div className="reading-progress" id="reading-progress" />
      <script dangerouslySetInnerHTML={{
        __html: `
          (function(){
            var bar = document.getElementById('reading-progress');
            if(!bar) return;
            window.addEventListener('scroll', function(){
              var scrollTop = window.scrollY;
              var docHeight = document.documentElement.scrollHeight - window.innerHeight;
              var progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
              bar.style.width = Math.min(progress, 100) + '%';
            }, {passive: true});
          })();
        `
      }} />

      <div className="blog-page">

        {/* ── Navigation ────────────────────────────────────────────────────── */}
        <nav style={{ position: 'sticky', top: 0, zIndex: 50, borderBottom: '1px solid rgba(0,0,0,0.06)', background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(20px)' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', height: 58, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
              <img src="/tripdm-logo.png" alt="TripDM Logo" style={{ height: 48, width: 'auto', objectFit: 'contain' }} />
              <span style={{ background: 'rgba(249,115,22,0.12)', border: '1px solid rgba(249,115,22,0.25)', color: '#ea580c', fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20, letterSpacing: 0.5 }}>BLOG</span>
            </Link>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Link href="/" style={{ color: '#64748b', fontSize: 13, fontWeight: 500, textDecoration: 'none', padding: '6px 12px', borderRadius: 8, transition: 'color 0.2s' }}>Home</Link>
              <Link href="/package" style={{ color: '#64748b', fontSize: 13, fontWeight: 500, textDecoration: 'none', padding: '6px 12px', borderRadius: 8, transition: 'color 0.2s' }}>Packages</Link>
              <Link href="/" style={{ background: 'rgba(249,115,22,0.12)', border: '1px solid rgba(249,115,22,0.25)', color: '#ea580c', fontSize: 12, fontWeight: 600, textDecoration: 'none', padding: '7px 16px', borderRadius: 8 }}>
                Find Travel Agents →
              </Link>
            </div>
          </div>
        </nav>

        {/* Breadcrumb */}
        <nav className="bp-breadcrumb" aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <span className="bp-breadcrumb-sep">›</span>
          <Link href="/blog">Blog</Link>
          <span className="bp-breadcrumb-sep">›</span>
          <span className="bp-breadcrumb-current">{blog.title}</span>
        </nav>

        {/* Hero */}
        <div className="bp-hero">
          {blog.coverImage
            ? <img src={blog.coverImage} alt={blog.title} className="bp-hero-img" />
            : <div className="bp-hero-no-img">✈️</div>
          }
          <div className="bp-hero-overlay" />
          <div className="bp-hero-meta">
            <Link href={`/blog?category=${blog.category}`} className="bp-hero-category">{blog.category}</Link>
            <h1 className="bp-hero-title">{blog.title}</h1>
            <div className="bp-hero-bar">
              <div className="bp-hero-author">
                <div className="bp-hero-avatar">{blog.author.charAt(0).toUpperCase()}</div>
                <div>
                  <div className="bp-hero-author-name">{blog.author}</div>
                  <div className="bp-hero-author-role">TripDM Travel Expert</div>
                </div>
              </div>
              <div className="bp-hero-divider" />
              <span className="bp-hero-stat">📅 {formatDate(blog.publishedAt)}</span>
              <div className="bp-hero-divider" />
              <span className="bp-hero-stat">⏱ {getRelativeTime(blog.publishedAt)}</span>
            </div>
          </div>
        </div>

        {/* Main layout */}
        <div className="bp-layout">

          {/* Article column */}
          <div>
            {/* Excerpt pull quote */}
            {blog.excerpt && <div className="bp-excerpt">{blog.excerpt}</div>}

            {/* Tags */}
            {blog.tags?.length > 0 && (
              <div className="bp-tags">
                {blog.tags.map(tag => (
                  <span key={tag} className="bp-tag">#{tag}</span>
                ))}
              </div>
            )}

            {/* Share bar */}
            <div className="bp-share">
              <span className="bp-share-label">Share</span>
              <a className="bp-share-btn" href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(blog.title)}&url=${encodeURIComponent(`https://tripdm.com/blog/${blog.slug}`)}`} target="_blank" rel="noopener" title="Share on Twitter">𝕏</a>
              <a className="bp-share-btn" href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`https://tripdm.com/blog/${blog.slug}`)}`} target="_blank" rel="noopener" title="Share on Facebook">f</a>
              <a className="bp-share-btn" href={`https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(`https://tripdm.com/blog/${blog.slug}`)}&title=${encodeURIComponent(blog.title)}`} target="_blank" rel="noopener" title="Share on LinkedIn">in</a>
              <a className="bp-share-btn" href={`https://api.whatsapp.com/send?text=${encodeURIComponent(blog.title + ' ' + `https://tripdm.com/blog/${blog.slug}`)}`} target="_blank" rel="noopener" title="Share on WhatsApp">💬</a>
            </div>

            {/* Article body */}
            <article
              className="bp-article-body"
              dangerouslySetInnerHTML={{ __html: contentHtml }}
            />

            {/* CTA */}
            <div className="bp-cta">
              <div className="bp-cta-label">Plan Your Trip</div>
              <h3>Ready to Make It Real?</h3>
              <p>Connect with verified travel experts on TripDM and get a personalized itinerary crafted just for you.</p>
              <Link href="/" className="bp-cta-btn">Explore TripDM Packages →</Link>
            </div>

            {/* Tags footer */}
            {blog.tags?.length > 0 && (
              <div className="bp-tags-footer">
                <div className="bp-tags-footer-label">Filed under</div>
                {blog.tags.map(tag => (
                  <span key={tag} className="bp-tag-large">#{tag}</span>
                ))}
              </div>
            )}

            {/* Related Posts */}
            {relatedBlogs.length > 0 && (
              <section className="bp-related">
                <div className="bp-related-header">
                  <h2>Related Articles</h2>
                  <div className="bp-related-header-line" />
                </div>
                <div className="bp-related-grid">
                  {relatedBlogs.map(related => (
                    <Link key={related.id} href={`/blog/${related.slug}`} className="bp-related-card">
                      {related.coverImage
                        ? <img src={related.coverImage} alt={related.title} className="bp-related-img" />
                        : <div className="bp-related-img-placeholder">🗺️</div>
                      }
                      <div className="bp-related-body">
                        <span className="bp-related-cat">{related.category}</span>
                        <h3 className="bp-related-title">{related.title}</h3>
                        <span className="bp-related-time">{related.readTime}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Back */}
            <div className="bp-back">
              <Link href="/blog" className="bp-back-btn">← Back to All Articles</Link>
            </div>
          </div>

          {/* Sidebar */}
          <aside className="bp-sidebar">
            {/* Sidebar CTA */}
            <div className="bp-sidebar-cta">
              <h3>Plan Your Trip</h3>
              <p>Get personalized travel packages from verified TripDM experts.</p>
              <Link href="/" className="bp-sidebar-cta-btn">Get Free Quote →</Link>
            </div>

            {/* TOC */}
            <div className="bp-sidebar-card">
              <div className="bp-sidebar-title">Table of Contents</div>
              <ul className="bp-toc-list" id="sidebar-toc">
                {contentHtml.match(/<h2 id="([^"]+)">([^<]+)<\/h2>/g)?.slice(0, 10).map((match, i) => {
                  const idMatch = match.match(/id="([^"]+)"/);
                  const titleMatch = match.match(/>([^<]+)<\/h2>/);
                  if (!idMatch || !titleMatch) return null;
                  return (
                    <li key={i} className="bp-toc-item">
                      <a href={`#${idMatch[1]}`} className="bp-toc-link">{titleMatch[1]}</a>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Article info card */}
            <div className="bp-sidebar-card">
              <div className="bp-sidebar-title">Article Info</div>
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#6b7280', lineHeight: 2 }}>
                <div>📅 {formatDate(blog.publishedAt)}</div>
                <div>⏱ {getRelativeTime(blog.publishedAt)}</div>
                <div>📂 {blog.category}</div>
                <div>✍️ {blog.author}</div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
