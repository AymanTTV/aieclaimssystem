import { StyleSheet } from '@react-pdf/renderer';

export const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    borderBottom: '2 solid #E5E7EB',
    paddingBottom: 20,
  },
  logo: {
    width: 120,
    height: 'auto',
  },
  companyInfo: {
    textAlign: 'right',
    fontSize: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
    color: '#1F2937',
    borderBottom: '2 solid #E5E7EB',
    paddingBottom: 10,
  },
  section: {
    marginBottom: 20,
    paddingBottom: 15,
    borderBottom: '1 solid #E5E7EB',
    breakInside: 'avoid',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#1F2937',
    backgroundColor: '#F3F4F6',
    padding: 8,
    borderRadius: 4,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'center',
  },
  label: {
    width: '30%',
    fontWeight: 'bold',
    color: '#4B5563',
  },
  value: {
    flex: 1,
    color: '#1F2937',
  },
  card: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    marginBottom: 10,
    borderRadius: 4,
    borderLeft: '3 solid #3B82F6',
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#2563EB',
  },
  cardContent: {
    color: '#4B5563',
  },
  table: {
    width: '100%',
    marginVertical: 10,
  },
  tableHeader: {
    backgroundColor: '#F3F4F6',
    flexDirection: 'row',
    borderBottomColor: '#E5E7EB',
    borderBottomWidth: 1,
    paddingVertical: 8,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomColor: '#E5E7EB',
    borderBottomWidth: 1,
    paddingVertical: 8,
    minHeight: 35,
  },
  tableCell: {
    flex: 1,
    textAlign: 'left',
    paddingHorizontal: 8,
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
    borderRadius: 4,
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
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 8,
    textAlign: 'center',
    color: '#6B7280',
    borderTop: '1 solid #E5E7EB',
    paddingTop: 10,
  },
  imageContainer: {
    marginVertical: 10,
    alignItems: 'center',
  },
  vehicleImage: {
    width: 300,
    height: 200,
    objectFit: 'contain',
  },
  infoCard: {
    backgroundColor: '#F3F4F6',
    padding: 15,
    marginBottom: 15,
    borderRadius: 4,
    breakInside: 'avoid',
  },
  infoCardTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1F2937',
  },
  infoCardContent: {
    color: '#4B5563',
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  gridItem: {
    width: '50%',
    paddingHorizontal: 8,
    marginBottom: 15,
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
  flexRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
  // Pagination styles
  pageNumber: {
    position: 'absolute',
    fontSize: 8,
    bottom: 20,
    left: 0,
    right: 0,
    textAlign: 'center',
    color: '#6B7280',
  },
  // Table pagination
  tableContainer: {
    marginBottom: 20,
    breakInside: 'avoid',
  },
  // Section break control
  sectionBreak: {
    breakInside: 'avoid',
    pageBreakInside: 'avoid',
  },
  // Keep elements together
  keepTogether: {
    breakInside: 'avoid',
  },
});