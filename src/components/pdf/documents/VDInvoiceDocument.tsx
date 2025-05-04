import React from 'react';
import { Page, Document, View, Text, Image } from '@react-pdf/renderer';
import { styles } from '../styles'; // Import your styles
import { VDInvoice } from '../../../types/vdInvoice';
import { format } from 'date-fns';

interface VDInvoiceDocumentProps {
  data: VDInvoice;
  companyDetails: any;
}

const VDInvoiceDocument: React.FC<VDInvoiceDocumentProps> = ({ data, companyDetails }) => {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Image source={companyDetails.logoUrl} style={styles.logo} />
          <View style={styles.companyInfo}>
            <Text>{companyDetails.phone}</Text>
            <Text>{companyDetails.email}</Text>
            <Text>{companyDetails.website}</Text>
            <Text>{companyDetails.officialAddress}</Text>
            <Text>{companyDetails.postcode}</Text>
          </View>
        </View>

        {/* Date and Invoice Number */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
          <Text>Date: {format(data.date, 'dd/MM/yyyy')}</Text>
          <Text>Invoice: {data.invoiceNumber}</Text>
        </View>

        {/* Customer and Vehicle Info Cards */}
        <View style={styles.grid}>
          <View style={styles.gridItem}>
            <View style={styles.infoCard}>
              <Text style={styles.infoCardTitle}>Customer Information</Text>
              <View style={styles.row}>
                <Text style={styles.label}>Name:</Text>
                <Text style={styles.value}>{data.customerName}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Address:</Text>
                <Text style={styles.value}>{data.customerAddress} {data.customerPostcode}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Email:</Text>
                <Text style={styles.value}>{data.customerEmail}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Phone:</Text>
                <Text style={styles.value}>{data.customerPhone}</Text>
              </View>
            </View>
          </View>

          <View style={styles.gridItem}>
            <View style={styles.infoCard}>
              <Text style={styles.infoCardTitle}>Vehicle Details</Text>
              <View style={styles.row}>
                <Text style={styles.label}>Registration:</Text>
                <Text style={styles.value}>{data.registration}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Make:</Text>
                <Text style={styles.value}>{data.make}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Model:</Text>
                <Text style={styles.value}>{data.model}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Color:</Text>
                <Text style={styles.value}>{data.color}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Table */}
        <View style={styles.tableContainer}>
          <Text style={styles.sectionTitle}>Invoice Details</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <View style={[styles.tableCell, { flex: 2 }]}>
                <Text>Description</Text>
              </View>
              <View style={styles.tableCell}>
                <Text>Rate</Text>
              </View>
              <View style={styles.tableCell}>
                <Text>Qty</Text>
              </View>
              <View style={styles.tableCell}>
                <Text>Total</Text>
              </View>
            </View>

            {/* Labor Cost */}
            <View style={styles.tableRow}>
              <View style={[styles.tableCell, { flex: 2 }]}>
                <Text>Labor Cost</Text>
              </View>
              <View style={styles.tableCell}>
                <Text>£{data.laborCost.toFixed(2)}</Text>
              </View>
              <View style={styles.tableCell}>
                <Text>1</Text>
              </View>
              <View style={styles.tableCell}>
                <Text>£{data.laborCost.toFixed(2)}</Text>
              </View>
            </View>

            {/* Parts */}
            {data.parts.map((part, index) => (
              <View key={index} style={styles.tableRow}>
                <View style={[styles.tableCell, { flex: 2 }]}>
                  <Text>{part.name}</Text>
                </View>
                <View style={styles.tableCell}>
                  <Text>£{part.price.toFixed(2)}</Text>
                </View>
                <View style={styles.tableCell}>
                  <Text>{part.quantity}</Text>
                </View>
                <View style={styles.tableCell}>
                  <Text>£{(part.price * part.quantity).toFixed(2)}</Text>
                </View>
              </View>
            ))}

            {/* Paint/Materials */}
            <View style={styles.tableRow}>
              <View style={[styles.tableCell, { flex: 2 }]}>
                <Text>Paint/Materials</Text>
              </View>
              <View style={styles.tableCell}>
                <Text>£{data.paintMaterials.toFixed(2)}</Text>
              </View>
              <View style={styles.tableCell}>
                <Text>1</Text>
              </View>
              <View style={styles.tableCell}>
                <Text>£{data.paintMaterials.toFixed(2)}</Text>
              </View>
            </View>

            {/* VAT */}
            <View style={styles.tableRow}>
              <View style={[styles.tableCell, { flex: 2 }]}>
                <Text>VAT</Text>
              </View>
              <View style={styles.tableCell}>
                <Text>£{data.vatAmount.toFixed(2)}</Text>
              </View>
              <View style={styles.tableCell}>
                <Text>1</Text>
              </View>
              <View style={styles.tableCell}>
                <Text>£{data.vatAmount.toFixed(2)}</Text>
              </View>
            </View>

             {/* Payment Summary */}
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 15, backgroundColor: '#f0f0f0', padding: 10 }}>
          <View style={{ width: '70%', flexDirection: 'row' }}> {/* Increased width to 70% */}
            <View style={{ width: '40%', paddingRight: 10, alignItems: 'center', justifyContent: 'center' }}> {/* Center alignment */}
              {data.paidAmount > 0 && (
                <View style={{ marginBottom: 5, alignItems: 'center' }}>
                  <Text style={{ fontWeight: 'bold', color: '#007bff', textAlign: 'center' }}>Payment Method:</Text>
                  <Text style={{ textAlign: 'center' }}>{data.paymentMethod}</Text>
                </View>
              )}
            </View>
            <View style={{ width: '60%', borderLeft: '1px solid #ccc', paddingLeft: 10 }}> {/* increased width to 60% */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                <Text>Net:</Text>
                <Text>£{data.subtotal.toFixed(2)}</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                <Text>V.A.T.:</Text>
                <Text>£{data.vatAmount.toFixed(2)}</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                <Text>Total:</Text>
                <Text>£{data.total.toFixed(2)}</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                <Text>Paid:</Text>
                <Text>£{data.paidAmount.toFixed(2)}</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text>Owing:</Text>
                <Text>£{(data.total - data.paidAmount).toFixed(2)}</Text>
              </View>
            </View>
          </View>
        </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>
            Registered in England and Wales, Company number {companyDetails.registrationNumber} - VAT No {companyDetails.vatNumber}
          </Text>
        </View>
      </Page>
    </Document>
  );
};

export default VDInvoiceDocument;

export { VDInvoiceDocument };