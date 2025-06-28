// src/components/pdf/RentalInvoice.tsx
import React from 'react';
import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';
import { Rental, Vehicle, Customer } from '../../types';
import { format, differenceInDays, isAfter } from 'date-fns';
import { styles } from './styles'; // Ensure this path is correct
import { calculateOverdueCost } from '../../utils/rentalCalculations';

interface RentalInvoiceProps {
  rental: Rental;
  vehicle: Vehicle;
  customer: Customer;
  companyDetails: {
    logoUrl?: string; // Added logoUrl
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
  const toDate = (d: any): Date | null => {
    if (!d) return null;
    if (d instanceof Date) return d;
    if (typeof d.toDate === 'function') return (d as any).toDate();
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? null : dt;
  };

  const fmtDateTime = (d: any) => {
    const dt = toDate(d);
    return dt ? format(dt, 'dd/MM/yyyy HH:mm') : 'N/A';
  };

  // Calculate days charged
  const sd = toDate(rental.startDate)!;
  const ed = toDate(rental.endDate)!;
  const days = sd && ed && !isAfter(sd, ed) ? differenceInDays(ed, sd) + 1 : 0;

  const showOverdue = rental.status !== 'completed' && ed && isAfter(new Date(), ed);
  
  // Effective rates (these are assumed to be NET rates from the database/vehicle)
  const effectiveDailyRate = rental.negotiatedRate ?? vehicle.dailyRentalPrice ?? 0;
  const effectiveWeeklyRate = rental.negotiatedRate ?? vehicle.weeklyRentalPrice ?? 0;
  const effectiveClaimRate = rental.negotiatedRate ?? vehicle.claimRentalPrice ?? 0;

  const dailyRate = parseFloat(effectiveDailyRate.toFixed(2));
  const weeklyRate = parseFloat(effectiveWeeklyRate.toFixed(2));
  const perDayForClaim = parseFloat(effectiveClaimRate.toFixed(2));

  // Determine NET hire total for table and overall calculation
  let netHireTotal: number;
  let hireUnits: string;
  let hireRate: string;
  if (rental.type === 'weekly') {
    const weeks = Math.ceil(days / 7);
    netHireTotal = parseFloat((weeks * weeklyRate).toFixed(2));
    hireUnits = `${weeks} week${weeks > 1 ? 's' : ''}`;
    hireRate = weeklyRate.toFixed(2);
  } else if (rental.type === 'claim') {
    netHireTotal = parseFloat((days * perDayForClaim).toFixed(2));
    hireUnits = `${days} day${days > 1 ? 's' : ''}`;
    hireRate = perDayForClaim.toFixed(2);
  } else {
    netHireTotal = parseFloat((days * dailyRate).toFixed(2));
    hireUnits = `${days} day${days > 1 ? 's' : ''}`;
    hireRate = dailyRate.toFixed(2);
  }

  // Define NET amounts for each charge component for table display and overall NET sum
  const netStorageCost = parseFloat((rental.storageCost || 0).toFixed(2)); // Assuming storageCost is stored as net
  const netRecoveryCost = parseFloat((rental.recoveryCost || 0).toFixed(2)); // Assuming recoveryCost is stored as net
  const netDeliveryCost = parseFloat((rental.deliveryCharge || 0).toFixed(2)); // Assuming deliveryCharge is stored as net
  const netCollectionCost = parseFloat((rental.collectionCharge || 0).toFixed(2)); // Assuming collectionCharge is stored as net
  const netInsuranceTotal = parseFloat(((days * (rental.insurancePerDay || 0))).toFixed(2)); // Assuming insurancePerDay is stored as net

  // Calculate NET overdue charges
  let netOngoingCost = 0;
  if (showOverdue && sd && ed) {
    const rawOverdueCost = calculateOverdueCost(rental, new Date(), vehicle); // This function might return VAT-inclusive value based on rental.includeVAT
    // If rawOverdueCost already includes VAT due to rental.includeVAT, we need to net it out for the component sum
    netOngoingCost = rental.includeVAT ? rawOverdueCost / 1.2 : rawOverdueCost;
  }
  netOngoingCost = parseFloat(netOngoingCost.toFixed(2));


  // Sum of all NET charges (before overall invoice VAT and before discount)
  let subtotalBeforeOverallVAT =
    netHireTotal +
    netStorageCost +
    netRecoveryCost +
    netDeliveryCost +
    netCollectionCost +
    netInsuranceTotal +
    netOngoingCost;

  subtotalBeforeOverallVAT = parseFloat(subtotalBeforeOverallVAT.toFixed(2));


  const discountAmount = rental.discountAmount
    ? parseFloat(rental.discountAmount.toFixed(2))
    : 0;

  const subtotalAfterDiscount = parseFloat((subtotalBeforeOverallVAT - discountAmount).toFixed(2));

  // Grand Total calculation (applying overall invoice VAT if applicable)
  const grandTotal = parseFloat((subtotalAfterDiscount * (rental.includeVAT ? 1.2 : 1)).toFixed(2));

  // VAT amount for the overall invoice
  const vatAmount = parseFloat(
    (rental.includeVAT ? (grandTotal - subtotalAfterDiscount) : 0).toFixed(2)
  );

  // Paid and Owing calculations based on the final grandTotal
  const paid = parseFloat(
    ((rental.payments?.reduce((sum, p) => sum + p.amount, 0) || 0) +
      (rental.paidAmount && rental.payments?.length === 0 ? rental.paidAmount : 0)).toFixed(2)
  );
  const owing = parseFloat((grandTotal - paid).toFixed(2));

  // Build rows for the Rental Charges Breakdown table using NET amounts
  const rows = [
    {
      desc: 'Hire Charges',
      details: `£${hireRate} per ${rental.type === 'weekly' ? 'week' : 'day'}`,
      rate: hireRate,
      units: hireUnits,
      total: netHireTotal.toFixed(2),
    },
    ...(netStorageCost > 0
      ? [
          {
            desc: `Storage Charges`, // Removed "(Inc. VAT)" to show net in table
            details: '',
            rate: '',
            units: '',
            total: netStorageCost.toFixed(2),
          },
        ]
      : []),
    ...(netRecoveryCost > 0
      ? [
          {
            desc: `Recovery Charges`, // Removed "(Inc. VAT)" to show net in table
            details: '',
            rate: '',
            units: '',
            total: netRecoveryCost.toFixed(2),
          },
        ]
      : []),
    ...(netDeliveryCost > 0
      ? [
          {
            desc: `Delivery Charges`, // Removed "(Inc. VAT)" to show net in table
            details: '',
            rate: '',
            units: '',
            total: netDeliveryCost.toFixed(2),
          },
        ]
      : []),
    ...(netCollectionCost > 0
      ? [
          {
            desc: `Collection Charges`, // Removed "(Inc. VAT)" to show net in table
            details: '',
            rate: '',
            units: '',
            total: netCollectionCost.toFixed(2),
          },
        ]
      : []),
    ...(netInsuranceTotal > 0
      ? [
          {
            desc: `Insurance`, // Removed "(Inc. VAT)" to show net in table
            details: `${days} day${days > 1 ? 's' : ''} cover`,
            rate: (rental.insurancePerDay || 0).toFixed(2),
            units: String(days),
            total: netInsuranceTotal.toFixed(2),
          },
        ]
      : []),
    ...(netOngoingCost > 0
      ? [
          {
            desc: 'Overdue Charges',
            details: '',
            rate: '',
            units: '',
            total: netOngoingCost.toFixed(2),
          },
        ]
      : []),
    ...(discountAmount > 0
      ? [
          {
            desc: 'Discount',
            details: rental.discountPercentage
              ? `${rental.discountPercentage.toFixed(2)}%`
              : 'Fixed Discount',
            rate: '',
            units: '',
            total: (-discountAmount).toFixed(2),
          },
        ]
      : []),
  ].filter(Boolean);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header - Standardized header */}
        <View style={styles.header} fixed>
          <View style={styles.headerLeft}>
            {companyDetails?.logoUrl && (
              <Image src={companyDetails.logoUrl} style={styles.logo} />
            )}
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.companyName}>{companyDetails?.fullName || 'AIE Skyline Limited'}</Text>
            <Text style={styles.companyDetail}>{companyDetails?.officialAddress || 'N/A'}</Text>
            <Text style={styles.companyDetail}>Tel: {companyDetails?.phone || 'N/A'}</Text>
            <Text style={styles.companyDetail}>Email: {companyDetails?.email || 'N/A'}</Text>
          </View>
        </View>

        {/* Title */}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>RENTAL INVOICE</Text>
        </View>

        {/* Invoice Info (Horizontal Card) */}
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
            <Text>
              {vehicle.make} {vehicle.model}
            </Text>
            <Text>Reg: {vehicle.registrationNumber}</Text>
            <Text>
              Mileage: {(rental.checkOutCondition?.mileage || vehicle.mileage || 0).toLocaleString()} miles
            </Text>
          </View>
        </View>

        {/* Rental Charges Breakdown */}
         <View style={styles.section}>
          <Text style={styles.sectionTitle}>Rental Charges Breakdown</Text>
          <View style={styles.table} breakInside="avoid"> {/* Added breakInside="avoid" to help keep table together */}
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

        {/* Payment History */}
        {rental.payments?.length > 0 && (
          <View style={[styles.section, styles.sectionBreak]}>
            <Text style={styles.sectionTitle}>Payment History</Text>
            <View style={styles.table} breakInside="avoid">
              <View style={styles.tableHeader} fixed> {/* Added fixed prop to repeat header on new page */}
                {['Date', 'Type', 'Ref', 'Amount'].map((h, i) => (
                  <Text key={i} style={[styles.tableCell, { flex: 1 }]}>
                    {h}
                  </Text>
                ))}
              </View>
              {rental.payments.map((p, i) => (
                <View key={i} style={styles.tableRow}>
                  <Text style={[styles.tableCell, { flex: 1 }]}>{fmtDateTime(p.date)}</Text>
                  <Text style={[styles.tableCell, { flex: 1 }]}>
                    {p.method.replace('_', ' ').toUpperCase()}
                  </Text>
                  <Text style={[styles.tableCell, { flex: 1 }]}>{p.reference || 'N/A'}</Text>
                  <Text style={[styles.tableCell, { flex: 1 }]}>£{(p.amount || 0).toFixed(2)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Payment Terms */}
        <View style={[styles.section, styles.sectionBreak]}>
          <View breakInside="avoid"> {/* Ensures title and first line of text start on the same page */}
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
          <View style={[styles.card, { width: '48%' }]}>
            <Text style={styles.sectionTitle}>Summary</Text>
            <View style={styles.spaceBetweenRow}>
              <Text style={styles.label}>Rate:</Text>
              <Text style={[styles.value, { textAlign: 'right' }]}>
                £{subtotalBeforeOverallVAT.toFixed(2)}
              </Text>
            </View>
            {discountAmount > 0 && (
              <View style={styles.spaceBetweenRow}>
                <Text style={[styles.label, { color: 'red' }]}>Discount:</Text>
                <Text style={[styles.value, { color: 'red', textAlign: 'right' }]}>
                  –£{discountAmount.toFixed(2)}
                </Text>
              </View>
            )}
            <View style={styles.spaceBetweenRow}>
              <Text style={styles.label}>NET:</Text>
              <Text style={[styles.value, { textAlign: 'right' }]}>
                £{subtotalAfterDiscount.toFixed(2)}
              </Text>
            </View>
            {rental.includeVAT && (
              <View style={styles.spaceBetweenRow}>
                <Text style={[styles.label, { color: '#2563EB' }]}>VAT (20%):</Text>
                <Text style={[styles.value, { color: '#2563EB', textAlign: 'right' }]}>
                  £{vatAmount.toFixed(2)}
                </Text>
              </View>
            )}
            <View style={styles.spaceBetweenRow}>
              <Text style={styles.label}>Total:</Text>
              <Text style={[styles.value, { textAlign: 'right' }]}>
                £{grandTotal.toFixed(2)}
              </Text>
            </View>
            <View style={styles.spaceBetweenRow}>
              <Text style={styles.label}>Paid:</Text>
              <Text style={[styles.value, { textAlign: 'right' }]}>
                £{paid.toFixed(2)}
              </Text>
            </View>
            <View style={styles.spaceBetweenRow}>
              <Text style={[styles.label, { color: owing > 0 ? '#DC2626' : '#16A34A' }]}>Owing:</Text>
              <Text style={[styles.value, { textAlign: 'right', color: owing > 0 ? '#DC2626' : '#16A34A' }]}>
                £{owing.toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

        {/* Footer - Standardized footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            AIE SKYLINE LIMITED, registered in England and Wales with the company registration number 15616639, registered office address: United House, 39-41 North Road, London, N7 9DP. VAT. NO. 453448875
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