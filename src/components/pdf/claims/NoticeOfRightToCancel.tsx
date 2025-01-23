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
          <Text style={styles.reference}>
            Ref: AIE-{claim.id.slice(-8).toUpperCase()}
          </Text>
          <Text style={styles.date}>
            Date of issue: {format(new Date(), 'dd/MM/yyyy')}
          </Text>

          <Text style={styles.text}>
            Name and Address of person to whom the cancellation notice may be given, or an email address to which it may be sent:
          </Text>

          <View style={styles.section}>
            <Text>{companyDetails.fullName}</Text>
            <Text>{companyDetails.officialAddress}</Text>
            <Text>Email: {companyDetails.email}</Text>
          </View>

          <Text style={styles.sectionTitle}>Customer Cancellation Rights</Text>
          <Text style={styles.text}>
            You have the right to cancel this contract if you wish, within 14 calendar days, starting on the date of issue stated above. Cancellation should be given in writing or email to the person shown above.
          </Text>

          <Text style={styles.text}>
            Page 2 of this form may be used to exercise this right and can be issued in person or sent by post – in which you should obtain a certificate or a posting or recorded delivery slip. You are advised to take a copy of the cancellation notice before returning it to the hire company.
          </Text>

          <Text style={styles.text}>
            Cancellation is deemed to be served as soon as it is posted or sent to AIE SKYLINE LIMITED or in the case of an electronic communication from the day it is sent to AIE SKYLINE LIMITED.
          </Text>

          <Text style={styles.sectionTitle}>Complaints</Text>
          <Text style={styles.text}>
            If you wish to make a complaint then this may be done by posts or email address above.
          </Text>
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
