import React, { useState, useEffect } from 'react';
import { addDoc, collection, updateDoc, doc, getDoc, Timestamp } from 'firebase/firestore'; // Import Timestamp
import { db } from '../../lib/firebase';
import { Vehicle, Customer, Account, Transaction } from '../../types'; // Ensure Transaction type allows for optional fields like updatedAt/updatedBy
import { useAuth } from '../../context/AuthContext';
import FormField from '../ui/FormField';
import SearchableSelect from '../ui/SearchableSelect';
import { FINANCE_CATEGORIES } from '../../utils/financeCategories';
import toast from 'react-hot-toast';

interface TransactionFormProps {
  type: 'income' | 'expense'; // Initial type suggestion, can be overridden by logic
  transaction?: Transaction; // Existing transaction for editing
  accounts: Account[];
  vehicles: Vehicle[];
  customers: Customer[];
  onClose: () => void;
  onUpdateTransaction?: (transaction: Transaction) => Promise<void>; // Callback for state update if needed
}

// Helper function to check if an account is external (not in our accounts list)
// Moved outside the component for clarity
const isExternalAccountCheck = (accountId: string, accountsList: Account[]): boolean => {
    if (!accountId) return true; // Treat empty/null as external for checks
    return !accountsList.some(a => a.id === accountId);
};


const TransactionForm: React.FC<TransactionFormProps> = ({
  type: initialType, // Renamed prop to avoid conflict with effective type variable
  transaction,
  accounts,
  vehicles,
  customers,
  onClose,
  onUpdateTransaction
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [manualEntry, setManualEntry] = useState(false);
  const [isFromExternal, setIsFromExternal] = useState(false);
  const [isToExternal, setIsToExternal] = useState(false);

  // State to store original details for comparison during edit
  const [originalAccountFrom, setOriginalAccountFrom] = useState<string | null>(null);
  const [originalAccountTo, setOriginalAccountTo] = useState<string | null>(null);
  const [originalAmount, setOriginalAmount] = useState<number | null>(null);
  const [originalType, setOriginalType] = useState<'income' | 'expense' | 'transfer' | null>(null);
  const [originalCreatedAt, setOriginalCreatedAt] = useState<Date | Timestamp | null>(null);


  const [formData, setFormData] = useState({
    date: transaction?.date ? (transaction.date instanceof Timestamp ? transaction.date.toDate() : new Date(transaction.date)).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    // Store amount as string for input field, ensure it's positive for display initially if editing
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
    accountFrom: transaction?.accountFrom || '',
    accountTo: transaction?.accountTo || '',
    fromAccountExternal: '',
    toAccountExternal: ''
  });

  // Effect to store original details when editing
  useEffect(() => {
    if (transaction) {
      const isOrigFromExternal = isExternalAccountCheck(transaction.accountFrom || '', accounts);
      const isOrigToExternal = isExternalAccountCheck(transaction.accountTo || '', accounts);

      setOriginalAccountFrom(transaction.accountFrom || null);
      setOriginalAccountTo(transaction.accountTo || null);
      setOriginalAmount(transaction.amount || null); // Store original amount with its sign
      setOriginalType(transaction.type || null);
      setOriginalCreatedAt(transaction.createdAt || null); // Store original creation time

      setIsFromExternal(isOrigFromExternal);
      setIsToExternal(isOrigToExternal);

      setManualEntry(!!transaction.customerName && !transaction.customerId);

      // Pre-fill external account names if applicable
      if (isOrigFromExternal && transaction.accountFrom) {
        setFormData(prev => ({ ...prev, accountFrom: '', fromAccountExternal: transaction.accountFrom || '' }));
      }
      if (isOrigToExternal && transaction.accountTo) {
         setFormData(prev => ({ ...prev, accountTo: '', toAccountExternal: transaction.accountTo || '' }));
      }
        // Ensure internal accounts are selected correctly if they exist
       if (!isOrigFromExternal && transaction.accountFrom) {
           setFormData(prev => ({ ...prev, accountFrom: transaction.accountFrom || '' }));
       }
       if (!isOrigToExternal && transaction.accountTo) {
           setFormData(prev => ({ ...prev, accountTo: transaction.accountTo || '' }));
       }


    }
  }, [transaction, accounts]);


  const getAllCategories = () => {
    // Derive categories based on the effective type, not just initial prop
    let categoriesSource = FINANCE_CATEGORIES.expense; // Default
    if (formData.accountTo && !formData.accountFrom) categoriesSource = FINANCE_CATEGORIES.income;
    if (formData.accountTo && formData.accountFrom) categoriesSource = {...FINANCE_CATEGORIES.income, ...FINANCE_CATEGORIES.expense}; // Combine for transfer? Or specific transfer categories?
     if (!formData.accountTo && !formData.accountFrom) categoriesSource = initialType === 'income' ? FINANCE_CATEGORIES.income : FINANCE_CATEGORIES.expense;


    const flatCategories: string[] = [];

    Object.values(categoriesSource).forEach(group => {
      if (Array.isArray(group)) {
        flatCategories.push(...group);
      } else if (typeof group === 'object' && group !== null) {
        Object.values(group).forEach(subgroup => {
          if (Array.isArray(subgroup)) {
            flatCategories.push(...subgroup);
          }
        });
      }
    });

    // Add a generic 'Transfer' category if applicable
    if (formData.accountFrom && formData.accountTo) {
        if (!flatCategories.includes('Transfer')) flatCategories.push('Transfer');
    }


    return flatCategories.sort();
  };


  // --- Main Submit Handler ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
        toast.error("User not authenticated");
        return;
    }
    setLoading(true);

    // Use a helper function to check external status based on current form state
    const isExternal = (accountId: string): boolean => isExternalAccountCheck(accountId, accounts);

    try {
        // --- 1. Prepare Base Data ---
        const selectedVehicle = vehicles.find(v => v.id === formData.vehicleId);
        const selectedCustomer = customers.find(c => c.id === formData.customerId);

        // Ensure amount is a positive number for storage and calculations
        const newAmount = Math.abs(parseFloat(formData.amount || '0'));
        if (isNaN(newAmount) || newAmount <= 0) {
            toast.error("Please enter a valid positive amount.");
            setLoading(false);
            return;
        }

        const finalAccountFrom = isFromExternal ? formData.fromAccountExternal : formData.accountFrom;
        const finalAccountTo = isToExternal ? formData.toAccountExternal : formData.accountTo;
        const newIsFromInternal = !isFromExternal && !!formData.accountFrom;
        const newIsToInternal = !isToExternal && !!formData.accountTo;

        // Determine the effective type for the transaction being saved
        let effectiveNewType: 'income' | 'expense' | 'transfer' = 'expense'; // Default sensible value
        if (newIsFromInternal && newIsToInternal) {
            effectiveNewType = 'transfer';
        } else if (newIsToInternal) { // Only 'To' is internal
            effectiveNewType = 'income';
        } else if (newIsFromInternal) { // Only 'From' is internal
            effectiveNewType = 'expense';
        } else {
            // Both external or neither selected - use initialType or default
            effectiveNewType = initialType;
        }


      // --- 2. Handle Editing vs Creating ---
      if (transaction && transaction.id) {
        // --- EDITING EXISTING TRANSACTION ---

        console.log("Original Details:", { originalAccountFrom, originalAccountTo, originalAmount, originalType });
        console.log("New Details:", { finalAccountFrom, finalAccountTo, newAmount, effectiveNewType });


        const positiveOriginalAmount = Math.abs(originalAmount || 0);
        const originalIsFromInternal = originalAccountFrom && !isExternal(originalAccountFrom);
        const originalIsToInternal = originalAccountTo && !isExternal(originalAccountTo);

        // --- 2a. Reverse the ORIGINAL transaction's effect ---
        try {
          console.log("Attempting reversal...");
          // Reverse From Account
          if (originalIsFromInternal && (originalType === 'expense' || originalType === 'transfer')) {
            const accRef = doc(db, 'accounts', originalAccountFrom!);
            const accDoc = await getDoc(accRef);
            if (accDoc.exists()) {
              await updateDoc(accRef, {
                balance: accDoc.data().balance + positiveOriginalAmount,
                updatedAt: new Date()
              });
               console.log(`Reversed: Added ${positiveOriginalAmount} back to ${originalAccountFrom}`);
            }
          }
          // Reverse To Account
          if (originalIsToInternal && (originalType === 'income' || originalType === 'transfer')) {
            const accRef = doc(db, 'accounts', originalAccountTo!);
            const accDoc = await getDoc(accRef);
            if (accDoc.exists()) {
              await updateDoc(accRef, {
                balance: accDoc.data().balance - positiveOriginalAmount,
                updatedAt: new Date()
              });
               console.log(`Reversed: Subtracted ${positiveOriginalAmount} from ${originalAccountTo}`);
            }
          }
           console.log("Reversal step completed.");
        } catch (reversalError) {
          console.error("CRITICAL: Error reversing original transaction effects:", reversalError);
          toast.error("Error reversing original balance. Update aborted.");
          // Consider attempting to re-apply the original effects if reversal fails partially - complex!
          setLoading(false);
          return; // Stop if reversal fails
        }

        // --- 2b. Apply the NEW transaction's effect ---
        try {
             console.log("Attempting new application...");
          // Apply to New From Account
          if (newIsFromInternal && (effectiveNewType === 'expense' || effectiveNewType === 'transfer')) {
            const accRef = doc(db, 'accounts', formData.accountFrom);
            const accDoc = await getDoc(accRef);
            if (accDoc.exists()) {
              await updateDoc(accRef, {
                balance: accDoc.data().balance - newAmount, // Subtract positive amount
                updatedAt: new Date()
              });
              console.log(`Applied: Subtracted ${newAmount} from ${formData.accountFrom}`);
            }
          }
          // Apply to New To Account
          if (newIsToInternal && (effectiveNewType === 'income' || effectiveNewType === 'transfer')) {
            const accRef = doc(db, 'accounts', formData.accountTo);
            const accDoc = await getDoc(accRef);
            if (accDoc.exists()) {
              await updateDoc(accRef, {
                balance: accDoc.data().balance + newAmount, // Add positive amount
                updatedAt: new Date()
              });
               console.log(`Applied: Added ${newAmount} to ${formData.accountTo}`);
            }
          }
           console.log("New application step completed.");
        } catch (applyError) {
          console.error("CRITICAL: Error applying new transaction effects:", applyError);
          toast.error("Error applying new balance changes. Balance may be incorrect.");
          // Highly recommended: Attempt to REVERT the reversal done in step 2a here.
          // This prevents inconsistent states if application fails after reversal succeeded.
          // (Add logic to re-apply original effects here as a rollback)
          setLoading(false);
          return; // Stop if application fails
        }

        // --- 2c. Update the transaction document ---
        const updatedTransactionData: Omit<Transaction, 'id'> & { updatedAt: Date; updatedBy: string } = {
           // No need to spread 'transaction' here, construct fresh from formData and calculated values
           type: effectiveNewType,
           date: new Date(formData.date),
           amount: newAmount, // Store positive amount
           category: formData.category,
           description: formData.description,
           paymentMethod: formData.paymentMethod,
           paymentReference: formData.paymentReference || null,
           paymentStatus: formData.paymentStatus,
           status: formData.status,
           customerId: manualEntry ? null : formData.customerId || null,
           customerName: manualEntry ? formData.customerName : selectedCustomer?.name || null,
           vehicleId: formData.vehicleId || null,
           vehicleName: selectedVehicle ? `${selectedVehicle.make} ${selectedVehicle.model} (${selectedVehicle.registrationNumber})` : null,
           vehicleOwner: selectedVehicle?.owner || null,
           accountFrom: finalAccountFrom || null, // Ensure null if empty
           accountTo: finalAccountTo || null, // Ensure null if empty
           createdAt: originalCreatedAt instanceof Timestamp ? originalCreatedAt : (originalCreatedAt ? new Date(originalCreatedAt) : new Date()), // Preserve original creation time
           updatedAt: new Date(),
           updatedBy: user.name || user.email || '',
           // Add any other fields from Transaction type that might be missing
        };

        if (onUpdateTransaction) {
          // Pass the full transaction object including ID
          await onUpdateTransaction({ ...updatedTransactionData, id: transaction.id });
        } else {
          await updateDoc(doc(db, 'transactions', transaction.id), updatedTransactionData);
        }
        toast.success('Transaction updated successfully');

      } else {
        // --- CREATING NEW TRANSACTION ---

        console.log("Creating new transaction:", { finalAccountFrom, finalAccountTo, newAmount, effectiveNewType });


         // --- 3a. Apply transaction effect --- (Do this BEFORE saving transaction for better atomicity perception)
        try {
            // Apply effect to From Account
            if (newIsFromInternal && (effectiveNewType === 'expense' || effectiveNewType === 'transfer')) {
                const accRef = doc(db, 'accounts', formData.accountFrom);
                const accDoc = await getDoc(accRef);
                if (accDoc.exists()) {
                await updateDoc(accRef, {
                    balance: accDoc.data().balance - newAmount, // Subtract positive amount
                    updatedAt: new Date()
                });
                 console.log(`Applied Create: Subtracted ${newAmount} from ${formData.accountFrom}`);
                }
            }
            // Apply effect to To Account
            if (newIsToInternal && (effectiveNewType === 'income' || effectiveNewType === 'transfer')) {
                const accRef = doc(db, 'accounts', formData.accountTo);
                const accDoc = await getDoc(accRef);
                if (accDoc.exists()) {
                await updateDoc(accRef, {
                    balance: accDoc.data().balance + newAmount, // Add positive amount
                    updatedAt: new Date()
                });
                console.log(`Applied Create: Added ${newAmount} to ${formData.accountTo}`);
                }
            }
        } catch (applyError) {
             console.error("Error applying balance changes during creation:", applyError);
             toast.error("Failed to update account balance. Transaction not created.");
             setLoading(false);
             return; // Stop transaction creation if balance update fails
        }


        // --- 3b. Create the transaction document ---
        const newTransactionData: Omit<Transaction, 'id'> = {
            type: effectiveNewType,
            date: new Date(formData.date),
            amount: newAmount, // Store positive amount
            category: formData.category,
            description: formData.description,
            paymentMethod: formData.paymentMethod,
            paymentReference: formData.paymentReference || null,
            paymentStatus: formData.paymentStatus,
            status: formData.status,
            customerId: manualEntry ? null : formData.customerId || null,
            customerName: manualEntry ? formData.customerName : selectedCustomer?.name || null,
            vehicleId: formData.vehicleId || null,
            vehicleName: selectedVehicle ? `${selectedVehicle.make} ${selectedVehicle.model} (${selectedVehicle.registrationNumber})` : null,
            vehicleOwner: selectedVehicle?.owner || null,
            accountFrom: finalAccountFrom || null,
            accountTo: finalAccountTo || null,
            createdAt: new Date(),
            createdBy: user.name || user.email || '',
             // Add any other default fields needed for a new transaction
        };

        await addDoc(collection(db, 'transactions'), newTransactionData);
        toast.success('Transaction created successfully');
      }

      onClose(); // Close modal on success

    } catch (error) {
        // Catch errors from data preparation or Firestore operations not caught earlier
      console.error('Error saving transaction:', error);
      toast.error(`Failed to ${transaction ? 'update' : 'add'} transaction. ${error instanceof Error ? error.message : ''}`);
    } finally {
      setLoading(false);
    }
  };


  // --- JSX Form Structure (mostly unchanged) ---
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
         value={formData.amount} // Display potentially positive value from state
         onChange={(e) => setFormData({ ...formData, amount: e.target.value })} // Allow user to type
         min="0"
         step="0.01"
         required
         placeholder="Enter positive amount"
       />

       {/* Category */}
       <div className="space-y-2">
         <label className="block text-sm font-medium text-gray-700">Category</label>
         <SearchableSelect
           options={getAllCategories().map(category => ({
             id: category, // Use category itself as ID if unique
             label: category
           }))}
           value={formData.category}
           onChange={(value) => setFormData({ ...formData, category: value })}
           placeholder="Search categories..."
           required
         />
       </div>

        {/* Vehicle Selection */}
        <SearchableSelect
            label="Related Vehicle (Optional)"
            options={vehicles.map(v => ({
            id: v.id,
            label: `${v.make} ${v.model}`,
            subLabel: v.registrationNumber
            }))}
            value={formData.vehicleId}
            onChange={(id) => {
            const vehicle = vehicles.find(v => v.id === id);
            setFormData({
                ...formData,
                vehicleId: id || '', // Ensure it's empty string if null/undefined
                vehicleName: vehicle ? `${vehicle.make} ${vehicle.model} (${vehicle.registrationNumber})` : ''
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
                    // Clear other customer field if switching
                    if (e.target.checked) setFormData({...formData, customerId: '', customerName: ''});
                    else setFormData({...formData, customerName: ''});
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
                options={customers.map(c => ({
                id: c.id,
                label: c.name,
                subLabel: `${c.mobile || ''} - ${c.email || ''}`
                }))}
                value={formData.customerId}
                onChange={(id) => {
                const customer = customers.find(c => c.id === id);
                setFormData({
                    ...formData,
                    customerId: id || '',
                    customerName: customer?.name || ''
                });
                }}
                placeholder="Search customers..."
                isClearable={true}
            />
            )}
        </div>


      {/* Account Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Account From */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-gray-700">Account From</label>
            <label className="flex items-center space-x-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={isFromExternal}
                onChange={(e) => {
                    setIsFromExternal(e.target.checked);
                    // Clear other account field if switching
                    if (e.target.checked) setFormData({...formData, accountFrom: ''});
                    else setFormData({...formData, fromAccountExternal: ''});
                }}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <span className="text-gray-600">External</span>
            </label>
          </div>
          {isFromExternal ? (
            <FormField
              value={formData.fromAccountExternal}
              onChange={(e) => setFormData({ ...formData, fromAccountExternal: e.target.value })}
              placeholder="Enter external account name"
            />
          ) : (
            <select
              value={formData.accountFrom}
              onChange={(e) => setFormData({ ...formData, accountFrom: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
            >
              <option value="">Select account...</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>{account.name} ({account.currency} {account.balance?.toFixed(2)})</option>
              ))}
            </select>
          )}
        </div>

        {/* Account To */}
         <div>
           <div className="flex items-center justify-between mb-1">
             <label className="block text-sm font-medium text-gray-700">Account To</label>
             <label className="flex items-center space-x-2 text-xs cursor-pointer">
               <input
                 type="checkbox"
                 checked={isToExternal}
                 onChange={(e) => {
                    setIsToExternal(e.target.checked);
                    if (e.target.checked) setFormData({...formData, accountTo: ''});
                    else setFormData({...formData, toAccountExternal: ''});
                 }}
                 className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
               />
               <span className="text-gray-600">External</span>
             </label>
           </div>
           {isToExternal ? (
             <FormField
               value={formData.toAccountExternal}
               onChange={(e) => setFormData({ ...formData, toAccountExternal: e.target.value })}
               placeholder="Enter external account name"
             />
           ) : (
             <select
               value={formData.accountTo}
               onChange={(e) => setFormData({ ...formData, accountTo: e.target.value })}
               className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
             >
               <option value="">Select account...</option>
               {accounts.map((account) => (
                 <option key={account.id} value={account.id}>{account.name} ({account.currency} {account.balance?.toFixed(2)})</option>
               ))}
             </select>
           )}
         </div>
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
             <option value="pending">Pending</option> {/* Changed order */}
             <option value="partially_paid">Partially Paid</option>
             <option value="unpaid">Unpaid</option> {/* Added */}
             <option value="failed">Failed</option> {/* Added */}
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
            <option value="pending">Pending</option> {/* Changed order */}
            <option value="cancelled">Cancelled</option>
            <option value="failed">Failed</option> {/* Added */}
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