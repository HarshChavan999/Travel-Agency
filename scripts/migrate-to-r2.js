require('dotenv').config({ path: '.env.local' });
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const admin = require('firebase-admin');
const https = require('https');

// Configuration
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'tripdm-images';
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || 'https://r2-tripdm.harshsingh.workers.dev';

const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID || '',
    secretAccessKey: R2_SECRET_ACCESS_KEY || '',
  },
});

// Firebase Storage URL pattern
const FIREBASE_STORAGE_REGEX = /firebasestorage\.googleapis\.com/;

let stats = { scanned: 0, migrated: 0, skipped: 0, failed: 0 };

async function downloadFile(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', reject);
  });
}

async function uploadToR2(buffer, key, contentType) {
  await r2Client.send(new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType || 'image/jpeg',
    CacheControl: 'public, max-age=31536000, immutable',
  }));
  return `${R2_PUBLIC_URL}/${key}`;
}

async function migrateUrl(firebaseUrl, category, userId, subfolder) {
  if (!FIREBASE_STORAGE_REGEX.test(firebaseUrl)) return null;
  
  const ext = firebaseUrl.split('?')[0].split('.').pop() || 'jpg';
  const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
  const key = subfolder 
    ? `${category}/${userId}/${subfolder}/${uniqueName}`
    : `${category}/${userId}/${uniqueName}`;
  
  const buffer = await downloadFile(firebaseUrl);
  return uploadToR2(buffer, key, `image/${ext}`);
}

async function migrateListings(execute = false) {
  const listingsSnap = await admin.firestore().collection('listings').get();
  
  for (const doc of listingsSnap.docs) {
    stats.scanned++;
    const data = doc.data();
    const agencyId = data.agencyId || 'unknown';
    const listingId = doc.id;
    let needsUpdate = false;
    const updateData = {};
    
    // Migrate photos[] array
    if (data.photos?.length) {
      const newPhotos = [];
      for (const url of data.photos) {
        if (FIREBASE_STORAGE_REGEX.test(url)) {
          needsUpdate = true;
          if (execute) {
            try {
              const newUrl = await migrateUrl(url, 'listings', agencyId, `${listingId}/photos`);
              newPhotos.push(newUrl);
              stats.migrated++;
            } catch (err) {
              console.error(`Failed to migrate photo ${url} in listing ${listingId}:`, err);
              newPhotos.push(url);
              stats.failed++;
            }
          }
        } else {
          newPhotos.push(url);
        }
      }
      if (execute) updateData.photos = newPhotos;
    }
    
    // Migrate placesCovered[].imageUrls[]
    if (data.placesCovered?.length) {
      const newPlaces = [...data.placesCovered];
      for (let i = 0; i < newPlaces.length; i++) {
        const place = newPlaces[i];
        if (place.imageUrls?.length) {
          const newUrls = [];
          for (const url of place.imageUrls) {
            if (FIREBASE_STORAGE_REGEX.test(url)) {
              needsUpdate = true;
              if (execute) {
                try {
                  const newUrl = await migrateUrl(url, 'listings', agencyId, `${listingId}/${place.id || i}`);
                  newUrls.push(newUrl);
                  stats.migrated++;
                } catch (err) {
                  console.error(`Failed to migrate place image ${url} in listing ${listingId}:`, err);
                  newUrls.push(url);
                  stats.failed++;
                }
              }
            } else {
              newUrls.push(url);
            }
          }
          if (execute) newPlaces[i] = { ...place, imageUrls: newUrls };
        }
      }
      if (execute) updateData.placesCovered = newPlaces;
    }
    
    if (needsUpdate && execute) {
      await admin.firestore().doc(`listings/${listingId}`).update(updateData);
    }
    
    if (!execute && needsUpdate) {
      console.log(`  [DRY RUN] Would migrate listing: ${listingId}`);
    }
  }
}

async function migrateUsers(execute = false) {
  const usersSnap = await admin.firestore().collection('users').get();
  
  for (const doc of usersSnap.docs) {
    const data = doc.data();
    const userId = doc.id;
    const fieldsToCheck = [
      { field: 'avatarUrl', category: 'avatars' },
      { field: 'logoUrl', category: 'logos' },
      { field: 'agencyLogo', category: 'logos' },
      { field: 'proofUrl', category: 'proofs' },
    ];
    
    const updateData = {};
    let needsUpdate = false;
    
    for (const { field, category } of fieldsToCheck) {
      const url = data[field];
      if (url && FIREBASE_STORAGE_REGEX.test(url)) {
        needsUpdate = true;
        if (execute) {
          try {
            const newUrl = await migrateUrl(url, category, userId);
            updateData[field] = newUrl;
            stats.migrated++;
          } catch (err) {
            console.error(`Failed to migrate user ${userId} ${field}:`, err);
            stats.failed++;
          }
        } else {
          console.log(`  [DRY RUN] Would migrate user ${userId} ${field}`);
        }
      }
    }
    
    if (needsUpdate && execute) {
      await admin.firestore().doc(`users/${userId}`).update(updateData);
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const execute = args.includes('--execute');
  const verify = args.includes('--verify');
  
  if (!dryRun && !execute && !verify) {
    console.log('Usage: node scripts/migrate-to-r2.js [--dry-run | --execute | --verify]');
    console.log('  --dry-run   Scan and report what would be migrated (no changes)');
    console.log('  --execute   Perform the migration');
    console.log('  --verify    Check that all URLs in Firestore are now R2 URLs');
    process.exit(1);
  }
  
  // Initialize Firebase Admin
  const serviceAccount = require('../firebase-admin-key.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  
  if (dryRun) {
    console.log('🔍 DRY RUN — No changes will be made');
    console.log('\n📋 Scanning listings...');
    await migrateListings(false);
    console.log('\n📋 Scanning users...');
    await migrateUsers(false);
    console.log(`\n📊 Summary: ${stats.scanned} items scanned, ${stats.migrated} would be migrated`);
  }
  
  if (execute) {
    console.log('🚀 EXECUTING MIGRATION...');
    console.log('\n📋 Migrating listings...');
    await migrateListings(true);
    console.log('\n📋 Migrating users...');
    await migrateUsers(true);
    console.log(`\n📊 Summary: ${stats.scanned} scanned, ${stats.migrated} migrated, ${stats.failed} failed, ${stats.skipped} skipped`);
  }
  
  if (verify) {
    console.log('✅ VERIFYING migration...');
    let remainingFirebaseUrls = 0;
    
    const listingsSnap = await admin.firestore().collection('listings').get();
    for (const doc of listingsSnap.docs) {
      const data = doc.data();
      if (data.photos?.some(u => FIREBASE_STORAGE_REGEX.test(u))) remainingFirebaseUrls++;
      if (data.placesCovered?.some(p => p.imageUrls?.some(u => FIREBASE_STORAGE_REGEX.test(u)))) remainingFirebaseUrls++;
    }
    
    const usersSnap = await admin.firestore().collection('users').get();
    for (const doc of usersSnap.docs) {
      const data = doc.data();
      if (data.avatarUrl && FIREBASE_STORAGE_REGEX.test(data.avatarUrl)) remainingFirebaseUrls++;
      if (data.logoUrl && FIREBASE_STORAGE_REGEX.test(data.logoUrl)) remainingFirebaseUrls++;
      if (data.proofUrl && FIREBASE_STORAGE_REGEX.test(data.proofUrl)) remainingFirebaseUrls++;
    }
    
    if (remainingFirebaseUrls === 0) {
      console.log('✅ All images migrated successfully. No Firebase Storage URLs remain in Firestore.');
    } else {
      console.log(`⚠️ ${remainingFirebaseUrls} documents still contain Firebase Storage URLs. Re-run with --execute.`);
    }
  }
}

main().catch(console.error);
