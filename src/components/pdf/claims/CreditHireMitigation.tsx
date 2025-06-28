// src/components/pdf/claims/CreditHireMitigation.tsx
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
import logo from '../../../assets/logo.png'; // Assuming logo is imported and used, although it comes from companyDetails.logoUrl

// Local styles for positioning the signature section
const localStyles = StyleSheet.create({
  // Removed absolute positioning. This style now controls spacing and page breaking for the signature block.
  signatureSectionStyle: { // Renamed for clarity and consistency
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20, // Adjust as needed for spacing after the content
    marginBottom: 20, // Space before the fixed footer
    breakInside: 'avoid', // Ensure the entire signature section stays together
    pageBreakInside: 'avoid', // Prevent page breaks within the signature section itself
  },
});

interface CreditHireMitigationProps {
  claim: Claim;
  companyDetails: {
    logoUrl?: string;
    fullName: string;
    officialAddress: string;
    phone: string;
    email: string;
    registrationNumber?: string;
    creditHireMitigationText?: string;
    signature?: string;
  };
}

const CreditHireMitigation: React.FC<CreditHireMitigationProps> = ({
  claim,
  companyDetails,
}) => {
  const defaultStatement = `
I, ${claim.clientInfo?.name || '____________________'}, confirm that I fully understand and agree to my duty to mitigate my losses, and I confirm the following to be true:

1.  **Explanation of Procedure:** The hire company has thoroughly explained their process for recovering my credit hire losses.
2.  **Vehicle Consideration:** I have carefully considered and selected the type and specification of the hire vehicle to ensure I am mitigating my financial losses during this period.
3.  **Reason for Hire:** I understand that this hire vehicle is necessary because my own vehicle, registration number ${claim.clientVehicle?.registration || '____________________'}, is currently not fit for purpose or roadworthy due to the incident.
4.  **Duration of Hire:** I commit to hiring this vehicle for the shortest possible duration required for my vehicle to be repaired or replaced, and I understand that this period will not exceed 3 months without further review.
5.  **Communication:** I agree to keep ${companyDetails.fullName} informed at all times of any progress or delays related to the repair or replacement of my vehicle, to ensure effective handling of my claim.
6.  **Responsibility for Charges:** I understand and accept that I am ultimately responsible for all hire charges if they remain unpaid after 340 days from the commencement of the hire period.
7.  **Financial Capability:** I confirm that I currently do not have the necessary funds available to repair or replace my vehicle without this credit hire facility.
8.  **Duty to Mitigate:** My duty to keep my losses to a minimum has been clearly explained to me prior to entering into this hire agreement.
9.  **Acknowledgement:** I have read, understood, and agree to the above statements, and I believe that all information I have provided in relation to this agreement is true and accurate.
`.trim();

  const statementText = companyDetails.creditHireMitigationText
    ? companyDetails.creditHireMitigationText.trim()
    : defaultStatement;

  return (
    <Document>
      {/* Revert to a single Page component to allow content to flow naturally */}
      <Page size="A4" style={styles.page}>
        {/* HEADER - fixed across all pages */}
        <View style={styles.header} fixed>
          <View style={styles.headerLeft}>
            {companyDetails.logoUrl ? (
              <Image src={companyDetails.logoUrl} style={styles.logo} />
            ) : (
              <Text style={styles.companyName}>{companyDetails.fullName}</Text>
            )}
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

        {/* TITLE */}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>
            CREDIT HIRE MITIGATION OF LOSS / STATEMENT OF TRUTH
          </Text>
        </View>

        {/* STATEMENT */}
        <View style={{ marginBottom: 20 }}>
          <Text style={styles.sectionTitle}>STATEMENT AND DECLARATION</Text>
          <Text style={styles.text}>{statementText}</Text>
        </View>

        {/* SIGNATURES - now part of the normal document flow, placed directly after content */}
        <View style={localStyles.signatureSectionStyle} wrap={false}>
          <View
            style={[styles.signatureBox, { borderWidth: 1, borderColor: '#3B82F6' }]}
          >
            <Text style={styles.signatureLine}>Hirer’s Signature</Text>
            {claim.clientInfo?.signature && (
              <Image src={claim.clientInfo.signature} style={styles.signature} />
            )}
            <Text>{claim.clientInfo?.name}</Text>
            <Text>Date: {format(new Date(), 'dd/MM/yyyy')}</Text>
          </View>
          <View
            style={[styles.signatureBox, { borderWidth: 1, borderColor: '#3B82F6' }]}
          >
            <Text style={styles.signatureLine}>
              Authorized Signature (for Hire Company)
            </Text>
            {companyDetails.signature && (
              <Image src={companyDetails.signature} style={styles.signature} />
            )}
            <Text>{companyDetails.fullName}</Text>
            <Text>Date: {format(new Date(), 'dd/MM/yyyy')}</Text>
          </View>
        </View>

        {/* FOOTER - fixed across all pages */}
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

export default CreditHireMitigation;