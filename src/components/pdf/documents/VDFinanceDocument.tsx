// VDFinanceDocument.tsx
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
    
    {/* Basic Information in Card */}
    <View style={styles.sectionBreak} wrap={false}>
      <View style={styles.infoCard}>
        <Text style={styles.infoCardTitle}>Basic Information</Text>
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

    {/* Financial Details Table (TH/TD format) */}
    <View style={styles.sectionBreak} wrap={false}>
      <Text style={styles.sectionTitle}>Financial Details</Text>
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableCell, { flex: 1 }]}>Total Amount</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>NET Amount</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>VAT Rate</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>VAT IN</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>VAT OUT</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={[styles.tableCell, { flex: 1 }]}>£{data.totalAmount.toFixed(2)}</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>£{data.netAmount.toFixed(2)}</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>{data.vatRate}%</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>£{data.vatIn.toFixed(2)}</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>£{data.vatOut.toFixed(2)}</Text>
        </View>
      </View>
    </View>

    {/* Parts Table (unchanged) */}
    <View style={styles.sectionBreak} wrap={false}>
      <Text style={styles.sectionTitle}>Parts</Text>
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableCell, { flex: 2 }]}>Part Name</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>Quantity</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>Price</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>VAT</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>Total</Text>
        </View>
        {data.parts.map((part, index) => (
          <View key={index} style={styles.tableRow}>
            <Text style={[styles.tableCell, { flex: 2 }]}>{part.name}</Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>{part.quantity}</Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>£{part.price.toFixed(2)}</Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>{part.includeVat ? '20%' : '-'}</Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>
              £{(part.price * part.quantity * (part.includeVat ? 1.2 : 1)).toFixed(2)}
            </Text>
          </View>
        ))}
      </View>
    </View>

    {/* Labor Details Table - TH/TD */}
    <View style={styles.sectionBreak} wrap={false}>
      <Text style={styles.sectionTitle}>Labor Details</Text>
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableCell, { flex: 1 }]}>Service Center</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>Labor Rate</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>Labor Hours</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>Labor Total</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={[styles.tableCell, { flex: 1 }]}>{data.serviceCenter}</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>£{data.laborRate}/hour</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>{data.laborHours}</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>£{(data.laborRate * data.laborHours).toFixed(2)}</Text>
        </View>
      </View>
    </View>

    {/* Summary in Card aligned right */}
    <View style={[styles.sectionBreak, { flexDirection: 'row', justifyContent: 'flex-end' }]} wrap={false}>
      <View style={[styles.infoCard, { width: '50%' }]}>
        <Text style={styles.infoCardTitle}>Summary</Text>
        <View style={styles.spaceBetweenRow}>
          <Text style={styles.label}>Purchased Items:</Text>
          <Text style={[styles.value, { textAlign: 'right' }]}>£{data.purchasedItems.toFixed(2)}</Text>
        </View>
        <View style={styles.spaceBetweenRow}>
          <Text style={styles.label}>Client Repair:</Text>
          <Text style={[styles.value, { textAlign: 'right' }]}>£{data.clientRepair.toFixed(2)}</Text>
        </View>
        <View style={styles.spaceBetweenRow}>
          <Text style={styles.label}>Solicitor Fee:</Text>
          <Text style={[styles.value, { textAlign: 'right' }]}>£{data.solicitorFee.toFixed(2)}</Text>
        </View>
        <View style={styles.spaceBetweenRow}>
          <Text style={[styles.label, { color: '#059669' }]}>Profit:</Text>
          <Text style={[styles.value, { color: '#059669', fontWeight: 'bold', textAlign: 'right' }]}>
            £{data.profit.toFixed(2)}
          </Text>
        </View>
      </View>
    </View>

    {/* Description */}
    {data.description && (
      <View style={styles.sectionBreak} wrap={false}>
        <Text style={styles.sectionTitle}>Description</Text>
        <Text style={styles.text}>{data.description}</Text>
      </View>
    )}

    {/* Terms and Conditions */}
    {companyDetails.vdFinanceTerms && (
      <View style={styles.sectionBreak} wrap={false}>
        <Text style={styles.sectionTitle}>Terms & Conditions</Text>
        <Text style={styles.text}>{companyDetails.vdFinanceTerms}</Text>
      </View>
    )}
  </BaseDocument>
);

export default VDFinanceDocument;