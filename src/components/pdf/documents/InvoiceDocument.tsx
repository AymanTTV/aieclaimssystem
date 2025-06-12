// src/components/pdf/documents/InvoiceDocument.tsx
import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from '@react-pdf/renderer';
import { Invoice, Vehicle } from '../../../types/finance';
import { styles } from '../styles';
import { format } from 'date-fns';

interface InvoiceDocumentProps {
  data: Invoice;
  vehicle?: Vehicle;
  companyDetails: any;
}

const InvoiceDocument: React.FC<InvoiceDocumentProps> = ({
  data,
  vehicle,
  companyDetails,
}) => {
  // Utility to format Firestore Timestamp or JS Date as "dd/MM/yyyy"
  const formatDateValue = (date: Date | any): string => {
    if (!date) return 'N/A';
    try {
      if (date?.toDate) {
        date = date.toDate();
      }
      const dObj = date instanceof Date ? date : new Date(date);
      if (isNaN(dObj.getTime())) return 'N/A';
      return format(dObj, 'dd/MM/yyyy');
    } catch {
      return 'N/A';
    }
  };

  // Precompute raw totals for summary
  let grossTotal = 0;      // sum of (quantity × unitPrice)
  let totalDiscount = 0;   // sum of discount amounts
  let totalVat = 0;        // sum of VAT amounts

  data.lineItems.forEach((item) => {
    const lineGross = item.quantity * item.unitPrice;
    const discountAmt = (item.discount / 100) * lineGross;
    const netAfterDisc = lineGross - discountAmt;
    const vatAmt = item.includeVAT ? netAfterDisc * 0.2 : 0;
    grossTotal += lineGross;
    totalDiscount += discountAmt;
    totalVat += vatAmt;
  });

  // Final total already stored on invoice ( subTotal + vatAmount )
  const finalTotal = data.total;

  return (
    <Document>
      <Page size="A4" style={styles.page}>

        {/* ── HEADER (logo + company info) ── */}
        <View style={styles.header}>
          {companyDetails.logoUrl && (
            <Image src={companyDetails.logoUrl} style={styles.logo} />
          )}
          <View style={styles.companyInfo}>
            <Text style={styles.companyName}>{companyDetails.fullName}</Text>
            <Text style={styles.companyDetail}>
              {companyDetails.officialAddress}
            </Text>
            <Text style={styles.companyDetail}>Tel: {companyDetails.phone}</Text>
            <Text style={styles.companyDetail}>Email: {companyDetails.email}</Text>
            {companyDetails.vatNumber && (
              <Text style={styles.companyDetail}>
                VAT No: {companyDetails.vatNumber}
              </Text>
            )}
          </View>
        </View>

        {/* ── TITLE ── */}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>INVOICE</Text>
        </View>

        {/* ── Customer Name & Category Row ── */}
        <View
          style={[
            { flexDirection: 'row', justifyContent: 'space-between' },
            styles.section,
          ]}
        >
          <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#111827' }}>
            {data.customerName || 'N/A'}
          </Text>
          <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#111827' }}>
            {data.category || 'N/A'}
          </Text>
        </View>

        {/* ── Horizontal Card: Invoice Number / Date / Due Date / Status ── */}
        <View style={localStyles.infoCard} wrap={false}>
          <View style={localStyles.infoItem}>
            <Text style={localStyles.infoLabel}>Invoice Number</Text>
            <Text style={localStyles.infoValue}>
              AIE-INV-{data.id.slice(-8).toUpperCase()}
            </Text>
          </View>
          <View style={localStyles.infoItem}>
            <Text style={localStyles.infoLabel}>Date</Text>
            <Text style={localStyles.infoValue}>{formatDateValue(data.date)}</Text>
          </View>
          <View style={localStyles.infoItem}>
            <Text style={localStyles.infoLabel}>Due Date</Text>
            <Text style={localStyles.infoValue}>{formatDateValue(data.dueDate)}</Text>
          </View>
          <View style={localStyles.infoItem}>
            <Text style={localStyles.infoLabel}>Payment Status</Text>
            <Text style={localStyles.infoValue}>
              {data.paymentStatus.replace('_', ' ')}
            </Text>
          </View>
        </View>

        {/* ── Items Table (full width, with a small top margin) ── */}
        <View style={[styles.section, { marginTop: 5 }]}>
          <Text style={styles.sectionTitle}>Items</Text>
          <View style={[styles.table, { marginTop: 5 }]}>
            {/* Table Header */}
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { flex: 3 }]}>
                Description
              </Text>
              <Text
                style={[styles.tableHeaderCell, { flex: 1, textAlign: 'right' }]}
              >
                Qty
              </Text>
              <Text
                style={[styles.tableHeaderCell, { flex: 1, textAlign: 'right' }]}
              >
                Unit Price
              </Text>
              <Text
                style={[styles.tableHeaderCell, { flex: 1, textAlign: 'right' }]}
              >
                VAT
              </Text>
              <Text
                style={[styles.tableHeaderCell, { flex: 1, textAlign: 'right' }]}
              >
                Discount
              </Text>
              <Text
                style={[styles.tableHeaderCell, { flex: 1, textAlign: 'right' }]}
              >
                Total
              </Text>
            </View>

            {/* Table Rows */}
            {data.lineItems.map((item, idx) => {
              const lineGross = item.quantity * item.unitPrice;
              const discountAmt = (item.discount / 100) * lineGross;
              const netAfterDisc = lineGross - discountAmt;
              const vatAmt = item.includeVAT ? netAfterDisc * 0.2 : 0;
              const lineTotal = netAfterDisc + vatAmt;
              const rowStyle =
                idx % 2 === 0 ? styles.tableRow : styles.tableRowAlternate;

              return (
                <View key={item.id} style={rowStyle}>
                  <Text style={[styles.tableCell, { flex: 3 }]}>
                    {item.description}
                  </Text>
                  <Text
                    style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}
                  >
                    {item.quantity}
                  </Text>
                  <Text
                    style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}
                  >
                    £{item.unitPrice.toFixed(2)}
                  </Text>
                  <Text
                    style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}
                  >
                    {item.includeVAT ? '£' + vatAmt.toFixed(2) : '-'}
                  </Text>
                  <Text
                    style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}
                  >
                    {item.discount ? item.discount.toFixed(1) + '%' : '-'}
                  </Text>
                  <Text
                    style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}
                  >
                    £{lineTotal.toFixed(2)}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* ── Bank Details & Payment Details Cards (side by side, with top margin) ── */}
        <View
          style={[
            { flexDirection: 'row', justifyContent: 'space-between' },
            { marginTop: 15 },
          ]}
          wrap={false}
        >
          {/* ── Bank Details Card on the LEFT ── */}
          <View style={[styles.card, { width: '48%' }]}>
            <Text style={styles.cardTitle}>Bank Details</Text>
            <View style={styles.spaceBetweenRow}>
              <Text style={styles.label}>Bank:</Text>
              <Text style={styles.value}>
                {companyDetails.bankName || 'N/A'}
              </Text>
            </View>
            <View style={styles.spaceBetweenRow}>
              <Text style={styles.label}>Sort Code:</Text>
              <Text style={styles.value}>
                {companyDetails.sortCode || 'N/A'}
              </Text>
            </View>
            <View style={styles.spaceBetweenRow}>
              <Text style={styles.label}>Account No:</Text>
              <Text style={styles.value}>
                {companyDetails.accountNumber || 'N/A'}
              </Text>
            </View>
            <View style={styles.spaceBetweenRow}>
              <Text style={styles.label}>Reference:</Text>
              <Text style={styles.value}>
                AIE-INV-{data.id.slice(-8).toUpperCase()}
              </Text>
            </View>
          </View>

          {/* ── Payment Details Card on the RIGHT ── */}
          <View style={[styles.card, { width: '48%' }]}>
            <Text style={styles.cardTitle}>Payment Details</Text>
            <View style={styles.spaceBetweenRow}>
              <Text style={styles.summaryTextDefault}>NET (Gross):</Text>
              <Text style={styles.summaryValueDefault}>
                £{grossTotal.toFixed(2)}
              </Text>
            </View>
            <View style={styles.spaceBetweenRow}>
              <Text style={styles.summaryTextDefault}>VAT Total:</Text>
              <Text style={styles.summaryValueDefault}>
                £{totalVat.toFixed(2)}
              </Text>
            </View>
            {totalDiscount > 0 && (
              <View style={styles.spaceBetweenRow}>
                <Text style={styles.summaryTextDefault}>Discount Total:</Text>
                <Text style={styles.summaryValueDefault}>
                  £{totalDiscount.toFixed(2)}
                </Text>
              </View>
            )}
            <View
              style={[
                styles.spaceBetweenRow,
                {
                  borderTopWidth: 1,
                  borderTopColor: '#E5E7EB',
                  paddingTop: 5,
                  marginTop: 5,
                },
              ]}
            >
              <Text style={styles.summaryTextGreen}>Total:</Text>
              <Text style={styles.summaryValueGreen}>
                £{finalTotal.toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

        {/* ── FOOTER ── */}
        <Text style={styles.footer}>
          {companyDetails.fullName} | Registered in England and Wales | Company No: {' '}
          {companyDetails.registrationNumber}
        </Text>
      </Page>
    </Document>
  );
};

export default InvoiceDocument;

// LOCAL STYLES for the horizontal info card (matching RentalInvoice style)
const localStyles = StyleSheet.create({
  infoCard: {
    borderWidth: 1,
    borderColor: '#3B82F6',   // same blue‐500 as in RentalInvoice
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
    color: '#1E40AF',         // blue‐800
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 10,
    color: '#1F2937',         // gray‐800
  },
});
