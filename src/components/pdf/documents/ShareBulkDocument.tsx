// src/components/pdf/documents/ShareBulkDocument.tsx
import React from 'react'
import { Document, Page, Text, View, Image } from '@react-pdf/renderer'
import { ShareEntry, SplitRecord } from '../../../types/share'
import { styles } from '../styles' 

import { formatDate } from '../../../utils/dateHelpers'

interface ShareBulkDocumentProps {
  records: ShareEntry[]
  companyDetails: {
    logoUrl: string
    fullName: string
    officialAddress: string 
    phone: string
    email: string
    splits?: SplitRecord[]
  }
  title?: string
}

const ITEMS_FIRST_PAGE = 8
const ITEMS_PER_PAGE   = 12

const ShareBulkDocument: React.FC<ShareBulkDocumentProps> = ({
  records,
  companyDetails,
  title = 'Share Records Summary',
}) => {
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

  // Paging Logic
  const remainder  = Math.max(0, records.length - ITEMS_FIRST_PAGE)
  const otherPages = Math.ceil(remainder / ITEMS_PER_PAGE)
  const pageCount  = 1 + otherPages

  const getSlice   = (page:number) => {
    if (page === 0) {
        return records.slice(0, ITEMS_FIRST_PAGE)
    }
    const start = ITEMS_FIRST_PAGE + (page-1)*ITEMS_PER_PAGE
    const end = start + ITEMS_PER_PAGE
    return records.slice(start, end)
  }

  const officialAddress = companyDetails?.officialAddress || 'N/A';

  return (
    <Document>
      {Array.from({length:pageCount}).map((_, pageIndex) => {
        const slice = getSlice(pageIndex)
        return (
          <Page key={pageIndex} size="A4" style={styles.page} orientation="landscape">
            {/* HEADER - Fixed on all pages */}
            <View style={styles.header} fixed>
              <View style={styles.headerLeft}>
                {companyDetails?.logoUrl && (
                  <Image src={companyDetails.logoUrl} style={styles.logo} />
                )}
              </View>
              <View style={styles.headerRight}>
                <Text style={styles.companyName}>{companyDetails?.fullName || 'AIE Skyline Limited'}</Text>
                <Text style={styles.companyDetail}>{officialAddress}</Text>
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
                  {/* Shared */}
                  <View style={[styles.infoCard,{borderLeftColor:'#3B82F6',borderLeftWidth:4,width:'28%'}]}>
                    <Text style={styles.infoCardTitle}>Shared</Text>
                    <View>
                      {Object.entries(recipientMap).map(([name,{percentage,amount}])=>(
                        <View key={name} style={{marginBottom: 2, flexDirection: 'row', justifyContent: 'space-between'}}>
                          <Text style={[styles.value, {fontSize: 9, flexShrink: 1}]}>
                            {name}
                          </Text>
                          <Text style={[styles.value, {fontSize: 9}]}>
                            £{amount.toFixed(2)}
                          </Text>
                        </View>
                      ))}
                    </View>
                    <Text style={[styles.value,{marginTop:4,fontWeight:'bold', fontSize: 10}]}>
                      Total: £{sharedTotal.toFixed(2)}
                    </Text>
                  </View>
                  {/* Balance */}
                  <View style={[styles.infoCard,{borderLeftColor:'#059669',borderLeftWidth:4,width:'20%'}]}>
                    <Text style={styles.infoCardTitle}>Balance</Text>
                    <Text style={[styles.value,{fontSize:16,fontWeight:'bold'}]}>
                      £{balance.toFixed(2)}
                    </Text>
                  </View>
                </View>
              </>
            )}

            {/* TABLE HEADER - Rendered explicitly on every page loop */}
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell,{width:'12%'}]}>Date</Text>
              <Text style={[styles.tableHeaderCell,{width:'18%'}]}>Client</Text>
              <Text style={[styles.tableHeaderCell,{width:'15%'}]}>Vehicle</Text>
              <Text style={[styles.tableHeaderCell,{width:'12%'}]}>Ref</Text>
              <Text style={[styles.tableHeaderCell,{width:'10%'}]}>Type</Text>
              <Text style={[styles.tableHeaderCell,{width:'13%'}]}>Amount</Text>
              <Text style={[styles.tableHeaderCell,{width:'10%'}]}>Stat</Text>
              <Text style={[styles.tableHeaderCell,{width:'10%'}]}>User</Text>
            </View>

            {/* ROWS - wrap={false} is critical here to prevent cell splitting */}
            {slice.map((rec, i) => (
              <View key={i} style={styles.tableRow} wrap={false}>
                <Text style={[styles.tableCell,{width:'12%'}]}>{formatDate(rec.date)}</Text>
                <Text style={[styles.tableCell,{width:'18%'}]}>{rec.clientName}</Text>
                <Text style={[styles.tableCell,{width:'15%', fontSize: 8}]}>
                    {rec.vehicleName ? rec.vehicleName.split('(')[0] : '-'}
                </Text>
                <Text style={[styles.tableCell,{width:'12%'}]}>{rec.claimRef}</Text>
                <Text style={[styles.tableCell,{width:'10%'}]}>{rec.type}</Text>
                <Text style={[styles.tableCell,{width:'13%'}]}>
                  £{(rec.type==='income' ? (rec as any).amount : (rec as any).totalCost).toFixed(2)}
                </Text>
                <Text style={[styles.tableCell,{width:'10%', fontSize: 8}]}>{rec.progress}</Text>
                <Text style={[styles.tableCell,{width:'10%', fontSize: 8}]}>
                   -
                </Text>
              </View>
            ))}

            {/* FOOTER - Fixed at bottom */}
            <View style={styles.footer} fixed>
              <Text style={styles.footerText}>
                AIE SKYLINE LIMITED, registered in England and Wales with the company registration number 15616639, registered office address: United House, 39-41 North Road, London, N7 9DP. VAT. NO. 453448875
              </Text>
              <Text
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