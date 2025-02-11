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
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  logo: {
    width: 120,
  },
  companyInfo: {
    textAlign: 'right',
  },
  title: {
    fontSize: 20,
    marginBottom: 10,
    textAlign: 'center',
    borderBottom: 1,
    borderBottomColor: '#000',
    paddingBottom: 5,
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
  col1: { width: '25%' },
  col2: { width: '25%' },
  col3: { width: '25%' },
  col4: { width: '25%', textAlign: 'right' },
  total: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 5,
  },
  paymentHistory: {
    marginTop: 15,
    padding: 10,
    backgroundColor: '#F9FAFB',
  },
  paymentRecord: {
    marginBottom: 5,
    paddingLeft: 10,
  },
  ongoingCharges: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#FEF2F2',
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

interface InvoicePDFProps {
  invoice: Invoice;
  vehicle?: Vehicle;
  companyDetails: any;
}

export const InvoicePDF: React.FC<InvoicePDFProps> = ({ 
  invoice, 
  vehicle, 
  companyDetails 
}) => {
  // src/components/pdf/InvoicePDF.tsx

// Update the formatDate function to handle invalid dates
const formatDate = (date: Date | null | undefined): string => {
  if (!date) return 'N/A';
  
  try {
    // Handle Firestore Timestamp
    if (date?.toDate) {
      date = date.toDate();
    }
    
    // Ensure we have a valid Date object
    const dateObj = date instanceof Date ? date : new Date(date);
    
    if (isNaN(dateObj.getTime())) {
      return 'N/A';
    }
    
    return format(dateObj, 'dd/MM/yyyy');
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'N/A';
  }
};

  const formatDateTime = (date: Date) => format(date, 'dd/MM/yyyy HH:mm');

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

        <Text style={styles.title}>INVOICE</Text>

        {/* Invoice Details */}
        <View style={styles.section}>
          <View style={styles.row}>
            <Text style={styles.label}>Invoice Number:</Text>
            <Text style={styles.value}>AIE-INV-{invoice.id.slice(-8).toUpperCase()}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Date:</Text>
            <Text style={styles.value}>{formatDate(invoice.date)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Due Date:</Text>
            <Text style={styles.value}>
              {invoice.type === 'weekly' ? 'Every Monday' : formatDate(invoice.dueDate)}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Payment Status:</Text>
            <Text style={styles.value}>{invoice.paymentStatus.replace('_', ' ').toUpperCase()}</Text>
          </View>
        </View>

        {/* Customer Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bill To:</Text>
          <Text>{invoice.customerName || 'Customer'}</Text>
          {invoice.customerAddress && <Text>{invoice.customerAddress}</Text>}
        </View>

        {/* Vehicle Details if applicable */}
        {vehicle && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Vehicle Details:</Text>
            <Text>{vehicle.make} {vehicle.model}</Text>
            <Text>Registration: {vehicle.registrationNumber}</Text>
          </View>
        )}

        {/* Service Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Service Details:</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Category:</Text>
            <Text style={styles.value}>{invoice.category}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Description:</Text>
            <Text style={styles.value}>{invoice.description}</Text>
          </View>
        </View>

        {/* Payment History */}
        {invoice.payments && invoice.payments.length > 0 && (
          <View style={styles.paymentHistory}>
            <Text style={styles.sectionTitle}>Payment History:</Text>
            {invoice.payments.map((payment, index) => (
              <View key={index} style={styles.paymentRecord}>
                <Text>
                  {formatDateTime(payment.date)} - £{payment.amount.toFixed(2)} - 
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

        {/* Ongoing Charges (if any) */}
        {invoice.ongoingCharges > 0 && (
          <View style={styles.ongoingCharges}>
            <Text style={styles.sectionTitle}>Ongoing Charges:</Text>
            <Text>Additional charges since original invoice: £{invoice.ongoingCharges.toFixed(2)}</Text>
          </View>
        )}

        {/* Payment Summary */}
        <View style={styles.total}>
          <View style={styles.row}>
            <Text style={styles.label}>Original Amount:</Text>
            <Text style={styles.value}>£{invoice.amount.toFixed(2)}</Text>
          </View>
          {invoice.ongoingCharges > 0 && (
            <View style={styles.row}>
              <Text style={styles.label}>Ongoing Charges:</Text>
              <Text style={styles.value}>£{invoice.ongoingCharges.toFixed(2)}</Text>
            </View>
          )}
          <View style={styles.row}>
            <Text style={styles.label}>Total Amount:</Text>
            <Text style={styles.value}>£{(invoice.amount + (invoice.ongoingCharges || 0)).toFixed(2)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Amount Paid:</Text>
            <Text style={styles.value}>£{invoice.paidAmount.toFixed(2)}</Text>
          </View>
          {invoice.remainingAmount > 0 && (
            <View style={styles.row}>
              <Text style={styles.label}>Balance Due:</Text>
              <Text style={styles.value}>£{invoice.remainingAmount.toFixed(2)}</Text>
            </View>
          )}
        </View>

        {/* Payment Instructions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Details:</Text>
          <Text>Bank: {companyDetails.bankName}</Text>
          <Text>Sort Code: {companyDetails.sortCode}</Text>
          <Text>Account Number: {companyDetails.accountNumber}</Text>
          <Text>Reference: AIE-INV-{invoice.id.slice(-8).toUpperCase()}</Text>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          {companyDetails.fullName} | Registered in England and Wales | Company No: {companyDetails.registrationNumber}
        </Text>
      </Page>
    </Document>
  );
};