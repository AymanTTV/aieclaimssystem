import React from 'react';
import { Document, Page, Text, View, Image } from '@react-pdf/renderer';
import { Vehicle } from '../../../types';
import { styles } from '../styles';
import { formatDate } from '../../../utils/dateHelpers';
import { isExpiringOrExpired } from '../../../utils/vehicleUtils';

interface VehicleDocumentProps {
  data: Vehicle;
  companyDetails: any;
}

const VehicleDocument: React.FC<VehicleDocumentProps> = ({ data, companyDetails }) => {
  // Calculate MOT expiry (6 months after test date)
  const motExpiry = new Date(data.motTestDate);
  motExpiry.setMonth(motExpiry.getMonth() + 6);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Image src={companyDetails.logoUrl} style={styles.logo} />
          <View style={styles.companyInfo}>
            <Text>{companyDetails.fullName}</Text>
            <Text>{companyDetails.officialAddress}</Text>
            <Text>Tel: {companyDetails.phone}</Text>
            <Text>Email: {companyDetails.email}</Text>
          </View>
        </View>

        <Text style={styles.title}>Vehicle Details</Text>

        {/* Basic Information */}
        <View style={[styles.section, styles.keepTogether]}>
          <Text style={styles.sectionTitle}>Vehicle Information</Text>
          <View style={styles.infoCard}>
            <View style={styles.row}>
              <Text style={styles.label}>Registration Number:</Text>
              <Text style={styles.value}>{data.registrationNumber}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>VIN:</Text>
              <Text style={styles.value}>{data.vin}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Make:</Text>
              <Text style={styles.value}>{data.make}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Model:</Text>
              <Text style={styles.value}>{data.model}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Year:</Text>
              <Text style={styles.value}>{data.year}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Status:</Text>
              <Text style={styles.value}>{data.status}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Current Mileage:</Text>
              <Text style={styles.value}>{data.mileage.toLocaleString()} miles</Text>
            </View>
          </View>
        </View>

        {/* Document Expiry Dates */}
        <View style={[styles.section, styles.keepTogether]}>
          <Text style={styles.sectionTitle}>Document Expiry Dates</Text>
          <View style={styles.infoCard}>
            <View style={styles.row}>
              <Text style={styles.label}>MOT Test Date:</Text>
              <Text style={[
                styles.value,
                isExpiringOrExpired(data.motTestDate) && { color: '#DC2626' }
              ]}>
                {formatDate(data.motTestDate)}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>MOT Expiry (6 months):</Text>
              <Text style={[
                styles.value,
                isExpiringOrExpired(motExpiry) && { color: '#DC2626' }
              ]}>
                {formatDate(motExpiry)}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>NSL Expiry:</Text>
              <Text style={[
                styles.value,
                isExpiringOrExpired(data.nslExpiry) && { color: '#DC2626' }
              ]}>
                {formatDate(data.nslExpiry)}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Road Tax Expiry:</Text>
              <Text style={[
                styles.value,
                isExpiringOrExpired(data.roadTaxExpiry) && { color: '#DC2626' }
              ]}>
                {formatDate(data.roadTaxExpiry)}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Insurance Expiry:</Text>
              <Text style={[
                styles.value,
                isExpiringOrExpired(data.insuranceExpiry) && { color: '#DC2626' }
              ]}>
                {formatDate(data.insuranceExpiry)}
              </Text>
            </View>
          </View>
        </View>

        {/* Maintenance Information */}
        <View style={[styles.section, styles.keepTogether]}>
          <Text style={styles.sectionTitle}>Maintenance Information</Text>
          <View style={styles.infoCard}>
            <View style={styles.row}>
              <Text style={styles.label}>Last Maintenance:</Text>
              <Text style={styles.value}>{formatDate(data.lastMaintenance)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Next Maintenance:</Text>
              <Text style={[
                styles.value,
                isExpiringOrExpired(data.nextMaintenance) && { color: '#DC2626' }
              ]}>
                {formatDate(data.nextMaintenance)}
              </Text>
            </View>
          </View>
        </View>

        {/* Owner Information */}
        <View style={[styles.section, styles.keepTogether]}>
          <Text style={styles.sectionTitle}>Owner Information</Text>
          <View style={styles.infoCard}>
            <View style={styles.row}>
              <Text style={styles.label}>Owner:</Text>
              <Text style={styles.value}>{data.owner?.name || 'AIE Skyline'}</Text>
            </View>
            {data.owner?.address && !data.owner?.isDefault && (
              <View style={styles.row}>
                <Text style={styles.label}>Address:</Text>
                <Text style={styles.value}>{data.owner.address}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          {companyDetails.fullName} | Generated on {formatDate(new Date())}
        </Text>
      </Page>
    </Document>
  );
};

export default VehicleDocument;

export { VehicleDocument }