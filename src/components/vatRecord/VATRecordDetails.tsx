// src/components/vatRecord/VATRecordDetails.tsx
import React, { useState, useEffect } from 'react';
import { VATRecord } from '../../types/vatRecord';
import { format } from 'date-fns';
import StatusBadge from '../ui/StatusBadge';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';
import { RefreshCw, StopCircle } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import toast from 'react-hot-toast';

interface VATRecordDetailsProps {
  record: VATRecord;
}

const VATRecordDetails: React.FC<VATRecordDetailsProps> = ({ record }) => {
  const { formatCurrency } = useFormattedDisplay();
  const [loadingStop, setLoadingStop] = useState(false);
  const [localNextDate, setLocalNextDate] = useState<Date | any>(record.nextRecurringDate);

  useEffect(() => {
     setLocalNextDate(record.nextRecurringDate);
  }, [record.nextRecurringDate]);

  const handleStopRecurring = async () => {
    if (!confirm('Stop this recurring series?')) return;
    setLoadingStop(true);
    try {
        const ref = doc(db, 'vatRecords', record.id);
        await updateDoc(ref, { nextRecurringDate: null });
        setLocalNextDate(null);
        toast.success('Stopped recurrence.');
    } catch(e) { toast.error('Failed to stop.'); }
    finally { setLoadingStop(false); }
  };

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="border-t pt-6 mt-6 first:border-t-0 first:pt-0 first:mt-0">
      <h3 className="text-lg font-medium text-gray-900 mb-4">{title}</h3>
      {children}
    </div>
  );

  const Field = ({ label, value, horizontal = false }: { label: string; value: string | number; horizontal?: boolean }) => (
    <div className={`mb-4 ${horizontal ? 'flex items-center' : ''}`}>
      <dt className={`text-sm font-medium text-gray-500 ${horizontal ? 'mr-2' : ''}`}>{label}</dt>
      <dd className={`mt-1 text-sm text-gray-900 ${horizontal ? 'ml-2' : ''}`}>{value}</dd>
    </div>
  );

  const isActive = record.isRecurring && !!localNextDate;

  return (
    <div className="space-y-6">
      
      {record.isRecurring && (
        <div className={`p-4 rounded-md border mb-4 ${isActive ? 'bg-indigo-50 border-indigo-200' : 'bg-gray-50 border-gray-200'}`}>
          <div className="flex justify-between items-start">
            <div className="flex items-start">
              <RefreshCw className={`h-5 w-5 mr-2 flex-shrink-0 mt-0.5 ${isActive ? 'text-indigo-600' : 'text-gray-400'}`} />
              <div>
                <h4 className={`text-sm font-medium ${isActive ? 'text-indigo-800' : 'text-gray-700'}`}>{isActive ? 'Active Recurring' : 'Past Recurring'}</h4>
                <p className={`text-xs mt-1 ${isActive ? 'text-indigo-700' : 'text-gray-500'}`}>Frequency: <span className="capitalize">{record.recurringFrequency}</span></p>
                {isActive && localNextDate && <p className="text-xs text-indigo-700 mt-0.5 font-medium">Next: {format(localNextDate.toDate ? localNextDate.toDate() : new Date(localNextDate), 'dd/MM/yyyy HH:mm')}</p>}
              </div>
            </div>
            {isActive && (
                <button onClick={handleStopRecurring} disabled={loadingStop} className="flex items-center px-3 py-1.5 text-xs font-medium text-red-700 bg-white border border-red-300 rounded hover:bg-red-50 focus:outline-none"><StopCircle className="h-4 w-4 mr-1.5" /> Stop</button>
            )}
          </div>
        </div>
      )}

      <Section title="Record Details">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Receipt/Invoice No" value={record.receiptNo} />
          <Field label="Inquiry/Order No" value={record.accountant} />
          <Field label="Supplier" value={record.supplier} />
          {record.accountNo && <Field label="Account No" value={record.accountNo} />}
          <Field label="REG No" value={record.regNo} />
          {record.vatNo && <Field label="VAT No" value={record.vatNo} />}
        </div>
      </Section>

      <Section title="Descriptions">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">NET</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">V</th> 
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">VAT</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">GROSS</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {record.descriptions.map((desc) => (
                <tr key={desc.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{desc.description}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">{formatCurrency(desc.net)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{desc.vType}</td> 
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">{formatCurrency(desc.vat)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">{formatCurrency(desc.gross)}</td>
                </tr>
              ))}
              <tr className="bg-gray-50 font-medium">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Totals</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">{formatCurrency(record.net)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"></td> 
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">{formatCurrency(record.vat)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">{formatCurrency(record.gross)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="mt-4">
          <Field label="VAT Received" value={formatCurrency(record.vatReceived !== undefined ? record.vatReceived : 0)} horizontal />
        </div>
      </Section>

      <Section title="Customer Information">
        <Field label="Customer Name" value={record.customerName} />
        {record.customerId && (
          <div className="text-sm text-gray-500">Customer ID: {record.customerId}</div>
        )}
      </Section>

      <Section title="Additional Details">
        <div className="space-y-4">
          <div>
            <dt className="text-sm font-medium text-gray-500">Status</dt>
            <dd className="mt-1"><StatusBadge status={record.status} /></dd>
          </div>
          {record.notes && <Field label="Notes" value={record.notes} />}
          <Field label="Date" value={format(record.date, 'dd/MM/yyyy HH:mm')} />
          {record.dueDate && <Field label="Due Date" value={format(record.dueDate, 'dd/MM/yyyy')} />}
        </div>
      </Section>

      <div className="text-sm text-gray-500 border-t pt-4">
        <div className="flex justify-between">
          <div>Created: {format(record.createdAt, 'dd/MM/yyyy HH:mm')}</div>
          <div>Last Updated: {format(record.updatedAt, 'dd/MM/yyyy HH:mm')}</div>
        </div>
      </div>
    </div>
  );
};

export default VATRecordDetails;