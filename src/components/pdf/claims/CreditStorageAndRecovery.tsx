import React from 'react';
import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';
import { Claim } from '../../../types'; // Assuming Claim type is relevant
import { styles } from '../styles'; // Your global styles
import { format } from 'date-fns';
import logo from '../../../assets/logo.png'; // Assuming you have a logo

const localStyles = StyleSheet.create({
  signatureSectionPositioning: {
    position: 'absolute',
    bottom: 50, // This positions it above the footer
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    breakInside: 'avoid',
    pageBreakInside: 'avoid',
  },
});

interface CreditStorageRecoveryAgreementProps {
  claim: Claim; // Use your relevant type for claim data
  companyDetails: any; // Use your relevant type for company details
}

const CreditStorageRecoveryAgreement: React.FC<CreditStorageRecoveryAgreementProps> = ({ claim, companyDetails }) => {
  const defaultTerms = `
  1. Definitions and Interpretation
     (a) "Agreement" refers to this Credit Storage and Recovery Agreement.
     (b) "Lender" refers to ${companyDetails.fullName || 'AIE SKYLINE LTD'}.
     (c) "Borrower" refers to the person, firm, or organization identified as the client in this agreement.
     (d) "Credit Facility" refers to the credit limit and terms extended by the Lender to the Borrower as detailed herein.
     (e) "Collateral" refers to any assets, goods, or property provided by the Borrower to secure the Credit Facility.

  2. Grant of Credit Facility
     The Lender agrees to provide a Credit Facility to the Borrower, subject to the terms and conditions set forth in this Agreement. The specific credit limit and repayment schedule will be detailed in an attached schedule or separate loan document.

  3. Storage of Collateral
     (a) If applicable, the Borrower agrees to store the Collateral at a location approved by the Lender.
     (b) The Borrower shall be responsible for the safekeeping, insurance, and maintenance of the Collateral throughout the term of this Agreement.
     (c) The Lender shall have the right to inspect the Collateral at reasonable times with prior notice.

  4. Recovery of Credit
     (a) In the event of default by the Borrower on any payment or obligation under this Agreement, the Lender shall have the right to recover the outstanding credit.
     (b) Recovery actions may include, but are not limited to, the repossession and liquidation of the Collateral.
     (c) The Borrower agrees to cooperate fully with the Lender in the recovery process and to bear all reasonable costs associated with such recovery, including legal fees.

  5. Interest and Charges
     (a) Interest shall accrue on any outstanding balance as per the agreed-upon rate, detailed in the attached schedule or separate loan document.
     (b) The Lender reserves the right to levy charges for late payments, administrative costs, and any costs incurred in the recovery process.

  6. Borrower's Covenants
     The Borrower covenants that:
     (a) All information provided to the Lender is true and accurate.
     (b) They have the legal capacity to enter into this Agreement.
     (c) They will notify the Lender immediately of any change in their financial status or contact details.

  7. Governing Law
     This Agreement shall be governed by and construed in accordance with the laws of England and Wales.

  8. Entire Agreement
     This Agreement constitutes the entire agreement between the Lender and the Borrower regarding the Credit Facility and supersedes all prior discussions, negotiations, and agreements.
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

        {/* TITLE */}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>CREDIT STORAGE AND RECOVERY AGREEMENT</Text>
        </View>

        {/* TERMS AND CONDITIONS */}
        <View
          style={{
            marginBottom: 20,
            breakInside: 'auto',
            pageBreakInside: 'auto',
          }}
          wrap
        >
          <Text style={styles.sectionTitle}>TERMS AND CONDITIONS</Text>
          {/* Using defaultTerms or a prop if you want dynamic terms */}
          <Text style={styles.text}>
            {companyDetails.creditStorageRecoveryAgreementText || defaultTerms}
          </Text>
        </View>

        {/* SIGNATURES */}
        <View style={localStyles.signatureSectionPositioning} wrap={false}>
          {/* Borrower’s Signature */}
          <View style={[styles.signatureBox, { borderColor: '#3B82F6', borderWidth: 1 }]}>
            <Text style={styles.signatureLine}>Borrower’s Signature</Text>
            {/* Assuming clientInfo contains borrower's signature and name */}
            {claim.clientInfo?.signature && (
              <Image src={claim.clientInfo.signature} style={styles.signature} />
            )}
            <Text>{claim.clientInfo?.name}</Text>
            <Text>Date: {format(new Date(), 'dd/MM/yyyy')}</Text>
          </View>

          {/* Authorized Signature */}
          <View style={[styles.signatureBox, { borderColor: '#3B82F6', borderWidth: 1 }]}>
            <Text style={styles.signatureLine}>Authorized Signature (for Lender)</Text>
            {companyDetails.signature && (
              <Image src={companyDetails.signature} style={styles.signature} />
            )}
            <Text>{companyDetails.fullName}</Text>
            <Text>Date: {format(new Date(), 'dd/MM/yyyy')}</Text>
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

export default CreditStorageRecoveryAgreement;