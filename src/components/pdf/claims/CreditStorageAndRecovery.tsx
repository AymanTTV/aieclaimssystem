import React from 'react';
import { Document, Page, Text, View, Image } from '@react-pdf/renderer';
import { format } from 'date-fns';
import logo from '../../../assets/logo.png';

interface CreditStorageAndRecoveryProps {
  companyDetails: any;
}

const CreditStorageAndRecovery: React.FC<CreditStorageAndRecoveryProps> = ({
  companyDetails,
}) => {
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

        <Text style={styles.title}>CREDIT STORAGE AND RECOVERY AGREEMENT</Text>

        {/* Agreement Body */}
        <View style={styles.section}>
          <Text style={styles.text}>
            1. In this agreement, AIE SKYLINE LIMITED is referred to as the
            "Storage and Recovery Company." The "Owner" means the person, firm,
            or organization with the legal title or responsibility for the
            vehicle, the Storage and Recovery of which is the subject of this
            agreement, by or on behalf of whom the agreement is signed.
          </Text>

          <Text style={styles.text}>
            2. Where the owner's vehicle has been damaged by the negligent act
            or omission of a third party and as a consequence, the owner
            requires the vehicle to be Recovered and Stored in a safe storage.
            The Storage and Recovery Company will defer the Owner's obligation
            to pay the Storage and Recovery charges incurred by the owner
            pursuant to this agreement on the following terms:
          </Text>

          <Text style={styles.text}>
            (i) The payment of the Storage and Recovery charges incurred by the
            owner pursuant to this agreement shall be made by the Owner to the
            Storage and Recovery Company, by a single payment installment, to
            be made within a period of 51 weeks beginning with the date of this
            agreement, or if earlier upon the happening of either of the
            following events:
          </Text>

          <Text style={styles.text}>
            (a) Upon conclusion, the Owner's claim for damages against the
            third party alleged to be liable for the damage to the owner's
            vehicle; or
          </Text>

          <Text style={styles.text}>
            (b) Upon the Storage and Recovery Company giving notice to the
            owner of any breach by the owner of any Conditions set out in clause
            3 hereof.
          </Text>

          <Text style={styles.text}>
            (ii) The owner shall instruct a specialist solicitor approved by
            the Storage and Recovery Company to act on behalf of the owner in
            prosecuting a claim for loss or damages against the third party
            referred to in clause 2 above. The owner shall cooperate in the
            prosecution of the claim against the third party.
          </Text>

          <Text style={styles.text}>
            3. The Storage and Recovery Company agrees to defer payment on the
            daily charges as set out in clause 2 above on Condition that the
            Storage and Recovery Company has the right to demand payment in
            full of the charges forthwith, without further notice to the owner
            in the event of any of the following:
          </Text>

          <Text style={styles.text}>
            (i) The owner withdrawing instructions from the approved solicitor
            referred to at clause 2 (ii) above; or
          </Text>

          <Text style={styles.text}>
            (ii) The owner instructing solicitors, other than approved
            solicitors referred to at clause 2 (ii) above, to bring a Claim for
            loss or damages arising out of the accident; or
          </Text>

          <Text style={styles.text}>
            (iii) The owner failed to cooperate in the prosecution of the claim
            against the third party.
          </Text>

          <Text style={styles.text}>
            4. The owner is and remains immediately liable for any Storage and
            Recovery Charges carried out at the request of the owner, which
            were not directly caused by the negligent act or omission of the
            third party.
          </Text>

          <Text style={styles.text}>
            5. This agreement represents the entire agreement between the
            Owner and the Storage and Recovery Company. This agreement
            cannot be amended or varied orally. Any amendments or variation
            of this agreement must be made in writing and signed by the owner
            and duly authorized representative of the Storage and Recovery
            Company.
          </Text>

          <Text style={styles.text}>
            The Storage charges are £40 Per day from the date the vehicle has
            entered our premises. Normally, this is the same day as the
            vehicle is recovered.
          </Text>

          <Text style={styles.text}>The Recovery Charges are at the rate of £350</Text>

          <Text style={styles.text}>
            Your vehicle will be stored at the address below.
          </Text>
        </View>

        <Text style={styles.title}>SIGNATURE</Text>

        <View style={styles.signatureSection}>
          <Text style={styles.text}>
            I hereby agree to Storage and Recovery being carried out on the
            terms and conditions set out above.
          </Text>

          <Text style={styles.text}>Full Name: Hassan Shire Araale</Text>

          {/* Add signature field here */}

          <Text style={styles.text}>
            Date: {format(new Date(), 'dd/MM/yyyy')}
          </Text>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          {companyDetails.fullName} | Registered in England and Wales | Company No:
          {companyDetails.registrationNumber}
        </Text>
      </Page>
    </Document>
  );
};

export default CreditStorageAndRecovery;