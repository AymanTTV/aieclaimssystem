import React from 'react';
import { Text, View } from '@react-pdf/renderer';
import { VATRecord } from '../../../types/vatRecord';
import BaseDocument from '../BaseDocument';
import { formatDate } from '../../../utils/dateHelpers';
import { styles } from '../styles';

interface VATRecordDocumentProps {
  data: VATRecord;
  companyDetails: any;
}

const VATRecordDocument: React.FC<VATRecordDocumentProps> = ({ data, companyDetails }) => (
  <BaseDocument title="VAT Record" companyDetails={companyDetails}>
    {/* Record Details */}
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Record Details</Text>
      <View style={styles.infoCard}>
        <View style={styles.row}>
          <Text style={styles.label}>Receipt No:</Text>
          <Text style={styles.value}>{data.receiptNo}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Accountant:</Text>
          <Text style={styles.value}>{data.accountant}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Supplier:</Text>
          <Text style={styles.value}>{data.supplier}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>REG No:</Text>
          <Text style={styles.value}>{data.regNo}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Date:</Text>
          <Text style={styles.value}>{formatDate(data.date)}</Text>
        </View>
      </View>
    </View>

    {/* Financial Details */}
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Financial Details</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.label}>NET Amount:</Text>
          <Text style={[styles.value, { color: '#059669' }]}>£{data.net.toFixed(2)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>VAT Rate:</Text>
          <Text style={styles.value}>{data.vatPercentage}%</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>VAT Amount:</Text>
          <Text style={[styles.value, { color: '#3B82F6' }]}>£{data.vat.toFixed(2)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>GROSS Amount:</Text>
          <Text style={[styles.value, { fontWeight: 'bold' }]}>£{data.gross.toFixed(2)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>VAT Received:</Text>
          <Text style={[styles.value, { color: '#8B5CF6' }]}>£{data.vatReceived.toFixed(2)}</Text>
        </View>
      </View>
    </View>

    {/* Customer Information */}
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Customer Information</Text>
      <View style={styles.infoCard}>
        <View style={styles.row}>
          <Text style={styles.label}>Customer Name:</Text>
          <Text style={styles.value}>{data.customerName}</Text>
        </View>
        {data.customerId && (
          <View style={styles.row}>
            <Text style={styles.label}>Customer ID:</Text>
            <Text style={styles.value}>{data.customerId}</Text>
          </View>
        )}
      </View>
    </View>

    {/* Description */}
    {data.description && (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Description</Text>
        <View style={styles.card}>
          <Text style={styles.text}>{data.description}</Text>
        </View>
      </View>
    )}

    {/* Additional Notes */}
    {data.notes && (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Additional Notes</Text>
        <View style={styles.infoCard}>
          <Text style={styles.text}>{data.notes}</Text>
        </View>
      </View>
    )}

    {/* Status Information */}
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Status Information</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.label}>Status:</Text>
          <Text style={[
            styles.value,
            {
              color: data.status === 'paid' ? '#059669' :
                     data.status === 'processing' ? '#3B82F6' : '#D97706'
            }
          ]}>
            {data.status}
          </Text>
        </View>
      </View>
    </View>

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

    {/* Terms and Conditions */}
    {companyDetails.vatRecordTerms && (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Terms & Conditions</Text>
        <Text style={styles.text}>{companyDetails.vatRecordTerms}</Text>
      </View>
    )}
  </BaseDocument>
);

export default VATRecordDocument;