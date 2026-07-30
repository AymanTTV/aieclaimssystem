// src/components/finance/TransactionDetails.tsx
import React, { useState } from 'react';
import { Transaction, Vehicle, Customer, Account } from '../../types';
import { format, isValid } from 'date-fns';
import StatusBadge from '../ui/StatusBadge';
import { Car, User, Mail, Phone, Link2, RefreshCw, StopCircle, ArrowRight, ArrowLeft } from 'lucide-react';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';
import { Timestamp, doc, updateDoc } from 'firebase/firestore'; 
import { db } from '../../lib/firebase'; 
import toast from 'react-hot-toast';

interface TransactionDetailsProps {
  transaction: Transaction;
  vehicle?: Vehicle;
  customer?: Customer;
  accounts: Account[];
}

const TransactionDetailsModal: React.FC<TransactionDetailsProps> = ({
  transaction,
  vehicle,
  accounts = [],
  customer
}) => {
  const { formatCurrency } = useFormattedDisplay();
  const [loadingStop, setLoadingStop] = useState(false); 

  const formatDate = (date: Date | Timestamp | null | undefined): string => {
    if (!date) return 'N/A';
    let dateObj: Date | null = null;
    try {
      if ((date as any)?.toDate) {
        dateObj = (date as any).toDate();
      } else if (date instanceof Date) {
        dateObj = date;
      } else {
         dateObj = new Date(date as string);
      }
      return dateObj && isValid(dateObj) ? format(dateObj, 'dd/MM/yyyy HH:mm') : 'Invalid Date';
    } catch (error) {
      console.error('Error formatting date:', error, date);
      return 'Invalid Date';
    }
  };

  const Section = ({ title, children, icon }: { title: string; children: React.ReactNode, icon?: React.ReactNode }) => (
    <div className="border-t border-gray-200 pt-6 mt-6 first:border-t-0 first:pt-0 first:mt-0">
      <div className="flex items-center mb-4">
        {icon && <span className="mr-2 text-gray-400">{icon}</span>}
        <h3 className="text-lg font-medium text-gray-900">{title}</h3>
      </div>
      {children}
    </div>
  );

  const getAccountNames = (ids?: string[]): string => {
      if (!ids || ids.length === 0) return 'Unassigned';
      return ids.map(id => accounts.find(a => a.id === id)?.name || 'Unknown Account')
                 .join(', ');
  };

  const handleStopRecurring = async () => {
    if (!confirm('Are you sure you want to stop this recurring series? No future transactions will be generated.')) return;
    
    setLoadingStop(true);
    try {
        const txnRef = doc(db, 'transactions', transaction.id);
        await updateDoc(txnRef, {
            nextRecurringDate: null
        });
        toast.success('Recurring series stopped successfully.');
    } catch (error) {
        console.error("Error stopping recurrence:", error);
        toast.error("Failed to stop recurrence.");
    } finally {
        setLoadingStop(false);
    }
  };

  return (
    <div className="space-y-6 pb-2">
      {/* Basic Information */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-5">
        <div>
          <h3 className="text-sm font-medium text-gray-500">Type</h3>
          <div className="mt-1">
            <StatusBadge status={transaction.type} />
          </div>
        </div>
        <div>
          <h3 className="text-sm font-medium text-gray-500">Category</h3>
          <p className="mt-1 text-sm text-gray-900">{transaction.category}</p>
        </div>
        
        <div>
          <h3 className="text-sm font-medium text-gray-500">Total Amount</h3>
          <p className={`mt-1 text-lg font-bold ${ transaction.type === 'income' ? 'text-green-600' : 'text-red-600' }`}>
            {formatCurrency(transaction.amount)}
          </p>
          {(transaction.netAmount! > 0 || transaction.vatAmount! > 0) && (
            <div className="text-xs text-gray-600 mt-1 space-y-0.5">
              <p>Net: {formatCurrency(transaction.netAmount || 0)}</p>
              <p>VAT: {formatCurrency(transaction.vatAmount || 0)}</p>
            </div>
          )}
        </div>
        <div>
          <h3 className="text-sm font-medium text-gray-500">Important Dates</h3>
          <div className="mt-1 space-y-1">
            <p className="text-sm text-gray-900"><span className="font-medium text-gray-600 mr-2">Paid On:</span> {formatDate(transaction.date)}</p>
            <p className="text-sm text-gray-900"><span className="font-medium text-gray-600 mr-2">Entered On:</span> {formatDate(transaction.createdAt)}</p>
          </div>
        </div>
      </div>

      {/* Recurring Info */}
      {transaction.isRecurring && (
        <div className={`p-4 rounded-md border ${transaction.nextRecurringDate ? 'bg-indigo-50 border-indigo-200' : 'bg-gray-50 border-gray-200'}`}>
          <div className="flex justify-between items-start">
            <div className="flex items-start">
              <RefreshCw className={`h-5 w-5 mr-2 flex-shrink-0 mt-0.5 ${transaction.nextRecurringDate ? 'text-indigo-600' : 'text-gray-400'}`} />
              <div>
                <h4 className={`text-sm font-medium ${transaction.nextRecurringDate ? 'text-indigo-800' : 'text-gray-700'}`}>
                    {transaction.nextRecurringDate ? 'Active Recurring Series' : 'Past Recurring Transaction'}
                </h4>
                <p className={`text-xs mt-1 ${transaction.nextRecurringDate ? 'text-indigo-700' : 'text-gray-500'}`}>
                  Frequency: <span className="font-semibold capitalize">{transaction.recurringFrequency}</span>
                </p>
                {transaction.nextRecurringDate ? (
                  <p className="text-xs text-indigo-700 mt-0.5 font-medium">
                     Next Due: {formatDate(transaction.nextRecurringDate)}
                  </p>
                ) : (
                    <p className="text-xs text-gray-500 mt-0.5 italic">Recurrence has ended.</p>
                )}
              </div>
            </div>

            {transaction.nextRecurringDate && (
                <button 
                    onClick={handleStopRecurring}
                    disabled={loadingStop}
                    className="flex items-center px-3 py-1.5 text-xs font-medium text-red-700 bg-white border border-red-300 rounded hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 shadow-sm"
                >
                    <StopCircle className="h-4 w-4 mr-1.5" />
                    {loadingStop ? 'Stopping...' : 'Stop Recurrence'}
                </button>
            )}
          </div>
        </div>
      )}

      {/* Linked Info */}
      {transaction.referenceId && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
          <div className="flex items-center">
            <Link2 className="h-5 w-5 text-blue-600 mr-2 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-blue-800">Linked Item</h4>
              <p className="text-xs text-blue-700">This transaction may be linked to an Invoice (ID: {transaction.referenceId}).</p>
            </div>
          </div>
        </div>
      )}

      {/* --- NEW ACCOUNT FLOW SECTION --- */}
      <Section title="Account Flow">
        <div className="space-y-3">
          
          {/* INCOME DISPLAY */}
          {transaction.type === 'income' && (
             <div className="flex flex-col gap-2">
                <div className="flex items-center p-3 bg-green-50 border border-green-100 rounded-md">
                    <div className="flex-shrink-0 bg-green-100 p-2 rounded-full"><ArrowLeft className="h-5 w-5 text-green-700" /></div>
                    <div className="ml-3">
                        <h4 className="text-sm font-semibold text-green-900">Money In (Credited To)</h4>
                        <p className="text-sm text-green-800 font-medium">
                            {transaction.accountsTo && transaction.accountsTo.length > 0 
                                ? getAccountNames(transaction.accountsTo) 
                                : 'Unassigned'}
                        </p>
                    </div>
                </div>
                {/* Check for "Debited From" (Transfer Source) */}
                {(transaction.relatedAccountName || (transaction.accountsFrom && transaction.accountsFrom.length > 0)) && (
                    <div className="flex items-center p-2 bg-gray-50 border border-gray-100 rounded-md ml-4">
                        <span className="text-xs font-semibold text-gray-500 uppercase mr-2">Transfer Source:</span>
                        <span className="text-sm text-gray-700 font-medium">
                            {transaction.relatedAccountName || getAccountNames(transaction.accountsFrom)}
                        </span>
                    </div>
                )}
             </div>
          )}

          {/* EXPENSE DISPLAY */}
          {transaction.type === 'expense' && (
             <div className="flex flex-col gap-2">
                <div className="flex items-center p-3 bg-red-50 border border-red-100 rounded-md">
                    <div className="flex-shrink-0 bg-red-100 p-2 rounded-full"><ArrowRight className="h-5 w-5 text-red-700" /></div>
                    <div className="ml-3">
                        <h4 className="text-sm font-semibold text-red-900">Money Out (Debited From)</h4>
                        <p className="text-sm text-red-800 font-medium">
                            {transaction.accountsFrom && transaction.accountsFrom.length > 0 
                                ? getAccountNames(transaction.accountsFrom) 
                                : 'Unassigned'}
                        </p>
                    </div>
                </div>
                {/* Check for "Credited To" (Transfer Dest) */}
                {(transaction.relatedAccountName || (transaction.accountsTo && transaction.accountsTo.length > 0)) && (
                    <div className="flex items-center p-2 bg-gray-50 border border-gray-100 rounded-md ml-4">
                        <span className="text-xs font-semibold text-gray-500 uppercase mr-2">Transfer Dest:</span>
                        <span className="text-sm text-gray-700 font-medium">
                            {transaction.relatedAccountName || getAccountNames(transaction.accountsTo)}
                        </span>
                    </div>
                )}
             </div>
          )}

        </div>
      </Section>
      {/* --------------------------- */}


      {/* Customer Information */}
      {(customer || transaction.customerName) && (
        <Section title="Customer Details" icon={<User className="h-5 w-5" />}>
          {customer ? (
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div className="font-medium text-gray-900 col-span-2">{customer.name}</div>
              {customer.mobile && <div className="flex items-center text-gray-600"><Phone className="h-4 w-4 mr-2" />{customer.mobile}</div>}
              {customer.email && <div className="flex items-center text-gray-600 col-span-2"><Mail className="h-4 w-4 mr-2" />{customer.email}</div>}
            </div>
          ) : (
            <div className="flex items-center text-sm text-gray-900">{transaction.customerName}</div>
          )}
        </Section>
      )}

      {/* Vehicle Information */}
      {(vehicle || transaction.vehicleName) && (
        <Section title="Vehicle Details" icon={<Car className="h-5 w-5" />}>
          {vehicle ? (
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
               <div className="font-medium text-gray-900">{vehicle.make} {vehicle.model}</div>
               <div className="text-gray-600">{vehicle.registrationNumber}</div>
              {vehicle.owner && (
                <div className="col-span-2">
                  <span className="text-xs text-gray-500">Owner: </span>
                  <span className="text-gray-800">{vehicle.owner.isDefault ? 'AIE Skyline' : vehicle.owner.name}</span>
                </div>
              )}
            </div>
          ) : (
             <div className="text-sm text-gray-900">{transaction.vehicleName}</div>
          )}
        </Section>
      )}

      {/* Payment Information */}
      <Section title="Payment Details">
        <div className="space-y-3 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-gray-500 font-medium">Status</span>
            <StatusBadge status={transaction.paymentStatus} />
          </div>
          {transaction.paidAmount !== undefined && transaction.paidAmount > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-500">Paid Amount</span>
              <span className="text-green-600 font-medium">{formatCurrency(transaction.paidAmount)}</span>
            </div>
          )}
          {transaction.remainingAmount !== undefined && transaction.remainingAmount > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-500">Remaining Amount</span>
              <span className="text-amber-600 font-medium">{formatCurrency(transaction.remainingAmount)}</span>
            </div>
          )}
          {transaction.paymentMethod && (
            <div className="flex justify-between">
              <span className="text-gray-500">Method</span>
              <span className="capitalize text-gray-900">{transaction.paymentMethod.replace('_', ' ')}</span>
            </div>
          )}
          {transaction.paymentReference && (
            <div className="flex justify-between">
              <span className="text-gray-500">Reference</span>
              <span className="text-gray-900">{transaction.paymentReference}</span>
            </div>
          )}
        </div>
      </Section>

      {/* Description */}
      <Section title="Description">
        <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">{transaction.description || 'N/A'}</p>
      </Section>

      {/* Audit Information */}
      <div className="text-xs text-gray-500 border-t border-gray-200 pt-4">
        <p>Created by {transaction.createdBy || 'unknown'} on {formatDate(transaction.createdAt)}</p>
        {transaction.updatedAt && (
           <p>Last updated by {transaction.updatedBy || 'unknown'} on {formatDate(transaction.updatedAt)}</p>
        )}
         <p>Transaction ID: {transaction.id}</p>
      </div>
    </div>
  );
};

export default TransactionDetailsModal;