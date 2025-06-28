// src/components/vatRecord/VATRecordForm.tsx
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { addDoc, collection, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { VATRecord, VATRecordDescription } from '../../types/vatRecord';
import { Customer } from '../../types/customer';
import FormField from '../ui/FormField';
import SearchableSelect from '../ui/SearchableSelect';
import TextArea from '../ui/TextArea';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';

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
  const [descriptions, setDescriptions] = useState<VATRecordDescription[]>(
    record?.descriptions || []
  );

  const { formatCurrency } = useFormattedDisplay();
  const [vatRecievedDisplay, setVatRecievedDisplay] = useState<number | undefined>(record?.vatReceived);
  const [formData, setFormData] = useState({
    receiptNo: record?.receiptNo || '',
    accountant: record?.accountant || '',
    supplier: record?.supplier || '',
    regNo: record?.regNo || '',
    customerName: record?.customerName || '',
    customerId: record?.customerId || '',
    vatNo: record?.vatNo || '',
    status: record?.status || 'awaiting',
    notes: record?.notes || '',
    date: record?.date ? new Date(record.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    vatReceived: record?.vatReceived !== undefined ? record.vatReceived : 0,

  });

  // Calculate totals
  const calculateTotals = () => {
    return descriptions.reduce((acc, desc) => ({
      net: acc.net + desc.net,
      vat: acc.vat + desc.vat,
      gross: acc.gross + desc.gross
    }), { net: 0, vat: 0, gross: 0 });
  };

  const addDescription = () => {
    const newDescription: VATRecordDescription = {
      id: uuidv4(),
      description: '',
      net: 0,
      includeVAT: false,
      vat: 0,
      gross: 0
    };
    setDescriptions([...descriptions, newDescription]);
  };

  const updateDescription = (id: string, updates: Partial<VATRecordDescription>) => {
    setDescriptions(prevDescriptions => 
      prevDescriptions.map(desc => {
        if (desc.id === id) {
          const updatedDesc = { ...desc, ...updates };
          // Recalculate VAT and gross if NET or includeVAT changes
          if ('net' in updates || 'includeVAT' in updates) {
            updatedDesc.vat = updatedDesc.includeVAT ? updatedDesc.net * 0.2 : 0;
            updatedDesc.gross = updatedDesc.net + updatedDesc.vat;
          }
          return updatedDesc;
        }
        return desc;
      })
    );
  };

  const removeDescription = (id: string) => {
    setDescriptions(descriptions.filter(desc => desc.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      const totals = calculateTotals();
      const vatRecord = {
        ...formData,
        descriptions,
        ...totals,
        date: new Date(formData.date),
        updatedAt: new Date(),
        vatReceived: formData.vatReceived, // Include vatReceived in the record
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
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <FormField
          label="Receipt No"
          value={formData.receiptNo}
          onChange={(e) => setFormData({ ...formData, receiptNo: e.target.value })}
          required
        />
        <FormField
          label="Accountant"
          value={formData.accountant}
          onChange={(e) => setFormData({ ...formData, accountant: e.target.value })}
          required
        />
         <FormField
          label="VAT No"
          value={formData.vatNo}
          onChange={(e) => setFormData({ ...formData, vatNo: e.target.value })}
        />
        
        <FormField
          label="REG No"
          value={formData.regNo}
          onChange={(e) => setFormData({ ...formData, regNo: e.target.value })}
          required
        />
        
        <FormField
          label="Supplier"
          value={formData.supplier}
          onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
          required
        />
      </div>


      {/* Descriptions Section */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">Descriptions</h3>
          <button
            type="button"
            onClick={addDescription}
            className="text-primary hover:text-primary-600"
          >
            Add Description
          </button>
        </div>

        

        {descriptions.map((desc) => (
          <div key={desc.id} className="bg-gray-50 p-4 rounded-lg space-y-4 border rounded">
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-1">
                <FormField
                  label="Description"
                  value={desc.description}
                  onChange={(e) => updateDescription(desc.id, { description: e.target.value })}
                  required
                />
              </div>
              <FormField
                type="number"
                label="NET"
                value={desc.net}
                onChange={(e) => updateDescription(desc.id, { net: parseFloat(e.target.value) || 0 })}
                required
                min="0"
                step="0.01"
              />
              <div className="col-span-1">
                <FormField
                  label="V"
                  value={desc.vType || ''}
                  onChange={(e) => updateDescription(desc.id, { vType: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-2">
              <div className="flex items-center space-x-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={desc.includeVAT}
                    onChange={(e) => updateDescription(desc.id, { includeVAT: e.target.checked })}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-gray-700">Include VAT (20%)</span>
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">VAT</label>
                <input
                  type="text"
                  value={desc.vat.toFixed(2)}
                  className="mt-1 block w-full rounded-md border-gray-300 bg-gray-100 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                  disabled
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">GROSS</label>
                <input
                  type="text"
                  value={desc.gross.toFixed(2)}
                  className="mt-1 block w-full rounded-md border-gray-300 bg-gray-100 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                  disabled
                />
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <button
                type="button"
                onClick={() => removeDescription(desc.id)}
                className="text-red-600 hover:text-red-800"
              >
                Remove Description
              </button>
            </div>
          </div>
        ))}
      </div>

      <FormField
        type="number"
        label="VAT Received"
        value={formData.vatReceived}
        onChange={(e) => setFormData({ ...formData, vatReceived: parseFloat(e.target.value) || 0 })}
        min="0"
        step="0.01"
      />

      {/* Totals Section */}
      <div className="bg-gray-100 p-4 rounded-lg space-y-2">
        <div className="flex justify-between text-sm">
          <span>Total NET:</span>
          <span className="font-medium">{formatCurrency(calculateTotals().net)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Total VAT:</span>
          <span className="font-medium">{formatCurrency(calculateTotals().vat)}</span>
        </div>
        
        {record && (
          <div className="flex justify-between text-sm">
            <span>VAT Received:</span>
            <span className="font-medium">{formatCurrency(formData.vatReceived)}</span>
          </div>
        )}
        <div className="flex justify-between text-sm font-bold">
          <span>Total GROSS:</span>
          <span>{formatCurrency(calculateTotals().gross)}</span>
        </div>
      </div>

      {/* Customer Section */}
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
            value={formData.customerName}
            onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
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
            value={formData.customerId}
            onChange={(id) => {
              const customer = customers.find(c => c.id === id);
              if (customer) {
                setFormData({
                  ...formData,
                  customerId: customer.id,
                  customerName: customer.name
                });
              }
            }}
            placeholder="Search customers..."
          />
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Status</label>
        <select
          value={formData.status}
          onChange={(e) => setFormData({ ...formData, status: e.target.value as VATRecord['status'] })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
        >
          <option value="awaiting">Awaiting</option>
          <option value="processing">Processing</option>
          <option value="paid">Paid</option>
        </select>
      </div>

      <TextArea
        label="Notes (Optional)"
        value={formData.notes}
        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
      />

      <FormField
        type="date"
        label="Date"
        value={formData.date}
        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
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