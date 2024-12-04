import React from 'react';
import { Upload, UserCircle } from 'lucide-react';
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE } from '../../lib/constants';
import toast from 'react-hot-toast';

interface ProfileImageUploadProps {
  imagePreview: string | null;
  onImageChange: (file: File | null) => void;
  isLoading?: boolean;
}

const ProfileImageUpload: React.FC<ProfileImageUploadProps> = ({ 
  imagePreview, 
  onImageChange,
  isLoading = false 
}) => {
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast.error('Please upload a valid image file (JPEG, PNG, or WebP)');
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      toast.error('Image size should be less than 5MB');
      return;
    }

    onImageChange(file);
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">Profile Picture</label>
      <div className="mt-2 flex items-center space-x-4">
        <div className="relative">
          {imagePreview ? (
            <img
              src={imagePreview}
              alt="Profile Preview"
              className="h-16 w-16 rounded-full object-cover"
            />
          ) : (
            <UserCircle className="h-16 w-16 text-gray-300" />
          )}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
            </div>
          )}
        </div>
        <label className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
          <Upload className="h-5 w-5 mr-2 text-gray-400" />
          Upload Image
          <input
            type="file"
            className="hidden"
            accept="image/*"
            onChange={handleImageChange}
            disabled={isLoading}
          />
        </label>
      </div>
      <p className="mt-1 text-sm text-gray-500">
        Recommended: Square image, max 5MB (JPEG, PNG, or WebP)
      </p>
    </div>
  );
};

export default ProfileImageUpload;