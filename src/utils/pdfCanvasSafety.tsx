// src/utils/pdfCanvasSafety.tsx
// ============================================================================
// PART 1: @react-pdf/renderer SAFE CANVAS RENDERING & NULL FALLBACKS
// ============================================================================

import React, { useState } from 'react';
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';

// --- Safe Field & Null-Handling Helpers ---
export const safeText = (value: any, fallback = 'N/A'): string => {
  if (value === null || value === undefined) return fallback;
  const str = String(value).trim();
  return str.length > 0 ? str : fallback;
};

export const safeCurrency = (value: any, currencySymbol = '£'): string => {
  const num = parseFloat(value);
  if (isNaN(num)) return `${currencySymbol}0.00`;
  return `${currencySymbol}${num.toFixed(2)}`;
};

export const safeClauses = (clauses: any[]): any[] => {
  if (!Array.isArray(clauses)) return [];
  return clauses.filter(
    (clause) => clause && typeof clause === 'object' && Boolean(clause.title || clause.content)
  );
};

// --- PDF Component Styles ---
export const pdfStyles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: '#333333',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#CCCCCC',
    paddingBottom: 10,
  },
  logo: {
    width: 120,
    height: 40,
    objectFit: 'contain',
  },
  companyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  subtitle: {
    fontSize: 9,
    color: '#6B7280',
    marginTop: 2,
  },
  metaGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
    padding: 8,
    backgroundColor: '#F9FAFB',
    borderRadius: 4,
  },
  metaItem: {
    flexDirection: 'column',
  },
  metaLabel: {
    fontSize: 8,
    color: '#9CA3AF',
    textTransform: 'uppercase',
  },
  metaValue: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#111827',
  },
  section: {
    marginBottom: 12,
  },
  heading: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#1F2937',
  },
  bodyText: {
    fontSize: 9,
    lineHeight: 1.4,
    color: '#4B5563',
  },
});

export interface SafePdfHeaderProps {
  logoUrl?: string | null;
  companyName?: string | null;
  documentTitle?: string | null;
}

// --- Safe PDF Header Component ---
export const SafePdfHeader: React.FC<SafePdfHeaderProps> = ({ logoUrl, companyName, documentTitle }) => {
  const [imageError, setImageError] = useState(false);
  const isValidLogo =
    logoUrl &&
    typeof logoUrl === 'string' &&
    logoUrl.trim() !== '' &&
    logoUrl !== 'null' &&
    logoUrl !== 'undefined' &&
    !imageError;

  return (
    <View style={pdfStyles.headerContainer}>
      <View>
        {isValidLogo ? (
          <Image
            src={logoUrl as string}
            style={pdfStyles.logo}
            onError={() => setImageError(true)}
          />
        ) : (
          <Text style={pdfStyles.companyTitle}>
            {safeText(companyName, 'COMPANY NAME')}
          </Text>
        )}
        <Text style={pdfStyles.subtitle}>{safeText(documentTitle, 'Terms & Conditions')}</Text>
      </View>
    </View>
  );
};

export interface DynamicTermsPdfDocumentProps {
  data?: {
    companyLogo?: string | null;
    companyName?: string | null;
    documentTitle?: string | null;
    customer?: {
      fullName?: string | null;
      registrationNumber?: string | null;
    };
    termsAndConditions?: Array<{
      id?: string;
      title?: string;
      content?: string;
    }>;
  };
}

// --- Complete Crash-Safe PDF Document Component ---
export const DynamicTermsPdfDocument: React.FC<DynamicTermsPdfDocumentProps> = ({ data }) => {
  const customerName = safeText(data?.customer?.fullName, 'Customer Unspecified');
  const regNumber = safeText(data?.customer?.registrationNumber, 'No Reg Provided');
  const clauses = safeClauses(data?.termsAndConditions || []);

  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        <SafePdfHeader
          logoUrl={data?.companyLogo}
          companyName={data?.companyName}
          documentTitle={data?.documentTitle}
        />

        <View style={pdfStyles.metaGrid}>
          <View style={pdfStyles.metaItem}>
            <Text style={pdfStyles.metaLabel}>Customer Name</Text>
            <Text style={pdfStyles.metaValue}>{customerName}</Text>
          </View>
          <View style={pdfStyles.metaItem}>
            <Text style={pdfStyles.metaLabel}>Registration / Ref</Text>
            <Text style={pdfStyles.metaValue}>{regNumber}</Text>
          </View>
        </View>

        {clauses.length > 0 ? (
          clauses.map((clause, index) => (
            <View key={clause.id || index} style={pdfStyles.section}>
              <Text style={pdfStyles.heading}>
                {index + 1}. {safeText(clause.title, 'Clause Section')}
              </Text>
              <Text style={pdfStyles.bodyText}>
                {safeText(clause.content, 'No contractual details specified for this clause.')}
              </Text>
            </View>
          ))
        ) : (
          <View style={pdfStyles.section}>
            <Text style={pdfStyles.bodyText}>No legal terms configured for this scope.</Text>
          </View>
        )}
      </Page>
    </Document>
  );
};
