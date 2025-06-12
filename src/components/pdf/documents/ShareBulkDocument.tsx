// src/components/pdf/documents/ShareBulkDocument.tsx
import React from 'react'
import { Document, Page, Text, View, Image } from '@react-pdf/renderer'
import { ShareEntry, SplitRecord, Recipient } from '../../../types/share'
import { styles } from '../styles'
import { format } from 'date-fns'
import { formatDate } from '../../../utils/dateHelpers'

interface ShareBulkDocumentProps {
  records: ShareEntry[]
  companyDetails: {
    logoUrl: string
    fullName: string
    officialAddress: string
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

  return (
    <Document>
      {Array.from({length:pageCount}).map((_, pageIndex) => {
        const slice = getSlice(pageIndex)
        return (
          <Page key={pageIndex} size="A4" style={styles.page}>
            {/* HEADER */}
            <View style={styles.header}>
              <Image src={companyDetails.logoUrl} style={styles.logo}/>
              <View style={styles.companyInfo}>
                <Text style={styles.companyName}>{companyDetails.fullName}</Text>
                <Text style={styles.companyDetail}>{companyDetails.officialAddress}</Text>
                <Text style={styles.companyDetail}>Tel: {companyDetails.phone}</Text>
                <Text style={styles.companyDetail}>Email: {companyDetails.email}</Text>
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
                  {/* Shared breakdown */}
                  <View style={[styles.infoCard,{borderLeftColor:'#3B82F6',borderLeftWidth:4,width:'23%'}]}>
                    <Text style={styles.infoCardTitle}>Shared</Text>
                    {Object.entries(recipientMap).map(([name,{percentage,amount}])=>(
                      <Text key={name} style={styles.value}>
                        {name} ({percentage.toFixed(1)}%) = £{amount.toFixed(2)}
                      </Text>
                    ))}
                    <Text style={[styles.value,{marginTop:4,fontWeight:'bold'}]}>
                      Total: £{sharedTotal.toFixed(2)}
                    </Text>
                  </View>
                  {/* Balance */}
                  <View style={[styles.infoCard,{borderLeftColor:'#059669',borderLeftWidth:4,width:'23%'}]}>
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

            {/* FOOTER */}
            <View style={styles.footer} fixed>
              <Text style={styles.footerText}>
                AIE Skyline Limited | Registered in England and Wales | Company No: 12592207
              </Text>
              <Text style={styles.footerText}>
                Generated on {format(new Date(),'dd/MM/yyyy HH:mm')}
              </Text>
            </View>

            {/* PAGE NUMBER */}
            <Text style={styles.pageNumber}>
              Page {pageIndex+1} of {pageCount}
            </Text>
          </Page>
        )
      })}
    </Document>
  )
}

export default ShareBulkDocument
