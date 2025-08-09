// src/components/pdf/documents/ReceiptDocument.tsx

import React from 'react';
import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
} from '@react-pdf/renderer';
import { Transaction } from '../../../types/finance';

interface ReceiptDocumentProps {
  data: Transaction;
  companyDetails: {
    logoUrl?: string;
    fullName: string;
    officialAddress: string;
    phone: string;
    email: string;
  };
}

const receiptStyles = StyleSheet.create({
  page: {
    width: 227,        // ~80 mm
    padding: 10,
    fontSize: 9,
    fontFamily: 'Helvetica',
    lineHeight: 1.2,
  },
  logo: {
    width: 50,
    height: 50,
    marginBottom: 6,
    alignSelf: 'center',
  },
  companyText: {
    textAlign: 'center',
    marginBottom: 2,
    fontWeight: 'normal',
  },
  dateText: {
    textAlign: 'center',
    marginBottom: 4,
  },
  separator: {
    borderBottomWidth: 1,
    borderBottomStyle: 'dashed',
    marginVertical: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  label: {
    width: '60%',
  },
  value: {
    width: '40%',
    textAlign: 'right',
  },
  total: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    fontWeight: 'bold',
  },
  footer: {
    textAlign: 'center',
    marginTop: 6,
  },
});

const ReceiptDocument: React.FC<ReceiptDocumentProps> = ({
  data,
  companyDetails,
}) => {
  const fmtDate = (d: Date) => new Date(d).toLocaleString('en-GB');
  const fmtMoney = (amt: number) => `£${amt.toFixed(2)}`;

  return (
    <Document>
      <Page size={[227, 600]} style={receiptStyles.page}>
        {/* Logo */}
        {companyDetails.logoUrl && (
          <Image src={companyDetails.logoUrl} style={receiptStyles.logo} />
        )}

        {/* Company Info */}
        <Text style={receiptStyles.companyText}>{companyDetails.fullName}</Text>
        <Text style={receiptStyles.companyText}>{companyDetails.officialAddress}</Text>
        <Text style={receiptStyles.companyText}>Tel: {companyDetails.phone}</Text>
        <Text style={receiptStyles.companyText}>Email: {companyDetails.email}</Text>

        {/* Date/Time above the line */}
        <Text style={receiptStyles.dateText}>{fmtDate(data.date)}</Text>
        <View style={receiptStyles.separator} />

        {/* Transaction Details */}
        <View>
          <View style={receiptStyles.row}>
            <Text style={receiptStyles.label}>Type:</Text>
            <Text style={receiptStyles.value}>{data.type.toUpperCase()}</Text>
          </View>

          <View style={receiptStyles.row}>
            <Text style={receiptStyles.label}>Category:</Text>
            <Text style={receiptStyles.value}>{data.category}</Text>
          </View>

          {data.customerName && (
            <View style={receiptStyles.row}>
              <Text style={receiptStyles.label}>Customer:</Text>
              <Text style={receiptStyles.value}>{data.customerName}</Text>
            </View>
          )}

          {data.vehicleName && (
            <View style={receiptStyles.row}>
              <Text style={receiptStyles.label}>Vehicle:</Text>
              <Text style={receiptStyles.value}>{data.vehicleName}</Text>
            </View>
          )}
        </View>

        <View style={receiptStyles.separator} />

        {/* Amount & Payment */}
        <View style={receiptStyles.total}>
          <Text>Total:</Text>
          <Text>{fmtMoney(data.amount)}</Text>
        </View>

        <View style={receiptStyles.row}>
          <Text style={receiptStyles.label}>Method:</Text>
          <Text style={receiptStyles.value}>{data.paymentMethod || 'N/A'}</Text>
        </View>

        <View style={receiptStyles.row}>
          <Text style={receiptStyles.label}>Status:</Text>
          <Text style={receiptStyles.value}>{data.paymentStatus}</Text>
        </View>

        <View style={receiptStyles.separator} />

        {/* Footer */}
        <Text style={receiptStyles.footer}>Thank you for your business!</Text>
      </Page>
    </Document>
  );
};

export default ReceiptDocument;
