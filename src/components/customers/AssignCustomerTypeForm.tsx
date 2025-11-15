// src/components/customers/AssignCustomerTypeForm.tsx
import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Customer, CustomerType } from '../../types/customer';
import toast from 'react-hot-toast';

interface AssignCustomerTypeFormProps {
  customer: Customer;
  onClose: () => void;
}

const AssignCustomerTypeForm: React.FC<AssignCustomerTypeFormProps> = ({ customer, onClose }) => {
  const [selectedType, setSelectedType] = useState<CustomerType>(customer.type || 'customer');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedType === (customer.type || 'customer')) {
      toast('The customer already has this type assigned.', { icon: 'ℹ️' });
      return;
    }
    setLoading(true);
    try {
      const customerRef = doc(db, 'customers', customer.id);
      await updateDoc(customerRef, {
        type: selectedType,
      });
      toast.success(`Customer type successfully updated to '${selectedType}'.`);
      onClose();
    } catch (error) {
      console.error('Error updating customer type:', error);
      toast.error('Failed to update customer type.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <p className="text-sm text-gray-700 mb-4">
          Assign a new type to customer: <strong className="font-semibold">{customer.name}</strong>
        </p>
        <label htmlFor="customerType" className="block text-sm font-medium text-gray-700">
          Customer Type
        </label>
        <select
          id="customerType"
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value as CustomerType)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
          required
        >
          <option value="customer">Customer</option>
          <option value="claim">Claim</option>
          <option value="company">Company</option>
        </select>
      </div>
      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md hover:bg-primary-600 disabled:bg-gray-400"
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
};

export default AssignCustomerTypeForm;