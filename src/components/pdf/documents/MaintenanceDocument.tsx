import React from 'react';
import { Text, View } from '@react-pdf/renderer';
import { MaintenanceLog, Vehicle } from '../../../types';
import BaseDocument from '../BaseDocument';
import { formatDate } from '../../../utils/dateHelpers';
import { styles } from '../styles';

interface MaintenanceDocumentProps {
  data: MaintenanceLog & { vehicle: Vehicle };
  companyDetails: any;
}

const MaintenanceDocument: React.FC<MaintenanceDocumentProps> = ({ data, companyDetails }) => (
  <BaseDocument title={`${data.type.replace('-', ' ')}`} companyDetails={companyDetails}>

    {/* Vehicle & Maintenance Info Side by Side */}
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }} wrap={false}>
      {/* Vehicle Info */}
      <View style={[styles.card, { width: '48%' }]}>
        <Text style={styles.sectionTitle}>Vehicle Information</Text>
        <View style={styles.flexRow}>
          <Text style={styles.label}>Make & Model:</Text>
          <Text style={styles.value}>{data.vehicle.make} {data.vehicle.model}</Text>
        </View>
        <View style={styles.flexRow}>
          <Text style={styles.label}>Registration:</Text>
          <Text style={styles.value}>{data.vehicle.registrationNumber}</Text>
        </View>
      </View>

      {/* Maintenance Info */}
      <View style={[styles.card, { width: '48%' }]}>
        <Text style={styles.sectionTitle}>Maintenance Information</Text>
        <View style={styles.flexRow}>
          <Text style={styles.label}>Type:</Text>
          <Text style={styles.value}>{data.type.replace('-', ' ')}</Text>
        </View>
        <View style={styles.flexRow}>
          <Text style={styles.label}>Date:</Text>
          <Text style={styles.value}>{formatDate(data.date)}</Text>
        </View>
        <View style={styles.flexRow}>
          <Text style={styles.label}>Service Provider:</Text>
          <Text style={styles.value}>{data.serviceProvider}</Text>
        </View>
        <View style={styles.flexRow}>
          <Text style={styles.label}>Location:</Text>
          <Text style={styles.value}>{data.location}</Text>
        </View>
      </View>
    </View>

    {/* Parts Used Table */}
    <View style={styles.sectionBreak} wrap={false}>
      <Text style={styles.sectionTitle}>Parts Used</Text>
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={styles.tableHeaderCell}>Part Name</Text>
          <Text style={styles.tableHeaderCell}>Quantity</Text>
          <Text style={styles.tableHeaderCell}>Unit Cost</Text>
          <Text style={styles.tableHeaderCell}>Total</Text>
        </View>
        {data.parts.map((part, index) => (
          <View key={index} style={styles.tableRow}>
            <Text style={styles.tableCell}>{part.name}</Text>
            <Text style={styles.tableCell}>{part.quantity}</Text>
            <Text style={styles.tableCell}>£{part.cost.toFixed(2)}</Text>
            <Text style={styles.tableCell}>£{(part.quantity * part.cost).toFixed(2)}</Text>
          </View>
        ))}
      </View>
    </View>

    {/* Labor & Costs Table */}
    <View style={styles.sectionBreak} wrap={false}>
      <Text style={styles.sectionTitle}>Labor & Costs</Text>
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={styles.tableHeaderCell}>Labor Hours</Text>
          <Text style={styles.tableHeaderCell}>Labor Rate</Text>
          <Text style={styles.tableHeaderCell}>Labor Cost</Text>
          <Text style={styles.tableHeaderCell}>Total Cost</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={styles.tableCell}>{data.laborHours}</Text>
          <Text style={styles.tableCell}>£{data.laborRate}/hour</Text>
          <Text style={styles.tableCell}>£{data.laborCost.toFixed(2)}</Text>
          <Text style={styles.tableCell}>£{data.cost.toFixed(2)}</Text>
        </View>
      </View>
    </View>

    {/* Payment Information Card aligned to right and Payment details aligned to left*/}
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }} wrap={false}>
      <View style={[styles.card, { width: '48%' }]}>
        <Text style={styles.sectionTitle}>Payment Details</Text>
        <Text>Bank: AIE Skyline Limited</Text>
        <Text>Sort Code: 309950</Text>
        <Text>Account Number: 30513162</Text>
        <Text>Reference: AIE-2GYAHVYS</Text>
      </View>
      <View style={[styles.card, { width: '48%' }]}>
        <View style={styles.row}>
          <Text style={styles.label}>Amount Paid:</Text>
          <Text style={styles.value}>£{data.paidAmount?.toFixed(2) || '0.00'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Remaining Amount:</Text>
          <Text style={styles.value}>£{data.remainingAmount?.toFixed(2) || '0.00'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Payment Status:</Text>
          <Text style={styles.value}>{data.paymentStatus}</Text>
        </View>
      </View>
    </View>

    {/* Terms and Conditions */}
    {companyDetails.maintenanceTerms && (
      <View style={styles.sectionBreak} wrap={false}>
        <Text style={styles.sectionTitle}>Terms & Conditions</Text>
        <Text style={styles.text}>{companyDetails.maintenanceTerms}</Text>
      </View>
    )}
  </BaseDocument>
);

export default MaintenanceDocument;