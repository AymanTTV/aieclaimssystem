import React, { useState, useEffect } from 'react';
import { addDoc, collection, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { DriverPay, CollectionPoint } from '../../types/driverPay';
import { useAuth } from '../../context/AuthContext';
import FormField from '../ui/FormField';
import TextArea from '../ui/TextArea';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';
import { ensureValidDate } from '../../utils/dateHelpers';

interface DriverPayFormProps {
  record?: DriverPay;
  onClose: () => void;
  collectionName?: string;
}

const DriverPayForm: React.FC<DriverPayFormProps> = ({
  record,
  onClose,
  collectionName = 'driverPay'
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  // Initialize form data
  const [formData, setFormData] = useState({
    driverNo: record?.driverNo || '',
    tidNo: record?.tidNo?.toString() || '',
    name: record?.name || '',
    phoneNumber: record?.phoneNumber || '',
    collection: record?.collection || 'OFFICE' as CollectionPoint,
    customCollection: record?.customCollection || '',
  });

  // Initialize payment periods with proper date handling
  const [periods, setPeriods] = useState<Array<{
    id?: string;
    startDate: string;
    endDate: string;
    totalAmount: string;
    commissionPercentage: string;
    notes?: string;
  }>>(() => {
    if (record?.paymentPeriods?.length) {
      return record.paymentPeriods.map(period => ({
        id: period.id,
        startDate: format(ensureValidDate(period.startDate), 'yyyy-MM-dd'),
        endDate: format(ensureValidDate(period.endDate), 'yyyy-MM-dd'),
        totalAmount: period.totalAmount.toString(),
        commissionPercentage: period.commissionPercentage.toString(),
        notes: period.notes || '',
      }));
    }
    const today = new Date();
    return [{
      startDate: format(today, 'yyyy-MM-dd'),
      endDate: format(today, 'yyyy-MM-dd'),
      totalAmount: '',
      commissionPercentage: '6',
      notes: '',
    }];
  });

  const addPeriod = () => {
    const today = new Date();
    setPeriods([...periods, {
      id: uuidv4(),
      startDate: format(today, 'yyyy-MM-dd'),
      endDate: format(today, 'yyyy-MM-dd'),
      totalAmount: '',
      commissionPercentage: '6',
      notes: '',
    }]);
  };

  const removePeriod = (index: number) => {
    setPeriods(periods.filter((_, i) => i !== index));
  };

  const updatePeriod = (index: number, field: string, value: string) => {
    const newPeriods = [...periods];
    newPeriods[index] = { ...newPeriods[index], [field]: value };
    setPeriods(newPeriods);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      const processedPeriods = periods.map(period => {
        const totalAmount = parseFloat(period.totalAmount);
        const commissionPercentage = parseFloat(period.commissionPercentage);
  
        const commissionAmount = parseFloat(((totalAmount * commissionPercentage) / 100).toFixed(2));
        const netPay = parseFloat((totalAmount - commissionAmount).toFixed(2));
  
        if (period.id) {
          const existingPeriod = record?.paymentPeriods?.find(p => p.id === period.id);
  
          return {
            ...existingPeriod,
            startDate: new Date(period.startDate),
            endDate: new Date(period.endDate),
            totalAmount,
            commissionPercentage,
            commissionAmount,
            netPay,
            paidAmount: existingPeriod?.paidAmount || 0,
            remainingAmount: netPay - (existingPeriod?.paidAmount || 0),
            status: netPay === (existingPeriod?.paidAmount || 0) ? 'paid' : 
                   (existingPeriod?.paidAmount || 0) > 0 ? 'partially_paid' : 'unpaid',
            notes: period.notes,
            payments: existingPeriod?.payments || []
          };
        } else {
          return {
            id: uuidv4(),
            startDate: new Date(period.startDate),
            endDate: new Date(period.endDate),
            totalAmount,
            commissionPercentage,
            commissionAmount,
            netPay,
            paidAmount: 0,
            remainingAmount: netPay,
            status: 'unpaid',
            payments: [],
            notes: period.notes,
          };
        }
      });

      const driverPayData = {
        ...formData,
        tidNo: parseInt(formData.tidNo),
        paymentPeriods: processedPeriods,
        updatedAt: new Date()
      };

      if (record) {
        await updateDoc(doc(db, collectionName, record.id), driverPayData);
        toast.success('Driver pay record updated successfully');
      } else {
        await addDoc(collection(db, collectionName), {
          ...driverPayData,
          createdBy: user.id,
          createdAt: new Date()
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
      {/* Basic Information */}
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
      </div>

      {/* Payment Periods */}
      {periods.map((period, index) => (
        <div key={index} className="border-t pt-4 mt-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">Payment Period {index + 1}</h3>
            {index > 0 && (
              <button
                type="button"
                onClick={() => removePeriod(index)}
                className="text-red-600 hover:text-red-800"
              >
                Remove Period
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              type="date"
              label="Start Date"
              value={period.startDate}
              onChange={(e) => updatePeriod(index, 'startDate', e.target.value)}
              required
            />

            <FormField
              type="date"
              label="End Date"
              value={period.endDate}
              onChange={(e) => updatePeriod(index, 'endDate', e.target.value)}
              required
              min={period.startDate}
            />

            <FormField
              type="number"
              label="Total Amount"
              value={period.totalAmount}
              onChange={(e) => updatePeriod(index, 'totalAmount', e.target.value)}
              required
              min="0"
              step="0.01"
            />

            <FormField
              type="number"
              label="Commission Percentage"
              value={period.commissionPercentage}
              onChange={(e) => updatePeriod(index, 'commissionPercentage', e.target.value)}
              required
              min="0"
              max="100"
              step="1"
            />

            <div className="col-span-2">
              <TextArea
                label="Period Notes"
                value={period.notes || ''}
                onChange={(e) => updatePeriod(index, 'notes', e.target.value)}
                placeholder="Add any notes for this period"
              />
            </div>

            {/* Period Summary */}
            {period.totalAmount && period.commissionPercentage && (
              <div className="col-span-2 bg-gray-50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Total Amount:</span>
                  <span className="font-medium">£{parseFloat(period.totalAmount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Commission ({period.commissionPercentage}%):</span>
                  <span className="text-yellow-600">
                    £{((parseFloat(period.totalAmount) * parseFloat(period.commissionPercentage)) / 100).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-medium pt-2 border-t">
                  <span>Net Pay:</span>
                  <span className="text-green-600">
                    £{(parseFloat(period.totalAmount) - (parseFloat(period.totalAmount) * parseFloat(period.commissionPercentage)) / 100).toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={addPeriod}
        className="text-primary hover:text-primary-600"
      >
        Add Payment Period
      </button>

      {/* Form Actions */}
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