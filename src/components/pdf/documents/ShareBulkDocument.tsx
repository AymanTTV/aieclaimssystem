// src/components/pdf/documents/ShareBulkDocument.tsx
import React from 'react'
import { Document, Page, Text, View, Image } from '@react-pdf/renderer'
import { ShareEntry, SplitRecord, Recipient } from '../../../types/share'
import { styles } from '../styles' // Assuming 'styles.ts' contains the shared styles

import { format } from 'date-fns'

import { formatDate } from '../../../utils/dateHelpers'

interface ShareBulkDocumentProps {
  records: ShareEntry[]
  companyDetails: {
    logoUrl: string
    fullName: string
    officialAddress: string // This will be split
    phone: string
    email: string
    // we’re “injecting” splits here:
    splits?: SplitRecord[]
  }
  title?: string
}

const ITEMS_FIRST_PAGE = 7
const ITEMS_PER_PAGE   = 10

const ShareBulkDocument: React.FC<ShareBulkDocumentProps> = ({
  records,
  companyDetails,
  title = 'Share Records Summary',
}) => {
  // grab splits from the companyDetails object
  const splits = companyDetails.splits || []

  // 1) Totals
  const totalIncome = records
    .filter(r => r.type === 'income')
    .reduce((s,r) => s + (r as any).amount, 0)
  const totalExpense = records
    .filter(r => r.type === 'expense')
    .reduce((s,r) => s + (r as any).totalCost, 0)

  // 2) Aggregate recipients
  const recipientMap: Record<string, { percentage:number, amount:number }> = {}
  splits.forEach(sp =>
    sp.recipients.forEach(r => {
      if (!recipientMap[r.name]) recipientMap[r.name] = { percentage:0, amount:0 }
      recipientMap[r.name].percentage += r.percentage
      recipientMap[r.name].amount     += r.amount
    })
  )
  const sharedTotal = Object.values(recipientMap).reduce((s,x) => s + x.amount, 0)
  const balance     = totalIncome - totalExpense - sharedTotal

  // paging
  const remainder  = Math.max(0, records.length - ITEMS_FIRST_PAGE)
  const otherPages = Math.ceil(remainder / ITEMS_PER_PAGE)
  const pageCount  = 1 + otherPages
  const getSlice   = (page:number) =>
    page === 0
      ? records.slice(0, ITEMS_FIRST_PAGE)
      : records.slice(ITEMS_FIRST_PAGE + (page-1)*ITEMS_PER_PAGE, ITEMS_FIRST_PAGE + (page)*ITEMS_PER_PAGE)

  // Derive header details from companyDetails, splitting the address
  // Note: VehicleDocument uses companyDetails.officialAddress directly, no split required for that header.
  // I will mimic VehicleDocument's header, which uses officialAddress directly.
  const officialAddress = companyDetails?.officialAddress || 'N/A';

  return (
    <Document>
      {Array.from({length:pageCount}).map((_, pageIndex) => {
        const slice = getSlice(pageIndex)
        return (
          <Page key={pageIndex} size="A4" style={styles.page}>
            {/* HEADER - Updated to match VehicleDocument.tsx and global styles.ts */}
            <View style={styles.header} fixed>
              <View style={styles.headerLeft}>
                {companyDetails?.logoUrl && (
                  <Image src={companyDetails.logoUrl} style={styles.logo} />
                )}
              </View>
              <View style={styles.headerRight}>
                <Text style={styles.companyName}>{companyDetails?.fullName || 'AIE Skyline Limited'}</Text>
                <Text style={styles.companyDetail}>{officialAddress}</Text> {/* Using officialAddress directly */}
                <Text style={styles.companyDetail}>Tel: {companyDetails?.phone || 'N/A'}</Text>
                <Text style={styles.companyDetail}>Email: {companyDetails?.email || 'N/A'}</Text>
              </View>
            </View>

            {/* FIRST PAGE ONLY: TITLE + OVERVIEW CARDS */}
            {pageIndex === 0 && (
              <>
                <View style={styles.titleContainer}>
                  <Text style={styles.title}>{title}</Text>
                </View>
                <View style={{flexDirection:'row',justifyContent:'space-between',marginBottom:16}}>
                  {/* Income */}
                  <View style={[styles.infoCard,{borderLeftColor:'#059669',borderLeftWidth:4,width:'23%'}]}>
                    <Text style={styles.infoCardTitle}>Income</Text>
                    <Text style={[styles.value,{fontSize:16,fontWeight:'bold'}]}>
                      £{totalIncome.toFixed(2)}
                    </Text>
                  </View>
                  {/* Expense */}
                  <View style={[styles.infoCard,{borderLeftColor:'#DC2626',borderLeftWidth:4,width:'23%'}]}>
                    <Text style={styles.infoCardTitle}>Expense</Text>
                    <Text style={[styles.value,{fontSize:16,fontWeight:'bold'}]}>
                      £{totalExpense.toFixed(2)}
                    </Text>
                  </View>
                  {/* Shared breakdown - Adjusting width and display for readability */}
                  <View style={[styles.infoCard,{borderLeftColor:'#3B82F6',borderLeftWidth:4,width:'28%'}]}> {/* Increased width for shared card */}
                    <Text style={styles.infoCardTitle}>Shared</Text>
                    <View> {/* Wrapper for recipients to ensure column layout */}
                      {Object.entries(recipientMap).map(([name,{percentage,amount}])=>(
                        <View key={name} style={{marginBottom: 2, flexDirection: 'row', justifyContent: 'space-between'}}>
                          <Text style={[styles.value, {fontSize: 9, flexShrink: 1, flexBasis: '70%'}]}>
                            {name} ({percentage.toFixed(1)}%)
                          </Text>
                          <Text style={[styles.value, {fontSize: 9, flexShrink: 0, flexBasis: '30%', textAlign: 'right'}]}>
                            £{amount.toFixed(2)}
                          </Text>
                        </View>
                      ))}
                    </View>
                    <Text style={[styles.value,{marginTop:4,fontWeight:'bold', fontSize: 10}]}> {/* Adjusted font size for total */}
                      Total: £{sharedTotal.toFixed(2)}
                    </Text>
                  </View>
                  {/* Balance */}
                  <View style={[styles.infoCard,{borderLeftColor:'#059669',borderLeftWidth:4,width:'20%'}]}> {/* Adjusted width slightly */}
                    <Text style={styles.infoCardTitle}>Balance</Text>
                    <Text style={[styles.value,{fontSize:16,fontWeight:'bold'}]}>
                      £{balance.toFixed(2)}
                    </Text>
                  </View>
                </View>
              </>
            )}

            {/* TABLE HEADER */}
            <View style={styles.tableHeader} wrap={false}>
              <Text style={[styles.tableHeaderCell,{width:'15%'}]}>Date</Text>
              <Text style={[styles.tableHeaderCell,{width:'20%'}]}>Client</Text>
              <Text style={[styles.tableHeaderCell,{width:'15%'}]}>Ref</Text>
              <Text style={[styles.tableHeaderCell,{width:'15%'}]}>Type</Text>
              <Text style={[styles.tableHeaderCell,{width:'15%'}]}>Amount</Text>
              <Text style={[styles.tableHeaderCell,{width:'20%'}]}>Progress</Text>
            </View>

            {/* ROWS */}
            {slice.map((rec, i) => (
              <View key={i} style={styles.tableRow}>
                <Text style={[styles.tableCell,{width:'15%'}]}>{formatDate(rec.date)}</Text>
                <Text style={[styles.tableCell,{width:'20%'}]}>{rec.clientName}</Text>
                <Text style={[styles.tableCell,{width:'15%'}]}>{rec.claimRef}</Text>
                <Text style={[styles.tableCell,{width:'15%'}]}>{rec.type}</Text>
                <Text style={[styles.tableCell,{width:'15%'}]}>
                  £{(rec.type==='income' ? (rec as any).amount : (rec as any).totalCost).toFixed(2)}
                </Text>
                <Text style={[styles.tableCell,{width:'20%'}]}>{rec.progress}</Text>
              </View>
            ))}

            {/* FOOTER - Updated to match VehicleDocument.tsx and global styles.ts */}
            <View style={styles.footer} fixed>
              <Text style={styles.footerText}>
                AIE SKYLINE LIMITED, registered in England and Wales with the company registration number 15616639, registered office address: United House, 39-41 North Road, London, N7 9DP. VAT. NO. 453448875
              </Text>
              <Text
                // The pageNumber style is removed from here as it's not a separate style,
                // but rather part of the Text component's render prop within the flex container.
                render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
              />
            </View>
          </Page>
        )
      })}
    </Document>
  )
}

export default ShareBulkDocument