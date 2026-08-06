import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'travel-agent-management-29c27';

export async function generateStaticParams() {
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/blogs?pageSize=10000`;
    const res = await fetch(url);
    if (!res.ok) return [{ slug: 'default' }];
    const data = await res.json();
    if (!data.documents || !Array.isArray(data.documents) || data.documents.length === 0) {
      return [{ slug: 'default' }];
    }
    const paths = data.documents
      .map((doc: any) => {
        const fields = doc.fields || {};
        const slug = fields.slug?.stringValue;
        return slug ? { slug } : null;
      })
      .filter(Boolean);
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
  views?: number;
}

function parseBlogDoc(doc: any): Blog {
  const nameParts = doc.name ? doc.name.split('/') : [];
  const id = nameParts.length ? nameParts[nameParts.length - 1] : '';
  const fields = doc.fields || {};
  const viewsVal = fields.views?.integerValue || fields.views?.numberValue || fields.viewsCount?.integerValue;
  return {
    id,
    title: fields.title?.stringValue || '',
    slug: fields.slug?.stringValue || id,
    excerpt: fields.excerpt?.stringValue || '',
    content: fields.content?.stringValue || '',
    coverImage: fields.coverImage?.stringValue || '',
    category: fields.category?.stringValue || 'Destinations',
    tags: fields.tags?.arrayValue?.values?.map((v: any) => v.stringValue) || [],
    author: fields.author?.stringValue || 'Kritika Singh',
    published: fields.published?.booleanValue || false,
    publishedAt: fields.publishedAt?.stringValue || '',
    updatedAt: fields.updatedAt?.stringValue || '',
    metaTitle: fields.metaTitle?.stringValue || '',
    metaDescription: fields.metaDescription?.stringValue || '',
    readTime: fields.readTime?.stringValue || '5 min read',
    views: viewsVal ? Number(viewsVal) : undefined,
  };
}

async function getBlogBySlug(slug: string): Promise<Blog | null> {
  try {
    const directUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/blogs/${slug}`;
    const directRes = await fetch(directUrl, { cache: 'no-store' });
    if (directRes.ok) {
      const doc = await directRes.json();
      if (doc && doc.fields) return parseBlogDoc(doc);
    }
    const queryUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery`;
    const query = {
      structuredQuery: {
        from: [{ collectionId: 'blogs' }],
        where: { fieldFilter: { field: { fieldPath: 'slug' }, op: 'EQUAL', value: { stringValue: slug } } },
        limit: 1,
      },
    };
    const res = await fetch(queryUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(query), cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    const item = data.find((d: any) => d.document);
    if (!item) return null;
    return parseBlogDoc(item.document);
  } catch { return null; }
}

async function getPopularBlogs(currentSlug: string): Promise<Blog[]> {
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery`;
    const query = {
      structuredQuery: {
        from: [{ collectionId: 'blogs' }],
        where: {
          fieldFilter: { field: { fieldPath: 'published' }, op: 'EQUAL', value: { booleanValue: true } }
        },
        limit: 10,
      },
    };
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(query), cache: 'no-store' });
    if (!res.ok) return getFallbackPopularBlogs(currentSlug);
    const data = await res.json();
    const blogs = data.filter((item: any) => item.document).map((item: any) => parseBlogDoc(item.document));
    const filtered = blogs.filter((b: Blog) => b.slug !== currentSlug).slice(0, 5);
    if (filtered.length >= 1) return filtered;
    return getFallbackPopularBlogs(currentSlug);
  } catch {
    return getFallbackPopularBlogs(currentSlug);
  }
}

function getFallbackPopularBlogs(currentSlug: string): Blog[] {
  const fallbacks: Blog[] = [
    {
      id: 'pop-1',
      title: '30 Bucket List Ideas for Adventure Travellers in India',
      slug: '30-bucket-list-ideas-for-adventure-travellers-in-india',
      excerpt: 'Ultimate thrill seeker guide to India',
      content: '',
      coverImage: 'https://images.unsplash.com/photo-1506461883276-594a12b11ce3?auto=format&fit=crop&w=400&q=80',
      category: 'Adventure',
      tags: ['Adventure', 'India'],
      author: 'Kritika Singh',
      published: true,
      publishedAt: '2026-06-15T00:00:00Z',
      updatedAt: '',
      metaTitle: '',
      metaDescription: '',
      readTime: '6 min read'
    },
    {
      id: 'pop-2',
      title: '20 Cheapest Countries to Visit from India',
      slug: '20-cheapest-countries-to-visit-from-india',
      excerpt: 'Budget international travel guide for Indians',
      content: '',
      coverImage: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=400&q=80',
      category: 'Budget Travel',
      tags: ['Budget', 'International'],
      author: 'TripDM Team',
      published: true,
      publishedAt: '2026-06-10T00:00:00Z',
      updatedAt: '',
      metaTitle: '',
      metaDescription: '',
      readTime: '8 min read'
    },
    {
      id: 'pop-3',
      title: '50 Countries Where Getting A Visa Is Easier Than Ordering A Pizza',
      slug: '50-countries-where-getting-a-visa-is-easier',
      excerpt: 'Visa on arrival and e-visa friendly destinations',
      content: '',
      coverImage: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=400&q=80',
      category: 'Travel Tips',
      tags: ['Visa', 'Travel Tips'],
      author: 'TripDM Team',
      published: true,
      publishedAt: '2026-05-28T00:00:00Z',
      updatedAt: '',
      metaTitle: '',
      metaDescription: '',
      readTime: '7 min read'
    },
    {
      id: 'pop-4',
      title: '60 Places You Need to Visit In India With Your Best Friend!',
      slug: '60-places-you-need-to-visit-in-india-with-best-friend',
      excerpt: 'Unforgettable friends trip spots across India',
      content: '',
      coverImage: 'https://images.unsplash.com/photo-1526772662000-3f88f10405ff?auto=format&fit=crop&w=400&q=80',
      category: 'India Travel',
      tags: ['Friends', 'India Travel'],
      author: 'Rohan Mehta',
      published: true,
      publishedAt: '2026-05-15T00:00:00Z',
      updatedAt: '',
      metaTitle: '',
      metaDescription: '',
      readTime: '10 min read'
    },
    {
      id: 'pop-5',
      title: '51 Best Romantic Getaways in India',
      slug: '51-best-romantic-getaways-in-india',
      excerpt: 'Top honeymoon and couple destinations in India',
      content: '',
      coverImage: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=400&q=80',
      category: 'Destinations',
      tags: ['Romance', 'India Travel'],
      author: 'Ananya Sharma',
      published: true,
      publishedAt: '2026-05-01T00:00:00Z',
      updatedAt: '',
      metaTitle: '',
      metaDescription: '',
      readTime: '9 min read'
    }
  ];
  return fallbacks.filter(b => b.slug !== currentSlug);
}

function getFormattedViews(blog: Blog): string {
  const count = typeof blog.views === 'number' && !isNaN(blog.views) ? blog.views : 0;
  return count.toLocaleString('en-US');
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

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/<[^>]*>/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function parseTableLine(line: string): string[] {
  let trimmed = line.trim();
  if (trimmed.startsWith('|')) trimmed = trimmed.substring(1);
  if (trimmed.endsWith('|')) trimmed = trimmed.substring(0, trimmed.length - 1);
  return trimmed.split('|').map(c => {
    let text = c.trim();
    return text.replace(/^[\*\-\+]\s+/, '');
  });
}

function convertMarkdownTables(content: string): string {
  const lines = content.split('\n');
  const result: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.includes('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].includes('|')) {
        tableLines.push(lines[i]);
        i++;
      }

      if (tableLines.length >= 2) {
        let sepIndex = -1;
        for (let j = 0; j < tableLines.length; j++) {
          const l = tableLines[j].trim();
          if (/^\|?\s*:?-{2,}:?\s*(\||$)/.test(l) || /^[\s|:-]+$/.test(l)) {
            sepIndex = j;
            break;
          }
        }

        let headerCells: string[] = [];
        const bodyRows: string[][] = [];

        if (sepIndex > 0) {
          headerCells = parseTableLine(tableLines[sepIndex - 1]);
          for (let j = 0; j < tableLines.length; j++) {
            if (j !== sepIndex && j !== sepIndex - 1) {
              const cells = parseTableLine(tableLines[j]);
              if (cells.length > 0 && cells.some(c => c.length > 0)) {
                bodyRows.push(cells);
              }
            }
          }
        } else {
          const rawLine0 = tableLines[0].trim();
          const line0HasBullets = /\|?\s*[\*\-\+]\s+/.test(rawLine0);

          if (line0HasBullets) {
            headerCells = [];
            for (let j = 0; j < tableLines.length; j++) {
              const cells = parseTableLine(tableLines[j]);
              if (cells.length > 0 && cells.some(c => c.length > 0)) {
                bodyRows.push(cells);
              }
            }
          } else {
            headerCells = parseTableLine(tableLines[0]);
            for (let j = 1; j < tableLines.length; j++) {
              const cells = parseTableLine(tableLines[j]);
              if (cells.length > 0 && cells.some(c => c.length > 0)) {
                bodyRows.push(cells);
              }
            }
          }
        }

        // If it's a 1-column list wrapped in pipes by AI, render as clean benefit cards instead of a 1-col wireframe table
        if (headerCells.length === 1) {
          const allItems = [headerCells[0], ...bodyRows.map(r => r[0])].filter(Boolean);
          const listHtml = allItems.map(item => `<li>${item}</li>`).join('\n');
          result.push(`\n\n<ul class="blog-benefit-list">\n${listHtml}\n</ul>\n\n`);
          continue;
        }

        if (headerCells.length > 1) {
          const thHtml = headerCells.map(c => `<th>${c}</th>`).join('');
          const trHtml = bodyRows.map(row => {
            const tdHtml = row.map(c => `<td>${c}</td>`).join('');
            return `<tr>${tdHtml}</tr>`;
          }).join('\n');

          const tableHtml = `\n\n<div class="table-wrap"><table class="blog-table"><thead><tr>${thHtml}</tr></thead><tbody>\n${trHtml}\n</tbody></table></div>\n\n`;
          result.push(tableHtml);
          continue;
        } else if (bodyRows.length > 0) {
          const trHtml = bodyRows.map(row => {
            const tdHtml = row.map(c => `<td>${c}</td>`).join('');
            return `<tr>${tdHtml}</tr>`;
          }).join('\n');

          const tableHtml = `\n\n<div class="table-wrap"><table class="blog-table"><tbody>\n${trHtml}\n</tbody></table></div>\n\n`;
          result.push(tableHtml);
          continue;
        }
      }

      result.push(...tableLines);
    } else {
      result.push(line);
      i++;
    }
  }

  return result.join('\n');
}

function cleanUnicodeBoxDrawing(content: string): string {
  const boxCharRegex = /[┌┐└┘├┤┬┴┼─│═║╔╦╗╠╬╣╚╩╝]/;
  const lines = content.split('\n');
  const result: string[] = [];
  let i = 0;

  while (i < lines.length) {
    if (boxCharRegex.test(lines[i])) {
      const boxLines: string[] = [];
      while (
        i < lines.length &&
        (boxCharRegex.test(lines[i]) ||
          lines[i].trim() === '' ||
          lines[i].trim() === '`' ||
          lines[i].trim() === '`,`' ||
          lines[i].trim() === ',' ||
          lines[i].trim() === '`,' ||
          lines[i].trim() === ',`')
      ) {
        boxLines.push(lines[i]);
        i++;
      }

      const items: string[] = [];
      for (const bLine of boxLines) {
        const cleaned = bLine
          .replace(/[┌┐└┘├┤┬┴┼─│═║╔╦╗╠╬╣╚╩╝]/g, '')
          .replace(/^[`,\s]+|[`,\s]+$/g, '')
          .trim();
        if (cleaned && cleaned !== '`' && cleaned !== ',' && cleaned !== '`,`') {
          items.push(cleaned);
        }
      }

      if (items.length > 0) {
        const listHtml = items.map(item => `<li>${item}</li>`).join('\n');
        result.push(`\n\n<ul class="blog-benefit-list">\n${listHtml}\n</ul>\n\n`);
        continue;
      }
    }

    result.push(lines[i]);
    i++;
  }

  return result.join('\n');
}

function parseMarkdownLists(content: string): string {
  const lines = content.split('\n');
  const resultLines: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (/^\s*([\*\-\+]|\d+\.)\s+/.test(line)) {
      const listLines: string[] = [];
      while (i < lines.length) {
        const curr = lines[i];
        if (/^\s*([\*\-\+]|\d+\.)\s+/.test(curr)) {
          listLines.push(curr);
          i++;
        } else if (curr.trim() === '' && i + 1 < lines.length && /^\s*([\*\-\+]|\d+\.)\s+/.test(lines[i + 1])) {
          i++;
        } else {
          break;
        }
      }

      const items: { type: 'ul' | 'ol' | 'task'; content: string; checked?: boolean }[] = [];

      listLines.forEach(l => {
        const trimmed = l.trim();
        if (!trimmed) return;

        const taskMatch = trimmed.match(/^[\*\-\+]\s+\[([\sxX])\]\s+(.+)$/);
        if (taskMatch) {
          items.push({ type: 'task', content: taskMatch[2], checked: taskMatch[1].toLowerCase() === 'x' });
          return;
        }

        const ulMatch = trimmed.match(/^[\*\-\+]\s+(.+)$/);
        if (ulMatch) {
          items.push({ type: 'ul', content: ulMatch[1] });
          return;
        }

        const olMatch = trimmed.match(/^\d+\.\s+(.+)$/);
        if (olMatch) {
          items.push({ type: 'ol', content: olMatch[1] });
          return;
        }
      });

      if (items.length > 0) {
        const isOl = items.every(it => it.type === 'ol');
        const tag = isOl ? 'ol' : 'ul';
        const lis = items.map(it => `<li>${it.content}</li>`).join('\n');

        resultLines.push(`\n\n<${tag} class="blog-parsed-list">\n${lis}\n</${tag}>\n\n`);
        continue;
      }

      resultLines.push(...listLines);
    } else {
      resultLines.push(line);
      i++;
    }
  }

  return resultLines.join('\n');
}

function renderContent(content: string): string {
  if (!content) return '';

  // Strip all Unicode emoji from content
  let html = content.replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE00}-\u{FEFF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA9F}\u{2300}-\u{23FF}\u{2B00}-\u{2BFF}\u{25A0}-\u{25FF}\u{2700}-\u{27BF}]/gu, '').trim();

  // Strip hidden HTML comment blocks
  html = html.replace(/<!--[\s\S]*?-->/g, '');

  // Strip visible Focus Keyword callout line
  html = html.replace(/^\s*> ?\*\*Focus Keyword:\*\*.*$/gmi, '');
  html = html.replace(/^\s*Focus Keyword:.*$/gmi, '');

  // Deduplicate duplicate FAQ sections if present
  const faqHeaderRegex = /(?:^|\n)(?:---|\*\*\*|___)?\s*\n?##\s*(Frequently Asked Questions|FAQs)[\s\S]*?(?=\n##\s+|\n---\s*\n##\s+|$)/gi;
  const faqMatches = html.match(faqHeaderRegex);
  if (faqMatches && faqMatches.length > 1) {
    let count = 0;
    html = html.replace(faqHeaderRegex, (match) => {
      count++;
      return count === 1 ? '' : match;
    });
  }

  // 0. Remove decorative triangle lines (▼ ▼ ▼, ▲ ▲ ▲), stray standalone dots (...), commas, quotes, and standalone dashes/asterisks
  html = html
    .replace(/^\s*[▼▲\s]{2,}\s*$/gm, '')
    .replace(/^\s*[\.\…\,`'"\s]{1,}\s*$/gm, '')
    .replace(/^\s*[\-\*_]{3,}\s*$/gm, '')
    .replace(/\n\s*,\s*\n/g, '\n');

  // Strip Unicode Box Drawing ASCII blocks
  html = cleanUnicodeBoxDrawing(html);

  // 1. Convert Markdown Tables to HTML Tables
  html = convertMarkdownTables(html);

  // 2. Convert Markdown Lists into unified lists
  html = parseMarkdownLists(html);

  // 3. Blockquotes
  html = html.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');

  // 4. Headings with slugified anchor IDs
  html = html
    .replace(/^### (.+)$/gm, (_, t) => `<h3 id="${slugify(t)}">${t}</h3>`)
    .replace(/^## (.+)$/gm, (_, t) => `<h2 id="${slugify(t)}">${t}</h2>`)
    .replace(/^# (.+)$/gm, (_, t) => `<h1 id="${slugify(t)}">${t}</h1>`);

  // 5. Bold, Italic, Code, HR
  html = html.replace(/`\s*[,.]?\s*`/g, ' ');

  html = html
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`\r\n]+)`/g, (_, code) => {
      const trimmed = code.trim();
      if (trimmed === ',' || trimmed === '.' || trimmed === '' || trimmed === '`') return ' ';
      return `<code>${trimmed}</code>`;
    })
    .replace(/^---$/gm, '<hr>');

  // 6. Clean mangled bracket headers like [Kashmir Circuit] [Bali Experience] [Sri Lanka Escape]
  html = html.replace(/^\[([^\]]+)\]\s*\[([^\]]+)\](?:\s*\[([^\]]+)\])?$/gm, (_, c1, c2, c3) => {
    return `<div class="tag-row"><span>${c1}</span><span>${c2}</span>${c3 ? `<span>${c3}</span>` : ''}</div>`;
  });

  // 7. Links: CRITICAL - Anchor links starting with # MUST NOT get target="_blank"
  html = html.replace(/\[(.+?)\]\((.+?)\)/g, (_, text, href) => {
    if (href.startsWith('#')) {
      return `<a href="${href}" class="bp-anchor-link">${text}</a>`;
    }
    return `<a href="${href}" target="_blank" rel="noopener noreferrer">${text}</a>`;
  });

  // 8. Paragraphs
  html = html.split(/\n\n+/).map(block => {
    const trimmed = block.trim();
    if (!trimmed) return '';
    if (/^<(h[1-6]|ul|ol|blockquote|hr|div|table|thead|tbody|tr)/i.test(trimmed)) {
      return trimmed;
    }
    if (/^\s*[\.\…\,`'"\-\*\_\s]+\s*$/.test(trimmed)) return ''; // drop paragraphs containing only dots, punctuation, or dashes
    return `<p>${trimmed.replace(/\n/g, '<br>')}</p>`;
  }).filter(Boolean).join('\n');

  // 9. Transform Table of Contents / Quick Jumplinks header + ul into Thrillophilia Quick Jumplinks Box
  html = html.replace(
    /<h2 id="(quick-jumplinks-to-navigate|table-of-contents)">([^<]+)<\/h2>\s*<ul>([\s\S]*?)<\/ul>/gi,
    (_, id, title, listContent) => {
      return `
        <div class="quick-jumplinks-card" id="${id}">
          <div class="quick-jumplinks-header">Quick Jumplinks to Navigate</div>
          <ul class="quick-jumplinks-list">
            ${listContent}
          </ul>
        </div>
      `;
    }
  );

  return html;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return 'June 15, 2026';
  try { return new Date(dateStr).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }); }
  catch { return dateStr; }
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const blog = await getBlogBySlug(slug);
  if (!blog || !blog.published) notFound();

  const popularBlogs = await getPopularBlogs(blog.slug);
  const contentHtml = renderContent(blog.content);
  const mainViews = getFormattedViews(blog);

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
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=Lato:wght@300;400;700&family=Inter:wght@400;500;600;700;800&display=swap');

        .blog-wrapper * { box-sizing: border-box; }
        .blog-wrapper { background: #f8fafc; min-height: 100vh; font-family: 'Lato', 'Inter', system-ui, sans-serif; color: #1e293b; }

        /* Reading Progress Bar */
        .reading-progress { position: fixed; top: 0; left: 0; height: 3px; background: linear-gradient(90deg,#f97316,#fbbf24); z-index: 1000; transition: width 0.1s; width: 0%; }

        /* Navigation Header */
        .bp-nav { position: sticky; top: 0; z-index: 90; background: rgba(255,255,255,0.95); border-bottom: 1px solid rgba(0,0,0,0.06); backdrop-filter: blur(20px); }
        .bp-nav-inner { max-width: 1180px; margin: 0 auto; padding: 0 32px; height: 80px; display: flex; align-items: center; justify-content: space-between; }
        .bp-brand { display: flex; align-items: center; text-decoration: none; }
        .bp-nav-links { display: flex; align-items: center; }
        .bp-nav-link { color: #64748b; font-size: 14px; font-weight: 500; text-decoration: none; transition: color 0.2s; font-family: 'Inter', sans-serif; }
        .bp-nav-link:hover { color: #0f172a; }

        /* Main Container */
        .bp-container { max-width: 1160px; margin: 0 auto; padding: 40px 24px 80px; }

        /* Article Header (Above Hero) */
        .bp-header { margin-bottom: 28px; }
        .bp-category-badge { display: inline-block; color: #ea580c; font-family: 'Inter', sans-serif; font-size: 12px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 14px; }
        .bp-title { font-family: 'Playfair Display', Georgia, serif; font-size: clamp(28px, 4vw, 48px); font-weight: 900; color: #0f172a; line-height: 1.2; margin: 0 0 20px; letter-spacing: -0.5px; }
        .bp-meta-row { display: flex; align-items: center; gap: 12px; font-size: 14px; color: #64748b; font-family: 'Inter', sans-serif; flex-wrap: wrap; padding-bottom: 20px; border-bottom: 1px solid #e2e8f0; }
        .bp-meta-author { color: #334155; font-weight: 600; }
        .bp-meta-date { color: #94a3b8; }
        .bp-meta-dot { color: #e2e8f0; font-size: 16px; }
        .bp-meta-views { color: #ef4444; font-weight: 600; display: inline-flex; align-items: center; gap: 4px; }
        .bp-view-icon { width: 15px; height: 15px; fill: #ef4444; }
        .bp-meta-readtime { color: #94a3b8; font-weight: 500; }

        /* Hero Image Container */
        .bp-hero-box { width: 100%; margin-bottom: 40px; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 32px rgba(0,0,0,0.1); }
        .bp-hero-img { width: 100%; max-height: 520px; object-fit: cover; display: block; }
        .bp-hero-fallback { width: 100%; height: 400px; background: linear-gradient(135deg,#1e293b 0%,#0f172a 100%); display: flex; align-items: center; justify-content: center; }

        /* Main Grid (Content + Sidebar) */
        .bp-grid { display: grid; grid-template-columns: 1fr 300px; gap: 52px; align-items: start; }
        @media (max-width: 960px) { .bp-grid { grid-template-columns: 1fr; gap: 40px; } }

        /* Article Main Content */
        .bp-article-body { font-family: 'Lato', sans-serif; font-size: 17px; line-height: 1.9; color: #374151; font-weight: 400; }
        .bp-article-body h1, .bp-article-body h2, .bp-article-body h3 {
          font-family: 'Playfair Display', Georgia, serif;
          color: #0f172a;
          font-weight: 900;
          line-height: 1.25;
          margin-top: 48px;
          margin-bottom: 16px;
          letter-spacing: -0.3px;
        }
        .bp-article-body h1 { font-size: 34px; }
        .bp-article-body h2 { font-size: 28px; padding-bottom: 10px; border-bottom: 2px solid #f1f5f9; }
        .bp-article-body h3 { font-size: 22px; color: #1e293b; }
        .bp-article-body p { margin-bottom: 20px; line-height: 1.9; font-size: 17px; color: #374151; }
        .bp-article-body strong { color: #0f172a; font-weight: 700; }
        .bp-article-body em { font-style: italic; color: #475569; }
        .bp-article-body code { background: #f1f5f9; color: #dc2626; font-family: monospace; font-size: 14px; padding: 2px 6px; border-radius: 4px; }
        .bp-article-body blockquote {
          border-left: 4px solid #f97316;
          background: linear-gradient(135deg,#fff7ed,#fffbeb);
          padding: 20px 28px;
          margin: 32px 0;
          border-radius: 0 12px 12px 0;
          font-family: 'Playfair Display', Georgia, serif;
          font-style: italic;
          color: #92400e;
          font-size: 18px;
          line-height: 1.7;
        }
        .bp-article-body ul, .blog-parsed-list { margin: 16px 0 24px 4px; padding-left: 0; list-style: none; }
        .bp-article-body ul li, .blog-parsed-list li { margin-bottom: 10px !important; line-height: 1.75; color: #374151; padding-left: 20px; position: relative; font-size: 16.5px; }
        .bp-article-body ul li::before, .blog-parsed-list li::before { content: ''; position: absolute; left: 0; top: 10px; width: 7px; height: 7px; background: #f97316; border-radius: 50%; }
        .bp-article-body ul li:last-child, .blog-parsed-list li:last-child { margin-bottom: 0 !important; }
        .bp-article-body ul li p, .blog-parsed-list li p { margin: 0; padding: 0; display: inline; }
        .bp-article-body ol { margin: 16px 0 24px 20px; padding-left: 0; }
        .bp-article-body ol li { margin-bottom: 10px !important; line-height: 1.75; color: #374151; font-size: 16.5px; }
        .bp-article-body ol li::marker { color: #f97316; font-weight: 700; }
        .bp-article-body hr { border: none; border-top: 1px solid #e2e8f0; margin: 48px 0; }

        /* Task Items */
        .task-item { list-style: none !important; margin-left: 0 !important; padding-left: 0 !important; display: flex; align-items: flex-start; gap: 10px; margin-bottom: 10px !important; }
        .task-item::before { display: none !important; }
        .task-box { color: #f97316; font-weight: bold; font-size: 16px; flex-shrink: 0; line-height: 1.5; margin-top: 2px; }
        .task-content { flex: 1; min-width: 0; line-height: 1.75; color: #374151; }

        /* Tag Row */
        .tag-row { display: flex; gap: 10px; flex-wrap: wrap; margin: 20px 0 28px; }
        .tag-row span { background: #fff7ed; border: 1px solid #fed7aa; color: #ea580c; font-size: 13px; font-weight: 600; padding: 6px 14px; border-radius: 6px; font-family: 'Inter', sans-serif; }

        /* Links */
        .bp-article-body a { color: #f97316; text-decoration: none; font-weight: 600; border-bottom: 1px solid rgba(249,115,22,0.3); transition: border-color 0.15s, color 0.15s; }
        .bp-article-body a:hover { color: #ea580c; border-bottom-color: #ea580c; }

        /* Quick Jumplinks Box */
        .quick-jumplinks-card { background: #ffffff; border: 1px solid #e5e7eb; border-left: 4px solid #f97316; border-radius: 0 12px 12px 0; padding: 24px 28px; margin: 36px 0 40px; box-shadow: 0 2px 12px rgba(0,0,0,0.04); }
        .quick-jumplinks-header { font-family: 'Playfair Display', Georgia, serif; font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 16px; }
        .quick-jumplinks-list { list-style: none !important; padding: 0 !important; margin: 0 !important; display: flex; flex-direction: column; gap: 10px; }
        .quick-jumplinks-list li { padding-left: 0 !important; margin: 0 !important; }
        .quick-jumplinks-list li::before { display: none !important; }
        .quick-jumplinks-list a, .bp-anchor-link { color: #f97316 !important; font-family: 'Inter', sans-serif; font-size: 15px; font-weight: 600; text-decoration: none !important; border-bottom: none !important; transition: color 0.15s; }
        .quick-jumplinks-list a:hover, .bp-anchor-link:hover { color: #ea580c !important; text-decoration: underline !important; }

        /* Tables */
        .table-wrap { width: 100%; overflow-x: auto; margin: 32px 0; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
        .blog-table { width: 100%; border-collapse: collapse; font-family: 'Inter', sans-serif; font-size: 14px; background: #ffffff; text-align: left; }
        .blog-table th { background: #0f172a; color: #ffffff; font-weight: 700; font-size: 12px; text-transform: uppercase; letter-spacing: 0.8px; padding: 14px 20px; }
        .blog-table td { padding: 14px 20px; border-bottom: 1px solid #f1f5f9; color: #334155; line-height: 1.65; vertical-align: top; }
        .blog-table tr:nth-child(even) td { background: #f8fafc; }
        .blog-table tr:hover td { background: #fff7ed; }

        /* Benefit List */
        .blog-benefit-list { list-style: none !important; padding: 0 !important; margin: 24px 0 !important; display: flex; flex-direction: column; gap: 10px; }
        .blog-benefit-list li { background: #fff7ed; border: 1px solid rgba(249,115,22,0.15); border-left: 3px solid #f97316; border-radius: 0 8px 8px 0; padding: 14px 18px; font-size: 15.5px; font-weight: 600; color: #1e293b; line-height: 1.5; margin: 0 !important; font-family: 'Inter', sans-serif; }
        .blog-benefit-list li::before { display: none !important; }

        /* Sidebar Styling */
        .bp-sidebar { display: flex; flex-direction: column; gap: 24px; position: sticky; top: 100px; }
        .bp-sidebar-card { background: #ffffff; border: 1px solid #e5e7eb; border-radius: 14px; padding: 24px; box-shadow: 0 2px 12px rgba(0,0,0,0.04); }
        .bp-sidebar-card-title { font-family: 'Playfair Display', Georgia, serif; font-size: 18px; font-weight: 700; color: #0f172a; margin: 0 0 20px; line-height: 1.3; }

        /* Newsletter Card */
        .bp-newsletter-form { display: flex; flex-direction: column; gap: 12px; }
        .bp-newsletter-input { width: 100%; padding: 11px 14px; border: 1.5px solid #e2e8f0; border-radius: 8px; font-size: 14px; font-family: 'Inter', sans-serif; outline: none; transition: border-color 0.2s; background: #f8fafc; }
        .bp-newsletter-input:focus { border-color: #f97316; background: #fff; }
        .bp-newsletter-btn { width: 100%; background: linear-gradient(135deg,#f97316,#ea580c); color: #ffffff; border: none; padding: 12px; border-radius: 8px; font-size: 13px; font-weight: 700; font-family: 'Inter', sans-serif; letter-spacing: 0.5px; text-transform: uppercase; cursor: pointer; transition: opacity 0.2s; box-shadow: 0 4px 12px rgba(249,115,22,0.25); }
        .bp-newsletter-btn:hover { opacity: 0.9; }
        .bp-newsletter-terms { display: flex; align-items: center; gap: 8px; font-size: 12px; color: #94a3b8; font-family: 'Inter', sans-serif; cursor: pointer; }
        .bp-newsletter-terms input { accent-color: #f97316; }

        /* Popular Stories */
        .bp-popular-list { display: flex; flex-direction: column; gap: 16px; }
        .bp-popular-item { display: flex; gap: 12px; text-decoration: none; align-items: flex-start; }
        .bp-popular-img { width: 72px; height: 54px; object-fit: cover; border-radius: 8px; flex-shrink: 0; background: #f1f5f9; }
        .bp-popular-info { flex: 1; min-width: 0; }
        .bp-popular-title { font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 600; color: #1e293b; line-height: 1.4; margin: 0 0 5px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; transition: color 0.15s; }
        .bp-popular-item:hover .bp-popular-title { color: #f97316; }
        .bp-popular-views { font-size: 11px; font-weight: 600; color: #ef4444; display: flex; align-items: center; gap: 4px; font-family: 'Inter', sans-serif; }
        .bp-view-icon-sm { width: 12px; height: 12px; fill: #ef4444; }

        /* CTA Box */
        .bp-cta-box { background: linear-gradient(135deg,#0f172a 0%,#1e293b 100%); border-radius: 16px; padding: 40px 36px; text-align: center; margin: 56px 0 40px; color: #ffffff; position: relative; overflow: hidden; }
        .bp-cta-box::before { content: ''; position: absolute; top: -60px; right: -60px; width: 200px; height: 200px; background: rgba(249,115,22,0.1); border-radius: 50%; pointer-events: none; }
        .bp-cta-title { font-family: 'Playfair Display', Georgia, serif; font-size: 26px; font-weight: 900; margin: 0 0 12px; }
        .bp-cta-desc { font-family: 'Lato', sans-serif; font-size: 15px; color: #94a3b8; margin: 0 auto 24px; max-width: 440px; line-height: 1.75; font-weight: 300; }
        .bp-cta-btn { display: inline-block; background: linear-gradient(135deg,#f97316,#ea580c); color: #ffffff; text-decoration: none; padding: 13px 32px; border-radius: 8px; font-weight: 700; font-size: 14px; font-family: 'Inter', sans-serif; transition: opacity 0.2s; box-shadow: 0 4px 16px rgba(249,115,22,0.3); letter-spacing: 0.3px; }
        .bp-cta-btn:hover { opacity: 0.9; }

        /* Tags */
        .bp-tags-wrap { display: flex; flex-wrap: wrap; gap: 8px; margin: 32px 0 16px; }
        .bp-tag-chip { font-size: 12.5px; color: #64748b; background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 6px; padding: 5px 12px; text-decoration: none; font-family: 'Inter', sans-serif; font-weight: 500; transition: all 0.15s; }
        .bp-tag-chip:hover { background: rgba(249,115,22,0.08); color: #ea580c; border-color: rgba(249,115,22,0.2); }
      `}</style>

      {/* Reading progress bar */}
      <div className="reading-progress" id="reading-progress" suppressHydrationWarning />

      {/* Reading Progress & Smooth Scrolling Client Script */}
      <script dangerouslySetInnerHTML={{
        __html: `
          (function(){
            // Progress Bar
            var bar = document.getElementById('reading-progress');
            if(bar) {
              window.addEventListener('scroll', function(){
                var scrollTop = window.scrollY;
                var docHeight = document.documentElement.scrollHeight - window.innerHeight;
                var progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
                bar.style.width = Math.min(progress, 100) + '%';
              }, {passive: true});
            }

            // Smooth Scroll for Quick Jumplinks (anchor links starting with #)
            document.addEventListener('click', function(e) {
              var target = e.target;
              while (target && target !== document) {
                if (target.tagName === 'A' && target.getAttribute('href') && target.getAttribute('href').startsWith('#')) {
                  var id = target.getAttribute('href').substring(1);
                  var el = document.getElementById(id);
                  if (el) {
                    e.preventDefault();
                    var yOffset = -80;
                    var y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
                    window.scrollTo({ top: y, behavior: 'smooth' });
                    history.pushState(null, '', '#' + id);
                  }
                  break;
                }
                target = target.parentNode;
              }
            });
          })();
        `
      }} />

      <div className="blog-wrapper">

        {/* Top Navbar */}
        <nav className="bp-nav">
          <div className="bp-nav-inner">
            <Link href="/" className="bp-brand">
              <img src="/tripdm-logo.png" alt="TripDM" style={{ height: 64, width: 'auto', objectFit: 'contain' }} />
            </Link>
            <div className="bp-nav-links">
              <Link href="/" className="bp-nav-link">Find Travel Agents →</Link>
            </div>
          </div>
        </nav>

        {/* Main Content Container */}
        <main className="bp-container">

          {/* Article Header (Above Cover Image) */}
          <header className="bp-header">
            {blog.category && (
              <span className="bp-category-badge">{blog.category}</span>
            )}
            <h1 className="bp-title">{blog.title}</h1>
            <div className="bp-meta-row">
              <span className="bp-meta-author">By {blog.author}</span>
              <span className="bp-meta-dot">|</span>
              <span className="bp-meta-date">{formatDate(blog.publishedAt)}</span>
              {blog.readTime && (
                <>
                  <span className="bp-meta-dot">|</span>
                  <span className="bp-meta-readtime">{blog.readTime}</span>
                </>
              )}
              <span className="bp-meta-dot">|</span>
              <span className="bp-meta-views">
                <svg className="bp-view-icon" viewBox="0 0 24 24">
                  <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                </svg>
                {mainViews} Views
              </span>
            </div>
          </header>

          {/* Cover Hero Image */}
          <div className="bp-hero-box">
            {blog.coverImage ? (
              <img src={blog.coverImage} alt={blog.title} className="bp-hero-img" />
            ) : (
              <div className="bp-hero-fallback">
                <img src="/tripdm-logo.png" alt="TripDM" style={{ width: 140, opacity: 0.15, objectFit: 'contain' }} />
              </div>
            )}
          </div>

          {/* 2-Column Grid Layout */}
          <div className="bp-grid">

            {/* Left Column: Main Content */}
            <article className="bp-article-column">
              <div
                className="bp-article-body"
                dangerouslySetInnerHTML={{ __html: contentHtml }}
              />

              {/* CTA Box */}
              <div className="bp-cta-box">
                <h3 className="bp-cta-title">Plan Your Dream Trip Today</h3>
                <p className="bp-cta-desc">Get customized travel packages and expert itineraries directly from verified travel agents on TripDM.</p>
                <Link href="/" className="bp-cta-btn">Explore Packages →</Link>
              </div>

              {/* Tags */}
              {blog.tags?.length > 0 && (
                <div className="bp-tags-wrap">
                  {blog.tags.map(tag => (
                    <span key={tag} className="bp-tag-chip">#{tag}</span>
                  ))}
                </div>
              )}
            </article>

            {/* Right Sidebar Column */}
            <aside className="bp-sidebar">

              {/* Popular TripDM Stories */}
              <div className="bp-sidebar-card">
                <h3 className="bp-sidebar-card-title">Popular TripDM Stories</h3>
                <div className="bp-popular-list">
                  {popularBlogs.map((item) => (
                    <Link key={item.id} href={`/blog/${item.slug}`} className="bp-popular-item">
                      <img src={item.coverImage || 'https://images.unsplash.com/photo-1506461883276-594a12b11ce3?auto=format&fit=crop&w=400&q=80'} alt={item.title} className="bp-popular-img" />
                      <div className="bp-popular-info">
                        <h4 className="bp-popular-title">{item.title}</h4>
                        <div className="bp-popular-views">
                          <svg className="bp-view-icon-sm" viewBox="0 0 24 24">
                            <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                          </svg>
                          {getFormattedViews(item)} Views
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

            </aside>

          </div>

        </main>

      </div>
    </>
  );
}
