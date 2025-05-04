import React from 'react';
import { Document, Page, View, Text, StyleSheet, Image } from '@react-pdf/renderer';
import { Transaction, Vehicle, Customer, Account } from '../../../types';
import { format } from 'date-fns';
import { styles as globalStyles } from '../styles';

interface FinanceDocumentProps {
  data: Transaction | { 
    transactions: Transaction[]; 
    summary: {
      totalIncome: number;
      totalExpenses: number;
      netIncome: number;
      profitMargin: number;
    };
  };
  companyDetails: any;
}

const styles = {
  ...globalStyles,
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
    fontWeight: 'bold',
  },
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
    ...globalStyles.text,
    fontSize: 10,
    color: '#4B5563',
  },
  summaryValue: {
    ...globalStyles.text,
    fontSize: 10,
    fontWeight: 'bold',
  },
  positiveValue: {
    color: '#10B981', // green
  },
  negativeValue: {
    color: '#EF4444', // red
  },
  neutralValue: {
    color: '#3B82F6', // blue
  },
  vehicleInfo: {
    ...globalStyles.text,
    fontSize: 9,
    color: '#6B7280',
    marginTop: 2,
  },
  customerInfo: {
    ...globalStyles.text,
    fontSize: 9,
    color: '#6B7280',
    marginTop: 2,
  },
  headerContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 10,
  },
  logoContainer: {
    width: '30%',
  },
  logo: {
    width: 100,
    height: 50,
    objectFit: 'contain',
  },
  companyDetails: {
    width: '70%',
    textAlign: 'right',
  },
  companyName: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  companyAddress: {
    fontSize: 9,
    color: '#4B5563',
  },
  companyContact: {
    fontSize: 9,
    color: '#4B5563',
  },
  transactionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#111827',
    textAlign: 'center',
  },
  customFooter: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  footerText: {
    fontSize: 8,
    color: '#6B7280',
    textAlign: 'center',
  },
};

const FinanceDocument: React.FC<FinanceDocumentProps> = ({ data, companyDetails }) => {
  const formatCurrency = (amount: number) => {
    return `£${amount.toFixed(2)}`;
  };

  const formatDate = (date: Date) => {
    return format(date, 'dd/MM/yyyy');
  };

  // Check if data is a single transaction or a collection
  const isSingleTransaction = !('transactions' in data);
  
  // For single transaction
  const transaction = isSingleTransaction ? data as Transaction : null;
  
  // For multiple transactions
  const { transactions, summary } = isSingleTransaction 
    ? { transactions: [data as Transaction], summary: null } 
    : data as { transactions: Transaction[], summary: any };

  // Function to get customer display
  const getCustomerDisplay = (transaction: Transaction): string => {
    // First check for manually entered customer name
    if (transaction.customerName) {
      return transaction.customerName;
    }
    
    // If no customer information is available
    return 'N/A';
  };

  // Function to get vehicle display
  const getVehicleDisplay = (transaction: Transaction): string => {
    // First check for vehicle name (make + model)
    if (transaction.vehicleName) {
      return transaction.vehicleName;
    }
    
    // If no vehicle information is available
    return 'N/A';
  };

  // Function to render a page of transactions
  const renderTransactionsPage = (pageTransactions: Transaction[], pageNumber: number, totalPages: number) => (
    <Page size="A4" style={globalStyles.page} key={`page-${pageNumber}`}>
      {/* Header with Logo and Company Details */}
      <View style={styles.headerContainer}>
        <View style={styles.logoContainer}>
          {companyDetails?.logoUrl ? (
            <Image src={companyDetails.logoUrl} style={styles.logo} />
          ) : (
            <Text style={styles.companyName}>AIE SKYLINE</Text>
          )}
        </View>
        <View style={styles.companyDetails}>
          <Text style={styles.companyName}>{companyDetails?.fullName || 'AIE Skyline Limited'}</Text>
          <Text style={styles.companyAddress}>{companyDetails?.officialAddress || 'United House, 39-41 North Road, London, N7 9DP'}</Text>
          <Text style={styles.companyContact}>
            {companyDetails?.phone || '020 8050 5337'} | {companyDetails?.email || 'admin@aieskyline.co.uk'}
          </Text>
        </View>
      </View>

      {/* Title */}
      <Text style={styles.transactionTitle}>Financial Report</Text>

      {/* Summary Card - Only on first page */}
      {pageNumber === 1 && summary && (
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Income:</Text>
            <Text style={{...styles.summaryValue, ...styles.positiveValue}}>{formatCurrency(summary.totalIncome)}</Text>
          </View>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Expenses:</Text>
            <Text style={{...styles.summaryValue, ...styles.negativeValue}}>{formatCurrency(summary.totalExpenses)}</Text>
          </View>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Net Income:</Text>
            <Text style={{
              ...styles.summaryValue, 
              ...(summary.netIncome >= 0 ? styles.positiveValue : styles.negativeValue)
            }}>
              {formatCurrency(summary.netIncome)}
            </Text>
          </View>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Profit Margin:</Text>
            <Text style={{
              ...styles.summaryValue, 
              ...(summary.profitMargin >= 0 ? styles.positiveValue : styles.negativeValue)
            }}>
              {summary.profitMargin.toFixed(1)}%
            </Text>
          </View>
        </View>
      )}

      {/* Transactions Table */}
      <View style={globalStyles.section}>
        <Text style={globalStyles.sectionTitle}>Transaction Details</Text>
        
        {/* Table Header */}
        <View style={{...styles.tableRow, ...styles.tableHeader}}>
          <Text style={{...styles.tableCell, width: '12%'}}>Type</Text>
          <Text style={{...styles.tableCell, width: '18%'}}>Category</Text>
          <Text style={{...styles.tableCell, width: '18%'}}>Customer</Text>
          <Text style={{...styles.tableCell, width: '15%'}}>Vehicle</Text>
          <Text style={{...styles.tableCell, width: '12%', textAlign: 'right'}}>Amount</Text>
          <Text style={{...styles.tableCell, width: '12%'}}>Status</Text>
          <Text style={{...styles.tableCell, width: '13%'}}>Date</Text>
        </View>
        
        {/* Table Rows */}
        {pageTransactions.map((transaction, index) => (
          <View key={index} style={styles.tableRow}>
            <Text style={{...styles.tableCell, width: '12%', textTransform: 'capitalize'}}>{transaction.type}</Text>
            <Text style={{...styles.tableCell, width: '18%'}}>{transaction.category}</Text>
            <Text style={{...styles.tableCell, width: '18%'}}>{getCustomerDisplay(transaction)}</Text>
            <Text style={{...styles.tableCell, width: '15%'}}>{getVehicleDisplay(transaction)}</Text>
            <Text style={{
              ...styles.tableCell, 
              width: '12%', 
              textAlign: 'right',
              color: transaction.type === 'income' ? '#10B981' : '#EF4444'
            }}>
              {formatCurrency(transaction.amount)}
            </Text>
            <Text style={{...styles.tableCell, width: '12%'}}>{transaction.paymentStatus?.replace('_', ' ') || 'N/A'}</Text>
            <Text style={{...styles.tableCell, width: '13%'}}>{formatDate(transaction.date)}</Text>
          </View>
        ))}
      </View>

      {/* Custom Footer */}
      <View style={styles.customFooter}>
        <Text style={styles.footerText}>
          Aie Skyline Limited | Registered in England and Wales | Company No: 12592207
        </Text>
        <Text style={styles.footerText}>
          Registered Office: 39-41 North Road, London, N7 9DP
        </Text>
        <Text style={globalStyles.footerPageNumber} render={({ pageNumber, totalPages }) => (
          `Page ${pageNumber} of ${totalPages}`
        )} fixed />
      </View>
    </Page>
  );

  // For single transaction document
  const renderSingleTransactionDocument = () => (
    <Page size="A4" style={globalStyles.page}>
      {/* Header with Logo and Company Details */}
      <View style={styles.headerContainer}>
        <View style={styles.logoContainer}>
          {companyDetails?.logoUrl ? (
            <Image src={companyDetails.logoUrl} style={styles.logo} />
          ) : (
            <Text style={styles.companyName}>AIE SKYLINE</Text>
          )}
        </View>
        <View style={styles.companyDetails}>
          <Text style={styles.companyName}>{companyDetails?.fullName || 'AIE Skyline Limited'}</Text>
          <Text style={styles.companyAddress}>{companyDetails?.officialAddress || 'United House, 39-41 North Road, London, N7 9DP'}</Text>
          <Text style={styles.companyContact}>
            {companyDetails?.phone || '020 8050 5337'} | {companyDetails?.email || 'admin@aieskyline.co.uk'}
          </Text>
        </View>
      </View>

      {/* Transaction Type Title */}
      <Text style={styles.transactionTitle}>
        Transaction Type: {transaction?.type.charAt(0).toUpperCase() + transaction?.type.slice(1)}
      </Text>
      
      {/* Transaction Details Card */}
      <View style={styles.summaryCard}>
        <Text style={{...globalStyles.sectionTitle, marginBottom: 10}}>Transaction Details</Text>
        
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Customer:</Text>
          <Text style={styles.summaryValue}>{getCustomerDisplay(transaction as Transaction)}</Text>
        </View>
        
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Vehicle:</Text>
          <Text style={styles.summaryValue}>{getVehicleDisplay(transaction as Transaction)}</Text>
        </View>
        
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Transaction Category:</Text>
          <Text style={styles.summaryValue}>{transaction?.category}</Text>
        </View>
        
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Date:</Text>
          <Text style={styles.summaryValue}>{formatDate(transaction?.date)}</Text>
        </View>
        
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Description:</Text>
          <Text style={styles.summaryValue}>{transaction?.description}</Text>
        </View>
      </View>
      
      {/* Transaction Amount Table */}
      <View style={globalStyles.section}>
        <View style={{...styles.tableRow, ...styles.tableHeader}}>
          <Text style={{...styles.tableCell, width: '40%'}}>Amount</Text>
          <Text style={{...styles.tableCell, width: '30%'}}>Payment Method</Text>
          <Text style={{...styles.tableCell, width: '30%'}}>Payment Status</Text>
        </View>
        
        <View style={styles.tableRow}>
          <Text style={{
            ...styles.tableCell, 
            width: '40%',
            color: transaction?.type === 'income' ? '#10B981' : '#EF4444',
            fontWeight: 'bold'
          }}>
            {formatCurrency(transaction?.amount)}
          </Text>
          <Text style={{...styles.tableCell, width: '30%'}}>
            {transaction?.paymentMethod?.replace('_', ' ') || 'N/A'}
          </Text>
          <Text style={{...styles.tableCell, width: '30%'}}>
            {transaction?.paymentStatus?.replace('_', ' ') || 'N/A'}
          </Text>
        </View>
      </View>

      {/* Custom Footer */}
      <View style={styles.customFooter}>
        <Text style={styles.footerText}>
          Aie Skyline Limited | Registered in England and Wales | Company No: 12592207
        </Text>
        <Text style={styles.footerText}>
          Registered Office: 39-41 North Road, London, N7 9DP
        </Text>
      </View>
    </Page>
  );

  // For bulk document, split transactions into pages
  const renderBulkDocument = () => {
    const recordsPerPage = 7; // 7 records per page after the first page
    const firstPageRecords = 5; // 5 records on the first page due to summary card
    
    const pages = [];
    let remainingTransactions = [...transactions];
    
    // First page with summary
    const firstPageTransactions = remainingTransactions.slice(0, firstPageRecords);
    remainingTransactions = remainingTransactions.slice(firstPageRecords);
    
    // Calculate total pages
    const totalPages = Math.ceil(
      (transactions.length - firstPageRecords) / recordsPerPage
    ) + 1;
    
    // Add first page
    pages.push(renderTransactionsPage(firstPageTransactions, 1, totalPages));
    
    // Add remaining pages
    let pageNumber = 2;
    while (remainingTransactions.length > 0) {
      const pageTransactions = remainingTransactions.slice(0, recordsPerPage);
      remainingTransactions = remainingTransactions.slice(recordsPerPage);
      
      pages.push(renderTransactionsPage(pageTransactions, pageNumber, totalPages));
      pageNumber++;
    }
    
    return pages;
  };

  return (
    <Document>
      {isSingleTransaction ? renderSingleTransactionDocument() : renderBulkDocument()}
    </Document>
  );
};

export default FinanceDocument;