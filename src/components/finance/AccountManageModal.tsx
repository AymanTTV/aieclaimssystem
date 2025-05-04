import React, { useState } from 'react';
import { Account } from '../../types/finance';
import { collection, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import toast from 'react-hot-toast';
import FormField from '../ui/FormField';

interface AccountManageModalProps {
  accounts: Account[];
  onClose: () => void;
}

const AccountManageModal: React.FC<AccountManageModalProps> = ({ accounts, onClose }) => {
  const [newAccountName, setNewAccountName] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  const handleAddAccount = async () => {
    if (!newAccountName.trim()) {
      toast.error('Please enter an account name');
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, 'accounts'), {
        name: newAccountName,
        balance: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      toast.success('Account added successfully');
      setNewAccountName('');
    } catch (error) {
      console.error('Error adding account:', error);
      toast.error('Failed to add account');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAccount = async (account: Account) => {
    if (!editingAccount?.name.trim()) {
      toast.error('Please enter an account name');
      return;
    }

    setLoading(true);
    try {
      await updateDoc(doc(db, 'accounts', account.id), {
        name: editingAccount.name,
        updatedAt: new Date()
      });

      toast.success('Account updated successfully');
      setEditingAccount(null);
    } catch (error) {
      console.error('Error updating account:', error);
      toast.error('Failed to update account');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async (account: Account) => {
    if (!window.confirm(`Are you sure you want to delete ${account.name}?`)) {
      return;
    }

    setLoading(true);
    try {
      await deleteDoc(doc(db, 'accounts', account.id));
      toast.success('Account deleted successfully');
    } catch (error) {
      console.error('Error deleting account:', error);
      toast.error('Failed to delete account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Add New Account</h3>
        <div className="flex space-x-2">
          <FormField
            value={newAccountName}
            onChange={(e) => setNewAccountName(e.target.value)}
            placeholder="Enter account name"
          />
          <button
            onClick={handleAddAccount}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-600"
          >
            Add
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Manage Accounts</h3>
        <div className="space-y-2">
          {accounts.map((account) => (
            <div key={account.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              {editingAccount?.id === account.id ? (
                <input
                  type="text"
                  value={editingAccount.name}
                  onChange={(e) => setEditingAccount({ ...editingAccount, name: e.target.value })}
                  className="flex-1 mr-2 px-3 py-2 border rounded-md"
                />
              ) : (
                <span className="flex-1">{account.name}</span>
              )}
              <div className="flex space-x-2">
                {editingAccount?.id === account.id ? (
                  <>
                    <button
                      onClick={() => handleUpdateAccount(account)}
                      disabled={loading}
                      className="text-green-600 hover:text-green-800"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingAccount(null)}
                      className="text-gray-600 hover:text-gray-800"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setEditingAccount(account)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteAccount(account)}
                      disabled={loading}
                      className="text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default AccountManageModal;