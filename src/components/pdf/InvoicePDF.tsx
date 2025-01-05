import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { Invoice, Vehicle } from '../../types';
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
  title: {
    fontSize: 20,
    marginBottom: 20,
    textAlign: 'center',
  },
  section: {
    marginBottom: 15,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  label: {
    fontWeight: 'bold',
  },
  paymentSection: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#f3f4f6',
  },
  paymentHistory: {
    marginTop: 10,
    borderTop: '1 solid #e5e7eb',
    paddingTop: 10,
  },
  paymentRecord: {
    marginBottom: 5,
    paddingLeft: 10,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 8,
    color: '#666',
  },
});

interface InvoicePDFProps {
  invoice: Invoice;
  vehicle?: Vehicle;
  companyDetails: any;
}

export const InvoicePDF: React.FC<InvoicePDFProps> = ({ invoice, vehicle, companyDetails }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <Image src={logo} style={styles.logo} />
        <Text>{companyDetails.fullName}</Text>
        <Text>{companyDetails.officialAddress}</Text>
        <Text>VAT No: {companyDetails.vatNumber}</Text>
      </View>

      <Text style={styles.title}>INVOICE</Text>

      {/* Invoice Details */}
      <View style={styles.section}>
        <View style={styles.row}>
          <Text style={styles.label}>Invoice Number:</Text>
          <Text>INV-{invoice.id.slice(-8).toUpperCase()}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Date:</Text>
          <Text>{format(invoice.date, 'dd/MM/yyyy')}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Due Date:</Text>
          <Text>{format(invoice.dueDate, 'dd/MM/yyyy')}</Text>
        </View>
      </View>

      {/* Customer Details */}
      <View style={styles.section}>
        <Text style={styles.label}>Bill To:</Text>
        <Text>{invoice.customerName || 'Customer'}</Text>
      </View>

      {/* Vehicle Details if applicable */}
      {vehicle && (
        <View style={styles.section}>
          <Text style={styles.label}>Vehicle Details:</Text>
          <Text>{vehicle.make} {vehicle.model}</Text>
          <Text>Registration: {vehicle.registrationNumber}</Text>
        </View>
      )}

      {/* Service Details */}
      <View style={styles.section}>
        <Text style={styles.label}>Service Details:</Text>
        <Text>Category: {invoice.category}</Text>
        <Text>Description: {invoice.description}</Text>
      </View>

      {/* Payment Summary */}
      <View style={styles.paymentSection}>
        <View style={styles.row}>
          <Text style={styles.label}>Total Amount:</Text>
          <Text>£{invoice.amount.toFixed(2)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Amount Paid:</Text>
          <Text>£{invoice.paidAmount.toFixed(2)}</Text>
        </View>
        {invoice.remainingAmount > 0 && (
          <View style={styles.row}>
            <Text style={styles.label}>Balance Due:</Text>
            <Text>£{invoice.remainingAmount.toFixed(2)}</Text>
          </View>
        )}
        <View style={styles.row}>
          <Text style={styles.label}>Status:</Text>
          <Text>{invoice.paymentStatus.replace('_', ' ').toUpperCase()}</Text>
        </View>
      </View>

      {/* Payment History */}
      {invoice.payments && invoice.payments.length > 0 && (
        <View style={styles.paymentHistory}>
          <Text style={styles.label}>Payment History:</Text>
          {invoice.payments.map((payment, index) => (
            <View key={index} style={styles.paymentRecord}>
              <Text>
                {format(payment.date, 'dd/MM/yyyy HH:mm')} - £{payment.amount.toFixed(2)} - 
                {payment.method.replace('_', ' ').toUpperCase()}
                {payment.reference && ` (Ref: ${payment.reference})`}
              </Text>
              {payment.notes && (
                <Text style={{ color: '#666', fontSize: 9 }}>Note: {payment.notes}</Text>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Payment Details */}
      <View style={styles.section}>
        <Text style={styles.label}>Payment Details:</Text>
        <Text>Bank: {companyDetails.bankName}</Text>
        <Text>Sort Code: {companyDetails.sortCode}</Text>
        <Text>Account Number: {companyDetails.accountNumber}</Text>
        <Text>Reference: INV-{invoice.id.slice(-8).toUpperCase()}</Text>
      </View>

      {/* Footer */}
      <Text style={styles.footer}>
        {companyDetails.fullName} | Registered in England and Wales | Company No: {companyDetails.registrationNumber}
      </Text>
    </Page>
  </Document>
);