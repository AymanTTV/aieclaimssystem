import React from 'react';
import { Document, Page, Text, View, Image } from '@react-pdf/renderer';
import { format } from 'date-fns';
import logo from '../../../assets/logo.png';
import { styles } from '../styles';

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
    {
      desc: 'Storage Charges',
      details: '',
      rate: '',
      units: '',
      total: st.toFixed(2),
    },
    {
      desc: 'Recovery Charges',
      details: '',
      rate: '',
      units: '',
      total: recoveryCost.toFixed(2),
    },
    {
      desc: 'Delivery Charges',
      details: '',
      rate: '',
      units: '',
      total: dc.toFixed(2),
    },
    {
      desc: 'Collection Charges',
      details: '',
      rate: '',
      units: '',
      total: cc.toFixed(2),
    },
    {
      desc: 'Insurance',
      details: `${days} day${days > 1 ? 's' : ''} cover`,
      rate: ipd.toFixed(2),
      units: String(days),
      total: insuranceTotal.toFixed(2),
    },
  ];

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          {typeof logo === 'string' && <Image src={logo} style={styles.logo} />}
          <View style={styles.headerRight}>
            <Text style={styles.companyName}>{companyDetails.fullName}</Text>
            <Text style={styles.companyDetail}>{companyDetails.officialAddress}</Text>
            <Text style={styles.companyDetail}>Tel: {companyDetails.phone}</Text>
            <Text style={styles.companyDetail}>Email: {companyDetails.email}</Text>
          </View>
        </View>

        {/* Title */}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>HIRE AGREEMENT</Text>
        </View>

        {/* Two-Column Info Box */}
        <View
          style={[
            styles.sectionBreak,
            { flexDirection: 'row', justifyContent: 'space-between' },
          ]}
          wrap={false}
        >
          {/* Hirer Details */}
          <View style={[styles.card, { width: '48%' }]}>
            <Text style={styles.cardTitle}>Hirer Details</Text>
            {[
              ['Full Name', claim.clientInfo.name],
              ['Address', claim.clientInfo.address],
              [
                'D.O.B',
                format(new Date(claim.clientInfo.dateOfBirth), 'dd/MM/yyyy'),
              ],
              ['License No', claim.clientInfo.driverLicenseNumber || 'N/A'],
              [
                'License Expiry',
                claim.clientInfo.licenseExpiry
                  ? format(new Date(claim.clientInfo.licenseExpiry), 'dd/MM/yyyy')
                  : 'N/A',
              ],
            ].map(([labelText, valueText], i) => (
              <View key={i} style={styles.flexRow}>
                <Text style={styles.label}>{labelText}:</Text>
                <Text style={styles.value}>{valueText}</Text>
              </View>
            ))}
          </View>

          {/* Vehicle & Hire Details */}
          <View style={[styles.card, { width: '48%' }]}>
            <Text style={styles.cardTitle}>Vehicle &amp; Hire Details</Text>
            {[
              ['Registration', claim.hireDetails?.vehicle?.registration || 'N/A'],
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
            ].map(([labelText, valueText], i) => (
              <View key={i} style={styles.flexRow}>
                <Text style={styles.label}>{labelText}:</Text>
                <Text style={styles.value}>{valueText}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Rates & Charges Table */}
        <View style={styles.sectionBreak}>
          <Text style={styles.sectionTitle}>Hire and Charges Breakdown</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.tableHeaderCell}>Description</Text>
              <Text style={styles.tableHeaderCell}>Details</Text>
              <Text style={styles.tableHeaderCell}>Rate (£)</Text>
              <Text style={styles.tableHeaderCell}>Days / Units</Text>
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

            {/* Grand Total */}
            <View style={[styles.tableRow, { borderBottomWidth: 0 }]}>
              <Text style={[styles.tableCell, { fontWeight: 'bold' }]}>Total Amount</Text>
              <Text style={styles.tableCell} />
              <Text style={styles.tableCell} />
              <Text style={styles.tableCell} />
              <Text style={[styles.tableCell, { fontWeight: 'bold' }]}>£{totalCost.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        {/* Terms & Conditions */}
        <View style={[styles.sectionBreak, styles.card]} wrap={false}>
          <Text style={styles.cardContent}>
            {companyDetails.hireAgreementText ||
              `The hire rate of £${rate.toFixed(
                2
              )}/day applies for up to 3 months. Payment due in full within eleven months from this date.`}
          </Text>
        </View>

        {/* Signatures */}
        <View style={styles.signatureSection} wrap={false}>
          <View style={styles.signatureBox}>
            <Text style={styles.sectionTitle}>Lessor</Text>
            {companyDetails.signature && (
              <Image src={companyDetails.signature} style={styles.signature} />
            )}
            <Text style={styles.label}>Date:</Text>
            <Text style={styles.value}>{format(new Date(), 'dd/MM/yyyy')}</Text>
          </View>

          <View style={styles.signatureBox}>
            <Text style={styles.sectionTitle}>Hirer</Text>
            {claim.clientInfo.signature && (
              <Image src={claim.clientInfo.signature} style={styles.signature} />
            )}
            <Text style={styles.label}>{claim.clientInfo.name}</Text>
            <Text style={styles.value}>{format(new Date(), 'dd/MM/yyyy')}</Text>
          </View>
        </View>

        {/* Footer */}
        <Text style={styles.footer} fixed>
          {companyDetails.fullName} | Registered in England and Wales | Company No: {companyDetails.registrationNumber}
        </Text>
      </Page>
    </Document>
  );
};

export default HireAgreement;
