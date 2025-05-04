import React, { useState } from 'react';
import { doc, deleteDoc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

interface TransactionDeleteModalProps {
  transactionId: string;
  onClose: () => void;
}

const TransactionDeleteModal: React.FC<TransactionDeleteModalProps> = ({ transactionId, onClose }) => {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      // 1. Get transaction details
      const transactionRef = doc(db, 'transactions', transactionId);
      const transactionDoc = await getDoc(transactionRef);
      if (!transactionDoc.exists()) {
        toast.error('Transaction not found');
        setLoading(false);
        return;
      }

      const transactionData = transactionDoc.data();
      // Ensure we use a positive amount for reversal calculations
      const transactionAmount = Math.abs(transactionData.amount || 0);
      if (transactionAmount === 0) {
          console.warn(`Transaction ${transactionId} has zero amount. Deleting without balance update.`);
          // Proceed to delete if amount is zero without balance changes
      } else {
            // 2. Reverse effect on Account From (if applicable and internal)
            if (transactionData.accountFrom) {
                try {
                    const fromAccountRef = doc(db, 'accounts', transactionData.accountFrom);
                    const fromAccountDoc = await getDoc(fromAccountRef);

                    if (fromAccountDoc.exists()) { // Check if it's a valid internal account
                        const fromAccountData = fromAccountDoc.data();
                        if (transactionData.type === 'expense' || transactionData.type === 'transfer') {
                            await updateDoc(fromAccountRef, {
                                balance: fromAccountData.balance + transactionAmount, // Add back positive amount
                                updatedAt: new Date()
                            });
                            console.log(`Delete Reversal: Added ${transactionAmount} back to ${transactionData.accountFrom}`);
                        }
                    } else {
                        console.log(`AccountFrom ${transactionData.accountFrom} not found or is external, skipping balance update.`);
                    }
                } catch (error) {
                    console.error(`Error reversing balance for accountFrom ${transactionData.accountFrom}:`, error);
                    toast.error(`Failed to update balance for 'From' account. Delete cancelled.`);
                    setLoading(false);
                    return; // Stop the delete process if balance update fails
                }
            }

            // 3. Reverse effect on Account To (if applicable and internal)
            if (transactionData.accountTo) {
                 try {
                    const toAccountRef = doc(db, 'accounts', transactionData.accountTo);
                    const toAccountDoc = await getDoc(toAccountRef);

                    if (toAccountDoc.exists()) { // Check if it's a valid internal account
                        const toAccountData = toAccountDoc.data();
                        if (transactionData.type === 'income' || transactionData.type === 'transfer') {
                            await updateDoc(toAccountRef, {
                                balance: toAccountData.balance - transactionAmount, // Subtract positive amount
                                updatedAt: new Date()
                            });
                            console.log(`Delete Reversal: Subtracted ${transactionAmount} from ${transactionData.accountTo}`);
                        }
                    } else {
                         console.log(`AccountTo ${transactionData.accountTo} not found or is external, skipping balance update.`);
                    }
                } catch (error) {
                    console.error(`Error reversing balance for accountTo ${transactionData.accountTo}:`, error);
                    toast.error(`Failed to update balance for 'To' account. Delete cancelled.`);
                    // Consider: If the 'From' account update succeeded, should you try to revert it here? Complex. Better to stop.
                    setLoading(false);
                    return; // Stop the delete process
                }
            }
      } // End of balance update block (if amount > 0)

      // 4. Delete the transaction document itself
      await deleteDoc(transactionRef);
      toast.success('Transaction deleted successfully');
      onClose(); // Close modal only on full success

    } catch (error) {
        // Catch errors from fetching the transaction or the final deleteDoc
      console.error('Error during delete process:', error);
      toast.error(`Failed to delete transaction. ${error instanceof Error ? error.message : ''}`);
    } finally {
      setLoading(false);
    }
};

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2 text-red-600">
        <AlertTriangle className="h-5 w-5" />
        <h3 className="text-lg font-medium">Delete Transaction</h3>
      </div>
      
      <p className="text-sm text-gray-500">
        Are you sure you want to delete this transaction? This action will also update the affected account balances and cannot be undone.
      </p>

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700"
        >
          {loading ? 'Deleting...' : 'Delete Transaction'}
        </button>
      </div>
    </div>
  );
};

export default TransactionDeleteModal;