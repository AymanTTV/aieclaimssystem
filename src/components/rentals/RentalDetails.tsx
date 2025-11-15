// src/components/rentals/RentalDetails.tsx
import React, { useState, useEffect } from 'react';
import { Rental, Vehicle, Customer } from '../../types';
import { format, isAfter, differenceInDays } from 'date-fns';
import StatusBadge from '../ui/StatusBadge';
import {
  FileText,
  Download,
  Car,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar
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

  // 1) Base cost (no extras):
  const baseCost = vehicle
    ? calculateRentalCost(
        start,
        end,
        rental.type,
        vehicle,
        rental.reason,
        rental.negotiatedRate ?? undefined,
        0, 0, 0, 0, 0,
        false, false, false, false, false // Base display excludes all VAT toggles
      )
    : 0;

  // Insurance days (inclusive)
  const insuranceDays = React.useMemo(() => {
    try {
      const s = ensureValidDate(rental.startDate);
      const e = ensureValidDate(rental.endDate);
      if (s && e && !isAfter(s, e)) {
        return differenceInDays(e, s) + 1;
      }
    } catch {}
    return 0;
  }, [rental.startDate, rental.endDate]);

  // Overdue/ongoing charges (VAT-inclusive from util) — only when active & overdue
  const ongoingCharges = React.useMemo(() => {
    if (!vehicle) return 0;
    const now = new Date();
    if (rental.status === 'active' && isAfter(now, ensureValidDate(rental.endDate))) {
      return calculateOverdueCost(rental, now, vehicle); // VAT-inclusive now
    }
    return 0;
  }, [rental, vehicle]);

  // Return charges (assumed VAT-inclusive if you saved them that way)
  const returnCharges = rental.returnCondition?.totalCharges ?? 0;

  // Claim / extras – use stored values (already reflect their own VAT toggles)
  const displayStorageCost = rental.storageCost || 0;
  const displayRecoveryCost =
    (rental.recoveryCost || 0) * (rental.includeRecoveryCostVAT ? 1.2 : 1);
  const displayDeliveryCharge = rental.deliveryCharge || 0;
  const displayCollectionFee = rental.collectionCharge || 0;
  const displayInsuranceCost =
    insuranceDays * (rental.insurancePerDay || 0) * (rental.insurancePerDayIncludeVAT ? 1.2 : 1);

  // ------ Totals (ongoing excluded from VAT multiplier) ------
  // Subtotal EXCLUDING ongoing (keep VAT logic as-is on this part)
  const subtotalBeforeOverallVAT =
    baseCost +
    displayStorageCost +
    displayRecoveryCost +
    displayDeliveryCharge +
    displayCollectionFee +
    displayInsuranceCost;

  // Apply VAT (only to the above block)
  const subtotalWithOverallVAT =
    subtotalBeforeOverallVAT * (rental.includeVAT ? 1.2 : 1);

  // Apply discount to RENTAL subtotal only
  const discountedRentalTotal =
    subtotalWithOverallVAT - (rental.discountAmount ?? 0);

  // FINAL total due adds ongoing + return charges outside (already VAT-inclusive)
  const totalAmountDue = discountedRentalTotal + ongoingCharges + returnCharges;

  // Payments
  const paid = rental.paidAmount || 0;
  const remaining = totalAmountDue - paid;

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

  // --- Helper to label older agreements by their key timestamp ---
  const formatAgreementKey = (key: string): string => {
    try {
      const timestamp = parseInt(key.split('_')[1] || '0', 10);
      if (timestamp === 0) return 'Hire Agreement';
      // ----------------- ✅ FIX 3: Update label for clarity -----------------
      return `Hire Agreement (Generated ${format(new Date(timestamp), 'dd/MM/yyyy')})`;
      // ----------------- END OF FIX 3 -----------------
    } catch {
      return 'Hire Agreement';
    }
  };

  // --- NEW: Helper to label the Latest agreement using the rental's own dates ---
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

  // Agreements list (sorted oldest → newest)
  const agreementKeys = rental.documents?.agreements
    ? Object.keys(rental.documents.agreements).sort(
        (a, b) =>
          parseInt(a.split('_')[1] || '0', 10) -
          parseInt(b.split('_')[1] || '0', 10)
      )
    : [];

  const latestAgreementKey =
    agreementKeys.length > 0 ? agreementKeys[agreementKeys.length - 1] : null;

  return (
    <div className="space-y-6">
      {/* Documents Section */}
      <div className="flex flex-wrap gap-2">
        {/* Latest agreement first (uses rental start→end in label) */}
        {latestAgreementKey && (
          <button
            key={`latest_${latestAgreementKey}`}
            onClick={() => window.open(rental.documents!.agreements![latestAgreementKey], '_blank')}
            className="inline-flex items-center px-3 py-2 border border-blue-300 shadow-sm text-sm leading-4 font-medium rounded-md text-blue-700 bg-white hover:bg-blue-50"
            title="Open the main hire agreement"
          >
            <FileText className="h-4 w-4 mr-2" />
            {/* ----------------- ✅ FIX 4: Update label to (Main) ----------------- */}
            {formatLatestAgreementLabel(rental)} (Main)
            {/* ----------------- END OF FIX 4 ----------------- */}
          </button>
        )}

        {/* Older versions (if any), labeled by their key timestamp */}
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

        {rental.documents?.invoice && (
          <button
            onClick={onDownloadInvoice}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <Download className="h-4 w-4 mr-2" />
            Invoice
          </button>
        )}

        {rental.documents?.permit && (
          <button
            onClick={() => window.open(rental.documents?.permit, '_blank')}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <FileText className="h-4 w-4 mr-2" />
            Parking Permit
          </button>
        )}

        {/* Claim Documents */}
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
                onClick={() => window.open(rental.documents?.noticeOfRightToCancel, '_blank')}
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
                onClick={() => window.open(rental.documents?.creditStorageAndRecovery, '_blank')}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <FileText className="h-4 w-4 mr-2" />
                Credit Storage & Recovery
              </button>
            )}
            {rental.documents?.creditHireMitigation && (
              <button
                onClick={() => window.open(rental.documents?.creditHireMitigation, '_blank')}
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
                  <p className="font-medium">{vehicle.make} {vehicle.model}</p>
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
                  <p className="text-sm text-gray-500">License: {customer.driverLicenseNumber}</p>
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
            <div className="flex items-center">
              <Calendar className="h-5 w-5 text-gray-400 mr-2" />
              <div>
                <p className="text-sm text-gray-500">Original Rental Start Date</p>
                <p className="font-medium">{formatDateTime(rental.originalStartDate)}</p>
              </div>
            </div>
          )}

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
        </div>
      </div>

      {/* Claim Reference */}
      {rental.claimRef && (
        <div className="flex items-center col-span-2">
          <FileText className="h-5 w-5 text-gray-400 mr-2" />
          <div>
            <p className="text-sm text-gray-500">Claim Reference</p>
            <p className="font-medium">{rental.claimRef}</p>
          </div>
        </div>
      )}

      {/* --- HIRE SUBSTITUTION DETAILS (ARRAY) --- */}
      {rental.hireSubstitutionDetails && rental.hireSubstitutionDetails.length > 0 && (
        <Section title="Hire Substitution Details">
          {rental.hireSubstitutionDetails.map((sub, index) => (
            <div key={index} className="grid grid-cols-2 gap-4 border-b pb-4 mb-4 last:border-b-0 last:pb-0 last:mb-0">
              <h4 className="font-medium col-span-2 text-gray-700">Substitution Vehicle {index + 1}</h4>
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
            </div>
          ))}
        </Section>
      )}
      {/* --- END: HIRE SUBSTITUTION DETAILS --- */}

      {rental.checkOutCondition && (
        <Section title="Check-Out Condition">
          <VehicleConditionDetails condition={rental.checkOutCondition} type="check-out" />
        </Section>
      )}

      {rental.returnCondition && (
        <Section title="Return Condition">
          <VehicleConditionDetails condition={rental.returnCondition} type="return" />
        </Section>
      )}

      {rental.storageStartDate && rental.storageEndDate && (
        <>
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
        </>
      )}

      {/* --- COST SUMMARY --- */}
      <div className="border-t pt-4">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Cost Summary</h3>
        <div className="bg-gray-50 p-4 rounded-lg space-y-2">
          <div className="flex justify-between text-sm">
            <span>Base Rental Cost:</span>
            <span className="font-medium">{formatCurrency(baseCost)}</span>
          </div>

          {rental.type === 'claim' && (
            <>
              <div className="flex justify-between text-sm">
                <span>Storage Cost{rental.includeStorageVAT ? ' (Inc. VAT)' : ''}:</span>
                <span className="font-medium">{formatCurrency(displayStorageCost)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Recovery Cost{rental.includeRecoveryCostVAT ? ' (Inc. VAT)' : ''}:</span>
                <span className="font-medium">{formatCurrency(displayRecoveryCost)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Delivery Charge{rental.deliveryChargeIncludeVAT ? ' (Inc. VAT)' : ''}:</span>
                <span className="font-medium">{formatCurrency(displayDeliveryCharge)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Collection Charge{rental.collectionChargeIncludeVAT ? ' (Inc. VAT)' : ''}:</span>
                <span className="font-medium">{formatCurrency(displayCollectionFee)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Insurance ({insuranceDays} days){rental.insurancePerDayIncludeVAT ? ' (Inc. VAT)' : ''}:</span>
                <span className="font-medium">{formatCurrency(displayInsuranceCost)}</span>
              </div>
            </>
          )}

          {ongoingCharges > 0 && (
            <div className="flex justify-between text-sm text-red-600">
              <span>Ongoing (Overdue) Charges:</span>
              <span className="font-medium">{formatCurrency(ongoingCharges)}</span>
            </div>
          )}

          <div className="flex justify-between text-sm pt-2 border-t">
            <span>Subtotal (before VAT):</span>
            <span className="font-medium">{formatCurrency(subtotalBeforeOverallVAT)}</span>
          </div>

          {rental.includeVAT && (
            <div className="flex justify-between text-sm text-blue-600">
              <span>VAT (20%):</span>
              <span className="font-medium">
                {formatCurrency(subtotalWithOverallVAT - subtotalBeforeOverallVAT)}
              </span>
            </div>
          )}

          <div className="flex justify-between text-sm pt-2 border-t">
            <span>Subtotal (with VAT):</span>
            <span className="font-medium">{formatCurrency(subtotalWithOverallVAT)}</span>
          </div>

          {(rental.discountAmount || 0) > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Discount{rental.discountPercentage ? ` (${rental.discountPercentage}%)` : ''}:</span>
              <span>-{formatCurrency(rental.discountAmount || 0)}</span>
            </div>
          )}

          {rental.discountNotes && (
            <div className="text-sm italic text-gray-700 mt-1">
              {rental.discountNotes}
            </div>
          )}

          {returnCharges > 0 && (
            <div className="flex justify-between text-sm">
              <span>Return Charges:</span>
              <span className="font-medium">{formatCurrency(returnCharges)}</span>
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