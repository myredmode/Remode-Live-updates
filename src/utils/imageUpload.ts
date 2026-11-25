import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';

/**
 * Product Image Compression and Persistence Utility
 * Uploads compressed product images to Firebase Storage (Google Cloud) so product documents
 * in Firestore stay lightweight and fast even at 2,500-5,000+ daily visitors.
 * Automatically falls back to a compact compressed Data URL if Firebase Storage is not yet enabled.
 */

export async function compressImage(
  file: File,
  maxWidth = 720,
  maxHeight = 960,
  quality = 0.66
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

        let compressed = canvas.toDataURL('image/jpeg', quality);
        // If still larger than ~90KB in base64, step down quality slightly so fallback stays under Firestore's 1MB limit
        if (compressed.length > 95000) {
          compressed = canvas.toDataURL('image/jpeg', 0.54);
        }
        resolve(compressed);
      };

      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    };

    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
}

function dataUrlToBlob(dataUrl: string): Blob | null {
  try {
    const parts = dataUrl.split(',');
    if (parts.length !== 2) return null;
    const mimeMatch = parts[0].match(/data:([^;]+);base64/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const binary = atob(parts[1]);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new Blob([bytes], { type: mime });
  } catch {
    return null;
  }
}

export async function uploadImageFile(file: File): Promise<string> {
  try {
    // High-clarity compressed JPEG for Firebase Storage CDN delivery
    const storageDataUrl = await compressImage(file, 960, 1280, 0.78);
    if (!storageDataUrl) return '';

    const blob = dataUrlToBlob(storageDataUrl);
    if (blob && storage) {
      try {
        const safeName = `products/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`;
        const storageRef = ref(storage, safeName);
        const uploadPromise = uploadBytes(storageRef, blob, {
          contentType: 'image/jpeg',
          cacheControl: 'public, max-age=31536000, immutable',
        }).then(() => getDownloadURL(storageRef));

        const timeoutPromise = new Promise<string>((_, reject) =>
          setTimeout(() => reject(new Error('Firebase Storage upload timed out')), 7000)
        );

        const downloadUrl = await Promise.race([uploadPromise, timeoutPromise]);
        if (downloadUrl && downloadUrl.startsWith('https://')) {
          return downloadUrl;
        }
      } catch (storageErr) {
        console.warn('Firebase Storage upload unavailable, falling back to compact Data URL:', storageErr);
      }
    }

    // Safe compact fallback if Storage bucket or rules are not yet activated
    return await compressImage(file, 720, 960, 0.66);
  } catch (error) {
    console.warn('Image processing failed, returning fallback:', error);
    return await compressImage(file);
  }
}
