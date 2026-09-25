// src/components/finance/InvoiceDetails.tsx
import React, { useState } from 'react';
import { Invoice, Vehicle, Customer } from '../../types/finance';
import { Account } from '../../types';
import { format, isValid } from 'date-fns';
import StatusBadge from '../ui/StatusBadge';
import InvoicePaymentHistory from './InvoicePaymentHistory';
import {
  Receipt,
  FileText,
  Car,
  User,
  Users,
  Calendar,
  Hash,
  Tag,
  Wallet,
  RefreshCw,
  AlertCircle,
  ListChecks,
  CreditCard,
  Clock,
  Layers,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  Phone,
  Mail,
  Download,
  Building,
  ArrowRightLeft,
  CheckCircle2,
  AlertTriangle,
  History
} from 'lucide-react';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';
import toast from 'react-hot-toast';
import { useCommunicationLogs } from '../../hooks/useCommunicationLogs';
import CommunicationHistoryTimeline from '../common/CommunicationHistoryTimeline';

export type InvoiceDetailTab =
  | 'overview'
  | 'line_items'
  | 'client_vehicle'
  | 'payments_ledger'
  | 'notes_audit'
  | 'communication'
  | 'all';

interface InvoiceDetailsProps {
  invoice: Invoice;
  vehicle?: Vehicle;
  customer?: Customer;
  accounts?: Account[];
  groups?: { id: string; name: string }[];
  departments?: { id: string; name: string }[];
  onDownload?: () => void;
}

const InvoiceDetails: React.FC<InvoiceDetailsProps> = ({
  invoice,
  vehicle,
  customer,
  accounts = [],
  groups = [],
  departments = [],
  onDownload,
}) => {
  const { formatCurrency } = useFormattedDisplay();
  const [activeTab, setActiveTab] = useState<InvoiceDetailTab>('overview');
  const [copiedId, setCopiedId] = useState(false);

  const formatDate = (date: any): string => {
    if (!date) return 'N/A';
    let dateObj: Date | null = null;
    try {
      if (date?.toDate) {
        dateObj = date.toDate();
      } else if (date instanceof Date) {
        dateObj = date;
      } else {
        dateObj = new Date(date);
      }
      return dateObj && isValid(dateObj) ? format(dateObj, 'dd/MM/yyyy HH:mm') : 'Invalid Date';
    } catch (error) {
      console.error('Error formatting date:', error, date);
      return 'Invalid Date';
    }
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(invoice.id);
    setCopiedId(true);
    toast.success('Invoice ID copied to clipboard');
    setTimeout(() => setCopiedId(false), 2000);
  };

  // Calculations
  const totalDiscount = (invoice.lineItems || []).reduce((sum, li) => {
    const gross = (li.quantity || 0) * (li.unitPrice || 0);
    return sum + ((li.discount || 0) / 100) * gross;
  }, 0);

  const net = invoice.subTotal || 0;
  const vat = invoice.vatAmount || 0;
  const total = invoice.total || invoice.amount || 0;
  const paid = invoice.paidAmount || 0;
  const owing = invoice.remainingAmount !== undefined ? invoice.remainingAmount : Math.max(0, total - paid);

  // Account Resolvers
  const accFromId = (invoice as any).accountFrom;
  const accToId = (invoice as any).accountTo || invoice.accountId;
  const accFromName = accounts.find((a) => a.id === accFromId)?.name || 'N/A';
  const accToName = accounts.find((a) => a.id === accToId)?.name || invoice.accountName || 'N/A';

  const groupName = groups.find((g) => g.id === invoice.groupId)?.name || 'N/A';
  const departmentName =
    invoice.departmentName || departments.find((d) => d.id === invoice.departmentId)?.name || 'N/A';

  const lineItemsCount = invoice.lineItems?.length || 0;
  const paymentsCount = invoice.payments?.length || 0;
  const hasClientOrVehicle = !!(customer || invoice.customerName || vehicle || invoice.vehicleName);

  const { logs: commLogs } = useCommunicationLogs({
    recordId: invoice.id,
    customerId: invoice.customerId,
    matchKeys: [
      invoice.id,
      invoice.invoiceNumber,
      invoice.invoiceNumber ? `INV-${invoice.invoiceNumber}` : '',
      invoice.invoiceNumber ? `#${invoice.invoiceNumber}` : '',
      invoice.invoiceNumber ? `Invoice #${invoice.invoiceNumber}` : '',
      invoice.customerId,
      customer?.name,
      customer?.email,
      customer?.phone,
      customer?.mobile,
      (invoice as any).customerEmail,
      (invoice as any).customerPhone,
      (invoice as any).recipientEmail,
      vehicle?.registration,
      (invoice as any).vehicleReg,
    ].filter(Boolean),
  });

  const commCount = commLogs.length;

  // Tab definitions
  const tabs: {
    id: InvoiceDetailTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string | number;
  }[] = [
    { id: 'overview', label: 'Overview', icon: Receipt },
    {
      id: 'line_items',
      label: 'Line Items',
      icon: ListChecks,
      badge: lineItemsCount > 0 ? lineItemsCount : undefined,
    },
    {
      id: 'client_vehicle',
      label: 'Client & Vehicle',
      icon: UsersOrCarIcon,
      badge: hasClientOrVehicle ? 'Linked' : undefined,
    },
    {
      id: 'payments_ledger',
      label: 'Payments & Ledger',
      icon: CreditCard,
      badge: paymentsCount > 0 ? `${paymentsCount} paid` : undefined,
    },
    { id: 'notes_audit', label: 'Notes & Audit', icon: Clock },
    {
      id: 'communication',
      label: 'Communication History',
      icon: History,
      badge: `${commCount} Sent`,
    },
    { id: 'all', label: 'All Details', icon: Layers },
  ];

  function UsersOrCarIcon(props: { className?: string }) {
    if (vehicle || invoice.vehicleName) {
      return <Car {...props} />;
    }
    return <User {...props} />;
  }

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

  // ──────────────────────────────────────────────────────────────────────────
  // SUB-SECTION RENDERERS
  // ──────────────────────────────────────────────────────────────────────────

  const renderOverviewContent = () => (
    <div className="space-y-4">
      {/* Primary Financial Overview Highlight */}
      <div className="bg-gradient-to-br from-slate-50 to-blue-50/50 rounded-xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-sm font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded border border-slate-200">
                #{invoice.invoiceNumber || 'DRAFT'}
              </span>
              <StatusBadge status={invoice.paymentStatus} />
              {invoice.isLoan && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
                  Loan Account
                </span>
              )}
              {invoice.isRecurring && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1">
                  <RefreshCw className="w-3 h-3 text-indigo-600" /> Recurring
                </span>
              )}
            </div>

            <div className="mt-2.5 flex items-baseline gap-3 flex-wrap">
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Total Due
                </span>
                <p className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-slate-900">
                  {formatCurrency(total)}
                </p>
              </div>

              <div className="pl-3 sm:pl-5 border-l border-slate-200">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Paid
                </span>
                <p className="text-lg sm:text-xl font-bold font-mono text-emerald-600">
                  {formatCurrency(paid)}
                </p>
              </div>

              <div className="pl-3 sm:pl-5 border-l border-slate-200">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Outstanding
                </span>
                <p
                  className={`text-lg sm:text-xl font-bold font-mono ${
                    owing > 0.001 ? 'text-rose-600' : 'text-emerald-600'
                  }`}
                >
                  {formatCurrency(owing)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white/90 backdrop-blur-xs p-3.5 rounded-xl border border-slate-200/80 text-xs text-slate-700 space-y-1.5 sm:text-right shrink-0">
            <div className="flex justify-between sm:justify-end gap-4">
              <span className="text-slate-500 font-medium">Net Amount:</span>
              <span className="font-mono font-semibold text-slate-900">{formatCurrency(net)}</span>
            </div>
            <div className="flex justify-between sm:justify-end gap-4">
              <span className="text-slate-500 font-medium">VAT (20%):</span>
              <span className="font-mono font-semibold text-blue-600">{formatCurrency(vat)}</span>
            </div>
            {totalDiscount > 0 && (
              <div className="flex justify-between sm:justify-end gap-4">
                <span className="text-slate-500 font-medium">Total Discount:</span>
                <span className="font-mono font-semibold text-amber-600">-{formatCurrency(totalDiscount)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Grid of Key Metadata */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            Issued Date
          </div>
          <p className="mt-1.5 text-sm font-semibold text-slate-900">{formatDate(invoice.date)}</p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            Due Date
          </div>
          <p className="mt-1.5 text-sm font-semibold text-slate-900">{formatDate(invoice.dueDate)}</p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
            <Tag className="w-3.5 h-3.5 text-slate-400" />
            Category
          </div>
          <p className="mt-1.5 text-sm font-semibold text-slate-900 truncate">
            {invoice.category === 'Other' ? invoice.customCategory || 'Other' : invoice.category || 'General'}
          </p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
            <Building className="w-3.5 h-3.5 text-slate-400" />
            Department / Group
          </div>
          <p className="mt-1.5 text-sm font-semibold text-slate-900 truncate">
            {departmentName !== 'N/A' ? departmentName : groupName !== 'N/A' ? groupName : 'Unassigned'}
          </p>
        </div>
      </div>

      {/* Mini Quick Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-indigo-600" /> Client
            </span>
            <button
              type="button"
              onClick={() => setActiveTab('client_vehicle')}
              className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 cursor-pointer"
            >
              View details →
            </button>
          </div>
          <p className="font-bold text-slate-900">{customer?.name || invoice.customerName || 'No customer specified'}</p>
          {(customer?.mobile || invoice.customerPhone) && (
            <p className="text-xs text-slate-500 mt-0.5">{customer?.mobile || invoice.customerPhone}</p>
          )}
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Car className="w-3.5 h-3.5 text-indigo-600" /> Vehicle Assigned
            </span>
            <button
              type="button"
              onClick={() => setActiveTab('client_vehicle')}
              className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 cursor-pointer"
            >
              View details →
            </button>
          </div>
          {vehicle ? (
            <div>
              <p className="font-bold text-slate-900">{vehicle.make} {vehicle.model}</p>
              <span className="inline-block mt-1 px-2 py-0.5 bg-amber-300 text-slate-900 font-mono font-bold text-[11px] rounded border border-amber-400">
                {vehicle.registrationNumber}
              </span>
            </div>
          ) : invoice.vehicleName ? (
            <p className="font-bold text-slate-900">{invoice.vehicleName}</p>
          ) : (
            <p className="text-xs text-slate-400 italic">No vehicle linked to this invoice.</p>
          )}
        </div>
      </div>
    </div>
  );

  const renderLineItemsContent = () => (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow-2xs border border-slate-200 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <ListChecks className="w-4 h-4 text-indigo-600" />
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Invoice Items ({lineItemsCount})
            </h4>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Standard 20% VAT applies to checked items
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left font-bold uppercase tracking-wider select-none">Item Description</th>
                <th className="px-4 py-3 text-left font-bold uppercase tracking-wider select-none">Vehicle</th>
                <th className="px-4 py-3 text-center font-bold uppercase tracking-wider select-none">Qty</th>
                <th className="px-4 py-3 text-right font-bold uppercase tracking-wider select-none">Unit Price</th>
                <th className="px-4 py-3 text-right font-bold uppercase tracking-wider select-none">Discount</th>
                <th className="px-4 py-3 text-center font-bold uppercase tracking-wider select-none">VAT</th>
                <th className="px-4 py-3 text-right font-bold uppercase tracking-wider select-none">Line Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoice.lineItems && invoice.lineItems.length > 0 ? (
                invoice.lineItems.map((item, idx) => {
                  const gross = (item.quantity || 0) * (item.unitPrice || 0);
                  const discountAmt = ((item.discount || 0) / 100) * gross;
                  const netAfterDiscount = gross - discountAmt;
                  const vatAmt = item.includeVAT ? netAfterDiscount * 0.2 : 0;
                  const totalLine = netAfterDiscount + vatAmt;
                  const isEven = idx % 2 === 1;

                  return (
                    <tr
                      key={item.id || idx}
                      className={`hover:bg-blue-50/40 transition-colors ${
                        isEven ? 'bg-slate-50/50' : 'bg-white'
                      }`}
                    >
                      <td className="px-4 py-3 text-sm text-slate-900 font-bold">
                        {item.description || 'Item'}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 font-medium">
                        {item.vehicleName ? (
                          <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                            {item.vehicleName}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700 text-center font-bold">
                        {item.quantity}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700 text-right font-medium font-mono">
                        {formatCurrency(item.unitPrice || 0)}
                      </td>
                      <td className="px-4 py-3 text-sm text-rose-600 text-right font-semibold">
                        {item.discount > 0 ? `${item.discount.toFixed(1)}%` : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-center">
                        {item.includeVAT ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            20%
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-900 text-right font-black font-mono">
                        {formatCurrency(totalLine)}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-500 font-medium">
                    No line items added to this invoice.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Breakdown Totals Footer */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="text-xs text-slate-500">
            Total items listed: <span className="font-bold text-slate-800">{lineItemsCount}</span>
          </div>

          <div className="w-full sm:w-72 space-y-1.5 text-xs text-slate-700">
            <div className="flex justify-between">
              <span className="text-slate-500">Subtotal (Net):</span>
              <span className="font-mono font-bold text-slate-900">{formatCurrency(net)}</span>
            </div>
            {totalDiscount > 0 && (
              <div className="flex justify-between text-amber-700">
                <span>Discounts:</span>
                <span className="font-mono font-bold">-{formatCurrency(totalDiscount)}</span>
              </div>
            )}
            <div className="flex justify-between text-blue-700">
              <span>VAT Total (20%):</span>
              <span className="font-mono font-bold">{formatCurrency(vat)}</span>
            </div>
            <div className="flex justify-between pt-1.5 border-t border-slate-200 text-sm font-black text-slate-900">
              <span>Grand Total:</span>
              <span className="font-mono text-base">{formatCurrency(total)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderClientVehicleContent = () => (
    <div className="space-y-4">
      {/* Customer Information Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-2xs">
        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2 mb-3">
          <User className="w-4 h-4 text-indigo-600" />
          Customer & Billing Contact
        </h4>

        {customer ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="sm:col-span-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
              <span className="text-xs font-semibold text-slate-500 uppercase block">Full Name / Company</span>
              <span className="text-base font-bold text-slate-900 mt-0.5 block">{customer.name}</span>
            </div>

            {customer.mobile && (
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <span className="text-xs font-semibold text-slate-500 uppercase block">Phone / Mobile</span>
                <a
                  href={`tel:${customer.mobile}`}
                  className="font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1.5 mt-1"
                >
                  <Phone className="h-3.5 w-3.5 text-blue-500" />
                  {customer.mobile}
                </a>
              </div>
            )}

            {customer.email && (
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <span className="text-xs font-semibold text-slate-500 uppercase block">Email Address</span>
                <a
                  href={`mailto:${customer.email}`}
                  className="font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1.5 mt-1 truncate"
                >
                  <Mail className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                  <span className="truncate">{customer.email}</span>
                </a>
              </div>
            )}

            {customer.address && (
              <div className="sm:col-span-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
                <span className="text-xs font-semibold text-slate-500 uppercase block">Billing Address</span>
                <span className="text-sm font-medium text-slate-800 mt-0.5 block whitespace-pre-line">
                  {customer.address}
                </span>
              </div>
            )}
          </div>
        ) : invoice.customerName ? (
          <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-100 space-y-1">
            <span className="text-xs font-semibold text-slate-500 uppercase block">Customer Name</span>
            <span className="text-sm font-bold text-slate-900 block">{invoice.customerName}</span>
            {invoice.customerPhone && (
              <span className="text-xs text-slate-600 block">{invoice.customerPhone}</span>
            )}
          </div>
        ) : (
          <p className="text-xs text-slate-500 italic py-2">No customer assigned to this invoice.</p>
        )}
      </div>

      {/* Vehicle Assigned Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-2xs">
        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2 mb-3">
          <Car className="w-4 h-4 text-indigo-600" />
          Vehicle Assigned
        </h4>

        {vehicle ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
              <span className="text-xs font-semibold text-slate-500 uppercase block">Make & Model</span>
              <span className="text-sm font-bold text-slate-900 mt-0.5 block">
                {vehicle.make} {vehicle.model}
              </span>
            </div>

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
              <span className="text-xs font-semibold text-slate-500 uppercase block">Registration Plate</span>
              <span className="inline-block mt-1 px-2.5 py-1 bg-amber-300 text-slate-900 font-mono font-black text-xs rounded border border-amber-400 shadow-2xs tracking-wider">
                {vehicle.registrationNumber}
              </span>
            </div>

            {vehicle.owner && (
              <div className="sm:col-span-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
                <span className="text-xs font-semibold text-slate-500 uppercase block">Vehicle Owner</span>
                <span className="text-sm font-semibold text-slate-800 mt-0.5 block">
                  {vehicle.owner.isDefault ? 'AIE Skyline' : vehicle.owner.name}
                </span>
              </div>
            )}
          </div>
        ) : invoice.vehicleName ? (
          <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-100">
            <span className="text-xs font-semibold text-slate-500 uppercase block">Vehicle Reference</span>
            <span className="text-sm font-bold text-slate-900 mt-0.5 block">{invoice.vehicleName}</span>
          </div>
        ) : (
          <p className="text-xs text-slate-500 italic py-2">No vehicle linked to this invoice.</p>
        )}
      </div>
    </div>
  );

  const renderPaymentsLedgerContent = () => (
    <div className="space-y-4">
      {/* Ledger Routing Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-2xs">
        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2 mb-3">
          <ArrowRightLeft className="w-4 h-4 text-indigo-600" />
          General Ledger & Account Routing
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="p-3.5 bg-rose-50/70 border border-rose-200 rounded-xl">
            <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider block">
              From Account (Debit)
            </span>
            <span className="text-sm font-bold text-rose-950 mt-1 block">
              {accFromName}
            </span>
          </div>

          <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl">
            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
              To Account (Credit)
            </span>
            <span className="text-sm font-bold text-emerald-950 mt-1 block">
              {accToName}
            </span>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg">
            <span className="text-xs font-semibold text-slate-500 uppercase block">Classification Category</span>
            <span className="text-sm font-bold text-slate-900 mt-0.5 block">
              {invoice.category === 'Other' ? invoice.customCategory || 'Other' : invoice.category || 'General'}
            </span>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg">
            <span className="text-xs font-semibold text-slate-500 uppercase block">Finance Group / Dept</span>
            <span className="text-sm font-bold text-slate-900 mt-0.5 block">
              {departmentName !== 'N/A' ? departmentName : groupName !== 'N/A' ? groupName : 'Unassigned'}
            </span>
          </div>
        </div>
      </div>

      {/* Payment Timeline Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-2xs">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-indigo-600" />
            Payment History & Receipts
          </h4>
          <span className="text-xs font-bold text-slate-500">
            {paymentsCount} payment{paymentsCount === 1 ? '' : 's'} recorded
          </span>
        </div>

        {invoice.payments && invoice.payments.length > 0 ? (
          <InvoicePaymentHistory
            payments={invoice.payments}
            onDownloadDocument={(url) => window.open(url, '_blank')}
          />
        ) : (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-500">
            <AlertCircle className="w-5 h-5 text-slate-400 mx-auto mb-1" />
            No payments have been recorded for this invoice yet.
          </div>
        )}
      </div>
    </div>
  );

  const renderNotesAuditContent = () => (
    <div className="space-y-4">
      {/* Description */}
      {invoice.description && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-2xs">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2 mb-2.5">
            <FileText className="w-4 h-4 text-indigo-600" />
            Notes & Description
          </h4>
          <div className="bg-blue-50/70 p-3.5 rounded-lg border border-blue-200 text-sm text-blue-950 whitespace-pre-wrap leading-relaxed">
            {invoice.description}
          </div>
        </div>
      )}

      {/* Audit Metadata */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-3">
        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
          <Clock className="w-4 h-4 text-indigo-600" />
          Audit Trail & System Metadata
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <span className="font-bold text-slate-500 uppercase block">Created At</span>
            <span className="text-sm font-semibold text-slate-800 mt-0.5 block">
              {formatDate(invoice.createdAt)}
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <span className="font-bold text-slate-500 uppercase block">Last Updated</span>
            <span className="text-sm font-semibold text-slate-800 mt-0.5 block">
              {invoice.updatedAt ? formatDate(invoice.updatedAt) : 'No updates recorded'}
            </span>
          </div>
        </div>

        {/* Invoice Database ID */}
        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
          <div className="min-w-0 pr-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Invoice Record ID</span>
            <span className="font-mono text-slate-800 truncate block mt-0.5 select-all">
              {invoice.id}
            </span>
          </div>
          <button
            type="button"
            onClick={handleCopyId}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-md transition-colors shrink-0 cursor-pointer shadow-2xs"
            title="Copy ID"
          >
            {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
            <span>{copiedId ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>
    </div>
  );

  const renderCommunicationHistoryContent = () => (
    <div className="space-y-4">
      <CommunicationHistoryTimeline
        recordId={invoice.id}
        customerId={invoice.customerId}
        sourceModule="Invoice"
        matchKeys={[
          invoice.id,
          invoice.invoiceNumber,
          invoice.invoiceNumber ? `INV-${invoice.invoiceNumber}` : '',
          invoice.invoiceNumber ? `#${invoice.invoiceNumber}` : '',
          invoice.invoiceNumber ? `Invoice #${invoice.invoiceNumber}` : '',
          invoice.customerId,
          customer?.name,
          customer?.email,
          customer?.phone,
          customer?.mobile,
          (invoice as any).customerEmail,
          (invoice as any).customerPhone,
          (invoice as any).recipientEmail,
          vehicle?.registration,
          (invoice as any).vehicleReg,
        ].filter(Boolean)}
        title={`Invoice #${invoice.invoiceNumber || invoice.id} — Communication History`}
        description="Complete chronological audit log of all manual and scheduled automated emails and WhatsApp messages for this invoice."
        emptyMessage="No communication history recorded for this invoice yet."
      />
    </div>
  );

  return (
    <div className="flex flex-col flex-1 h-full min-h-0 overflow-hidden text-slate-900 bg-white">
      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* TOP SUMMARY STRIP                                                   */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="px-4 py-3 sm:px-6 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl border shadow-2xs bg-blue-50 border-blue-200 text-blue-700">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-slate-900 flex items-center">
                <Hash className="h-4 w-4 text-indigo-500 mr-0.5" />
                {invoice.invoiceNumber || 'Draft Invoice'}
              </h3>
              <StatusBadge status={invoice.paymentStatus} />
              {invoice.isLoan && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                  Loan
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
              <span>Issued: {formatDate(invoice.date)}</span>
              <span>·</span>
              <span>Due: {formatDate(invoice.dueDate)}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Total Amount
            </span>
            <span className="text-xl sm:text-2xl font-black font-mono tracking-tight text-slate-900">
              {formatCurrency(total)}
            </span>
          </div>

          {(invoice.documentUrl || onDownload) && (
            <button
              type="button"
              onClick={onDownload || (() => window.open(invoice.documentUrl || '', '_blank'))}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-2xs transition-colors cursor-pointer shrink-0"
              title="Download Invoice PDF"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">PDF</span>
            </button>
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 1. MODAL NAVIGATION BAR (PINNED AT THE TOP)                        */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 w-full border-b border-slate-200 shrink-0 bg-slate-100/70 select-none divide-x divide-slate-200">
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
        {activeTab === 'line_items' && renderLineItemsContent()}
        {activeTab === 'client_vehicle' && renderClientVehicleContent()}
        {activeTab === 'payments_ledger' && renderPaymentsLedgerContent()}
        {activeTab === 'notes_audit' && renderNotesAuditContent()}
        {activeTab === 'communication' && renderCommunicationHistoryContent()}

        {activeTab === 'all' && (
          <div className="space-y-6">
            <div className="border-b border-slate-200 pb-4">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3">1. Overview</h3>
              {renderOverviewContent()}
            </div>
            <div className="border-b border-slate-200 pb-4">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3">2. Line Items</h3>
              {renderLineItemsContent()}
            </div>
            <div className="border-b border-slate-200 pb-4">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3">3. Client & Vehicle</h3>
              {renderClientVehicleContent()}
            </div>
            <div className="border-b border-slate-200 pb-4">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3">4. Payments & Ledger</h3>
              {renderPaymentsLedgerContent()}
            </div>
            <div className="border-b border-slate-200 pb-4">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3">5. Notes & Audit</h3>
              {renderNotesAuditContent()}
            </div>
            <div className="pb-2">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3">6. Communication History</h3>
              {renderCommunicationHistoryContent()}
            </div>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 3. MODAL FOOTER (TAB NAVIGATION CONTROLS)                           */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
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

export default InvoiceDetails;
