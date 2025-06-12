// styles.ts
import { StyleSheet } from '@react-pdf/renderer';

export const styles = StyleSheet.create({
  // --- Page & Layout Styles ---
  page: {
    paddingTop: 35,
    paddingBottom: 65,
    paddingHorizontal: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
    backgroundColor: '#FFFFFF',
    lineHeight: 1.4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 15,
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flex: 2,
    textAlign: 'right',
  },
  logo: {
    width: 100,
    height: 'auto',
    objectFit: 'contain',
  },
  companyName: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#111827',
  },
  companyDetail: {
    fontSize: 9,
    color: '#4B5563',
    marginBottom: 2,
  },
  companyInfo: {
    textAlign: 'right',
    fontSize: 10,
  },
  titleContainer: {
    borderBottomWidth: 2,
    borderBottomColor: '#438BDC',
    marginBottom: 20,
    paddingBottom: 5,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#1F2937',
  },
  section: {
    marginBottom: 15,
  },
  sectionBreak: {
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    breakInside: 'avoid',
    pageBreakInside: 'avoid',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#1F2937',
    backgroundColor: '#F3F4F6',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: '#438BDC',
  },

  // --- Vehicle Info Card Styles ---
  infoCard: {
    backgroundColor: '#F9FAFB',
    padding: 15,
    marginBottom: 20,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  infoCardTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#1F2937',
  },
  tableCol: {
    flex: 1,
    paddingRight: 10,
  },
  tableColHalf: {
    flex: 1,
    paddingHorizontal: 5,
  },
  subLabel: {
    fontSize: 9,
    color: '#6B7280',
    marginBottom: 2,
  },
  subValue: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1F2937',
  },

  // --- General Table Styles ---
  table: {
    width: '100%',
    marginVertical: 5,
  },
  tableHeader: {
    backgroundColor: '#3C9F2C',
    flexDirection: 'row',
    borderBottomColor: '#006A4E',
    borderBottomWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 5,
  },
  tableHeaderCell: {
    flex: 1,
    textAlign: 'left',
    paddingHorizontal: 5,
    fontWeight: 'bold',
    fontSize: 9.5,
    color: '#FFFFFF',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomColor: '#E5E7EB',
    borderBottomWidth: 1,
    paddingVertical: 7,
    minHeight: 30,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  tableRowAlternate: {
    flexDirection: 'row',
    borderBottomColor: '#E5E7EB',
    borderBottomWidth: 1,
    paddingVertical: 7,
    minHeight: 30,
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  tableCell: {
    flex: 1,
    textAlign: 'left',
    paddingHorizontal: 8,
    fontSize: 11,
    color: '#374151',
  },
  expiredText: {
    color: '#DC2626',
    fontWeight: 'bold',
  },

  // --- Styles for Cards (Bank Details, Payment Summary) ---
  card: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    marginBottom: 10,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#438BDC',
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1E40AF',
  },
  cardContent: {
    fontSize: 10,
    color: '#374151',
    lineHeight: 1.3,
    marginBottom: 3,
  },

  // --- Styles used within Cards' Key-Value Pairs ---
  flexRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  label: {
    fontWeight: 'bold',
    color: '#4B5563',
    marginRight: 5,
    fontSize: 10,
    width: 90,
  },
  value: {
    color: '#1F2937',
    flexShrink: 1,
    flex: 1,
    fontSize: 10,
  },
  spaceBetweenRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },

  // --- Image Styles ---
  imageContainer: {
    marginVertical: 15,
    alignItems: 'center',
  },
  vehicleImage: {
    maxWidth: 250,
    maxHeight: 150,
    objectFit: 'contain',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -5,
  },
  gridItem: {
    width: '33.33%',
    padding: 5,
    marginBottom: 10,
    breakInside: 'avoid',
  },
  documentImage: {
    width: '100%',
    height: 120,
    objectFit: 'contain',
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  imageCaption: {
    fontSize: 8,
    textAlign: 'center',
    color: '#6B7280',
  },

  // --- Footer Styles ---
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 8,
    textAlign: 'center',
    color: '#6B7280',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 8,
  },
  footerText: {
    marginBottom: 3,
    fontSize: 8,
  },
  pageNumber: {
    position: 'absolute',
    fontSize: 8,
    bottom: 10,
    left: 0,
    right: 0,
    textAlign: 'center',
    color: '#6B7280',
  },

  // --- General Text Style ---
  text: {
    fontSize: 10,
    color: '#374151',
    lineHeight: 1.5,
    marginBottom: 6,
  },

  // --- Terms & Conditions (smaller to fit one page) ---
  termsText: {
    fontSize: 10,
    color: '#374151',
    lineHeight: 1.3,
    marginBottom: 4,
  },

  // --- Summary Row Text Colors (no background) ---
  summaryTextDefault: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#374151',
    textAlign: 'left',
  },
  summaryValueDefault: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#374151',
    textAlign: 'right',
  },
  summaryTextGreen: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#3C9F2C',
    textAlign: 'left',
  },
  summaryValueGreen: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#3C9F2C',
    textAlign: 'right',
  },

  // --- Optional Legacy Styles ---
  row: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'center',
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 5,
  },
  highlight: {
    backgroundColor: '#FEF3C7',
    padding: 8,
    borderRadius: 4,
    marginBottom: 10,
  },
  highlightText: {
    color: '#92400E',
    fontWeight: 'bold',
  },
  pageBreak: {
    break: 'page',
    marginBottom: 20,
  },
  icon: {
    width: 16,
    height: 16,
    marginRight: 5,
  },
  separator: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 15,
  },
  warningText: {
    color: '#DC2626',
    fontSize: 10,
    marginTop: 5,
  },
  successText: {
    color: '#059669',
    fontSize: 10,
    marginTop: 5,
  },
  tableContainer: {
    marginBottom: 20,
    breakInside: 'avoid',
  },
  keepTogether: {
    breakInside: 'avoid',
  },
  softBorder: {
    border: '1 solid #E5E7EB',
    borderRadius: 4,
    padding: 10,
  },
  cardShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  infoCardContent: {
    color: '#4B5563',
  },
  signatureSection: {
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    breakInside: 'avoid',
  },
  signatureBox: {
    width: '45%',
    padding: 10,
    backgroundColor: '#F9FAFB',
    borderRadius: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
  },
  signature: {
    width: '100%',
    height: 50,
    marginVertical: 10,
    objectFit: 'contain',
  },
  signatureLine: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    marginTop: 5,
    paddingTop: 5,
    textAlign: 'center',
    color: '#4B5563',
  },

  tableSummaryLabelCell: {
    flexGrow: 5,
    textAlign: 'right',
    paddingHorizontal: 8,
    fontSize: 10,
    fontWeight: 'bold',
    color: '#374151',
  },
  tableSummaryValueCell: {
    flexGrow: 1,
    textAlign: 'right',
    paddingHorizontal: 8,
    fontSize: 10,
    fontWeight: 'bold',
    color: '#374151',
  },
});
