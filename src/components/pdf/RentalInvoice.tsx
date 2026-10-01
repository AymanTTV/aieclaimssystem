// src/components/pdf/RentalInvoice.tsx
import React from 'react';
import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';
import { Rental, Vehicle, Customer } from '../../types';
import { format, differenceInHours, isAfter } from 'date-fns';
import { resolveNameFields, resolveAddressFields } from '../../utils/nameAddressUtils';
import { formatInlineCompanyFooter } from '../../utils/legalDocumentUtils';
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

  const page1Entity = (companyDetails as any)?.page1Entity || companyDetails;
  const page2Entity = (companyDetails as any)?.page2Entity || companyDetails;
  const page3Entity = (companyDetails as any)?.page3Entity || companyDetails;

  const pageMapping = (companyDetails as any)?.pageTemplateMapping;
  const page1Template = pageMapping?.page1Template || 'standard_rental_invoice';
  const page2Template = pageMapping?.page2Template || 'itemized_line_breakdown';
  const page3Template = pageMapping?.page3Template || 'rental_invoice_terms';

  const isCompany = customer?.type === 'company';
  const nameFields = resolveNameFields(customer);
  const addressFields = resolveAddressFields(customer);

  const page1FooterText = formatInlineCompanyFooter(page1Entity);
  const page2FooterText = formatInlineCompanyFooter(page2Entity);
  const page3FooterText = formatInlineCompanyFooter(page3Entity);

  const invoiceTitle = page1Template === 'credit_hire_settlement_invoice'
    ? 'CREDIT HIRE SETTLEMENT INVOICE'
    : 'RENTAL INVOICE';

  return (
    <Document>
      {/* --- PAGE 1: Invoice Details, Breakdown, and Compact Summary --- */}
      <Page size="A4" style={[styles.page, { paddingBottom: 40 }]}>
        <View style={styles.header} fixed>
          <View style={styles.headerLeft}>
            {isValidPdfImageSrc(page1Entity?.logoUrl) && (
              <Image src={page1Entity.logoUrl} style={styles.logo} cache={false} />
            )}
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.companyName}>{page1Entity.fullName || 'AIE Skyline Limited'}</Text>
            {Boolean(page1Entity?.headerDisclaimer || companyDetails?.customHeaderText) && (
              <Text style={[styles.companyDetail, { fontStyle: 'italic', color: '#4B5563', marginBottom: 2 }]}>
                {page1Entity?.headerDisclaimer || companyDetails?.customHeaderText}
              </Text>
            )}
            <Text style={styles.companyDetail}>{page1Entity.officialAddress}</Text>
            <Text style={styles.companyDetail}>Tel: {page1Entity.phone}</Text>
            <Text style={styles.companyDetail}>Email: {page1Entity.email}</Text>
          </View>
        </View>

        <View style={styles.titleContainer}>
          <Text style={styles.title}>{invoiceTitle}</Text>
          {page1Template === 'credit_hire_settlement_invoice' && (
            <Text style={{ fontSize: 8, color: '#DC2626', fontWeight: 'bold', marginTop: 3 }}>
              ★ Insurer Subrogation &amp; Credit Hire Settlement Claim Ledger
            </Text>
          )}
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
            {isCompany ? (
              <View style={localStyles.detailRow}>
                <Text style={localStyles.detailLabel}>Company Name:</Text>
                <Text style={localStyles.detailValue}>{customer.name || '-'}</Text>
              </View>
            ) : (
              <>
                <View style={localStyles.detailRow}>
                  <Text style={localStyles.detailLabel}>First Name:</Text>
                  <Text style={localStyles.detailValue}>{nameFields.firstName || '-'}</Text>
                </View>
                <View style={localStyles.detailRow}>
                  <Text style={localStyles.detailLabel}>Middle Name:</Text>
                  <Text style={localStyles.detailValue}>{nameFields.middleName || '-'}</Text>
                </View>
                <View style={localStyles.detailRow}>
                  <Text style={localStyles.detailLabel}>Last Name:</Text>
                  <Text style={localStyles.detailValue}>{nameFields.lastName || '-'}</Text>
                </View>
              </>
            )}
            <View style={localStyles.detailRow}>
              <Text style={localStyles.detailLabel}>Building / Flat:</Text>
              <Text style={localStyles.detailValue}>{addressFields.buildingFlat || '-'}</Text>
            </View>
            <View style={localStyles.detailRow}>
              <Text style={localStyles.detailLabel}>Street Name:</Text>
              <Text style={localStyles.detailValue}>{addressFields.streetName || '-'}</Text>
            </View>
            <View style={localStyles.detailRow}>
              <Text style={localStyles.detailLabel}>Town / City:</Text>
              <Text style={localStyles.detailValue}>{addressFields.townCity || '-'}</Text>
            </View>
            <View style={localStyles.detailRow}>
              <Text style={localStyles.detailLabel}>Postcode:</Text>
              <Text style={localStyles.detailValue}>{addressFields.postcode || '-'}</Text>
            </View>
            <View style={localStyles.detailRow}>
              <Text style={localStyles.detailLabel}>Country:</Text>
              <Text style={localStyles.detailValue}>{addressFields.country || '-'}</Text>
            </View>
          </View>
          <View style={[localStyles.compactSectionCard, { width: '48%' }]}>
            <Text style={styles.sectionTitle}>Vehicle Details:</Text>
            <View style={localStyles.detailRow}>
              <Text style={localStyles.detailLabel}>Make & Model:</Text>
              <Text style={localStyles.detailValue}>{vehicle.make} {vehicle.model}</Text>
            </View>
            <View style={localStyles.detailRow}>
              <Text style={localStyles.detailLabel}>Registration:</Text>
              <Text style={localStyles.detailValue}>{vehicle.registrationNumber}</Text>
            </View>
            <View style={localStyles.detailRow}>
              <Text style={localStyles.detailLabel}>Mileage:</Text>
              <Text style={localStyles.detailValue}>
                {(rental.checkOutCondition?.mileage || vehicle.mileage || 0).toLocaleString()} miles
              </Text>
            </View>
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
          {(() => {
            const activeBank =
              (companyDetails as any)?.selectedBank ||
              (rental as any)?.bankAllocation || {
                bankName: (rental as any)?.bankName || companyDetails?.bankName,
                accountName: (rental as any)?.accountName || companyDetails?.accountName || companyDetails?.fullName,
                accountNumber: (rental as any)?.accountNumber || companyDetails?.accountNumber,
                sortCode: (rental as any)?.sortCode || companyDetails?.sortCode,
                iban: (rental as any)?.iban || companyDetails?.iban,
              };

            const qrCodeUrl =
              (companyDetails as any)?.paymentQrCodeDataUrl ||
              (rental as any)?.paymentQrCodeDataUrl;
            const showQr = (companyDetails as any)?.includePaymentQr !== false && Boolean(qrCodeUrl);

            return (
              <View style={[compactCardStyles.card, { width: '48%' }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                  <Text style={compactCardStyles.title}>Payment Details</Text>
                  {showQr && (
                    <Text style={{ fontSize: 6.5, color: '#4338CA', fontFamily: 'Helvetica-Bold' }}>
                      SCAN TO PAY
                    </Text>
                  )}
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1, marginRight: showQr ? 6 : 0 }}>
                    <View style={compactCardStyles.row}>
                      <Text style={compactCardStyles.label}>Bank:</Text>
                      <Text style={compactCardStyles.value}>
                        {activeBank.bankName || 'LLOYDS BANK'}
                      </Text>
                    </View>
                    <View style={compactCardStyles.row}>
                      <Text style={compactCardStyles.label}>Account Name:</Text>
                      <Text style={compactCardStyles.value}>
                        {activeBank.accountName || companyDetails?.fullName || 'AIE SKYLINE LIMITED'}
                      </Text>
                    </View>
                    <View style={compactCardStyles.row}>
                      <Text style={compactCardStyles.label}>Account Number:</Text>
                      <Text style={compactCardStyles.value}>
                        {activeBank.accountNumber || '30513162'}
                      </Text>
                    </View>
                    <View style={compactCardStyles.row}>
                      <Text style={compactCardStyles.label}>Sort Code:</Text>
                      <Text style={compactCardStyles.value}>
                        {activeBank.sortCode || '30-99-50'}
                      </Text>
                    </View>
                    {(activeBank.iban || (rental as any)?.bankAllocation?.iban || companyDetails?.iban) && (
                      <View style={compactCardStyles.row}>
                        <Text style={compactCardStyles.label}>IBAN:</Text>
                        <Text style={compactCardStyles.value}>
                          {activeBank.iban || (rental as any)?.bankAllocation?.iban || companyDetails?.iban}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* QR Code Container */}
                  {showQr && (
                    <View style={{ alignItems: 'center', width: 54, flexShrink: 0, marginTop: 1 }}>
                      <View style={{ padding: 2, backgroundColor: '#FFFFFF', borderWidth: 0.5, borderColor: '#CBD5E1', borderRadius: 3 }}>
                        <Image src={qrCodeUrl!} style={{ width: 48, height: 48 }} />
                      </View>
                      <Text style={{ fontSize: 5.5, color: '#64748B', marginTop: 2, textAlign: 'center' }}>
                        Mobile Banking
                      </Text>
                    </View>
                  )}
                </View>

                <View style={{ marginTop: 6, borderTopWidth: 0.5, borderTopColor: '#E2E8F0', paddingTop: 2 }}>
                  <Text style={[compactCardStyles.label, { fontSize: 7, width: '100%', fontStyle: 'italic' }]}>
                    Please use Invoice {displayInvoiceNumber} as reference.
                  </Text>
                </View>
              </View>
            );
          })()}

          {/* Card 2: Summary */}
          <View style={[compactCardStyles.card, { width: '48%' }]}>
            <Text style={compactCardStyles.title}>Summary</Text>
            
            {/* Subtotal - NET: #000000 */}
            <View style={compactCardStyles.row}>
              <Text style={[compactCardStyles.label, { fontFamily: 'Helvetica-Bold', color: '#000000' }]}>NET:</Text>
              <Text style={[compactCardStyles.value, { textAlign: 'right', fontFamily: 'Helvetica-Bold', color: '#000000' }]}>
                £{(totalNetSubtotal + discountAmount).toFixed(2)}
              </Text>
            </View>

            {/* Discount */}
            {discountAmount > 0 && (
              <View style={compactCardStyles.row}>
                <Text style={[compactCardStyles.label, { color: '#D97706', fontFamily: 'Helvetica-Bold' }]}>Discount:</Text>
                <Text style={[compactCardStyles.value, { color: '#D97706', textAlign: 'right', fontFamily: 'Helvetica-Bold' }]}>
                  –£{discountAmount.toFixed(2)}
                </Text>
              </View>
            )}

            {/* VAT - VAT: #2563EB */}
            <View style={compactCardStyles.row}>
              <Text style={[compactCardStyles.label, { fontFamily: 'Helvetica-Bold', color: '#2563EB' }]}>VAT:</Text>
              <Text style={[compactCardStyles.value, { textAlign: 'right', fontFamily: 'Helvetica-Bold', color: '#2563EB' }]}>
                £{totalVat.toFixed(2)}
              </Text>
            </View>

            {/* Total - Gross Total: #D97706 */}
            <View style={[compactCardStyles.row, { marginTop: 4, borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingTop: 4 }]}>
              <Text style={[compactCardStyles.label, { fontFamily: 'Helvetica-Bold', color: '#D97706' }]}>Gross Total:</Text>
              <Text style={[compactCardStyles.value, { textAlign: 'right', fontFamily: 'Helvetica-Bold', color: '#D97706' }]}>
                £{grandTotal.toFixed(2)}
              </Text>
            </View>

            {/* Paid - Paid: #15803D */}
            <View style={compactCardStyles.row}>
              <Text style={[compactCardStyles.label, { fontFamily: 'Helvetica-Bold', color: '#15803D' }]}>Paid:</Text>
              <Text style={[compactCardStyles.value, { textAlign: 'right', fontFamily: 'Helvetica-Bold', color: '#15803D' }]}>
                £{paidRaw.toFixed(2)}
              </Text>
            </View>

            {/* Owing - Owing: #DC2626 */}
            <View style={compactCardStyles.row}>
              <Text style={[compactCardStyles.label, { color: remainingRaw > 0.001 ? '#DC2626' : '#15803D', fontFamily: 'Helvetica-Bold' }]}>
                Owing:
              </Text>
              <Text style={[compactCardStyles.value, { textAlign: 'right', fontFamily: 'Helvetica-Bold', color: remainingRaw > 0.001 ? '#DC2626' : '#15803D' }]}>
                £{Math.abs(remainingRaw).toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>{page1FooterText}</Text>
          <Text
            style={styles.pageNumber}
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
          />
        </View>
      </Page>

      {/* Payment History Pages (Rendered BEFORE Terms & Conditions) */}
      {paymentPages.map((pagePayments, idx) => (
        <Page key={idx} size="A4" style={styles.page}>
          <View style={styles.header} fixed>
            <View style={styles.headerLeft}>
              {isValidPdfImageSrc(page2Entity?.logoUrl) && (
                <Image src={page2Entity.logoUrl} style={styles.logo} cache={false} />
              )}
            </View>
            <View style={styles.headerRight}>
              <Text style={styles.companyName}>{page2Entity.fullName || 'AIE Skyline Limited'}</Text>
              <Text style={styles.companyDetail}>{page2Entity.officialAddress}</Text>
              <Text style={styles.companyDetail}>Tel: {page2Entity.phone}</Text>
              <Text style={styles.companyDetail}>Email: {page2Entity.email}</Text>
            </View>
          </View>

          <Text style={[styles.sectionTitle, { marginTop: 10 }]}>Payment History &amp; Remittance Schedule</Text>
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
            <Text style={styles.footerText}>{page2FooterText}</Text>
            <Text 
              style={styles.pageNumber} 
              render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} 
            />
          </View>
        </Page>
      ))}

      {/* --- FINAL PAGE: Terms & Conditions --- */}
      {companyDetails?.includeTrailingTC !== false && (
        <Page size="A4" style={styles.page}>
           <View style={styles.header} fixed>
            <View style={styles.headerLeft}>
              {isValidPdfImageSrc(page3Entity?.logoUrl) && (
                <Image src={page3Entity.logoUrl} style={styles.logo} cache={false} />
              )}
            </View>
            <View style={styles.headerRight}>
              <Text style={styles.companyName}>{page3Entity.fullName || 'AIE Skyline Limited'}</Text>
              {Boolean(page3Entity?.headerDisclaimer || companyDetails?.customHeaderText) && (
                <Text style={[styles.companyDetail, { fontStyle: 'italic', color: '#4B5563', marginBottom: 2 }]}>
                  {page3Entity?.headerDisclaimer || companyDetails?.customHeaderText}
                </Text>
              )}
              <Text style={styles.companyDetail}>{page3Entity.officialAddress}</Text>
              <Text style={styles.companyDetail}>Tel: {page3Entity.phone}</Text>
              <Text style={styles.companyDetail}>Email: {page3Entity.email}</Text>
            </View>
          </View>

          <View style={{ marginTop: 10 }}>
            <Text style={tcStyles.termTitle}>
              {page3Template === 'strict_net30_terms'
                ? 'COMMERCIAL DEBT RECOVERY & NET-30 TERMS'
                : companyDetails.customTermsTitle || 'Rental Invoice Terms'}
            </Text>

            {/* DYNAMIC TERMS INJECTED HERE */}
            <View style={tcStyles.termSection}>
              {(page3Template === 'strict_net30_terms'
                ? '1. PAYMENT WINDOW & STATUTORY INTEREST: Payment is due strictly within 30 calendar days from invoice date. Under the Late Payment of Commercial Debts (Interest) Act 1998, statutory interest at 8% plus Bank of England base rate applies to overdue balances.\n2. COMPENSATION & DEBT RECOVERY: The Creditor reserves statutory compensation entitlement (£40 - £100 per late invoice) and all third-party legal recovery disbursements.\n3. DISPUTE TIMELINE: Any billing dispute must be registered in writing within 7 business days of receipt.'
                : companyDetails.customTermsText || companyDetails.rentalInvoiceTerms || 'Standard terms and conditions apply. By signing below, the Hirer acknowledges and agrees to the terms set forth in this agreement.'
              )
                .split(/\r?\n+/)
                .map((para: string, idx: number) => (
                  <Text key={idx} style={[tcStyles.termText, { marginBottom: 5 }]}>
                    {para.trim()}
                  </Text>
                ))}
            </View>
          </View>

          <View style={styles.footer} fixed>
            <Text style={styles.footerText}>{page3FooterText}</Text>
            <Text
              style={styles.pageNumber}
              render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
            />
          </View>
        </Page>
      )}
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
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 1.5,
  },
  detailLabel: {
    fontSize: 7.5,
    fontWeight: 'bold',
    color: '#1E40AF',
    width: '42%',
  },
  detailValue: {
    fontSize: 7.5,
    color: '#374151',
    flex: 1,
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