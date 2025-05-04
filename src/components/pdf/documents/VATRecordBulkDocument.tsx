import React from 'react';
import { Document, Page, Text, View, Image } from '@react-pdf/renderer';
import { VATRecord } from '../../../types/vatRecord';
import { styles } from '../styles';
import { formatDate } from '../../../utils/dateHelpers';

interface VATRecordBulkDocumentProps {
  records: VATRecord[];
  companyDetails: any;
  title?: string;
}

const VATRecordBulkDocument: React.FC<VATRecordBulkDocumentProps> = ({ 
  records, 
  companyDetails,
  title = 'VAT Records Summary'
}) => {
  // Calculate summary statistics
  const totalNet = records.reduce((sum, r) => sum + r.net, 0);
  const totalVAT = records.reduce((sum, r) => sum + r.vat, 0);
  const totalGross = records.reduce((sum, r) => sum + r.gross, 0);

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
                <Text style={styles.sectionTitle}>VAT Summary</Text>
                <View style={styles.grid}>
                  <View style={styles.gridItem}>
                    <Text>Total NET: £{totalNet.toFixed(2)}</Text>
                  </View>
                  <View style={styles.gridItem}>
                    <Text>Total VAT: £{totalVAT.toFixed(2)}</Text>
                  </View>
                  <View style={styles.gridItem}>
                    <Text>Total GROSS: £{totalGross.toFixed(2)}</Text>
                  </View>
                </View>
              </View>
            </>
          )}

          {/* VAT Records */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>VAT Records</Text>
            <View style={styles.tableContainer}>
              {/* Table Header */}
              <View style={styles.tableHeader}>
                <Text style={[styles.tableCell, { width: '15%' }]}>Date</Text>
                <Text style={[styles.tableCell, { width: '20%' }]}>Receipt No</Text>
                <Text style={[styles.tableCell, { width: '20%' }]}>Supplier</Text>
                <Text style={[styles.tableCell, { width: '15%' }]}>NET</Text>
                <Text style={[styles.tableCell, { width: '15%' }]}>VAT</Text>
                <Text style={[styles.tableCell, { width: '15%' }]}>GROSS</Text>
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
                      {record.receiptNo}
                    </Text>
                    <Text style={[styles.tableCell, { width: '20%' }]}>
                      {record.supplier}
                    </Text>
                    <Text style={[styles.tableCell, { width: '15%' }]}>
                      £{record.net.toFixed(2)}
                    </Text>
                    <Text style={[styles.tableCell, { width: '15%' }]}>
                      £{record.vat.toFixed(2)}
                    </Text>
                    <Text style={[styles.tableCell, { width: '15%' }]}>
                      £{record.gross.toFixed(2)}
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

export default VATRecordBulkDocument;