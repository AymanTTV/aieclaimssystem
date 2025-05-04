import React from 'react';
import { Document, Page, Text, View, Image } from '@react-pdf/renderer';
import { styles } from '../styles';
import { format } from 'date-fns';
import logo from '../../../assets/logo.png';

interface CreditStorageAndRecoveryProps {
  companyDetails: any;
}

const CreditStorageAndRecovery: React.FC<CreditStorageAndRecoveryProps> = ({
  companyDetails,
}) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <Image src={logo} style={styles.logo} />
        <View style={styles.headerRight}>
          <Text style={styles.companyName}>{companyDetails.fullName}</Text>
          <Text style={styles.companyDetail}>{companyDetails.officialAddress}</Text>
          <Text style={styles.companyDetail}>Tel: {companyDetails.phone}</Text>
          <Text style={styles.companyDetail}>Email: {companyDetails.email}</Text>
        </View>
      </View>

      {/* Title */}
      <View style={styles.titleContainer}>
        <Text style={styles.title}>CREDIT STORAGE AND RECOVERY AGREEMENT</Text>
      </View>

      {/* Body */}
      <View style={styles.infoCard}>
        <Text style={styles.value}>
          {companyDetails.creditStorageAndRecoveryText ||
            `1. In this agreement, AIE SKYLINE LIMITED is referred to as the "Storage and Recovery Company." The "Owner" means the person, firm, or organization with the legal title or responsibility for the vehicle, the Storage and Recovery of which is the subject of this agreement, by or on behalf of whom the agreement is signed.

2. The Storage charges are £40 per day from the date the vehicle has entered our premises (normally the same day as recovery).

3. The Recovery Charges are at the rate of £350.

4. Your vehicle will be stored at the address below.`}
        </Text>
      </View>

      {/* Signature */}
      <View style={styles.flexRow}>
        <View style={[styles.card, { width: '48%' }]}>
          <Text style={styles.sectionTitle}>For Storage & Recovery Company</Text>
          {companyDetails.signature && (
            <Image src={companyDetails.signature} style={styles.signature} />
          )}
        </View>
        <View style={[styles.card, { width: '48%' }]}>
          <Text style={styles.sectionTitle}>Date</Text>
          <Text style={styles.value}>{format(new Date(), 'dd/MM/yyyy')}</Text>
        </View>
      </View>

      <Text style={styles.footer}>
        {companyDetails.fullName} | Registered in England and Wales | Company No:{' '}
        {companyDetails.registrationNumber}
      </Text>
    </Page>
  </Document>
);

export default CreditStorageAndRecovery;
