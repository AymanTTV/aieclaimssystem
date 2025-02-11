// src/components/driverPay/DriverPayDetails.tsx

import React, { useState, useEffect } from 'react';
import { DriverPay } from '../../types/driverPay';
import { format } from 'date-fns';
import StatusBadge from '../ui/StatusBadge';
import { User, Phone, Calendar, DollarSign, MapPin } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

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

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="border-t pt-6 mt-6 first:border-t-0 first:pt-0 first:mt-0">
      <h3 className="text-lg font-medium text-gray-900 mb-4">{title}</h3>
      {children}
    </div>
  );

  const Field = ({ label, value }: { label: string; value: string | number | React.ReactNode }) => (
    <div className="mb-4">
      <dt className="text-sm font-medium text-gray-500">{label}</dt>
      <dd className="mt-1 text-sm text-gray-900">{value}</dd>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header with Status */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Driver Pay Record
          </h2>
          <div className="mt-1 text-sm text-gray-500">
            Driver No: {record.driverNo} | TID: {record.tidNo}
          </div>
        </div>
        <StatusBadge status={record.status} />
      </div>

      {/* Driver Information */}
      <Section title="Driver Details">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center">
            <User className="h-5 w-5 text-gray-400 mr-2" />
            <div>
              <Field label="Name" value={record.name} />
            </div>
          </div>
          <div className="flex items-center">
            <Phone className="h-5 w-5 text-gray-400 mr-2" />
            <div>
              <Field label="Phone Number" value={record.phoneNumber} />
            </div>
          </div>
          <div className="flex items-center">
            <MapPin className="h-5 w-5 text-gray-400 mr-2" />
            <div>
              <Field 
                label="Collection Point" 
                value={record.collection === 'OTHER' ? record.customCollection : record.collection} 
              />
            </div>
          </div>
        </div>
      </Section>

      {/* Period and Amount Details */}
      <Section title="Payment Details">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center">
            <Calendar className="h-5 w-5 text-gray-400 mr-2" />
            <div>
              <Field 
                label="Period" 
                value={
                  <div>
                    <div>From: {format(record.startDate, 'dd/MM/yyyy')}</div>
                    <div>To: {format(record.endDate, 'dd/MM/yyyy')}</div>
                  </div>
                }
              />
            </div>
          </div>
          <div className="flex items-center">
            <DollarSign className="h-5 w-5 text-gray-400 mr-2" />
            <div>
              <Field 
                label="Amount Breakdown" 
                value={
                  <div className="space-y-1">
                    <div>Total Amount: £{record.totalAmount.toFixed(2)}</div>
                    <div className="text-yellow-600">
                      Commission ({record.commissionPercentage}%): 
                      £{record.commissionAmount.toFixed(2)}
                    </div>
                    <div className="text-green-600">
                      Net Pay: £{record.netPay.toFixed(2)}
                    </div>
                  </div>
                }
              />
            </div>
          </div>
        </div>
      </Section>

      {/* Payment History */}
      {record.payments && record.payments.length > 0 && (
        <Section title="Payment History">
          <div className="space-y-4">
            {record.payments.map((payment) => (
              <div key={payment.id} className="bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium">£{payment.amount.toFixed(2)}</div>
                    <div className="text-sm text-gray-500 capitalize">
                      {payment.method.replace('_', ' ')}
                    </div>
                    {payment.reference && (
                      <div className="text-sm text-gray-500">
                        Ref: {payment.reference}
                      </div>
                    )}
                    {payment.notes && (
                      <div className="text-sm text-gray-500 mt-1">
                        {payment.notes}
                      </div>
                    )}
                  </div>
                  <div className="text-right text-sm text-gray-500">
                    <div>{format(payment.date, 'dd/MM/yyyy HH:mm')}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Creation Information */}
      <div className="text-sm text-gray-500 border-t pt-4">
        <div className="flex justify-between">
          <div>Created by: {createdByUser || 'Unknown'}</div>
          <div>Created: {format(record.createdAt, 'dd/MM/yyyy HH:mm')}</div>
          <div>Last Updated: {format(record.updatedAt, 'dd/MM/yyyy HH:mm')}</div>
        </div>
      </div>
    </div>
  );
};

export default DriverPayDetails;
