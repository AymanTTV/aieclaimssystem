// src/utils/attachmentUpload.ts
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../lib/firebase';

export interface CustomAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  isUploading?: boolean;
  selected?: boolean;
}

export const formatFileSize = (bytes: number): string => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

export const uploadCustomAttachment = async (
  file: File,
  moduleContext: 'rentals' | 'invoices' | 'claims' | 'maintenance',
  recordId?: string
): Promise<string> => {
  const safeId = (recordId || 'general').replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const timestamp = Date.now();
  const path = `attachments/${moduleContext}/${safeId}/${timestamp}_${safeName}`;
  const storageRef = ref(storage, path);

  try {
    const snapshot = await uploadBytes(storageRef, file, {
      contentType: file.type || 'application/octet-stream',
      customMetadata: {
        'Cache-Control': 'public,max-age=31536000',
        originalName: file.name,
      },
    });

    let downloadUrl = await getDownloadURL(snapshot.ref);
    if (downloadUrl.includes('firebasestorage.googleapis.com') && !downloadUrl.includes('alt=media')) {
      const sep = downloadUrl.includes('?') ? '&' : '?';
      downloadUrl = `${downloadUrl}${sep}alt=media`;
    }
    return downloadUrl;
  } catch (error) {
    console.warn(`Storage upload failed for ${file.name}, trying resilient data fallback:`, error);
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result) {
          resolve(reader.result as string);
        } else {
          reject(new Error('Failed reading file'));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
};
