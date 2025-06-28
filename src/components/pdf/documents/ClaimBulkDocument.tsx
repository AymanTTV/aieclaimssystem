// src/components/pdf/documents/ClaimBulkDocument.tsx

import React from 'react'
import { Document, Page, Text, View, Image } from '@react-pdf/renderer'
import { Claim } from '../../../types'
// import { CompanyDetails } from '../../../types/company' // Not directly used, can be removed
import { styles } from '../styles'
import { format } from 'date-fns' // Used for formatDate, keeping
import { formatDate } from '../../../utils/dateHelpers'
import aieClaimsLogo from '../../../assets/aieclaim.png';

interface ClaimBulkDocumentProps {
  records: Claim[]
  companyDetails: any; // Keeping any as per original
  title?: string
}

const ITEMS_FIRST_PAGE = 7
const ITEMS_PER_PAGE   = 10

const ClaimBulkDocument: React.FC<ClaimBulkDocumentProps> = ({
  records,
  companyDetails, // Not directly used in header/footer, but keeping for compatibility
  title = 'Claims Summary',
}) => {

  const headerDetails = {
    logoUrl: aieClaimsLogo,
    fullName: 'AIE Claims LTD',
    addressLine1: 'United House, 39-41 North Road,', // Broken down
    addressLine2: 'London, N7 9DP.', // Broken down, added period for consistency
    phone: '+442080505337',
    email: 'claims@aieclaims.co.uk',
  };

  // paging
  const remainder  = Math.max(0, records.length - ITEMS_FIRST_PAGE)
  const otherPages = Math.ceil(remainder / ITEMS_PER_PAGE)
  const pageCount  = 1 + otherPages
  const getSlice   = (page: number) =>
    page === 0
      ? records.slice(0, ITEMS_FIRST_PAGE)
      : records.slice(
          ITEMS_FIRST_PAGE + (page - 1) * ITEMS_PER_PAGE,
          ITEMS_FIRST_PAGE + page * ITEMS_PER_PAGE
        )

  return (
    <Document>
      {Array.from({ length: pageCount }).map((_, pageIndex) => {
        const slice = getSlice(pageIndex)
        return (
          <Page key={pageIndex} size="A4" style={styles.page}>
            {/* HEADER */}
             <View style={styles.header} fixed>
              <View style={styles.headerLeft}>
                <Image src={headerDetails.logoUrl} style={styles.logo} />
              </View>
              <View style={styles.headerRight}>
                <Text style={styles.companyName}>{headerDetails.fullName}</Text>
                {/* Displaying address on separate lines */}
                <Text style={styles.companyDetail}>{headerDetails.addressLine1}</Text>
                <Text style={styles.companyDetail}>{headerDetails.addressLine2}</Text>
                <Text style={styles.companyDetail}>Tel: {headerDetails.phone}</Text>
                <Text style={styles.companyDetail}>Email: {headerDetails.email}</Text>
              </View>
            </View>

            {/* FIRST PAGE ONLY: TITLE */}
            {pageIndex === 0 && (
              <View style={styles.titleContainer}>
                <Text style={styles.title}>{title}</Text>
              </View>
            )}

            {/* TABLE HEADER */}
            <View style={styles.tableHeader} wrap={false}>
              <Text style={[styles.tableHeaderCell, { width: '12%' }]}>Date</Text>
              <Text style={[styles.tableHeaderCell, { width: '20%' }]}>Client</Text>
              <Text style={[styles.tableHeaderCell, { width: '12%' }]}>Ref</Text>
              <Text style={[styles.tableHeaderCell, { width: '12%' }]}>Type</Text>
              <Text style={[styles.tableHeaderCell, { width: '12%' }]}>Reason</Text>
              <Text style={[styles.tableHeaderCell, { width: '12%' }]}>Progress</Text>
              <Text style={[styles.tableHeaderCell, { width: '20%' }]}>Vehicle</Text>
            </View>

            {/* ROWS */}
            {slice.map((claim, i) => (
              <View key={i} style={styles.tableRow}>
                <Text style={[styles.tableCell, { width: '12%' }]}>
                  {formatDate(claim.incidentDetails.date)}
                </Text>
                <Text style={[styles.tableCell, { width: '20%' }]}>
                  {claim.clientInfo.name}
                </Text>
                <Text style={[styles.tableCell, { width: '12%' }]}>
                  {claim.clientRef || '–'}
                </Text>
                <Text style={[styles.tableCell, { width: '12%' }]}>
                  {claim.claimType}
                </Text>
                <Text style={[styles.tableCell, { width: '12%' }]}>
                  {Array.isArray(claim.claimReason)
                    ? claim.claimReason.join(', ')
                    : claim.claimReason}
                </Text>
                <Text style={[styles.tableCell, { width: '12%' }]}>
                  {claim.progress}
                </Text>
                <Text style={[styles.tableCell, { width: '20%' }]}>
                  {claim.clientVehicle.registration}
                </Text>
              </View>
            ))}

            {/* FOOTER */}
            <View style={styles.footer} fixed>
              <Text style={styles.footerText}>
                AIE Claims Ltd. Registered in England and Wales with company registration number: 15616639, Registered office address: United House, 39-41 North Road, London, N7 9DP
              </Text>
              {/* Page number positioned on the right */}
              <Text
                style={styles.pageNumber}
                render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
              />
            </View>
          </Page>
        )
      })}
    </Document>
  )
}

export default ClaimBulkDocument
