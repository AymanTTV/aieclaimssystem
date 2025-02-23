import React from 'react';
import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';
import logo from '../../assets/logo.png';
import { styles } from './styles';

interface BaseDocumentProps {
  title: string;
  companyDetails: any;
  children: React.ReactNode;
}

export const BaseDocument: React.FC<BaseDocumentProps> = ({
  title,
  companyDetails,
  children
}) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header with Logo and Company Info */}
      <View style={styles.header}>
        <View style={{ width: '40%' }}>
          <Image src={logo} style={styles.logo} />
        </View>
        <View style={styles.companyInfo}>
          <Text style={{ fontSize: 12, fontWeight: 'bold', marginBottom: 4 }}>
            {companyDetails.fullName}
          </Text>
          <Text style={{ marginBottom: 2 }}>{companyDetails.officialAddress}</Text>
          <Text style={{ marginBottom: 2 }}>Tel: {companyDetails.phone}</Text>
          <Text style={{ marginBottom: 2 }}>Email: {companyDetails.email}</Text>
          {companyDetails.vatNumber && (
            <Text style={{ marginBottom: 2 }}>VAT No: {companyDetails.vatNumber}</Text>
          )}
        </View>
      </View>

      {/* Document Title */}
      <View style={styles.title}>
        <Text>{title.toUpperCase()}</Text>
      </View>

      {/* Main Content */}
      <View style={{ flex: 1 }}>
        {children}
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text>
          {companyDetails.fullName} | Registered in England and Wales | Company No: {companyDetails.registrationNumber}
        </Text>
        <Text>Registered Office: {companyDetails.officialAddress}</Text>
      </View>
    </Page>
  </Document>
);

export default BaseDocument;