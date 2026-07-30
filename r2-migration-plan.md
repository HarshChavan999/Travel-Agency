# Cloudflare R2 Image Storage & CDN Migration Plan — WebApp Only

## Migration Overview: Firebase Storage → Cloudflare R2 (Travel-Agency-WebApp)

### Why Cloudflare R2?
- **Zero egress fees** — No charge for serving images (vs Firebase Storage egress costs)
- **Built-in CDN** — Cloudflare's global edge network for fast image delivery worldwide
- **S3-compatible API** — Use any S3 SDK for uploads (easy integration with Next.js)
- **Free Tier** — 10 GB storage, 10 million read operations/month — more than sufficient for this travel agency use case
- **No vendor lock-in** — Standard S3 API means you can switch providers anytime

### Current Firebase Storage Footprint in WebApp

| Usage | File | Storage Path Pattern |
|-------|------|---------------------|
| **Listing Images** | `src/components/AgencyListingForm.tsx` | `listings/{agencyId}/{timestamp}_{idx}_{filename}` |
| **User Identity Proofs** | `src/contexts/AuthContext.tsx` | `proofs/{userId}/{filename}` |
| **Agency Logos** | `src/contexts/AuthContext.tsx` | `logos/{userId}/{filename}` |
| **User Avatars** | `src/contexts/AuthContext.tsx` | `avatars/{userId}/{filename}` |

### Firebase Storage API Calls — Exact Code to Replace

#### 1. `src/lib/firebase.ts` (lines 5, 11, 61-69, 75)
```typescript
// Imports to remove:
import { getStorage, type FirebaseStorage } from 'firebase/storage';
let _storage: FirebaseStorage | null = null;
export const getStorageInstance = (): FirebaseStorage | null => { ... };
export const storage = getStorageInstance();
```

#### 2. `src/contexts/AuthContext.tsx` — Registration file upload (lines 6, 382-388)
```typescript
// Imports to remove:
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getStorageInstance } from '@/lib/firebase';

// Code to replace (lines 382-388 in register function):
if (file) {
  const storageInstance = getStorageInstance();
  if (storageInstance) {
    const storageRef = ref(storageInstance, `proofs/${user.uid}/${file.name}`);
    await uploadBytes(storageRef, file);
    proofUrl = await getDownloadURL(storageRef);
  }
}
```

#### 3. `src/components/AgencyListingForm.tsx` — Listing image uploads (lines 11, 240-287)
```typescript
// Imports to remove:
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getStorageInstance } from '@/lib/firebase';

// Entire uploadImages function to replace (lines 240-287):
const uploadImages = async (places: Place[]): Promise<Place[]> => {
  const storageInstance = getStorageInstance();
  if (!storageInstance) throw new Error('Storage instance not available');
  
  for each place, for each image:
    const storageRef = ref(storageInstance, `listings/${agencyId}/...`);
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
```

---

## Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                       Cloudflare R2                            │
│  ┌─────────────────────┐     ┌──────────────────────────┐     │
│  │ R2 Bucket           │────▶│ Cloudflare CDN Edge      │     │
│  │ tripdm-images       │     │ (200+ global locations)  │     │
│  └──────────┬──────────┘     └──────────────────────────┘     │
│             │                                                  │
│  ┌──────────┴─────────────────────────────────────────┐       │
│  │ R2 Public URL (via Worker or public bucket)        │       │
│  │ https://r2-tripdm.harshsingh.workers.dev/{path}     │       │
│  └────────────────────────────────────────────────────┘       │
└────────────────────────────────────────────────────────────────┘
            │
            │ HTTPS (Public URLs)
            ▼
┌───────────────────────────────────────────────────────┐
│                   Next.js WebApp                       │
│                                                        │
│  Agency Listing Form (upload)                          │
│  ┌─────────────────────────────────────────────────┐  │
│  │ Upload flow: File → S3 SDK (PutObjectCommand)   │  │
│  │              → R2 Bucket → Return public URL    │  │
│  │              → Store URL in Firestore document   │  │
│  └─────────────────────────────────────────────────┘  │
│                                                        │
│  Auth Context (registration upload)                    │
│  ┌─────────────────────────────────────────────────┐  │
│  │ Upload flow: File → S3 SDK (PutObjectCommand)   │  │
│  │              → R2 Bucket → Return public URL    │  │
│  │              → Store URL in Firestore document   │  │
│  └─────────────────────────────────────────────────┘  │
│                                                        │
│  Image Display (read)                                  │
│  ┌─────────────────────────────────────────────────┐  │
│  │ No changes needed — reads URL from Firestore    │  │
│  │ <img src={r2Url} /> works as-is                 │  │
│  └─────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────┘
            │
            │ Firestore (stores image metadata/URLs)
            ▼
┌───────────────────────────────────────────────────────┐
│  Firestore                                             │
│  - listings/{id}/photos[] = [r2Url, ...]              │
│  - listings/{id}/placesCovered[].imageUrls[] = [urls] │
│  - users/{id}/proofUrl = r2Url                        │
│  - users/{id}/logoUrl = r2Url                         │
└───────────────────────────────────────────────────────┘
```

### Data Flow: Image Upload

```
User selects images in AgencyListingForm / AuthContext registration
        │
        ▼
Component calls uploadToR2(file, category, userId, subfolder)
        │
        ▼
@aws-sdk/client-s3 — PutObjectCommand
        │
        ├── Endpoint: https://{account-id}.r2.cloudflarestorage.com
        ├── Bucket: tripdm-images
        ├── Key: listings/{agencyId}/{listingId}/{uuid}-{filename}
        ├── Content-Type: image/jpeg
        └── Cache-Control: public, max-age=31536000, immutable
        │
        ▼
R2 returns success
        │
        ▼
Return public URL: https://r2-tripdm.harshsingh.workers.dev/{key}
        │
        ▼
Store URL in Firestore document
```

### Data Flow: Image Delivery

```
Browser requests: https://r2-tripdm.harshsingh.workers.dev/listings/.../image.jpg
        │
        ▼
Cloudflare Worker (or R2 public bucket)
        │
        ├── Cache HIT → Return cached image (CDN edge, ~30ms)
        │
        └── Cache MISS → Fetch from R2 origin
                → Cache at edge for subsequent requests
                → Return image with Cache-Control: public, max-age=31536000
```

---

## R2 Bucket Folder Structure

```
tripdm-images/
├── listings/
│   └── {agencyId}/
│       └── {listingId}/
│           └── {placeId}/
│               ├── {uuid}-image-0.jpg
│               ├── {uuid}-image-1.jpg
│               └── ...
├── proofs/
│   └── {userId}/
│       └── {uuid}-proof.jpg
├── logos/
│   └── {userId}/
│       └── {uuid}-logo.png
└── avatars/
    └── {userId}/
        └── {uuid}-avatar.jpg
```

**Key naming change from Firebase Storage**: Using UUIDs (`{uuid}-{filename}`) instead of raw filenames to prevent:
- Cache collisions (since UUIDs are unique per upload)
- Filename conflicts between users
- Security through obscurity

---

## Implementation Steps

### Step 1: Cloudflare R2 Infrastructure Setup

#### 1.1 Create R2 Bucket
```bash
npm install -g wrangler
wrangler login
wrangler r2 bucket create tripdm-images
```

#### 1.2 Generate R2 API Token
In Cloudflare Dashboard → R2 → Manage R2 API Tokens → Create API Token with "Object Read & Write" permission.
Save: `ACCESS_KEY_ID`, `SECRET_ACCESS_KEY`, and your Cloudflare `ACCOUNT_ID`.

#### 1.3 Create Cloudflare Worker (Optional — Recommended for CDN + caching)
**Directory**: `workers/r2-image-worker/` (new, alongside Travel-Agency-WebApp/)

```
workers/r2-image-worker/
├── package.json
├── tsconfig.json
├── wrangler.toml
└── src/
    └── index.ts
```

```bash
mkdir -p workers/r2-image-worker/src
cd workers/r2-image-worker
npm init -y
npm install @cloudflare/workers-types
```

**`wrangler.toml`**:
```toml
name = "r2-image-worker"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[[r2_buckets]]
binding = "TRIPDM_IMAGES"
bucket_name = "tripdm-images"
```

**`src/index.ts`**:
```typescript
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname.slice(1); // Remove leading /
    
    if (!path) return new Response('Not Found', { status: 404 });
    
    // Check Cloudflare cache
    const cacheKey = new Request(url.toString(), request);
    const cache = caches.default;
    let response = await cache.match(cacheKey);
    if (response) return response;
    
    // Fetch from R2
    const object = await env.TRIPDM_IMAGES.get(path);
    if (object === null) {
      return new Response('Not Found', { status: 404 });
    }
    
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    headers.set('Access-Control-Allow-Origin', '*');
    
    response = new Response(object.body, { headers });
    ctx.waitUntil(cache.put(cacheKey, response.clone()));
    return response;
  }
};
```

```bash
wrangler deploy
# Route: r2-tripdm.harshsingh.workers.dev/*
```

### Step 2: Install AWS SDK for S3 in WebApp

```bash
cd Travel-Agency-WebApp
npm install @aws-sdk/client-s3
```

No need for `@aws-sdk/s3-request-presigner` — we're uploading directly from the server-side code (Next.js API route and/or server actions).

### Step 3: Create R2 Configuration

**New File**: `Travel-Agency-WebApp/src/lib/r2-config.ts`:
```typescript
import { S3Client } from '@aws-sdk/client-s3';

const requiredVars = [
  'R2_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID', 
  'R2_SECRET_ACCESS_KEY'
] as const;

for (const varName of requiredVars) {
  if (!process.env[varName]) {
    console.warn(`⚠️ Missing environment variable: ${varName}`);
  }
}

export const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || '';
export const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || '';
export const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || '';
export const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'tripdm-images';
export const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || 'https://r2-tripdm.harshsingh.workers.dev';

export const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});
```

### Step 4: Create Upload Utility

**New File**: `Travel-Agency-WebApp/src/lib/r2-upload.ts`:
```typescript
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { r2Client, R2_BUCKET_NAME, R2_PUBLIC_URL } from './r2-config';

export type ImageCategory = 'listings' | 'proofs' | 'logos' | 'avatars';

/**
 * Generate a unique filename to prevent collisions and enable immutable caching
 */
function generateUniqueFilename(originalName: string): string {
  const ext = originalName.split('.').pop() || 'jpg';
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${random}.${ext}`;
}

/**
 * Upload a file to Cloudflare R2 and return its public URL.
 * S3 credentials stay server-side — this must be called from an API route or server action.
 */
export async function uploadToR2(
  file: File | Blob,
  category: ImageCategory,
  userId: string,
  subfolder?: string
): Promise<string> {
  const filename = file instanceof File ? file.name : 'upload.jpg';
  const uniqueName = generateUniqueFilename(filename);
  
  const key = subfolder
    ? `${category}/${userId}/${subfolder}/${uniqueName}`
    : `${category}/${userId}/${uniqueName}`;
  
  const buffer = await file.arrayBuffer();
  
  await r2Client.send(new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: new Uint8Array(buffer),
    ContentType: file.type || `image/${uniqueName.split('.').pop()}`,
    CacheControl: category === 'listings'
      ? 'public, max-age=31536000, immutable'
      : 'public, max-age=3600',
  }));
  
  return `${R2_PUBLIC_URL}/${key}`;
}

/**
 * Upload multiple files in parallel (for listing places with multiple images)
 */
export async function uploadMultipleToR2(
  files: File[],
  category: ImageCategory,
  userId: string,
  subfolder?: string
): Promise<string[]> {
  const uploads = files.map(file => uploadToR2(file, category, userId, subfolder));
  return Promise.all(uploads);
}
```

### Step 5: Create Next.js API Route for Uploads

Since S3 credentials are server-side environment variables, all uploads must go through a Next.js API route (or server action).

**New File**: `Travel-Agency-WebApp/src/app/api/upload/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { uploadToR2 } from '@/lib/r2-upload';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const category = formData.get('category') as string;
    const userId = formData.get('userId') as string;
    const subfolder = formData.get('subfolder') as string | undefined;
    
    if (!file || !category || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: file, category, userId' },
        { status: 400 }
      );
    }
    
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: `Unsupported file type: ${file.type}. Allowed: JPEG, PNG, WebP, GIF, PDF` },
        { status: 400 }
      );
    }
    
    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File too large. Maximum allowed size is 10MB.' },
        { status: 400 }
      );
    }
    
    const url = await uploadToR2(file, category as any, userId, subfolder);
    
    return NextResponse.json({ url, success: true });
  } catch (error: any) {
    console.error('R2 upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Upload failed. Please try again.' },
      { status: 500 }
    );
  }
}
```

### Step 6: Update WebApp Components

#### 6.1 Update `src/lib/firebase.ts` — Remove Storage
```typescript
// REMOVE these imports and exports:
// import { getStorage, type FirebaseStorage } from 'firebase/storage';
// let _storage: FirebaseStorage | null = null;
// export const getStorageInstance = (): FirebaseStorage | null => { ... };
// export const storage = getStorageInstance();
```

#### 6.2 Update `src/contexts/AuthContext.tsx` — Replace file upload in register()

**BEFORE** (lines 6, 382-388):
```typescript
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getStorageInstance } from '@/lib/firebase';
// ...
if (file) {
  const storageInstance = getStorageInstance();
  if (storageInstance) {
    const storageRef = ref(storageInstance, `proofs/${user.uid}/${file.name}`);
    await uploadBytes(storageRef, file);
    proofUrl = await getDownloadURL(storageRef);
  }
}
```

**AFTER**:
```typescript
// Remove: import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
// Remove: import { getStorageInstance } from '@/lib/firebase';
// 
// Add a helper function:
async function uploadFileViaApi(file: File, userId: string, category: string): Promise<string | null> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('category', category);
  formData.append('userId', userId);
  
  const response = await fetch('/api/upload', { method: 'POST', body: formData });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Upload failed');
  }
  const data = await response.json();
  return data.url;
}

// Replace the upload block in register():
if (file) {
  proofUrl = await uploadFileViaApi(file, user.uid, 'proofs');
}
```

Also check if there are similar uploads for logos/avatars elsewhere in AuthContext — if found, apply the same pattern.

#### 6.3 Update `src/components/AgencyListingForm.tsx` — Replace image upload

**BEFORE** (lines 11, 240-287):
```typescript
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';  // ← Remove
// ...
const uploadImages = async (places: Place[]): Promise<Place[]> => {
  const storageInstance = getStorageInstance();
  if (!storageInstance) { throw new Error('Storage instance not available'); }
  // ... loops over places, uploads each image via uploadBytes/getDownloadURL
};
```

**AFTER**:
```typescript
// Remove the import of { ref, uploadBytes, getDownloadURL }
// Remove the import of { getStorageInstance } from '@/lib/firebase'

// Add a helper to upload via API:
async function uploadListingImage(file: File, agencyId: string, listingId: string, placeId: string): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('category', 'listings');
  formData.append('userId', agencyId);
  formData.append('subfolder', `${listingId}/${placeId}`);
  
  const response = await fetch('/api/upload', { method: 'POST', body: formData });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Upload failed');
  }
  const data = await response.json();
  return data.url;
}

// Replace the uploadImages function:
const uploadImages = async (places: Place[], listingId: string): Promise<Place[]> => {
  const updatedPlaces = [...places];
  const cacheBuster = Date.now(); // temporary ID until Firestore generates the real ID

  for (let placeIndex = 0; placeIndex < places.length; placeIndex++) {
    const place = places[placeIndex];
    if (place.images.length === 0) continue;

    const imageUrls: string[] = [];
    for (const file of place.images) {
      const url = await uploadListingImage(file, agencyId, `${cacheBuster}`, place.id);
      imageUrls.push(url);
      
      // Update progress
      const totalProgress = Math.round(
        ((placeIndex * 100) + ((imageUrls.length / place.images.length) * 100)) / places.length
      );
      setUploadProgress(prev => ({
        ...prev,
        [`${place.name}-${file.name}`]: totalProgress
      }));
    }
    
    updatedPlaces[placeIndex] = {
      ...place,
      imageUrls,
      images: []
    };
  }
  return updatedPlaces;
};

// Update the call site in onSubmit() — generate a temporary listing ID:
const tempListingId = Date.now().toString();
const placesWithImages = await uploadImages(placesCovered, tempListingId);
```

### Step 7: Add Environment Variables

**Add to `Travel-Agency-WebApp/.env.local`** (or equivalent deployment env):
```env
R2_ACCOUNT_ID=your-cloudflare-account-id
R2_ACCESS_KEY_ID=your-r2-access-key-id
R2_SECRET_ACCESS_KEY=your-r2-secret-access-key
R2_BUCKET_NAME=tripdm-images
R2_PUBLIC_URL=https://r2-tripdm.harshsingh.workers.dev
```

### Step 8: Update `next.config.ts`

```typescript
const nextConfig: NextConfig = {
  env: {
    // Keep existing Firebase env vars...
    NEXT_PUBLIC_FIREBASE_API_KEY: '...',
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: '...',
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: '...',
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: '...',
    NEXT_PUBLIC_FIREBASE_APP_ID: '...',
    NEXT_PUBLIC_ADMIN_EMAILS: '...',
    
    // REMOVE this line:
    // NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: '...',
  },
  serverExternalPackages: ['firebase-admin'],
  trailingSlash: true,
  images: {
    unoptimized: true
  }
};
```

### Step 9: Delete Firebase Storage Rules File

```bash
rm Travel-Agency-WebApp/storage.rules
```

### Step 10: Migration Script for Existing Images

**New File**: `Travel-Agency-WebApp/scripts/migrate-to-r2.js`:
```javascript
// This script migrates existing images from Firebase Storage to Cloudflare R2.
// Run: node scripts/migrate-to-r2.js [--dry-run | --execute | --verify]
//
// Process:
// 1. Reads all listings from Firestore
// 2. For each listing, extracts all image URLs from photos[] and placesCovered[].imageUrls[]
// 3. Filters URLs that are Firebase Storage URLs (firebasestorage.googleapis.com)
// 4. Downloads each image from Firebase Storage
// 5. Uploads to R2 bucket
// 6. Updates Firestore document with new R2 URLs
// 7. Also migrates user avatarUrl, logoUrl, proofUrl fields

const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const admin = require('firebase-admin');
const https = require('https');
const { URL } = require('url');

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
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

// Firebase Storage URL pattern
const FIREBASE_STORAGE_REGEX = /firebasestorage\.googleapis\.com/;

// Counters
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
  if (!FIREBASE_STORAGE_REGEX.test(firebaseUrl)) return null; // Not a Firebase URL
  
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
            const newUrl = await migrateUrl(url, 'listings', agencyId, `${listingId}/photos`);
            newPhotos.push(newUrl);
            stats.migrated++;
          }
        } else {
          newPhotos.push(url); // Already an R2/external URL
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
                const newUrl = await migrateUrl(url, 'listings', agencyId, `${listingId}/${place.id}`);
                newUrls.push(newUrl);
                stats.migrated++;
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
          const newUrl = await migrateUrl(url, category, userId);
          updateData[field] = newUrl;
          stats.migrated++;
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
    // Check that no Firebase Storage URLs remain in Firestore
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
```

---

## File Change Summary (WebApp Only)

### Files to Create (NEW)

| File | Purpose |
|------|---------|
| `src/lib/r2-config.ts` | R2 S3 client configuration (uses server-side env vars) |
| `src/lib/r2-upload.ts` | Upload utility functions (`uploadToR2`, `uploadMultipleToR2`) |
| `src/app/api/upload/route.ts` | Next.js API route — receives file via FormData, uploads to R2, returns public URL |
| `scripts/migrate-to-r2.js` | Node.js script to migrate existing images from Firebase Storage to R2 |
| `../../workers/r2-image-worker/src/index.ts` | Cloudflare Worker for CDN image serving |
| `../../workers/r2-image-worker/wrangler.toml` | Worker configuration with R2 bucket binding |
| `../../workers/r2-image-worker/package.json` | Worker dependencies |

### Files to Modify

| File | Changes |
|------|---------|
| `src/lib/firebase.ts` | Remove `getStorage`, `getStorageInstance`, `storage`, and the `FirebaseStorage` import |
| `src/contexts/AuthContext.tsx` | Remove Firebase Storage imports; replace `uploadBytes`+`getDownloadURL` block with `fetch('/api/upload')` call |
| `src/components/AgencyListingForm.tsx` | Remove Firebase Storage imports; rewrite `uploadImages()` to call `/api/upload`; add `listingId` param to `uploadImages` |
| `next.config.ts` | Remove `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` from env |
| `.env.local` | Add 5 R2 environment variables |

### Files to Delete

| File | Reason |
|------|--------|
| `storage.rules` | Firebase Storage security rules — no longer needed |

### Files NOT to Change

| File | Reason |
|------|--------|
| `src/components/BulkUploadForm.tsx` | CSV import doesn't upload files to Firebase Storage — it stores image URLs directly in Firestore (no `uploadBytes` calls) |
| `src/components/PackageDetailView.tsx` | Reads URLs from Firestore — works automatically with new R2 URLs |
| `src/components/ListingCard.tsx` | Reads URLs from Firestore — works automatically |
| `src/app/page.tsx` | Reads listing data — no storage dependency |
| `src/lib/database.ts` | Firestore only — no storage dependency |
| `functions/src/index.ts` | Cloud Functions don't use Firebase Storage |
| Any `package.json` | Only new dependency: `@aws-sdk/client-s3` |
| Any `docker-compose.yml`/`Dockerfile` | No changes needed |

---

## Environment Variables

### Add (server-side — Next.js + Cloudflare Worker)
```env
# Cloudflare R2 (server-side only, never exposed to client)
R2_ACCOUNT_ID=your-cloudflare-account-id
R2_ACCESS_KEY_ID=your-r2-access-key-id
R2_SECRET_ACCESS_KEY=your-r2-secret-access-key
R2_BUCKET_NAME=tripdm-images
R2_PUBLIC_URL=https://r2-tripdm.harshsingh.workers.dev
```

### Remove
```env
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET  # No longer needed
```

### GitHub Actions Secrets to Add (for CI/CD deployment)
```bash
gh secret set R2_ACCOUNT_ID --body "your-account-id"
gh secret set R2_ACCESS_KEY_ID --body "your-key-id"
gh secret set R2_SECRET_ACCESS_KEY --body "your-secret-key"
```

---

## New Dependencies

```json
{
  "dependencies": {
    "@aws-sdk/client-s3": "^3.600.0"
  }
}
```

Install: `npm install @aws-sdk/client-s3`

---

## Rollback Plan

1. **Keep Firebase Storage running** — Do not delete Firebase Storage or its rules until fully verified
2. **Dual-write strategy** — For the transition, store both R2 URL and Firebase URL in Firestore:
   ```
   photos: [r2Url, firebaseUrl]  // New uploads store R2 URL first
   ```
3. **Image display fallback** — Display components can try the first URL (R2) and fall back to the second (Firebase) if it fails (implement via `<img onError>`)
4. **Reverse migration** — If R2 has issues, re-run the migration script in reverse (R2 → Firebase)
5. **Worker rollback** — If the Cloudflare Worker fails, switch `R2_PUBLIC_URL` to point directly to the R2 public bucket URL: `https://pub-{hash}.r2.dev`

---

## Effort Estimate

| Step | Task | Est. Time | Who |
|------|------|-----------|-----|
| 1 | Cloudflare R2 bucket + Worker setup | 30 min | DevOps |
| 2 | Install `@aws-sdk/client-s3`, create `r2-config.ts` + `r2-upload.ts` | 30 min | Developer |
| 3 | Create `/api/upload` API route | 15 min | Developer |
| 4 | Update `AuthContext.tsx` — replace upload block | 20 min | Developer |
| 5 | Update `AgencyListingForm.tsx` — replace `uploadImages()` | 45 min | Developer |
| 6 | Update `next.config.ts`, `.env.local`, remove `storage.rules` | 10 min | Developer |
| 7 | Create migration script `migrate-to-r2.js` | 2 hours | Developer |
| 8 | Run migration (dry-run → execute → verify) | 1 hour | Developer |
| 9 | Clean up `firebase.ts` — remove storage exports | 5 min | Developer |
| 10 | Testing | 2 hours | QA |
| **Total** | | **~7.5 hours** | |

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| S3 credentials exposed in client bundle | Low | Critical | R2 SDK only used server-side (API route). No credentials in client code |
| Migration script fails on a specific URL | Medium | Low | Script skips failed URLs, logs them, continues; can retry individually |
| Existing Firebase URLs in Firestore not caught | Medium | Medium | Migration script scans all listings + users; `--verify` flag double-checks |
| Upload API route timeout for large files | Low | Medium | 10MB file size limit enforced; Next.js API routes have default 30s timeout |
| Cloudflare Worker 404s on some paths | Low | Medium | Worker logs failed paths; easy to diagnose with `wrangler tail` |
| Cache serving stale images after update | Low | Low | UUID-based filenames ensure every upload is a new URL (cache-busting by design) |

---

## Testing Checklist

### Upload Testing
- [ ] Test single image upload via AgencyListingForm (per-place images)
- [ ] Test multiple image upload per place
- [ ] Test identity proof upload during registration (AuthContext)
- [ ] Test with JPEG, PNG, WebP files
- [ ] Test with oversized file (>10MB) — should reject
- [ ] Test with invalid file type — should reject

### Display Testing  
- [ ] Verify images render correctly in listing cards
- [ ] Verify images render in listing detail view
- [ ] Verify images render in PackageComparison
- [ ] Verify images render in listing forms (edit mode shows existing images)
- [ ] Check cache headers in browser DevTools Network tab

### Migration Testing
- [ ] Run `--dry-run` on production database first
- [ ] Run `--execute` on staging/development database
- [ ] Run `--verify` to confirm all URLs migrated
- [ ] Spot-check 10 migrated listings manually

### Regression Testing
- [ ] Verify no `getStorageInstance` calls remain in codebase
- [ ] Verify `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` is not referenced anywhere
- [ ] Verify `storage.rules` file is deleted
- [ ] Verify existing listings still display correctly (using Firebase URLs as fallback)

---

## Post-Migration Cleanup

1. ✅ Run `npm uninstall firebase/storage` — wait, `firebase/storage` is part of the `firebase` package, can't uninstall individually. Just remove the imports.
2. ✅ Search codebase for `firebase/storage` references — confirm zero remaining
3. ✅ Search codebase for `getStorageInstance` — confirm zero remaining
4. ✅ Remove `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` from deployment environments (Vercel/GitHub Actions)
5. ✅ Delete `storage.rules` from version control
6. ⏳ Wait 1 week before deleting Firebase Storage bucket (safety buffer)