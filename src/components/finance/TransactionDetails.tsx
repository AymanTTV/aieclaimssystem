import React from 'react';
import { Transaction } from '../../types';
import { format } from 'date-fns';
import StatusBadge from '../StatusBadge';
import { DollarSign, Calendar, FileText, Car } from 'lucide-react';

interface TransactionDetailsProps {
  transaction: Transaction;
}

const TransactionDetails: React.FC<TransactionDetailsProps> = ({ transaction }) => {
  return (
    <div className="space-y-6">
      {/* Basic Information */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h3 className="text-sm font-medium text-gray-500">Type</h3>
          <div className="mt-1">
            <StatusBadge status={transaction.type} />
          </div>
        </div>
        <div>
          <h3 className="text-sm font-medium text-gray-500">Category</h3>
          <p className="mt-1">{transaction.category}</p>
        </div>
        <div>
          <h3 className="text-sm font-medium text-gray-500">Amount</h3>
          <p className={`mt-1 text-lg font-medium ${
            transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
          }`}>
            £{transaction.amount.toFixed(2)}
          </p>
        </div>
        <div>
          <h3 className="text-sm font-medium text-gray-500">Date</h3>
          <p className="mt-1">{format(transaction.date, 'MMM dd, yyyy')}</p>
        </div>
      </div>

      {/* Description */}
      <div>
        <h3 className="text-sm font-medium text-gray-500">Description</h3>
        <p className="mt-1">{transaction.description}</p>
      </div>

      {/* Reference Information */}
      {transaction.referenceId && (
        <div>
          <h3 className="text-sm font-medium text-gray-500">Reference</h3>
          <p className="mt-1">#{transaction.referenceId}</p>
        </div>
      )}

      {/* Vehicle Information */}
      {transaction.vehicleId && (
        <div>
          <h3 className="text-sm font-medium text-gray-500">Related Vehicle</h3>
          <p className="mt-1">#{transaction.vehicleId}</p>
        </div>
      )}

      {/* Status Information */}
      {transaction.status && (
        <div>
          <h3 className="text-sm font-medium text-gray-500">Status</h3>
          <div className="mt-1">
            <StatusBadge status={transaction.status} />
          </div>
        </div>
      )}

      {/* Creation Information */}
      <div className="text-sm text-gray-500">
        Created at {format(transaction.createdAt, 'MMM dd, yyyy HH:mm')}
      </div>
    </div>
  );
};

export default TransactionDetails;