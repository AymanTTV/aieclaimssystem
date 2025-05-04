// src/components/pdf/claims/NoticeOfRightToCancel.tsx

import React from 'react';
import { Document, Page, Text, View, Image } from '@react-pdf/renderer';
import { Claim } from '../../../types';
import { styles } from '../styles';
import { format } from 'date-fns';
import logo from '../../../assets/logo.png';

interface NoticeOfRightToCancelProps {
  claim: Claim;
  companyDetails: any;
}

const NoticeOfRightToCancel: React.FC<NoticeOfRightToCancelProps> = ({
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
        <Text style={styles.title}>RIGHT TO CANCEL CREDIT AGREEMENT</Text>
      </View>

      {/* Body */}
      <View style={styles.infoCard}>
        <Text style={styles.value}>
          {companyDetails.noticeOfRightToCancelText ||
            `You have the right to cancel this contract within 14 calendar days from the date issued. Cancellation must be in writing or by email. Cancellation is deemed served once posted or sent.`}
        </Text>
      </View>

      {/* Signatures */}
      <View
        style={styles.signatureSection}
        wrap={false}         // <-- prevent page-break inside
      >
        <View style={[styles.card, { width: '48%' }]}>
          <Text style={styles.sectionTitle}>Customer</Text>
          <Text style={styles.label}>Name:</Text>
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

export default NoticeOfRightToCancel;
