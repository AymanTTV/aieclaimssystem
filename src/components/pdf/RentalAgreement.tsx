// src/components/pdf/documents/RentalAgreement.tsx
import React from 'react';
import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';
import { Rental, Vehicle, Customer, DEFAULT_RENTAL_PRICES } from '../../types';
import { format, addDays } from 'date-fns';
import logo from '../../assets/logo.png';
import { formatDate } from '../../utils/dateHelpers';
import { styles } from './styles'; // ← your existing styles.ts

// Local style for the absolutely‐positioned signature section
const localStyles = StyleSheet.create({
  signatureSectionPositioning: {
    position: 'absolute',
    bottom: 50,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    breakInside: 'avoid',
    pageBreakInside: 'avoid',
  },
});

const RentalAgreement: React.FC<{
  rental: Rental;
  vehicle: Vehicle;
  customer: Customer;
  companyDetails: any;
}> = ({ rental, vehicle, customer, companyDetails = {} }) => {
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

  const getRentalRate = (rentalType: Rental['type'], v: Vehicle): number => {
    switch (rentalType) {
      case 'weekly':
        return v.weeklyRentalPrice ?? DEFAULT_RENTAL_PRICES.weekly;
      case 'daily':
        return v.dailyRentalPrice ?? DEFAULT_RENTAL_PRICES.daily;
      case 'claim':
        return v.claimRentalPrice ?? DEFAULT_RENTAL_PRICES.claim;
      default:
        return 0;
    }
  };

  const rentalRate = getRentalRate(rental.type, vehicle);
  const defaultEndDate = rental.startDate
    ? addDays(
        new Date(
          rental.startDate instanceof Date ? rental.startDate : String(rental.startDate)
        ),
        90
      )
    : null;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* HEADER */}
        <View style={styles.header}>
          <Image src={logo} style={styles.logo} />
          <View style={styles.companyInfo}>
            <Text style={styles.companyName}>
              {companyDetails.fullName || 'AIE SKYLINE'}
            </Text>
            <Text style={styles.companyDetail}>
              {companyDetails.officialAddress || ''}
            </Text>
            <Text style={styles.companyDetail}>Tel: {companyDetails.phone || ''}</Text>
            <Text style={styles.companyDetail}>Email: {companyDetails.email || ''}</Text>
            <Text style={styles.companyDetail}>VAT No: {companyDetails.vatNumber || ''}</Text>
          </View>
        </View>

        {/* TITLE */}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>VEHICLE RENTAL AGREEMENT</Text>
        </View>

        {/* HIRER & VEHICLE DETAILS */}
        <View
          style={{
            marginBottom: 15,
            flexDirection: 'row',
            justifyContent: 'space-between',
          }}
        >
          {/* HIRER DETAILS */}
          <View style={[styles.card, { width: '48%' }]}>
            <Text style={styles.sectionTitle}>HIRER DETAILS</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Name:</Text>
              <Text style={styles.value}>{customer.name}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Date of Birth:</Text>
              <Text style={styles.value}>
                {formatDateTime(customer.dateOfBirth)}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Address:</Text>
              <Text style={styles.value}>{customer.address}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>License Number:</Text>
              <Text style={styles.value}>{customer.driverLicenseNumber}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>License Valid Until:</Text>
              <Text style={styles.value}>
                {formatDateTime(customer.licenseExpiry)}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Badge Number:</Text>
              <Text style={styles.value}>{customer.badgeNumber}</Text>
            </View>
          </View>

          {/* VEHICLE DETAILS */}
          <View style={[styles.card, { width: '48%' }]}>
            <Text style={styles.sectionTitle}>VEHICLE DETAILS</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Make & Model:</Text>
              <Text style={styles.value}>
                {vehicle.make} {vehicle.model}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Registration:</Text>
              <Text style={styles.value}>{vehicle.registrationNumber}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Current Mileage:</Text>
              <Text style={styles.value}>
                {vehicle.mileage?.toLocaleString() ?? 'N/A'} miles
              </Text>
            </View>
          </View>
        </View>

        {/* RENTAL + PAYMENT DETAILS (kept together) */}
        <View wrap={false}>
          {/* RENTAL DETAILS */}
          <View style={{ marginBottom: 15 }} wrap={false}>
            <Text style={styles.sectionTitle}>RENTAL DETAILS</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Rental Type</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1 }]}>
                  Start Date & Time
                </Text>
                <Text style={[styles.tableHeaderCell, { flex: 1 }]}>
                  End Date & Time
                </Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 1 }]}>
                  {rental.type.toUpperCase()}
                </Text>
                <Text style={[styles.tableCell, { flex: 1 }]}>
                  {formatDateTime(rental.startDate)}
                </Text>
                <Text style={[styles.tableCell, { flex: 1 }]}>
                  {rental.status === 'completed' && rental.endDate
                    ? formatDateTime(rental.endDate)
                    : formatDateTime(defaultEndDate)}
                </Text>
              </View>
            </View>
          </View>

          {/* PAYMENT DETAILS */}
          <View style={{ marginBottom: 15 }} wrap={false}>
            <Text style={styles.sectionTitle}>PAYMENT DETAILS</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { flex: 1 }]}>
                  Payment Type
                </Text>
                <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Rate</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1 }]}>
                  Payment Due
                </Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 1 }]}>
                  {rental.type.toUpperCase()}
                </Text>
                <Text style={[styles.tableCell, { flex: 1 }]}>
                  £{rentalRate} per {rental.type === 'weekly' ? 'week' : 'day'}
                </Text>
                <Text style={[styles.tableCell, { flex: 1 }]}>
                  {rental.type === 'weekly' ? 'Every Monday' : 'Daily'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <Text style={styles.warningText}>Maximum Period of Hire: 90 Days</Text>

        {/* VEHICLE CONDITION AT CHECK-OUT */}
        {rental.checkOutCondition && (
          <View style={[styles.sectionBreak]} wrap={false}>
            <View style={styles.infoCard}>
              <Text style={styles.infoCardTitle}>
                Vehicle Condition at Check-Out
              </Text>

              <View style={styles.grid}>
                <View style={styles.gridItem}>
                  <Text style={styles.subLabel}>Check-Out Date & Time:</Text>
                  <Text style={styles.subValue}>
                    {formatDateTime(rental.checkOutCondition.date)}
                  </Text>
                </View>
                <View style={styles.gridItem}>
                  <Text style={styles.subLabel}>Mileage:</Text>
                  <Text style={styles.subValue}>
                    {rental.checkOutCondition.mileage?.toLocaleString() ??
                      'N/A'}{' '}
                    miles
                  </Text>
                </View>
                <View style={styles.gridItem}>
                  <Text style={styles.subLabel}>Fuel Level:</Text>
                  <Text style={styles.subValue}>
                    {rental.checkOutCondition.fuelLevel}%
                  </Text>
                </View>
                <View style={styles.gridItem}>
                  <Text style={styles.subLabel}>Vehicle Condition:</Text>
                  <Text style={styles.subValue}>
                    {rental.checkOutCondition.isClean
                      ? 'Clean'
                      : 'Needs Cleaning'}
                  </Text>
                </View>
              </View>

              {rental.checkOutCondition.hasDamage && (
                <View style={styles.highlight}>
                  <Text style={styles.highlightText}>Existing Damage:</Text>
                  <Text>{rental.checkOutCondition.damageDescription}</Text>
                </View>
              )}

              {/* Vehicle Images Grid */}
              {rental.checkOutCondition.images?.length > 0 && (
                <View style={{ marginTop: 10 }}>
                  <Text style={{ ...styles.subLabel, marginBottom: 5 }}>
                    Vehicle Images:
                  </Text>
                  <View style={styles.grid}>
                    {(rental.checkOutCondition.images || [])
                      .filter(
                        (url): url is string =>
                          typeof url === 'string' && url.startsWith('http')
                      )
                      .slice(0, 5)
                      .map((url, idx) => (
                        <View key={idx} style={styles.gridItem}>
                          <View style={styles.imageContainer}>
                            <Image
                              src={url}
                              style={{ width: '100%', height: 120, objectFit: 'contain' }}
                              onError={(err) =>
                                console.error(
                                  `PDF Image ${idx} failed to load:`,
                                  err.message || err
                                )
                              }
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

        {/* TERMS AND CONDITIONS */}
        <View style={[styles.section, styles.sectionBreak, { marginBottom: 100 }]}>
          <Text style={styles.sectionTitle}>TERMS AND CONDITIONS</Text>
          <Text style={styles.text}>
            {companyDetails.termsAndConditions ||
              'Standard terms and conditions apply.'}
          </Text>
        </View>

        {/* SIGNATURES – absolutely positioned above footer */}
        <View style={[localStyles.signatureSectionPositioning]}>
          {/* Hirer’s Signature Box */}
          <View style={[styles.signatureBox, { borderWidth: 1, borderColor: '#3B82F6' }]}>
            {rental.signature && (
              <Image src={rental.signature} style={styles.signature} />
            )}
            <Text style={styles.signatureLine}>Hirer’s Signature</Text>
            <Text>{customer.name}</Text>
            <Text>Date: {formatDate(rental.startDate, true)}</Text>
          </View>

          {/* Authorized Signature Box */}
          <View style={[styles.signatureBox, { borderWidth: 1, borderColor: '#3B82F6' }]}>
            {companyDetails.signature && (
              <Image src={companyDetails.signature} style={styles.signature} />
            )}
            <Text style={styles.signatureLine}>Authorized Signature</Text>
            <Text>{companyDetails.name || 'AIE SKYLINE'}</Text>
            <Text>Date: {formatDate(rental.startDate, true)}</Text>
          </View>
        </View>

        {/* FOOTER */}
        <Text style={styles.footer}>
          {companyDetails.fullName || 'AIE SKYLINE'} | Registered in England and Wales | Company No:{' '}
          {companyDetails.registrationNumber || 'N/A'}
        </Text>
      </Page>
    </Document>
  );
};

export default RentalAgreement;
