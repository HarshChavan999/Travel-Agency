const fs = require('fs');
const admin = require('firebase-admin');

const serviceAccount = require('./firebase-admin-key.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'travel-agent-management-29c27'
  });
}

const db = admin.firestore();

async function main() {
  // Load sitemap URLs
  const sitemapXml = fs.readFileSync('sitemap.xml', 'utf8');
  const sitemapUrls = [...sitemapXml.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1]);
  const packageIdsInSitemap = new Set(
    sitemapUrls.filter(u => u.startsWith('https://tripdm.com/package/')).map(u => u.replace('https://tripdm.com/package/', ''))
  );
  const blogSlugsInSitemap = new Set(
    sitemapUrls.filter(u => u.startsWith('https://tripdm.com/blog/')).map(u => u.replace('https://tripdm.com/blog/', ''))
  );

  // Fetch all listings
  const listingsSnap = await db.collection('listings').get();
  const allListings = [];
  listingsSnap.forEach(doc => {
    const data = doc.data();
    allListings.push({ id: doc.id, ...data });
  });
  const missingPackages = allListings.filter(l => l.approved !== false && !packageIdsInSitemap.has(l.id));

  // Fetch all blogs
  const blogsSnap = await db.collection('blogs').get();
  const allBlogs = [];
  blogsSnap.forEach(doc => {
    const data = doc.data();
    allBlogs.push({ id: doc.id, slug: data.slug || doc.id, title: data.title || '(no title)', ...data });
  });
  const missingBlogs = allBlogs.filter(b => b.published !== false && !blogSlugsInSitemap.has(b.slug || b.id));

  // Build report
  let report = '# Sitemap Missing Content Report\n\n';
  report += `Generated: ${new Date().toISOString()}\n\n`;
  report += `## Summary\n\n`;
  report += `| Category | In Firestore | In Sitemap | Missing |\n`;
  report += `|----------|-------------|------------|---------|\n`;
  report += `| Packages (listings) | ${allListings.length} | ${packageIdsInSitemap.size} | **${missingPackages.length}** |\n`;
  report += `| Blogs | ${allBlogs.length} | ${blogSlugsInSitemap.size} | **${missingBlogs.length}** |\n`;
  report += `| Static pages | - | 5 | 0 |\n\n`;

  report += `## Root Cause\n\n`;
  report += `The live sitemap at https://tripdm.com/sitemap.xml only contains static pages because `;
  report += `the sitemap generation code (src/app/sitemap.ts) fetches Firestore via the unauthenticated `;
  report += `Firestore REST API (\`https://firestore.googleapis.com/v1/.../documents/listings\` and `;
  report += `\`.../documents/blogs\`), which returns **403 PERMISSION_DENIED** due to Firestore security rules. `;
  report += `Therefore NO packages or blogs are being included in the generated sitemap.\n\n`;

  report += `## Missing Packages (${missingPackages.length})\n\n`;
  if (missingPackages.length > 0) {
    missingPackages.forEach((p, i) => {
      report += `${i + 1}. https://tripdm.com/package/${p.id} — ${p.title || '(no title)'}\n`;
    });
  } else {
    report += `None.\n`;
  }

  report += `\n## Missing Blogs (${missingBlogs.length})\n\n`;
  if (missingBlogs.length > 0) {
    missingBlogs.forEach((b, i) => {
      report += `${i + 1}. https://tripdm.com/blog/${b.slug || b.id} — ${b.title || '(no title)'}\n`;
    });
  } else {
    report += `None.\n`;
  }

  fs.writeFileSync('sitemap-missing-report.md', report, 'utf8');
  console.log(`Report written to sitemap-missing-report.md`);
  console.log(`Missing packages: ${missingPackages.length}`);
  console.log(`Missing blogs: ${missingBlogs.length}`);
  process.exit(0);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});