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
import BaseDocument from './BaseDocument';
import { styles as globalStyles } from './styles';
import logo from '../../assets/logo.png';
import logoBlur from '../../assets/logo.png';        // blurred logo for watermark
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
  };
}

const localStyles = StyleSheet.create({
  watermark: {
    position: 'absolute',
    top: '30%',
    left: '20%',
    width: '60%',
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
  bulletRow: {
    flexDirection: 'row',
    marginBottom: 4,
    paddingLeft: 12,
  },
  bullet: {
    width: 8,
    lineHeight: 1.3,
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
      <Page size="A4" style={globalStyles.page}>
        {/* Watermark */}
        <Image src={logoBlur} style={localStyles.watermark} />

        {/* Header */}
        <View style={globalStyles.header}>
          <View style={globalStyles.headerLeft}>
            <Image src={logo} style={globalStyles.logo} />
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
          Subject: Parking Permit Request for Hired Vehicle and Driver
        </Text>

        {/* Body */}
        <Text style={localStyles.paragraph}>
          We are writing to request the issuance of a parking permit for a vehicle and driver currently hired from {companyDetails.fullName}.
        </Text>
        <Text style={localStyles.paragraph}>Please find the details below:</Text>

        {/* Driver Info */}
        <Text style={localStyles.listTitle}>Driver Information:</Text>
        <View style={localStyles.bulletRow}>
          <Text style={localStyles.bullet}>{'\u2022'}</Text>
          <Text style={localStyles.bulletText}>Name: {customer.name}</Text>
        </View>
        <View style={localStyles.bulletRow}>
          <Text style={localStyles.bullet}>{'\u2022'}</Text>
          <Text style={localStyles.bulletText}>Address: {customer.address}</Text>
        </View>

        {/* Vehicle Info */}
        <Text style={[localStyles.listTitle, { marginTop: 8 }]}>Vehicle Information:</Text>
        <View style={localStyles.bulletRow}>
          <Text style={localStyles.bullet}>{'\u2022'}</Text>
          <Text style={localStyles.bulletText}>
            Make &amp; Model: {vehicle.make} {vehicle.model}
          </Text>
        </View>
        <View style={localStyles.bulletRow}>
          <Text style={localStyles.bullet}>{'\u2022'}</Text>
          <Text style={localStyles.bulletText}>
            Registration Number: {vehicle.registrationNumber}
          </Text>
        </View>
        <View style={localStyles.bulletRow}>
          <Text style={localStyles.bullet}>{'\u2022'}</Text>
          <Text style={localStyles.bulletText}>
            Registered Owner: {companyDetails.fullName}
          </Text>
        </View>

        <Text style={[localStyles.paragraph, { marginTop: 8 }]}>
          We confirm that the above vehicle and driver are under an active hire agreement. We kindly request that a parking permit be issued accordingly.
        </Text>
        <Text style={localStyles.paragraph}>
          Please let us know if any further information or documentation is required.
        </Text>

        {/* Signature */}
        <View style={localStyles.signatureSection}>
          <Text style={{ fontFamily: 'Helvetica-Bold', marginBottom: 4 }}>Yours sincerely,</Text>
          <Image src={signatureImg} style={localStyles.signatureImage} />
          <Text style={localStyles.signerName}>Mr A I Egale</Text>
          <Text>Director of {companyDetails.fullName}</Text>
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
