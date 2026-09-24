// src/utils/imageUtils.ts
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../lib/firebase';

/**
 * Extracts 1-2 character initials for display in avatar fallbacks.
 * Examples:
 *  - "Hamza Ali" -> "HA"
 *  - "Hamza" -> "H"
 *  - isCompany -> "CO"
 */
export function getCustomerInitials(
  name?: string | null,
  firstName?: string | null,
  lastName?: string | null,
  isCompany?: boolean
): string {
  if (isCompany) return 'CO';

  const f = (firstName || '').trim();
  const l = (lastName || '').trim();

  if (f && l) {
    return `${f[0]}${l[0]}`.toUpperCase();
  }

  const cleanName = (name || '').trim();
  if (!cleanName) return 'M';

  const parts = cleanName.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const firstInitial = parts[0][0];
    const lastInitial = parts[parts.length - 1][0];
    return `${firstInitial}${lastInitial}`.toUpperCase();
  }

  if (parts.length === 1 && parts[0].length > 0) {
    return parts[0].slice(0, Math.min(2, parts[0].length)).toUpperCase();
  }

  return 'M';
}

/**
 * Resizes and compresses an image file to a lightweight data URL (JPEG/WebP).
 * Useful for fast client-side previews, mobile networks, and resilient fallback storage.
 */
export function compressImageFile(
  file: File,
  maxWidth = 600,
  maxHeight = 600,
  quality = 0.82
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = (e) => {
      const src = e.target?.result as string;
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to load image for compression'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width / maxWidth > height / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(src);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Prefer image/jpeg for wide browser compatibility and small size
        try {
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(dataUrl);
        } catch {
          resolve(src);
        }
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Uploads a profile image file to Firebase Storage with a fallback to compressed Data URL
 * if Storage is in mock mode, offline, or unavailable.
 */
export async function uploadProfilePicture(
  file: File,
  customerId: string
): Promise<string> {
  // Always produce an optimized compressed data URL first
  const compressedDataUrl = await compressImageFile(file, 600, 600, 0.82);

  try {
    const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const storageRef = ref(storage, `customers/${customerId}/profile-picture.${extension}`);
    
    // Convert compressed Data URL to Blob for storage upload
    const response = await fetch(compressedDataUrl);
    const blob = await response.blob();
    
    const snapshot = await uploadBytes(storageRef, blob, {
      contentType: file.type || 'image/jpeg',
    });
    const downloadUrl = await getDownloadURL(snapshot.ref);
    return downloadUrl;
  } catch (err) {
    console.warn('Firebase Storage upload failed, falling back to compressed Data URL:', err);
    return compressedDataUrl;
  }
}
