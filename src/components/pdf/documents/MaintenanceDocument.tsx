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
    {/* Vehicle Information */}
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Vehicle Information</Text>
      <View style={styles.infoCard}>
        {data.vehicle.image && (
          <View style={styles.imageContainer}>
            <Image src={data.vehicle.image} style={styles.vehicleImage} />
          </View>
        )}
        <View style={styles.row}>
          <Text style={styles.label}>Make & Model:</Text>
          <Text style={styles.value}>{data.vehicle.make} {data.vehicle.model}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Registration:</Text>
          <Text style={styles.value}>{data.vehicle.registrationNumber}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Current Mileage:</Text>
          <Text style={styles.value}>{data.currentMileage.toLocaleString()} miles</Text>
        </View>
      </View>
    </View>

    {/* Service Details */}
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Service Details</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.label}>Type:</Text>
          <Text style={styles.value}>{data.type.replace('-', ' ').toUpperCase()}</Text>
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
    </View>

    {/* Work Details */}
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Work Details</Text>
      <View style={styles.infoCard}>
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
    </View>

    {/* Parts List */}
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Parts Used</Text>
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableCell, { flex: 2 }]}>Part Name</Text>
          <Text style={styles.tableCell}>Quantity</Text>
          <Text style={styles.tableCell}>Unit Cost</Text>
          <Text style={styles.tableCell}>VAT</Text>
          <Text style={styles.tableCell}>Total</Text>
        </View>
        {data.parts.map((part, index) => {
          const includeVAT = data.vatDetails?.partsVAT.find(v => v.partName === part.name)?.includeVAT;
          const partTotal = part.cost * part.quantity;
          const totalWithVAT = includeVAT ? partTotal * 1.2 : partTotal;

          return (
            <View key={index} style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 2 }]}>{part.name}</Text>
              <Text style={styles.tableCell}>{part.quantity}</Text>
              <Text style={styles.tableCell}>£{part.cost.toFixed(2)}</Text>
              <Text style={styles.tableCell}>{includeVAT ? '20%' : '-'}</Text>
              <Text style={styles.tableCell}>£{totalWithVAT.toFixed(2)}</Text>
            </View>
          );
        })}
      </View>
    </View>

    {/* Labor & Costs */}
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Labor & Costs</Text>
      <View style={styles.card}>
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
        {data.vatDetails?.laborVAT && (
          <View style={styles.row}>
            <Text style={styles.label}>Labor VAT (20%):</Text>
            <Text style={styles.value}>£{(data.laborCost * 0.2).toFixed(2)}</Text>
          </View>
        )}
      </View>
    </View>

    {/* Payment Summary */}
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Payment Summary</Text>
      <View style={styles.infoCard}>
        <View style={styles.row}>
          <Text style={styles.label}>Total Amount:</Text>
          <Text style={styles.value}>£{data.cost.toFixed(2)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Amount Paid:</Text>
          <Text style={[styles.value, { color: '#059669' }]}>£{(data.paidAmount || 0).toFixed(2)}</Text>
        </View>
        {data.remainingAmount > 0 && (
          <View style={styles.row}>
            <Text style={styles.label}>Remaining Amount:</Text>
            <Text style={[styles.value, { color: '#DC2626' }]}>£{data.remainingAmount.toFixed(2)}</Text>
          </View>
        )}
        <View style={styles.row}>
          <Text style={styles.label}>Payment Status:</Text>
          <Text style={styles.value}>{data.paymentStatus}</Text>
        </View>
      </View>
    </View>

    {/* Terms and Conditions */}
    {companyDetails.maintenanceTerms && (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Terms & Conditions</Text>
        <Text style={styles.text}>{companyDetails.maintenanceTerms}</Text>
      </View>
    )}
  </BaseDocument>
);

export default MaintenanceDocument;