// VATRecordDocument.tsx
import React from 'react';
import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';
import { VATRecord } from '../../../types/vatRecord';
import { format } from 'date-fns';
// Removed 'logo' import as we'll use companyDetails.logoUrl
import { styles } from '../styles'; // Your global styles.ts

// Re-introducing styles2 as per user's request for the Descriptions Table
const styles2 = StyleSheet.create({
  page: { // This style is not used, as the main Page uses `styles.page`
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  header: { // This style is not used
    marginBottom: 20,
  },
  title: { // This style is not used
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 12,
    marginBottom: 10,
    backgroundColor: '#f3f4f6',
    padding: 5,
  },
  table: {
    display: 'table',
    width: 'auto',
    marginBottom: 10,
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tableHeader: {
    backgroundColor: '#f3f4f6',
  },
  tableCell: {
    padding: 5,
    flex: 1,
  },
  tableCellAmount: {
    padding: 5,
    width: 80, // Specific width
    textAlign: 'right',
  },
  totalRow: {
    backgroundColor: '#f3f4f6',
    fontWeight: 'bold',
  },
  footer: { // This style is not used
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 8,
    textAlign: 'center',
    color: '#6b7280',
  },
});

interface VATRecordDocumentProps {
  data: VATRecord;
  companyDetails: {
    logoUrl?: string; // Added for the new header
    fullName: string;
    officialAddress: string;
    vatNumber: string;
    registrationNumber: string;
    phone: string;
    email: string;
  };
}

const VATRecordDocument: React.FC<VATRecordDocumentProps> = ({ data, companyDetails }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* HEADER - Replicated from VehicleDocument.tsx */}
      <View style={styles.header} fixed> {/* Marked as fixed as in VehicleDocument */}
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

      <Text style={styles.title}>VAT RECORD</Text>

      {/* Record Details Card */}
      <View style={[styles.card, styles.sectionBreak]} wrap={false}> {/* Added wrap={false} to keep card together */}
        <Text style={styles.infoCardTitle}>Record Details</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Receipt No:</Text>
          <Text style={styles.value}>{data.receiptNo}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Accountant:</Text>
          <Text style={styles.value}>{data.accountant}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Supplier:</Text>
          <Text style={styles.value}>{data.supplier}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>REG No:</Text>
          <Text style={styles.value}>{data.regNo}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Date:</Text>
          <Text style={styles.value}>{format(new Date(data.date), 'dd/MM/yyyy')}</Text>
        </View>
      </View>

      {/* Descriptions Table - Reverted to original styles2 usage */}
      <View style={styles2.section} wrap={false}> {/* Added wrap={false} */}
        <Text style={styles2.sectionTitle}>Descriptions</Text>
        <View style={styles2.table}>
          {/* Table Header */}
          <View style={[styles2.tableRow, styles2.tableHeader]}>
            <View style={[styles2.tableCell, { flex: 2 }]}>
              <Text>Description</Text>
            </View>
            <View style={styles2.tableCellAmount}>
              <Text>NET</Text>
            </View>
            <View style={styles2.tableCell}>
              <Text>V</Text>
            </View>
            <View style={styles2.tableCellAmount}>
              <Text>VAT</Text>
            </View>
            <View style={styles2.tableCellAmount}>
              <Text>GROSS</Text>
            </View>
          </View>

          {/* Table Rows */}
          {data.descriptions.map((desc) => (
            <View key={desc.id} style={styles2.tableRow}>
              <View style={[styles2.tableCell, { flex: 2 }]}>
                <Text>{desc.description}</Text>
              </View>
              <View style={styles2.tableCellAmount}>
                <Text>£{desc.net.toFixed(2)}</Text>
              </View>
              <View style={styles2.tableCell}>
                <Text>{desc.vType}</Text>
              </View>
              <View style={styles2.tableCellAmount}>
                <Text>£{desc.vat.toFixed(2)}</Text>
              </View>
              <View style={styles2.tableCellAmount}>
                <Text>£{desc.gross.toFixed(2)}</Text>
              </View>
            </View>
          ))}

          {/* Totals Row */}
          <View style={[styles2.tableRow, styles2.totalRow]}>
            <View style={[styles2.tableCell, { flex: 2 }]}>
              <Text>Totals</Text>
            </View>
            <View style={styles2.tableCellAmount}>
              <Text>£{data.net.toFixed(2)}</Text>
            </View>
            <View style={styles2.tableCell}>
              <Text></Text>
            </View>
            <View style={styles2.tableCellAmount}>
              <Text>£{data.vat.toFixed(2)}</Text>
            </View>
            <View style={styles2.tableCellAmount}>
              <Text>£{data.gross.toFixed(2)}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Customer Information and Additional Details Cards - Side by Side */}
      <View style={[styles.flexRow, styles.sectionBreak, { justifyContent: 'space-between', alignItems: 'flex-start' }]} wrap={false}>
        {/* Customer Information Card */}
        <View style={[styles.card, { width: '48%' }]} wrap={false}>
          <Text style={styles.infoCardTitle}>Customer Information</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Customer Name:</Text>
            <Text style={styles.value}>{data.customerName}</Text>
          </View>
          {data.customerId && (
            <View style={styles.row}>
              <Text style={styles.label}>Customer ID:</Text>
              <Text style={styles.value}>{data.customerId}</Text>
            </View>
          )}
        </View>

        {/* Additional Details Card */}
        <View style={[styles.card, { width: '48%' }]} wrap={false}>
          <Text style={styles.infoCardTitle}>Additional Details</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Status:</Text>
            <Text style={styles.value}>{data.status}</Text>
          </View>
          {data.notes && (
            <View style={styles.row}>
              <Text style={styles.label}>Notes:</Text>
              <Text style={styles.value}>{data.notes}</Text>
            </View>
          )}
        </View>
      </View>

      {/* FOOTER - Replicated from VehicleDocument.tsx */}
      <View style={styles.footer} fixed> {/* Marked as fixed as in VehicleDocument */}
          <Text style={styles.footerText}>
            AIE SKYLINE LIMITED, registered in England and Wales with the company registration number 15616639, registered office address: United House, 39-41 North Road, London, N7 9DP. VAT. NO. 453448875
          </Text>
          <Text
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
          />
      </View>
    </Page>
  </Document>
);

export default VATRecordDocument;