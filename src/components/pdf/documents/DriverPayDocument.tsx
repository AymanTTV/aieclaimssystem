import React from 'react';
import { Text, View, Image } from '@react-pdf/renderer';
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
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Driver Information</Text>
      <View style={styles.infoCard}>
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
          <Text style={styles.value}>
            {data.collection === 'OTHER' ? data.customCollection : data.collection}
          </Text>
        </View>
      </View>
    </View>

    {/* Payment Periods */}
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Payment Periods</Text>
      {data.paymentPeriods.map((period, index) => (
        <View key={index} style={[styles.card, { marginBottom: 15 }]}>
          <Text style={styles.cardTitle}>Period {index + 1}</Text>
          
          {/* Period Dates */}
          <View style={styles.row}>
            <Text style={styles.label}>Start Date:</Text>
            <Text style={styles.value}>{formatDate(period.startDate)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>End Date:</Text>
            <Text style={styles.value}>{formatDate(period.endDate)}</Text>
          </View>

          {/* Financial Details */}
          <View style={styles.separator} />
          <View style={styles.row}>
            <Text style={styles.label}>Total Amount:</Text>
            <Text style={styles.value}>£{period.totalAmount.toFixed(2)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Commission ({period.commissionPercentage}%):</Text>
            <Text style={styles.value}>£{period.commissionAmount.toFixed(2)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Net Pay:</Text>
            <Text style={[styles.value, { color: '#059669' }]}>£{period.netPay.toFixed(2)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Paid Amount:</Text>
            <Text style={[styles.value, { color: '#059669' }]}>£{period.paidAmount.toFixed(2)}</Text>
          </View>
          {period.remainingAmount > 0 && (
            <View style={styles.row}>
              <Text style={styles.label}>Remaining Amount:</Text>
              <Text style={[styles.value, { color: '#DC2626' }]}>£{period.remainingAmount.toFixed(2)}</Text>
            </View>
          )}
          <View style={styles.row}>
            <Text style={styles.label}>Status:</Text>
            <Text style={styles.value}>{period.status}</Text>
          </View>

          {/* Period Notes */}
          {period.notes && (
            <View style={[styles.card, { marginTop: 10, backgroundColor: '#F3F4F6' }]}>
              <Text style={styles.label}>Notes:</Text>
              <Text style={styles.value}>{period.notes}</Text>
            </View>
          )}

          {/* Payment History */}
          {period.payments && period.payments.length > 0 && (
            <View style={[styles.card, { marginTop: 10 }]}>
              <Text style={styles.cardTitle}>Payment History</Text>
              {period.payments.map((payment, pIndex) => (
                <View key={pIndex} style={[styles.row, pIndex > 0 && styles.separator]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.value}>£{payment.amount.toFixed(2)}</Text>
                    <Text style={{ fontSize: 8, color: '#6B7280' }}>
                      {payment.method.replace('_', ' ')} {payment.reference && `(Ref: ${payment.reference})`}
                    </Text>
                    {payment.notes && (
                      <Text style={{ fontSize: 8, color: '#6B7280', marginTop: 2 }}>
                        {payment.notes}
                      </Text>
                    )}
                  </View>
                  <Text style={{ fontSize: 8, color: '#6B7280' }}>
                    {formatDate(payment.date)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      ))}
    </View>

    {/* Summary */}
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Payment Summary</Text>
      <View style={[styles.card, { backgroundColor: '#F9FAFB' }]}>
        <View style={styles.row}>
          <Text style={styles.label}>Total Periods:</Text>
          <Text style={styles.value}>{data.paymentPeriods.length}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Total Amount:</Text>
          <Text style={styles.value}>
            £{data.paymentPeriods.reduce((sum, p) => sum + p.totalAmount, 0).toFixed(2)}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Total Commission:</Text>
          <Text style={styles.value}>
            £{data.paymentPeriods.reduce((sum, p) => sum + p.commissionAmount, 0).toFixed(2)}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Total Net Pay:</Text>
          <Text style={[styles.value, { color: '#059669' }]}>
            £{data.paymentPeriods.reduce((sum, p) => sum + p.netPay, 0).toFixed(2)}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Total Paid:</Text>
          <Text style={[styles.value, { color: '#059669' }]}>
            £{data.paymentPeriods.reduce((sum, p) => sum + p.paidAmount, 0).toFixed(2)}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Total Remaining:</Text>
          <Text style={[styles.value, { color: '#DC2626' }]}>
            £{data.paymentPeriods.reduce((sum, p) => sum + p.remainingAmount, 0).toFixed(2)}
          </Text>
        </View>
      </View>
    </View>

    {/* Terms and Conditions */}
    {companyDetails.driverPayTerms && (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Terms & Conditions</Text>
        <Text style={styles.text}>{companyDetails.driverPayTerms}</Text>
      </View>
    )}

    {/* Record Information */}
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Record Information</Text>
      <View style={styles.infoCard}>
        <View style={styles.row}>
          <Text style={styles.label}>Created At:</Text>
          <Text style={styles.value}>{formatDate(data.createdAt)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Last Updated:</Text>
          <Text style={styles.value}>{formatDate(data.updatedAt)}</Text>
        </View>
      </View>
    </View>
  </BaseDocument>
);

export default DriverPayDocument;