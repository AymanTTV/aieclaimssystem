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
import { Invoice, Vehicle } from '../../../types';
import { styles as globalStyles } from '../styles';
import { format } from 'date-fns';

// Interface extending Invoice to allow attached vehicle
interface InvoiceWithVehicle extends Invoice {
  vehicle?: Vehicle;
}

interface InvoiceDocumentProps {
  data: InvoiceWithVehicle;
  vehicle?: Vehicle;
  companyDetails: any;
}

// Local styles to handle specific layout needs
const localStyles = StyleSheet.create({
  // Horizontal Info Card (Top Section)
  infoCard: {
    borderWidth: 1,
    borderColor: '#3B82F6',
    borderRadius: 6,
    padding: 8,
    flexDirection: 'row',
    flexWrap: 'wrap', 
    justifyContent: 'space-between',
    marginBottom: 15,
    backgroundColor: '#F9FAFB',
  },
  infoRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoCol: {
    width: '24%',
    flexDirection: 'column',
  },
  infoLabel: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#6B7280',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#111827',
  },
  
  // Status Colors
  statusPaid: { color: '#059669' },
  statusPending: { color: '#D97706' },
  statusUnpaid: { color: '#DC2626' },

  // Bottom Section (Side by Side)
  bottomContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 20,
  },
  cardBox: {
    width: '48%',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 6,
    padding: 12,
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 5,
    textTransform: 'uppercase',
  },
  cardText: {
    fontSize: 10,
    marginBottom: 2,
    color: '#374151',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
    fontSize: 10,
  },
  summaryLabel: { color: '#4B5563' },
  summaryValue: { color: '#111827', fontWeight: 'bold' },
  
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  totalLabel: { fontSize: 12, fontWeight: 'bold', color: '#111827' },
  totalValue: { fontSize: 12, fontWeight: 'bold', color: '#2563EB' },
});

const InvoiceDocument: React.FC<InvoiceDocumentProps> = ({
  data,
  vehicle,
  companyDetails,
}) => {
  // Helpers
  const formatCurrency = (amount: number) => 
    `£${amount.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const formatDateValue = (date: any): string => {
    if (!date) return 'N/A';
    try {
      const d = date?.toDate ? date.toDate() : new Date(date);
      return !isNaN(d.getTime()) ? format(d, 'dd/MM/yyyy') : 'N/A';
    } catch (e) {
      return 'N/A';
    }
  };

  const isValidPdfImageSrc = (v: any) => {
    if (typeof v !== 'string') return false;
    return v.startsWith('http') || v.startsWith('data:image');
  };

  // Calculations
  const computedLines = (data.lineItems || []).map(item => {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.unitPrice) || 0;
    const disc = Number(item.discount) || 0;
    
    const gross = qty * price;
    const discountAmt = (disc / 100) * gross;
    const net = gross - discountAmt;
    const vat = item.includeVAT ? net * 0.2 : 0;
    const total = net + vat;
    return { ...item, gross, discountAmt, net, vat, total };
  });

  const totalDiscount = computedLines.reduce((sum, i) => sum + i.discountAmt, 0);
  const netTotal = computedLines.reduce((sum, i) => sum + i.net, 0);
  const vatTotal = computedLines.reduce((sum, i) => sum + i.vat, 0);
  const grandTotal = netTotal + vatTotal;

  // Retrieve Vehicle Data (Priority: explicit prop > attached data)
  const actualVehicle = vehicle || data.vehicle;

  const vehicleDisplay = actualVehicle 
    ? `${actualVehicle.make} ${actualVehicle.model} (${actualVehicle.registrationNumber})`
    : data.vehicleName || 'N/A';

  const displayInvoiceNumber = data.invoiceNumber || `INV-${data.id.slice(0, 6).toUpperCase()}`;

  return (
    <Document>
      <Page size="A4" style={globalStyles.page}>
        
        {/* HEADER */}
        <View style={globalStyles.header} fixed>
          <View style={globalStyles.headerLeft}>
            {isValidPdfImageSrc(companyDetails?.logoUrl) && (
              <Image src={companyDetails.logoUrl} style={globalStyles.logo} />
            )}
          </View>
          <View style={globalStyles.headerRight}>
            <Text style={globalStyles.companyName}>{companyDetails?.fullName || 'AIE SKYLINE LIMITED'}</Text>
            <Text style={globalStyles.companyDetail}>{companyDetails?.officialAddress || 'N/A'}</Text>
            <Text style={globalStyles.companyDetail}>Tel: {companyDetails?.phone || 'N/A'}</Text>
            <Text style={globalStyles.companyDetail}>Email: {companyDetails?.email || 'N/A'}</Text>
          </View>
        </View>

        {/* TITLE */}
        <View style={globalStyles.titleContainer}>
          <Text style={globalStyles.title}>INVOICE</Text>
        </View>

        {/* HORIZONTAL INFO CARD */}
        <View style={localStyles.infoCard}>
          {/* Row 1 */}
          <View style={localStyles.infoRow}>
            <View style={localStyles.infoCol}>
              <Text style={localStyles.infoLabel}>Invoice Number</Text>
              <Text style={localStyles.infoValue}>{displayInvoiceNumber}</Text>
            </View>
            <View style={localStyles.infoCol}>
              <Text style={localStyles.infoLabel}>Invoice Date</Text>
              <Text style={localStyles.infoValue}>{formatDateValue(data.date)}</Text>
            </View>
            <View style={localStyles.infoCol}>
              <Text style={localStyles.infoLabel}>Due Date</Text>
              <Text style={localStyles.infoValue}>{formatDateValue(data.dueDate)}</Text>
            </View>
            <View style={localStyles.infoCol}>
              <Text style={localStyles.infoLabel}>Status</Text>
              <Text style={[
                localStyles.infoValue,
                data.paymentStatus === 'paid' ? localStyles.statusPaid : 
                data.paymentStatus === 'partially_paid' ? localStyles.statusPending : localStyles.statusUnpaid
              ]}>
                {(data.paymentStatus || 'pending').replace('_', ' ').toUpperCase()}
              </Text>
            </View>
          </View>

          {/* Row 2 */}
          <View style={[localStyles.infoRow, { marginBottom: 0 }]}>
            <View style={localStyles.infoCol}>
              <Text style={localStyles.infoLabel}>Bill To</Text>
              <Text style={localStyles.infoValue}>{data.customerName || 'N/A'}</Text>
            </View>
            <View style={localStyles.infoCol}>
              <Text style={localStyles.infoLabel}>Category</Text>
              <Text style={localStyles.infoValue}>{data.category || 'General'}</Text>
            </View>
            <View style={[localStyles.infoCol, { width: '48%' }]}>
              <Text style={localStyles.infoLabel}>Vehicle / Reg</Text>
              <Text style={localStyles.infoValue}>{vehicleDisplay}</Text>
            </View>
          </View>
        </View>

        {/* CHARGES TABLE */}
        <View style={globalStyles.tableContainer}>
          <View style={globalStyles.tableHeader}>
            <Text style={[globalStyles.tableHeaderCell, { flex: 3 }]}>Description</Text>
            <Text style={[globalStyles.tableHeaderCell, { flex: 1, textAlign: 'center' }]}>Qty</Text>
            <Text style={[globalStyles.tableHeaderCell, { flex: 1.2, textAlign: 'right' }]}>Unit Price</Text>
            <Text style={[globalStyles.tableHeaderCell, { flex: 1, textAlign: 'right' }]}>VAT</Text>
            <Text style={[globalStyles.tableHeaderCell, { flex: 1, textAlign: 'right' }]}>Disc.</Text>
            <Text style={[globalStyles.tableHeaderCell, { flex: 1.2, textAlign: 'right' }]}>Total</Text>
          </View>

          {computedLines.map((item, index) => (
            <View key={index} style={globalStyles.tableRow}>
              <Text style={[globalStyles.tableCell, { flex: 3 }]}>{item.description || 'Item'}</Text>
              <Text style={[globalStyles.tableCell, { flex: 1, textAlign: 'center' }]}>{item.quantity}</Text>
              <Text style={[globalStyles.tableCell, { flex: 1.2, textAlign: 'right' }]}>{formatCurrency(item.unitPrice)}</Text>
              <Text style={[globalStyles.tableCell, { flex: 1, textAlign: 'right' }]}>{item.vat > 0 ? formatCurrency(item.vat) : '-'}</Text>
              <Text style={[globalStyles.tableCell, { flex: 1, textAlign: 'right' }]}>{item.discount > 0 ? `${item.discount}%` : '-'}</Text>
              <Text style={[globalStyles.tableCell, { flex: 1.2, textAlign: 'right', fontWeight: 'bold' }]}>{formatCurrency(item.total)}</Text>
            </View>
          ))}
        </View>

        {/* BOTTOM SECTION */}
        <View style={localStyles.bottomContainer} wrap={false}>
          {/* Card 1: Payment Details */}
          <View style={localStyles.cardBox}>
            <Text style={localStyles.cardTitle}>Payment Details</Text>
            <View style={localStyles.summaryRow}>
              <Text style={localStyles.summaryLabel}>Bank:</Text>
              <Text style={localStyles.summaryValue}>LLOYDS BANK</Text>
            </View>
            <View style={localStyles.summaryRow}>
              <Text style={localStyles.summaryLabel}>Account Name:</Text>
              <Text style={localStyles.summaryValue}>AIE SKYLINE LIMITED</Text>
            </View>
            <View style={localStyles.summaryRow}>
              <Text style={localStyles.summaryLabel}>Account Number:</Text>
              <Text style={localStyles.summaryValue}>30513162</Text>
            </View>
            <View style={localStyles.summaryRow}>
              <Text style={localStyles.summaryLabel}>Sort Code:</Text>
              <Text style={localStyles.summaryValue}>30-99-50</Text>
            </View>
            <View style={{ marginTop: 10 }}>
              <Text style={[localStyles.summaryLabel, { fontSize: 8 }]}>
                Please use Invoice #{displayInvoiceNumber} as reference.
              </Text>
            </View>
          </View>

          {/* Card 2: Summary */}
          <View style={localStyles.cardBox}>
            <Text style={localStyles.cardTitle}>Summary</Text>
            <View style={localStyles.summaryRow}>
              <Text style={localStyles.summaryLabel}>Net Total:</Text>
              <Text style={localStyles.summaryValue}>{formatCurrency(netTotal)}</Text>
            </View>
            <View style={localStyles.summaryRow}>
              <Text style={localStyles.summaryLabel}>VAT Total:</Text>
              <Text style={localStyles.summaryValue}>{formatCurrency(vatTotal)}</Text>
            </View>
            {totalDiscount > 0 && (
              <View style={localStyles.summaryRow}>
                <Text style={[localStyles.summaryLabel, { color: '#DC2626' }]}>Discount:</Text>
                <Text style={[localStyles.summaryValue, { color: '#DC2626' }]}>–{formatCurrency(totalDiscount)}</Text>
              </View>
            )}
            <View style={localStyles.totalRow}>
              <Text style={localStyles.totalLabel}>Grand Total:</Text>
              <Text style={localStyles.totalValue}>{formatCurrency(grandTotal)}</Text>
            </View>
            <View style={[localStyles.summaryRow, { marginTop: 6 }]}>
              <Text style={[localStyles.summaryLabel, { color: '#059669' }]}>Paid to Date:</Text>
              <Text style={[localStyles.summaryValue, { color: '#059669' }]}>{formatCurrency(data.paidAmount || 0)}</Text>
            </View>
            <View style={[localStyles.summaryRow, { borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 4 }]}>
              <Text style={[localStyles.summaryLabel, { fontWeight: 'bold' }]}>Balance Due:</Text>
              <Text style={[localStyles.summaryValue, { color: (data.remainingAmount || 0) > 0.001 ? '#DC2626' : '#059669' }]}>
                {formatCurrency(data.remainingAmount || 0)}
              </Text>
            </View>
          </View>
        </View>

        {/* FOOTER */}
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