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
import { styles as globalStyles } from '../styles'; // Renamed to avoid conflict
import { format } from 'date-fns';

interface InvoiceDocumentProps {
  data: Invoice;
  vehicle?: Vehicle;
  companyDetails: any;
}

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

  // Derive header details from companyDetails, splitting the address
  const headerDetails = {
    logoUrl: companyDetails?.logoUrl || '',
    fullName: companyDetails?.fullName || 'AIE Skyline Limited',
    addressLine1: 'United House, 39-41 North Road,',
    addressLine2: 'London, N7 9DP.',
    phone: companyDetails?.phone || 'N/A',
    email: companyDetails?.email || 'N/A',
  };

  return (
    <Document>
      <Page size="A4" style={globalStyles.page}>

        {/* ── HEADER (logo + company info) ── Updated to consistent design */}
        <View style={globalStyles.header} fixed>
          <View style={globalStyles.headerLeft}>
            {headerDetails.logoUrl && (
              <Image src={headerDetails.logoUrl} style={globalStyles.logo} />
            )}
          </View>
          <View style={globalStyles.headerRight}>
            <Text style={globalStyles.companyName}>{headerDetails.fullName}</Text>
            <Text style={globalStyles.companyDetail}>{headerDetails.addressLine1}</Text>
            <Text style={globalStyles.companyDetail}>{headerDetails.addressLine2}</Text>
            <Text style={globalStyles.companyDetail}>Tel: {headerDetails.phone}</Text>
            <Text style={globalStyles.companyDetail}>Email: {headerDetails.email}</Text>
            {companyDetails.vatNumber && (
              <Text style={globalStyles.companyDetail}>
                VAT No: {companyDetails.vatNumber}
              </Text>
            )}
          </View>
        </View>

        {/* ── TITLE ── */}
        <View style={globalStyles.titleContainer}>
          <Text style={globalStyles.title}>INVOICE</Text>
        </View>

        {/* ── Customer Name & Category Row ── */}
        <View
          style={[
            { flexDirection: 'row', justifyContent: 'space-between' },
            globalStyles.section,
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
        <View style={[globalStyles.section, { marginTop: 5 }]}>
          <Text style={globalStyles.sectionTitle}>Items</Text>
          <View style={[globalStyles.table, { marginTop: 5 }]}>
            {/* Table Header */}
            <View style={globalStyles.tableHeader}>
              <Text style={[globalStyles.tableHeaderCell, { flex: 3 }]}>
                Description
              </Text>
              <Text
                style={[globalStyles.tableHeaderCell, { flex: 1, textAlign: 'right' }]}
              >
                Qty
              </Text>
              <Text
                style={[globalStyles.tableHeaderCell, { flex: 1, textAlign: 'right' }]}
              >
                Unit Price
              </Text>
              <Text
                style={[globalStyles.tableHeaderCell, { flex: 1, textAlign: 'right' }]}
              >
                VAT
              </Text>
              <Text
                style={[globalStyles.tableHeaderCell, { flex: 1, textAlign: 'right' }]}
              >
                Discount
              </Text>
              <Text
                style={[globalStyles.tableHeaderCell, { flex: 1, textAlign: 'right' }]}
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
                idx % 2 === 0 ? globalStyles.tableRow : globalStyles.tableRowAlternate;

              return (
                <View key={item.id} style={rowStyle}>
                  <Text style={[globalStyles.tableCell, { flex: 3 }]}>
                    {item.description}
                  </Text>
                  <Text
                    style={[globalStyles.tableCell, { flex: 1, textAlign: 'right' }]}
                  >
                    {item.quantity}
                  </Text>
                  <Text
                    style={[globalStyles.tableCell, { flex: 1, textAlign: 'right' }]}
                  >
                    £{item.unitPrice.toFixed(2)}
                  </Text>
                  <Text
                    style={[globalStyles.tableCell, { flex: 1, textAlign: 'right' }]}
                  >
                    {item.includeVAT ? '£' + vatAmt.toFixed(2) : '-'}
                  </Text>
                  <Text
                    style={[globalStyles.tableCell, { flex: 1, textAlign: 'right' }]}
                  >
                    {item.discount ? item.discount.toFixed(1) + '%' : '-'}
                  </Text>
                  <Text
                    style={[globalStyles.tableCell, { flex: 1, textAlign: 'right' }]}
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
          <View style={[globalStyles.card, { width: '48%' }]}>
            <Text style={globalStyles.cardTitle}>Bank Details</Text>
            <View style={globalStyles.spaceBetweenRow}>
              <Text style={globalStyles.label}>Bank:</Text>
              <Text style={globalStyles.value}>
                {companyDetails.bankName || 'N/A'}
              </Text>
            </View>
            <View style={globalStyles.spaceBetweenRow}>
              <Text style={globalStyles.label}>Sort Code:</Text>
              <Text style={globalStyles.value}>
                {companyDetails.sortCode || 'N/A'}
              </Text>
            </View>
            <View style={globalStyles.spaceBetweenRow}>
              <Text style={globalStyles.label}>Account No:</Text>
              <Text style={globalStyles.value}>
                {companyDetails.accountNumber || 'N/A'}
              </Text>
            </View>
            <View style={globalStyles.spaceBetweenRow}>
              <Text style={globalStyles.label}>Reference:</Text>
              <Text style={globalStyles.value}>
                AIE-INV-{data.id.slice(-8).toUpperCase()}
              </Text>
            </View>
          </View>

          {/* ── Payment Details Card on the RIGHT ── */}
          <View style={[globalStyles.card, { width: '48%' }]}>
            <Text style={globalStyles.cardTitle}>Payment Details</Text>
            <View style={globalStyles.spaceBetweenRow}>
              <Text style={globalStyles.summaryTextDefault}>NET (Gross):</Text>
              <Text style={globalStyles.summaryValueDefault}>
                £{grossTotal.toFixed(2)}
              </Text>
            </View>
            <View style={globalStyles.spaceBetweenRow}>
              <Text style={globalStyles.summaryTextDefault}>VAT Total:</Text>
              <Text style={globalStyles.summaryValueDefault}>
                £{totalVat.toFixed(2)}
              </Text>
            </View>
            {totalDiscount > 0 && (
              <View style={globalStyles.spaceBetweenRow}>
                <Text style={globalStyles.summaryTextDefault}>Discount Total:</Text>
                <Text style={globalStyles.summaryValueDefault}>
                  £{totalDiscount.toFixed(2)}
                </Text>
              </View>
            )}
            <View
              style={[
                globalStyles.spaceBetweenRow,
                {
                  borderTopWidth: 1,
                  borderTopColor: '#E5E7EB',
                  paddingTop: 5,
                  marginTop: 5,
                },
              ]}
            >
              <Text style={globalStyles.summaryTextGreen}>Total:</Text>
              <Text style={globalStyles.summaryValueGreen}>
                £{finalTotal.toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

        {/* ── FOOTER ── Updated to consistent design */}
        <View style={globalStyles.footer} fixed>
          <Text style={globalStyles.footerText}>
            AIE SKYLINE LIMITED, registered in England and Wales with the company registration number 15616639, registered office address: United House, 39-41 North Road, London, N7 9DP. VAT. NO. 453448875
          </Text>
          <Text
            style={globalStyles.pageNumber}
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
};

export default InvoiceDocument;