import React from 'react';
import { Text, View } from '@react-pdf/renderer';
import { DriverPay } from '../../../types/driverPay';
import BaseDocument from '../BaseDocument';
import { formatDate } from '../../../utils/dateHelpers';
import { styles } from '../styles';

interface DriverPayDocumentProps {
  data: DriverPay;
  companyDetails: any;
}

const DriverPayDocument: React.FC<DriverPayDocumentProps> = ({ data, companyDetails }) => (
  <BaseDocument title="Driver Pay Record" companyDetails={companyDetails}>
    
    {/* Driver Information */}
    <View style={styles.sectionBreak} wrap={false}>
      <View style={styles.infoCard}>
        <Text style={styles.infoCardTitle}>Driver Information</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Driver No:</Text>
          <Text style={styles.value}>{data.driverNo}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>TID No:</Text>
          <Text style={styles.value}>{data.tidNo}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Name:</Text>
          <Text style={styles.value}>{data.name}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Phone Number:</Text>
          <Text style={styles.value}>{data.phoneNumber}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Collection Point:</Text>
          <Text style={styles.value}>{data.collection === 'OTHER' ? data.customCollection : data.collection}</Text>
        </View>
      </View>
    </View>

    {/* Payment Periods */}
    <View style={styles.sectionBreak} wrap={false}>
      <Text style={styles.sectionTitle}>Payment Periods</Text>
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableCell, { flex: 1 }]}>Period</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>Start Date</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>End Date</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>Total</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>Commission (%)</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>Net Pay</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>Paid</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>Status</Text>
        </View>
        {data.paymentPeriods.map((period, index) => (
          <View key={index} style={styles.tableRow}>
            <Text style={[styles.tableCell, { flex: 1 }]}>#{index + 1}</Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>{formatDate(period.startDate)}</Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>{formatDate(period.endDate)}</Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>£{period.totalAmount.toFixed(2)}</Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>{period.commissionPercentage}%</Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>£{period.netPay.toFixed(2)}</Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>£{period.paidAmount.toFixed(2)}</Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>{period.status}</Text>
          </View>
        ))}
      </View>
    </View>

    {/* Payment History for each Period */}
    {data.paymentPeriods.map((period, index) => (
      period.payments && period.payments.length > 0 && (
        <View key={`payments-${index}`} style={styles.sectionBreak} wrap={false}>
          <Text style={styles.sectionTitle}>Payment History - Period {index + 1}</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCell, { flex: 1 }]}>Date</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>Amount</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>Method</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>Reference</Text>
            </View>
            {period.payments.map((payment, pIndex) => (
              <View key={pIndex} style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 1 }]}>{formatDate(payment.date)}</Text>
                <Text style={[styles.tableCell, { flex: 1 }]}>£{payment.amount.toFixed(2)}</Text>
                <Text style={[styles.tableCell, { flex: 1 }]}>{payment.method.replace('_', ' ')}</Text>
                <Text style={[styles.tableCell, { flex: 1 }]}>{payment.reference || '-'}</Text>
              </View>
            ))}
          </View>
        </View>
      )
    ))}

    {/* Payment Summary */}
<View style={styles.sectionBreak} wrap={false}>
  <Text style={styles.sectionTitle}>Payment Summary</Text>
  <View style={styles.table}>
    {/* Table Header */}
    <View style={styles.tableHeader}>
      <Text style={[styles.tableCell, { flex: 1 }]}>Total Periods</Text>
      <Text style={[styles.tableCell, { flex: 1 }]}>Total Amount</Text>
      <Text style={[styles.tableCell, { flex: 1 }]}>Total Commission</Text>
      <Text style={[styles.tableCell, { flex: 1 }]}>Total Net Pay</Text>
      <Text style={[styles.tableCell, { flex: 1 }]}>Total Paid</Text>
      <Text style={[styles.tableCell, { flex: 1 }]}>Total Remaining</Text>
    </View>
    {/* Table Row */}
    <View style={styles.tableRow}>
      <Text style={[styles.tableCell, { flex: 1 }]}>{data.paymentPeriods.length}</Text>
      <Text style={[styles.tableCell, { flex: 1 }]}>
        £{data.paymentPeriods.reduce((sum, p) => sum + p.totalAmount, 0).toFixed(2)}
      </Text>
      <Text style={[styles.tableCell, { flex: 1 }]}>
        £{data.paymentPeriods.reduce((sum, p) => sum + p.commissionAmount, 0).toFixed(2)}
      </Text>
      <Text style={[styles.tableCell, { flex: 1, color: '#059669' }]}>
        £{data.paymentPeriods.reduce((sum, p) => sum + p.netPay, 0).toFixed(2)}
      </Text>
      <Text style={[styles.tableCell, { flex: 1, color: '#059669' }]}>
        £{data.paymentPeriods.reduce((sum, p) => sum + p.paidAmount, 0).toFixed(2)}
      </Text>
      <Text style={[styles.tableCell, { flex: 1, color: '#DC2626' }]}>
        £{data.paymentPeriods.reduce((sum, p) => sum + p.remainingAmount, 0).toFixed(2)}
      </Text>
    </View>
  </View>
</View>




    {/* Terms and Conditions */}
    {companyDetails.driverPayTerms && (
      <View style={styles.sectionBreak} wrap={false}>
        <Text style={styles.sectionTitle}>Terms & Conditions</Text>
        <Text style={styles.text}>{companyDetails.driverPayTerms}</Text>
      </View>
    )}
  </BaseDocument>
);

export default DriverPayDocument;
