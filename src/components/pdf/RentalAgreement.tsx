// src/components/pdf/RentalAgreement.tsx
import React from 'react';
import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';
import { Rental, Vehicle, Customer } from '../../types';
import { RENTAL_RATES } from '../../utils/rentalCalculations';
import { format, addDays } from 'date-fns';
import { formatDate } from '../../utils/dateHelpers';
import { resolveNameFields, resolveAddressFields } from '../../utils/nameAddressUtils';
import { getHireCommencementDate, formatExecutionDateTime, formatInlineCompanyFooter, splitParagraphs, sanitizeAndInterpolateTerms, extractActiveCorporateEntityProfile } from '../../utils/legalDocumentUtils';
import { getAvailableCompanyEntities } from '../../utils/entityBranding';
import { getResolvedTermsContent } from '../../utils/documentTemplateTerms';
import PdfTermsWarningNotice from './claims/PdfTermsWarningNotice';
import SafePdfLogo from './SafePdfLogo';
import { styles } from './styles';

const localStyles = StyleSheet.create({
  content: {
    flexDirection: 'column',
  },
  // Horizontal Hirer Card Styles
  hirerInfoCard: {
    borderWidth: 1,
    borderColor: '#3B82F6',
    borderRadius: 6,
    padding: 7,
    marginBottom: 10,
  },
  hirerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  hirerItem: {
    flex: 1,
    alignItems: 'flex-start',
    paddingHorizontal: 3,
  },
  hirerLabel: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#1E40AF',
    marginBottom: 1,
  },
  hirerValue: {
    fontSize: 8,
    color: '#1F2937',
  },
  termsSection: {
    marginBottom: 8,
    paddingBottom: 6,
  },
  termsText: {
    fontSize: 9,
    lineHeight: 1.35,
    marginBottom: 4.5,
    textAlign: 'justify',
    color: '#374151',
  },
  trailingTermsText: {
    fontSize: 8.5,
    lineHeight: 1.35,
    marginBottom: 4,
    textAlign: 'justify',
    color: '#374151',
  },
  executionAndSignaturesWrapper: {
    flexGrow: 0,
    minPresenceAhead: 150,
    marginTop: 6,
  },
  signatureSection: {
    marginTop: 8,
    marginBottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    flexGrow: 0,
    minPresenceAhead: 150,
    breakInside: 'avoid',
  },
  compactBox: {
    padding: 6,
    width: '48%',
    backgroundColor: '#F9FAFB',
    borderRadius: 6,
  },
  compactImage: {
    height: 32,
    marginVertical: 2,
    objectFit: 'contain',
  },
  compactLine: {
    marginTop: 3,
    marginBottom: 2,
    paddingTop: 2,
    fontSize: 8.5,
  },
  compactText: {
    fontSize: 8.5,
  }
});

const isValidPdfImageSrc = (v: any): v is string => {
  if (typeof v !== 'string') return false;
  const s = v.trim();
  if (!s) return false;
  if (s.includes('undefined') || s.includes('null')) return false;
  return s.startsWith('data:image/') || s.startsWith('http://') || s.startsWith('https://');
};

const RentalAgreement: React.FC<{
  rental: Rental;
  vehicle: Vehicle;
  customer: Customer;
  companyDetails: any;
  includeImages?: boolean;
}> = ({ rental, vehicle, customer, companyDetails = {}, includeImages = true }) => {
  const formatDateTime = (date: Date | string | null | undefined): string => {
    if (!date) return 'N/A';
    try {
      let processed: any = date;
      if (typeof (date as any)?.toDate === 'function') {
        processed = (date as any).toDate();
      }
      const dateObj = typeof processed === 'string' ? new Date(processed) : processed;
      if (dateObj instanceof Date && !isNaN(dateObj.getTime())) {
        return format(dateObj, 'dd/MM/yyyy HH:mm');
      }
      return 'N/A';
    } catch {
      return 'N/A';
    }
  };

  const getDateObj = (date: Date | string | null | undefined): Date | null => {
    if (!date) return null;
    try {
      let processed: any = date;
      if (typeof (date as any)?.toDate === 'function') {
        processed = (date as any).toDate();
      }
      const dateObj = typeof processed === 'string' ? new Date(processed) : processed;
      return dateObj instanceof Date && !isNaN(dateObj.getTime()) ? dateObj : null;
    } catch {
      return null;
    }
  };

  // ✅ UPDATED: Use Negotiated Rate or Locked Rates for accurate historical documents
  const getRentalRate = (r: Rental, v: Vehicle): number => {
    if (r.negotiatedRate != null) return r.negotiatedRate;
    
    switch (r.type) {
      case 'weekly':
        return r.lockedWeeklyRate ?? v.weeklyRentalPrice ?? RENTAL_RATES.weekly;
      case 'daily':
        return r.lockedDailyRate ?? v.dailyRentalPrice ?? RENTAL_RATES.daily;
      case 'claim':
        return r.lockedClaimRate ?? v.claimRentalPrice ?? RENTAL_RATES.claim;
      default:
        return 0;
    }
  };

  const rentalRate = getRentalRate(rental, vehicle);
  const rentalStartDate = getDateObj(rental.startDate) || new Date();
  const defaultEndDate = addDays(rentalStartDate, 90);
  const rentalEndDate = getDateObj(rental.endDate) || defaultEndDate;

  const getServiceType = (type: Rental['type']): string => {
    switch (type) {
      case 'claim':
        return 'Credit Hire';
      case 'daily':
        return 'Daily Hire';
      case 'weekly':
        return 'Weekly Hire';
      default:
        return type.toUpperCase();
    }
  };

  const getDisplayVehicle = () => {
    const agreementStartMs = rentalStartDate.getTime();
    const agreementEndMs = rentalEndDate.getTime();

    let targetVehicle = {
      title: 'MAIN VEHICLE DETAILS',
      make: vehicle.make,
      model: vehicle.model,
      reg: vehicle.registrationNumber,
      mileage: (rental.checkOutCondition?.mileage ?? vehicle.mileage).toLocaleString() + ' miles',
    };

    if (rental.hireSubstitutionDetails && rental.hireSubstitutionDetails.length > 0) {
      for (const sub of rental.hireSubstitutionDetails) {
        const subStart = getDateObj(sub.givenAt);
        const subEnd = getDateObj(sub.returnCondition?.date || sub.expectedReturnAt);

        if (subStart) {
          const subStartMs = subStart.getTime();
          const subEndMs = subEnd ? subEnd.getTime() : Number.MAX_SAFE_INTEGER;

          if (agreementStartMs >= subStartMs - 60000 && agreementEndMs <= subEndMs + 60000) {
            targetVehicle = {
              title: 'SUBSTITUTE VEHICLE DETAILS',
              make: sub.make,
              model: sub.model,
              reg: sub.registration,
              mileage: (sub.mileage || 0).toLocaleString() + ' miles',
            };
            break;
          }
        }
      }
    }
    return targetVehicle;
  };

  const displayVehicle = getDisplayVehicle();

  const getActiveSubstitute = () => {
    if (displayVehicle.title.includes('SUBSTITUTE')) return null;
    if (!rental.hireSubstitutionDetails || rental.hireSubstitutionDetails.length === 0) return null;
    const latestSub = rental.hireSubstitutionDetails[rental.hireSubstitutionDetails.length - 1];
    if (!latestSub.expectedReturnAt) return null;
    const now = new Date();
    const returnDate = getDateObj(latestSub.expectedReturnAt);
    if (returnDate && returnDate >= now) return latestSub;
    return null;
  };

  const activeSub = getActiveSubstitute();
  const signatureDate = getHireCommencementDate(rental);
  const effectiveHirerSignature = rental.signature || customer?.signature || '';
  const signatureExecutionDateFormatted = formatExecutionDateTime(rental, 'dd/MM/yyyy HH:mm');

  const getUsageHistory = () => {
    const history: Array<{ vehicle: string; reg: string; start: Date; end: Date }> = [];
    const subs = (rental.hireSubstitutionDetails || []).slice().sort((a, b) => {
      const dA = getDateObj(a.givenAt)?.getTime() || 0;
      const dB = getDateObj(b.givenAt)?.getTime() || 0;
      return dA - dB;
    });

    let currentCursor = rentalStartDate;

    if (subs.length === 0) {
      history.push({
        vehicle: `${vehicle.make} ${vehicle.model} (Main)`,
        reg: vehicle.registrationNumber,
        start: currentCursor,
        end: rentalEndDate,
      });
    } else {
      for (let i = 0; i < subs.length; i++) {
        const sub = subs[i];
        const subGiven = getDateObj(sub.givenAt);
        if (!subGiven) continue;

        if (subGiven > currentCursor) {
          history.push({
            vehicle: `${vehicle.make} ${vehicle.model} (Main)`,
            reg: vehicle.registrationNumber,
            start: currentCursor,
            end: subGiven,
          });
        }

        const subReturnRaw = sub.returnCondition?.date || sub.expectedReturnAt;
        let subEnd = getDateObj(subReturnRaw) || addDays(subGiven, 1);
        if (subEnd <= subGiven) subEnd = addDays(subGiven, 1);

        history.push({
          vehicle: `${sub.make} ${sub.model} (Sub)`,
          reg: sub.registration,
          start: subGiven,
          end: subEnd,
        });
        currentCursor = subEnd;
      }
      if (currentCursor < rentalEndDate) {
        history.push({
          vehicle: `${vehicle.make} ${vehicle.model} (Main)`,
          reg: vehicle.registrationNumber,
          start: currentCursor,
          end: rentalEndDate,
        });
      }
    }
    return history;
  };

  const usageHistory = getUsageHistory();

  const renderUsageTimeline = () => {
    const safeFirstBatch = usageHistory.slice(0, 1);
    const rest = usageHistory.slice(1);

    return (
      <View style={{ marginBottom: 15 }}>
        <View wrap={false}>
          <Text style={styles.sectionTitle}>VEHICLE USAGE TIMELINE</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Vehicle</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Registration</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>From</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>To</Text>
            </View>
            {safeFirstBatch.map((usage, idx) => (
              <View style={styles.tableRow} key={`first_${idx}`}>
                <Text style={[styles.tableCell, { flex: 2 }]}>{usage.vehicle}</Text>
                <Text style={[styles.tableCell, { flex: 1 }]}>{usage.reg}</Text>
                <Text style={[styles.tableCell, { flex: 1.5 }]}>{formatDateTime(usage.start)}</Text>
                <Text style={[styles.tableCell, { flex: 1.5 }]}>{formatDateTime(usage.end)}</Text>
              </View>
            ))}
          </View>
        </View>

        {rest.length > 0 && (
          <View style={[styles.table, { marginTop: -5 }]}>
            {rest.map((usage, idx) => (
              <View style={styles.tableRow} key={`rest_${idx}`}>
                <Text style={[styles.tableCell, { flex: 2 }]}>{usage.vehicle}</Text>
                <Text style={[styles.tableCell, { flex: 1 }]}>{usage.reg}</Text>
                <Text style={[styles.tableCell, { flex: 1.5 }]}>{formatDateTime(usage.start)}</Text>
                <Text style={[styles.tableCell, { flex: 1.5 }]}>{formatDateTime(usage.end)}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderSubstitutionVehicles = () => {
    if (!rental.hireSubstitutionDetails || rental.hireSubstitutionDetails.length === 0) return null;
    const safeFirstBatch = rental.hireSubstitutionDetails.slice(0, 1);
    const rest = rental.hireSubstitutionDetails.slice(1);

    return (
      <View style={{ marginBottom: 15 }}>
        <View wrap={false}>
          <Text style={styles.sectionTitle}>Hire Substitution Vehicles</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Vehicle</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1.2 }]}>Reg</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>Provider</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>Given</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>Return</Text>
            </View>
            {safeFirstBatch.map((sub, index) => (
              <View style={styles.tableRow} key={`sub_first_${index}`}>
                <Text style={[styles.tableCell, { flex: 1 }]}>{`Vehicle ${index + 1}`}</Text>
                <Text style={[styles.tableCell, { flex: 1.2 }]}>{sub.registration}</Text>
                <Text style={[styles.tableCell, { flex: 1.5 }]}>{sub.loaner}</Text>
                <Text style={[styles.tableCell, { flex: 1.5 }]}>{formatDateTime(sub.givenAt)}</Text>
                <Text style={[styles.tableCell, { flex: 1.5 }]}>{formatDateTime(sub.expectedReturnAt)}</Text>
              </View>
            ))}
          </View>
        </View>

        {rest.length > 0 && (
          <View style={[styles.table, { marginTop: -5 }]}>
            {rest.map((sub, index) => (
              <View style={styles.tableRow} key={`sub_rest_${index}`}>
                <Text style={[styles.tableCell, { flex: 1 }]}>{`Vehicle ${index + 2}`}</Text>
                <Text style={[styles.tableCell, { flex: 1.2 }]}>{sub.registration}</Text>
                <Text style={[styles.tableCell, { flex: 1.5 }]}>{sub.loaner}</Text>
                <Text style={[styles.tableCell, { flex: 1.5 }]}>{formatDateTime(sub.givenAt)}</Text>
                <Text style={[styles.tableCell, { flex: 1.5 }]}>{formatDateTime(sub.expectedReturnAt)}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  const isCompany = customer?.type === 'company';
  const nameFields = resolveNameFields(customer);
  const addressFields = resolveAddressFields(customer);

  const availableEntities = getAvailableCompanyEntities(companyDetails);
  const targetEntityKey =
    rental?.corporateEntityKey ||
    (companyDetails as any)?.corporateEntityKey ||
    (companyDetails as any)?.entityKey ||
    (rental?.type === 'claim' ? 'aie_claims' : 'aie_skyline');
  const matchedEntity =
    availableEntities.find(
      (e) =>
        e.key === targetEntityKey ||
        e.id === targetEntityKey ||
        (rental?.corporateEntityName &&
          (e.fullName.toLowerCase() === rental.corporateEntityName.toLowerCase() ||
           e.tradingName.toLowerCase() === rental.corporateEntityName.toLowerCase())) ||
        (targetEntityKey.includes('sayarah') && e.key.includes('sayarah'))
    ) || availableEntities[0];

  const hasRentalSpecificEntity = Boolean(rental?.corporateEntityKey || rental?.corporateEntityName);
  const page1Entity = (hasRentalSpecificEntity ? matchedEntity : (companyDetails as any)?.page1Entity) || matchedEntity || companyDetails;
  const page2Entity = (hasRentalSpecificEntity ? matchedEntity : (companyDetails as any)?.page2Entity) || matchedEntity || companyDetails;
  const page3Entity = (hasRentalSpecificEntity ? matchedEntity : (companyDetails as any)?.page3Entity) || matchedEntity || companyDetails;

  const activeProfile = extractActiveCorporateEntityProfile({
    ...companyDetails,
    ...matchedEntity,
    corporateEntityKey: matchedEntity?.key || targetEntityKey,
    corporateEntityName: rental?.corporateEntityName || matchedEntity?.fullName,
  });

  const effectiveCompanyDetails = {
    ...companyDetails,
    ...matchedEntity,
    fullName: activeProfile.companyName,
    officialAddress: activeProfile.companyAddress,
    phone: activeProfile.phone,
    email: activeProfile.email,
    website: activeProfile.website,
    claimsTeam: activeProfile.claimsTeam,
    companyNumber: activeProfile.companyNumber,
    vatNumber: activeProfile.vatNumber,
    entityKey: matchedEntity?.key,
    corporateEntityKey: matchedEntity?.key,
    corporateEntityName: activeProfile.companyName,
    page1Entity,
    page2Entity,
    page3Entity,
  };

  const pageMapping = (companyDetails as any)?.pageTemplateMapping;
  const page1Template = pageMapping?.page1Template || 'standard_rental_agreement';
  const page2Template = pageMapping?.page2Template || 'checkout_inspection_condition';
  const page3Template = pageMapping?.page3Template || 'statutory_hire_terms';

  const includePage2 = pageMapping
    ? Boolean(pageMapping.includePage2 && pageMapping.page2Template !== 'none')
    : true;

  const includePage3 = pageMapping
    ? Boolean(pageMapping.includePage3 && pageMapping.page3Template !== 'none')
    : companyDetails?.includeTrailingTC !== false;

  const page1FooterText = formatInlineCompanyFooter(page1Entity);
  const page2FooterText = formatInlineCompanyFooter(page2Entity);
  const page3FooterText = formatInlineCompanyFooter(page3Entity);

  const getPage1Title = () => {
    const agreementNum = rental.rentalAgreementNumber ? `#${rental.rentalAgreementNumber}` : '';
    if (page1Template === 'executive_chauffeur_agreement') {
      return `EXECUTIVE & CHAUFFEUR HIRE AGREEMENT ${agreementNum}`;
    }
    if (page1Template === 'compact_rental_voucher') {
      return `VEHICLE HIRE BOOKING & RENTAL VOUCHER ${agreementNum}`;
    }
    return `RENTAL AGREEMENT ${agreementNum}`;
  };

  // ── AUTOMATED T&C ROUTING ENGINE RESOLUTION ──
  const isClaimRental = Boolean(
    rental.type === 'claim' ||
    customer?.type === 'claim' ||
    (rental as any)?.customerType === 'claim' ||
    (rental as any)?.claimId ||
    String(rental.reason || '').toLowerCase().includes('claim')
  );

  const resolvedTermsData = getResolvedTermsContent(
    {
      documentScope: 'rental',
      hireType: rental.type,
      customerType: customer?.type,
      rentalStatus: rental.status,
      paymentStatus: rental.paymentStatus,
      targetPagePosition: 'page_3_terms',
      isClaim: isClaimRental,
    },
    effectiveCompanyDetails
  );

  const resolvedTrailingTermsData = getResolvedTermsContent(
    {
      documentScope: 'rental',
      hireType: rental.type,
      customerType: customer?.type,
      rentalStatus: rental.status,
      paymentStatus: rental.paymentStatus,
      targetPagePosition: 'trailing_before_signatures',
      isClaim: isClaimRental,
    },
    effectiveCompanyDetails
  );

  const getPage3TermsContent = () => {
    return resolvedTermsData.paragraphs;
  };

  return (
    <Document>
      {/* ══════════════════════════════════════════════════════════════
          PAGE 1: MAIN AGREEMENT & CONTRACT SPECIFICATIONS
         ══════════════════════════════════════════════════════════════ */}
      <Page size="A4" style={[styles.page, { paddingBottom: 65 }]}>
        <View style={localStyles.content}>
          {/* HEADER */}
          <View style={styles.header} fixed>
            <View style={styles.headerLeft}>
              <SafePdfLogo
                src={page1Entity?.logoUrl}
                companyName={page1Entity?.fullName || activeProfile.companyName || 'Rental Company'}
                style={styles.logo}
              />
            </View>
            <View style={styles.headerRight}>
              <Text style={styles.companyName}>{page1Entity?.fullName || activeProfile.companyName || 'Rental Company'}</Text>
              {Boolean(page1Entity?.headerDisclaimer || companyDetails?.customHeaderText) && (
                <Text style={[styles.companyDetail, { fontStyle: 'italic', color: '#4B5563', marginBottom: 2 }]}>
                  {page1Entity?.headerDisclaimer || companyDetails?.customHeaderText}
                </Text>
              )}
              <Text style={styles.companyDetail}>{page1Entity?.officialAddress || activeProfile.companyAddress || 'N/A'}</Text>
              <Text style={styles.companyDetail}>Tel: {page1Entity?.phone || activeProfile.phone || 'N/A'}</Text>
              <Text style={styles.companyDetail}>Email: {page1Entity?.email || activeProfile.email || 'N/A'}</Text>
              {Boolean(page1Entity?.website || activeProfile.website) && (
                <Text style={styles.companyDetail}>Web: {page1Entity?.website || activeProfile.website}</Text>
              )}
            </View>
          </View>

          {/* TITLE */}
          <View style={styles.titleContainer}>
            <Text style={styles.title}>{getPage1Title()}</Text>
            {page1Template === 'executive_chauffeur_agreement' && (
              <Text style={{ fontSize: 8, color: '#4338CA', fontWeight: 'bold', marginTop: 3 }}>
                ★ Licensed Private Hire &amp; Executive Fleet Service Standard • Luxury Class Contract
              </Text>
            )}
            {page1Template === 'compact_rental_voucher' && (
              <Text style={{ fontSize: 8, color: '#047857', fontWeight: 'bold', marginTop: 3 }}>
                ★ Official Rental Booking Voucher &amp; Vehicle Release Authorization
              </Text>
            )}
          </View>

          {/* HORIZONTAL HIRER DETAILS CARD */}
          <View style={localStyles.hirerInfoCard}>
            {/* Row 1: Name & Personal */}
            <View style={localStyles.hirerRow}>
              {isCompany ? (
                <View style={[localStyles.hirerItem, { flex: 3 }]}>
                  <Text style={localStyles.hirerLabel}>Company Name</Text>
                  <Text style={localStyles.hirerValue}>{customer.name || '-'}</Text>
                </View>
              ) : (
                <>
                  <View style={localStyles.hirerItem}>
                    <Text style={localStyles.hirerLabel}>First Name</Text>
                    <Text style={localStyles.hirerValue}>{nameFields.firstName || '-'}</Text>
                  </View>
                  <View style={localStyles.hirerItem}>
                    <Text style={localStyles.hirerLabel}>Middle Name</Text>
                    <Text style={localStyles.hirerValue}>{nameFields.middleName || '-'}</Text>
                  </View>
                  <View style={localStyles.hirerItem}>
                    <Text style={localStyles.hirerLabel}>Last Name</Text>
                    <Text style={localStyles.hirerValue}>{nameFields.lastName || '-'}</Text>
                  </View>
                </>
              )}
              <View style={localStyles.hirerItem}>
                <Text style={localStyles.hirerLabel}>Date of Birth</Text>
                <Text style={localStyles.hirerValue}>{formatDate(customer.dateOfBirth)}</Text>
              </View>
            </View>

            {/* Row 2: Address Breakdown */}
            <View style={localStyles.hirerRow}>
              <View style={localStyles.hirerItem}>
                <Text style={localStyles.hirerLabel}>Building / Flat</Text>
                <Text style={localStyles.hirerValue}>{addressFields.buildingFlat || '-'}</Text>
              </View>
              <View style={localStyles.hirerItem}>
                <Text style={localStyles.hirerLabel}>Street Name</Text>
                <Text style={localStyles.hirerValue}>{addressFields.streetName || '-'}</Text>
              </View>
              <View style={localStyles.hirerItem}>
                <Text style={localStyles.hirerLabel}>Town / City</Text>
                <Text style={localStyles.hirerValue}>{addressFields.townCity || '-'}</Text>
              </View>
              <View style={localStyles.hirerItem}>
                <Text style={localStyles.hirerLabel}>Postcode</Text>
                <Text style={localStyles.hirerValue}>{addressFields.postcode || '-'}</Text>
              </View>
              <View style={localStyles.hirerItem}>
                <Text style={localStyles.hirerLabel}>Country</Text>
                <Text style={localStyles.hirerValue}>{addressFields.country || '-'}</Text>
              </View>
            </View>

            {/* Row 3: License & Verification */}
            <View style={localStyles.hirerRow}>
              <View style={localStyles.hirerItem}>
                <Text style={localStyles.hirerLabel}>License Number</Text>
                <Text style={localStyles.hirerValue}>{customer.driverLicenseNumber || '-'}</Text>
              </View>
              <View style={localStyles.hirerItem}>
                <Text style={localStyles.hirerLabel}>License Valid From</Text>
                <Text style={localStyles.hirerValue}>{formatDate(customer.licenseValidFrom)}</Text>
              </View>
              <View style={localStyles.hirerItem}>
                <Text style={localStyles.hirerLabel}>License Expiry</Text>
                <Text style={localStyles.hirerValue}>{formatDate(customer.licenseExpiry)}</Text>
              </View>
              <View style={localStyles.hirerItem}>
                <Text style={localStyles.hirerLabel}>Badge Number</Text>
                <Text style={localStyles.hirerValue}>{customer.badgeNumber || 'N/A'}</Text>
              </View>
              <View style={localStyles.hirerItem}>
                <Text style={localStyles.hirerLabel}>Country of Issue</Text>
                <Text style={localStyles.hirerValue}>{customer.countryOfIssue || 'UK'}</Text>
              </View>
            </View>
          </View>

          {/* VEHICLE & RENTAL DETAILS (SIDE BY SIDE) */}
          <View
            style={{
              marginBottom: 15,
              flexDirection: 'row',
              justifyContent: 'space-between',
            }}
            wrap={false}
          >
            {/* Main Vehicle Details (Left) */}
            <View style={[styles.card, { width: '48%' }]}>
              <Text style={styles.sectionTitle}>{displayVehicle.title}</Text>
              <View style={styles.row}>
                <Text style={styles.label}>Vehicle Make:</Text>
                <Text style={styles.value}>{displayVehicle.make || '-'}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Vehicle Model:</Text>
                <Text style={styles.value}>{displayVehicle.model || '-'}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Registration:</Text>
                <Text style={styles.value}>{displayVehicle.reg}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Mileage:</Text>
                <Text style={styles.value}>{displayVehicle.mileage}</Text>
              </View>

              {activeSub && (
                <View style={{ marginTop: 5 }}>
                  <Text
                    style={{
                      backgroundColor: '#FEF08A',
                      color: '#854D0E',
                      padding: 4,
                      fontSize: 9,
                      fontWeight: 'bold',
                      marginTop: 5,
                      marginBottom: 5,
                      textAlign: 'center',
                      textTransform: 'uppercase',
                    }}
                  >
                    Active Substitute Vehicle
                  </Text>
                  <View style={styles.row}>
                    <Text style={styles.label}>Vehicle Make:</Text>
                    <Text style={styles.value}>{activeSub.make || '-'}</Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={styles.label}>Vehicle Model:</Text>
                    <Text style={styles.value}>{activeSub.model || '-'}</Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={styles.label}>Registration:</Text>
                    <Text style={styles.value}>{activeSub.registration}</Text>
                  </View>
                </View>
              )}
            </View>

            {/* Rental Details (Right - Now a Card) */}
            <View style={[styles.card, { width: '48%' }]}>
              <Text style={styles.sectionTitle}>RENTAL DETAILS</Text>
              <View style={styles.row}>
                <Text style={styles.label}>Type:</Text>
                <Text style={styles.value}>{rental.type.toUpperCase()}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Start:</Text>
                <Text style={styles.value}>{formatDateTime(rental.startDate)}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>End:</Text>
                <Text style={styles.value}>{formatDateTime(rental.endDate ?? defaultEndDate)}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Rate:</Text>
                <Text style={styles.value}>£{rentalRate.toFixed(2)} per {rental.type === 'weekly' ? 'week' : 'day'}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Service:</Text>
                <Text style={styles.value}>{getServiceType(rental.type)}</Text>
              </View>
            </View>
          </View>

          {/* USAGE TIMELINE */}
          <View>
            {renderUsageTimeline()}
          </View>

          <Text style={styles.warningText}>Maximum Period of Hire: 90 Days</Text>
        </View>

        {/* PAGE 1 FOOTER */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>{page1FooterText}</Text>
          <Text
            style={styles.pageNumber}
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
          />
        </View>
      </Page>

      {/* ══════════════════════════════════════════════════════════════
          PAGE 2: MAIN VEHICLE CONDITION AT CHECK-OUT & RETURN INSPECTION
         ══════════════════════════════════════════════════════════════ */}
      {includePage2 && (
        <Page size="A4" style={[styles.page, { paddingBottom: 65 }]}>
          <View style={styles.header} fixed>
            <View style={styles.headerLeft}>
              <SafePdfLogo
                src={page2Entity?.logoUrl}
                companyName={page2Entity?.fullName || activeProfile.companyName || 'Rental Company'}
                style={styles.logo}
              />
            </View>
            <View style={styles.headerRight}>
              <Text style={styles.companyName}>{page2Entity?.fullName || activeProfile.companyName || 'Rental Company'}</Text>
              {Boolean(page2Entity?.headerDisclaimer || companyDetails?.customHeaderText) && (
                <Text style={[styles.companyDetail, { fontStyle: 'italic', color: '#4B5563', marginBottom: 2 }]}>
                  {page2Entity?.headerDisclaimer || companyDetails?.customHeaderText}
                </Text>
              )}
              <Text style={styles.companyDetail}>{page2Entity?.officialAddress || activeProfile.companyAddress || 'N/A'}</Text>
              <Text style={styles.companyDetail}>Tel: {page2Entity?.phone || activeProfile.phone || 'N/A'}</Text>
              <Text style={styles.companyDetail}>Email: {page2Entity?.email || activeProfile.email || 'N/A'}</Text>
              {Boolean(page2Entity?.website || activeProfile.website) && (
                <Text style={styles.companyDetail}>Web: {page2Entity?.website || activeProfile.website}</Text>
              )}
            </View>
          </View>

          <View style={{ marginTop: 10 }}>
            {/* SUB-TEMPLATE A: VEHICLE CONDITION & INSPECTION PHOTOS */}
            {page2Template === 'checkout_inspection_condition' && (
              <View>
                <View style={styles.titleContainer}>
                  <Text style={[styles.title, { fontSize: 13 }]}>
                    VEHICLE CONDITION &amp; RETURN INSPECTION REPORT
                  </Text>
                </View>

                {/* CHECK-OUT CONDITION */}
                <View style={[styles.sectionBreak, { marginTop: 6 }]} wrap={false}>
                  <View style={styles.infoCard}>
                    <Text style={styles.infoCardTitle}>Main Vehicle Condition at Check-Out</Text>
                    <View style={styles.grid}>
                      <View style={styles.gridItem}>
                        <Text style={styles.subLabel}>Check-Out Date &amp; Time:</Text>
                        <Text style={styles.subValue}>{formatDateTime(rental.startDate)}</Text>
                      </View>
                      <View style={styles.gridItem}>
                        <Text style={styles.subLabel}>Mileage Out:</Text>
                        <Text style={styles.subValue}>
                          {rental.checkOutCondition?.mileage?.toLocaleString() ?? (vehicle?.mileage ? vehicle.mileage.toLocaleString() : 'N/A')} miles
                        </Text>
                      </View>
                      <View style={styles.gridItem}>
                        <Text style={styles.subLabel}>Fuel Level:</Text>
                        <Text style={styles.subValue}>{rental.checkOutCondition?.fuelLevel ?? 100}%</Text>
                      </View>
                      <View style={styles.gridItem}>
                        <Text style={styles.subLabel}>Cleanliness:</Text>
                        <Text style={styles.subValue}>
                          {rental.checkOutCondition ? (rental.checkOutCondition.isClean ? 'Clean & Roadworthy' : 'Needs Cleaning') : 'Clean & Roadworthy'}
                        </Text>
                      </View>
                    </View>

                    {rental.checkOutCondition?.hasDamage && (
                      <View style={styles.highlight}>
                        <Text style={styles.highlightText}>Recorded Damage (Out):</Text>
                        <Text>{rental.checkOutCondition.damageDescription}</Text>
                      </View>
                    )}

                    {includeImages && (rental.checkOutCondition?.images || rental.checkOutImages || []).filter(isValidPdfImageSrc).length > 0 && (
                      <View style={{ marginTop: 8 }}>
                        <Text style={{ ...styles.subLabel, marginBottom: 4 }}>Check-Out High-Res Inspection Images:</Text>
                        <View style={styles.grid}>
                          {(rental.checkOutCondition?.images || rental.checkOutImages || [])
                            .filter(isValidPdfImageSrc)
                            .slice(0, 6)
                            .map((url, idx) => (
                              <View key={idx} style={[styles.gridItem, { width: '31%', margin: '1%' }]}>
                                <View style={styles.imageContainer}>
                                  <Image src={url} style={{ width: '100%', height: 75, objectFit: 'contain' }} />
                                </View>
                                <Text style={styles.imageCaption}>{`Photo ${idx + 1}`}</Text>
                              </View>
                            ))}
                        </View>
                      </View>
                    )}
                  </View>
                </View>

                {/* RETURN CONDITION */}
                {rental.status === 'completed' && rental.returnCondition ? (
                  <View style={[styles.sectionBreak, { marginTop: 10 }]} wrap={false}>
                    <Text style={styles.sectionTitle}>VEHICLE CONDITION AT RETURN (CHECK-IN)</Text>
                    <View style={styles.card}>
                      <View style={styles.grid}>
                        <View style={styles.gridItem}>
                          <Text style={styles.subLabel}>Return Date &amp; Time:</Text>
                          <Text style={styles.subValue}>{formatDateTime(rental.returnCondition.date)}</Text>
                        </View>
                        <View style={styles.gridItem}>
                          <Text style={styles.subLabel}>Return Mileage:</Text>
                          <Text style={styles.subValue}>{rental.returnCondition.mileage.toLocaleString()} miles</Text>
                        </View>
                        <View style={styles.gridItem}>
                          <Text style={styles.subLabel}>Return Charges:</Text>
                          <Text style={styles.subValue}>£{rental.returnCondition.totalCharges.toFixed(2)}</Text>
                        </View>
                      </View>

                      {includeImages && (rental.returnCondition.images || []).filter(isValidPdfImageSrc).length > 0 && (
                        <View style={[styles.grid, { marginTop: 6 }]}>
                          {(rental.returnCondition.images || [])
                            .filter(isValidPdfImageSrc)
                            .slice(0, 6)
                            .map((img, i) => (
                              <Image
                                key={i}
                                src={img}
                                style={{ width: '31%', margin: '1%', height: 70, objectFit: 'contain' }}
                              />
                            ))}
                        </View>
                      )}
                    </View>
                  </View>
                ) : (
                  <View style={[styles.card, { marginTop: 8, padding: 8, backgroundColor: '#F9FAFB', borderLeftWidth: 3, borderLeftColor: '#9CA3AF' }]} wrap={false}>
                    <Text style={[styles.subLabel, { fontWeight: 'bold', color: '#4B5563', marginBottom: 2 }]}>
                      VEHICLE RETURN INSPECTION (CHECK-IN)
                    </Text>
                    <Text style={{ fontSize: 8.5, color: '#6B7280' }}>
                      Return inspection will be conducted and certified upon end-of-hire vehicle hand-over.
                    </Text>
                  </View>
                )}

                {/* SUBSTITUTION VEHICLES & CONDITION REPORTS */}
                {renderSubstitutionVehicles()}
                {rental.hireSubstitutionDetails &&
                  rental.hireSubstitutionDetails.map((sub, index) => (
                    <View key={`sub_card_${index}`} style={[styles.sectionBreak, { marginTop: 8 }]} wrap={false}>
                      <View style={styles.infoCard}>
                        <Text style={styles.infoCardTitle}>
                          Substitution Record #{index + 1}: {sub.make} {sub.model}
                        </Text>
                        <View style={styles.grid}>
                          <View style={styles.gridItem}>
                            <Text style={styles.subLabel}>Date Out:</Text>
                            <Text style={styles.subValue}>{formatDateTime(sub.givenAt)}</Text>
                          </View>
                          <View style={styles.gridItem}>
                            <Text style={styles.subLabel}>Mileage Out:</Text>
                            <Text style={styles.subValue}>{sub.mileage?.toLocaleString() ?? 'N/A'}</Text>
                          </View>
                          <View style={styles.gridItem}>
                            <Text style={styles.subLabel}>Fuel Out:</Text>
                            <Text style={styles.subValue}>{sub.fuelLevel ?? 'N/A'}%</Text>
                          </View>
                          <View style={styles.gridItem}>
                            <Text style={styles.subLabel}>Clean Out:</Text>
                            <Text style={styles.subValue}>{sub.isClean ? 'Yes' : 'No'}</Text>
                          </View>
                        </View>
                        {sub.hasDamage && sub.damageDescription && (
                          <View style={styles.highlight}>
                            <Text style={styles.highlightText}>Recorded Damage (Out):</Text>
                            <Text>{sub.damageDescription}</Text>
                          </View>
                        )}
                        {includeImages && (sub.images || []).filter(isValidPdfImageSrc).length > 0 && (
                          <View style={{ marginTop: 5, marginBottom: 5 }}>
                            <Text style={{ ...styles.subLabel, marginBottom: 4 }}>Check-Out Images:</Text>
                            <View style={styles.grid}>
                              {(sub.images || [])
                                .filter(isValidPdfImageSrc)
                                .slice(0, 4)
                                .map((url, i) => (
                                  <Image
                                    key={i}
                                    src={url}
                                    style={{ width: '23%', height: 70, objectFit: 'contain', margin: '1%' }}
                                  />
                                ))}
                            </View>
                          </View>
                        )}
                      </View>
                    </View>
                  ))}
              </View>
            )}

            {/* SUB-TEMPLATE B: SUBSTITUTION FLEET SCHEDULE */}
            {page2Template === 'substitution_fleet_schedule' && (
              <View>
                <View style={styles.titleContainer}>
                  <Text style={[styles.title, { fontSize: 13 }]}>
                    SUBSTITUTION VEHICLES SCHEDULE &amp; RECORD (PAGE 2)
                  </Text>
                </View>

                {renderSubstitutionVehicles()}

                {rental.hireSubstitutionDetails && rental.hireSubstitutionDetails.length > 0 ? (
                  rental.hireSubstitutionDetails.map((sub, index) => (
                    <View key={`sub_card_${index}`} style={[styles.sectionBreak, { marginTop: 8 }]} wrap={false}>
                      <View style={styles.infoCard}>
                        <Text style={styles.infoCardTitle}>
                          Substitution Record #{index + 1}: {sub.make} {sub.model}
                        </Text>
                        <View style={styles.grid}>
                          <View style={styles.gridItem}>
                            <Text style={styles.subLabel}>Hand-over Date:</Text>
                            <Text style={styles.subValue}>{formatDateTime(sub.givenAt)}</Text>
                          </View>
                          <View style={styles.gridItem}>
                            <Text style={styles.subLabel}>Hand-over Mileage:</Text>
                            <Text style={styles.subValue}>{sub.mileage?.toLocaleString() ?? 'N/A'}</Text>
                          </View>
                          <View style={styles.gridItem}>
                            <Text style={styles.subLabel}>Fuel Out:</Text>
                            <Text style={styles.subValue}>{sub.fuelLevel ?? 'N/A'}%</Text>
                          </View>
                          <View style={styles.gridItem}>
                            <Text style={styles.subLabel}>Cleanliness:</Text>
                            <Text style={styles.subValue}>{sub.isClean ? 'Clean' : 'Needs Wash'}</Text>
                          </View>
                        </View>
                        {sub.hasDamage && (
                          <View style={styles.highlight}>
                            <Text style={styles.highlightText}>Recorded Damage:</Text>
                            <Text>{sub.damageDescription}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  ))
                ) : (
                  <View style={[styles.card, { marginTop: 10, padding: 15 }]}>
                    <Text style={{ fontSize: 9, color: '#4B5563', textAlign: 'center' }}>
                      No substitute vehicles assigned. Primary hire vehicle remains continuously allocated.
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* SUB-TEMPLATE C: DETAILED CHARGE LEDGER */}
            {page2Template === 'detailed_charge_ledger' && (
              <View>
                <View style={styles.titleContainer}>
                  <Text style={[styles.title, { fontSize: 13 }]}>
                    ITEMIZED RATE &amp; CHARGE SCHEDULE (PAGE 2)
                  </Text>
                </View>

                <View style={[styles.card, { marginTop: 10 }]}>
                  <Text style={styles.infoCardTitle}>Hire Calculation &amp; Tariff Ledger</Text>
                  <View style={{ marginTop: 8 }}>
                    <View style={[styles.row, { borderBottomWidth: 1, borderBottomColor: '#E5E7EB', paddingBottom: 4 }]}>
                      <Text style={[styles.label, { width: '40%' }]}>Charge Description</Text>
                      <Text style={[styles.label, { width: '20%' }]}>Tariff / Rate</Text>
                      <Text style={[styles.label, { width: '20%' }]}>Quantity / Period</Text>
                      <Text style={[styles.label, { width: '20%', textAlign: 'right' }]}>Total (GBP)</Text>
                    </View>

                    <View style={[styles.row, { paddingVertical: 4 }]}>
                      <Text style={[styles.value, { width: '40%' }]}>Base Vehicle Hire Tariff</Text>
                      <Text style={[styles.value, { width: '20%' }]}>£{rentalRate.toFixed(2)}</Text>
                      <Text style={[styles.value, { width: '20%' }]}>Per {rental.type === 'weekly' ? 'Week' : 'Day'}</Text>
                      <Text style={[styles.value, { width: '20%', textAlign: 'right' }]}>£{rentalRate.toFixed(2)}</Text>
                    </View>

                    <View style={[styles.row, { paddingVertical: 4 }]}>
                      <Text style={[styles.value, { width: '40%' }]}>Security Deposit Covenants</Text>
                      <Text style={[styles.value, { width: '20%' }]}>£{vehicle.securityDeposit || 500}</Text>
                      <Text style={[styles.value, { width: '20%' }]}>1 Hold</Text>
                      <Text style={[styles.value, { width: '20%', textAlign: 'right' }]}>£{vehicle.securityDeposit || 500}</Text>
                    </View>

                    <View style={[styles.row, { paddingVertical: 4 }]}>
                      <Text style={[styles.value, { width: '40%' }]}>Collision Damage Waiver / Excess</Text>
                      <Text style={[styles.value, { width: '20%' }]}>Standard Fleet</Text>
                      <Text style={[styles.value, { width: '20%' }]}>Included</Text>
                      <Text style={[styles.value, { width: '20%', textAlign: 'right' }]}>£0.00</Text>
                    </View>
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* PAGE 2 FOOTER */}
          <View style={styles.footer} fixed>
            <Text style={styles.footerText}>{page2FooterText}</Text>
            <Text
              style={styles.pageNumber}
              render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
            />
          </View>
        </Page>
      )}

      {/* ══════════════════════════════════════════════════════════════
          PAGE 3+: FULL TERMS & CONDITIONS, CONTRACT EXECUTION & E-SIGNATURES
         ══════════════════════════════════════════════════════════════ */}
      {includePage3 ? (
        <Page size="A4" style={[styles.page, { paddingBottom: 65 }]}>
          <View style={styles.header} fixed>
            <View style={styles.headerLeft}>
              <SafePdfLogo
                src={page3Entity?.logoUrl || page1Entity?.logoUrl}
                companyName={page3Entity?.fullName || activeProfile.companyName || 'Rental Company'}
                style={styles.logo}
              />
            </View>
            <View style={styles.headerRight}>
              <Text style={styles.companyName}>{page3Entity?.fullName || activeProfile.companyName || 'Rental Company'}</Text>
              {Boolean(page3Entity?.headerDisclaimer || companyDetails?.customHeaderText) && (
                <Text style={[styles.companyDetail, { fontStyle: 'italic', color: '#4B5563', marginBottom: 2 }]}>
                  {page3Entity?.headerDisclaimer || companyDetails?.customHeaderText}
                </Text>
              )}
              <Text style={styles.companyDetail}>{page3Entity?.officialAddress || activeProfile.companyAddress || 'N/A'}</Text>
              <Text style={styles.companyDetail}>Tel: {page3Entity?.phone || activeProfile.phone || 'N/A'}</Text>
              <Text style={styles.companyDetail}>Email: {page3Entity?.email || activeProfile.email || 'N/A'}</Text>
              {Boolean(page3Entity?.website || activeProfile.website) && (
                <Text style={styles.companyDetail}>Web: {page3Entity?.website || activeProfile.website}</Text>
              )}
            </View>
          </View>

          {/* DYNAMIC TERMS CONTAINER - WRAP ENABLED */}
          <View style={{ marginTop: 10, marginBottom: 8 }} wrap={true}>
            <Text style={[styles.sectionTitle, { fontSize: 11, marginBottom: 6, paddingVertical: 4, paddingHorizontal: 8 }]}>
              {resolvedTermsData.isConfigured
                ? resolvedTermsData.title
                : 'STATUTORY COVENANTS & TERMS'}
            </Text>
            {resolvedTermsData.isConfigured && resolvedTermsData.paragraphs.length > 0 ? (
              getPage3TermsContent().map((para, i) => (
                <Text key={i} wrap={true} style={[styles.text, localStyles.termsText]}>
                  {para}
                </Text>
              ))
            ) : (
              <PdfTermsWarningNotice message={resolvedTermsData.warningMessage} />
            )}
          </View>

          {/* CONTRACT EXECUTION & SIGNATURES SECTION - ANCHORED DIRECTLY BELOW FINAL CLAUSE */}
          <View wrap={false} minPresenceAhead={150} style={localStyles.executionAndSignaturesWrapper}>
            <View style={[styles.titleContainer, { marginBottom: 8, paddingBottom: 3 }]}>
              <Text style={[styles.title, { fontSize: 12 }]}>
                CONTRACT EXECUTION &amp; FINAL ACKNOWLEDGEMENT
              </Text>
            </View>

            {/* FINAL ACKNOWLEDGMENT STATEMENT */}
            <View style={[localStyles.termsSection, { backgroundColor: '#F9FAFB', padding: 8, borderRadius: 5, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 8 }]}>
              <Text style={[styles.sectionTitle, { fontSize: 9.5, marginBottom: 4, paddingVertical: 3, paddingHorizontal: 6 }]}>
                {resolvedTrailingTermsData.isConfigured
                  ? resolvedTrailingTermsData.title
                  : 'DECLARATION & TERMS ACKNOWLEDGEMENT'}
              </Text>
              {resolvedTrailingTermsData.isConfigured && resolvedTrailingTermsData.paragraphs.length > 0 ? (
                resolvedTrailingTermsData.paragraphs.map((para, i) => (
                  <Text key={i} wrap={true} style={[styles.text, localStyles.trailingTermsText]}>
                    {para}
                  </Text>
                ))
              ) : (
                <PdfTermsWarningNotice message={resolvedTrailingTermsData.warningMessage} />
              )}
            </View>

            {/* Optional Sign-off box for Satisfaction Notice if template active */}
            {page3Template === 'satisfaction_notice_terms' && (
              <View style={[styles.card, { marginBottom: 8, padding: 6 }]} wrap={false}>
                <Text style={[styles.subLabel, { fontWeight: 'bold', marginBottom: 3, fontSize: 8 }]}>
                  Hirer Acceptance &amp; Satisfaction Declaration
                </Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
                  <View style={{ width: '48%' }}>
                    <Text style={{ fontSize: 7.5, color: '#6B7280' }}>Hirer Name:</Text>
                    <Text style={{ fontSize: 8.5, fontWeight: 'bold' }}>{customer.name}</Text>
                  </View>
                  <View style={{ width: '48%' }}>
                    <Text style={{ fontSize: 7.5, color: '#6B7280' }}>Date of Acknowledgment:</Text>
                    <Text style={{ fontSize: 8.5, fontWeight: 'bold' }}>{signatureExecutionDateFormatted}</Text>
                  </View>
                </View>
              </View>
            )}

            {/* E-SIGNATURE EXECUTION BLOCKS */}
            <View style={localStyles.signatureSection} wrap={false} minPresenceAhead={150}>
              <View style={[styles.signatureBox, localStyles.compactBox, { borderWidth: 1, borderColor: '#3B82F6' }]}>
                {isValidPdfImageSrc(effectiveHirerSignature) && (
                  <Image src={effectiveHirerSignature} style={[styles.signature, localStyles.compactImage]} />
                )}
                <Text style={[styles.signatureLine, localStyles.compactLine]}>Hirer’s Signature</Text>
                <Text style={localStyles.compactText}>{customer.name}</Text>
                <Text style={localStyles.compactText}>Date: {signatureExecutionDateFormatted}</Text>
              </View>

              <View style={[styles.signatureBox, localStyles.compactBox, { borderWidth: 1, borderColor: '#3B82F6' }]}>
                {isValidPdfImageSrc(companyDetails.signature) && (
                  <Image src={companyDetails.signature} style={[styles.signature, localStyles.compactImage]} />
                )}
                <Text style={[styles.signatureLine, localStyles.compactLine]}>Authorized Signature</Text>
                <Text style={localStyles.compactText}>{page1Entity?.tradingName || page1Entity?.fullName || activeProfile.companyName || 'Authorized Signatory'}</Text>
                <Text style={localStyles.compactText}>Date: {signatureExecutionDateFormatted}</Text>
              </View>
            </View>
          </View>

          {/* PAGE 3+ FOOTER */}
          <View style={styles.footer} fixed>
            <Text style={styles.footerText}>{page3FooterText || page1FooterText}</Text>
            <Text
              style={styles.pageNumber}
              render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
            />
          </View>
        </Page>
      ) : (
        /* Standalone execution page when page 3 T&C clauses are disabled */
        <Page size="A4" style={[styles.page, { paddingBottom: 65 }]}>
          <View style={styles.header} fixed>
            <View style={styles.headerLeft}>
              <SafePdfLogo
                src={page1Entity?.logoUrl}
                companyName={page1Entity?.fullName || activeProfile.companyName || 'Rental Company'}
                style={styles.logo}
              />
            </View>
            <View style={styles.headerRight}>
              <Text style={styles.companyName}>{page1Entity?.fullName || activeProfile.companyName || 'Rental Company'}</Text>
              {Boolean(page1Entity?.headerDisclaimer || companyDetails?.customHeaderText) && (
                <Text style={[styles.companyDetail, { fontStyle: 'italic', color: '#4B5563', marginBottom: 2 }]}>
                  {page1Entity?.headerDisclaimer || companyDetails?.customHeaderText}
                </Text>
              )}
              <Text style={styles.companyDetail}>{page1Entity?.officialAddress || activeProfile.companyAddress || 'N/A'}</Text>
              <Text style={styles.companyDetail}>Tel: {page1Entity?.phone || activeProfile.phone || 'N/A'}</Text>
              <Text style={styles.companyDetail}>Email: {page1Entity?.email || activeProfile.email || 'N/A'}</Text>
              {Boolean(page1Entity?.website || activeProfile.website) && (
                <Text style={styles.companyDetail}>Web: {page1Entity?.website || activeProfile.website}</Text>
              )}
            </View>
          </View>

          <View style={{ marginTop: 15 }}>
            <View style={styles.titleContainer}>
              <Text style={[styles.title, { fontSize: 13 }]}>
                CONTRACT EXECUTION &amp; FINAL ACKNOWLEDGEMENT
              </Text>
            </View>

            {/* FINAL ACKNOWLEDGMENT STATEMENT */}
            <View style={[styles.section, localStyles.termsSection, { backgroundColor: '#F9FAFB', padding: 10, borderRadius: 6, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 12 }]}>
              <Text style={[styles.sectionTitle, { fontSize: 11, marginBottom: 6 }]}>
                {resolvedTrailingTermsData.isConfigured
                  ? resolvedTrailingTermsData.title
                  : 'DECLARATION & TERMS ACKNOWLEDGEMENT'}
              </Text>
              {resolvedTrailingTermsData.isConfigured && resolvedTrailingTermsData.paragraphs.length > 0 ? (
                resolvedTrailingTermsData.paragraphs.map((para, i) => (
                  <Text key={i} wrap={true} style={[styles.text, localStyles.trailingTermsText]}>
                    {para}
                  </Text>
                ))
              ) : (
                <PdfTermsWarningNotice message={resolvedTrailingTermsData.warningMessage} />
              )}
            </View>

            {/* Optional Sign-off box for Satisfaction Notice if template active */}
            {page3Template === 'satisfaction_notice_terms' && (
              <View style={[styles.card, { marginBottom: 12, padding: 8 }]} wrap={false}>
                <Text style={[styles.subLabel, { fontWeight: 'bold', marginBottom: 4 }]}>
                  Hirer Acceptance &amp; Satisfaction Declaration
                </Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 3 }}>
                  <View style={{ width: '48%' }}>
                    <Text style={{ fontSize: 8, color: '#6B7280' }}>Hirer Name:</Text>
                    <Text style={{ fontSize: 9, fontWeight: 'bold' }}>{customer.name}</Text>
                  </View>
                  <View style={{ width: '48%' }}>
                    <Text style={{ fontSize: 8, color: '#6B7280' }}>Date of Acknowledgment:</Text>
                    <Text style={{ fontSize: 9, fontWeight: 'bold' }}>{signatureExecutionDateFormatted}</Text>
                  </View>
                </View>
              </View>
            )}

            {/* E-SIGNATURE EXECUTION BLOCKS */}
            <View style={localStyles.signatureSection} wrap={false} minPresenceAhead={150}>
              <View style={[styles.signatureBox, localStyles.compactBox, { borderWidth: 1, borderColor: '#3B82F6' }]}>
                {isValidPdfImageSrc(effectiveHirerSignature) && (
                  <Image src={effectiveHirerSignature} style={[styles.signature, localStyles.compactImage]} />
                )}
                <Text style={[styles.signatureLine, localStyles.compactLine]}>Hirer’s Signature</Text>
                <Text style={localStyles.compactText}>{customer.name}</Text>
                <Text style={localStyles.compactText}>Date: {signatureExecutionDateFormatted}</Text>
              </View>

              <View style={[styles.signatureBox, localStyles.compactBox, { borderWidth: 1, borderColor: '#3B82F6' }]}>
                {isValidPdfImageSrc(companyDetails.signature) && (
                  <Image src={companyDetails.signature} style={[styles.signature, localStyles.compactImage]} />
                )}
                <Text style={[styles.signatureLine, localStyles.compactLine]}>Authorized Signature</Text>
                <Text style={localStyles.compactText}>{page1Entity?.tradingName || page1Entity?.fullName || activeProfile.companyName || 'Authorized Signatory'}</Text>
                <Text style={localStyles.compactText}>Date: {signatureExecutionDateFormatted}</Text>
              </View>
            </View>
          </View>

          {/* FINAL PAGE FOOTER */}
          <View style={styles.footer} fixed>
            <Text style={styles.footerText}>{page1FooterText}</Text>
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

export default RentalAgreement;