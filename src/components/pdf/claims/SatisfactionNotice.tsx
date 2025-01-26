import React from 'react';
import { Document, Page, Text, View, Image } from '@react-pdf/renderer';
import { format } from 'date-fns';
import logo from '../../../assets/logo.png';
import { styles } from './styles';

interface SatisfactionNoticeProps {
  claim: any;
  companyDetails: any;
}

const SatisfactionNotice: React.FC<SatisfactionNoticeProps> = ({
  claim,
  companyDetails,
}) => {
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

        <Text style={styles.title}>SATISFACTION NOTICE</Text>

        <View style={styles.section}>
          <Text style={styles.text}>
            {companyDetails.satisfactionNoticeText || 
              `I, ${cclaim.clientInfo.name}, hereby certify that I am satisfied with ` +
              `the repairs on my vehicle done by AIE SKYLINE. My vehicle ` +
              `registration is ${claim.clientVehicle.registration} and AIE SKYLINE have done a wonderful ` +
              `job processing everything for me. I will 100% recommend others to ` +
              `use them and their services.`
            }
          </Text>

          <Text style={styles.text}>Date: {format(new Date(), 'dd/MM/yyyy')}</Text>
          <Text style={styles.text}>Name: {claim.clientInfo.name}</Text>
        </View>

        {/* Signature Section */}
        <View style={styles.signatureSection}>
          <View style={styles.signatureBox}>
            <Text>Customer:</Text>
            {claim.clientInfo.signature && (
              <Image src={claim.clientInfo.signature} style={styles.signature} />
            )}
            <Text style={styles.signatureLine}>{claim.clientInfo.name}</Text>
          </View>
          <View style={styles.signatureBox}>
            <Text>Company Representative:</Text>
            {companyDetails.signature && (
              <Image src={companyDetails.signature} style={styles.signature} />
            )}
            <Text style={styles.signatureLine}>For and on behalf of {companyDetails.fullName}</Text>
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

export default SatisfactionNotice;