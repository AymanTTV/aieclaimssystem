import React from 'react';
import { Document, Page, Text, View, Image } from '@react-pdf/renderer';
import { Invoice, Vehicle } from '../../../types';
import { styles } from '../styles';
import { format } from 'date-fns';

interface InvoiceDocumentProps {
  data: Invoice;
  vehicle?: Vehicle;
  companyDetails: any;
}



const InvoiceDocument: React.FC<InvoiceDocumentProps> = ({ data, vehicle, companyDetails }) => {

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
          <Image src={companyDetails.logoUrl} style={styles.logo} />
          <View style={styles.companyInfo}>
            <Text>{companyDetails.fullName}</Text>
            <Text>{companyDetails.officialAddress}</Text>
            <Text>Tel: {companyDetails.phone}</Text>
            <Text>Email: {companyDetails.email}</Text>
            <Text>VAT No: {companyDetails.vatNumber}</Text>
          </View>
        </View>

        <Text style={styles.title}>INVOICE</Text>

        {/* Invoice Details Table */}
        <View style={[styles.section, styles.keepTogether]}>
          <Text style={styles.sectionTitle}>Invoice Details</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCell, { flex: 1 }]}>Field</Text>
              <Text style={[styles.tableCell, { flex: 2 }]}>Value</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 1 }]}>Invoice Number</Text>
              <Text style={[styles.tableCell, { flex: 2 }]}>AIE-INV-{data.id.slice(-8).toUpperCase()}</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 1 }]}>Date</Text>
              <Text style={[styles.tableCell, { flex: 2 }]}>{formatDate(data.date)}</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 1 }]}>Due Date</Text>
              <Text style={[styles.tableCell, { flex: 2 }]}>{formatDate(data.dueDate)}</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 1 }]}>Status</Text>
              <Text style={[styles.tableCell, { flex: 2 }]}>{data.paymentStatus.replace('_', ' ')}</Text>
            </View>
          </View>
        </View>

        {/* Customer Details Table */}
        <View style={[styles.section, styles.keepTogether]}>
          <Text style={styles.sectionTitle}>Customer Details</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCell, { flex: 1 }]}>Field</Text>
              <Text style={[styles.tableCell, { flex: 2 }]}>Value</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 1 }]}>Name</Text>
              <Text style={[styles.tableCell, { flex: 2 }]}>{data.customerName}</Text>
            </View>
            {data.customerAddress && (
              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 1 }]}>Address</Text>
                <Text style={[styles.tableCell, { flex: 2 }]}>{data.customerAddress}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Vehicle Details Table */}
        {vehicle && (
          <View style={[styles.section, styles.keepTogether]}>
            <Text style={styles.sectionTitle}>Vehicle Details</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableCell, { flex: 1 }]}>Field</Text>
                <Text style={[styles.tableCell, { flex: 2 }]}>Value</Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 1 }]}>Make & Model</Text>
                <Text style={[styles.tableCell, { flex: 2 }]}>{vehicle.make} {vehicle.model}</Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 1 }]}>Registration</Text>
                <Text style={[styles.tableCell, { flex: 2 }]}>{vehicle.registrationNumber}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Service Details Table */}
        <View style={[styles.section, styles.keepTogether]}>
          <Text style={styles.sectionTitle}>Service Details</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCell, { flex: 1 }]}>Field</Text>
              <Text style={[styles.tableCell, { flex: 2 }]}>Value</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 1 }]}>Category</Text>
              <Text style={[styles.tableCell, { flex: 2 }]}>
                {data.category === 'other' ? data.customCategory : data.category}
              </Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 1 }]}>Description</Text>
              <Text style={[styles.tableCell, { flex: 2 }]}>{data.description}</Text>
            </View>
          </View>
        </View>

        {/* Payment Summary Table */}
        <View style={[styles.section, styles.keepTogether]}>
          <Text style={styles.sectionTitle}>Payment Summary</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCell, { flex: 2 }]}>Item</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>Amount</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 2 }]}>Total Amount</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>£{data.amount.toFixed(2)}</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 2 }]}>Amount Paid</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>£{data.paidAmount.toFixed(2)}</Text>
            </View>
            {data.remainingAmount > 0 && (
              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 2 }]}>Balance Due</Text>
                <Text style={[styles.tableCell, { flex: 1 }]}>£{data.remainingAmount.toFixed(2)}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Payment History Table */}
        {data.payments && data.payments.length > 0 && (
          <View style={[styles.section, styles.keepTogether]}>
            <Text style={styles.sectionTitle}>Payment History</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableCell, { flex: 1 }]}>Date</Text>
                <Text style={[styles.tableCell, { flex: 1 }]}>Amount</Text>
                <Text style={[styles.tableCell, { flex: 1 }]}>Method</Text>
                <Text style={[styles.tableCell, { flex: 1 }]}>Reference</Text>
              </View>
              {data.payments.map((payment, index) => (
                <View key={index} style={styles.tableRow}>
                  <Text style={[styles.tableCell, { flex: 1 }]}>{formatDate(payment.date)}</Text>
                  <Text style={[styles.tableCell, { flex: 1 }]}>£{payment.amount.toFixed(2)}</Text>
                  <Text style={[styles.tableCell, { flex: 1 }]}>{payment.method.replace('_', ' ')}</Text>
                  <Text style={[styles.tableCell, { flex: 1 }]}>{payment.reference || '-'}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Payment Instructions */}
        <View style={[styles.section, styles.keepTogether]}>
          <Text style={styles.sectionTitle}>Payment Details</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCell, { flex: 1 }]}>Field</Text>
              <Text style={[styles.tableCell, { flex: 2 }]}>Value</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 1 }]}>Bank</Text>
              <Text style={[styles.tableCell, { flex: 2 }]}>{companyDetails.bankName}</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 1 }]}>Sort Code</Text>
              <Text style={[styles.tableCell, { flex: 2 }]}>{companyDetails.sortCode}</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 1 }]}>Account Number</Text>
              <Text style={[styles.tableCell, { flex: 2 }]}>{companyDetails.accountNumber}</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 1 }]}>Reference</Text>
              <Text style={[styles.tableCell, { flex: 2 }]}>AIE-INV-{data.id.slice(-8).toUpperCase()}</Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          {companyDetails.fullName} | Registered in England and Wales | Company No: {companyDetails.registrationNumber}
        </Text>
      </Page>
    </Document>
  );
};

export default InvoiceDocument;