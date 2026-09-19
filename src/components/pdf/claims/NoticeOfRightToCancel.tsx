// src/components/pdf/claims/NoticeOfRightToCancel.tsx
import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from '@react-pdf/renderer';
import { Claim } from '../../../types';
import { styles } from '../styles';
import { format } from 'date-fns';
import logo from '../../../assets/logo.png';

interface NoticeOfRightToCancelProps {
  claim?: Claim | any;
  companyDetails: any;
}

const localStyles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 65,
    paddingHorizontal: 36,
    fontSize: 8.5,
    fontFamily: 'Helvetica',
    backgroundColor: '#FFFFFF',
    lineHeight: 1.4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 8,
  },
  titleContainer: {
    borderBottomWidth: 2,
    borderBottomColor: '#3B82F6',
    marginBottom: 10,
    paddingBottom: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#0F172A',
    letterSpacing: 0.5,
  },
  refCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 4,
    paddingVertical: 5,
    paddingHorizontal: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    breakInside: 'avoid',
  },
  refCol: {
    flex: 1,
  },
  refLabel: {
    fontSize: 7.5,
    fontWeight: 'bold',
    color: '#475569',
    marginBottom: 1,
  },
  refValue: {
    fontSize: 8.5,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  termsContainer: {
    marginBottom: 10,
  },
  sectionHeading: {
    fontSize: 9.5,
    fontWeight: 'bold',
    color: '#1E3A8A',
    marginTop: 6,
    marginBottom: 3,
    breakInside: 'avoid',
  },
  paragraph: {
    fontSize: 8.5,
    color: '#334155',
    lineHeight: 1.45,
    marginBottom: 5,
    textAlign: 'justify',
  },
  cancellationSlipContainer: {
    marginTop: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#94A3B8',
    borderRadius: 4,
    backgroundColor: '#FAFAFA',
    padding: 8,
    breakInside: 'avoid',
  },
  slipHeader: {
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 4,
    marginBottom: 5,
  },
  slipTitle: {
    fontSize: 9.5,
    fontWeight: 'bold',
    color: '#0F172A',
    textAlign: 'center',
  },
  slipSubtitle: {
    fontSize: 7.5,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 1,
  },
  slipBody: {
    marginTop: 3,
  },
  slipText: {
    fontSize: 8,
    color: '#334155',
    lineHeight: 1.35,
    marginBottom: 2,
  },
  slipDetailsGrid: {
    marginTop: 4,
    marginBottom: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 3,
    padding: 5,
  },
  slipRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  slipFieldLabel: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#475569',
    width: 90,
  },
  slipFieldValue: {
    fontSize: 8,
    color: '#0F172A',
    flex: 1,
  },
  slipSignatureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  slipSigCol: {
    flex: 1,
  },
  slipSigLabel: {
    fontSize: 8,
    color: '#475569',
  },
});

const NoticeOfRightToCancel: React.FC<NoticeOfRightToCancelProps> = ({
  claim,
  companyDetails,
}) => {
  const hirerName =
    claim?.clientInfo?.name ||
    claim?.rental?.customerName ||
    'N/A';

  const hirerAddress =
    claim?.clientInfo?.address ||
    claim?.rental?.customerAddress ||
    'N/A';

  const vehicleReg =
    claim?.hireDetails?.vehicle?.registration ||
    claim?.clientVehicle?.registration ||
    claim?.rental?.vehicleRegistration ||
    'N/A';

  const agreementRef =
    claim?.rental?.rentalAgreementNumber
      ? `#${claim.rental.rentalAgreementNumber}`
      : claim?.rentalAgreementNumber
      ? `#${claim.rentalAgreementNumber}`
      : claim?.claimNumber || (claim?.id ? claim.id.slice(-8) : 'N/A');

  const dateIssued = (() => {
    try {
      const rawDate =
        claim?.hireDetails?.startDate ||
        claim?.rental?.startDate ||
        claim?.createdAt;
      if (!rawDate) return format(new Date(), 'dd/MM/yyyy');
      const d = new Date(rawDate);
      return isNaN(d.getTime())
        ? format(new Date(), 'dd/MM/yyyy')
        : format(d, 'dd/MM/yyyy');
    } catch {
      return format(new Date(), 'dd/MM/yyyy');
    }
  })();

  const companyName = companyDetails?.fullName || 'AIE SKYLINE LIMITED';
  const companyAddress =
    companyDetails?.officialAddress ||
    'United House, 39-41 North Road, London, N7 9DP';
  const companyPhone = companyDetails?.phone || 'N/A';
  const companyEmail = companyDetails?.email || 'N/A';

  const defaultNotice = `NOTICE OF RIGHT TO CANCEL
(The Consumer Contracts (Information, Cancellation and Additional Charges) Regulations 2013)

1. Right to Cancel
You have the right to cancel this contract within 14 calendar days without giving any reason. The cancellation period will expire after 14 calendar days from the date of the conclusion of the contract (the date on which this agreement is signed or the vehicle/service is supplied, whichever is earlier).

2. How to Exercise the Right to Cancel
To exercise the right to cancel, you must inform us (${companyName}, ${companyAddress}, Tel: ${companyPhone}, Email: ${companyEmail}) of your decision to cancel this contract by a clear statement (e.g. a letter sent by post or electronic mail). You may use the Cancellation Notice Slip provided below, but it is not obligatory.

3. Timeliness of Communication
To meet the cancellation deadline, it is sufficient for you to send your communication concerning your exercise of the right to cancel before the cancellation period has expired. Cancellation is deemed served once posted or sent electronically.

4. Effects of Cancellation
If you cancel this contract, we will reimburse to you all payments received from you, subject to the conditions set out below. We will make the reimbursement without undue delay, and not later than 14 days after the day on which we are informed about your decision to cancel this contract. We will make the reimbursement using the same means of payment as you used for the initial transaction, unless you have expressly agreed otherwise; in any event, you will not incur any fees as a result of the reimbursement.

5. Performance of Services During the Cancellation Period
If you requested us to begin the performance of credit hire or replacement vehicle services during the cancellation period, you shall pay us an amount which is in proportion to what has been performed until you have communicated us your cancellation of this contract, in comparison with the full coverage of the contract.

6. Return of Hired Vehicle / Property
Upon cancellation of this agreement, you must immediately make available and return any hired vehicle, goods, or equipment supplied to you in the same condition as received, reasonable fair wear and tear excepted.`;

  const rawNoticeText =
    companyDetails?.noticeOfRightToCancelText &&
    companyDetails.noticeOfRightToCancelText.trim().length > 0
      ? companyDetails.noticeOfRightToCancelText.trim()
      : defaultNotice;

  const paragraphs = rawNoticeText
    .split(/\r?\n+/)
    .map((p: string) => p.trim())
    .filter(Boolean);

  const isHeading = (text: string) =>
    /^[0-9]+\.\s+/.test(text) ||
    /^(NOTICE OF RIGHT TO CANCEL|CANCELLATION RIGHTS|RIGHT TO CANCEL)/i.test(
      text
    ) ||
    (text.length < 50 && text.endsWith(':'));

  return (
    <Document>
      <Page size="A4" style={localStyles.page}>
        {/* Fixed Header on all pages */}
        <View style={localStyles.header} fixed>
          <View style={styles.headerLeft}>
            {companyDetails?.logoUrl ? (
              <Image src={companyDetails.logoUrl} style={styles.logo} />
            ) : (
              <Image src={logo} style={styles.logo} />
            )}
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.companyName}>{companyName}</Text>
            <Text style={styles.companyDetail}>{companyAddress}</Text>
            <Text style={styles.companyDetail}>Tel: {companyPhone}</Text>
            <Text style={styles.companyDetail}>Email: {companyEmail}</Text>
          </View>
        </View>

        {/* Title */}
        <View style={localStyles.titleContainer}>
          <Text style={localStyles.title}>
            NOTICE OF RIGHT TO CANCEL CONTRACT
          </Text>
        </View>

        {/* Reference Information Bar */}
        <View style={localStyles.refCard}>
          <View style={localStyles.refCol}>
            <Text style={localStyles.refLabel}>Hirer Name:</Text>
            <Text style={localStyles.refValue}>{hirerName}</Text>
          </View>
          <View style={localStyles.refCol}>
            <Text style={localStyles.refLabel}>Vehicle Reg:</Text>
            <Text style={localStyles.refValue}>{vehicleReg}</Text>
          </View>
          <View style={localStyles.refCol}>
            <Text style={localStyles.refLabel}>Agreement Ref:</Text>
            <Text style={localStyles.refValue}>{agreementRef}</Text>
          </View>
          <View style={localStyles.refCol}>
            <Text style={localStyles.refLabel}>Date Issued:</Text>
            <Text style={localStyles.refValue}>{dateIssued}</Text>
          </View>
        </View>

        {/* Body Text / Terms (Naturally wraps across pages) */}
        <View style={localStyles.termsContainer} wrap>
          {paragraphs.map((para: string, idx: number) => {
            if (isHeading(para)) {
              return (
                <Text key={idx} style={localStyles.sectionHeading}>
                  {para}
                </Text>
              );
            }
            return (
              <Text key={idx} style={localStyles.paragraph}>
                {para}
              </Text>
            );
          })}
        </View>

        {/* Detachable Cancellation Notice Slip */}
        <View style={localStyles.cancellationSlipContainer} wrap={false}>
          <View style={localStyles.slipHeader}>
            <Text style={localStyles.slipTitle}>CANCELLATION NOTICE SLIP</Text>
            <Text style={localStyles.slipSubtitle}>
              (Complete and return this form ONLY IF YOU WISH TO CANCEL THE
              CONTRACT)
            </Text>
          </View>
          <View style={localStyles.slipBody}>
            <Text style={localStyles.slipText}>
              To:{' '}
              <Text style={{ fontWeight: 'bold' }}>{companyName}</Text>,{' '}
              {companyAddress}
            </Text>
            <Text style={localStyles.slipText}>
              Email: {companyEmail} | Tel: {companyPhone}
            </Text>
            <Text style={[localStyles.slipText, { marginTop: 3 }]}>
              I/We hereby give notice that I/we wish to cancel my/our credit
              agreement / vehicle hire contract.
            </Text>

            <View style={localStyles.slipDetailsGrid}>
              <View style={localStyles.slipRow}>
                <Text style={localStyles.slipFieldLabel}>Agreement Ref:</Text>
                <Text style={localStyles.slipFieldValue}>{agreementRef}</Text>
              </View>
              <View style={localStyles.slipRow}>
                <Text style={localStyles.slipFieldLabel}>Vehicle Reg:</Text>
                <Text style={localStyles.slipFieldValue}>{vehicleReg}</Text>
              </View>
              <View style={localStyles.slipRow}>
                <Text style={localStyles.slipFieldLabel}>Hirer Name:</Text>
                <Text style={localStyles.slipFieldValue}>{hirerName}</Text>
              </View>
              <View style={localStyles.slipRow}>
                <Text style={localStyles.slipFieldLabel}>Hirer Address:</Text>
                <Text style={localStyles.slipFieldValue}>{hirerAddress}</Text>
              </View>
            </View>

            <View style={localStyles.slipSignatureRow}>
              <View style={localStyles.slipSigCol}>
                <Text style={localStyles.slipSigLabel}>
                  Hirer Signature: _______________________
                </Text>
              </View>
              <View style={localStyles.slipSigCol}>
                <Text style={localStyles.slipSigLabel}>
                  Date: ____ / ____ / ________
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Fixed Footer across all pages */}
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

export default NoticeOfRightToCancel;
