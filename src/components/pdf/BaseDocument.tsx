import React from 'react';
import { Document, Page, View, Text, Image } from '@react-pdf/renderer';
import { styles } from './styles';
import SafePdfLogo from './SafePdfLogo';
import { format } from 'date-fns';
import { formatInlineCompanyFooter } from '../../utils/legalDocumentUtils';

interface BaseDocumentProps {
  title: string;
  children: React.ReactNode;
  companyDetails: any;
  showFooter?: boolean;
  orientation?: 'portrait' | 'landscape';
}

const BaseDocument: React.FC<BaseDocumentProps> = ({
  title,
  children,
  companyDetails,
  showFooter = true,
  orientation = 'portrait',
}) => (
  <Document>
    <Page size="A4" orientation={orientation} style={[styles.page, orientation === 'landscape' ? { paddingHorizontal: 30, paddingTop: 30, paddingBottom: 50 } : {}]}>
      {/* Header */}
      <View style={styles.header} fixed>
        <View style={styles.headerLeft}>
          <SafePdfLogo src={companyDetails?.logoUrl} companyName={companyDetails?.fullName} style={styles.logo} />
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.companyName}>
            {companyDetails?.fullName || 'AIE Skyline Limited'}
          </Text>
          <Text style={styles.companyDetail}>
            {companyDetails?.officialAddress || 'N/A'}
          </Text>
          <Text style={styles.companyDetail}>
            Tel: {companyDetails?.phone || 'N/A'}
          </Text>
          <Text style={styles.companyDetail}>
            Email: {companyDetails?.email || 'N/A'}
          </Text>
        </View>
      </View>

      {/* Title */}
      <View style={styles.titleContainer} fixed>
        <Text style={styles.title}>{title}</Text>
      </View>

      {/* Content */}
      <View style={styles.content}>{children}</View>

      {/* Footer */}
      {showFooter && (
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            {formatInlineCompanyFooter(companyDetails)}
          </Text>
          <Text
            style={styles.pageNumber}
            render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber} of ${totalPages}`
            }
          />
        </View>
      )}
    </Page>
  </Document>
);

export default BaseDocument;
