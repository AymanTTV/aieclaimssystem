import React from 'react';
import { Document, Page, Text, View, Image } from '@react-pdf/renderer';
import { Claim } from '../../../types';
import { styles } from '../styles';
import { format } from 'date-fns';
import logo from '../../../assets/logo.png';

interface CreditHireMitigationProps {
  claim: Claim;
  companyDetails: any;
}

const CreditHireMitigation: React.FC<CreditHireMitigationProps> = ({ claim, companyDetails }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <Image src={logo} style={styles.logo} />
        <View style={styles.headerRight}>
          <Text style={styles.companyName}>{companyDetails.fullName}</Text>
          <Text style={styles.companyDetail}>{companyDetails.officialAddress}</Text>
          <Text style={styles.companyDetail}>Tel: {companyDetails.phone}</Text>
          <Text style={styles.companyDetail}>Email: {companyDetails.email}</Text>
        </View>
      </View>

      {/* Title */}
      <View style={styles.titleContainer}>
        <Text style={styles.title}>
          CREDIT HIRE MITIGATION OF LOSS / STATEMENT OF TRUTH
        </Text>
      </View>

      {/* Statement */}
      <View style={styles.infoCard}>
        <Text style={styles.value}>
          {companyDetails.creditHireMitigationText ||
            `I, the undersigned, have entered into this hire agreement understanding the full terms and conditions of contract. I am aware that:

1. The hire company has carefully explained their procedure in claiming back my credit hire losses.
2. I have carefully considered the type and specification of the hire vehicle that I am hiring in order to mitigate my losses.
3. I understand that the reason for this hire vehicle is because my vehicle is no longer fit for purpose or roadworthy.
4. I will hire the vehicle for the shortest amount of time possible in order to have my vehicle repaired, this will not exceed 3 months.
5. I shall keep AIE SKYLINE LIMITED informed at all times of progress or delays to handle my claim effectively.
6. I am ultimately responsible for the hire charges should they remain unpaid after 340 days from the start of the hire.
7. I have no funds available to repair/replace my vehicle.
8. Prior to agree into the hire agreement my duty to keep my losses to a minimum has been explained to me.
9. I have read and understood the above and I believe that the answers that I have given are true.`}
        </Text>
      </View>

      {/* Signatures */}
      <View style={styles.flexRow}>
        <View style={[styles.card, { width: '48%' }]}>
          <Text style={styles.sectionTitle}>Signed By</Text>
          <Text style={styles.label}>Name:</Text>
          <Text style={styles.value}>{claim.clientInfo.name}</Text>
          {claim.clientInfo.signature && (
            <Image src={claim.clientInfo.signature} style={styles.signature} />
          )}
        </View>
        <View style={[styles.card, { width: '48%' }]}>
          <Text style={styles.sectionTitle}>On Behalf Of</Text>
          {companyDetails.signature && (
            <Image src={companyDetails.signature} style={styles.signature} />
          )}
          <Text style={styles.label}>Date:</Text>
          <Text style={styles.value}>{format(new Date(), 'dd/MM/yyyy')}</Text>
        </View>
      </View>

      <Text style={styles.footer}>
        {companyDetails.fullName} | Registered in England and Wales | Company No:{' '}
        {companyDetails.registrationNumber}
      </Text>
    </Page>
  </Document>
);

export default CreditHireMitigation;
