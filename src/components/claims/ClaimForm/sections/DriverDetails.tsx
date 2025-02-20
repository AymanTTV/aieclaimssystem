// src/components/claims/ClaimForm/sections/DriverDetails.tsx

import React from 'react';
import { useFormContext } from 'react-hook-form';
import FormField from '../../../ui/FormField';
import SignaturePad from '../../../ui/SignaturePad';
import SearchableSelect from '../../../ui/SearchableSelect';
import { useCustomers } from '../../../../hooks/useCustomers';

const DriverDetails = () => {
  const { register, formState: { errors }, setValue, watch } = useFormContext();
  const { customers } = useCustomers();
  const [manualEntry, setManualEntry] = React.useState(false);
  const signature = watch('clientInfo.signature');

  const handleCustomerSelect = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    if (customer) {
      setValue('clientInfo.name', customer.name);
      setValue('clientInfo.phone', customer.mobile);
      setValue('clientInfo.email', customer.email);
      setValue('clientInfo.dateOfBirth', customer.dateOfBirth.toISOString().split('T')[0]);
      setValue('clientInfo.nationalInsuranceNumber', customer.nationalInsuranceNumber);
      setValue('clientInfo.address', customer.address);
      setValue('clientInfo.signature', customer.signature || '');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Client Details</h3>
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={manualEntry}
            onChange={(e) => {
              setManualEntry(e.target.checked);
              if (!e.target.checked) {
                // Clear form fields when switching back to search
                setValue('clientInfo.name', '');
                setValue('clientInfo.phone', '');
                setValue('clientInfo.email', '');
                setValue('clientInfo.dateOfBirth', '');
                setValue('clientInfo.nationalInsuranceNumber', '');
                setValue('clientInfo.address', '');
                setValue('clientInfo.signature', '');
              }
            }}
            className="rounded border-gray-300 text-primary focus:ring-primary"
          />
          <span className="text-sm text-gray-700">Enter Details Manually</span>
        </label>
      </div>

      {/* Always show search if not in manual entry mode */}
      {!manualEntry && (
        <div className="mb-4">
          <SearchableSelect
            label="Select Customer"
            options={customers.map(c => ({
              id: c.id,
              label: c.name,
              subLabel: `${c.mobile} - ${c.email}`
            }))}
            value=""
            onChange={handleCustomerSelect}
            placeholder="Search customers..."
          />
        </div>
      )}

      {/* Always show the form fields */}
      <div className="grid grid-cols-2 gap-4">
        <FormField
          label="Name"
          error={errors.clientInfo?.name?.message as string}
          {...register('clientInfo.name')}
          required
          disabled={!manualEntry}
        />

        <FormField
          label="Address"
          error={errors.clientInfo?.address?.message as string}
          {...register('clientInfo.address')}
          required
          disabled={!manualEntry}
        />

        <FormField
          type="tel"
          label="Phone Number"
          error={errors.clientInfo?.phone?.message as string}
          {...register('clientInfo.phone')}
          required
          disabled={!manualEntry}
        />

        <FormField
          type="email"
          label="Email"
          error={errors.clientInfo?.email?.message as string}
          {...register('clientInfo.email')}
          required
          disabled={!manualEntry}
        />

        <FormField
          type="date"
          label="Date of Birth"
          error={errors.clientInfo?.dateOfBirth?.message as string}
          {...register('clientInfo.dateOfBirth')}
          required
          disabled={!manualEntry}
        />

        <FormField
          label="National Insurance Number"
          error={errors.clientInfo?.nationalInsuranceNumber?.message as string}
          {...register('clientInfo.nationalInsuranceNumber')}
          required
          disabled={!manualEntry}
        />
      </div>

      {/* Signature Section */}
      <div className="col-span-2">
        <label className="block text-sm font-medium text-gray-700">
          Driver Signature
        </label>
        <SignaturePad
          value={signature || ''}
          onChange={(value) => setValue('clientInfo.signature', value)}
          className="mt-1 border rounded-md"
        />
        {errors.clientInfo?.signature && (
          <p className="mt-1 text-sm text-red-600">
            {errors.clientInfo.signature.message as string}
          </p>
        )}
      </div>
    </div>
  );
};

export default DriverDetails;
