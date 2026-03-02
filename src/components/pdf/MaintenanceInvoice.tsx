// src/components/pdf/MaintenanceInvoice.tsx
import React from 'react';
import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';
import { MaintenanceLog, Vehicle } from '../../types';
import { format } from 'date-fns';
import { styles } from './styles';

interface MaintenanceInvoiceProps {
  data: MaintenanceLog & { vehicle: Vehicle };
  companyDetails: {
    logoUrl?: string;
    fullName: string;
    officialAddress: string;
    phone: string;
    email: string;
    bankName?: string;
    accountNumber?: string;
    sortCode?: string;
  };
}

const MaintenanceInvoice: React.FC<MaintenanceInvoiceProps> = ({
  data,
  companyDetails,
}) => {
  const toDate = (d: any): Date | null => {
    if (!d) return null;
    if (d instanceof Date) return d;
    if (typeof d?.toDate === 'function') return d.toDate();
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? null : dt;
  };

  const fmtDate = (d: any) => {
    const dt = toDate(d);
    return dt ? format(dt, 'dd/MM/yyyy') : 'N/A';
  };

  const invoiceNo = data.invoiceNumber || `INV-${data.id.slice(0, 8).toUpperCase()}`;
  const orderNo = data.orderNumber || 'N/A';
  
  // --- Calculations ---
  const netAmount = data.netAmount || 0;
  const vatAmount = data.vatAmount || 0;
  const totalAmount = data.cost || 0;
  const paidAmount = data.paidAmount || 0;
  const owingAmount = data.remainingAmount || 0;
  const discountAmount = data.totalDiscount || 0;

  // Calculate Labor Line Total for the table display
  const laborNet = data.laborCost || 0;
  const laborVat = data.vatDetails?.laborVAT ? laborNet * 0.20 : 0;
  const laborTotalLine = laborNet + laborVat;

  return (
    <Document>
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
          <Text style={styles.title}>MAINTENANCE INVOICE</Text>
        </View>

        {/* Info Card (Grid Layout - 4 items per line) */}
        <View style={localStyles.infoCard}>
          {/* Row 1 */}
          <View style={localStyles.infoItem}>
            <Text style={localStyles.infoLabel}>Invoice No</Text>
            <Text style={localStyles.infoValue}>{invoiceNo}</Text>
          </View>
          <View style={localStyles.infoItem}>
            <Text style={localStyles.infoLabel}>Order No</Text>
            <Text style={localStyles.infoValue}>{orderNo}</Text>
          </View>
          <View style={localStyles.infoItem}>
            <Text style={localStyles.infoLabel}>Inv. Date</Text>
            <Text style={localStyles.infoValue}>{fmtDate(data.invoiceDate || new Date())}</Text>
          </View>
          <View style={localStyles.infoItem}>
            <Text style={localStyles.infoLabel}>Due Date</Text>
            <Text style={localStyles.infoValue}>{fmtDate(data.invoiceDueDate || new Date())}</Text>
          </View>

          {/* Row 2 */}
          <View style={[localStyles.infoItem, { marginTop: 8 }]}>
            <Text style={localStyles.infoLabel}>Vehicle</Text>
            <Text style={localStyles.infoValue}>{data.vehicle.make} {data.vehicle.model}</Text>
          </View>
          <View style={[localStyles.infoItem, { marginTop: 8 }]}>
            <Text style={localStyles.infoLabel}>Registration</Text>
            <Text style={localStyles.infoValue}>{data.vehicle.registrationNumber}</Text>
          </View>
          <View style={[localStyles.infoItem, { marginTop: 8 }]}>
            <Text style={localStyles.infoLabel}>Maint. Start Date</Text>
            <Text style={localStyles.infoValue}>{fmtDate(data.date)}</Text>
          </View>
          <View style={[localStyles.infoItem, { marginTop: 8 }]}>
            <Text style={localStyles.infoLabel}>Maint. End Date</Text>
            <Text style={localStyles.infoValue}>{fmtDate(data.completedDate)}</Text>
          </View>
        </View>

        {/* Bill To & Service Provider Side-by-Side */}
        <View style={[styles.sectionBreak, { flexDirection: 'row', justifyContent: 'space-between' }]} wrap={false}>
          
          {/* Bill To (Vehicle Owner) */}
          <View style={[styles.card, { width: '48%' }]}>
            <Text style={styles.sectionTitle}>Bill To:</Text>
            <Text style={{ fontWeight: 'bold', fontSize: 10, marginBottom: 2 }}>
              {data.vehicle.owner?.name || 'AIE Skyline Limited'}
            </Text>
            <Text style={{ fontSize: 10 }}>
              {data.vehicle.owner?.address || 'United House, 39-41 North Road, London, N7 9DP'}
            </Text>
          </View>

          {/* Service Provider Details */}
          <View style={[styles.card, { width: '48%' }]}>
            <Text style={styles.sectionTitle}>Service Provider:</Text>
            <Text style={{ fontWeight: 'bold', fontSize: 10, marginBottom: 2 }}>{data.serviceProvider}</Text>
            <Text style={{ fontSize: 10 }}>{data.location}</Text>
            <Text style={{ marginTop: 4, fontSize: 8, color: '#666' }}>
              Mileage: {data.currentMileage?.toLocaleString()}
            </Text>
          </View>
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description of Work</Text>
          <Text style={styles.text}>{data.description}</Text>
          {data.notes && <Text style={[styles.text, { marginTop: 4, fontStyle: 'italic' }]}>Note: {data.notes}</Text>}
        </View>

        {/* Charges Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Maintenance Charges Breakdown</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { flex: 3 }]}>Part Name</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'center' }]}>Qty</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1.5, textAlign: 'right' }]}>Unit (£)</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'right' }]}>VAT</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'right' }]}>Disc</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1.5, textAlign: 'right' }]}>Total</Text>
            </View>

            {/* Parts Rows */}
            {data.parts.map((part, i) => {
               const lineTotal = (part.cost * part.quantity) - ((part.discount || 0)/100 * (part.cost * part.quantity));
               const vatVal = part.includeVAT ? lineTotal * 0.20 : 0;
               const finalLine = lineTotal + vatVal;
               
               return (
                <View key={i} style={styles.tableRow}>
                  <Text style={[styles.tableCell, { flex: 3 }]}>{part.name}</Text>
                  <Text style={[styles.tableCell, { flex: 1, textAlign: 'center' }]}>{part.quantity}</Text>
                  <Text style={[styles.tableCell, { flex: 1.5, textAlign: 'right' }]}>{part.cost.toFixed(2)}</Text>
                  <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>{part.includeVAT ? '20%' : '0%'}</Text>
                  <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>{part.discount}%</Text>
                  <Text style={[styles.tableCell, { flex: 1.5, textAlign: 'right' }]}>{finalLine.toFixed(2)}</Text>
                </View>
               )
            })}

            {/* Labor Row */}
            <View style={[styles.tableRow, { borderTopWidth: 1, borderTopColor: '#E5E7EB', backgroundColor: '#F9FAFB' }]}>
              <Text style={[styles.tableCell, { flex: 3, fontWeight: 'bold' }]}>Labor Charges</Text>
              <Text style={[styles.tableCell, { flex: 1, textAlign: 'center' }]}>{data.laborHours} hrs</Text>
              <Text style={[styles.tableCell, { flex: 1.5, textAlign: 'right' }]}>£{data.laborRate}/hr</Text>
              <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>{data.vatDetails?.laborVAT ? '20%' : '0%'}</Text>
              <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>-</Text>
              <Text style={[styles.tableCell, { flex: 1.5, textAlign: 'right' }]}>
                {laborTotalLine.toFixed(2)}
              </Text>
            </View>

            {/* TOTAL Column Row */}
            <View style={[styles.tableRow, { borderTopWidth: 2, borderTopColor: '#000', backgroundColor: '#fff' }]}>
              <Text style={[styles.tableCell, { flex: 7.5, fontWeight: 'bold', textAlign: 'right', paddingRight: 10 }]}>
                TOTAL
              </Text>
              <Text style={[styles.tableCell, { flex: 1.5, fontWeight: 'bold', textAlign: 'right' }]}>
                £{totalAmount.toFixed(2)}
              </Text>
            </View>

          </View>
        </View>

        {/* Bank & Summary Side-by-Side */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }} wrap={false}>
          <View style={[styles.card, { width: '48%' }]}>
            <Text style={styles.sectionTitle}>Bank Details</Text>
            <Text>Bank: {companyDetails.bankName || 'LLOYDS BANK'}</Text>
            <Text>Account Name: {companyDetails.fullName}</Text>
            <Text>Account Number: {companyDetails.accountNumber || '30513162'}</Text>
            <Text>Sort Code: {companyDetails.sortCode || '30-99-50'}</Text>
          </View>

          <View style={[styles.card, { width: '48%' }]}>
            <Text style={styles.sectionTitle}>Summary</Text>
            
            <View style={styles.spaceBetweenRow}>
              <Text style={styles.label}>Net Amount:</Text>
              <Text style={[styles.value, { textAlign: 'right' }]}>£{netAmount.toFixed(2)}</Text>
            </View>

            <View style={styles.spaceBetweenRow}>
              <Text style={[styles.label, { color: '#2563EB' }]}>VAT Total:</Text>
              <Text style={[styles.value, { color: '#2563EB', textAlign: 'right' }]}>
                £{vatAmount.toFixed(2)}
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

            <View style={[styles.spaceBetweenRow, { borderTopWidth: 1, borderColor: '#ccc', paddingTop: 4 }]}>
              <Text style={[styles.label, { fontWeight: 'bold' }]}>Grand Total:</Text>
              <Text style={[styles.value, { textAlign: 'right', fontWeight: 'bold' }]}>£{totalAmount.toFixed(2)}</Text>
            </View>

            <View style={styles.spaceBetweenRow}>
              <Text style={styles.label}>Paid:</Text>
              <Text style={[styles.value, { textAlign: 'right' }]}>£{paidAmount.toFixed(2)}</Text>
            </View>

            <View style={styles.spaceBetweenRow}>
              <Text style={[styles.label, { color: owingAmount > 0 ? '#DC2626' : '#16A34A' }]}>Owing:</Text>
              <Text style={[styles.value, { textAlign: 'right', color: owingAmount > 0 ? '#DC2626' : '#16A34A' }]}>
                £{owingAmount.toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={[styles.footerText, { textAlign: 'center', width: '100%' }]}>
            {companyDetails.fullName}, {companyDetails.officialAddress}. Tel: {companyDetails.phone}. Email: {companyDetails.email}
          </Text>
          <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
};

export default MaintenanceInvoice;

const localStyles = StyleSheet.create({
  infoCard: {
    borderWidth: 1,
    borderColor: '#3B82F6',
    borderRadius: 6,
    padding: 8,
    // Change to wrap to support 4 items per line over 2 lines
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    marginBottom: 15,
  },
  infoItem: {
    // Force 25% width for 4 items per row
    width: '25%',
    alignItems: 'flex-start',
    paddingHorizontal: 4,
  },
  infoLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#1E40AF',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: 9,
    color: '#1F2937',
  },
});