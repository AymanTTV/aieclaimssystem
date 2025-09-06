// src/components/pdf/RentalInvoice.tsx
import React from 'react';
import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';
import { Rental, Vehicle, Customer } from '../../types';
import { format, differenceInDays, differenceInHours, isAfter } from 'date-fns';
import { styles } from './styles';
import {
  calculateOverdueCost,
  calculateRentalCost,
  RENTAL_RATES,
  getOverdueUnits,
} from '../../utils/rentalCalculations';

interface RentalInvoiceProps {
  rental: Rental;
  vehicle: Vehicle;
  customer: Customer;
  companyDetails: {
    logoUrl?: string;
    fullName: string;
    officialAddress: string;
    phone: string;
    email: string;
    registrationNumber: string;
  };
}

const RentalInvoice: React.FC<RentalInvoiceProps> = ({
  rental,
  vehicle,
  customer,
  companyDetails,
}) => {
  // ---------- Helpers ----------
  const toDate = (d: any): Date | null => {
    if (!d) return null;
    if (d instanceof Date) return d;
    if (typeof d?.toDate === 'function') return d.toDate();
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? null : dt;
  };

  const fmtDateTime = (d: any) => {
    const dt = toDate(d);
    return dt ? format(dt, 'dd/MM/yyyy HH:mm') : 'N/A';
  };

  // ---------- Dates, units ----------
  const sd = toDate(rental.startDate)!;
  const ed = toDate(rental.endDate)!;

  const safeDays = sd && ed && !isAfter(sd, ed) ? differenceInDays(ed, sd) + 1 : 0;
  const unit = rental.type === 'weekly' ? 'week' : 'day';
  const totalHours = differenceInHours(ed, sd);
  const baseDays = totalHours <= 0 ? 1 : Math.ceil(totalHours / 24);
  const baseUnits = rental.type === 'weekly' ? Math.ceil(baseDays / 7) : baseDays;

  // ---------- Display rate (for breakdown table only) ----------
  const vehicleRate =
    rental.type === 'daily'
      ? (vehicle.dailyRentalPrice ?? 0)
      : rental.type === 'weekly'
      ? (vehicle.weeklyRentalPrice ?? 0)
      : (vehicle.claimRentalPrice ?? 0);
  const fallbackRate = RENTAL_RATES[rental.type] ?? 0;
  const effectiveRate = (rental.negotiatedRate ?? vehicleRate ?? fallbackRate) || 0;
  const hireRate = effectiveRate.toFixed(2);
  const hireUnits = `${baseUnits} ${unit}${baseUnits === 1 ? '' : 's'}`;

  // ---------- Base hire (no extras, no overall VAT) ----------
  const baseHireTotal = vehicle
    ? calculateRentalCost(
        sd,
        ed,
        rental.type,
        vehicle,
        rental.reason,
        rental.negotiatedRate ?? undefined,
        0, 0, 0, 0, 0,
        false, false, false, false, false
      )
    : 0;

  // ---------- Overdue / ongoing (VAT-inclusive via util) ----------
  const now = new Date();
  const showOverdue = rental.status === 'active' && isAfter(now, ed);
  const overdueUnits = showOverdue ? getOverdueUnits(rental, now) : 0;
  const overdueTotal = showOverdue ? calculateOverdueCost(rental, now, vehicle) : 0; // VAT-inclusive

  // ---------- Extras (use stored values and per-line VAT toggles, matching Details modal) ----------
  const netStorage = parseFloat((rental.storageCost || 0).toFixed(2)); // already stored with its own VAT toggle
  const netDelivery = parseFloat((rental.deliveryCharge || 0).toFixed(2)); // already stored VAT-inclusive if flag was set
  const netCollection = parseFloat((rental.collectionCharge || 0).toFixed(2)); // same
  const netRecovery = parseFloat(
    (((rental.recoveryCost || 0) * (rental.includeRecoveryCostVAT ? 1.2 : 1))).toFixed(2)
  );
  const netInsurance = parseFloat(
    (safeDays * (rental.insurancePerDay || 0) * (rental.insurancePerDayIncludeVAT ? 1.2 : 1)).toFixed(2)
  );

  // ---------- Return charges (split) ----------
  const rc = rental.returnCondition;
  const returnFuel = parseFloat((rc?.fuelCharge || 0).toFixed(2));
  const returnDamage = parseFloat((rc?.damageCost || 0).toFixed(2));
  const returnCleaning = parseFloat((rc?.cleaningCharge || 0).toFixed(2));
  const returnTotal = parseFloat((returnFuel + returnDamage + returnCleaning).toFixed(2)); // treat as VAT-inclusive

  // ---------- Subtotals & totals (match Details modal flow) ----------
  // Subtotal BEFORE overall VAT: base hire + extras (NOT including overdue/returns)
  const subtotalBeforeVAT = parseFloat(
    (baseHireTotal + netStorage + netRecovery + netDelivery + netCollection + netInsurance).toFixed(2)
  );

  // Overall VAT applies to the above block as per Details modal
  const vatAmount = rental.includeVAT ? parseFloat((subtotalBeforeVAT * 0.2).toFixed(2)) : 0;
  const subtotalWithVAT = parseFloat((subtotalBeforeVAT + vatAmount).toFixed(2));

  // Discount comes off the rental subtotal (with VAT)
  const discountAmount = rental.discountAmount ? parseFloat(rental.discountAmount.toFixed(2)) : 0;
  const discountedRentalTotal = parseFloat((subtotalWithVAT - discountAmount).toFixed(2));

  // Final total adds overdue + return (they’re VAT-inclusive already)
  const grandTotal = parseFloat((discountedRentalTotal + overdueTotal + returnTotal).toFixed(2));

  // Payments / owing
  const paid = parseFloat(
    (
      (rental.payments?.reduce((s, p) => s + p.amount, 0) || 0) +
      (rental.paidAmount && rental.payments?.length === 0 ? rental.paidAmount : 0)
    ).toFixed(2)
  );
  const owing = parseFloat((grandTotal - paid).toFixed(2));

  // ---------- Breakdown rows ----------
  const rows = [
    {
      desc: 'Hire Charges',
      details: `£${hireRate} per ${unit}`,
      rate: hireRate,
      units: hireUnits,
      total: baseHireTotal.toFixed(2),
    },
    ...(netStorage > 0
      ? [{ desc: 'Storage Charges', details: '', rate: '', units: '', total: netStorage.toFixed(2) }]
      : []),
    ...(netRecovery > 0
      ? [{ desc: 'Recovery Charges', details: '', rate: '', units: '', total: netRecovery.toFixed(2) }]
      : []),
    ...(netDelivery > 0
      ? [{ desc: 'Delivery Charges', details: '', rate: '', units: '', total: netDelivery.toFixed(2) }]
      : []),
    ...(netCollection > 0
      ? [{ desc: 'Collection Charges', details: '', rate: '', units: '', total: netCollection.toFixed(2) }]
      : []),
    ...(netInsurance > 0
      ? [{
          desc: 'Insurance',
          details: `${safeDays} day${safeDays === 1 ? '' : 's'} cover`,
          rate: (rental.insurancePerDay || 0).toFixed(2),
          units: String(safeDays),
          total: netInsurance.toFixed(2),
        }]
      : []),
    ...(overdueTotal > 0
      ? [{
          desc: 'Overdue Charges',
          details: overdueUnits > 0 ? `${overdueUnits} ${unit}${overdueUnits === 1 ? '' : 's'}` : '',
          rate: '',
          units: overdueUnits > 0 ? String(overdueUnits) : '',
          total: overdueTotal.toFixed(2),
        }]
      : []),
    ...(discountAmount > 0
      ? [{
          desc: 'Discount',
          details: rental.discountPercentage ? `${rental.discountPercentage.toFixed(2)}%` : 'Fixed Discount',
          rate: '',
          units: '',
          total: (-discountAmount).toFixed(2),
        }]
      : []),
    // Split return charges
    ...(returnFuel > 0 ? [{ desc: 'Return – Fuel', details: '', rate: '', units: '', total: returnFuel.toFixed(2) }] : []),
    ...(returnDamage > 0 ? [{ desc: 'Return – Damage', details: '', rate: '', units: '', total: returnDamage.toFixed(2) }] : []),
    ...(returnCleaning > 0 ? [{ desc: 'Return – Cleaning', details: '', rate: '', units: '', total: returnCleaning.toFixed(2) }] : []),
  ];

  // ---------- Payment history pages (15 per page) ----------
  const paymentPages: Rental['payments'][] = [];
  if (rental.payments?.length) {
    for (let i = 0; i < rental.payments.length; i += 15) {
      paymentPages.push(rental.payments.slice(i, i + 15));
    }
  }

  return (
    <Document>
      {/* Page 1 */}
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header} fixed>
          <View style={styles.headerLeft}>
            {companyDetails.logoUrl && <Image src={companyDetails.logoUrl} style={styles.logo} />}
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.companyName}>{companyDetails.fullName}</Text>
            <Text style={styles.companyDetail}>{companyDetails.officialAddress}</Text>
            <Text style={styles.companyDetail}>Tel: {companyDetails.phone}</Text>
            <Text style={styles.companyDetail}>Email: {companyDetails.email}</Text>
          </View>
        </View>

        {/* Title */}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>RENTAL INVOICE</Text>
        </View>

        {/* Invoice Info */}
        <View style={localStyles.infoCard}>
          <View style={localStyles.infoItem}>
            <Text style={localStyles.infoLabel}>Invoice Number</Text>
            <Text style={localStyles.infoValue}>AIE-{rental.id.slice(-8).toUpperCase()}</Text>
          </View>
          <View style={localStyles.infoItem}>
            <Text style={localStyles.infoLabel}>Invoice Date</Text>
            <Text style={localStyles.infoValue}>{fmtDateTime(rental.createdAt || new Date())}</Text>
          </View>
          <View style={localStyles.infoItem}>
            <Text style={localStyles.infoLabel}>Due Date</Text>
            <Text style={localStyles.infoValue}>{fmtDateTime(rental.endDate)}</Text>
          </View>
          <View style={localStyles.infoItem}>
            <Text style={localStyles.infoLabel}>Rental Start</Text>
            <Text style={localStyles.infoValue}>{fmtDateTime(rental.startDate)}</Text>
          </View>
          <View style={localStyles.infoItem}>
            <Text style={localStyles.infoLabel}>Rental End</Text>
            <Text style={localStyles.infoValue}>{fmtDateTime(rental.endDate)}</Text>
          </View>
        </View>

        {/* Bill To & Vehicle */}
        <View style={[styles.sectionBreak, { flexDirection: 'row', justifyContent: 'space-between' }]} wrap={false}>
          <View style={[styles.card, { width: '48%' }]}>
            <Text style={styles.sectionTitle}>Bill To:</Text>
            <Text>{customer.name}</Text>
            <Text>{customer.address || 'N/A'}</Text>
            <Text>{customer.mobile}</Text>
            <Text>{customer.email}</Text>
          </View>
          <View style={[styles.card, { width: '48%' }]}>
            <Text style={styles.sectionTitle}>Vehicle Details:</Text>
            <Text>{vehicle.make} {vehicle.model}</Text>
            <Text>Reg: {vehicle.registrationNumber}</Text>
            <Text>
              Mileage: {(rental.checkOutCondition?.mileage || vehicle.mileage || 0).toLocaleString()} miles
            </Text>
          </View>
        </View>

        {/* Rental Charges Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Rental Charges Breakdown</Text>
          <View style={styles.table} breakInside="avoid">
            <View style={styles.tableHeader}>
              <Text style={styles.tableHeaderCell}>Description</Text>
              <Text style={styles.tableHeaderCell}>Details</Text>
              <Text style={styles.tableHeaderCell}>Rate (£)</Text>
              <Text style={styles.tableHeaderCell}>Days / Units</Text>
              <Text style={styles.tableHeaderCell}>Total (£)</Text>
            </View>
            {rows.map((r, i) => (
              <View key={i} style={styles.tableRow}>
                <Text style={styles.tableCell}>{r.desc}</Text>
                <Text style={styles.tableCell}>{r.details}</Text>
                <Text style={styles.tableCell}>{r.rate}</Text>
                <Text style={styles.tableCell}>{r.units}</Text>
                <Text style={styles.tableCell}>£{r.total}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Payment Terms & Conditions */}
        <View style={[styles.section, styles.sectionBreak]}>
          <View breakInside="avoid">
            <Text style={styles.sectionTitle}>Payment Terms &amp; Conditions</Text>
            <Text>Payment must be made by the due date stated on this invoice.</Text>
          </View>
          <Text>Late payments may be subject to additional fees and penalties.</Text>
        </View>

        {/* Bank Details & Summary */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 }} wrap={false}>
          <View style={[styles.card, { width: '48%' }]}>
            <Text style={styles.sectionTitle}>Bank Details</Text>
            <Text>Bank: LLOYDS BANK</Text>
            <Text>Account Name: AIE SKYLINE LIMITED</Text>
            <Text>Account Number: 30513162</Text>
            <Text>Sort Code: 30-99-50</Text>
          </View>

          {/* Summary (no Rate/Period shown) */}
          <View style={[styles.card, { width: '48%' }]}>
            <Text style={styles.sectionTitle}>Summary</Text>

            <View style={styles.spaceBetweenRow}>
              <Text style={styles.label}>Net (rental + extras):</Text>
              <Text style={[styles.value, { textAlign: 'right' }]}>£{subtotalBeforeVAT.toFixed(2)}</Text>
            </View>

            {rental.includeVAT && (
              <View style={styles.spaceBetweenRow}>
                <Text style={[styles.label, { color: '#2563EB' }]}>VAT (20%):</Text>
                <Text style={[styles.value, { color: '#2563EB', textAlign: 'right' }]}>
                  £{vatAmount.toFixed(2)}
                </Text>
              </View>
            )}

            {discountAmount > 0 && (
              <View style={styles.spaceBetweenRow}>
                <Text style={[styles.label, { color: 'red' }]}>Discount:</Text>
                <Text style={[styles.value, { color: 'red', textAlign: 'right' }]}>
                  –£{discountAmount.toFixed(2)}
                </Text>
              </View>
            )}

            {overdueTotal > 0 && (
              <View style={styles.spaceBetweenRow}>
                <Text style={styles.label}>Overdue Charges:</Text>
                <Text style={[styles.value, { textAlign: 'right' }]}>£{overdueTotal.toFixed(2)}</Text>
              </View>
            )}

            {returnTotal > 0 && (
              <View style={styles.spaceBetweenRow}>
                <Text style={styles.label}>Return Charges:</Text>
                <Text style={[styles.value, { textAlign: 'right' }]}>£{returnTotal.toFixed(2)}</Text>
              </View>
            )}

            <View style={styles.spaceBetweenRow}>
              <Text style={styles.label}>Total:</Text>
              <Text style={[styles.value, { textAlign: 'right' }]}>£{grandTotal.toFixed(2)}</Text>
            </View>

            <View style={styles.spaceBetweenRow}>
              <Text style={styles.label}>Paid:</Text>
              <Text style={[styles.value, { textAlign: 'right' }]}>£{paid.toFixed(2)}</Text>
            </View>

            <View style={styles.spaceBetweenRow}>
              <Text
                style={[
                  styles.label,
                  { color: owing > 0 ? '#DC2626' : '#16A34A' },
                ]}
              >
                Owing:
              </Text>
              <Text
                style={[
                  styles.value,
                  { textAlign: 'right', color: owing > 0 ? '#DC2626' : '#16A34A' },
                ]}
              >
                £{owing.toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            AIE SKYLINE LIMITED, registered in England and Wales with the company
            registration number 15616639, registered office address: United
            House, 39-41 North Road, London, N7 9DP. VAT. NO. 453448875
          </Text>
          <Text
            style={styles.pageNumber}
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
          />
        </View>
      </Page>

      {/* Pages 2+ Payment History */}
      {paymentPages.map((pagePayments, idx) => (
        <Page key={idx} size="A4" style={styles.page}>
          <Text style={styles.sectionTitle}>Payment History</Text>
          <View style={styles.table} breakInside="avoid">
            <View style={styles.tableHeader} fixed>
              <Text style={[styles.tableCell, { flex: 1 }]}>Date</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>Type</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>Ref</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>Amount</Text>
            </View>
            {pagePayments.map((p, i) => (
              <View key={i} style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 1 }]}>{fmtDateTime(p.date)}</Text>
                <Text style={[styles.tableCell, { flex: 1 }]}>{p.method.replace('_', ' ').toUpperCase()}</Text>
                <Text style={[styles.tableCell, { flex: 1 }]}>{p.reference || 'N/A'}</Text>
                <Text style={[styles.tableCell, { flex: 1 }]}>£{(p.amount || 0).toFixed(2)}</Text>
              </View>
            ))}
          </View>

          <View style={styles.footer} fixed>
            <Text style={styles.footerText}>
              AIE SKYLINE LIMITED, registered in England and Wales with the company
              registration number 15616639, registered office address: United
              House, 39-41 North Road, London, N7 9DP. VAT. NO. 453448875
            </Text>
            <Text
              style={styles.pageNumber}
              render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
            />
          </View>
        </Page>
      ))}
    </Document>
  );
};

export default RentalInvoice;

// Local styles for horizontal invoice info card
const localStyles = StyleSheet.create({
  infoCard: {
    borderWidth: 1,
    borderColor: '#3B82F6',
    borderRadius: 6,
    padding: 8,
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
  },
  infoItem: {
    flex: 1,
    alignItems: 'flex-start',
    paddingHorizontal: 4,
  },
  infoLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1E40AF',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 10,
    color: '#1F2937',
  },
});
