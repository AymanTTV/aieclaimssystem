// src/components/vatRecord/VATRecordDetails.tsx

import React from 'react';
import { VATRecord } from '../../types/vatRecord';
import { format } from 'date-fns';
import StatusBadge from '../ui/StatusBadge';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';

interface VATRecordDetailsProps {
  record: VATRecord;
}

const { formatCurrency } = useFormattedDisplay();

const VATRecordDetails: React.FC<VATRecordDetailsProps> = ({ record }) => {
  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="border-t pt-6 mt-6 first:border-t-0 first:pt-0 first:mt-0">
      <h3 className="text-lg font-medium text-gray-900 mb-4">{title}</h3>
      {children}
    </div>
  );

  const Field = ({ label, value }: { label: string; value: string | number }) => (
    <div className="mb-4">
      <dt className="text-sm font-medium text-gray-500">{label}</dt>
      <dd className="mt-1 text-sm text-gray-900">{value}</dd>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Basic Information */}
      <Section title="Record Details">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Receipt No" value={record.receiptNo} />
          <Field label="Accountant" value={record.accountant} />
          <Field label="Supplier" value={record.supplier} />
          <Field label="REG No" value={record.regNo} />
        </div>
      </Section>

      <Section title="Descriptions">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">NET</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">V</th> {/* Moved to 3rd column */}
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">VAT</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">GROSS</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {record.descriptions.map((desc) => (
                <tr key={desc.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{desc.description}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">{formatCurrency(desc.net)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{desc.vType}</td> {/* Moved to 3rd column */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">{formatCurrency(desc.vat)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">{formatCurrency(desc.gross)}</td>
                </tr>
              ))}
              {/* Totals row */}
              <tr className="bg-gray-50 font-medium">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Totals</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">{formatCurrency(record.net)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"></td> {/* Added empty cell for V column in totals row */}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">{formatCurrency(record.vat)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">{formatCurrency(record.gross)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      {/* Customer Information */}
      <Section title="Customer Information">
        <Field label="Customer Name" value={record.customerName} />
        {record.customerId && (
          <div className="text-sm text-gray-500">
            Customer ID: {record.customerId}
          </div>
        )}
      </Section>

      {/* Additional Details */}
      <Section title="Additional Details">
        <div className="space-y-4">
          <div>
            <dt className="text-sm font-medium text-gray-500">Status</dt>
            <dd className="mt-1">
              <StatusBadge status={record.status} />
            </dd>
          </div>
          {record.notes && <Field label="Notes" value={record.notes} />}
          <Field label="Date" value={format(record.date, 'dd/MM/yyyy')} />
        </div>
      </Section>

      {/* Audit Information */}
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