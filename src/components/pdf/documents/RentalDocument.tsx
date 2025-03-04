import React from 'react';
import { Document, Page, Text, View, Image } from '@react-pdf/renderer';
import { Rental, Vehicle, Customer } from '../../../types';
import { styles } from '../styles';
import { formatDate } from '../../../utils/dateHelpers';

interface RentalDocumentProps {
  data: Rental;
  vehicle?: Vehicle;
  customer?: Customer;
  companyDetails: any;
}

const RentalDocument: React.FC<RentalDocumentProps> = ({ 
  data, 
  vehicle, 
  customer, 
  companyDetails 
}) => {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Image src={companyDetails.logoUrl} style={styles.logo} />
          <View style={styles.companyInfo}>
            <Text>{companyDetails.fullName}</Text>
            <Text>{companyDetails.officialAddress}</Text>
            <Text>Tel: {companyDetails.phone}</Text>
            <Text>Email: {companyDetails.email}</Text>
          </View>
        </View>

        <Text style={styles.title}>Rental Record</Text>

        {/* Rental Details */}
        <View style={[styles.section, styles.keepTogether]}>
          <Text style={styles.sectionTitle}>Rental Information</Text>
          <View style={styles.infoCard}>
            <View style={styles.row}>
              <Text style={styles.label}>Type:</Text>
              <Text style={styles.value}>{data.type}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Start Date:</Text>
              <Text style={styles.value}>{formatDate(data.startDate)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>End Date:</Text>
              <Text style={styles.value}>{formatDate(data.endDate)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Status:</Text>
              <Text style={styles.value}>{data.status}</Text>
            </View>
          </View>
        </View>

        {/* Vehicle Details */}
        {vehicle && (
          <View style={[styles.section, styles.keepTogether]}>
            <Text style={styles.sectionTitle}>Vehicle Details</Text>
            <View style={styles.infoCard}>
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
          </View>
        )}

        {/* Customer Details */}
        {customer && (
          <View style={[styles.section, styles.keepTogether]}>
            <Text style={styles.sectionTitle}>Customer Details</Text>
            <View style={styles.infoCard}>
              <View style={styles.row}>
                <Text style={styles.label}>Name:</Text>
                <Text style={styles.value}>{customer.name}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Contact:</Text>
                <Text style={styles.value}>{customer.mobile}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Email:</Text>
                <Text style={styles.value}>{customer.email}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Address:</Text>
                <Text style={styles.value}>{customer.address}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Payment Details */}
        <View style={[styles.section, styles.keepTogether]}>
          <Text style={styles.sectionTitle}>Payment Details</Text>
          <View style={styles.infoCard}>
            <View style={styles.row}>
              <Text style={styles.label}>Total Cost:</Text>
              <Text style={styles.value}>£{data.cost.toFixed(2)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Amount Paid:</Text>
              <Text style={styles.value}>£{data.paidAmount.toFixed(2)}</Text>
            </View>
            {data.remainingAmount > 0 && (
              <View style={styles.row}>
                <Text style={styles.label}>Remaining Amount:</Text>
                <Text style={styles.value}>£{data.remainingAmount.toFixed(2)}</Text>
              </View>
            )}
            <View style={styles.row}>
              <Text style={styles.label}>Payment Status:</Text>
              <Text style={styles.value}>{data.paymentStatus}</Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          {companyDetails.fullName} | Generated on {formatDate(new Date())}
        </Text>
      </Page>
    </Document>
  );
};

export default RentalDocument;