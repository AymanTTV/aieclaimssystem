// src/pages/documents/VehicleDocument.tsx
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
  if (typeof input?.toDate === 'function') {
    try {
      return input.toDate();
    } catch {
      return null;
    }
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
  const rawTestDate = asDate((vehicle as any)?.motTestDate);
  let motExpiry: Date | null = null;
  if (rawTestDate) {
    motExpiry = new Date(rawTestDate);
    motExpiry.setMonth(motExpiry.getMonth() + 6);
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header} fixed>
          <View style={styles.headerLeft}>
            {!!companyDetails?.logoUrl && (
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
        {!!(vehicle as any)?.image && (
          <View style={styles.imageContainer}>
            <Image src={(vehicle as any).image} style={styles.vehicleImage} />
          </View>
        )}

        {/* Vehicle Information Summary Card */}
        <View style={[styles.section, styles.infoCard, { borderLeft: '3 solid #3B82F6', breakInside: 'avoid' as any }]}>
          <Text style={styles.infoCardTitle}>Vehicle Information</Text>
          <View style={styles.table}>
            <View style={styles.tableRow}>
              <View style={styles.tableCol}>
                <Text style={styles.flexRow}>
                  <Text style={[styles.label, { paddingLeft: 5 }]}>Registration Number: </Text>
                  <Text style={styles.value}>{(vehicle as any)?.registrationNumber || 'N/A'}</Text>
                </Text>
              </View>
              <View style={[styles.tableCol, { marginLeft: 15 }]}>
                <Text style={styles.flexRow}>
                  <Text style={[styles.label, { paddingLeft: 5 }]}>VIN: </Text>
                  <Text style={styles.value}>{(vehicle as any)?.vin || 'N/A'}</Text>
                </Text>
              </View>
            </View>

            <View style={styles.tableRow}>
              <View style={styles.tableCol}>
                <Text style={styles.flexRow}>
                  <Text style={[styles.label, { paddingLeft: 5 }]}>Make: </Text>
                  <Text style={styles.value}>{(vehicle as any)?.make || 'N/A'}</Text>
                </Text>
              </View>
              <View style={[styles.tableCol, { marginLeft: 15 }]}>
                <Text style={styles.flexRow}>
                  <Text style={[styles.label, { paddingLeft: 5 }]}>Model: </Text>
                  <Text style={styles.value}>{(vehicle as any)?.model || 'N/A'}</Text>
                </Text>
              </View>
            </View>

            <View style={styles.tableRow}>
              <View style={styles.tableCol}>
                <Text style={styles.flexRow}>
                  <Text style={[styles.label, { paddingLeft: 5 }]}>Year: </Text>
                  <Text style={styles.value}>{(vehicle as any)?.year || 'N/A'}</Text>
                </Text>
              </View>
              <View style={[styles.tableCol, { marginLeft: 15 }]}>
                <Text style={styles.flexRow}>
                  <Text style={[styles.label, { paddingLeft: 5 }]}>Status: </Text>
                  <Text style={styles.value}>{(vehicle as any)?.status || 'N/A'}</Text>
                </Text>
              </View>
            </View>

            <View style={styles.tableRow}>
              <View style={styles.tableCol}>
                <Text style={styles.flexRow}>
                  <Text style={[styles.label, { paddingLeft: 5 }]}>Current Mileage: </Text>
                  <Text style={styles.value}>
                    {(vehicle as any)?.mileage ? `${Number((vehicle as any).mileage).toLocaleString()} miles` : 'N/A'}
                  </Text>
                </Text>
              </View>
              <View style={[styles.tableCol, { marginLeft: 15 }]} />
            </View>
          </View>
        </View>

        {/* Document Expiry Dates */}
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
              <Text style={[styles.tableCell, isExpired(asDate((vehicle as any)?.nslExpiry)) && styles.expiredText]}>
                {formatDateString(asDate((vehicle as any)?.nslExpiry))}
              </Text>
              <Text style={[styles.tableCell, isExpired(asDate((vehicle as any)?.roadTaxExpiry)) && styles.expiredText]}>
                {formatDateString(asDate((vehicle as any)?.roadTaxExpiry))}
              </Text>
              <Text style={[styles.tableCell, isExpired(asDate((vehicle as any)?.insuranceExpiry)) && styles.expiredText]}>
                {formatDateString(asDate((vehicle as any)?.insuranceExpiry))}
              </Text>
            </View>
          </View>
        </View>

        {/* Maintenance Information */}
        <View style={[styles.section, styles.sectionBreak, { minHeight: 100 }]} wrap={false}>
          <Text style={styles.sectionTitle}>Maintenance Information</Text>
          <View style={[styles.table, { breakInside: 'avoid' as any }]}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCell, styles.tableHeaderCell]}>Last Maintenance</Text>
              <Text style={[styles.tableCell, styles.tableHeaderCell]}>Next Maintenance</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.tableCell}>{formatDateString(asDate((vehicle as any)?.lastMaintenance))}</Text>
              <Text style={[styles.tableCell, isExpired(asDate((vehicle as any)?.nextMaintenance)) && styles.expiredText]}>
                {formatDateString(asDate((vehicle as any)?.nextMaintenance))}
              </Text>
            </View>
          </View>
        </View>

        {/* Document Images Grid - uses ONLY existing styles (grid, gridItem, documentImage, imageCaption) */}
        {(() => {
          const docs = (vehicle as any)?.documents as Record<string, unknown> | undefined;

          const docItems =
            docs
              ? Object.entries(docs)
                  .filter(([, value]) => Array.isArray(value) && (value as unknown[]).length > 0)
                  .flatMap(([key, arr]) =>
                    (arr as unknown[]).map((url, idx) => ({
                      key,
                      url: typeof url === 'string' && url.trim() ? url : '',
                      idx,
                    }))
                  )
                  .filter(it => !!it.url)
              : [];

          if (docItems.length === 0) return null;

          return (
            <View style={[styles.section, styles.sectionBreak]}>
              <Text style={styles.sectionTitle}>Document Images</Text>
              <View style={styles.grid}>
                {docItems.map(({ key, url, idx }) => {
                  const caption =
                    key
                      .replace(/Image$/, '')
                      .replace(/([A-Z]+)/g, ' $1')
                      .replace(/([a-z])([A-Z])/g, '$1 $2')
                      .replace(/^./, s => s.toUpperCase()) + ` Document ${idx + 1}`;

                  return (
                    <View key={`${key}-${idx}`} style={styles.gridItem} wrap={false}>
                      <Image src={url} style={styles.documentImage} />
                      <Text style={styles.imageCaption}>{caption}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          );
        })()}

        {/* Sale Information (if sold) */}
        {(vehicle as any)?.status === 'sold' && (
          <View style={[styles.section, styles.sectionBreak]}>
            <Text style={styles.sectionTitle}>Sale Information</Text>
            <View style={[styles.table, { breakInside: 'avoid' as any }]}>
              <View style={styles.tableRow}>
                <View style={styles.tableColHalf}>
                  <Text style={styles.subLabel}>Sale Date</Text>
                  <Text style={styles.subValue}>{formatDateString(asDate((vehicle as any)?.soldDate))}</Text>
                </View>
                <View style={styles.tableColHalf}>
                  <Text style={styles.subLabel}>Sale Price</Text>
                  <Text style={styles.subValue}>
                    {(vehicle as any)?.salePrice ? `£${Number((vehicle as any).salePrice).toLocaleString()}` : 'N/A'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Footer */}
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
