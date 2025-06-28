import React from 'react';
import { Page, Text, View, Document, Image } from '@react-pdf/renderer';
import { Vehicle } from '../../../types';
import { format } from 'date-fns';
import { styles } from '../styles';

interface VehicleDocumentProps {
  data: Vehicle;
  companyDetails: any;
}

const asDate = (input?: any): Date | null => {
  if (!input) return null;
  if (typeof input.toDate === 'function') {
    try { return input.toDate(); } catch { return null; }
  }
  const d = new Date(input);
  return isNaN(d.getTime()) ? null : d;
};

const formatDateString = (d: Date | null): string =>
  d ? format(d, 'dd/MM/yyyy') : 'N/A';

const isExpired = (d: Date | null): boolean => {
  if (!d) return false;
  return new Date() > d;
};

const VehicleDocument: React.FC<VehicleDocumentProps> = ({ data: vehicle, companyDetails }) => {

  const rawTestDate = asDate(vehicle.motTestDate);
  let motExpiry: Date | null = null;
  if (rawTestDate) {
    motExpiry = new Date(rawTestDate);
    motExpiry.setMonth(motExpiry.getMonth() + 6);
  }

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
          <View style={styles.table}>
            <View style={styles.tableRow}>
              <View style={styles.tableCol}>
                <Text style={styles.flexRow}>
                  <Text style={[styles.label, { paddingLeft: 5 }]}>Registration Number: </Text>
                  <Text style={styles.value}>{vehicle.registrationNumber || 'N/A'}</Text>
                </Text>
              </View>
              <View style={[styles.tableCol, { marginLeft: 15 }]}>
                <Text style={styles.flexRow}>
                  <Text style={[styles.label, { paddingLeft: 5 }]}>VIN: </Text>
                  <Text style={styles.value}>{vehicle.vin || 'N/A'}</Text>
                </Text>
              </View>
            </View>
            <View style={styles.tableRow}>
              <View style={styles.tableCol}>
                <Text style={styles.flexRow}>
                  <Text style={[styles.label, { paddingLeft: 5 }]}>Make: </Text>
                  <Text style={styles.value}>{vehicle.make || 'N/A'}</Text>
                </Text>
              </View>
              <View style={[styles.tableCol, { marginLeft: 15 }]}>
                <Text style={styles.flexRow}>
                  <Text style={[styles.label, { paddingLeft: 5 }]}>Model: </Text>
                  <Text style={styles.value}>{vehicle.model || 'N/A'}</Text>
                </Text>
              </View>
            </View>
            <View style={styles.tableRow}>
              <View style={styles.tableCol}>
                <Text style={styles.flexRow}>
                  <Text style={[styles.label, { paddingLeft: 5 }]}>Year: </Text>
                  <Text style={styles.value}>{vehicle.year || 'N/A'}</Text>
                </Text>
              </View>
              <View style={[styles.tableCol, { marginLeft: 15 }]}>
                <Text style={styles.flexRow}>
                  <Text style={[styles.label, { paddingLeft: 5 }]}>Status: </Text>
                  <Text style={styles.value}>{vehicle.status || 'N/A'}</Text>
                </Text>
              </View>
            </View>
            <View style={styles.tableRow}>
              <View style={styles.tableCol}>
                <Text style={styles.flexRow}>
                  <Text style={[styles.label, { paddingLeft: 5 }]}>Current Mileage: </Text>
                  <Text style={styles.value}>{vehicle.mileage ? vehicle.mileage.toLocaleString() + ' miles' : 'N/A'}</Text>
                </Text>
              </View>
               <View style={[styles.tableCol, { marginLeft: 15 }]}></View>
            </View>
          </View>
        </View>

        {/* Document Expiry Dates Section */}
        <View style={[styles.section, styles.sectionBreak]}>
          <Text style={styles.sectionTitle}>Document Expiry Dates</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCell, styles.tableHeaderCell]}>MOT Test Date</Text>
              <Text style={[styles.tableCell, styles.tableHeaderCell]}>MOT Expiry</Text>
              <Text style={[styles.tableCell, styles.tableHeaderCell]}>NSL Expiry</Text>
              <Text style={[styles.tableCell, styles.tableHeaderCell]}>Road Tax Expiry</Text>
              <Text style={[styles.tableCell, styles.tableHeaderCell]}>Insurance Expiry</Text>
            </View>
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
        <View style={[styles.section, styles.sectionBreak, { minHeight: 100 }]} wrap={false}>
          <Text style={styles.sectionTitle}>Maintenance Information</Text>
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

        {/* Document Images Grid */}
        {vehicle.documents && Object.values(vehicle.documents).some(arr => Array.isArray(arr) && arr.length > 0) && (
          <View style={[styles.section, styles.sectionBreak]}>
            <Text style={styles.sectionTitle}>Document Images</Text>
            <View style={styles.grid}>
              {Object.entries(vehicle.documents)
                .filter(([key, value]) => Array.isArray(value) && value.length > 0)
                .map(([key, images]) =>
                  (images as string[]).map((image, index) => {
                    const caption = key
                      .replace(/Image$/, '')
                      .replace(/([A-Z]+)/g, ' $1')
                      .replace(/([a-z])([A-Z])/g, '$1 $2')
                      .replace(/^./, str => str.toUpperCase())
                      + ` Document ${index + 1}`;

                    return (
                      <View key={`${key}-${index}`} style={styles.gridItem}>
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

        {/* Footer - Now using flex for horizontal distribution */}
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
};

export default VehicleDocument;