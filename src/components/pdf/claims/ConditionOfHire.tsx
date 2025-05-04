import React from 'react';
import { Document, Page, Text, View, Image } from '@react-pdf/renderer';
import { Claim } from '../../../types';
import { styles } from '../styles';
import { format } from 'date-fns';
import logo from '../../../assets/logo.png';

interface ConditionOfHireProps {
  claim: Claim;
  companyDetails: any;
}

const ConditionOfHire: React.FC<ConditionOfHireProps> = ({ claim, companyDetails }) => (
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
        <Text style={styles.title}>CONDITION OF HIRE</Text>
      </View>

      {/* Terms */}
      <View style={styles.infoCard}>
        <Text style={styles.value}>
          {companyDetails.conditionOfHireText ||
            `(a) For the purpose of this agreement AIE SKYLINE LTD is referred to as the lessor.

(b) "The Hirer" means the person, firm or organisation by or on behalf of whom this agreement is signed.`}
        </Text>
      </View>

      {/* Signatures */}
      <View style={styles.flexRow}>
        <View style={[styles.card, { width: '48%' }]}>
          <Text style={styles.sectionTitle}>Hirer</Text>
          <Text style={styles.label}>Full Name:</Text>
          <Text style={styles.value}>{claim.clientInfo.name}</Text>
          {claim.clientInfo.signature && (
            <Image src={claim.clientInfo.signature} style={styles.signature} />
          )}
        </View>
        <View style={[styles.card, { width: '48%' }]}>
          <Text style={styles.sectionTitle}>Lessor</Text>
          {companyDetails.signature && (
            <Image src={companyDetails.signature} style={styles.signature} />
          )}
          {/* <Text style={styles.label}>Date:</Text>
          <Text style={styles.value}>{format(new Date(), 'dd/MM/yyyy')}</Text>
          {/* <Text style={styles.label}>Ref:</Text> */}
          {/* <Text style={styles.value}>AIE-{claim.id.slice(-8).toUpperCase()}</Text> */}
        </View>
      </View>

      {/* Footer */}
      <Text style={styles.footer}>
        {companyDetails.fullName} | Registered in England and Wales | Company No:{' '}
        {companyDetails.registrationNumber}
      </Text>
    </Page>
  </Document>
);

export default ConditionOfHire;
