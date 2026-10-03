// src/components/pdf/claims/PdfTermsWarningNotice.tsx
import React from 'react';
import { View, Text, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  warningContainer: {
    borderWidth: 1.5,
    borderStyle: 'solid',
    borderColor: '#DC2626',
    backgroundColor: '#FEF2F2',
    borderRadius: 6,
    padding: 12,
    marginVertical: 10,
  },
  warningHeader: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#991B1B',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  warningMessage: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#B91C1C',
    lineHeight: 1.4,
    marginBottom: 4,
  },
  warningHint: {
    fontSize: 8,
    color: '#7F1D1D',
    lineHeight: 1.4,
  },
});

interface PdfTermsWarningNoticeProps {
  message?: string;
  documentName?: string;
}

export const PdfTermsWarningNotice: React.FC<PdfTermsWarningNoticeProps> = ({ message, documentName }) => {
  const displayMsg =
    message ||
    `TEMPLATE CONFIGURATION REQUIRED: No active T&C template mapped for ${documentName || 'this document'} in Company Settings. Please navigate to Company Settings > Dynamic T&C Mapping Engine to create and activate a template.`;

  return (
    <View style={styles.warningContainer} wrap={false}>
      <Text style={styles.warningHeader}>⚠️ TEMPLATE CONFIGURATION REQUIRED</Text>
      <Text style={styles.warningMessage}>{displayMsg}</Text>
      <Text style={styles.warningHint}>
        No active statutory clauses were found in the Dynamic T&amp;C Mapping Engine. Please navigate to Company Settings &gt; Dynamic T&amp;C Mapping Engine to create and activate a template.
      </Text>
    </View>
  );
};

export default PdfTermsWarningNotice;
