// src/components/pdf/documents/ClaimDocument.tsx
import React from 'react';
import { Document, Page, Text, View, Image } from '@react-pdf/renderer';
import { Claim } from '../../../types';
import { formatDate } from '../../../utils/dateHelpers';
import { styles } from '../styles';
import aieClaimsLogo from '../../../assets/aieclaim.png';
import SafePdfLogo from '../SafePdfLogo';
import { formatInlineCompanyFooter, isValidPdfImageSrc, extractActiveCorporateEntityProfile } from '../../../utils/legalDocumentUtils';
import { getResolvedTermsContent } from '../../../utils/documentTemplateTerms';
import PdfTermsWarningNotice from '../claims/PdfTermsWarningNotice';

interface ClaimDocumentProps {
  data: Claim;
  companyDetails?: any;
}

const ClaimDocument: React.FC<ClaimDocumentProps> = ({ data, companyDetails }) => {
  const activeProfile = extractActiveCorporateEntityProfile({
    ...companyDetails,
    ...data?.rental,
    corporateEntityKey: data?.rental?.corporateEntityKey || (data as any)?.corporateEntityKey,
    corporateEntityName: data?.rental?.corporateEntityName || (data as any)?.corporateEntityName,
  });

  const page1Entity = companyDetails?.page1Entity || companyDetails;
  const page2Entity = companyDetails?.page2Entity || companyDetails;
  const page3Entity = companyDetails?.page3Entity || companyDetails;

  const pageMapping = companyDetails?.pageTemplateMapping;
  const page1Template = pageMapping?.page1Template || 'standard_claim_record';
  const page2Template = pageMapping?.page2Template || 'third_party_evidence_schedule';
  const page3Template = pageMapping?.page3Template || 'claim_management_terms';

  const includePage3 = pageMapping
    ? Boolean(pageMapping.includePage3 && pageMapping.page3Template !== 'none')
    : companyDetails?.includeTrailingTC !== false;

  // Dynamic entity details with resilient fallbacks
  const p1Logo = isValidPdfImageSrc(page1Entity?.logoUrl)
    ? page1Entity.logoUrl
    : isValidPdfImageSrc(companyDetails?.logoUrl)
    ? companyDetails.logoUrl
    : aieClaimsLogo;

  const p1Name = page1Entity?.fullName || page1Entity?.tradingName || activeProfile.companyName || 'AIE Claims LTD';
  const p1CustomHeader = page1Entity?.headerDisclaimer || companyDetails?.customHeaderText;
  const p1Address = page1Entity?.officialAddress || activeProfile.companyAddress || 'United House, 39-41 North Road, London, N7 9DP';
  const p1Phone = page1Entity?.phone || activeProfile.phone || '+442080505337';
  const p1Email = page1Entity?.email || activeProfile.email || 'claims@aieclaims.co.uk';
  const p1Website = page1Entity?.website || activeProfile.website || '';

  const p3Logo = isValidPdfImageSrc(page3Entity?.logoUrl)
    ? page3Entity.logoUrl
    : p1Logo;
  const p3Name = page3Entity?.fullName || page3Entity?.tradingName || p1Name;
  const p3CustomHeader = page3Entity?.headerDisclaimer || p1CustomHeader;
  const p3Address = page3Entity?.officialAddress || p1Address;
  const p3Phone = page3Entity?.phone || p1Phone;
  const p3Email = page3Entity?.email || p1Email;
  const p3Website = page3Entity?.website || p1Website;

  // Bank allocation details
  const activeBank = companyDetails?.selectedBank || {
    bankName: companyDetails?.bankName,
    accountName: companyDetails?.accountName || p1Name,
    accountNumber: companyDetails?.accountNumber,
    sortCode: companyDetails?.sortCode,
    iban: companyDetails?.iban,
  };
  const hasBankDetails = Boolean(activeBank.bankName || activeBank.accountNumber);

  // Dynamic footer text
  const p1FooterText = formatInlineCompanyFooter(
    page1Entity || { isClaim: true, fullName: p1Name, officialAddress: p1Address, phone: p1Phone, email: p1Email, website: p1Website }
  );
  const p3FooterText = formatInlineCompanyFooter(
    page3Entity || { isClaim: true, fullName: p3Name, officialAddress: p3Address, phone: p3Phone, email: p3Email, website: p3Website }
  );

  const licenseNo = data.clientInfo.driverLicenseNumber || 'N/A';
  const licenseExpiry = data.clientInfo.licenseExpiry
    ? formatDate(data.clientInfo.licenseExpiry)
    : 'N/A';

  const resolvedTermsData = getResolvedTermsContent(
    {
      documentScope: 'claims',
      specificDocType: 'vd_claim_record',
      hireType: 'claim',
      isClaim: true,
      targetPagePosition: 'page_3_terms',
    },
    {
      ...companyDetails,
      ...activeProfile,
      fullName: p3Name,
      officialAddress: p3Address,
      phone: p3Phone,
      email: p3Email,
      website: p3Website,
    }
  );

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* ========== HEADER ========== */}
        <View style={styles.header} fixed>
          <View style={styles.headerLeft}>
            <SafePdfLogo src={p1Logo} companyName={p1Name} style={styles.logo} />
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.companyName}>{p1Name}</Text>
            {Boolean(p1CustomHeader) && (
              <Text style={[styles.companyDetail, { fontStyle: 'italic', color: '#4B5563', marginBottom: 2 }]}>
                {p1CustomHeader}
              </Text>
            )}
            <Text style={styles.companyDetail}>{p1Address}</Text>
            <Text style={styles.companyDetail}>Tel: {p1Phone}</Text>
            <Text style={styles.companyDetail}>Email: {p1Email}</Text>
            {Boolean(p1Website) && (
              <Text style={styles.companyDetail}>Web: {p1Website}</Text>
            )}
          </View>
        </View>

        {/* ========== TITLE ========== */}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>
            {page1Template === 'litigation_first_report'
              ? 'LITIGATION FIRST REPORT OF LOSS (FNOL)'
              : 'Claim Record'}
          </Text>
          {page1Template === 'litigation_first_report' && (
            <Text style={{ fontSize: 8, color: '#4338CA', fontWeight: 'bold', marginTop: 3 }}>
              ★ Privileged Legal Dossier • First Notice of Loss Subrogation Report
            </Text>
          )}
        </View>

        {/* ========== CLIENT & REFERENCE ========== */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }} wrap={false}>
          <View style={[styles.card, { width: '48%' }]}>
            <Text style={styles.cardTitle}>Client Information</Text>
            <Text style={styles.cardContent}>Name: {data.clientInfo.name}</Text>
            <Text style={styles.cardContent}>DOB: {formatDate(data.clientInfo.dateOfBirth)}</Text>
            {/* <Text style={styles.cardContent}>License #: {licenseNo}</Text>
            <Text style={styles.cardContent}>License Expiry: {licenseExpiry}</Text> */}
            <Text style={styles.cardContent}>Address: {data.clientInfo.address}</Text>

            {/* -- only when PI is selected -- */}
            {data.claimReason.includes('PI') && (
              <>
                <Text style={styles.cardContent}>Phone: {data.clientInfo.phone}</Text>
                <Text style={styles.cardContent}>Email: {data.clientInfo.email}</Text>
                <Text style={styles.cardContent}>
                  NI No: {data.clientInfo.nationalInsuranceNumber}
                </Text>
                <Text style={styles.cardContent}>
                  Occupation: {data.clientInfo.occupation ?? 'N/A'}
                </Text>
              </>
            )}

          </View>
          <View style={[styles.card, { width: '48%' }]}>
            <Text style={styles.cardTitle}>Reference Details</Text>
            {data.clientRef && <Text style={styles.cardContent}>Client Ref: {data.clientRef}</Text>}
            <Text style={styles.cardContent}>Type: {data.claimType}</Text>
            <Text style={styles.cardContent}>Reason: {data.claimReason.join(', ')}</Text>
            <Text style={styles.cardContent}>Case Progress: {data.caseProgress}</Text>
            <Text style={styles.cardContent}>Status: {data.progress}</Text>
          </View>
        </View>

        {/* ========== CLIENT VEHICLE ========== */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Client Vehicle</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.tableHeaderCell}>Registration</Text>
              <Text style={styles.tableHeaderCell}>MOT Expiry</Text>
              <Text style={styles.tableHeaderCell}>Road Tax Expiry</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.tableCell}>{data.clientVehicle.registration}</Text>
              <Text style={styles.tableCell}>{formatDate(data.clientVehicle.motExpiry)}</Text>
              <Text style={styles.tableCell}>{formatDate(data.clientVehicle.roadTaxExpiry)}</Text>
            </View>
          </View>
        </View>

        {/* ========== ACCIDENT DETAILS ========== */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Accident Details</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.tableHeaderCell}>Date</Text>
              <Text style={styles.tableHeaderCell}>Time</Text>
              <Text style={styles.tableHeaderCell}>Location</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.tableCell}>{formatDate(data.incidentDetails.date)}</Text>
              <Text style={styles.tableCell}>{data.incidentDetails.time}</Text>
              <Text style={styles.tableCell}>{data.incidentDetails.location}</Text>
            </View>
          </View>
          <View style={[styles.card, { borderLeftColor: '#F59E0B' }]}>
            <Text style={styles.cardTitle}> Description</Text>
            {/* <Text style={styles.cardContent}>{data.incidentDetails.damageDetails}</Text> */}
            <Text style={[styles.cardContent, { marginTop: 5 }]}>{data.incidentDetails.description}</Text>
          </View>
        </View>

        {/* ========== INJURY DETAILS (only for PI) ========== */}
        {data.claimReason.includes('PI') && (
          <View style={[styles.card, { borderLeftColor: '#F87171', marginBottom: 20 }]}>
            <Text style={styles.cardTitle}>Injury Details</Text>
            <Text style={[styles.cardContent, { marginTop: 5 }]}>
              {data.clientInfo.injuryDetails ?? 'N/A'}
            </Text>
          </View>
        )}

        {/* ========== THIRD PARTY & REGISTER KEEPER ========== */}
        <View
          style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}
          wrap={false}
        >
          {/* Third Party */}
          <View style={[styles.card, { width: '48%' }]}>
            <Text style={styles.cardTitle}>Third Party Information</Text>
            <Text style={styles.cardContent}>Name: {data.thirdParty.name}</Text>
            <Text style={styles.cardContent}>Phone: {data.thirdParty.phone}</Text>
            <Text style={styles.cardContent}>Email: {data.thirdParty.email}</Text>
            <Text style={styles.cardContent}>Address: {data.thirdParty.address}</Text>
            <Text style={styles.cardContent}>Registration: {data.thirdParty.registration}</Text>
          </View>

          {/* Register Keeper (only if enabled) */}
          {data.registerKeeper?.enabled && (
            <View style={[styles.card, { width: '48%' }]}>
              <Text style={styles.cardTitle}>Register Keeper</Text>
              <Text style={styles.cardContent}>Name: {data.registerKeeper.name}</Text>
              <Text style={styles.cardContent}>Phone: {data.registerKeeper.phone}</Text>
              <Text style={styles.cardContent}>Email: {data.registerKeeper.email}</Text>
              <Text style={styles.cardContent}>
                DOB / Established:{' '}
                {data.registerKeeper.dateOfBirth && formatDate(data.registerKeeper.dateOfBirth)}
              </Text>
              {data.registerKeeper.signature && (
                <Image
                  src={data.registerKeeper.signature}
                  style={{ width: '100%', height: 60, marginTop: 8 }}
                />
              )}
            </View>
          )}
        </View>


        {/* GP and Hospital Info Side by Side */}
        {(data.gpInformation?.visited || data.hospitalInformation?.visited) && (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }} wrap={false}>
            {data.gpInformation?.visited && (
              <View style={[styles.card, { width: '48%' }]}>
                <Text style={styles.cardTitle}>GP Information</Text>
                <Text style={styles.cardContent}>Name: {data.gpInformation.gpName}</Text>
                <Text style={styles.cardContent}>Doctor: {data.gpInformation.gpDoctorName}</Text>
                <Text style={styles.cardContent}>Address: {data.gpInformation.gpAddress}</Text>
                <Text style={styles.cardContent}>Contact: {data.gpInformation.gpContactNumber}</Text>
                <Text style={styles.cardContent}>Date: {data.gpInformation.gpDate && formatDate(data.gpInformation.gpDate)}</Text>
                <Text style={styles.cardContent}>Notes: {data.gpInformation.gpNotes}</Text>
              </View>
            )}

            {data.hospitalInformation?.visited && (
              <View style={[styles.card, { width: '48%' }]}>
                <Text style={styles.cardTitle}>Hospital Information</Text>
                <Text style={styles.cardContent}>Name: {data.hospitalInformation.hospitalName}</Text>
                <Text style={styles.cardContent}>Doctor: {data.hospitalInformation.hospitalDoctorName}</Text>
                <Text style={styles.cardContent}>Address: {data.hospitalInformation.hospitalAddress}</Text>
                <Text style={styles.cardContent}>Contact: {data.hospitalInformation.hospitalContactNumber}</Text>
                <Text style={styles.cardContent}>Date: {data.hospitalInformation.hospitalDate && formatDate(data.hospitalInformation.hospitalDate)}</Text>
                <Text style={styles.cardContent}>Notes: {data.hospitalInformation.hospitalNotes}</Text>
              </View>
            )}
          </View>
        )}

        {/* Passengers Table */}
        {data.passengers && data.passengers.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Passenger Details</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={styles.tableHeaderCell}>Name</Text>
                <Text style={styles.tableHeaderCell}>DOB</Text>
                <Text style={styles.tableHeaderCell}>Contact</Text>
              </View>
              {data.passengers.map((p, i) => (
                <View key={i} style={styles.tableRow}>
                  <Text style={styles.tableCell}>{p.name}</Text>
                  <Text style={styles.tableCell}>{p.dob}</Text>
                  <Text style={styles.tableCell}>{p.contactNumber}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Witnesses Table */}
        {data.witnesses && data.witnesses.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Witness Details</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={styles.tableHeaderCell}>Name</Text>
                <Text style={styles.tableHeaderCell}>DOB</Text>
                <Text style={styles.tableHeaderCell}>Contact</Text>
              </View>
              {data.witnesses.map((w, i) => (
                <View key={i} style={styles.tableRow}>
                  <Text style={styles.tableCell}>{w.name}</Text>
                  <Text style={styles.tableCell}>{w.dob}</Text>
                  <Text style={styles.tableCell}>{w.contactNumber}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Police & Paramedic */}
        {(data.policeOfficerName || data.paramedicNames) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Emergency Response</Text>
            <View style={styles.card}>
              {data.policeOfficerName && (
                <>
                  <Text style={styles.cardContent}>Police Officer: {data.policeOfficerName}</Text>
                  <Text style={styles.cardContent}>Badge #: {data.policeBadgeNumber}</Text>
                  <Text style={styles.cardContent}>Station: {data.policeStation}</Text>
                  <Text style={styles.cardContent}>Incident #: {data.policeIncidentNumber}</Text>
                  <Text style={styles.cardContent}>Contact: {data.policeContactInfo}</Text>
                </>
              )}
              {data.paramedicNames && (
                <>
                  <Text style={styles.cardContent}>Paramedics: {data.paramedicNames}</Text>
                  <Text style={styles.cardContent}>Ambulance Ref: {data.ambulanceReference}</Text>
                  <Text style={styles.cardContent}>Service: {data.ambulanceService}</Text>
                </>
              )}
            </View>
          </View>
        )}

        {/* Evidence Images Only */}
        {/* {data.evidence.images.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Evidence Images</Text>
            <View style={styles.grid}>
              {data.evidence.images.map((url, idx) => (
                <View key={idx} style={styles.gridItem}>
                  <Image src={url} style={styles.vehicleImage} />
                </View>
              ))}
            </View>
          </View>
        )} */}

        {/* ========== BANK ALLOCATION / SETTLEMENT REMITTANCE (IF ALLOCATED) ========== */}
        {hasBankDetails && (() => {
          const qrCodeUrl =
            companyDetails?.paymentQrCodeDataUrl ||
            (data as any)?.paymentQrCodeDataUrl;
          const showQr = companyDetails?.includePaymentQr !== false && Boolean(qrCodeUrl);

          return (
            <View style={[styles.section, { marginTop: 10 }]} wrap={false}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.sectionTitle}>Settlement &amp; Remittance Details</Text>
                {showQr && (
                  <Text style={{ fontSize: 6.5, color: '#4338CA', fontFamily: 'Helvetica-Bold' }}>
                    SCAN TO PAY
                  </Text>
                )}
              </View>
              <View style={[styles.card, { marginTop: 4, backgroundColor: '#F8FAFC', borderColor: '#E2E8F0', borderWidth: 1 }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1, marginRight: showQr ? 8 : 0 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
                      <Text style={{ fontSize: 8.5, color: '#475569' }}>Bank Name: <Text style={{ fontFamily: 'Helvetica-Bold', color: '#1E293B' }}>{activeBank.bankName || 'N/A'}</Text></Text>
                      <Text style={{ fontSize: 8.5, color: '#475569' }}>Account Name: <Text style={{ fontFamily: 'Helvetica-Bold', color: '#1E293B' }}>{activeBank.accountName || companyName}</Text></Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
                      <Text style={{ fontSize: 8.5, color: '#475569' }}>Account Number: <Text style={{ fontFamily: 'Helvetica-Bold', color: '#1E293B' }}>{activeBank.accountNumber || 'N/A'}</Text></Text>
                      <Text style={{ fontSize: 8.5, color: '#475569' }}>Sort Code: <Text style={{ fontFamily: 'Helvetica-Bold', color: '#1E293B' }}>{activeBank.sortCode || 'N/A'}</Text></Text>
                    </View>
                    {activeBank.iban && (
                      <Text style={{ fontSize: 8, color: '#64748B' }}>IBAN: {activeBank.iban}</Text>
                    )}
                  </View>

                  {/* QR Code Container */}
                  {showQr && (
                    <View style={{ alignItems: 'center', width: 50, flexShrink: 0 }}>
                      <View style={{ padding: 2, backgroundColor: '#FFFFFF', borderWidth: 0.5, borderColor: '#CBD5E1', borderRadius: 3 }}>
                        <Image src={qrCodeUrl!} style={{ width: 44, height: 44 }} />
                      </View>
                      <Text style={{ fontSize: 5.5, color: '#64748B', marginTop: 1.5, textAlign: 'center' }}>
                        Mobile Banking
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          );
        })()}

        {/* ========== FOOTER ========== */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>{p1FooterText}</Text>
          <Text
            style={styles.pageNumber}
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
          />
        </View>
      </Page>

      {/* ========== TRAILING PAGE: AUTO-BOUND TERMS & CONDITIONS ========== */}
      {includePage3 && (
        <Page size="A4" style={[styles.page, { paddingBottom: 60 }]}>
          <View style={styles.header} fixed>
            <View style={styles.headerLeft}>
              <SafePdfLogo src={p3Logo} companyName={p3Name} style={styles.logo} />
            </View>
            <View style={styles.headerRight}>
              <Text style={styles.companyName}>{p3Name}</Text>
              {Boolean(p3CustomHeader) && (
                <Text style={[styles.companyDetail, { fontStyle: 'italic', color: '#4B5563', marginBottom: 2 }]}>
                  {p3CustomHeader}
                </Text>
              )}
              <Text style={styles.companyDetail}>{p3Address}</Text>
              <Text style={styles.companyDetail}>Tel: {p3Phone}</Text>
              <Text style={styles.companyDetail}>Email: {p3Email}</Text>
              {Boolean(p3Website) && (
                <Text style={styles.companyDetail}>Web: {p3Website}</Text>
              )}
            </View>
          </View>

          <View style={{ marginTop: 10, marginBottom: 10 }} wrap={true}>
            <Text style={[styles.sectionTitle, { fontSize: 11, marginBottom: 8, paddingVertical: 4, paddingHorizontal: 8 }]}>
              {resolvedTermsData.isConfigured
                ? resolvedTermsData.title
                : 'CLAIM MANAGEMENT TERMS & CONDITIONS'}
            </Text>
            {resolvedTermsData.isConfigured && resolvedTermsData.paragraphs.length > 0 ? (
              resolvedTermsData.paragraphs.map((para: string, idx: number) => (
                <Text key={idx} wrap={true} style={[styles.text, { fontSize: 8.5, lineHeight: 1.35, marginBottom: 4.5, textAlign: 'justify', color: '#374151' }]}>
                  {para}
                </Text>
              ))
            ) : (
              <PdfTermsWarningNotice message={resolvedTermsData.warningMessage} />
            )}
          </View>

          <View style={styles.footer} fixed>
            <Text style={styles.footerText}>{p3FooterText}</Text>
            <Text
              style={styles.pageNumber}
              render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
            />
          </View>
        </Page>
      )}
    </Document>
  );
};

export default ClaimDocument;
