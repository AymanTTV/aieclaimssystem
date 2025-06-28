// src/components/pdf/VehicleBulkDocument.tsx
import React from 'react';
import { Document, Page, Text, View, Image } from '@react-pdf/renderer';
import { Vehicle } from '../../../types';
import { styles } from '../styles';
import { formatDate } from '../../../utils/dateHelpers';
import { isExpiringOrExpired } from '../../../utils/vehicleUtils';

interface VehicleBulkDocumentProps {
  records: Vehicle[];
  companyDetails: {
    logoUrl: string;
    fullName: string;
    officialAddress: string;
    phone: string;
    email: string;
  };
  title?: string;
}

const FIRST_PAGE_COUNT = 10;
const OTHER_PAGE_COUNT = 14;

const columnWidths = {
  reg: { flex: 0.8 },
  make: { flex: 1.5 },
  status: { flex: 1 },
  mileage: { flex: 0.8 },
  docs: { flex: 1.6 },
};

const VehicleBulkDocument: React.FC<VehicleBulkDocumentProps> = ({
  records,
  companyDetails,
  title = 'Fleet Summary',
}) => {
  if (!records || records.length === 0) {
    return (
      <Document>
        <Page size="A4" style={styles.page}>
          {/* Header - Stays the same as correctly defined */}
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
          <View style={styles.titleContainer}>
             <Text style={styles.title}>{title}</Text>
          </View>
          <Text style={styles.text}>No vehicle records were found for the selected filters.</Text>
          {/* Footer for empty state - Now using flex for horizontal distribution */}
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
  }
  
  const total = records.length;
  const pages = total <= FIRST_PAGE_COUNT ? 1 : 1 + Math.ceil((total - FIRST_PAGE_COUNT) / OTHER_PAGE_COUNT);

  const getSlice = (pageIndex: number) => {
    if (pageIndex === 0) {
      return records.slice(0, FIRST_PAGE_COUNT);
    }
    const start = FIRST_PAGE_COUNT + (pageIndex - 1) * OTHER_PAGE_COUNT;
    return records.slice(start, start + OTHER_PAGE_COUNT);
  };

  return (
    <Document>
      {Array.from({ length: pages }).map((_, pageIndex) => {
        const slice = getSlice(pageIndex);
        if (slice.length === 0) return null;

        return (
          <Page key={pageIndex} size="A4" style={styles.page}>
            {/* HEADER (fixed to repeat on every page) - Stays the same */}
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

            {/* TITLE + SUMMARY (first page only) */}
            {pageIndex === 0 && (
              <View style={styles.sectionBreak} wrap={false}>
                <View style={styles.titleContainer}>
                  <Text style={styles.title}>{title}</Text>
                </View>
                <View style={styles.infoCard}>
                  <Text style={styles.infoCardTitle}>Fleet Overview</Text>
                  <View style={styles.grid}>
                    <View style={[styles.gridItem, { width: '50%' }]}>
                      <Text style={styles.subLabel}>Total Vehicles</Text>
                      <Text style={styles.subValue}>{total}</Text>
                    </View>
                    <View style={[styles.gridItem, { width: '50%' }]}>
                      <Text style={styles.subLabel}>Available</Text>
                      <Text style={styles.subValue}>
                        {records.filter((v) => v.status === 'available').length}
                      </Text>
                    </View>
                    <View style={[styles.gridItem, { width: '50%' }]}>
                      <Text style={styles.subLabel}>Rented</Text>
                      <Text style={styles.subValue}>
                        {records.filter((v) => ['hired', 'scheduled-rental'].includes(v.status)).length}
                      </Text>
                    </View>
                    <View style={[styles.gridItem, { width: '50%' }]}>
                      <Text style={styles.subLabel}>Maintenance</Text>
                      <Text style={styles.subValue}>
                        {records.filter((v) => ['maintenance', 'scheduled-maintenance'].includes(v.status)).length}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            )}

            {/* TABLE */}
            <View style={styles.tableContainer}>
              {pageIndex === 0 && <Text style={styles.sectionTitle}>Vehicle Details</Text>}
              
              <View style={styles.tableHeader} fixed>
                <Text style={[styles.tableHeaderCell, columnWidths.reg]}>Reg</Text>
                <Text style={[styles.tableHeaderCell, columnWidths.make]}>Make / Model</Text>
                <Text style={[styles.tableHeaderCell, columnWidths.status]}>Status</Text>
                <Text style={[styles.tableHeaderCell, columnWidths.mileage]}>Mileage</Text>
                <Text style={[styles.tableHeaderCell, columnWidths.docs]}>MOT / Ins / NSL / Tax</Text>
              </View>

              {/* Table Rows */}
              {slice.map((v, index) => {
                const motDate = v.motExpiry instanceof Date ? v.motExpiry : v.motExpiry?.toDate();
                const rowStyle = index % 2 === 0 ? styles.tableRow : styles.tableRowAlternate;
                
                return (
                  <View key={v.id} style={rowStyle} wrap={false}>
                    <Text style={[styles.tableCell, columnWidths.reg]}>{v.registrationNumber}</Text>
                    <Text style={[styles.tableCell, columnWidths.make]}>{`${v.make} ${v.model}`}</Text>
                    <Text style={[styles.tableCell, columnWidths.status]}>{v.status}</Text>
                    <Text style={[styles.tableCell, columnWidths.mileage]}>{v.mileage.toLocaleString()} mi</Text>
                    
                    <View style={[styles.tableCell, columnWidths.docs, { flexDirection: 'column', alignItems: 'flex-start', paddingVertical: 2 }]}>
                      <Text style={[{ fontSize: 9 }, isExpiringOrExpired(motDate) && styles.expiredText]}>
                        MOT: {formatDate(motDate)}
                      </Text>
                      <Text style={[{ fontSize: 9 }, isExpiringOrExpired(v.insuranceExpiry) && styles.expiredText]}>
                        Ins: {formatDate(v.insuranceExpiry)}
                      </Text>
                      <Text style={[{ fontSize: 9 }, isExpiringOrExpired(v.nslExpiry) && styles.expiredText]}>
                        NSL: {formatDate(v.nslExpiry)}
                      </Text>
                      <Text style={[{ fontSize: 9 }, isExpiringOrExpired(v.roadTaxExpiry) && styles.expiredText]}>
                        Tax: {formatDate(v.roadTaxExpiry)}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>

            {/* FOOTER (fixed to repeat on every page) - Now using flex for horizontal distribution */}
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

export default VehicleBulkDocument;