import React from 'react';
import { useFormContext } from 'react-hook-form';
import FormField from '../../../ui/FormField';
import FileUpload from '../../../ui/FileUpload'; // Use the updated FileUpload

const VehicleDetails = () => {
  const { register, formState: { errors }, setValue, watch } = useFormContext();
  const documents = watch('clientVehicle.documents') || {};

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900"> Client Vehicle Details</h3>
      <div className="grid grid-cols-2 gap-4">
        <FormField
          label="Registration Number"
          error={errors.clientVehicle?.registration?.message as string}
          {...register('clientVehicle.registration')}

        />

        <FormField
          type="date"
          label="MOT Expiry"
          error={errors.clientVehicle?.motExpiry?.message as string}
          {...register('clientVehicle.motExpiry')}

        />

        <FormField
          type="date"
          label="Road Tax Expiry"
          error={errors.clientVehicle?.roadTaxExpiry?.message as string}
          {...register('clientVehicle.roadTaxExpiry')}

        />
      </div>

      {/* Document Uploads */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-gray-900">Documents</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4"> {/* Made grid responsive */}
          <FileUpload
              label="License Front"
              accept=".pdf,image/*"
              multiple={false} // Explicitly state it's a single file upload
              value={documents.licenseFront} // Value is File | string | null
              onChange={(files) => setValue('clientVehicle.documents.licenseFront', files?.[0] || null)} // onChange receives File[], set single File | null
               // --- Add onRemove prop ---
              onRemove={() => {
                console.log('Removing License Front');
                setValue('clientVehicle.documents.licenseFront', null, { shouldDirty: true, shouldValidate: true });
              }}
              error={errors.clientVehicle?.documents?.licenseFront?.message as string}
            />

          <FileUpload
            label="License Back"
            accept=".pdf,image/*"
            multiple={false}
            value={documents.licenseBack}
            onChange={(files) => setValue('clientVehicle.documents.licenseBack', files?.[0] || null)}
             // --- Add onRemove prop ---
            onRemove={() => {
                console.log('Removing License Back');
                setValue('clientVehicle.documents.licenseBack', null, { shouldDirty: true, shouldValidate: true });
            }}
            error={errors.clientVehicle?.documents?.licenseBack?.message as string}
          />

          <FileUpload
            label="Log Book"
            accept=".pdf,image/*"
            multiple={false}
            value={documents.logBook}
            onChange={(files) => setValue('clientVehicle.documents.logBook', files?.[0] || null)}
             // --- Add onRemove prop ---
            onRemove={() => {
                 console.log('Removing Log Book');
                 setValue('clientVehicle.documents.logBook', null, { shouldDirty: true, shouldValidate: true });
            }}
            error={errors.clientVehicle?.documents?.logBook?.message as string}
          />

          <FileUpload
            label="NSL"
            accept=".pdf,image/*"
            multiple={false}
            value={documents.nsl}
            onChange={(files) => setValue('clientVehicle.documents.nsl', files?.[0] || null)}
             // --- Add onRemove prop ---
            onRemove={() => {
                 console.log('Removing NSL');
                 setValue('clientVehicle.documents.nsl', null, { shouldDirty: true, shouldValidate: true });
            }}
            error={errors.clientVehicle?.documents?.nsl?.message as string}
          />

          <FileUpload
            label="Insurance Certificate"
            accept=".pdf,image/*"
            multiple={false}
            value={documents.insuranceCertificate}
            onChange={(files) => setValue('clientVehicle.documents.insuranceCertificate', files?.[0] || null)}
             // --- Add onRemove prop ---
            onRemove={() => {
                 console.log('Removing Insurance Certificate');
                 setValue('clientVehicle.documents.insuranceCertificate', null, { shouldDirty: true, shouldValidate: true });
            }}
            error={errors.clientVehicle?.documents?.insuranceCertificate?.message as string}
          />

          <FileUpload
            label="TfL Bill"
            accept=".pdf,image/*"
            multiple={false}
            value={documents.tflBill}
            onChange={(files) => setValue('clientVehicle.documents.tflBill', files?.[0] || null)}
             // --- Add onRemove prop ---
            onRemove={() => {
                 console.log('Removing TfL Bill');
                 setValue('clientVehicle.documents.tflBill', null, { shouldDirty: true, shouldValidate: true });
            }}
            error={errors.clientVehicle?.documents?.tflBill?.message as string}
          />
        </div>
      </div>
    </div>
  );
};

export default VehicleDetails;