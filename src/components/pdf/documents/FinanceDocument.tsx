import React from 'react';
import { Document, Page, View, Text, StyleSheet, Image } from '@react-pdf/renderer';
import { Transaction, Vehicle, Customer, Account } from '../../../types';
import { format } from 'date-fns';
import { styles as globalStyles } from '../styles'; // Renamed to avoid conflict with local styles

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

const localStyles = StyleSheet.create({ // Renamed 'styles' to 'localStyles' to avoid conflict
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
  // These header/footer styles from the original document are replaced by globalStyles
  // headerContainer: {
  //   flexDirection: 'row',
  //   marginBottom: 20,
  //   borderBottomWidth: 1,
  //   borderBottomColor: '#E5E7EB',
  //   paddingBottom: 10,
  // },
  // logoContainer: {
  //   width: '30%',
  // },
  // logo: {
  //   width: 100,
  //   height: 50,
  //   objectFit: 'contain',
  // },
  // companyDetails: {
  //   width: '70%',
  //   textAlign: 'right',
  // },
  // companyName: {
  //   fontSize: 14,
  //   fontWeight: 'bold',
  //   marginBottom: 4,
  // },
  // companyAddress: {
  //   fontSize: 9,
  //   color: '#4B5563',
  // },
  // companyContact: {
  //   fontSize: 9,
  //   color: '#4B5563',
  // },
  transactionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#111827',
    textAlign: 'center',
  },
  // These footer styles from the original document are replaced by globalStyles
  // customFooter: {
  //   position: 'absolute',
  //   bottom: 30,
  //   left: 0,
  //   right: 0,
  //   textAlign: 'center',
  //   paddingHorizontal: 40,
  // },
  // footerText: {
  //   fontSize: 8,
  //   color: '#6B7280',
  //   textAlign: 'center',
  // },
});

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

  // Derive header details from companyDetails, splitting the address
  const headerDetails = {
    logoUrl: companyDetails?.logoUrl || '',
    fullName: companyDetails?.fullName || 'AIE Skyline Limited',
    addressLine1: 'United House, 39-41 North Road,',
    addressLine2: 'London, N7 9DP.',
    phone: companyDetails?.phone || 'N/A',
    email: companyDetails?.email || 'N/A',
  };

  // Function to render a page of transactions for bulk document
  const renderTransactionsPage = (pageTransactions: Transaction[], pageNumber: number, totalPages: number) => (
    <Page size="A4" style={globalStyles.page} key={`page-${pageNumber}`}>
      {/* Header with Logo and Company Details - FIXED */}
      <View style={globalStyles.header} fixed>
        <View style={globalStyles.headerLeft}>
          {headerDetails.logoUrl && (
            <Image src={headerDetails.logoUrl} style={globalStyles.logo} />
          )}
        </View>
        <View style={globalStyles.headerRight}>
          <Text style={globalStyles.companyName}>{headerDetails.fullName}</Text>
          <Text style={globalStyles.companyDetail}>{headerDetails.addressLine1}</Text>
          <Text style={globalStyles.companyDetail}>{headerDetails.addressLine2}</Text>
          <Text style={globalStyles.companyDetail}>Tel: {headerDetails.phone}</Text>
          <Text style={globalStyles.companyDetail}>Email: {headerDetails.email}</Text>
        </View>
      </View>

      {/* Title */}
      <Text style={localStyles.transactionTitle}>Financial Report</Text>

      {/* Summary Card - Only on first page */}
      {pageNumber === 1 && summary && (
        <View style={localStyles.summaryCard}>
          <View style={localStyles.summaryRow}>
            <Text style={localStyles.summaryLabel}>Total Income:</Text>
            <Text style={{...localStyles.summaryValue, ...localStyles.positiveValue}}>
              {formatCurrency(summary.totalIncome ?? 0)}
            </Text>
          </View>

          <View style={localStyles.summaryRow}>
            <Text style={localStyles.summaryLabel}>Total Expenses:</Text>
            <Text style={{...localStyles.summaryValue, ...localStyles.negativeValue}}>
              {formatCurrency(summary.totalExpenses ?? 0)}
            </Text>
          </View>

          <View style={localStyles.summaryRow}>
            <Text style={localStyles.summaryLabel}>Net Income:</Text>
            <Text style={{
              ...localStyles.summaryValue,
              ...(summary.netIncome >= 0 ? localStyles.positiveValue : localStyles.negativeValue)
            }}>
              {formatCurrency(summary.netIncome ?? 0)}
            </Text>
          </View>

          <View style={localStyles.summaryRow}>
            <Text style={localStyles.summaryLabel}>
              Profit Margin:
            </Text>
            <Text style={{
              ...localStyles.summaryValue,
              ...(typeof summary?.profitMargin === 'number' && summary.profitMargin >= 0
                ? localStyles.positiveValue
                : localStyles.negativeValue)
            }}>
              {typeof summary?.profitMargin === 'number'
                ? `${summary.profitMargin.toFixed(1)}%`
                : '0.0%'}
            </Text>
          </View>
        </View>
      )}

      {/* Transactions Table */}
      <View style={{...globalStyles.section, breakInside: 'avoid'}}>
        <Text style={globalStyles.sectionTitle}>Transaction Details</Text>

        {/* Table Header */}
        <View style={{...localStyles.tableRow, ...localStyles.tableHeader}}>
          <Text style={{...localStyles.tableCell, width: '12%'}}>Type</Text>
          <Text style={{...localStyles.tableCell, width: '18%'}}>Category</Text>
          <Text style={{...localStyles.tableCell, width: '18%'}}>Customer</Text>
          <Text style={{...localStyles.tableCell, width: '15%'}}>Vehicle</Text>
          <Text style={{...localStyles.tableCell, width: '12%', textAlign: 'right'}}>Amount</Text>
          <Text style={{...localStyles.tableCell, width: '12%'}}>Status</Text>
          <Text style={{...localStyles.tableCell, width: '13%'}}>Date</Text>
        </View>

        {/* Table Rows */}
        {pageTransactions.map((tx, index) => (
          <View key={index} style={{...localStyles.tableRow, breakInside: 'avoid'}}>
            <Text style={{...localStyles.tableCell, width: '12%', textTransform: 'capitalize'}}>{tx.type}</Text>
            <Text style={{...localStyles.tableCell, width: '18%'}}>{tx.category}</Text>
            <Text style={{...localStyles.tableCell, width: '18%'}}>{getCustomerDisplay(tx)}</Text>
            <Text style={{...localStyles.tableCell, width: '15%'}}>{getVehicleDisplay(tx)}</Text>
            <Text style={{
              ...localStyles.tableCell,
              width: '12%',
              textAlign: 'right',
              color: tx.type === 'income' ? '#10B981' : '#EF4444'
            }}>
              {formatCurrency(tx.amount)}
            </Text>
            <Text style={{...localStyles.tableCell, width: '12%'}}>{tx.paymentStatus?.replace('_', ' ') || 'N/A'}</Text>
            <Text style={{...localStyles.tableCell, width: '13%'}}>{formatDate(tx.date)}</Text>
          </View>
        ))}
      </View>

      {/* Footer - Updated to consistent design */}
      <View style={globalStyles.footer} fixed>
        <Text style={globalStyles.footerText}>
          AIE SKYLINE LIMITED, registered in England and Wales with the company registration number 15616639, registered office address: United House, 39-41 North Road, London, N7 9DP. VAT. NO. 453448875
        </Text>
        <Text
          style={globalStyles.pageNumber}
          render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
        />
      </View>
    </Page>
  );

  // For single transaction document
  const renderSingleTransactionDocument = () => (
    <Page size="A4" style={globalStyles.page}>
      {/* Header with Logo and Company Details - Updated to consistent design */}
      <View style={globalStyles.header}>
        <View style={globalStyles.headerLeft}>
          {headerDetails.logoUrl && (
            <Image src={headerDetails.logoUrl} style={globalStyles.logo} />
          )}
        </View>
        <View style={globalStyles.headerRight}>
          <Text style={globalStyles.companyName}>{headerDetails.fullName}</Text>
          <Text style={globalStyles.companyDetail}>{headerDetails.addressLine1}</Text>
          <Text style={globalStyles.companyDetail}>{headerDetails.addressLine2}</Text>
          <Text style={globalStyles.companyDetail}>Tel: {headerDetails.phone}</Text>
          <Text style={globalStyles.companyDetail}>Email: {headerDetails.email}</Text>
        </View>
      </View>

      {/* Transaction Type Title */}
      <Text style={localStyles.transactionTitle}>
        Transaction Type: {transaction?.type.charAt(0).toUpperCase() + transaction?.type.slice(1)}
      </Text>

      {/* Transaction Details Card */}
      <View style={localStyles.summaryCard}>
        <Text style={{...globalStyles.sectionTitle, marginBottom: 10}}>Transaction Details</Text>

        <View style={localStyles.summaryRow}>
          <Text style={localStyles.summaryLabel}>Customer:</Text>
          <Text style={localStyles.summaryValue}>{getCustomerDisplay(transaction as Transaction)}</Text>
        </View>

        <View style={localStyles.summaryRow}>
          <Text style={localStyles.summaryLabel}>Vehicle:</Text>
          <Text style={localStyles.summaryValue}>{getVehicleDisplay(transaction as Transaction)}</Text>
        </View>

        <View style={localStyles.summaryRow}>
          <Text style={localStyles.summaryLabel}>Transaction Category:</Text>
          <Text style={localStyles.summaryValue}>{transaction?.category}</Text>
        </View>

        <View style={localStyles.summaryRow}>
          <Text style={localStyles.summaryLabel}>Date:</Text>
          <Text style={localStyles.summaryValue}>{formatDate(transaction?.date)}</Text>
        </View>

        <View style={localStyles.summaryRow}>
          <Text style={localStyles.summaryLabel}>Description:</Text>
          <Text style={localStyles.summaryValue}>{transaction?.description}</Text>
        </View>
      </View>

      {/* Transaction Amount Table */}
      <View style={globalStyles.section}>
        <View style={{...localStyles.tableRow, ...localStyles.tableHeader}}>
          <Text style={{...localStyles.tableCell, width: '40%'}}>Amount</Text>
          <Text style={{...localStyles.tableCell, width: '30%'}}>Payment Method</Text>
          <Text style={{...localStyles.tableCell, width: '30%'}}>Payment Status</Text>
        </View>

        <View style={localStyles.tableRow}>
          <Text style={{
            ...localStyles.tableCell,
            width: '40%',
            color: transaction?.type === 'income' ? '#10B981' : '#EF4444',
            fontWeight: 'bold'
          }}>
            {formatCurrency(transaction?.amount)}
          </Text>
          <Text style={{...localStyles.tableCell, width: '30%'}}>
            {transaction?.paymentMethod?.replace('_', ' ') || 'N/A'}
          </Text>
          <Text style={{...localStyles.tableCell, width: '30%'}}>
            {transaction?.paymentStatus?.replace('_', ' ') || 'N/A'}
          </Text>
        </View>
      </View>

      {/* Footer - Updated to consistent design */}
      <View style={globalStyles.footer} fixed>
        <Text style={globalStyles.footerText}>
          AIE SKYLINE LIMITED, registered in England and Wales with the company registration number 15616639, registered office address: United House, 39-41 North Road, London, N7 9DP. VAT. NO. 453448875
        </Text>
        <Text
          style={globalStyles.pageNumber}
          render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
        />
      </View>
    </Page>
  );

  // For bulk document, split transactions into pages
  const renderBulkDocument = () => {
    const recordsPerPage = 6; // 6 records per page after the first page (changed from 7)
    const firstPageRecords = 4; // 4 records on the first page due to summary card (changed from 5)

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