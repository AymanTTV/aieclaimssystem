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
  costSummary: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#F9FAFB',
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  costLabel: {
    color: '#6B7280',
  },
  costValue: {
    fontWeight: 'bold',
  },
  paymentHistory: {
    marginTop: 10,
    padding: 10,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
    paddingBottom: 5,
    borderBottom: '1 solid #E5E7EB',
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

const RentalInvoice: React.FC<{
  rental: Rental;
  vehicle: Vehicle;
  customer: Customer;
  companyDetails: any;
}> = ({ rental, vehicle, customer, companyDetails }) => {
  const formatDateTime = (date: Date | string | null | undefined): string => {
  if (!date) return 'N/A';
  
  try {
    // Handle Firestore Timestamp
    if (date?.toDate) {
      date = date.toDate();
    }
    
    // Handle string dates
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    // Validate date
    if (dateObj instanceof Date && !isNaN(dateObj.getTime())) {
      return format(dateObj, 'dd/MM/yyyy HH:mm');
    }
    
    return 'N/A';
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'N/A';
  }
};


  // Calculate total cost including all charges
  const baseCost = rental.cost;
  const ongoingCharges = rental.ongoingCharges || 0;
  const additionalCharges = rental.returnCondition?.totalCharges || 0;
  const discountAmount = rental.discountAmount || 0;
  const totalCost = baseCost + ongoingCharges + additionalCharges - discountAmount;

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

        <Text style={styles.title}>RENTAL INVOICE</Text>

        {/* Invoice Details */}
        <View style={styles.section}>
          <View style={styles.row}>
            <Text style={styles.label}>Invoice Number:</Text>
            <Text style={styles.value}>AIE-{rental.id.slice(-8).toUpperCase()}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Date:</Text>
            <Text style={styles.value}>{formatDateTime(rental.startDate)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Due Date:</Text>
            <Text style={styles.value}>{formatDateTime(rental.endDate)}</Text>
          </View>
        </View>

        {/* Customer Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bill To:</Text>
          <Text>{customer.name}</Text>
          <Text>{customer.address}</Text>
          <Text>{customer.mobile}</Text>
          <Text>{customer.email}</Text>
        </View>

        {/* Vehicle Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vehicle Details:</Text>
          <Text>{vehicle.make} {vehicle.model}</Text>
          <Text>Registration: {vehicle.registrationNumber}</Text>
          <Text>Mileage: {vehicle.mileage.toLocaleString()} miles</Text>
        </View>

        {/* Rental Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Rental Details:</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Period:</Text>
            <Text style={styles.value}>
              {formatDateTime(rental.startDate)} - {formatDateTime(rental.endDate)}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Type:</Text>
            <Text style={styles.value}>{rental.type.toUpperCase()}</Text>
          </View>
        </View>

        {/* Cost Summary */}
        <View style={styles.costSummary}>
          <Text style={styles.sectionTitle}>Cost Summary</Text>
          
          <View style={styles.costRow}>
            <Text style={styles.costLabel}>Base Rental Cost:</Text>
            <Text style={styles.costValue}>£{baseCost.toFixed(2)}</Text>
          </View>

          {ongoingCharges > 0 && (
            <View style={styles.costRow}>
              <Text style={styles.costLabel}>Ongoing Charges:</Text>
              <Text style={styles.costValue}>£{ongoingCharges.toFixed(2)}</Text>
            </View>
          )}

          {rental.returnCondition && (
            <>
              {rental.returnCondition.damageCost > 0 && (
                <View style={styles.costRow}>
                  <Text style={styles.costLabel}>Damage Charges:</Text>
                  <Text style={styles.costValue}>£{rental.returnCondition.damageCost.toFixed(2)}</Text>
                </View>
              )}
              {rental.returnCondition.fuelCharge > 0 && (
                <View style={styles.costRow}>
                  <Text style={styles.costLabel}>Fuel Charges:</Text>
                  <Text style={styles.costValue}>£{rental.returnCondition.fuelCharge.toFixed(2)}</Text>
                </View>
              )}
              {rental.returnCondition.cleaningCharge > 0 && (
                <View style={styles.costRow}>
                  <Text style={styles.costLabel}>Cleaning Charges:</Text>
                  <Text style={styles.costValue}>£{rental.returnCondition.cleaningCharge.toFixed(2)}</Text>
                </View>
              )}
            </>
          )}

          {discountAmount > 0 && (
            <View style={styles.costRow}>
              <Text style={styles.costLabel}>Discount ({rental.discountPercentage}%):</Text>
              <Text style={styles.costValue}>-£{discountAmount.toFixed(2)}</Text>
            </View>
          )}

          <View style={{ ...styles.costRow, marginTop: 10, borderTop: '1 solid #000', paddingTop: 5 }}>
            <Text style={{ ...styles.costLabel, fontWeight: 'bold' }}>Total Amount:</Text>
            <Text style={styles.costValue}>£{totalCost.toFixed(2)}</Text>
          </View>
        </View>

        {/* Payment History */}
{rental.payments && rental.payments.length > 0 && (
  <View style={styles.paymentHistory}>
    <Text style={styles.sectionTitle}>Payment History</Text>
    {rental.payments.map((payment, index) => (
      <View key={index} style={styles.paymentRow}>
        <View>
          <Text>{formatDateTime(payment.date)}</Text>
          <Text style={styles.costLabel}>
            {payment.method.replace('_', ' ').toUpperCase()}
            {payment.reference && ` (Ref: ${payment.reference})`}
          </Text>
        </View>
        <Text>£{payment.amount.toFixed(2)}</Text>
      </View>
    ))}
    <View style={{ ...styles.costRow, marginTop: 10, borderTop: '1 solid #000', paddingTop: 5 }}>
      <Text style={styles.costLabel}>Amount Paid:</Text>
      <Text style={styles.costValue}>£{rental.paidAmount.toFixed(2)}</Text>
    </View>
    {rental.remainingAmount > 0 && (
      <View style={styles.costRow}>
        <Text style={styles.costLabel}>Remaining Amount:</Text>
        <Text style={styles.costValue}>£{rental.remainingAmount.toFixed(2)}</Text>
      </View>
    )}
  </View>
)}


        {/* Payment Instructions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Details:</Text>
          <Text>Bank: {companyDetails.bankName}</Text>
          <Text>Sort Code: {companyDetails.sortCode}</Text>
          <Text>Account Number: {companyDetails.accountNumber}</Text>
          <Text>Reference: AIE-{rental.id.slice(-8).toUpperCase()}</Text>
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
