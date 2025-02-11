// src/components/driverPay/DriverPayForm.tsx

import React, { useState, useEffect } from 'react';
import { addDoc, collection, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { DriverPay, CollectionPoint } from '../../types/driverPay';
import { useAuth } from '../../context/AuthContext';
import FormField from '../ui/FormField';
import TextArea from '../ui/TextArea';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

interface DriverPayFormProps {
  record?: DriverPay;
  onClose: () => void;
}

const DriverPayForm: React.FC<DriverPayFormProps> = ({ record, onClose }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    driverNo: record?.driverNo || '',
    tidNo: record?.tidNo.toString() || '',
    name: record?.name || '',
    phoneNumber: record?.phoneNumber || '',
    collection: record?.collection || 'OFFICE' as CollectionPoint,
    customCollection: record?.customCollection || '',
    startDate: record?.startDate ? format(record.startDate, 'yyyy-MM-dd') : new Date().toISOString().split('T')[0],
    endDate: record?.endDate ? format(record.endDate, 'yyyy-MM-dd') : new Date().toISOString().split('T')[0],
    totalAmount: record?.totalAmount.toString() || '',
    commissionPercentage: record?.commissionPercentage.toString() || ''
  });

  const calculateCommission = () => {
    const total = parseFloat(formData.totalAmount) || 0;
    const percentage = parseFloat(formData.commissionPercentage) || 0;
    return (total * percentage) / 100;
  };

  const calculateNetPay = () => {
    const total = parseFloat(formData.totalAmount) || 0;
    return total - calculateCommission();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      const totalAmount = parseFloat(formData.totalAmount);
      const commissionPercentage = parseFloat(formData.commissionPercentage);
      const commissionAmount = calculateCommission();
      const netPay = calculateNetPay();

      const driverPayData = {
        driverNo: formData.driverNo,
        tidNo: parseInt(formData.tidNo),
        name: formData.name,
        phoneNumber: formData.phoneNumber,
        collection: formData.collection,
        customCollection: formData.collection === 'OTHER' ? formData.customCollection : null,
        startDate: new Date(formData.startDate),
        endDate: new Date(formData.endDate),
        totalAmount,
        commissionPercentage,
        commissionAmount,
        netPay,
        updatedAt: new Date()
      };

      if (record) {
        // Update existing record
        await updateDoc(doc(db, 'driverPay', record.id), {
          ...driverPayData,
          // Preserve existing payment-related fields
          paidAmount: record.paidAmount,
          remainingAmount: netPay - record.paidAmount,
          status: record.paidAmount >= netPay ? 'paid' : 
                 record.paidAmount > 0 ? 'partially_paid' : 'unpaid',
          payments: record.payments
        });
        toast.success('Driver pay record updated successfully');
      } else {
        // Create new record
        await addDoc(collection(db, 'driverPay'), {
          ...driverPayData,
          paidAmount: 0,
          remainingAmount: netPay,
          status: 'unpaid' as const,
          createdBy: user.id,
          createdAt: new Date(),
          payments: []
        });
        toast.success('Driver pay record created successfully');
      }

      onClose();
    } catch (error) {
      console.error('Error saving driver pay record:', error);
      toast.error(`Failed to ${record ? 'update' : 'create'} driver pay record`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <FormField
          label="Driver No"
          value={formData.driverNo}
          onChange={(e) => setFormData({ ...formData, driverNo: e.target.value })}
          required
        />

        <FormField
          type="number"
          label="TID No"
          value={formData.tidNo}
          onChange={(e) => setFormData({ ...formData, tidNo: e.target.value })}
          required
        />

        <FormField
          label="Name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />

        <FormField
          type="tel"
          label="Phone Number"
          value={formData.phoneNumber}
          onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
          required
        />

        <div>
          <label className="block text-sm font-medium text-gray-700">Collection Point</label>
          <select
            value={formData.collection}
            onChange={(e) => setFormData({ ...formData, collection: e.target.value as CollectionPoint })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
            required
          >
            <option value="OFFICE">OFFICE</option>
            <option value="CC">CC</option>
            <option value="ABDULAZIZ">ABDULAZIZ</option>
            <option value="OTHER">OTHER</option>
          </select>
        </div>

        {formData.collection === 'OTHER' && (
          <FormField
            label="Custom Collection Point"
            value={formData.customCollection}
            onChange={(e) => setFormData({ ...formData, customCollection: e.target.value })}
            required
          />
        )}

        <FormField
          type="date"
          label="Start Date"
          value={formData.startDate}
          onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
          required
        />

        <FormField
          type="date"
          label="End Date"
          value={formData.endDate}
          onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
          required
          min={formData.startDate}
        />

        <FormField
          type="number"
          label="Total Amount"
          value={formData.totalAmount}
          onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })}
          required
          min="0"
          step="0.01"
        />

        <FormField
          type="number"
          label="Commission Percentage"
          value={formData.commissionPercentage}
          onChange={(e) => setFormData({ ...formData, commissionPercentage: e.target.value })}
          required
          min="0"
          max="100"
          step="0.01"
        />
      </div>

      {/* Summary Section */}
      {formData.totalAmount && formData.commissionPercentage && (
        <div className="bg-gray-50 p-4 rounded-lg space-y-2">
          <div className="flex justify-between text-sm">
            <span>Total Amount:</span>
            <span className="font-medium">£{parseFloat(formData.totalAmount).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Commission ({formData.commissionPercentage}%):</span>
            <span className="text-yellow-600">£{calculateCommission().toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm font-medium pt-2 border-t">
            <span>Net Pay:</span>
            <span className="text-green-600">£{calculateNetPay().toFixed(2)}</span>
          </div>
        </div>
      )}

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
          {loading ? (record ? 'Updating...' : 'Creating...') : (record ? 'Update Record' : 'Create Record')}
        </button>
      </div>
    </form>
  );
};

export default DriverPayForm;
