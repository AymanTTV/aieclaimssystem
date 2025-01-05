import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { Rental, Vehicle, Customer } from '../../types';
import { format } from 'date-fns';
import logo from '../../assets/logo.png';

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
  },
  header: {
    marginBottom: 20,
  },
  logo: {
    width: 120,
    marginBottom: 10,
  },
  companyInfo: {
    marginBottom: 20,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 5,
    backgroundColor: '#f3f4f6',
    padding: 5,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  column: {
    flex: 1,
  },
  label: {
    fontWeight: 'bold',
    width: 120,
  },
  value: {
    flex: 1,
  },
  paymentSection: {
    marginTop: 10,
    padding: 5,
    backgroundColor: '#f3f4f6',
  },
  signatureSection: {
    marginTop: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  signatureBox: {
    width: '45%',
  },
  signature: {
    width: '100%',
    height: 50,
    marginBottom: 5,
  },
  signatureLine: {
    borderTopWidth: 1,
    borderTopColor: '#000',
    marginTop: 5,
    paddingTop: 5,
    textAlign: 'center',
  },
  terms: {
    marginTop: 20,
    fontSize: 8,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 8,
    textAlign: 'center',
    color: '#6b7280',
  },
});

interface RentalAgreementProps {
  rental: Rental;
  vehicle: Vehicle;
  customer: Customer;
  companyDetails: {
    name?: string;
    fullName?: string;
    officialAddress?: string;
    phone?: string;
    email?: string;
    vatNumber?: string;
    registrationNumber?: string;
    termsAndConditions?: string;
    signature?: string;
  };
}

const RentalAgreement: React.FC<RentalAgreementProps> = ({
  rental,
  vehicle,
  customer,
  companyDetails = {},
}) => {
  const formatDate = (date: Date) => format(date, 'dd/MM/yyyy HH:mm');

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Image src={logo} style={styles.logo} />
          <View style={styles.companyInfo}>
            <Text>{companyDetails.fullName || 'AIE SKYLINE'}</Text>
            <Text>{companyDetails.officialAddress || ''}</Text>
            <Text>Tel: {companyDetails.phone || ''}</Text>
            <Text>Email: {companyDetails.email || ''}</Text>
            <Text>VAT No: {companyDetails.vatNumber || ''}</Text>
          </View>
        </View>

        <Text style={styles.title}>VEHICLE RENTAL AGREEMENT</Text>

        {/* Agreement Details */}
        <View style={styles.section}>
          <Text>Agreement No: {rental.id.slice(-8).toUpperCase()}</Text>
          <Text>Date: {formatDate(rental.createdAt)}</Text>
        </View>

        {/* Hirer Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>HIRER DETAILS</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Name:</Text>
            <Text style={styles.value}>{customer.name}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Address:</Text>
            <Text style={styles.value}>{customer.address}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Contact Number:</Text>
            <Text style={styles.value}>{customer.mobile}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>License Number:</Text>
            <Text style={styles.value}>{customer.driverLicenseNumber}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>License Expiry:</Text>
            <Text style={styles.value}>{format(customer.licenseExpiry, 'dd/MM/yyyy')}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Badge Number:</Text>
            <Text style={styles.value}>{customer.badgeNumber}</Text>
          </View>
        </View>

        {/* Vehicle Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>VEHICLE DETAILS</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Make & Model:</Text>
            <Text style={styles.value}>{vehicle.make} {vehicle.model}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Registration:</Text>
            <Text style={styles.value}>{vehicle.registrationNumber}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Current Mileage:</Text>
            <Text style={styles.value}>{vehicle.mileage.toLocaleString()} miles</Text>
          </View>
        </View>

        {/* Payment Details */}
        <View style={styles.paymentSection}>
          <Text style={styles.sectionTitle}>PAYMENT DETAILS</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Payment Type:</Text>
            <Text style={styles.value}>{rental.type.toUpperCase()}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Rate:</Text>
            <Text style={styles.value}>£{rental.type === 'claim' ? '340' : rental.type === 'weekly' ? '360' : '60'} per {rental.type === 'weekly' ? 'week' : 'day'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Payment Due:</Text>
            <Text style={styles.value}>{format(rental.dueDate || rental.endDate, 'dd/MM/yyyy')}</Text>
          </View>
        </View>

        {/* Signatures */}
        <View style={styles.signatureSection}>
          <View style={styles.signatureBox}>
            {rental.signature && (
              <Image src={rental.signature} style={styles.signature} />
            )}
            <Text style={styles.signatureLine}>Hirer's Signature</Text>
            <Text>{customer.name}</Text>
            <Text>{formatDate(rental.createdAt)}</Text>
          </View>
          <View style={styles.signatureBox}>
            {companyDetails.signature && (
              <Image src={companyDetails.signature} style={styles.signature} />
            )}
            <Text style={styles.signatureLine}>For and on behalf of {companyDetails.fullName || 'AIE SKYLINE'}</Text>
            <Text>{companyDetails.name || ''}</Text>
            <Text>{formatDate(rental.createdAt)}</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>
            {companyDetails.fullName || 'AIE SKYLINE'} | Registered in England and Wales 
            {companyDetails.registrationNumber ? ` | Company No: ${companyDetails.registrationNumber}` : ''}
          </Text>
          <Text>
            Registered Office: {companyDetails.officialAddress || ''}
          </Text>
        </View>
      </Page>
    </Document>
  );
};

export default RentalAgreement;