import React from 'react';
import { PettyCashTransaction } from '../../types/pettyCash';
import { format } from 'date-fns';

interface PettyCashDetailsProps {
  transaction: PettyCashTransaction;
}

const PettyCashDetails: React.FC<PettyCashDetailsProps> = ({ transaction }) => {
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
            {transaction.amountIn > 0 ? `£${transaction. amountIn.toFixed(2)}` : '-'}
          </p>
        </div>
        <div>
          <h3 className="text-sm font-medium text-gray-500">Amount Out</h3>
          <p className="mt-1 text-red-600">
            {transaction.amountOut > 0 ? `£${transaction.amountOut.toFixed(2)}` : '-'}
          </p>
        </div>
        <div>
          <h3 className="text-sm font-medium text-gray-500">Balance</h3>
          <p className="mt-1 font-medium">£{transaction.balance.toFixed(2)}</p>
        </div>
        <div>
          <h3 className="text-sm font-medium text-gray-500">Status</h3>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize mt-1
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

      {/* Creation Information */}
      <div className="border-t pt-4 text-sm text-gray-500">
        <div className="flex justify-between">
          <div>Created: {format(transaction.createdAt, 'dd/MM/yyyy HH:mm')}</div>
          <div>Last Updated: {format(transaction.updatedAt, 'dd/MM/yyyy HH:mm')}</div>
        </div>
      </div>
    </div>
  );
};

export default PettyCashDetails;