// src/components/pdf/documents/ClaimBulkDocument.tsx

import React from 'react'
import { Document, Page, Text, View, Image } from '@react-pdf/renderer'
import { Claim } from '../../../types'
import { CompanyDetails } from '../../../types/company'
import { styles } from '../styles'
import { format } from 'date-fns'
import { formatDate } from '../../../utils/dateHelpers'
import aieClaimsLogo from '../../../assets/aieclaim.png';

interface ClaimBulkDocumentProps {
  records: Claim[]
  companyDetails: any;
  title?: string
}

const ITEMS_FIRST_PAGE = 7
const ITEMS_PER_PAGE   = 10

const ClaimBulkDocument: React.FC<ClaimBulkDocumentProps> = ({
  records,
  companyDetails,
  title = 'Claims Summary',
}) => {

  const headerDetails = {
    logoUrl: aieClaimsLogo,
    fullName: 'AIE Claims LTD',
    officialAddress: 'United House, 39-41 North Road, London, N7 9DP.',
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
             <View style={styles.header}>
              <Image src={headerDetails.logoUrl} style={styles.logo} />
              <View style={styles.companyInfo}>
                <Text style={styles.companyName}>{headerDetails.fullName}</Text>
                <Text style={styles.companyDetail}>{headerDetails.officialAddress}</Text>
                <Text style={styles.companyDetail}>Phone: {headerDetails.phone}</Text>
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
                AIE Claims Ltd. Registered in England and Wales with company registration number: 15616639
              </Text>
              <Text style={styles.footerText}>
                Registered office address: United House, 39-41 North Road, London, N7 9DP
              </Text>
            </View>

            {/* PAGE NUMBER */}
            <Text style={styles.pageNumber}>
              Page {pageIndex + 1} of {pageCount}
            </Text>
          </Page>
        )
      })}
    </Document>
  )
}

export default ClaimBulkDocument
