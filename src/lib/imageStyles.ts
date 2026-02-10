/**
 * CSS-in-JS styles for optimized image loading
 */

export const imageLoadingStyles = `
  /* Smooth image loading transitions */
  .image-loading-container {
    position: relative;
    overflow: hidden;
  }
  
  .image-loading-container .blur-placeholder {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    filter: blur(5px);
    transition: opacity 0.3s ease;
  }
  
  .image-loading-container .main-image {
    position: relative;
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
    opacity: 0;
    transform: scale(1.05);
  }
  
  .image-loading-container .main-image.loaded {
    opacity: 1;
    transform: scale(1);
  }
  
  .image-loading-container .main-image:hover {
    transform: scale(1.1);
  }
  
  /* Skeleton loading animation */
  .skeleton-loading {
    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
    background-size: 200% 100%;
    animation: skeleton-shimmer 1.5s infinite;
  }
  
  @keyframes skeleton-shimmer {
    0% {
      background-position: -200% 0;
    }
    100% {
      background-position: 200% 0;
    }
  }
  
  /* Error state styles */
  .image-error-state {
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #f3f4f6;
    color: #6b7280;
    font-size: 14px;
  }
  
  .image-error-icon {
    font-size: 24px;
    margin-bottom: 8px;
    opacity: 0.5;
  }
`;

/**
 * Inject CSS styles into the document head
 */
export function injectImageStyles() {
  if (typeof document !== 'undefined') {
    const styleId = 'image-loading-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = imageLoadingStyles;
      document.head.appendChild(style);
    }
  }
}

/**
 * Utility to apply image loading classes
 */
export function applyImageLoadingClasses(container: HTMLElement) {
  container.classList.add('image-loading-container');
  
  const images = container.querySelectorAll('img');
  images.forEach((img, index) => {
    if (index === 0) {
      // First image is the main image
      img.classList.add('main-image');
    } else {
      // Other images are placeholders
      img.classList.add('blur-placeholder');
    }
  });
}