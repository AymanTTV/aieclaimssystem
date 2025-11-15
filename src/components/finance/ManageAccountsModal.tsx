// src/components/finance/ManageAccountsModal.tsx
import React, { useState, useMemo } from 'react';
import { Account, Transaction } from '../../types';
import { collection, addDoc, doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import toast from 'react-hot-toast';
import FormField from '../ui/FormField';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';
import { AlertTriangle } from 'lucide-react';
import Modal from '../ui/Modal'; // Import Modal component

interface ManageAccountsModalProps {
  accounts: Account[];
  transactions: Transaction[]; // Pass ALL transactions
  onClose: () => void;
}

const ManageAccountsModal: React.FC<ManageAccountsModalProps> = ({
  accounts = [],
  transactions = [],
  onClose
}) => {
  const [newAccountName, setNewAccountName] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [editName, setEditName] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<Account | null>(null);

  const { formatCurrency } = useFormattedDisplay();

  // Calculate balances using arrays and FULL amount per account
  const accountBalances = useMemo(() => {
    if (!accounts || accounts.length === 0) return new Map<string, number>();

    const balances = new Map<string, number>();
    const accountIds = new Set(accounts.map(a => a.id));

    accounts.forEach(acc => {
        balances.set(acc.id, 0);
    });

    transactions.forEach(txn => {
        const fullAmount = txn.amount; // Use the full amount

        // Add income to credited accounts
        if (txn.type === 'income' && txn.accountsTo) {
            txn.accountsTo.forEach(accId => {
                if (balances.has(accId)) {
                    balances.set(accId, (balances.get(accId) || 0) + fullAmount);
                }
            });
        }
        // Subtract expense from debited accounts
        else if (txn.type === 'expense' && txn.accountsFrom) {
             txn.accountsFrom.forEach(accId => {
                if (balances.has(accId)) {
                    balances.set(accId, (balances.get(accId) || 0) - fullAmount);
                }
            });
        }
        // Handle legacy or unassigned
        else if ((!txn.accountsFrom || txn.accountsFrom.length === 0) && (!txn.accountsTo || txn.accountsTo.length === 0)) {
            const defaultAccount = accounts.find(a => a.name === 'AIE SKYLINE ACCOUNT' || a.name === 'AIE Skyline Limited');
            if (defaultAccount && balances.has(defaultAccount.id)) {
                const amountToAdd = (txn.type === 'income' ? fullAmount : -fullAmount);
                balances.set(defaultAccount.id, (balances.get(defaultAccount.id) || 0) + amountToAdd);
            }
        }
    });

    return balances;
  }, [accounts, transactions]);


  const handleAddAccount = async () => {
    if (!newAccountName.trim()) { toast.error('Please enter an account name'); return; }
    if (accounts.some(acc => acc.name.toLowerCase() === newAccountName.trim().toLowerCase())) { toast.error(`An account named "${newAccountName.trim()}" already exists.`); return; }
    setLoading(true);
    try {
      await addDoc(collection(db, 'accounts'), { name: newAccountName.trim(), balance: 0, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      toast.success('Account added successfully');
      setNewAccountName('');
    } catch (error) { console.error('Error adding account:', error); toast.error('Failed to add account');
    } finally { setLoading(false); }
  };

  const handleUpdateAccount = async (accountId: string) => {
    if (!editName.trim()) { toast.error('Please enter an account name'); return; }
    if (accounts.some(acc => acc.id !== accountId && acc.name.toLowerCase() === editName.trim().toLowerCase())) { toast.error(`An account named "${editName.trim()}" already exists.`); return; }
    setLoading(true);
    try {
      await updateDoc(doc(db, 'accounts', accountId), { name: editName.trim(), updatedAt: serverTimestamp() });
      toast.success('Account updated successfully');
      setEditingAccount(null);
      setEditName('');
    } catch (error) { console.error('Error updating account:', error); toast.error('Failed to update account');
    } finally { setLoading(false); }
  };

  // Check usage based on arrays
  const handleDeleteClick = (account: Account) => {
    const balance = accountBalances.get(account.id) || 0;
    if (balance !== 0) { toast.error(`Cannot delete "${account.name}". Balance: ${formatCurrency(balance)}.`); return; }

    const isUsed = transactions.some(t => (t.accountsFrom?.includes(account.id)) || (t.accountsTo?.includes(account.id)));
    if (isUsed) { toast.error(`Cannot delete "${account.name}". Associated with transactions. Re-assign them first.`); return; }

    setShowDeleteConfirm(account);
  };

  // Actual delete function for modal
  const handleConfirmDelete = async () => {
    if (!showDeleteConfirm) return;
    setLoading(true);
    try {
      await deleteDoc(doc(db, 'accounts', showDeleteConfirm.id));
      toast.success(`Account "${showDeleteConfirm.name}" deleted successfully`);
      setShowDeleteConfirm(null);
    } catch (error) { console.error('Error deleting account:', error); toast.error('Failed to delete account');
    } finally { setLoading(false); }
  };

  return (
    <>
      <div className="space-y-6">
        {/* Add Account Form */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Add New Account</h3>
          <div className="flex space-x-2">
            <FormField value={newAccountName} onChange={(e) => setNewAccountName(e.target.value)} placeholder="Enter account name" inputClassName="flex-grow" />
            <button onClick={handleAddAccount} disabled={loading} className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-600 disabled:opacity-50 flex-shrink-0"> {loading ? 'Adding...' : 'Add'} </button>
          </div>
        </div>

        {/* Manage Accounts List */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Manage Accounts</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto pr-2 border rounded-md p-2">
            {accounts.length === 0 && <p className="text-sm text-gray-500">No accounts created yet.</p>}
            {accounts.map((account) => {
              const balance = accountBalances.get(account.id) || 0;
              const balanceColor = balance >= 0 ? 'text-green-600' : 'text-red-600';
              return (
                <div key={account.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-150 ease-in-out">
                  <div className="flex-1 min-w-0 mr-4">
                      {editingAccount?.id === account.id ? (
                        <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full px-3 py-1 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm" autoFocus onKeyDown={(e) => e.key === 'Enter' && handleUpdateAccount(account.id)} />
                      ) : (
                        <span className="font-medium text-gray-800 truncate" title={account.name}>{account.name}</span>
                      )}
                  </div>
                  <div className="flex items-center space-x-4 flex-shrink-0">
                    <span className={`font-semibold ${balanceColor} text-lg w-28 text-right`} title={`Balance: ${formatCurrency(balance)}`}>{formatCurrency(balance)}</span>
                    <div className="flex space-x-2 w-24 justify-end">
                      {/* --- CORRECTED JSX --- */}
                      {editingAccount?.id === account.id ? (
                        <>
                          <button onClick={() => handleUpdateAccount(account.id)} disabled={loading} className="text-green-600 hover:text-green-800 disabled:opacity-50 text-sm font-medium"> Save </button>
                          <button onClick={() => { setEditingAccount(null); setEditName(''); }} className="text-gray-600 hover:text-gray-800 text-sm"> Cancel </button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => { setEditingAccount(account); setEditName(account.name); }} className="text-blue-600 hover:text-blue-800 text-sm font-medium"> Edit </button>
                          <button onClick={() => handleDeleteClick(account)} disabled={loading} className="text-red-600 hover:text-red-800 disabled:opacity-50 text-sm font-medium"> Delete </button>
                        </>
                      )}
                      {/* --- END CORRECTION --- */}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Close Button */}
        <div className="flex justify-end pt-4 border-t border-gray-200">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"> Close </button>
        </div>
      </div>

       {/* Delete Confirmation Modal */}
       {showDeleteConfirm && (
            <Modal isOpen={!!showDeleteConfirm} onClose={() => setShowDeleteConfirm(null)} title="Confirm Delete Account" size="sm">
                <div className="p-4">
                    <div className="flex items-start">
                        <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10"><AlertTriangle className="h-6 w-6 text-red-600" aria-hidden="true" /></div>
                        <div className="ml-4 mt-0 text-left">
                            <h3 className="text-lg leading-6 font-medium text-gray-900">Delete Account</h3>
                            <div className="mt-2"><p className="text-sm text-gray-500">Are you sure you want to delete the account "{showDeleteConfirm.name}"?</p><p className="text-sm text-gray-500 mt-1">This action cannot be undone. Ensure the balance is zero and it's not used in transactions.</p></div>
                        </div>
                    </div>
                    <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse gap-3">
                        <button type="button" disabled={loading} onClick={handleConfirmDelete} className="inline-flex justify-center w-full rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50">{loading ? 'Deleting...' : 'Delete'}</button>
                        <button type="button" disabled={loading} onClick={() => setShowDeleteConfirm(null)} className="mt-3 inline-flex justify-center w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm disabled:opacity-50">Cancel</button>
                    </div>
                </div>
            </Modal>
        )}
    </>
  );
};

export default ManageAccountsModal;