const fs = require('fs');
const admin = require('firebase-admin');

// Initialize Firebase Admin with service account
const serviceAccount = require('./firebase-admin-key.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'travel-agent-management-29c27'
  });
}

const db = admin.firestore();

async function main() {
  // 1. Load sitemap URLs
  const sitemapXml = fs.readFileSync('sitemap.xml', 'utf8');
  const sitemapUrls = [...sitemapXml.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1]);
  console.log('=== SITEMAP ===');
  console.log(`Total URLs in sitemap: ${sitemapUrls.length}`);
  sitemapUrls.forEach(u => console.log(`  ${u}`));

  const packageSlugsInSitemap = new Set(
    sitemapUrls.filter(u => u.startsWith('https://tripdm.com/package/')).map(u => u.replace('https://tripdm.com/package/', ''))
  );
  const blogSlugsInSitemap = new Set(
    sitemapUrls.filter(u => u.startsWith('https://tripdm.com/blog/')).map(u => u.replace('https://tripdm.com/blog/', ''))
  );

  // 2. Fetch all listings (packages)
  console.log('\n=== PACKAGES (listings collection) ===');
  const listingsSnap = await db.collection('listings').get();
  const allListings = [];
  listingsSnap.forEach(doc => {
    const data = doc.data();
    allListings.push({ id: doc.id, ...data });
  });
  console.log(`Total packages in Firestore: ${allListings.length}`);
  console.log(`Packages in sitemap: ${packageSlugsInSitemap.size}`);

  // Check approved status - only approved packages should be public
  const approvedListings = allListings.filter(l => l.approved !== false);
  console.log(`Approved packages: ${approvedListings.length}`);
  const unapprovedListings = allListings.filter(l => l.approved === false);
  if (unapprovedListings.length > 0) {
    console.log(`Unapproved (excluded from public site by design):`);
    unapprovedListings.forEach(l => console.log(`  ${l.id}${l.title ? ` (${l.title})` : ''}`));
  }

  const missingPackages = approvedListings.filter(l => !packageSlugsInSitemap.has(l.id));
  console.log(`\n=== MISSING PACKAGES (approved, in Firestore but NOT in sitemap) ===`);
  console.log(`Count: ${missingPackages.length}`);
  if (missingPackages.length > 0) {
    missingPackages.forEach(p => {
      const title = p.title || '(no title)';
      console.log(`  /package/${p.id}  —  ${title}`);
    });
  }

  // 3. Fetch all blogs
  console.log('\n=== BLOGS (blogs collection) ===');
  const blogsSnap = await db.collection('blogs').get();
  const allBlogs = [];
  blogsSnap.forEach(doc => {
    const data = doc.data();
    allBlogs.push({ id: doc.id, ...data });
  });
  console.log(`Total blogs in Firestore: ${allBlogs.length}`);

  const publishedBlogs = allBlogs.filter(b => b.published !== false);
  const unpublishedBlogs = allBlogs.filter(b => b.published === false);
  console.log(`Published blogs: ${publishedBlogs.length}`);
  console.log(`Unpublished blogs: ${unpublishedBlogs.length}`);
  if (unpublishedBlogs.length > 0) {
    console.log('Unpublished (excluded from public site by design):');
    unpublishedBlogs.forEach(b => {
      console.log(`  /blog/${b.slug || b.id}  —  ${b.title || '(no title)'} (id: ${b.id})`);
    });
  }

  const missingBlogs = publishedBlogs.filter(b => {
    const slug = b.slug || b.id;
    return !blogSlugsInSitemap.has(slug);
  });
  console.log(`\n=== MISSING BLOGS (published, in Firestore but NOT in sitemap) ===`);
  console.log(`Count: ${missingBlogs.length}`);
  if (missingBlogs.length > 0) {
    missingBlogs.forEach(b => {
      const slug = b.slug || b.id;
      console.log(`  /blog/${slug}  —  ${b.title || '(no title)'} (id: ${b.id})`);
    });
  }

  // 4. Summary
  console.log('\n=== SUMMARY ===');
  console.log(`Sitemap total URLs: ${sitemapUrls.length}`);
  console.log(`Packages in DB: ${allListings.length} | Approved: ${approvedListings.length} | Missing from sitemap: ${missingPackages.length}`);
  console.log(`Blogs in DB: ${allBlogs.length} | Published: ${publishedBlogs.length} | Missing from sitemap: ${missingBlogs.length}`);

  process.exit(0);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});