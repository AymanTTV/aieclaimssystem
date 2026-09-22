import React from 'react';
import { useFormContext } from 'react-hook-form';
import FormField from '../../../ui/FormField';
import TextArea from '../../../ui/TextArea';
import SignaturePad from '../../../ui/SignaturePad';
import SearchableSelect from '../../../ui/SearchableSelect';
import { useCustomers } from '../../../../hooks/useCustomers';
import { collection, getDocs, or, query, where } from 'firebase/firestore';
import { db } from '../../../../lib/firebase';

const DriverDetails = () => {
  const { register, formState: { errors }, setValue, watch, setError, clearErrors } = useFormContext();
  const { customers } = useCustomers();
  const [manualEntry, setManualEntry] = React.useState(false);
  const signature = watch('clientInfo.signature');
  const claimReason: string[] = watch('claimReason') || [];

  const handleCustomerSelect = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    if (customer) {
      clearErrors(['clientInfo.email', 'clientInfo.phone']); // Clear errors on select
      setValue('clientInfo.name', customer.name);
      setValue('clientInfo.phone', customer.mobile);
      setValue('clientInfo.email', customer.email);
      setValue('clientInfo.dateOfBirth', customer.dateOfBirth ? customer.dateOfBirth.toISOString().slice(0,10) : '');
      setValue('clientInfo.nationalInsuranceNumber', customer.nationalInsuranceNumber);
      setValue('clientInfo.address', customer.address);
      setValue('clientInfo.signature', customer.signature || '');
    }
  };

  // Function to check for existing customers on blur
  const checkForExistingCustomer = async () => {
    if (!manualEntry) return;

    const email = watch('clientInfo.email')?.trim();
    const phone = watch('clientInfo.phone')?.trim();

    if (!email && !phone) {
        clearErrors(['clientInfo.email', 'clientInfo.phone']);
        return;
    }

    const customersRef = collection(db, 'customers');
    const queryConstraints = [];
    if (email) queryConstraints.push(where('email', '==', email));
    if (phone) queryConstraints.push(where('mobile', '==', phone));
    
    if (queryConstraints.length === 0) return;

    const q = query(customersRef, or(...queryConstraints));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const existingCustomer = querySnapshot.docs[0].data();
      const message = `Customer "${existingCustomer.name}" already exists. Please select them from the search list above.`;
      setError('clientInfo.email', { type: 'manual_conflict', message });
      setError('clientInfo.phone', { type: 'manual_conflict', message });
    } else {
      clearErrors(['clientInfo.email', 'clientInfo.phone']);
    }
  };

  const showPIFields = claimReason.includes('PI');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-gray-200">
        <h3 className="text-lg font-bold text-gray-950">Client / Driver Details</h3>
        <label className="flex items-center space-x-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={manualEntry}
            onChange={e => {
                setManualEntry(e.target.checked);
                if (!e.target.checked) {
                    clearErrors(['clientInfo.email', 'clientInfo.phone']);
                }
            }}
            className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
          />
          <span className="text-sm font-semibold text-gray-900">Enter Details Manually</span>
        </label>
      </div>

      {!manualEntry && (
        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
          <SearchableSelect
            label="Select Existing Customer (Auto-fills Driver Info)"
            variant="light"
            options={customers.map(c => ({
              id: c.id, label: c.name, subLabel: `${c.mobile} · ${c.email}`
            }))}
            value=""
            onChange={handleCustomerSelect}
            placeholder="Search customers by name, phone or email..."
          />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Name */}
        <FormField
          label="Full Name"
          error={errors.clientInfo?.name?.message as string}
          {...register('clientInfo.name')}
          required
          disabled={!manualEntry}
        />

        {/* Address */}
        <FormField
          label="Full Address"
          error={errors.clientInfo?.address?.message as string}
          {...register('clientInfo.address')}
          required
          disabled={!manualEntry}
        />

        {/* Phone */}
        <FormField
          type="tel"
          label="Phone Number"
          error={errors.clientInfo?.phone?.message as string}
          {...register('clientInfo.phone')}
          required
          disabled={!manualEntry}
          onBlur={checkForExistingCustomer}
        />

        {/* Email */}
        <FormField
          type="email"
          label="Email Address"
          error={errors.clientInfo?.email?.message as string}
          {...register('clientInfo.email')}
          required
          disabled={!manualEntry}
          onBlur={checkForExistingCustomer}
        />

        {/* DOB */}
        <FormField
          type="date"
          label="Date of Birth"
          error={errors.clientInfo?.dateOfBirth?.message as string}
          {...register('clientInfo.dateOfBirth')}
          required
          disabled={!manualEntry}
        />

        {/* NI Number */}
        <FormField
          label="National Insurance Number"
          error={errors.clientInfo?.nationalInsuranceNumber?.message as string}
          {...register('clientInfo.nationalInsuranceNumber')}
          required
          disabled={!manualEntry}
        />

        {showPIFields && (
          <>
            <FormField
              label="Occupation"
              error={errors.clientInfo?.occupation?.message as string}
              {...register('clientInfo.occupation')}
              required
            />

            <div className="col-span-1 md:col-span-2">
              <TextArea
                label="Injury Details"
                error={errors.clientInfo?.injuryDetails?.message as string}
                {...register('clientInfo.injuryDetails')}
                required
                rows={4}
                placeholder="Describe the injuries sustained in detail…"
              />
            </div>
          </>
        )}
      </div>

      {/* Signature */}
      <div className="pt-2 border-t border-gray-100">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <label className="block text-sm font-bold text-gray-950">
            Driver Signature
          </label>
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-red-100 text-red-800 border border-red-300 shadow-2xs shrink-0">
            <span className="text-red-600 font-black text-xs leading-none">*</span> Must fill in
          </span>
        </div>
        <div className="bg-white border-2 border-dashed border-gray-300 rounded-xl p-2 hover:border-primary/50 transition-colors">
          <SignaturePad
            value={signature || ''}
            onChange={value => setValue('clientInfo.signature', value)}
            className="w-full h-36"
          />
        </div>
        {errors.clientInfo?.signature && (
          <p className="mt-1.5 text-xs font-semibold text-red-600 flex items-center gap-1">
            <span>⚠️</span> {errors.clientInfo.signature.message as string}
          </p>
        )}
      </div>
    </div>
  );
};

export default DriverDetails;