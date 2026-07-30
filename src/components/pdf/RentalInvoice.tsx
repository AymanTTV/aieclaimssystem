// src/components/pdf/RentalInvoice.tsx
import React from 'react';
import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';
import { Rental, Vehicle, Customer } from '../../types';
import { format, differenceInHours, isAfter } from 'date-fns';
import { styles } from './styles';
import {
  calculateOverdueCost,
  calculateRentalCostDetailed,
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
    signature?: string;
    rentalInvoiceTerms?: string;
    bankName?: string;
    accountNumber?: string;
    sortCode?: string;
  };
}

// Helper to validate image sources
const isValidPdfImageSrc = (v: any): v is string => {
  if (typeof v !== 'string') return false;
  const s = v.trim();
  if (!s) return false;
  if (s.includes('undefined') || s.includes('null')) return false;
  return s.startsWith('data:image/') || s.startsWith('http://') || s.startsWith('https://');
};

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
  const invoiceDate = ed || new Date();
  const dueDate = ed || new Date(); // Due date is now the rental end date
  const unit = rental.type === 'weekly' ? 'week' : 'day';
  
  const totalHours = differenceInHours(ed, sd);
  const calculatedDays = totalHours <= 0 ? 1 : Math.ceil(totalHours / 24);
  const baseUnits = rental.type === 'weekly' ? Math.ceil(calculatedDays / 7) : calculatedDays;

  // ---------- Rates & Formatting ----------
  const vehicleRate =
    rental.type === 'daily'
      ? (rental.lockedDailyRate ?? vehicle.dailyRentalPrice ?? RENTAL_RATES.daily)
      : rental.type === 'weekly'
      ? (rental.lockedWeeklyRate ?? vehicle.weeklyRentalPrice ?? RENTAL_RATES.weekly)
      : (rental.lockedClaimRate ?? vehicle.claimRentalPrice ?? RENTAL_RATES.claim);
      
  const fallbackRate = RENTAL_RATES[rental.type] ?? 0;
  const effectiveRate = (rental.negotiatedRate ?? vehicleRate ?? fallbackRate) || 0;
  const hireRate = effectiveRate.toFixed(2);
  const hireUnits = `${baseUnits} ${unit}${baseUnits === 1 ? '' : 's'}`;

  // ---------- 1. Master Calculation (100% Synced with App) ----------
  
  const storageNet = rental.type === 'claim' ? (rental.storageDays || 0) * (rental.storageCostPerDay || 0) : 0;
  const netDelivery = rental.deliveryCharge || 0;
  const netCollection = rental.collectionCharge || 0;
  const netRecovery = rental.type === 'claim' ? (rental.recoveryCost || 0) : 0;
  const netInsDay = rental.type !== 'weekly' ? (rental.insurancePerDay || 0) : 0;
  const netInsWeek = rental.type === 'weekly' ? ((rental as any).insurancePerWeek || 0) : 0;

  // Calculate Extra Charges Total
  const extraTotal = (rental.extraCharges || []).reduce((acc, c) => acc + (Number(c.amount) || 0), 0);

  // Resolve Discounts (Legacy vs History)
  const hasHistory = rental.discounts && rental.discounts.length > 0;
  const calcDiscountPct = hasHistory ? 0 : (rental.discountPercentage || 0);
  const calcDiscountAmt = hasHistory 
    ? rental.discounts!.reduce((sum, d) => sum + d.amount, 0) 
    : (rental.discountAmount || 0);

  // Master Calculation for Proportional VAT & Discounts (Matches all other modals)
  const masterDetails = calculateRentalCostDetailed(
    sd, ed, rental.type, vehicle, rental.reason, rental.negotiatedRate ?? undefined,
    storageNet, netRecovery, netDelivery, netCollection, netInsDay, netInsWeek,
    rental.includeVAT || false, rental.deliveryChargeIncludeVAT || false, rental.collectionChargeIncludeVAT || false,
    rental.insurancePerDayIncludeVAT || false, (rental as any).insurancePerWeekIncludeVAT || false, rental.includeRecoveryCostVAT || false, rental.includeStorageVAT || false,
    calcDiscountPct, calcDiscountAmt, rental.status,
    rental.lockedDailyRate, rental.lockedWeeklyRate, rental.lockedClaimRate,
    extraTotal,
    rental.discounts || [] // 👈 ADD THIS: Passes the discount targets into the engine
  );

  // Get pure hire net for the line item breakdown
  const hireDetails = calculateRentalCostDetailed(
    sd, ed, rental.type, vehicle, rental.reason, rental.negotiatedRate ?? undefined,
    0, 0, 0, 0, 0, 0, false, false, false, false, false, false, false, 0, 0, rental.status,
    rental.lockedDailyRate, rental.lockedWeeklyRate, rental.lockedClaimRate, 0,
    [] // 👈 ADD THIS: Explicitly empty array so it calculates pure base
  );
  const netHireTotal = hireDetails.gross; // Gross = Net when VAT flags are false

  let netInsurance = 0;
  let insuranceDesc = 'Insurance';
  let insuranceRateDisplay = '0.00';
  let insuranceUnitDisplay = '0';

  if (rental.type === 'weekly') {
    const weeks = Math.ceil(calculatedDays / 7);
    netInsurance = netInsWeek * weeks;
    insuranceDesc = 'Insurance (Weekly)';
    insuranceRateDisplay = netInsWeek.toFixed(2);
    insuranceUnitDisplay = String(weeks);
  } else {
    netInsurance = netInsDay * calculatedDays;
    insuranceDesc = 'Insurance (Daily)';
    insuranceRateDisplay = netInsDay.toFixed(2);
    insuranceUnitDisplay = String(calculatedDays);
  }

  // Overdue
  const now = new Date();
  const showOverdue = rental.status === 'active' && isAfter(now, ed);
  const overdueUnits = showOverdue ? getOverdueUnits(rental, now) : 0;
  const overdueGross = showOverdue ? calculateOverdueCost(rental, now, vehicle) : 0;
  const netOverdue = rental.includeVAT ? overdueGross / 1.2 : overdueGross;
  const vatOverdue = overdueGross - netOverdue;

  // Return Charges
  const rc = rental.returnCondition;
  const returnFuelGross = rc?.fuelCharge || 0;
  const returnDamageGross = rc?.damageCost || 0;
  const returnCleaningGross = rc?.cleaningCharge || 0;
  
  const mainReturnCharges = rc?.totalCharges || 0;
  const subReturnCharges = (rental.hireSubstitutionDetails || []).reduce((acc, sub) => acc + (sub.returnCondition?.totalCharges || 0), 0);
  const returnTotalGross = mainReturnCharges + subReturnCharges;

  const netReturnTotal = rental.includeVAT ? returnTotalGross / 1.2 : returnTotalGross;
  const vatReturnTotal = returnTotalGross - netReturnTotal;
  
  const netReturnFuel = rental.includeVAT ? returnFuelGross / 1.2 : returnFuelGross;
  const netReturnDamage = rental.includeVAT ? returnDamageGross / 1.2 : returnDamageGross;
  const netReturnCleaning = rental.includeVAT ? returnCleaningGross / 1.2 : returnCleaningGross;

  // Aggregates
  const totalNetSubtotal = masterDetails.net + netOverdue + netReturnTotal;
  const totalVat = masterDetails.vat + vatOverdue + vatReturnTotal;
  const discountAmount = masterDetails.discountAmount;
  const grandTotal = masterDetails.gross + overdueGross + returnTotalGross;
  
  const paidRaw = (rental.paidAmount || 0);
  const remainingRaw = grandTotal - paidRaw;

  // Render individual extra charges for the breakdown table
  const extraChargeRows = (rental.extraCharges || []).map(charge => ({
    desc: `${charge.name}`,
    details: 'Extra Charge',
    rate: '',
    units: '',
    total: Number(charge.amount).toFixed(2),
  }));

  // ---------- Breakdown rows (Displaying NET Amounts) ----------
  const rows = [
    {
      desc: 'Hire Charges',
      details: `£${hireRate} per ${unit}`,
      rate: hireRate,
      units: hireUnits,
      total: netHireTotal.toFixed(2),
    },
    ...(storageNet > 0 ? [{ desc: 'Storage Charges', details: '', rate: '', units: '', total: storageNet.toFixed(2) }] : []),
    ...(netRecovery > 0 ? [{ desc: 'Recovery Charges', details: '', rate: '', units: '', total: netRecovery.toFixed(2) }] : []),
    ...(netDelivery > 0 ? [{ desc: 'Delivery Charges', details: '', rate: '', units: '', total: netDelivery.toFixed(2) }] : []),
    ...(netCollection > 0 ? [{ desc: 'Collection Charges', details: '', rate: '', units: '', total: netCollection.toFixed(2) }] : []),
    ...(netInsurance > 0 ? [{
          desc: insuranceDesc,
          details: rental.type === 'weekly' 
            ? `${insuranceUnitDisplay} week${insuranceUnitDisplay === '1' ? '' : 's'} cover`
            : `${insuranceUnitDisplay} day${insuranceUnitDisplay === '1' ? '' : 's'} cover`,
          rate: insuranceRateDisplay,
          units: insuranceUnitDisplay,
          total: netInsurance.toFixed(2),
        }] : []),
    ...extraChargeRows,
    ...(netOverdue > 0 ? [{
          desc: 'Overdue Charges',
          details: overdueUnits > 0 ? `${overdueUnits} ${unit}${overdueUnits === 1 ? '' : 's'}` : '',
          rate: '',
          units: overdueUnits > 0 ? String(overdueUnits) : '',
          total: netOverdue.toFixed(2),
        }] : []),
    ...(netReturnFuel > 0 ? [{ desc: 'Return – Fuel', details: '', rate: '', units: '', total: netReturnFuel.toFixed(2) }] : []),
    ...(netReturnDamage > 0 ? [{ desc: 'Return – Damage', details: '', rate: '', units: '', total: netReturnDamage.toFixed(2) }] : []),
    ...(netReturnCleaning > 0 ? [{ desc: 'Return – Cleaning', details: '', rate: '', units: '', total: netReturnCleaning.toFixed(2) }] : []),
  ];

  const paymentPages: Rental['payments'][] = [];
  if (rental.payments?.length) {
    for (let i = 0; i < rental.payments.length; i += 15) {
      paymentPages.push(rental.payments.slice(i, i + 15));
    }
  }

  const displayInvoiceNumber = rental.rentalAgreementNumber 
    ? `#${rental.rentalAgreementNumber}` 
    : `AIE-${rental.id.slice(-8).toUpperCase()}`;

  return (
    <Document>
      {/* --- PAGE 1: Invoice Details, Breakdown, and Compact Summary --- */}
      <Page size="A4" style={[styles.page, { paddingBottom: 40 }]}>
        <View style={styles.header} fixed>
          <View style={styles.headerLeft}>
            {companyDetails.logoUrl && <Image src={companyDetails.logoUrl} style={styles.logo} cache={false}/>}
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.companyName}>{companyDetails.fullName}</Text>
            <Text style={styles.companyDetail}>{companyDetails.officialAddress}</Text>
            <Text style={styles.companyDetail}>Tel: {companyDetails.phone}</Text>
            <Text style={styles.companyDetail}>Email: {companyDetails.email}</Text>
          </View>
        </View>

        <View style={styles.titleContainer}>
          <Text style={styles.title}>RENTAL INVOICE</Text>
        </View>

        {/* Horizontal Info Card */}
        <View style={localStyles.infoCard}>
          <View style={localStyles.infoItem}>
            <Text style={localStyles.infoLabel}>Invoice Number</Text>
            <Text style={localStyles.infoValue}>{displayInvoiceNumber}</Text>
          </View>
          <View style={localStyles.infoItem}>
            <Text style={localStyles.infoLabel}>Invoice Date</Text>
            <Text style={localStyles.infoValue}>{fmtDateTime(invoiceDate)}</Text>
          </View>
          <View style={localStyles.infoItem}>
            <Text style={localStyles.infoLabel}>Due Date</Text>
            <Text style={localStyles.infoValue}>{fmtDateTime(dueDate)}</Text>
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

        <View style={[styles.sectionBreak, { flexDirection: 'row', justifyContent: 'space-between', paddingBottom: 5, marginBottom: 5 }]} wrap={false}>
          <View style={[localStyles.compactSectionCard, { width: '48%' }]}>
            <Text style={styles.sectionTitle}>Bill To:</Text>
            <Text style={localStyles.compactText}>{customer.name}</Text>
            <Text style={localStyles.compactText}>{customer.address || 'N/A'}</Text>
            <Text style={localStyles.compactText}>{customer.mobile}</Text>
            <Text style={localStyles.compactText}>{customer.email}</Text>
          </View>
          <View style={[localStyles.compactSectionCard, { width: '48%' }]}>
            <Text style={styles.sectionTitle}>Vehicle Details:</Text>
            <Text style={localStyles.compactText}>{vehicle.make} {vehicle.model}</Text>
            <Text style={localStyles.compactText}>Reg: {vehicle.registrationNumber}</Text>
            <Text style={localStyles.compactText}>
              Mileage: {(rental.checkOutCondition?.mileage || vehicle.mileage || 0).toLocaleString()} miles
            </Text>
          </View>
        </View>

        {/* --- CHARGES BREAKDOWN TABLE (NET AMOUNTS) --- */}
        <View style={{ marginBottom: 10 }}>
          <Text style={[styles.sectionTitle, { marginBottom: 5 }]}>Rental Charges Breakdown (Excl. VAT)</Text>
          <View style={compactTableStyles.table} breakInside="avoid">
            <View style={compactTableStyles.headerRow}>
              <Text style={[compactTableStyles.headerCell, { flex: 2.2 }]}>Description</Text>
              <Text style={[compactTableStyles.headerCell, { flex: 2 }]}>Details</Text>
              <Text style={[compactTableStyles.headerCell, { flex: 0.8 }]}>Rate (£)</Text>
              <Text style={[compactTableStyles.headerCell, { flex: 0.8 }]}>Days/Units</Text>
              <Text style={[compactTableStyles.headerCell, { flex: 1 }]}>Total (£)</Text>
            </View>
            {rows.map((r, i) => (
              <View key={i} style={compactTableStyles.row}>
                <Text style={[compactTableStyles.cell, { flex: 2.2 }]}>{r.desc}</Text>
                <Text style={[compactTableStyles.cell, { flex: 2 }]}>{r.details}</Text>
                <Text style={[compactTableStyles.cell, { flex: 0.8 }]}>{r.rate}</Text>
                <Text style={[compactTableStyles.cell, { flex: 0.8 }]}>{r.units}</Text>
                <Text style={[compactTableStyles.cell, { flex: 1 }]}>£{r.total}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* --- SIDE BY SIDE: PAYMENT DETAILS & SUMMARY --- */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 }} wrap={false}>
          
          {/* Card 1: Payment Details */}
          <View style={[compactCardStyles.card, { width: '48%' }]}>
            <Text style={compactCardStyles.title}>Payment Details</Text>
            <View style={compactCardStyles.row}>
              <Text style={compactCardStyles.label}>Bank:</Text>
              <Text style={compactCardStyles.value}>{companyDetails?.bankName || 'LLOYDS BANK'}</Text>
            </View>
            <View style={compactCardStyles.row}>
              <Text style={compactCardStyles.label}>Account Name:</Text>
              <Text style={compactCardStyles.value}>{companyDetails?.fullName || 'AIE SKYLINE LIMITED'}</Text>
            </View>
            <View style={compactCardStyles.row}>
              <Text style={compactCardStyles.label}>Account Number:</Text>
              <Text style={compactCardStyles.value}>{companyDetails?.accountNumber || '30513162'}</Text>
            </View>
            <View style={compactCardStyles.row}>
              <Text style={compactCardStyles.label}>Sort Code:</Text>
              <Text style={compactCardStyles.value}>{companyDetails?.sortCode || '30-99-50'}</Text>
            </View>
            <View style={{ marginTop: 8 }}>
              <Text style={[compactCardStyles.label, { fontSize: 7.5, width: '100%', fontStyle: 'italic' }]}>
                Please use Invoice {displayInvoiceNumber} as reference.
              </Text>
            </View>
          </View>

          {/* Card 2: Summary */}
          <View style={[compactCardStyles.card, { width: '48%' }]}>
            <Text style={compactCardStyles.title}>Summary</Text>
            
            {/* Subtotal */}
            <View style={compactCardStyles.row}>
              <Text style={[compactCardStyles.label, { fontFamily: 'Helvetica-Bold', color: '#000' }]}>NET:</Text>
              <Text style={[compactCardStyles.value, { textAlign: 'right', fontFamily: 'Helvetica-Bold', color: '#000' }]}>
                £{(totalNetSubtotal + discountAmount).toFixed(2)}
              </Text>
            </View>

            {/* Discount */}
            {discountAmount > 0 && (
              <View style={compactCardStyles.row}>
                <Text style={[compactCardStyles.label, { color: 'red', fontFamily: 'Helvetica-Bold' }]}>Discount:</Text>
                <Text style={[compactCardStyles.value, { color: 'red', textAlign: 'right', fontFamily: 'Helvetica-Bold' }]}>
                  –£{discountAmount.toFixed(2)}
                </Text>
              </View>
            )}

            {/* VAT */}
            <View style={compactCardStyles.row}>
              <Text style={[compactCardStyles.label, { fontFamily: 'Helvetica-Bold', color: '#000' }]}>VAT:</Text>
              <Text style={[compactCardStyles.value, { textAlign: 'right', fontFamily: 'Helvetica-Bold', color: '#000' }]}>
                £{totalVat.toFixed(2)}
              </Text>
            </View>

            {/* Total */}
            <View style={[compactCardStyles.row, { marginTop: 4, borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingTop: 4 }]}>
              <Text style={[compactCardStyles.label, { fontFamily: 'Helvetica-Bold', color: '#000' }]}>Gross Total:</Text>
              <Text style={[compactCardStyles.value, { textAlign: 'right', fontFamily: 'Helvetica-Bold', color: '#000' }]}>
                £{grandTotal.toFixed(2)}
              </Text>
            </View>

            {/* Paid */}
            <View style={compactCardStyles.row}>
              <Text style={[compactCardStyles.label, { fontFamily: 'Helvetica-Bold', color: '#000' }]}>Paid:</Text>
              <Text style={[compactCardStyles.value, { textAlign: 'right', fontFamily: 'Helvetica-Bold', color: '#000' }]}>
                £{paidRaw.toFixed(2)}
              </Text>
            </View>

            {/* Owing */}
            <View style={compactCardStyles.row}>
              <Text style={[compactCardStyles.label, { color: remainingRaw > 0.001 ? '#DC2626' : '#16A34A', fontFamily: 'Helvetica-Bold' }]}>
                Owing:
              </Text>
              <Text style={[compactCardStyles.value, { textAlign: 'right', fontFamily: 'Helvetica-Bold', color: remainingRaw > 0.001 ? '#DC2626' : '#16A34A' }]}>
                £{Math.abs(remainingRaw).toFixed(2)}
              </Text>
            </View>
          </View>
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

      {/* Payment History Pages (Rendered BEFORE Terms & Conditions) */}
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

      {/* --- FINAL PAGE: Terms & Conditions --- */}
      <Page size="A4" style={styles.page}>
         <View style={styles.header} fixed>
          <View style={styles.headerLeft}>
            {companyDetails.logoUrl && <Image src={companyDetails.logoUrl} style={styles.logo} cache={false}/>}
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.companyName}>{companyDetails.fullName}</Text>
            <Text style={styles.companyDetail}>{companyDetails.officialAddress}</Text>
            <Text style={styles.companyDetail}>Tel: {companyDetails.phone}</Text>
            <Text style={styles.companyDetail}>Email: {companyDetails.email}</Text>
          </View>
        </View>

        <View style={{ marginTop: 0 }}>
          <Text style={tcStyles.termTitle}>Rental Invoice Terms</Text>

          {/* DYNAMIC TERMS INJECTED HERE */}
          <View style={tcStyles.termSection}>
            <Text style={tcStyles.termText}>
              {companyDetails.rentalInvoiceTerms || 'Standard terms and conditions apply. By signing below, the Hirer acknowledges and agrees to the terms set forth in this agreement.'}
            </Text>
          </View>
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
    </Document>
  );
};

export default RentalInvoice;

// Local styles
const localStyles = StyleSheet.create({
  infoCard: {
    borderWidth: 1,
    borderColor: '#3B82F6',
    borderRadius: 6,
    padding: 8,
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
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
  compactSectionCard: {
    backgroundColor: '#F9FAFB',
    padding: 6,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#438BDC',
  },
  compactText: {
    fontSize: 8,
    color: '#374151',
    lineHeight: 1.2,
    marginBottom: 1,
  },
  signatureSection: {
    marginTop: 5,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    breakInside: 'avoid',
  },
  compactBox: {
    padding: 5,
    width: '48%',
  },
  compactImage: {
    height: 25,
    marginVertical: 2,
    objectFit: 'contain',
  },
  compactLine: {
    marginTop: 2,
    marginBottom: 2,
    paddingTop: 2,
    fontSize: 9,
  },
});

const compactTableStyles = StyleSheet.create({
  table: { width: '100%', marginVertical: 4 },
  headerRow: {
    backgroundColor: '#3C9F2C',
    flexDirection: 'row',
    borderBottomColor: '#006A4E',
    borderBottomWidth: 1,
    paddingVertical: 5, 
    paddingHorizontal: 4,
  },
  headerCell: {
    textAlign: 'left',
    paddingHorizontal: 4,
    fontWeight: 'bold',
    fontSize: 9, 
    color: '#FFFFFF',
  },
  row: {
    flexDirection: 'row',
    borderBottomColor: '#E5E7EB',
    borderBottomWidth: 1,
    paddingVertical: 4, 
    minHeight: 18,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  cell: {
    textAlign: 'left',
    paddingHorizontal: 4,
    fontSize: 9, 
    color: '#374151',
  },
});

const compactCardStyles = StyleSheet.create({
  card: {
    backgroundColor: '#F9FAFB',
    padding: 10,
    marginBottom: 2,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#438BDC',
  },
  title: {
    fontSize: 10, 
    fontWeight: 'bold',
    marginBottom: 6,
    color: '#1E40AF',
    textTransform: 'uppercase',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  label: {
    fontSize: 8.5, 
    color: '#4B5563',
    width: '50%',
  },
  value: {
    fontSize: 8.5, 
    color: '#1F2937',
    textAlign: 'right',
    flex: 1,
  },
});

const tcStyles = StyleSheet.create({
  termTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 5,
    textDecoration: 'underline',
  },
  termSection: {
    marginBottom: 4, 
  },
  termHeader: {
    fontSize: 8, 
    fontWeight: 'bold',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  termText: {
    fontSize: 7, 
    marginBottom: 1,
    lineHeight: 1.3,
    textAlign: 'justify',
  },
  bullet: {
    marginLeft: 8,
  },
});