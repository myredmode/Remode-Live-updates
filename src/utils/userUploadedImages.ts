import { useState, useEffect, useCallback } from 'react';

export interface UploadedImageItem {
  id: string;
  url: string;
  label: string;
  uploadedAt: string;
}

const STORAGE_KEY = 'redmode_user_uploaded_images';
const EVENT_NAME = 'redmode_uploaded_images_updated';

// Read all stored user-uploaded photos
export function getSavedUploadedImages(): UploadedImageItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter((item) => item && typeof item.url === 'string' && item.url.trim().length > 0);
      }
    }
  } catch (e) {
    console.debug('Failed to parse uploaded images library:', e);
  }
  return [];
}

// Save a newly uploaded photo to the library
export function saveUploadedImage(url: string, label?: string): UploadedImageItem[] {
  if (!url || typeof url !== 'string' || !url.trim()) return getSavedUploadedImages();

  const trimmedUrl = url.trim();
  const current = getSavedUploadedImages();

  // Deduplicate by URL
  const filtered = current.filter((item) => item.url !== trimmedUrl);

  const cleanLabel = (label || '').trim() || `Upload ${new Date().toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}`;

  const newItem: UploadedImageItem = {
    id: `img_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    url: trimmedUrl,
    label: cleanLabel,
    uploadedAt: new Date().toISOString(),
  };

  // Keep latest 40 images
  const updated = [newItem, ...filtered].slice(0, 40);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: updated }));
  } catch (e) {
    console.debug('Failed to save uploaded image to library:', e);
  }

  return updated;
}

// Remove an image from the recommendation library
export function deleteSavedUploadedImage(urlOrId: string): UploadedImageItem[] {
  const current = getSavedUploadedImages();
  const updated = current.filter((item) => item.id !== urlOrId && item.url !== urlOrId);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: updated }));
  } catch (e) {
    console.debug('Failed to delete uploaded image from library:', e);
  }

  return updated;
}

// Custom React hook for live synchronization of uploaded photos
export function useUploadedImages() {
  const [images, setImages] = useState<UploadedImageItem[]>(() => getSavedUploadedImages());

  useEffect(() => {
    const handleUpdate = () => {
      setImages(getSavedUploadedImages());
    };

    window.addEventListener(EVENT_NAME, handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener(EVENT_NAME, handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const addImage = useCallback((url: string, label?: string) => {
    return saveUploadedImage(url, label);
  }, []);

  const removeImage = useCallback((urlOrId: string) => {
    return deleteSavedUploadedImage(urlOrId);
  }, []);

  return { images, addImage, removeImage };
}
