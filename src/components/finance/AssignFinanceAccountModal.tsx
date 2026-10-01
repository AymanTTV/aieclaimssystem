// src/components/finance/AssignFinanceAccountModal.tsx
import React, { useState } from 'react';
import Modal from '../ui/Modal';
import { writeBatch, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import toast from 'react-hot-toast';
import { Account, Transaction } from '../../types';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';
import { Building2 } from 'lucide-react';

interface AssignFinanceAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedIds: Set<string>;
  accounts: Account[];
  transactions?: Transaction[];
  collectionName?: 'transactions' | 'invoices';
  onSuccess: () => void;
}

export const AssignFinanceAccountModal: React.FC<AssignFinanceAccountModalProps> = ({
  isOpen,
  onClose,
  selectedIds,
  accounts = [],
  transactions = [],
  collectionName = 'transactions',
  onSuccess,
}) => {
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { formatCurrency } = useFormattedDisplay();

  const handleAssign = async () => {
    if (selectedIds.size === 0) return;
    setIsSubmitting(true);
    const targetAccount = accounts.find((a) => a.id === selectedAccountId);
    const toastId = toast.loading(
      targetAccount
        ? `Assigning ${targetAccount.name} to ${selectedIds.size} record(s)...`
        : `Removing account from ${selectedIds.size} record(s)...`
    );

    try {
      const batch = writeBatch(db);

      selectedIds.forEach((id) => {
        const docRef = doc(db, collectionName, id);

        if (!targetAccount) {
          // Remove account assignment
          batch.update(docRef, {
            accountId: null,
            accountName: null,
            accountFrom: null,
            accountTo: null,
            accountsFrom: [],
            accountsTo: [],
            relatedAccountName: null,
          });
        } else {
          // Find matching transaction if available
          const tx = transactions.find((t) => t.id === id);
          const isExpense =
            tx?.type?.toLowerCase() === 'expense' ||
            (tx as any)?.transactionType === 'EXPENSE';
          const isIncome =
            tx?.type?.toLowerCase() === 'income' ||
            (tx as any)?.transactionType === 'INCOME';

          if (isExpense) {
            batch.update(docRef, {
              accountFrom: targetAccount.id,
              accountsFrom: [targetAccount.id],
              accountId: targetAccount.id,
              accountName: targetAccount.name,
              relatedAccountName: targetAccount.name,
            });
          } else if (isIncome) {
            batch.update(docRef, {
              accountTo: targetAccount.id,
              accountsTo: [targetAccount.id],
              accountId: targetAccount.id,
              accountName: targetAccount.name,
              relatedAccountName: targetAccount.name,
            });
          } else {
            // General or Invoice record
            batch.update(docRef, {
              accountId: targetAccount.id,
              accountName: targetAccount.name,
              accountTo: targetAccount.id,
              accountsTo: [targetAccount.id],
              accountFrom: targetAccount.id,
              accountsFrom: [targetAccount.id],
              relatedAccountName: targetAccount.name,
            });
          }
        }
      });

      await batch.commit();
      toast.success(
        targetAccount
          ? `Assigned ${targetAccount.name} to ${selectedIds.size} record(s)`
          : `Removed account from ${selectedIds.size} record(s)`,
        { id: toastId }
      );
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Failed to assign account in bulk:', error);
      toast.error('Failed to assign account', { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Assign Account" size="sm">
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-slate-700">
          <Building2 className="w-5 h-5 text-blue-600" />
          <p className="text-sm">
            Assign an account to the <strong className="text-blue-700 font-bold">{selectedIds.size}</strong> selected record(s).
          </p>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Select Account
          </label>
          <select
            value={selectedAccountId}
            onChange={(e) => setSelectedAccountId(e.target.value)}
            className="w-full h-11 px-3 text-sm font-medium rounded-xl border border-slate-300 bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-slate-900 transition"
          >
            <option value="">None (Remove Account Assignment)</option>
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name} — Balance: {formatCurrency(acc.balance || 0)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 border border-slate-300 text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 rounded-xl transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleAssign}
            disabled={isSubmitting}
            className="px-5 py-2 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm transition disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? 'Assigning...' : 'Assign Account'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default AssignFinanceAccountModal;
