import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from '@react-pdf/renderer';
import { format } from 'date-fns';
import { resolveNameFields, resolveAddressFields, combineFullName } from '../../../utils/nameAddressUtils';
import aieClaimsLogo from '../../../assets/aieclaim.png';
import { styles } from '../styles';
import {
  getHireCommencementDate,
  parseLegalVariables,
  splitParagraphs,
  getVehicleDetails,
  AIE_CLAIMS_FOOTER_TEXT
} from '../../../utils/legalDocumentUtils';

const isValidPdfImageSrc = (v: any): v is string => {
  if (typeof v !== 'string') return false;
  const s = v.trim();
  if (!s) return false;
  if (s.includes('undefined') || s.includes('null')) return false;
  return s.startsWith('data:image/') || s.startsWith('http://') || s.startsWith('https://') || s.startsWith('blob:');
};

const formatDate = (date: any) => {
  if (!date) return 'N/A';
  try {
    const d = date?.toDate ? date.toDate() : new Date(date);
    return isNaN(d.getTime()) ? 'N/A' : format(d, 'dd/MM/yyyy');
  } catch {
    return 'N/A';
  }
};

const localStyles = StyleSheet.create({
  page: {
    paddingTop: 35,
    paddingBottom: 65,
    paddingHorizontal: 36,
  },
  signatureSection: {
    marginTop: 15,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    breakInside: 'avoid',
  },
  compactBox: {
    padding: 6,
    width: '48%',
    backgroundColor: '#F9FAFB',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  compactImage: {
    height: 30,
    marginVertical: 2,
    objectFit: 'contain',
  },
  compactLine: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    marginTop: 2,
    marginBottom: 2,
    paddingTop: 2,
    fontSize: 9,
    textAlign: 'center',
    fontWeight: 'bold',
    color: '#4B5563',
  },
  compactText: {
    fontSize: 8.5,
    color: '#1F2937',
    textAlign: 'center',
  },
  mainContentWrapper: {
    flexDirection: 'column',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomColor: '#E5E7EB',
    borderBottomWidth: 1,
    paddingVertical: 3.5,
    minHeight: 18,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  tableHeaderRow: {
    backgroundColor: '#3C9F2C',
    flexDirection: 'row',
    borderBottomColor: '#006A4E',
    borderBottomWidth: 1,
    paddingVertical: 5,
    paddingHorizontal: 4,
  },
  tableHeaderCell: {
    flex: 1,
    textAlign: 'left',
    paddingHorizontal: 4,
    fontWeight: 'bold',
    fontSize: 9,
    color: '#FFFFFF',
  },
  tableHeaderCellRight: {
    flex: 1,
    textAlign: 'right',
    paddingHorizontal: 4,
    fontWeight: 'bold',
    fontSize: 9,
    color: '#FFFFFF',
  },
  tableCell: {
    flex: 1,
    textAlign: 'left',
    paddingHorizontal: 4,
    fontSize: 8.5,
    color: '#374151',
  },
  tableCellRight: {
    flex: 1,
    textAlign: 'right',
    paddingHorizontal: 4,
    fontSize: 8.5,
    color: '#374151',
  },
});

const compactCardStyles = StyleSheet.create({
  card: {
    backgroundColor: '#F9FAFB',
    padding: 8,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#438BDC',
  },
  title: {
    fontSize: 9.5,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#1E40AF',
    textTransform: 'uppercase',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 3,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2.5,
  },
  label: {
    fontSize: 8.5,
    color: '#4B5563',
    width: '50%',
  },
  value: {
    fontSize: 8.5,
    color: '#1F2937',
    textAlign: 'right',
    flex: 1,
  },
});

interface HireAgreementProps {
  claim: any;
  companyDetails: any;
}

const HireAgreement: React.FC<HireAgreementProps> = ({
  claim,
  companyDetails,
}) => {
  const d = claim.hireDetails || {};
  const days = d.daysOfHire || 0;
  const rate = d.claimRate || 0;
  const dc = d.deliveryCharge || 0;
  const cc = d.collectionCharge || 0;
  const ipd = d.insurancePerDay || 0;
  
  // Storage Cost Variables
  const st = claim.storage?.totalCost || 0;
  const storageCostPerDay = claim.storage?.costPerDay || 0;
  
  // Calculate Storage Days
  let storageDays = 0;
  if (claim.storage?.startDate && claim.storage?.endDate) {
    const s = claim.storage.startDate.toDate ? claim.storage.startDate.toDate() : new Date(claim.storage.startDate);
    const e = claim.storage.endDate.toDate ? claim.storage.endDate.toDate() : new Date(claim.storage.endDate);
    if (!isNaN(s.getTime()) && !isNaN(e.getTime())) {
      storageDays = Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));
    }
  } else if (storageCostPerDay > 0) {
    storageDays = Math.round(st / storageCostPerDay);
  }

  const recoveryCost = claim.recovery?.cost || 0;

  const hireTotal = days * rate;
  const insuranceTotal = days * ipd;
  const extrasTotal = dc + cc + st + recoveryCost + insuranceTotal;
  const totalNet = hireTotal + extrasTotal;

  // Granular Itemized VAT Calculations (only apply VAT to items where VAT was included/checked)
  const hasHireVat = claim.rental?.includeVAT !== undefined
    ? Boolean(claim.rental.includeVAT)
    : (claim.includeVAT !== undefined ? Boolean(claim.includeVAT) : true);

  const hasInsuranceVat = claim.rental?.insurancePerDayIncludeVAT !== undefined
    ? Boolean(claim.rental.insurancePerDayIncludeVAT)
    : Boolean(claim.insurancePerDayIncludeVAT ?? claim.hireDetails?.insurancePerDayIncludeVAT);

  const hasDeliveryVat = claim.rental?.deliveryChargeIncludeVAT !== undefined
    ? Boolean(claim.rental.deliveryChargeIncludeVAT)
    : Boolean(claim.deliveryChargeIncludeVAT ?? claim.hireDetails?.deliveryChargeIncludeVAT);

  const hasCollectionVat = claim.rental?.collectionChargeIncludeVAT !== undefined
    ? Boolean(claim.rental.collectionChargeIncludeVAT)
    : Boolean(claim.collectionChargeIncludeVAT ?? claim.hireDetails?.collectionChargeIncludeVAT);

  const hasStorageVat = claim.rental?.includeStorageVAT !== undefined
    ? Boolean(claim.rental.includeStorageVAT)
    : Boolean(claim.includeStorageVAT ?? claim.storage?.includeVAT);

  const hasRecoveryVat = claim.rental?.includeRecoveryCostVAT !== undefined
    ? Boolean(claim.rental.includeRecoveryCostVAT)
    : Boolean(claim.includeRecoveryCostVAT ?? claim.recovery?.includeVAT);

  const hireVat = hasHireVat ? hireTotal * 0.20 : 0;
  const insuranceVat = hasInsuranceVat ? insuranceTotal * 0.20 : 0;
  const deliveryVat = hasDeliveryVat ? dc * 0.20 : 0;
  const collectionVat = hasCollectionVat ? cc * 0.20 : 0;
  const storageVat = hasStorageVat ? st * 0.20 : 0;
  const recoveryVat = hasRecoveryVat ? recoveryCost * 0.20 : 0;

  const totalVat = Number((hireVat + insuranceVat + deliveryVat + collectionVat + storageVat + recoveryVat).toFixed(2));
  const grandTotal = Number((totalNet + totalVat).toFixed(2));

  const paidAmount = Number(claim.rental?.paidAmount ?? claim.paidAmount ?? 0);
  const owingAmount = grandTotal - paidAmount;

  const hirerSignature = claim.clientInfo?.signature || claim.rental?.signature || '';
  const isCompany = (claim.clientInfo as any)?.type === 'company';
  const hirerSource = claim.clientInfo || claim.driver || claim.submitter || {};
  const hirerNameFields = resolveNameFields(hirerSource);
  const hirerAddressFields = resolveAddressFields(hirerSource);
  const hirerName = isCompany
    ? (claim.clientInfo?.name || claim.rental?.customerName || 'N/A')
    : (combineFullName(hirerNameFields.firstName, hirerNameFields.middleName, hirerNameFields.lastName) || claim.clientInfo?.name || claim.rental?.customerName || 'N/A');
  const signatureDate = getHireCommencementDate(claim);

  const vehicleDetails = getVehicleDetails(claim);
  const vehRegistration = vehicleDetails.registration;
  const vehMake = vehicleDetails.make;
  const vehModel = vehicleDetails.model;
  const vehMakeModel = vehicleDetails.makeModel;

  const hireStartDate = d.startDate || signatureDate;

  const rentalAgreementNumber =
    claim.rental?.rentalAgreementNumber ||
    claim.rentalAgreementNumber ||
    claim.hireDetails?.rentalAgreementNumber;

  const displayAgreementNumber = rentalAgreementNumber
    ? (rentalAgreementNumber.toString().startsWith('#') ? rentalAgreementNumber.toString() : `#${rentalAgreementNumber}`)
    : '';

  const documentTitle = displayAgreementNumber
    ? `HIRE AGREEMENT ${displayAgreementNumber}`
    : 'HIRE AGREEMENT';

  const rows = [
    {
      desc: 'Hire Charges',
      details: `£${rate.toFixed(2)} per day${vehMakeModel ? ` (${vehMakeModel})` : ''}`,
      rate: rate.toFixed(2),
      units: String(days),
      total: hireTotal.toFixed(2),
    },
    { 
      desc: 'Storage Charges', 
      details: storageDays > 0 ? `${storageDays} days cover` : '', 
      rate: storageCostPerDay > 0 ? storageCostPerDay.toFixed(2) : '', 
      units: storageDays > 0 ? String(storageDays) : '', 
      total: st.toFixed(2) 
    },
    { desc: 'Recovery Charges', details: '', rate: '', units: '', total: recoveryCost.toFixed(2) },
    { desc: 'Delivery Charges', details: '', rate: '', units: '', total: dc.toFixed(2) },
    { desc: 'Collection Charges', details: '', rate: '', units: '', total: cc.toFixed(2) },
    {
      desc: 'Insurance',
      details: `${days} day${days > 1 ? 's' : ''} cover`,
      rate: ipd > 0 ? ipd.toFixed(2) : '',
      units: ipd > 0 ? String(days) : '',
      total: insuranceTotal.toFixed(2),
    },
  ];

  const defaultTerms = `The hire rate of £${rate.toFixed(
    2
  )}/day applies for up to 3 months. Payment is due in full within eleven months from this date.`;

  const companyName = 'AIE Claims LTD';
  const companyReg = '15616639';
  const companyAddress = 'United House, 39-41 North Road, London, N7 9DP';
  const companyPhone = '+442080505337';
  const companyEmail = 'claims@aieclaims.co.uk';
  const footerText = AIE_CLAIMS_FOOTER_TEXT;

  const renderHeader = () => (
    <View style={styles.header} fixed>
      <View style={styles.headerLeft}>
        <Image src={aieClaimsLogo} style={styles.logo} cache={false} />
      </View>
      <View style={styles.headerRight}>
        <Text style={styles.companyName}>{companyName}</Text>
        <Text style={styles.companyDetail}>
          {companyAddress}
        </Text>
        <Text style={styles.companyDetail}>
          Tel: {companyPhone}
        </Text>
        <Text style={styles.companyDetail}>
          Email: {companyEmail}
        </Text>
      </View>
    </View>
  );

  const renderFooter = () => (
    <View style={styles.footer} fixed>
      <Text style={styles.footerText}>{footerText}</Text>
      <Text
        style={styles.pageNumber}
        render={({ pageNumber, totalPages }) =>
          `Page ${pageNumber} of ${totalPages}`
        }
      />
    </View>
  );

  return (
    <Document>
      {/* Page 1 */}
      <Page size="A4" style={[styles.page, localStyles.page]}>
        {/* HEADER */}
        {renderHeader()}

        {/* TITLE */}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{documentTitle}</Text>
        </View>

        {/* DETAILS CARDS & TABLE */}
        <View style={localStyles.mainContentWrapper}>
          {/* Two-Column Info Box */}
          <View
            style={[
              styles.sectionBreak,
              { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, paddingBottom: 6 },
            ]}
          >
            {/* Hirer Details */}
            <View style={[styles.card, { width: '48%', marginBottom: 0, padding: 8 }]}>
              <Text style={styles.cardTitle}>Hirer Details</Text>
              {(isCompany ? [
                ['Company Name', claim.clientInfo?.name || 'N/A'],
              ] : [
                ['First Name', hirerNameFields.firstName || '-'],
                ['Middle Name', hirerNameFields.middleName || '-'],
                ['Last Name', hirerNameFields.lastName || '-'],
              ]).concat([
                ['Building / Flat', hirerAddressFields.buildingFlat || '-'],
                ['Street Name', hirerAddressFields.streetName || '-'],
                ['Town / City', hirerAddressFields.townCity || '-'],
                ['Postcode', hirerAddressFields.postcode || '-'],
                ['Country', hirerAddressFields.country || '-'],
                ['Date of Birth', formatDate(claim.clientInfo?.dateOfBirth)],
                ['License No', claim.clientInfo?.driverLicenseNumber || 'N/A'],
                ['License Expiry', formatDate(claim.clientInfo?.licenseExpiry)],
              ]).map(([lbl, val], i) => (
                <View key={i} style={[styles.flexRow, { marginBottom: 2 }]}>
                  <Text style={[styles.label, { fontSize: 8, width: 85 }]}>{lbl}:</Text>
                  <Text style={[styles.value, { fontSize: 8 }]}>{val}</Text>
                </View>
              ))}
            </View>

            {/* Vehicle & Hire Details */}
            <View style={[styles.card, { width: '48%', marginBottom: 0, padding: 8 }]}>
              <Text style={styles.cardTitle}>Vehicle &amp; Hire Details</Text>
              {[
                ['Registration', vehRegistration],
                ['Vehicle Make', vehMake || '-'],
                ['Vehicle Model', vehModel || '-'],
                ['Start Date', formatDate(d.startDate)],
                ['End Date', formatDate(d.endDate)],
                ['Days of Hire', String(days)],
                ['Rate (per day)', `£${rate.toFixed(2)}`],
              ].map(([lbl, val], i) => (
                <View key={i} style={[styles.flexRow, { marginBottom: 2 }]}>
                  <Text style={[styles.label, { fontSize: 8, width: 85 }]}>{lbl}:</Text>
                  <Text style={[styles.value, { fontSize: 8 }]}>{val}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Charges Table */}
          <View style={{ marginBottom: 6 }}>
            <Text style={[styles.sectionTitle, { fontSize: 11, paddingVertical: 4, paddingHorizontal: 6, marginBottom: 4 }]}>
              Hire &amp; Charges Breakdown
            </Text>
            <View style={styles.table}>
              <View style={localStyles.tableHeaderRow}>
                <Text style={[localStyles.tableHeaderCell, { flex: 1.4 }]}>Description</Text>
                <Text style={[localStyles.tableHeaderCell, { flex: 1.2 }]}>Details</Text>
                <Text style={[localStyles.tableHeaderCellRight, { flex: 0.8 }]}>Rate (£)</Text>
                <Text style={[localStyles.tableHeaderCell, { flex: 0.8, textAlign: 'center' }]}>Days/Units</Text>
                <Text style={[localStyles.tableHeaderCellRight, { flex: 1.0 }]}>Total (£)</Text>
              </View>
              {rows.map((r, i) => (
                <View key={i} style={localStyles.tableRow}>
                  <Text style={[localStyles.tableCell, { flex: 1.4 }]}>{r.desc}</Text>
                  <Text style={[localStyles.tableCell, { flex: 1.2 }]}>{r.details}</Text>
                  <Text style={[localStyles.tableCellRight, { flex: 0.8 }]}>{r.rate}</Text>
                  <Text style={[localStyles.tableCell, { flex: 0.8, textAlign: 'center' }]}>{r.units}</Text>
                  <Text style={[localStyles.tableCellRight, { flex: 1.0, fontWeight: 'bold' }]}>{r.total}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* --- SUMMARY (Net, VAT, Gross, Paid, Owing) --- */}
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 6 }} wrap={false}>
            {/* Summary Card */}
            <View style={[compactCardStyles.card, { width: '48%' }]}>
              <Text style={compactCardStyles.title}>Summary</Text>
              
              {/* NET: #000000 */}
              <View style={compactCardStyles.row}>
                <Text style={[compactCardStyles.label, { fontFamily: 'Helvetica-Bold', color: '#000000' }]}>NET:</Text>
                <Text style={[compactCardStyles.value, { textAlign: 'right', fontFamily: 'Helvetica-Bold', color: '#000000' }]}>
                  £{totalNet.toFixed(2)}
                </Text>
              </View>

              {/* VAT: #2563EB */}
              <View style={compactCardStyles.row}>
                <Text style={[compactCardStyles.label, { fontFamily: 'Helvetica-Bold', color: '#2563EB' }]}>VAT:</Text>
                <Text style={[compactCardStyles.value, { textAlign: 'right', fontFamily: 'Helvetica-Bold', color: '#2563EB' }]}>
                  £{totalVat.toFixed(2)}
                </Text>
              </View>

              {/* Gross Total: #D97706 */}
              <View style={[compactCardStyles.row, { marginTop: 3, borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingTop: 3 }]}>
                <Text style={[compactCardStyles.label, { fontFamily: 'Helvetica-Bold', color: '#D97706' }]}>Gross Total:</Text>
                <Text style={[compactCardStyles.value, { textAlign: 'right', fontFamily: 'Helvetica-Bold', color: '#D97706' }]}>
                  £{grandTotal.toFixed(2)}
                </Text>
              </View>

              {/* Paid: #15803D */}
              <View style={compactCardStyles.row}>
                <Text style={[compactCardStyles.label, { fontFamily: 'Helvetica-Bold', color: '#15803D' }]}>Paid:</Text>
                <Text style={[compactCardStyles.value, { textAlign: 'right', fontFamily: 'Helvetica-Bold', color: '#15803D' }]}>
                  £{paidAmount.toFixed(2)}
                </Text>
              </View>

              {/* Owing: #DC2626 */}
              <View style={compactCardStyles.row}>
                <Text style={[compactCardStyles.label, { color: owingAmount > 0.001 ? '#DC2626' : '#15803D', fontFamily: 'Helvetica-Bold' }]}>
                  Owing:
                </Text>
                <Text style={[compactCardStyles.value, { textAlign: 'right', fontFamily: 'Helvetica-Bold', color: owingAmount > 0.001 ? '#DC2626' : '#15803D' }]}>
                  £{Math.abs(owingAmount).toFixed(2)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* FOOTER */}
        {renderFooter()}
      </Page>

      {/* Page 2: Terms & Signatures */}
      <Page size="A4" style={[styles.page, localStyles.page]}>
        {/* HEADER */}
        {renderHeader()}

        {/* TERMS */}
        <View style={[styles.card, { marginBottom: 15 }]}>
          <Text style={styles.cardTitle}>TERMS &amp; CONDITIONS</Text>
          {splitParagraphs(
            parseLegalVariables(
              companyDetails?.hireAgreementText || companyDetails?.termsAndConditions || defaultTerms,
              {
                companyName: 'AIE Claims LTD',
                companyAddress: 'United House, 39-41 North Road, London, N7 9DP',
                companyPhone: '+442080505337',
                companyEmail: 'claims@aieclaims.co.uk',
                companyVat: companyDetails?.vatNumber || '',
                companyRegistration: '15616639',
                hirerName,
                customerName: hirerName,
                vehicleReg: vehRegistration,
                vehicleMake: vehMake,
                vehicleModel: vehModel,
                startDate: formatDate(hireStartDate),
                hireStartDate: formatDate(hireStartDate),
                dailyRate: `£${rate.toFixed(2)}`,
                agreementNumber: displayAgreementNumber,
                agreementRef: displayAgreementNumber,
              }
            )
          ).map((p, idx) => (
            <Text key={idx} style={[styles.text, { marginBottom: 6 }]}>
              {p}
            </Text>
          ))}
        </View>

        {/* SIGNATURES - Matches Rental Agreement signature design */}
        <View style={localStyles.signatureSection} wrap={false}>
          <View style={[styles.signatureBox, localStyles.compactBox, { borderWidth: 1, borderColor: '#3B82F6' }]}>
            {isValidPdfImageSrc(hirerSignature) && (
              <Image
                src={hirerSignature}
                style={[styles.signature, localStyles.compactImage]}
              />
            )}
            <Text style={[styles.signatureLine, localStyles.compactLine]}>Hirer’s Signature</Text>
            <Text style={localStyles.compactText}>{hirerName}</Text>
            <Text style={localStyles.compactText}>Date: {formatDate(signatureDate)}</Text>
          </View>

          <View style={[styles.signatureBox, localStyles.compactBox, { borderWidth: 1, borderColor: '#3B82F6' }]}>
            {isValidPdfImageSrc(companyDetails?.signature) && (
              <Image
                src={companyDetails.signature}
                style={[styles.signature, localStyles.compactImage]}
              />
            )}
            <Text style={[styles.signatureLine, localStyles.compactLine]}>Authorized Signature</Text>
            <Text style={localStyles.compactText}>AIE Claims LTD</Text>
            <Text style={localStyles.compactText}>Date: {formatDate(signatureDate)}</Text>
          </View>
        </View>

        {/* FOOTER */}
        {renderFooter()}
      </Page>
    </Document>
  );
};

export default HireAgreement;