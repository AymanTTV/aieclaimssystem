// src/components/pdf/VDInvoiceDocument.tsx
import React from 'react';
import { Page, Document, View, Text, Image } from '@react-pdf/renderer';
import { styles } from '../styles'; // Assuming 'styles.ts' contains the shared styles
import { VDInvoice } from '../../../types/vdInvoice';
import { format } from 'date-fns';
import { formatInlineCompanyFooter } from '../../../utils/legalDocumentUtils';

interface VDInvoiceDocumentProps {
  data: VDInvoice;
  companyDetails: {
    logoUrl: string;
    phone: string;
    email: string;
    website: string;
    officialAddress: string;
    postcode: string;
    registrationNumber: string;
    vatNumber: string;
    fullName?: string; // Added fullName as it's used in header
  };
}

const VDInvoiceDocument: React.FC<VDInvoiceDocumentProps> = ({ data, companyDetails }) => {
  const owing = data.total - data.paidAmount;

  // Derive header details from companyDetails, splitting the address
  const headerDetails = {
    logoUrl: companyDetails?.logoUrl || '',
    fullName: companyDetails?.fullName || 'AIE Skyline Limited',
    // Assuming officialAddress is "United House, 39-41 North Road, London, N7 9DP"
    addressLine1: 'United House, 39-41 North Road,',
    addressLine2: 'London, N7 9DP.',
    phone: companyDetails?.phone || 'N/A',
    email: companyDetails?.email || 'N/A',
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>

        {/* Header - Updated to match the consistent design */}
        <View style={styles.header} fixed>
          <View style={styles.headerLeft}>
            {headerDetails.logoUrl && (
              <Image src={headerDetails.logoUrl} style={styles.logo} />
            )}
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.companyName}>{headerDetails.fullName}</Text>
            <Text style={styles.companyDetail}>{headerDetails.addressLine1}</Text>
            <Text style={styles.companyDetail}>{headerDetails.addressLine2}</Text>
            <Text style={styles.companyDetail}>Tel: {headerDetails.phone}</Text>
            <Text style={styles.companyDetail}>Email: {headerDetails.email}</Text>
          </View>
        </View>

        {/* Date & Invoice */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
          <Text>Date: {format(data.date, 'dd/MM/yyyy')}</Text>
          <Text>Invoice: {data.invoiceNumber}</Text>
        </View>

        {/* Info Cards */}
        <View
          style={[
            { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
            styles.keepTogether
          ]}
          wrap={false}
        >
          <View style={[styles.infoCard, { flex: 1, borderLeftColor: '#10B981', borderLeftWidth: 4, marginRight: 10 }]}>
            <Text style={styles.infoCardTitle}>Customer Information</Text>
            <View style={styles.flexRow}>
              <Text style={styles.label}>Name:</Text>
              <Text style={styles.value}>{data.customerName}</Text>
            </View>
            <View style={styles.flexRow}>
              <Text style={styles.label}>Address:</Text>
              <Text style={styles.value}>{data.customerAddress} {data.customerPostcode}</Text>
            </View>
          </View>

          <View style={[styles.infoCard, { flex: 1, borderLeftColor: '#3B82F6', borderLeftWidth: 4, marginLeft: 10 }]}>
            <Text style={styles.infoCardTitle}>Vehicle Details</Text>
            <View style={styles.flexRow}>
              <Text style={styles.label}>Registration:</Text>
              <Text style={styles.value}>{data.registration}</Text>
            </View>
            <View style={styles.flexRow}>
              <Text style={styles.label}>Make:</Text>
              <Text style={styles.value}>{data.make}</Text>
            </View>
            <View style={styles.flexRow}>
              <Text style={styles.label}>Model:</Text>
              <Text style={styles.value}>{data.model}</Text>
            </View>
            <View style={styles.flexRow}>
              <Text style={styles.label}>Color:</Text>
              <Text style={styles.value}>{data.color}</Text>
            </View>
          </View>
        </View>

        {/* Parts */}
        <View style={styles.tableContainer}>
          <Text style={styles.sectionTitle}>Parts</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <View style={[styles.tableCell, { flex: 2 }]}><Text>Description</Text></View>
              <View style={styles.tableCell}><Text>Rate</Text></View>
              <View style={styles.tableCell}><Text>Qty</Text></View>
              <View style={styles.tableCell}><Text>Total</Text></View>
            </View>
            {data.parts.map((part, idx) => (
              <View key={idx} style={styles.tableRow}>
                <View style={[styles.tableCell, { flex: 2 }]}><Text>{part.name}</Text></View>
                <View style={styles.tableCell}><Text>£{part.price.toFixed(2)}</Text></View>
                <View style={styles.tableCell}><Text>{part.quantity}</Text></View>
                <View style={styles.tableCell}><Text>£{(part.price * part.quantity).toFixed(2)}</Text></View>
              </View>
            ))}
          </View>
        </View>

        {/* Labor & Paint/Materials Costs */}
        <View style={[styles.tableContainer, styles.keepTogether]} wrap={false}>
          <Text style={styles.sectionTitle}>Labor & Paint/Materials Costs</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <View style={[styles.tableCell, { flex: 2 }]}><Text>Description</Text></View>
              <View style={styles.tableCell}><Text>Cost</Text></View>
            </View>
            <View style={styles.tableRow}>
              <View style={[styles.tableCell, { flex: 2 }]}><Text>Paint/Materials{data.paintMaterialsVAT ? ' +VAT' : ''}</Text></View>
              <View style={styles.tableCell}><Text>£{data.paintMaterials.toFixed(2)}</Text></View>
            </View>
            <View style={styles.tableRow}>
              <View style={[styles.tableCell, { flex: 2 }]}><Text>Labor Cost ({data.laborHours}h @ £{data.laborRate}/h{data.laborVAT ? ' +VAT' : ''})</Text></View>
              <View style={styles.tableCell}><Text>£{data.laborCost.toFixed(2)}</Text></View>
            </View>
          </View>
        </View>

        {/* Bank Details & Summary (keep together) */}
        <View
          style={[
            { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
            styles.keepTogether
          ]}
          wrap={false}
        >
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
              <Text style={[styles.label, { color: '#000000', fontWeight: 'bold' }]}>Net:</Text>
              <Text style={[styles.value, { textAlign: 'right', color: '#000000', fontWeight: 'bold' }]}>£{data.subtotal.toFixed(2)}</Text>
            </View>
            <View style={styles.spaceBetweenRow}>
              <Text style={[styles.label, { color: '#2563EB', fontWeight: 'bold' }]}>V.A.T.:</Text>
              <Text style={[styles.value, { textAlign: 'right', color: '#2563EB', fontWeight: 'bold' }]}>£{data.vatAmount.toFixed(2)}</Text>
            </View>
            <View style={styles.spaceBetweenRow}>
              <Text style={[styles.label, { color: '#D97706', fontWeight: 'bold' }]}>Total:</Text>
              <Text style={[styles.value, { textAlign: 'right', color: '#D97706', fontWeight: 'bold' }]}>£{data.total.toFixed(2)}</Text>
            </View>
            <View style={styles.spaceBetweenRow}>
              <Text style={[styles.label, { color: '#15803D', fontWeight: 'bold' }]}>Paid:</Text>
              <Text style={[styles.value, { textAlign: 'right', color: '#15803D', fontWeight: 'bold' }]}>£{data.paidAmount.toFixed(2)}</Text>
            </View>
            <View style={styles.spaceBetweenRow}>
              <Text style={[styles.label, { fontWeight: 'bold', color: owing > 0.001 ? '#DC2626' : '#15803D' }]}>Owing:</Text>
              <Text style={[styles.value, { textAlign: 'right', fontWeight: 'bold', color: owing > 0.001 ? '#DC2626' : '#15803D' }]}>£{owing.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        {/* Footer - Updated to match the consistent design */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            {formatInlineCompanyFooter(companyDetails)}
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

export default VDInvoiceDocument;