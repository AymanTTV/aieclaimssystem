import React, { useState, useEffect } from 'react';
import { Account, TransferHistory } from '../../types/finance';
import { collection, addDoc, doc, updateDoc, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import FormField from '../ui/FormField';
import { format } from 'date-fns';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';
import toast from 'react-hot-toast';

interface TransferMoneyModalProps {
  accounts: Account[];
  onClose: () => void;
}

const TransferMoneyModal: React.FC<TransferMoneyModalProps> = ({ accounts, onClose }) => {
  const { user } = useAuth();
  const { formatCurrency } = useFormattedDisplay();
  const [loading, setLoading] = useState(false);
  const [transferHistory, setTransferHistory] = useState<TransferHistory[]>([]);
  const [formData, setFormData] = useState({
    fromAccount: '',
    fromAccountExternal: '',
    toAccount: '',
    toAccountExternal: '',
    amount: '',
    description: ''
  });
  const [isFromExternal, setIsFromExternal] = useState(false);
  const [isToExternal, setIsToExternal] = useState(false);

  React.useEffect(() => {
    fetchTransferHistory();
  }, []);

  const fetchTransferHistory = async () => {
    try {
      const q = query(collection(db, 'transferHistory'), orderBy('date', 'desc'));
      const snapshot = await getDocs(q);
      const history = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as TransferHistory[];
      setTransferHistory(history);
    } catch (error) {
      console.error('Error fetching transfer history:', error);
      toast.error('Failed to load transfer history');
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setLoading(true);

    try {
      // Create transfer record
      await addDoc(collection(db, 'transferHistory'), {
        fromAccount: isFromExternal ? formData.fromAccountExternal : formData.fromAccount,
        toAccount: isToExternal ? formData.toAccountExternal : formData.toAccount,
        amount,
        description: formData.description,
        date: new Date(),
        createdBy: user.name || user.email,
        createdAt: new Date()
      });

      // Update account balances only for internal accounts
      if (!isFromExternal && formData.fromAccount) {
        const fromAccountRef = doc(db, 'accounts', formData.fromAccount);
        const fromAccountDoc = await getDoc(fromAccountRef);
        if (fromAccountDoc.exists()) {
          const fromAccount = fromAccountDoc.data();
          await updateDoc(fromAccountRef, {
            balance: fromAccount.balance - amount,
            updatedAt: new Date()
          });
        }
      }

      if (!isToExternal && formData.toAccount) {
        const toAccountRef = doc(db, 'accounts', formData.toAccount);
        const toAccountDoc = await getDoc(toAccountRef);
        if (toAccountDoc.exists()) {
          const toAccount = toAccountDoc.data();
          await updateDoc(toAccountRef, {
            balance: toAccount.balance + amount,
            updatedAt: new Date()
          });
        }
      }

      // Create transaction records
      await addDoc(collection(db, 'transactions'), {
        type: 'transfer',
        category: 'transfer_out',
        amount: -amount,
        description: `Transfer to ${isToExternal ? formData.toAccountExternal : accounts.find(a => a.id === formData.toAccount)?.name}`,
        date: new Date(),
        accountFrom: isFromExternal ? formData.fromAccountExternal : formData.fromAccount,
        accountTo: isToExternal ? formData.toAccountExternal : formData.toAccount,
        createdAt: new Date(),
        createdBy: user.id,
        status: 'completed',
        paymentStatus: 'paid'
      });

      await addDoc(collection(db, 'transactions'), {
        type: 'transfer',
        category: 'transfer_in',
        amount,
        description: `Transfer from ${isFromExternal ? formData.fromAccountExternal : accounts.find(a => a.id === formData.fromAccount)?.name}`,
        date: new Date(),
        accountFrom: isFromExternal ? formData.fromAccountExternal : formData.fromAccount,
        accountTo: isToExternal ? formData.toAccountExternal : formData.toAccount,
        createdAt: new Date(),
        createdBy: user.id,
        status: 'completed',
        paymentStatus: 'paid'
      });

      toast.success('Transfer completed successfully');
      await fetchTransferHistory();
      setFormData({
        fromAccount: '',
        fromAccountExternal: '',
        toAccount: '',
        toAccountExternal: '',
        amount: '',
        description: ''
      });
    } catch (error) {
      console.error('Error transferring money:', error);
      toast.error('Failed to transfer money');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleTransfer} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">From Account</label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={isFromExternal}
                  onChange={(e) => setIsFromExternal(e.target.checked)}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-sm text-gray-600">External</span>
              </label>
            </div>
            {isFromExternal ? (
              <FormField
                label="External Account Name"
                value={formData.fromAccountExternal}
                onChange={(e) => setFormData({ ...formData, fromAccountExternal: e.target.value })}
                placeholder="Enter external account name"
              />
            ) : (
              <select
                value={formData.fromAccount}
                onChange={(e) => setFormData({ ...formData, fromAccount: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
              >
                <option value="">Select account</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name} ({formatCurrency(account.balance)})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">To Account</label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={isToExternal}
                  onChange={(e) => setIsToExternal(e.target.checked)}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-sm text-gray-600">External</span>
              </label>
            </div>
            {isToExternal ? (
              <FormField
                label="External Account Name"
                value={formData.toAccountExternal}
                onChange={(e) => setFormData({ ...formData, toAccountExternal: e.target.value })}
                placeholder="Enter external account name"
              />
            ) : (
              <select
                value={formData.toAccount}
                onChange={(e) => setFormData({ ...formData, toAccount: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
              >
                <option value="">Select account</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name} ({formatCurrency(account.balance)})
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        <FormField
          type="number"
          label="Amount"
          value={formData.amount}
          onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
          required
          min="0.01"
          step="0.01"
        />

        <div>
          <label className="block text-sm font-medium text-gray-700">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={2}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
            placeholder="Add transfer description..."
          />
        </div>

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
            {loading ? 'Processing...' : 'Transfer Money'}
          </button>
        </div>
      </form>

      <div className="border-t pt-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Transfer History</h3>
        <div className="space-y-4">
          {transferHistory.map((transfer) => (
            <div key={transfer.id} className="bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between">
                <div>
                  <p className="font-medium">
                    {accounts.find(a => a.id === transfer.fromAccount)?.name || transfer.fromAccount} →{' '}
                    {accounts.find(a => a.id === transfer.toAccount)?.name || transfer.toAccount}
                  </p>
                  <p className="text-sm text-gray-500">{transfer.description}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{formatCurrency(transfer.amount)}</p>
                  <p className="text-sm text-gray-500">{format(transfer.date, 'dd/MM/yyyy HH:mm')}</p>
                </div>
              </div>
            </div>
          ))}
          {transferHistory.length === 0 && (
            <p className="text-center text-gray-500">No transfer history</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default TransferMoneyModal;
