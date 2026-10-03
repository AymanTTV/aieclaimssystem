import React from 'react';
import { Document, Page, Text, View, Image } from '@react-pdf/renderer';
import { Invoice, Vehicle } from '../../types';
import { format } from 'date-fns';
import logo from '../../assets/logo.png';
import SafePdfLogo from './SafePdfLogo';
import { isValidPdfImageSrc } from '../../utils/safePdfImage';
import { styles } from './styles';
import { formatInlineCompanyFooter, extractActiveCorporateEntityProfile } from '../../utils/legalDocumentUtils';

interface InvoicePDFProps {
  invoice: Invoice;
  vehicle?: Vehicle;
  companyDetails: any;
}

const formatDate = (date: any): string => {
  if (!date) return 'N/A';
  try {
    if (date?.toDate) {
      return format(date.toDate(), 'dd/MM/yyyy HH:mm');
    }
    if (date instanceof Date) {
      return format(date, 'dd/MM/yyyy HH:mm');
    }
    const d = new Date(date);
    return isNaN(d.getTime()) ? 'N/A' : format(d, 'dd/MM/yyyy HH:mm');
  } catch {
    return 'N/A';
  }
};

export const InvoicePDF: React.FC<InvoicePDFProps> = ({ invoice = {} as any, vehicle, companyDetails = {} }) => {
  const activeProfile = extractActiveCorporateEntityProfile(companyDetails);
  const effectiveDetails = {
    ...companyDetails,
    fullName: activeProfile.companyName || companyDetails?.fullName || 'Company',
    officialAddress: activeProfile.companyAddress || companyDetails?.officialAddress,
    phone: activeProfile.phone || companyDetails?.phone,
    email: activeProfile.email || companyDetails?.email,
    website: activeProfile.website || companyDetails?.website,
    vatNumber: activeProfile.vatNumber || companyDetails?.vatNumber,
  };

  const customerName = invoice.customerName || (invoice.customerId ? 'Customer' : 'Valued Client');
  const invoiceId = invoice.id || 'PREVIEW';
  const invoiceShortId = invoiceId.length >= 8 ? invoiceId.slice(-8).toUpperCase() : invoiceId.toUpperCase();
  const paymentStatus = (invoice.paymentStatus || 'unpaid').replace('_', ' ').toUpperCase();
  const originalAmount = typeof invoice.amount === 'number' ? invoice.amount : 0;
  const ongoingCharges = typeof invoice.ongoingCharges === 'number' ? invoice.ongoingCharges : 0;
  const totalAmount = originalAmount + ongoingCharges;
  const paidAmount = typeof invoice.paidAmount === 'number' ? invoice.paidAmount : 0;
  const remainingAmount = typeof invoice.remainingAmount === 'number' ? invoice.remainingAmount : (totalAmount - paidAmount);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <SafePdfLogo src={companyDetails.logoUrl || logo} companyName={effectiveDetails.fullName} style={styles.logo} />
          <View style={styles.companyInfo}>
            <Text>{effectiveDetails.fullName}</Text>
            <Text>{effectiveDetails.officialAddress}</Text>
            <Text>Tel: {effectiveDetails.phone}</Text>
            <Text>Email: {effectiveDetails.email}</Text>
            {Boolean(effectiveDetails.website) && (
              <Text>Web: {effectiveDetails.website}</Text>
            )}
            <Text>VAT No: {effectiveDetails.vatNumber || 'GB 464 1234 56'}</Text>
          </View>
        </View>

        <Text style={styles.title}>INVOICE</Text>

        {/* Invoice Details, Bill To, and Service Details in a row */}
        <View style={styles.grid}>
          <View style={styles.gridItem}>
            <View style={styles.card}>
              <Text style={styles.infoCardTitle}>Invoice Details</Text>
              <Text>Invoice Number: AIE-INV-{invoiceShortId}</Text>
              <Text>Date: {formatDate(invoice.date)}</Text>
              <Text>Due Date: {invoice.type === 'weekly' ? 'Every Monday' : formatDate(invoice.dueDate)}</Text>
              <Text>Payment Status: {paymentStatus}</Text>
            </View>
          </View>

          <View style={styles.gridItem}>
            <View style={styles.card}>
              <Text style={styles.infoCardTitle}>Bill To:</Text>
              <Text>{customerName}</Text>
              <Text>{invoice.customerAddress || 'United Kingdom'}</Text>
            </View>
          </View>

          <View style={styles.gridItem}>
            <View style={styles.card}>
              <Text style={styles.infoCardTitle}>Service Details</Text>
              <Text>Category: {invoice.category || 'Rental / Fleet Service'}</Text>
              <Text>Description: {invoice.description || 'Fleet Hire & Service Provision'}</Text>
            </View>
          </View>
        </View>

        {/* Payment Summary as a Table */}
        <View style={styles.tableContainer}>
          <Text style={styles.sectionTitle}>Payment Summary</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.tableCell}>Original Amount</Text>
              {ongoingCharges > 0 && <Text style={styles.tableCell}>Ongoing Charges</Text>}
              <Text style={styles.tableCell}>Total Amount</Text>
              <Text style={styles.tableCell}>Amount Paid</Text>
              {remainingAmount > 0 && <Text style={styles.tableCell}>Balance Due</Text>}
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.tableCell}>£{originalAmount.toFixed(2)}</Text>
              {ongoingCharges > 0 && <Text style={styles.tableCell}>£{ongoingCharges.toFixed(2)}</Text>}
              <Text style={styles.tableCell}>£{totalAmount.toFixed(2)}</Text>
              <Text style={styles.tableCell}>£{paidAmount.toFixed(2)}</Text>
              {remainingAmount > 0 && <Text style={styles.tableCell}>£{remainingAmount.toFixed(2)}</Text>}
            </View>
          </View>
        </View>

        {/* Payment Instructions */}
        {(() => {
          const activeBank =
            (companyDetails as any)?.selectedBank ||
            (invoice as any)?.bankAllocation || {
              bankName: companyDetails.bankName,
              sortCode: companyDetails.sortCode,
              accountNumber: companyDetails.accountNumber,
              accountName: companyDetails.accountName,
            };

          const qrCodeUrl =
            (companyDetails as any)?.paymentQrCodeDataUrl ||
            (invoice as any)?.paymentQrCodeDataUrl;
          const showQr = (companyDetails as any)?.includePaymentQr !== false && isValidPdfImageSrc(qrCodeUrl);

          return (
            <View style={[styles.card, styles.sectionBreak, { width: '48%' }]} wrap={false}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                <Text style={styles.infoCardTitle}>Payment Details</Text>
                {showQr && (
                  <Text style={{ fontSize: 6.5, color: '#4338CA', fontFamily: 'Helvetica-Bold' }}>
                    SCAN TO PAY
                  </Text>
                )}
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1, marginRight: showQr ? 6 : 0 }}>
                  <Text>Bank: {activeBank.bankName || 'LLOYDS BANK'}</Text>
                  {activeBank.accountName && <Text>Account Name: {activeBank.accountName}</Text>}
                  <Text>Sort Code: {activeBank.sortCode || '30-99-50'}</Text>
                  <Text>Account Number: {activeBank.accountNumber || '30513162'}</Text>
                  <Text>Reference: AIE-INV-{invoiceShortId}</Text>
                </View>
                {showQr && (
                  <View style={{ alignItems: 'center', width: 48, flexShrink: 0 }}>
                    <View style={{ padding: 2, backgroundColor: '#FFFFFF', borderWidth: 0.5, borderColor: '#CBD5E1', borderRadius: 3 }}>
                      <Image src={qrCodeUrl!} style={{ width: 42, height: 42 }} />
                    </View>
                    <Text style={{ fontSize: 5, color: '#64748B', marginTop: 1, textAlign: 'center' }}>
                      Mobile Banking
                    </Text>
                  </View>
                )}
              </View>
            </View>
          );
        })()}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            {formatInlineCompanyFooter(effectiveDetails)}
          </Text>
        </View>
      </Page>
    </Document>
  );
};

export default InvoicePDF;
