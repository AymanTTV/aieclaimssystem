// src/components/pdf/RentalInvoice.tsx
import React from 'react';
import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';
import { Rental, Vehicle, Customer } from '../../types';
import { format, differenceInDays, isAfter } from 'date-fns';
import logo from '../../assets/logo.png';
import { styles } from './styles';
import { calculateOverdueCost } from '../../utils/rentalCalculations';

interface RentalInvoiceProps {
  rental: Rental;
  vehicle: Vehicle;
  customer: Customer;
  companyDetails: {
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
  const ongoing = parseFloat(
    (showOverdue && sd && ed ? calculateOverdueCost(rental, new Date(), vehicle) : 0).toFixed(2)
  );

  // Effective rates
  const effectiveDailyRate = rental.negotiatedRate ?? vehicle.dailyRentalPrice ?? 0;
  const effectiveWeeklyRate = rental.negotiatedRate ?? vehicle.weeklyRentalPrice ?? 0;
  const effectiveClaimRate = rental.negotiatedRate ?? vehicle.claimRentalPrice ?? 0;

  const dailyRate = parseFloat(effectiveDailyRate.toFixed(2));
  const weeklyRate = parseFloat(effectiveWeeklyRate.toFixed(2));
  const perDayForClaim = parseFloat(effectiveClaimRate.toFixed(2));

  // Determine hire total
  let hireTotal: number;
  let hireUnits: string;
  let hireRate: string;
  if (rental.type === 'weekly') {
    const weeks = Math.ceil(days / 7);
    hireTotal = parseFloat((weeks * weeklyRate).toFixed(2));
    hireUnits = `${weeks} week${weeks > 1 ? 's' : ''}`;
    hireRate = weeklyRate.toFixed(2);
  } else if (rental.type === 'claim') {
    hireTotal = parseFloat((days * perDayForClaim).toFixed(2));
    hireUnits = `${days} day${days > 1 ? 's' : ''}`;
    hireRate = perDayForClaim.toFixed(2);
  } else {
    hireTotal = parseFloat((days * dailyRate).toFixed(2));
    hireUnits = `${days} day${days > 1 ? 's' : ''}`;
    hireRate = dailyRate.toFixed(2);
  }

  const storageWithVAT = parseFloat((rental.storageCost || 0).toFixed(2));
  const recoveryWithVAT = parseFloat(
    ((rental.recoveryCost || 0) * (rental.includeRecoveryCostVAT ? 1.2 : 1)).toFixed(2)
  );
  const deliveryWithVAT = parseFloat(
    ((rental.deliveryCharge || 0) * (rental.deliveryChargeIncludeVAT ? 1.2 : 1)).toFixed(2)
  );
  const collectionWithVAT = parseFloat(
    ((rental.collectionCharge || 0) * (rental.collectionChargeIncludeVAT ? 1.2 : 1)).toFixed(2)
  );
  const insuranceWithVAT = parseFloat(
    ((days * (rental.insurancePerDay || 0)) * (rental.insurancePerDayIncludeVAT ? 1.2 : 1)).toFixed(2)
  );

  const subtotalBeforeOverallVAT = parseFloat(
    (
      hireTotal +
      storageWithVAT +
      recoveryWithVAT +
      deliveryWithVAT +
      collectionWithVAT +
      insuranceWithVAT +
      ongoing
    ).toFixed(2)
  );
  const roundedSubtotal = parseFloat(subtotalBeforeOverallVAT.toFixed(2));

  const discountAmount = rental.discountAmount
    ? parseFloat(rental.discountAmount.toFixed(2))
    : 0;
  const subtotalAfterDiscount = parseFloat((roundedSubtotal - discountAmount).toFixed(2));
  const grandTotal = parseFloat((subtotalAfterDiscount * (rental.includeVAT ? 1.2 : 1)).toFixed(2));
  const vatAmount = parseFloat(
    (rental.includeVAT ? (grandTotal - subtotalAfterDiscount) : 0).toFixed(2)
  );

  const paid = parseFloat(
    ((rental.payments?.reduce((sum, p) => sum + p.amount, 0) || 0) +
      (rental.paidAmount && rental.payments?.length === 0 ? rental.paidAmount : 0)).toFixed(2)
  );
  const owing = parseFloat((grandTotal - paid).toFixed(2));

  // Build rows
  const rows = [
    {
      desc: 'Hire Charges',
      details: `£${hireRate} per ${rental.type === 'weekly' ? 'week' : 'day'}`,
      rate: hireRate,
      units: hireUnits,
      total: hireTotal.toFixed(2),
    },
    ...(storageWithVAT > 0
      ? [
          {
            desc: `Storage Charges${rental.storageCost && rental.includeStorageVAT ? ' (Inc. VAT)' : ''}`,
            details: '',
            rate: '',
            units: '',
            total: storageWithVAT.toFixed(2),
          },
        ]
      : []),
    ...(recoveryWithVAT > 0
      ? [
          {
            desc: `Recovery Charges${rental.includeRecoveryCostVAT ? ' (Inc. VAT)' : ''}`,
            details: '',
            rate: '',
            units: '',
            total: recoveryWithVAT.toFixed(2),
          },
        ]
      : []),
    ...(deliveryWithVAT > 0
      ? [
          {
            desc: `Delivery Charges${rental.deliveryChargeIncludeVAT ? ' (Inc. VAT)' : ''}`,
            details: '',
            rate: '',
            units: '',
            total: deliveryWithVAT.toFixed(2),
          },
        ]
      : []),
    ...(collectionWithVAT > 0
      ? [
          {
            desc: `Collection Charges${rental.collectionChargeIncludeVAT ? ' (Inc. VAT)' : ''}`,
            details: '',
            rate: '',
            units: '',
            total: collectionWithVAT.toFixed(2),
          },
        ]
      : []),
    ...(insuranceWithVAT > 0
      ? [
          {
            desc: `Insurance${rental.insurancePerDayIncludeVAT ? ' (Inc. VAT)' : ''}`,
            details: `${days} day${days > 1 ? 's' : ''} cover`,
            rate: (rental.insurancePerDay || 0).toFixed(2),
            units: String(days),
            total: insuranceWithVAT.toFixed(2),
          },
        ]
      : []),
    ...(showOverdue && ongoing > 0
      ? [
          {
            desc: 'Overdue Charges',
            details: '',
            rate: '',
            units: '',
            total: ongoing.toFixed(2),
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
        {/* Header */}
        <View style={styles.header} fixed>
          {typeof logo === 'string' && <Image src={logo} style={styles.logo} />}
          <View style={styles.companyInfo}>
            <Text>{companyDetails.fullName}</Text>
            <Text>{companyDetails.officialAddress}</Text>
            <Text>Tel: {companyDetails.phone}</Text>
            <Text>Email: {companyDetails.email}</Text>
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>RENTAL INVOICE</Text>

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
        <View style={[styles.section, styles.sectionBreak]} wrap={false}>
          <Text style={styles.sectionTitle}>Rental Charges Breakdown</Text>
          <View style={styles.table}>
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
                <Text style={styles.tableCell}>{r.total}</Text>
              </View>
            ))}

            {/* Summary Rows aligned in last two columns */}
            <View style={[styles.tableRow, { borderBottomWidth: 0 }]}>
              <Text style={[styles.tableCell, { flex: 1 }]} />
              <Text style={[styles.tableCell, { flex: 1 }]} />
              <Text style={[styles.tableCell, { flex: 1 }]} />
              <Text style={[styles.tableCell, { fontWeight: 'bold', textAlign: 'left' }]}>
                Rate:
              </Text>
              <Text style={[styles.tableCell, { fontWeight: 'bold', textAlign: 'right' }]}>
                £{roundedSubtotal.toFixed(2)}
              </Text>
            </View>
            <View style={[styles.tableRow, { borderBottomWidth: 0 }]}>
              <Text style={[styles.tableCell, { flex: 1 }]} />
              <Text style={[styles.tableCell, { flex: 1 }]} />
              <Text style={[styles.tableCell, { flex: 1 }]} />
              <Text style={[styles.tableCell, { fontWeight: 'bold', textAlign: 'left' }]}>
                NET:
              </Text>
              <Text style={[styles.tableCell, { fontWeight: 'bold', textAlign: 'right' }]}>
                £{subtotalAfterDiscount.toFixed(2)}
              </Text>
            </View>
            {rental.includeVAT && (
              <View style={[styles.tableRow, { borderBottomWidth: 0 }]}>
                <Text style={[styles.tableCell, { flex: 1 }]} />
                <Text style={[styles.tableCell, { flex: 1 }]} />
                <Text style={[styles.tableCell, { flex: 1 }]} />
                <Text style={[styles.tableCell, { fontWeight: 'bold', color: '#2563EB', textAlign: 'left' }]}>
                  VAT (20%):
                </Text>
                <Text style={[styles.tableCell, { fontWeight: 'bold', color: '#2563EB', textAlign: 'right' }]}>
                  £{vatAmount.toFixed(2)}
                </Text>
              </View>
            )}
            <View style={[styles.tableRow, { borderTopWidth: 1 }]}>
              <Text style={[styles.tableCell, { flex: 1 }]} />
              <Text style={[styles.tableCell, { flex: 1 }]} />
              <Text style={[styles.tableCell, { flex: 1 }]} />
              <Text style={[styles.tableCell, { fontWeight: 'bold', textAlign: 'left' }]}>
                Total:
              </Text>
              <Text style={[styles.tableCell, { fontWeight: 'bold', textAlign: 'right' }]}>
                £{grandTotal.toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

        {/* Payment History */}
        {rental.payments?.length > 0 && (
          <View style={[styles.section, styles.sectionBreak]} wrap={false}>
            <Text style={styles.sectionTitle}>Payment History</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
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
        <View style={[styles.section, styles.sectionBreak]} wrap={false}>
          <Text style={styles.sectionTitle}>Payment Terms &amp; Conditions</Text>
          <Text>Payment must be made by the due date stated on this invoice.</Text>
          <Text>Late payments may be subject to additional fees and penalties.</Text>
        </View>

        {/* Bank Details & Summary */}
        <View wrap={false} style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 }}>
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
                £{roundedSubtotal.toFixed(2)}
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
              <Text style={styles.label}>Owing:</Text>
              <Text style={[styles.value, { textAlign: 'right' }]}>
                £{owing.toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <Text style={styles.footer} fixed>
          {companyDetails.fullName} | Registered in England and Wales | Company No: {companyDetails.registrationNumber}
        </Text>
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
