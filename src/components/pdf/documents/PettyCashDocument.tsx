import React from 'react';
import { Text, View } from '@react-pdf/renderer';
import { PettyCashTransaction } from '../../../types/pettyCash';
import BaseDocument from '../BaseDocument';
import { formatDate } from '../../../utils/dateHelpers';
import { styles } from '../styles';

interface PettyCashDocumentProps {
  data: PettyCashTransaction;
  companyDetails: any;
}

const PettyCashDocument: React.FC<PettyCashDocumentProps> = ({ data, companyDetails }) => (
  <BaseDocument title="Petty Cash Record" companyDetails={companyDetails}>
    
    {/* Transaction Details in Card */}
    <View style={styles.sectionBreak} wrap={false}>
      <View style={styles.infoCard}>
        <Text style={styles.infoCardTitle}>Transaction Details</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Name:</Text>
          <Text style={styles.value}>{data.name}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Telephone:</Text>
          <Text style={styles.value}>{data.telephone}</Text>
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

    {/* Financial Details - Clean Table */}
    <View style={styles.sectionBreak} wrap={false}>
      <Text style={styles.sectionTitle}>Financial Details</Text>
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableCell, { flex: 1 }]}>Amount In</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>Balance</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>Status</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={[styles.tableCell, { flex: 1, color: '#059669' }]}>
            £{Number(data.amountIn || 0).toFixed(2)}
          </Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>
            £{Number(data.balance || 0).toFixed(2)}
          </Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>{data.status}</Text>
        </View>
      </View>
    </View>

    {/* Additional Notes */}
    {data.note && (
      <View style={styles.sectionBreak} wrap={false}>
        <Text style={styles.sectionTitle}>Additional Notes</Text>
        <Text style={styles.text}>{data.note}</Text>
      </View>
    )}

    {/* Audit Information - Clean Table */}
    <View style={styles.sectionBreak} wrap={false}>
      <Text style={styles.sectionTitle}>Audit Information</Text>
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableCell, { flex: 1 }]}>Created At</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>Last Updated</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={[styles.tableCell, { flex: 1 }]}>{formatDate(data.createdAt)}</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>{formatDate(data.updatedAt)}</Text>
        </View>
      </View>
    </View>

    {/* Terms and Conditions */}
    {companyDetails.pettyCashTerms && (
      <View style={styles.sectionBreak} wrap={false}>
        <Text style={styles.sectionTitle}>Terms & Conditions</Text>
        <Text style={styles.text}>{companyDetails.pettyCashTerms}</Text>
      </View>
    )}
  </BaseDocument>
);

export default PettyCashDocument;
