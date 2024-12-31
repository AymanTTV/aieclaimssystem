import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { Rental, Vehicle, Customer } from '../../types';
import { format, isValid } from 'date-fns';

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 12,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    marginBottom: 10,
    textAlign: 'center',
  },
  section: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    marginBottom: 5,
    fontWeight: 'bold',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  label: {
    width: 120,
  },
  value: {
    flex: 1,
  },
  terms: {
    marginTop: 20,
    fontSize: 10,
  },
  signatureSection: {
    marginTop: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  signatureBox: {
    width: 200,
  },
  signature: {
    width: '100%',
    height: 50,
    objectFit: 'contain',
  },
  signatureLine: {
    borderTop: '1 solid black',
    marginTop: 20,
    textAlign: 'center',
  },
});

interface RentalAgreementProps {
  rental: Rental;
  vehicle: Vehicle;
  customer: Customer;
  companySignature?: string;
  customerSignature?: string;
}

const formatDateTime = (date: Date | null | undefined): string => {
  if (!date || !isValid(date)) return 'N/A';
  return format(date, 'dd/MM/yyyy HH:mm');
};

const RentalAgreement: React.FC<RentalAgreementProps> = ({
  rental,
  vehicle,
  customer,
  companySignature,
  customerSignature
}) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.title}>RENTAL AGREEMENT</Text>
        <Text>Agreement No: {rental.id.slice(-6)}</Text>
        <Text>Date: {formatDateTime(rental.createdAt)}</Text>
      </View>

      {/* Vehicle Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Vehicle Details</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Make & Model:</Text>
          <Text style={styles.value}>{vehicle.make} {vehicle.model}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Registration:</Text>
          <Text style={styles.value}>{vehicle.registrationNumber}</Text>
        </View>
      </View>

      {/* Customer Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Customer Details</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Name:</Text>
          <Text style={styles.value}>{customer.name}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Contact:</Text>
          <Text style={styles.value}>{customer.mobile}</Text>
        </View>
      </View>

      {/* Rental Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Rental Details</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Start Date:</Text>
          <Text style={styles.value}>{formatDateTime(rental.startDate)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>End Date:</Text>
          <Text style={styles.value}>{formatDateTime(rental.endDate)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Total Cost:</Text>
          <Text style={styles.value}>£{rental.cost.toFixed(2)}</Text>
        </View>
      </View>

      {/* Terms and Conditions */}
      <View style={styles.terms}>
        <Text style={styles.sectionTitle}>Terms and Conditions</Text>
        <Text>1. The vehicle must be returned in the same condition as received.</Text>
        <Text>2. Any damage will be charged to the customer.</Text>
        <Text>3. Late returns will incur additional charges.</Text>
        <Text>4. Full payment is required before vehicle collection.</Text>
      </View>

      {/* Signatures */}
      <View style={styles.signatureSection}>
        <View style={styles.signatureBox}>
          {customerSignature ? (
            <Image src={customerSignature} style={styles.signature} />
          ) : (
            <Text style={styles.signatureLine}>Customer Signature</Text>
          )}
        </View>
        <View style={styles.signatureBox}>
          {companySignature ? (
            <Image src={companySignature} style={styles.signature} />
          ) : (
            <Text style={styles.signatureLine}>Company Representative</Text>
          )}
        </View>
      </View>
    </Page>
  </Document>
);

export default RentalAgreement;