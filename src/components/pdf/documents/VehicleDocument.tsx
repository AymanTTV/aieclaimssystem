// src/pages/documents/VehicleDocument.tsx
import React from 'react';
import { Page, Text, View, Document, Image, StyleSheet } from '@react-pdf/renderer';
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

// Helper to validate image sources
const isValidPdfImageSrc = (v: any): v is string => {
  if (typeof v !== 'string') return false;
  const s = v.trim();
  if (!s) return false;
  if (s.includes('undefined') || s.includes('null')) return false;
  return s.startsWith('data:image/') || s.startsWith('http://') || s.startsWith('https://');
};

const VehicleDocument: React.FC<VehicleDocumentProps> = ({ data: vehicle, companyDetails }) => {
  const rawTestDate = asDate((vehicle as any)?.motTestDate);
  let motExpiry: Date | null = null;
  if (rawTestDate) {
    motExpiry = new Date(rawTestDate);
    motExpiry.setMonth(motExpiry.getMonth() + 6);
  }

  // Determine owner to select correct T&C
  const ownerName = String((vehicle as any)?.owner?.name || 'AIE Skyline Limited').trim().toLowerCase();
  const isAIESkyline = ownerName === 'aie skyline limited' || ownerName === 'aie skyline';
  const resolvedTerms = isAIESkyline 
    ? companyDetails?.vehicleTermsAIESkyline 
    : companyDetails?.vehicleTermsOtherOwners;


  // Resolve values inside the component before the return
  const firstRegDate = asDate((vehicle as any)?.firstRegistrationDate); 
  const warrantyExp = asDate((vehicle as any)?.warrantyEndDate || (vehicle as any)?.warrantyExpiryDate); 

  // Compute Age String
  const ageStr = firstRegDate 
    ? `${Math.floor((Date.now() - firstRegDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25))} Years` 
    : 'N/A';

  return (
    <Document>
      {/* --- PAGE 1: Standard Vehicle Details --- */}
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
                  <Text style={[styles.label, { paddingLeft: 5 }]}>First Reg. Date: </Text>
                  <Text style={styles.value}>{formatDateString(firstRegDate)}</Text>
                </Text>
              </View>
              <View style={[styles.tableCol, { marginLeft: 15 }]}>
                <Text style={styles.flexRow}>
                  <Text style={[styles.label, { paddingLeft: 5 }]}>Vehicle Age: </Text>
                  <Text style={styles.value}>{ageStr}</Text>
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
                  <Text style={[styles.label, { paddingLeft: 5 }]}>Assignment Type: </Text>
                  <Text style={styles.value}>{(vehicle as any)?.assignmentType || 'Unassigned'}</Text>
                </Text>
              </View>
              <View style={[styles.tableCol, { marginLeft: 15 }]}>
                <Text style={styles.flexRow}>
                  <Text style={[styles.label, { paddingLeft: 5 }]}>Current Mileage: </Text>
                  <Text style={styles.value}>
                    {(vehicle as any)?.mileage ? `${Number((vehicle as any).mileage).toLocaleString()} mi` : 'N/A'}
                  </Text>
                </Text>
              </View>
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
              <Text style={[styles.tableCell, styles.tableHeaderCell]}>Warranty</Text>
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
              <Text style={[styles.tableCell, isExpired(warrantyExp) && styles.expiredText]}>
                {formatDateString(warrantyExp)}
              </Text>
            </View>
          </View>
        </View>

        {/* Service & Maintenance Information */}
        <View style={[styles.section, styles.sectionBreak, { minHeight: 100 }]} wrap={false}>
          <Text style={styles.sectionTitle}>Service & Maintenance Information</Text>
          <View style={[styles.table, { breakInside: 'avoid' as any }]}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCell, styles.tableHeaderCell]}>Last Service Date</Text>
              <Text style={[styles.tableCell, styles.tableHeaderCell]}>Next Service Date</Text>
              <Text style={[styles.tableCell, styles.tableHeaderCell]}>Service Interval</Text>
              <Text style={[styles.tableCell, styles.tableHeaderCell]}>Next Service Mileage</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.tableCell}>{formatDateString(asDate((vehicle as any)?.lastMaintenance))}</Text>
              <Text style={[styles.tableCell, isExpired(asDate((vehicle as any)?.nextMaintenance)) && styles.expiredText]}>
                {formatDateString(asDate((vehicle as any)?.nextMaintenance))}
              </Text>
              <Text style={styles.tableCell}>
                {(vehicle as any)?.serviceInterval ? `${Number((vehicle as any).serviceInterval).toLocaleString()} mi` : '25,000 mi'}
              </Text>
              <Text style={styles.tableCell}>
                {(vehicle as any)?.nextServiceMileage ? `${Number((vehicle as any).nextServiceMileage).toLocaleString()} mi` : 'N/A'}
              </Text>
            </View>
          </View>
        </View>

        {/* Document Images Grid */}
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

      {/* --- PAGE 2: Image & Terms & Conditions --- */}
      <Page size="A4" style={styles.page}>
        {/* Repeated Header */}
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

        {/* Centered Vehicle Image */}
        <View style={{ alignItems: 'center', marginTop: 10, marginBottom: 15 }}>
          {!!(vehicle as any)?.image ? (
            <Image 
              src={(vehicle as any).image} 
              style={{ width: 320, height: 180, objectFit: 'contain', borderRadius: 8 }} 
            />
          ) : (
            <View style={{ width: 320, height: 180, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', borderRadius: 8 }}>
              <Text style={{ color: '#9CA3AF', fontStyle: 'italic', fontSize: 10 }}>No vehicle image available</Text>
            </View>
          )}
        </View>

        {/* Terms and Conditions */}
        <View style={[styles.section, { flex: 1, paddingHorizontal: 10 }]}>
          <Text style={tcStyles.termTitle}>
            Vehicle Terms and Conditions
          </Text>
          <View style={tcStyles.termSection}>
            <Text style={tcStyles.termText}>
              {resolvedTerms || 'No terms and conditions have been configured for this vehicle owner type yet.'}
            </Text>
          </View>

          {/* Conditional Signatures for "Other Owners" */}
          {!isAIESkyline && (
            <View style={localStyles.signatureSection} wrap={false}>
              <View style={[styles.signatureBox, localStyles.compactBox, { borderWidth: 1, borderColor: '#3B82F6' }]}>
                {/* Blank space for owner to physically sign, or if they had a digital signature it would go here */}
                <View style={{ height: 25, marginVertical: 2 }}></View>
                <Text style={[styles.signatureLine, localStyles.compactLine]}>Owner's Signature</Text>
                <Text style={localStyles.compactText}>{(vehicle as any)?.owner?.name || 'Vehicle Owner'}</Text>
                <Text style={localStyles.compactText}>Date: {formatDateString(new Date())}</Text>
              </View>
              
              <View style={[styles.signatureBox, localStyles.compactBox, { borderWidth: 1, borderColor: '#3B82F6' }]}>
                {isValidPdfImageSrc(companyDetails?.signature) ? (
                  <Image src={companyDetails.signature} style={[styles.signature, localStyles.compactImage]} />
                ) : (
                  <View style={{ height: 25, marginVertical: 2 }}></View>
                )}
                <Text style={[styles.signatureLine, localStyles.compactLine]}>Authorized Signature</Text>
                <Text style={localStyles.compactText}>{companyDetails?.fullName || 'AIE Skyline Limited'}</Text>
                <Text style={localStyles.compactText}>Date: {formatDateString(new Date())}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Repeated Footer */}
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

// --- Local Styles for Signatures and Terms ---
const localStyles = StyleSheet.create({
  signatureSection: {
    marginTop: 15,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    breakInside: 'avoid',
  },
  compactBox: {
    padding: 5,
    width: '48%',
  },
  compactImage: {
    height: 25,
    marginVertical: 2,
    objectFit: 'contain',
  },
  compactLine: {
    marginTop: 2,
    marginBottom: 2,
    paddingTop: 2,
    fontSize: 9,
  },
  compactText: {
    fontSize: 8,
    color: '#374151',
    lineHeight: 1.2,
    marginBottom: 1,
  },
});

const tcStyles = StyleSheet.create({
  termTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    textDecoration: 'underline',
  },
  termSection: {
    marginBottom: 4, 
  },
  termText: {
    fontSize: 8, 
    marginBottom: 1,
    lineHeight: 1.4,
    textAlign: 'justify',
    color: '#374151',
  },
});