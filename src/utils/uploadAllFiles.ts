// src/utils/uploadAllFiles.ts

import { uploadFile } from './uploadFile';

export const uploadAllFiles = async (files: File[], path: string): Promise<string[]> => {
  if (!files || files.length === 0) return [];
  
  const uploadPromises = files.map(file => uploadFile(file, path));
  return Promise.all(uploadPromises);
};
