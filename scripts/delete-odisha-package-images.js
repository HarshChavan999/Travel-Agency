require('dotenv').config({ path: '.env.local' });
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');

// Cloudflare R2 configuration (optional, if deleting physical files from bucket)
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'tripdm-images';
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || 'https://r2-tripdm.harshsingh.workers.dev';

let r2Client = null;
if (R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY) {
  r2Client = new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });
}

// Locate Firebase / Firestore connection
function initFirebase() {
  const { Firestore } = require('@google-cloud/firestore');
  const { OAuth2Client } = require('google-auth-library');
  const { execSync } = require('child_process');

  // Strategy 1: Use active gcloud access token if available (most reliable locally)
  try {
    const token = execSync('gcloud auth print-access-token', { stdio: ['pipe', 'pipe', 'ignore'] }).toString().trim();
    if (token) {
      const authClient = new OAuth2Client();
      authClient.setCredentials({ access_token: token });
      return new Firestore({
        projectId: process.env.FIREBASE_PROJECT_ID || 'travel-agent-management-29c27',
        authClient: authClient,
      });
    }
  } catch (e) {
    // Fall back to service account files
  }

  // Strategy 2: Use service account file
  const possibleKeyFiles = [
    path.join(__dirname, '../firebase-admin-key.json'),
    path.join(__dirname, '../travel-agent-management-29c27-firebase-adminsdk-fbsvc-77e65102c8.json'),
  ];

  for (const keyPath of possibleKeyFiles) {
    if (fs.existsSync(keyPath)) {
      try {
        const serviceAccount = require(keyPath);
        return new Firestore({
          projectId: serviceAccount.project_id || 'travel-agent-management-29c27',
          keyFilename: keyPath,
        });
      } catch (err) {
        // continue
      }
    }
  }

  // Strategy 3: Default application credentials or env vars
  return new Firestore({
    projectId: process.env.FIREBASE_PROJECT_ID || 'travel-agent-management-29c27',
  });
}

// High-confidence Odisha identifiers
const PRIMARY_ODISHA_NAMES = ['odisha', 'orissa'];
const ODISHA_CITIES = [
  'puri',
  'bhubaneswar',
  'bhubaneshwar',
  'konark',
  'cuttack',
  'chilika',
  'chilikha',
  'gopalpur',
  'rourkela',
  'sambalpur',
  'berhampur',
  'koraput',
  'dhauli',
  'lingaraj temple'
];

function isOdishaPackage(listing) {
  if (!listing) return false;

  const state = String(listing.state || listing.stateName || '').toLowerCase();
  const destination = String(listing.destination || '').toLowerCase();
  const title = String(listing.title || '').toLowerCase();
  const stateNames = Array.isArray(listing.stateNames) 
    ? listing.stateNames.map(s => String(s).toLowerCase()) 
    : [];

  // Check 1: Explicit state / stateNames match
  if (PRIMARY_ODISHA_NAMES.some(name => state.includes(name))) return true;
  if (stateNames.some(s => PRIMARY_ODISHA_NAMES.some(name => s.includes(name)))) return true;

  // Check 2: Destination or Title explicitly contains Odisha / Orissa
  if (PRIMARY_ODISHA_NAMES.some(name => destination.includes(name) || title.includes(name))) return true;

  // Check 3: Check placesCovered for Odisha cities or Odisha state
  if (Array.isArray(listing.placesCovered)) {
    for (const place of listing.placesCovered) {
      const placeName = String(typeof place === 'string' ? place : (place?.name || '')).toLowerCase();
      const placeState = String(place?.state || '').toLowerCase();

      if (PRIMARY_ODISHA_NAMES.some(name => placeState.includes(name))) return true;
      if (ODISHA_CITIES.some(city => {
        const regex = new RegExp(`\\b${city}\\b`, 'i');
        return regex.test(placeName);
      })) {
        // If stateNames is given and completely different without Odisha, ensure it's not a namesake
        return true;
      }
    }
  }

  // Check 4: Check itinerary days specifically for key Odisha cities
  if (Array.isArray(listing.itinerary)) {
    for (const day of listing.itinerary) {
      const dayTitle = String(day?.title || day?.placeName || '').toLowerCase();
      if (ODISHA_CITIES.some(city => new RegExp(`\\b${city}\\b`, 'i').test(dayTitle))) {
        // Must also not be explicitly constrained to other states without Odisha
        if (stateNames.length === 0 || stateNames.some(s => PRIMARY_ODISHA_NAMES.some(name => s.includes(name)))) {
          return true;
        }
      }
    }
  }

  return false;
}

// Extract R2 Key from URL
function getR2KeyFromUrl(url) {
  if (!url || typeof url !== 'string') return null;
  try {
    if (url.includes('r2.cloudflarestorage.com') || url.includes(R2_PUBLIC_URL.replace(/^https?:\/\//, ''))) {
      const parsed = new URL(url);
      return parsed.pathname.replace(/^\/+/, '');
    }
  } catch (e) {
    // ignore
  }
  return null;
}

async function deleteFromR2(key) {
  if (!r2Client || !key) return;
  try {
    await r2Client.send(new DeleteObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    }));
  } catch (err) {
    console.error(`⚠️ Failed to delete R2 object: ${key}`, err.message);
  }
}

function getPackageDisplayName(data, id) {
  if (data.title) return data.title;
  if (Array.isArray(data.stateNames) && data.stateNames.length > 0) {
    return `${data.stateNames.join(', ')} Tour`;
  }
  if (Array.isArray(data.placesCovered) && data.placesCovered.length > 0) {
    const places = data.placesCovered.map(p => typeof p === 'string' ? p : (p.name || '')).filter(Boolean);
    if (places.length > 0) return places.slice(0, 4).join(' → ');
  }
  if (data.destination) return `${data.destination} Package`;
  return `Package ${id}`;
}

async function main() {
  const args = process.argv.slice(2);
  const execute = args.includes('--execute');
  const dryRun = args.includes('--dry-run') || !execute;
  const deleteR2Files = args.includes('--delete-r2');

  console.log('================================================================');
  console.log('  TripDM: Delete All Images in Odisha Packages');
  console.log('================================================================');
  console.log(`Mode:           ${execute ? '🚀 EXECUTE (Applying changes)' : '🔍 DRY RUN (Simulated, no changes will be made)'}`);
  console.log(`Delete from R2: ${deleteR2Files ? 'Yes' : 'No (Only clearing Firestore records)'}`);
  console.log('----------------------------------------------------------------\n');

  const db = initFirebase();

  console.log('📦 Fetching packages from Firestore "listings" collection...');
  const snapshot = await db.collection('listings').get();
  console.log(`Found ${snapshot.size} total listings in database.\n`);

  let matchedPackages = 0;
  let totalImagesCleared = 0;
  const r2KeysToDelete = new Set();

  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (!isOdishaPackage(data)) continue;

    matchedPackages++;
    const listingId = doc.id;
    const title = getPackageDisplayName(data, listingId);
    const states = Array.isArray(data.stateNames) ? data.stateNames.join(', ') : (data.state || data.stateName || 'N/A');
    const destination = data.destination || states;

    console.log(`📍 [${matchedPackages}] Matching Package: "${title}"`);
    console.log(`   ID:          ${listingId}`);
    console.log(`   Destination: ${destination}`);

    let listingImageCount = 0;
    const removedUrls = [];

    // 1. Photos array
    let updatedPhotos = [];
    if (Array.isArray(data.photos) && data.photos.length > 0) {
      listingImageCount += data.photos.length;
      data.photos.forEach(u => removedUrls.push(u));
      updatedPhotos = [];
    }

    // 2. PlacesCovered array
    let updatedPlacesCovered = [];
    if (Array.isArray(data.placesCovered)) {
      updatedPlacesCovered = data.placesCovered.map(place => {
        const placeCopy = { ...place };
        if (Array.isArray(placeCopy.imageUrls) && placeCopy.imageUrls.length > 0) {
          listingImageCount += placeCopy.imageUrls.length;
          placeCopy.imageUrls.forEach(u => removedUrls.push(u));
          placeCopy.imageUrls = [];
        }
        if (placeCopy.imageUrl) {
          listingImageCount += 1;
          removedUrls.push(placeCopy.imageUrl);
          placeCopy.imageUrl = '';
        }
        if (Array.isArray(placeCopy.photos) && placeCopy.photos.length > 0) {
          listingImageCount += placeCopy.photos.length;
          placeCopy.photos.forEach(u => removedUrls.push(u));
          placeCopy.photos = [];
        }
        delete placeCopy.imageAttribution;
        return placeCopy;
      });
    }

    // 3. Itinerary array
    let updatedItinerary = [];
    if (Array.isArray(data.itinerary)) {
      updatedItinerary = data.itinerary.map(day => {
        const dayCopy = { ...day };
        if (dayCopy.imageUrl) {
          listingImageCount += 1;
          removedUrls.push(dayCopy.imageUrl);
          dayCopy.imageUrl = '';
        }
        if (Array.isArray(dayCopy.imageUrls) && dayCopy.imageUrls.length > 0) {
          listingImageCount += dayCopy.imageUrls.length;
          dayCopy.imageUrls.forEach(u => removedUrls.push(u));
          dayCopy.imageUrls = [];
        }
        delete dayCopy.imageAttribution;
        return dayCopy;
      });
    }

    // 4. Other top-level image fields
    const extraFieldsToClear = {};
    const singleImageFields = ['imageUrl', 'coverImage', 'thumbnail', 'banner', 'heroImage', 'mainImage'];
    for (const field of singleImageFields) {
      if (data[field]) {
        listingImageCount += 1;
        removedUrls.push(data[field]);
        extraFieldsToClear[field] = '';
      }
    }
    if (Array.isArray(data.imageUrls) && data.imageUrls.length > 0) {
      listingImageCount += data.imageUrls.length;
      data.imageUrls.forEach(u => removedUrls.push(u));
      extraFieldsToClear.imageUrls = [];
    }

    console.log(`   Images found to clear: ${listingImageCount}`);

    // Track R2 keys
    removedUrls.forEach(url => {
      const key = getR2KeyFromUrl(url);
      if (key) r2KeysToDelete.add(key);
    });

    totalImagesCleared += listingImageCount;

    if (execute) {
      const updatePayload = {
        photos: updatedPhotos,
        placesCovered: updatedPlacesCovered,
        itinerary: updatedItinerary,
        ...extraFieldsToClear,
        updatedAt: new Date(),
      };

      await db.collection('listings').doc(listingId).update(updatePayload);
      console.log(`   ✅ Successfully cleared images in Firestore for listing ${listingId}`);
    } else {
      console.log(`   [DRY RUN] Would remove ${listingImageCount} images from this package`);
    }
    console.log('');
  }

  // Delete from R2 if requested
  if (execute && deleteR2Files && r2KeysToDelete.size > 0) {
    if (r2Client) {
      console.log(`🗑️ Deleting ${r2KeysToDelete.size} image files from Cloudflare R2 bucket "${R2_BUCKET_NAME}"...`);
      for (const key of r2KeysToDelete) {
        await deleteFromR2(key);
      }
      console.log('✅ Finished R2 bucket cleanup.');
    } else {
      console.log('⚠️ R2 credentials not found in environment. Skipped physical deletion from R2 bucket.');
    }
  }

  console.log('----------------------------------------------------------------');
  console.log('SUMMARY:');
  console.log(`  • Odisha packages identified: ${matchedPackages}`);
  console.log(`  • Total image references cleared: ${totalImagesCleared}`);
  if (deleteR2Files) {
    console.log(`  • Unique R2 files to delete: ${r2KeysToDelete.size}`);
  }
  console.log('----------------------------------------------------------------');

  if (dryRun) {
    console.log('\n💡 This was a DRY RUN. To execute changes on Firestore, run:');
    console.log('   node scripts/delete-odisha-package-images.js --execute');
    console.log('   (Add --delete-r2 to also delete corresponding image files from Cloudflare R2)');
  } else {
    console.log('\n🎉 Execution completed successfully!');
  }
}

main().catch(err => {
  console.error('\n❌ Fatal error running script:', err);
  process.exit(1);
});
