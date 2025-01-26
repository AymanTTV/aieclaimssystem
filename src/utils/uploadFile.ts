import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../lib/firebase';
import toast from 'react-hot-toast';

export const uploadFile = async (file: File, path: string): Promise<string> => {
  try {
    // Create unique filename with timestamp
    const timestamp = Date.now();
    const filename = `${timestamp}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    const storageRef = ref(storage, `${path}/${filename}`);
    
    // Upload with metadata
    const snapshot = await uploadBytes(storageRef, file, {
      contentType: file.type,
      customMetadata: {
        'Cache-Control': 'public,max-age=7200'
      }
    });

    // Get and return download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (error) {
    console.error('Error uploading file:', error);
    toast.error(`Failed to upload ${file.name}`);
    throw error;
  }
};