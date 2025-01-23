import React from 'react';
import { Document, Page, Text, View, Image } from '@react-pdf/renderer';
import { Claim } from '../../../types';
import { styles } from './styles';
import { format } from 'date-fns';
import logo from '../../../assets/logo.png';

interface CreditHireMitigationProps {
  claim: Claim;
  companyDetails: any;
}

const CreditHireMitigation: React.FC<CreditHireMitigationProps> = ({ claim, companyDetails }) => {
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

        <Text style={styles.title}>CREDIT HIRE MITIGATION OF LOSS / STATEMENT OF TRUTH</Text>

        <View style={styles.section}>
          <Text style={styles.text}>
            I, the undersigned, have entered into this hire agreement understanding the full terms and conditions of contract. I am aware that;
          </Text>

          <View style={styles.list}>
            {[
              'The hire company has carefully explained their procedure in claiming back my credit hire losses.',
              'I have carefully considered the type and specification of the hire vehicle that I am hiring in order to mitigate my losses.',
              'I understand that the reason for this hire vehicle is because my vehicle is no longer fit for purpose or roadworthy.',
              'I will hire the vehicle for the shortest amount of time possible in order to have my vehicle repaired, this will not exceed 3 months.',
              'I shall keep AIE SKYLINE LIMITED informed at all times of progress or delays to handle my claim effectively.',
              'I am ultimately responsible for the hire charges should they remain unpaid after 340 days from the start of the hire.',
              'I have no funds available to repair/replace my vehicle.',
              'Prior to agree into the hire agreement my duty to keep my losses to a minimum has been explained to me.',
              'I have read and understood the above and I believe that the answers that I have given are true.'
            ].map((item, index) => (
              <Text key={index} style={styles.listItem}>
                {index + 1}. {item}
              </Text>
            ))}
          </View>
        </View>

        {/* Signature Section */}
        <View style={styles.signatureSection}>
          <View style={styles.signatureBox}>
            <Text>NAME: {claim.clientInfo.name}</Text>
            {claim.clientInfo.signature && (
              <Image src={claim.clientInfo.signature} style={styles.signature} />
            )}
            <Text style={styles.signatureLine}>SIGNED</Text>
          </View>
          <View style={styles.signatureBox}>
            <Text>DATE: {format(new Date(), 'dd/MM/yyyy')}</Text>
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

export default CreditHireMitigation;