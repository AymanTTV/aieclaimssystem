// src/components/vdInvoice/VDInvoiceDetails.tsx
import React, { useState, useMemo } from 'react';
import { VDInvoice } from '../../types/vdInvoice';
import { format } from 'date-fns';
import StatusBadge from '../ui/StatusBadge';
import {
  FileText,
  User,
  Car,
  Wrench,
  PoundSterling,
  Clock,
  Layers,
  ChevronLeft,
  ChevronRight,
  Phone,
  Mail,
  MapPin,
  Building,
  CheckCircle2,
  AlertCircle,
  Hash,
  Calendar,
} from 'lucide-react';

export type VDInvoiceDetailTab =
  | 'overview'
  | 'customer_vehicle'
  | 'parts_labor'
  | 'totals_payments'
  | 'notes_audit'
  | 'all';

interface VDInvoiceDetailsProps {
  invoice: VDInvoice;
  onClose?: () => void;
}

const safeFormat = (dateVal: any, pattern: string = 'dd/MM/yyyy HH:mm'): string => {
  if (!dateVal) return 'Not Provided';
  try {
    const d = typeof dateVal?.toDate === 'function' ? dateVal.toDate() : new Date(dateVal);
    if (isNaN(d.getTime())) return typeof dateVal === 'string' ? dateVal : 'Not Provided';
    return format(d, pattern);
  } catch {
    return typeof dateVal === 'string' ? dateVal : 'Not Provided';
  }
};

const safeFormatDate = (dateVal: any): string => safeFormat(dateVal, 'dd/MM/yyyy');

const VDInvoiceDetails: React.FC<VDInvoiceDetailsProps> = ({ invoice }) => {
  const [activeTab, setActiveTab] = useState<VDInvoiceDetailTab>('overview');

  const parts = useMemo(() => invoice.parts ?? [], [invoice.parts]);
  const payments = useMemo(() => invoice.payments ?? [], [invoice.payments]);
  const owing = Math.max(0, invoice.total - invoice.paidAmount);

  const tabs: {
    id: VDInvoiceDetailTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string | number;
  }[] = [
    { id: 'overview', label: 'Overview', icon: FileText },
    {
      id: 'customer_vehicle',
      label: 'Customer & Vehicle',
      icon: User,
      badge: invoice.registration ? invoice.registration.toUpperCase() : undefined,
    },
    {
      id: 'parts_labor',
      label: 'Parts & Labor',
      icon: Wrench,
      badge: parts.length > 0 ? `${parts.length} parts` : undefined,
    },
    {
      id: 'totals_payments',
      label: 'Totals & Payments',
      icon: PoundSterling,
      badge: `£${invoice.total.toFixed(2)}`,
    },
    {
      id: 'notes_audit',
      label: 'Notes & Audit',
      icon: Clock,
      badge: payments.length > 0 ? `${payments.length} paid` : undefined,
    },
    { id: 'all', label: 'All Details', icon: Layers },
  ];

  const currentTabIndex = tabs.findIndex((t) => t.id === activeTab);

  const handlePrevTab = () => {
    if (currentTabIndex > 0) {
      setActiveTab(tabs[currentTabIndex - 1].id);
    }
  };

  const handleNextTab = () => {
    if (currentTabIndex < tabs.length - 1) {
      setActiveTab(tabs[currentTabIndex + 1].id);
    }
  };

  // Sub-renderers
  const renderOverviewContent = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-2xs">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Invoice Number</span>
          <p className="text-base font-black text-slate-900 mt-1 font-mono">#{invoice.invoiceNumber}</p>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-600">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span>Date: {safeFormatDate(invoice.date)}</span>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-2xs">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Payment Status</span>
          <div className="mt-1.5">
            <StatusBadge status={invoice.paymentStatus} />
          </div>
          <p className="text-xs text-slate-600 mt-2 font-medium">
            Owing: <span className={owing > 0 ? 'text-rose-600 font-bold' : 'text-emerald-700 font-bold'}>£{owing.toFixed(2)}</span>
          </p>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-2xs">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Service Center</span>
          <p className="text-sm font-bold text-slate-900 mt-1 flex items-center gap-1.5">
            <Building className="w-4 h-4 text-blue-600 shrink-0" />
            <span>{invoice.serviceCenter || 'Main Workshop'}</span>
          </p>
          <p className="text-xs text-slate-600 mt-1.5">
            Labor: {invoice.laborHours}h @ £{invoice.laborRate}/h
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Quick Customer Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-2">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-blue-600" />
              Customer
            </h4>
            <span className="text-xs font-semibold text-slate-500">{invoice.customerPhone || 'No Phone'}</span>
          </div>
          <p className="text-sm font-bold text-slate-900">{invoice.customerName || 'N/A'}</p>
          {invoice.customerEmail && (
            <p className="text-xs text-slate-600 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              {invoice.customerEmail}
            </p>
          )}
          {invoice.customerAddress && (
            <p className="text-xs text-slate-600 flex items-start gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
              <span>{invoice.customerAddress} {invoice.customerPostcode}</span>
            </p>
          )}
        </div>

        {/* Quick Vehicle Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-2">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Car className="w-3.5 h-3.5 text-amber-600" />
              Vehicle
            </h4>
            {invoice.registration && (
              <span className="px-2 py-0.5 bg-amber-300 text-slate-950 font-mono font-black text-xs rounded border border-amber-400">
                {invoice.registration.toUpperCase()}
              </span>
            )}
          </div>
          <p className="text-sm font-bold text-slate-900">
            {invoice.make} {invoice.model}
          </p>
          <div className="flex items-center gap-3 text-xs text-slate-600">
            {invoice.color && <span>Color: <strong className="text-slate-800">{invoice.color}</strong></span>}
            <span>Parts: <strong className="text-slate-800">{parts.length}</strong></span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderCustomerVehicleContent = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Customer Information Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-3">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-slate-100">
            <User className="w-4 h-4 text-blue-600" />
            Customer Information
          </h4>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-xs font-semibold text-slate-500 block uppercase">Name</span>
              <span className="font-bold text-slate-900">{invoice.customerName || 'N/A'}</span>
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-500 block uppercase">Phone</span>
              <span className="font-medium text-slate-800">{invoice.customerPhone || 'Not Provided'}</span>
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-500 block uppercase">Email</span>
              <span className="font-medium text-slate-800">{invoice.customerEmail || 'Not Provided'}</span>
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-500 block uppercase">Billing Address</span>
              <span className="font-medium text-slate-800 block whitespace-pre-line">
                {invoice.customerAddress || 'Not Provided'}
                {invoice.customerPostcode ? `, ${invoice.customerPostcode}` : ''}
              </span>
            </div>
          </div>
        </div>

        {/* Vehicle Information Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-3">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-slate-100">
            <Car className="w-4 h-4 text-amber-600" />
            Vehicle Information
          </h4>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-xs font-semibold text-slate-500 block uppercase">Registration</span>
              <span className="inline-block mt-1 px-3 py-1 bg-amber-300 text-slate-950 font-mono font-black text-sm rounded border border-amber-400">
                {invoice.registration ? invoice.registration.toUpperCase() : 'UNKNOWN'}
              </span>
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-500 block uppercase">Make & Model</span>
              <span className="font-bold text-slate-900">{invoice.make} {invoice.model}</span>
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-500 block uppercase">Color</span>
              <span className="font-medium text-slate-800">{invoice.color || 'Not specified'}</span>
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-500 block uppercase">Service Workshop</span>
              <span className="font-medium text-slate-800">{invoice.serviceCenter || 'Main Workshop'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderPartsLaborContent = () => (
    <div className="space-y-5">
      {/* Parts Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
            <Wrench className="w-4 h-4 text-indigo-600" />
            Replaced Parts & Materials ({parts.length})
          </h4>
        </div>
        {parts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs divide-y divide-slate-200">
              <thead className="bg-slate-50 text-slate-700 font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Part Name</th>
                  <th className="px-4 py-3 text-center">Qty</th>
                  <th className="px-4 py-3 text-right">Unit Price</th>
                  <th className="px-4 py-3 text-center">Discount</th>
                  <th className="px-4 py-3 text-center">VAT</th>
                  <th className="px-4 py-3 text-right">Line Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {parts.map((part, idx) => {
                  const lineTotal = part.price * part.quantity * (1 - (part.discount ?? 0) / 100);
                  return (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-semibold text-slate-900">{part.name}</td>
                      <td className="px-4 py-3 text-center font-mono font-bold text-slate-700">{part.quantity}</td>
                      <td className="px-4 py-3 text-right font-mono text-slate-700">£{part.price.toFixed(2)}</td>
                      <td className="px-4 py-3 text-center font-mono text-slate-500">
                        {part.discount > 0 ? `${part.discount}%` : '-'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {part.includeVAT ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            +VAT
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                        £{lineTotal.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 text-center text-xs text-slate-500 italic">No parts recorded on this invoice.</div>
        )}
      </div>

      {/* Labor & Materials Breakdown */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-600" />
            Labor & Materials Breakdown
          </h4>
        </div>
        <table className="min-w-full border-collapse text-xs">
          <thead className="bg-slate-50 text-slate-700 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left font-bold uppercase tracking-wider">Description</th>
              <th className="px-4 py-3 text-right font-bold uppercase tracking-wider">Cost</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            <tr className="hover:bg-slate-50 transition-colors">
              <td className="px-4 py-3 text-sm text-slate-900 font-medium">
                Labor ({invoice.laborHours}h @ £{invoice.laborRate}/h{invoice.laborVAT ? ' +VAT' : ''})
              </td>
              <td className="px-4 py-3 text-sm text-right text-slate-900 font-bold font-mono">
                £{invoice.laborCost.toFixed(2)}
              </td>
            </tr>
            <tr className="hover:bg-slate-50 transition-colors">
              <td className="px-4 py-3 text-sm text-slate-900 font-medium">
                Paint & Consumable Materials{invoice.paintMaterialsVAT ? ' +VAT' : ''}
              </td>
              <td className="px-4 py-3 text-sm text-right text-slate-900 font-bold font-mono">
                £{invoice.paintMaterials.toFixed(2)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderTotalsPaymentsContent = () => (
    <div className="space-y-5">
      {/* Financial Summary Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-3">
        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-slate-100">
          <PoundSterling className="w-4 h-4 text-emerald-600" />
          Financial Breakdown
        </h4>
        <div className="space-y-2 text-sm max-w-lg">
          <div className="flex justify-between text-slate-700">
            <span>Subtotal (Net):</span>
            <span className="font-mono font-semibold">£{invoice.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-blue-700">
            <span>VAT Amount:</span>
            <span className="font-mono font-semibold">£{invoice.vatAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-base font-bold text-slate-900 pt-2 border-t border-slate-200">
            <span>Total Invoiced:</span>
            <span className="font-mono font-black text-amber-700 text-lg">£{invoice.total.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-emerald-700 font-semibold">
            <span>Total Paid:</span>
            <span className="font-mono font-bold">£{invoice.paidAmount.toFixed(2)}</span>
          </div>
          <div className={`flex justify-between font-bold pt-2 border-t border-slate-200 ${owing > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
            <span>Remaining Owing:</span>
            <span className="font-mono font-black text-base">£{owing.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Payment History */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Payment History ({payments.length})
          </h4>
        </div>
        {payments.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {payments.map((payment) => (
              <div key={payment.id} className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                <div>
                  <span className="text-sm font-bold text-slate-900 font-mono">£{payment.amount.toFixed(2)}</span>
                  <p className="text-xs text-slate-500 mt-0.5">{safeFormat(payment.date)}</p>
                  {payment.notes && <p className="text-xs text-slate-600 mt-1 italic">{payment.notes}</p>}
                </div>
                <div className="text-right">
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold uppercase bg-slate-100 text-slate-700 border border-slate-200">
                    {payment.method?.toLowerCase().replace('_', ' ') || 'Payment'}
                  </span>
                  {payment.reference && (
                    <p className="text-xs text-slate-500 font-mono mt-1">Ref: {payment.reference}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 text-center text-xs text-slate-500 italic">No payments logged yet.</div>
        )}
      </div>
    </div>
  );

  const renderNotesAuditContent = () => (
    <div className="space-y-4">
      {/* Notes Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-2">
        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-slate-100">
          <FileText className="w-4 h-4 text-blue-600" />
          Invoice Notes & Remarks
        </h4>
        {invoice.notes ? (
          <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed bg-slate-50 p-3.5 rounded-lg border border-slate-100">
            {invoice.notes}
          </p>
        ) : (
          <p className="text-xs text-slate-400 italic">No remarks recorded on this invoice.</p>
        )}
      </div>

      {/* Audit Timestamps */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-2xs">
        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Audit Trail</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-600">
          <div>
            <span className="font-semibold text-slate-500 block">Date Created</span>
            <span className="font-mono font-medium text-slate-800 mt-0.5 block">{safeFormat(invoice.createdAt)}</span>
          </div>
          <div>
            <span className="font-semibold text-slate-500 block">Last Updated</span>
            <span className="font-mono font-medium text-slate-800 mt-0.5 block">{safeFormat(invoice.updatedAt)}</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col flex-1 h-full min-h-0 overflow-hidden text-slate-900 bg-white">
      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* TOP SUMMARY STRIP                                                   */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl border shadow-2xs bg-blue-50 border-blue-200 text-blue-700">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-slate-900 flex items-center">
                <Hash className="h-4 w-4 text-indigo-500 mr-0.5" />
                Invoice #{invoice.invoiceNumber}
              </h3>
              <StatusBadge status={invoice.paymentStatus} />
              {invoice.registration && (
                <span className="px-2 py-0.5 bg-amber-300 text-slate-950 font-mono font-black text-xs rounded border border-amber-400">
                  {invoice.registration.toUpperCase()}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
              <span>Date: {safeFormatDate(invoice.date)}</span>
              <span>·</span>
              <span>Workshop: {invoice.serviceCenter || 'Main Workshop'}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-right">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Total Amount
            </span>
            <span className="text-xl font-black font-mono tracking-tight text-slate-900">
              £{invoice.total.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 1. MODAL NAVIGATION BAR (PINNED AT TOP)                             */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="flex overflow-x-auto sm:grid sm:grid-cols-6 w-full border-b border-slate-200 shrink-0 bg-slate-100/70 select-none divide-x divide-slate-200 no-scrollbar">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center justify-center gap-1.5 py-3 px-2 border-b-2 text-xs sm:text-sm transition-all cursor-pointer truncate ${
                isActive
                  ? 'border-blue-600 text-blue-700 font-extrabold bg-white shadow-xs'
                  : 'border-transparent text-slate-600 font-semibold hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0 pointer-events-none" />
              <span className="truncate">{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold shrink-0 ${
                    isActive ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 2. TAB BODY CONTENT (SCROLLABLE)                                   */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="p-4 sm:p-6 overflow-y-auto flex-1 min-h-0 space-y-6">
        {activeTab === 'overview' && renderOverviewContent()}
        {activeTab === 'customer_vehicle' && renderCustomerVehicleContent()}
        {activeTab === 'parts_labor' && renderPartsLaborContent()}
        {activeTab === 'totals_payments' && renderTotalsPaymentsContent()}
        {activeTab === 'notes_audit' && renderNotesAuditContent()}

        {activeTab === 'all' && (
          <div className="space-y-6">
            <div className="border-b border-slate-200 pb-5">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3">1. Overview</h3>
              {renderOverviewContent()}
            </div>
            <div className="border-b border-slate-200 pb-5">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3">2. Customer & Vehicle</h3>
              {renderCustomerVehicleContent()}
            </div>
            <div className="border-b border-slate-200 pb-5">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3">3. Parts & Labor</h3>
              {renderPartsLaborContent()}
            </div>
            <div className="border-b border-slate-200 pb-5">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3">4. Totals & Payments</h3>
              {renderTotalsPaymentsContent()}
            </div>
            <div className="pb-2">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3">5. Notes & Audit</h3>
              {renderNotesAuditContent()}
            </div>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 3. MODAL FOOTER CONTROLS                                            */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
        <button
          type="button"
          onClick={handlePrevTab}
          disabled={currentTabIndex === 0}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-2xs cursor-pointer"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Previous</span>
        </button>

        <span className="text-xs font-semibold text-slate-500">
          Tab {currentTabIndex + 1} of {tabs.length}
        </span>

        <button
          type="button"
          onClick={handleNextTab}
          disabled={currentTabIndex === tabs.length - 1}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-2xs cursor-pointer"
        >
          <span>Next</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

export default VDInvoiceDetails;
