import React from 'react';
import { Document, Page, Text, View, Image } from '@react-pdf/renderer';
import { format } from 'date-fns';
import logo from '../../../assets/logo.png';
import { styles } from './styles';

interface HireAgreementProps {
  claim: any;
  companyDetails: any;
}

const HireAgreement: React.FC<HireAgreementProps> = ({ claim, companyDetails }) => {
  // Calculate total cost
  const daysOfHire = claim.hireDetails?.daysOfHire || 0;
  const claimRate = claim.hireDetails?.claimRate || 340;
  const deliveryCharge = claim.hireDetails?.deliveryCharge || 0;
  const collectionCharge = claim.hireDetails?.collectionCharge || 0;
  const insurancePerDay = claim.hireDetails?.insurancePerDay || 0;
  const storageTotal = claim.storage?.totalCost || 0;

  const hireTotal = daysOfHire * claimRate;
  const insuranceTotal = daysOfHire * insurancePerDay;
  const totalCost = hireTotal + deliveryCharge + collectionCharge + insuranceTotal + storageTotal;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Image src={logo} style={styles.logo} />
          <View style={styles.companyInfo}>
            <Text>{companyDetails.fullName}</Text>
            <Text>{companyDetails.officialAddress}</Text>
            <Text>Tel: {companyDetails.phone}</Text>
            <Text>Email: {companyDetails.email}</Text>
          </View>
        </View>

        <Text style={styles.title}>HIRE AGREEMENT</Text>

        {/* Client Information */}
        <View style={styles.section}>
          <Text style={styles.text}>Full Name: {claim.clientInfo.name}</Text>
          <Text style={styles.text}>Address: {claim.clientInfo.address}</Text>
          <Text style={styles.text}>Postcode: {claim.clientInfo.postcode}</Text>
          <Text style={styles.text}>D.O.B: {format(new Date(claim.clientInfo.dateOfBirth), 'dd/MM/yyyy')}</Text>
          <Text style={styles.text}>Driving Licence Number: {claim.clientInfo.nationalInsuranceNumber}</Text>
        </View>

        {/* Rates & Charges Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Rates & Charges</Text>
          
          <View style={styles.table}>
            <View style={styles.tableRow}>
              <Text style={styles.tableCell}>Days of Hire ({daysOfHire} days × £{claimRate}/day)</Text>
              <Text style={styles.tableCellRight}>£{hireTotal}</Text>
            </View>
            
            <View style={styles.tableRow}>
              <Text style={styles.tableCell}>Delivery Charge</Text>
              <Text style={styles.tableCellRight}>£{deliveryCharge}</Text>
            </View>
            
            <View style={styles.tableRow}>
              <Text style={styles.tableCell}>Collection Charge</Text>
              <Text style={styles.tableCellRight}>£{collectionCharge}</Text>
            </View>
            
            <View style={styles.tableRow}>
              <Text style={styles.tableCell}>Insurance (£{insurancePerDay}/day × {daysOfHire} days)</Text>
              <Text style={styles.tableCellRight}>£{insuranceTotal}</Text>
            </View>
            
            <View style={styles.tableRow}>
              <Text style={styles.tableCell}>Storage Total Cost</Text>
              <Text style={styles.tableCellRight}>£{storageTotal}</Text>
            </View>
            
            <View style={[styles.tableRow, styles.totalRow]}>
              <Text style={styles.tableCellBold}>Total Cost of Hire</Text>
              <Text style={styles.tableCellBold}>£{totalCost}</Text>
            </View>
          </View>
        </View>

        {/* Terms and Conditions */}
        <View style={styles.section}>
          <Text style={styles.text}>
            {companyDetails.hireAgreementText || 
              "The rental of £" + claimRate + " per day at the prevailing rate, multiplied by the " +
              "number of days of hire/rental (Max 3 months), the Hirer shall pay to lessor " +
              "by one single payment within eleven months beginning with the date of this " +
              "agreement."
            }
          </Text>
        </View>

        {/* Signature Section */}
        <View style={styles.signatureSection}>
          <View style={styles.signatureBox}>
            <Text>Lessor:</Text>
            {companyDetails.signature && (
              <Image src={companyDetails.signature} style={styles.signature} />
            )}
            <Text style={styles.signatureLine}>For and on behalf of {companyDetails.fullName}</Text>
            <Text>Date: {format(new Date(), 'dd/MM/yyyy')}</Text>
          </View>

          <View style={styles.signatureBox}>
            <Text>Hirer:</Text>
            {claim.clientInfo.signature && (
              <Image src={claim.clientInfo.signature} style={styles.signature} />
            )}
            <Text style={styles.signatureLine}>{claim.clientInfo.name}</Text>
            <Text>Date: {format(new Date(), 'dd/MM/yyyy')}</Text>
          </View>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          {companyDetails.fullName} | Registered in England and Wales | Company No: {companyDetails.registrationNumber}
        </Text>
      </Page>
    </Document>
  );
};

export default HireAgreement;