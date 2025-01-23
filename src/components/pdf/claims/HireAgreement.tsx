import React from 'react';
import { Document, Page, Text, View, Image } from '@react-pdf/renderer';
import { format } from 'date-fns';
import logo from '../../../assets/logo.png';

interface HireAgreementProps {
  claim: any; // Assuming claim object contains necessary data
  companyDetails: any;
}

const HireAgreement: React.FC<HireAgreementProps> = ({ claim, companyDetails }) => {
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

        <View style={styles.section}>
          <Text style={styles.text}>
            Full Name: {claim.clientInfo.name}
          </Text>
          <Text style={styles.text}>Address: {claim.clientInfo.address}</Text>
          <Text style={styles.text}>
            Postcode: {claim.clientInfo.postcode}
          </Text>
          <Text style={styles.text}>D.O.B: {claim.clientInfo.dob}</Text>
          <Text style={styles.text}>
            Driving Licence Number: {claim.clientInfo.drivingLicenseNumber}
          </Text>
          <Text style={styles.text}>
            Expiry Date: 06/11/2028
          </Text>
          <Text style={styles.text}>Insurance Company: TRADEX</Text>
          <Text style={styles.text}>
            Policy Number: P-TFL00290976/11
          </Text>
          <Text style={styles.text}>Expiry Date: 18/12/2024</Text>

          {/* Add signature field here */}

          {/* Terms and Conditions */}
          <Text style={styles.title}>Terms and Conditions - Fleet Insurance Cover</Text>

          <Text style={styles.text}>1. Driver Requirements:</Text>
          <Text style={styles.text}>
            o You must hold a full UK driving licence to be eligible for
            coverage under our fleet insurance.
          </Text>
          <Text style={styles.text}>
            o You must be aged between 25 and 65 years old.
          </Text>

          <Text style={styles.text}>2. Conviction Policy:</Text>
          <Text style={styles.text}>
            o Drivers must not have been convicted of more than one minor
            driving offence within the last 3 years from the date of the
            conviction.
          </Text>

          {/* ... continue with the remaining terms and conditions ... */}

          <Text style={styles.text}>
            a) Do you have any physical defect or infirmity? YES / NO
          </Text>
          <Text style={styles.text}>
            b) Have you been convicted or have any prosecution pending for any
            motoring offence or has your license been suspended or endorsed?
            YES / NO
          </Text>
          <Text style={styles.text}>
            c) Have you been refused, declined motor insurance or increased
            Premiums or special terms imposed? YES / NO
          </Text>

          <Text style={styles.text}>
            If answer YES to any of the above, please give details.
          </Text>

          <Text style={styles.text}>
            I hereby warrant the truth of the above statement and details on
            the left. I declare that I have withheld no information
            whatsoever which might tend in a way to increase the risk of
            insurers or influence the acceptance of this proposal. I agree
            that this proposal shall be on the basis of the contract between
            me and the insurers and I further agree to be bound by the terms
            and conditions and the exceptions of the policy, which I have
            the opportunity to see and read. I further declare that my
            occupation and personal details and driving do not render me
            ineligible to hire.
          </Text>

          {/* ... continue with the remaining terms and conditions ... */}

          <Text style={styles.text}>
            The rental of £340 per day at the prevailing rate, multiplied by
            the number of days of hire/rental (Max 3 months), the Hirer shall
            pay to lessor by one single payment within eleven months
            beginning with the date of this agreement.
          </Text>

          <Text style={styles.text}>
            I ACCEPT AND AGREE THAT THE FINANCIAL DETAILS ABOVE HAVE BEEN
            COMPLETED PRIOR TO MY SIGNATURE. I FURTHER ACCEPT THE ABOVE
            CHARGES ARE ME RESPONSIBILITY AT ALL TIMES.
          </Text>

          {/* ... continue with the remaining terms and conditions ... */}

          <Text style={styles.text}>
            1. I have read and understood the terms and condition appearing
            on the front and reverse hereof.
          </Text>

          {/* ... continue with the remaining terms and conditions ... */}

          <Text style={styles.text}>
            I acknowledge having received a copy of this agreement.
          </Text>

          <Text style={styles.text}>
            I confirm that this agreement has been completed prior on my
            signature.
          </Text>

          <Text style={styles.text}>
            Lessor signature: {/* Add Lessor signature field here */}
          </Text>

          <Text style={styles.text}>Date: {format(new Date(), 'dd/MM/yyyy')}</Text>

          <Text style={styles.text}>
            Hirers signature: {/* Add Hirers signature field here */}
          </Text>

          <Text style={styles.text}>Date: {format(new Date(), 'dd/MM/yyyy')}</Text>

          <Text style={styles.text}>Name of Hirer: {claim.clientInfo.name}</Text>
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

export default HireAgreement;