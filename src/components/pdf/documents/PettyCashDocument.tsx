// src/components/pdf/documents/PettyCashDocument.tsx
import React from 'react';
import { Text, View, Document, Page, Image } from '@react-pdf/renderer'; // Added Document, Page, Image
import { PettyCashTransaction } from '../../../types/pettyCash';
// import BaseDocument from '../BaseDocument'; // Removed BaseDocument import
import { formatDate } from '../../../utils/dateHelpers';
import { styles } from '../styles'; // Assuming 'styles.ts' contains the shared styles

interface PettyCashDocumentProps {
  data: PettyCashTransaction;
  companyDetails: any; // Keeping 'any' as per original
}

const PettyCashDocument: React.FC<PettyCashDocumentProps> = ({ data, companyDetails }) => {
  // Derive header details from companyDetails, splitting the address
  const headerDetails = {
    logoUrl: companyDetails?.logoUrl || '',
    fullName: companyDetails?.fullName || 'AIE Skyline Limited',
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

        {/* Title */}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Petty Cash Record</Text>
        </View>
    
        {/* Transaction Details in Card */}
        <View style={styles.sectionBreak} wrap={false}>
          <View style={styles.infoCard}>
            <Text style={styles.infoCardTitle}>Transaction Details</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Name:</Text>
              <Text style={styles.value}>{data.name}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Telephone:</Text>
              <Text style={styles.value}>{data.telephone}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Date:</Text>
              <Text style={styles.value}>{formatDate(data.date)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Description:</Text>
              <Text style={styles.value}>{data.description}</Text>
            </View>
          </View>
        </View>

        {/* Financial Details - Clean Table */}
        <View style={styles.sectionBreak} wrap={false}>
          <Text style={styles.sectionTitle}>Financial Details</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCell, { flex: 1 }]}>Amount In</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>Balance</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>Status</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 1, color: '#059669' }]}>
                £{Number(data.amountIn || 0).toFixed(2)}
              </Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>
                £{Number(data.balance || 0).toFixed(2)}
              </Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>{data.status}</Text>
            </View>
          </View>
        </View>

        {/* Additional Notes */}
        {data.note && (
          <View style={styles.sectionBreak} wrap={false}>
            <Text style={styles.sectionTitle}>Additional Notes</Text>
            <Text style={styles.text}>{data.note}</Text>
          </View>
        )}

        {/* Audit Information - Clean Table */}
        <View style={styles.sectionBreak} wrap={false}>
          <Text style={styles.sectionTitle}>Audit Information</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCell, { flex: 1 }]}>Created At</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>Last Updated</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 1 }]}>{formatDate(data.createdAt)}</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>{formatDate(data.updatedAt)}</Text>
            </View>
          </View>
        </View>

        {/* Terms and Conditions - Removed wrap={false} to allow it to flow */}
        {companyDetails.pettyCashTerms && (
          <View style={styles.sectionBreak}> {/* Removed wrap={false} */}
            <Text style={styles.sectionTitle}>Terms & Conditions</Text>
            <Text style={styles.text}>{companyDetails.pettyCashTerms}</Text>
          </View>
        )}

        {/* Footer - Updated to match the consistent design */}
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

export default PettyCashDocument;