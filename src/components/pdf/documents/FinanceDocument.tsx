import React from 'react';
import { Text, View } from '@react-pdf/renderer';
import { Transaction } from '../../../types';
import BaseDocument from '../BaseDocument';
import { formatDate } from '../../../utils/dateHelpers';
import { styles } from '../styles';

interface FinanceDocumentProps {
  data: Transaction;
  companyDetails: any;
}

const FinanceDocument: React.FC<FinanceDocumentProps> = ({ data, companyDetails }) => (
  <BaseDocument title={`${data.type === 'income' ? 'Income' : 'Expense'} Record`} companyDetails={companyDetails}>
    {/* Transaction Details */}
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Transaction Details</Text>
      <View style={styles.infoCard}>
        <View style={styles.row}>
          <Text style={styles.label}>Type:</Text>
          <Text style={styles.value}>{data.type === 'income' ? 'Income' : 'Expense'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Category:</Text>
          <Text style={styles.value}>{data.category}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Date:</Text>
          <Text style={styles.value}>{formatDate(data.date)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Description:</Text>
          <Text style={styles.value}>{data.description}</Text>
        </View>
      </View>
    </View>

    {/* Financial Details */}
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Financial Details</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.label}>Amount:</Text>
          <Text style={[styles.value, { color: data.type === 'income' ? '#059669' : '#DC2626' }]}>
            £{data.amount.toFixed(2)}
          </Text>
        </View>
        {data.paymentMethod && (
          <View style={styles.row}>
            <Text style={styles.label}>Payment Method:</Text>
            <Text style={styles.value}>{data.paymentMethod.replace('_', ' ')}</Text>
          </View>
        )}
        {data.paymentReference && (
          <View style={styles.row}>
            <Text style={styles.label}>Reference:</Text>
            <Text style={styles.value}>{data.paymentReference}</Text>
          </View>
        )}
        <View style={styles.row}>
          <Text style={styles.label}>Status:</Text>
          <Text style={styles.value}>{data.paymentStatus}</Text>
        </View>
      </View>
    </View>

    {/* Vehicle Information */}
    {data.vehicleId && (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Vehicle Details</Text>
        <View style={styles.infoCard}>
          {data.vehicleName && (
            <View style={styles.row}>
              <Text style={styles.label}>Vehicle:</Text>
              <Text style={styles.value}>{data.vehicleName}</Text>
            </View>
          )}
          {data.vehicleOwner && (
            <View style={styles.row}>
              <Text style={styles.label}>Owner:</Text>
              <Text style={styles.value}>{data.vehicleOwner.name}</Text>
            </View>
          )}
        </View>
      </View>
    )}

    {/* Audit Information */}
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Audit Information</Text>
      <View style={styles.infoCard}>
        <View style={styles.row}>
          <Text style={styles.label}>Created At:</Text>
          <Text style={styles.value}>{formatDate(data.createdAt)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Status:</Text>
          <Text style={styles.value}>{data.status || 'completed'}</Text>
        </View>
      </View>
    </View>

    {/* Terms and Conditions */}
    {companyDetails.financeTerms && (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Terms & Conditions</Text>
        <Text style={styles.text}>{companyDetails.financeTerms}</Text>
      </View>
    )}
  </BaseDocument>
);

export default FinanceDocument;