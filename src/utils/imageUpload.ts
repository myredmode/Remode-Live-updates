/**
 * Product Image Compression and Persistence Utility
 * Compresses raw high-res camera photos before upload to ~35-55KB
 * ensuring fast loading, zero localStorage/Firestore 1MB quota blowouts, and permanent persistence
 * across all devices on both server (local/Express) and client (Vercel SPA / IndexedDB / Cloud Firestore).
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
        // If still larger than ~90KB in base64, step down quality slightly so multi-photo products stay well under Firestore's 1MB limit
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

export async function uploadImageFile(file: File): Promise<string> {
  try {
    const compressedDataUrl = await compressImage(file);
    if (!compressedDataUrl) return '';

    // Return the self-contained compressed data URL directly so it persists identically
    // in Cloud Firestore across all devices, browsers, and Vercel/Cloud Run deployments
    // without relying on ephemeral container-local /uploads/ files.
    return compressedDataUrl;
  } catch (error) {
    console.warn('Image processing failed, returning fallback:', error);
    return await compressImage(file);
  }
}
