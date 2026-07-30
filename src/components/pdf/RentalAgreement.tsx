// src/components/pdf/RentalAgreement.tsx
import React from 'react';
import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';
import { Rental, Vehicle, Customer } from '../../types';
import { RENTAL_RATES } from '../../utils/rentalCalculations';
import { format, addDays } from 'date-fns';
import { formatDate } from '../../utils/dateHelpers';
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
    padding: 8,
    marginBottom: 15,
  },
  hirerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  hirerItem: {
    flex: 1,
    alignItems: 'flex-start',
    paddingHorizontal: 4,
  },
  hirerLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#1E40AF',
    marginBottom: 1,
  },
  hirerValue: {
    fontSize: 9,
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
  const signatureDate = rental.startDate;

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

  return (
    <Document>
      <Page size="A4" style={[styles.page, { paddingBottom: 65 }]}>
        <View style={localStyles.content}>
          {/* HEADER */}
          <View style={styles.header} fixed>
            <View style={styles.headerLeft}>
              {isValidPdfImageSrc(companyDetails?.logoUrl) && (
                <Image src={companyDetails.logoUrl} style={styles.logo} />
              )}
            </View>
            <View style={styles.headerRight}>
              <Text style={styles.companyName}>{companyDetails?.fullName || 'AIE Skyline Limited'}</Text>
              <Text style={styles.companyDetail}>{companyDetails?.officialAddress || 'N/A'}</Text>
              <Text style={styles.companyDetail}>Tel: {companyDetails?.phone || 'N/A'}</Text>
              <Text style={styles.companyDetail}>Email: {companyDetails?.email || 'N/A'}</Text>
            </View>
          </View>

          {/* TITLE */}
          <View style={styles.titleContainer}>
            <Text style={styles.title}>
              RENTAL AGREEMENT {rental.rentalAgreementNumber ? `#${rental.rentalAgreementNumber}` : ''}
            </Text>
          </View>

          {/* NEW HORIZONTAL HIRER DETAILS CARD */}
          <View style={localStyles.hirerInfoCard}>
            <View style={localStyles.hirerRow}>
              <View style={localStyles.hirerItem}>
                <Text style={localStyles.hirerLabel}>Hirer Name</Text>
                <Text style={localStyles.hirerValue}>{customer.name}</Text>
              </View>
              <View style={localStyles.hirerItem}>
                <Text style={localStyles.hirerLabel}>Date of Birth</Text>
                <Text style={localStyles.hirerValue}>{formatDate(customer.dateOfBirth)}</Text>
              </View>
              <View style={localStyles.hirerItem}>
                <Text style={localStyles.hirerLabel}>License Number</Text>
                <Text style={localStyles.hirerValue}>{customer.driverLicenseNumber}</Text>
              </View>
              <View style={localStyles.hirerItem}>
                <Text style={localStyles.hirerLabel}>Badge Number</Text>
                <Text style={localStyles.hirerValue}>{customer.badgeNumber || 'N/A'}</Text>
              </View>
            </View>
            <View style={localStyles.hirerRow}>
              <View style={localStyles.hirerItem}>
                <Text style={localStyles.hirerLabel}>Address</Text>
                <Text style={localStyles.hirerValue}>{customer.address}</Text>
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
                <Text style={styles.label}>Make & Model:</Text>
                <Text style={styles.value}>
                  {displayVehicle.make} {displayVehicle.model}
                </Text>
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
                    <Text style={styles.label}>Make & Model:</Text>
                    <Text style={styles.value}>
                      {activeSub.make} {activeSub.model}
                    </Text>
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

          {/* TERMS AND CONDITIONS */}
          <View style={[styles.section, localStyles.termsSection]}>
            <Text style={styles.sectionTitle} minPresenceAhead={60}>TERMS AND CONDITIONS</Text>
            <Text style={styles.text}>
              {companyDetails.termsAndConditions || 'Standard terms and conditions apply. By signing below, the Hirer acknowledges and agrees to the terms set forth in this Vehicle Hire Agreement.'}
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
              <Text style={localStyles.compactText}>{companyDetails.name || 'AIE SKYLINE'}</Text>
              <Text style={localStyles.compactText}>Date: {formatDate(signatureDate)}</Text>
            </View>
          </View>
        </View>

        {/* FOOTER */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            AIE SKYLINE LIMITED, registered in England and Wales with the company registration number 15616639,
            registered office address: United House, 39-41 North Road, London, N7 9DP. VAT. NO. 453448875
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

export default RentalAgreement;