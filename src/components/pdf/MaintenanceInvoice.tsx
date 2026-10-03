// src/components/pdf/MaintenanceInvoice.tsx
import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { MaintenanceLog, Vehicle } from '../../types';
import { format } from 'date-fns';
import SafePdfLogo from './SafePdfLogo';
import { styles } from './styles';
import { formatInlineCompanyFooter, extractActiveCorporateEntityProfile } from '../../utils/legalDocumentUtils';

interface MaintenanceInvoiceProps {
  data: MaintenanceLog & { vehicle: Vehicle };
  companyDetails: {
    logoUrl?: string;
    fullName: string;
    officialAddress: string;
    phone: string;
    email: string;
    website?: string;
    bankName?: string;
    accountNumber?: string;
    sortCode?: string;
  };
}

const MaintenanceInvoice: React.FC<MaintenanceInvoiceProps> = ({
  data = {} as any,
  companyDetails = {} as any,
}) => {
  const activeProfile = extractActiveCorporateEntityProfile(companyDetails);
  const effectiveDetails = {
    ...companyDetails,
    fullName: activeProfile.companyName || companyDetails?.fullName || 'Company',
    officialAddress: activeProfile.companyAddress || companyDetails?.officialAddress,
    phone: activeProfile.phone || companyDetails?.phone,
    email: activeProfile.email || companyDetails?.email,
    website: activeProfile.website || companyDetails?.website,
  };
  const safeData = data || ({} as any);
  const safeVehicle = safeData.vehicle || ({} as any);
  const safeParts = Array.isArray(safeData.parts) ? safeData.parts : [];

  const toDate = (d: any): Date | null => {
    if (!d) return null;
    if (d instanceof Date) return isNaN(d.getTime()) ? null : d;
    if (typeof d?.toDate === 'function') {
      try {
        const res = d.toDate();
        return isNaN(res.getTime()) ? null : res;
      } catch {
        return null;
      }
    }
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? null : dt;
  };

  const fmtDate = (d: any) => {
    const dt = toDate(d);
    return dt ? format(dt, 'dd/MM/yyyy') : 'N/A';
  };

  const invoiceNo = safeData.invoiceNumber || (safeData.id ? `INV-${safeData.id.slice(0, 8).toUpperCase()}` : 'INV-MAINT-PREVIEW');
  const orderNo = safeData.orderNumber || 'N/A';
  
  // --- Calculations ---
  const netAmount = typeof safeData.netAmount === 'number' ? safeData.netAmount : 0;
  const vatAmount = typeof safeData.vatAmount === 'number' ? safeData.vatAmount : 0;
  const totalAmount = typeof safeData.cost === 'number' ? safeData.cost : 0;
  const paidAmount = typeof safeData.paidAmount === 'number' ? safeData.paidAmount : 0;
  const owingAmount = typeof safeData.remainingAmount === 'number' ? safeData.remainingAmount : 0;
  const discountAmount = typeof safeData.totalDiscount === 'number' ? safeData.totalDiscount : 0;

  // Calculate Labor Line Total for the table display
  const laborNet = typeof safeData.laborCost === 'number' ? safeData.laborCost : 0;
  const laborVat = safeData.vatDetails?.laborVAT ? laborNet * 0.20 : 0;
  const laborTotalLine = laborNet + laborVat;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header} fixed>
          <View style={styles.headerLeft}>
            <SafePdfLogo
              src={companyDetails?.logoUrl}
              companyName={effectiveDetails.fullName}
              style={styles.logo}
            />
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.companyName}>{effectiveDetails.fullName}</Text>
            <Text style={styles.companyDetail}>{effectiveDetails.officialAddress}</Text>
            <Text style={styles.companyDetail}>Tel: {effectiveDetails.phone}</Text>
            <Text style={styles.companyDetail}>Email: {effectiveDetails.email}</Text>
            {Boolean(effectiveDetails.website) && (
              <Text style={styles.companyDetail}>Web: {effectiveDetails.website}</Text>
            )}
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
            <Text style={localStyles.infoValue}>{fmtDate(safeData.invoiceDate || new Date())}</Text>
          </View>
          <View style={localStyles.infoItem}>
            <Text style={localStyles.infoLabel}>Due Date</Text>
            <Text style={localStyles.infoValue}>{fmtDate(safeData.invoiceDueDate || new Date())}</Text>
          </View>

          {/* Row 2 */}
          <View style={[localStyles.infoItem, { marginTop: 8 }]}>
            <Text style={localStyles.infoLabel}>Vehicle</Text>
            <Text style={localStyles.infoValue}>{safeVehicle.make ? `${safeVehicle.make} ${safeVehicle.model || ''}`.trim() : (safeData.vehicleName || '-')}</Text>
          </View>
          <View style={[localStyles.infoItem, { marginTop: 8 }]}>
            <Text style={localStyles.infoLabel}>Registration</Text>
            <Text style={localStyles.infoValue}>{safeVehicle.registrationNumber || safeData.vehicleRegistration || 'N/A'}</Text>
          </View>
          <View style={[localStyles.infoItem, { marginTop: 8 }]}>
            <Text style={localStyles.infoLabel}>Maint. Start Date</Text>
            <Text style={localStyles.infoValue}>{fmtDate(safeData.date)}</Text>
          </View>
          <View style={[localStyles.infoItem, { marginTop: 8 }]}>
            <Text style={localStyles.infoLabel}>Maint. End Date</Text>
            <Text style={localStyles.infoValue}>{fmtDate(safeData.completedDate)}</Text>
          </View>
        </View>

        {/* Bill To & Service Provider Side-by-Side */}
        <View style={[styles.sectionBreak, { flexDirection: 'row', justifyContent: 'space-between' }]} wrap={false}>
          
          {/* Bill To (Vehicle Owner) */}
          <View style={[styles.card, { width: '48%' }]}>
            <Text style={styles.sectionTitle}>Bill To:</Text>
            <Text style={{ fontWeight: 'bold', fontSize: 10, marginBottom: 2 }}>
              {safeVehicle.owner?.name || 'AIE Skyline Limited'}
            </Text>
            <Text style={{ fontSize: 10 }}>
              {safeVehicle.owner?.address || 'United House, 39-41 North Road, London, N7 9DP'}
            </Text>
          </View>

          {/* Service Provider Details */}
          <View style={[styles.card, { width: '48%' }]}>
            <Text style={styles.sectionTitle}>Service Provider:</Text>
            <Text style={{ fontWeight: 'bold', fontSize: 10, marginBottom: 2 }}>{safeData.serviceProvider || 'Workshop & Fleet Services'}</Text>
            <Text style={{ fontSize: 10 }}>{safeData.location || 'Fleet Maintenance Hub'}</Text>
            <Text style={{ marginTop: 4, fontSize: 8, color: '#666' }}>
              Mileage: {typeof safeData.currentMileage === 'number' ? safeData.currentMileage.toLocaleString() : (safeData.currentMileage || 'N/A')}
            </Text>
          </View>
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description of Work</Text>
          <Text style={styles.text}>{safeData.description || 'Maintenance service and workshop inspection carried out.'}</Text>
          {safeData.notes && <Text style={[styles.text, { marginTop: 4, fontStyle: 'italic' }]}>Note: {safeData.notes}</Text>}
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
            {safeParts.map((part: any, i: number) => {
               const qty = typeof part.quantity === 'number' ? part.quantity : 1;
               const cost = typeof part.cost === 'number' ? part.cost : 0;
               const disc = typeof part.discount === 'number' ? part.discount : 0;
               const lineTotal = (cost * qty) - (disc / 100 * (cost * qty));
               const vatVal = part.includeVAT ? lineTotal * 0.20 : 0;
               const finalLine = lineTotal + vatVal;
               
               return (
                <View key={i} style={styles.tableRow}>
                  <Text style={[styles.tableCell, { flex: 3 }]}>{part.name || 'Replacement Part'}</Text>
                  <Text style={[styles.tableCell, { flex: 1, textAlign: 'center' }]}>{qty}</Text>
                  <Text style={[styles.tableCell, { flex: 1.5, textAlign: 'right' }]}>{cost.toFixed(2)}</Text>
                  <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>{part.includeVAT ? '20%' : '0%'}</Text>
                  <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>{disc}%</Text>
                  <Text style={[styles.tableCell, { flex: 1.5, textAlign: 'right' }]}>{finalLine.toFixed(2)}</Text>
                </View>
               );
            })}

            {/* Labor Row */}
            <View style={[styles.tableRow, { borderTopWidth: 1, borderTopColor: '#E5E7EB', backgroundColor: '#F9FAFB' }]}>
              <Text style={[styles.tableCell, { flex: 3, fontWeight: 'bold' }]}>Labor Charges</Text>
              <Text style={[styles.tableCell, { flex: 1, textAlign: 'center' }]}>{safeData.laborHours || 0} hrs</Text>
              <Text style={[styles.tableCell, { flex: 1.5, textAlign: 'right' }]}>£{safeData.laborRate || 0}/hr</Text>
              <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>{safeData.vatDetails?.laborVAT ? '20%' : '0%'}</Text>
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
              <Text style={[styles.label, { color: '#000000', fontWeight: 'bold' }]}>Net Amount:</Text>
              <Text style={[styles.value, { textAlign: 'right', color: '#000000', fontWeight: 'bold' }]}>£{netAmount.toFixed(2)}</Text>
            </View>

            <View style={styles.spaceBetweenRow}>
              <Text style={[styles.label, { color: '#2563EB', fontWeight: 'bold' }]}>VAT Total:</Text>
              <Text style={[styles.value, { color: '#2563EB', textAlign: 'right', fontWeight: 'bold' }]}>
                £{vatAmount.toFixed(2)}
              </Text>
            </View>

            {discountAmount > 0 && (
              <View style={styles.spaceBetweenRow}>
                <Text style={[styles.label, { color: '#D97706', fontWeight: 'bold' }]}>Discount:</Text>
                <Text style={[styles.value, { color: '#D97706', textAlign: 'right', fontWeight: 'bold' }]}>
                  –£{discountAmount.toFixed(2)}
                </Text>
              </View>
            )}

            <View style={[styles.spaceBetweenRow, { borderTopWidth: 1, borderColor: '#ccc', paddingTop: 4 }]}>
              <Text style={[styles.label, { fontWeight: 'bold', color: '#D97706' }]}>Grand Total:</Text>
              <Text style={[styles.value, { textAlign: 'right', fontWeight: 'bold', color: '#D97706' }]}>£{totalAmount.toFixed(2)}</Text>
            </View>

            <View style={styles.spaceBetweenRow}>
              <Text style={[styles.label, { color: '#15803D', fontWeight: 'bold' }]}>Paid:</Text>
              <Text style={[styles.value, { textAlign: 'right', color: '#15803D', fontWeight: 'bold' }]}>£{paidAmount.toFixed(2)}</Text>
            </View>

            <View style={styles.spaceBetweenRow}>
              <Text style={[styles.label, { fontWeight: 'bold', color: owingAmount > 0.001 ? '#DC2626' : '#15803D' }]}>Owing:</Text>
              <Text style={[styles.value, { textAlign: 'right', fontWeight: 'bold', color: owingAmount > 0.001 ? '#DC2626' : '#15803D' }]}>
                £{owingAmount.toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            {formatInlineCompanyFooter(effectiveDetails)}
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