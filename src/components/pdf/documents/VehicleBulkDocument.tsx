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

const FIRST_PAGE_COUNT = 7;
const OTHER_PAGE_COUNT = 9;

const VehicleBulkDocument: React.FC<VehicleBulkDocumentProps> = ({
  records,
  companyDetails,
  title = 'Fleet Summary',
}) => {
  const total = records.length;
  const pages =
    total === 0
      ? 1
      : 1 + Math.max(0, Math.ceil((total - FIRST_PAGE_COUNT) / OTHER_PAGE_COUNT));

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
        return (
          <Page key={pageIndex} size="A4" style={styles.page}>
            {/* HEADER */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <Image src={companyDetails.logoUrl} style={styles.logo} />
              </View>
              <View style={styles.headerRight}>
                <Text style={styles.companyName}>{companyDetails.fullName}</Text>
                <Text style={styles.companyDetail}>{companyDetails.officialAddress}</Text>
                <Text style={styles.companyDetail}>Tel: {companyDetails.phone}</Text>
                <Text style={styles.companyDetail}>Email: {companyDetails.email}</Text>
              </View>
            </View>

            {/* TITLE + SUMMARY on first page */}
            {pageIndex === 0 && (
              <View style={[styles.section, styles.sectionBreak]}>
                <View style={styles.titleContainer}>
                  <Text style={styles.title}>{title}</Text>
                </View>
                <View style={styles.infoCard}>
                  <Text style={styles.infoCardTitle}>Fleet Overview</Text>
                  <View style={styles.grid}>
                    <View style={styles.gridItem}>
                      <Text style={styles.subLabel}>Total Vehicles</Text>
                      <Text style={styles.subValue}>{total}</Text>
                    </View>
                    <View style={styles.gridItem}>
                      <Text style={styles.subLabel}>Available</Text>
                      <Text style={styles.subValue}>
                        {records.filter((v) => v.status === 'available').length}
                      </Text>
                    </View>
                    <View style={styles.gridItem}>
                      <Text style={styles.subLabel}>Maintenance</Text>
                      <Text style={styles.subValue}>
                        {records.filter((v) => v.status === 'maintenance').length}
                      </Text>
                    </View>
                    <View style={styles.gridItem}>
                      <Text style={styles.subLabel}>Rented</Text>
                      <Text style={styles.subValue}>
                        {records.filter((v) => v.status === 'rented').length}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            )}

            {/* TABLE */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Vehicle Details</Text>
              <View style={styles.tableContainer}>
                {/* Table Header */}
                <View style={styles.tableHeader}>
                  <Text style={styles.tableHeaderCell}>Reg</Text>
                  <Text style={styles.tableHeaderCell}>Make / Model</Text>
                  <Text style={styles.tableHeaderCell}>Status</Text>
                  <Text style={styles.tableHeaderCell}>Mileage</Text>
                  <Text style={styles.tableHeaderCell}>MOT / Ins / NSL / Tax</Text>
                </View>

                {/* Rows */}
                {slice.map((v) => {
                  const motDate = v.motExpiry instanceof Date ? v.motExpiry : v.motExpiry?.toDate();
                  return (
                    <View key={v.id} style={styles.tableRow}>
                      <Text style={styles.tableCell}>{v.registrationNumber}</Text>
                      <Text style={styles.tableCell}>{v.make} {v.model}</Text>
                      <Text style={styles.tableCell}>{v.status}</Text>
                      <Text style={styles.tableCell}>{v.mileage.toLocaleString()} mi</Text>
                      <View style={styles.tableCell}>
                        <Text
                          style={[
                            styles.tableCell,
                            isExpiringOrExpired(motDate) && styles.expiredText,
                          ]}
                        >
                          MOT: {formatDate(motDate)}
                        </Text>
                        <Text
                          style={[
                            styles.tableCell,
                            isExpiringOrExpired(v.insuranceExpiry) && styles.expiredText,
                          ]}
                        >
                          Ins: {formatDate(v.insuranceExpiry)}
                        </Text>
                        <Text
                          style={[
                            styles.tableCell,
                            isExpiringOrExpired(v.nslExpiry) && styles.expiredText,
                          ]}
                        >
                          NSL: {formatDate(v.nslExpiry)}
                        </Text>
                        <Text
                          style={[
                            styles.tableCell,
                            isExpiringOrExpired(v.roadTaxExpiry) && styles.expiredText,
                          ]}
                        >
                          Tax: {formatDate(v.roadTaxExpiry)}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* FOOTER */}
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

export default VehicleBulkDocument;
