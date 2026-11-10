/**
 * Product Image Compression and Persistence Utility
 * Compresses raw high-res camera photos before upload to under 50-70KB
 * ensuring fast loading, zero localStorage quota blowouts, and permanent persistence
 * across reloads on both server (local/Express) and client (Vercel SPA / IndexedDB / Firestore).
 */

import { appendVersionToImageUrl } from './cacheBuster';

export async function compressImage(
  file: File,
  maxWidth = 960,
  maxHeight = 1280,
  quality = 0.74
): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (!dataUrl) {
        resolve('');
        return;
      }

      const img = new Image();
      img.onload = () => {
        let { width, height } = img;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }

        // Fill white background for transparent PNGs converted to JPEG
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const compressed = canvas.toDataURL('image/jpeg', quality);
        resolve(compressed);
      };

      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    };

    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
}

export async function uploadImageFile(file: File): Promise<string> {
  try {
    const compressedDataUrl = await compressImage(file);
    if (!compressedDataUrl) return '';

    // Attempt to persist on server /public/uploads if backend exists
    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image: compressedDataUrl }),
      });

      const contentType = response.headers.get('content-type') || '';
      if (response.ok && contentType.includes('application/json')) {
        const data = await response.json();
        if (data.success && data.url) {
          return appendVersionToImageUrl(data.url);
        }
      }
    } catch {
      // Backend not running or static hosting (e.g. Vercel SPA) - fallback safely to compressed data URL
    }

    // Return the clean, compact compressed data URL (persisted reliably via IndexedDB & Firestore)
    return compressedDataUrl;
  } catch (error) {
    console.warn('Image processing failed, returning original/fallback:', error);
    return await compressImage(file);
  }
}
