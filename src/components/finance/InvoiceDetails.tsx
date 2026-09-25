// src/components/finance/InvoiceDetails.tsx
import React, { useState, useRef, useEffect } from 'react';
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
  Calendar,
  Hash,
  Tag,
  RefreshCw,
  AlertCircle,
  ListChecks,
  CreditCard,
  Clock,
  Copy,
  Check,
  Phone,
  Mail,
  Download,
  Building,
  ArrowRightLeft,
  History,
  MapPin,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';
import toast from 'react-hot-toast';
import { useCommunicationLogs } from '../../hooks/useCommunicationLogs';
import CommunicationHistoryTimeline from '../common/CommunicationHistoryTimeline';

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
  
  // 4 Navigation Parts: 1=Customer & Vehicle, 2=Dates & Classification, 3=Line Items, 4=Payments & History
  const [currentPage, setCurrentPage] = useState<1 | 2 | 3 | 4>(1);
  const [copiedId, setCopiedId] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Reset scroll to top when changing page
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [currentPage]);

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

  // 4 Navigation Parts definition
  const navParts = [
    { page: 1 as const, title: '1. Customer & Vehicle', icon: Users, badge: hasClientOrVehicle ? 'Linked' : undefined },
    { page: 2 as const, title: '2. Dates & Classification', icon: Calendar },
    { page: 3 as const, title: '3. Line Items & Products', icon: ListChecks, badge: lineItemsCount > 0 ? lineItemsCount : undefined },
    { page: 4 as const, title: '4. Payments & History', icon: CreditCard, badge: paymentsCount > 0 ? `${paymentsCount} paid` : undefined },
  ];

  return (
    <div className="flex flex-col flex-1 h-full min-h-0 overflow-hidden text-slate-900 bg-slate-50/50">
      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* TOP SUMMARY BAR (PINNED)                                           */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="px-5 py-4 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 shrink-0 shadow-2xs">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-xl border shadow-2xs bg-indigo-50 border-indigo-200 text-indigo-700">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-black text-slate-950 flex items-center">
                <Hash className="h-4.5 w-4.5 text-indigo-600 mr-0.5" />
                {invoice.invoiceNumber || 'Draft Invoice'}
              </h3>
              <StatusBadge status={invoice.paymentStatus} />
              {invoice.isLoan && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-900 border border-purple-200">
                  Loan
                </span>
              )}
              {invoice.isRecurring && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1">
                  <RefreshCw className="w-3 h-3 text-indigo-600" /> Recurring
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-2 font-medium">
              <span>Issued: <strong className="text-slate-700">{formatDate(invoice.date)}</strong></span>
              <span>·</span>
              <span>Due: <strong className="text-slate-700">{formatDate(invoice.dueDate)}</strong></span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              Total Amount
            </span>
            <span className="text-2xl font-black font-mono tracking-tight text-slate-950">
              {formatCurrency(total)}
            </span>
          </div>

          {(invoice.documentUrl || onDownload) && (
            <button
              type="button"
              onClick={onDownload || (() => window.open(invoice.documentUrl || '', '_blank'))}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors cursor-pointer shrink-0"
              title="Download or Print Invoice PDF"
            >
              <Download className="w-4.5 h-4.5" />
              <span>Print / PDF</span>
            </button>
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* TOP NAVIGATION PARTS STEPPER (PAGES)                                */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-5 py-3 overflow-x-auto border-b border-slate-200 shrink-0 bg-white shadow-2xs custom-scrollbar select-none">
        {navParts.map((part) => {
          const Icon = part.icon;
          const isActive = currentPage === part.page;

          return (
            <button
              key={part.page}
              type="button"
              onClick={() => setCurrentPage(part.page)}
              className={`flex items-center gap-2 py-2 px-3.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-950 hover:bg-slate-100 bg-slate-50 border border-slate-200'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0 pointer-events-none" />
              <span>{part.title}</span>
              {part.badge !== undefined && (
                <span
                  className={`ml-1 px-2 py-0.5 rounded-full text-xs font-black shrink-0 ${
                    isActive ? 'bg-white text-indigo-700' : 'bg-slate-200 text-slate-800'
                  }`}
                >
                  {part.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* ACTIVE PAGE CONTENT BODY                                            */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div
        ref={scrollContainerRef}
        className="p-5 sm:p-7 overflow-y-auto flex-1 min-h-0 custom-scrollbar"
      >
        {/* ══════════════ PART 1: CUSTOMER & VEHICLE ══════════════ */}
        {currentPage === 1 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Part 1: Customer Information & Vehicle
                </h3>
              </div>
              <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200">
                Page 1 of 4
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Customer Information Card */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <User className="w-4 h-4 text-indigo-600" />
                    Customer Information
                  </h4>
                  <span className="text-xs font-semibold text-slate-500">Billing Profile</span>
                </div>

                {customer ? (
                  <div className="space-y-3.5">
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Customer Name</span>
                      <span className="text-base font-bold text-slate-900 mt-1 block">{customer.name}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {customer.mobile && (
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Phone / Mobile</span>
                          <a
                            href={`tel:${customer.mobile}`}
                            className="font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 mt-1 text-sm"
                          >
                            <Phone className="h-4 w-4 text-indigo-500 shrink-0" />
                            {customer.mobile}
                          </a>
                        </div>
                      )}

                      {customer.email && (
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Email Address</span>
                          <a
                            href={`mailto:${customer.email}`}
                            className="font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 mt-1 text-sm truncate"
                          >
                            <Mail className="h-4 w-4 text-indigo-500 shrink-0" />
                            <span className="truncate">{customer.email}</span>
                          </a>
                        </div>
                      )}
                    </div>

                    {customer.address && (
                      <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" /> Billing Address
                        </span>
                        <span className="text-sm font-medium text-slate-800 mt-1 block whitespace-pre-line leading-relaxed">
                          {customer.address}
                        </span>
                      </div>
                    )}
                  </div>
                ) : invoice.customerName ? (
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Customer Name</span>
                    <span className="text-base font-bold text-slate-900 block">{invoice.customerName}</span>
                    {invoice.customerPhone && (
                      <span className="text-sm text-slate-700 block font-medium">Phone: {invoice.customerPhone}</span>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 italic py-6 text-center">No customer assigned to this invoice.</p>
                )}
              </div>

              {/* Vehicle Information Card */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Car className="w-4 h-4 text-indigo-600" />
                    Vehicle Assigned
                  </h4>
                  <span className="text-xs font-semibold text-slate-500">Fleet Record</span>
                </div>

                {vehicle ? (
                  <div className="space-y-3.5">
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Make & Model</span>
                      <span className="text-base font-bold text-slate-900 mt-1 block">
                        {vehicle.make} {vehicle.model}
                      </span>
                    </div>

                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Registration Number (VRM)</span>
                      <div className="mt-1.5">
                        <span className="inline-block px-3 py-1 bg-amber-300 text-slate-950 font-mono font-black text-sm rounded-md border border-amber-400 shadow-2xs tracking-wider">
                          {vehicle.registrationNumber}
                        </span>
                      </div>
                    </div>

                    {vehicle.owner && (
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Vehicle Owner</span>
                        <span className="text-sm font-semibold text-slate-800 mt-1 block">
                          {vehicle.owner.isDefault ? 'AIE Skyline' : vehicle.owner.name}
                        </span>
                      </div>
                    )}
                  </div>
                ) : invoice.vehicleName ? (
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Vehicle Reference</span>
                    <span className="text-base font-bold text-slate-900 block">{invoice.vehicleName}</span>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 italic py-6 text-center">No vehicle linked to this invoice.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════ PART 2: DATES, SETTINGS & CLASSIFICATION ══════════════ */}
        {currentPage === 2 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Part 2: Dates, Settings & Classification
                </h3>
              </div>
              <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200">
                Page 2 of 4
              </span>
            </div>

            {/* Dates & Status Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-600 uppercase tracking-wider">
                  <Calendar className="w-4 h-4 text-indigo-600" />
                  Issued Date
                </div>
                <p className="mt-2 text-sm font-bold text-slate-900">{formatDate(invoice.date)}</p>
              </div>

              <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-600 uppercase tracking-wider">
                  <Calendar className="w-4 h-4 text-indigo-600" />
                  Due Date
                </div>
                <p className="mt-2 text-sm font-bold text-slate-900">{formatDate(invoice.dueDate)}</p>
              </div>

              <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-600 uppercase tracking-wider">
                  <Tag className="w-4 h-4 text-indigo-600" />
                  Category
                </div>
                <p className="mt-2 text-sm font-bold text-slate-900 truncate">
                  {invoice.category === 'Other' ? invoice.customCategory || 'Other' : invoice.category || 'General'}
                </p>
              </div>

              <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-600 uppercase tracking-wider">
                  <Building className="w-4 h-4 text-indigo-600" />
                  Dept / Group
                </div>
                <p className="mt-2 text-sm font-bold text-slate-900 truncate">
                  {departmentName !== 'N/A' ? departmentName : groupName !== 'N/A' ? groupName : 'Unassigned'}
                </p>
              </div>
            </div>

            {/* General Ledger Routing Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-slate-100">
                <ArrowRightLeft className="w-4 h-4 text-indigo-600" />
                General Ledger & Account Routing
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="p-4 bg-rose-50/70 border border-rose-200 rounded-xl">
                  <span className="text-xs font-bold text-rose-800 uppercase tracking-wider block">
                    From Account (Debit)
                  </span>
                  <span className="text-sm font-bold text-rose-950 mt-1 block">
                    {accFromName}
                  </span>
                </div>

                <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl">
                  <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">
                    To Account (Credit)
                  </span>
                  <span className="text-sm font-bold text-emerald-950 mt-1 block">
                    {accToName}
                  </span>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Assigned Dept</span>
                  <span className="text-sm font-bold text-slate-900 mt-1 block truncate">
                    {departmentName !== 'N/A' ? departmentName : 'Unassigned'}
                  </span>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Assigned Group</span>
                  <span className="text-sm font-bold text-slate-900 mt-1 block truncate">
                    {groupName !== 'N/A' ? groupName : 'Unassigned'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════ PART 3: LINE ITEMS & PRODUCTS ══════════════ */}
        {currentPage === 3 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Part 3: Invoice Line Items & Products ({lineItemsCount})
                </h3>
              </div>
              <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200">
                Page 3 of 4
              </span>
            </div>

            <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-left">
                  <thead className="bg-slate-100/90 text-slate-700 border-b border-slate-200 text-xs font-bold uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4 w-12 text-center text-slate-400">#</th>
                      <th className="py-3 px-4 min-w-[260px]">Item Description & Product</th>
                      <th className="py-3 px-4 min-w-[140px]">Vehicle</th>
                      <th className="py-3 px-4 w-20 text-center">Qty</th>
                      <th className="py-3 px-4 w-28 text-right">Unit Price</th>
                      <th className="py-3 px-4 w-24 text-right">Discount</th>
                      <th className="py-3 px-4 w-20 text-center">VAT</th>
                      <th className="py-3 px-4 w-32 text-right">Line Total</th>
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
                            className={`hover:bg-indigo-50/30 transition-colors ${
                              isEven ? 'bg-slate-50/40' : 'bg-white'
                            }`}
                          >
                            <td className="py-3.5 px-4 text-center text-slate-400 font-mono text-xs font-semibold">
                              {idx + 1}
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="space-y-0.5">
                                <p className="text-sm font-bold text-slate-900">{item.description || 'Item'}</p>
                                {(item as any).partNumber && (
                                  <span className="inline-block text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                    SKU: {(item as any).partNumber}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-xs font-medium text-slate-700">
                              {item.vehicleName ? (
                                <span className="font-mono bg-slate-100 px-2 py-1 rounded border border-slate-200 block text-center truncate">
                                  {item.vehicleName}
                                </span>
                              ) : (
                                <span className="text-slate-400 block text-center">-</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-sm text-slate-800 text-center font-bold font-mono">
                              {item.quantity}
                            </td>
                            <td className="py-3.5 px-4 text-sm text-slate-800 text-right font-medium font-mono">
                              {formatCurrency(item.unitPrice || 0)}
                            </td>
                            <td className="py-3.5 px-4 text-sm text-rose-600 text-right font-bold font-mono">
                              {item.discount > 0 ? `${item.discount.toFixed(1)}%` : '-'}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              {item.includeVAT ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                  20%
                                </span>
                              ) : (
                                <span className="text-slate-400 font-mono text-xs">-</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-sm text-slate-950 text-right font-black font-mono">
                              {formatCurrency(totalLine)}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={8} className="px-4 py-10 text-center text-sm text-slate-500 font-medium">
                          No line items added to this invoice.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Breakdown Totals Footer */}
              <div className="bg-slate-50 p-5 sm:p-6 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="text-sm text-slate-600 font-medium">
                  Total items listed: <span className="font-bold text-slate-900">{lineItemsCount}</span>
                </div>

                <div className="w-full sm:w-80 space-y-2 text-sm text-slate-800 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Subtotal (Net):</span>
                    <span className="font-mono font-bold text-slate-900">{formatCurrency(net)}</span>
                  </div>
                  {totalDiscount > 0 && (
                    <div className="flex justify-between text-amber-700">
                      <span className="font-medium">Total Discount:</span>
                      <span className="font-mono font-bold">-{formatCurrency(totalDiscount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-indigo-700">
                    <span className="font-medium">VAT Total (20%):</span>
                    <span className="font-mono font-bold">{formatCurrency(vat)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-200 text-base font-black text-slate-950">
                    <span>Grand Total:</span>
                    <span className="font-mono text-lg">{formatCurrency(total)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════ PART 4: PAYMENTS, LEDGER & HISTORY ══════════════ */}
        {currentPage === 4 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Part 4: Payments, Financial Summary & History
                </h3>
              </div>
              <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200">
                Page 4 of 4
              </span>
            </div>

            {/* Financial Status Highlight Banner */}
            <div className="bg-gradient-to-br from-slate-50 via-indigo-50/30 to-violet-50/40 rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-baseline gap-6 flex-wrap">
                  <div>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Total Due</span>
                    <p className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-slate-950 mt-0.5">
                      {formatCurrency(total)}
                    </p>
                  </div>
                  <div className="pl-6 border-l border-slate-300">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Amount Paid</span>
                    <p className="text-xl sm:text-2xl font-bold font-mono text-emerald-600 mt-0.5">
                      {formatCurrency(paid)}
                    </p>
                  </div>
                  <div className="pl-6 border-l border-slate-300">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Outstanding Balance</span>
                    <p className={`text-xl sm:text-2xl font-bold font-mono mt-0.5 ${owing > 0.001 ? 'text-rose-600 font-black' : 'text-emerald-600'}`}>
                      {formatCurrency(owing)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment History Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-indigo-600" />
                  Payment History & Receipts
                </h4>
                <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-200">
                  {paymentsCount} payment{paymentsCount === 1 ? '' : 's'} recorded
                </span>
              </div>

              {invoice.payments && invoice.payments.length > 0 ? (
                <InvoicePaymentHistory
                  payments={invoice.payments}
                  onDownloadDocument={(url) => window.open(url, '_blank')}
                />
              ) : (
                <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl text-center text-sm text-slate-500">
                  <AlertCircle className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                  No payments have been recorded for this invoice yet.
                </div>
              )}
            </div>

            {/* Notes & Description */}
            {invoice.description && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-3">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  Invoice Notes & Terms
                </h4>
                <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 text-sm text-indigo-950 whitespace-pre-wrap leading-relaxed font-medium">
                  {invoice.description}
                </div>
              </div>
            )}

            {/* Communication History Timeline */}
            <div className="space-y-4">
              <CommunicationHistoryTimeline
                recordId={invoice.id}
                customerId={invoice.customerId}
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
                description="Chronological log of emails and WhatsApp messages for this invoice."
                emptyMessage="No communication history recorded for this invoice yet."
              />
            </div>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* STICKY BOTTOM NAVIGATION CONTROLS                                   */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="bg-white border-t border-slate-200 px-5 py-3.5 flex items-center justify-between shrink-0 shadow-2xs">
        <button
          type="button"
          onClick={() => {
            if (currentPage > 1) setCurrentPage((prev) => (prev - 1) as any);
          }}
          disabled={currentPage === 1}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-2xs cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Previous Page</span>
        </button>

        <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3.5 py-1.5 rounded-full border border-slate-200">
          Page {currentPage} of 4: {navParts[currentPage - 1].title}
        </span>

        {currentPage < 4 ? (
          <button
            type="button"
            onClick={() => {
              if (currentPage < 4) setCurrentPage((prev) => (prev + 1) as any);
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <span>
              {currentPage === 1 && 'Next: Dates & Classification'}
              {currentPage === 2 && 'Next: Line Items & Products'}
              {currentPage === 3 && 'Next: Payments & History'}
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <div className="text-xs font-bold text-emerald-600 flex items-center gap-1.5">
            <Check className="w-4 h-4" />
            <span>End of Invoice Details</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default InvoiceDetails;
