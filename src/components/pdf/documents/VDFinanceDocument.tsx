// VDFinanceDocument.tsx
import React from 'react';
import { Text, View, Document, Page, Image } from '@react-pdf/renderer'; // Added Document, Page, Image
import { VDFinanceRecord } from '../../../types/vdFinance';
// import BaseDocument from '../BaseDocument'; // Removing BaseDocument as per previous updates
import { formatDate } from '../../../utils/dateHelpers';
import { styles } from '../styles';

interface VDFinanceDocumentProps {
  data: VDFinanceRecord;
  companyDetails: any;
}

const VDFinanceDocument: React.FC<VDFinanceDocumentProps> = ({ data, companyDetails }) => {
  // Derive header details from companyDetails, splitting the address
  const headerDetails = {
    logoUrl: companyDetails?.logoUrl || '',
    fullName: companyDetails?.fullName || 'AIE Claims LTD',
    // Assuming officialAddress is "United House, 39-41 North Road, London, N7 9DP"
    addressLine1: 'United House, 39-41 North Road,',
    addressLine2: 'London, N7 9DP.',
    phone: companyDetails?.phone || 'N/A',
    email: companyDetails?.email || 'N/A',
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header - Stays the same as correctly defined */}
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

        {/* Title */}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>VD Finance Record</Text>
        </View>

        {/* Basic Information in Card */}
        <View style={styles.sectionBreak} wrap={false}>
          <View style={styles.infoCard}>
            <Text style={styles.infoCardTitle}>Basic Information</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Name:</Text>
              <Text style={styles.value}>{data.name}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Reference:</Text>
              <Text style={styles.value}>{data.reference}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Registration:</Text>
              <Text style={styles.value}>{data.registration}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Date:</Text>
              <Text style={styles.value}>{formatDate(data.date)}</Text>
            </View>
          </View>
        </View>

        {/* Financial Details Table (TH/TD format) */}
        <View style={styles.sectionBreak} wrap={false}>
          <Text style={styles.sectionTitle}>Financial Details</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCell, { flex: 1 }]}>Total Amount</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>NET Amount</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>VAT Rate</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>VAT IN</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>VAT OUT</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 1 }]}>£{data.totalAmount.toFixed(2)}</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>£{data.netAmount.toFixed(2)}</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>{data.vatRate}%</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>£{data.vatIn.toFixed(2)}</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>£{data.vatOut.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        {/* Parts Table (unchanged) */}
        <View style={styles.sectionBreak} wrap={false}>
          <Text style={styles.sectionTitle}>Parts</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCell, { flex: 2 }]}>Part Name</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>Quantity</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>Price</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>VAT</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>Total</Text>
            </View>
            {data.parts.map((part, index) => (
              <View key={index} style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 2 }]}>{part.name}</Text>
                <Text style={[styles.tableCell, { flex: 1 }]}>{part.quantity}</Text>
                <Text style={[styles.tableCell, { flex: 1 }]}>£{part.price.toFixed(2)}</Text>
                <Text style={[styles.tableCell, { flex: 1 }]}>{part.includeVat ? '20%' : '-'}</Text>
                <Text style={[styles.tableCell, { flex: 1 }]}>
                  £{(part.price * part.quantity * (part.includeVat ? 1.2 : 1)).toFixed(2)}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Labor Details Table - TH/TD */}
        <View style={styles.sectionBreak} wrap={false}>
          <Text style={styles.sectionTitle}>Labor Details</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCell, { flex: 1 }]}>Service Center</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>Labor Rate</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>Labor Hours</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>Labor Total</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 1 }]}>{data.serviceCenter}</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>£{data.laborRate}/hour</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>{data.laborHours}</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>£{(data.laborRate * data.laborHours).toFixed(2)}</Text>
            </View>
          </View>
        </View>

        {/* Summary in Card aligned right */}
        <View style={[styles.sectionBreak, { flexDirection: 'row', justifyContent: 'flex-end' }]} wrap={false}>
          <View style={[styles.infoCard, { width: '50%' }]}>
            <Text style={styles.infoCardTitle}>Summary</Text>
            <View style={styles.spaceBetweenRow}>
              <Text style={styles.label}>Purchased Items:</Text>
              <Text style={[styles.value, { textAlign: 'right' }]}>£{data.purchasedItems.toFixed(2)}</Text>
            </View>
            <View style={styles.spaceBetweenRow}>
              <Text style={styles.label}>Client Repair:</Text>
              <Text style={[styles.value, { textAlign: 'right' }]}>£{data.clientRepair.toFixed(2)}</Text>
            </View>
            <View style={styles.spaceBetweenRow}>
              <Text style={styles.label}>Solicitor Fee:</Text>
              <Text style={[styles.value, { textAlign: 'right' }]}>£{data.solicitorFee.toFixed(2)}</Text>
            </View>
            <View style={styles.spaceBetweenRow}>
              <Text style={[styles.label, { color: '#059669' }]}>Profit:</Text>
              <Text style={[styles.value, { color: '#059669', fontWeight: 'bold', textAlign: 'right' }]}>
                £{data.profit.toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

        {/* Description */}
        {data.description && (
          <View style={styles.sectionBreak} wrap={false}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.text}>{data.description}</Text>
          </View>
        )}

        {/* Terms and Conditions */}
        {companyDetails.vdFinanceTerms && (
          <View style={styles.sectionBreak} wrap={false}>
            <Text style={styles.sectionTitle}>Terms & Conditions</Text>
            <Text style={styles.text}>{companyDetails.vdFinanceTerms}</Text>
          </View>
        )}

        {/* Footer */}
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

export default VDFinanceDocument;
