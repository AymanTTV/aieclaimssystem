// src/components/pdf/UtilisationSingleDocument.tsx
import React from 'react';
import { Text, View, Image, StyleSheet } from '@react-pdf/renderer';
import BaseDocument from './BaseDocument';
import { format, isValid } from 'date-fns';

const singleStyles = StyleSheet.create({
  topSection: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 14,
  },
  imageCard: {
    width: '32%',
    height: 140,
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  carImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  noImageText: {
    fontSize: 9,
    color: '#94A3B8',
    fontWeight: 'bold',
  },
  headerInfoCard: {
    width: '68%',
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 8,
    marginBottom: 8,
  },
  titleReg: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  subMakeModel: {
    fontSize: 9.5,
    color: '#475569',
    marginTop: 2,
  },
  utilBox: {
    backgroundColor: '#EEF2FF',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: 'center',
  },
  utilLabel: {
    fontSize: 6.5,
    fontWeight: 'bold',
    color: '#4F46E5',
    textTransform: 'uppercase',
  },
  utilVal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#312E81',
  },
  grid2Col: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  colHalf: {
    width: '48%',
  },
  kvRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  label: {
    fontSize: 7.5,
    color: '#64748B',
    fontWeight: 'bold',
  },
  value: {
    fontSize: 8,
    color: '#0F172A',
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 9.5,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 6,
    padding: 10,
  },
  historyTable: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 6,
    overflow: 'hidden',
  },
  historyHeader: {
    backgroundColor: '#1E293B',
    flexDirection: 'row',
    paddingVertical: 5,
    paddingHorizontal: 6,
  },
  historyHeaderCell: {
    color: '#F8FAFC',
    fontSize: 7.5,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    paddingHorizontal: 3,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    minHeight: 22,
  },
  historyCell: {
    fontSize: 7.5,
    color: '#334155',
    paddingHorizontal: 3,
  },
  historyCellBold: {
    fontSize: 7.5,
    fontWeight: 'bold',
    color: '#0F172A',
    paddingHorizontal: 3,
  },
});

interface UtilisationSingleDocumentProps {
  record: any;
  startDate: string;
  endDate: string;
  companyDetails: any;
}

const safeDate = (val: any) => {
  if (!val) return 'N/A';
  const d = val instanceof Date ? val : new Date(val);
  return isValid(d) ? format(d, 'dd/MM/yyyy') : 'N/A';
};

const UtilisationSingleDocument: React.FC<UtilisationSingleDocumentProps> = ({
  record,
  startDate,
  endDate,
  companyDetails,
}) => {
  const driverHistory: any[] = record.driverAssignments || [
    {
      driverName: record.recentDriver || 'Assigned Driver',
      startDate: record.assignmentStartDate || startDate,
      endDate: record.assignmentEndDate || endDate,
      days: record.rentedDays || 0,
      hours: record.estHoursTotal || 0,
      notes: record.isSubstitution ? 'Substitute hire' : 'Regular hire',
    }
  ];

  return (
    <BaseDocument
      title={`Vehicle Utilisation & Driver History: ${record.registration || 'N/A'}`}
      companyDetails={companyDetails}
      orientation="landscape"
    >
      {/* Top Section: Photo and Overview */}
      <View style={singleStyles.topSection}>
        <View style={singleStyles.imageCard}>
          {record.image ? (
            <Image src={record.image} style={singleStyles.carImage} />
          ) : (
            <Text style={singleStyles.noImageText}>NO VEHICLE PHOTO</Text>
          )}
        </View>

        <View style={singleStyles.headerInfoCard}>
          <View style={singleStyles.headerRow}>
            <View>
              <Text style={singleStyles.titleReg}>{record.registration}</Text>
              <Text style={singleStyles.subMakeModel}>{record.makeModel} {record.year ? `(${record.year})` : ''}</Text>
            </View>
            <View style={singleStyles.utilBox}>
              <Text style={singleStyles.utilLabel}>Utilisation</Text>
              <Text style={singleStyles.utilVal}>{(record.utilisationPct || 0).toFixed(1)}%</Text>
            </View>
          </View>

          <View style={singleStyles.grid2Col}>
            <View style={singleStyles.colHalf}>
              <View style={singleStyles.kvRow}>
                <Text style={singleStyles.label}>Analysis Period:</Text>
                <Text style={singleStyles.value}>{safeDate(startDate)} - {safeDate(endDate)}</Text>
              </View>
              <View style={singleStyles.kvRow}>
                <Text style={singleStyles.label}>Current Driver:</Text>
                <Text style={singleStyles.value}>{record.driverName || record.recentDriver || 'None'}</Text>
              </View>
              <View style={singleStyles.kvRow}>
                <Text style={singleStyles.label}>Previous Driver:</Text>
                <Text style={singleStyles.value}>{record.previousDriver && record.previousDriver !== 'None' ? record.previousDriver : 'None'}</Text>
              </View>
              <View style={singleStyles.kvRow}>
                <Text style={singleStyles.label}>Status:</Text>
                <Text style={singleStyles.value}>{(record.status || 'Active').toUpperCase()}</Text>
              </View>
            </View>

            <View style={singleStyles.colHalf}>
              <View style={singleStyles.kvRow}>
                <Text style={singleStyles.label}>Driving Model:</Text>
                <Text style={singleStyles.value}>8-12 hrs/day (5-6 d/wk)</Text>
              </View>
              <View style={singleStyles.kvRow}>
                <Text style={singleStyles.label}>Total Active Days:</Text>
                <Text style={singleStyles.value}>{record.rentedDays || 0} Days</Text>
              </View>
              <View style={singleStyles.kvRow}>
                <Text style={singleStyles.label}>Off-Road (Maint):</Text>
                <Text style={singleStyles.value}>{record.maintenanceDays || 0} Days</Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* Metrics Cards */}
      <View style={singleStyles.cardsContainer}>
        <View style={singleStyles.metricCard}>
          <Text style={singleStyles.sectionTitle}>Time & Availability</Text>
          <View style={singleStyles.kvRow}><Text style={singleStyles.label}>Period Length:</Text><Text style={singleStyles.value}>{record.totalDaysInRange || 0} Days</Text></View>
          <View style={singleStyles.kvRow}><Text style={singleStyles.label}>Days Active (Hired):</Text><Text style={[singleStyles.value, { color: '#047857' }]}>{record.rentedDays || 0} Days</Text></View>
          <View style={singleStyles.kvRow}><Text style={singleStyles.label}>Maintenance Off-Road:</Text><Text style={[singleStyles.value, { color: '#B91C1C' }]}>{record.maintenanceDays || 0} Days</Text></View>
          <View style={singleStyles.kvRow}><Text style={singleStyles.label}>Available for Hire:</Text><Text style={singleStyles.value}>{record.availableDays || 0} Days</Text></View>
        </View>

        <View style={singleStyles.metricCard}>
          <Text style={singleStyles.sectionTitle}>Operating Hours & Distance</Text>
          <View style={singleStyles.kvRow}><Text style={singleStyles.label}>Avg Driving Hours:</Text><Text style={singleStyles.value}>{(record.estHoursTotal || 0).toLocaleString()} hrs</Text></View>
          <View style={singleStyles.kvRow}><Text style={singleStyles.label}>Estimated Mileage:</Text><Text style={singleStyles.value}>{(record.estMileageTotal || 0).toLocaleString()} mi</Text></View>
        </View>
      </View>

      {/* Driver Assignment History Table */}
      <View>
        <Text style={singleStyles.sectionTitle}>Driver Assignment & Shift History</Text>
        <View style={singleStyles.historyTable}>
          <View style={singleStyles.historyHeader}>
            <Text style={[singleStyles.historyHeaderCell, { width: '30%' }]}>Driver Name</Text>
            <Text style={[singleStyles.historyHeaderCell, { width: '22%' }]}>Start Date</Text>
            <Text style={[singleStyles.historyHeaderCell, { width: '22%' }]}>End Date</Text>
            <Text style={[singleStyles.historyHeaderCell, { width: '13%', textAlign: 'center' }]}>Active Days</Text>
            <Text style={[singleStyles.historyHeaderCell, { width: '13%', textAlign: 'right' }]}>Avg Driving Hours</Text>
          </View>

          {driverHistory.map((d: any, idx: number) => (
            <View key={idx} style={[singleStyles.historyRow, idx % 2 === 1 ? { backgroundColor: '#F8FAFC' } : {}]}>
              <View style={{ width: '30%' }}>
                <Text style={singleStyles.historyCellBold}>{d.driverName || 'Driver'}</Text>
                {d.notes && <Text style={{ fontSize: 6.5, color: '#64748B' }}>{d.notes}</Text>}
              </View>
              <Text style={[singleStyles.historyCell, { width: '22%' }]}>{safeDate(d.startDate)}</Text>
              <Text style={[singleStyles.historyCell, { width: '22%' }]}>{safeDate(d.endDate)}</Text>
              <Text style={[singleStyles.historyCellBold, { width: '13%', textAlign: 'center', color: '#047857' }]}>
                {d.days ?? d.rentedDays ?? 0}d
              </Text>
              <Text style={[singleStyles.historyCellBold, { width: '13%', textAlign: 'right', paddingRight: 4 }]}>
                {(d.hours ?? d.estHoursTotal ?? 0).toLocaleString()} hrs
              </Text>
            </View>
          ))}
        </View>
      </View>
    </BaseDocument>
  );
};

export default UtilisationSingleDocument;
