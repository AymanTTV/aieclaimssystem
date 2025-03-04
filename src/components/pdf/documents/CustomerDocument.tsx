import React from 'react';
import { Text, View, Image } from '@react-pdf/renderer';
import { Customer } from '../../../types/customer';
import BaseDocument from '../BaseDocument';
import { formatDate } from '../../../utils/dateHelpers';
import { styles } from '../styles';

interface CustomerDocumentProps {
  data: Customer;
  companyDetails: any;
}

const CustomerDocument: React.FC<CustomerDocumentProps> = ({ data, companyDetails }) => (
  <BaseDocument title="Customer Record" companyDetails={companyDetails}>
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
      <View style={styles.section}>
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

    {companyDetails.customerTerms && (
      <View style={styles.terms}>
        <Text>{companyDetails.customerTerms}</Text>
      </View>
    )}
  </BaseDocument>
);

export default CustomerDocument;