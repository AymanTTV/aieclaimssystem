import React from 'react';
import { Document, Page, Text, View, Image } from '@react-pdf/renderer';
import { Claim } from '../../../types';
import { styles } from './styles';
import { format } from 'date-fns';
import logo from '../../../assets/logo.png';

interface NoticeOfRightToCancelProps {
  claim: Claim;
  companyDetails: any;
}

const NoticeOfRightToCancel: React.FC<NoticeOfRightToCancelProps> = ({ claim, companyDetails }) => {
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

        <Text style={styles.title}>RIGHT TO CANCEL CREDIT AGREEMENT</Text>

        <View style={styles.section}>
          <Text style={styles.text}>
            {companyDetails.noticeOfRightToCancelText || 
              "You have the right to cancel this contract if you wish, within 14 calendar days starting on the date of issue stated above. " +
              "Cancellation should be communicated in writing or by email to the person shown above.\n\n" +
              "You are advised to keep a copy of your cancellation notice. You can use the attached form which is provided for your convenience. " +
              "You are not obliged to use this form.\n\n" +
              "Cancellation is deemed to be served as soon as it is posted or sent to AIE SKYLINE LIMITED or in the case of an electronic communication from the day it is sent."
            }
          </Text>
        </View>

        {/* Signature Section */}
        <View style={styles.signatureSection}>
          <View style={styles.signatureBox}>
            <Text>Customer Name: {claim.clientInfo.name}</Text>
            {claim.clientInfo.signature && (
              <Image src={claim.clientInfo.signature} style={styles.signature} />
            )}
            <Text style={styles.signatureLine}>Customer Signature</Text>
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

export default NoticeOfRightToCancel;