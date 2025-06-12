// src/components/pdf/VDInvoiceDocument.tsx
import React from 'react';
import { Page, Document, View, Text, Image } from '@react-pdf/renderer';
import { styles } from '../styles';
import { VDInvoice } from '../../../types/vdInvoice';
import { format } from 'date-fns';

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
  };
}

const VDInvoiceDocument: React.FC<VDInvoiceDocumentProps> = ({ data, companyDetails }) => {
  const owing = data.total - data.paidAmount;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Image src={companyDetails.logoUrl} style={styles.logo} />
          <View style={styles.companyInfo}>
            <Text>{companyDetails.phone}</Text>
            <Text>{companyDetails.email}</Text>
            <Text>{companyDetails.website}</Text>
            <Text>{companyDetails.officialAddress}</Text>
            <Text>{companyDetails.postcode}</Text>
          </View>
        </View>

        {/* Date & Invoice */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
          <Text>Date: {format(data.date, 'dd/MM/yyyy')}</Text>
          <Text>Invoice: {data.invoiceNumber}</Text>
        </View>

        {/* Info Cards */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
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

        {/* Table */}
        <View style={styles.tableContainer}>
          <Text style={styles.sectionTitle}>Invoice Details</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <View style={[styles.tableCell, { flex: 2 }]}><Text>Description</Text></View>
              <View style={styles.tableCell}><Text>Rate</Text></View>
              <View style={styles.tableCell}><Text>Qty</Text></View>
              <View style={styles.tableCell}><Text>Total</Text></View>
            </View>

            {/* Labor */}
            <View style={styles.tableRow}>
              <View style={[styles.tableCell, { flex: 2 }]}><Text>Labor Cost</Text></View>
              <View style={styles.tableCell}><Text>£{data.laborCost.toFixed(2)}</Text></View>
              <View style={styles.tableCell}><Text>1</Text></View>
              <View style={styles.tableCell}><Text>£{data.laborCost.toFixed(2)}</Text></View>
            </View>

            {/* Parts */}
            {data.parts.map((part, idx) => (
              <View key={idx} style={styles.tableRow}>
                <View style={[styles.tableCell, { flex: 2 }]}><Text>{part.name}</Text></View>
                <View style={styles.tableCell}><Text>£{part.price.toFixed(2)}</Text></View>
                <View style={styles.tableCell}><Text>{part.quantity}</Text></View>
                <View style={styles.tableCell}><Text>£{(part.price * part.quantity).toFixed(2)}</Text></View>
              </View>
            ))}

            {/* Paint/Materials */}
            <View style={styles.tableRow}>
              <View style={[styles.tableCell, { flex: 2 }]}><Text>Paint/Materials</Text></View>
              <View style={styles.tableCell}><Text>£{data.paintMaterials.toFixed(2)}</Text></View>
              <View style={styles.tableCell}><Text>1</Text></View>
              <View style={styles.tableCell}><Text>£{data.paintMaterials.toFixed(2)}</Text></View>
            </View>
          </View>
        </View>

        {/* Bank + Summary */}
        <View style={[styles.section, { flexDirection: 'row', justifyContent: 'space-between' }]}>
          {/* Bank Details */}
          <View style={[styles.card, { width: '48%' }]}>
            <Text style={styles.sectionTitle}>Bank Details</Text>
            <Text>Bank: LLOYDS BANK</Text>
            <Text>Account Name: AIE SKYLINE LIMITED</Text>
            <Text>Account Number: 30513162</Text>
            <Text>Sort Code: 30-99-50</Text>
          </View>
          {/* Summary */}
          <View style={[styles.card, { width: '48%' }]}>
            <Text style={styles.sectionTitle}>Summary</Text>
            <View style={styles.spaceBetweenRow}> {/* Changed from styles.flexRow */}
              <Text style={styles.label}>Net:</Text>
              <Text style={[styles.value, { textAlign: 'right' }]}>£{data.subtotal.toFixed(2)}</Text>
            </View>
            <View style={styles.spaceBetweenRow}> {/* Changed from styles.flexRow */}
              <Text style={styles.label}>V.A.T.:</Text>
              <Text style={[styles.value, { textAlign: 'right' }]}>£{data.vatAmount.toFixed(2)}</Text>
            </View>
            <View style={styles.spaceBetweenRow}> {/* Changed from styles.flexRow */}
              <Text style={styles.label}>Total:</Text>
              <Text style={[styles.value, { textAlign: 'right' }]}>£{data.total.toFixed(2)}</Text>
            </View>
            <View style={styles.spaceBetweenRow}> {/* Changed from styles.flexRow */}
              <Text style={styles.label}>Paid:</Text>
              <Text style={[styles.value, { textAlign: 'right' }]}>£{data.paidAmount.toFixed(2)}</Text>
            </View>
            <View style={styles.spaceBetweenRow}> {/* Changed from styles.flexRow */}
              <Text style={styles.label}>Owing:</Text>
              <Text style={[styles.value, { textAlign: 'right' }]}>£{owing.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>
            Registered in England & Wales | Co. No {companyDetails.registrationNumber} | VAT No {companyDetails.vatNumber}
          </Text>
        </View>
      </Page>
    </Document>
  );
};

export default VDInvoiceDocument;