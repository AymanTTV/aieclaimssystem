import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
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
    marginBottom: 15,
    borderBottom: '1 solid #eee',
    paddingBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    marginBottom: 8,
    color: '#374151',
    fontWeight: 'bold',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  label: {
    width: 150,
    color: '#6B7280',
  },
  value: {
    flex: 1,
  },
  table: {
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 5,
    marginBottom: 5,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 5,
  },
  col1: { width: '40%' },
  col2: { width: '20%' },
  col3: { width: '20%' },
  col4: { width: '20%', textAlign: 'right' },
  total: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 5,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    fontSize: 8,
    textAlign: 'center',
    color: '#6B7280',
  }
});

const formatDateTime = (date: Date | null | undefined): string => {
  if (!date || !isValid(date)) return 'N/A';
  return format(date, 'dd/MM/yyyy HH:mm');
};

const RentalInvoice: React.FC<{
  rental: Rental;
  vehicle: Vehicle;
  customer: Customer;
  companyDetails: any;
}> = ({ rental, vehicle, customer, companyDetails }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>INVOICE</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Invoice No:</Text>
          <Text style={styles.value}>INV-{rental.id.slice(-8).toUpperCase()}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Date:</Text>
          <Text style={styles.value}>{formatDateTime(rental.createdAt)}</Text>
        </View>
      </View>

      {/* Bill To Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Bill To</Text>
        <Text>{customer.name}</Text>
        <Text>{customer.address}</Text>
        <Text>{customer.mobile}</Text>
      </View>

      {/* Rental Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Rental Details</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Vehicle:</Text>
          <Text style={styles.value}>{vehicle.make} {vehicle.model}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Registration:</Text>
          <Text style={styles.value}>{vehicle.registrationNumber}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Period:</Text>
          <Text style={styles.value}>
            {formatDateTime(rental.startDate)} - {formatDateTime(rental.endDate)}
          </Text>
        </View>
      </View>

      {/* Charges Table */}
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={styles.col1}>Description</Text>
          <Text style={styles.col2}>Duration</Text>
          <Text style={styles.col3}>Rate</Text>
          <Text style={styles.col4}>Amount</Text>
        </View>

        <View style={styles.tableRow}>
          <Text style={styles.col1}>Vehicle Rental</Text>
          <Text style={styles.col2}>
            {rental.type === 'weekly' ? `${rental.numberOfWeeks} weeks` : 'Daily'}
          </Text>
          <Text style={styles.col3}>
            £{(rental.cost / (rental.type === 'weekly' ? rental.numberOfWeeks : 1)).toFixed(2)}
          </Text>
          <Text style={styles.col4}>£{rental.cost.toFixed(2)}</Text>
        </View>
      </View>

      {/* Payment Summary */}
      <View style={styles.total}>
        <View style={styles.row}>
          <Text style={styles.label}>Total Amount:</Text>
          <Text style={styles.value}>£{rental.cost.toFixed(2)}</Text>
        </View>
        {rental.paidAmount > 0 && (
          <>
            <View style={styles.row}>
              <Text style={styles.label}>Amount Paid:</Text>
              <Text style={styles.value}>£{rental.paidAmount.toFixed(2)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Balance Due:</Text>
              <Text style={styles.value}>£{(rental.cost - rental.paidAmount).toFixed(2)}</Text>
            </View>
          </>
        )}
      </View>

      {/* Payment Instructions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Payment Details</Text>
        <Text>Bank: {companyDetails.bankName}</Text>
        <Text>Sort Code: {companyDetails.sortCode}</Text>
        <Text>Account Number: {companyDetails.accountNumber}</Text>
        <Text>Reference: INV-{rental.id.slice(-8).toUpperCase()}</Text>
      </View>

      {/* Footer */}
      <Text style={styles.footer}>
        Thank you for your business. Please ensure all payments are made within our standard payment terms.
      </Text>
    </Page>
  </Document>
);

export default RentalInvoice;