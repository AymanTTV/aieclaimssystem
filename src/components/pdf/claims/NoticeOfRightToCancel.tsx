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
import aieClaimsLogo from '../../../assets/aieclaim.png';
import SafePdfLogo from '../SafePdfLogo';
import {
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

interface NoticeOfRightToCancelProps {
  claim?: Claim | any;
  companyDetails: any;
}

const localStyles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 65,
    paddingHorizontal: 36,
    fontSize: 8.5,
    fontFamily: 'Helvetica',
    backgroundColor: '#FFFFFF',
    lineHeight: 1.4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 8,
  },
  titleContainer: {
    borderBottomWidth: 2,
    borderBottomColor: '#3B82F6',
    marginBottom: 10,
    paddingBottom: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#0F172A',
    letterSpacing: 0.5,
  },
  refCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 4,
    paddingVertical: 5,
    paddingHorizontal: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    breakInside: 'avoid',
  },
  refCol: {
    flex: 1,
  },
  refLabel: {
    fontSize: 7.5,
    fontWeight: 'bold',
    color: '#475569',
    marginBottom: 1,
  },
  refValue: {
    fontSize: 8.5,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  termsContainer: {
    marginBottom: 10,
  },
  sectionHeading: {
    fontSize: 9.5,
    fontWeight: 'bold',
    color: '#1E3A8A',
    marginTop: 6,
    marginBottom: 3,
    breakInside: 'avoid',
  },
  paragraph: {
    fontSize: 8.5,
    color: '#334155',
    lineHeight: 1.35,
    marginBottom: 4,
    textAlign: 'justify',
  },
  cancellationSlipContainer: {
    marginTop: 8,
    marginBottom: 0,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#94A3B8',
    borderRadius: 4,
    backgroundColor: '#FAFAFA',
    padding: 8,
    breakInside: 'avoid',
    pageBreakInside: 'avoid',
    flexGrow: 0,
    minPresenceAhead: 150,
  },
  slipHeader: {
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 4,
    marginBottom: 5,
  },
  slipTitle: {
    fontSize: 9.5,
    fontWeight: 'bold',
    color: '#0F172A',
    textAlign: 'center',
  },
  slipSubtitle: {
    fontSize: 7.5,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 1,
  },
  slipBody: {
    marginTop: 3,
  },
  slipText: {
    fontSize: 8,
    color: '#334155',
    lineHeight: 1.35,
    marginBottom: 2,
  },
  slipDetailsGrid: {
    marginTop: 4,
    marginBottom: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 3,
    padding: 5,
  },
  slipRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  slipFieldLabel: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#475569',
    width: 90,
  },
  slipFieldValue: {
    fontSize: 8,
    color: '#0F172A',
    flex: 1,
  },
  slipSignatureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  slipSigCol: {
    flex: 1,
  },
  slipSigLabel: {
    fontSize: 8,
    color: '#475569',
  },
});

const NoticeOfRightToCancel: React.FC<NoticeOfRightToCancelProps> = ({
  claim,
  companyDetails,
}) => {
  const hirerName =
    claim?.clientInfo?.name ||
    claim?.rental?.customerName ||
    'N/A';

  const hirerAddress =
    claim?.clientInfo?.address ||
    claim?.rental?.customerAddress ||
    'N/A';

  const vehicleDetails = getVehicleDetails(claim);
  const vehicleReg = vehicleDetails.registration;
  const vehicleMake = vehicleDetails.make;
  const vehicleModel = vehicleDetails.model;
  const vehicleMakeModel = vehicleDetails.makeModel;

  const agreementRef =
    claim?.rental?.rentalAgreementNumber
      ? `#${claim.rental.rentalAgreementNumber}`
      : claim?.rentalAgreementNumber
      ? `#${claim.rentalAgreementNumber}`
      : claim?.claimNumber || (claim?.id ? claim.id.slice(-8) : 'N/A');

  const dateIssued = formatHireCommencementDate(claim);

  const branding = getCompanyBrandingForPdf(companyDetails, 'aie_claims');
  const activeCompanyProfile = extractActiveCorporateEntityProfile({
    ...companyDetails,
    ...claim?.rental,
    corporateEntityKey: claim?.rental?.corporateEntityKey || claim?.corporateEntityKey,
    corporateEntityName: claim?.rental?.corporateEntityName || claim?.corporateEntityName,
  });
  const companyName = activeCompanyProfile.companyName || branding.companyName;
  const companyAddress = activeCompanyProfile.companyAddress || branding.companyAddress;
  const companyPhone = activeCompanyProfile.phone || branding.companyPhone;
  const companyEmail = activeCompanyProfile.email || branding.companyEmail;
  const companyWebsite = activeCompanyProfile.website || branding.website;
  const companyLogo = branding.companyLogo;
  const footerText = branding.footerText || AIE_CLAIMS_FOOTER_TEXT;

  // Strict Dynamic T&C Resolution: Pulls Right to Cancel clauses directly from Claims tab
  const termsResolution = resolveClaimDocumentTerms('noticeOfRightToCancel', companyDetails);

  const processedNotice = termsResolution.isConfigured
    ? parseLegalVariables(termsResolution.content, {
        company_name: companyName,
        companyName,
        claims_team: activeCompanyProfile.claimsTeam,
        claimsTeam: activeCompanyProfile.claimsTeam,
        website: companyWebsite,
        company_website: companyWebsite,
        companyWebsite,
        company_phone: companyPhone,
        companyPhone,
        company_email: companyEmail,
        companyEmail,
        company_address: companyAddress,
        companyAddress,
        company_number: activeCompanyProfile.companyNumber || companyDetails?.registrationNumber || '',
        companyRegistration: activeCompanyProfile.companyNumber || companyDetails?.registrationNumber || '',
        vat_number: activeCompanyProfile.vatNumber || companyDetails?.vatNumber || '',
        companyVat: activeCompanyProfile.vatNumber || companyDetails?.vatNumber || '',
        hirerName,
        customerName: hirerName,
        hirerAddress,
        customerAddress: hirerAddress,
        vehicleReg,
        vehicleMake,
        vehicleModel,
        vehicleMakeModel,
        agreementRef,
        agreementNumber: agreementRef,
        dateIssued,
        startDate: dateIssued,
        hireStartDate: dateIssued,
      })
    : '';

  const paragraphs = splitParagraphs(processedNotice);

  const isHeading = (text: string) =>
    /^[0-9]+\.\s+/.test(text) ||
    /^(NOTICE OF RIGHT TO CANCEL|CANCELLATION RIGHTS|RIGHT TO CANCEL)/i.test(
      text
    ) ||
    (text.length < 50 && text.endsWith(':'));

  return (
    <Document>
      <Page size="A4" style={localStyles.page}>
        {/* Fixed Header on all pages */}
        <View style={localStyles.header} fixed>
          <View style={styles.headerLeft}>
            <SafePdfLogo src={companyLogo} companyName={companyName} style={styles.logo} />
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.companyName}>{companyName || 'AIE Skyline Limited'}</Text>
            <Text style={styles.companyDetail}>{companyAddress || 'United House, 39-41 North Road, London, N7 9DP'}</Text>
            <Text style={styles.companyDetail}>Tel: {companyPhone || '+442080505337'}</Text>
            <Text style={styles.companyDetail}>Email: {companyEmail || 'claims@aieclaims.co.uk'}</Text>
            {Boolean(companyWebsite) && (
              <Text style={styles.companyDetail}>Web: {companyWebsite}</Text>
            )}
          </View>
        </View>

        {/* Title */}
        <View style={localStyles.titleContainer}>
          <Text style={localStyles.title}>
            NOTICE OF RIGHT TO CANCEL CONTRACT
          </Text>
        </View>

        {/* Reference Information Bar */}
        <View style={localStyles.refCard}>
          <View style={localStyles.refCol}>
            <Text style={localStyles.refLabel}>Hirer Name:</Text>
            <Text style={localStyles.refValue}>{hirerName}</Text>
          </View>
          <View style={localStyles.refCol}>
            <Text style={localStyles.refLabel}>Vehicle Reg:</Text>
            <Text style={localStyles.refValue}>{vehicleReg}</Text>
          </View>
          <View style={localStyles.refCol}>
            <Text style={localStyles.refLabel}>Vehicle Make / Model:</Text>
            <Text style={localStyles.refValue}>{vehicleMakeModel || '-'}</Text>
          </View>
          <View style={localStyles.refCol}>
            <Text style={localStyles.refLabel}>Agreement Ref:</Text>
            <Text style={localStyles.refValue}>{agreementRef}</Text>
          </View>
          <View style={localStyles.refCol}>
            <Text style={localStyles.refLabel}>Date Issued:</Text>
            <Text style={localStyles.refValue}>{dateIssued}</Text>
          </View>
        </View>

        {/* Body Text / Terms (Naturally wraps across pages) */}
        <View style={localStyles.termsContainer} wrap={true}>
          {termsResolution.isConfigured ? (
            paragraphs.map((para: string, idx: number) => {
              if (isHeading(para)) {
                return (
                  <Text key={idx} wrap={true} style={localStyles.sectionHeading}>
                    {para}
                  </Text>
                );
              }
              return (
                <Text key={idx} wrap={true} style={localStyles.paragraph}>
                  {para}
                </Text>
              );
            })
          ) : (
            <PdfTermsWarningNotice message={termsResolution.warningMessage} />
          )}
        </View>

        {/* Detachable Cancellation Notice Slip */}
        <View style={localStyles.cancellationSlipContainer} wrap={false} minPresenceAhead={150}>
          <View style={localStyles.slipHeader}>
            <Text style={localStyles.slipTitle}>CANCELLATION NOTICE SLIP</Text>
            <Text style={localStyles.slipSubtitle}>
              (Complete and return this form ONLY IF YOU WISH TO CANCEL THE
              CONTRACT)
            </Text>
          </View>
          <View style={localStyles.slipBody}>
            <Text style={localStyles.slipText}>
              To:{' '}
              <Text style={{ fontWeight: 'bold' }}>{companyName}</Text>,{' '}
              {companyAddress}
            </Text>
            <Text style={localStyles.slipText}>
              Email: {companyEmail} | Tel: {companyPhone}
              {Boolean(companyWebsite) && ` | Web: ${companyWebsite}`}
            </Text>
            <Text style={[localStyles.slipText, { marginTop: 3 }]}>
              I/We hereby give notice that I/we wish to cancel my/our credit
              agreement / vehicle hire contract.
            </Text>

            <View style={localStyles.slipDetailsGrid}>
              <View style={localStyles.slipRow}>
                <Text style={localStyles.slipFieldLabel}>Agreement Ref:</Text>
                <Text style={localStyles.slipFieldValue}>{agreementRef}</Text>
              </View>
              <View style={localStyles.slipRow}>
                <Text style={localStyles.slipFieldLabel}>Vehicle Reg:</Text>
                <Text style={localStyles.slipFieldValue}>{vehicleReg}</Text>
              </View>
              <View style={localStyles.slipRow}>
                <Text style={localStyles.slipFieldLabel}>Vehicle Make / Model:</Text>
                <Text style={localStyles.slipFieldValue}>{vehicleMakeModel || '-'}</Text>
              </View>
              <View style={localStyles.slipRow}>
                <Text style={localStyles.slipFieldLabel}>Hirer Name:</Text>
                <Text style={localStyles.slipFieldValue}>{hirerName}</Text>
              </View>
              <View style={localStyles.slipRow}>
                <Text style={localStyles.slipFieldLabel}>Hirer Address:</Text>
                <Text style={localStyles.slipFieldValue}>{hirerAddress}</Text>
              </View>
            </View>

            <View style={localStyles.slipSignatureRow}>
              <View style={localStyles.slipSigCol}>
                <Text style={localStyles.slipSigLabel}>
                  Hirer Signature: _______________________
                </Text>
              </View>
              <View style={localStyles.slipSigCol}>
                <Text style={localStyles.slipSigLabel}>
                  Date: {dateIssued}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Fixed Footer across all pages */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            {footerText}
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
