// src/components/pdf/documents/FinanceDocument.tsx
import React from 'react';
import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
  Image,
} from '@react-pdf/renderer';
import { Transaction, Vehicle, Account } from '../../../types';
import { format } from 'date-fns';
import { styles as globalStyles } from '../styles';

interface FinanceDocumentProps {
  data:
    | Transaction
    | Transaction[]
    | { transactions: Transaction[] };
  vehicles?: Vehicle[];
  accounts?: Account[]; // Added to resolve account names
  companyDetails: {
    logoUrl?: string;
    fullName?: string;
    phone?: string;
    email?: string;
  };
}

const localStyles = StyleSheet.create({
  // Layout helpers
  rowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  colHalf: {
    width: '48%',
  },
  
  // Card styling extending global card
  detailsCard: {
    ...globalStyles.card,
    minHeight: 80,
  },
  
  // Specific text styles
  label: {
    fontSize: 9,
    color: '#6B7280',
    marginBottom: 2,
    fontWeight: 'bold',
  },
  value: {
    fontSize: 10,
    color: '#111827',
    marginBottom: 6,
  },
  
  // Account flow specific
  accountSection: {
    marginBottom: 8,
  },
  accountHeader: {
    fontSize: 9,
    fontWeight: 'bold',
    marginBottom: 2,
    textDecoration: 'underline',
  },
  
  // Table styles
  tableRow: {
    ...globalStyles.tableRow,
    minHeight: 24,
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    borderBottomStyle: 'solid',
    alignItems: 'center',
  },
  tableCell: {
    ...globalStyles.tableCell,
    padding: 6,
    textAlign: 'left',
    fontSize: 9,
  },
  tableHeader: {
    ...globalStyles.tableHeader,
    backgroundColor: '#F3F4F6',
    color: '#374151', // Override global white text for this specific table if needed
    fontWeight: 'bold',
  },

  // Description box at bottom
  descriptionBox: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#F9FAFB',
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#9CA3AF',
  },
  descriptionTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 4,
  },
  descriptionText: {
    fontSize: 10,
    color: '#4B5563',
    lineHeight: 1.4,
  },

  // Utilities
  positive: { color: '#10B981' },
  negative: { color: '#EF4444' },
  transactionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#111827',
    textAlign: 'center',
  },
  
  // Summary card for Bulk view
  summaryCard: {
    ...globalStyles.card,
    marginBottom: 10,
    padding: 10,
    backgroundColor: '#F9FAFB',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  summaryLabel: {
    fontSize: 10,
    color: '#4B5563',
  },
  summaryValue: {
    fontSize: 10,
    fontWeight: 'bold',
  },
});

const FinanceDocument: React.FC<FinanceDocumentProps> = ({
  data,
  vehicles = [],
  accounts = [],
  companyDetails,
}) => {
  // normalize transactions array
  let transactions: Transaction[];
  if (Array.isArray(data)) {
    transactions = data;
  } else if ('transactions' in data) {
    transactions = data.transactions;
  } else {
    transactions = [data as Transaction];
  }

  // summary calculations for bulk
  const totalIncome = transactions
    .filter((tx) => tx.type === 'income')
    .reduce((sum, tx) => sum + (tx.amount ?? 0), 0);
  const totalExpenses = transactions
    .filter((tx) => tx.type === 'expense')
    .reduce((sum, tx) => sum + (tx.amount ?? 0), 0);
  const netIncome = totalIncome - totalExpenses;
  const profitMargin = totalIncome > 0 ? (netIncome / totalIncome) * 100 : 0;

  const formatCurrency = (amt: number) => `£${amt.toFixed(2)}`;
  const formatDate = (d?: Date | string) =>
    d ? format(new Date(d), 'dd/MM/yyyy') : 'N/A';

  // lookup registration
  const getReg = (tx: Transaction) => {
    if (tx.vehicleId) {
      const v = vehicles.find((v) => v.id === tx.vehicleId);
      return v?.registrationNumber || tx.vehicleName || 'N/A';
    }
    return tx.vehicleName || 'N/A';
  };

  // Helper to resolve account IDs to Names
  const getAccountNames = (ids?: string[]) => {
    if (!ids || ids.length === 0) return 'Unassigned';
    return ids
      .map((id) => {
        const acc = accounts.find((a) => a.id === id);
        return acc ? acc.name : 'Unknown Account';
      })
      .join(', ');
  };

  const Header = () => (
    <View style={globalStyles.header} fixed>
      <View style={globalStyles.headerLeft}>
        {companyDetails.logoUrl && (
          <Image src={companyDetails.logoUrl} style={globalStyles.logo} />
        )}
      </View>
      <View style={globalStyles.headerRight}>
        <Text style={globalStyles.companyName}>
          {companyDetails.fullName || 'AIE Skyline Limited'}
        </Text>
        <Text style={globalStyles.companyDetail}>
          United House, 39-41 North Road,
        </Text>
        <Text style={globalStyles.companyDetail}>London, N7 9DP</Text>
        <Text style={globalStyles.companyDetail}>
          Tel: {companyDetails.phone || 'N/A'}
        </Text>
        <Text style={globalStyles.companyDetail}>
          Email: {companyDetails.email || 'N/A'}
        </Text>
      </View>
    </View>
  );

  // single-transaction page
  const renderSingle = () => {
    const tx = transactions[0];
    
    return (
      <Page size="A4" style={globalStyles.page}>
        <Header />
        <Text style={localStyles.transactionTitle}>
          Transaction Details
        </Text>

        {/* Top Section: Side-by-Side Cards */}
        <View style={localStyles.rowContainer}>
          
          {/* LEFT: General Info */}
          <View style={localStyles.colHalf}>
            <View style={localStyles.detailsCard}>
              <Text style={{...globalStyles.cardTitle, marginBottom: 10}}>General Info</Text>
              
              <Text style={localStyles.label}>Customer:</Text>
              <Text style={localStyles.value}>{tx.customerName || 'N/A'}</Text>
              
              <Text style={localStyles.label}>Vehicle:</Text>
              <Text style={localStyles.value}>{getReg(tx)}</Text>
              
              <Text style={localStyles.label}>Category:</Text>
              <Text style={localStyles.value}>{tx.category}</Text>
              
              <Text style={localStyles.label}>Date:</Text>
              <Text style={localStyles.value}>{formatDate(tx.date)}</Text>
            </View>
          </View>

          {/* RIGHT: Account / Fund Flow */}
          <View style={localStyles.colHalf}>
            <View style={localStyles.detailsCard}>
              <Text style={{...globalStyles.cardTitle, marginBottom: 10}}>Fund Flow</Text>

              {/* Money Entering (Credit) */}
              <View style={localStyles.accountSection}>
                 <Text style={{...localStyles.accountHeader, color: '#059669'}}>
                   Money In (Credit)
                 </Text>
                 <Text style={localStyles.value}>
                   {tx.accountsTo && tx.accountsTo.length > 0 
                     ? getAccountNames(tx.accountsTo) 
                     : '-'}
                 </Text>
              </View>

              {/* Money Leaving (Debit) */}
              <View style={localStyles.accountSection}>
                 <Text style={{...localStyles.accountHeader, color: '#DC2626'}}>
                   Money Out (Debit)
                 </Text>
                 <Text style={localStyles.value}>
                   {tx.accountsFrom && tx.accountsFrom.length > 0 
                     ? getAccountNames(tx.accountsFrom) 
                     : '-'}
                 </Text>
              </View>

              <Text style={localStyles.label}>Txn Type:</Text>
              <Text style={{...localStyles.value, textTransform: 'capitalize'}}>
                {tx.type}
              </Text>
            </View>
          </View>

        </View>

        {/* Middle Section: Amount Table */}
        <View style={globalStyles.section}>
          <Text style={globalStyles.sectionTitle}>Payment Details</Text>
          <View style={{...localStyles.tableRow, ...localStyles.tableHeader}}>
            <Text style={{...localStyles.tableCell, width: '40%'}}>Amount</Text>
            <Text style={{...localStyles.tableCell, width: '30%'}}>Method</Text>
            <Text style={{...localStyles.tableCell, width: '30%'}}>Status</Text>
          </View>
          <View style={localStyles.tableRow}>
            <Text
              style={{
                ...localStyles.tableCell,
                width: '40%',
                color: tx.type === 'income' ? localStyles.positive.color : localStyles.negative.color,
                fontWeight: 'bold',
                fontSize: 12,
              }}
            >
              {formatCurrency(tx.amount ?? 0)}
            </Text>
            <Text style={{...localStyles.tableCell, width: '30%'}}>
              {tx.paymentMethod?.replace('_', ' ').toUpperCase() || 'N/A'}
            </Text>
            <Text style={{...localStyles.tableCell, width: '30%'}}>
              {tx.paymentStatus?.replace('_', ' ').toUpperCase() || 'N/A'}
            </Text>
          </View>
        </View>

        {/* Bottom Section: Description */}
        <View style={localStyles.descriptionBox}>
          <Text style={localStyles.descriptionTitle}>Description / Notes:</Text>
          <Text style={localStyles.descriptionText}>
            {tx.description || 'No description provided.'}
          </Text>
        </View>

        <View style={globalStyles.footer} fixed>
          <Text style={globalStyles.footerText}>
            AIE SKYLINE LIMITED, reg. in England & Wales no.
            15616639, United House, 39-41 North Road, London
            N7 9DP. VAT 453448875
          </Text>
          <Text
            style={globalStyles.pageNumber}
            render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber} of ${totalPages}`
            }
          />
        </View>
      </Page>
    );
  };

  // bulk pages renderer
  const renderTransactionsPage = (
    pageTxs: Transaction[],
    pageNum: number,
    totalPages: number
  ) => (
    <Page size="A4" style={globalStyles.page} key={pageNum}>
      <Header />
      <Text style={localStyles.transactionTitle}>
        Financial Report
      </Text>

      {pageNum === 1 && (
        <View style={localStyles.summaryCard}>
          <View style={localStyles.summaryRow}>
            <Text style={localStyles.summaryLabel}>Total Income:</Text>
            <Text style={{...localStyles.summaryValue, ...localStyles.positive}}>
              {formatCurrency(totalIncome)}
            </Text>
          </View>
          <View style={localStyles.summaryRow}>
            <Text style={localStyles.summaryLabel}>Total Expenses:</Text>
            <Text style={{...localStyles.summaryValue, ...localStyles.negative}}>
              {formatCurrency(totalExpenses)}
            </Text>
          </View>
          <View style={localStyles.summaryRow}>
            <Text style={localStyles.summaryLabel}>Net Income:</Text>
            <Text style={{...localStyles.summaryValue, ...(netIncome >= 0 ? localStyles.positive : localStyles.negative)}}>
              {formatCurrency(netIncome)}
            </Text>
          </View>
          <View style={localStyles.summaryRow}>
            <Text style={localStyles.summaryLabel}>Profit Margin:</Text>
            <Text style={{...localStyles.summaryValue, ...(profitMargin >= 0 ? localStyles.positive : localStyles.negative)}}>
              {profitMargin.toFixed(1)}%
            </Text>
          </View>
        </View>
      )}

      <View style={{ ...globalStyles.section, breakInside: 'avoid' }}>
        <Text style={globalStyles.sectionTitle}>Transaction Details</Text>
        <View style={{...localStyles.tableRow, ...localStyles.tableHeader}}>
          <Text style={{ ...localStyles.tableCell, width: '12%' }}>Type</Text>
          <Text style={{ ...localStyles.tableCell, width: '18%' }}>Category</Text>
          <Text style={{ ...localStyles.tableCell, width: '18%' }}>Customer</Text>
          <Text style={{ ...localStyles.tableCell, width: '15%' }}>Reg No.</Text>
          <Text style={{ ...localStyles.tableCell, width: '12%', textAlign: 'right' }}>Amount</Text>
          <Text style={{ ...localStyles.tableCell, width: '12%' }}>Status</Text>
          <Text style={{ ...localStyles.tableCell, width: '13%' }}>Date</Text>
        </View>

        {pageTxs.map((tx, i) => (
          <View key={i} style={{ ...localStyles.tableRow, breakInside: 'avoid' }}>
            <Text style={{...localStyles.tableCell, width: '12%', textTransform: 'capitalize'}}>
              {tx.type}
            </Text>
            <Text style={{ ...localStyles.tableCell, width: '18%' }}>
              {tx.category}
            </Text>
            <Text style={{ ...localStyles.tableCell, width: '18%' }}>
              {tx.customerName || 'N/A'}
            </Text>
            <Text style={{ ...localStyles.tableCell, width: '15%' }}>
              {getReg(tx)}
            </Text>
            <Text
              style={{
                ...localStyles.tableCell,
                width: '12%',
                textAlign: 'right',
                color: tx.type === 'income' ? localStyles.positive.color : localStyles.negative.color,
              }}
            >
              {formatCurrency(tx.amount ?? 0)}
            </Text>
            <Text style={{ ...localStyles.tableCell, width: '12%' }}>
              {tx.paymentStatus?.replace('_', ' ').toUpperCase() || 'N/A'}
            </Text>
            <Text style={{ ...localStyles.tableCell, width: '13%' }}>
              {formatDate(tx.date)}
            </Text>
          </View>
        ))}
      </View>

      <View style={globalStyles.footer} fixed>
        <Text style={globalStyles.footerText}>
          AIE SKYLINE LIMITED, reg. in England & Wales no.
          15616639, United House, 39-41 North Road, London N7 9DP.
          VAT 453448875
        </Text>
        <Text
          style={globalStyles.pageNumber}
          render={({ pageNumber, totalPages }) =>
            `Page ${pageNumber} of ${totalPages}`
          }
        />
      </View>
    </Page>
  );

  // paginate: 4 on first, then 5 per
  const renderBulk = () => {
    const firstCount = 4;
    const perPage = 4;
    const pages: React.ReactNode[] = [];
    let rem = [...transactions];

    // first page
    pages.push(
      renderTransactionsPage(
        rem.slice(0, firstCount),
        1,
        Math.ceil((transactions.length - firstCount) / perPage) + 1
      )
    );
    rem = rem.slice(firstCount);

    // subsequent pages
    let pageNo = 2;
    const totalPages =
      Math.ceil((transactions.length - firstCount) / perPage) + 1;
    while (rem.length) {
      const batch = rem.slice(0, perPage);
      rem = rem.slice(perPage);
      pages.push(renderTransactionsPage(batch, pageNo, totalPages));
      pageNo++;
    }
    return pages;
  };

  return (
    <Document>
      {transactions.length === 1 ? renderSingle() : renderBulk()}
    </Document>
  );
};

export default FinanceDocument;