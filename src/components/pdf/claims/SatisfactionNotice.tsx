import React from 'react';
import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer'; 
import { styles } from '../styles';
import aieClaimsLogo from '../../../assets/aieclaim.png';
import SafePdfLogo from '../SafePdfLogo';
import { isValidPdfImageSrc } from '../../../utils/safePdfImage';
import {
  formatHireCommencementDate,
  parseLegalVariables,
  splitParagraphs,
  getVehicleDetails,
  AIE_CLAIMS_FOOTER_TEXT,
  extractActiveCorporateEntityProfile,
  getCompanyBrandingForPdf
} from '../../../utils/legalDocumentUtils';
import { resolveClaimDocumentTerms } from '../../../utils/documentTemplateTerms';
import PdfTermsWarningNotice from './PdfTermsWarningNotice';

const localStyles = StyleSheet.create({
  signatureSectionPositioning: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 0,
    breakInside: 'avoid',
    pageBreakInside: 'avoid',
    flexGrow: 0,
    minPresenceAhead: 150,
  },
  bodyTextContainer: {
    marginBottom: 10,
    padding: 10,
    backgroundColor: '#F9FAFB', 
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  infoCard: {
    borderWidth: 1,
    borderColor: '#3B82F6',   
    borderRadius: 6,
    padding: 7,
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  infoItem: {
    flex: 1,
    alignItems: 'flex-start',
    paddingHorizontal: 4,
  },
  infoLabel: {
    fontSize: 8.5,
    fontWeight: 'bold',
    color: '#1E40AF',         
    marginBottom: 1,
  },
  infoValue: {
    fontSize: 8.5,
    color: '#1F2937',         
  },
  paragraph: {
    fontSize: 9,
    color: '#374151',
    lineHeight: 1.35,
    marginBottom: 4.5,
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

  // Strict Dynamic T&C Resolution: Pulls Satisfaction Notice clauses directly from Claims tab
  const termsResolution = resolveClaimDocumentTerms('satisfactionNotice', companyDetails);

  const branding = getCompanyBrandingForPdf(companyDetails, 'aie_claims');
  const activeCompanyProfile = extractActiveCorporateEntityProfile({
    ...companyDetails,
    ...claim?.rental,
    corporateEntityKey: claim?.rental?.corporateEntityKey || claim?.corporateEntityKey,
    corporateEntityName: claim?.rental?.corporateEntityName || claim?.corporateEntityName,
  });
  const resolvedCompanyName =
    claim?.rental?.corporateEntityName ||
    claim?.corporateEntityName ||
    activeCompanyProfile.companyName ||
    branding.companyName;
  const resolvedCompanyReg =
    activeCompanyProfile.companyNumber ||
    companyDetails?.registrationNumber ||
    '15616639';
  const resolvedCompanyVat =
    activeCompanyProfile.vatNumber ||
    companyDetails?.vatNumber ||
    '453448875';
  const resolvedCompanyAddress =
    activeCompanyProfile.companyAddress ||
    companyDetails?.officialAddress ||
    branding.companyAddress;

  const processedNotice = termsResolution.isConfigured
    ? parseLegalVariables(termsResolution.content, {
        company_name: resolvedCompanyName,
        companyName: resolvedCompanyName,
        claims_team: activeCompanyProfile.claimsTeam,
        claimsTeam: activeCompanyProfile.claimsTeam,
        website: activeCompanyProfile.website || branding.website,
        company_website: activeCompanyProfile.website || branding.website,
        companyWebsite: activeCompanyProfile.website || branding.website,
        company_phone: activeCompanyProfile.phone || branding.companyPhone || '+442080505337',
        companyPhone: activeCompanyProfile.phone || branding.companyPhone || '+442080505337',
        company_email: activeCompanyProfile.email || branding.companyEmail || 'claims@aieclaims.co.uk',
        companyEmail: activeCompanyProfile.email || branding.companyEmail || 'claims@aieclaims.co.uk',
        company_number: resolvedCompanyReg,
        companyRegistration: resolvedCompanyReg,
        company_address: resolvedCompanyAddress,
        companyAddress: resolvedCompanyAddress,
        vat_number: resolvedCompanyVat,
        companyVat: resolvedCompanyVat,
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
      })
    : '';

  const paragraphs = splitParagraphs(processedNotice);
  const footerText = branding.footerText || AIE_CLAIMS_FOOTER_TEXT;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* HEADER */}
        <View style={styles.header} fixed>
          <View style={styles.headerLeft}>
            <SafePdfLogo src={branding.companyLogo || aieClaimsLogo} companyName={resolvedCompanyName} style={styles.logo} />
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.companyName}>{resolvedCompanyName}</Text>
            <Text style={styles.companyDetail}>{resolvedCompanyAddress}</Text>
            <Text style={styles.companyDetail}>Tel: {activeCompanyProfile.phone || branding.companyPhone || '+442080505337'}</Text>
            <Text style={styles.companyDetail}>Email: {activeCompanyProfile.email || branding.companyEmail || 'claims@aieclaims.co.uk'}</Text>
            {Boolean(activeCompanyProfile.website || branding.website) && (
              <Text style={styles.companyDetail}>Web: {activeCompanyProfile.website || branding.website}</Text>
            )}
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
        <View style={localStyles.bodyTextContainer} wrap={true}>
          {termsResolution.isConfigured ? (
            paragraphs.map((p, idx) => (
              <Text key={idx} wrap={true} style={localStyles.paragraph}>
                {p}
              </Text>
            ))
          ) : (
            <PdfTermsWarningNotice message={termsResolution.warningMessage} />
          )}
        </View>

        {/* Signatures - strictly stamped with Hire Start Date */}
        <View style={localStyles.signatureSectionPositioning} wrap={false} minPresenceAhead={150}>
          {/* Customer Signature */}
          <View style={[styles.signatureBox, { borderColor: '#3B82F6', borderWidth: 1 }]}>
            <Text style={styles.signatureLine}>Customer Signature</Text>
            {isValidPdfImageSrc(claim?.clientInfo?.signature) && (
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
            {isValidPdfImageSrc(companyDetails?.signature) && (
              <Image src={companyDetails.signature} style={styles.signature} />
            )}
            <Text style={{ fontSize: 9, marginTop: 4 }}>{resolvedCompanyName}</Text>
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
