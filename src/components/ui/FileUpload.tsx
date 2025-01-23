// src/components/ui/FileUpload.tsx

import React, { useState, useRef } from 'react';
import { Upload, X, FileText, Loader } from 'lucide-react';
import toast from 'react-hot-toast';

// Update the value prop type to handle arrays
interface FileUploadProps {
  label: string;
  accept?: string;
  multiple?: boolean;
  maxSize?: number;
  value?: File[] | null;
  onChange: (files: File[] | null) => void;
  onRemove?: (index: number) => void;
  error?: string;
  showPreview?: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({
  label,
  accept = 'image/*',
  multiple = false,
  maxSize = 50 * 1024 * 1024, // 5MB default
  value,
  onChange,
  error,
  showPreview = true,
}) => {
  const [preview, setPreview] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update the handleFileChange function
const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const files = Array.from(e.target.files || []);
  if (files.length === 0) return;

  // Validate files
  const validFiles = files.filter((file) => {
    if (file.size > maxSize) {
      toast.error(`${file.name} is too large. Maximum size is ${maxSize / 1024 / 1024}MB`);
      return false;
    }

    const acceptedTypes = accept.split(',').map((type) => type.trim());
    const isValidType = acceptedTypes.some((type) => {
      if (type.startsWith('.')) {
        return file.name.toLowerCase().endsWith(type.toLowerCase());
      } else if (type.endsWith('/*')) {
        return file.type.startsWith(type.replace('/*', ''));
      }
      return file.type === type;
    });

    if (!isValidType) {
      toast.error(`${file.name} is not a valid file type`);
      return false;
    }

    return true;
  });

  if (validFiles.length === 0) return;

  // Update files
  const newFiles = multiple ? [...(value || []), ...validFiles] : [validFiles[0]];
  onChange(newFiles);

  // Generate previews for images
  const newPreviews: string[] = [];
  validFiles.forEach((file) => {
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        newPreviews.push(reader.result as string);
        if (newPreviews.length === validFiles.length) {
          setPreview([...preview, ...newPreviews]);
        }
      };
      reader.readAsDataURL(file);
    } else {
      newPreviews.push('');
    }
  });
};

  const removeFile = (index: number) => {
    const newPreviews = [...preview];
    newPreviews.splice(index, 1);
    setPreview(newPreviews);

    if (value) {
      const files = Array.isArray(value) ? value : [value];
      const newFiles = files.filter((_, i) => i !== index);
      onChange(newFiles.length > 0 ? newFiles : null);
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">{label}</label>

      <div className="flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
        <div className="space-y-1 text-center">
          <Upload className="mx-auto h-12 w-12 text-gray-400" />
          <div className="flex text-sm text-gray-600">
            <label className="relative cursor-pointer bg-white rounded-md font-medium text-primary hover:text-primary-dark focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary">
              <span>Upload {multiple ? 'files' : 'a file'}</span>
              <input
                ref={fileInputRef}
                type="file"
                className="sr-only"
                accept={accept}
                multiple={multiple}
                onChange={handleFileChange}
                disabled={uploading}
              />
            </label>
            <p className="pl-1">or drag and drop</p>
          </div>
          <p className="text-xs text-gray-500">
            {accept.split(',').join(', ')} up to {maxSize / 1024 / 1024}MB
          </p>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      {showPreview && preview.length > 0 && (
        <div className="mt-4 grid grid-cols-3 gap-4">
          {preview.map((src, index) => (
            <div key={index} className="relative">
              {src.startsWith('data:image') ? (
                <img
                  src={src}
                  alt={`Preview ${index + 1}`}
                  className="h-24 w-full object-cover rounded-md"
                />
              ) : (
                <div className="h-24 w-full bg-gray-100 rounded-md flex items-center justify-center">
                  <FileText className="h-8 w-8 text-gray-400" />
                </div>
              )}
              <button
                type="button"
                onClick={() => removeFile(index)}
                className="absolute -top-2 -right-2 bg-red-100 rounded-full p-1 hover:bg-red-200"
              >
                <X className="h-4 w-4 text-red-600" />
              </button>
            </div>
          ))}
        </div>
      )}

      {uploading && (
        <div className="mt-2 flex items-center justify-center text-sm text-gray-500">
          <Loader className="animate-spin h-4 w-4 mr-2" />
          Uploading...
        </div>
      )}
    </div>
  );
};

export default FileUpload;