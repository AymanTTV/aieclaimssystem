import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { Transaction } from '../../../types';
import { format } from 'date-fns';
import BaseDocument from '../BaseDocument';

// Update the props interface to handle both single transaction and summary reports
interface FinanceDocumentProps {
  data: Transaction | { transactions: Transaction[]; summary: { totalIncome: number; totalExpenses: number; netIncome: number; profitMargin: number; }};
  companyDetails: any;
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 20,
  },
  summaryCard: {
    backgroundColor: '#F3F4F6',
    padding: 10,
    marginBottom: 20,
    borderRadius: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  label: {
    color: '#4B5563',
  },
  value: {
    fontWeight: 'bold',
  },
  table: {
    width: '100%',
    marginTop: 20,
  },
  tableHeader: {
    backgroundColor: '#F3F4F6',
    flexDirection: 'row',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    marginBottom: 8,
  },
  tableRow: {
    flexDirection: 'row',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  colDate: { width: '15%' },
  colType: { width: '12%' },
  colCategory: { width: '20%' },
  colCustomer: { width: '20%' },
  colVehicle: { width: '20%' },
  colAmount: { width: '13%', textAlign: 'right' },
  subText: {
    fontSize: 8,
    color: '#6B7280',
  },
  infoCard: {
    backgroundColor: '#F3F4F6',
    padding: 10,
    marginBottom: 10,
    borderRadius: 4,
  },
  text: {
    fontSize: 10,
    marginBottom: 5,
  },
});

const FinanceDocument: React.FC<FinanceDocumentProps> = ({ data, companyDetails }) => {
  // Check if data is a single transaction or a summary report
  const isSingleTransaction = !('transactions' in data);

  if (isSingleTransaction) {
    const transaction = data as Transaction;
    return (
      <BaseDocument title={`${transaction.type === 'income' ? 'Income' : 'Expense'} Record`} companyDetails={companyDetails}>
        {/* Transaction Details */}
        <View style={styles.section}>
          <Text style={styles.label}>Transaction Details</Text>
          <View style={styles.infoCard}>
            <View style={styles.row}>
              <Text style={styles.label}>Type:</Text>
              <Text style={styles.value}>{transaction.type === 'income' ? 'Income' : 'Expense'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Category:</Text>
              <Text style={styles.value}>{transaction.category}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Date:</Text>
              <Text style={styles.value}>{format(transaction.date, 'dd/MM/yyyy')}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Description:</Text>
              <Text style={styles.value}>{transaction.description}</Text>
            </View>
          </View>
        </View>

        {/* Financial Details */}
        <View style={styles.section}>
          <Text style={styles.label}>Financial Details</Text>
          <View style={styles.infoCard}>
            <View style={styles.row}>
              <Text style={styles.label}>Amount:</Text>
              <Text style={[styles.value, { color: transaction.type === 'income' ? '#059669' : '#DC2626' }]}>
                £{transaction.amount.toFixed(2)}
              </Text>
            </View>
            {transaction.paymentMethod && (
              <View style={styles.row}>
                <Text style={styles.label}>Payment Method:</Text>
                <Text style={styles.value}>{transaction.paymentMethod.replace('_', ' ')}</Text>
              </View>
            )}
            {transaction.paymentReference && (
              <View style={styles.row}>
                <Text style={styles.label}>Reference:</Text>
                <Text style={styles.value}>{transaction.paymentReference}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Vehicle Information */}
        {transaction.vehicleName && (
          <View style={styles.section}>
            <Text style={styles.label}>Vehicle Details</Text>
            <View style={styles.infoCard}>
              <View style={styles.row}>
                <Text style={styles.label}>Vehicle:</Text>
                <Text style={styles.value}>{transaction.vehicleName}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Audit Information */}
        <View style={styles.section}>
          <Text style={styles.label}>Audit Information</Text>
          <View style={styles.infoCard}>
            <View style={styles.row}>
              <Text style={styles.label}>Created At:</Text>
              <Text style={styles.value}>{format(transaction.createdAt, 'dd/MM/yyyy')}</Text>
            </View>
          </View>
        </View>
      </BaseDocument>
    );
  }

  // Summary Report
  const summary = data.summary;
  return (
    <BaseDocument title="Financial Report" companyDetails={companyDetails}>
      {/* Summary Section */}
      <View style={styles.summaryCard}>
        <View style={styles.row}>
          <Text style={styles.label}>Total Income:</Text>
          <Text style={styles.value}>£{summary.totalIncome.toFixed(2)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Total Expenses:</Text>
          <Text style={styles.value}>£{summary.totalExpenses.toFixed(2)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Net Income:</Text>
          <Text style={styles.value}>£{summary.netIncome.toFixed(2)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Profit Margin:</Text>
          <Text style={styles.value}>{summary.profitMargin.toFixed(1)}%</Text>
        </View>
      </View>

      {/* Transactions Table */}
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={styles.colDate}>Date</Text>
          <Text style={styles.colType}>Type</Text>
          <Text style={styles.colCategory}>Category</Text>
          <Text style={styles.colCustomer}>Customer</Text>
          <Text style={styles.colVehicle}>Vehicle</Text>
          <Text style={styles.colAmount}>Amount</Text>
        </View>

        {data.transactions.map((transaction, index) => (
          <View key={index} style={styles.tableRow}>
            <Text style={styles.colDate}>
              {format(transaction.date, 'dd/MM/yyyy')}
            </Text>
            <Text style={styles.colType}>
              {transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
            </Text>
            <Text style={styles.colCategory}>
              {transaction.category}
            </Text>
            <View style={styles.colCustomer}>
              <Text>{transaction.customerName || '-'}</Text>
            </View>
            <Text style={styles.colVehicle}>
              {transaction.vehicleName || '-'}
            </Text>
            <Text style={styles.colAmount}>
              £{transaction.amount.toFixed(2)}
            </Text>
          </View>
        ))}
      </View>
    </BaseDocument>
  );
};

export default FinanceDocument;