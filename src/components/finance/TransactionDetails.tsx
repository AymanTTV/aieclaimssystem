import React from 'react';
import { Transaction, Vehicle } from '../../types';
import { format } from 'date-fns';
import StatusBadge from '../StatusBadge';
import { DollarSign, Calendar, FileText, Car, User } from 'lucide-react';

interface TransactionDetailsProps {
  transaction: Transaction;
  vehicle?: Vehicle;
}

const TransactionDetails: React.FC<TransactionDetailsProps> = ({ transaction, vehicle }) => {
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

      {/* Vehicle Information */}
      {vehicle && (
        <div className="border-t pt-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Vehicle Details</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium text-gray-500">Vehicle</h4>
              <p className="mt-1">
                {vehicle.make} {vehicle.model} - {vehicle.registrationNumber}
              </p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-500">Owner</h4>
              <p className="mt-1">
                {vehicle.owner?.isDefault ? 'AIE Skyline' : vehicle.owner?.name}
              </p>
              {!vehicle.owner?.isDefault && vehicle.owner?.address && (
                <p className="text-sm text-gray-500 mt-1">{vehicle.owner.address}</p>
              )}
            </div>
          </div>
        </div>
      )}


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