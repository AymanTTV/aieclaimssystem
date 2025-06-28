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
import logo from '../../../assets/logo.png';
import { styles } from '../styles'; // Assuming styles.ts is in ../styles

const localStyles = StyleSheet.create({
  // REVERTED: Signature section styling with absolute positioning
  signatureSectionPositioning: {
    position: 'absolute',
    bottom: 60, // Original bottom position
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    breakInside: 'avoid',
    pageBreakInside: 'avoid',
  },
  // OPTIMIZED: New style to further reduce bottom margin for the last section on a page
  lastSectionOnPage: {
    marginBottom: 5, // Further reduced from 10 to 5 to prevent Page 1 overflow
  },
  // Style to ensure the content of the first page stays together if possible
  mainContentWrapper: {
    flexGrow: 1, // Allows it to take up available space
    flexDirection: 'column', // Ensures children flow vertically
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
  const st = claim.storage?.totalCost || 0;
  const recoveryCost = claim.recovery?.cost || 0;

  const hireTotal = days * rate;
  const insuranceTotal = days * ipd;
  const extrasTotal = dc + cc + st + recoveryCost + insuranceTotal;
  const totalCost = hireTotal + extrasTotal;

  const rows = [
    {
      desc: 'Hire Charges',
      details: `£${rate.toFixed(2)} per day`,
      rate: rate.toFixed(2),
      units: String(days),
      total: hireTotal.toFixed(2),
    },
    { desc: 'Storage Charges', details: '', rate: '', units: '', total: st.toFixed(2) },
    { desc: 'Recovery Charges', details: '', rate: '', units: '', total: recoveryCost.toFixed(2) },
    { desc: 'Delivery Charges', details: '', rate: '', units: '', total: dc.toFixed(2) },
    { desc: 'Collection Charges', details: '', rate: '', units: '', total: cc.toFixed(2) },
    {
      desc: 'Insurance',
      details: `${days} day${days > 1 ? 's' : ''} cover`,
      rate: ipd.toFixed(2),
      units: String(days),
      total: insuranceTotal.toFixed(2),
    },
  ];

  const defaultTerms = `The hire rate of £${rate.toFixed(
    2
  )}/day applies for up to 3 months. Payment is due in full within eleven months from this date.`;

  return (
    <Document>
      {/* Page 1 */}
      <Page size="A4" style={styles.page}>
        {/* HEADER */}
        <View style={styles.header} fixed>
          <View style={styles.headerLeft}>
            <Image src={logo} style={styles.logo} />
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.companyName}>{companyDetails.fullName}</Text>
            <Text style={styles.companyDetail}>
              {companyDetails.officialAddress}
            </Text>
            <Text style={styles.companyDetail}>
              Tel: {companyDetails.phone}
            </Text>
            <Text style={styles.companyDetail}>
              Email: {companyDetails.email}
            </Text>
          </View>
        </View>

        {/* TITLE */}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>HIRE AGREEMENT</Text>
        </View>

        {/* DETAILS CARDS & TABLE */}
        {/* Wrap the main content of the first page to better manage breaks */}
        <View style={localStyles.mainContentWrapper}>
          {/* Two-Column Info Box */}
          <View
            style={[
              styles.sectionBreak, // styles.sectionBreak now has reduced marginBottom and paddingBottom
              { flexDirection: 'row', justifyContent: 'space-between' },
            ]}
          >
            {/* Hirer Details */}
            <View style={[styles.card, { width: '48%' }]}>
              <Text style={styles.cardTitle}>Hirer Details</Text>
              {[
                ['Full Name', claim.clientInfo.name],
                ['Address', claim.clientInfo.address],
                [
                  'Date of Birth',
                  format(new Date(claim.clientInfo.dateOfBirth), 'dd/MM/yyyy'),
                ],
                [
                  'License No',
                  claim.clientInfo.driverLicenseNumber || 'N/A',
                ],
                [
                  'License Expiry',
                  claim.clientInfo.licenseExpiry
                    ? format(
                        new Date(claim.clientInfo.licenseExpiry),
                        'dd/MM/yyyy'
                      )
                    : 'N/A',
                ],
              ].map(([lbl, val], i) => (
                <View key={i} style={styles.flexRow}>
                  <Text style={styles.label}>{lbl}:</Text>
                  <Text style={styles.value}>{val}</Text>
                </View>
              ))}
            </View>

            {/* Vehicle & Hire Details */}
            <View style={[styles.card, { width: '48%' }]}>
              <Text style={styles.cardTitle}>Vehicle &amp; Hire Details</Text>
              {[
                ['Registration', d.vehicle?.registration || 'N/A'],
                [
                  'Start Date',
                  d.startDate
                    ? format(new Date(d.startDate), 'dd/MM/yyyy')
                    : 'N/A',
                ],
                [
                  'End Date',
                  d.endDate
                    ? format(new Date(d.endDate), 'dd/MM/yyyy')
                    : 'N/A',
                ],
                ['Days of Hire', String(days)],
                ['Rate (per day)', `£${rate.toFixed(2)}`],
                ['Extras (Total)', `£${extrasTotal.toFixed(2)}`],
                ['Grand Total', `£${totalCost.toFixed(2)}`],
              ].map(([lbl, val], i) => (
                <View key={i} style={styles.flexRow}>
                  <Text style={styles.label}>{lbl}:</Text>
                  <Text style={styles.value}>{val}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Charges Table */}
          {/* Apply lastSectionOnPage style to reduce its bottom margin EVEN MORE */}
          <View style={[styles.sectionBreak, localStyles.lastSectionOnPage]}>
            <Text style={styles.sectionTitle}>
              Hire &amp; Charges Breakdown
            </Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={styles.tableHeaderCell}>Description</Text>
                <Text style={styles.tableHeaderCell}>Details</Text>
                <Text style={styles.tableHeaderCell}>Rate (£)</Text>
                <Text style={styles.tableHeaderCell}>Days/Units</Text>
                <Text style={styles.tableHeaderCell}>Total (£)</Text>
              </View>
              {rows.map((r, i) => (
                <View key={i} style={styles.tableRow}>
                  <Text style={styles.tableCell}>{r.desc}</Text>
                  <Text style={styles.tableCell}>{r.details}</Text>
                  <Text style={styles.tableCell}>{r.rate}</Text>
                  <Text style={styles.tableCell}>{r.units}</Text>
                  <Text style={styles.tableCell}>{r.total}</Text>
                </View>
              ))}
              <View style={[styles.tableRow, { borderBottomWidth: 0 }]}>
                <Text style={[styles.tableCell, { fontWeight: 'bold' }]}>
                  Total Amount
                </Text>
                <Text style={styles.tableCell} />
                <Text style={styles.tableCell} />
                <Text style={styles.tableCell} />
                <Text style={[styles.tableCell, { fontWeight: 'bold' }]}>
                  £{totalCost.toFixed(2)}
                </Text>
              </View>
            </View>
          </View>
        </View>
        {/* FOOTER */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            AIE SKYLINE LIMITED, registered in England and Wales with the
            company registration number 15616639, registered office address:
            United House, 39-41 North Road, London, N7 9DP. VAT. NO. 453448875
          </Text>
          <Text
            style={styles.pageNumber}
            render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber} of ${totalPages}`
            }
          />
        </View>
      </Page>

      {/* Page 2 */}
      <Page size="A4" style={styles.page}>
        {/* HEADER */}
        <View style={styles.header} fixed>
          <View style={styles.headerLeft}>
            <Image src={logo} style={styles.logo} />
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.companyName}>{companyDetails.fullName}</Text>
            <Text style={styles.companyDetail}>
              {companyDetails.officialAddress}
            </Text>
            <Text style={styles.companyDetail}>
              Tel: {companyDetails.phone}
            </Text>
            <Text style={styles.companyDetail}>
              Email: {companyDetails.email}
            </Text>
          </View>
        </View>

        {/* TERMS */}
        {/* We keep the margin bottom for terms for aesthetic spacing before signatures */}
        <View style={[styles.card, { marginBottom: 30 }]}>
          <Text style={styles.sectionTitle}>TERMS</Text>
          <Text style={styles.text}>
            {companyDetails.hireAgreementText || defaultTerms}
          </Text>
        </View>

        {/* SIGNATURES - Reverted to original absolute positioning */}
        <View style={localStyles.signatureSectionPositioning} wrap={false}>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureLine}>Authorized Signature</Text>
            {companyDetails.signature && (
              <Image src={companyDetails.signature} style={styles.signature} />
            )}
            <Text>{companyDetails.fullName}</Text>
            <Text>Date: {format(new Date(), 'dd/MM/yyyy')}</Text>
          </View>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureLine}>Hirer’s Signature</Text>
            {claim.clientInfo.signature && (
              <Image
                src={claim.clientInfo.signature}
                style={styles.signature}
              />
            )}
            <Text>{claim.clientInfo.name}</Text>
            <Text>Date: {format(new Date(), 'dd/MM/yyyy')}</Text>
          </View>
        </View>

        {/* FOOTER */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            AIE SKYLINE LIMITED, registered in England and Wales with the
            company registration number 15616639, registered office address:
            United House, 39-41 North Road, London, N7 9DP. VAT. NO. 453448875
          </Text>
          <Text
            style={styles.pageNumber}
            render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber} of ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
};

export default HireAgreement;