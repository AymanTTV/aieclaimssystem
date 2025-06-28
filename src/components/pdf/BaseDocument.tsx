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
  showFooter = true,
}) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header} fixed>
        <View style={styles.headerLeft}>
          {companyDetails?.logoUrl && (
            <Image src={companyDetails.logoUrl} style={styles.logo} />
          )}
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
      <View style={styles.titleContainer}>
        <Text style={styles.title}>{title}</Text>
      </View>

      {/* Content */}
      <View style={styles.content}>{children}</View>

      {/* Footer */}
      {showFooter && (
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            AIE SKYLINE LIMITED, registered in England and Wales with the company registration number 15616639, registered office address: United House, 39-41 North Road, London, N7 9DP. VAT. NO. 453448875
          </Text>
          <Text
            style={styles.footerText}
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
