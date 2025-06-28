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
    <View style={styles.tableHeader} fixed> {/* Added fixed to tableHeader */}
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
            {/* HEADER (fixed to repeat on every page) - Copied from VehicleBulkDocument.tsx */}
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

            {/* TITLE + SUMMARY (first page only) - Summary card design updated */}
            {pageIndex === 0 && (
              <View style={[styles.sectionBreak]} wrap={false}>
                <View style={styles.titleContainer}>
                  <Text style={styles.title}>{title}</Text>
                </View>
                {/* Updated summary card design to match VehicleBulkDocument */}
                <View style={[styles.section, styles.infoCard, { borderLeft: '3 solid #3B82F6', breakInside: 'avoid' }]}>
                  <Text style={styles.infoCardTitle}>Accident Overview</Text> {/* Changed title */}
                  <View style={styles.grid}>
                    <View style={[styles.gridItem, { width: '50%' }]}> {/* Using 50% width for two columns */}
                      <Text style={styles.subLabel}>Total Records:</Text>
                      <Text style={styles.subValue}>{total}</Text>
                    </View>
                    <View style={[styles.gridItem, { width: '50%' }]}>
                      <Text style={styles.subLabel}>Reported:</Text>
                      <Text style={styles.subValue}>{reported}</Text>
                    </View>
                    <View style={[styles.gridItem, { width: '50%' }]}>
                      <Text style={styles.subLabel}>Investigating:</Text>
                      <Text style={styles.subValue}>{investigating}</Text>
                    </View>
                    <View style={[styles.gridItem, { width: '50%' }]}>
                      <Text style={styles.subLabel}>Processing:</Text>
                      <Text style={styles.subValue}>{processing}</Text>
                    </View>
                    <View style={[styles.gridItem, { width: '50%' }]}>
                      <Text style={styles.subLabel}>Resolved:</Text>
                      <Text style={styles.subValue}>{resolved}</Text>
                    </View>
                    <View style={[styles.gridItem, { width: '50%' }]}>
                      <Text style={styles.subLabel}>Faults:</Text>
                      <Text style={styles.subValue}>{faults}</Text>
                    </View>
                    <View style={[styles.gridItem, { width: '50%' }]}>
                      <Text style={styles.subLabel}>Non-faults:</Text>
                      <Text style={styles.subValue}>{nonFaults}</Text>
                    </View>
                    <View style={[styles.gridItem, { width: '50%' }]}>
                      <Text style={styles.subLabel}>Total Claims:</Text>
                      <Text style={styles.subValue}>£{totalClaims.toFixed(2)}</Text>
                    </View>
                  </View>
                </View>
              </View>
            )}

            {/* table */}
            <View style={styles.tableContainer}> {/* Wrapped table in tableContainer */}
              {pageIndex === 0 && <Text style={styles.sectionTitle}>Accident Details</Text>} {/* Added section title to tableContainer */}
              {renderTableHeader()}
              {slice.map(rec => (
                <View key={rec.id} style={styles.tableRow} wrap={false}> {/* Added wrap={false} */}
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

            {/* FOOTER (fixed to repeat on every page) - Copied from VehicleBulkDocument.tsx */}
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
        );
      })}
    </Document>
  );
};

export default AccidentBulkDocument;
