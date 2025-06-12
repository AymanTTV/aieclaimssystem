import React from 'react';
import { Page, Text, View, Document, Image } from '@react-pdf/renderer';
// Make sure this path and type definition are correct for your project
import { Vehicle } from '../../../types';
import { format } from 'date-fns';
// Importing the combined styles (ensure this path is correct)
import { styles } from '../styles';

interface VehicleDocumentProps {
  data: Vehicle;
  companyDetails: any;
}

// Helper to normalize various date inputs into a JS Date or null
const asDate = (input?: any): Date | null => {
  if (!input) return null;
  if (typeof input.toDate === 'function') {
    try { return input.toDate(); } catch { return null; }
  }
  const d = new Date(input);
  return isNaN(d.getTime()) ? null : d;
};

// Format a Date or null to string
const formatDateString = (d: Date | null): string =>
  d ? format(d, 'dd/MM/yyyy') : 'N/A';

// Check expiry against current date
const isExpired = (d: Date | null): boolean => {
  if (!d) return false;
  return new Date() > d;
};

const VehicleDocument: React.FC<VehicleDocumentProps> = ({ data: vehicle, companyDetails }) => {

  // Compute raw test date and expiry
  const rawTestDate = asDate(vehicle.motTestDate);
  let motExpiry: Date | null = null;
  if (rawTestDate) {
    motExpiry = new Date(rawTestDate);
    motExpiry.setMonth(motExpiry.getMonth() + 6);
  }


  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {companyDetails?.logoUrl && (
              <Image src={companyDetails.logoUrl} style={styles.logo} />
            )}
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.companyName}>{companyDetails?.fullName || 'AIE Skyline Limited'}</Text>
            <Text style={styles.companyDetail}>{companyDetails?.officialAddress || 'N/A'}</Text>
            <Text style={styles.companyDetail}>Phone: {companyDetails?.phone || 'N/A'}</Text>
            <Text style={styles.companyDetail}>Email: {companyDetails?.email || 'N/A'}</Text>
          </View>
        </View>

        {/* Title */}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Vehicle Details</Text>
        </View>

        {/* Vehicle Image */}
        {vehicle.image && (
          <View style={styles.imageContainer}>
            <Image src={vehicle.image} style={styles.vehicleImage} />
          </View>
        )}

        {/* Vehicle Information Summary Card */}
        <View style={[styles.section, styles.infoCard, { borderLeft: '3 solid #3B82F6', breakInside: 'avoid' }]}>
          <Text style={styles.infoCardTitle}>Vehicle Information</Text>
          {/* Using a table-like structure within the card */}
          <View style={styles.table}>
            {/* Row 1: Reg Number & VIN */}
            <View style={styles.tableRow}>
              <View style={styles.tableCol}>
                <Text style={styles.flexRow}>
                  <Text style={[styles.label, { paddingLeft: 5 }]}>Registration Number: </Text>
                  <Text style={styles.value}>{vehicle.registrationNumber || 'N/A'}</Text>
                </Text>
              </View>
              {/* FIX: Added marginLeft to the second column View */}
              <View style={[styles.tableCol, { marginLeft: 15 }]}>
                <Text style={styles.flexRow}>
                  <Text style={[styles.label, { paddingLeft: 5 }]}>VIN: </Text>
                  <Text style={styles.value}>{vehicle.vin || 'N/A'}</Text>
                </Text>
              </View>
            </View>
            {/* Row 2: Make & Model */}
            <View style={styles.tableRow}>
              <View style={styles.tableCol}>
                <Text style={styles.flexRow}>
                  <Text style={[styles.label, { paddingLeft: 5 }]}>Make: </Text>
                  <Text style={styles.value}>{vehicle.make || 'N/A'}</Text>
                </Text>
              </View>
              {/* FIX: Added marginLeft to the second column View */}
              <View style={[styles.tableCol, { marginLeft: 15 }]}>
                <Text style={styles.flexRow}>
                  <Text style={[styles.label, { paddingLeft: 5 }]}>Model: </Text>
                  <Text style={styles.value}>{vehicle.model || 'N/A'}</Text>
                </Text>
              </View>
            </View>
            {/* Row 3: Year & Status */}
            <View style={styles.tableRow}>
              <View style={styles.tableCol}>
                <Text style={styles.flexRow}>
                  <Text style={[styles.label, { paddingLeft: 5 }]}>Year: </Text>
                  <Text style={styles.value}>{vehicle.year || 'N/A'}</Text>
                </Text>
              </View>
              {/* FIX: Added marginLeft to the second column View */}
              <View style={[styles.tableCol, { marginLeft: 15 }]}>
                <Text style={styles.flexRow}>
                  <Text style={[styles.label, { paddingLeft: 5 }]}>Status: </Text>
                  <Text style={styles.value}>{vehicle.status || 'N/A'}</Text>
                  {/* Example usage of statusBadge (if needed/defined in Vehicle type) */}
                  {/* {vehicle.status === 'Active' && <View style={[styles.statusBadge, {backgroundColor: 'green'}]}><Text>Active</Text></View>} */}
                </Text>
              </View>
            </View>
            {/* Row 4: Mileage */}
            <View style={styles.tableRow}>
              <View style={styles.tableCol}>
                <Text style={styles.flexRow}>
                  <Text style={[styles.label, { paddingLeft: 5 }]}>Current Mileage: </Text>
                  <Text style={styles.value}>{vehicle.mileage ? vehicle.mileage.toLocaleString() + ' miles' : 'N/A'}</Text>
                </Text>
              </View>
               {/* Empty column for alignment */}
               <View style={[styles.tableCol, { marginLeft: 15 }]}></View>
            </View>
          </View>
        </View>

        {/* Document Expiry Dates Section */}
        <View style={[styles.section, styles.sectionBreak]}>
          <Text style={styles.sectionTitle}>Document Expiry Dates</Text>
          <View style={styles.table}>
            {/* Table Header */}
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCell, styles.tableHeaderCell]}>MOT Test Date</Text>
              <Text style={[styles.tableCell, styles.tableHeaderCell]}>MOT Expiry</Text>
              <Text style={[styles.tableCell, styles.tableHeaderCell]}>NSL Expiry</Text>
              <Text style={[styles.tableCell, styles.tableHeaderCell]}>Road Tax Expiry</Text>
              <Text style={[styles.tableCell, styles.tableHeaderCell]}>Insurance Expiry</Text>
            </View>
            {/* Table Row */}
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, isExpired(rawTestDate) && styles.expiredText]}>
                {formatDateString(rawTestDate)}
              </Text>
              <Text style={[styles.tableCell, motExpiry && isExpired(motExpiry) && styles.expiredText]}>
                {formatDateString(motExpiry)}
              </Text>
              <Text style={[styles.tableCell, isExpired(asDate(vehicle.nslExpiry)) && styles.expiredText]}>
                {formatDateString(asDate(vehicle.nslExpiry))}
              </Text>
              <Text style={[styles.tableCell, isExpired(asDate(vehicle.roadTaxExpiry)) && styles.expiredText]}>
                {formatDateString(asDate(vehicle.roadTaxExpiry))}
              </Text>
              <Text style={[styles.tableCell, isExpired(asDate(vehicle.insuranceExpiry)) && styles.expiredText]}>
                {formatDateString(asDate(vehicle.insuranceExpiry))}
              </Text>
            </View>
          </View>
        </View>

        {/* Maintenance Information Table */}
        {/* === FIX: Added wrap={false} to prevent content splitting === */}
        <View style={[styles.section, styles.sectionBreak, { minHeight: 100 }]} wrap={false}>
          <Text style={styles.sectionTitle}>Maintenance Information</Text>
           {/* Added breakInside: 'avoid' to the table View itself */}
          <View style={[styles.table, { breakInside: 'avoid' }]}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCell, styles.tableHeaderCell]}>Last Maintenance</Text>
              <Text style={[styles.tableCell, styles.tableHeaderCell]}>Next Maintenance</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.tableCell}>{formatDateString(asDate(vehicle.lastMaintenance))}</Text>
              <Text style={[styles.tableCell, isExpired(asDate(vehicle.nextMaintenance)) && styles.expiredText]}>
                {formatDateString(asDate(vehicle.nextMaintenance))}
              </Text>
            </View>
          </View>
        </View>

        {/* Owner Information Card */}
        {/* <View style={[styles.section, styles.sectionBreak, { alignItems: 'flex-end' }]}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Owner Information</Text>
            <Text style={styles.cardContent}>{vehicle.owner?.name || 'AIE Skyline'}</Text>
            {vehicle.owner?.address && !vehicle.owner?.isDefault && (
              <Text style={styles.cardContent}>{vehicle.owner.address}</Text>
            )}
          </View>
        </View> */}

        {/* Document Images Grid */}
        {/* Check if vehicle.documents exists and has any image arrays with content */}
        {vehicle.documents && Object.values(vehicle.documents).some(arr => Array.isArray(arr) && arr.length > 0) && (
          <View style={[styles.section, styles.sectionBreak]}>
            <Text style={styles.sectionTitle}>Document Images</Text>
            <View style={styles.grid}>
              {Object.entries(vehicle.documents)
                // Filter out entries that are not arrays or are empty arrays
                .filter(([key, value]) => Array.isArray(value) && value.length > 0)
                .map(([key, images]) =>
                  (images as string[]).map((image, index) => { // Assert images as string[] after filtering
                    // Create a friendlier caption
                    const caption = key
                      .replace(/Image$/, '') // Remove 'Image' suffix
                      .replace(/([A-Z]+)/g, ' $1') // Add space before groups of Caps (like V5)
                      .replace(/([a-z])([A-Z])/g, '$1 $2') // Add space before single Cap following lower
                      .replace(/^./, str => str.toUpperCase()) // Capitalize first letter
                      + ` Document ${index + 1}`;

                    return (
                      // Use a unique key combining type and index
                      <View key={`${key}-${index}`} style={styles.gridItem}>
                         {/* Ensure image source is valid */}
                        <Image src={image || ''} style={styles.documentImage} onError={(e) => console.error("Error loading image:", image, e)} />
                        <Text style={styles.imageCaption}>{caption}</Text>
                      </View>
                    );
                  })
              )}
            </View>
          </View>
        )}

        {/* Sale Information (if sold) */}
        {vehicle.status === 'sold' && (
          <View style={[styles.section, styles.sectionBreak]}>
            <Text style={styles.sectionTitle}>Sale Information</Text>
            <View style={[styles.table, { breakInside: 'avoid' }]}>
              <View style={styles.tableRow}>
                <View style={styles.tableColHalf}>
                  <Text style={styles.subLabel}>Sale Date</Text>
                  <Text style={styles.subValue}>{formatDateString(asDate(vehicle.soldDate))}</Text>
                </View>
                <View style={styles.tableColHalf}>
                  <Text style={styles.subLabel}>Sale Price</Text>
                  <Text style={styles.subValue}>{vehicle.salePrice ? `£${vehicle.salePrice.toLocaleString()}` : 'N/A'}</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Footer */}
        {/* Ensure footer doesn't overlap content by adjusting page bottom padding */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>Aie Skyline Limited | Registered in England and Wales | Company No: 12592207</Text>
          {/* Note: Using current date from runtime */}
          <Text style={styles.footerText}>Generated on {format(new Date(), 'dd/MM/yyyy HH:mm')}</Text>
          <Text
             style={styles.pageNumber}
             render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
           />
        </View>
      </Page>
    </Document>
  );
};

export default VehicleDocument;