import imageCompression from 'browser-image-compression';

export interface CompressionOptions {
  maxSizeMB: number;
  maxWidthOrHeight: number;
  useWebWorker: boolean;
  quality?: number;
}

export const defaultCompressionOptions: CompressionOptions = {
  maxSizeMB: 1, // Maximum file size in MB
  maxWidthOrHeight: 1920, // Maximum width or height
  useWebWorker: true,
  quality: 0.8, // Image quality (0.8 = 80%)
};

export const compressImage = async (
  file: File,
  options: Partial<CompressionOptions> = {}
): Promise<File> => {
  const finalOptions = { ...defaultCompressionOptions, ...options };

  try {
    console.log('Compressing image:', file.name, 'Size:', (file.size / 1024 / 1024).toFixed(2), 'MB');

    const compressedFile = await imageCompression(file, finalOptions);

    console.log(
      'Compressed image:',
      compressedFile.name,
      'New size:',
      (compressedFile.size / 1024 / 1024).toFixed(2),
      'MB',
      'Compression ratio:',
      ((file.size - compressedFile.size) / file.size * 100).toFixed(1) + '%'
    );

    return compressedFile;
  } catch (error) {
    console.error('Error compressing image:', error);
    // Return original file if compression fails
    return file;
  }
};

export const compressMultipleImages = async (
  files: File[],
  options: Partial<CompressionOptions> = {}
): Promise<File[]> => {
  const compressionPromises = files.map(file => compressImage(file, options));
  return Promise.all(compressionPromises);
};

// Utility function to get image dimensions
export const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.width, height: img.height });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
};

// Validate file type
export const isValidImageFile = (file: File): boolean => {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  return validTypes.includes(file.type);
};

// Validate file size (before compression)
export const validateFileSize = (file: File, maxSizeMB: number = 10): boolean => {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxSizeBytes;
};
