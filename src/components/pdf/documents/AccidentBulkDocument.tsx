// src/components/pdf/documents/AccidentBulkDocument.tsx
import React from 'react';
import { Document, Page, Text, View, Image } from '@react-pdf/renderer';
import { Accident } from '../../../types';
import { styles } from '../styles';
import { formatDate } from '../../../utils/dateHelpers';

interface AccidentBulkDocumentProps {
  records: Accident[];
  companyDetails: any;
  title?: string;
}

const AccidentBulkDocument: React.FC<AccidentBulkDocumentProps> = ({
  records,
  companyDetails,
  title = 'Accident Summary',
}) => {
  // ← reduced first page count
  const ITEMS_FIRST_PAGE = 6;
  const ITEMS_OTHER_PAGES = 9;
  const total = records.length;

  const pages =
    total <= 0
      ? 0
      : total <= ITEMS_FIRST_PAGE
      ? 1
      : 1 + Math.ceil((total - ITEMS_FIRST_PAGE) / ITEMS_OTHER_PAGES);

  const reported      = records.filter(r => r.status === 'reported').length;
  const investigating = records.filter(r => r.status === 'investigating').length;
  const processing    = records.filter(r => r.status === 'processing').length;
  const resolved      = records.filter(r => r.status === 'resolved').length;
  const faults        = records.filter(r => r.type === 'fault').length;
  const nonFaults     = records.filter(r => r.type === 'non-fault').length;
  const totalClaims   = records.reduce((sum, r) => sum + (r.amount || 0), 0);

  const renderTableHeader = () => (
    <View style={styles.tableHeader}>
      <Text style={[styles.tableCell, { width: '15%' }]}>Date</Text>
      <Text style={[styles.tableCell, { width: '20%' }]}>Driver</Text>
      <Text style={[styles.tableCell, { width: '25%' }]}>Location</Text>
      <Text style={[styles.tableCell, { width: '20%' }]}>Status</Text>
      <Text style={[styles.tableCell, { width: '20%' }]}>Amount</Text>
    </View>
  );

  return (
    <Document>
      {Array.from({ length: pages }).map((_, pageIndex) => {
        const start =
          pageIndex === 0
            ? 0
            : ITEMS_FIRST_PAGE + (pageIndex - 1) * ITEMS_OTHER_PAGES;
        const count = pageIndex === 0 ? ITEMS_FIRST_PAGE : ITEMS_OTHER_PAGES;
        const slice = records.slice(start, start + count);

        // skip wholly empty pages
        if (slice.length === 0) return null;

        return (
          <Page key={pageIndex} size="A4" style={styles.page}>
            {/* header */}
            <View style={styles.header}>
              <Image src={companyDetails.logoUrl} style={styles.logo} />
              <View style={styles.companyInfo}>
                <Text>{companyDetails.fullName}</Text>
                <Text>{companyDetails.officialAddress}</Text>
                <Text>Tel: {companyDetails.phone}</Text>
                <Text>Email: {companyDetails.email}</Text>
              </View>
            </View>

            {/* title */}
            <Text style={styles.title}>{title}</Text>

            {/* overview on first page */}
            {pageIndex === 0 && (
              <View style={[styles.card, { marginBottom: 20 }]}>
                <Text style={styles.cardTitle}>Overview</Text>
                <View style={styles.grid}>
                  <View style={styles.gridItem}>
                    <Text>Total Records:</Text>
                    <Text style={styles.cardContent}>{total}</Text>
                  </View>
                  <View style={styles.gridItem}>
                    <Text>Reported:</Text>
                    <Text style={styles.cardContent}>{reported}</Text>
                  </View>
                  <View style={styles.gridItem}>
                    <Text>Investigating:</Text>
                    <Text style={styles.cardContent}>{investigating}</Text>
                  </View>
                  <View style={styles.gridItem}>
                    <Text>Processing:</Text>
                    <Text style={styles.cardContent}>{processing}</Text>
                  </View>
                  <View style={styles.gridItem}>
                    <Text>Resolved:</Text>
                    <Text style={styles.cardContent}>{resolved}</Text>
                  </View>
                  <View style={styles.gridItem}>
                    <Text>Faults:</Text>
                    <Text style={styles.cardContent}>{faults}</Text>
                  </View>
                  <View style={styles.gridItem}>
                    <Text>Non-faults:</Text>
                    <Text style={styles.cardContent}>{nonFaults}</Text>
                  </View>
                  <View style={styles.gridItem}>
                    <Text>Total Claims:</Text>
                    <Text style={styles.cardContent}>£{totalClaims.toFixed(2)}</Text>
                  </View>
                </View>
              </View>
            )}

            {/* table */}
            <View style={styles.section}>
              {renderTableHeader()}
              {slice.map(rec => (
                <View key={rec.id} style={styles.tableRow}>
                  <Text style={[styles.tableCell, { width: '15%' }]}>
                    {formatDate(rec.accidentDate)}
                  </Text>
                  <Text style={[styles.tableCell, { width: '20%' }]}>
                    {rec.driverName}
                  </Text>
                  <Text style={[styles.tableCell, { width: '25%' }]}>
                    {rec.accidentLocation}
                  </Text>
                  <Text style={[styles.tableCell, { width: '20%' }]}>
                    {rec.status} • {rec.type ?? 'N/A'}
                  </Text>
                  <Text style={[styles.tableCell, { width: '20%' }]}>
                    £{(rec.amount || 0).toFixed(2)}
                  </Text>
                </View>
              ))}
            </View>

            {/* footer */}
            <Text style={styles.footer}>
              {companyDetails.fullName} | Generated on {formatDate(new Date())}
            </Text>
            <Text style={styles.pageNumber}>
              Page {pageIndex + 1} of {pages}
            </Text>
          </Page>
        );
      })}
    </Document>
  );
};

export default AccidentBulkDocument;
