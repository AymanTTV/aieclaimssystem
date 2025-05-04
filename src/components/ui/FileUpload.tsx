import React, { useState, useRef, useEffect } from 'react';
import { Upload, X, FileText, Loader } from 'lucide-react';
import toast from 'react-hot-toast';

// Utility function to format file size
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

// Function to get file size from URL
const getFileSizeFromURL = async (url: string): Promise<number> => {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return parseInt(response.headers.get('content-length') || '0');
  } catch (error) {
    console.error('Error getting file size:', error);
    return 0;
  }
};

interface FileUploadProps {
  label: string;
  accept?: string;
  multiple?: boolean;
  maxSize?: number;
  value?: (File | string)[] | null;
  onChange: (files: File[] | null) => void;
  onRemove?: (index: number) => void;
  error?: string;
  showPreview?: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({
  label,
  accept = 'image/*',
  multiple = false,
  maxSize = 100 * 1024 * 1024,
  value,
  onChange,
  error,
  showPreview = true,
}) => {
  const [previews, setPreviews] = useState<Array<{ url: string; size: number; type: string }>>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const initializePreviews = async () => {
      if (!value) return;

      const newPreviews = await Promise.all(
        (Array.isArray(value) ? value : [value]).map(async (item) => {
          if (item instanceof File) {
            return {
              url: URL.createObjectURL(item),
              size: item.size,
              type: item.type,
            };
          } else if (typeof item === 'string') {
            const size = await getFileSizeFromURL(item);
            const type = item.split('.').pop()?.toLowerCase() || ''; // Infer type from URL
            return { url: item, size, type };
          }
          return null;
        })
      );

      setPreviews(newPreviews.filter((p): p is { url: string; size: number; type: string } => p !== null));
    };

    initializePreviews();
  }, [value]);


  const getFileIcon = (url: string, type: string) => {
  const extension = url.split('.').pop()?.toLowerCase();

  if (type.startsWith('image/')) {
    return (
      <img
        src={url}
        alt="Preview"
        className="w-full h-full object-cover"
      />
    );
  }

  if (type.startsWith('video/')) {
    return (
      <video
        src={url}
        className="w-full h-full object-cover"
        controls
      />
    );
  }

  if (extension === 'pdf') {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <FileText className="h-8 w-8 text-red-500" />
        <span className="text-xs text-gray-500 mt-1">PDF Document</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full">
      <FileText className="h-8 w-8 text-gray-500" />
      <span className="text-xs text-gray-500 mt-1">File</span>
    </div>
  );
};

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const files = Array.from(e.target.files || []);
  if (files.length === 0) return;

  // Validate files
  const validFiles = files.filter((file) => {
    if (file.size > maxSize) {
      toast.error(`${file.name} is too large. Maximum size is ${formatFileSize(maxSize)}`);
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
  const newFiles = multiple ? validFiles : [validFiles[0]];
  onChange(newFiles);

  // Update previews
  const newPreviews = newFiles.map((file) => ({
    url: URL.createObjectURL(file),
    size: file.size,
    type: file.type,
  }));
  setPreviews(newPreviews);
};

  const removeFile = (index: number) => {
    const newPreviews = [...previews];
    newPreviews.splice(index, 1);
    setPreviews(newPreviews);

    if (value) {
      const files = Array.isArray(value) ? value : [value];
      const newFiles = files.filter((_, i) => i !== index);
      onChange(newFiles.length > 0 ? newFiles.filter((f): f is File => f instanceof File) : null);
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
            {accept.split(',').join(', ')} up to {formatFileSize(maxSize)}
          </p>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {showPreview && previews.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-4">
          {previews.map(({ url, size, type }, index) => (
            <div key={index} className="relative group">
              <div className="aspect-video rounded-lg border border-gray-200 overflow-hidden bg-gray-50">
                {getFileIcon(url, type)}
              </div>
              <div className="absolute inset-x-0 bottom-0 p-2 bg-black bg-opacity-50 text-white text-xs">
                {formatFileSize(size)}
              </div>
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