// src/components/pdf/UtilisationBulkDocument.tsx
import React from 'react';
import { Text, View } from '@react-pdf/renderer';
import { styles } from './styles';
import BaseDocument from './BaseDocument';
import { format } from 'date-fns';

interface UtilisationBulkDocumentProps {
  records: any[];
  startDate: string;
  endDate: string;
  companyDetails: any;
}

const UtilisationBulkDocument: React.FC<UtilisationBulkDocumentProps> = ({
  records,
  startDate,
  endDate,
  companyDetails,
}) => {
  const avgUtil = records.length > 0 
    ? records.reduce((acc, r) => acc + r.utilisationPct, 0) / records.length 
    : 0;

  return (
    <BaseDocument title="Fleet Utilisation Report" companyDetails={companyDetails}>
      <View style={styles.section}>
        <View style={styles.infoCard}>
          <Text style={styles.infoCardTitle}>Report Parameters & Summary</Text>
          <View style={styles.flexRow}>
            <Text style={styles.label}>Analysis Period:</Text>
            <Text style={styles.value}>{format(new Date(startDate), 'dd MMM yyyy')} to {format(new Date(endDate), 'dd MMM yyyy')}</Text>
          </View>
          <View style={styles.flexRow}>
            <Text style={styles.label}>Vehicles Included:</Text>
            <Text style={styles.value}>{records.length} active assets</Text>
          </View>
          <View style={styles.flexRow}>
            <Text style={styles.label}>Fleet Average Utilisation:</Text>
            <Text style={[styles.value, { fontWeight: 'bold' }]}>{avgUtil.toFixed(1)}%</Text>
          </View>
        </View>
      </View>

      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>Registration</Text>
          <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>Recent Driver</Text>
          <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Est. Mi (Total/Wk)</Text>
          <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Est. Hrs (Total/Wk)</Text>
          <Text style={[styles.tableHeaderCell, { flex: 0.8 }]}>Util %</Text>
        </View>
        {records.map((r, i) => (
          <View key={i} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlternate}>
            <Text style={[styles.tableCell, { flex: 1.5, fontWeight: 'bold' }]}>
  {r.registration}
</Text>
            <Text style={[styles.tableCell, { flex: 1.5 }]}>{r.recentDriver}</Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>
              {r.estMileageTotal.toLocaleString()} mi{'\n'}
              <Text style={{ fontSize: 8, color: '#6B7280' }}>({r.estMileagePerWeek.toLocaleString()}/wk)</Text>
            </Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>
              {r.estHoursTotal.toLocaleString()} hr{'\n'}
              <Text style={{ fontSize: 8, color: '#6B7280' }}>({r.estHoursPerWeek.toLocaleString()}/wk)</Text>
            </Text>
            <Text style={[styles.tableCell, { flex: 0.8, fontWeight: 'bold', color: r.utilisationPct >= 60 ? '#16A34A' : r.utilisationPct >= 30 ? '#D97706' : '#DC2626' }]}>
              {r.utilisationPct.toFixed(1)}%
            </Text>
          </View>
        ))}
      </View>
    </BaseDocument>
  );
};

export default UtilisationBulkDocument;