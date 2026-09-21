// src/components/pdf/claims/ConditionOfHire.tsx
import React from 'react';
import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';
import { Claim } from '../../../types';
import { styles } from '../styles';
import logo from '../../../assets/logo.png';
import {
  getHireCommencementDate,
  formatHireCommencementDate,
  parseLegalVariables,
  splitParagraphs,
  getVehicleDetails,
  formatInlineCompanyFooter
} from '../../../utils/legalDocumentUtils';

const localStyles = StyleSheet.create({
  signatureSectionStyle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 20,
    breakInside: 'avoid',
    pageBreakInside: 'avoid',
  },
  refCard: {
    borderWidth: 1,
    borderColor: '#3B82F6',
    borderRadius: 6,
    padding: 10,
    marginBottom: 15,
    backgroundColor: '#F8FAFC',
  },
  refRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
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
    fontSize: 9,
    color: '#1F2937',
    marginTop: 1,
  },
  paragraph: {
    fontSize: 9,
    color: '#374151',
    lineHeight: 1.4,
    marginBottom: 8,
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

  const defaultTerms = `(a) For the purpose of this agreement ${companyDetails?.fullName || 'the Lessor'} is referred to as the lessor.
(b) "The Hirer" means the person, firm or organisation by or on behalf of whom this agreement is signed.
(c) The Hirer shall take full responsibility for the hired vehicle during the hire period.
(d) The Hirer shall ensure the vehicle is used in a lawful manner and is properly maintained during the hire period.
(e) The Hirer is responsible for all fines, penalties, and legal costs incurred during the hire period.
(f) The Hirer must return the vehicle in the same condition as received, reasonable wear and tear excepted.
(g) In case of breakdown or accident, the Hirer must immediately notify the Lessor.
(h) The Lessor reserves the right to terminate the agreement and repossess the vehicle at any time if the Hirer breaches any terms.
(i) The Hirer shall be liable for any loss or damage to the vehicle, including theft, fire, or accident, regardless of fault.
(j) The Hirer must possess a valid driving license for the entire hire period.
(k) The vehicle must not be used for racing, rallying, or any illegal purposes.
(l) The vehicle must not be taken outside the agreed geographical area without prior written consent from the Lessor.
(m) The Hirer is responsible for checking fluid levels, tyre pressure, and general roadworthiness daily.
(n) Any repairs or maintenance required due to Hirer's negligence will be charged to the Hirer.
(o) The Lessor is not liable for any loss or damage to property left in the vehicle.
(p) The Hirer must inform the Lessor of any change of address or contact details during the hire period.
(q) The Hirer agrees to pay all charges on demand. Overdue payments may incur additional fees.
(r) The Lessor may use personal data provided by the Hirer for the purpose of this agreement and for legal compliance.
(s) This agreement is governed by the laws of England and Wales.`;

  // Fetch from Company Profile settings
  const rawTerms =
    companyDetails?.conditionOfHireText ||
    companyDetails?.termsAndConditions ||
    defaultTerms;

  // Dynamically interpolate template variables
  const processedTerms = parseLegalVariables(rawTerms, {
    companyName: companyDetails?.fullName || 'AIE SKYLINE LIMITED',
    companyAddress: companyDetails?.officialAddress || '',
    companyPhone: companyDetails?.phone || '',
    companyEmail: companyDetails?.email || '',
    companyVat: companyDetails?.vatNumber || '',
    companyRegistration: companyDetails?.registrationNumber || '',
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
  });

  const paragraphs = splitParagraphs(processedTerms);

  const footerText = formatInlineCompanyFooter(companyDetails);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* HEADER - fixed on all pages */}
        <View style={styles.header} fixed>
          <View style={styles.headerLeft}>
            <Image src={logo} style={styles.logo} />
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.companyName}>{companyDetails?.fullName || 'AIE SKYLINE LIMITED'}</Text>
            <Text style={styles.companyDetail}>{companyDetails?.officialAddress || ''}</Text>
            <Text style={styles.companyDetail}>Tel: {companyDetails?.phone || ''}</Text>
            <Text style={styles.companyDetail}>Email: {companyDetails?.email || ''}</Text>
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
        <View style={{ marginBottom: 15 }} wrap>
          <Text style={styles.sectionTitle}>TERMS AND CONDITIONS</Text>
          {paragraphs.map((p, idx) => (
            <Text key={idx} style={localStyles.paragraph}>
              {p}
            </Text>
          ))}
        </View>

        {/* SIGNATURES - Strictly stamped with Hire Start Date */}
        <View style={localStyles.signatureSectionStyle} wrap={false}>
          {/* Hirer’s Signature */}
          <View style={[styles.signatureBox, { borderColor: '#3B82F6', borderWidth: 1 }]}>
            <Text style={styles.signatureLine}>Hirer’s Signature</Text>
            {claim?.clientInfo?.signature && (
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
            {companyDetails?.signature && (
              <Image src={companyDetails.signature} style={styles.signature} />
            )}
            <Text style={{ fontSize: 9, marginTop: 4 }}>{companyDetails?.fullName || 'AIE SKYLINE LIMITED'}</Text>
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
