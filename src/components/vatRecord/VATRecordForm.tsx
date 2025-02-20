// src/components/vatRecord/VATRecordForm.tsx
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { addDoc, collection, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { VATRecord } from '../../types/vatRecord';
import { Customer } from '../../types/customer';
import FormField from '../ui/FormField';
import SearchableSelect from '../ui/SearchableSelect';
import TextArea from '../ui/TextArea';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

interface VATRecordFormProps {
  record?: VATRecord;
  customers: Customer[];
  onClose: () => void;
}

const VATRecordForm: React.FC<VATRecordFormProps> = ({
  record,
  customers,
  onClose
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [manualCustomer, setManualCustomer] = useState(false);

  const { register, handleSubmit, watch, setValue } = useForm({
    defaultValues: {
      receiptNo: record?.receiptNo || '',
      accountant: record?.accountant || '',
      supplier: record?.supplier || '',
      regNo: record?.regNo || '',
      description: record?.description || '',
      net: record?.net || 0,
      vatPercentage: record?.vatPercentage || 20,
      vat: record?.vat || 0,
      gross: record?.gross || 0,
      vatReceived: record?.vatReceived || 0,
      customerName: record?.customerName || '',
      customerId: record?.customerId || '',
      status: record?.status || 'awaiting',
      notes: record?.notes || '',
      date: record?.date ? new Date(record.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
    }
  });

  const net = watch('net');
  const vatPercentage = watch('vatPercentage');

  // Calculate VAT and GROSS when NET or VAT percentage changes
  useEffect(() => {
  const netValue = parseFloat(net) || 0;
  const vatPercentageValue = parseFloat(vatPercentage) || 0;
  const vat = (netValue * vatPercentageValue) / 100;
  const gross = netValue + vat;

  setValue('vat', vat.toFixed(2));
  setValue('gross', gross.toFixed(2));
}, [net, vatPercentage, setValue]);


  const onSubmit = async (data: any) => {
    if (!user) return;
    setLoading(true);

    try {
      const vatRecord = {
        ...data,
        net: parseFloat(data.net),
        vatPercentage: parseFloat(data.vatPercentage),
        vat: parseFloat(data.vat),
        gross: parseFloat(data.gross),
        vatReceived: parseFloat(data.vatReceived),
        date: new Date(data.date),
        updatedAt: new Date()
      };

      if (record) {
        await updateDoc(doc(db, 'vatRecords', record.id), vatRecord);
        toast.success('VAT record updated successfully');
      } else {
        await addDoc(collection(db, 'vatRecords'), {
          ...vatRecord,
          createdAt: new Date(),
          createdBy: user.id
        });
        toast.success('VAT record created successfully');
      }

      onClose();
    } catch (error) {
      console.error('Error saving VAT record:', error);
      toast.error('Failed to save VAT record');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <FormField
          label="Receipt No"
          {...register('receiptNo')}
          required
        />
        <FormField
          label="Accountant"
          {...register('accountant')}
          required
        />
        <FormField
          label="Supplier"
          {...register('supplier')}
          required
        />
        <FormField
          label="REG No"
          {...register('regNo')}
          required
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <FormField
          type="number"
          label="NET"
          {...register('net')}
          required
          step="0.01"
          min="0"
        />
        <FormField
          type="number"
          label="VAT Percentage"
          {...register('vatPercentage')}
          required
          step="0.01"
          min="0"
          max="100"
        />
        <FormField
          type="number"
          label="VAT Received"
          {...register('vatReceived')}
          step="0.01"
          min="0"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField
          type="number"
          label="VAT"
          value={watch('vat')}
          disabled
        />
        <FormField
          type="number"
          label="GROSS"
          value={watch('gross')}
          disabled
        />
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-gray-700">Customer</label>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={manualCustomer}
              onChange={(e) => setManualCustomer(e.target.checked)}
              className="rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span className="text-sm text-gray-700">Enter Manually</span>
          </label>
        </div>

        {manualCustomer ? (
          <FormField
            label="Customer Name"
            {...register('customerName')}
            required
          />
        ) : (
          <SearchableSelect
            label="Select Customer"
            options={customers.map(c => ({
              id: c.id,
              label: c.name,
              subLabel: `${c.mobile} - ${c.email}`
            }))}
            value={watch('customerId')}
            onChange={(id) => {
              const customer = customers.find(c => c.id === id);
              if (customer) {
                setValue('customerId', customer.id);
                setValue('customerName', customer.name);
              }
            }}
            placeholder="Search customers..."
          />
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Status</label>
        <select
          {...register('status')}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
        >
          <option value="awaiting">Awaiting</option>
          <option value="processing">Processing</option>
          <option value="paid">Paid</option>
        </select>
      </div>

      <TextArea
        label="Description"
        {...register('description')}
        required
      />

      <FormField
        type="date"
        label="Date"
        {...register('date')}
        required
      />

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md hover:bg-primary-600"
        >
          {loading ? 'Saving...' : record ? 'Update Record' : 'Create Record'}
        </button>
      </div>
    </form>
  );
};

export default VATRecordForm;
