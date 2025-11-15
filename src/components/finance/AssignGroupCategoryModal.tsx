// src/components/finance/AssignGroupCategoryModal.tsx
import React, { useState, useEffect, useMemo } from 'react'; // useMemo is imported
import Modal from '../ui/Modal';
import { FinanceGroup } from '../../services/financeGroup.service';
import { Transaction, Account } from '../../types';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import toast from 'react-hot-toast';
import SearchableSelect from '../ui/SearchableSelect';
import { useAuth } from '../../context/AuthContext';

interface AssignGroupCategoryModalProps {
  open: boolean;
  txn: Transaction | null;
  groups: FinanceGroup[];
  categories: { id: string; name: string }[];
  accounts: Account[];
  onClose: () => void;
  onAssigned: () => void;
}

export default function AssignGroupCategoryModal({
  open,
  txn,
  groups = [],
  categories = [],
  accounts = [],
  onClose,
  onAssigned,
}: AssignGroupCategoryModalProps) {
  const { user } = useAuth(); // Hook 1
  const [selectedGroup, setSelectedGroup] = useState<string>(''); // Hook 2
  const [selectedCategory, setSelectedCategory] = useState<string>(''); // Hook 3
  const [account1, setAccount1] = useState<string>(''); // Hook 4
  const [account2, setAccount2] = useState<string>(''); // Hook 5
  const [loading, setLoading] = useState(false); // Hook 6

  // Hook 7: Calculate options for the first dropdown
  const accountOptions = useMemo(() => accounts.map(acc => ({ id: acc.id, label: acc.name })), [accounts]);

  // Hook 8: Populate state from props
  useEffect(() => {
    if (txn) {
      setSelectedGroup(txn.groupId || '');
      setSelectedCategory(txn.category || '');
      const getFirst = (arr?: string[]) => (arr && arr.length > 0) ? arr[0] : '';
      const getSecond = (arr?: string[]) => (arr && arr.length > 1) ? arr[1] : '';
      if (txn.type === 'income') {
          setAccount1(getFirst(txn.accountsTo));
          setAccount2(getSecond(txn.accountsTo));
      } else { // expense
          setAccount1(getFirst(txn.accountsFrom));
          setAccount2(getSecond(txn.accountsFrom));
      }
    } else {
      setSelectedGroup('');
      setSelectedCategory('');
      setAccount1('');
      setAccount2('');
    }
  }, [txn]);

  // Hook 9: Calculate options for the second dropdown (excluding the first selection)
  // *** MOVED THIS HOOK BEFORE THE EARLY RETURN ***
  const accountOptions2 = useMemo(() => accountOptions.filter(opt => opt.id !== account1), [accountOptions, account1]);

  // Early return *after* all hooks have been called
  if (!open || !txn) {
    return null;
  }

  // Event Handlers (remain the same)
  const handleAssign = async () => {
    if (!txn) return;
    if (!selectedCategory) { toast.error('Please select a category.'); return; }
    if (!account1) { toast.error(`Please select the primary ${txn.type === 'income' ? 'Account To' : 'Account From'}.`); return; }
    if (account1 && account1 === account2) { toast.error('Primary and secondary accounts cannot be the same.'); return; }

    setLoading(true);
    try {
      const txnRef = doc(db, 'transactions', txn.id);
      let finalAccountsFrom: string[] = [];
      let finalAccountsTo: string[] = [];

      if (txn.type === 'income') {
          finalAccountsTo.push(account1);
          if (account2) finalAccountsTo.push(account2);
      } else {
          finalAccountsFrom.push(account1);
          if (account2) finalAccountsFrom.push(account2);
      }

      const updateData: Partial<Transaction> & { updatedAt: Date, updatedBy: string } = {
        groupId: selectedGroup || null,
        category: selectedCategory,
        accountsFrom: finalAccountsFrom,
        accountsTo: finalAccountsTo,
        updatedAt: new Date(),
        updatedBy: user?.name || user?.email || 'AssignModal',
      };

      await updateDoc(txnRef, updateData);
      toast.success('Accounts, Group & Category updated successfully!');
      onAssigned();
    } catch (err) { console.error('Failed to update transaction:', err); toast.error('Could not update transaction.');
    } finally { setLoading(false); }
  };


  // JSX (remains the same)
  return (
    <Modal isOpen={open} onClose={onClose} title="Assign Accounts, Group & Category" size="md">
      <div className="space-y-4 p-1">
        {/* --- Account Selectors --- */}
        {txn.type === 'income' && (
          <>
            <SearchableSelect label="Account To (Credit)" options={accountOptions} value={account1} onChange={(id) => setAccount1(id || '')} isClearable={false} placeholder="Select primary account..." required />
            <SearchableSelect label="Also Credit Account (Optional Split)" options={accountOptions2} value={account2} onChange={(id) => setAccount2(id || '')} isClearable placeholder="Select second account..." />
          </>
        )}
        {txn.type === 'expense' && (
           <>
            <SearchableSelect label="Account From (Debit)" options={accountOptions} value={account1} onChange={(id) => setAccount1(id || '')} isClearable={false} placeholder="Select primary account..." required />
            <SearchableSelect label="Also Debit From (Optional Split)" options={accountOptions2} value={account2} onChange={(id) => setAccount2(id || '')} isClearable placeholder="Select second account..." />
          </>
        )}
        {/* --- End Account Selectors --- */}
        <SearchableSelect label="Select Group" options={groups.map((g) => ({ id: g.id, label: g.name }))} value={selectedGroup} onChange={(id) => setSelectedGroup(id || '')} isClearable placeholder="Search or select a group..." />
        <SearchableSelect label="Select Category" options={categories.map((c) => ({ id: c.name, label: c.name }))} value={selectedCategory} onChange={(value) => setSelectedCategory(value || '')} placeholder="Search or select a category..." required />
        <div className="flex justify-end space-x-2 pt-4">
          <button type="button" onClick={onClose} disabled={loading} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"> Cancel </button>
          <button type="button" onClick={handleAssign} disabled={loading || !selectedCategory || !account1} className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"> {loading ? 'Saving...' : 'Save Changes'} </button>
        </div>
      </div>
    </Modal>
  );
}