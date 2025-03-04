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
  title = 'Fleet Summary'
}) => {
  // Calculate summary statistics
  const totalVehicles = records.length;
  const activeVehicles = records.filter(v => v.status === 'available').length;
  const maintenanceVehicles = records.filter(v => v.status === 'maintenance').length;
  const rentedVehicles = records.filter(v => v.status === 'rented').length;

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
                <Text style={styles.sectionTitle}>Fleet Overview</Text>
                <View style={styles.grid}>
                  <View style={styles.gridItem}>
                    <Text>Total Vehicles: {totalVehicles}</Text>
                  </View>
                  <View style={styles.gridItem}>
                    <Text>Available: {activeVehicles}</Text>
                  </View>
                  <View style={styles.gridItem}>
                    <Text>In Maintenance: {maintenanceVehicles}</Text>
                  </View>
                  <View style={styles.gridItem}>
                    <Text>Rented: {rentedVehicles}</Text>
                  </View>
                </View>
              </View>
            </>
          )}

          {/* Vehicle Records */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Vehicle Details</Text>
            <View style={styles.tableContainer}>
              {/* Table Header */}
              <View style={styles.tableHeader}>
                <Text style={[styles.tableCell, { width: '20%' }]}>Registration</Text>
                <Text style={[styles.tableCell, { width: '25%' }]}>Make/Model</Text>
                <Text style={[styles.tableCell, { width: '15%' }]}>Status</Text>
                <Text style={[styles.tableCell, { width: '20%' }]}>Mileage</Text>
                <Text style={[styles.tableCell, { width: '20%' }]}>Next Service</Text>
              </View>

              {/* Table Rows */}
              {records
                .slice(pageIndex * ITEMS_PER_PAGE, (pageIndex + 1) * ITEMS_PER_PAGE)
                .map((vehicle) => (
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
                    <Text 
                      style={[
                        styles.tableCell, 
                        { width: '20%', color: isExpiringOrExpired(vehicle.nextMaintenance) ? '#DC2626' : '#1F2937' }
                      ]}
                    >
                      {formatDate(vehicle.nextMaintenance)}
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

export default VehicleBulkDocument;