// src/components/claims/ClaimForm/sections/RegisterKeeperDetails.tsx
import React from 'react';
import { useFormContext } from 'react-hook-form';
import FormField from '../../../ui/FormField';
import SignaturePad from '../../../ui/SignaturePad';
import SearchableSelect from '../../../ui/SearchableSelect';
import { useCustomers } from '../../../../hooks/useCustomers';

const RegisterKeeperDetails: React.FC = () => {
  const {
    register,
    formState: { errors },
    watch,
    setValue,
  } = useFormContext();

  // Safely watch the entire object; RHF defaultValues ensure it's defined.
  const keeper = watch('registerKeeper')!;
  const enabled = keeper.enabled;
  const signature = keeper.signature;

  const { customers } = useCustomers();
  const [manual, setManual] = React.useState(false);

  const handleSelect = (id: string) => {
    const c = customers.find(c => c.id === id);
    if (!c) return;
    setValue('registerKeeper.name', c.name);
    setValue('registerKeeper.address', c.address);
    setValue('registerKeeper.phone', c.mobile);
    setValue('registerKeeper.email', c.email);
    setValue(
      'registerKeeper.dateOfBirth',
      c.dateOfBirth.toISOString().slice(0, 10)
    );
    setValue('registerKeeper.signature', c.signature || '');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Register Keeper</h3>
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            {...register('registerKeeper.enabled')}
            className="rounded border-gray-300 text-primary focus:ring-primary"
          />
          <span>Enable</span>
        </label>
      </div>

      {enabled && (
        <>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={manual}
              onChange={e => setManual(e.target.checked)}
              className="rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span>Enter Manually</span>
          </label>

          {!manual && (
            <div className="mb-4">
              <SearchableSelect
                label="Search Existing Customer"
                options={customers.map(c => ({
                  id: c.id,
                  label: c.name,
                  subLabel: c.email,
                }))}
                onChange={handleSelect}
                placeholder="Select a customer…"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <FormField
              label="Name"
              error={errors.registerKeeper?.name?.message as string}
              {...register('registerKeeper.name')}
              disabled={!manual}
            />
            <FormField
              label="Address"
              error={errors.registerKeeper?.address?.message as string}
              {...register('registerKeeper.address')}
              disabled={!manual}
            />
            <FormField
              label="Phone"
              error={errors.registerKeeper?.phone?.message as string}
              {...register('registerKeeper.phone')}
              disabled={!manual}
            />
            <FormField
              type="email"
              label="Email"
              error={errors.registerKeeper?.email?.message as string}
              {...register('registerKeeper.email')}
              disabled={!manual}
            />
            <FormField
              type="date"
              label="Date of Birth / Established"
              error={errors.registerKeeper?.dateOfBirth?.message as string}
              {...register('registerKeeper.dateOfBirth')}
              disabled={!manual}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Signature
            </label>
            <SignaturePad
              value={signature}
              onChange={v => setValue('registerKeeper.signature', v)}
              className="mt-1 border rounded-md"
            />
            {errors.registerKeeper?.signature?.message && (
              <p className="mt-1 text-sm text-red-600">
                {errors.registerKeeper.signature.message}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default RegisterKeeperDetails;
