// src/components/claims/ClaimForm/sections/VehicleDetails.tsx
import React, { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import FormField from '../../../ui/FormField';
import FileUpload from '../../../ui/FileUpload';
import SearchableSelect from '../../../ui/SearchableSelect';
import { useVehicles } from '../../../../hooks/useVehicles';

const formatDateForInput = (d?: Date | null) => {
  if (!d || isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
};

interface VehicleDetailsProps {
  hideDocuments?: boolean;
}

const VehicleDetails: React.FC<VehicleDetailsProps> = ({ hideDocuments = false }) => {
  const { register, formState: { errors }, setValue, watch } = useFormContext();
  const documents = watch('clientVehicle.documents') || {};
  
  // Watch submitterType to toggle the auto-select feature
  const submitterType = watch('submitterType');
  const currentRegistration = watch('clientVehicle.registration');

  const [isAutoSelect, setIsAutoSelect] = useState(false);
  const { vehicles, loading: vehiclesLoading } = useVehicles();

  // Prepare vehicle options for the SearchableSelect
  const vehicleOptions = vehicles
    .filter(v => v.registrationNumber)
    .map(v => ({
      id: v.id,
      label: v.registrationNumber.toUpperCase(),
      subLabel: `${v.make || ''} ${v.model || ''}`.trim()
    }));

  // Auto-fill logic when a vehicle is selected
  const handleVehicleSelect = (vehicleId: string) => {
    const selected = vehicles.find(v => v.id === vehicleId);
    if (selected) {
      setValue('clientVehicle.registration', selected.registrationNumber, { shouldValidate: true, shouldDirty: true });
      setValue('clientVehicle.motExpiry', formatDateForInput(selected.motExpiry), { shouldValidate: true, shouldDirty: true });
      setValue('clientVehicle.roadTaxExpiry', formatDateForInput(selected.roadTaxExpiry), { shouldValidate: true, shouldDirty: true });
      setValue('clientVehicle.nslExpiry', formatDateForInput(selected.nslExpiry), { shouldValidate: true, shouldDirty: true });
      setValue('clientVehicle.insuranceExpiry', formatDateForInput(selected.insuranceExpiry), { shouldValidate: true, shouldDirty: true });
    } else {
      setValue('clientVehicle.registration', '');
    }
  };

  // Find the selected vehicle ID to keep the SearchableSelect synced
  const selectedVehicleId = vehicles.find(v => 
    v.registrationNumber?.toLowerCase() === currentRegistration?.toLowerCase()
  )?.id || '';

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Client Vehicle Details</h3>
        
        {/* Toggle Button for Company Submitter */}
        {submitterType === 'company' && (
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
              checked={isAutoSelect}
              onChange={(e) => setIsAutoSelect(e.target.checked)}
            />
            <span className="text-sm font-medium text-gray-700">Auto Select from Fleet</span>
          </label>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          {isAutoSelect ? (
            <SearchableSelect
              label="Registration Number"
              options={vehicleOptions}
              value={selectedVehicleId}
              onChange={(val) => handleVehicleSelect(val as string)}
              placeholder={vehiclesLoading ? "Loading fleet vehicles..." : "Search fleet..."}
              error={errors.clientVehicle?.registration?.message as string}
              isClearable
            />
          ) : (
            <FormField
              label="Registration Number"
              error={errors.clientVehicle?.registration?.message as string}
              {...register('clientVehicle.registration')}
            />
          )}
        </div>

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

        <FormField
          type="date"
          label="Vehicle License Expiry (NSL)"
          error={errors.clientVehicle?.nslExpiry?.message as string}
          {...register('clientVehicle.nslExpiry')}
        />

        <FormField
          type="date"
          label="Insurance Expiry"
          error={errors.clientVehicle?.insuranceExpiry?.message as string}
          {...register('clientVehicle.insuranceExpiry')}
        />
      </div>

      {/* Document Uploads */}
      {!hideDocuments && (
        <div className="space-y-4 pt-4 border-t border-gray-100">
          <h4 className="text-sm font-medium text-gray-900">Documents</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FileUpload
              label="License Front"
              accept=".pdf,image/*"
              multiple={false}
              value={documents.licenseFront}
              onChange={(files) => setValue('clientVehicle.documents.licenseFront', files?.[0] || null)}
              onRemove={() => {
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
              onRemove={() => {
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
              onRemove={() => {
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
              onRemove={() => {
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
              onRemove={() => {
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
              onRemove={() => {
                setValue('clientVehicle.documents.tflBill', null, { shouldDirty: true, shouldValidate: true });
              }}
              error={errors.clientVehicle?.documents?.tflBill?.message as string}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default VehicleDetails;