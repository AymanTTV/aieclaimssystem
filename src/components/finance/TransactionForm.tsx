import React, { useState, useEffect } from 'react';
import {
  addDoc,
  collection,
  updateDoc,
  doc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Vehicle, Customer, Account, Transaction } from '../../types';
import { useAuth } from '../../context/AuthContext';
import FormField from '../ui/FormField';
import SearchableSelect from '../ui/SearchableSelect';
import toast from 'react-hot-toast';
/** ────── UPDATE ────── **/
import financeCategoryService from '../../services/financeCategory.service';
/** ───────────────────── **/

interface TransactionFormProps {
  type: 'income' | 'expense';
  transaction?: Transaction;
  accounts: Account[];
  vehicles: Vehicle[];
  customers: Customer[];
  onClose: () => void;
  onUpdateTransaction?: (transaction: Transaction) => Promise<void>;
}

const TransactionForm: React.FC<TransactionFormProps> = ({
  type: initialType,
  transaction,
  accounts,
  vehicles,
  customers,
  onClose,
  onUpdateTransaction,
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [manualEntry, setManualEntry] = useState(false);

  // ── New: Load financeCategories from Firestore ──
  const [financeCategories, setFinanceCategories] = useState<string[]>([]);
  const [catsLoading, setCatsLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setCatsLoading(true);
    financeCategoryService
      .getAll()
      .then((docs) => {
        if (!isMounted) return;
        setFinanceCategories(docs.map((c) => c.name).sort());
      })
      .catch((err) => {
        console.error('Error loading finance categories:', err);
        toast.error('Could not load finance categories');
      })
      .finally(() => {
        if (isMounted) setCatsLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // ── Original “editing” state logic ──
  const [originalAccountFrom, setOriginalAccountFrom] = useState<string | null>(null);
  const [originalAccountTo, setOriginalAccountTo] = useState<string | null>(null);
  const [originalAmount, setOriginalAmount] = useState<number | null>(null);
  const [originalType, setOriginalType] = useState<'income' | 'expense' | 'transfer' | null>(null);
  const [originalCreatedAt, setOriginalCreatedAt] = useState<Date | Timestamp | null>(null);

  const [formData, setFormData] = useState({
    date: transaction?.date
      ? (transaction.date instanceof Timestamp
          ? transaction.date.toDate()
          : new Date(transaction.date)
        ).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
    amount: transaction?.amount ? Math.abs(transaction.amount).toString() : '',
    category: transaction?.category || '',
    description: transaction?.description || '',
    paymentMethod: transaction?.paymentMethod || 'cash',
    paymentReference: transaction?.paymentReference || '',
    paymentStatus: transaction?.paymentStatus || 'pending',
    status: transaction?.status || 'completed',
    customerId: transaction?.customerId || '',
    customerName: transaction?.customerName || '',
    vehicleId: transaction?.vehicleId || '',
    vehicleName: transaction?.vehicleName || '',
  });

  useEffect(() => {
    if (transaction) {
      setOriginalAccountFrom(transaction.accountFrom || null);
      setOriginalAccountTo(transaction.accountTo || null);
      setOriginalAmount(transaction.amount || null);
      setOriginalType(transaction.type || null);
      setOriginalCreatedAt(transaction.createdAt || null);
      setManualEntry(!!transaction.customerName && !transaction.customerId);
    }
  }, [transaction]);

  // --- Main Submit Handler ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('User not authenticated');
      return;
    }
    setLoading(true);

    try {
      const selectedVehicle = vehicles.find((v) => v.id === formData.vehicleId);
      const selectedCustomer = customers.find((c) => c.id === formData.customerId);

      const newAmount = Math.abs(parseFloat(formData.amount || '0'));
      if (isNaN(newAmount) || newAmount <= 0) {
        toast.error('Please enter a valid positive amount.');
        setLoading(false);
        return;
      }

      const effectiveNewType: 'income' | 'expense' = initialType;
      const vehicleOwner = selectedVehicle
        ? selectedVehicle.owner || null
        : { name: 'AIE Skyline Limited', isDefault: true };

      if (transaction && transaction.id) {
        // --- EDITING ---
        const updatedTransactionData: Omit<Transaction, 'id'> & { updatedAt: Date; updatedBy: string } = {
          type: effectiveNewType,
          date: new Date(formData.date),
          amount: newAmount,
          category: formData.category,
          description: formData.description,
          paymentMethod: formData.paymentMethod,
          paymentReference: formData.paymentReference || null,
          paymentStatus: formData.paymentStatus,
          status: formData.status,
          customerId: manualEntry ? null : formData.customerId || null,
          customerName: manualEntry ? formData.customerName : selectedCustomer?.name || null,
          vehicleId: formData.vehicleId || null,
          vehicleName: selectedVehicle
            ? `${selectedVehicle.make} ${selectedVehicle.model} (${selectedVehicle.registrationNumber})`
            : null,
          vehicleOwner: vehicleOwner,
          createdAt:
            originalCreatedAt instanceof Timestamp
              ? originalCreatedAt
              : originalCreatedAt
              ? new Date(originalCreatedAt)
              : new Date(),
          updatedAt: new Date(),
          updatedBy: user.name || user.email || '',
        };

        if (onUpdateTransaction) {
          await onUpdateTransaction({ ...updatedTransactionData, id: transaction.id });
        } else {
          await updateDoc(doc(db, 'transactions', transaction.id), updatedTransactionData);
        }
        toast.success('Transaction updated successfully');
      } else {
        // --- CREATING ---
        const newTransactionData: Omit<Transaction, 'id'> = {
          type: effectiveNewType,
          date: new Date(formData.date),
          amount: newAmount,
          category: formData.category,
          description: formData.description,
          paymentMethod: formData.paymentMethod,
          paymentReference: formData.paymentReference || null,
          paymentStatus: formData.paymentStatus,
          status: formData.status,
          customerId: manualEntry ? null : formData.customerId || null,
          customerName: manualEntry ? formData.customerName : selectedCustomer?.name || null,
          vehicleId: formData.vehicleId || null,
          vehicleName: selectedVehicle
            ? `${selectedVehicle.make} ${selectedVehicle.model} (${selectedVehicle.registrationNumber})`
            : null,
          vehicleOwner: vehicleOwner,
          createdAt: new Date(),
          createdBy: user.name || user.email || '',
        };

        await addDoc(collection(db, 'transactions'), newTransactionData);
        toast.success('Transaction created successfully');
      }

      onClose();
    } catch (error) {
      console.error('Error saving transaction:', error);
      toast.error(`Failed to ${transaction ? 'update' : 'add'} transaction. ${error instanceof Error ? error.message : ''}`);
    } finally {
      setLoading(false);
    }
  };

  // --- JSX Form Structure ---
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Date */}
      <FormField
        type="date"
        label="Date"
        value={formData.date}
        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
        required
      />

      {/* Amount */}
      <FormField
        type="number"
        label="Amount"
        value={formData.amount}
        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
        min="0"
        step="0.01"
        required
        placeholder="Enter positive amount"
      />

      {/* ── Category (DYNAMIC from financeCategories) ── */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Category</label>
        {catsLoading ? (
          <div className="text-gray-500 text-sm">Loading…</div>
        ) : (
          <SearchableSelect
            options={financeCategories.map((cat) => ({
              id: cat,
              label: cat,
            }))}
            value={formData.category}
            onChange={(value) => setFormData({ ...formData, category: value })}
            placeholder="Search categories..."
            required
          />
        )}
      </div>

      {/* Vehicle Selection */}
      <SearchableSelect
        label="Related Vehicle (Optional)"
        options={vehicles.map((v) => ({
          id: v.id,
          label: `${v.make} ${v.model}`,
          subLabel: v.registrationNumber,
        }))}
        value={formData.vehicleId}
        onChange={(id) => {
          const vehicle = vehicles.find((v) => v.id === id);
          setFormData({
            ...formData,
            vehicleId: id || '',
            vehicleName: vehicle ? `${vehicle.make} ${vehicle.model} (${vehicle.registrationNumber})` : '',
          });
        }}
        placeholder="Search vehicles..."
        isClearable={true}
      />

      {/* Customer Selection */}
      <div className="space-y-4">
        <div>
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={manualEntry}
              onChange={(e) => {
                setManualEntry(e.target.checked);
                if (e.target.checked) setFormData({ ...formData, customerId: '', customerName: '' });
                else setFormData({ ...formData, customerName: '' });
              }}
              className="rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span className="text-sm text-gray-700">Enter Customer Manually</span>
          </label>
        </div>

        {manualEntry ? (
          <FormField
            label="Customer Name"
            value={formData.customerName}
            onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
            placeholder="Enter customer name"
          />
        ) : (
          <SearchableSelect
            label="Customer (Optional)"
            options={customers.map((c) => ({
              id: c.id,
              label: c.name,
              subLabel: `${c.mobile || ''} - ${c.email || ''}`,
            }))}
            value={formData.customerId}
            onChange={(id) => {
              const customer = customers.find((c) => c.id === id);
              setFormData({
                ...formData,
                customerId: id || '',
                customerName: customer?.name || '',
              });
            }}
            placeholder="Search customers..."
            isClearable={true}
          />
        )}
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Description</label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={3}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
          required
        />
      </div>

      {/* Payment Method */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Payment Method</label>
        <select
          value={formData.paymentMethod}
          onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
          required
        >
          <option value="cash">Cash</option>
          <option value="card">Card</option>
          <option value="bank_transfer">Bank Transfer</option>
          <option value="cheque">Cheque</option>
          <option value="mobile_money">Mobile Money</option>
          <option value="other">Other</option>
        </select>
      </div>

      {/* Payment Reference */}
      <FormField
        label="Payment Reference (Optional)"
        value={formData.paymentReference}
        onChange={(e) => setFormData({ ...formData, paymentReference: e.target.value })}
        placeholder="e.g., Invoice #, Cheque #, Txn ID"
      />

      {/* Payment Status */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Payment Status</label>
        <select
          value={formData.paymentStatus}
          onChange={(e) => setFormData({ ...formData, paymentStatus: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
          required
        >
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
          <option value="partially_paid">Partially Paid</option>
          <option value="unpaid">Unpaid</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      {/* Status */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Transaction Status</label>
        <select
          value={formData.status}
          onChange={(e) => setFormData({ ...formData, status: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
          required
        >
          <option value="completed">Completed</option>
          <option value="pending">Pending</option>
          <option value="cancelled">Cancelled</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
        >
          {loading ? 'Saving...' : transaction ? 'Update Transaction' : 'Create Transaction'}
        </button>
      </div>
    </form>
  );
};

export default TransactionForm;
