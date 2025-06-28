// src/components/pdf/documents/ConditionOfHire.tsx
import React from 'react';
import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';
import { Claim } from '../../../types';
import { styles } from '../styles';
import { format } from 'date-fns';
import logo from '../../../assets/logo.png';

const localStyles = StyleSheet.create({
  // Removed absolute positioning. This style now controls spacing and page breaking for the signature block.
  signatureSectionStyle: { // Renamed for clarity and consistency
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20, // Space above the signature section
    marginBottom: 20, // Space before the fixed footer
    breakInside: 'avoid', // Ensure the entire signature section stays together
    pageBreakInside: 'avoid', // Prevent page breaks within the signature section itself
  },
});

interface ConditionOfHireProps {
  claim: Claim;
  companyDetails: any;
}

const ConditionOfHire: React.FC<ConditionOfHireProps> = ({ claim, companyDetails }) => {
  const defaultTerms = `(a) For the purpose of this agreement AIE SKYLINE LTD is referred to as the lessor.

(b) "The Hirer" means the person, firm or organisation by or on behalf of whom this agreement is signed.
(c) The Hirer shall take full responsibility for the hired vehicle during the hire period.
(d) The Hirer shall ensure the vehicle is used in a lawful manner and is properly maintained during the hire period.
(e) The Hirer is responsible for all fines, penalties, and legal costs incurred during the hire period.
(f) The Hirer must return the vehicle in the same condition as received, reasonable wear and tear excepted.
(g) In case of breakdown or accident, the Hirer must immediately notify the Lessor.
(h) The Lessor reserves the right to terminate the agreement and repossess the vehicle at any time if the Hirer breaches any terms.
(i) The Hirer shall be liable for any loss or damage to the vehicle, including theft, fire, or accident, regardless of fault.
(j) The Hirer must possess a valid driving license for the entire hire period.
(k) The vehicle must not be used for racing, rallying, or any illegal purposes.
(l) The vehicle must not be taken outside the agreed geographical area without prior written consent from the Lessor.
(m) The Hirer is responsible for checking fluid levels, tyre pressure, and general roadworthiness daily.
(n) Any repairs or maintenance required due to Hirer's negligence will be charged to the Hirer.
(o) The Lessor is not liable for any loss or damage to property left in the vehicle.
(p) The Hirer must inform the Lessor of any change of address or contact details during the hire period.
(q) The Hirer agrees to pay all charges on demand. Overdue payments may incur additional fees.
(r) The Lessor may use personal data provided by the Hirer for the purpose of this agreement and for legal compliance.
(s) This agreement is governed by the laws of England and Wales.`; // Added more default text to demonstrate multi-page flow

  return (
    <Document>
      {/* Revert to a single Page component to allow content to flow naturally */}
      <Page size="A4" style={styles.page}>
        {/* HEADER - fixed on all pages */}
        <View style={styles.header} fixed>
          <View style={styles.headerLeft}>
            <Image src={logo} style={styles.logo} />
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.companyName}>{companyDetails.fullName}</Text>
            <Text style={styles.companyDetail}>{companyDetails.officialAddress}</Text>
            <Text style={styles.companyDetail}>Tel: {companyDetails.phone}</Text>
            <Text style={styles.companyDetail}>Email: {companyDetails.email}</Text>
          </View>
        </View>

        {/* TITLE */}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>CONDITION OF HIRE</Text>
        </View>

        {/* TERMS AND CONDITIONS - This section will now naturally flow to new pages if content is too long */}
        <View
          style={{
            marginBottom: 20,
            // These properties are good for allowing content to break naturally
            breakInside: 'auto',
            pageBreakInside: 'auto',
          }}
          wrap // Allows this View's content to span multiple pages
        >
          <Text style={styles.sectionTitle}>TERMS AND CONDITIONS</Text>
          <Text style={styles.text}>
            {companyDetails.conditionOfHireText || defaultTerms}
          </Text>
        </View>

        {/* SIGNATURES - now part of the normal document flow, placed directly after content */}
        <View style={localStyles.signatureSectionStyle} wrap={false}>
          {/* Hirer’s Signature */}
          <View style={[styles.signatureBox, { borderColor: '#3B82F6', borderWidth: 1 }]}>
            <Text style={styles.signatureLine}>Hirer’s Signature</Text>
            {claim.clientInfo.signature && (
              <Image src={claim.clientInfo.signature} style={styles.signature} />
            )}
            <Text>{claim.clientInfo.name}</Text>
            <Text>Date: {format(new Date(), 'dd/MM/yyyy')}</Text>
          </View>

          {/* Authorized Signature */}
          <View style={[styles.signatureBox, { borderColor: '#3B82F6', borderWidth: 1 }]}>
            <Text style={styles.signatureLine}>Authorized Signature</Text>
            {companyDetails.signature && (
              <Image src={companyDetails.signature} style={styles.signature} />
            )}
            <Text>{companyDetails.fullName}</Text>
            <Text>Date: {format(new Date(), 'dd/MM/yyyy')}</Text>
          </View>
        </View>

        {/* FOOTER - fixed on all pages */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            AIE SKYLINE LIMITED, registered in England and Wales with the company registration number 15616639, registered office address: United House, 39-41 North Road, London, N7 9DP. VAT. NO. 453448875
          </Text>
          <Text
            style={styles.pageNumber}
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
};

export default ConditionOfHire;