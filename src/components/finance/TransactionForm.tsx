// src/components/finance/TransactionForm.tsx

import React, { useState, useEffect, useMemo } from 'react';
import {
  collection,
  updateDoc,
  doc,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Vehicle, Customer, Account, Transaction } from '../../types';
import { useAuth } from '../../context/AuthContext';
import FormField from '../ui/FormField';
import SearchableSelect from '../ui/SearchableSelect';
import toast from 'react-hot-toast';
import financeCategoryService from '../../services/financeCategory.service';
import financeGroupService from '../../services/financeGroup.service';
import { Info, RefreshCw } from 'lucide-react';
import { addDays, addWeeks, addMonths, addYears } from 'date-fns';

interface TransactionFormProps {
  type: 'income' | 'expense';
  initialIsRecurring?: boolean;
  transaction?: Transaction;
  accounts: Account[];
  vehicles: Vehicle[];
  customers: Customer[];
  onClose: () => void;
}

const TransactionForm: React.FC<TransactionFormProps> = ({
  type: initialType,
  initialIsRecurring = false,
  transaction,
  accounts = [],
  vehicles = [],
  customers = [],
  onClose,
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [manualEntry, setManualEntry] = useState(false);
  
  const [currentType, setCurrentType] = useState<'income' | 'expense'>(initialType);
  const [isRecurring, setIsRecurring] = useState(initialIsRecurring || !!transaction?.isRecurring);
  const [frequency, setFrequency] = useState<string>(transaction?.recurringFrequency || 'monthly');

  useEffect(() => {
    if (transaction) {
      setCurrentType(transaction.type);
    }
  }, [transaction]);

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

  const getFirstAccount = (accArray?: string[]): string => (accArray && accArray.length > 0) ? accArray[0] : '';
  const getSecondAccount = (accArray?: string[]): string => (accArray && accArray.length > 1) ? accArray[1] : '';
  
  const getThirdAccount = (txn: Transaction | undefined, type: 'income' | 'expense'): string => {
    if (!txn) return '';
    if (type === 'income') return getFirstAccount(txn.accountsFrom); 
    if (type === 'expense') return getFirstAccount(txn.accountsTo);   
    return '';
  };

  const toDateTimeLocal = (date: Date) => {
    const pad = (num: number) => num.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  const [formData, setFormData] = useState({
    date: transaction?.date 
      ? toDateTimeLocal(transaction.date instanceof Timestamp ? transaction.date.toDate() : new Date(transaction.date))
      : toDateTimeLocal(new Date()),
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
    accountThird: getThirdAccount(transaction, transaction?.type || initialType), 
  });

  useEffect(() => {
    if (transaction) {
      setManualEntry(!!transaction.customerName && !transaction.customerId);
      setFormData({
         date: toDateTimeLocal(transaction.date instanceof Timestamp ? transaction.date.toDate() : new Date(transaction.date)),
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
         accountThird: getThirdAccount(transaction, transaction.type),
      });
      setIsRecurring(!!transaction.isRecurring);
      setFrequency(transaction.recurringFrequency || 'monthly');
    } else {
        setFormData(prev => ({ ...prev, date: toDateTimeLocal(new Date()), amount: '', category: '', description: '', paymentMethod: 'cash', paymentReference: '', paymentStatus: 'pending', status: 'completed', customerId: '', customerName: '', vehicleId: '', vehicleName: '', groupId: '', accountTo: '', accountFrom: '', accountTo2: '', accountFrom2: '', accountThird: '' }));
        setManualEntry(false);
    }
  }, [transaction]);

  const calculateNextDate = (dateStr: string, freq: string): Date => {
    const date = new Date(dateStr);
    switch (freq) {
      case 'daily': return addDays(date, 1);
      case 'weekly': return addWeeks(date, 1);
      case 'monthly': return addMonths(date, 1);
      case 'quarterly': return addMonths(date, 3);
      case 'biannually': return addMonths(date, 6);
      case 'yearly': return addYears(date, 1);
      default: return addMonths(date, 1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { toast.error('User not authenticated'); return; }
    setLoading(true);

    try {
      const selectedVehicle = vehicles.find((v) => v.id === formData.vehicleId);
      const selectedCustomer = customers.find((c) => c.id === formData.customerId);
      const vehicleOwner = selectedVehicle ? (selectedVehicle.owner || null) : { name: 'AIE Skyline Limited', isDefault: true };
      const newAmount = Math.abs(parseFloat(formData.amount || '0'));
      if (isNaN(newAmount) || newAmount <= 0) { toast.error('Please enter a valid positive amount.'); setLoading(false); return; }

      // --- Helper: Get Names ---
      const getAccName = (id: string) => accounts.find(a => a.id === id)?.name || '';

      const basePayload: any = {
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
          updatedAt: new Date(),
          updatedBy: user.name || user.email || '',
          amount: newAmount,
          date: new Date(formData.date),
      };

      if (!restrictFinancialFields) {
          basePayload.date = new Date(formData.date);
          basePayload.amount = newAmount;
      } else if (isEditing && transaction) {
          basePayload.date = transaction.date;
          basePayload.amount = transaction.amount;
      }

      if (isRecurring) {
        basePayload.isRecurring = true;
        basePayload.recurringFrequency = frequency as any;
        if (!transaction || !transaction.isRecurring) {
             basePayload.nextRecurringDate = calculateNextDate(formData.date, frequency);
        }
      } else {
        basePayload.isRecurring = false;
        basePayload.recurringFrequency = null;
        basePayload.nextRecurringDate = null;
      }

      if (isEditing && transaction) {
          // EDIT MODE (Single record update)
          const finalAccountsFrom: string[] = [];
          const finalAccountsTo: string[] = [];

          if (currentType === 'income') {
             if (formData.accountTo) finalAccountsTo.push(formData.accountTo);
             if (formData.accountTo2) finalAccountsTo.push(formData.accountTo2);
             if (formData.accountThird) finalAccountsFrom.push(formData.accountThird);
          } else {
             if (formData.accountFrom) finalAccountsFrom.push(formData.accountFrom);
             if (formData.accountFrom2) finalAccountsFrom.push(formData.accountFrom2);
             if (formData.accountThird) finalAccountsTo.push(formData.accountThird);
          }

          const updateData = {
              ...basePayload,
              type: currentType,
              accountsFrom: finalAccountsFrom,
              accountsTo: finalAccountsTo,
              referenceId: transaction.referenceId || null,
          };

          await updateDoc(doc(db, 'transactions', transaction.id), updateData);
          toast.success('Transaction updated');

      } else {
        // --- CREATE MODE: Independent Records with Cross-Reference ---
        const batch = writeBatch(db);
        let operationCount = 0;

        // --- PREPARE NAMES FOR RELATED ACCOUNT FIELD ---
        // 1. Identify Names involved
        const mainAccName = currentType === 'income' ? getAccName(formData.accountTo) : getAccName(formData.accountFrom);
        const secondaryAccName = currentType === 'income' ? getAccName(formData.accountTo2) : getAccName(formData.accountFrom2);
        const contraAccName = getAccName(formData.accountThird); // The money source/destination

        // 2. Construct "Credit Side" names (where money went)
        const creditSideNames = [];
        if (currentType === 'income') {
             if (mainAccName) creditSideNames.push(mainAccName);
             if (secondaryAccName) creditSideNames.push(secondaryAccName);
        } else {
             // For expense: If accountThird is set, it acts as "Paid To".
             if (contraAccName) creditSideNames.push(contraAccName);
        }
        const creditSideString = creditSideNames.filter(Boolean).join(' & ');

        // 3. Construct "Debit Side" names (where money came from)
        const debitSideNames = [];
        if (currentType === 'expense') {
            if (mainAccName) debitSideNames.push(mainAccName);
            if (secondaryAccName) debitSideNames.push(secondaryAccName);
        } else {
            // For income: If accountThird is set, it acts as Source
            if (contraAccName) debitSideNames.push(contraAccName);
        }
        const debitSideString = debitSideNames.filter(Boolean).join(' & ');


        // --- A. PRIMARY RECORD (COMBINED MAIN + SECONDARY) ---
        // For Income: Combines Account To & To 2
        // For Expense: Combines Account From & From 2
        
        if (currentType === 'income') {
            const incomeAccounts = [];
            if (formData.accountTo) incomeAccounts.push(formData.accountTo);
            if (formData.accountTo2) incomeAccounts.push(formData.accountTo2);
            
            if (incomeAccounts.length > 0) {
                const ref = doc(collection(db, 'transactions'));
                batch.set(ref, {
                    ...basePayload,
                    id: ref.id,
                    type: 'income',
                    createdAt: new Date(),
                    createdBy: user.name || user.email || '',
                    accountsTo: incomeAccounts, // COMBINED HERE
                    accountsFrom: [],
                    // Income needs to know "From where?" -> The Debit Side (Contra)
                    relatedAccountName: debitSideString || null 
                });
                operationCount++;
            }
        } 
        else if (currentType === 'expense') {
            const expenseAccounts = [];
            if (formData.accountFrom) expenseAccounts.push(formData.accountFrom);
            if (formData.accountFrom2) expenseAccounts.push(formData.accountFrom2);

            if (expenseAccounts.length > 0) {
                const ref = doc(collection(db, 'transactions'));
                batch.set(ref, {
                    ...basePayload,
                    id: ref.id,
                    type: 'expense',
                    createdAt: new Date(),
                    createdBy: user.name || user.email || '',
                    accountsFrom: expenseAccounts, // COMBINED HERE
                    accountsTo: [],
                    // Expense needs to know "To where?" -> The Credit Side (Contra)
                    relatedAccountName: creditSideString || null
                });
                operationCount++;
            }
        }

        // --- B. THIRD RECORD (CONTRA/TRANSFER) ---
        // This remains separate as per requirements.
        if (formData.accountThird) {
            const ref = doc(collection(db, 'transactions'));
            // Invert type
            const contraType = currentType === 'income' ? 'expense' : 'income';
            
            const contraData: any = {
                ...basePayload,
                id: ref.id,
                type: contraType,
                createdAt: new Date(),
                createdBy: user.name || user.email || '',
                description: `(Transfer) ${formData.description}`,
            };

            if (contraType === 'income') {
                // This is Income (money entering Account 3), so it came from the Expenses (Debit Side: The Main/Secondary Accounts)
                contraData.accountsTo = [formData.accountThird];
                contraData.accountsFrom = [];
                contraData.relatedAccountName = debitSideString; // "Debit Side" of the logic maps to Main+Secondary names here
            } else {
                // This is Expense (money leaving Account 3), so it went to the Incomes (Credit Side: The Main/Secondary Accounts)
                contraData.accountsFrom = [formData.accountThird];
                contraData.accountsTo = [];
                contraData.relatedAccountName = creditSideString; // "Credit Side" maps to Main+Secondary names here
            }

            batch.set(ref, contraData);
            operationCount++;
        }

        if (operationCount === 0) {
            toast.error("Please select at least one account.");
            setLoading(false);
            return;
        }

        await batch.commit();
        toast.success(`Created ${operationCount} transaction record(s)`);
      }

      onClose();
    } catch (error) {
      console.error('Error saving transaction:', error);
      toast.error(`Failed to save transaction.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      
      {!transaction && initialIsRecurring && (
        <div className="grid grid-cols-2 gap-4 p-1 bg-gray-100 rounded-lg">
          <button type="button" onClick={() => setCurrentType('income')} className={`py-2 text-sm font-medium rounded-md transition-all ${currentType === 'income' ? 'bg-white shadow text-green-700' : 'text-gray-500 hover:text-gray-700'}`}>Income</button>
          <button type="button" onClick={() => setCurrentType('expense')} className={`py-2 text-sm font-medium rounded-md transition-all ${currentType === 'expense' ? 'bg-white shadow text-red-700' : 'text-gray-500 hover:text-gray-700'}`}>Expense</button>
        </div>
      )}

      {restrictAccountFields && ( <div className="p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded-md"> <div className="flex"> <div className="flex-shrink-0"><Info className="h-5 w-5 text-yellow-400" aria-hidden="true" /></div> <div className="ml-3"><p className="text-sm text-yellow-700">Editing a linked or multi-account transaction. Amount, Date, and Accounts cannot be changed by your role.</p></div> </div> </div> )}

      <div className="border border-indigo-100 bg-indigo-50/50 rounded-md p-4 space-y-3">
        <div className="flex items-center">
             <input id="isRecurring" type="checkbox" checked={isRecurring} onChange={(e) => setIsRecurring(e.target.checked)} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded" />
              <label htmlFor="isRecurring" className="ml-2 block text-sm font-medium text-gray-900 flex items-center"><RefreshCw className="w-4 h-4 mr-1 text-indigo-600" />Re-occurring Transaction</label>
        </div>
        {isRecurring && (
          <div className="animate-fadeIn">
            <label className="block text-xs font-medium text-gray-700 uppercase tracking-wide">Frequency</label>
            <select value={frequency} onChange={(e) => setFrequency(e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
              <option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="biannually">Biannually</option><option value="yearly">Yearly</option>
            </select>
            <p className="mt-2 text-xs text-indigo-600">Next occurrence will be automatically generated based on the date/time selected below + frequency. <br/> <strong>Note:</strong> Separate recurring series will be created for each selected account.</p>
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Date & Time</label>
        <input type="datetime-local" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} required disabled={restrictFinancialFields} className="form-input mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
      </div>

      <FormField type="number" label="Amount" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} min="0" step="0.01" required placeholder="Enter total amount" disabled={restrictFinancialFields} />

      {currentType === 'income' && (
        <>
          <div className="p-3 bg-green-50 border border-green-100 rounded-md space-y-3">
              <h4 className="text-sm font-semibold text-green-800 border-b border-green-200 pb-1">Money Entering (Credit)</h4>
              <div className="space-y-2"><label className="block text-xs font-medium text-gray-700">Account To (Main)</label><SearchableSelect options={accounts.map(a => ({ id: a.id, label: a.name }))} value={formData.accountTo} onChange={(id) => setFormData({ ...formData, accountTo: id || '' })} placeholder="Select primary account..." isClearable disabled={restrictAccountFields} /></div>
              <div className="space-y-2"><label className="block text-xs font-medium text-gray-700">Also Credit Account (Merged into Record)</label><SearchableSelect options={accounts.filter(a => a.id !== formData.accountTo).map(a => ({ id: a.id, label: a.name }))} value={formData.accountTo2} onChange={(id) => setFormData({ ...formData, accountTo2: id || '' })} placeholder="Select second account..." isClearable disabled={restrictAccountFields} /></div>
          </div>
          <div className="p-3 bg-red-50 border border-red-100 rounded-md space-y-3">
             <h4 className="text-sm font-semibold text-red-800 border-b border-red-200 pb-1">Money Leaving (Debit)</h4>
             <div className="space-y-2"><label className="block text-xs font-medium text-gray-700">Debit Account (Create Separate Expense Record)</label><SearchableSelect options={accounts.filter(a => a.id !== formData.accountTo && a.id !== formData.accountTo2).map(a => ({ id: a.id, label: a.name }))} value={formData.accountThird} onChange={(id) => setFormData({ ...formData, accountThird: id || '' })} placeholder="Select account to debit..." isClearable disabled={restrictAccountFields} /><p className="text-xs text-gray-500">Select an account here to reduce its balance (e.g. transfer source).</p></div>
          </div>
        </>
      )}
      {currentType === 'expense' && (
        <>
          <div className="p-3 bg-red-50 border border-red-100 rounded-md space-y-3">
              <h4 className="text-sm font-semibold text-red-800 border-b border-red-200 pb-1">Money Leaving (Debit)</h4>
              <div className="space-y-2"><label className="block text-xs font-medium text-gray-700">Account From (Main)</label><SearchableSelect options={accounts.map(a => ({ id: a.id, label: a.name }))} value={formData.accountFrom} onChange={(id) => setFormData({ ...formData, accountFrom: id || '' })} placeholder="Select primary account..." isClearable disabled={restrictAccountFields} /></div>
               <div className="space-y-2"><label className="block text-xs font-medium text-gray-700">Also Debit From (Merged into Record)</label><SearchableSelect options={accounts.filter(a => a.id !== formData.accountFrom).map(a => ({ id: a.id, label: a.name }))} value={formData.accountFrom2} onChange={(id) => setFormData({ ...formData, accountFrom2: id || '' })} placeholder="Select second account..." isClearable disabled={restrictAccountFields} /></div>
          </div>
          <div className="p-3 bg-green-50 border border-green-100 rounded-md space-y-3">
             <h4 className="text-sm font-semibold text-green-800 border-b border-green-200 pb-1">Money Entering (Credit)</h4>
             <div className="space-y-2"><label className="block text-xs font-medium text-gray-700">Credit Account (Separate Income Record)</label><SearchableSelect options={accounts.filter(a => a.id !== formData.accountFrom && a.id !== formData.accountFrom2).map(a => ({ id: a.id, label: a.name }))} value={formData.accountThird} onChange={(id) => setFormData({ ...formData, accountThird: id || '' })} placeholder="Select account to credit..." isClearable disabled={restrictAccountFields} /><p className="text-xs text-gray-500">Select an account here to increase its balance (e.g. money returned/transfer dest).</p></div>
          </div>
        </>
      )}

      <div className="space-y-2"><label className="block text-sm font-medium text-gray-700">Category</label>{catsLoading ? <div className="text-sm text-gray-500">Loading...</div> : <SearchableSelect options={financeCategories.map(c => ({ id: c, label: c }))} value={formData.category} onChange={v => setFormData({...formData, category: v || ''})} placeholder="Select category..." required />}</div>
      <div className="space-y-2"><label className="block text-sm font-medium text-gray-700">Group (Optional)</label>{groupsLoading ? <div className="text-sm text-gray-500">Loading...</div> : <SearchableSelect options={groups.map(g => ({ id: g.id, label: g.name }))} value={formData.groupId} onChange={id => setFormData({...formData, groupId: id || ''})} placeholder="Select group..." isClearable />}</div>
      <SearchableSelect label="Related Vehicle (Optional)" options={vehicles.map(v => ({ id: v.id, label: `${v.make} ${v.model}`, subLabel: v.registrationNumber }))} value={formData.vehicleId} onChange={id => { const v = vehicles.find(vh => vh.id === id); setFormData({...formData, vehicleId: id || '', vehicleName: v ? `${v.make} ${v.model} (${v.registrationNumber})` : '' }); }} placeholder="Search vehicles..." isClearable />
      
      <div className="space-y-4">
        <div><label className="flex items-center space-x-2 cursor-pointer"><input type="checkbox" checked={manualEntry} onChange={e => { setManualEntry(e.target.checked); setFormData({...formData, customerId: '', customerName: e.target.checked ? formData.customerName : '' }); }} className="rounded border-gray-300 text-primary focus:ring-primary" /> <span className="text-sm text-gray-700">Enter Customer Manually</span></label></div>
        {manualEntry ? <FormField label="Customer Name" value={formData.customerName} onChange={e => setFormData({...formData, customerName: e.target.value})} placeholder="Enter customer name" /> : <SearchableSelect label="Customer (Optional)" options={customers.map(c => ({ id: c.id, label: c.name, subLabel: `${c.mobile || ''} - ${c.email || ''}` }))} value={formData.customerId} onChange={id => { const c = customers.find(cu => cu.id === id); setFormData({...formData, customerId: id || '', customerName: c?.name || '' }); }} placeholder="Search customers..." isClearable />}
      </div>
      <div><label className="block text-sm font-medium text-gray-700">Description</label><textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} rows={3} className="form-textarea mt-1 w-full shadow-sm focus:ring-primary focus:border-primary border-gray-300 rounded-md" required /></div>
      <div><label className="block text-sm font-medium text-gray-700">Payment Method</label><select value={formData.paymentMethod} onChange={e => setFormData({...formData, paymentMethod: e.target.value as any})} className="form-select mt-1 w-full shadow-sm focus:ring-primary focus:border-primary border-gray-300 rounded-md" required><option value="cash">Cash</option><option value="card">Card</option><option value="bank_transfer">Bank Transfer</option><option value="cheque">Cheque</option><option value="mobile_money">Mobile Money</option><option value="other">Other</option></select></div>
      <FormField label="Payment Reference (Optional)" value={formData.paymentReference} onChange={e => setFormData({...formData, paymentReference: e.target.value})} placeholder="e.g., Invoice #, Txn ID" />
      <div><label className="block text-sm font-medium text-gray-700">Payment Status</label><select value={formData.paymentStatus} onChange={e => setFormData({...formData, paymentStatus: e.target.value})} className="form-select mt-1 w-full shadow-sm focus:ring-primary focus:border-primary border-gray-300 rounded-md" required><option value="paid">Paid</option><option value="pending">Pending</option><option value="partially_paid">Partially Paid</option><option value="unpaid">Unpaid</option><option value="failed">Failed</option></select></div>
      <div><label className="block text-sm font-medium text-gray-700">Transaction Status</label><select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="form-select mt-1 w-full shadow-sm focus:ring-primary focus:border-primary border-gray-300 rounded-md" required><option value="completed">Completed</option><option value="pending">Pending</option><option value="cancelled">Cancelled</option><option value="failed">Failed</option></select></div>

      <div className="flex justify-end space-x-3 pt-4">
        <button type="button" onClick={onClose} disabled={loading} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50">Cancel</button>
        <button type="submit" disabled={loading} className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark disabled:opacity-50">{loading ? 'Saving...' : (transaction ? 'Update Transaction' : 'Create Transaction')}</button>
      </div>
    </form>
  );
};

export default TransactionForm;