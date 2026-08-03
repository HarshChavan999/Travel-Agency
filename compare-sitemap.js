const fs = require('fs');

// 1. Load sitemap.xml
const sitemapXml = fs.readFileSync('sitemap.xml', 'utf8');
const sitemapUrls = [...sitemapXml.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1]);
console.log(`=== SITEMAP ===`);
console.log(`Total URLs in sitemap: ${sitemapUrls.length}`);
sitemapUrls.forEach(u => console.log(`  ${u}`));

// 2. Load listings.json
let listings = [];
try {
  const data = JSON.parse(fs.readFileSync('listings.json', 'utf8'));
  if (data.documents) {
    for (const doc of data.documents) {
      const nameParts = doc.name.split('/');
      const id = nameParts[nameParts.length - 1];
      listings.push({ id, name: doc.name });
    }
  }
} catch (e) {
  console.error('Error parsing listings.json:', e.message);
}
console.log(`\n=== PACKAGES (listings collection) ===`);
console.log(`Total packages in Firestore: ${listings.length}`);

// 3. Load blogs.json
let blogs = [];
try {
  const data = JSON.parse(fs.readFileSync('blogs.json', 'utf8'));
  if (data.documents) {
    for (const doc of data.documents) {
      const fields = doc.fields || {};
      const slug = fields.slug?.stringValue;
      const publishedVal = fields.published?.booleanValue;
      const isPublished = publishedVal !== undefined ? publishedVal : true;
      const nameParts = doc.name.split('/');
      const docId = nameParts[nameParts.length - 1];
      blogs.push({
        id: docId,
        slug: slug || docId,
        isPublished,
      });
    }
  }
} catch (e) {
  console.error('Error parsing blogs.json:', e.message);
}
console.log(`\n=== BLOGS (blogs collection) ===`);
console.log(`Total blogs in Firestore: ${blogs.length}`);
const publishedBlogs = blogs.filter(b => b.isPublished);
console.log(`Total published blogs: ${publishedBlogs.length}`);
const unpublishedBlogs = blogs.filter(b => !b.isPublished);
console.log(`Total unpublished blogs: ${unpublishedBlogs.length}`);
if (unpublishedBlogs.length > 0) {
  console.log(`Unpublished blog slugs (excluded from sitemap by design):`);
  unpublishedBlogs.forEach(b => console.log(`  ${b.slug} (id: ${b.id})`));
}

// 4. Compare - find missing packages
console.log(`\n=== MISSING PACKAGES (in Firestore but NOT in sitemap) ===`);
const packageUrlsInSitemap = sitemapUrls.filter(u => u.startsWith('https://tripdm.com/package/'));
const packageIdsInSitemap = new Set(packageUrlsInSitemap.map(u => u.replace('https://tripdm.com/package/', '')));
console.log(`Packages in sitemap: ${packageIdsInSitemap.size}`);
const missingPackages = listings.filter(l => !packageIdsInSitemap.has(l.id));
console.log(`Missing packages: ${missingPackages.length}`);
if (missingPackages.length > 0) {
  missingPackages.forEach(p => console.log(`  ${p.id}`));
}

// 5. Compare - find missing blogs
console.log(`\n=== MISSING BLOGS (published in Firestore but NOT in sitemap) ===`);
const blogUrlsInSitemap = sitemapUrls.filter(u => u.startsWith('https://tripdm.com/blog/'));
const blogSlugsInSitemap = new Set(blogUrlsInSitemap.map(u => u.replace('https://tripdm.com/blog/', '')));
console.log(`Blogs in sitemap: ${blogSlugsInSitemap.size}`);
const missingBlogs = publishedBlogs.filter(b => !blogSlugsInSitemap.has(b.slug));
console.log(`Missing published blogs: ${missingBlogs.length}`);
if (missingBlogs.length > 0) {
  missingBlogs.forEach(b => console.log(`  /blog/${b.slug}  (id: ${b.id})`));
}

// 6. Summary
console.log(`\n=== SUMMARY ===`);
console.log(`Sitemap total URLs: ${sitemapUrls.length}`);
console.log(`Packages in DB: ${listings.length} | Packages in sitemap: ${packageIdsInSitemap.size} | Missing: ${missingPackages.length}`);
console.log(`Blogs in DB: ${blogs.length} (${publishedBlogs.length} published) | Blogs in sitemap: ${blogSlugsInSitemap.size} | Missing published: ${missingBlogs.length}`);