// src/components/claims/ClaimForm/sections/VehicleDetails.tsx

import React from 'react';
import { useFormContext } from 'react-hook-form';
import FormField from '../../../ui/FormField';
import { Upload } from 'lucide-react';
import FileUpload from '../../../ui/FileUpload';

const VehicleDetails = () => {
  const { register, formState: { errors }, setValue, watch } = useFormContext();

  const documents = watch('documents');
  

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">Vehicle Details</h3>
      <div className="grid grid-cols-2 gap-4">
        <FormField
          label="Registration Number"
          error={errors.vehicleVRN?.message as string}
          {...register('vehicleVRN')}
          required
        />
        <FormField
          label="Make"
          error={errors.vehicleMake?.message as string}
          {...register('vehicleMake')}
          required
        />
        <FormField
          label="Model"
          error={errors.vehicleModel?.message as string}
          {...register('vehicleModel')}
          required
        />
        <FormField
          type="date"
          label="MOT Expiry"
          error={errors.motExpiry?.message as string}
          {...register('motExpiry')}
          required
        />
        <FormField
          type="date"
          label="Road Tax Expiry"
          error={errors.roadTaxExpiry?.message as string}
          {...register('roadTaxExpiry')}
          required
        />
      </div>

      {/* Document Uploads */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-gray-900">Documents</h4>
        <div className="grid grid-cols-2 gap-4">
          {[
            { name: 'licenseFront', label: 'License Front' },
            { name: 'licenseBack', label: 'License Back' },
            { name: 'logBook', label: 'Log Book' },
            { name: 'nsl', label: 'NSL' },
            { name: 'insuranceCertificate', label: 'Insurance Certificate' },
            { name: 'tflBill', label: 'TfL Bill' }
          ].map(doc => (
            <FileUpload
              key={doc.name}
              label={doc.label}
              accept=".pdf,image/*"
              value={documents?.[doc.name]}
              onChange={(files) => setValue(`documents.${doc.name}`, files?.[0] || null)}
              error={errors.documents?.[doc.name]?.message as string}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default VehicleDetails;

