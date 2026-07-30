import { PutObjectCommand } from '@aws-sdk/client-s3';
import { r2Client, R2_BUCKET_NAME, R2_PUBLIC_URL } from './r2-config';

export type ImageCategory = 'listings' | 'proofs' | 'logos' | 'avatars' | 'covers';

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
    CacheControl: category === 'listings' || category === 'covers'
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
