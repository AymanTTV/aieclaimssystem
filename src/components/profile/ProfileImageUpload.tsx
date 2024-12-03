import React from 'react';
import { Upload, UserCircle } from 'lucide-react';
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE } from '../../lib/constants';
import toast from 'react-hot-toast';

interface ProfileImageUploadProps {
  imagePreview: string | null;
  onImageChange: (file: File | null) => void;
}

const ProfileImageUpload: React.FC<ProfileImageUploadProps> = ({ imagePreview, onImageChange }) => {
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
        {imagePreview ? (
          <img
            src={imagePreview}
            alt="Profile Preview"
            className="h-16 w-16 rounded-full object-cover"
          />
        ) : (
          <UserCircle className="h-16 w-16 text-gray-300" />
        )}
        <label className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
          <Upload className="h-5 w-5 mr-2 text-gray-400" />
          Upload Image
          <input
            type="file"
            className="hidden"
            accept="image/*"
            onChange={handleImageChange}
          />
        </label>
      </div>
    </div>
  );
};

export default ProfileImageUpload;