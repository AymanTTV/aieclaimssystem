import React from 'react';
import { Text, View, Image } from '@react-pdf/renderer';
import { Vehicle } from '../../../types';
import BaseDocument from '../BaseDocument';
import { formatDate } from '../../../utils/dateHelpers';
import { styles } from '../styles';

interface VehicleDocumentProps {
  data: Vehicle;
  companyDetails: any;
}

const VehicleDocument: React.FC<VehicleDocumentProps> = ({ data, companyDetails }) => (
  <BaseDocument title="Vehicle Details" companyDetails={companyDetails}>
    {/* Vehicle Image */}
    {data.image && (
      <View style={styles.imageContainer}>
        <Image src={data.image} style={styles.vehicleImage} />
      </View>
    )}

    {/* Basic Information */}
    <View style={styles.section}>
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

    {/* Rental Rates */}
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Rental Rates</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.label}>Weekly Rate:</Text>
          <Text style={styles.value}>£{Math.round(data.weeklyRentalPrice)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Daily Rate:</Text>
          <Text style={styles.value}>£{Math.round(data.dailyRentalPrice)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Claim Rate:</Text>
          <Text style={styles.value}>£{Math.round(data.claimRentalPrice)}</Text>
        </View>
      </View>
    </View>

    {/* Document Expiry Dates */}
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Document Expiry Dates</Text>
      <View style={styles.infoCard}>
        <View style={styles.row}>
          <Text style={styles.label}>MOT Expiry:</Text>
          <Text style={styles.value}>{formatDate(data.motExpiry)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>NSL Expiry:</Text>
          <Text style={styles.value}>{formatDate(data.nslExpiry)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Road Tax Expiry:</Text>
          <Text style={styles.value}>{formatDate(data.roadTaxExpiry)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Insurance Expiry:</Text>
          <Text style={styles.value}>{formatDate(data.insuranceExpiry)}</Text>
        </View>
      </View>
    </View>

    {/* Maintenance Information */}
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Maintenance Information</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.label}>Last Maintenance:</Text>
          <Text style={styles.value}>{formatDate(data.lastMaintenance)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Next Maintenance:</Text>
          <Text style={styles.value}>{formatDate(data.nextMaintenance)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Next Service Mileage:</Text>
          <Text style={styles.value}>{(data.mileage + 25000).toLocaleString()} miles</Text>
        </View>
      </View>
    </View>

    {/* Owner Information */}
    <View style={styles.section}>
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

    {/* Sale Information */}
    {data.status === 'sold' && (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sale Information</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.label}>Sale Date:</Text>
            <Text style={styles.value}>{formatDate(data.soldDate)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Sale Price:</Text>
            <Text style={styles.value}>£{data.salePrice?.toLocaleString()}</Text>
          </View>
        </View>
      </View>
    )}

    {/* Terms and Conditions */}
    {companyDetails.vehicleTerms && (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Terms & Conditions</Text>
        <Text style={styles.text}>{companyDetails.vehicleTerms}</Text>
      </View>
    )}

    {/* Creation Information */}
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Record Information</Text>
      <View style={styles.infoCard}>
        <View style={styles.row}>
          <Text style={styles.label}>Created At:</Text>
          <Text style={styles.value}>{formatDate(data.createdAt)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Created By:</Text>
          <Text style={styles.value}>{data.createdBy}</Text>
        </View>
      </View>
    </View>
  </BaseDocument>
);

export default VehicleDocument;