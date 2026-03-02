// src/components/pdf/ParkingPermitLetter.tsx
import React from 'react';
import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
} from '@react-pdf/renderer';
import { styles as globalStyles } from './styles';
import logo from '../../assets/logo.png';
import logoBlur from '../../assets/logo.png'; // blurred logo for watermark
import signatureImg from '../../assets/signiture.png';
import { Rental, Vehicle, Customer } from '../../types';

interface ParkingPermitLetterProps {
  rental: Rental;
  vehicle: Vehicle;
  customer: Customer;
  companyDetails: {
    fullName: string;
    officialAddress: string;
    phone: string;
    email: string;
    website: string;
    registrationNumber: string;
    vatNumber: string;
    logoUrl?: string;
  };
}

const localStyles = StyleSheet.create({
  watermark: {
    position: 'absolute',
    top: '30%',
    left: '20%',
    width: '60%',
    height: 400, // FIXED: Constrain height to prevent overflow
    objectFit: 'contain', // FIXED: Ensure aspect ratio doesn't break layout
    opacity: 0.05,
  },
  blueLine: {
    borderBottomColor: '#3B82F6',
    borderBottomWidth: 1,
    marginVertical: 8,
  },
  date: {
    ...globalStyles.companyDetail,
    textAlign: 'right' as const,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 16,
  },
  centeredBold: {
    textAlign: 'center' as const,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 8,
  },
  subject: {
    textAlign: 'center' as const,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 20,
  },
  paragraph: {
    marginBottom: 12,
    lineHeight: 1.5,
  },
  listTitle: {
    fontFamily: 'Helvetica-Bold',
    marginBottom: 6,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 4,
    paddingLeft: 0,
  },
  bulletText: {
    flex: 1,
    lineHeight: 1.4,
  },
  signatureSection: {
    marginTop: 24,
  },
  signatureImage: {
    width: 120,
    height: 40,
    objectFit: 'contain' as const,
    marginBottom: 4,
  },
  signerName: {
    fontFamily: 'Helvetica-Bold',
  },
  footerContainer: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
  },
  footerText: {
    fontSize: 8,
    textAlign: 'center' as const,
    marginBottom: 2,
  },
  footerBarGreen: {
    height: 12,
    backgroundColor: '#4CAF50',
  },
  footerBarBlue: {
    height: 18,
    backgroundColor: '#005EB8',
  },
});

export const ParkingPermitLetter: React.FC<ParkingPermitLetterProps> = ({
  rental,
  vehicle,
  customer,
  companyDetails,
}) => {
  const today = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <Document>
      {/* FIXED: Overriding global paddingBottom (was 90) to 60 to prevent blank page */}
      <Page size="A4" style={[globalStyles.page, { paddingBottom: 60 }]}>
        {/* Watermark */}
        <Image
          src={companyDetails.logoUrl || logoBlur}
          style={localStyles.watermark}
        />

        {/* Header */}
        <View style={globalStyles.header}>
          <View style={globalStyles.headerLeft}>
            <Image
              src={companyDetails.logoUrl || logo}
              style={globalStyles.logo}
              cache={false}
            />
          </View>
          <View style={globalStyles.headerRight}>
            <Text style={globalStyles.companyDetail}>Tel: {companyDetails.phone}</Text>
            <Text style={globalStyles.companyDetail}>Email: {companyDetails.email}</Text>
            <Text style={globalStyles.companyDetail}>Web: {companyDetails.website}</Text>
            <Text style={globalStyles.companyDetail}>{companyDetails.officialAddress}</Text>
          </View>
        </View>

        {/* Divider */}
        <View style={localStyles.blueLine} />

        {/* Date */}
        <Text style={localStyles.date}>{today}</Text>

        {/* Title Lines */}
        <Text style={localStyles.centeredBold}>To Whom It May Concern</Text>
        <Text style={localStyles.subject}>
          Subject: Parking Permit Support for Hired Vehicle {vehicle.registrationNumber}
        </Text>

        {/* Body Text */}
        <Text style={localStyles.paragraph}>
          We are writing to support the application for a parking permit for {customer.name} at his residential address.
        </Text>
        <Text style={localStyles.paragraph}>
          {customer.name} has the vehicle detailed below on a long-term hire agreement with our company, and we understand he requires a permit to park at his home.
        </Text>

        {/* Driver Info */}
        <Text style={localStyles.listTitle}>Driver Information:</Text>
        <View style={localStyles.infoRow}>
          <Text style={localStyles.bulletText}>Name: {customer.name}</Text>
        </View>
        <View style={localStyles.infoRow}>
          <Text style={localStyles.bulletText}>Address: {customer.address}</Text>
        </View>

        {/* Vehicle Info */}
        <Text style={[localStyles.listTitle, { marginTop: 8 }]}>Vehicle Information:</Text>
        <View style={localStyles.infoRow}>
          <Text style={localStyles.bulletText}>
            Make & Model: {vehicle.make} {vehicle.model}
          </Text>
        </View>
        <View style={localStyles.infoRow}>
          <Text style={localStyles.bulletText}>
            Registration Number: {vehicle.registrationNumber}
          </Text>
        </View>
        <View style={localStyles.infoRow}>
          <Text style={localStyles.bulletText}>
            Registered Owner: {companyDetails.fullName}
          </Text>
        </View>

        {/* Concluding Text */}
        <Text style={[localStyles.paragraph, { marginTop: 8 }]}>
          We confirm that {customer.name} is the legitimate user of this vehicle under an active hire agreement with {companyDetails.fullName}.
        </Text>
        <Text style={localStyles.paragraph}>
          Please let us know if any further information or documentation is required from us as the vehicle's registered owner.
        </Text>

        {/* Signature */}
        <View style={localStyles.signatureSection}>
          <Text style={{ fontFamily: 'Helvetica-Bold', marginBottom: 4 }}>Yours faithfully,</Text>
          <Image src={signatureImg} style={localStyles.signatureImage} />
          <Text style={localStyles.signerName}>Admin Team</Text>
          <Text>{companyDetails.fullName}</Text>
        </View>

        {/* Footer */}
        <View style={localStyles.footerContainer}>
          <Text style={localStyles.footerText}>
            {companyDetails.fullName} Registered in England and Wales with company registration no {companyDetails.registrationNumber}.
          </Text>
          <Text style={localStyles.footerText}>
            Registered office: {companyDetails.officialAddress} • VAT no {companyDetails.vatNumber}
          </Text>
          <View style={localStyles.footerBarGreen} />
          <View style={localStyles.footerBarBlue} />
        </View>
      </Page>
    </Document>
  );
};

export default ParkingPermitLetter;