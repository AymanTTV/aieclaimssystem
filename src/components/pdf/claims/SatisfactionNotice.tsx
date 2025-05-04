import React from 'react';
import { Document, Page, Text, View, Image } from '@react-pdf/renderer';
import { styles } from '../styles';
import { format } from 'date-fns';
import logo from '../../../assets/logo.png';

interface SatisfactionNoticeProps {
  claim: any;
  companyDetails: any;
}

const SatisfactionNotice: React.FC<SatisfactionNoticeProps> = ({
  claim,
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
        <Text style={styles.title}>SATISFACTION NOTICE</Text>
      </View>

      {/* Body */}
      <View style={styles.infoCard}>
        <Text style={styles.value}>
          {companyDetails.satisfactionNoticeText ||
            `I, ${claim.clientInfo.name}, hereby certify that I am satisfied with the repairs on my vehicle (${claim.clientVehicle.registration}).`}
        </Text>
        <Text style={styles.label}>Date:</Text>
        <Text style={styles.value}>{format(new Date(), 'dd/MM/yyyy')}</Text>
        <Text style={styles.label}>Name:</Text>
        <Text style={styles.value}>{claim.clientInfo.name}</Text>
      </View>

      {/* Signatures */}
      <View style={styles.flexRow}>
        <View style={[styles.card, { width: '48%' }]}>
          <Text style={styles.sectionTitle}>Customer</Text>
          {claim.clientInfo.signature && (
            <Image src={claim.clientInfo.signature} style={styles.signature} />
          )}
        </View>
        <View style={[styles.card, { width: '48%' }]}>
          <Text style={styles.sectionTitle}>Company Representative</Text>
          {companyDetails.signature && (
            <Image src={companyDetails.signature} style={styles.signature} />
          )}
        </View>
      </View>

      <Text style={styles.footer}>
        {companyDetails.fullName} | Registered in England and Wales | Company No:{' '}
        {companyDetails.registrationNumber}
      </Text>
    </Page>
  </Document>
);

export default SatisfactionNotice;
