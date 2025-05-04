import { StyleSheet } from '@react-pdf/renderer';

export const styles = StyleSheet.create({
  // --- Modified/New Page & Layout Styles ---
  page: {
    paddingTop: 35, // Modified
    paddingBottom: 65, // Modified (more space for footer)
    paddingHorizontal: 40, // Original
    fontSize: 10, // Original
    fontFamily: 'Helvetica', // Original
    backgroundColor: '#FFFFFF', // Original
    lineHeight: 1.4, // New (improves text readability)
  },
  header: {
    flexDirection: 'row', // Original
    justifyContent: 'space-between', // Original
    marginBottom: 20, // Modified (was 30)
    borderBottomWidth: 1, // Modified (was 2)
    borderBottomColor: '#E5E7EB', // Original
    paddingBottom: 15, // Modified (was 20)
  },
  headerLeft: { // New (for structure)
    flex: 1,
  },
  headerRight: { // New (for structure)
    flex: 2,
    textAlign: 'right',
  },
  logo: {
    width: 100, // Modified (was 120)
    height: 'auto', // Original
    objectFit: 'contain', // New (ensures aspect ratio)
  },
  companyName: { // New/Modified (extracted from original inline use maybe)
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#111827', // Darker text
  },
  companyDetail: { // New/Modified (extracted)
    fontSize: 9,
    color: '#4B5563',
    marginBottom: 2,
  },
  companyInfo: { // Original (Potentially unused in VehicleDoc, maybe used elsewhere)
    textAlign: 'right',
    fontSize: 10,
  },
  titleContainer: { // New (Wrapper for title)
     borderBottomWidth: 2,
     borderBottomColor: '#3B82F6', // Accent color
     marginBottom: 20, // Was 30 on title itself
     paddingBottom: 5,
  },
  title: {
    fontSize: 18, // Modified (was 24)
    fontWeight: 'bold', // Original
    textAlign: 'center', // Original
    color: '#1F2937', // Original
    // Removed margin/border/padding here, moved to titleContainer
  },
  section: { // Modified (less properties, applied more specifically now)
    marginBottom: 15, // Was 20
    // Removed breakInside, paddingBottom, borderBottom - use sectionBreak for those
  },
  sectionBreak: { // New/Refined style for sections needing break control & border
    paddingBottom: 15, // Original section padding
    borderBottomWidth: 1, // Original section border
    borderBottomColor: '#E5E7EB', // Original section border color
    breakInside: 'avoid', // Original (from old styles too)
    pageBreakInside: 'avoid', // New explicit property
    marginBottom: 20, // Ensure space after breakable sections
  },
  sectionTitle: { // Modified
    fontSize: 14, // Original
    fontWeight: 'bold', // Original
    marginBottom: 10, // Original
    color: '#1F2937', // Original
    backgroundColor: '#F3F4F6', // Original
    paddingVertical: 6, // Modified (was 8)
    paddingHorizontal: 10, // Modified (was 8)
    borderRadius: 4, // Original
    borderLeftWidth: 3, // New accent line
    borderLeftColor: '#3B82F6', // New accent color
  },
  // --- Vehicle Info Card Styles (Refined) ---
  infoCard: { // Modified (was also a section, now more specific)
    backgroundColor: '#F9FAFB', // Lighter background than section titles (was F3F4F6)
    padding: 15, // Original padding
    marginBottom: 20, // Increased margin below card (was 15)
    borderRadius: 6, // Original
    borderWidth: 1, // Add a subtle border (New)
    borderColor: '#E5E7EB', // New
    // Removed boxShadow from original infoCard
    // borderLeft applied inline in component
  },
  infoCardTitle: { // Modified
    fontSize: 13, // Was 12
    fontWeight: 'bold', // Original
    marginBottom: 12, // Increased (was 8)
    color: '#1F2937', // Original
  },
   // Styles used within Info Card's table structure
  tableCol: { // New specific style
      flex: 1,
      paddingRight: 10,
  },
  flexRow: { // Original (but now used specifically here)
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4, // New spacing
  },
  label: { // Modified/Refined (was generic, now specific usage context)
    fontWeight: 'bold', // Original
    color: '#4B5563', // Original
    marginRight: 5, // New spacing
    fontSize: 10, // Original page font size
    // Removed width: '30%' from original generic label
  },
  value: { // Modified/Refined (was generic)
    color: '#1F2937', // Original
    flexShrink: 1, // Allow text to wrap (New)
    fontSize: 10, // Original page font size
    // Removed flex: 1 from original generic value
  },

  // --- General Table Styles (Modified/Refined) ---
  table: { // Original
    width: '100%',
    marginVertical: 5, // Modified (was 10)
  },
  tableHeader: { // Modified
    backgroundColor: '#E5E7EB', // Slightly darker (was F3F4F6)
    flexDirection: 'row', // Original
    borderBottomColor: '#D1D5DB', // Darker (was E5E7EB)
    borderBottomWidth: 1, // Original
    paddingVertical: 8, // Modified (was 8, confirmed increase)
    paddingHorizontal: 5, // New horizontal padding
  },
  tableHeaderCell: { // New specific style for header text
      flex: 1,
      textAlign: 'left',
      paddingHorizontal: 5,
      fontWeight: 'bold',
      fontSize: 9.5,
  },
  tableRow: { // Modified
    flexDirection: 'row', // Original
    borderBottomColor: '#F3F4F6', // Lighter separator (was E5E7EB)
    borderBottomWidth: 1, // Original
    paddingVertical: 7, // Modified (was 8)
    minHeight: 30, // Modified (was 35)
    alignItems: 'center', // New vertical alignment
  },
  tableCell: { // Modified
    flex: 1, // Original
    textAlign: 'left', // Original
    paddingHorizontal: 8, // Original
    fontSize: 10, // Match base page size
    color: '#374151', // Standard text color (New)
  },
  expiredText: { // New style for expired dates
     color: '#DC2626',
     fontWeight: 'bold',
  },

  // --- Styles for Sale Info section ---
  tableColHalf: { // New
      flex: 1,
      paddingHorizontal: 5,
   },
   subLabel: { // New
      fontSize: 9,
      color: '#6B7280',
      marginBottom: 2,
   },
   subValue: { // New
      fontSize: 10,
      fontWeight: 'bold',
      color: '#1F2937',
   },

   // --- Owner Info Card Styles ---
   card: { // Original (kept definition, refined usage context)
    backgroundColor: '#F9FAFB',
    padding: 12,
    marginBottom: 10, // Added margin
    borderRadius: 6,
    borderLeftWidth: 3, // Modified (was borderLeft: '3 solid #3B82F6')
    borderLeftColor: '#3B82F6',
    // Removed shadow properties from original card
  },
  cardTitle: { // Original (kept definition)
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8, // Increased from 5
    color: '#1E40AF', // Darker blue (was #2563EB)
  },
  cardContent: { // Original (kept definition)
    fontSize: 10, // Added explicit size
    color: '#374151', // Darker (was #4B5563)
  },

  // --- Image Styles ---
  imageContainer: { // Original
    marginVertical: 15, // Increased from 10
    alignItems: 'center', // Original
  },
  vehicleImage: { // Original (refined)
    maxWidth: 250, // Increased from 180 width
    maxHeight: 150, // Increased from 100 height
    objectFit: 'contain', // Original
  },
  grid: { // Original (refined)
    flexDirection: 'row', // Original
    flexWrap: 'wrap', // Original
    marginHorizontal: -5, // Modified (was -8, matching new padding)
  },
  gridItem: { // Original (refined)
    width: '33.33%', // Aim for 3 items per row (was 50%)
    padding: 5, // Padding around each grid item (new)
    marginBottom: 10, // Was 15
    breakInside: 'avoid', // New
  },
  documentImage: { // New/Refined style for grid images
     width: '100%',
     height: 120,
     objectFit: 'contain',
     marginBottom: 4,
     borderWidth: 1,
     borderColor: '#E5E7EB',
  },
  imageCaption: { // New/Refined style for grid image captions
     fontSize: 8,
     textAlign: 'center',
     color: '#6B7280',
  },

  // --- Footer Styles ---
  footer: { // Original (refined)
    position: 'absolute', // Original
    bottom: 30, // Original
    left: 40, // Original
    right: 40, // Original
    fontSize: 8, // Original
    textAlign: 'center', // Original
    color: '#6B7280', // Original
    borderTopWidth: 1, // Original (was '1 solid #E5E7EB')
    borderTopColor: '#E5E7EB', // Original
    paddingTop: 8, // Modified (was 10)
  },
  footerText: { // New style for footer lines
     marginBottom: 3,
  },
  pageNumber: { // Original (refined positioning)
    position: 'absolute', // Original
    fontSize: 8, // Original
    bottom: -15, // Position below footer line (was 20 from page bottom)
    left: 0, // Original
    right: 0, // Original
    textAlign: 'center', // Original
    color: '#6B7280', // Original
  },

  // --- Original styles that might be unused in VehicleDocument now, or used elsewhere ---
  // Keep these if other documents might use them, remove if obsolete
  row: { // Potentially Legacy (Replaced by flexRow or specific table rows)
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'center',
  },
  statusBadge: { // Original (Keep if used for status elsewhere)
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 5,
  },
  highlight: { // Original (Keep if used elsewhere)
    backgroundColor: '#FEF3C7',
    padding: 8,
    borderRadius: 4,
    marginBottom: 10,
  },
  highlightText: { // Original (Keep if used elsewhere)
    color: '#92400E',
    fontWeight: 'bold',
  },
  pageBreak: { // Original (Keep if used elsewhere for forced breaks)
    break: 'page',
    marginBottom: 20,
  },
  icon: { // Original (Keep if used elsewhere)
    width: 16,
    height: 16,
    marginRight: 5,
  },
  separator: { // Original (Keep if used elsewhere)
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 15,
  },
  warningText: { // Original (Keep if used elsewhere)
    color: '#DC2626',
    fontSize: 10,
    marginTop: 5,
  },
  successText: { // Original (Keep if used elsewhere)
    color: '#059669',
    fontSize: 10,
    marginTop: 5,
  },
  tableContainer: { // Original (Keep if used elsewhere)
    marginBottom: 20,
    breakInside: 'avoid',
  },
  keepTogether: { // Original (Keep if used elsewhere)
    breakInside: 'avoid',
  },
  softBorder: { // Original (Keep if used elsewhere)
    border: '1 solid #E5E7EB',
    borderRadius: 4,
    padding: 10,
  },
  cardShadow: { // Original (Keep if used elsewhere, removed from default card/infoCard)
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  
  infoCardContent: { // Original: Merged/replaced by general value/cardContent usage
    color: '#4B5563',
  },
  signatureSection: { // Original: Assumed unused in VehicleDocument
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    breakInside: 'avoid',
  },
  signatureBox: { // Original: Assumed unused in VehicleDocument
    width: '45%',
    padding: 10,
    backgroundColor: '#F9FAFB',
    borderRadius: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
  },
  signature: { // Original: Assumed unused in VehicleDocument
    width: '100%',
    height: 50,
    marginVertical: 10,
    objectFit: 'contain',
  },
  signatureLine: { // Original: Assumed unused in VehicleDocument
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    marginTop: 5,
    paddingTop: 5,
    textAlign: 'center',
    color: '#4B5563',
  },
  
});