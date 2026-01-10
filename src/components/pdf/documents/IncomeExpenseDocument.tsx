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
    
    {/* Top Section: Record Info & Customer Info Side-by-Side */}
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
      
      {/* Left: Record Details */}
      <View style={[styles.card, { width: '48%', height: '100%' }]} wrap={false}>
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
          <Text style={styles.label}>Reference:</Text>
          <Text style={styles.value}>{data.reference || '—'}</Text>
        </View>

        <View style={styles.flexRow}>
          <Text style={styles.label}>Category:</Text>
          <Text style={styles.value}>{data.category || '—'}</Text>
        </View>

        <View style={styles.flexRow}>
          <Text style={styles.label}>Status:</Text>
          <Text style={styles.value}>{data.status || '—'}</Text>
        </View>
      </View>

      {/* Right: Customer Details */}
      <View style={[styles.card, { width: '48%', height: '100%' }]} wrap={false}>
        <Text style={styles.sectionTitle}>Customer / Payee</Text>
        
        <View style={styles.flexRow}>
          <Text style={styles.label}>Name:</Text>
          <Text style={styles.value}>{data.customer || '—'}</Text>
        </View>

        {data.customerPhone && (
          <View style={styles.flexRow}>
            <Text style={styles.label}>Phone:</Text>
            <Text style={styles.value}>{data.customerPhone}</Text>
          </View>
        )}

        {data.customerEmail && (
          <View style={styles.flexRow}>
            <Text style={styles.label}>Email:</Text>
            <Text style={styles.value}>{data.customerEmail}</Text>
          </View>
        )}

        {data.customerAddress && (
          <View style={{ marginTop: 4 }}>
            <Text style={styles.label}>Address:</Text>
            <Text style={styles.value}>{data.customerAddress}</Text>
          </View>
        )}
      </View>
    </View>

    {/* Note Section if exists */}
    {data.note && (
      <View style={[styles.card, { marginBottom: 16, padding: 8, backgroundColor: '#F9FAFB' }]} wrap={false}>
        <Text style={[styles.label, { marginBottom: 2 }]}>Note:</Text>
        <Text style={styles.value}>{data.note}</Text>
      </View>
    )}

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
          <Text style={styles.label}>Unit Price:</Text>
          <Text style={styles.value}>{fmt(Number(data.unit))}</Text>
        </View>

        <View style={styles.flexRow}>
          <Text style={styles.label}>Net:</Text>
          <Text style={styles.value}>{fmt(data.net)}</Text>
        </View>

        <View style={styles.flexRow}>
          <Text style={styles.label}>VAT:</Text>
          <Text style={styles.value}>{data.vat ? '20%' : '0%'}</Text>
        </View>

        {/* --- NEW COMMISSION ROW --- */}
        {data.commissionAmount ? (
            <View style={styles.flexRow}>
              <Text style={styles.label}>Commission ({data.commissionPct}%):</Text>
              <Text style={[styles.value, { color: '#DC2626' }]}>- {fmt(data.commissionAmount)}</Text>
            </View>
        ) : null}
        {/* -------------------------- */}

        <View style={[styles.flexRow, { marginTop: 8, borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 4 }]}>
          <Text style={styles.label}>Total:</Text>
          <Text style={[styles.value, { fontWeight: 'bold', fontSize: 12 }]}>
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
            <Text style={[styles.tableHeaderCell, { width: '30%' }]}>Desc</Text>
            <Text style={styles.tableHeaderCell}>Qty</Text>
            <Text style={styles.tableHeaderCell}>Unit</Text>
            <Text style={styles.tableHeaderCell}>VAT</Text>
            <Text style={styles.tableHeaderCell}>Line</Text>
          </View>
          {data.items?.map((item, i) => (
            <View key={i} style={styles.tableRow}>
              <Text style={styles.tableCell}>{item.type}</Text>
              <Text style={[styles.tableCell, { width: '30%' }]}>{item.description}</Text>
              <Text style={styles.tableCell}>{item.quantity}</Text>
              <Text style={styles.tableCell}>{fmt(item.unitPrice)}</Text>
              <Text style={styles.tableCell}>{item.vat ? 'Yes' : 'No'}</Text>
              <Text style={styles.tableCell}>
                 {fmt(item.quantity * item.unitPrice * (item.vat ? 1.2 : 1))}
              </Text>
            </View>
          ))}
        </View>

        <View style={[styles.flexRow, { marginTop: 8, justifyContent: 'flex-end' }]}>
          <Text style={[styles.value, { fontWeight: 'bold', fontSize: 12 }]}>
            Total Cost: {fmt(data.total)}
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