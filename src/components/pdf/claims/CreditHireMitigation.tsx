// src/components/pdf/claims/CreditHireMitigation.tsx
import React from 'react';
import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';
import { Claim } from '../../../types';
import { styles } from '../styles';
import aieClaimsLogo from '../../../assets/aieclaim.png';
import {
  formatHireCommencementDate,
  parseLegalVariables,
  splitParagraphs,
  getVehicleDetails,
  AIE_CLAIMS_FOOTER_TEXT
} from '../../../utils/legalDocumentUtils';

const localStyles = StyleSheet.create({
  signatureSectionStyle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 20,
    breakInside: 'avoid',
    pageBreakInside: 'avoid',
  },
  refCard: {
    borderWidth: 1,
    borderColor: '#3B82F6',
    borderRadius: 6,
    padding: 10,
    marginBottom: 15,
    backgroundColor: '#F8FAFC',
  },
  refRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  refItem: {
    flex: 1,
    paddingHorizontal: 4,
  },
  refLabel: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#1E40AF',
    textTransform: 'uppercase',
  },
  refValue: {
    fontSize: 9,
    color: '#1F2937',
    marginTop: 1,
  },
  paragraph: {
    fontSize: 9,
    color: '#374151',
    lineHeight: 1.4,
    marginBottom: 8,
    textAlign: 'justify',
  },
});

interface CreditHireMitigationProps {
  claim: Claim | any;
  companyDetails: any;
}

const CreditHireMitigation: React.FC<CreditHireMitigationProps> = ({
  claim,
  companyDetails,
}) => {
  const hireStartDateFormatted = formatHireCommencementDate(claim);

  // Extract client details safely
  const clientName =
    claim?.clientInfo?.name ||
    [claim?.clientInfo?.firstName, claim?.clientInfo?.lastName].filter(Boolean).join(' ') ||
    claim?.customer?.name ||
    claim?.rental?.customerName ||
    'N/A';

  const clientAddress =
    claim?.clientInfo?.address ||
    [
      claim?.clientInfo?.buildingFlat,
      claim?.clientInfo?.streetName,
      claim?.clientInfo?.townCity,
      claim?.clientInfo?.postcode
    ].filter(Boolean).join(', ') ||
    claim?.rental?.customerAddress ||
    'N/A';

  const clientPhone =
    claim?.clientInfo?.phone ||
    claim?.clientInfo?.mobile ||
    claim?.customer?.phone ||
    claim?.customer?.mobile ||
    claim?.rental?.customerPhone ||
    'N/A';

  // Extract vehicle details safely
  const vehicleDetails = getVehicleDetails(claim);
  const vehicleReg = vehicleDetails.registration;
  const vehicleMake = vehicleDetails.make;
  const vehicleModel = vehicleDetails.model;
  const vehicleMakeModel = vehicleDetails.makeModel;

  const agreementRef =
    claim?.rentalAgreementNumber ||
    claim?.clientRef ||
    claim?.claimNumber ||
    (claim?.id ? String(claim.id).slice(-8).toUpperCase() : 'N/A');

  const defaultStatement = `I, ${clientName}, confirm that I fully understand and agree to my duty to mitigate my losses, and I confirm the following to be true:

1. Explanation of Procedure: The hire company has thoroughly explained their process for recovering my credit hire losses from the at-fault party / insurer.
2. Vehicle Consideration: I have carefully considered and selected the type and specification of the hire vehicle to ensure I am mitigating my financial losses during this period.
3. Reason for Hire: I understand that this hire vehicle (${vehicleReg}) is necessary because my own vehicle is currently not fit for purpose, unroadworthy, or undergoing authorized repair due to the incident.
4. Duration of Hire: I commit to hiring this vehicle for the shortest possible duration required for my vehicle to be repaired or replaced, and I understand that this period will not exceed reasonable necessity.
5. Communication: I agree to keep ${companyDetails?.fullName || 'the Hire Company'} informed at all times of any progress or delays related to the repair or replacement of my vehicle, to ensure effective handling of my claim.
6. Responsibility for Charges: I understand and accept that I am cooperating with the recovery of all hire charges incurred under credit hire terms from the commencement of the hire period (${hireStartDateFormatted}).
7. Financial Capability: I confirm that I did not have immediate disposable funds available to hire a replacement vehicle on standard commercial prepaid terms without this credit hire facility.
8. Duty to Mitigate: My legal duty to keep all hire and loss expenses to a minimum has been clearly explained to me prior to entering into this agreement.
9. Acknowledgement: I have read, understood, and agree to the above statements, and I declare that all information I have provided in relation to this agreement is true and accurate.`;

  const rawStatement =
    companyDetails?.creditHireMitigationText ||
    companyDetails?.termsAndConditions ||
    defaultStatement;

  const processedStatement = parseLegalVariables(rawStatement, {
    companyName: 'AIE Claims LTD',
    companyAddress: 'United House, 39-41 North Road, London, N7 9DP',
    companyPhone: '+442080505337',
    companyEmail: 'claims@aieclaims.co.uk',
    companyVat: companyDetails?.vatNumber || '',
    companyRegistration: '15616639',
    hirerName: clientName,
    customerName: clientName,
    hirerAddress: clientAddress,
    customerAddress: clientAddress,
    hirerPhone: clientPhone,
    vehicleReg: vehicleReg,
    vehicleMake: vehicleMake,
    vehicleModel: vehicleModel,
    vehicleMakeModel: vehicleMakeModel,
    agreementNumber: agreementRef,
    agreementRef: agreementRef,
    claimRef: agreementRef,
    startDate: hireStartDateFormatted,
    hireStartDate: hireStartDateFormatted,
  });

  const paragraphs = splitParagraphs(processedStatement);

  const footerText = AIE_CLAIMS_FOOTER_TEXT;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* HEADER - fixed across all pages */}
        <View style={styles.header} fixed>
          <View style={styles.headerLeft}>
            <Image src={aieClaimsLogo} style={styles.logo} />
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.companyName}>AIE Claims LTD</Text>
            <Text style={styles.companyDetail}>United House, 39-41 North Road, London, N7 9DP</Text>
            <Text style={styles.companyDetail}>Tel: +442080505337</Text>
            <Text style={styles.companyDetail}>Email: claims@aieclaims.co.uk</Text>
          </View>
        </View>

        {/* TITLE */}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>
            CREDIT HIRE MITIGATION OF LOSS / STATEMENT OF TRUTH
          </Text>
        </View>

        {/* KEY REFERENCE CARD */}
        <View style={localStyles.refCard} wrap={false}>
          <View style={localStyles.refRow}>
            <View style={localStyles.refItem}>
              <Text style={localStyles.refLabel}>Agreement Ref</Text>
              <Text style={localStyles.refValue}>{agreementRef}</Text>
            </View>
            <View style={localStyles.refItem}>
              <Text style={localStyles.refLabel}>Hire Start Date</Text>
              <Text style={localStyles.refValue}>{hireStartDateFormatted}</Text>
            </View>
            <View style={localStyles.refItem}>
              <Text style={localStyles.refLabel}>Vehicle Reg</Text>
              <Text style={localStyles.refValue}>{vehicleReg}</Text>
            </View>
            <View style={localStyles.refItem}>
              <Text style={localStyles.refLabel}>Make &amp; Model</Text>
              <Text style={localStyles.refValue}>{vehicleMakeModel || '-'}</Text>
            </View>
          </View>
          <View style={localStyles.refRow}>
            <View style={localStyles.refItem}>
              <Text style={localStyles.refLabel}>Hirer Name</Text>
              <Text style={localStyles.refValue}>{clientName}</Text>
            </View>
            <View style={[localStyles.refItem, { flex: 2 }]}>
              <Text style={localStyles.refLabel}>Hirer Address</Text>
              <Text style={localStyles.refValue}>{clientAddress}</Text>
            </View>
          </View>
        </View>

        {/* STATEMENT AND DECLARATION */}
        <View style={{ marginBottom: 15 }} wrap>
          <Text style={styles.sectionTitle}>STATEMENT AND DECLARATION</Text>
          {paragraphs.map((p, idx) => (
            <Text key={idx} style={localStyles.paragraph}>
              {p}
            </Text>
          ))}
        </View>

        {/* SIGNATURES - Stamped with Hire Start Date */}
        <View style={localStyles.signatureSectionStyle} wrap={false}>
          <View style={[styles.signatureBox, { borderWidth: 1, borderColor: '#3B82F6' }]}>
            <Text style={styles.signatureLine}>Hirer’s Signature</Text>
            {claim?.clientInfo?.signature && (
              <Image src={claim.clientInfo.signature} style={styles.signature} />
            )}
            <Text style={{ fontSize: 9, marginTop: 4 }}>{clientName}</Text>
            <Text style={{ fontSize: 8, color: '#4B5563', marginTop: 2 }}>
              Date: {hireStartDateFormatted}
            </Text>
          </View>

          <View style={[styles.signatureBox, { borderWidth: 1, borderColor: '#3B82F6' }]}>
            <Text style={styles.signatureLine}>
              Authorized Signature (for Hire Company)
            </Text>
            {companyDetails?.signature && (
              <Image src={companyDetails.signature} style={styles.signature} />
            )}
            <Text style={{ fontSize: 9, marginTop: 4 }}>AIE Claims LTD</Text>
            <Text style={{ fontSize: 8, color: '#4B5563', marginTop: 2 }}>
              Date: {hireStartDateFormatted}
            </Text>
          </View>
        </View>

        {/* FOOTER - fixed across all pages */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>{footerText}</Text>
          <Text
            style={styles.pageNumber}
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
};

export default CreditHireMitigation;
