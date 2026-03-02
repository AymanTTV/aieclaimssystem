// src/components/rentals/RentalDetails.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { Rental, Vehicle, Customer } from '../../types';
import { 
  format, 
  isAfter, 
  differenceInDays, 
  differenceInHours, // ✅ Ensure this is imported
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
  StickyNote
} from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { ensureValidDate } from '../../utils/dateHelpers';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';
import VehicleConditionDetails from './VehicleConditionDetails';
import { calculateRentalCost, calculateOverdueCost } from '../../utils/rentalCalculations';
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

  // parse start/end into real Date objects:
  const start = ensureValidDate(rental.startDate);
  const end = ensureValidDate(rental.endDate);

  // 1) Base cost (no extras, no VAT):
  const baseCost = vehicle
    ? calculateRentalCost(
        start,
        end,
        rental.type,
        vehicle,
        rental.reason,
        rental.negotiatedRate ?? undefined,
        0, 0, 0, 0, 0,
        false, false, false, false, false, false
      )
    : 0;

  // ✅ UPDATED: Insurance days calculation (hours based)
  const insuranceDays = useMemo(() => {
    try {
      const s = ensureValidDate(rental.startDate);
      const e = ensureValidDate(rental.endDate);
      if (s && e && !isAfter(s, e)) {
        const hours = differenceInHours(e, s);
        // If 0 hours, charge 1 day. Otherwise ceil(hours/24).
        return hours <= 0 ? 1 : Math.ceil(hours / 24);
      }
    } catch {}
    return 0;
  }, [rental.startDate, rental.endDate]);

  // weekly insurance support (optional field)
  const insuranceWeeks = useMemo(() => {
    if (!insuranceDays) return 0;
    return Math.ceil(insuranceDays / 7);
  }, [insuranceDays]);

  // Overdue/ongoing charges (VAT-inclusive from util)
  const ongoingCharges = useMemo(() => {
    if (!vehicle) return 0;
    const now = new Date();
    if (rental.status === 'active' && isAfter(now, ensureValidDate(rental.endDate))) {
      return calculateOverdueCost(rental, now, vehicle);
    }
    return 0;
  }, [rental, vehicle]);

  // Calculate Total Return Charges (Main + Subs)
  const subCharges = (rental.hireSubstitutionDetails || []).reduce((acc, sub) => acc + (sub.returnCondition?.totalCharges || 0), 0);
  const totalReturnCharges = (rental.returnCondition?.totalCharges ?? 0) + subCharges;

  // --- EXTRAS FIX: Remove Double VAT ---
  // Storage is stored as GROSS (Inc VAT)
  const displayStorageCost = rental.storageCost || 0;

  // ✅ FIX: Use stored values directly (they are already Inc VAT)
  const displayDeliveryCharge = rental.deliveryCharge || 0; 
  const displayCollectionFee = rental.collectionCharge || 0;

  // Recovery is stored as NET (Ex VAT), so we multiply if flag is set
  const displayRecoveryCost =
    (rental.recoveryCost || 0) * (rental.includeRecoveryCostVAT ? 1.2 : 1);

  // Insurance is stored as NET (Ex VAT) rate
  const insurancePerDay = rental.insurancePerDay || 0;
  const insurancePerDayIncludeVAT = rental.insurancePerDayIncludeVAT || false;
  const insurancePerWeek = (rental as any).insurancePerWeek || 0;
  const insurancePerWeekIncludeVAT = (rental as any).insurancePerWeekIncludeVAT || false;

  const displayInsuranceDailyCost =
    insuranceDays * insurancePerDay * (insurancePerDayIncludeVAT ? 1.2 : 1);

  const displayInsuranceWeeklyCost =
    insuranceWeeks * insurancePerWeek * (insurancePerWeekIncludeVAT ? 1.2 : 1);

  const displayInsuranceCost = displayInsuranceDailyCost + displayInsuranceWeeklyCost;

  // VAT separation
  const hireVatAmount = rental.includeVAT ? baseCost * 0.2 : 0;
  const baseCostWithVAT = baseCost + hireVatAmount;

  const totalExtras =
    displayStorageCost +
    displayRecoveryCost +
    displayDeliveryCharge +
    displayCollectionFee +
    displayInsuranceCost;

  const totalWithAllVAT = baseCostWithVAT + totalExtras;
  const discountedRentalTotal = totalWithAllVAT - (rental.discountAmount ?? 0);
  const totalAmountDue = discountedRentalTotal + ongoingCharges + totalReturnCharges;

  const paid = rental.paidAmount || 0;
  const remaining = totalAmountDue - paid;

  // --- TIMELINE CALCULATION ---
  const hasSubs = rental.hireSubstitutionDetails && rental.hireSubstitutionDetails.length > 0;
  
  const timelineSegments = useMemo(() => {
    if (!hasSubs) return [];
    
    const segments: Array<{ type: 'main' | 'sub'; label: string; start: Date; end: Date; registration?: string }> = [];
    
    const subs = (rental.hireSubstitutionDetails || []).slice().sort((a, b) => {
       const dA = ensureValidDate(a.givenAt)?.getTime() || 0;
       const dB = ensureValidDate(b.givenAt)?.getTime() || 0;
       return dA - dB;
    });

    let currentCursor = start;

    if (subs.length === 0) {
      segments.push({ type: 'main', label: 'Main', start: currentCursor, end: end });
    } else {
      for (let i = 0; i < subs.length; i++) {
        const sub = subs[i];
        const subGiven = ensureValidDate(sub.givenAt);
        if (!subGiven) continue;

        if (subGiven > currentCursor) {
          segments.push({ type: 'main', label: 'Main Vehicle', start: currentCursor, end: subGiven });
        }

        const subReturnRaw = sub.returnCondition?.date || sub.expectedReturnAt;
        let subEnd = ensureValidDate(subReturnRaw) || addDays(subGiven, 1);
        if (subEnd <= subGiven) subEnd = addDays(subGiven, 1);

        segments.push({ 
          type: 'sub', 
          label: 'Substitute', 
          start: subGiven, 
          end: subEnd,
          registration: sub.registration
        });

        currentCursor = subEnd;
      }

      if (currentCursor < end) {
        segments.push({ type: 'main', label: 'Main Vehicle', start: currentCursor, end: end });
      }
    }
    return segments;
  }, [rental, start, end, hasSubs]);

  useEffect(() => {
    const fetchCreatedByName = async () => {
      if (rental.createdBy) {
        try {
          const userDoc = await getDoc(doc(db, 'users', rental.createdBy));
          setCreatedByName(userDoc.exists() ? userDoc.data().name : 'Unknown User');
        } catch {
          setCreatedByName('Unknown User');
        }
      }
    };
    fetchCreatedByName();
  }, [rental.createdBy]);

  const formatNoteDate = (date: any) => {
    try {
      const d = date?.toDate ? date.toDate() : new Date(date);
      return isValid(d) ? format(d, 'dd MMM yyyy HH:mm') : 'Unknown Date';
    } catch {
      return 'Unknown Date';
    }
  };

  const formatDateTime = (date: any): string => {
    if (!date) return 'N/A';
    try {
      const d = date?.toDate ? date.toDate() : new Date(date);
      if (isNaN(d.getTime())) return 'N/A';
      return format(d, 'dd/MM/yyyy HH:mm');
    } catch {
      return 'N/A';
    }
  };

  const formatAgreementKey = (key: string): string => {
    try {
      const timestamp = parseInt(key.split('_')[1] || '0', 10);
      if (timestamp === 0) return 'Hire Agreement';
      return `Hire Agreement (Generated ${format(new Date(timestamp), 'dd/MM/yyyy')})`;
    } catch {
      return 'Hire Agreement';
    }
  };

  const formatLatestAgreementLabel = (r: Rental) => {
    try {
      const s = ensureValidDate(r.startDate);
      const e = ensureValidDate(r.endDate);
      const sStr = format(s, 'dd/MM/yyyy HH:mm');
      const eStr = e ? format(e, 'dd/MM/yyyy HH:mm') : '—';
      return `Hire Agreement (${sStr} → ${eStr})`;
    } catch {
      return 'Hire Agreement (Latest)';
    }
  };

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="border-t pt-6 mt-6 first:border-t-0 first:pt-0 first:mt-0">
      <h3 className="text-lg font-medium text-gray-900 mb-4">{title}</h3>
      {children}
    </div>
  );

  const agreementKeys = rental.documents?.agreements
    ? Object.keys(rental.documents.agreements).sort(
        (a, b) =>
          parseInt(a.split('_')[1] || '0', 10) - parseInt(b.split('_')[1] || '0', 10)
      )
    : [];

  const latestAgreementKey = agreementKeys.length > 0 ? agreementKeys[agreementKeys.length - 1] : null;

  const handleInvoiceClick = () => {
    if (rental.documents?.invoice) {
        window.open(rental.documents.invoice, '_blank');
    } else {
        onDownloadInvoice();
    }
  };

  const handlePermitClick = () => {
    if (rental.documents?.permit) {
        window.open(rental.documents.permit, '_blank');
    } else {
        onDownloadPermit();
    }
  };

  return (
    <div className="space-y-6">
      {/* Documents Section */}
      <div className="flex flex-wrap gap-2">
        {latestAgreementKey && (
          <button
            key={`latest_${latestAgreementKey}`}
            onClick={() =>
              window.open(rental.documents!.agreements![latestAgreementKey], '_blank')
            }
            className="inline-flex items-center px-3 py-2 border border-blue-300 shadow-sm text-sm leading-4 font-medium rounded-md text-blue-700 bg-white hover:bg-blue-50"
            title="Open the main hire agreement"
          >
            <FileText className="h-4 w-4 mr-2" />
            {formatLatestAgreementLabel(rental)} (Main)
          </button>
        )}

        {agreementKeys
          .filter((k) => k !== latestAgreementKey)
          .map((key) => (
            <button
              key={key}
              onClick={() => window.open(rental.documents!.agreements![key], '_blank')}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              title="Open an older hire agreement version"
            >
              <FileText className="h-4 w-4 mr-2" />
              {formatAgreementKey(key)}
            </button>
          ))}

        <button
          onClick={handleInvoiceClick}
          className={`inline-flex items-center px-3 py-2 border shadow-sm text-sm leading-4 font-medium rounded-md ${
            rental.documents?.invoice
              ? 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
              : 'border-transparent text-white bg-green-600 hover:bg-green-700'
          }`}
        >
          {rental.documents?.invoice ? <Receipt className="h-4 w-4 mr-2" /> : <Download className="h-4 w-4 mr-2" />}
          {rental.documents?.invoice ? 'View Invoice' : 'Generate Invoice'}
        </button>

        <button
          onClick={handlePermitClick}
          className={`inline-flex items-center px-3 py-2 border shadow-sm text-sm leading-4 font-medium rounded-md ${
             rental.documents?.permit
               ? 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
               : 'border-transparent text-white bg-purple-600 hover:bg-purple-700'
          }`}
        >
          {rental.documents?.permit ? <FileText className="h-4 w-4 mr-2" /> : <Download className="h-4 w-4 mr-2" />}
          {rental.documents?.permit ? 'View Permit' : 'Generate Permit'}
        </button>

        {/* Claim Documents - Direct Links */}
        {rental.type === 'claim' && (
          <>
            {rental.documents?.conditionOfHire && (
              <button
                onClick={() => window.open(rental.documents?.conditionOfHire, '_blank')}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <FileText className="h-4 w-4 mr-2" />
                Condition of Hire
              </button>
            )}
            {rental.documents?.noticeOfRightToCancel && (
              <button
                onClick={() =>
                  window.open(rental.documents?.noticeOfRightToCancel, '_blank')
                }
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <FileText className="h-4 w-4 mr-2" />
                Notice of Right to Cancel
              </button>
            )}
            {rental.documents?.hireAgreement && (
              <button
                onClick={() => window.open(rental.documents?.hireAgreement, '_blank')}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <FileText className="h-4 w-4 mr-2" />
                Claim Hire Agreement
              </button>
            )}
            {rental.documents?.creditStorageAndRecovery && (
              <button
                onClick={() =>
                  window.open(rental.documents?.creditStorageAndRecovery, '_blank')
                }
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <FileText className="h-4 w-4 mr-2" />
                Credit Storage & Recovery
              </button>
            )}
            {rental.documents?.creditHireMitigation && (
              <button
                onClick={() =>
                  window.open(rental.documents?.creditHireMitigation, '_blank')
                }
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <FileText className="h-4 w-4 mr-2" />
                Credit Hire Mitigation
              </button>
            )}
            {rental.documents?.satisfactionNotice && (
              <button
                onClick={() => window.open(rental.documents?.satisfactionNotice, '_blank')}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <FileText className="h-4 w-4 mr-2" />
                Satisfaction Notice
              </button>
            )}
          </>
        )}
      </div>

      {/* Vehicle Information */}
      <div className="border-b pb-4">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Vehicle Details</h3>
        <div className="grid grid-cols-2 gap-4">
          {vehicle ? (
            <>
              <div className="flex items-center">
                <Car className="h-5 w-5 text-gray-400 mr-2" />
                <div>
                  <p className="font-medium">
                    {vehicle.make} {vehicle.model}
                  </p>
                  <p className="text-sm text-gray-500">{vehicle.registrationNumber}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500">Current Mileage</p>
                <p className="font-medium">{vehicle.mileage.toLocaleString()} km</p>
              </div>
            </>
          ) : (
            <div className="col-span-2 text-gray-500">Vehicle information not available</div>
          )}
        </div>
      </div>

      {/* Customer Information */}
      <div className="border-b pb-4">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Customer Details</h3>
        <div className="grid grid-cols-2 gap-4">
          {customer ? (
            <>
              <div className="flex items-center">
                <User className="h-5 w-5 text-gray-400 mr-2" />
                <div>
                  <p className="font-medium">{customer.name}</p>
                  <p className="text-sm text-gray-500">
                    License: {customer.driverLicenseNumber}
                  </p>
                </div>
              </div>
              <div className="flex items-center">
                <Phone className="h-5 w-5 text-gray-400 mr-2" />
                <div>
                  <p className="font-medium">{customer.mobile}</p>
                  <p className="text-sm text-gray-500">Contact</p>
                </div>
              </div>
              <div className="flex items-center">
                <Mail className="h-5 w-5 text-gray-400 mr-2" />
                <p className="text-sm">{customer.email}</p>
              </div>
              <div className="flex items-center">
                <MapPin className="h-5 w-5 text-gray-400 mr-2" />
                <p className="text-sm">{customer.address}</p>
              </div>
            </>
          ) : (
            <div className="col-span-2 text-gray-500">Customer information not available</div>
          )}
        </div>
      </div>

      {/* Rental Details */}
      <div className="border-b pb-4">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Rental Details</h3>
        <div className="grid grid-cols-2 gap-4">

          {/* Agreement Number Block */}
          {rental.rentalAgreementNumber && (
            <div className="col-span-2 flex items-center bg-blue-50 p-2 rounded border border-blue-100 mb-2">
              <FileText className="h-5 w-5 text-blue-600 mr-2" />
              <div>
                <p className="text-xs text-blue-600 uppercase tracking-wide font-bold">Agreement Number</p>
                <p className="text-lg font-bold text-blue-900">#{rental.rentalAgreementNumber}</p>
              </div>
            </div>
          )}
          
          <div>
            <p className="text-sm text-gray-500">Type</p>
            <div className="mt-1 space-y-1">
              <StatusBadge status={rental.type} />
              <StatusBadge status={rental.reason} />
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-500">Status</p>
            <div className="mt-1 space-y-1">
              <StatusBadge status={rental.status} />
              <StatusBadge status={rental.paymentStatus} />
            </div>
          </div>

          {/* Original Rental Start Date */}
          {rental.originalStartDate && (
            <div className="flex items-center col-span-2">
              <Calendar className="h-5 w-5 text-gray-400 mr-2" />
              <div>
                <p className="text-sm text-gray-500">Original Rental Start Date</p>
                <p className="font-medium">{formatDateTime(rental.originalStartDate)}</p>
              </div>
            </div>
          )}

          {/* TIMELINE OR STANDARD DATES */}
          {hasSubs ? (
             <div className="col-span-2 mt-2">
               <p className="text-sm font-medium text-gray-700 mb-2">Vehicle Usage Timeline</p>
               <div className="flex flex-col gap-2">
                 {timelineSegments.map((seg, idx) => (
                    <div 
                      key={idx} 
                      className={`
                        flex flex-col sm:flex-row sm:items-center justify-between px-3 py-2 rounded-md border-l-4 shadow-sm
                        ${seg.type === 'main' 
                          ? 'bg-gray-50 border-gray-400 text-gray-700' 
                          : 'bg-yellow-50 border-yellow-400 text-yellow-800'
                        }
                      `}
                    >
                      <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-xs mb-1 sm:mb-0">
                        {seg.type === 'main' ? <Car className="w-4 h-4" /> : <ArrowRightLeft className="w-4 h-4" />}
                        <span>{seg.label}</span>
                        {seg.registration && <span className="font-mono bg-white/50 px-1.5 py-0.5 rounded ml-2 text-gray-900 border border-black/5">{seg.registration}</span>}
                      </div>
                      <div className="flex items-center text-sm font-medium gap-3">
                         <span>{formatDateTime(seg.start)}</span>
                         <span className="opacity-50">→</span>
                         <span>{formatDateTime(seg.end)}</span>
                      </div>
                    </div>
                 ))}
               </div>
            </div>
          ) : (
             <>
                <div className="flex items-center">
                    <Calendar className="h-5 w-5 text-gray-400 mr-2" />
                    <div>
                    <p className="text-sm text-gray-500">Start Date & Time</p>
                    <p className="font-medium">{formatDateTime(rental.startDate)}</p>
                    </div>
                </div>
                <div className="flex items-center">
                    <Calendar className="h-5 w-5 text-gray-400 mr-2" />
                    <div>
                    <p className="text-sm text-gray-500">End Date & Time</p>
                    <p className="font-medium">{formatDateTime(rental.endDate)}</p>
                    </div>
                </div>
             </>
          )}
        </div>
      </div>

      {/* Claim Reference */}
      {rental.claimRef && (
        <div className="flex items-center border-b pb-4">
          <FileText className="h-5 w-5 text-gray-400 mr-2" />
          <div>
            <p className="text-sm text-gray-500">Claim Reference</p>
            <p className="font-medium">{rental.claimRef}</p>
          </div>
        </div>
      )}

      {/* Notes */}
      {rental.notes && rental.notes.length > 0 && (
        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4 shadow-md mb-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-2 opacity-10">
            <StickyNote className="w-12 h-12" />
          </div>
          <h3 className="flex items-center gap-2 text-yellow-800 font-bold text-lg mb-3 border-b border-yellow-200 pb-2">
            <StickyNote className="w-5 h-5" /> 
            RENTAL NOTES ({rental.notes.length})
          </h3>
          <div className="space-y-3">
            {rental.notes.slice().reverse().slice(0, 3).map((note) => (
              <div key={note.id} className="bg-white/50 p-2 rounded border border-yellow-100 shadow-sm text-sm">
                <div className="flex items-center gap-2 text-[10px] text-yellow-700 font-bold uppercase mb-1">
                  <span>{formatNoteDate(note.createdAt)}</span>
                  <span>•</span>
                  <span>{note.createdByName || 'Staff'}</span>
                </div>
                <p className="text-gray-900 font-medium whitespace-pre-wrap leading-relaxed italic">
                  "{note.text}"
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* HIRE SUBSTITUTION DETAILS */}
      {rental.hireSubstitutionDetails && rental.hireSubstitutionDetails.length > 0 && (
        <Section title="Hire Substitution Details">
          {rental.hireSubstitutionDetails.map((sub, index) => (
            <div
              key={index}
              className="grid grid-cols-2 gap-4 border-b pb-4 mb-4 last:border-b-0 last:pb-0 last:mb-0"
            >
              <h4 className="font-medium col-span-2 text-gray-700">
                Substitution Vehicle {index + 1}
              </h4>
              <div>
                <p className="text-sm text-gray-500">Vehicle</p>
                <p className="font-medium">
                  {sub.make} {sub.model} ({sub.registration})
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Loaner (Provider)</p>
                <p className="font-medium">{sub.loaner}</p>
              </div>
              <div className="flex items-center">
                <Calendar className="h-5 w-5 text-gray-400 mr-2" />
                <div>
                  <p className="text-sm text-gray-500">Date & Time Given</p>
                  <p className="font-medium">{formatDateTime(sub.givenAt)}</p>
                </div>
              </div>
              <div className="flex items-center">
                <Calendar className="h-5 w-5 text-gray-400 mr-2" />
                <div>
                  <p className="text-sm text-gray-500">Date & Time Expected Return</p>
                  <p className="font-medium">{formatDateTime(sub.expectedReturnAt)}</p>
                </div>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-gray-500">Notes (Reason)</p>
                <p className="font-medium whitespace-pre-wrap">{sub.notes || 'N/A'}</p>
              </div>

              {/* Substitution Condition Report (Check-Out) */}
              <div className="col-span-2 mt-2 bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="font-semibold text-gray-800 text-sm">Check-Out Condition</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm mb-3">
                  <div>
                    <span className="text-xs text-gray-500 uppercase tracking-wider block">Mileage Out</span>
                    <span className="font-mono font-medium">{(sub.mileage || 0).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 uppercase tracking-wider block">Fuel Level</span>
                    <span className="font-medium">{sub.fuelLevel || '100'}%</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 uppercase tracking-wider block">Clean</span>
                    <span className={`font-medium ${sub.isClean ? 'text-green-600' : 'text-red-600'}`}>
                      {sub.isClean ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 uppercase tracking-wider block">Damage</span>
                    <span className={`font-medium ${sub.hasDamage ? 'text-red-600' : 'text-green-600'}`}>
                      {sub.hasDamage ? 'Yes' : 'None'}
                    </span>
                  </div>
                </div>

                {sub.hasDamage && sub.damageDescription && (
                  <div className="mb-3 bg-red-50 p-2 rounded border border-red-100">
                    <span className="text-xs font-bold text-red-700 uppercase tracking-wider block mb-1">Damage Description</span>
                    <p className="text-sm text-red-800">{sub.damageDescription}</p>
                  </div>
                )}

                {sub.images && sub.images.length > 0 && (
                  <div>
                    <span className="text-xs text-gray-500 uppercase tracking-wider block mb-2 flex items-center gap-1">
                      <ImageIcon className="w-3 h-3" /> Check-Out Images
                    </span>
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                      {sub.images.map((url, i) => (
                        <a 
                          key={i} 
                          href={url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="block relative aspect-square group"
                        >
                          <img 
                            src={url} 
                            alt={`Condition ${i+1}`} 
                            className="w-full h-full object-cover rounded border border-gray-200 group-hover:border-blue-400 transition-all" 
                          />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Substitution Return Info - FULL DETAIL VIEW */}
              {sub.returnCondition && (
                 <div className="col-span-2 mt-2 bg-gray-50 border border-gray-200 rounded-lg p-4 shadow-sm">
                    <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-200">
                       <div className="flex items-center gap-2">
                         <CheckCircle className="w-4 h-4 text-blue-600" />
                         <span className="font-semibold text-gray-800 text-sm">Return Info (Check-In)</span>
                       </div>
                       <span className="text-xs font-bold text-red-600 border border-red-200 bg-red-50 px-2 py-1 rounded">
                         Total Charges: {formatCurrency(sub.returnCondition.totalCharges)}
                       </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm mb-3">
                       <div>
                         <span className="text-xs text-gray-500 uppercase tracking-wider block">Mileage In</span>
                         <span className="font-mono font-medium">{sub.returnCondition.mileage}</span>
                       </div>
                       <div>
                         <span className="text-xs text-gray-500 uppercase tracking-wider block">Fuel In</span>
                         <span className="font-medium">{sub.returnCondition.fuelLevel}%</span>
                       </div>
                       <div>
                         <span className="text-xs text-gray-500 uppercase tracking-wider block">Clean</span>
                         <span className={`font-medium ${sub.returnCondition.isClean ? 'text-green-600' : 'text-red-600'}`}>
                           {sub.returnCondition.isClean ? 'Yes' : 'No'}
                         </span>
                         {!sub.returnCondition.isClean && sub.returnCondition.cleaningCharge > 0 && (
                           <span className="block text-xs text-red-600 font-bold">
                             {formatCurrency(sub.returnCondition.cleaningCharge)}
                           </span>
                         )}
                       </div>
                       <div>
                         <span className="text-xs text-gray-500 uppercase tracking-wider block">Damage</span>
                         <span className={`font-medium ${sub.returnCondition.hasDamage ? 'text-red-600' : 'text-green-600'}`}>
                           {sub.returnCondition.hasDamage ? 'Yes' : 'None'}
                         </span>
                          {sub.returnCondition.hasDamage && sub.returnCondition.damageCost > 0 && (
                           <span className="block text-xs text-red-600 font-bold">
                             {formatCurrency(sub.returnCondition.damageCost)}
                           </span>
                         )}
                       </div>
                    </div>

                    {(sub.returnCondition.fuelCharge > 0) && (
                        <div className="text-xs text-red-600 font-bold mb-2">
                            Fuel Charge: {formatCurrency(sub.returnCondition.fuelCharge)}
                        </div>
                    )}

                    {sub.returnCondition.hasDamage && sub.returnCondition.damageDescription && (
                        <div className="mb-3 bg-red-50 p-2 rounded border border-red-100">
                            <span className="text-xs font-bold text-red-700 uppercase tracking-wider block mb-1">Damage Description</span>
                            <p className="text-sm text-red-800">{sub.returnCondition.damageDescription}</p>
                        </div>
                    )}

                    {/* Substitution Return Images */}
                    {sub.returnCondition.images && sub.returnCondition.images.length > 0 && (
                      <div>
                        <span className="text-xs text-gray-500 uppercase tracking-wider block mb-2 flex items-center gap-1">
                          <ImageIcon className="w-3 h-3" /> Check-In Images
                        </span>
                        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                          {sub.returnCondition.images.map((url, i) => (
                            <a 
                              key={i} 
                              href={url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="block relative aspect-square group"
                            >
                              <img 
                                src={url} 
                                alt={`Return Condition ${i+1}`} 
                                className="w-full h-full object-cover rounded border border-gray-200 group-hover:border-blue-400 transition-all" 
                              />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                 </div>
              )}
            </div>
          ))}
        </Section>
      )}

      {/* Main Vehicle Conditions */}
      {rental.checkOutCondition && (
        <Section title="Main Vehicle Check-Out Condition">
          <VehicleConditionDetails condition={rental.checkOutCondition} type="check-out" />
        </Section>
      )}

      {rental.returnCondition && (
        <Section title="Main Vehicle Return Condition">
          <VehicleConditionDetails condition={rental.returnCondition} type="return" />
        </Section>
      )}

      {rental.storageStartDate && rental.storageEndDate && (
        <Section title="Storage Details">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center">
              <Calendar className="h-5 w-5 text-gray-400 mr-2" />
              <div>
                <p className="text-sm text-gray-500">Storage Start Date</p>
                <p className="font-medium">{formatDateTime(rental.storageStartDate)}</p>
              </div>
            </div>
            <div className="flex items-center">
              <Calendar className="h-5 w-5 text-gray-400 mr-2" />
              <div>
                <p className="text-sm text-gray-500">Storage End Date</p>
                <p className="font-medium">{formatDateTime(rental.storageEndDate)}</p>
              </div>
            </div>
          </div>
        </Section>
      )}

      {/* COST SUMMARY */}
      <div className="border-t pt-4">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Cost Summary</h3>
        <div className="bg-gray-50 p-4 rounded-lg space-y-2">
          
          <div className="flex justify-between text-sm">
            <span>Base Rental Cost:</span>
            <span className="font-medium">{formatCurrency(baseCost)}</span>
          </div>

          {rental.includeVAT && (
            <div className="flex justify-between text-sm text-blue-600">
              <span>Hire VAT (20%):</span>
              <span className="font-medium">{formatCurrency(hireVatAmount)}</span>
            </div>
          )}

          {totalExtras > 0 && <div className="border-t border-gray-200 my-1"></div>}

          {/* Claim-only extras */}
          {rental.type === 'claim' && (
            <>
              {displayStorageCost > 0 && (
                <div className="flex justify-between text-sm">
                  <span>Storage Cost{rental.includeStorageVAT ? ' (Inc. VAT)' : ''}:</span>
                  <span className="font-medium">{formatCurrency(displayStorageCost)}</span>
                </div>
              )}
              {displayRecoveryCost > 0 && (
                <div className="flex justify-between text-sm">
                  <span>Recovery Cost{rental.includeRecoveryCostVAT ? ' (Inc. VAT)' : ''}:</span>
                  <span className="font-medium">{formatCurrency(displayRecoveryCost)}</span>
                </div>
              )}
              {displayDeliveryCharge > 0 && (
                <div className="flex justify-between text-sm">
                  {/* ✅ FIX: Removed multiplier here as stored val is total */}
                  <span>Delivery Charge{rental.deliveryChargeIncludeVAT ? ' (Inc. VAT)' : ''}:</span>
                  <span className="font-medium">{formatCurrency(displayDeliveryCharge)}</span>
                </div>
              )}
              {displayCollectionFee > 0 && (
                <div className="flex justify-between text-sm">
                  {/* ✅ FIX: Removed multiplier here as stored val is total */}
                  <span>Collection Charge{rental.collectionChargeIncludeVAT ? ' (Inc. VAT)' : ''}:</span>
                  <span className="font-medium">{formatCurrency(displayCollectionFee)}</span>
                </div>
              )}
            </>
          )}

          {/* Insurance rows */}
          {displayInsuranceDailyCost > 0 && (
            <div className="flex justify-between text-sm">
              <span>
                Insurance Daily ({insuranceDays} days)
                {insurancePerDayIncludeVAT ? ' (Inc. VAT)' : ''}:
              </span>
              <span className="font-medium">{formatCurrency(displayInsuranceDailyCost)}</span>
            </div>
          )}

          {displayInsuranceWeeklyCost > 0 && (
            <div className="flex justify-between text-sm">
              <span>
                Insurance Weekly ({insuranceWeeks} weeks)
                {insurancePerWeekIncludeVAT ? ' (Inc. VAT)' : ''}:
              </span>
              <span className="font-medium">{formatCurrency(displayInsuranceWeeklyCost)}</span>
            </div>
          )}

          {ongoingCharges > 0 && (
            <div className="flex justify-between text-sm text-red-600">
              <span>Ongoing (Overdue) Charges:</span>
              <span className="font-medium">{formatCurrency(ongoingCharges)}</span>
            </div>
          )}

          <div className="flex justify-between text-sm pt-2 border-t font-semibold text-gray-700">
            <span>Subtotal (Gross):</span>
            <span className="font-medium">{formatCurrency(totalWithAllVAT)}</span>
          </div>

          {(rental.discountAmount || 0) > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>
                Discount{rental.discountPercentage ? ` (${rental.discountPercentage}%)` : ''}:
              </span>
              <span>-{formatCurrency(rental.discountAmount || 0)}</span>
            </div>
          )}

          {rental.discountNotes && (
            <div className="text-sm italic text-gray-700 mt-1">{rental.discountNotes}</div>
          )}

          {totalReturnCharges > 0 && (
            <div className="flex justify-between text-sm">
              <span>Return Charges{subCharges > 0 ? ' (Inc. Subs)' : ''}:</span>
              <span className="font-medium">{formatCurrency(totalReturnCharges)}</span>
            </div>
          )}

          <div className="flex justify-between text-lg font-semibold pt-2 border-t mt-2">
            <span>Total Amount Due:</span>
            <span className="font-medium">{formatCurrency(totalAmountDue)}</span>
          </div>

          <div className="flex justify-between text-sm text-green-600">
            <span>Amount Paid:</span>
            <span>{formatCurrency(paid)}</span>
          </div>
          <div className="flex justify-between text-sm font-medium text-red-600">
            <span>Remaining Amount:</span>
            <span>{formatCurrency(remaining)}</span>
          </div>
        </div>
      </div>

      {/* Payment History */}
      {rental.payments && rental.payments.length > 0 && (
        <div className="border-t pt-4">
          <RentalPaymentHistory
            payments={rental.payments}
            onDownloadDocument={(url) => window.open(url, '_blank')}
          />
        </div>
      )}

      {/* Customer Signature */}
      {rental.signature && (
        <div className="border-t pt-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Customer Signature</h3>
          <div className="bg-gray-50 p-4 rounded-lg">
            <img
              src={rental.signature}
              alt="Customer Signature"
              className="max-h-24 object-contain bg-white rounded border"
            />
          </div>
        </div>
      )}

      {/* Creation Information */}
      <div className="text-sm text-gray-500">
        <div className="flex justify-between">
          <div>Submitted by: {createdByName || rental.createdBy || 'Loading...'}</div>
          <div>Last Updated: {formatDateTime(rental.updatedAt)}</div>
        </div>
      </div>
    </div>
  );
};

export default RentalDetails;