import React from 'react';
import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer'; 
import { styles } from '../styles';
import { format } from 'date-fns';
import logo from '../../../assets/logo.png';

// Local styles for specific positioning, similar to ConditionOfHire
const localStyles = StyleSheet.create({
  signatureSectionPositioning: {
    position: 'absolute',
    bottom: 50, // Position above the footer (which is at bottom 30)
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    breakInside: 'avoid',
    pageBreakInside: 'avoid',
  },
  bodyTextContainer: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#F9FAFB', 
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  infoCard: {
    borderWidth: 1,
    borderColor: '#3B82F6',   
    borderRadius: 6,
    padding: 8,
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
  },
  infoItem: {
    flex: 1,
    alignItems: 'flex-start',
    paddingHorizontal: 4,
  },
  infoLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1E40AF',         
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 10,
    color: '#1F2937',         
  },
});

interface SatisfactionNoticeProps {
  claim: any; 
  companyDetails: any; 
}

const SatisfactionNotice: React.FC<SatisfactionNoticeProps> = ({
  claim,
  companyDetails,
}) => {
  // --- FIXED: Safely extract the rental end date from hireDetails ---
  const getSignatureDate = () => {
    // Look inside hireDetails first, fallback to top-level endDate if it exists
    const rawDate = claim?.hireDetails?.endDate || claim?.endDate;
    
    if (!rawDate) return new Date();
    
    // Handle Firestore Timestamps
    if (typeof rawDate.toDate === 'function') return rawDate.toDate();
    
    const parsedDate = new Date(rawDate);
    return isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
  };

  const signatureDate = getSignatureDate();
  // ------------------------------------------------------------------

  const defaultSatisfactionText = `
  I, ${claim.clientInfo?.name || '____________________'}, hereby certify that I am fully satisfied with the services rendered for my vehicle, registration number ${claim.clientVehicle?.registration || '____________________'}.

  The work performed has met my expectations, and I acknowledge the completion of all agreed-upon repairs/services to my satisfaction.
  `;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* HEADER */}
        <View style={styles.header} fixed>
          <View style={styles.headerLeft}>
            <Image src={logo} style={styles.logo} />
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.companyName}>{companyDetails.fullName}</Text>
            <Text style={styles.companyDetail}>{companyDetails.officialAddress}</Text>
            <Text style={styles.companyDetail}>Tel: {companyDetails.phone}</Text>
            <Text style={styles.companyDetail}>Email: {companyDetails.email}</Text>
          </View>
        </View>

        {/* Title */}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>SATISFACTION NOTICE</Text>
        </View>

        {/* Horizontal Card for Key Details */}
        <View style={localStyles.infoCard} wrap={false}>
          <View style={localStyles.infoItem}>
            <Text style={localStyles.infoLabel}>Date</Text>
            <Text style={localStyles.infoValue}>{format(signatureDate, 'dd/MM/yyyy')}</Text>
          </View>
          <View style={localStyles.infoItem}>
            <Text style={localStyles.infoLabel}>Customer Name</Text>
            <Text style={localStyles.infoValue}>{claim.clientInfo?.name || 'N/A'}</Text>
          </View>
          <View style={localStyles.infoItem}>
            <Text style={localStyles.infoLabel}>Vehicle Registration</Text>
            <Text style={localStyles.infoValue}>{claim.clientVehicle?.registration || 'N/A'}</Text>
          </View>
        </View>

        {/* Body Text */}
        <View style={localStyles.bodyTextContainer}>
          <Text style={styles.text}>
            {companyDetails.satisfactionNoticeText || defaultSatisfactionText}
          </Text>
        </View>

        {/* Signatures */}
        <View style={localStyles.signatureSectionPositioning} wrap={false}>
          {/* Customer Signature */}
          <View style={[styles.signatureBox, { borderColor: '#3B82F6', borderWidth: 1 }]}>
            <Text style={styles.signatureLine}>Customer Signature</Text>
            {claim.clientInfo?.signature && (
              <Image src={claim.clientInfo.signature} style={styles.signature} />
            )}
            <Text>{claim.clientInfo?.name}</Text>
            <Text>Date: {format(signatureDate, 'dd/MM/yyyy')}</Text>
          </View>

          {/* Company Representative Signature */}
          <View style={[styles.signatureBox, { borderColor: '#3B82F6', borderWidth: 1 }]}>
            <Text style={styles.signatureLine}>Company Representative Signature</Text>
            {companyDetails.signature && (
              <Image src={companyDetails.signature} style={styles.signature} />
            )}
            <Text>{companyDetails.fullName}</Text>
            <Text>Date: {format(signatureDate, 'dd/MM/yyyy')}</Text>
          </View>
        </View>

        {/* FOOTER */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            AIE SKYLINE LIMITED, registered in England and Wales with the company registration number 15616639, registered office address: United House, 39-41 North Road, London, N7 9DP. VAT. NO. 453448875
          </Text>
          <Text
            style={styles.pageNumber}
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
};

export default SatisfactionNotice;