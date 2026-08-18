// src/components/rentals/RentalDetails.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { Rental, Vehicle, Customer } from '../../types';
import { 
  format, 
  isAfter, 
  differenceInDays, 
  differenceInHours,
  addDays, 
  isValid 
} from 'date-fns';
import StatusBadge from '../ui/StatusBadge';
import { 
  FileText, 
  Download, 
  Car, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  CheckCircle, 
  Image as ImageIcon, 
  ArrowRightLeft,
  Receipt,
  StickyNote,
  AlertTriangle,
  Plus,
  Clock
} from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { ensureValidDate } from '../../utils/dateHelpers';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';
import VehicleConditionDetails from './VehicleConditionDetails';
import { 
  calculateRentalCostDetailed, 
  calculateOverdueCost, 
  calculateTotalSubstitutionCharges,
  getCalendarWeeks,
  getWeeklyHybridUnits // 👈 ADD THIS NEW IMPORT
} from '../../utils/rentalCalculations';
import RentalPaymentHistory from './RentalPaymentHistory';

interface RentalDetailsProps {
  rental: Rental;
  vehicle: Vehicle | null;
  customer: Customer | null;
  onDownloadInvoice: () => void;
  onDownloadPermit: () => void;
}

const RentalDetails: React.FC<RentalDetailsProps> = ({
  rental,
  vehicle,
  customer,
  onDownloadInvoice,
  onDownloadPermit
}) => {
  const [createdByName, setCreatedByName] = useState<string | null>(null);
  const { formatCurrency } = useFormattedDisplay();

  const start = ensureValidDate(rental.startDate);
  const end = ensureValidDate(rental.endDate);

  // --- 1. DETAILED COSTS & TOTALS ---
  const detailedCosts = useMemo(() => {
    if (!vehicle) return { net: 0, vat: 0, gross: 0, discountAmount: 0, baseGross: 0, baseNet: 0, baseVat: 0 };
    const storageNet = rental.type === 'claim' ? (rental.storageDays || 0) * (rental.storageCostPerDay || 0) : 0;
    
    // Sum up manual extra charges
    const extraTotal = (rental.extraCharges || []).reduce((acc, c) => acc + (Number(c.amount) || 0), 0);
    
    return calculateRentalCostDetailed(
      start, end, rental.type, vehicle, rental.reason, rental.negotiatedRate ?? undefined,
      storageNet,
      rental.type === 'claim' ? (rental.recoveryCost || 0) : 0,
      rental.deliveryCharge || 0, rental.collectionCharge || 0,
      rental.type !== 'weekly' ? (rental.insurancePerDay || 0) : 0,
      rental.type === 'weekly' ? ((rental as any).insurancePerWeek || 0) : 0,
      rental.includeVAT || false, rental.deliveryChargeIncludeVAT || false, rental.collectionChargeIncludeVAT || false,
      rental.insurancePerDayIncludeVAT || false, (rental as any).insurancePerWeekIncludeVAT || false, rental.includeRecoveryCostVAT || false, rental.includeStorageVAT || false,
      rental.discountPercentage || 0, rental.discountAmount || 0, rental.status,
      rental.lockedDailyRate, rental.lockedWeeklyRate, rental.lockedClaimRate, extraTotal,
      rental.discounts || [] // 👈 ADD THIS
    );
  }, [rental, vehicle, start, end]);

  // Overdue / Ongoing
  const ongoingCharges = useMemo(() => {
    if (!vehicle) return 0;
    const now = new Date();
    if (rental.status === 'active' && isAfter(now, end)) return calculateOverdueCost(rental, now, vehicle);
    return 0;
  }, [rental, vehicle, end]);

  // Return Charges
  const subCharges = calculateTotalSubstitutionCharges(rental);
  const totalReturnCharges = (rental.returnCondition?.totalCharges ?? 0) + subCharges;

  const totalAmountDue = detailedCosts.gross + ongoingCharges + totalReturnCharges;
  const paid = rental.paidAmount || 0;
  const remaining = totalAmountDue - paid;

  // --- 2. ITEMIZED BREAKDOWN HELPER ---
  const pureBaseDetailed = useMemo(() => {
    if (!vehicle) return 0;
    return calculateRentalCostDetailed(
      start, end, rental.type, vehicle, rental.reason, rental.negotiatedRate ?? undefined,
      0, 0, 0, 0, 0, 0, false, false, false, false, false, false, false, 0, 0, rental.status,
      rental.lockedDailyRate, rental.lockedWeeklyRate, rental.lockedClaimRate, 0
    ).gross; // Gross = Net since VAT is false
  }, [start, end, rental, vehicle]);

  const insuranceDays = useMemo(() => {
    try {
      if (start && end && !isAfter(start, end)) {
        const hours = differenceInHours(end, start);
        return hours <= 0 ? 1 : Math.ceil(hours / 24);
      }
    } catch {}
    return 0;
  }, [start, end]);

  // ✅ NEW: Use strict calendar weeks for insurance line item display
  // ✅ NEW: Grabs the split hybrid units for the UI display table
  const hybridUnits = getWeeklyHybridUnits(start, end);
  const insuranceWeeks = getCalendarWeeks(start, end);

  // --- 3. TIMELINE CALCULATION ---
  const hasSubs = rental.hireSubstitutionDetails && rental.hireSubstitutionDetails.length > 0;
  
  const timelineSegments = useMemo(() => {
    if (!hasSubs) return [];
    const segments: Array<{ type: 'main' | 'sub'; label: string; start: Date; end: Date; registration?: string }> = [];
    const subs = (rental.hireSubstitutionDetails || []).slice().sort((a, b) => (ensureValidDate(a.givenAt)?.getTime() || 0) - (ensureValidDate(b.givenAt)?.getTime() || 0));

    let currentCursor = start;
    if (subs.length === 0) {
      segments.push({ type: 'main', label: 'Main', start: currentCursor, end: end });
    } else {
      for (let i = 0; i < subs.length; i++) {
        const sub = subs[i];
        const subGiven = ensureValidDate(sub.givenAt);
        if (!subGiven) continue;
        if (subGiven > currentCursor) segments.push({ type: 'main', label: 'Main Vehicle', start: currentCursor, end: subGiven });
        
        let subEnd = ensureValidDate(sub.returnCondition?.date || sub.expectedReturnAt) || addDays(subGiven, 1);
        if (subEnd <= subGiven) subEnd = addDays(subGiven, 1);
        
        segments.push({ type: 'sub', label: 'Substitute', start: subGiven, end: subEnd, registration: sub.registration });
        currentCursor = subEnd;
      }
      if (currentCursor < end) segments.push({ type: 'main', label: 'Main Vehicle', start: currentCursor, end: end });
    }
    return segments;
  }, [rental, start, end, hasSubs]);

  // User Fetch
  useEffect(() => {
    const fetchCreatedByName = async () => {
      if (rental.createdBy) {
        try {
          const userDoc = await getDoc(doc(db, 'users', rental.createdBy));
          setCreatedByName(userDoc.exists() ? userDoc.data().name : 'Unknown User');
        } catch { setCreatedByName('Unknown User'); }
      }
    };
    fetchCreatedByName();
  }, [rental.createdBy]);

  // Formatting Helpers
  const formatDateTime = (date: any): string => {
    if (!date) return 'N/A';
    try {
      const d = date?.toDate ? date.toDate() : new Date(date);
      return isNaN(d.getTime()) ? 'N/A' : format(d, 'dd/MM/yyyy HH:mm');
    } catch { return 'N/A'; }
  };
  const formatNoteDate = (date: any) => {
    try {
      const d = date?.toDate ? date.toDate() : new Date(date);
      return isValid(d) ? format(d, 'dd MMM yyyy HH:mm') : 'Unknown Date';
    } catch { return 'Unknown Date'; }
  };
  const formatAgreementKey = (key: string): string => {
    try {
      const timestamp = parseInt(key.split('_')[1] || '0', 10);
      return timestamp === 0 ? 'Hire Agreement' : `Hire Agreement (${format(new Date(timestamp), 'dd/MM/yy')})`;
    } catch { return 'Hire Agreement'; }
  };
  const formatLatestAgreementLabel = () => {
    try {
      return `Hire Agreement (${format(start, 'dd/MM/yyyy HH:mm')} → ${end ? format(end, 'dd/MM/yyyy HH:mm') : '—'})`;
    } catch { return 'Hire Agreement (Latest)'; }
  };

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="border-t pt-6 mt-6 first:border-t-0 first:pt-0 first:mt-0">
      <h3 className="text-lg font-medium text-gray-900 mb-4">{title}</h3>
      {children}
    </div>
  );

  const agreementKeys = rental.documents?.agreements ? Object.keys(rental.documents.agreements).sort((a, b) => parseInt(a.split('_')[1] || '0', 10) - parseInt(b.split('_')[1] || '0', 10)) : [];
  const latestAgreementKey = agreementKeys.length > 0 ? agreementKeys[agreementKeys.length - 1] : null;

  const displayReason = (() => {
    let reason = rental.reason;
    if (reason === 'h-substitute') {
      const subs = rental.hireSubstitutionDetails || [];
      if (subs.length > 0 && !subs.some(s => !s.returnCondition)) reason = 'hired';
    }
    return reason;
  })();

  return (
    <div className="space-y-6 bg-gray-50/50 p-2 rounded-xl">
      
      {/* --- HEADER CARDS --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Vehicle Card */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-start gap-4 hover:shadow-md transition">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Car className="w-6 h-6" /></div>
          <div className="w-full">
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Assigned Vehicle</p>
            {vehicle ? (
              <>
                <h4 className="text-lg font-black text-gray-900">{vehicle.make} {vehicle.model}</h4>
                <div className="flex justify-between items-center mt-1">
                   <span className="px-2.5 py-1 bg-gray-100 text-gray-800 text-xs font-mono font-bold rounded-md border border-gray-200">{vehicle.registrationNumber}</span>
                   <span className="text-xs text-gray-500 font-medium">Mileage: {vehicle.mileage.toLocaleString()}</span>
                </div>
              </>
            ) : <p className="text-red-500 text-sm">Vehicle Not Found</p>}
          </div>
        </div>
        
        {/* Customer Card */}
        {/* Customer Card */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-start gap-4 hover:shadow-md transition">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl"><User className="w-6 h-6" /></div>
          <div className="w-full">
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Customer Profile</p>
            {customer ? (
              <>
                <h4 className="text-lg font-black text-gray-900 truncate">{customer.name}</h4>
                <div className="flex flex-col text-sm text-gray-600 mt-2 gap-1.5">
                   <span className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-gray-400"/> {customer.mobile}</span>
                   <span className="flex items-center gap-2 truncate"><Mail className="w-3.5 h-3.5 text-gray-400"/> {customer.email}</span>
                   {customer.address && (
                     <span className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-gray-400"/> {customer.address}</span>
                   )}
                   {customer.badgeNumber && (
                     <span className="flex items-center gap-2"><FileText className="w-3.5 h-3.5 text-gray-400"/> Badge: {customer.badgeNumber}</span>
                   )}
                </div>
              </>
            ) : <p className="text-red-500 text-sm">Customer Not Found</p>}
          </div>
        </div>
      </div>

      {/* --- FINANCIAL DASHBOARD --- */}
      {/* --- FINANCIAL DASHBOARD --- */}
      <div className="bg-gray-900 rounded-2xl p-6 shadow-xl text-white">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-white/90">
          <Receipt className="w-5 h-5 text-green-400" /> Financial Overview
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
           <div className="space-y-1">
             <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Total Net</p>
             <p className="text-2xl font-mono">{formatCurrency(detailedCosts.net)}</p>
           </div>
           <div className="space-y-1">
             <p className="text-gray-400 text-xs font-bold uppercase tracking-wider text-yellow-400">Discount</p>
             <p className="text-2xl font-mono text-yellow-400">-{formatCurrency(detailedCosts.discountAmount)}</p>
           </div>
           <div className="space-y-1">
             <p className="text-gray-400 text-xs font-bold uppercase tracking-wider text-blue-300">Total VAT</p>
             <p className="text-2xl font-mono text-blue-300">{formatCurrency(detailedCosts.vat)}</p>
           </div>
           <div className="space-y-1 bg-white/10 p-3 rounded-xl border border-white/20 flex flex-col justify-center">
             <div className="flex justify-between items-center mb-1">
               <p className="text-gray-300 text-xs font-bold uppercase">Paid:</p>
               <p className="text-sm font-mono text-green-400 font-bold">{formatCurrency(paid)}</p>
             </div>
             <div className="flex justify-between items-center border-t border-white/10 pt-1">
               <p className="text-white text-xs font-bold uppercase">Owing:</p>
               <p className={`text-xl font-black font-mono ${remaining <= 0.001 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatCurrency(remaining)}
               </p>
             </div>
           </div>
        </div>
      </div>

      {/* --- DOCUMENTS ACTION BAR --- */}
      <div className="flex flex-wrap gap-2 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
        {latestAgreementKey && (
          <button
            onClick={() => window.open(rental.documents!.agreements![latestAgreementKey], '_blank')}
            className="inline-flex items-center px-3 py-2 border border-blue-300 shadow-sm text-sm font-bold rounded-md text-blue-800 bg-white hover:bg-blue-50"
          >
            <FileText className="h-4 w-4 mr-2 text-blue-600" /> {formatLatestAgreementLabel()} (Main)
          </button>
        )}

        {agreementKeys.filter((k) => k !== latestAgreementKey).map((key) => (
          <button
            key={key}
            onClick={() => window.open(rental.documents!.agreements![key], '_blank')}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <FileText className="h-4 w-4 mr-2 text-gray-400" /> {formatAgreementKey(key)}
          </button>
        ))}

        <button
          onClick={() => rental.documents?.invoice ? window.open(rental.documents.invoice, '_blank') : onDownloadInvoice()}
          className={`inline-flex items-center px-3 py-2 border shadow-sm text-sm font-bold rounded-md ${
            rental.documents?.invoice ? 'border-gray-300 text-gray-800 bg-white hover:bg-gray-50' : 'border-transparent text-white bg-green-600 hover:bg-green-700'
          }`}
        >
          {rental.documents?.invoice ? <Receipt className="h-4 w-4 mr-2 text-green-600" /> : <Download className="h-4 w-4 mr-2" />}
          {rental.documents?.invoice ? 'View Invoice' : 'Generate Invoice'}
        </button>

        <button
          onClick={() => rental.documents?.permit ? window.open(rental.documents.permit, '_blank') : onDownloadPermit()}
          className={`inline-flex items-center px-3 py-2 border shadow-sm text-sm font-bold rounded-md ${
             rental.documents?.permit ? 'border-gray-300 text-gray-800 bg-white hover:bg-gray-50' : 'border-transparent text-white bg-purple-600 hover:bg-purple-700'
          }`}
        >
          {rental.documents?.permit ? <MapPin className="h-4 w-4 mr-2 text-purple-600" /> : <Download className="h-4 w-4 mr-2" />}
          {rental.documents?.permit ? 'View Permit' : 'Generate Permit'}
        </button>

        {/* Claim Documents */}
        {rental.type === 'claim' && (
          <div className="flex flex-wrap gap-2 w-full mt-2 pt-2 border-t border-blue-200/50">
            {['conditionOfHire', 'noticeOfRightToCancel', 'hireAgreement', 'creditStorageAndRecovery', 'creditHireMitigation', 'satisfactionNotice'].map(docKey => {
              if (!rental.documents?.[docKey]) return null;
              return (
                <button
                  key={docKey} onClick={() => window.open((rental.documents as any)[docKey], '_blank')}
                  className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  <FileText className="h-3 w-3 mr-1.5" />
                  {docKey.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* --- RENTAL CONFIG & TIMELINE (FULL WIDTH) --- */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mt-6">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center mb-6 gap-4">
           <div>
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                 <Calendar className="w-5 h-5 text-gray-500" /> Details & Timeline
              </h3>
              {rental.rentalAgreementNumber && (
                <div className="mt-2 text-sm text-gray-600 font-medium">
                  Agreement #: <span className="font-bold text-blue-900 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-100">{rental.rentalAgreementNumber}</span>
                </div>
              )}
           </div>
           
           <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={rental.type} />
              <StatusBadge status={displayReason as any} />
              <StatusBadge status={rental.status} />
              <StatusBadge status={rental.paymentStatus} />
           </div>
        </div>

        {rental.originalStartDate && (
           <div className="mb-5 inline-flex items-center gap-2 text-sm bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
              <span className="text-gray-500 font-bold uppercase text-xs">Original Start:</span>
              <span className="font-medium text-gray-900">{formatDateTime(rental.originalStartDate)}</span>
           </div>
        )}

        <div className="bg-gray-50/50 rounded-xl p-4 border border-gray-100">
          {hasSubs ? (
            <div className="flex flex-col lg:flex-row gap-3 overflow-x-auto pb-2">
               {timelineSegments.map((seg, idx) => (
                 <div key={idx} className={`flex-1 min-w-[240px] flex flex-col p-4 rounded-xl border shadow-sm transition-all ${seg.type === 'main' ? 'bg-white border-gray-200' : 'bg-yellow-50/80 border-yellow-200'}`}>
                   <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
                     <div className={`flex items-center gap-1.5 font-bold uppercase tracking-wider text-xs ${seg.type === 'main' ? 'text-gray-700' : 'text-yellow-800'}`}>
                       {seg.type === 'main' ? <Car className="w-4 h-4 text-gray-400" /> : <ArrowRightLeft className="w-4 h-4 text-yellow-600" />}
                       {seg.label}
                     </div>
                     {seg.registration && <span className="font-mono bg-white px-2 py-1 rounded text-xs font-bold text-gray-900 border shadow-sm">{seg.registration}</span>}
                   </div>
                   <div className="flex flex-col text-xs font-medium text-gray-600 space-y-2">
                      <div className="flex justify-between items-center"><span className="text-gray-400 flex items-center gap-1"><Clock className="w-3 h-3"/> Start:</span> <span className="text-gray-900">{formatDateTime(seg.start)}</span></div>
                      <div className="flex justify-between items-center"><span className="text-gray-400 flex items-center gap-1"><CheckCircle className="w-3 h-3"/> End:</span> <span className="text-gray-900">{formatDateTime(seg.end)}</span></div>
                   </div>
                 </div>
               ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                   <div className="flex items-center gap-2"><Car className="w-5 h-5 text-gray-400"/><span className="text-sm font-bold text-gray-500 uppercase tracking-wide">Outbound</span></div>
                   <span className="font-bold text-gray-900">{formatDateTime(start)}</span>
               </div>
               <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                   <div className="flex items-center gap-2"><Calendar className="w-5 h-5 text-gray-400"/><span className="text-sm font-bold text-gray-500 uppercase tracking-wide">Expected Return</span></div>
                   <span className="font-bold text-gray-900">{formatDateTime(end)}</span>
               </div>
            </div>
          )}
        </div>
      </div>

      {/* --- CLAIMS & NOTES --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
         {/* Claims / Storage container */}
         {(rental.claimRef || (rental.type === 'claim' && rental.storageStartDate)) && (
           <div className="space-y-4 col-span-1">
              {rental.claimRef && (
                <div className="flex items-center bg-white border border-gray-200 p-4 rounded-xl shadow-sm">
                  <FileText className="h-6 w-6 text-gray-400 mr-3" />
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Claim Reference</p>
                    <p className="text-lg font-bold text-gray-900">{rental.claimRef}</p>
                  </div>
                </div>
              )}

              {rental.type === 'claim' && rental.storageStartDate && rental.storageEndDate && (
                <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm">
                   <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400"/> Storage Details
                   </h4>
                   <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                         <span className="block text-xs text-gray-500 uppercase font-bold mb-1">Start</span>
                         <span className="font-medium text-gray-900">{formatDateTime(rental.storageStartDate)}</span>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                         <span className="block text-xs text-gray-500 uppercase font-bold mb-1">End</span>
                         <span className="font-medium text-gray-900">{formatDateTime(rental.storageEndDate)}</span>
                      </div>
                   </div>
                </div>
              )}
           </div>
         )}
         
         {/* Notes container spans full width if no claims, otherwise half */}
         {rental.notes && rental.notes.length > 0 && (
           <div className={`space-y-4 ${(rental.claimRef || (rental.type === 'claim' && rental.storageStartDate)) ? 'col-span-1' : 'col-span-1 lg:col-span-2'}`}>
              <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4 shadow-sm relative overflow-hidden h-full flex flex-col">
                <div className="absolute top-0 right-0 p-2 opacity-10"><StickyNote className="w-12 h-12" /></div>
                <h3 className="flex items-center gap-2 text-yellow-800 font-bold text-sm mb-3 border-b border-yellow-200 pb-2">
                  <StickyNote className="w-4 h-4" /> RENTAL NOTES ({rental.notes.length})
                </h3>
                <div className="space-y-3 max-h-60 overflow-y-auto pr-1 flex-1">
                  {rental.notes.slice().reverse().map((note) => (
                    <div key={note.id} className="bg-white/70 p-3 rounded-lg border border-yellow-100 text-sm shadow-sm">
                      <div className="flex items-center gap-2 text-xs text-yellow-800 font-bold uppercase mb-1.5">
                        <span>{formatNoteDate(note.createdAt)}</span><span className="opacity-50">•</span><span>{note.createdByName || 'Staff'}</span>
                      </div>
                      <p className="text-gray-900 font-medium whitespace-pre-wrap leading-relaxed italic">"{note.text}"</p>
                    </div>
                  ))}
                </div>
              </div>
           </div>
         )}
      </div>

      {/* --- SUBSTITUTION DETAILS --- */}
      {hasSubs && (
        <Section title="Substitution History">
          {rental.hireSubstitutionDetails!.map((sub, index) => (
            <div key={index} className="grid grid-cols-1 md:grid-cols-2 gap-4 border border-gray-200 rounded-xl p-4 mb-4 bg-gray-50/50">
              <div className="col-span-1 md:col-span-2 flex items-center justify-between border-b pb-2 mb-2">
                 <h4 className="font-bold text-gray-800 flex items-center gap-2"><ArrowRightLeft className="w-4 h-4 text-gray-400"/> Substitution #{index + 1}</h4>
                 <span className="font-mono bg-white px-2 py-1 border rounded text-sm font-bold shadow-sm">{sub.registration}</span>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between border-b border-gray-100 pb-1"><span className="text-gray-500">Vehicle</span><span className="font-medium">{sub.make} {sub.model}</span></div>
                <div className="flex justify-between border-b border-gray-100 pb-1"><span className="text-gray-500">Provider</span><span className="font-medium">{sub.loaner || 'Internal Fleet'}</span></div>
                <div className="flex justify-between border-b border-gray-100 pb-1"><span className="text-gray-500">Given At</span><span className="font-medium">{formatDateTime(sub.givenAt)}</span></div>
                <div className="flex justify-between border-b border-gray-100 pb-1"><span className="text-gray-500">Expected/Returned</span><span className="font-medium">{formatDateTime(sub.returnCondition?.date || sub.expectedReturnAt)}</span></div>
                {sub.notes && <div className="mt-2 text-gray-600 italic bg-white p-2 rounded border">"{sub.notes}"</div>}
              </div>

              {/* Substitute Check-Out Summary */}
              <div className="bg-white border border-gray-200 rounded-lg p-3">
                 <div className="flex items-center gap-2 mb-2 pb-1 border-b text-gray-700 font-bold text-sm">
                    <CheckCircle className="w-4 h-4"/> Check-Out Condition
                 </div>
                 <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    <div><span className="text-gray-500 block">Mileage Out</span><span className="font-mono font-medium">{(sub.mileage || 0).toLocaleString()}</span></div>
                    <div><span className="text-gray-500 block">Fuel Level</span><span className="font-medium">{sub.fuelLevel || '100'}%</span></div>
                    <div><span className="text-gray-500 block">Clean</span><span className={sub.isClean ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>{sub.isClean ? 'Yes' : 'No'}</span></div>
                    <div><span className="text-gray-500 block">Damage</span><span className={sub.hasDamage ? 'text-red-600 font-bold' : 'text-green-600 font-bold'}>{sub.hasDamage ? 'Yes' : 'None'}</span></div>
                 </div>
                 {sub.hasDamage && sub.damageDescription && (
                    <div className="mt-2 bg-red-50 p-1.5 rounded text-xs text-red-800 border border-red-100">{sub.damageDescription}</div>
                 )}
                 {/* Sub Check-Out Images Grid */}
                 {sub.images && sub.images.length > 0 && (
                   <div className="mt-3 border-t pt-2">
                     <span className="text-xs text-gray-500 uppercase font-bold block mb-2">Check-Out Evidence</span>
                     <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                       {sub.images.map((url, i) => (
                         <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block relative aspect-square group">
                           <img src={url} alt={`Check-out ${i+1}`} className="w-full h-full object-cover rounded border border-gray-200 group-hover:border-blue-400" />
                         </a>
                       ))}
                     </div>
                   </div>
                 )}
              </div>

              {/* Substitute Return Condition Summary */}
              {sub.returnCondition ? (
                 <div className="col-span-1 md:col-span-2 bg-white border border-green-200 rounded-lg p-3 mt-2">
                    <div className="flex items-center justify-between gap-2 mb-2 pb-1 border-b text-green-700 font-bold text-sm">
                       <span className="flex items-center gap-2"><CheckCircle className="w-4 h-4"/> Return Info (Check-In)</span>
                       {sub.returnCondition.totalCharges > 0 && <span className="bg-red-50 text-red-700 px-2 py-0.5 rounded text-xs border border-red-200">Return Charges: {formatCurrency(sub.returnCondition.totalCharges)}</span>}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                       <div><span className="text-xs text-gray-500 uppercase block">Mileage In</span><span className="font-mono font-medium">{sub.returnCondition.mileage}</span></div>
                       <div><span className="text-xs text-gray-500 uppercase block">Fuel In</span><span className="font-medium">{sub.returnCondition.fuelLevel}%</span></div>
                       <div>
                         <span className="text-xs text-gray-500 uppercase block">Clean</span>
                         <span className={sub.returnCondition.isClean ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>{sub.returnCondition.isClean ? 'Yes' : 'No'}</span>
                         {!sub.returnCondition.isClean && sub.returnCondition.cleaningCharge > 0 && <span className="block text-xs text-red-600 font-bold">{formatCurrency(sub.returnCondition.cleaningCharge)}</span>}
                       </div>
                       <div>
                         <span className="text-xs text-gray-500 uppercase block">Damage</span>
                         <span className={sub.returnCondition.hasDamage ? 'text-red-600 font-bold' : 'text-green-600 font-bold'}>{sub.returnCondition.hasDamage ? 'Yes' : 'None'}</span>
                         {sub.returnCondition.hasDamage && sub.returnCondition.damageCost > 0 && <span className="block text-xs text-red-600 font-bold">{formatCurrency(sub.returnCondition.damageCost)}</span>}
                       </div>
                    </div>
                    {sub.returnCondition.fuelCharge > 0 && <div className="mt-2 text-xs text-red-600 font-bold">Fuel Charge: {formatCurrency(sub.returnCondition.fuelCharge)}</div>}
                    {sub.returnCondition.hasDamage && sub.returnCondition.damageDescription && <div className="mt-2 bg-red-50 p-2 rounded text-sm text-red-800 border border-red-100">{sub.returnCondition.damageDescription}</div>}
                    
                    {/* Sub Return Images Grid */}
                    {sub.returnCondition.images && sub.returnCondition.images.length > 0 && (
                      <div className="mt-3 border-t pt-2">
                        <span className="text-xs text-gray-500 uppercase font-bold block mb-2">Check-In Evidence</span>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                          {sub.returnCondition.images.map((url, i) => (
                            <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block relative aspect-square group">
                              <img src={url} alt={`Return ${i+1}`} className="w-full h-full object-cover rounded border border-gray-200 group-hover:border-blue-400" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                 </div>
              ) : (
                 <div className="col-span-1 md:col-span-2 bg-orange-50 border border-orange-200 rounded-lg p-3 flex items-center justify-center text-orange-700 font-bold text-sm mt-2">
                    Currently Active / Not Returned
                 </div>
              )}
            </div>
          ))}
        </Section>
      )}

      {/* --- MAIN CONDITIONS --- */}
      {/* --- MAIN CONDITIONS --- */}
      <div className="flex flex-col gap-6 border-t pt-8 mt-8">
          {rental.checkOutCondition && (
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 mb-6 border-b border-gray-100 pb-3">
                <CheckCircle className="w-5 h-5 text-gray-400" />
                <h3 className="text-xl font-bold text-gray-900">Check-Out Condition</h3>
              </div>
              
              <VehicleConditionDetails condition={rental.checkOutCondition} type="check-out" />
              
              {/* Main Check-Out Images Grid */}
              {rental.checkOutCondition.images && rental.checkOutCondition.images.length > 0 && (
                <div className="mt-6 border-t border-gray-100 pt-4">
                  <span className="text-xs text-gray-500 uppercase font-bold block mb-4 tracking-wider">
                    Check-Out Evidence Photos
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
                    {rental.checkOutCondition.images.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block relative aspect-square group">
                        <img 
                          src={url} 
                          alt={`Check-out ${i+1}`} 
                          className="w-full h-full object-cover rounded-xl border border-gray-200 group-hover:border-blue-400 shadow-sm transition-all duration-200 group-hover:scale-105 group-hover:shadow-lg" 
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {rental.returnCondition && (
            <div className="bg-white border border-green-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
              {/* Subtle green background hint for return condition */}
              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                 <CheckCircle className="w-32 h-32 text-green-900" />
              </div>

              <div className="flex items-center gap-2 mb-6 border-b border-green-100 pb-3 relative z-10">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <h3 className="text-xl font-bold text-gray-900">Return Condition</h3>
              </div>
              
              <div className="relative z-10">
                <VehicleConditionDetails condition={rental.returnCondition} type="return" />
              </div>

              {/* Main Return Images Grid */}
              {rental.returnCondition.images && rental.returnCondition.images.length > 0 && (
                <div className="mt-6 border-t border-green-50 pt-4 relative z-10">
                  <span className="text-xs text-green-700 uppercase font-bold block mb-4 tracking-wider">
                    Return Evidence Photos
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
                    {rental.returnCondition.images.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block relative aspect-square group">
                        <img 
                          src={url} 
                          alt={`Return ${i+1}`} 
                          className="w-full h-full object-cover rounded-xl border border-green-200 group-hover:border-green-500 shadow-sm transition-all duration-200 group-hover:scale-105 group-hover:shadow-lg" 
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
      </div>

      {/* --- ITEMIZED COST SUMMARY TABLE --- */}
      <Section title="Detailed Itemized Cost Summary">
        <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
           <table className="w-full text-sm text-left">
              <tbody className="divide-y divide-gray-100">
                 {/* Raw Base */}
                 {/* Raw Base */}
                 <tr className="bg-gray-50"><td className="px-4 py-3 font-medium text-gray-700">Base Rental Cost</td><td className="px-4 py-3 font-mono text-right">{formatCurrency(pureBaseDetailed)}</td></tr>
                 
                 {/* Hire VAT */}
                 {detailedCosts.vat > 0 && (
                   <tr className="bg-blue-50/30">
                     <td className="px-4 py-2 text-blue-700">Calculated VAT</td>
                     <td className="px-4 py-2 font-mono text-right text-blue-700">{formatCurrency(detailedCosts.vat)}</td>
                   </tr>
                 )}
                 
                 {/* Claim Extras */}
                 {rental.type === 'claim' && (rental.storageDays || 0) > 0 && <tr><td className="px-4 py-2 text-gray-600">Storage ({rental.storageDays} days) {rental.includeStorageVAT ? 'Inc VAT' : ''}</td><td className="px-4 py-2 font-mono text-right">{formatCurrency((rental.storageDays || 0) * (rental.storageCostPerDay || 0) * (rental.includeStorageVAT ? 1.2 : 1))}</td></tr>}
                 {rental.type === 'claim' && (rental.recoveryCost || 0) > 0 && <tr><td className="px-4 py-2 text-gray-600">Recovery {rental.includeRecoveryCostVAT ? 'Inc VAT' : ''}</td><td className="px-4 py-2 font-mono text-right">{formatCurrency((rental.recoveryCost || 0) * (rental.includeRecoveryCostVAT ? 1.2 : 1))}</td></tr>}
                 {(rental.deliveryCharge || 0) > 0 && <tr><td className="px-4 py-2 text-gray-600">Delivery {rental.deliveryChargeIncludeVAT ? 'Inc VAT' : ''}</td><td className="px-4 py-2 font-mono text-right">{formatCurrency((rental.deliveryCharge || 0) * (rental.deliveryChargeIncludeVAT ? 1.2 : 1))}</td></tr>}
                 {(rental.collectionCharge || 0) > 0 && <tr><td className="px-4 py-2 text-gray-600">Collection {rental.collectionChargeIncludeVAT ? 'Inc VAT' : ''}</td><td className="px-4 py-2 font-mono text-right">{formatCurrency((rental.collectionCharge || 0) * (rental.collectionChargeIncludeVAT ? 1.2 : 1))}</td></tr>}
                 
                 {/* Insurance */}
                 {rental.type !== 'weekly' && (rental.insurancePerDay || 0) > 0 && <tr><td className="px-4 py-2 text-gray-600">Daily Insurance ({insuranceDays} days) {rental.insurancePerDayIncludeVAT ? 'Inc VAT' : ''}</td><td className="px-4 py-2 font-mono text-right">{formatCurrency((rental.insurancePerDay || 0) * insuranceDays * (rental.insurancePerDayIncludeVAT ? 1.2 : 1))}</td></tr>}
                 {rental.type !== 'weekly' && (rental.insurancePerDay || 0) > 0 && <tr><td className="px-4 py-2 text-gray-600">Daily Insurance ({insuranceDays} days) {rental.insurancePerDayIncludeVAT ? 'Inc VAT' : ''}</td><td className="px-4 py-2 font-mono text-right">{formatCurrency((rental.insurancePerDay || 0) * insuranceDays * (rental.insurancePerDayIncludeVAT ? 1.2 : 1))}</td></tr>}
                 
                 {rental.type === 'weekly' && (
                   <>
                     {hybridUnits.dailyDays > 0 && (rental.insurancePerDay || 0) > 0 && (
                       <tr>
                         <td className="px-4 py-2 text-gray-600">Partial Week Insurance ({hybridUnits.dailyDays} days) {rental.insurancePerDayIncludeVAT ? 'Inc VAT' : ''}</td>
                         <td className="px-4 py-2 font-mono text-right">{formatCurrency((rental.insurancePerDay || 0) * hybridUnits.dailyDays * (rental.insurancePerDayIncludeVAT ? 1.2 : 1))}</td>
                       </tr>
                     )}
                     {hybridUnits.weeklyWeeks > 0 && ((rental as any).insurancePerWeek || 0) > 0 && (
                       <tr>
                         <td className="px-4 py-2 text-gray-600">Weekly Insurance ({hybridUnits.weeklyWeeks} weeks) {(rental as any).insurancePerWeekIncludeVAT ? 'Inc VAT' : ''}</td>
                         <td className="px-4 py-2 font-mono text-right">{formatCurrency(((rental as any).insurancePerWeek || 0) * hybridUnits.weeklyWeeks * ((rental as any).insurancePerWeekIncludeVAT ? 1.2 : 1))}</td>
                       </tr>
                     )}
                   </>
                 )}
                 
                 {/* Extra Charges */}
                 {rental.extraCharges && rental.extraCharges.length > 0 && rental.extraCharges.map(charge => (
                   <tr key={charge.id}>
                      <td className="px-4 py-2 text-gray-600 flex items-center gap-1.5"><Plus className="w-3 h-3 text-gray-400"/> {charge.name}</td>
                      <td className="px-4 py-2 font-mono text-right">{formatCurrency(charge.amount)}</td>
                   </tr>
                 ))}

                 {/* Discount History */}
                 {rental.discounts && rental.discounts.length > 0 ? (
                    rental.discounts.map(d => (
                       <tr key={d.id} className="bg-green-50">
                         <td className="px-4 py-3">
                            <span className="font-bold text-green-800 flex items-center gap-2">
                               Discount Applied {d.percentage > 0 && <span className="bg-white/50 px-1 rounded text-xs">({d.percentage}%)</span>}
                            </span>
                            <span className="block text-green-700 italic mt-0.5 text-xs">"{d.reason}"</span>
                            <span className="block text-green-600/70 text-xs uppercase font-bold mt-1">{formatDateTime(d.createdAt)}</span>
                         </td>
                         <td className="px-4 py-3 font-mono text-right text-green-700 font-bold align-top">-{formatCurrency(d.amount)}</td>
                       </tr>
                    ))
                 ) : (
                    // Legacy Fallback
                    detailedCosts.discountAmount > 0 && (
                      <tr className="bg-green-50">
                         <td className="px-4 py-3 font-medium text-green-700">
                           Discount Applied {rental.discountPercentage ? `(${rental.discountPercentage}%)` : ''}
                           {rental.discountNotes && <span className="block italic text-xs mt-1">"{rental.discountNotes}"</span>}
                         </td>
                         <td className="px-4 py-3 font-mono text-right text-green-700 font-bold">-{formatCurrency(detailedCosts.discountAmount)}</td>
                      </tr>
                    )
                 )}
                 
                 {/* Penalties & Overdue */}
                 {ongoingCharges > 0 && <tr className="bg-red-50"><td className="px-4 py-2 text-red-700 font-bold flex items-center gap-2"><AlertTriangle className="w-3 h-3"/> Ongoing (Overdue) Charges</td><td className="px-4 py-2 font-mono text-right text-red-700">{formatCurrency(ongoingCharges)}</td></tr>}
                 {totalReturnCharges > 0 && <tr className="bg-orange-50"><td className="px-4 py-2 text-orange-700 font-bold">Return Charges (Damage/Fuel)</td><td className="px-4 py-2 font-mono text-right text-orange-700">{formatCurrency(totalReturnCharges)}</td></tr>}
                 
                 {/* Final Totals */}
                 <tr className="bg-gray-900 text-white"><td className="px-4 py-3 font-bold text-lg uppercase tracking-wide">Total Amount Due</td><td className="px-4 py-3 font-mono text-right text-xl font-black">{formatCurrency(totalAmountDue)}</td></tr>
                 <tr className="bg-gray-100 text-gray-700"><td className="px-4 py-2 font-bold uppercase text-xs">Amount Paid</td><td className="px-4 py-2 font-mono text-right text-green-600 font-bold">{formatCurrency(paid)}</td></tr>
                 <tr className="bg-white text-gray-900"><td className="px-4 py-3 font-bold uppercase text-sm">Remaining Balance</td><td className={`px-4 py-3 font-mono text-right text-lg font-black ${remaining <= 0.001 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(remaining)}</td></tr>
              </tbody>
           </table>
        </div>
        {rental.discountNotes && detailedCosts.discountAmount > 0 && (
            <p className="mt-2 text-sm italic text-gray-600 bg-gray-50 p-2 rounded">Discount Note: {rental.discountNotes}</p>
        )}
      </Section>

      {/* --- PAYMENTS & SIGNATURES --- */}
      {rental.payments && rental.payments.length > 0 && (
        <div className="border-t pt-4">
          <RentalPaymentHistory payments={rental.payments} onDownloadDocument={(url) => window.open(url, '_blank')} />
        </div>
      )}

      {rental.signature && (
        <div className="border-t pt-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Customer Signature</h3>
          <div className="bg-gray-50 p-4 rounded-lg w-full max-w-sm">
            <img src={rental.signature} alt="Customer Signature" className="max-h-24 object-contain bg-white rounded border" />
          </div>
        </div>
      )}

      {/* Footer Info */}
      <div className="text-xs text-gray-400 flex justify-between border-t pt-4 mt-6 font-mono">
        <div>Created by: {createdByName || rental.createdBy || 'Unknown'}</div>
        <div>Last Updated: {formatDateTime(rental.updatedAt)}</div>
      </div>
    </div>
  );
};

export default RentalDetails;