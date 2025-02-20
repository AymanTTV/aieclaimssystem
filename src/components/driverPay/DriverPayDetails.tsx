// src/components/driverPay/DriverPayDetails.tsx

import React, { useState, useEffect } from 'react';
import { DriverPay, PaymentPeriod } from '../../types/driverPay';
import { format } from 'date-fns';
import StatusBadge from '../ui/StatusBadge';
import { User, Phone, Calendar, DollarSign, MapPin, FileText } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { ensureValidDate } from '../../utils/dateHelpers';

interface DriverPayDetailsProps {
  record: DriverPay;
}

const DriverPayDetails: React.FC<DriverPayDetailsProps> = ({ record }) => {
  const [createdByUser, setCreatedByUser] = useState<string>('');

  useEffect(() => {
    const fetchUserDetails = async () => {
      if (record.createdBy) {
        try {
          const userDoc = await getDoc(doc(db, 'users', record.createdBy));
          if (userDoc.exists()) {
            setCreatedByUser(userDoc.data().name);
          }
        } catch (error) {
          console.error('Error fetching user details:', error);
        }
      }
    };

    fetchUserDetails();
  }, [record.createdBy]);

  const formatDate = (date: Date | null | undefined): string => {
    if (!date) return 'N/A';
    try {
      const validDate = ensureValidDate(date);
      return format(validDate, 'dd/MM/yyyy');
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'N/A';
    }
  };

  const formatDateTime = (date: Date | null | undefined): string => {
    if (!date) return 'N/A';
    try {
      const validDate = ensureValidDate(date);
      return format(validDate, 'dd/MM/yyyy HH:mm');
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'N/A';
    }
  };

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="border-t pt-6 mt-6 first:border-t-0 first:pt-0 first:mt-0">
      <h3 className="text-lg font-medium text-gray-900 mb-4">{title}</h3>
      {children}
    </div>
  );

  const renderPaymentPeriod = (period: PaymentPeriod, index: number) => (
    <div key={period.id} className="bg-gray-50 p-4 rounded-lg mb-4">
      <h4 className="font-medium mb-2">Period {index + 1}</h4>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-gray-500">Date Range</p>
          <p>{formatDate(period.startDate)} - {formatDate(period.endDate)}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Status</p>
          <StatusBadge status={period.status} />
        </div>
        <div className="col-span-2 space-y-2">
        <div className="flex justify-between text-sm">
          <span>Total Amount:</span>
          <span className="font-medium">£{(period.totalAmount ?? 0).toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Commission ({period.commissionPercentage ?? 0}%):</span>
          <span className="text-yellow-600">£{(period.commissionAmount ?? 0).toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Net Pay:</span>
          <span className="text-green-600">£{(period.netPay ?? 0).toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Paid Amount:</span>
          <span className="text-blue-600">£{(period.paidAmount ?? 0).toFixed(2)}</span>
        </div>
        {period.remainingAmount > 0 && (
          <div className="flex justify-between text-sm">
            <span>Remaining:</span>
            <span className="text-red-600">£{(period.remainingAmount ?? 0).toFixed(2)}</span>
          </div>
        )}
        </div>
        
      </div>

      {period.notes && ( // Conditionally render notes if they exist
        <div className="mt-4">
          <p className="text-sm font-medium text-gray-700">Period Notes</p>
          <p className="text-sm text-gray-500">{period.notes}</p>
        </div>
      )}

      {/* Payment History for this period */}
      {period.payments && period.payments.length > 0 && (
        <div className="mt-4">
          <h5 className="text-sm font-medium text-gray-700 mb-2">Payment History</h5>
          <div className="space-y-2">
            {period.payments.map(payment => (
              <div key={payment.id} className="bg-white p-3 rounded border text-sm">
                <div className="flex justify-between">
                  <div>
                    <span className="font-medium">£{payment.amount.toFixed(2)}</span>
                    <span className="text-gray-500 ml-2 capitalize">
                      via {payment.method.replace('_', ' ')}
                    </span>
                  </div>
                  <span className="text-gray-500">
                    {formatDateTime(ensureValidDate(payment.date))}
                  </span>
                </div>
                {payment.reference && (
                  <div className="text-gray-500 mt-1">Ref: {payment.reference}</div>
                )}
                {payment.notes && (
                  <div className="text-gray-500 mt-1">{payment.notes}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header with Basic Info */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Driver Pay Record</h2>
          <div className="mt-1 text-sm text-gray-500">
            Driver No: {record.driverNo} | TID: {record.tidNo}
          </div>
        </div>
      </div>

      {/* Driver Information */}
      <Section title="Driver Details">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center">
            <User className="h-5 w-5 text-gray-400 mr-2" />
            <div>
              <p className="text-sm text-gray-500">Name</p>
              <p className="font-medium">{record.name}</p>
            </div>
          </div>
          <div className="flex items-center">
            <Phone className="h-5 w-5 text-gray-400 mr-2" />
            <div>
              <p className="text-sm text-gray-500">Phone Number</p>
              <p className="font-medium">{record.phoneNumber}</p>
            </div>
          </div>
          <div className="flex items-center">
            <MapPin className="h-5 w-5 text-gray-400 mr-2" />
            <div>
              <p className="text-sm text-gray-500">Collection Point</p>
              <p className="font-medium">
                {record.collection === 'OTHER' ? record.customCollection : record.collection}
              </p>
            </div>
          </div>
        </div>
      </Section>

      {/* Payment Periods */}
      <Section title="Payment Periods">
        {record.paymentPeriods?.map((period, index) => 
          renderPaymentPeriod(period, index)
        )}
      </Section>

      {/* Audit Information */}
      <div className="text-sm text-gray-500 border-t pt-4">
        <div className="flex justify-between">
          <div>Created by: {createdByUser || 'Unknown'}</div>
          <div>Created: {formatDateTime(record.createdAt)}</div>
          <div>Last Updated: {formatDateTime(record.updatedAt)}</div>
        </div>
      </div>
    </div>
  );
};

export default DriverPayDetails;
