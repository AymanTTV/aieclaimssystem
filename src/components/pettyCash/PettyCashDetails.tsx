import React, { useState, useEffect } from 'react';
import { PettyCashTransaction } from '../../types/pettyCash';
import { format } from 'date-fns';
import { doc, getDoc, Timestamp } from 'firebase/firestore'; // Import Timestamp
import { db } from '../../lib/firebase';

interface PettyCashDetailsProps {
  transaction: PettyCashTransaction;
}

const PettyCashDetails: React.FC<PettyCashDetailsProps> = ({ transaction }) => {
  const [createdByName, setCreatedByName] = useState<string | null>(null);

  useEffect(() => {
    const fetchCreatedByName = async () => {
      if (transaction.createdBy) {
        try {
          const userDoc = await getDoc(doc(db, 'users', transaction.createdBy));
          if (userDoc.exists()) {
            setCreatedByName(userDoc.data().name);
          } else {
            setCreatedByName('Unknown User');
          }
        } catch (error) {
          console.error('Error fetching user:', error);
          setCreatedByName('Unknown User');
        }
      }
    };

    fetchCreatedByName();
  }, [transaction.createdBy]);

  // Function to convert Timestamp to Date
  const convertTimestampToDate = (timestamp: Timestamp | Date | undefined) => {
    if (timestamp instanceof Timestamp) {
      return timestamp.toDate();
    }
    if (timestamp instanceof Date) {
      return timestamp;
    }
    return undefined;
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h3 className="text-sm font-medium text-gray-500">Name</h3>
          <p className="mt-1">{transaction.name}</p>
        </div>
        <div>
          <h3 className="text-sm font-medium text-gray-500">Telephone</h3>
          <p className="mt-1">{transaction.telephone}</p>
        </div>
        <div className="col-span-2">
          <h3 className="text-sm font-medium text-gray-500">Description</h3>
          <p className="mt-1">{transaction.description}</p>
        </div>
        <div>
          <h3 className="text-sm font-medium text-gray-500">Amount In</h3>
          <p className="mt-1 text-green-600">
            {transaction.amountIn && Number(transaction.amountIn) > 0
              ? `£${Number(transaction.amountIn).toFixed(2)}`
              : '-'}
          </p>
        </div>
        <div>
          <h3 className="text-sm font-medium text-gray-500">Amount Out</h3>
          <p className="mt-1 text-red-600">
            {transaction.amountOut && Number(transaction.amountOut) > 0
              ? `£${Number(transaction.amountOut).toFixed(2)}`
              : '-'}
          </p>
        </div>
        <div>
          <h3 className="text-sm font-medium text-gray-500">Balance</h3>
          <p className="mt-1 font-medium">£{Number(transaction.balance || 0).toFixed(2)}</p>
        </div>
        <div>
          <h3 className="text-sm font-medium text-gray-500">Status</h3>
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize mt-1
            ${transaction.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
              transaction.status === 'paid' ? 'bg-green-100 text-green-800' :
              'bg-red-100 text-red-800'}`}
          >
            {transaction.status}
          </span>
        </div>
        {transaction.note && (
          <div className="col-span-2">
            <h3 className="text-sm font-medium text-gray-500">Note</h3>
            <p className="mt-1">{transaction.note}</p>
          </div>
        )}
      </div>

      <div className="border-t pt-4 text-sm text-gray-500">
        <div className="flex justify-between">
          <div>Created By: {createdByName || transaction.createdBy || 'Loading...'}</div>
          <div>
            Last Updated: {convertTimestampToDate(transaction.updatedAt) ? format(convertTimestampToDate(transaction.updatedAt)!, 'dd/MM/yyyy HH:mm') : 'Invalid Date'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PettyCashDetails;