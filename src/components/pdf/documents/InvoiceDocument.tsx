// src/components/pdf/documents/InvoiceDocument.tsx
import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  Link,
} from '@react-pdf/renderer';
import { Invoice, Vehicle, Customer } from '../../../types';
import { styles as globalStyles } from '../styles';
import { format } from 'date-fns';
import { formatInlineCompanyFooter } from '../../../utils/legalDocumentUtils';
import { getResolvedTermsContent } from '../../../utils/documentTemplateTerms';
import SafePdfLogo from '../SafePdfLogo';
import PdfTermsWarningNotice from '../claims/PdfTermsWarningNotice';
import { getAvailableCompanyEntities, buildEffectiveDocumentCompanyDetails } from '../../../utils/entityBranding';

// Extended interface to accept the full customer object for the address
interface InvoiceWithVehicleAndCustomer extends Invoice {
  vehicle?: Vehicle;
  customer?: Customer; 
  customerAddress?: string; // Fallback in case it is passed as a flat string
}

interface InvoiceDocumentProps {
  data: InvoiceWithVehicleAndCustomer;
  companyDetails: any;
}

const localStyles = StyleSheet.create({
  sideBySideContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  bottomContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  cardBox: {
    width: '48%',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 6,
    padding: 12,
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 5,
    textTransform: 'uppercase',
  },
  spaceBetweenRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
    fontSize: 10,
  },
  label: { color: '#4B5563', fontWeight: 'bold', textTransform: 'uppercase', fontSize: 9 },
  value: { color: '#111827', fontWeight: 'bold' },
});

const tcStyles = StyleSheet.create({
  termTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    textDecoration: 'underline',
  },
  termSection: {
    marginBottom: 4, 
  },
  termText: {
    fontSize: 8, 
    marginBottom: 1,
    lineHeight: 1.4,
    textAlign: 'justify',
    color: '#374151'
  },
});

const InvoiceDocument: React.FC<InvoiceDocumentProps> = ({
  data,
  companyDetails,
}) => {
  // Safe formatters
  const formatCurrency = (amount: number) => 
    `£${(amount || 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const formatDateValue = (date: any): string => {
    if (!date) return 'N/A';
    try {
      const d = date?.toDate ? date.toDate() : new Date(date);
      return !isNaN(d.getTime()) ? format(d, 'dd/MM/yyyy') : 'N/A';
    } catch (e) {
      return 'N/A';
    }
  };

  const isValidPdfImageSrc = (v: any) => {
    if (typeof v !== 'string') return false;
    return v.startsWith('http') || v.startsWith('data:image');
  };

  // Safe Calculations
  const computedLines = (data.lineItems || []).map(item => {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.unitPrice) || 0;
    const disc = Number(item.discount) || 0;
    
    const gross = qty * price;
    const discountAmt = (disc / 100) * gross;
    const net = gross - discountAmt;
    const vat = item.includeVAT ? net * 0.2 : 0;
    const total = net + vat;
    return { ...item, gross, discountAmt, net, vat, total };
  });

  const totalDiscount = computedLines.reduce((sum, i) => sum + i.discountAmt, 0);
  const netTotal = computedLines.reduce((sum, i) => sum + i.net, 0);
  const vatTotal = computedLines.reduce((sum, i) => sum + i.vat, 0);
  const grandTotal = netTotal + vatTotal;

  // Safe ID slicing (prevents crashes on new creation)
  const safeId = data.id || 'NEW-RECORD';
  const displayInvoiceNumber = data.invoiceNumber || `INV-${safeId.slice(0, 8).toUpperCase()}`;

  // Smartly grab the address from the passed customer object (whether customer, claim, or company)
  const customerDisplayAddress = data.customer?.address || data.customerAddress || data.vehicle?.owner?.address;
  // Splits by comma or new lines to print line-by-line
  const addressParts = customerDisplayAddress ? customerDisplayAddress.split(/,|\n/).map(s => s.trim()).filter(Boolean) : [];

  // Dynamically resolve corporate entity branding based on selected companyId / issuingEntity / corporateEntityKey
  const availableEntities = getAvailableCompanyEntities(companyDetails);
  const targetKey =
    data.corporateEntityKey ||
    data.issuingEntity ||
    (data.companyId ? availableEntities.find(e => e.id === data.companyId || e.key === data.companyId)?.key : undefined) ||
    companyDetails?.corporateEntityKey ||
    'aie_skyline';
  const chosenEntity = availableEntities.find(e => e.key === targetKey || e.id === targetKey) || availableEntities[0];
  const effectiveDetails = buildEffectiveDocumentCompanyDetails(companyDetails, chosenEntity, {
    selectedBank: (data as any).bankAllocation || companyDetails?.selectedBank,
  });

  return (
    <Document>
      <Page size="A4" style={globalStyles.page}>
        
        {/* HEADER */}
        <View style={globalStyles.header} fixed>
          <View style={globalStyles.headerLeft}>
            <SafePdfLogo
              src={effectiveDetails?.logoUrl}
              companyName={effectiveDetails?.fullName || 'AIE SKYLINE LIMITED'}
              tradingName={effectiveDetails?.tradingName}
              entityKey={effectiveDetails?.key || targetKey}
              entityDetails={effectiveDetails}
              style={globalStyles.logo}
            />
          </View>
          <View style={globalStyles.headerRight}>
            <Text style={globalStyles.companyName}>{effectiveDetails?.fullName || 'AIE SKYLINE LIMITED'}</Text>
            {Boolean(effectiveDetails?.customHeaderText) && (
              <Text style={[globalStyles.companyDetail, { fontStyle: 'italic', color: '#4B5563', marginBottom: 2 }]}>
                {effectiveDetails.customHeaderText}
              </Text>
            )}
            <Text style={globalStyles.companyDetail}>{effectiveDetails?.officialAddress || 'N/A'}</Text>
            <Text style={globalStyles.companyDetail}>Tel: {effectiveDetails?.phone || 'N/A'}</Text>
            <Text style={globalStyles.companyDetail}>Email: {effectiveDetails?.email || 'N/A'}</Text>
            {Boolean(effectiveDetails?.vatNumber) && (
              <Text style={globalStyles.companyDetail}>VAT No: {effectiveDetails.vatNumber}</Text>
            )}
          </View>
        </View>

        {/* TITLE */}
        <View style={globalStyles.titleContainer}>
          <Text style={globalStyles.title}>INVOICE</Text>
        </View>

        {/* SIDE-BY-SIDE CARDS: Bill To & Invoice Info */}
        <View style={localStyles.sideBySideContainer} wrap={false}>
          {/* Left Card: Bill To */}
          <View style={localStyles.cardBox}>
            <Text style={localStyles.cardTitle}>Bill To:</Text>
            <Text style={{ fontWeight: 'bold', fontSize: 10, marginBottom: 2 }}>
              {data.customerName || 'N/A'}
            </Text>
            {/* Renders the address line-by-line */}
            {addressParts.length > 0 && addressParts.map((part, i) => (
              <Text key={i} style={{ fontSize: 10, color: '#374151', lineHeight: 1.3, marginTop: i === 0 ? 4 : 0 }}>
                {part}
              </Text>
            ))}
          </View>

          {/* Right Card: Invoice Details */}
          <View style={localStyles.cardBox}>
            <Text style={[localStyles.cardTitle, { color: '#1E40AF', fontSize: 12 }]}>{displayInvoiceNumber}</Text>
            
            <View style={localStyles.spaceBetweenRow}>
              <Text style={localStyles.label}>Inv. Date:</Text>
              <Text style={localStyles.value}>{formatDateValue(data.date)}</Text>
            </View>
            <View style={localStyles.spaceBetweenRow}>
              <Text style={localStyles.label}>Due Date:</Text>
              <Text style={localStyles.value}>{formatDateValue(data.dueDate)}</Text>
            </View>
          </View>
        </View>

        {/* CHARGES TABLE */}
        <View style={globalStyles.tableContainer}>
          <View style={globalStyles.tableHeader}>
            <Text style={[globalStyles.tableHeaderCell, { flex: 3 }]}>Description</Text>
            <Text style={[globalStyles.tableHeaderCell, { flex: 1, textAlign: 'center' }]}>Qty</Text>
            <Text style={[globalStyles.tableHeaderCell, { flex: 1.2, textAlign: 'right' }]}>Unit Price</Text>
            <Text style={[globalStyles.tableHeaderCell, { flex: 1, textAlign: 'right' }]}>VAT</Text>
            <Text style={[globalStyles.tableHeaderCell, { flex: 1, textAlign: 'right' }]}>Disc.</Text>
            <Text style={[globalStyles.tableHeaderCell, { flex: 1.2, textAlign: 'right' }]}>Total</Text>
          </View>

          {computedLines.map((item, index) => (
            <View key={index} style={globalStyles.tableRow}>
              <Text style={[globalStyles.tableCell, { flex: 3 }]}>{item.description || 'Item'}</Text>
              <Text style={[globalStyles.tableCell, { flex: 1, textAlign: 'center' }]}>{item.quantity}</Text>
              <Text style={[globalStyles.tableCell, { flex: 1.2, textAlign: 'right' }]}>{formatCurrency(item.unitPrice)}</Text>
              <Text style={[globalStyles.tableCell, { flex: 1, textAlign: 'right' }]}>{item.includeVAT ? '20%' : '0%'}</Text>
              <Text style={[globalStyles.tableCell, { flex: 1, textAlign: 'right' }]}>{item.discount > 0 ? `${item.discount}%` : '-'}</Text>
              <Text style={[globalStyles.tableCell, { flex: 1.2, textAlign: 'right', fontWeight: 'bold' }]}>{formatCurrency(item.total)}</Text>
            </View>
          ))}
        </View>

        {/* BOTTOM SECTION */}
        <View style={localStyles.bottomContainer} wrap={false}>
          {/* Card 1: Payment Details */}
          {(() => {
            const activeBank =
              effectiveDetails?.selectedBank ||
              (data as any).bankAllocation || {
                bankName: (data as any).bankName || effectiveDetails?.bankName,
                accountName: (data as any).accountName || effectiveDetails?.accountName || effectiveDetails?.fullName,
                accountNumber: (data as any).accountNumber || effectiveDetails?.accountNumber,
                sortCode: (data as any).sortCode || effectiveDetails?.sortCode,
                iban: (data as any).iban || effectiveDetails?.iban,
              };

            const qrCodeUrl =
              effectiveDetails?.paymentQrCodeDataUrl ||
              (data as any)?.paymentQrCodeDataUrl;
            const showQr = effectiveDetails?.includePaymentQr !== false && Boolean(qrCodeUrl);

            return (
              <View style={[localStyles.cardBox, { width: '48%' }]}>
                <View style={[localStyles.spaceBetweenRow, { marginBottom: 4, alignItems: 'center' }]}>
                  <Text style={localStyles.cardTitle}>Payment Details</Text>
                  {showQr && (
                    <Text style={{ fontSize: 6.5, color: '#4338CA', fontFamily: 'Helvetica-Bold' }}>
                      SCAN TO PAY
                    </Text>
                  )}
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1, marginRight: showQr ? 6 : 0 }}>
                    <View style={[localStyles.spaceBetweenRow, { marginBottom: 3 }]}>
                      <Text style={[localStyles.label, { textTransform: 'none' }]}>Bank:</Text>
                      <Text style={localStyles.value}>
                        {activeBank.bankName || 'LLOYDS BANK'}
                      </Text>
                    </View>
                    <View style={[localStyles.spaceBetweenRow, { marginBottom: 3 }]}>
                      <Text style={[localStyles.label, { textTransform: 'none' }]}>Account Name:</Text>
                      <Text style={localStyles.value}>
                        {activeBank.accountName || effectiveDetails?.fullName || 'AIE SKYLINE LIMITED'}
                      </Text>
                    </View>
                    <View style={[localStyles.spaceBetweenRow, { marginBottom: 3 }]}>
                      <Text style={[localStyles.label, { textTransform: 'none' }]}>Account Number:</Text>
                      <Text style={localStyles.value}>
                        {activeBank.accountNumber || '30513162'}
                      </Text>
                    </View>
                    <View style={[localStyles.spaceBetweenRow, { marginBottom: 3 }]}>
                      <Text style={[localStyles.label, { textTransform: 'none' }]}>Sort Code:</Text>
                      <Text style={localStyles.value}>
                        {activeBank.sortCode || '30-99-50'}
                      </Text>
                    </View>
                    {(activeBank.iban || (data as any).bankAllocation?.iban || effectiveDetails?.iban) && (
                      <View style={[localStyles.spaceBetweenRow, { marginBottom: 3 }]}>
                        <Text style={[localStyles.label, { textTransform: 'none' }]}>IBAN:</Text>
                        <Text style={localStyles.value}>
                          {activeBank.iban || (data as any).bankAllocation?.iban || effectiveDetails?.iban}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* QR Code Container */}
                  {showQr && (
                    <View style={{ alignItems: 'center', width: 56, flexShrink: 0, marginTop: 1 }}>
                      <View style={{ padding: 2, backgroundColor: '#FFFFFF', borderWidth: 0.5, borderColor: '#CBD5E1', borderRadius: 3 }}>
                        <Image src={qrCodeUrl!} style={{ width: 48, height: 48 }} />
                      </View>
                      <Text style={{ fontSize: 5.5, color: '#64748B', marginTop: 2, textAlign: 'center' }}>
                        Mobile Banking
                      </Text>
                    </View>
                  )}
                </View>

                <View style={{ marginTop: 6, borderTopWidth: 0.5, borderTopColor: '#E2E8F0', paddingTop: 3 }}>
                  <Text style={[localStyles.label, { fontSize: 7.5, textTransform: 'none', fontStyle: 'italic' }]}>
                    Please use Invoice {displayInvoiceNumber} as reference.
                  </Text>
                </View>
              </View>
            );
          })()}


          {/* Card 2: Summary */}
          <View style={[localStyles.cardBox, { width: '48%' }]}>
            <Text style={localStyles.cardTitle}>Summary</Text>
            
            <View style={[localStyles.spaceBetweenRow, { marginBottom: 4 }]}>
              <Text style={[localStyles.label, { textTransform: 'none', color: '#000000', fontWeight: 'bold' }]}>Net Amount:</Text>
              <Text style={[localStyles.value, { textAlign: 'right', color: '#000000', fontWeight: 'bold' }]}>{formatCurrency(netTotal)}</Text>
            </View>

            <View style={[localStyles.spaceBetweenRow, { marginBottom: 4 }]}>
              <Text style={[localStyles.label, { color: '#2563EB', textTransform: 'none', fontWeight: 'bold' }]}>VAT Total:</Text>
              <Text style={[localStyles.value, { color: '#2563EB', textAlign: 'right', fontWeight: 'bold' }]}>
                {formatCurrency(vatTotal)}
              </Text>
            </View>

            {totalDiscount > 0 && (
              <View style={[localStyles.spaceBetweenRow, { marginBottom: 4 }]}>
                <Text style={[localStyles.label, { color: '#D97706', textTransform: 'none', fontWeight: 'bold' }]}>Discount:</Text>
                <Text style={[localStyles.value, { color: '#D97706', textAlign: 'right', fontWeight: 'bold' }]}>
                  –{formatCurrency(totalDiscount)}
                </Text>
              </View>
            )}

            <View style={[localStyles.spaceBetweenRow, { borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 6, marginTop: 4, marginBottom: 4 }]}>
              <Text style={[localStyles.label, { fontWeight: 'bold', textTransform: 'none', color: '#D97706' }]}>Grand Total:</Text>
              <Text style={[localStyles.value, { textAlign: 'right', fontWeight: 'bold', color: '#D97706' }]}>{formatCurrency(grandTotal)}</Text>
            </View>

            <View style={[localStyles.spaceBetweenRow, { marginBottom: 4 }]}>
              <Text style={[localStyles.label, { textTransform: 'none', color: '#15803D', fontWeight: 'bold' }]}>Paid:</Text>
              <Text style={[localStyles.value, { textAlign: 'right', color: '#15803D', fontWeight: 'bold' }]}>{formatCurrency(data.paidAmount || 0)}</Text>
            </View>

            <View style={[localStyles.spaceBetweenRow, { marginBottom: 4 }]}>
              <Text style={[localStyles.label, { textTransform: 'none', fontWeight: 'bold', color: (data.remainingAmount || 0) > 0.001 ? '#DC2626' : '#15803D' }]}>Owing:</Text>
              <Text style={[localStyles.value, { textAlign: 'right', fontWeight: 'bold', color: (data.remainingAmount || 0) > 0.001 ? '#DC2626' : '#15803D' }]}>
                {formatCurrency(data.remainingAmount || 0)}
              </Text>
            </View>
          </View>
        </View>

        {/* FOOTER */}
        <View style={globalStyles.footer} fixed>
          <Text style={globalStyles.footerText}>
            {formatInlineCompanyFooter(effectiveDetails)}
          </Text>
          <Text
            style={globalStyles.pageNumber}
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
          />
        </View>
      </Page>

      {/* --- PAGE 2: Terms & Conditions --- */}
      {effectiveDetails?.includeTrailingTC !== false && (
        <Page size="A4" style={globalStyles.page}>
          <View style={globalStyles.header} fixed>
            <View style={globalStyles.headerLeft}>
              <SafePdfLogo
                src={effectiveDetails?.logoUrl}
                companyName={effectiveDetails?.fullName || 'AIE SKYLINE LIMITED'}
                tradingName={effectiveDetails?.tradingName}
                entityKey={effectiveDetails?.key || targetKey}
                entityDetails={effectiveDetails}
                style={globalStyles.logo}
              />
            </View>
            <View style={globalStyles.headerRight}>
              <Text style={globalStyles.companyName}>{effectiveDetails?.fullName || 'AIE SKYLINE LIMITED'}</Text>
              {Boolean(effectiveDetails?.customHeaderText) && (
                <Text style={[globalStyles.companyDetail, { fontStyle: 'italic', color: '#4B5563', marginBottom: 2 }]}>
                  {effectiveDetails.customHeaderText}
                </Text>
              )}
              <Text style={globalStyles.companyDetail}>{effectiveDetails?.officialAddress || 'N/A'}</Text>
              <Text style={globalStyles.companyDetail}>Tel: {effectiveDetails?.phone || 'N/A'}</Text>
              <Text style={globalStyles.companyDetail}>Email: {effectiveDetails?.email || 'N/A'}</Text>
            </View>
          </View>

          <View style={{ marginTop: 20 }}>
            {(() => {
              const resolvedTermsData = getResolvedTermsContent(
                {
                  documentScope: 'invoice',
                  hireType: (data as any)?.hireType || (data as any)?.type || 'commercial_invoice',
                  customerType: data?.customer?.type || (data as any)?.customerType,
                  paymentStatus: data.paymentStatus,
                  targetPagePosition: 'trailing_before_signatures',
                },
                companyDetails
              );
              return (
                <>
                  <Text style={tcStyles.termTitle}>
                    {resolvedTermsData.isConfigured
                      ? resolvedTermsData.title
                      : 'TERMS AND CONDITIONS'}
                  </Text>

                  <View style={tcStyles.termSection}>
                    {resolvedTermsData.isConfigured && resolvedTermsData.paragraphs.length > 0 ? (
                      resolvedTermsData.paragraphs.map((paragraph: string, idx: number) => (
                        <Text key={idx} style={tcStyles.termText}>
                          {paragraph.trim()}
                        </Text>
                      ))
                    ) : (
                      <PdfTermsWarningNotice message={resolvedTermsData.warningMessage} />
                    )}
                  </View>
                </>
              );
            })()}
          </View>

          <View style={globalStyles.footer} fixed>
            <Text style={globalStyles.footerText}>
              {formatInlineCompanyFooter(companyDetails)}
            </Text>
            <Text
              style={globalStyles.pageNumber}
              render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
            />
          </View>
        </Page>
      )}
    </Document>
  );
};

export default InvoiceDocument;