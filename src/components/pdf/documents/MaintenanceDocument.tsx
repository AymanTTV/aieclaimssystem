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
  <BaseDocument title="Maintenance Record" companyDetails={companyDetails}>
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Service Details</Text>
      <View style={styles.row}>
        <Text style={styles.label}>Type:</Text>
        <Text style={styles.value}>{data.type.replace('-', ' ')}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Date:</Text>
        <Text style={styles.value}>{formatDate(data.date)}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Service Provider:</Text>
        <Text style={styles.value}>{data.serviceProvider}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Location:</Text>
        <Text style={styles.value}>{data.location}</Text>
      </View>
    </View>

    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Work Details</Text>
      <View style={styles.row}>
        <Text style={styles.label}>Description:</Text>
        <Text style={styles.value}>{data.description}</Text>
      </View>
      {data.notes && (
        <View style={styles.row}>
          <Text style={styles.label}>Notes:</Text>
          <Text style={styles.value}>{data.notes}</Text>
        </View>
      )}
    </View>

    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Parts Used</Text>
      {data.parts.map((part, index) => (
        <View key={index} style={styles.row}>
          <Text style={styles.label}>{part.name}:</Text>
          <Text style={styles.value}>
            {part.quantity} x £{part.cost.toFixed(2)} = £{(part.quantity * part.cost).toFixed(2)}
          </Text>
        </View>
      ))}
    </View>

    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Labor & Costs</Text>
      <View style={styles.row}>
        <Text style={styles.label}>Labor Hours:</Text>
        <Text style={styles.value}>{data.laborHours}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Labor Rate:</Text>
        <Text style={styles.value}>£{data.laborRate}/hour</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Labor Cost:</Text>
        <Text style={styles.value}>£{data.laborCost.toFixed(2)}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Total Cost:</Text>
        <Text style={styles.value}>£{data.cost.toFixed(2)}</Text>
      </View>
    </View>

    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Payment Information</Text>
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

    {companyDetails.maintenanceTerms && (
      <View style={styles.terms}>
        <Text>{companyDetails.maintenanceTerms}</Text>
      </View>
    )}
  </BaseDocument>
);

export default MaintenanceDocument;