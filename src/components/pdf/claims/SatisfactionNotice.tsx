import React from 'react';
import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer'; 
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
  signatureSectionPositioning: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 20,
    breakInside: 'avoid',
    pageBreakInside: 'avoid',
  },
  bodyTextContainer: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#F9FAFB', 
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  infoCard: {
    borderWidth: 1,
    borderColor: '#3B82F6',   
    borderRadius: 6,
    padding: 8,
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
  },
  infoItem: {
    flex: 1,
    alignItems: 'flex-start',
    paddingHorizontal: 4,
  },
  infoLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#1E40AF',         
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 9,
    color: '#1F2937',         
  },
  paragraph: {
    fontSize: 9,
    color: '#374151',
    lineHeight: 1.4,
    marginBottom: 8,
    textAlign: 'justify',
  },
});

interface SatisfactionNoticeProps {
  claim: any; 
  companyDetails: any; 
}

const SatisfactionNotice: React.FC<SatisfactionNoticeProps> = ({
  claim,
  companyDetails,
}) => {
  // STRICT RULE: Explicitly record and display the Hire Start Date (the date the agreement commenced)
  const hireStartDateFormatted = formatHireCommencementDate(claim);

  const clientName =
    claim?.clientInfo?.name ||
    [claim?.clientInfo?.firstName, claim?.clientInfo?.lastName].filter(Boolean).join(' ') ||
    claim?.customer?.name ||
    claim?.rental?.customerName ||
    'N/A';

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

  const defaultSatisfactionText = `I, ${clientName}, hereby certify that I am fully satisfied with the services rendered for my vehicle, registration number ${vehicleReg}${vehicleMakeModel ? ` (${vehicleMakeModel})` : ''}.

The work performed has met my expectations, and I acknowledge the completion of all agreed-upon repairs/services to my satisfaction. All hire and service obligations commenced under agreement ${agreementRef} on ${hireStartDateFormatted} have been discharged with complete satisfaction.`;

  const rawNotice =
    companyDetails?.satisfactionNoticeText ||
    companyDetails?.termsAndConditions ||
    defaultSatisfactionText;

  const processedNotice = parseLegalVariables(rawNotice, {
    companyName: 'AIE Claims LTD',
    companyAddress: 'United House, 39-41 North Road, London, N7 9DP',
    companyPhone: '+442080505337',
    companyEmail: 'claims@aieclaims.co.uk',
    companyVat: companyDetails?.vatNumber || '',
    companyRegistration: '15616639',
    hirerName: clientName,
    customerName: clientName,
    vehicleReg,
    vehicleMake,
    vehicleModel,
    vehicleMakeModel,
    agreementRef,
    agreementNumber: agreementRef,
    claimRef: agreementRef,
    startDate: hireStartDateFormatted,
    hireStartDate: hireStartDateFormatted,
  });

  const paragraphs = splitParagraphs(processedNotice);

  const footerText = AIE_CLAIMS_FOOTER_TEXT;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* HEADER */}
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

        {/* Title */}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>SATISFACTION NOTICE</Text>
        </View>

        {/* Horizontal Card for Key Details */}
        <View style={localStyles.infoCard} wrap={false}>
          <View style={localStyles.infoItem}>
            <Text style={localStyles.infoLabel}>Commencement Date</Text>
            <Text style={localStyles.infoValue}>{hireStartDateFormatted}</Text>
          </View>
          <View style={localStyles.infoItem}>
            <Text style={localStyles.infoLabel}>Customer Name</Text>
            <Text style={localStyles.infoValue}>{clientName}</Text>
          </View>
          <View style={localStyles.infoItem}>
            <Text style={localStyles.infoLabel}>Vehicle Reg</Text>
            <Text style={localStyles.infoValue}>{vehicleReg}</Text>
          </View>
          <View style={localStyles.infoItem}>
            <Text style={localStyles.infoLabel}>Make &amp; Model</Text>
            <Text style={localStyles.infoValue}>{vehicleMakeModel || '-'}</Text>
          </View>
        </View>

        {/* Body Text */}
        <View style={localStyles.bodyTextContainer} wrap>
          {paragraphs.map((p, idx) => (
            <Text key={idx} style={localStyles.paragraph}>
              {p}
            </Text>
          ))}
        </View>

        {/* Signatures - strictly stamped with Hire Start Date */}
        <View style={localStyles.signatureSectionPositioning} wrap={false}>
          {/* Customer Signature */}
          <View style={[styles.signatureBox, { borderColor: '#3B82F6', borderWidth: 1 }]}>
            <Text style={styles.signatureLine}>Customer Signature</Text>
            {claim?.clientInfo?.signature && (
              <Image src={claim.clientInfo.signature} style={styles.signature} />
            )}
            <Text style={{ fontSize: 9, marginTop: 4 }}>{clientName}</Text>
            <Text style={{ fontSize: 8, color: '#4B5563', marginTop: 2 }}>
              Date: {hireStartDateFormatted}
            </Text>
          </View>

          {/* Company Representative Signature */}
          <View style={[styles.signatureBox, { borderColor: '#3B82F6', borderWidth: 1 }]}>
            <Text style={styles.signatureLine}>Company Representative Signature</Text>
            {companyDetails?.signature && (
              <Image src={companyDetails.signature} style={styles.signature} />
            )}
            <Text style={{ fontSize: 9, marginTop: 4 }}>AIE Claims LTD</Text>
            <Text style={{ fontSize: 8, color: '#4B5563', marginTop: 2 }}>
              Date: {hireStartDateFormatted}
            </Text>
          </View>
        </View>

        {/* FOOTER */}
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

export default SatisfactionNotice;
