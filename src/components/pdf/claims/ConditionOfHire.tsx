// src/components/pdf/claims/ConditionOfHire.tsx
import React from 'react';
import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';
import { Claim } from '../../../types';
import { styles } from '../styles';
import aieClaimsLogo from '../../../assets/aieclaim.png';
import SafePdfLogo from '../SafePdfLogo';
import { isValidPdfImageSrc } from '../../../utils/safePdfImage';
import {
  getHireCommencementDate,
  formatHireCommencementDate,
  parseLegalVariables,
  splitParagraphs,
  getVehicleDetails,
  AIE_CLAIMS_FOOTER_TEXT,
  getCompanyBrandingForPdf,
  extractActiveCorporateEntityProfile,
} from '../../../utils/legalDocumentUtils';
import { resolveClaimDocumentTerms } from '../../../utils/documentTemplateTerms';
import PdfTermsWarningNotice from './PdfTermsWarningNotice';

const localStyles = StyleSheet.create({
  signatureSectionStyle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 0,
    breakInside: 'avoid',
    pageBreakInside: 'avoid',
    flexGrow: 0,
    minPresenceAhead: 150,
  },
  refCard: {
    borderWidth: 1,
    borderColor: '#3B82F6',
    borderRadius: 6,
    padding: 8,
    marginBottom: 10,
    backgroundColor: '#F8FAFC',
  },
  refRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
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
    fontSize: 8.5,
    color: '#1F2937',
    marginTop: 1,
  },
  paragraph: {
    fontSize: 9,
    color: '#374151',
    lineHeight: 1.35,
    marginBottom: 4.5,
    textAlign: 'justify',
  },
});

interface ConditionOfHireProps {
  claim: Claim | any;
  companyDetails: any;
}

const ConditionOfHire: React.FC<ConditionOfHireProps> = ({ claim, companyDetails }) => {
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

  const driverLicense =
    claim?.clientInfo?.driverLicenseNumber ||
    claim?.customer?.driverLicenseNumber ||
    claim?.rental?.driverLicenseNumber ||
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

  const claimRate =
    claim?.hireDetails?.claimRate ??
    claim?.hireDetails?.vehicle?.claimRate ??
    claim?.rental?.lockedClaimRate ??
    claim?.rental?.claimRentalPrice ??
    340;

  // Strict Dynamic T&C Resolution: Pulls Condition of Hire clauses directly from Claims tab
  const termsResolution = resolveClaimDocumentTerms('conditionOfHire', companyDetails);

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

  // Dynamically interpolate template variables if configured
  const processedTerms = termsResolution.isConfigured
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
        dailyRate: `£${Number(claimRate).toFixed(2)}`,
      })
    : '';

  const paragraphs = splitParagraphs(processedTerms);
  const footerText = branding.footerText;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* HEADER - fixed on all pages */}
        <View style={styles.header} fixed>
          <View style={styles.headerLeft}>
            <SafePdfLogo
              src={branding.companyLogo || aieClaimsLogo}
              companyName={resolvedCompanyName}
              style={styles.logo}
            />
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

        {/* TITLE */}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>CONDITION OF HIRE</Text>
        </View>

        {/* KEY REFERENCE PARAMETERS CARD */}
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
              <Text style={localStyles.refLabel}>Daily Claim Rate</Text>
              <Text style={localStyles.refValue}>£{Number(claimRate).toFixed(2)} / day</Text>
            </View>
          </View>
          <View style={localStyles.refRow}>
            <View style={localStyles.refItem}>
              <Text style={localStyles.refLabel}>Hirer Name</Text>
              <Text style={localStyles.refValue}>{clientName}</Text>
            </View>
            <View style={localStyles.refItem}>
              <Text style={localStyles.refLabel}>Driving License</Text>
              <Text style={localStyles.refValue}>{driverLicense}</Text>
            </View>
          </View>
          <View style={localStyles.refRow}>
            <View style={[localStyles.refItem, { flex: 1 }]}>
              <Text style={localStyles.refLabel}>Hirer Address</Text>
              <Text style={localStyles.refValue}>{clientAddress}</Text>
            </View>
          </View>
          <View style={localStyles.refRow}>
            <View style={localStyles.refItem}>
              <Text style={localStyles.refLabel}>Vehicle Reg</Text>
              <Text style={localStyles.refValue}>{vehicleReg}</Text>
            </View>
            <View style={localStyles.refItem}>
              <Text style={localStyles.refLabel}>Vehicle Make</Text>
              <Text style={localStyles.refValue}>{vehicleMake || '-'}</Text>
            </View>
            <View style={localStyles.refItem}>
              <Text style={localStyles.refLabel}>Vehicle Model</Text>
              <Text style={localStyles.refValue}>{vehicleModel || '-'}</Text>
            </View>
          </View>
        </View>

        {/* TERMS AND CONDITIONS */}
        <View style={{ marginBottom: 10 }} wrap={true}>
          <Text style={styles.sectionTitle}>{termsResolution.title || 'TERMS AND CONDITIONS'}</Text>
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

        {/* SIGNATURES - Strictly stamped with Hire Start Date */}
        <View style={localStyles.signatureSectionStyle} wrap={false} minPresenceAhead={150}>
          {/* Hirer’s Signature */}
          <View style={[styles.signatureBox, { borderColor: '#3B82F6', borderWidth: 1 }]}>
            <Text style={styles.signatureLine}>Hirer’s Signature</Text>
            {isValidPdfImageSrc(claim?.clientInfo?.signature) && (
              <Image src={claim.clientInfo.signature} style={styles.signature} />
            )}
            <Text style={{ fontSize: 9, marginTop: 4 }}>{clientName}</Text>
            <Text style={{ fontSize: 8, color: '#4B5563', marginTop: 2 }}>
              Date: {hireStartDateFormatted}
            </Text>
          </View>

          {/* Authorized Signature */}
          <View style={[styles.signatureBox, { borderColor: '#3B82F6', borderWidth: 1 }]}>
            <Text style={styles.signatureLine}>Authorized Signature</Text>
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

export default ConditionOfHire;
