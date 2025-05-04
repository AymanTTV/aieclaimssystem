import React from 'react';
import { Document, Page, Text, View, Image } from '@react-pdf/renderer';
import { Vehicle } from '../../../types';
import { styles } from '../styles';
import { formatDate } from '../../../utils/dateHelpers';
import { isExpiringOrExpired } from '../../../utils/vehicleUtils';

interface VehicleBulkDocumentProps {
  records: Vehicle[];
  companyDetails: any;
  title?: string;
}

const VehicleBulkDocument: React.FC<VehicleBulkDocumentProps> = ({
  records,
  companyDetails,
  title = 'Fleet Summary',
}) => {
  // Calculate summary statistics
  const totalVehicles = records.length;
  const activeVehicles = records.filter((v) => v.status === 'available').length;
  const maintenanceVehicles = records.filter((v) => v.status === 'maintenance').length;
  const rentedVehicles = records.filter((v) => v.status === 'rented').length;

  const ITEMS_PER_PAGE_FIRST_PAGE = 5;
  const ITEMS_PER_PAGE_OTHER_PAGES = 7;

  let pages = 0;
  if (totalVehicles > 0) {
    if (totalVehicles <= ITEMS_PER_PAGE_FIRST_PAGE) {
      pages = 1;
    } else {
      pages = 1 + Math.ceil((totalVehicles - ITEMS_PER_PAGE_FIRST_PAGE) / ITEMS_PER_PAGE_OTHER_PAGES);
    }
  }

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
            <View style={styles.section}>
              <Text style={styles.title}>{title}</Text>

              <View style={styles.infoCard}>
                <Text style={styles.infoCardTitle}>Fleet Overview</Text>
                <View style={styles.grid}>
                  <View style={styles.gridItem}>
                    <Text style={styles.infoCardContent}>Total Vehicles: {totalVehicles}</Text>
                  </View>
                  <View style={styles.gridItem}>
                    <Text style={styles.infoCardContent}>Available: {activeVehicles}</Text>
                  </View>
                  <View style={styles.gridItem}>
                    <Text style={styles.infoCardContent}>In Maintenance: {maintenanceVehicles}</Text>
                  </View>
                  <View style={styles.gridItem}>
                    <Text style={styles.infoCardContent}>Rented: {rentedVehicles}</Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* Vehicle Records */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Vehicle Details</Text>
            <View style={styles.tableContainer}>
              {/* Table Header */}
              <View style={styles.tableHeader}>
                <Text style={[styles.tableCell, { width: '20%', fontWeight: 'bold' }]}>Registration</Text>
                <Text style={[styles.tableCell, { width: '25%', fontWeight: 'bold' }]}>Make/Model</Text>
                <Text style={[styles.tableCell, { width: '15%', fontWeight: 'bold' }]}>Status</Text>
                <Text style={[styles.tableCell, { width: '20%', fontWeight: 'bold' }]}>Mileage</Text>
                <Text style={[styles.tableCell, { width: '20%', fontWeight: 'bold' }]}>Documents</Text>
              </View>

              {/* Table Rows */}
              {records
                .slice(
                  pageIndex === 0
                    ? 0
                    : ITEMS_PER_PAGE_FIRST_PAGE +
                        (pageIndex - 1) * ITEMS_PER_PAGE_OTHER_PAGES,
                  Math.min(
                    pageIndex === 0
                      ? ITEMS_PER_PAGE_FIRST_PAGE
                      : ITEMS_PER_PAGE_FIRST_PAGE +
                          pageIndex * ITEMS_PER_PAGE_OTHER_PAGES,
                    totalVehicles
                  )
                )
                .map((vehicle) => {
                  const motExpiryDate = vehicle.motExpiry instanceof Date ? vehicle.motExpiry : vehicle.motExpiry?.toDate();
                  return(
                  <View key={vehicle.id} style={styles.tableRow}>
                    <Text style={[styles.tableCell, { width: '20%' }]}>
                      {vehicle.registrationNumber}
                    </Text>
                    <Text style={[styles.tableCell, { width: '25%' }]}>
                      {vehicle.make} {vehicle.model}
                    </Text>
                    <Text style={[styles.tableCell, { width: '15%' }]}>
                      {vehicle.status}
                    </Text>
                    <Text style={[styles.tableCell, { width: '20%' }]}>
                      {vehicle.mileage.toLocaleString()} mi
                    </Text>
                    <View style={[styles.tableCell, { width: '20%' }]}>
                      <Text style={{color: isExpiringOrExpired(motExpiryDate) ? '#DC2626' : '#1F2937', fontSize: 9}}>
                        MOT Expiry: {formatDate(motExpiryDate)}
                      </Text>
                      <Text style={{color: isExpiringOrExpired(vehicle.insuranceExpiry) ? '#DC2626' : '#1F2937', fontSize: 9}}>
                        Insurance: {formatDate(vehicle.insuranceExpiry)}
                      </Text>
                      <Text style={{color: isExpiringOrExpired(vehicle.nslExpiry) ? '#DC2626' : '#1F2937', fontSize: 9}}>
                        NSL: {formatDate(vehicle.nslExpiry)}
                      </Text>
                      <Text style={{color: isExpiringOrExpired(vehicle.roadTaxExpiry) ? '#DC2626' : '#1F2937', fontSize: 9}}>
                        Road Tax: {formatDate(vehicle.roadTaxExpiry)}
                      </Text>
                    </View>
                  </View>
                )
                })}
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

export default VehicleBulkDocument;