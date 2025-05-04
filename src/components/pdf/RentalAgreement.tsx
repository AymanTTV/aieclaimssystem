import React from 'react';
import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer'; // Import StyleSheet
import { Rental, Vehicle, Customer, DEFAULT_RENTAL_PRICES } from '../../types';
import { format, addDays } from 'date-fns';
import logo from '../../assets/logo.png';
import { formatDate } from '../../utils/dateHelpers';
import { styles } from './styles'; // Assuming styles are imported from the provided file

// Create a local style for the signature section positioning
// This does NOT modify the imported global styles object
const localStyles = StyleSheet.create({
  signatureSectionPositioning: {
    position: 'absolute', // Position absolutely
    bottom: 50, // Adjusted this value to position above the footer (footer is at bottom: 30)
    left: 40, // Match page padding
    right: 40, // Match page padding
    flexDirection: 'row',
    justifyContent: 'space-between',
    breakInside: 'avoid',
    pageBreakInside: 'avoid',
    // Remove marginBottom as positioning is absolute
  },
});


const generateAgreementNumber = (id: string): string => {
  const number = id.slice(-3).padStart(3, '0');
  return `AIE-${number}`;
};

const RentalAgreement: React.FC<{
  rental: Rental;
  vehicle: Vehicle;
  customer: Customer;
  companyDetails: any;
}> = ({ rental, vehicle, customer, companyDetails = {} }) => {
  const formatDateTime = (date: Date | string | null | undefined): string => {
    if (!date) return 'N/A';

    try {
      // Handle Firestore Timestamps if present
      if ((date as any).toDate) {
        date = (date as any).toDate();
      }

      const dateObj = typeof date === 'string' ? new Date(date) : date;

      if (dateObj instanceof Date && !isNaN(dateObj.getTime())) {
        return format(dateObj, 'dd/MM/yyyy HH:mm');
      }

      return 'N/A';
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'N/A';
    }
  };

  const getRentalRate = (rentalType: Rental['type'], vehicle: Vehicle): number => {
    switch (rentalType) {
      case 'weekly':
        return vehicle.weeklyRentalPrice ?? DEFAULT_RENTAL_PRICES.weekly;
      case 'daily':
        return vehicle.dailyRentalPrice ?? DEFAULT_RENTAL_PRICES.daily;
      case 'claim':
        return vehicle.claimRentalPrice ?? DEFAULT_RENTAL_PRICES.claim;
      default:
        return 0;
    }
  };

  const rentalRate = getRentalRate(rental.type, vehicle);

  // Calculate the default end date (90 days from start date)
  const defaultEndDate = rental.startDate ? addDays(new Date(rental.startDate), 90) : null;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* HEADER */}
        <View style={styles.header}>
          <Image src={logo} style={styles.logo} />
          <View style={styles.companyInfo}>
            <Text>{companyDetails.fullName || 'AIE SKYLINE'}</Text>
            <Text>{companyDetails.officialAddress || ''}</Text>
            <Text>Tel: {companyDetails.phone || ''}</Text>
            <Text>Email: {companyDetails.email || ''}</Text>
            <Text>VAT No: {companyDetails.vatNumber || ''}</Text>
          </View>
        </View>

        {/* TITLE */}
        <Text style={styles.title}>VEHICLE RENTAL AGREEMENT</Text>
        {/* <Text style={styles.agreementNumber}>Agreement No: {generateAgreementNumber(rental.id)}</Text> */}

        {/* HIRER & VEHICLE DETAILS */}
        <View style={{ ...styles.sectionBreak, flexDirection: 'row', justifyContent: 'space-between' }} wrap={false}>
          {/* HIRER DETAILS */}
          <View style={[styles.card, { width: '48%' }]}>
            <Text style={styles.sectionTitle}>HIRER DETAILS</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Name:</Text>
              <Text style={styles.value}>{customer.name}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Date of Birth:</Text>
              <Text style={styles.value}>{formatDateTime(customer.dateOfBirth)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Address:</Text>
              <Text style={styles.value}>{customer.address}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Contact Number:</Text>
              <Text style={styles.value}>{customer.mobile}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>License Number:</Text>
              <Text style={styles.value}>{customer.driverLicenseNumber}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>License Valid Until:</Text>
              <Text style={styles.value}>{formatDateTime(customer.licenseExpiry)}</Text>
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
              <Text style={styles.value}>{vehicle.make} {vehicle.model}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Registration:</Text>
              <Text style={styles.value}>{vehicle.registrationNumber}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Current Mileage:</Text>
              <Text style={styles.value}>{vehicle.mileage.toLocaleString()} miles</Text>
            </View>
          </View>
        </View>

        {/* RENTAL DETAILS */}
        <View style={styles.sectionBreak} wrap={false}>
          <Text style={styles.sectionTitle}>RENTAL DETAILS</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCell, { flex: 1 }]}>Rental Type</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>Start Date & Time</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>End Date & Time</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 1 }]}>{rental.type.toUpperCase()}</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>{formatDateTime(rental.startDate)}</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>
                {formatDateTime(
                  rental.status === 'completed' && rental.endDate
                    ? rental.endDate
                    : defaultEndDate // Use the calculated 90-day end date
                )}
              </Text>
            </View>
          </View>
        </View>

        {/* PAYMENT DETAILS */}
        <View style={styles.sectionBreak} wrap={false}>
          <View style={styles.infoCard}>
            <Text style={styles.infoCardTitle}>PAYMENT DETAILS</Text>
            <View style={styles.row}><Text style={styles.label}>Payment Type:</Text><Text style={styles.value}>{rental.type.toUpperCase()}</Text></View>
            <View style={styles.row}><Text style={styles.label}>Rate:</Text><Text style={styles.value}>£{rentalRate} per {rental.type === 'weekly' ? 'week' : 'day'}</Text></View>
            <View style={styles.row}><Text style={styles.label}>Payment Due:</Text><Text style={styles.value}>{rental.type === 'weekly' ? 'Every Monday' : 'Daily'}</Text></View>
          </View>
        </View>

        <Text style={styles.warningText}>Maximum Period of Hire: 90 Days</Text>

        {/* VEHICLE CONDITION AT CHECK-OUT */}
        {rental.checkOutCondition && (
          <View style={styles.sectionBreak} wrap={false}>
            <View style={styles.infoCard}>
              <Text style={styles.infoCardTitle}>Vehicle Condition at Check-Out</Text>

              <View style={styles.grid}>
                <View style={styles.gridItem}><Text style={styles.label}>Check-Out Date & Time:</Text><Text style={styles.value}>{formatDateTime(rental.checkOutCondition.date)}</Text></View>
                <View style={styles.gridItem}><Text style={styles.label}>Mileage:</Text><Text style={styles.value}>{rental.checkOutCondition.mileage.toLocaleString()} miles</Text></View>
                <View style={styles.gridItem}><Text style={styles.label}>Fuel Level:</Text><Text style={styles.value}>{rental.checkOutCondition.fuelLevel}%</Text></View>
                <View style={styles.gridItem}><Text style={styles.label}>Vehicle Condition:</Text><Text style={styles.value}>{rental.checkOutCondition.isClean ? 'Clean' : 'Needs Cleaning'}</Text></View>
              </View>

              {rental.checkOutCondition.hasDamage && (
                <View style={styles.highlight}>
                  <Text style={styles.highlightText}>Existing Damage:</Text>
                  <Text>{rental.checkOutCondition.damageDescription}</Text>
                </View>
              )}

              {/* Vehicle Images Grid */}
              {rental.checkOutCondition.images?.length > 0 && (
                <View style={styles.grid}>
                  {rental.checkOutCondition.images.map((url, index) => (
                    <View key={index} style={{ width: '33.33%', padding: 4 }}>
                     <Image src={url} style={{ width: '100%', height: 100, objectFit: 'contain' }} />

                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        )}

        {/* Terms and Conditions */}
        {/* Removed marginBottom from this section to allow signature section to position correctly */}
        <View style={[styles.section, styles.sectionBreak, { marginBottom: 0 }]}>
          <Text style={styles.sectionTitle}>TERMS AND CONDITIONS</Text>
          <Text>{companyDetails.termsAndConditions || 'Standard terms and conditions apply.'}</Text>
        </View>

        {/* Signatures - Now positioned absolutely */}
        <View style={[styles.signatureSection, styles.sectionBreak]}>
          <View style={styles.signatureBox}>
            {rental.signature && (
              <Image src={rental.signature} style={styles.signature} />
            )}
            <Text style={styles.signatureLine}>Hirer's Signature</Text>
            <Text>{customer.name}</Text>
            <Text>Date {formatDate(rental.startDate, true)}</Text>
          </View>
          <View style={styles.signatureBox}>
            {companyDetails.signature && (
              <Image src={companyDetails.signature} style={styles.signature} />
            )}
            <Text style={styles.signatureLine}>Authorized Signature</Text>
            <Text>{companyDetails.name || 'AIE SKYLINE'}</Text>
            <Text>Date: {formatDate(rental.startDate, true)}</Text>
          </View>
        </View>

        {/* Footer */}
        {/* Added the footer back using the provided structure and global styles */}
        <Text style={styles.footer}>
          {companyDetails.fullName} | Registered in England and Wales | Company No: {companyDetails.registrationNumber}
        </Text>

      </Page>
    </Document>
  );
};

export default RentalAgreement;
