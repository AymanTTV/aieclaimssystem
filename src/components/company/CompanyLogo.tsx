import React, { useState } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc } from 'firebase/firestore';
import { storage, db } from '../../lib/firebase';
import { Upload, X } from 'lucide-react';
import { validateImage } from '../../utils/imageUpload';
import toast from 'react-hot-toast';

interface CompanyLogoProps {
  currentLogo?: string | null;
  onLogoUpdate: (url: string) => void;
}

const CompanyLogo: React.FC<CompanyLogoProps> = ({ currentLogo, onLogoUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentLogo || null);

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!validateImage(file)) {
      return;
    }

    setLoading(true);

    try {
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Upload to storage
      const logoRef = ref(storage, 'company/logo');
      const snapshot = await uploadBytes(logoRef, file, {
        contentType: file.type,
        customMetadata: {
          'Cache-Control': 'public,max-age=7200'
        }
      });

      const url = await getDownloadURL(snapshot.ref);

      // Update company settings
      await updateDoc(doc(db, 'companySettings', 'details'), {
        logoUrl: url,
        updatedAt: new Date()
      });

      onLogoUpdate(url);
      toast.success('Company logo updated successfully');
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast.error('Failed to upload logo');
      setPreview(currentLogo || null);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveLogo = async () => {
    try {
      await updateDoc(doc(db, 'companySettings', 'details'), {
        logoUrl: null,
        updatedAt: new Date()
      });
      setPreview(null);
      onLogoUpdate('');
      toast.success('Company logo removed');
    } catch (error) {
      console.error('Error removing logo:', error);
      toast.error('Failed to remove logo');
    }
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="relative">
        {preview ? (
          <div className="relative w-32 h-32">
            <img
              src={preview}
              alt="Company logo"
              className="w-full h-full object-contain rounded-lg"
            />
            <button
              onClick={handleRemoveLogo}
              className="absolute -top-2 -right-2 p-1 bg-white rounded-full shadow-md hover:bg-gray-100"
              title="Remove logo"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        ) : (
          <div className="w-32 h-32 bg-gray-100 rounded-lg flex items-center justify-center">
            <Upload className="w-8 h-8 text-gray-400" />
          </div>
        )}

        {loading && (
          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-lg">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )}
      </div>

      <label className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
        <Upload className="h-5 w-5 mr-2 text-gray-400" />
        {preview ? 'Change Logo' : 'Upload Logo'}
        <input
          type="file"
          className="hidden"
          accept="image/*"
          onChange={handleLogoChange}
          disabled={loading}
        />
      </label>

      <p className="text-xs text-gray-500">
        Recommended: Square image, max 5MB (JPEG, PNG, or WebP)
      </p>
    </div>
  );
};

export default CompanyLogo;