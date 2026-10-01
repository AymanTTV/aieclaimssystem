// src/components/pdf/RentalAgreement.tsx
import React from 'react';
import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';
import { Rental, Vehicle, Customer } from '../../types';
import { RENTAL_RATES } from '../../utils/rentalCalculations';
import { format, addDays } from 'date-fns';
import { formatDate } from '../../utils/dateHelpers';
import { resolveNameFields, resolveAddressFields } from '../../utils/nameAddressUtils';
import { getHireCommencementDate, formatInlineCompanyFooter, splitParagraphs } from '../../utils/legalDocumentUtils';
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
    marginBottom: 12,
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
    marginBottom: 5,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  signatureSection: {
    marginTop: 5,
    marginBottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    breakInside: 'avoid',
  },
  compactBox: {
    padding: 5,
    width: '48%',
  },
  compactImage: {
    height: 25,
    marginVertical: 2,
    objectFit: 'contain',
  },
  compactLine: {
    marginTop: 2,
    marginBottom: 2,
    paddingTop: 2,
    fontSize: 9,
  },
  compactText: {
    fontSize: 9,
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

  const page1Entity = (companyDetails as any)?.page1Entity || companyDetails;
  const page2Entity = (companyDetails as any)?.page2Entity || companyDetails;
  const page3Entity = (companyDetails as any)?.page3Entity || companyDetails;

  const pageMapping = (companyDetails as any)?.pageTemplateMapping;
  const page1Template = pageMapping?.page1Template || 'standard_rental_agreement';
  const page2Template = pageMapping?.page2Template || 'checkout_inspection_condition';
  const page3Template = pageMapping?.page3Template || 'statutory_hire_terms';

  const includePage2 = pageMapping
    ? Boolean(pageMapping.includePage2 && pageMapping.page2Template !== 'none')
    : Boolean(
        rental.checkOutCondition != null ||
        (includeImages && (rental.checkOutImages?.length || 0) > 0) ||
        (rental.hireSubstitutionDetails && rental.hireSubstitutionDetails.length > 0)
      );

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

  const getPage3TermsContent = () => {
    if (page3Template === 'strict_commercial_terms') {
      return [
        '1. COMMERCIAL EXCESS & SECURITY DEPOSIT: The Hirer agrees that any damage excess, unrecovered insurance losses, penalties, and traffic/parking fines will be charged immediately to the Hirer or deducted from security deposits.',
        '2. AUTHORIZED DRIVER COVENANTS: Only vetted, fully licensed drivers named in this Agreement are insured to operate the vehicle. Any breach invalidates fleet insurance coverage and creates personal liability for all damages.',
        '3. PROHIBITED USES & SUBLEASING: The vehicle shall not be operated off-road, subleased, used for courier parcel hauling (unless expressly permitted in writing), or used for towing or racing.',
        '4. MAINTENANCE, TIRES & FLUIDS: The Hirer covenants to inspect engine oil, coolant, and tire pressures weekly or every 250 miles. Running the vehicle with deficient fluids constitutes gross negligence.',
        '5. TIMELY RETURN & SUBROGATION: The vehicle must be returned at the appointed check-in timestamp. Failure to return without written authorization incurs standard daily rate plus 25% recovery penalty.',
      ];
    }
    if (page3Template === 'satisfaction_notice_terms') {
      return [
        '1. VEHICLE ACCEPTANCE & CONDITION ACKNOWLEDGEMENT: The Hirer confirms that the vehicle described in this agreement has been received in clean, roadworthy, and acceptable cosmetic and mechanical condition as recorded in the Inspection Report.',
        '2. OPERATIONAL SAFETY VERIFICATION: The Hirer has personally verified that all vehicle safety systems, including headlights, brake lights, indicators, tires, windscreen wipers, and horn, operate satisfactorily.',
        '3. DECLARATION OF FIT & PROPER USE: The Hirer undertakes to operate the vehicle in compliance with all applicable Road Traffic Acts and statutory speed regulations.',
        '4. FINAL SIGN-OFF & SATISFACTION: By accepting hand-over, the Hirer confirms that no undisclosed pre-existing damage exists and agrees to indemnify the Company against subsequent unreported damage upon check-in.',
      ];
    }
    return splitParagraphs(
      companyDetails?.customTermsText ||
      companyDetails?.hireAgreementText ||
      companyDetails?.conditionOfHireText ||
      companyDetails?.termsAndConditions ||
      '1. Standard terms and conditions apply. By signing this agreement, the Hirer acknowledges and agrees to the terms set forth in this Vehicle Hire Agreement.\n2. The Hirer agrees to maintain the vehicle in roadworthy condition and report any defects immediately.\n3. The vehicle must be returned on the agreed date and time.'
    );
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
              {isValidPdfImageSrc(page1Entity?.logoUrl) && (
                <Image src={page1Entity.logoUrl} style={styles.logo} />
              )}
            </View>
            <View style={styles.headerRight}>
              <Text style={styles.companyName}>{page1Entity?.fullName || 'AIE Skyline Limited'}</Text>
              {Boolean(page1Entity?.headerDisclaimer || companyDetails?.customHeaderText) && (
                <Text style={[styles.companyDetail, { fontStyle: 'italic', color: '#4B5563', marginBottom: 2 }]}>
                  {page1Entity?.headerDisclaimer || companyDetails?.customHeaderText}
                </Text>
              )}
              <Text style={styles.companyDetail}>{page1Entity?.officialAddress || 'N/A'}</Text>
              <Text style={styles.companyDetail}>Tel: {page1Entity?.phone || 'N/A'}</Text>
              <Text style={styles.companyDetail}>Email: {page1Entity?.email || 'N/A'}</Text>
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

          {/* CHECK-OUT CONDITION */}
          {rental.checkOutCondition && (
            <View style={[styles.sectionBreak]} wrap={false}>
              <View style={styles.infoCard}>
                <Text style={styles.infoCardTitle}>Main Vehicle Condition at Check-Out</Text>
                <View style={styles.grid}>
                  <View style={styles.gridItem}>
                    <Text style={styles.subLabel}>Check-Out Date & Time:</Text>
                    <Text style={styles.subValue}>{formatDateTime(rental.startDate)}</Text>
                  </View>
                  <View style={styles.gridItem}>
                    <Text style={styles.subLabel}>Mileage:</Text>
                    <Text style={styles.subValue}>
                      {rental.checkOutCondition.mileage?.toLocaleString() ?? 'N/A'} miles
                    </Text>
                  </View>
                  <View style={styles.gridItem}>
                    <Text style={styles.subLabel}>Fuel Level:</Text>
                    <Text style={styles.subValue}>{rental.checkOutCondition.fuelLevel}%</Text>
                  </View>
                  <View style={styles.gridItem}>
                    <Text style={styles.subLabel}>Vehicle Condition:</Text>
                    <Text style={styles.subValue}>
                      {rental.checkOutCondition.isClean ? 'Clean' : 'Needs Cleaning'}
                    </Text>
                  </View>
                </View>
                {rental.checkOutCondition.hasDamage && (
                  <View style={styles.highlight}>
                    <Text style={styles.highlightText}>Existing Damage:</Text>
                    <Text>{rental.checkOutCondition.damageDescription}</Text>
                  </View>
                )}
                {includeImages && (rental.checkOutCondition.images || []).filter(isValidPdfImageSrc).length > 0 && (
                  <View style={{ marginTop: 10 }}>
                    <Text style={{ ...styles.subLabel, marginBottom: 5 }}>Vehicle Images:</Text>
                    <View style={styles.grid}>
                      {(rental.checkOutCondition.images || [])
                        .filter(isValidPdfImageSrc)
                        .slice(0, 7)
                        .map((url, idx) => (
                          <View key={idx} style={styles.gridItem}>
                            <View style={styles.imageContainer}>
                              <Image
                                src={url}
                                style={{ width: '100%', height: 80, objectFit: 'contain' }}
                              />
                            </View>
                            <Text style={styles.imageCaption}>{`Image ${idx + 1}`}</Text>
                          </View>
                        ))}
                    </View>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* ✅ UPDATED: RETURN CONDITION (Visible ONLY when rental is completed) */}
          {rental.status === 'completed' && rental.returnCondition && (
            <View style={[styles.sectionBreak]} wrap={false}>
              <Text style={styles.sectionTitle}>VEHICLE CONDITION AT RETURN</Text>
              <View style={styles.card}>
                <View style={styles.grid}>
                  <View style={styles.gridItem}>
                    <Text style={styles.subLabel}>Return Date & Time:</Text>
                    <Text style={styles.subValue}>{formatDateTime(rental.returnCondition.date)}</Text>
                  </View>
                  <View style={styles.gridItem}>
                    <Text style={styles.subLabel}>Mileage:</Text>
                    <Text style={styles.subValue}>{rental.returnCondition.mileage.toLocaleString()} miles</Text>
                  </View>
                  <View style={styles.gridItem}>
                    <Text style={styles.subLabel}>Total Additional Charges:</Text>
                    <Text style={styles.subValue}>£{rental.returnCondition.totalCharges.toFixed(2)}</Text>
                  </View>
                </View>
                {includeImages && (rental.returnCondition.images || []).filter(isValidPdfImageSrc).length > 0 && (
                  <View style={styles.grid}>
                    {(rental.returnCondition.images || [])
                      .filter(isValidPdfImageSrc)
                      .slice(0, 7)
                      .map((img, i) => (
                        <Image
                          key={i}
                          src={img}
                          style={{
                            width: '30%',
                            margin: '1%',
                            height: 70,
                            objectFit: 'cover',
                          }}
                        />
                      ))}
                  </View>
                )}
              </View>
            </View>
          )}

          {renderSubstitutionVehicles()}

          {/* SUBSTITUTE CONDITION REPORTS */}
          {rental.hireSubstitutionDetails &&
            rental.hireSubstitutionDetails.map((sub, index) => (
              <View key={`sub_card_${index}`} style={[styles.sectionBreak, { marginTop: 10 }]} wrap={false}>
                <View style={styles.infoCard}>
                  <Text style={styles.infoCardTitle}>
                    Condition Report: Substitution Vehicle {index + 1} ({sub.make} {sub.model})
                  </Text>
                  <Text style={[styles.subLabel, { marginTop: 5, marginBottom: 5, color: '#374151' }]}>
                    Check-Out Details
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
  <View style={{ marginTop: 5, marginBottom: 10 }}>
    <Text style={{ ...styles.subLabel, marginBottom: 4 }}>Check-Out Images:</Text>
    <View style={styles.grid}>
      {(sub.images || [])
        .filter(isValidPdfImageSrc)
        .slice(0, 4)
        .map((url, i) => (
          <Image
            key={i}
            src={url}
            // Increased height to 70 and changed objectFit to 'contain'
            style={{ width: '23%', height: 70, objectFit: 'contain', margin: '1%' }}
          />
        ))}
    </View>
  </View>
)}

                  <View style={{ borderTopWidth: 1, borderTopColor: '#E5E7EB', marginTop: 5, paddingTop: 5 }}>
                    <Text style={[styles.subLabel, { marginBottom: 5, color: '#374151' }]}>
                      Return Details (Check-In)
                    </Text>
                    
                    {sub.returnCondition ? (
                      <>
                        <View style={styles.grid}>
                          <View style={styles.gridItem}>
                            <Text style={styles.subLabel}>Date In:</Text>
                            <Text style={styles.subValue}>{formatDateTime(sub.returnCondition.date)}</Text>
                          </View>
                          <View style={styles.gridItem}>
                            <Text style={styles.subLabel}>Mileage In:</Text>
                            <Text style={styles.subValue}>{sub.returnCondition.mileage.toLocaleString()}</Text>
                          </View>
                          <View style={styles.gridItem}>
                            <Text style={styles.subLabel}>Fuel In:</Text>
                            <Text style={styles.subValue}>{sub.returnCondition.fuelLevel}%</Text>
                          </View>
                          <View style={styles.gridItem}>
                            <Text style={styles.subLabel}>Return Charges:</Text>
                            <Text style={styles.subValue}>£{sub.returnCondition.totalCharges.toFixed(2)}</Text>
                          </View>
                        </View>
                      </>
                    ) : (
                      <View style={{ padding: 5, backgroundColor: '#FEF3C7', borderRadius: 4 }}>
                        <Text style={{ fontSize: 9, color: '#92400E', textAlign: 'center' }}>
                          Vehicle currently active (Not returned)
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            ))}

          {/* TERMS AND CONDITIONS SUMMARY & SIGNATURES */}
          <View style={[styles.section, localStyles.termsSection]}>
            <Text style={styles.sectionTitle} minPresenceAhead={60}>DECLARATION &amp; TERMS ACKNOWLEDGEMENT</Text>
            <Text style={styles.text}>
              {companyDetails.termsAndConditions || 'Standard terms and conditions apply. By signing below, the Hirer acknowledges and agrees to the terms set forth in this Vehicle Hire Agreement, confirms receipt of the vehicle in good order, and authorizes payment allocation.'}
            </Text>
          </View>

          {/* SIGNATURE SECTION */}
          <View style={localStyles.signatureSection} wrap={false}>
            <View style={[styles.signatureBox, localStyles.compactBox, { borderWidth: 1, borderColor: '#3B82F6' }]}>
              {isValidPdfImageSrc(rental.signature) && (
                <Image src={rental.signature} style={[styles.signature, localStyles.compactImage]} />
              )}
              <Text style={[styles.signatureLine, localStyles.compactLine]}>Hirer’s Signature</Text>
              <Text style={localStyles.compactText}>{customer.name}</Text>
              <Text style={localStyles.compactText}>Date: {formatDate(signatureDate)}</Text>
            </View>

            <View style={[styles.signatureBox, localStyles.compactBox, { borderWidth: 1, borderColor: '#3B82F6' }]}>
              {isValidPdfImageSrc(companyDetails.signature) && (
                <Image src={companyDetails.signature} style={[styles.signature, localStyles.compactImage]} />
              )}
              <Text style={[styles.signatureLine, localStyles.compactLine]}>Authorized Signature</Text>
              <Text style={localStyles.compactText}>{page1Entity?.tradingName || page1Entity?.fullName || 'AIE SKYLINE'}</Text>
              <Text style={localStyles.compactText}>Date: {formatDate(signatureDate)}</Text>
            </View>
          </View>
        </View>

        {/* FOOTER */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>{page1FooterText}</Text>
          <Text
            style={styles.pageNumber}
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
          />
        </View>
      </Page>

      {/* ══════════════════════════════════════════════════════════════
          PAGE 2: INSPECTION, SUBSTITUTION, OR CHARGE LEDGER
         ══════════════════════════════════════════════════════════════ */}
      {includePage2 && (
        <Page size="A4" style={[styles.page, { paddingBottom: 65 }]}>
          <View style={styles.header} fixed>
            <View style={styles.headerLeft}>
              {isValidPdfImageSrc(page2Entity?.logoUrl) && (
                <Image src={page2Entity.logoUrl} style={styles.logo} />
              )}
            </View>
            <View style={styles.headerRight}>
              <Text style={styles.companyName}>{page2Entity?.fullName || 'AIE Skyline Limited'}</Text>
              {Boolean(page2Entity?.headerDisclaimer || companyDetails?.customHeaderText) && (
                <Text style={[styles.companyDetail, { fontStyle: 'italic', color: '#4B5563', marginBottom: 2 }]}>
                  {page2Entity?.headerDisclaimer || companyDetails?.customHeaderText}
                </Text>
              )}
              <Text style={styles.companyDetail}>{page2Entity?.officialAddress || 'N/A'}</Text>
              <Text style={styles.companyDetail}>Tel: {page2Entity?.phone || 'N/A'}</Text>
              <Text style={styles.companyDetail}>Email: {page2Entity?.email || 'N/A'}</Text>
            </View>
          </View>

          <View style={{ marginTop: 10 }}>
            {/* SUB-TEMPLATE A: VEHICLE CONDITION & INSPECTION PHOTOS */}
            {page2Template === 'checkout_inspection_condition' && (
              <View>
                <View style={styles.titleContainer}>
                  <Text style={[styles.title, { fontSize: 13 }]}>
                    VEHICLE CONDITION &amp; INSPECTION REPORT (PAGE 2)
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
                          {rental.checkOutCondition?.mileage?.toLocaleString() ?? 'N/A'} miles
                        </Text>
                      </View>
                      <View style={styles.gridItem}>
                        <Text style={styles.subLabel}>Fuel Level:</Text>
                        <Text style={styles.subValue}>{rental.checkOutCondition?.fuelLevel ?? 100}%</Text>
                      </View>
                      <View style={styles.gridItem}>
                        <Text style={styles.subLabel}>Cleanliness:</Text>
                        <Text style={styles.subValue}>
                          {rental.checkOutCondition?.isClean ? 'Clean & Roadworthy' : 'Needs Cleaning'}
                        </Text>
                      </View>
                    </View>

                    {rental.checkOutCondition?.hasDamage && (
                      <View style={styles.highlight}>
                        <Text style={styles.highlightText}>Recorded Damage (Out):</Text>
                        <Text>{rental.checkOutCondition.damageDescription}</Text>
                      </View>
                    )}

                    {includeImages && (rental.checkOutCondition?.images || []).filter(isValidPdfImageSrc).length > 0 && (
                      <View style={{ marginTop: 8 }}>
                        <Text style={{ ...styles.subLabel, marginBottom: 4 }}>Check-Out High-Res Inspection Images:</Text>
                        <View style={styles.grid}>
                          {(rental.checkOutCondition?.images || [])
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
                {rental.status === 'completed' && rental.returnCondition && (
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
                )}
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
          PAGE 3: TRAILING STATUTORY / COMMERCIAL TERMS & CONDITIONS
         ══════════════════════════════════════════════════════════════ */}
      {includePage3 && (
        <Page size="A4" style={[styles.page, { paddingBottom: 65 }]}>
          <View style={styles.header} fixed>
            <View style={styles.headerLeft}>
              {isValidPdfImageSrc(page3Entity?.logoUrl) && (
                <Image src={page3Entity.logoUrl} style={styles.logo} />
              )}
            </View>
            <View style={styles.headerRight}>
              <Text style={styles.companyName}>{page3Entity?.fullName || 'AIE Skyline Limited'}</Text>
              {Boolean(page3Entity?.headerDisclaimer || companyDetails?.customHeaderText) && (
                <Text style={[styles.companyDetail, { fontStyle: 'italic', color: '#4B5563', marginBottom: 2 }]}>
                  {page3Entity?.headerDisclaimer || companyDetails?.customHeaderText}
                </Text>
              )}
              <Text style={styles.companyDetail}>{page3Entity?.officialAddress || 'N/A'}</Text>
              <Text style={styles.companyDetail}>Tel: {page3Entity?.phone || 'N/A'}</Text>
              <Text style={styles.companyDetail}>Email: {page3Entity?.email || 'N/A'}</Text>
            </View>
          </View>

          <View style={{ marginTop: 15, marginBottom: 15 }}>
            <Text style={[styles.sectionTitle, { fontSize: 12, textDecoration: 'underline', marginBottom: 12 }]}>
              {page3Template === 'strict_commercial_terms'
                ? 'COMMERCIAL FLEET & DAMAGE EXCESS COVENANTS'
                : page3Template === 'satisfaction_notice_terms'
                ? 'SATISFACTION NOTICE & HIRER SIGN-OFF'
                : companyDetails?.customTermsTitle || 'STATUTORY TERMS AND CONDITIONS OF VEHICLE HIRE'}
            </Text>
            {getPage3TermsContent().map((para, i) => (
              <Text key={i} style={[styles.text, { fontSize: 8.5, lineHeight: 1.45, marginBottom: 6, textAlign: 'justify', color: '#374151' }]}>
                {para}
              </Text>
            ))}
          </View>

          {/* Optional Sign-off box on Page 3 for Satisfaction Notice */}
          {page3Template === 'satisfaction_notice_terms' && (
            <View style={[styles.card, { marginTop: 15, padding: 10 }]} wrap={false}>
              <Text style={[styles.subLabel, { fontWeight: 'bold', marginBottom: 6 }]}>
                Hirer Acceptance &amp; Satisfaction Declaration
              </Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                <View style={{ width: '48%' }}>
                  <Text style={{ fontSize: 8, color: '#6B7280' }}>Hirer Name:</Text>
                  <Text style={{ fontSize: 9, fontWeight: 'bold' }}>{customer.name}</Text>
                </View>
                <View style={{ width: '48%' }}>
                  <Text style={{ fontSize: 8, color: '#6B7280' }}>Date of Acknowledgment:</Text>
                  <Text style={{ fontSize: 9, fontWeight: 'bold' }}>{formatDate(signatureDate)}</Text>
                </View>
              </View>
            </View>
          )}

          <View style={styles.footer} fixed>
            <Text style={styles.footerText}>{page3FooterText}</Text>
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