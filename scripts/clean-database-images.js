const { Firestore } = require('@google-cloud/firestore');
const { OAuth2Client } = require('google-auth-library');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Initialize Firestore connection
function initFirestore() {
  // Strategy 1: Active gcloud token
  try {
    const token = execSync('gcloud auth print-access-token', { stdio: ['pipe', 'pipe', 'ignore'] }).toString().trim();
    if (token) {
      const authClient = new OAuth2Client();
      authClient.setCredentials({ access_token: token });
      return new Firestore({
        projectId: process.env.FIREBASE_PROJECT_ID || 'travel-agent-management-29c27',
        authClient
      });
    }
  } catch (e) {}

  // Strategy 2: Service account file
  const keyFiles = [
    path.join(__dirname, '../travel-agent-management-29c27-firebase-adminsdk-fbsvc-77e65102c8.json'),
    path.join(__dirname, '../firebase-admin-key.json')
  ];

  for (const kf of keyFiles) {
    if (fs.existsSync(kf)) {
      try {
        const sa = require(kf);
        return new Firestore({
          projectId: sa.project_id || 'travel-agent-management-29c27',
          keyFilename: kf
        });
      } catch (err) {}
    }
  }

  return new Firestore({
    projectId: process.env.FIREBASE_PROJECT_ID || 'travel-agent-management-29c27'
  });
}

// Compare two URLs ignoring query params and Wikimedia thumbnail dimensions
function isMatchingUrl(urlA, urlB) {
  if (!urlA || !urlB) return false;
  const cleanA = urlA.split('?')[0].split('#')[0].trim().toLowerCase();
  const cleanB = urlB.split('?')[0].split('#')[0].trim().toLowerCase();
  if (cleanA === cleanB) return true;

  try {
    const fileA = cleanA.split('/').filter(Boolean).pop()?.replace(/^\d+px-/, '');
    const fileB = cleanB.split('/').filter(Boolean).pop()?.replace(/^\d+px-/, '');
    if (fileA && fileB && fileA === fileB) return true;
  } catch {}

  return false;
}

// Synchronize package listing photo collections
function syncListingPhotos(pkg, options = {}) {
  const itinerary = Array.isArray(pkg.itinerary)
    ? pkg.itinerary.map(day => ({ ...day }))
    : [];

  const removedUrls = (options.removedUrls || []).filter(Boolean);

  // 1. Update itinerary
  if (typeof options.removeDayIndex === 'number' && options.removeDayIndex >= 0 && options.removeDayIndex < itinerary.length) {
    itinerary[options.removeDayIndex] = {
      ...itinerary[options.removeDayIndex],
      imageUrl: '',
      imageUrls: []
    };
  }

  // Remove matching URLs from all itinerary days if requested
  if (options.purgeRemovedUrlsFromItinerary && removedUrls.length > 0) {
    itinerary.forEach((d, idx) => {
      let dUrls = Array.isArray(d.imageUrls) ? [...d.imageUrls] : d.imageUrl ? [d.imageUrl] : [];
      const prevLen = dUrls.length;
      dUrls = dUrls.filter(u => !removedUrls.some(ru => isMatchingUrl(ru, u)));
      if (dUrls.length !== prevLen || removedUrls.some(ru => isMatchingUrl(ru, d.imageUrl))) {
        itinerary[idx] = {
          ...d,
          imageUrl: dUrls[0] || '',
          imageUrls: dUrls
        };
      }
    });
  }

  // 2. Remaining valid itinerary photos
  const remainingItineraryPhotos = [];
  itinerary.forEach(d => {
    const dayUrls = Array.isArray(d.imageUrls) ? d.imageUrls : d.imageUrl ? [d.imageUrl] : [];
    dayUrls.forEach(u => {
      if (u && !removedUrls.some(ru => isMatchingUrl(ru, u))) {
        if (!remainingItineraryPhotos.includes(u)) {
          remainingItineraryPhotos.push(u);
        }
      }
    });
  });

  // 3. Update placesCovered
  let placesCovered = Array.isArray(pkg.placesCovered)
    ? pkg.placesCovered.map(place => ({ ...place }))
    : [];

  if (placesCovered.length > 0) {
    placesCovered = placesCovered.map(place => {
      let placeUrls = Array.isArray(place.imageUrls)
        ? [...place.imageUrls]
        : place.imageUrl
        ? [place.imageUrl]
        : [];

      if (removedUrls.length > 0) {
        placeUrls = placeUrls.filter(u => !removedUrls.some(ru => isMatchingUrl(ru, u)));
      }

      return {
        ...place,
        imageUrls: placeUrls,
        ...(place.imageUrl !== undefined ? { imageUrl: placeUrls[0] || '' } : {})
      };
    });

    // Sync front thumbnail placesCovered[0]
    const frontUrls = (placesCovered[0].imageUrls || []).filter(u => !removedUrls.some(ru => isMatchingUrl(ru, u)));
    if (frontUrls.length === 0) {
      placesCovered[0] = {
        ...placesCovered[0],
        imageUrls: remainingItineraryPhotos.length > 0 ? [remainingItineraryPhotos[0]] : [],
        ...(placesCovered[0].imageUrl !== undefined ? { imageUrl: remainingItineraryPhotos[0] || '' } : {})
      };
    }
  }

  // 4. Update photos array
  let photos = Array.isArray(pkg.photos) ? [...pkg.photos] : [];
  if (removedUrls.length > 0) {
    photos = photos.filter(u => !removedUrls.some(ru => isMatchingUrl(ru, u)));
  }

  // 5. Update top-level imageUrls
  let imageUrls = Array.isArray(pkg.imageUrls) ? [...pkg.imageUrls] : [];
  if (removedUrls.length > 0) {
    imageUrls = imageUrls.filter(u => !removedUrls.some(ru => isMatchingUrl(ru, u)));
  }

  // 6. Update top-level imageUrl
  let mainImageUrl = pkg.imageUrl || '';
  if (removedUrls.some(ru => isMatchingUrl(ru, mainImageUrl))) {
    mainImageUrl = placesCovered[0]?.imageUrls?.[0] || remainingItineraryPhotos[0] || '';
  }

  const firestorePayload = {
    itinerary,
    ...(placesCovered.length > 0 ? { placesCovered } : {}),
    photos,
    imageUrls,
    imageUrl: mainImageUrl,
    updatedAt: new Date()
  };

  return { updatedPkg: { ...pkg, ...firestorePayload }, firestorePayload };
}

async function main() {
  const args = process.argv.slice(2);
  const execute = args.includes('--execute');
  const deleteKolkata = args.includes('--delete-kolkata');
  const deleteFirebaseStorage = args.includes('--delete-firebase-storage');
  const fixFrontThumbnails = args.includes('--fix-front-thumbnails');
  const cleanAll = args.includes('--clean-all');

  console.log('================================================================');
  console.log('   TripDM Database Image Audit & Cleanup CLI Tool');
  console.log('================================================================');
  console.log('Mode:', execute ? '🚀 EXECUTE (Changes will be written to Firestore)' : '🔍 DRY RUN (Simulating changes only, pass --execute to apply)');

  const db = initFirestore();
  const snap = await db.collection('listings').get();
  console.log(`\nFetched ${snap.size} listings from Firestore database...\n`);

  let kolkataPurgedCount = 0;
  let frontThumbnailsFixedCount = 0;
  let firebaseStoragePurgedCount = 0;

  const kolkataKeyword = /kolkata.*maidan/i;

  for (const doc of snap.docs) {
    const data = doc.data();
    const id = doc.id;
    const title = data.title || 'Untitled Package';
    const dest = data.stateName || data.countryName || 'Domestic';

    let needsUpdate = false;
    let currentPkg = { ...data };

    // 1. Check for Kolkata image usages
    const kolkataUrlsInPkg = [];
    if (data.imageUrl && kolkataKeyword.test(data.imageUrl)) kolkataUrlsInPkg.push(data.imageUrl);
    if (Array.isArray(data.imageUrls)) {
      data.imageUrls.forEach(u => { if (kolkataKeyword.test(u)) kolkataUrlsInPkg.push(u); });
    }
    if (Array.isArray(data.photos)) {
      data.photos.forEach(u => { if (kolkataKeyword.test(u)) kolkataUrlsInPkg.push(u); });
    }
    if (Array.isArray(data.placesCovered)) {
      data.placesCovered.forEach((p, idx) => {
        const pUrls = Array.isArray(p.imageUrls) ? p.imageUrls : p.imageUrl ? [p.imageUrl] : [];
        pUrls.forEach(u => {
          if (kolkataKeyword.test(u)) {
            kolkataUrlsInPkg.push(u);
            console.log(`  [KOLKATA MATCH] ${id} (${title}) -> placesCovered[${idx}] ${p.name || ''} ${idx === 0 ? '★ FRONT THUMBNAIL' : ''}`);
          }
        });
      });
    }
    if (Array.isArray(data.itinerary)) {
      data.itinerary.forEach((d, idx) => {
        const dUrls = Array.isArray(d.imageUrls) ? d.imageUrls : d.imageUrl ? [d.imageUrl] : [];
        dUrls.forEach(u => {
          if (kolkataKeyword.test(u)) {
            kolkataUrlsInPkg.push(u);
            console.log(`  [KOLKATA MATCH] ${id} (${title}) -> itinerary[${idx}] Day ${d.day || idx+1} (${d.placeName || ''})`);
          }
        });
      });
    }

    if (kolkataUrlsInPkg.length > 0) {
      kolkataPurgedCount++;
      if (deleteKolkata || cleanAll) {
        needsUpdate = true;
        const { updatedPkg } = syncListingPhotos(currentPkg, {
          removedUrls: kolkataUrlsInPkg,
          purgeRemovedUrlsFromItinerary: true
        });
        currentPkg = updatedPkg;
      }
    }

    // 2. Check for old Firebase Storage URLs in package
    const fbUrlsInPkg = [];
    const checkFb = (u) => u && typeof u === 'string' && u.includes('firebasestorage.googleapis.com');
    if (checkFb(data.imageUrl)) fbUrlsInPkg.push(data.imageUrl);
    if (Array.isArray(data.imageUrls)) data.imageUrls.forEach(u => { if (checkFb(u)) fbUrlsInPkg.push(u); });
    if (Array.isArray(data.photos)) data.photos.forEach(u => { if (checkFb(u)) fbUrlsInPkg.push(u); });
    if (Array.isArray(data.placesCovered)) {
      data.placesCovered.forEach(p => {
        const pUrls = Array.isArray(p.imageUrls) ? p.imageUrls : p.imageUrl ? [p.imageUrl] : [];
        pUrls.forEach(u => { if (checkFb(u)) fbUrlsInPkg.push(u); });
      });
    }
    if (Array.isArray(data.itinerary)) {
      data.itinerary.forEach(d => {
        const dUrls = Array.isArray(d.imageUrls) ? d.imageUrls : d.imageUrl ? [d.imageUrl] : [];
        dUrls.forEach(u => { if (checkFb(u)) fbUrlsInPkg.push(u); });
      });
    }

    if (fbUrlsInPkg.length > 0) {
      firebaseStoragePurgedCount++;
      console.log(`  [FIREBASE STORAGE MATCH] ${id} (${title}) -> ${fbUrlsInPkg.length} Firebase storage URLs`);
      if (deleteFirebaseStorage || cleanAll) {
        needsUpdate = true;
        const { updatedPkg } = syncListingPhotos(currentPkg, {
          removedUrls: fbUrlsInPkg,
          purgeRemovedUrlsFromItinerary: true
        });
        currentPkg = updatedPkg;
      }
    }

    // 3. Check for Orphaned Front Thumbnails (placesCovered[0] has photo not in active itinerary)
    if (Array.isArray(currentPkg.placesCovered) && currentPkg.placesCovered.length > 0) {
      const frontPhoto = currentPkg.placesCovered[0]?.imageUrls?.[0];
      if (frontPhoto) {
        const existsInItinerary = Array.isArray(currentPkg.itinerary) && currentPkg.itinerary.some(d => {
          const urls = Array.isArray(d.imageUrls) ? d.imageUrls : d.imageUrl ? [d.imageUrl] : [];
          return urls.some(u => isMatchingUrl(u, frontPhoto));
        });

        if (!existsInItinerary) {
          frontThumbnailsFixedCount++;
          console.log(`  [ORPHANED FRONT THUMBNAIL] ${id} (${title}) -> Front thumbnail was removed from itinerary`);
          if (fixFrontThumbnails || cleanAll) {
            needsUpdate = true;
            const { updatedPkg } = syncListingPhotos(currentPkg, {
              removedUrls: [frontPhoto]
            });
            currentPkg = updatedPkg;
          }
        }
      }
    }

    // Write updates if execute is enabled
    if (needsUpdate && execute) {
      const { firestorePayload } = syncListingPhotos(currentPkg);
      await db.collection('listings').doc(id).update(firestorePayload);
      console.log(`  ✅ [UPDATED IN FIRESTORE] ${id} (${title})`);
    }
  }

  // Also check blogs collection for old Firebase Storage URLs
  if (deleteFirebaseStorage || cleanAll) {
    console.log('\nScanning blogs collection for old Firebase Storage URLs...');
    const blogsSnap = await db.collection('blogs').get();
    let blogsWithFb = 0;
    for (const bDoc of blogsSnap.docs) {
      const bData = bDoc.data();
      const bUrls = [];
      if (bData.imageUrl && bData.imageUrl.includes('firebasestorage.googleapis.com')) bUrls.push('imageUrl');
      if (bData.featuredImage && bData.featuredImage.includes('firebasestorage.googleapis.com')) bUrls.push('featuredImage');
      if (bUrls.length > 0) {
        blogsWithFb++;
        console.log(`  [BLOG FB MATCH] ${bDoc.id} (${bData.title}) -> fields: ${bUrls.join(', ')}`);
        if (execute) {
          const bUpdate = {};
          if (bUrls.includes('imageUrl')) bUpdate.imageUrl = '';
          if (bUrls.includes('featuredImage')) bUpdate.featuredImage = '';
          await db.collection('blogs').doc(bDoc.id).update(bUpdate);
          console.log(`  ✅ [BLOG UPDATED] ${bDoc.id}`);
        }
      }
    }
    console.log(`Blogs with Firebase Storage URLs: ${blogsWithFb}`);
  }

  console.log('\n================================================================');
  console.log('                      CLEANUP SUMMARY');
  console.log('================================================================');
  console.log(`Listings with Kolkata duplicate image: ${kolkataPurgedCount}`);
  console.log(`Listings with Orphaned Front Thumbnails: ${frontThumbnailsFixedCount}`);
  console.log(`Listings with old Firebase Storage URLs: ${firebaseStoragePurgedCount}`);
  if (!execute) {
    console.log('\n⚡ This was a DRY RUN. To apply all these database fixes, run:');
    console.log('   node scripts/clean-database-images.js --clean-all --execute\n');
  } else {
    console.log('\n🎉 ALL FIXES APPLIED SUCCESSFULLY TO FIRESTORE DATABASE!\n');
  }
}

main().catch(console.error);
