// MaintenanceDocument.tsx
import React from 'react';
import { Text, View, Page, Document, Image } from '@react-pdf/renderer'; // Added Page, Document, Image
import { MaintenanceLog, Vehicle } from '../../../types';
// import BaseDocument from '../BaseDocument'; // Remove BaseDocument import
import { formatDate } from '../../../utils/dateHelpers';
import { styles } from '../styles';

interface EnrichedPart {
  name: string;
  quantity: number;
  cost: number;
  discount?: number;
  includeVAT?: boolean;
}

interface MaintenanceDocumentProps {
  data: MaintenanceLog & { vehicle: Vehicle; parts: EnrichedPart[] };
  companyDetails: {
    bankName?: string;
    sortCode?: string;
    accountNumber?: string;
    maintenanceTerms?: string;
    logoUrl?: string; // Added logoUrl for header
    fullName?: string; // Added fullName for header
    officialAddress?: string; // Added officialAddress for header
    phone?: string; // Added phone for header
    email?: string; // Added email for header
  };
}

const VAT_RATE = 0.20;

const MaintenanceDocument: React.FC<MaintenanceDocumentProps> = ({ data, companyDetails }) => {
  const calculatePartLineDetails = (part: EnrichedPart) => {
    const unitPrice = part.cost;
    const quantity = part.quantity;
    const discountPercentage = part.discount || 0;
    const includeVAT = part.includeVAT || false;

    const baseTotal = unitPrice * quantity;
    const discountAmount = baseTotal * (discountPercentage / 100);
    const netAfterDiscount = baseTotal - discountAmount;
    const vatAmountOnPart = includeVAT ? netAfterDiscount * VAT_RATE : 0;
    const lineTotal = netAfterDiscount + vatAmountOnPart;

    return {
      name: part.name,
      quantity,
      unitPrice,
      vatAmountOnPart,
      discountAmount,
      netAfterDiscount,
      lineTotal,
    };
  };

  const calculateDocumentTotals = () => {
    let totalDocNetAmount = 0;
    let totalDocVatAmount = 0;

    data.parts.forEach((part) => {
      const { netAfterDiscount, vatAmountOnPart } = calculatePartLineDetails(part);
      totalDocNetAmount += netAfterDiscount;
      totalDocVatAmount += vatAmountOnPart;
    });

    const netLaborCost = data.laborCost || 0;
    totalDocNetAmount += netLaborCost;
    if (data.vatDetails?.laborVAT) {
      totalDocVatAmount += netLaborCost * VAT_RATE;
    }

    const authoritativeTotalAmount = data.cost || totalDocNetAmount + totalDocVatAmount;
    const paidAmount = data.paidAmount || 0;
    const owingAmount = authoritativeTotalAmount - paidAmount;

    return {
      netAmount: totalDocNetAmount,
      vatAmount: totalDocVatAmount,
      totalAmount: authoritativeTotalAmount,
      paidAmount,
      owingAmount,
    };
  };

  const documentTotals = calculateDocumentTotals();

  return (
    // Removed BaseDocument and directly using Document and Page
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header - Replicated from Vehicle Documents */}
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
          <Text style={styles.title}>{`${data.type.replace('-', ' ')} Invoice`}</Text>
        </View>

      {/* Vehicle & Maintenance Info Side by Side */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 }}>
        <View style={[styles.card, { width: '48%' }]}>
          <Text style={styles.cardTitle}>Vehicle Information</Text>
          <View style={styles.flexRow}>
            <Text style={styles.label}>Make & Model:</Text>
            <Text style={styles.value}>{data.vehicle.make} {data.vehicle.model}</Text>
          </View>
          <View style={styles.flexRow}>
            <Text style={styles.label}>Registration:</Text>
            <Text style={styles.value}>{data.vehicle.registrationNumber}</Text>
          </View>
        </View>

        <View style={[styles.card, { width: '48%' }]}>
          <Text style={styles.cardTitle}>Maintenance Information</Text>
          <View style={styles.flexRow}>
            <Text style={styles.label}>Type:</Text>
            <Text style={styles.value}>{data.type.replace('-', ' ')}</Text>
          </View>
          <View style={styles.flexRow}>
            <Text style={styles.label}>Date:</Text>
            <Text style={styles.value}>{formatDate(data.date)}</Text>
          </View>
          <View style={styles.flexRow}>
            <Text style={styles.label}>Service Provider:</Text>
            <Text style={styles.value}>{data.serviceProvider}</Text>
          </View>
          <View style={styles.flexRow}>
            <Text style={styles.label}>Mileage:</Text>
            <Text style={styles.value}>{data.currentMileage?.toLocaleString() || 'N/A'} km</Text>
          </View>
        </View>
      </View>

      {/* Parts Used Table */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Parts Used</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, { flex: 2.5 }]}>Name</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'center' }]}>Quantity</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1.5, textAlign: 'right' }]}>Unit Price</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1.2, textAlign: 'right' }]}>Discount</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1.2, textAlign: 'right' }]}>VAT</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1.5, textAlign: 'right' }]}>Total</Text>
          </View>

          {data.parts.map((part, index) => {
            const details = calculatePartLineDetails(part);
            const rowStyle = index % 2 === 0 ? styles.tableRow : styles.tableRowAlternate;
            return (
              <View key={index} style={rowStyle}>
                <Text style={[styles.tableCell, { flex: 2.5 }]}>{details.name}</Text>
                <Text style={[styles.tableCell, { flex: 1, textAlign: 'center' }]}>{details.quantity}</Text>
                <Text style={[styles.tableCell, { flex: 1.5, textAlign: 'right' }]}>£{details.unitPrice.toFixed(2)}</Text>
                <Text style={[styles.tableCell, { flex: 1.2, textAlign: 'right' }]}>£{details.discountAmount.toFixed(2)}</Text>
                <Text style={[styles.tableCell, { flex: 1.2, textAlign: 'right' }]}>£{details.vatAmountOnPart.toFixed(2)}</Text>
                <Text style={[styles.tableCell, { flex: 1.5, textAlign: 'right' }]}>£{details.lineTotal.toFixed(2)}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Labor Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Labor Details</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.tableHeaderCell}>Description</Text>
            <Text style={[styles.tableHeaderCell, { textAlign: 'center' }]}>Hours</Text>
            <Text style={[styles.tableHeaderCell, { textAlign: 'right' }]}>Rate</Text>
            <Text style={[styles.tableHeaderCell, { textAlign: 'right' }]}>NET Labor Cost</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCell}>Labor Charges</Text>
            <Text style={[styles.tableCell, { textAlign: 'center' }]}>{data.laborHours || 0}</Text>
            <Text style={[styles.tableCell, { textAlign: 'right' }]}>£{(data.laborRate || 0).toFixed(2)}/hr</Text>
            <Text style={[styles.tableCell, { textAlign: 'right' }]}>£{(data.laborCost || 0).toFixed(2)}</Text>
          </View>
          {data.vatDetails?.laborVAT && (data.laborCost || 0) > 0 && (
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, { flexGrow: 3, textAlign: 'right', fontWeight: 'bold' }]}>
                VAT on Labor:
              </Text>
              <Text style={[styles.tableCell, { flexGrow: 1, textAlign: 'right', fontWeight: 'bold' }]}>
                £{((data.laborCost || 0) * VAT_RATE).toFixed(2)}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Bank Details & Payment Summary (kept together) */}
      <View style={[styles.section, { marginBottom: companyDetails.maintenanceTerms ? 10 : 0 }]} wrap={false}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }} wrap={false}>
          <View style={[styles.card, { width: '48%' }]}>
            <Text style={styles.cardTitle}>Bank Details</Text>
            <Text style={styles.companyDetail}>Bank: {companyDetails.bankName || 'AIE Skyline Limited'}</Text>
            <Text style={styles.companyDetail}>Sort Code: {companyDetails.sortCode || '30-99-50'}</Text>
            <Text style={styles.companyDetail}>Account No: {companyDetails.accountNumber || '30513162'}</Text>
            <Text style={styles.companyDetail}>Reference: {data.id.slice(-8).toUpperCase() || 'MAINT-REF'}</Text>
          </View>

          <View style={[styles.card, { width: '48%' }]}>
            <Text style={styles.cardTitle}>Payment Summary</Text>
            <View style={styles.spaceBetweenRow}>
              <Text style={styles.label}>Total NET:</Text>
              <Text style={[styles.value, { textAlign: 'right' }]}>£{documentTotals.netAmount.toFixed(2)}</Text>
            </View>
            {documentTotals.vatAmount > 0 && (
              <View style={styles.spaceBetweenRow}>
                <Text style={styles.label}>Total VAT:</Text>
                <Text style={[styles.value, { textAlign: 'right' }]}>£{documentTotals.vatAmount.toFixed(2)}</Text>
              </View>
            )}
            <View style={[styles.spaceBetweenRow, { borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 5, marginTop: 5 }]}>
              <Text style={[styles.label, { fontWeight: 'bold' }]}>Grand Total:</Text>
              <Text style={[styles.value, { textAlign: 'right', fontWeight: 'bold' }]}>£{documentTotals.totalAmount.toFixed(2)}</Text>
            </View>
            <View style={styles.spaceBetweenRow}>
              <Text style={styles.label}>Amount Paid:</Text>
              <Text style={[styles.value, { textAlign: 'right' }]}>£{documentTotals.paidAmount.toFixed(2)}</Text>
            </View>
            <View style={[styles.spaceBetweenRow, { backgroundColor: documentTotals.owingAmount > 0 ? '#FFFBEB' : '#F0FDF4', paddingVertical: 3, borderRadius: 3 }]}>
              <Text style={[styles.label, { fontWeight: 'bold' }]}>Balance Owing:</Text>
              <Text style={[styles.value, { textAlign: 'right', fontWeight: 'bold' }]}>£{documentTotals.owingAmount.toFixed(2)}</Text>
            </View>
            <View style={styles.spaceBetweenRow}>
              <Text style={styles.label}>Payment Status:</Text>
              <Text style={[styles.value, { textAlign: 'right', textTransform: 'capitalize' }]}>{data.paymentStatus?.replace('_', ' ') || 'N/A'}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Terms and Conditions */}
      {companyDetails.maintenanceTerms && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Terms &amp; Conditions</Text>
          <Text style={styles.termsText}>{companyDetails.maintenanceTerms}</Text>
        </View>
      )}

        {/* Footer - Replicated from Vehicle Documents */}
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

export default MaintenanceDocument;