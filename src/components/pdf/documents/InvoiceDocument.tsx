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
import { Invoice, Vehicle } from '../../../types/';
import { styles as globalStyles } from '../styles';
import { format } from 'date-fns';

interface InvoiceDocumentProps {
  data: Invoice;
  vehicle?: Vehicle;
  companyDetails: any;
}

// LOCAL STYLES for the horizontal info card
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

const InvoiceDocument: React.FC<InvoiceDocumentProps> = ({
  data,
  vehicle,
  companyDetails,
}) => {
  // Utility to format Firestore Timestamp or JS Date as "dd/MM/yyyy"
  const formatDateValue = (date: Date | any): string => {
    if (!date) return 'N/A';
    try {
      const dObj = date?.toDate ? date.toDate() : new Date(date);
      if (isNaN(dObj.getTime())) return 'N/A';
      return format(dObj, 'dd/MM/yyyy');
    } catch {
      return 'N/A';
    }
  };
  
  // Use the invoice number from the database record, or 'N/A' if it doesn't exist.
  const invoiceNumber = data.invoiceNumber || 'N/A';

  // --- ADDED: Extract Registration Number ---
  let registrationNumber = 'N/A';
  if (vehicle?.registrationNumber) {
    registrationNumber = vehicle.registrationNumber;
  } else if (data.vehicleName) {
    // Extracts text from the last parentheses, e.g., "Ford Focus (AB12 CDE)" -> "AB12 CDE"
    const regMatch = data.vehicleName.match(/\(([^)]+)\)$/);
    if (regMatch) {
      registrationNumber = regMatch[1];
    } else if (data.vehicleId) {
      // Fallback if name exists but parsing fails
      registrationNumber = 'See Vehicle';
    }
  }
  // --- END ADDED ---

  // Calculate total discount from line items
  const totalDiscount = data.lineItems.reduce((sum, li) => {
    const gross = li.quantity * li.unitPrice;
    return sum + (li.discount / 100) * gross;
  }, 0);

  return (
    <Document>
      <Page size="A4" style={globalStyles.page}>

        {/* --- HEADER (logo + company info) --- Improved Design --- */}
        <View style={globalStyles.header} fixed>
          <View style={globalStyles.headerLeft}>
            {companyDetails.logoUrl && (
              <Image src={companyDetails.logoUrl} style={globalStyles.logo} />
            )}
          </View>
          <View style={globalStyles.headerRight}>
            <Text style={globalStyles.companyName}>{companyDetails.fullName || 'AIE Skyline Limited'}</Text>
            <Text style={globalStyles.companyDetail}>United House, 39-41 North Road,</Text>
            <Text style={globalStyles.companyDetail}>London, N7 9DP.</Text>
            <Text style={globalStyles.companyDetail}>Tel: {companyDetails.phone || 'N/A'}</Text>
            <Text style={globalStyles.companyDetail}>Email: {companyDetails.email || 'N/A'}</Text>
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

        {/* --- UPDATED: Horizontal Card (5 items) --- */}
        <View style={localStyles.infoCard} wrap={false}>
          <View style={localStyles.infoItem}>
            <Text style={localStyles.infoLabel}>Invoice Number</Text>
            <Text style={localStyles.infoValue}>
              {invoiceNumber}
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
          {/* --- ADDED: Vehicle Reg --- */}
          <View style={localStyles.infoItem}>
            <Text style={localStyles.infoLabel}>Vehicle Reg</Text>
            <Text style={localStyles.infoValue}>{registrationNumber}</Text>
          </View>
          {/* --- END ADDED --- */}
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
                {invoiceNumber}
              </Text>
            </View>
          </View>

          {/* ── Payment Details Card on the RIGHT ── */}
          <View style={[globalStyles.card, { width: '48%' }]}>
            <Text style={globalStyles.cardTitle}>Payment Details</Text>
            <View style={globalStyles.spaceBetweenRow}>
              <Text style={globalStyles.summaryTextDefault}>NET:</Text>
              <Text style={globalStyles.summaryValueDefault}>
                £{data.subTotal.toFixed(2)}
              </Text>
            </View>
            <View style={globalStyles.spaceBetweenRow}>
              <Text style={globalStyles.summaryTextDefault}>VAT:</Text>
              <Text style={globalStyles.summaryValueDefault}>
                £{data.vatAmount.toFixed(2)}
              </Text>
            </View>
            {totalDiscount > 0 && (
              <View style={globalStyles.spaceBetweenRow}>
                <Text style={globalStyles.summaryTextDefault}>Discount:</Text>
                <Text style={globalStyles.summaryValueDefault}>
                  -£{totalDiscount.toFixed(2)}
                </Text>
              </View>
            )}
            <View style={globalStyles.spaceBetweenRow}>
              <Text style={globalStyles.summaryTextDefault}>Paid:</Text>
              <Text style={globalStyles.summaryValueDefault}>
                £{data.paidAmount.toFixed(2)}
              </Text>
            </View>
            <View style={globalStyles.spaceBetweenRow}>
              <Text style={globalStyles.summaryTextDefault}>Owing:</Text>
              <Text style={globalStyles.summaryValueDefault}>
                £{data.remainingAmount.toFixed(2)}
              </Text>
            </View>
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
              <Text
                style={data.remainingAmount <= 0.001 ? globalStyles.summaryTextGreen : globalStyles.summaryTextRed}
              >
                Total:
              </Text>
              <Text
                style={data.remainingAmount <= 0.001 ? globalStyles.summaryValueGreen : globalStyles.summaryValueRed}
              >
                £{data.total.toFixed(2)}
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