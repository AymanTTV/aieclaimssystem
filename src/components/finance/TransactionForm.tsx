// src/components/finance/TransactionForm.tsx
import React, { useState, useEffect, useMemo } from 'react';
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
import financeCategoryService from '../../services/financeCategory.service';
import financeGroupService from '../../services/financeGroup.service';
import { Info } from 'lucide-react';

interface TransactionFormProps {
  type: 'income' | 'expense';
  transaction?: Transaction;
  accounts: Account[];
  vehicles: Vehicle[];
  customers: Customer[];
  onClose: () => void;
}

const TransactionForm: React.FC<TransactionFormProps> = ({
  type: initialType,
  transaction,
  accounts = [],
  vehicles = [],
  customers = [],
  onClose,
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [manualEntry, setManualEntry] = useState(false);

  const isEditing = useMemo(() => !!transaction?.id, [transaction]);
  const isEditingMultiAccount = useMemo(() =>
      isEditing && ((transaction?.accountsFrom && transaction.accountsFrom.length > 1) || (transaction?.accountsTo && transaction.accountsTo.length > 1)),
      [isEditing, transaction]
  );
  const isInvoiceLinked = useMemo(() => isEditing && !!transaction?.referenceId, [isEditing, transaction?.referenceId]);

  const restrictAccountFields = useMemo(() =>
      user?.role !== 'manager' && (isEditingMultiAccount || isInvoiceLinked),
      [isEditingMultiAccount, isInvoiceLinked, user?.role]
  );
  const restrictFinancialFields = restrictAccountFields;


  // --- Category and Group Loading ---
  const [financeCategories, setFinanceCategories] = useState<string[]>([]);
  const [catsLoading, setCatsLoading] = useState(false);
  useEffect(() => {
     let isMounted = true;
     setCatsLoading(true);
     financeCategoryService.getAll()
       .then((docs) => { if (isMounted) setFinanceCategories(docs.map((c) => c.name).sort()); })
       .catch((err) => { console.error('Error loading finance categories:', err); toast.error('Could not load finance categories'); })
       .finally(() => { if (isMounted) setCatsLoading(false); });
     return () => { isMounted = false; };
  }, []);

  const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  useEffect(() => {
     let alive = true;
     setGroupsLoading(true);
     financeGroupService.getAll()
       .then((docs) => { if (alive) setGroups(docs.map(g => ({ id: g.id, name: g.name })).sort((a,b)=> a.name.localeCompare(b.name))); })
       .catch((err) => { console.error('Error loading groups:', err); toast.error('Could not load groups'); })
       .finally(() => { if (alive) setGroupsLoading(false); });
     return () => { alive = false; };
  }, []);
  // ---

  // --- Form State ---
  const getFirstAccount = (accArray?: string[]): string => (accArray && accArray.length > 0) ? accArray[0] : '';
  const getSecondAccount = (accArray?: string[]): string => (accArray && accArray.length > 1) ? accArray[1] : '';

  const [formData, setFormData] = useState({
    date: transaction?.date ? (transaction.date instanceof Timestamp ? transaction.date.toDate() : new Date(transaction.date)).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
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
    groupId: transaction?.groupId || '',
    accountTo: getFirstAccount(transaction?.accountsTo),
    accountFrom: getFirstAccount(transaction?.accountsFrom),
    accountTo2: getSecondAccount(transaction?.accountsTo),
    accountFrom2: getSecondAccount(transaction?.accountsFrom),
  });

  // Effect to populate/reset form
  useEffect(() => {
    if (transaction) {
      setManualEntry(!!transaction.customerName && !transaction.customerId);
      setFormData({
         date: (transaction.date instanceof Timestamp ? transaction.date.toDate() : new Date(transaction.date)).toISOString().split('T')[0],
         amount: Math.abs(transaction.amount).toString(),
         category: transaction.category || '',
         description: transaction.description || '',
         paymentMethod: transaction.paymentMethod || 'cash',
         paymentReference: transaction.paymentReference || '',
         paymentStatus: transaction.paymentStatus || 'pending',
         status: transaction.status || 'completed',
         customerId: transaction.customerId || '',
         customerName: transaction.customerName || '',
         vehicleId: transaction.vehicleId || '',
         vehicleName: transaction.vehicleName || '',
         groupId: transaction.groupId || '',
         accountTo: getFirstAccount(transaction.accountsTo),
         accountFrom: getFirstAccount(transaction.accountsFrom),
         accountTo2: getSecondAccount(transaction.accountsTo),
         accountFrom2: getSecondAccount(transaction.accountsFrom),
      });
    } else {
        setFormData({ date: new Date().toISOString().split('T')[0], amount: '', category: '', description: '', paymentMethod: 'cash', paymentReference: '', paymentStatus: 'pending', status: 'completed', customerId: '', customerName: '', vehicleId: '', vehicleName: '', groupId: '', accountTo: '', accountFrom: '', accountTo2: '', accountFrom2: '' });
        setManualEntry(false);
    }
  }, [transaction]);

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { toast.error('User not authenticated'); return; }
    setLoading(true);

    let payload: Partial<Omit<Transaction, 'id' | 'createdAt' | 'createdBy'>> & { updatedAt?: Date; updatedBy?: string } = {};

    try {
      const selectedVehicle = vehicles.find((v) => v.id === formData.vehicleId);
      const selectedCustomer = customers.find((c) => c.id === formData.customerId);
      const vehicleOwner = selectedVehicle ? (selectedVehicle.owner || null) : { name: 'AIE Skyline Limited', isDefault: true };
      const newAmount = Math.abs(parseFloat(formData.amount || '0'));
      if (isNaN(newAmount) || newAmount <= 0) { toast.error('Please enter a valid positive amount.'); setLoading(false); return; }

      let finalAccountsFrom: string[] = [];
      let finalAccountsTo: string[] = [];

      // Determine final accounts based on form input, respecting restrictions
      if (restrictAccountFields && transaction) {
          finalAccountsFrom = transaction.accountsFrom || [];
          finalAccountsTo = transaction.accountsTo || [];
      } else {
          // --- UPDATED LOGIC ---
          if (initialType === 'income') {
              // New logic: Check if *both* are empty
              if (!formData.accountTo && !formData.accountTo2) {
                  toast.error('At least one "Account To" is required.');
                  setLoading(false);
                  return;
              }
              // New logic: Check for duplicates only if both are filled
              if (formData.accountTo && formData.accountTo === formData.accountTo2) {
                  toast.error('Cannot credit the same account twice.');
                  setLoading(false);
                  return;
              }
              
              // Add whichever accounts are filled
              if (formData.accountTo) {
                  finalAccountsTo.push(formData.accountTo);
              }
              if (formData.accountTo2) {
                  finalAccountsTo.push(formData.accountTo2);
              }

          } else { // expense
              // New logic: Check if *both* are empty
              if (!formData.accountFrom && !formData.accountFrom2) {
                  toast.error('At least one "Account From" is required.');
                  setLoading(false);
                  return;
              }
              // New logic: Check for duplicates only if both are filled
              if (formData.accountFrom && formData.accountFrom === formData.accountFrom2) {
                  toast.error('Cannot debit the same account twice.');
                  setLoading(false);
                return;
              }

              // Add whichever accounts are filled
              if (formData.accountFrom) {
                  finalAccountsFrom.push(formData.accountFrom);
              }
              if (formData.accountFrom2) {
                  finalAccountsFrom.push(formData.accountFrom2);
              }
          }
          // --- END UPDATED LOGIC ---
      }

      payload = {
          type: initialType,
          category: formData.category,
          description: formData.description,
          paymentMethod: formData.paymentMethod,
          paymentReference: formData.paymentReference || null,
          paymentStatus: formData.paymentStatus || 'pending',
          status: formData.status || 'completed',
          customerId: manualEntry ? null : (formData.customerId || null),
          customerName: manualEntry ? formData.customerName : selectedCustomer?.name || null,
          vehicleId: formData.vehicleId || null,
          vehicleName: selectedVehicle ? `${selectedVehicle.make} ${selectedVehicle.model} (${selectedVehicle.registrationNumber})` : null,
          vehicleOwner: vehicleOwner,
          groupId: formData.groupId || null,
          accountsFrom: finalAccountsFrom, // Use determined array
          accountsTo: finalAccountsTo,     // Use determined array
      };

      // Set date and amount based on restrictions
      if (!restrictFinancialFields) {
          payload.date = new Date(formData.date);
          payload.amount = newAmount;
      } else if (isEditing && transaction) {
          payload.date = transaction.date;
          payload.amount = transaction.amount;
      }


      if (isEditing && transaction) {
        // --- EDITING ---
        payload.updatedAt = new Date();
        payload.updatedBy = user.name || user.email || '';
        // *** FIX: Ensure referenceId is null if not present originally ***
        payload.referenceId = transaction.referenceId || null;

        await updateDoc(doc(db, 'transactions', transaction.id), payload);
        toast.success('Transaction updated successfully');

      } else {
        // --- CREATING ---
        const createPayload: Omit<Transaction, 'id'> = {
            ...(payload as Omit<Transaction, 'id' | 'createdAt' | 'createdBy'>),
            date: new Date(formData.date),
            amount: newAmount,
            createdAt: new Date(),
            createdBy: user.name || user.email || '',
            accountsFrom: payload.accountsFrom || [],
            accountsTo: payload.accountsTo || [],
            // No referenceId needed for split creation anymore
        };

        await addDoc(collection(db, 'transactions'), createPayload);
        toast.success(`Transaction created successfully${ (finalAccountsFrom.length > 1 || finalAccountsTo.length > 1) ? ' (Split)' : '' }`);
      } // End Create/Edit block

      onClose(); // Close modal on success
    } catch (error) {
      console.error('Error saving transaction:', error);
      console.error('Payload attempted:', payload);
      toast.error(`Failed to save transaction. ${ error instanceof Error ? error.message : '' }`);
    } finally {
      setLoading(false);
    }
  };


  // --- JSX Rendering ---
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Banner */}
      {restrictAccountFields && ( <div className="p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded-md"> <div className="flex"> <div className="flex-shrink-0"><Info className="h-5 w-5 text-yellow-400" aria-hidden="true" /></div> <div className="ml-3"><p className="text-sm text-yellow-700">Editing a linked or multi-account transaction. Amount, Date, and Accounts cannot be changed by your role.</p></div> </div> </div> )}

      {/* Date & Amount Fields */}
      <FormField type="date" label="Date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} required disabled={restrictFinancialFields} />
      <FormField type="number" label="Amount" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} min="0" step="0.01" required placeholder="Enter total amount" disabled={restrictFinancialFields} />

      {/* Account Selection */}
      {initialType === 'income' && (
        <>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Account To (Credit)</label>
            {/* --- UPDATED FIELD --- */}
            <SearchableSelect 
              options={accounts.map(a => ({ id: a.id, label: a.name }))} 
              value={formData.accountTo} 
              onChange={(id) => setFormData({ ...formData, accountTo: id || '' })} 
              placeholder="Select primary account..." 
              isClearable // <-- ADDED
              disabled={restrictAccountFields} 
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Also Credit Account (Optional Split)</label>
            <SearchableSelect options={accounts.filter(a => a.id !== formData.accountTo).map(a => ({ id: a.id, label: a.name }))} value={formData.accountTo2} onChange={(id) => setFormData({ ...formData, accountTo2: id || '' })} placeholder="Select second account..." isClearable disabled={restrictAccountFields} />
          </div>
        </>
      )}
      {initialType === 'expense' && (
        <>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Account From (Debit)</label>
            {/* --- UPDATED FIELD --- */}
            <SearchableSelect 
              options={accounts.map(a => ({ id: a.id, label: a.name }))} 
              value={formData.accountFrom} 
              onChange={(id) => setFormData({ ...formData, accountFrom: id || '' })} 
              placeholder="Select primary account..." 
              isClearable // <-- ADDED
              disabled={restrictAccountFields} 
            />
          </div>
           <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Also Debit From (Optional Split)</label>
            <SearchableSelect options={accounts.filter(a => a.id !== formData.accountFrom).map(a => ({ id: a.id, label: a.name }))} value={formData.accountFrom2} onChange={(id) => setFormData({ ...formData, accountFrom2: id || '' })} placeholder="Select second account..." isClearable disabled={restrictAccountFields} />
          </div>
        </>
      )}

      {/* Other Fields */}
      <div className="space-y-2">
         <label className="block text-sm font-medium text-gray-700">Category</label>
         {catsLoading ? <div className="text-sm text-gray-500">Loading...</div> : <SearchableSelect options={financeCategories.map(c => ({ id: c, label: c }))} value={formData.category} onChange={v => setFormData({...formData, category: v || ''})} placeholder="Select category..." required />}
      </div>
      <div className="space-y-2">
         <label className="block text-sm font-medium text-gray-700">Group (Optional)</label>
         {groupsLoading ? <div className="text-sm text-gray-500">Loading...</div> : <SearchableSelect options={groups.map(g => ({ id: g.id, label: g.name }))} value={formData.groupId} onChange={id => setFormData({...formData, groupId: id || ''})} placeholder="Select group..." isClearable />}
      </div>
      <SearchableSelect label="Related Vehicle (Optional)" options={vehicles.map(v => ({ id: v.id, label: `${v.make} ${v.model}`, subLabel: v.registrationNumber }))} value={formData.vehicleId} onChange={id => { const v = vehicles.find(vh => vh.id === id); setFormData({...formData, vehicleId: id || '', vehicleName: v ? `${v.make} ${v.model} (${v.registrationNumber})` : '' }); }} placeholder="Search vehicles..." isClearable />
      <div className="space-y-4">
        <div><label className="flex items-center space-x-2 cursor-pointer"><input type="checkbox" checked={manualEntry} onChange={e => { setManualEntry(e.target.checked); setFormData({...formData, customerId: '', customerName: e.target.checked ? formData.customerName : '' }); }} className="rounded border-gray-300 text-primary focus:ring-primary" /> <span className="text-sm text-gray-700">Enter Customer Manually</span></label></div>
        {manualEntry ? <FormField label="Customer Name" value={formData.customerName} onChange={e => setFormData({...formData, customerName: e.target.value})} placeholder="Enter customer name" /> : <SearchableSelect label="Customer (Optional)" options={customers.map(c => ({ id: c.id, label: c.name, subLabel: `${c.mobile || ''} - ${c.email || ''}` }))} value={formData.customerId} onChange={id => { const c = customers.find(cu => cu.id === id); setFormData({...formData, customerId: id || '', customerName: c?.name || '' }); }} placeholder="Search customers..." isClearable />}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Description</label>
        <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} rows={3} className="form-textarea mt-1 w-full shadow-sm focus:ring-primary focus:border-primary border-gray-300 rounded-md" required />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Payment Method</label>
        <select value={formData.paymentMethod} onChange={e => setFormData({...formData, paymentMethod: e.g.value})} className="form-select mt-1 w-full shadow-sm focus:ring-primary focus:border-primary border-gray-300 rounded-md" required>
          <option value="cash">Cash</option> <option value="card">Card</option> <option value="bank_transfer">Bank Transfer</option> <option value="cheque">Cheque</option> <option value="mobile_money">Mobile Money</option> <option value="other">Other</option>
        </select>
      </div>
      <FormField label="Payment Reference (Optional)" value={formData.paymentReference} onChange={e => setFormData({...formData, paymentReference: e.target.value})} placeholder="e.g., Invoice #, Txn ID" />
      <div>
        <label className="block text-sm font-medium text-gray-700">Payment Status</label>
        <select value={formData.paymentStatus} onChange={e => setFormData({...formData, paymentStatus: e.target.value})} className="form-select mt-1 w-full shadow-sm focus:ring-primary focus:border-primary border-gray-300 rounded-md" required>
           <option value="paid">Paid</option> <option value="pending">Pending</option> <option value="partially_paid">Partially Paid</option> <option value="unpaid">Unpaid</option> <option value="failed">Failed</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Transaction Status</label>
        <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="form-select mt-1 w-full shadow-sm focus:ring-primary focus:border-primary border-gray-300 rounded-md" required>
           <option value="completed">Completed</option> <option value="pending">Pending</option> <option value="cancelled">Cancelled</option> <option value="failed">Failed</option>
        </select>
      </div>

      {/* Buttons */}
      <div className="flex justify-end space-x-3 pt-4">
        <button type="button" onClick={onClose} disabled={loading} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50">Cancel</button>
        <button type="submit" disabled={loading} className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark disabled:opacity-50">{loading ? 'Saving...' : (transaction ? 'Update Transaction' : 'Create Transaction')}</button>
      </div>
    </form>
  );
};

export default TransactionForm;