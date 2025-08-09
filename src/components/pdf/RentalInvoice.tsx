// src/components/pdf/RentalInvoice.tsx
import React from 'react';
import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';
import { Rental, Vehicle, Customer } from '../../types';
import { format, differenceInDays, isAfter } from 'date-fns';
import { styles } from './styles';
import { calculateOverdueCost } from '../../utils/rentalCalculations';

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

  const showOverdue =
    rental.status !== 'completed' && ed && isAfter(new Date(), ed);

  // Effective rates
  const effDaily = rental.negotiatedRate ?? vehicle.dailyRentalPrice ?? 0;
  const effWeekly = rental.negotiatedRate ?? vehicle.weeklyRentalPrice ?? 0;
  const effClaim = rental.negotiatedRate ?? vehicle.claimRentalPrice ?? 0;

  const dailyRate = parseFloat(effDaily.toFixed(2));
  const weeklyRate = parseFloat(effWeekly.toFixed(2));
  const perDayForClaim = parseFloat(effClaim.toFixed(2));

  let netHireTotal: number;
  let hireUnits: string;
  let hireRate: string;
  if (rental.type === 'weekly') {
    const w = Math.ceil(days / 7);
    netHireTotal = parseFloat((w * weeklyRate).toFixed(2));
    hireUnits = `${w} week${w > 1 ? 's' : ''}`;
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

  // Other net charges
  const netStorage = parseFloat((rental.storageCost || 0).toFixed(2));
  const netRecovery = parseFloat((rental.recoveryCost || 0).toFixed(2));
  const netDelivery = parseFloat((rental.deliveryCharge || 0).toFixed(2));
  const netCollection = parseFloat((rental.collectionCharge || 0).toFixed(2));
  const netInsurance = parseFloat((days * (rental.insurancePerDay || 0)).toFixed(2));

  let netOngoing = 0;
  if (showOverdue) {
    const raw = calculateOverdueCost(rental, new Date(), vehicle);
    netOngoing = rental.includeVAT ? raw / 1.2 : raw;
  }
  netOngoing = parseFloat(netOngoing.toFixed(2));

  // Return charges
  const rawReturn = rental.returnCondition?.totalCharges || 0;
  const netReturn = parseFloat(
    (
      rental.includeVAT
        ? rawReturn / 1.2
        : rawReturn
    ).toFixed(2)
  );

  // Subtotals
  let subtotalBeforeVAT =
    netHireTotal +
    netStorage +
    netRecovery +
    netDelivery +
    netCollection +
    netInsurance +
    netOngoing +
    netReturn;
  subtotalBeforeVAT = parseFloat(subtotalBeforeVAT.toFixed(2));

  const discountAmount = rental.discountAmount
    ? parseFloat(rental.discountAmount.toFixed(2))
    : 0;
  const subtotalAfterDiscount = parseFloat((subtotalBeforeVAT - discountAmount).toFixed(2));
  const grandTotal = parseFloat((subtotalAfterDiscount * (rental.includeVAT ? 1.2 : 1)).toFixed(2));
  const vatAmount = parseFloat(
    (rental.includeVAT ? (grandTotal - subtotalAfterDiscount) : 0).toFixed(2)
  );

  const paid = parseFloat(
    ((rental.payments?.reduce((sum, p) => sum + p.amount, 0) || 0) +
      (rental.paidAmount && rental.payments?.length === 0 ? rental.paidAmount : 0)
    ).toFixed(2)
  );
  const owing = parseFloat((grandTotal - paid).toFixed(2));

  // Build breakdown rows
  const rows = [
    {
      desc: 'Hire Charges',
      details: `£${hireRate} per ${rental.type === 'weekly' ? 'week' : 'day'}`,
      rate: hireRate,
      units: hireUnits,
      total: netHireTotal.toFixed(2),
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
          details: `${days} day${days > 1 ? 's' : ''} cover`,
          rate: (rental.insurancePerDay || 0).toFixed(2),
          units: String(days),
          total: netInsurance.toFixed(2),
        }]
      : []),
    ...(netOngoing > 0
      ? [{ desc: 'Overdue Charges', details: '', rate: '', units: '', total: netOngoing.toFixed(2) }]
      : []),
    ...(discountAmount > 0
      ? [{
          desc: 'Discount',
          details: rental.discountPercentage
            ? `${rental.discountPercentage.toFixed(2)}%`
            : 'Fixed Discount',
          rate: '',
          units: '',
          total: (-discountAmount).toFixed(2),
        }]
      : []),
    ...(netReturn > 0
      ? [{ desc: 'Return Charges', details: '', rate: '', units: '', total: netReturn.toFixed(2) }]
      : []),
  ];

  // Split payments into pages of 15
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
            {companyDetails.logoUrl && (
              <Image src={companyDetails.logoUrl} style={styles.logo} />
            )}
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
            <Text style={localStyles.infoValue}>
              AIE-{rental.id.slice(-8).toUpperCase()}
            </Text>
          </View>
          <View style={localStyles.infoItem}>
            <Text style={localStyles.infoLabel}>Invoice Date</Text>
            <Text style={localStyles.infoValue}>
              {fmtDateTime(rental.createdAt || new Date())}
            </Text>
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
        <View
          style={[styles.sectionBreak, { flexDirection: 'row', justifyContent: 'space-between' }]}
          wrap={false}
        >
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
              Mileage:{' '}
              {(rental.checkOutCondition?.mileage || vehicle.mileage || 0).toLocaleString()}{' '}
              miles
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
          <View style={[styles.card, { width: '48%' }]}>
            <Text style={styles.sectionTitle}>Summary</Text>
            <View style={styles.spaceBetweenRow}>
              <Text style={styles.label}>Rate:</Text>
              <Text style={[styles.value, { textAlign: 'right' }]}>
                £{subtotalBeforeVAT.toFixed(2)}
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
                  {
                    textAlign: 'right',
                    color: owing > 0 ? '#DC2626' : '#16A34A',
                  },
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
            render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber} of ${totalPages}`
            }
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
                <Text style={[styles.tableCell, { flex: 1 }]}>
                  {p.method.replace('_', ' ').toUpperCase()}
                </Text>
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
              render={({ pageNumber, totalPages }) =>
                `Page ${pageNumber} of ${totalPages}`
              }
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
