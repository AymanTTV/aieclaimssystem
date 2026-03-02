// src/components/pdf/documents/FinanceDocument.tsx
import React, { useMemo } from 'react';
import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
  Image,
} from '@react-pdf/renderer';
import { Transaction, Vehicle, Account, Customer } from '../../../types';
import { format } from 'date-fns';
import { styles as globalStyles } from '../styles';

interface FinanceDocumentProps {
  data:
    | Transaction
    | Transaction[]
    | { transactions: Transaction[] };
  vehicles?: Vehicle[];
  accounts?: Account[];
  customers?: Customer[]; // <--- Added customers prop
  companyDetails: {
    logoUrl?: string;
    fullName?: string;
    phone?: string;
    email?: string;
  };
}

const localStyles = StyleSheet.create({
  // ... (Keeping existing styles)
  rowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  colHalf: {
    width: '48%',
  },
  detailsCard: {
    ...globalStyles.card,
    minHeight: 80,
  },
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
  accountSection: {
    marginBottom: 8,
  },
  accountHeader: {
    fontSize: 9,
    fontWeight: 'bold',
    marginBottom: 2,
    textDecoration: 'underline',
  },
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
    padding: 3, 
    textAlign: 'left',
    fontSize: 7, 
  },
  tableHeader: {
    ...globalStyles.tableHeader,
    backgroundColor: '#F3F4F6',
    color: '#374151',
    fontWeight: 'bold',
    fontSize: 7,
  },
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
  positive: { color: '#059669' }, 
  negative: { color: '#DC2626' },
  neutral: { color: '#374151' },
  transactionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#111827',
    textAlign: 'center',
  },
  summaryCard: {
    ...globalStyles.card,
    marginBottom: 15,
    padding: 12,
    backgroundColor: '#F9FAFB',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#E5E7EB',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 10,
    color: '#6B7280',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
});

const FinanceDocument: React.FC<FinanceDocumentProps> = ({
  data,
  vehicles = [],
  accounts = [],
  customers = [], // Default to empty array
  companyDetails,
}) => {
  // 1. Normalize transactions array
  const transactions: Transaction[] = useMemo(() => {
    if (Array.isArray(data)) return data;
    if ('transactions' in data) return data.transactions;
    return [data as Transaction];
  }, [data]);

  // 2. Summary calculations
  const totalIncome = transactions
    .filter((tx) => tx.type === 'income')
    .reduce((sum, tx) => sum + (tx.amount ?? 0), 0);
  const totalExpenses = transactions
    .filter((tx) => tx.type === 'expense')
    .reduce((sum, tx) => sum + (tx.amount ?? 0), 0);
  const netIncome = totalIncome - totalExpenses;

  // 3. Formatters
  const formatCurrency = (amt: number) => `£${amt.toFixed(2)}`;
  const formatDate = (d?: Date | string) =>
    d ? format(new Date(d), 'dd/MM/yyyy') : '-';

  // --- LOOKUP HELPERS ---

  // Get Vehicle Registration
  const getReg = (tx: Transaction) => {
    if (tx.vehicleId) {
      const v = vehicles.find((v) => v.id === tx.vehicleId);
      if (v) return v.registrationNumber;
    }
    // Fallback if vehicleId is missing or not found in list, try snapshot name
    return tx.vehicleName || '-';
  };

  // Get Customer Name
  const getCustomerName = (tx: Transaction) => {
    if (tx.customerId) {
        const c = customers.find((cust) => cust.id === tx.customerId);
        if (c) return c.name;
    }
    return tx.customerName || '-';
  };

  // Get Account Name
  const getAccountName = (id?: string) => {
    if (!id) return null;
    const acc = accounts.find((a) => a.id === id);
    return acc ? acc.name : 'Unknown';
  };

  const getPrimaryAccountName = (tx: Transaction) => {
    const ids = tx.type === 'income' ? tx.accountsTo : tx.accountsFrom;
    if (!ids || ids.length === 0) return '-';
    // Join all names involved (usually just 1)
    return ids.map((id) => getAccountName(id)).join(', ');
  };

  // 6. Running Balance Logic
  const balanceMap = useMemo(() => {
    const map = new Map<string, number>();
    const runningTotals = new Map<string, number>();

    const sortedTxns = [...transactions].sort((a, b) => {
        const dateA = a.date instanceof Date ? a.date : new Date(a.date);
        const dateB = b.date instanceof Date ? b.date : new Date(b.date);
        return dateA.getTime() - dateB.getTime();
    });

    sortedTxns.forEach((tx) => {
        const amt = tx.amount ?? 0;
        let snapshotBal = 0;
        let primaryAccountId: string | null = null;
        
        if (tx.type === 'income' && tx.accountsTo?.[0]) {
            primaryAccountId = tx.accountsTo[0];
            const current = runningTotals.get(primaryAccountId) || 0;
            const newBal = current + amt;
            runningTotals.set(primaryAccountId, newBal);
            snapshotBal = newBal;
        } else if (tx.type === 'expense' && tx.accountsFrom?.[0]) {
            primaryAccountId = tx.accountsFrom[0];
            const current = runningTotals.get(primaryAccountId) || 0;
            const newBal = current - amt;
            runningTotals.set(primaryAccountId, newBal);
            snapshotBal = newBal;
        }

        if (primaryAccountId) {
            map.set(tx.id, snapshotBal);
        }
    });
    return map;
  }, [transactions]);


  // Header Component
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

  // --- RENDERERS ---

  // 1. Single Transaction View
  const renderSingle = () => {
    const tx = transactions[0];
    return (
      <Page size="A4" style={globalStyles.page}>
        <Header />
        <Text style={localStyles.transactionTitle}>Transaction Details</Text>
        <View style={localStyles.rowContainer}>
          <View style={localStyles.colHalf}>
            <View style={localStyles.detailsCard}>
              <Text style={{ ...globalStyles.cardTitle, marginBottom: 10 }}>General Info</Text>
              <Text style={localStyles.label}>Customer:</Text>
              <Text style={localStyles.value}>{getCustomerName(tx)}</Text>
              <Text style={localStyles.label}>Vehicle Reg:</Text>
              <Text style={localStyles.value}>{getReg(tx)}</Text>
              <Text style={localStyles.label}>Category:</Text>
              <Text style={localStyles.value}>{tx.category}</Text>
              <Text style={localStyles.label}>Date:</Text>
              <Text style={localStyles.value}>{formatDate(tx.date)}</Text>
            </View>
          </View>
          <View style={localStyles.colHalf}>
            <View style={localStyles.detailsCard}>
              <Text style={{ ...globalStyles.cardTitle, marginBottom: 10 }}>Fund Flow</Text>
              <View style={localStyles.accountSection}>
                <Text style={{ ...localStyles.accountHeader, color: '#059669' }}>Money In (Credit)</Text>
                <Text style={localStyles.value}>
                    {tx.accountsTo && tx.accountsTo.length > 0 ? tx.accountsTo.map(id => getAccountName(id)).join(', ') : '-'}
                </Text>
              </View>
              <View style={localStyles.accountSection}>
                <Text style={{ ...localStyles.accountHeader, color: '#DC2626' }}>Money Out (Debit)</Text>
                <Text style={localStyles.value}>
                    {tx.accountsFrom && tx.accountsFrom.length > 0 ? tx.accountsFrom.map(id => getAccountName(id)).join(', ') : '-'}
                </Text>
              </View>
              <Text style={localStyles.label}>Txn Type:</Text>
              <Text style={{ ...localStyles.value, textTransform: 'capitalize' }}>{tx.type}</Text>
            </View>
          </View>
        </View>

        <View style={globalStyles.section}>
          <Text style={globalStyles.sectionTitle}>Payment Details</Text>
          <View style={{ ...localStyles.tableRow, ...localStyles.tableHeader }}>
            <Text style={{ ...localStyles.tableCell, width: '25%' }}>Credit</Text>
            <Text style={{ ...localStyles.tableCell, width: '25%' }}>Debit</Text>
            <Text style={{ ...localStyles.tableCell, width: '25%' }}>Method</Text>
            <Text style={{ ...localStyles.tableCell, width: '25%' }}>Status</Text>
          </View>
          <View style={localStyles.tableRow}>
            <Text style={{ ...localStyles.tableCell, width: '25%', color: '#059669', fontWeight: 'bold' }}>
              {tx.type === 'income' ? formatCurrency(tx.amount ?? 0) : '-'}
            </Text>
            <Text style={{ ...localStyles.tableCell, width: '25%', color: '#DC2626', fontWeight: 'bold' }}>
              {tx.type === 'expense' ? formatCurrency(tx.amount ?? 0) : '-'}
            </Text>
            <Text style={{ ...localStyles.tableCell, width: '25%' }}>
              {tx.paymentMethod?.replace('_', ' ').toUpperCase() || 'N/A'}
            </Text>
            <Text style={{ ...localStyles.tableCell, width: '25%' }}>
              {tx.paymentStatus?.replace('_', ' ').toUpperCase() || 'N/A'}
            </Text>
          </View>
        </View>

        <View style={localStyles.descriptionBox}>
          <Text style={localStyles.descriptionTitle}>Description / Notes:</Text>
          <Text style={localStyles.descriptionText}>{tx.description || 'No description provided.'}</Text>
        </View>

        <View style={globalStyles.footer} fixed>
          <Text style={globalStyles.footerText}>
            AIE SKYLINE LIMITED, reg. in England & Wales no. 15616639, United House, 39-41 North Road, London N7 9DP. VAT 453448875
          </Text>
          <Text style={globalStyles.pageNumber} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    );
  };

  // 2. Bulk Page Renderer
  const renderTransactionsPage = (
    pageTxs: Transaction[],
    pageNum: number,
    totalPages: number
  ) => (
    <Page size="A4" style={globalStyles.page} key={pageNum}>
      <Header />
      <Text style={localStyles.transactionTitle}>Financial Report</Text>

      {/* Summary Card (Page 1 Only) */}
      {pageNum === 1 && (
        <View style={localStyles.summaryCard}>
          <View style={localStyles.summaryItem}>
            <Text style={localStyles.summaryLabel}>Total Income</Text>
            <Text style={{ ...localStyles.summaryValue, ...localStyles.positive }}>{formatCurrency(totalIncome)}</Text>
          </View>
          <View style={{ width: 1, height: '80%', backgroundColor: '#E5E7EB' }} />
          <View style={localStyles.summaryItem}>
            <Text style={localStyles.summaryLabel}>Total Expenses</Text>
            <Text style={{ ...localStyles.summaryValue, ...localStyles.negative }}>{formatCurrency(totalExpenses)}</Text>
          </View>
          <View style={{ width: 1, height: '80%', backgroundColor: '#E5E7EB' }} />
          <View style={localStyles.summaryItem}>
            <Text style={localStyles.summaryLabel}>Net Income</Text>
            <Text style={{ ...localStyles.summaryValue, ...(netIncome >= 0 ? localStyles.positive : localStyles.negative) }}>
              {formatCurrency(netIncome)}
            </Text>
          </View>
        </View>
      )}

      {/* Transactions Table */}
      <View style={{ ...globalStyles.section, breakInside: 'avoid' }}>
        <Text style={globalStyles.sectionTitle}>Transaction Details</Text>
        
        {/* Header Row */}
        <View style={{ ...localStyles.tableRow, ...localStyles.tableHeader }}>
          <Text style={{ ...localStyles.tableCell, width: '10%' }}>Date</Text>
          <Text style={{ ...localStyles.tableCell, width: '8%' }}>Type</Text>
          <Text style={{ ...localStyles.tableCell, width: '12%' }}>Category</Text>
          <Text style={{ ...localStyles.tableCell, width: '13%' }}>Customer</Text>
          <Text style={{ ...localStyles.tableCell, width: '10%' }}>Veh. Reg</Text>
          <Text style={{ ...localStyles.tableCell, width: '11%' }}>Account</Text>
          <Text style={{ ...localStyles.tableCell, width: '10%', textAlign: 'right' }}>Credit</Text>
          <Text style={{ ...localStyles.tableCell, width: '10%', textAlign: 'right' }}>Debit</Text>
          <Text style={{ ...localStyles.tableCell, width: '10%', textAlign: 'right' }}>Balance</Text>
          <Text style={{ ...localStyles.tableCell, width: '6%' }}>Status</Text>
        </View>

        {/* Data Rows */}
        {pageTxs.map((tx, i) => {
            const balance = balanceMap.get(tx.id);
            const balanceText = balance !== undefined ? formatCurrency(balance) : '-';
            const balanceColor = (balance || 0) < 0 ? '#DC2626' : '#374151';

            return (
                <View key={i} style={{ ...localStyles.tableRow, breakInside: 'avoid' }}>
                    <Text style={{ ...localStyles.tableCell, width: '10%' }}>{formatDate(tx.date)}</Text>
                    <Text style={{ ...localStyles.tableCell, width: '8%', textTransform: 'capitalize' }}>{tx.type}</Text>
                    <Text style={{ ...localStyles.tableCell, width: '12%' }}>{tx.category}</Text>
                    {/* UPDATED LOOKUP */}
                    <Text style={{ ...localStyles.tableCell, width: '13%' }}>{getCustomerName(tx)}</Text>
                    {/* UPDATED LOOKUP */}
                    <Text style={{ ...localStyles.tableCell, width: '10%' }}>{getReg(tx)}</Text>
                    {/* UPDATED LOOKUP */}
                    <Text style={{ ...localStyles.tableCell, width: '11%', fontSize: 6 }}>{getPrimaryAccountName(tx)}</Text>
                    
                    <Text style={{ ...localStyles.tableCell, width: '10%', textAlign: 'right', color: '#059669', fontWeight: 'bold' }}>
                    {tx.type === 'income' ? formatCurrency(tx.amount ?? 0) : '-'}
                    </Text>
                    
                    <Text style={{ ...localStyles.tableCell, width: '10%', textAlign: 'right', color: '#DC2626', fontWeight: 'bold' }}>
                    {tx.type === 'expense' ? formatCurrency(tx.amount ?? 0) : '-'}
                    </Text>
                    
                    <Text style={{ ...localStyles.tableCell, width: '10%', textAlign: 'right', color: balanceColor }}>
                    {balanceText}
                    </Text>
                    
                    <Text style={{ ...localStyles.tableCell, width: '6%', fontSize: 6 }}>
                    {tx.paymentStatus?.replace('_', ' ').toUpperCase() || 'N/A'}
                    </Text>
                </View>
            );
        })}
      </View>

      <View style={globalStyles.footer} fixed>
        <Text style={globalStyles.footerText}>
          AIE SKYLINE LIMITED, reg. in England & Wales no. 15616639, United House, 39-41 North Road, London N7 9DP. VAT 453448875
        </Text>
        <Text style={globalStyles.pageNumber} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
      </View>
    </Page>
  );

  const renderBulk = () => {
    const firstPageRows = 16;
    const subsequentPageRows = 22;
    const pages: React.ReactNode[] = [];
    let rem = [...transactions];

    pages.push(renderTransactionsPage(rem.slice(0, firstPageRows), 1, Math.ceil((Math.max(0, transactions.length - firstPageRows)) / subsequentPageRows) + 1));
    rem = rem.slice(firstPageRows);

    let pageNo = 2;
    const totalPages = Math.ceil((Math.max(0, transactions.length - firstPageRows)) / subsequentPageRows) + 1;

    while (rem.length) {
      const batch = rem.slice(0, subsequentPageRows);
      rem = rem.slice(subsequentPageRows);
      pages.push(renderTransactionsPage(batch, pageNo, totalPages));
      pageNo++;
    }
    return pages;
  };

  return <Document>{transactions.length === 1 ? renderSingle() : renderBulk()}</Document>;
};

export default FinanceDocument;