import React from 'react';
import { Document, Page, Text, View, Image } from '@react-pdf/renderer';
import { Rental, Vehicle, Customer } from '../../../types';
import { styles } from '../styles';
import { formatDate } from '../../../utils/dateHelpers';

interface RentalBulkDocumentProps {
  records: Rental[]; // Changed to array
  vehicles: Vehicle[]; // Changed to array
  customers: Customer[]; // Changed to array
  companyDetails: any;
  title?: string;
}

const RentalBulkDocument: React.FC<RentalBulkDocumentProps> = ({
  records,
  vehicles,
  customers,
  companyDetails,
  title = 'Rental Summary',
}) => {
  const totalRecords = records.length;
  const activeRentals = records.filter((r) => r.status === 'active').length;
  const scheduledRentals = records.filter((r) => r.status === 'scheduled').length;
  const completedRentals = records.filter((r) => r.status === 'completed').length;
  const totalIncome = records.reduce((sum, r) => sum + r.cost, 0);
  const totalPaid = records.reduce((sum, r) => sum + r.paidAmount, 0);
  const totalOutstanding = records.reduce((sum, r) => sum + r.remainingAmount, 0);

  const ITEMS_PER_FIRST_PAGE = 7;
  const ITEMS_PER_OTHER_PAGES = 10;
  const totalPages = Math.ceil(
    (records.length - ITEMS_PER_FIRST_PAGE) / ITEMS_PER_OTHER_PAGES + 1
  );

  const getPageItems = (pageIndex: number) => {
    if (pageIndex === 0) {
      return records.slice(0, ITEMS_PER_FIRST_PAGE);
    } else {
      const startIndex =
        ITEMS_PER_FIRST_PAGE + (pageIndex - 1) * ITEMS_PER_OTHER_PAGES;
      const endIndex = startIndex + ITEMS_PER_OTHER_PAGES;
      return records.slice(startIndex, endIndex);
    }
  };

  const getVehicleInfo = (vehicleId: string): { make: string; registrationNumber: string } => {
    console.log('getVehicleInfo called with vehicleId:', vehicleId);
    console.log('vehicles array:', vehicles);

    if (!vehicles) {
      console.log('vehicles array is undefined or null');
      return { make: 'N/A', registrationNumber: 'N/A' };
    }
    const vehicle = vehicles.find((v) => v.id === vehicleId);

    if (!vehicle) {
      console.log('Vehicle not found for vehicleId:', vehicleId);
      return { make: 'N/A', registrationNumber: 'N/A' };
    }
    console.log('Found vehicle:', vehicle);

    return { make: vehicle.make, registrationNumber: vehicle.owner?.registrationNumber || 'N/A' };
  };

  const getCustomerName = (customerId: string): string => {
    console.log('getCustomerName called with customerId:', customerId);
    console.log('customers array:', customers);

    if (!customers) {
      console.log('customers array is undefined or null');
      return 'N/A';
    }
    const customer = customers.find((c) => c.id === customerId);

    if (!customer) {
      console.log('Customer not found for customerId:', customerId);
      return 'N/A';
    }
    console.log('Found customer:', customer);

    return customer ? customer.name : 'N/A';
  };

  console.log('Rendering RentalBulkDocument with records:', records);

  return (
    <Document>
      {Array.from({ length: totalPages }).map((_, pageIndex) => (
        <Page key={pageIndex} size="A4" style={styles.page}>
          <View style={styles.header}>
            <Image src={companyDetails.logoUrl} style={styles.logo} />
            <View style={styles.companyInfo}>
              <Text>{companyDetails.fullName}</Text>
              <Text>{companyDetails.officialAddress}</Text>
              <Text>Tel: {companyDetails.phone}</Text>
              <Text>Email: {companyDetails.email}</Text>
            </View>
          </View>

          {pageIndex === 0 && (
            <>
              <Text style={styles.title}>{title}</Text>

              <View style={[styles.section, styles.keepTogether]}>
                <Text style={styles.sectionTitle}>Rental Overview</Text>
                <View style={styles.grid}>
                  <View style={styles.gridItem}>
                    <Text>Total Rentals: {totalRecords}</Text>
                  </View>
                  <View style={styles.gridItem}>
                    <Text>Active: {activeRentals}</Text>
                  </View>
                  <View style={styles.gridItem}>
                    <Text>Scheduled: {scheduledRentals}</Text>
                  </View>
                  <View style={styles.gridItem}>
                    <Text>Completed: {completedRentals}</Text>
                  </View>
                </View>

                <View style={[styles.grid, { marginTop: 10 }]}>
                  <View style={styles.gridItem}>
                    <Text>Total Income: £{totalIncome.toFixed(2)}</Text>
                  </View>
                  <View style={styles.gridItem}>
                    <Text>Amount Paid: £{totalPaid.toFixed(2)}</Text>
                  </View>
                  <View style={styles.gridItem}>
                    <Text>Outstanding: £{totalOutstanding.toFixed(2)}</Text>
                  </View>
                </View>
              </View>
            </>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Rental Records</Text>
            <View style={styles.tableContainer}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableCell, { width: '15%' }]}>Vehicle</Text>
                <Text style={[styles.tableCell, { width: '15%' }]}>Customer</Text>
                <Text style={[styles.tableCell, { width: '12%' }]}>Start Date</Text>
                <Text style={[styles.tableCell, { width: '12%' }]}>End Date</Text>
                <Text style={[styles.tableCell, { width: '8%' }]}>Type</Text>
                <Text style={[styles.tableCell, { width: '8%' }]}>Status</Text>
                <Text style={[styles.tableCell, { width: '10%' }]}>Cost</Text>
                <Text style={[styles.tableCell, { width: '10%' }]}>Paid</Text>
              </View>

              {getPageItems(pageIndex).map((record) => {
                const { make, registrationNumber } = getVehicleInfo(record.vehicleId);
                const customerName = getCustomerName(record.customerId);

                return (
                  <View key={record.id} style={styles.tableRow}>
                    <Text style={[styles.tableCell, { width: '15%' }]}>
                      {registrationNumber} {make}
                    </Text>
                    <Text style={[styles.tableCell, { width: '15%' }]}>
                      {customerName}
                    </Text>
                    <Text style={[styles.tableCell, { width: '12%' }]}>
                      {formatDate(record.startDate)}
                    </Text>
                    <Text style={[styles.tableCell, { width: '12%' }]}>
                      {formatDate(record.endDate)}
                    </Text>
                    <Text style={[styles.tableCell, { width: '8%' }]}>
                      {record.type}
                    </Text>
                    <Text style={[styles.tableCell, { width: '8%' }]}>
                      {record.status}
                    </Text>
                    <Text style={[styles.tableCell, { width: '10%' }]}>
                      £{record.cost.toFixed(2)}
                    </Text>
                    <Text style={[styles.tableCell, { width: '10%' }]}>
                      £{record.paidAmount.toFixed(2)}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>

          <Text style={styles.footer}>
            {companyDetails.fullName} | Generated on {formatDate(new Date())}
          </Text>

          <Text style={styles.pageNumber}>
            Page {pageIndex + 1} of {totalPages}
          </Text>
        </Page>
      ))}
    </Document>
  );
};

export default RentalBulkDocument;