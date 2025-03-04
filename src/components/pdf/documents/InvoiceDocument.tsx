import React from 'react';
import { Document, Page, Text, View, Image } from '@react-pdf/renderer';
import { Invoice, Vehicle } from '../../../types';
import { styles } from '../styles';
import { formatDate } from '../../../utils/dateHelpers';

interface InvoiceDocumentProps {
  data: Invoice;
  vehicle?: Vehicle;
  companyDetails: any;
}

const InvoiceDocument: React.FC<InvoiceDocumentProps> = ({ 
  data, 
  vehicle, 
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
            <Text>VAT No: {companyDetails.vatNumber}</Text>
          </View>
        </View>

        <Text style={styles.title}>INVOICE</Text>

        {/* Invoice Details */}
        <View style={[styles.section, styles.keepTogether]}>
          <View style={styles.infoCard}>
            <View style={styles.row}>
              <Text style={styles.label}>Invoice Number:</Text>
              <Text style={styles.value}>AIE-INV-{data.id.slice(-8).toUpperCase()}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Date:</Text>
              <Text style={styles.value}>{formatDate(data.date)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Due Date:</Text>
              <Text style={styles.value}>{formatDate(data.dueDate)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Status:</Text>
              <Text style={styles.value}>{data.paymentStatus.replace('_', ' ')}</Text>
            </View>
          </View>
        </View>

        {/* Customer Details */}
        <View style={[styles.section, styles.keepTogether]}>
          <Text style={styles.sectionTitle}>Bill To:</Text>
          <View style={styles.infoCard}>
            <Text>{data.customerName}</Text>
            {data.customerAddress && <Text>{data.customerAddress}</Text>}
          </View>
        </View>

        {/* Vehicle Details if applicable */}
        {vehicle && (
          <View style={[styles.section, styles.keepTogether]}>
            <Text style={styles.sectionTitle}>Vehicle Details:</Text>
            <View style={styles.infoCard}>
              <Text>{vehicle.make} {vehicle.model}</Text>
              <Text>Registration: {vehicle.registrationNumber}</Text>
            </View>
          </View>
        )}

        {/* Service Details */}
        <View style={[styles.section, styles.keepTogether]}>
          <Text style={styles.sectionTitle}>Service Details:</Text>
          <View style={styles.infoCard}>
            <View style={styles.row}>
              <Text style={styles.label}>Category:</Text>
              <Text style={styles.value}>
                {data.category === 'other' ? data.customCategory : data.category}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Description:</Text>
              <Text style={styles.value}>{data.description}</Text>
            </View>
          </View>
        </View>

        {/* Payment Summary */}
        <View style={[styles.section, styles.keepTogether]}>
          <Text style={styles.sectionTitle}>Payment Summary</Text>
          <View style={styles.infoCard}>
            <View style={styles.row}>
              <Text style={styles.label}>Total Amount:</Text>
              <Text style={styles.value}>£{data.amount.toFixed(2)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Amount Paid:</Text>
              <Text style={styles.value}>£{data.paidAmount.toFixed(2)}</Text>
            </View>
            {data.remainingAmount > 0 && (
              <View style={styles.row}>
                <Text style={styles.label}>Balance Due:</Text>
                <Text style={styles.value}>£{data.remainingAmount.toFixed(2)}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Payment History */}
        {data.payments && data.payments.length > 0 && (
          <View style={[styles.section, styles.keepTogether]}>
            <Text style={styles.sectionTitle}>Payment History</Text>
            {data.payments.map((payment, index) => (
              <View key={index} style={styles.infoCard}>
                <View style={styles.row}>
                  <Text style={styles.label}>Date:</Text>
                  <Text style={styles.value}>{formatDate(payment.date)}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.label}>Amount:</Text>
                  <Text style={styles.value}>£{payment.amount.toFixed(2)}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.label}>Method:</Text>
                  <Text style={styles.value}>{payment.method.replace('_', ' ')}</Text>
                </View>
                {payment.reference && (
                  <View style={styles.row}>
                    <Text style={styles.label}>Reference:</Text>
                    <Text style={styles.value}>{payment.reference}</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Payment Instructions */}
        <View style={[styles.section, styles.keepTogether]}>
          <Text style={styles.sectionTitle}>Payment Details</Text>
          <View style={styles.infoCard}>
            <Text>Bank: {companyDetails.bankName}</Text>
            <Text>Sort Code: {companyDetails.sortCode}</Text>
            <Text>Account Number: {companyDetails.accountNumber}</Text>
            <Text>Reference: AIE-INV-{data.id.slice(-8).toUpperCase()}</Text>
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