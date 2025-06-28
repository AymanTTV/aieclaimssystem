// src/components/pdf/documents/CustomerDocument.tsx
import React from 'react';
import { Document, Page, Text, View, Image } from '@react-pdf/renderer';
import { Customer } from '../../../types/customer'; // Assuming this path is correct
// Removed BaseDocument import
import { formatDate } from '../../../utils/dateHelpers';
import { styles } from '../styles'; // Your global styles.ts

interface CustomerDocumentProps {
  data: Customer;
  companyDetails: {
    logoUrl?: string; // Added this property to match the new header's expectation
    fullName: string;
    officialAddress: string;
    vatNumber: string;
    registrationNumber: string;
    phone: string;
    email: string;
    customerTerms?: string; // Keeping this for the terms section
    signature?: string; // For company signature
  };
}

const CustomerDocument: React.FC<CustomerDocumentProps> = ({ data, companyDetails }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* HEADER - Replicated from VehicleDocument.tsx / VATRecordDocument.tsx */}
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

      {/* TITLE - Rendered directly within the Page */}
      <View style={styles.titleContainer}>
        <Text style={styles.title}>CUSTOMER RECORD</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Personal Information</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Name:</Text>
          <Text style={styles.value}>{data.name}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Gender:</Text>
          <Text style={styles.value}>{data.gender}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Date of Birth:</Text>
          <Text style={styles.value}>{formatDate(data.dateOfBirth)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Age:</Text>
          <Text style={styles.value}>{data.age} years</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Contact Information</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Mobile:</Text>
          <Text style={styles.value}>{data.mobile}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Email:</Text>
          <Text style={styles.value}>{data.email}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Address:</Text>
          <Text style={styles.value}>{data.address}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>License Information</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Driver License Number:</Text>
          <Text style={styles.value}>{data.driverLicenseNumber}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>License Valid From:</Text>
          <Text style={styles.value}>{formatDate(data.licenseValidFrom)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>License Expiry:</Text>
          <Text style={styles.value}>{formatDate(data.licenseExpiry)}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Additional Information</Text>
        <View style={styles.row}>
          <Text style={styles.label}>National Insurance Number:</Text>
          <Text style={styles.value}>{data.nationalInsuranceNumber}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Badge Number:</Text>
          <Text style={styles.value}>{data.badgeNumber}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Bill Expiry:</Text>
          <Text style={styles.value}>{formatDate(data.billExpiry)}</Text>
        </View>
      </View>

      {/* Customer Signature Section */}
      {data.signature && (
        <View style={[styles.section, {marginBottom: 30}]} wrap={false}> {/* Added wrap={false} and adjusted margin */}
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
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account Information</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Created At:</Text>
          <Text style={styles.value}>{formatDate(data.createdAt)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Last Updated:</Text>
          <Text style={styles.value}>{formatDate(data.updatedAt)}</Text>
        </View>
      </View>

      {/* Customer Terms - Rendered directly within the Page */}
      {companyDetails.customerTerms && (
        <View style={[styles.section, { breakInside: 'avoid' }]}> {/* Added breakInside: 'avoid' */}
          <Text style={styles.sectionTitle}>Terms & Conditions</Text> {/* Added a section title for clarity */}
          <Text style={styles.termsText}>{companyDetails.customerTerms}</Text>
        </View>
      )}

      {/* FOOTER - Replicated from VehicleDocument.tsx / VATRecordDocument.tsx */}
      <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            AIE SKYLINE LIMITED, registered in England and Wales with the company registration number 15616639, registered office address: United House, 39-41 North Road, London, N7 9DP. VAT. NO. 453448875
          </Text>
          <Text
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
          />
      </View>
    </Page>
  </Document>
);

export default CustomerDocument;