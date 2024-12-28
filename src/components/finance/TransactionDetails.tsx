import React from 'react';
import { Transaction, Vehicle } from '../../types';
import { format, isValid } from 'date-fns';
import StatusBadge from '../StatusBadge';
import { DollarSign, Calendar, FileText, Car, User } from 'lucide-react';

interface TransactionDetailsProps {
  transaction: Transaction;
  vehicle?: Vehicle;
}

const TransactionDetails: React.FC<TransactionDetailsProps> = ({ transaction, vehicle }) => {
  const formatDate = (date: Date | null | undefined): string => {
    if (!date || !isValid(date)) {
      return 'N/A';
    }
    return format(date, 'MMM dd, yyyy');
  };

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
          <p className="mt-1">{formatDate(transaction.date)}</p>
        </div>
      </div>

      {/* Payment Information */}
      <div className="border-t pt-4">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Payment Details</h3>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-500">Status</span>
            <StatusBadge status={transaction.paymentStatus} />
          </div>
          {transaction.paidAmount !== undefined && (
            <div className="flex justify-between">
              <span className="text-gray-500">Paid Amount</span>
              <span className="text-green-600">£{transaction.paidAmount.toFixed(2)}</span>
            </div>
          )}
          {transaction.remainingAmount !== undefined && transaction.remainingAmount > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-500">Remaining Amount</span>
              <span className="text-amber-600">£{transaction.remainingAmount.toFixed(2)}</span>
            </div>
          )}
          {transaction.paymentMethod && (
            <div className="flex justify-between">
              <span className="text-gray-500">Payment Method</span>
              <span className="capitalize">{transaction.paymentMethod.replace('_', ' ')}</span>
            </div>
          )}
          {transaction.paymentReference && (
            <div className="flex justify-between">
              <span className="text-gray-500">Reference</span>
              <span>{transaction.paymentReference}</span>
            </div>
          )}
        </div>
      </div>

      {/* Vehicle Information */}
      {vehicle && (
        <div className="border-t pt-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Vehicle Details</h3>
          <div className="space-y-2">
            <div className="flex items-center">
              <Car className="w-5 h-5 text-gray-400 mr-2" />
              <div>
                <p className="font-medium">{vehicle.make} {vehicle.model}</p>
                <p className="text-sm text-gray-500">{vehicle.registrationNumber}</p>
              </div>
            </div>
            {vehicle.owner && (
              <div className="flex items-center">
                <User className="w-5 h-5 text-gray-400 mr-2" />
                <span>{vehicle.owner.isDefault ? 'AIE Skyline' : vehicle.owner.name}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Description */}
      <div className="border-t pt-4">
        <h3 className="text-sm font-medium text-gray-500">Description</h3>
        <p className="mt-1">{transaction.description}</p>
      </div>

      {/* Creation Information */}
      <div className="text-sm text-gray-500">
        Created at {formatDate(transaction.createdAt)}
      </div>
    </div>
  );
};

export default TransactionDetails;