import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ShareRecord, Expense } from '../../types/share';
import { db } from '../../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

interface ShareDetailsProps {
  record: ShareRecord;
}

const Section = ({ title, children }: any) => (
  <div className="border-t pt-6 mt-6 first:border-t-0 first:pt-0 first:mt-0">
    <h3 className="text-lg font-medium text-gray-900 mb-4">{title}</h3>
    {children}
  </div>
);

const Field = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="mb-4">
    <dt className="text-sm font-medium text-gray-500">{label}</dt>
    <dd className="mt-1 text-sm text-gray-900">{value}</dd>
  </div>
);

const ShareDetails: React.FC<ShareDetailsProps> = ({ record }) => {
  const [createdByName, setCreatedByName] = useState<string>('Loading...');
  useEffect(() => {
    if (record.id) {
      getDoc(doc(db, 'shares', record.id)).then(() => {
        // if you store createdBy in record, fetch user name here
        setCreatedByName('—');
      });
    }
  }, [record.id]);

  return (
    <div className="space-y-6">
      <Section title="Basic">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Client" value={record.clientName} />
          <Field label="Reason" value={record.reason} />
          {record.startDate && (
            <Field
              label="Dates"
              value={`${format(new Date(record.startDate), 'dd/MM/yyyy')} – ${format(
                new Date(record.endDate!),
                'dd/MM/yyyy'
              )}`}
            />
          )}
        </div>
      </Section>

      <Section title="Financials">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Field label="VD Profit" value={record.vdProfit} />
          <Field label="Paid" value={record.actualPaid} />
          <Field label="Vehicle Cost" value={record.vehicleRunningCost} />
          <Field label="Total Net" value={record.totalNet} />
        </div>
      </Section>

      <Section title="Expenses">
        <table className="min-w-full table-auto mt-2 border">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-2 text-left">Type</th>
              <th className="p-2 text-left">Description</th>
              <th className="p-2">Amount</th>
              <th className="p-2">VAT</th>
              <th className="p-2">Total</th>
            </tr>
          </thead>
          <tbody>
            {record.expenses.map((e: Expense, i) => (
              <tr key={i} className="border-t">
                <td className="p-2">{e.type}</td>
                <td className="p-2">{e.description}</td>
                <td className="p-2">{e.amount}</td>
                <td className="p-2 text-center">{e.vat ? 'Yes' : 'No'}</td>
                <td className="p-2">
                  {(e.vat ? e.amount * 1.2 : e.amount).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section title="Shares">
        <div className="grid grid-cols-3 gap-4">
          <Field label="AIE Skyline" value={`${record.aieSkylinePercentage}% (${record.aieSkylineAmount})`} />
          <Field label="AbdulAziz" value={`${record.abdulAzizPercentage}% (${record.abdulAzizAmount})`} />
          <Field label="JAY" value={`${record.jayPercentage}% (${record.jayAmount})`} />
        </div>
      </Section>

      <Section title="Meta">
        <div className="text-sm text-gray-500">
          <div>Progress: {record.progress.replace('-', ' ').toUpperCase()}</div>
          <div>Created By: {createdByName}</div>
        </div>
      </Section>
    </div>
  );
};

export default ShareDetails;
