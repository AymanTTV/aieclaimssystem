import React from 'react';
import { Document, Page, Text, View, Image } from '@react-pdf/renderer';
import { Rental, Vehicle, Customer } from '../../../types';
import { styles } from '../styles'; // Ensure this path is correct
import { formatDate } from '../../../utils/dateHelpers';

interface RentalBulkDocumentProps {
  records: Rental[];
  vehicles: Vehicle[];
  customers: Customer[];
  companyDetails: {
    logoUrl?: string; // Added logoUrl
    fullName: string;
    officialAddress: string;
    phone: string;
    email: string;
  };
  title?: string;
}

const RentalBulkDocument: React.FC<RentalBulkDocumentProps> = ({
  records,
  vehicles,
  customers,
  companyDetails,
  title = 'Rental Summary',
}) => {
  // Pagination settings: 5 items on first page, 7 on subsequent
  const ITEMS_PER_FIRST_PAGE = 5;
  const ITEMS_PER_OTHER_PAGES = 7;

  const totalPages = Math.ceil(
    records.length <= ITEMS_PER_FIRST_PAGE
      ? 1
      : (records.length - ITEMS_PER_FIRST_PAGE) / ITEMS_PER_OTHER_PAGES + 1
  );

  const getPageItems = (pageIndex: number) => {
    if (pageIndex === 0) {
      return records.slice(0, ITEMS_PER_FIRST_PAGE);
    } else {
      const startIndex =
        ITEMS_PER_FIRST_PAGE + (pageIndex - 1) * ITEMS_PER_OTHER_PAGES;
      return records.slice(startIndex, startIndex + ITEMS_PER_OTHER_PAGES);
    }
  };

  const getVehicleRegNo = (id: string): string =>
    vehicles.find((v) => v.id === id)?.registrationNumber ?? 'N/A';

  const getCustomerName = (id: string): string =>
    customers.find((c) => c.id === id)?.name ?? 'N/A';

  return (
    <Document>
      {Array.from({ length: totalPages }).map((_, pageIndex) => (
        <Page key={pageIndex} size="A4" style={styles.page}>
          {/* Header - Standardized header */}
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

          {/* Title - Conditionally rendered only on the first page */}
          {pageIndex === 0 && (
            <View style={styles.titleContainer}>
              <Text style={styles.title}>{title}</Text>
            </View>
          )}

          {/* Records Table */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Rental Records</Text>
            <View style={styles.tableContainer}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { width: '15%' }]}>Vehicle Reg</Text>
                <Text style={[styles.tableHeaderCell, { width: '15%' }]}>Customer</Text>
                <Text style={[styles.tableHeaderCell, { width: '12%' }]}>Start Date</Text>
                <Text style={[styles.tableHeaderCell, { width: '12%' }]}>End Date</Text>
                <Text style={[styles.tableHeaderCell, { width: '8%' }]}>Type</Text>
                <Text style={[styles.tableHeaderCell, { width: '8%' }]}>Status</Text>
                <Text style={[styles.tableHeaderCell, { width: '10%' }]}>Cost</Text>
                <Text style={[styles.tableHeaderCell, { width: '10%' }]}>Paid</Text>
              </View>

              {getPageItems(pageIndex).map((record, idx) => (
                <View
                  key={record.id}
                  style={
                    idx % 2 === 0
                      ? styles.tableRow
                      : styles.tableRowAlternate
                  }
                >
                  <Text style={[styles.tableCell, { width: '15%' }]}>  
                    {getVehicleRegNo(record.vehicleId)}
                  </Text>
                  <Text style={[styles.tableCell, { width: '15%' }]}>  
                    {getCustomerName(record.customerId)}
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
              ))}
            </View>
          </View>

          {/* Footer - Standardized footer */}
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
      ))}
    </Document>
  );
};

export default RentalBulkDocument;