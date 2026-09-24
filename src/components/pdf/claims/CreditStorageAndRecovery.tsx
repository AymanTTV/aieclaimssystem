// src/components/pdf/claims/CreditStorageAndRecovery.tsx
import React from 'react';
import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';
import { Claim } from '../../../types';
import { styles } from '../styles';
import aieClaimsLogo from '../../../assets/aieclaim.png';
import {
  formatHireCommencementDate,
  parseLegalVariables,
  splitParagraphs,
  getVehicleDetails,
  AIE_CLAIMS_FOOTER_TEXT
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

interface CreditStorageRecoveryAgreementProps {
  claim: Claim | any;
  companyDetails: any;
}

const CreditStorageRecoveryAgreement: React.FC<CreditStorageRecoveryAgreementProps> = ({ claim, companyDetails }) => {
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

  // Storage and Recovery parameters
  const storageCostPerDay =
    Number(claim?.storage?.costPerDay || claim?.rental?.storageCostPerDay || 0);
  const storageDays =
    Number(claim?.storage?.storageDays || claim?.rental?.storageDays || 0);
  const storageTotal =
    Number(claim?.storage?.totalCost || claim?.rental?.storageCost || (storageCostPerDay * storageDays) || 0);
  const recoveryCost =
    Number(claim?.recovery?.cost || claim?.rental?.recoveryCost || 0);

  const defaultTerms = `1. Definitions and Interpretation
(a) "Agreement" refers to this Credit Storage and Recovery Agreement.
(b) "Lender" refers to AIE Claims LTD.
(c) "Borrower" refers to ${clientName} identified as the client in this agreement.
(d) "Credit Facility" refers to the credit limit and terms extended by the Lender to the Borrower for vehicle storage, securing, and recovery services.
(e) "Collateral" refers to the vehicle (${vehicleReg}) and any assets provided or held in connection with these services.

2. Grant of Credit Facility
The Lender agrees to provide a Credit Storage and Recovery Facility to the Borrower, subject to the terms and conditions set forth in this Agreement. The specific charges for storage at £${storageCostPerDay.toFixed(2)}/day and recovery of £${recoveryCost.toFixed(2)} are detailed in the schedule above.

3. Storage of Collateral & Vehicle Custody
(a) The Borrower authorizes the Lender or its nominated storage facility to safely hold and secure the vehicle (${vehicleReg}).
(b) The Borrower and Lender shall ensure reasonable care, insurance, and safekeeping throughout the storage period.
(c) The Lender shall maintain a continuous log of storage days and condition reports.

4. Recovery of Credit
(a) In the event of insurance claim settlement or default, the Lender shall have the right to recover all accrued storage and recovery charges directly from the at-fault insurer or client.
(b) The Borrower assigns all rights of recovery for storage and recovery costs against any third-party tortfeasor or insurer to the Lender.
(c) The Borrower agrees to cooperate fully with the Lender in pursuing and recovering these outlay costs.

5. Charges and Accruals
Storage charges shall accrue on a daily credit basis until the vehicle is repaired, collected, or total-loss proceeds are disbursed. Late administrative charges may apply if information is withheld.

6. Borrower's Covenants
The Borrower covenants that:
(a) All incident, insurance, and ownership details provided to the Lender are accurate and truthful.
(b) They hold full authority as owner, registered keeper, or authorized agent to commission storage and recovery.
(c) They will notify the Lender promptly of any changes in contact details or claim status.

7. Governing Law
This Agreement shall be governed by and construed in accordance with the laws of England and Wales.`;

  // Fetch dynamically from Company Profile settings
  const rawTerms =
    companyDetails?.creditStorageAndRecoveryText ||
    companyDetails?.creditStorageRecoveryAgreementText ||
    companyDetails?.termsAndConditions ||
    defaultTerms;

  const processedTerms = parseLegalVariables(rawTerms, {
    companyName: 'AIE Claims LTD',
    companyAddress: 'United House, 39-41 North Road, London, N7 9DP',
    companyPhone: '+442080505337',
    companyEmail: 'claims@aieclaims.co.uk',
    companyVat: companyDetails?.vatNumber || '',
    companyRegistration: '15616639',
    hirerName: clientName,
    borrowerName: clientName,
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
    storageCostPerDay: `£${storageCostPerDay.toFixed(2)}`,
    storageRate: `£${storageCostPerDay.toFixed(2)}`,
    storageDays: String(storageDays),
    storageTotal: `£${storageTotal.toFixed(2)}`,
    recoveryCost: `£${recoveryCost.toFixed(2)}`,
  });

  const paragraphs = splitParagraphs(processedTerms);

  const footerText = AIE_CLAIMS_FOOTER_TEXT;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* HEADER */}
        <View style={styles.header} fixed>
          <View style={styles.headerLeft}>
            <Image src={aieClaimsLogo} style={styles.logo} />
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.companyName}>AIE Claims LTD</Text>
            <Text style={styles.companyDetail}>United House, 39-41 North Road, London, N7 9DP</Text>
            <Text style={styles.companyDetail}>Tel: +442080505337</Text>
            <Text style={styles.companyDetail}>Email: claims@aieclaims.co.uk</Text>
          </View>
        </View>

        {/* TITLE */}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>CREDIT STORAGE AND RECOVERY AGREEMENT</Text>
        </View>

        {/* REFERENCE PARAMETERS CARD */}
        <View style={localStyles.refCard} wrap={false}>
          <View style={localStyles.refRow}>
            <View style={localStyles.refItem}>
              <Text style={localStyles.refLabel}>Agreement Ref</Text>
              <Text style={localStyles.refValue}>{agreementRef}</Text>
            </View>
            <View style={localStyles.refItem}>
              <Text style={localStyles.refLabel}>Commencement Date</Text>
              <Text style={localStyles.refValue}>{hireStartDateFormatted}</Text>
            </View>
            <View style={localStyles.refItem}>
              <Text style={localStyles.refLabel}>Vehicle Reg</Text>
              <Text style={localStyles.refValue}>{vehicleReg}</Text>
            </View>
            <View style={localStyles.refItem}>
              <Text style={localStyles.refLabel}>Make &amp; Model</Text>
              <Text style={localStyles.refValue}>{vehicleMakeModel || '-'}</Text>
            </View>
          </View>

          <View style={localStyles.refRow}>
            <View style={localStyles.refItem}>
              <Text style={localStyles.refLabel}>Borrower / Client</Text>
              <Text style={localStyles.refValue}>{clientName}</Text>
            </View>
            <View style={localStyles.refItem}>
              <Text style={localStyles.refLabel}>Driving License</Text>
              <Text style={localStyles.refValue}>{driverLicense}</Text>
            </View>
          </View>

          <View style={localStyles.refRow}>
            <View style={localStyles.refItem}>
              <Text style={localStyles.refLabel}>Storage Rate</Text>
              <Text style={localStyles.refValue}>
                {storageCostPerDay > 0 ? `£${storageCostPerDay.toFixed(2)}/day` : 'Standard Credit Terms'}
              </Text>
            </View>
            <View style={localStyles.refItem}>
              <Text style={localStyles.refLabel}>Storage Total</Text>
              <Text style={localStyles.refValue}>
                {storageTotal > 0 ? `£${storageTotal.toFixed(2)} (${storageDays} days)` : 'As Incurred'}
              </Text>
            </View>
            <View style={localStyles.refItem}>
              <Text style={localStyles.refLabel}>Recovery Cost</Text>
              <Text style={localStyles.refValue}>
                {recoveryCost > 0 ? `£${recoveryCost.toFixed(2)}` : 'As Incurred'}
              </Text>
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

        {/* SIGNATURES - Stamped with Hire Start Date */}
        <View style={localStyles.signatureSectionStyle} wrap={false}>
          {/* Borrower’s Signature */}
          <View style={[styles.signatureBox, { borderColor: '#3B82F6', borderWidth: 1 }]}>
            <Text style={styles.signatureLine}>Borrower’s Signature</Text>
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
            <Text style={styles.signatureLine}>Authorized Signature (for Lender)</Text>
            {companyDetails?.signature && (
              <Image src={companyDetails.signature} style={styles.signature} />
            )}
            <Text style={{ fontSize: 9, marginTop: 4 }}>AIE Claims LTD</Text>
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

export default CreditStorageRecoveryAgreement;
