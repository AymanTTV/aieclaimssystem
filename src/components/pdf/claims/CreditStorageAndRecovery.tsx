import React from 'react';
import { Document, Page, Text, View, Image } from '@react-pdf/renderer';
import { format } from 'date-fns';
import logo from '../../../assets/logo.png';
import { styles } from './styles';

interface CreditStorageAndRecoveryProps {
  companyDetails: any;
}

const CreditStorageAndRecovery: React.FC<CreditStorageAndRecoveryProps> = ({
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

        <Text style={styles.title}>CREDIT STORAGE AND RECOVERY AGREEMENT</Text>

        {/* Agreement Body */}
        <View style={styles.section}>
          <Text style={styles.text}>
            {companyDetails.creditStorageAndRecoveryText || 
              "1. In this agreement, AIE SKYLINE LIMITED is referred to as the \"Storage and Recovery Company.\" The \"Owner\" means the person, firm, " +
              "or organization with the legal title or responsibility for the vehicle, the Storage and Recovery of which is the subject of this " +
              "agreement, by or on behalf of whom the agreement is signed.\n\n" +
              "2. The Storage charges are £40 Per day from the date the vehicle has entered our premises. Normally, this is the same day as the " +
              "vehicle is recovered.\n\n" +
              "3. The Recovery Charges are at the rate of £350\n\n" +
              "4. Your vehicle will be stored at the address below."
            }
          </Text>
        </View>

        <Text style={styles.title}>SIGNATURE</Text>

        <View style={styles.signatureSection}>
          <View style={styles.signatureBox}>
            <Text>For Storage and Recovery Company:</Text>
            {companyDetails.signature && (
              <Image src={companyDetails.signature} style={styles.signature} />
            )}
            <Text style={styles.signatureLine}>For and on behalf of {companyDetails.fullName}</Text>
          </View>
          <View style={styles.signatureBox}>
            <Text>Date: {format(new Date(), 'dd/MM/yyyy')}</Text>
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

export default CreditStorageAndRecovery;