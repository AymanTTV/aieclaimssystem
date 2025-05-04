// src/components/pdf/RentalInvoice.tsx
import React from 'react';
import { Document, Page, Text, View, Image } from '@react-pdf/renderer';
import { Rental, Vehicle, Customer } from '../../types';
import { format, differenceInDays, isAfter } from 'date-fns';
import logo from '../../assets/logo.png';
import { styles } from './styles';
import { calculateOverdueCost } from '../../utils/rentalCalculations';

const RentalInvoice: React.FC<{
  rental: Rental;
  vehicle: Vehicle;
  customer: Customer;
  companyDetails: any;
}> = ({ rental, vehicle, customer, companyDetails }) => {
  // normalize dates
  const toDate = (d: any): Date | null => {
    if (!d) return null;
    if (d instanceof Date) return d;
    if (typeof d.toDate === 'function') return d.toDate();
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? null : dt;
  };
  const fmtDT = (d: any) => {
    const dt = toDate(d);
    return dt ? format(dt, 'dd/MM/yyyy HH:mm') : 'N/A';
  };

  // days inclusive
  const sd = toDate(rental.startDate)!;
  const ed = toDate(rental.endDate)!;
  const days = sd && ed ? differenceInDays(ed, sd) + 1 : 0;

  // per-day rate
  const perDay = rental.negotiatedRate ?? vehicle.claimRentalPrice!;

  // core charges
  const hireTotal    = days * perDay;
  const storage      = rental.storageCost      || 0;
  const recovery     = rental.recoveryCost     || 0;
  const delivery     = rental.deliveryCharge   || 0;
  const collection   = rental.collectionCharge || 0;
  const insurance    = days * (rental.insurancePerDay || 0);
  const ongoing      = isAfter(new Date(), ed)
    ? calculateOverdueCost(rental, new Date(), vehicle)
    : 0;

  // grand total (including any overdue)
  const grandTotal = hireTotal + storage + recovery + delivery + collection + insurance + ongoing;

  // build rows for the breakdown table
  const rows = [
    {
      desc: 'Hire Charges',
      details: `£${perDay.toFixed(2)} per day`,
      rate: perDay.toFixed(2),
      units: String(days),
      total: hireTotal.toFixed(2),
    },
    { desc: 'Storage Charges',   details: '', rate: '', units: '', total: storage.toFixed(2) },
    { desc: 'Recovery Charges',  details: '', rate: '', units: '', total: recovery.toFixed(2) },
    { desc: 'Delivery Charges',  details: '', rate: '', units: '', total: delivery.toFixed(2) },
    { desc: 'Collection Charges',details: '', rate: '', units: '', total: collection.toFixed(2) },
    {
      desc: 'Insurance',
      details: `${days} days cover`,
      rate: (rental.insurancePerDay || 0).toFixed(2),
      units: String(days),
      total: insurance.toFixed(2),
    },
    // optionally show overdue as a separate row:
    ...(ongoing > 0 ? [{
      desc: 'Overdue Charges',
      details: '',
      rate: '',
      units: '',
      total: ongoing.toFixed(2),
    }] : []),
  ];

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header} wrap={false}>
          <Image src={logo} style={styles.logo} />
          <View style={styles.companyInfo}>
            <Text>{companyDetails.fullName}</Text>
            <Text>{companyDetails.officialAddress}</Text>
            <Text>Tel: {companyDetails.phone}</Text>
            <Text>Email: {companyDetails.email}</Text>
            <Text>VAT No: {companyDetails.vatNumber}</Text>
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title} wrap={false}>RENTAL INVOICE</Text>

        {/* Invoice Info */}
        <View style={[styles.section, styles.sectionBreak]} wrap={false}>
          {[
            ['Invoice Number:', `AIE-${rental.id.slice(-8).toUpperCase()}`],
            ['Date:',           fmtDT(rental.startDate)],
            ['Due Date:',       fmtDT(rental.endDate)],
          ].map(([label, value], i) => (
            <View key={i} style={styles.row}>
              <Text style={styles.label}>{label}</Text>
              <Text style={styles.value}>{value}</Text>
            </View>
          ))}
        </View>

        {/* Bill To & Vehicle */}
        <View
          style={[styles.sectionBreak, { flexDirection: 'row', justifyContent: 'space-between' }, styles.pageBreak]}
          wrap={false}
        >
          <View style={[styles.card, { width: '48%' }]}>
            <Text style={styles.sectionTitle}>Bill To:</Text>
            <Text>{customer.name}</Text>
            <Text>{customer.address}</Text>
            <Text>{customer.mobile}</Text>
            <Text>{customer.email}</Text>
          </View>
          <View style={[styles.card, { width: '48%' }]}>
            <Text style={styles.sectionTitle}>Vehicle Details:</Text>
            <Text>{vehicle.make} {vehicle.model}</Text>
            <Text>Reg: {vehicle.registrationNumber}</Text>
            <Text>Mileage: {vehicle.mileage.toLocaleString()} miles</Text>
          </View>
        </View>

        {/* Rental Details */}
        <View style={[styles.section, styles.sectionBreak]} wrap={false}>
          <Text style={styles.sectionTitle}>Rental Details</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              {['Period','Type','Days','Ongoing'].map((h,i) => (
                <Text key={i} style={[styles.tableCell, { flex: 1 }]}>{h}</Text>
              ))}
            </View>
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 1 }]}>
                {fmtDT(rental.startDate)} – {fmtDT(rental.endDate)}
              </Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>
                {rental.type.toUpperCase()}
              </Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>{days}</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>
                {differenceInDays(new Date(), ed) + 1}
              </Text>
            </View>
          </View>
        </View>

        {/* === REPLACED COST SUMMARY === */}
        <View style={[styles.section, styles.sectionBreak]} wrap={false}>
          <Text style={styles.sectionTitle}>Rental Charges Breakdown</Text>
          <View style={styles.table}>
            {/* header */}
            <View style={styles.tableHeader}>
              <Text style={styles.tableHeaderCell}>Description</Text>
              <Text style={styles.tableHeaderCell}>Details</Text>
              <Text style={styles.tableHeaderCell}>Rate (£)</Text>
              <Text style={styles.tableHeaderCell}>Days / Units</Text>
              <Text style={styles.tableHeaderCell}>Total (£)</Text>
            </View>
            {/* rows */}
            {rows.map((r, i) => (
              <View key={i} style={styles.tableRow}>
                <Text style={styles.tableCell}>{r.desc}</Text>
                <Text style={styles.tableCell}>{r.details}</Text>
                <Text style={styles.tableCell}>{r.rate}</Text>
                <Text style={styles.tableCell}>{r.units}</Text>
                <Text style={styles.tableCell}>{r.total}</Text>
              </View>
            ))}
            {/* grand total */}
            <View style={[styles.tableRow, { borderBottomWidth: 0 }]}>
              <Text style={[styles.tableCell, { fontWeight: 'bold' }]}>Total Amount</Text>
              <Text style={styles.tableCell} />
              <Text style={styles.tableCell} />
              <Text style={styles.tableCell} />
              <Text style={[styles.tableCell, { fontWeight: 'bold' }]}>
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
                {['Date','Type','Ref','Amount'].map((h,i)=>(
                  <Text key={i} style={[styles.tableCell,{flex:1}]}>{h}</Text>
                ))}
              </View>
              {rental.payments.map((p,i)=>(
                <View key={i} style={styles.tableRow}>
                  <Text style={[styles.tableCell,{flex:1}]}>{fmtDT(p.date)}</Text>
                  <Text style={[styles.tableCell,{flex:1}]}>{p.method.replace('_',' ').toUpperCase()}</Text>
                  <Text style={[styles.tableCell,{flex:1}]}>{p.reference||'N/A'}</Text>
                  <Text style={[styles.tableCell,{flex:1}]}>£{p.amount.toFixed(2)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Payment Terms */}
        <View style={[styles.section, styles.sectionBreak]} wrap={false}>
          <Text style={styles.sectionTitle}>Payment Terms & Conditions</Text>
          <Text>Payment must be made by the due date stated on this invoice.</Text>
          <Text>Late payments may be subject to additional fees and penalties.</Text>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          {companyDetails.fullName} | Registered in England and Wales | Company No: {companyDetails.registrationNumber}
        </Text>
      </Page>
    </Document>
  );
};

export default RentalInvoice;
