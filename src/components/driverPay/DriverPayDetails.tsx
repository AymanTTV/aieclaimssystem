// src/components/driverPay/DriverPayDetails.tsx

import React, { useState, useEffect } from 'react';
import { DriverPay, PaymentPeriod } from '../../types/driverPay';
import { doc, getDoc } from 'firebase/firestore';
import { format } from 'date-fns';
import StatusBadge from '../ui/StatusBadge';
import { User, Phone, MapPin, MessageCircle, MessageSquare, CreditCard } from 'lucide-react';
import { db } from '../../lib/firebase';
import { ensureValidDate } from '../../utils/dateHelpers';
import { resolveNameFields } from '../../utils/nameAddressUtils';
import CommunicationHistoryTimeline from '../common/CommunicationHistoryTimeline';

interface DriverPayDetailsProps {
  record: DriverPay;
  onWhatsApp?: (record: DriverPay) => void;
}

const DriverPayDetails: React.FC<DriverPayDetailsProps> = ({ record, onWhatsApp }) => {
  const [createdByUser, setCreatedByUser] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'details' | 'communication'>('details');
  const nameFields = resolveNameFields(record);

  // Use the 'record' prop directly. The problematic data fetching has been removed.
  const rec = record;

  const periods = [...(rec.paymentPeriods || [])].sort(
    (a, b) =>
      ensureValidDate(a.startDate).getTime() - ensureValidDate(b.startDate).getTime()
  );

  useEffect(() => {
    const fetchUserDetails = async () => {
      if (record.createdBy) {
        try {
          const userDoc = await getDoc(doc(db, 'users', record.createdBy));
          if (userDoc.exists()) setCreatedByUser(userDoc.data().name);
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
      return format(ensureValidDate(date), 'dd/MM/yyyy');
    } catch {
      return 'N/A';
    }
  };

  const formatDateTime = (date: Date | null | undefined): string => {
    if (!date) return 'N/A';
    try {
      return format(ensureValidDate(date), 'dd/MM/yyyy HH:mm');
    } catch {
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
    <div key={period.id ?? `${formatDate(period.startDate)}-${formatDate(period.endDate)}-${index}`} className="bg-gray-50 p-4 rounded-lg mb-4">
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
            <span>Commission A ({period.commissionPercentageA ?? 0}%):</span>
            <span className="text-yellow-600">£{(period.commissionAmountA ?? 0).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Commission B ({period.commissionPercentageB ?? 0}%):</span>
            <span className="text-yellow-600">£{(period.commissionAmountB ?? 0).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Net Pay:</span>
            <span className="text-green-600">£{(period.netPay ?? 0).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Paid Amount:</span>
            <span className="text-blue-600">£{(period.paidAmount ?? 0).toFixed(2)}</span>
          </div>
          {(period.remainingAmount ?? 0) > 0 && (
            <div className="flex justify-between text-sm">
              <span>Remaining:</span>
              <span className="text-red-600">£{(period.remainingAmount ?? 0).toFixed(2)}</span>
            </div>
          )}
        </div>
      </div>

      {period.notes && (
        <div className="mt-4">
          <p className="text-sm font-medium text-gray-700">Period Notes</p>
          <p className="text-sm text-gray-500">{period.notes}</p>
        </div>
      )}

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
                  <span className="text-gray-500">{formatDateTime(payment.date)}</span>
                </div>
                {payment.reference && <div className="text-gray-500 mt-1">Ref: {payment.reference}</div>}
                {payment.notes && <div className="text-gray-500 mt-1">{payment.notes}</div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Driver Pay Record</h2>
          <div className="mt-1 text-sm text-gray-500">
            Driver No: {rec.driverNo} | TID: {rec.tidNo}
          </div>
        </div>
        {onWhatsApp && (
          <button
            onClick={() => onWhatsApp(rec)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-emerald-300 rounded-md shadow-sm text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-800 transition-colors cursor-pointer"
            title="Contact Driver via WhatsApp"
          >
            <MessageCircle className="h-4 w-4 text-emerald-600" />
            <span>WhatsApp Driver</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200">
        <button
          type="button"
          onClick={() => setActiveTab('details')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition cursor-pointer ${
            activeTab === 'details'
              ? 'border-blue-600 text-blue-600 font-bold'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Payment & Driver Details</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('communication')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition cursor-pointer ${
            activeTab === 'communication'
              ? 'border-blue-600 text-blue-600 font-bold'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Communication History</span>
        </button>
      </div>

      {activeTab === 'details' ? (
        <>
          <Section title="Driver Details">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-500">First Name</p>
                <p className="font-medium">{nameFields.firstName || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Middle Name</p>
                <p className="font-medium">{nameFields.middleName || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Last Name</p>
                <p className="font-medium">{nameFields.lastName || '-'}</p>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Phone className="h-5 w-5 text-gray-400 mr-2" />
                  <div>
                    <p className="text-sm text-gray-500">Phone Number</p>
                    <p className="font-medium">{rec.phoneNumber || '-'}</p>
                  </div>
                </div>
                {onWhatsApp && rec.phoneNumber && (
                  <button
                    onClick={() => onWhatsApp(rec)}
                    className="text-emerald-600 hover:text-emerald-800 p-1 rounded hover:bg-emerald-50 transition-colors ml-2 cursor-pointer"
                    title="Send WhatsApp"
                  >
                    <MessageCircle className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="flex items-center">
                <MapPin className="h-5 w-5 text-gray-400 mr-2" />
                <div>
                  <p className="text-sm text-gray-500">Collection Point</p>
                  <p className="font-medium">
                    {rec.collection === 'OTHER' ? rec.customCollection : rec.collection}
                  </p>
                </div>
              </div>
            </div>
          </Section>

          <Section title="Payment Periods">
            {periods.length === 0 ? (
              <div className="text-sm text-gray-500">No periods to display.</div>
            ) : (
              periods.map((period, index) => renderPaymentPeriod(period, index))
            )}
          </Section>

          <div className="text-sm text-gray-500 border-t pt-4">
            <div className="flex justify-between">
              <div>Created by: {createdByUser || 'Unknown'}</div>
              <div>Created: {formatDateTime(rec.createdAt)}</div>
              <div>Last Updated: {formatDateTime(rec.updatedAt)}</div>
            </div>
          </div>
        </>
      ) : (
        <div className="space-y-4">
          <CommunicationHistoryTimeline
            recordId={rec.driverNo || rec.id}
            sourceModule="Driver Pay"
            matchKeys={[
              rec.id,
              rec.driverNo,
              rec.name,
              rec.phoneNumber,
              rec.email,
            ].filter(Boolean)}
            title={`Driver ${rec.name} — Communication History`}
            description="Chronological log of WhatsApp notifications and payment advice sent to this driver."
          />
        </div>
      )}
    </div>
  );
};

export default DriverPayDetails;