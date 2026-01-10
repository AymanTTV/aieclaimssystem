import React from 'react';
import { Document, Page, Text, View, Image } from '@react-pdf/renderer';
import { Customer } from '../../../types/customer';
import { formatDate } from '../../../utils/dateHelpers';
import { styles } from '../styles';

interface CustomerDocumentProps {
  data: Customer;
  companyDetails: {
    logoUrl?: string;
    fullName: string;
    officialAddress: string;
    vatNumber: string;
    registrationNumber: string;
    phone: string;
    email: string;
    customerTerms?: string;
    signature?: string;
  };
}

const Row: React.FC<{ children: React.ReactNode; wrapAvoid?: boolean }> = ({ children, wrapAvoid }) => (
  <View style={{ flexDirection: 'row', gap: 12 }} wrap={!wrapAvoid} />
);

const ColCard: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <View style={[styles.card, { flex: 1, padding: 10 }]}>{children}</View>
);

const LabelValue: React.FC<{ label: string; value?: React.ReactNode }> = ({ label, value }) => (
  <View style={styles.row}>
    <Text style={styles.label}>{label}</Text>
    <Text style={styles.value}>{value ?? 'N/A'}</Text>
  </View>
);

const CustomerDocument: React.FC<CustomerDocumentProps> = ({ data, companyDetails }) => {
  const isCompany = data.type === 'company';

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header} fixed>
          <View style={styles.headerLeft}>
            {companyDetails?.logoUrl && <Image src={companyDetails.logoUrl} style={styles.logo} />}
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.companyName}>{companyDetails?.fullName || 'AIE Skyline Limited'}</Text>
            <Text style={styles.companyDetail}>{companyDetails?.officialAddress || 'N/A'}</Text>
            <Text style={styles.companyDetail}>Tel: {companyDetails?.phone || 'N/A'}</Text>
            <Text style={styles.companyDetail}>Email: {companyDetails?.email || 'N/A'}</Text>
          </View>
        </View>

        {/* Title */}
        <View style={styles.titleContainer}><Text style={styles.title}>CUSTOMER RECORD</Text></View>

        {/* === Row 1: Personal/Company Info + Contact Info (side-by-side cards) === */}
        <View style={{ flexDirection: 'row', gap: 12 }} wrap={false}>
          <ColCard>
            <Text style={styles.sectionTitle}>{isCompany ? 'Company Information' : 'Personal Information'}</Text>
            <LabelValue label="Type:" value={data.type} />
            <LabelValue label="Name:" value={data.name} />
            
            {/* ADDED: Show Account & VAT Number for Companies */}
            {isCompany && (
              <>
                 <LabelValue label="Account Number:" value={data.accountNumber} />
                 <LabelValue label="VAT Number:" value={data.vatNumber} />
              </>
            )}

            {!isCompany && (
              <>
                <LabelValue label="Gender:" value={data.gender} />
                <LabelValue label="Date of Birth:" value={data.dateOfBirth ? formatDate(data.dateOfBirth) : 'N/A'} />
                <LabelValue label="Age:" value={data.age ? `${data.age} years` : 'N/A'} />
              </>
            )}
          </ColCard>

          <ColCard>
            <Text style={styles.sectionTitle}>Contact Information</Text>
            <LabelValue label="Mobile:" value={data.mobile} />
            <LabelValue label="Email:" value={data.email} />
            <LabelValue label="Address:" value={data.address} />
          </ColCard>
        </View>

        {!isCompany && (
          <>
            {/* === Row 2: License Info + Additional Info (side-by-side cards) === */}
            <View style={{ height: 10 }} />
            <View style={{ flexDirection: 'row', gap: 12 }} wrap={false}>
              <ColCard>
                <Text style={styles.sectionTitle}>License Information</Text>
                <LabelValue label="Driver License Number:" value={data.driverLicenseNumber} />
                <LabelValue label="License Valid From:" value={data.licenseValidFrom ? formatDate(data.licenseValidFrom) : 'N/A'} />
                <LabelValue label="License Expiry:" value={data.licenseExpiry ? formatDate(data.licenseExpiry) : 'N/A'} />
              </ColCard>

              <ColCard>
                <Text style={styles.sectionTitle}>Additional Information</Text>
                <LabelValue label="National Insurance Number:" value={data.nationalInsuranceNumber} />
                <LabelValue label="Badge Number:" value={data.badgeNumber} />
                <LabelValue label="Bill Expiry:" value={data.billExpiry ? formatDate(data.billExpiry) : 'N/A'} />
              </ColCard>
            </View>

            {/* Terms & Conditions (unchanged) */}
            {companyDetails.customerTerms && (
              <View style={[styles.section, { breakInside: 'avoid' }]}>
                <Text style={styles.sectionTitle}>Terms & Conditions</Text>
                <Text style={styles.termsText}>{companyDetails.customerTerms}</Text>
              </View>
            )}

            {/* Signature section */}
            {data.signature && (
              <>
                <View style={{ height: 12 }} />
                <View style={[styles.section, { marginBottom: 30 }]} wrap={false}>
                  <Text style={styles.sectionTitle}>Customer Signature</Text>
                  <View style={styles.signatureSection}>
                    <View style={styles.signatureBox}>
                      <Text>Customer Name: {data.name}</Text>
                      <Image src={data.signature} style={styles.signature} />
                      <Text style={styles.signatureLine}>Customer Signature</Text>
                      <Text>Date: {formatDate(data.createdAt)}</Text>
                    </View>
                    {companyDetails.signature && (
                      <View style={styles.signatureBox}>
                        <Image src={companyDetails.signature} style={styles.signature} />
                        <Text style={styles.signatureLine}>For and on behalf of {companyDetails.fullName}</Text>
                        <Text>Date: {formatDate(new Date())}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </>
            )}
          </>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            AIE SKYLINE LIMITED, registered in England and Wales with the company registration number 15616639,
            registered office address: United House, 39-41 North Road, London, N7 9DP. VAT. NO. 453448875
          </Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
};

export default CustomerDocument;