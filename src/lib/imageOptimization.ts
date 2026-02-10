/**
 * Image optimization utilities for better loading performance
 */

export interface ImageOptimizationOptions {
  quality?: number;
  format?: 'auto' | 'webp' | 'jpeg' | 'png';
  width?: number;
  height?: number;
  cacheBust?: boolean;
}

/**
 * Optimize image URL with various parameters for faster loading
 */
export function optimizeImageUrl(
  url: string, 
  options: ImageOptimizationOptions = {}
): string {
  if (!url) return '';

  const {
    quality = 85,
    format = 'auto',
    width,
    height,
    cacheBust = true
  } = options;

  try {
    const urlObj = new URL(url);
    
    // Add optimization parameters
    urlObj.searchParams.set('auto', format === 'auto' ? 'format,compress' : format);
    urlObj.searchParams.set('q', quality.toString());
    
    if (width) urlObj.searchParams.set('w', width.toString());
    if (height) urlObj.searchParams.set('h', height.toString());
    
    // Add cache busting
    if (cacheBust) {
      urlObj.searchParams.set('v', Date.now().toString());
    }

    return urlObj.toString();
  } catch (error) {
    console.warn('Failed to optimize image URL:', error);
    return url;
  }
}

/**
 * Generate a blur placeholder SVG for lazy loading
 */
export function generateBlurPlaceholder(
  width: number = 400, 
  height: number = 300,
  color: string = '#f3f4f6'
): string {
  return `data:image/svg+xml;base64,${btoa(`
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${color};stop-opacity:1" />
          <stop offset="100%" style="stop-color:#e5e7eb;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#g)" />
      <circle cx="${width/2}" cy="${height/2}" r="${Math.min(width, height) / 10}" fill="white" opacity="0.3" />
      <rect x="${width * 0.125}" y="${height * 0.125}" width="${width * 0.75}" height="${height * 0.75}" fill="none" stroke="white" stroke-width="2" opacity="0.2" />
    </svg>
  `)}`;
}

/**
 * Preload an image for better performance
 */
export function preloadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/**
 * Check if image URL is valid
 */
export function isValidImageUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get image dimensions from URL (async)
 */
export function getImageDimensions(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = reject;
    img.src = url;
  });
}

/**
 * Create a responsive image set for different screen sizes
 */
export function createResponsiveImageSet(
  baseUrl: string,
  sizes: number[] = [400, 800, 1200, 1600]
): string {
  return sizes
    .map(size => {
      const optimizedUrl = optimizeImageUrl(baseUrl, { width: size, quality: 85 });
      return `${optimizedUrl} ${size}w`;
    })
    .join(', ');
}