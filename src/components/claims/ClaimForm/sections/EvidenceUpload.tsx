// src/components/claims/ClaimForm/sections/EvidenceUpload.tsx

import React, { useEffect, useState } from 'react'; // Import useEffect and useState
import { useFormContext } from 'react-hook-form';
import FileUpload from '../../../ui/FileUpload';
import { FileText, XCircle, Image as ImageIcon, Video } from 'lucide-react';

// Helper to get the file/URL name (useful for non-image types or fallback)
const getItemName = (item: File | string): string => {
  if (typeof item === 'string') {
    try {
      const url = new URL(item);
      const pathSegments = url.pathname.split('/');
      return pathSegments.pop() || 'Unknown File';
    } catch (e) {
      return item;
    }
  } else {
    return item.name;
  }
};

// Helper to determine the icon (less critical for images now, but useful for others)
const getItemIcon = (item: File | string) => {
    if (typeof item === 'string') {
        if (item.match(/\.(jpeg|jpg|png|gif)$/i)) return <ImageIcon className="h-4 w-4" />;
        if (item.match(/\.(mp4|webm|ogg)$/i)) return <Video className="h-4 w-4" />;
        return <FileText className="h-4 w-4" />;
    } else {
         if (item.type.startsWith('image/')) return <ImageIcon className="h-4 w-4" />;
         if (item.type.startsWith('video/')) return <Video className="h-4 w-4" />;
         return <FileText className="h-4 w-4" />;
    }
};


const EvidenceUpload: React.FC = () => {
  const {
    watch,
    setValue,
    formState: { errors },
  } = useFormContext();

  const images = watch('evidence.images') as (File | string)[] | undefined;
  const videos = watch('evidence.videos') as (File | string)[] | undefined;
  const clientVehiclePhotos = watch('evidence.clientVehiclePhotos') as (File | string)[] | undefined;
  const engineerReport = watch('evidence.engineerReport') as (File | string)[] | undefined;
  const bankStatement = watch('evidence.bankStatement') as (File | string)[] | undefined;
  const adminDocuments = watch('evidence.adminDocuments') as (File | string)[] | undefined;

  // State to hold temporary object URLs for file previews
  const [objectUrls, setObjectUrls] = useState<Record<string, string>>({});

  // Effect to create and revoke object URLs
  useEffect(() => {
    const newObjectUrls: Record<string, string> = {};
    const urlsToRevoke: string[] = [];

    // Create object URLs for new File objects in images array
    images?.forEach((item, index) => {
        if (item instanceof File && item.type.startsWith('image/')) {
            const key = `images-${index}`; // Create a unique key for this item and position
             if (!objectUrls[key]) { // Create URL only if it doesn't exist
                newObjectUrls[key] = URL.createObjectURL(item);
                console.log('Created object URL:', newObjectUrls[key], 'for', item.name); // Debug
            } else {
                newObjectUrls[key] = objectUrls[key]; // Keep existing URL if item hasn't changed position
            }
        }
    });

     // Create object URLs for new File objects in clientVehiclePhotos array
     clientVehiclePhotos?.forEach((item, index) => {
        if (item instanceof File && item.type.startsWith('image/')) {
            const key = `clientVehiclePhotos-${index}`; // Create a unique key
             if (!objectUrls[key]) {
                newObjectUrls[key] = URL.createObjectURL(item);
                console.log('Created object URL:', newObjectUrls[key], 'for', item.name); // Debug
            } else {
                newObjectUrls[key] = objectUrls[key]; // Keep existing URL
            }
        }
    });

    // Identify old URLs to revoke
    Object.keys(objectUrls).forEach(key => {
        const existsInNew = (key.startsWith('images-') && images?.[parseInt(key.split('-')[1])] instanceof File) ||
                           (key.startsWith('clientVehiclePhotos-') && clientVehiclePhotos?.[parseInt(key.split('-')[1])] instanceof File);

        if (!existsInNew) {
            urlsToRevoke.push(objectUrls[key]);
        }
    });


    // Revoke old URLs
    urlsToRevoke.forEach(url => {
        URL.revokeObjectURL(url);
        console.log('Revoked object URL:', url); // Debug
    });

    // Update state with new object URLs
    setObjectUrls(newObjectUrls);

    // Cleanup function: Revoke all object URLs when the component unmounts
    return () => {
      Object.values(newObjectUrls).forEach(url => URL.revokeObjectURL(url));
      console.log('Revoked all object URLs on unmount'); // Debug
    };

  }, [images, clientVehiclePhotos]); // Re-run effect if image lists change


  const handleArrayFileUploadChange = (
    type: 'images' | 'videos' | 'clientVehiclePhotos' | 'engineerReport' | 'bankStatement' | 'adminDocuments',
    receivedFilesOrNull: File[] | null
  ) => {
    console.log(`Handling ${type} change. Received:`, receivedFilesOrNull);

    const currentArray = watch(`evidence.${type}`) as (File | string)[] || [];

    if (receivedFilesOrNull === null) {
        // Handle cases where FileUpload might clear its internal state,
        // but we rely on explicit removes for persistent items.
         if (currentArray.every(item => item instanceof File)) {
             setValue(`evidence.${type}`, [], { shouldDirty: true, shouldValidate: true });
        }

    } else if (Array.isArray(receivedFilesOrNull)) {
         const newArray = [...currentArray, ...receivedFilesOrNull];
         setValue(
           `evidence.${type}`,
           newArray,
           { shouldDirty: true, shouldValidate: true }
         );
         console.log(`Updated ${type} with new array:`, newArray);

    } else {
         console.warn(`Unexpected value received for ${type}:`, receivedFilesOrNull);
    }
  };

  const handleRemoveFile = (
    type: 'images' | 'videos' | 'clientVehiclePhotos' | 'engineerReport' | 'bankStatement' | 'adminDocuments',
    indexToRemove: number
  ) => {
    const currentArray = watch(`evidence.${type}`) as (File | string)[] || [];

    // If the item being removed is a File object, revoke its object URL
    if (currentArray[indexToRemove] instanceof File) {
         const key = `${type}-${indexToRemove}`;
         const urlToRevoke = objectUrls[key];
         if (urlToRevoke) {
             URL.revokeObjectURL(urlToRevoke);
             // Also remove it from our local objectUrls state
             setObjectUrls(prev => {
                 const newState = { ...prev };
                 delete newState[key];
                 return newState;
             });
             console.log(`Revoked object URL on manual remove: ${urlToRevoke}`); // Debug
         }
    }


    const nextArray = currentArray.filter((_, index) => index !== indexToRemove);
    setValue(`evidence.${type}`, nextArray, { shouldDirty: true, shouldValidate: true });
    console.log(`Manually removed item at index ${indexToRemove} from ${type}. New array length:`, nextArray.length);
  };


  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900">
        Evidence &amp; Documents
      </h3>

      {/* Incident Images */}
      <FileUpload
        label="Incident Images"
        accept="image/*"
        multiple
        value={undefined}
        onChange={(filesOrNull) => handleArrayFileUploadChange('images', filesOrNull)}
        error={errors.evidence?.images?.message as string}
        showPreview={false} // Disable FileUpload's internal preview
      />
       {/* Custom rendering for incident images */}
       {images && images.length > 0 && (
           <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
               {images.map((item, idx) => {
                   const isFile = item instanceof File;
                   const imageUrl = isFile ? objectUrls[`images-${idx}`] : (item as string); // Use object URL for File, string itself for URL

                   return (
                       <div
                           key={idx} // Use index as key
                           className="relative border rounded-lg overflow-hidden group"
                       >
                           {imageUrl ? (
                               <img
                                   src={imageUrl}
                                   alt={`Incident evidence ${isFile ? 'new file' : 'uploaded'}`}
                                   className="block w-full h-24 object-cover" // Adjust size as needed
                               />
                           ) : (
                               // Fallback if URL creation fails or item is not an image (shouldn't happen with accept="image/*", but good practice)
                                <div className="flex items-center justify-center h-24 bg-gray-100 text-gray-500">
                                   {getItemIcon(item)}
                                   <span className="ml-2 text-xs truncate">{getItemName(item)}</span>
                                </div>
                           )}
                           {/* Custom remove button */}
                           <button
                               type="button"
                               onClick={() => handleRemoveFile('images', idx)}
                               className="absolute top-1 right-1 text-red-600 hover:text-red-800 bg-white rounded-full p-0.5 opacity-70 group-hover:opacity-100"
                               aria-label="Remove image"
                           >
                               <XCircle className="h-5 w-5" />
                           </button>
                       </div>
                   );
               })}
           </div>
       )}


       {/* Client Vehicle Photos */}
       <FileUpload
        label="Client Vehicle Photos"
        accept="image/*"
        multiple
        value={undefined}
        onChange={(filesOrNull) => handleArrayFileUploadChange('clientVehiclePhotos', filesOrNull)}
        error={errors.evidence?.clientVehiclePhotos?.message as string}
        showPreview={false} // Disable FileUpload's internal preview
      />
       {/* Custom rendering for client vehicle photos */}
       {clientVehiclePhotos && clientVehiclePhotos.length > 0 && (
           <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
               {clientVehiclePhotos.map((item, idx) => {
                    const isFile = item instanceof File;
                    const imageUrl = isFile ? objectUrls[`clientVehiclePhotos-${idx}`] : (item as string); // Use object URL for File, string itself for URL

                    return (
                        <div
                            key={idx} // Use index as key
                            className="relative border rounded-lg overflow-hidden group"
                        >
                            {imageUrl ? (
                                <img
                                    src={imageUrl}
                                    alt={`Client vehicle photo ${isFile ? 'new file' : 'uploaded'}`}
                                    className="block w-full h-24 object-cover" // Adjust size as needed
                                />
                            ) : (
                                 <div className="flex items-center justify-center h-24 bg-gray-100 text-gray-500">
                                    {getItemIcon(item)}
                                    <span className="ml-2 text-xs truncate">{getItemName(item)}</span>
                                 </div>
                             )}
                             {/* Custom remove button */}
                             <button
                                 type="button"
                                 onClick={() => handleRemoveFile('clientVehiclePhotos', idx)}
                                  className="absolute top-1 right-1 text-red-600 hover:text-red-800 bg-white rounded-full p-0.5 opacity-70 group-hover:opacity-100"
                                 aria-label="Remove photo"
                             >
                                  <XCircle className="h-5 w-5" />
                             </button>
                         </div>
                     );
                })}
           </div>
       )}


      {/* Video Evidence - Custom rendering (remains the same) */}
      <FileUpload
        label="Video Evidence"
        accept="video/*"
        multiple
        value={undefined}
        onChange={(filesOrNull) => handleArrayFileUploadChange('videos', filesOrNull)}
        error={errors.evidence?.videos?.message as string}
        showPreview={false}
      />
      {videos?.map((fileOrUrl, idx) => (
        <div
          key={idx}
          className="flex items-center justify-between p-2 bg-gray-50 rounded"
        >
          <div className="flex items-center space-x-2 text-sm text-gray-600 truncate">
            {getItemIcon(fileOrUrl)}
            <span>{getItemName(fileOrUrl)}</span>
          </div>
             <button
                type="button"
                onClick={() => handleRemoveFile('videos', idx)}
                className="text-red-600 hover:text-red-800"
                aria-label="Remove video"
              >
                Remove
              </button>
        </div>
      ))}


      {/* Engineer Report - Custom rendering (remains the same) */}
      <FileUpload
        label="Engineer Report"
        accept=".pdf,.doc,.docx"
        multiple
        value={undefined}
        onChange={(filesOrNull) => handleArrayFileUploadChange('engineerReport', filesOrNull)}
        error={errors.evidence?.engineerReport?.message as string}
        showPreview={false}
      />
       {engineerReport?.map((fileOrUrl, idx) => (
        <div
          key={idx}
          className="flex items-center justify-between p-2 bg-gray-50 rounded"
        >
          <div className="flex items-center space-x-2 text-sm text-gray-600 truncate">
            {getItemIcon(fileOrUrl)}
            <span>{getItemName(fileOrUrl)}</span>
          </div>
           <button
                type="button"
                onClick={() => handleRemoveFile('engineerReport', idx)}
                className="text-red-600 hover:text-red-800"
                aria-label="Remove report"
              >
                Remove
              </button>
        </div>
      ))}

      {/* Bank Statement - Custom rendering (remains the same) */}
      <FileUpload
        label="Bank Statement"
        accept=".pdf,.jpg,.jpeg,.png"
        multiple
        value={undefined}
        onChange={(filesOrNull) => handleArrayFileUploadChange('bankStatement', filesOrNull)}
        error={errors.evidence?.bankStatement?.message as string}
        showPreview={false}
      />
       {bankStatement?.map((fileOrUrl, idx) => (
        <div
          key={idx}
          className="flex items-center justify-between p-2 bg-gray-50 rounded"
        >
          <div className="flex items-center space-x-2 text-sm text-gray-600 truncate">
             {getItemIcon(fileOrUrl)}
            <span>{getItemName(fileOrUrl)}</span>
          </div>
           <button
                type="button"
                onClick={() => handleRemoveFile('bankStatement', idx)}
                 className="text-red-600 hover:text-red-800"
                 aria-label="Remove bank statement"
              >
                Remove
              </button>
        </div>
      ))}


      {/* Additional Documents - Custom rendering (remains the same) */}
      <FileUpload
        label="Additional Documents"
        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
        multiple
        value={undefined}
        onChange={(filesOrNull) => handleArrayFileUploadChange('adminDocuments', filesOrNull)}
        error={errors.evidence?.adminDocuments?.message as string}
        showPreview={false}
      />
        {adminDocuments?.map((fileOrUrl, idx) => (
        <div
          key={idx}
          className="flex items-center justify-between p-2 bg-gray-50 rounded"
        >
          <div className="flex items-center space-x-2 text-sm text-gray-600 truncate">
             {getItemIcon(fileOrUrl)}
             <span>{getItemName(fileOrUrl)}</span>
          </div>
           <button
                type="button"
                onClick={() => handleRemoveFile('adminDocuments', idx)}
                className="text-red-600 hover:text-red-800"
                aria-label="Remove document"
              >
                Remove
              </button>
        </div>
      ))}
    </div>
  );
};

export default EvidenceUpload;