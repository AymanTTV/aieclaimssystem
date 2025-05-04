import React from 'react';
import { Document, Page, Text, View, Image } from '@react-pdf/renderer';
import { PettyCashTransaction } from '../../../types/pettyCash';
import { styles } from '../styles';
import { formatDate } from '../../../utils/dateHelpers';

interface PettyCashBulkDocumentProps {
  records: PettyCashTransaction[];
  companyDetails: any;
  title?: string;
}

const PettyCashBulkDocument: React.FC<PettyCashBulkDocumentProps> = ({ 
  records, 
  companyDetails,
  title = 'Petty Cash Summary'
}) => {
  // Calculate summary statistics
  const totalIn = records.reduce((sum, r) => sum + r.amountIn, 0);
  const totalOut = records.reduce((sum, r) => sum + r.amountOut, 0);
  const currentBalance = totalIn - totalOut;

  const ITEMS_PER_PAGE = 10;
  const pages = Math.ceil(records.length / ITEMS_PER_PAGE);

  return (
    <Document>
      {Array.from({ length: pages }).map((_, pageIndex) => (
        <Page key={pageIndex} size="A4" style={styles.page}>
          {/* Header - on every page */}
          <View style={styles.header}>
            <Image src={companyDetails.logoUrl} style={styles.logo} />
            <View style={styles.companyInfo}>
              <Text>{companyDetails.fullName}</Text>
              <Text>{companyDetails.officialAddress}</Text>
              <Text>Tel: {companyDetails.phone}</Text>
              <Text>Email: {companyDetails.email}</Text>
            </View>
          </View>

          {/* Title and Summary - only on first page */}
          {pageIndex === 0 && (
            <>
              <Text style={styles.title}>{title}</Text>
              
              <View style={[styles.section, styles.keepTogether]}>
                <Text style={styles.sectionTitle}>Financial Summary</Text>
                <View style={styles.grid}>
                  <View style={styles.gridItem}>
                    <Text>Total In: £{totalIn.toFixed(2)}</Text>
                  </View>
                  <View style={styles.gridItem}>
                    <Text>Total Out: £{totalOut.toFixed(2)}</Text>
                  </View>
                  <View style={styles.gridItem}>
                    <Text>Current Balance: £{currentBalance.toFixed(2)}</Text>
                  </View>
                </View>
              </View>
            </>
          )}

          {/* Transaction Records */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Transaction Details</Text>
            <View style={styles.tableContainer}>
              {/* Table Header */}
              <View style={styles.tableHeader}>
                <Text style={[styles.tableCell, { width: '15%' }]}>Date</Text>
                <Text style={[styles.tableCell, { width: '20%' }]}>Name</Text>
                <Text style={[styles.tableCell, { width: '25%' }]}>Description</Text>
                <Text style={[styles.tableCell, { width: '15%' }]}>In</Text>
                <Text style={[styles.tableCell, { width: '15%' }]}>Out</Text>
                <Text style={[styles.tableCell, { width: '10%' }]}>Status</Text>
              </View>

              {/* Table Rows */}
              {records
                .slice(pageIndex * ITEMS_PER_PAGE, (pageIndex + 1) * ITEMS_PER_PAGE)
                .map((record) => (
                  <View key={record.id} style={styles.tableRow}>
                    <Text style={[styles.tableCell, { width: '15%' }]}>
                      {formatDate(record.date)}
                    </Text>
                    <Text style={[styles.tableCell, { width: '20%' }]}>
                      {record.name}
                    </Text>
                    <Text style={[styles.tableCell, { width: '25%' }]}>
                      {record.description}
                    </Text>
                    <Text style={[styles.tableCell, { width: '15%' }]}>
                      {record.amountIn > 0 ? `£${record.amountIn.toFixed(2)}` : '-'}
                    </Text>
                    <Text style={[styles.tableCell, { width: '15%' }]}>
                      {record.amountOut > 0 ? `£${record.amountOut.toFixed(2)}` : '-'}
                    </Text>
                    <Text style={[styles.tableCell, { width: '10%' }]}>
                      {record.status}
                    </Text>
                  </View>
                ))}
            </View>
          </View>

          {/* Footer */}
          <Text style={styles.footer}>
            {companyDetails.fullName} | Generated on {formatDate(new Date())}
          </Text>

          {/* Page Number */}
          <Text style={styles.pageNumber}>
            Page {pageIndex + 1} of {pages}
          </Text>
        </Page>
      ))}
    </Document>
  );
};

export default PettyCashBulkDocument;