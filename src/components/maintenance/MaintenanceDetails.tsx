// src/components/maintenance/MaintenanceDetails.tsx
import React, { useState, useEffect } from 'react';
import { MaintenanceLog, Vehicle } from '../../types';
import { ensureValidDate } from '../../utils/dateHelpers';
import StatusBadge from '../ui/StatusBadge';
import { Wrench, DollarSign, FileText, Car, Layers, Paperclip, Calendar, Clock, MapPin, Receipt, CheckCircle2, ExternalLink, MessageSquare } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';
import { format } from 'date-fns';
import { usePermissions } from '../../hooks/usePermissions'; 
import CommunicationHistoryTimeline from '../common/CommunicationHistoryTimeline';

interface MaintenanceDetailsProps {
  log: MaintenanceLog;
  vehicle?: Vehicle; // Note: Can be undefined if vehicle was deleted
  onClose?: () => void;
}

type DetailsTab = 'overview' | 'parts_labor' | 'invoicing' | 'attachments' | 'communication';

const MaintenanceDetails: React.FC<MaintenanceDetailsProps> = ({ log, vehicle, onClose }) => {
  const [activeTab, setActiveTab] = useState<DetailsTab>('overview');
  const serviceDate = ensureValidDate(log.date);
  const nextServiceDate = ensureValidDate(log.nextServiceDate);
  const [createdByName, setCreatedByName] = useState<string | null>(null);
  
  const { formatCurrency } = useFormattedDisplay();
  const { isCompany } = usePermissions(); 

  useEffect(() => {
    const fetchCreatedByName = async () => {
      if (log.createdBy) {
        try {
          const userDoc = await getDoc(doc(db, 'users', log.createdBy));
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
  }, [log.createdBy]);

  const DetailItem = ({ label, value, isDate = false, isExpiring = false }: { 
    label: string;
    value: any;
    isDate?: boolean;
    isExpiring?: boolean;
  }) => {
    let displayValue = value;
    if (isDate && value) {
      const d = value.toDate ? value.toDate() : (value instanceof Date ? value : new Date(value));
      if (!isNaN(d.getTime())) {
        displayValue = format(d, 'dd/MM/yyyy HH:mm');
      } else {
        displayValue = 'N/A';
      }
    } else if (!value && value !== 0) {
      displayValue = '-';
    }

    return (
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">{label}</h3>
        <p className={`mt-1 text-sm font-bold ${isExpiring ? 'text-rose-600' : 'text-slate-900'}`}>
          {displayValue}
        </p>
      </div>
    );
  };

  // Helper for status badge with exact corresponding table colors
  const renderDetailsStatusBadge = (status: string) => {
    const s = (status || '').toLowerCase().trim();
    if (s === 'in-progress' || s === 'in progress') {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200 shadow-xs">
          ● In Progress
        </span>
      );
    }
    if (s === 'completed') {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs">
          ✓ Completed
        </span>
      );
    }
    if (s === 'scheduled') {
      const daysUntilDue = log.date ? Math.ceil((new Date(log.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 999;
      if (daysUntilDue <= 7) {
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200 shadow-xs">
            ⚠️ Scheduled — Due in {daysUntilDue <= 0 ? 'Today' : `${daysUntilDue}d`}
          </span>
        );
      }
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200 shadow-xs">
          📅 Scheduled
        </span>
      );
    }
    return <StatusBadge status={status} />;
  };

  const renderDetailsPaymentBadge = (status: string) => {
    const s = (status || '').toLowerCase().trim();
    if (s === 'paid') {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs">
          ✓ Paid
        </span>
      );
    }
    if (s === 'unpaid' || s === 'overdue') {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200 shadow-xs">
          ✕ Unpaid
        </span>
      );
    }
    if (s === 'partially_paid' || s === 'partially paid') {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200 shadow-xs">
          ◐ Partially Paid
        </span>
      );
    }
    return <StatusBadge status={status} />;
  };

  const tabs: { id: DetailsTab; label: string; icon: React.ComponentType<{ className?: string }>; count?: number }[] = [
    { id: 'overview', label: 'Service Overview', icon: Wrench },
    ...(!isCompany ? [{ id: 'parts_labor' as DetailsTab, label: 'Parts & Labor', icon: Layers, count: (log.parts?.length || 0) }] : []),
    ...(!isCompany ? [{ id: 'invoicing' as DetailsTab, label: 'Invoicing & Finance', icon: Receipt }] : []),
    { id: 'attachments', label: 'Attachments', icon: Paperclip, count: log.attachments?.length || 0 },
    { id: 'communication', label: 'Communication History', icon: MessageSquare },
  ];

  return (
    <div className="flex flex-col flex-1 h-full min-h-0 overflow-hidden text-slate-900">
      {/* Top Banner: Vehicle and Status Overview (always visible across all tabs) */}
      <div className="p-4 sm:px-6 shrink-0 bg-[#F8FAFC] border-b border-[#E2E8F0]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {vehicle?.image ? (
              <img 
                src={vehicle.image} 
                alt={`${vehicle.make} ${vehicle.model}`}
                className="h-12 w-12 object-cover rounded-xl border border-[#E2E8F0] shrink-0"
              />
            ) : (
              <div className="h-12 w-12 bg-slate-100 border border-[#E2E8F0] rounded-xl flex items-center justify-center shrink-0">
                <Car className="h-6 w-6 text-blue-400" />
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-black text-slate-900 text-base truncate">
                  {vehicle?.make || log.vehicleDetails?.make || 'Unknown'} {vehicle?.model || log.vehicleDetails?.model || ''}
                </p>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold capitalize bg-blue-50 text-blue-700 border border-blue-200">
                  {log.type.replace(/-/g, ' ')}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-black uppercase font-mono tracking-widest bg-[#FDD835] text-black border border-yellow-500 shadow-xs">
                  {vehicle?.registrationNumber || log.vehicleDetails?.registrationNumber || 'Deleted Vehicle'}
                </span>
                {log.orderNumber && (
                  <span className="text-xs font-mono text-slate-600">
                    Order: <span className="text-slate-900 font-bold">{log.orderNumber}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {renderDetailsStatusBadge(log.status)}
            {!isCompany && renderDetailsPaymentBadge(log.paymentStatus)}
            {!isCompany && log.cost !== undefined && (
              <div className="ml-auto sm:ml-2 px-3 py-1 bg-white border border-[#E2E8F0] rounded-xl text-right">
                <span className="text-xs text-slate-500 block leading-tight">Total</span>
                <span className="text-sm font-mono font-black text-slate-900 leading-tight">{formatCurrency(log.cost)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Navigation Tabs */}
      <div className="flex border-b border-[#E2E8F0] px-4 sm:px-6 shrink-0 bg-slate-50 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 py-3 px-4 border-b-2 font-medium text-sm transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'border-blue-600 text-blue-600 font-bold bg-white rounded-t-lg shadow-xs'
                  : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-600'
              }`}
            >
              <Icon className="w-4 h-4 pointer-events-none shrink-0" />
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`ml-1.5 px-2 py-0.2 rounded-full text-xs font-bold ${
                  isActive ? 'bg-blue-600 text-white' : 'bg-[#2B314E] text-slate-600'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Scrollable Tab Content Body */}
      <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 custom-scrollbar text-slate-900">
        
        {/* TAB 1: SERVICE OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Service Specifications Card */}
            <div className="bg-slate-50 border border-[#E2E8F0] rounded-2xl p-5 space-y-4 shadow-md">
              <div className="flex items-center">
                <Wrench className="h-5 w-5 text-amber-400 mr-2" />
                <h3 className="text-base font-bold text-slate-900">Service Specifications</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">Service Type</h4>
                  <p className="mt-1 text-sm font-bold text-slate-900 capitalize">{log.type.replace(/-/g, ' ')}</p>
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">Service Date</h4>
                  <p className="mt-1 text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-blue-400 inline" />
                    {format(serviceDate, 'dd/MM/yyyy HH:mm')}
                  </p>
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">Next Service Date</h4>
                  <p className="mt-1 text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-400 inline" />
                    {format(nextServiceDate, 'dd/MM/yyyy HH:mm')}
                  </p>
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">Service Provider</h4>
                  <p className="mt-1 text-sm font-bold text-slate-900">{log.serviceProvider || '-'}</p>
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">Current Mileage</h4>
                  <p className="mt-1 text-sm font-mono font-bold text-slate-900">
                    {log.currentMileage !== undefined ? `${log.currentMileage.toLocaleString()} miles` : '-'}
                  </p>
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">Next Service Mileage</h4>
                  <p className="mt-1 text-sm font-mono font-bold text-slate-900">
                    {log.nextServiceMileage !== undefined ? `${log.nextServiceMileage.toLocaleString()} miles` : '-'}
                  </p>
                </div>
                <div className="sm:col-span-2 lg:col-span-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">Location</h4>
                  <p className="mt-1 text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-rose-600 inline shrink-0" />
                    {log.location || '-'}
                  </p>
                </div>
              </div>

              {log.description && (
                <div className="pt-3 border-t border-slate-200">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Description</h4>
                  <div className="p-3.5 bg-white border border-[#E2E8F0] rounded-xl text-slate-900 text-sm font-medium leading-relaxed">
                    {log.description}
                  </div>
                </div>
              )}

              {log.notes && (
                <div className="pt-2 border-t border-slate-200">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Notes</h4>
                  <div className="p-3.5 bg-white border border-[#E2E8F0] rounded-xl text-slate-900 text-sm font-medium leading-relaxed">
                    {log.notes}
                  </div>
                </div>
              )}
            </div>

            {/* Audit & Record Metadata */}
            <div className="bg-slate-50 border border-[#E2E8F0] rounded-2xl p-4.5 shadow-md grid grid-cols-1 sm:grid-cols-2 gap-4">
              <DetailItem
                label="Created At"
                value={log.updatedAt || log.createdAt}
                isDate
              />
              <DetailItem
                label="Created By"
                value={createdByName || log.createdBy || 'Loading...'}
              />
            </div>
          </div>
        )}

        {/* TAB 2: PARTS & LABOR */}
        {activeTab === 'parts_labor' && !isCompany && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Parts Breakdown */}
            <div className="bg-slate-50 border border-[#E2E8F0] rounded-2xl p-5 space-y-4 shadow-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Layers className="h-5 w-5 text-indigo-400 mr-2" />
                  <h3 className="text-base font-bold text-slate-900">Parts ({log.parts?.length || 0})</h3>
                </div>
              </div>

              {log.parts && log.parts.length > 0 ? (
                <div className="space-y-2.5">
                  {log.parts.map((part, index) => {
                    const lineGross = part.cost * part.quantity;
                    const discAmt = part.discount ? (part.discount / 100) * lineGross : 0;
                    const lineNet = lineGross - discAmt;
                    const lineTotal = log.vatDetails?.partsVAT[index]?.includeVAT ? lineNet * 1.2 : lineNet;
                    
                    return (
                      <div key={index} className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 bg-white border border-[#E2E8F0] p-3.5 rounded-xl text-slate-900">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm">{part.name}</span>
                            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-[#2B314E] text-slate-600">
                              Qty: {part.quantity}
                            </span>
                            {part.discount ? (
                              <span className="px-2 py-0.5 rounded text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                                {part.discount}% OFF
                              </span>
                            ) : null}
                          </div>
                          <div className="text-xs text-slate-500 mt-1">
                            Unit Price: {formatCurrency(part.cost)}
                            {log.vatDetails?.partsVAT[index]?.includeVAT && (
                              <span className="text-blue-400 ml-1.5 font-semibold">+ 20% VAT</span>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-mono font-bold text-emerald-600 text-base">
                            {formatCurrency(lineTotal)}
                          </div>
                          <div className="text-xs text-slate-500">Total</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6 bg-white rounded-xl border border-dashed border-[#E2E8F0] text-slate-500 text-sm">
                  No parts recorded for this maintenance service.
                </div>
              )}
            </div>

            {/* Labor Breakdown */}
            <div className="bg-slate-50 border border-[#E2E8F0] rounded-2xl p-5 space-y-4 shadow-md">
              <div className="flex items-center">
                <Wrench className="h-5 w-5 text-blue-400 mr-2" />
                <h3 className="text-base font-bold text-slate-900">Labor Details</h3>
              </div>

              <div className="bg-white border border-[#E2E8F0] p-4 rounded-xl flex flex-col sm:flex-row justify-between sm:items-center gap-3 text-slate-900">
                <div>
                  <span className="font-bold text-slate-900 text-base">Labor Charge</span>
                  <div className="text-xs text-slate-600 font-semibold mt-1">
                    {log.laborHours || 0} hours @ {formatCurrency(log.laborRate || 0)}/hour
                    {log.vatDetails?.laborVAT && (
                      <span className="text-blue-400 ml-2 font-bold">+ 20% VAT</span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-emerald-600 text-lg">
                    {formatCurrency(log.laborCost || 0)}
                  </div>
                  <div className="text-xs text-slate-500">Labor Total</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: INVOICING & FINANCE */}
        {activeTab === 'invoicing' && !isCompany && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Order & Invoicing Information */}
            <div className="bg-slate-50 border border-[#E2E8F0] rounded-2xl p-5 space-y-4 shadow-md">
              <div className="flex items-center">
                <FileText className="h-5 w-5 text-indigo-400 mr-2" />
                <h3 className="text-base font-bold text-slate-900">Order & Invoicing Identifiers</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <DetailItem label="Order Number" value={log.orderNumber || '-'} />
                <DetailItem label="Invoice Number" value={log.invoiceNumber || '-'} />
                <DetailItem label="Booking Start" value={log.date} isDate />
                <DetailItem label="Invoice Date" value={log.invoiceDate} isDate />
                <DetailItem label="Invoice Due Date" value={log.invoiceDueDate} isDate />
                <DetailItem label="Completed Date" value={log.completedDate} isDate />
              </div>

              {log.invoiceUrl && (
                <div className="mt-3 pt-3 border-t border-[#E2E8F0]">
                  <a
                    href={log.invoiceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center px-4 py-2 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 font-bold text-sm transition"
                  >
                    <FileText className="h-4 w-4 mr-2" /> View Maintenance Invoice (PDF)
                    <ExternalLink className="h-3.5 w-3.5 ml-2" />
                  </a>
                </div>
              )}
            </div>

            {/* Comprehensive Financial Summary */}
            <div className="bg-slate-50 border border-[#E2E8F0] rounded-2xl p-5 space-y-4 shadow-md">
              <div className="flex items-center">
                <DollarSign className="h-5 w-5 text-emerald-600 mr-2" />
                <h3 className="text-base font-bold text-slate-900">Financial Breakdown</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-white border border-[#E2E8F0] p-3.5 rounded-xl">
                  <span className="text-xs text-[#000000] font-semibold block uppercase tracking-wider">NET Total</span>
                  <span className="text-lg font-mono font-semibold text-[#000000] mt-1 block">{formatCurrency(log.netAmount || 0)}</span>
                </div>
                <div className="bg-white border border-[#E2E8F0] p-3.5 rounded-xl">
                  <span className="text-xs text-[#2563EB] font-semibold block uppercase tracking-wider">VAT (20%)</span>
                  <span className="text-lg font-mono font-semibold text-[#2563EB] mt-1 block">{formatCurrency(log.vatAmount || 0)}</span>
                </div>
                <div className="bg-white border border-[#E2E8F0] p-3.5 rounded-xl">
                  <span className="text-xs text-[#D97706] font-semibold block uppercase tracking-wider">Discount</span>
                  <span className="text-lg font-mono font-semibold text-[#D97706] mt-1 block">
                    {log.totalDiscount ? `–${formatCurrency(log.totalDiscount)}` : '£0.00'}
                  </span>
                </div>
              </div>

              <div className="border-t border-[#E2E8F0] pt-4 space-y-3">
                <div className="flex justify-between items-center text-lg font-bold text-[#D97706] p-3 bg-white border border-[#E2E8F0] rounded-xl">
                  <span>Grand Total Cost:</span>
                  <span className="font-mono text-2xl text-[#D97706] font-bold">{formatCurrency(log.cost || 0)}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex justify-between items-center p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <span className="text-[#15803D] font-bold text-sm">Total Paid:</span>
                    <span className="font-mono text-[#15803D] font-bold text-lg">{formatCurrency(log.paidAmount || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-rose-50 border border-rose-200 rounded-xl">
                    <span className="text-[#DC2626] font-bold text-sm">Amount Owing:</span>
                    <span className="font-mono text-[#DC2626] font-bold text-lg">{formatCurrency(log.remainingAmount || 0)}</span>
                  </div>
                </div>
                {log.paymentMethod && (
                  <div className="flex justify-between text-xs text-slate-500 px-1 pt-1">
                    <span>Payment Method: <strong className="text-slate-900 capitalize">{log.paymentMethod.replace(/_/g, ' ')}</strong></span>
                    {log.paymentReference && <span>Ref: <strong className="text-slate-900 font-mono">{log.paymentReference}</strong></span>}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: ATTACHMENTS */}
        {activeTab === 'attachments' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="bg-slate-50 border border-[#E2E8F0] rounded-2xl p-5 space-y-4 shadow-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Paperclip className="h-5 w-5 text-blue-400 mr-2" />
                  <h3 className="text-base font-bold text-slate-900">
                    Attachments ({log.attachments?.length || 0})
                  </h3>
                </div>
              </div>

              {log.attachments && log.attachments.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                  {log.attachments.map((att, idx) => (
                    <a
                      key={idx}
                      href={att.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group block border border-[#E2E8F0] bg-white hover:bg-slate-100 hover:border-blue-500/60 rounded-xl p-2.5 transition shadow-sm"
                    >
                      {att.type?.startsWith('image/') ? (
                        <div className="relative overflow-hidden rounded-lg">
                          <img src={att.url} alt={att.name} className="w-full h-32 object-cover rounded-lg group-hover:scale-105 transition-transform duration-200" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="text-xs font-bold text-slate-900 bg-blue-600/80 px-2.5 py-1 rounded-md flex items-center gap-1">
                              View Image <ExternalLink className="w-3 h-3" />
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-32 bg-[#F8FAFC] rounded-lg p-2 text-center">
                          <FileText className="h-8 w-8 text-blue-400 mb-2 group-hover:scale-110 transition-transform" />
                          <span className="text-xs font-semibold text-slate-900 truncate w-full px-2">{att.name}</span>
                          <span className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                            Open document <ExternalLink className="w-2.5 h-2.5" />
                          </span>
                        </div>
                      )}
                    </a>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 bg-white rounded-xl border border-dashed border-[#E2E8F0] text-slate-500 text-sm">
                  <Paperclip className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                  <p className="font-semibold text-slate-600">No attachments found</p>
                  <p className="text-xs text-slate-500 mt-1">There are no receipts, documents, or photos attached to this record.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Communication History Tab */}
        {activeTab === 'communication' && (
          <div className="space-y-4">
            <CommunicationHistoryTimeline
              recordId={log.orderNumber || log.id}
              sourceModule="Maintenance"
              matchKeys={[
                log.id,
                log.orderNumber,
                log.vehicleId,
                vehicle?.registration,
                log.serviceCenter,
                log.driverName,
                log.driverPhone,
              ].filter(Boolean)}
              title={`Maintenance #${log.orderNumber || log.id} — Communication History`}
              description="Chronological audit log of all WhatsApp and email communications sent for this maintenance order."
            />
          </div>
        )}

      </div>

      {/* Pinned Bottom Actions */}
      {onClose && (
        <div className="flex justify-end p-4 shrink-0 bg-[#F8FAFC] border-t border-[#E2E8F0]">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-[#CBD5E1] rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
};

export default MaintenanceDetails;