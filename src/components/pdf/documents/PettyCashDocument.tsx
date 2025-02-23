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
    {/* Transaction Information */}
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Transaction Details</Text>
      <View style={styles.infoCard}>
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

    {/* Financial Details */}
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Financial Details</Text>
      <View style={styles.card}>
        {data.amountIn > 0 && (
          <View style={styles.row}>
            <Text style={styles.label}>Amount In:</Text>
            <Text style={[styles.value, { color: '#059669' }]}>
              £{Number(data.amountIn).toFixed(2)}
            </Text>
          </View>
        )}
        {data.amountOut > 0 && (
          <View style={styles.row}>
            <Text style={styles.label}>Amount Out:</Text>
            <Text style={[styles.value, { color: '#DC2626' }]}>
              £{Number(data.amountOut).toFixed(2)}
            </Text>
          </View>
        )}
        <View style={styles.row}>
          <Text style={styles.label}>Balance:</Text>
          <Text style={[
            styles.value,
            { color: Number(data.balance) >= 0 ? '#059669' : '#DC2626' }
          ]}>
            £{Number(data.balance || 0).toFixed(2)}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Status:</Text>
          <Text style={[
            styles.value,
            {
              color: data.status === 'paid' ? '#059669' :
                     data.status === 'pending' ? '#D97706' : '#DC2626'
            }
          ]}>
            {data.status}
          </Text>
        </View>
      </View>
    </View>

    {/* Additional Notes */}
    {data.note && (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Additional Notes</Text>
        <View style={styles.infoCard}>
          <Text style={styles.text}>{data.note}</Text>
        </View>
      </View>
    )}

    {/* Terms and Conditions */}
    {companyDetails.pettyCashTerms && (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Terms & Conditions</Text>
        <Text style={styles.text}>{companyDetails.pettyCashTerms}</Text>
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

    {/* Signature Section */}
    <View style={styles.signatureSection}>
      {companyDetails.signature && (
        <View style={styles.signatureBox}>
          <Image src={companyDetails.signature} style={styles.signature} />
          <Text style={styles.signatureLine}>For and on behalf of {companyDetails.fullName}</Text>
          <Text>Date: {formatDate(new Date())}</Text>
        </View>
      )}
    </View>
  </BaseDocument>
);

export default PettyCashDocument;