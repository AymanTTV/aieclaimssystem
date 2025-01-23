// src/components/claims/ClaimForm/sections/EvidenceUpload.tsx

import React from 'react';
import { useFormContext } from 'react-hook-form';
import FileUpload from '../../../ui/FileUpload';
import { FileText } from 'lucide-react';

const EvidenceUpload = () => {
  const { formState: { errors }, setValue, watch } = useFormContext();
  const evidence = watch('evidence');

  const handleFileChange = (type: string, files: File[] | null) => {
    if (!files) return;
    
    // If it's engineerReport or bankStatement, handle as array
    if (type === 'engineerReport' || type === 'bankStatement') {
      setValue(`evidence.${type}`, files);
    } else {
      // For other types, append to existing array
      const existingFiles = evidence?.[type] || [];
      setValue(`evidence.${type}`, [...existingFiles, ...files]);
    }
  };

  // Handle file removal
  const handleFileRemove = (type: string, index: number) => {
    const files = evidence?.[type] || [];
    const updatedFiles = files.filter((_, i) => i !== index);
    setValue(`evidence.${type}`, updatedFiles);
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900">Evidence & Documents</h3>

      {/* Images */}
      <div className="space-y-4">
        <FileUpload
          label="Incident Images"
          accept="image/*"
          multiple
          value={evidence?.images}
          onChange={(files) => handleFileChange('images', files)}
          error={errors.evidence?.images?.message as string}
          showPreview
          onRemove={(index) => handleFileRemove('images', index)}
        />
      </div>

      {/* Videos */}
      <div className="space-y-4">
        <FileUpload
          label="Video Evidence"
          accept="video/*"
          multiple
          value={evidence?.videos}
          onChange={(files) => handleFileChange('videos', files)}
          error={errors.evidence?.videos?.message as string}
          showPreview={false}
          onRemove={(index) => handleFileRemove('videos', index)}
        />
        {/* Show uploaded video files */}
        {evidence?.videos?.length > 0 && (
          <div className="mt-2 space-y-2">
            {evidence.videos.map((file: File, index: number) => (
              <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <FileText className="h-4 w-4" />
                  <span>{file.name}</span>
                  <span className="text-gray-400">({(file.size / (1024 * 1024)).toFixed(2)} MB)</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleFileRemove('videos', index)}
                  className="text-red-600 hover:text-red-800"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Engineer Report */}
      <div className="space-y-4">
        <FileUpload
          label="Engineer Report"
          accept=".pdf,.doc,.docx"
          multiple
          value={evidence?.engineerReport}
          onChange={(files) => handleFileChange('engineerReport', files)}
          error={errors.evidence?.engineerReport?.message as string}
          showPreview={false}
          onRemove={(index) => handleFileRemove('engineerReport', index)}
        />
        {/* Show uploaded engineer report files */}
        {evidence?.engineerReport?.length > 0 && (
          <div className="mt-2 space-y-2">
            {evidence.engineerReport.map((file: File, index: number) => (
              <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <FileText className="h-4 w-4" />
                  <span>{file.name}</span>
                  <span className="text-gray-400">({(file.size / (1024 * 1024)).toFixed(2)} MB)</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleFileRemove('engineerReport', index)}
                  className="text-red-600 hover:text-red-800"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bank Statement */}
      <div className="space-y-4">
        <FileUpload
          label="Bank Statement"
          accept=".pdf,.jpg,.jpeg,.png"
          multiple
          value={evidence?.bankStatement}
          onChange={(files) => handleFileChange('bankStatement', files)}
          error={errors.evidence?.bankStatement?.message as string}
          showPreview={false}
          onRemove={(index) => handleFileRemove('bankStatement', index)}
        />
        {/* Show uploaded bank statement files */}
        {evidence?.bankStatement?.length > 0 && (
          <div className="mt-2 space-y-2">
            {evidence.bankStatement.map((file: File, index: number) => (
              <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <FileText className="h-4 w-4" />
                  <span>{file.name}</span>
                  <span className="text-gray-400">({(file.size / (1024 * 1024)).toFixed(2)} MB)</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleFileRemove('bankStatement', index)}
                  className="text-red-600 hover:text-red-800"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Additional Documents */}
      <div className="space-y-4">
        <FileUpload
          label="Additional Documents"
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
          multiple
          value={evidence?.adminDocuments}
          onChange={(files) => handleFileChange('adminDocuments', files)}
          error={errors.evidence?.adminDocuments?.message as string}
          showPreview={false}
          onRemove={(index) => handleFileRemove('adminDocuments', index)}
        />
        {/* Show uploaded additional documents */}
        {evidence?.adminDocuments?.length > 0 && (
          <div className="mt-2 space-y-2">
            {evidence.adminDocuments.map((file: File, index: number) => (
              <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <FileText className="h-4 w-4" />
                  <span>{file.name}</span>
                  <span className="text-gray-400">({(file.size / (1024 * 1024)).toFixed(2)} MB)</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleFileRemove('adminDocuments', index)}
                  className="text-red-600 hover:text-red-800"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default EvidenceUpload;
