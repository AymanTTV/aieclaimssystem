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
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Transaction Details</Text>
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

    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Financial Details</Text>
      {data.amountIn > 0 && (
        <View style={styles.row}>
          <Text style={styles.label}>Amount In:</Text>
          <Text style={styles.value}>£{Number(data.amountIn).toFixed(2)}</Text>
        </View>
      )}
      {data.amountOut > 0 && (
        <View style={styles.row}>
          <Text style={styles.label}>Amount Out:</Text>
          <Text style={styles.value}>£{Number(data.amountOut).toFixed(2)}</Text>
        </View>
      )}
      <View style={styles.row}>
        <Text style={styles.label}>Balance:</Text>
        <Text style={styles.value}>£{Number(data.balance || 0).toFixed(2)}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Status:</Text>
        <Text style={styles.value}>{data.status}</Text>
      </View>
    </View>

    {data.note && (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Additional Notes</Text>
        <Text style={styles.value}>{data.note}</Text>
      </View>
    )}

    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Audit Information</Text>
      <View style={styles.row}>
        <Text style={styles.label}>Created At:</Text>
        <Text style={styles.value}>{formatDate(data.createdAt)}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Last Updated:</Text>
        <Text style={styles.value}>{formatDate(data.updatedAt)}</Text>
      </View>
    </View>

    {companyDetails.pettyCashTerms && (
      <View style={styles.terms}>
        <Text>{companyDetails.pettyCashTerms}</Text>
      </View>
    )}
  </BaseDocument>
);

export default PettyCashDocument;