// src/components/pdf/UtilisationSingleDocument.tsx
import React from 'react';
import { Text, View, Image } from '@react-pdf/renderer';
import { styles } from './styles';
import BaseDocument from './BaseDocument';
import { format } from 'date-fns';

interface UtilisationSingleDocumentProps {
  record: any;
  startDate: string;
  endDate: string;
  companyDetails: any;
}

const UtilisationSingleDocument: React.FC<UtilisationSingleDocumentProps> = ({
  record,
  startDate,
  endDate,
  companyDetails,
}) => {
  return (
    <BaseDocument title={`Vehicle Utilisation: ${record.registration || 'N/A'}`} companyDetails={companyDetails}>
      
      {/* Top Header Card: Image & Details */}
      <View style={[styles.section, { flexDirection: 'row', gap: 15, alignItems: 'stretch' }]}>
        
        {/* Vehicle Image (Left) */}
        <View style={{ width: '40%' }}>
          {record.image ? (
            <Image 
              src={record.image} 
              style={{ 
                width: '100%', 
                height: 140, 
                objectFit: 'cover', 
                borderRadius: 6, 
                borderWidth: 1, 
                borderColor: '#E5E7EB' 
              }} 
            />
          ) : (
            <View style={{ 
                width: '100%', 
                height: 140, 
                backgroundColor: '#F9FAFB', 
                borderRadius: 6, 
                borderWidth: 1, 
                borderColor: '#E5E7EB', 
                alignItems: 'center', 
                justifyContent: 'center' 
            }}>
              <Text style={{ color: '#9CA3AF', fontSize: 10, fontWeight: 'bold' }}>NO IMAGE</Text>
            </View>
          )}
        </View>

        {/* Vehicle Information (Right) */}
        <View style={[styles.infoCard, { width: '60%', marginBottom: 0, padding: 12 }]}>
          <Text style={styles.infoCardTitle}>Performance Snapshot</Text>
          <View style={styles.flexRow}>
            <Text style={styles.label}>Analysis Period:</Text>
            <Text style={styles.value}>{format(new Date(startDate), 'dd MMM yyyy')} - {format(new Date(endDate), 'dd MMM yyyy')}</Text>
          </View>
          <View style={styles.flexRow}>
  <Text style={styles.label}>Registration:</Text>
  <Text style={[styles.value, { fontWeight: 'bold', color: '#1E40AF' }]}>{record.registration}</Text>
</View>
          <View style={styles.flexRow}>
            <Text style={styles.label}>Make/Model:</Text>
            <Text style={styles.value}>{record.makeModel}</Text>
          </View>
          <View style={styles.flexRow}>
            <Text style={styles.label}>Current Status:</Text>
            <Text style={styles.value}>{record.status.toUpperCase()}</Text>
          </View>
          <View style={styles.flexRow}>
            <Text style={styles.label}>Recent Driver:</Text>
            <Text style={styles.value}>{record.recentDriver}</Text>
          </View>
        </View>
      </View>

      {/* Metrics Section */}
      <View style={styles.sectionBreak}>
        <Text style={styles.sectionTitle}>Metric Breakdown</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          
          <View style={[styles.card, { width: '48%' }]}>
            <Text style={styles.cardTitle}>Time Metrics</Text>
            <View style={styles.flexRow}><Text style={styles.label}>Available Days:</Text><Text style={styles.value}>{record.availableDays}</Text></View>
            <View style={styles.flexRow}><Text style={styles.label}>Rented Days:</Text><Text style={styles.value}>{record.rentedDays}</Text></View>
            <View style={styles.flexRow}><Text style={styles.label}>Off-Road/Maint:</Text><Text style={styles.value}>{record.maintenanceDays}</Text></View>
            <View style={[styles.flexRow, { marginTop: 4, paddingTop: 4, borderTopWidth: 1, borderTopColor: '#E5E7EB' }]}>
              <Text style={styles.label}>Utilisation %:</Text>
              <Text style={[styles.value, { fontWeight: 'bold' }]}>{record.utilisationPct.toFixed(1)}%</Text>
            </View>
          </View>

          <View style={[styles.card, { width: '48%' }]}>
            <Text style={styles.cardTitle}>Usage Estimates</Text>
            <View style={styles.flexRow}><Text style={styles.label}>Total Hours:</Text><Text style={styles.value}>{record.estHoursTotal.toLocaleString()}</Text></View>
            <View style={styles.flexRow}><Text style={styles.label}>Hours / Week:</Text><Text style={styles.value}>{record.estHoursPerWeek.toLocaleString()}</Text></View>
            <View style={styles.flexRow}><Text style={styles.label}>Total Mileage:</Text><Text style={styles.value}>{record.estMileageTotal.toLocaleString()} mi</Text></View>
            <View style={styles.flexRow}><Text style={styles.label}>Mileage / Week:</Text><Text style={styles.value}>{record.estMileagePerWeek.toLocaleString()} mi</Text></View>
          </View>

        </View>
      </View>
    </BaseDocument>
  );
};

export default UtilisationSingleDocument;