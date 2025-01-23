// src/components/pdf/RentalInvoice.tsx

import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { Rental, Vehicle, Customer } from '../../types';
import { format } from 'date-fns';
import logo from '../../assets/logo.png';

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  logo: {
    width: 120,
    height: 'auto',
  },
  companyInfo: {
    textAlign: 'right',
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
    textAlign: 'center',
    color: '#374151',
    borderBottom: '1 solid #E5E7EB',
    paddingBottom: 10,
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
    backgroundColor: '#F9FAFB',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
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

// Function to generate invoice number
const generateInvoiceNumber = (id: string): string => {
  // Get last 3 characters of ID and pad with zeros if needed
  const number = id.slice(-3).padStart(3, '0');
  return `AIE-INV-${number}`;
};

const formatPDFDate = (date: Date | string | null | undefined): string => {
  if (!date) return 'N/A';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
      return 'N/A';
    }
    return format(dateObj, 'dd/MM/yyyy');
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'N/A';
  }
};

const RentalInvoice: React.FC<{
  rental: Rental;
  vehicle: Vehicle;
  customer: Customer;
  companyDetails: any;
}> = ({ rental, vehicle, customer, companyDetails }) => {
  // Helper function to format dates
  const formatPDFDate = (date: Date | string | null | undefined): string => {
    if (!date) return 'N/A';
    
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
        return 'N/A';
      }
      return format(dateObj, 'dd/MM/yyyy');
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'N/A';
    }
  };

  // Generate invoice number
  const generateInvoiceNumber = (id: string): string => {
    const number = id.slice(-3).padStart(3, '0');
    return `AIE-INV-${number}`;
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Image src={logo} style={styles.logo} />
          <View style={styles.companyInfo}>
            <Text>{companyDetails.fullName}</Text>
            <Text>{companyDetails.officialAddress}</Text>
            <Text>Tel: {companyDetails.phone}</Text>
            <Text>Email: {companyDetails.email}</Text>
            <Text>VAT No: {companyDetails.vatNumber}</Text>
          </View>
        </View>

        {/* Invoice Title and Number */}
        <View style={styles.section}>
          <Text style={styles.title}>INVOICE</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Invoice Number:</Text>
            <Text style={styles.value}>{generateInvoiceNumber(rental.id)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Date:</Text>
            <Text style={styles.value}>{formatPDFDate(rental.createdAt)}</Text>
          </View>
        </View>

        {/* Bill To Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bill To</Text>
          <Text>{customer.name}</Text>
          <Text>{customer.address}</Text>
          <Text>{customer.mobile}</Text>
          <Text>{customer.email}</Text>
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
              {formatPDFDate(rental.startDate)} - {formatPDFDate(rental.endDate)}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Type:</Text>
            <Text style={styles.value}>{rental.type.toUpperCase()}</Text>
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
                <Text style={styles.value}>£{rental.remainingAmount.toFixed(2)}</Text>
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
          <Text>Reference: {generateInvoiceNumber(rental.id)}</Text>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          {companyDetails.fullName} | Registered in England and Wales | Company No: {companyDetails.registrationNumber}
        </Text>
      </Page>
    </Document>
  );
};

export default RentalInvoice;
