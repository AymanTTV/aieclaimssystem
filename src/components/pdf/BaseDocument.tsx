import React from 'react';
import { Document, Page, View, Text, Image } from '@react-pdf/renderer';
import { styles } from './styles';
import { format } from 'date-fns';

interface BaseDocumentProps {
  title: string;
  children: React.ReactNode;
  companyDetails: any;
  showFooter?: boolean;
}

const BaseDocument: React.FC<BaseDocumentProps> = ({ 
  title, 
  children, 
  companyDetails,
  showFooter = true
}) => {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header with logo and company details */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {companyDetails.logoUrl && (
              <Image src={companyDetails.logoUrl} style={styles.logo} />
            )}
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.companyName}>{companyDetails.fullName || 'AIE Skyline Limited'}</Text>
            <Text style={styles.companyDetail}>{companyDetails.officialAddress || ''}</Text>
            <Text style={styles.companyDetail}>Phone: {companyDetails.phone || ''}</Text>
            <Text style={styles.companyDetail}>Email: {companyDetails.email || ''}</Text>
          </View>
        </View>

        {/* Title */}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{title}</Text>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {children}
        </View>

        {/* Footer */}
        {showFooter && (
          <View style={styles.footer} fixed>
            <Text style={styles.footerText}>Aie Skyline Limited | Registered in England and Wales | Company No: 12592207</Text>
            <Text style={styles.footerText}>Generated on {format(new Date(), 'dd/MM/yyyy HH:mm')}</Text>
          </View>
        )}
      </Page>
    </Document>
  );
};

export default BaseDocument;