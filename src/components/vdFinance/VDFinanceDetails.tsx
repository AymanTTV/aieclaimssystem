// src/components/vdFinance/VDFinanceDetails.tsx

import React, { useState, useEffect } from 'react';
import { VDFinanceRecord } from '../../types/vdFinance';
import { format } from 'date-fns';

import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';

interface VDFinanceDetailsProps {
  record: VDFinanceRecord;
}

const VDFinanceDetails: React.FC<VDFinanceDetailsProps> = ({ record }) => {

  const [createdByName, setCreatedByName] = useState<string | null>(null);
  const { formatCurrency } = useFormattedDisplay(); // Use the hook
  useEffect(() => {
    const fetchCreatedByName = async () => {
      if (record.createdBy) {
        try {
          const userDoc = await getDoc(doc(db, 'users', record.createdBy));
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
  }, [record.createdBy]);

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="border-t pt-6 mt-6 first:border-t-0 first:pt-0 first:mt-0">
      <h3 className="text-lg font-medium text-gray-900 mb-4">{title}</h3>
      {children}
    </div>
  );

  const Field = ({ label, value, color = '' }: { label: string; value: string | number; color?: string }) => (
    <div className="mb-4">
      <dt className="text-sm font-medium text-gray-500">{label}</dt>
      <dd className={`mt-1 text-sm ${color}`}>{typeof value === 'number' ? formatCurrency(value) : value}</dd>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Basic Information */}
      <Section title="Basic Information">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <dt className="text-sm font-medium text-gray-500">Name</dt>
            <dd className="mt-1 text-sm text-gray-900">{record.name}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Reference</dt>
            <dd className="mt-1 text-sm text-gray-900">{record.reference}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Registration</dt>
            <dd className="mt-1 text-sm text-gray-900">{record.registration}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Date</dt>
            <dd className="mt-1 text-sm text-gray-900">{format(record.date, 'dd/MM/yyyy HH:mm')}</dd>
          </div>
        </div>
      </Section>

      {/* Financial Details */}
      <Section title="Financial Details">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Total Amount" value={record.totalAmount} />
          <Field label="NET Amount" value={record.netAmount} />
          <Field label="VAT Rate" value={`${record.vatRate}%`} />
          <Field label="VAT IN" value={record.vatIn} color="text-blue-600" />
          <Field label="VAT OUT" value={record.vatOut} color="text-red-600" />
          <Field label="Solicitor Fee" value={record.solicitorFee} />
        </div>
      </Section>

      {/* Parts Details */}
      <Section title="Parts">
        <div className="space-y-4">
          {record.parts.map((part, index) => (
            <div key={index} className="bg-gray-50 p-4 rounded-lg">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Part Name</dt>
                  <dd className="mt-1 text-sm text-gray-900">{part.name}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Quantity</dt>
                  <dd className="mt-1 text-sm text-gray-900">{part.quantity}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Price</dt>
                  <dd className="mt-1 text-sm text-gray-900">{formatCurrency(part.price)}</dd>
                </div>
                <div className="col-span-3">
                  <dt className="text-sm font-medium text-gray-500">Total</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {formatCurrency(part.price * part.quantity)}
                    {part.includeVat && ' (inc. VAT)'}
                  </dd>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Labor Details */}
      <Section title="Labor">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <dt className="text-sm font-medium text-gray-500">Service Center</dt>
            <dd className="mt-1 text-sm text-gray-900">{record.serviceCenter}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Labor Rate</dt>
            <dd className="mt-1 text-sm text-gray-900">£{record.laborRate}/hour</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Labor Hours</dt>
            <dd className="mt-1 text-sm text-gray-900">{record.laborHours}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Labor Total</dt>
            <dd className="mt-1 text-sm text-gray-900">
              £{(record.laborRate * record.laborHours).toFixed(2)}
            </dd>
          </div>
        </div>
      </Section>

      {/* Summary */}
      <Section title="Summary">
        <div className="space-y-2">
          <Field label="Purchased Items" value={record.purchasedItems} />
          <Field label="Client Repair" value={record.clientRepair} />
          <Field label="Salvage" value={record.salvage} /> {/* Added Salvage */}
          <Field label="Client Referral Fee" value={record.clientReferralFee} /> {/* Added Client Referral Fee */}
          <Field label="Profit" value={record.profit} color="text-green-600 font-medium" />
        </div>
      </Section>

      {/* Description */}
      {record.description && (
        <Section title="Description">
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{record.description}</p>
        </Section>
      )}

      {/* Audit Information */}
      <div className="text-sm text-gray-500 border-t pt-4">
        <div className="flex justify-between">
          <div>Created by: {createdByName || record.createdBy || 'Loading...'}</div>
          <div>Last Updated: {format(record.updatedAt, 'dd/MM/yyyy HH:mm')}</div>
        </div>
      </div>
    </div>
  );
};

export default VDFinanceDetails;
