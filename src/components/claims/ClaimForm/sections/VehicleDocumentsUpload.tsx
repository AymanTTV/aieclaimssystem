// src/components/claims/ClaimForm/sections/VehicleDocumentsUpload.tsx
import React from 'react';
import { useFormContext } from 'react-hook-form';
import FileUpload from '../../../ui/FileUpload';
import { FileText, Info } from 'lucide-react';

const VehicleDocumentsUpload: React.FC = () => {
  const {
    formState: { errors },
    setValue,
    watch,
  } = useFormContext();

  const documents = watch('clientVehicle.documents') || {};
  const regNumber = watch('clientVehicle.registration');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-gray-100">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Vehicle Documents
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            {regNumber ? (
              <span>
                Upload compliance and licensing documentation for{' '}
                <strong className="text-primary font-bold">{regNumber.toUpperCase()}</strong>.
              </span>
            ) : (
              <span>
                Upload driver license copies, logbook (V5C), NSL, and insurance certificates.
              </span>
            )}
          </p>
        </div>
        <div className="inline-flex items-center gap-1.5 text-xs bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full border border-blue-200 flex-shrink-0">
          <Info className="w-3.5 h-3.5 flex-shrink-0" />
          <span>Documents can be uploaded now or updated later</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FileUpload
          label="License Front"
          accept=".pdf,image/*"
          multiple={false}
          value={documents.licenseFront}
          onChange={(files) =>
            setValue('clientVehicle.documents.licenseFront', files?.[0] || null, {
              shouldDirty: true,
            })
          }
          onRemove={() =>
            setValue('clientVehicle.documents.licenseFront', null, {
              shouldDirty: true,
              shouldValidate: true,
            })
          }
          error={errors.clientVehicle?.documents?.licenseFront?.message as string}
        />

        <FileUpload
          label="License Back"
          accept=".pdf,image/*"
          multiple={false}
          value={documents.licenseBack}
          onChange={(files) =>
            setValue('clientVehicle.documents.licenseBack', files?.[0] || null, {
              shouldDirty: true,
            })
          }
          onRemove={() =>
            setValue('clientVehicle.documents.licenseBack', null, {
              shouldDirty: true,
              shouldValidate: true,
            })
          }
          error={errors.clientVehicle?.documents?.licenseBack?.message as string}
        />

        <FileUpload
          label="Log Book (V5C)"
          accept=".pdf,image/*"
          multiple={false}
          value={documents.logBook}
          onChange={(files) =>
            setValue('clientVehicle.documents.logBook', files?.[0] || null, {
              shouldDirty: true,
            })
          }
          onRemove={() =>
            setValue('clientVehicle.documents.logBook', null, {
              shouldDirty: true,
              shouldValidate: true,
            })
          }
          error={errors.clientVehicle?.documents?.logBook?.message as string}
        />

        <FileUpload
          label="Vehicle License / NSL"
          accept=".pdf,image/*"
          multiple={false}
          value={documents.nsl}
          onChange={(files) =>
            setValue('clientVehicle.documents.nsl', files?.[0] || null, {
              shouldDirty: true,
            })
          }
          onRemove={() =>
            setValue('clientVehicle.documents.nsl', null, {
              shouldDirty: true,
              shouldValidate: true,
            })
          }
          error={errors.clientVehicle?.documents?.nsl?.message as string}
        />

        <FileUpload
          label="Insurance Certificate"
          accept=".pdf,image/*"
          multiple={false}
          value={documents.insuranceCertificate}
          onChange={(files) =>
            setValue('clientVehicle.documents.insuranceCertificate', files?.[0] || null, {
              shouldDirty: true,
            })
          }
          onRemove={() =>
            setValue('clientVehicle.documents.insuranceCertificate', null, {
              shouldDirty: true,
              shouldValidate: true,
            })
          }
          error={errors.clientVehicle?.documents?.insuranceCertificate?.message as string}
        />

        <FileUpload
          label="TfL Bill / Licensing Bill"
          accept=".pdf,image/*"
          multiple={false}
          value={documents.tflBill}
          onChange={(files) =>
            setValue('clientVehicle.documents.tflBill', files?.[0] || null, {
              shouldDirty: true,
            })
          }
          onRemove={() =>
            setValue('clientVehicle.documents.tflBill', null, {
              shouldDirty: true,
              shouldValidate: true,
            })
          }
          error={errors.clientVehicle?.documents?.tflBill?.message as string}
        />
      </div>
    </div>
  );
};

export default VehicleDocumentsUpload;
