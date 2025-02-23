import React from 'react';
import { Text, View } from '@react-pdf/renderer';
import { VDFinanceRecord } from '../../../types/vdFinance';
import BaseDocument from '../BaseDocument';
import { formatDate } from '../../../utils/dateHelpers';
import { styles } from '../styles';

interface VDFinanceDocumentProps {
  data: VDFinanceRecord;
  companyDetails: any;
}

const VDFinanceDocument: React.FC<VDFinanceDocumentProps> = ({ data, companyDetails }) => (
  <BaseDocument title="VD Finance Record" companyDetails={companyDetails}>
    {/* Basic Information */}
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Basic Information</Text>
      <View style={styles.infoCard}>
        <View style={styles.row}>
          <Text style={styles.label}>Name:</Text>
          <Text style={styles.value}>{data.name}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Reference:</Text>
          <Text style={styles.value}>{data.reference}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Registration:</Text>
          <Text style={styles.value}>{data.registration}</Text>
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
          <Text style={styles.label}>Total Amount:</Text>
          <Text style={styles.value}>£{data.totalAmount.toFixed(2)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>NET Amount:</Text>
          <Text style={styles.value}>£{data.netAmount.toFixed(2)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>VAT Rate:</Text>
          <Text style={styles.value}>{data.vatRate}%</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>VAT IN:</Text>
          <Text style={styles.value}>£{data.vatIn.toFixed(2)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>VAT OUT:</Text>
          <Text style={styles.value}>£{data.vatOut.toFixed(2)}</Text>
        </View>
      </View>
    </View>

    {/* Parts Details */}
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Parts</Text>
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableCell, { flex: 2 }]}>Part Name</Text>
          <Text style={styles.tableCell}>Quantity</Text>
          <Text style={styles.tableCell}>Price</Text>
          <Text style={styles.tableCell}>VAT</Text>
          <Text style={styles.tableCell}>Total</Text>
        </View>
        {data.parts.map((part, index) => (
          <View key={index} style={styles.tableRow}>
            <Text style={[styles.tableCell, { flex: 2 }]}>{part.name}</Text>
            <Text style={styles.tableCell}>{part.quantity}</Text>
            <Text style={styles.tableCell}>£{part.price.toFixed(2)}</Text>
            <Text style={styles.tableCell}>{part.includeVat ? '20%' : '-'}</Text>
            <Text style={styles.tableCell}>
              £{(part.price * part.quantity * (part.includeVat ? 1.2 : 1)).toFixed(2)}
            </Text>
          </View>
        ))}
      </View>
    </View>

    {/* Labor Details */}
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Labor</Text>
      <View style={styles.infoCard}>
        <View style={styles.row}>
          <Text style={styles.label}>Service Center:</Text>
          <Text style={styles.value}>{data.serviceCenter}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Labor Rate:</Text>
          <Text style={styles.value}>£{data.laborRate}/hour</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Labor Hours:</Text>
          <Text style={styles.value}>{data.laborHours}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Labor Total:</Text>
          <Text style={styles.value}>£{(data.laborRate * data.laborHours).toFixed(2)}</Text>
        </View>
      </View>
    </View>

    {/* Summary */}
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Summary</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.label}>Purchased Items:</Text>
          <Text style={styles.value}>£{data.purchasedItems.toFixed(2)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Client Repair:</Text>
          <Text style={styles.value}>£{data.clientRepair.toFixed(2)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Solicitor Fee:</Text>
          <Text style={styles.value}>£{data.solicitorFee.toFixed(2)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={[styles.label, { fontWeight: 'bold' }]}>Profit:</Text>
          <Text style={[styles.value, { color: '#059669', fontWeight: 'bold' }]}>
            £{data.profit.toFixed(2)}
          </Text>
        </View>
      </View>
    </View>

    {/* Description */}
    {data.description && (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Description</Text>
        <View style={styles.infoCard}>
          <Text style={styles.text}>{data.description}</Text>
        </View>
      </View>
    )}

    {/* Terms and Conditions */}
    {companyDetails.vdFinanceTerms && (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Terms & Conditions</Text>
        <Text style={styles.text}>{companyDetails.vdFinanceTerms}</Text>
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

export default VDFinanceDocument;