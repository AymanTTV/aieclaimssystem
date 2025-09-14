// src/components/pdf/documents/VATRecordDocument.tsx
import React from 'react';
import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';
import { VATRecord } from '../../../types/vatRecord';
import { format } from 'date-fns';
import { styles } from '../styles'; 

// Local styles for this document specifically
const localStyles = StyleSheet.create({
  // Container for a row of fields (e.g., two fields side-by-side)
  fieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2, // Small space between rows of fields
  },
  // Style for a single field item (label + value) to control its width
  fieldItem: {
    flexDirection: 'row',
    width: '48%', // Each item takes up slightly less than half the space
  },
  // Style for a full-width field item
  fieldItemFull: {
    flexDirection: 'row',
    width: '100%',
  },
});

// Styles for the descriptions table
const styles2 = StyleSheet.create({
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 12,
    marginBottom: 10,
    backgroundColor: '#f3f4f6',
    padding: 5,
    fontFamily: 'Helvetica-Bold',
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
    fontFamily: 'Helvetica-Bold',
  },
  tableCell: {
    padding: 5,
    flex: 1,
  },
  tableCellAmount: {
    padding: 5,
    width: 80, 
    textAlign: 'right',
  },
  totalRow: {
    backgroundColor: '#f3f4f6',
    fontFamily: 'Helvetica-Bold',
  },
});

interface VATRecordDocumentProps {
  data: VATRecord;
  companyDetails: {
    logoUrl?: string;
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
      {/* HEADER */}
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

      <Text style={styles.title}>VAT RECORD</Text>

      {/* Record Details Card (2-column layout) */}
      <View style={[styles.card, styles.sectionBreak]} wrap={false}>
        <Text style={styles.infoCardTitle}>Record Details</Text>
        
        <View style={localStyles.fieldRow}>
          <View style={localStyles.fieldItem}><Text style={styles.label}>Receipt/Invoice No:</Text><Text style={styles.value}>{data.receiptNo}</Text></View>
          <View style={localStyles.fieldItem}><Text style={styles.label}>Inquiry/Order No:</Text><Text style={styles.value}>{data.accountant}</Text></View>
        </View>

        <View style={localStyles.fieldRow}>
          <View style={localStyles.fieldItem}><Text style={styles.label}>Supplier:</Text><Text style={styles.value}>{data.supplier}</Text></View>
          <View style={localStyles.fieldItem}><Text style={styles.label}>REG No:</Text><Text style={styles.value}>{data.regNo}</Text></View>
        </View>

        <View style={localStyles.fieldRow}>
          <View style={localStyles.fieldItem}><Text style={styles.label}>Date:</Text><Text style={styles.value}>{format(new Date(data.date), 'dd/MM/yyyy')}</Text></View>
          {data.accountNo ? (
            <View style={localStyles.fieldItem}><Text style={styles.label}>Account No:</Text><Text style={styles.value}>{data.accountNo}</Text></View>
          ) : <View style={localStyles.fieldItem} /> /* Empty view to maintain alignment */}
        </View>

        {data.dueDate && (
          <View style={localStyles.fieldRow}>
            <View style={localStyles.fieldItem}><Text style={styles.label}>Due Date:</Text><Text style={styles.value}>{format(new Date(data.dueDate), 'dd/MM/yyyy')}</Text></View>
          </View>
        )}
      </View>

      {/* Descriptions Table */}
      <View style={styles2.section} wrap={false}>
        <Text style={styles2.sectionTitle}>Descriptions</Text>
        <View style={styles2.table}>
          <View style={[styles2.tableRow, styles2.tableHeader]}><View style={[styles2.tableCell, { flex: 2 }]}><Text>Description</Text></View><View style={styles2.tableCellAmount}><Text>NET</Text></View><View style={styles2.tableCell}><Text>V</Text></View><View style={styles2.tableCellAmount}><Text>VAT</Text></View><View style={styles2.tableCellAmount}><Text>GROSS</Text></View></View>
          {data.descriptions.map((desc) => (
            <View key={desc.id} style={styles2.tableRow}><View style={[styles2.tableCell, { flex: 2 }]}><Text>{desc.description}</Text></View><View style={styles2.tableCellAmount}><Text>£{desc.net.toFixed(2)}</Text></View><View style={styles2.tableCell}><Text>{desc.vType || ''}</Text></View><View style={styles2.tableCellAmount}><Text>£{desc.vat.toFixed(2)}</Text></View><View style={styles2.tableCellAmount}><Text>£{desc.gross.toFixed(2)}</Text></View></View>
          ))}
          <View style={[styles2.tableRow, styles2.totalRow]}><View style={[styles2.tableCell, { flex: 2 }]}><Text>Totals</Text></View><View style={styles2.tableCellAmount}><Text>£{data.net.toFixed(2)}</Text></View><View style={styles2.tableCell}><Text></Text></View><View style={styles2.tableCellAmount}><Text>£{data.vat.toFixed(2)}</Text></View><View style={styles2.tableCellAmount}><Text>£{data.gross.toFixed(2)}</Text></View></View>
        </View>
      </View>

      {/* Customer Information and Additional Details Cards */}
      <View style={[styles.flexRow, styles.sectionBreak, { justifyContent: 'space-between', alignItems: 'flex-start' }]} wrap={false}>
        <View style={[styles.card, { width: '48%' }]} wrap={false}>
          <Text style={styles.infoCardTitle}>Customer Information</Text>
          <View style={styles.row}><Text style={styles.label}>Customer Name:</Text><Text style={styles.value}>{data.customerName}</Text></View>
          {data.customerId && (<View style={styles.row}><Text style={styles.label}>Customer ID:</Text><Text style={styles.value}>{data.customerId}</Text></View>)}
        </View>
        <View style={[styles.card, { width: '48%' }]} wrap={false}>
          <Text style={styles.infoCardTitle}>Additional Details</Text>
          <View style={styles.row}><Text style={styles.label}>Status:</Text><Text style={styles.value}>{data.status}</Text></View>
          {data.notes && (<View style={styles.row}><Text style={styles.label}>Notes:</Text><Text style={styles.value}>{data.notes}</Text></View>)}
        </View>
      </View>

      {/* FOOTER */}
      <View style={styles.footer} fixed>
          <Text style={styles.footerText}>AIE SKYLINE LIMITED, registered in England and Wales with the company registration number 15616639, registered office address: United House, 39-41 North Road, London, N7 9DP. VAT. NO. 453448875</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}/>
      </View>
    </Page>
  </Document>
);

export default VATRecordDocument;