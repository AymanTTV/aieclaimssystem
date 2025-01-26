import React from 'react';
import { Document, Page, Text, View, Image } from '@react-pdf/renderer';
import { Claim } from '../../../types';
import { styles } from './styles';
import { format } from 'date-fns';
import logo from '../../../assets/logo.png';

interface ConditionOfHireProps {
  claim: Claim;
  companyDetails: any;
}

const ConditionOfHire: React.FC<ConditionOfHireProps> = ({ claim, companyDetails }) => {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Image src={logo} style={styles.logo} />
          <View style={styles.companyInfo}>
            <Text>{companyDetails.fullName}</Text>
            <Text>{companyDetails.officialAddress}</Text>
            <Text>Tel: {companyDetails.phone}</Text>
            <Text>Email: {companyDetails.email}</Text>
          </View>
        </View>

        <Text style={styles.title}>CONDITION OF HIRE</Text>

        {/* Terms and Conditions */}
        <View style={styles.section}>
          <Text style={styles.text}>
            {companyDetails.conditionOfHireText || 
              "(a) For the purpose of this agreement AIE SKYLINE LTD is referred to as the lessor.\n\n" +
              "(b) \"The Hirer\" means the person, firm or organisation by or on behalf of whom this agreement is signed"
            }
          </Text>
        </View>

        {/* Signature Section */}
        <View style={styles.signatureSection}>
          <View style={styles.signatureBox}>
            <Text>Full Name: {claim.clientInfo.name}</Text>
            {claim.clientInfo.signature && (
              <Image src={claim.clientInfo.signature} style={styles.signature} />
            )}
            <Text style={styles.signatureLine}>Signature of Hirer</Text>
          </View>
          <View style={styles.signatureBox}>
            {companyDetails.signature && (
              <Image src={companyDetails.signature} style={styles.signature} />
            )}
            <Text style={styles.signatureLine}>For and on behalf of {companyDetails.fullName}</Text>
            <Text>Date: {format(new Date(), 'dd/MM/yyyy')}</Text>
            <Text>Ref: AIE-{claim.id.slice(-8).toUpperCase()}</Text>
          </View>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          {companyDetails.fullName} | Registered in England and Wales | Company No: {companyDetails.registrationNumber}
        </Text>
      </Page>
    </Document>
  );
};

export default ConditionOfHire;