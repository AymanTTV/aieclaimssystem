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
      <div className="flex items-center justify-between pb-2 border-b border-gray-200">
        <div>
          <h3 className="text-lg font-bold text-gray-950">Registered Keeper (If Different from Driver)</h3>
          <p className="text-xs text-gray-700 font-medium">Enable if the registered vehicle keeper is not the client/driver.</p>
        </div>
        <label className="flex items-center space-x-2 cursor-pointer select-none bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg">
          <input
            type="checkbox"
            {...register('registerKeeper.enabled')}
            className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
          />
          <span className="text-sm font-bold text-gray-950">Enable Keeper</span>
        </label>
      </div>

      {enabled && (
        <div className="space-y-4 pt-1">
          <div className="flex items-center justify-between">
            <label className="flex items-center space-x-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={manual}
                onChange={e => setManual(e.target.checked)}
                className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
              />
              <span className="text-sm font-semibold text-gray-900">Enter Keeper Manually</span>
            </label>
          </div>

          {!manual && (
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <SearchableSelect
                label="Search Existing Customer"
                variant="light"
                options={customers.map(c => ({
                  id: c.id,
                  label: c.name,
                  subLabel: `${c.mobile} · ${c.email}`,
                }))}
                onChange={handleSelect}
                placeholder="Search registered keepers..."
              />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              label="Keeper Name"
              error={errors.registerKeeper?.name?.message as string}
              {...register('registerKeeper.name')}
              disabled={!manual}
              required
            />
            <FormField
              label="Keeper Address"
              error={errors.registerKeeper?.address?.message as string}
              {...register('registerKeeper.address')}
              disabled={!manual}
              required
            />
            <FormField
              type="tel"
              label="Keeper Phone"
              error={errors.registerKeeper?.phone?.message as string}
              {...register('registerKeeper.phone')}
              disabled={!manual}
              required
            />
            <FormField
              type="email"
              label="Keeper Email"
              error={errors.registerKeeper?.email?.message as string}
              {...register('registerKeeper.email')}
              disabled={!manual}
              required
            />
            <FormField
              type="date"
              label="Date of Birth / Established"
              error={errors.registerKeeper?.dateOfBirth?.message as string}
              {...register('registerKeeper.dateOfBirth')}
              disabled={!manual}
              required
            />
          </div>

          <div className="pt-2 border-t border-gray-100">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <label className="block text-sm font-bold text-gray-950">
                Keeper Signature
              </label>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-red-100 text-red-800 border border-red-300 shadow-2xs shrink-0">
                <span className="text-red-600 font-black text-xs leading-none">*</span> Must fill in
              </span>
            </div>
            <div className="bg-white border-2 border-dashed border-gray-300 rounded-xl p-2 hover:border-primary/50 transition-colors">
              <SignaturePad
                value={signature}
                onChange={v => setValue('registerKeeper.signature', v)}
                className="w-full h-36"
              />
            </div>
            {errors.registerKeeper?.signature?.message && (
              <p className="mt-1.5 text-xs font-semibold text-red-600 flex items-center gap-1">
                <span>⚠️</span> {errors.registerKeeper.signature.message}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RegisterKeeperDetails;
