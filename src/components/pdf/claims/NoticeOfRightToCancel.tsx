// src/components/pdf/claims/NoticeOfRightToCancel.tsx
import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from '@react-pdf/renderer';
import { Claim } from '../../../types';
import { styles } from '../styles';
import { format } from 'date-fns';
import logo from '../../../assets/logo.png';

const localStyles = StyleSheet.create({
  signatureSectionPositioning: {
    // absolute bottom on page 2
    position: 'absolute',
    bottom: 50,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    breakInside: 'avoid',
    pageBreakInside: 'avoid',
  },
});

interface NoticeOfRightToCancelProps {
  claim: Claim;
  companyDetails: any;
}

const NoticeOfRightToCancel: React.FC<NoticeOfRightToCancelProps> = ({
  claim,
  companyDetails,
}) => {
  const defaultNotice = `You have the right to cancel this contract within 14 calendar days from the date issued. Cancellation must be in writing or by email. Cancellation is deemed served once posted or sent.`;

  return (
    <Document>
      {/* Page 1: header, title, body */}
      <Page size="A4" style={styles.page}>
        {/* fixed header */}
        <View style={styles.header} fixed>
          <View style={styles.headerLeft}>
            <Image src={logo} style={styles.logo} />
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.companyName}>{companyDetails.fullName}</Text>
            <Text style={styles.companyDetail}>
              {companyDetails.officialAddress}
            </Text>
            <Text style={styles.companyDetail}>
              Tel: {companyDetails.phone}
            </Text>
            <Text style={styles.companyDetail}>
              Email: {companyDetails.email}
            </Text>
          </View>
        </View>

        {/* title */}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>
            RIGHT TO CANCEL CREDIT AGREEMENT
          </Text>
        </View>

        {/* body */}
        <View style={styles.infoCard}>
          <Text style={styles.value}>
            {companyDetails.noticeOfRightToCancelText || defaultNotice}
          </Text>
        </View>
        {/* no footer or signatures on this page */}
      </Page>

      {/* Page 2: signatures + footer */}
      <Page size="A4" style={styles.page}>
        {/* signatures at bottom */}
        <View style={localStyles.signatureSectionPositioning} wrap={false}>
          {/* Customer */}
          <View
            style={[styles.signatureBox, { borderWidth: 1, borderColor: '#3B82F6' }]}
          >
            <Text style={styles.signatureLine}>Customer Signature</Text>
            {claim.clientInfo.signature && (
              <Image
                src={claim.clientInfo.signature}
                style={styles.signature}
              />
            )}
            <Text>{claim.clientInfo.name}</Text>
            <Text>Date: {format(new Date(), 'dd/MM/yyyy')}</Text>
          </View>

          {/* Lessor */}
          <View
            style={[styles.signatureBox, { borderWidth: 1, borderColor: '#3B82F6' }]}
          >
            <Text style={styles.signatureLine}>Authorized Signature</Text>
            {companyDetails.signature && (
              <Image src={companyDetails.signature} style={styles.signature} />
            )}
            <Text>{companyDetails.fullName}</Text>
            <Text>Date: {format(new Date(), 'dd/MM/yyyy')}</Text>
          </View>
        </View>

        {/* fixed footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            AIE SKYLINE LIMITED, registered in England and Wales with the
            company registration number 15616639, registered office address:
            United House, 39-41 North Road, London, N7 9DP. VAT. NO. 453448875
          </Text>
          <Text
            style={styles.pageNumber}
            render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber} of ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
};

export default NoticeOfRightToCancel;
