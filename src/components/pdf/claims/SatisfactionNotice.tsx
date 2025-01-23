import React from 'react';
import { Document, Page, Text, View, Image } from '@react-pdf/renderer';
import { format } from 'date-fns';
import logo from '../../../assets/logo.png';

interface SatisfactionNoticeProps {
  claim: any; // Assuming claim object contains necessary data
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
            I, {claim.clientInfo.name}, hereby certify that I am satisfied with
            the repairs on my vehicle done by AIE SKYLINE. My vehicle
            registration is (REG NO) and AIE SKYLINE have done a wonderful
            job processing everything for me. I will 100% recommend others to
            use them and their services.
          </Text>

          <Text style={styles.text}>
            Date: {format(new Date(), 'dd/MM/yyyy')}
          </Text>

          <Text style={styles.text}>Name: {claim.clientInfo.name}</Text>

          {/* Add signature field here */}
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          {companyDetails.fullName} | Registered in England and Wales | Company No:
          {companyDetails.registrationNumber}
        </Text>
      </Page>
    </Document>
  );
};

export default SatisfactionNotice;