// src/components/pdf/documents/IncomeExpenseDocument.tsx

import React from 'react';
import { Text, View } from '@react-pdf/renderer';
import { IncomeExpenseEntry } from '../../../types/incomeExpense';
import BaseDocument from '../BaseDocument';
import { format } from 'date-fns';
import { styles } from '../styles';

interface Props {
  data: IncomeExpenseEntry;
  companyDetails: any;
}

const fmt = (n?: number) => `£${n?.toFixed(2) || '0.00'}`;
const formatDate = (iso?: string) =>
  iso ? format(new Date(iso), 'dd/MM/yyyy') : '—';

const IncomeExpenseDocument: React.FC<Props> = ({ data, companyDetails }) => (
  <BaseDocument title="Income / Expense Record" companyDetails={companyDetails}>
    {/* Info Card */}
    <View style={[styles.card, { marginBottom: 16 }]} wrap={false}>
      <Text style={styles.sectionTitle}>Record Information</Text>

      <View style={styles.flexRow}>
        <Text style={styles.label}>Type:</Text>
        <Text style={styles.value}>{data.type?.toUpperCase()}</Text>
      </View>

      <View style={styles.flexRow}>
        <Text style={styles.label}>Date:</Text>
        <Text style={styles.value}>{formatDate(data.date)}</Text>
      </View>

      <View style={styles.flexRow}>
        <Text style={styles.label}>Customer:</Text>
        <Text style={styles.value}>{data.customer || '—'}</Text>
      </View>

      <View style={styles.flexRow}>
        <Text style={styles.label}>Reference:</Text>
        <Text style={styles.value}>{data.reference || '—'}</Text>
      </View>

      <View style={styles.flexRow}>
        <Text style={styles.label}>Status:</Text>
        <Text style={styles.value}>{data.status || '—'}</Text>
      </View>

      {data.note && (
        <View style={styles.flexRow}>
          <Text style={styles.label}>Note:</Text>
          <Text style={styles.value}>{data.note}</Text>
        </View>
      )}
    </View>

    {/* Income Block */}
    {data.type === 'income' && (
      <View style={styles.card} wrap={false}>
        <Text style={styles.sectionTitle}>Income Breakdown</Text>

        <View style={styles.flexRow}>
          <Text style={styles.label}>Description:</Text>
          <Text style={styles.value}>{data.description || '—'}</Text>
        </View>

        <View style={styles.flexRow}>
          <Text style={styles.label}>Quantity:</Text>
          <Text style={styles.value}>{data.quantity}</Text>
        </View>

        <View style={styles.flexRow}>
          <Text style={styles.label}>Unit:</Text>
          <Text style={styles.value}>{data.unit}</Text>
        </View>

        <View style={styles.flexRow}>
          <Text style={styles.label}>Net:</Text>
          <Text style={styles.value}>{fmt(data.net)}</Text>
        </View>

        <View style={styles.flexRow}>
          <Text style={styles.label}>VAT:</Text>
          <Text style={styles.value}>{data.vat ? '20%' : '0%'}</Text>
        </View>

        <View style={styles.flexRow}>
          <Text style={styles.label}>Total:</Text>
          <Text style={[styles.value, { fontWeight: 'bold' }]}>
            {fmt(data.total)}
          </Text>
        </View>
      </View>
    )}

    {/* Expense Block */}
    {data.type === 'expense' && (
      <View style={styles.card} wrap={false}>
        <Text style={styles.sectionTitle}>Expense Items</Text>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.tableHeaderCell}>Type</Text>
            <Text style={styles.tableHeaderCell}>Desc</Text>
            <Text style={styles.tableHeaderCell}>Qty</Text>
            <Text style={styles.tableHeaderCell}>Unit</Text>
            <Text style={styles.tableHeaderCell}>VAT</Text>
          </View>
          {data.items?.map((item, i) => (
            <View key={i} style={styles.tableRow}>
              <Text style={styles.tableCell}>{item.type}</Text>
              <Text style={styles.tableCell}>{item.description}</Text>
              <Text style={styles.tableCell}>{item.quantity}</Text>
              <Text style={styles.tableCell}>{fmt(item.unitPrice)}</Text>
              <Text style={styles.tableCell}>{item.vat ? 'Yes' : 'No'}</Text>
            </View>
          ))}
        </View>

        <View style={[styles.flexRow, { marginTop: 8 }]}>
          <Text style={styles.label}>Total Cost:</Text>
          <Text style={[styles.value, { fontWeight: 'bold' }]}>
            {fmt(data.total)}
          </Text>
        </View>
      </View>
    )}

    {/* Terms & Conditions (Optional) */}
    {companyDetails?.incomeExpenseTerms && (
      <View style={styles.sectionBreak} wrap={false}>
        <Text style={styles.sectionTitle}>Terms & Conditions</Text>
        <Text style={styles.text}>{companyDetails.incomeExpenseTerms}</Text>
      </View>
    )}
  </BaseDocument>
);

export default IncomeExpenseDocument;
