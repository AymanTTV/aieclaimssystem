// src/components/pdf/documents/ClaimProgressDocument.tsx
import React from 'react';
import { Document, Page, Text, View, Image } from '@react-pdf/renderer';
import { Claim } from '../../../types';
import { formatDate } from '../../../utils/dateHelpers';
import { styles } from '../styles';
import aieClaimsLogo from '../../../assets/aieclaim.png';
import { format } from 'date-fns';

interface ClaimProgressDocumentProps {
  data: Claim;
}

// --- HELPER TO SAFELY CONVERT DATES/TIMESTAMPS ---
const toJsDate = (dateVal: any): Date => {
  if (!dateVal) return new Date();
  if (typeof dateVal.toDate === 'function') return dateVal.toDate();
  if (dateVal instanceof Date) return dateVal;
  return new Date(dateVal);
};

const ClaimProgressDocument: React.FC<ClaimProgressDocumentProps> = ({ data }) => {
  const headerDetails = {
    logoUrl: aieClaimsLogo,
    fullName: 'AIE Claims LTD',
    addressLine1: 'United House, 39-41 North Road,',
    addressLine2: 'London, N7 9DP',
    phone: '+442080505337',
    email: 'claims@aieclaims.co.uk',
  };

  const sortedHistory = (data.progressHistory || []).sort((a, b) => {
    const dateA = toJsDate(a.date).getTime();
    const dateB = toJsDate(b.date).getTime();
    return dateB - dateA;
  });

  return (
    <Document>
      {/* paddingBottom: 130 ensures a large safe zone so table rows 
         and long text break comfortably before hitting the fixed footer.
      */}
      <Page size="A4" style={{ ...styles.page, paddingBottom: 130 }}>
        
        {/* ========== HEADER ========== */}
        <View style={styles.header} fixed>
          <View style={styles.headerLeft}>
            <Image src={headerDetails.logoUrl} style={styles.logo} />
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.companyName}>{headerDetails.fullName}</Text>
            <Text style={styles.companyDetail}>{headerDetails.addressLine1}</Text>
            <Text style={styles.companyDetail}>{headerDetails.addressLine2}</Text>
            <Text style={styles.companyDetail}>Tel: {headerDetails.phone}</Text>
            <Text style={styles.companyDetail}>Email: {headerDetails.email}</Text>
          </View>
        </View>

        {/* ========== TITLE ========== */}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Claim Progress Record</Text>
        </View>

        {/* ========== SUMMARY ========== */}
        <View style={styles.section} wrap={false}>
           <Text style={styles.sectionTitle}>Claim Summary</Text>
           <View style={[styles.card, { borderLeftColor: '#3B82F6' }]}>
             <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <View style={{ width: '48%' }}>
                  <Text style={styles.cardContent}><Text style={{ fontWeight: 'bold' }}>Claim ID:</Text> {data.id ? data.id.slice(-8).toUpperCase() : 'N/A'}</Text>
                  <Text style={styles.cardContent}><Text style={{ fontWeight: 'bold' }}>Client:</Text> {data.clientInfo?.name || 'N/A'}</Text>
                  <Text style={styles.cardContent}><Text style={{ fontWeight: 'bold' }}>Ref:</Text> {data.clientRef || 'N/A'}</Text>
                </View>
                <View style={{ width: '48%' }}>
                  <Text style={styles.cardContent}><Text style={{ fontWeight: 'bold' }}>Current Status:</Text> {data.progress || 'N/A'}</Text>
                  <Text style={styles.cardContent}><Text style={{ fontWeight: 'bold' }}>Case Progress:</Text> {data.caseProgress || 'N/A'}</Text>
                  <Text style={styles.cardContent}>
                    <Text style={{ fontWeight: 'bold' }}>Last Updated:</Text> {data.updatedAt ? formatDate(toJsDate(data.updatedAt)) : 'N/A'}
                  </Text>
                </View>
             </View>
           </View>
        </View>

        {/* ========== CLIENT & REFERENCE ========== */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }} wrap={false}>
          <View style={[styles.card, { width: '48%' }]}>
            <Text style={styles.cardTitle}>Client Information</Text>
            <Text style={styles.cardContent}>Name: {data.clientInfo?.name}</Text>
            <Text style={styles.cardContent}>DOB: {data.clientInfo?.dateOfBirth ? formatDate(toJsDate(data.clientInfo.dateOfBirth)) : 'N/A'}</Text>
            <Text style={styles.cardContent}>Address: {data.clientInfo?.address}</Text>
            {Array.isArray(data.claimReason) && data.claimReason.includes('PI') && (
              <>
                <Text style={styles.cardContent}>Phone: {data.clientInfo?.phone}</Text>
                <Text style={styles.cardContent}>Email: {data.clientInfo?.email}</Text>
                <Text style={styles.cardContent}>NI No: {data.clientInfo?.nationalInsuranceNumber}</Text>
                <Text style={styles.cardContent}>Occupation: {data.clientInfo?.occupation ?? 'N/A'}</Text>
              </>
            )}
          </View>
          <View style={[styles.card, { width: '48%' }]}>
            <Text style={styles.cardTitle}>Reference Details</Text>
            {data.clientRef && <Text style={styles.cardContent}>Client Ref: {data.clientRef}</Text>}
            <Text style={styles.cardContent}>Type: {data.claimType}</Text>
            <Text style={styles.cardContent}>Reason: {Array.isArray(data.claimReason) ? data.claimReason.join(', ') : data.claimReason}</Text>
            <Text style={styles.cardContent}>Case Progress: {data.caseProgress}</Text>
            <Text style={styles.cardContent}>Current Status: {data.progress}</Text>
          </View>
        </View>

        {/* ========== CLIENT VEHICLE ========== */}
        <View style={styles.section} wrap={false}>
          <Text style={styles.sectionTitle}>Client Vehicle</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.tableHeaderCell}>Registration</Text>
              <Text style={styles.tableHeaderCell}>MOT Expiry</Text>
              <Text style={styles.tableHeaderCell}>Road Tax Expiry</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.tableCell}>{data.clientVehicle?.registration || 'N/A'}</Text>
              <Text style={styles.tableCell}>{data.clientVehicle?.motExpiry ? formatDate(toJsDate(data.clientVehicle.motExpiry)) : 'N/A'}</Text>
              <Text style={styles.tableCell}>{data.clientVehicle?.roadTaxExpiry ? formatDate(toJsDate(data.clientVehicle.roadTaxExpiry)) : 'N/A'}</Text>
            </View>
          </View>
        </View>

        {/* ========== ACCIDENT DETAILS ========== */}
        <View style={styles.section} wrap={false}>
          <Text style={styles.sectionTitle}>Accident Details</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.tableHeaderCell}>Date</Text>
              <Text style={styles.tableHeaderCell}>Time</Text>
              <Text style={styles.tableHeaderCell}>Location</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.tableCell}>{data.incidentDetails?.date ? formatDate(toJsDate(data.incidentDetails.date)) : 'N/A'}</Text>
              <Text style={styles.tableCell}>{data.incidentDetails?.time || 'N/A'}</Text>
              <Text style={styles.tableCell}>{data.incidentDetails?.location || 'N/A'}</Text>
            </View>
          </View>
          <View style={[styles.card, { borderLeftColor: '#F59E0B' }]}>
            <Text style={styles.cardTitle}>Description</Text>
            <Text style={[styles.cardContent, { marginTop: 5 }]}>{data.incidentDetails?.description || 'N/A'}</Text>
          </View>
        </View>

        {/* ========== INJURY DETAILS ========== */}
        {Array.isArray(data.claimReason) && data.claimReason.includes('PI') && (
          <View style={[styles.card, { borderLeftColor: '#F87171', marginBottom: 20 }]}>
            <Text style={styles.cardTitle}>Injury Details</Text>
            <Text style={[styles.cardContent, { marginTop: 5 }]}>
              {data.clientInfo?.injuryDetails ?? 'N/A'}
            </Text>
          </View>
        )}

        {/* ========== THIRD PARTY & REGISTER KEEPER ========== */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }} wrap={false}>
          <View style={[styles.card, { width: '48%' }]}>
            <Text style={styles.cardTitle}>Third Party Information</Text>
            <Text style={styles.cardContent}>Name: {data.thirdParty?.name}</Text>
            <Text style={styles.cardContent}>Phone: {data.thirdParty?.phone}</Text>
            <Text style={styles.cardContent}>Email: {data.thirdParty?.email}</Text>
            <Text style={styles.cardContent}>Address: {data.thirdParty?.address}</Text>
            <Text style={styles.cardContent}>Registration: {data.thirdParty?.registration}</Text>
          </View>
          {data.registerKeeper?.enabled && (
            <View style={[styles.card, { width: '48%' }]}>
              <Text style={styles.cardTitle}>Register Keeper</Text>
              <Text style={styles.cardContent}>Name: {data.registerKeeper.name}</Text>
              <Text style={styles.cardContent}>Phone: {data.registerKeeper.phone}</Text>
              <Text style={styles.cardContent}>Email: {data.registerKeeper.email}</Text>
              <Text style={styles.cardContent}>
                DOB / Established: {data.registerKeeper.dateOfBirth && formatDate(toJsDate(data.registerKeeper.dateOfBirth))}
              </Text>
              {data.registerKeeper.signature && (
                <Image src={data.registerKeeper.signature} style={{ width: '100%', height: 60, marginTop: 8 }} />
              )}
            </View>
          )}
        </View>

        {/* ========== HIRE DETAILS ========== */}
        {data.hireDetails?.enabled && (
          <View style={styles.section} wrap={false}>
            <Text style={styles.sectionTitle}>Hire Details</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={styles.tableHeaderCell}>Start Date</Text>
                <Text style={styles.tableHeaderCell}>End Date</Text>
                <Text style={styles.tableHeaderCell}>Days</Text>
                <Text style={styles.tableHeaderCell}>Total Cost</Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={styles.tableCell}>{data.hireDetails.startDate ? formatDate(toJsDate(data.hireDetails.startDate)) : 'N/A'}</Text>
                <Text style={styles.tableCell}>{data.hireDetails.endDate ? formatDate(toJsDate(data.hireDetails.endDate)) : 'N/A'}</Text>
                <Text style={styles.tableCell}>{data.hireDetails.daysOfHire ?? 0}</Text>
                <Text style={styles.tableCell}>£{data.hireDetails.totalCost?.toFixed(2) ?? '0.00'}</Text>
              </View>
            </View>
            {data.hireDetails.vehicle && (
               <View style={[styles.card, { marginTop: 5, borderLeftColor: '#3B82F6' }]}>
                 <Text style={styles.cardTitle}>Hire Vehicle</Text>
                 <Text style={styles.cardContent}>Vehicle: {data.hireDetails.vehicle.make} {data.hireDetails.vehicle.model}</Text>
                 <Text style={styles.cardContent}>Registration: {data.hireDetails.vehicle.registration}</Text>
                 <Text style={styles.cardContent}>Rate: £{data.hireDetails.vehicle.claimRate}/day</Text>
               </View>
            )}
          </View>
        )}

        {/* ========== RECOVERY & STORAGE ========== */}
        {(data.recovery?.enabled || data.storage?.enabled) && (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }} wrap={false}>
            {data.recovery?.enabled && (
              <View style={[styles.card, { width: '48%', borderLeftColor: '#EF4444' }]}>
                <Text style={styles.cardTitle}>Recovery Details</Text>
                <Text style={styles.cardContent}>Date: {data.recovery.date ? formatDate(toJsDate(data.recovery.date)) : 'N/A'}</Text>
                <Text style={styles.cardContent}>Pickup: {data.recovery.locationPickup}</Text>
                <Text style={styles.cardContent}>Dropoff: {data.recovery.locationDropoff}</Text>
                <Text style={styles.cardContent}>Cost: £{data.recovery.cost?.toFixed(2) ?? '0.00'}</Text>
              </View>
            )}
            {data.storage?.enabled && (
              <View style={[styles.card, { width: '48%', borderLeftColor: '#F59E0B' }]}>
                <Text style={styles.cardTitle}>Storage Details</Text>
                <Text style={styles.cardContent}>Start: {data.storage.startDate ? formatDate(toJsDate(data.storage.startDate)) : 'N/A'}</Text>
                <Text style={styles.cardContent}>End: {data.storage.endDate ? formatDate(toJsDate(data.storage.endDate)) : 'N/A'}</Text>
                <Text style={styles.cardContent}>Rate: £{data.storage.costPerDay?.toFixed(2)}/day</Text>
                <Text style={styles.cardContent}>Total: £{data.storage.totalCost?.toFixed(2)}</Text>
              </View>
            )}
          </View>
        )}

        {/* ========== GP & HOSPITAL INFO ========== */}
        {(data.gpInformation?.visited || data.hospitalInformation?.visited) && (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }} wrap={false}>
            {data.gpInformation?.visited && (
              <View style={[styles.card, { width: '48%' }]}>
                <Text style={styles.cardTitle}>GP Information</Text>
                <Text style={styles.cardContent}>Name: {data.gpInformation.gpName}</Text>
                <Text style={styles.cardContent}>Doctor: {data.gpInformation.gpDoctorName}</Text>
                <Text style={styles.cardContent}>Address: {data.gpInformation.gpAddress}</Text>
                <Text style={styles.cardContent}>Contact: {data.gpInformation.gpContactNumber}</Text>
                <Text style={styles.cardContent}>Date: {data.gpInformation.gpDate && formatDate(toJsDate(data.gpInformation.gpDate))}</Text>
              </View>
            )}
            {data.hospitalInformation?.visited && (
              <View style={[styles.card, { width: '48%' }]}>
                <Text style={styles.cardTitle}>Hospital Information</Text>
                <Text style={styles.cardContent}>Name: {data.hospitalInformation.hospitalName}</Text>
                <Text style={styles.cardContent}>Doctor: {data.hospitalInformation.hospitalDoctorName}</Text>
                <Text style={styles.cardContent}>Address: {data.hospitalInformation.hospitalAddress}</Text>
                <Text style={styles.cardContent}>Contact: {data.hospitalInformation.hospitalContactNumber}</Text>
                <Text style={styles.cardContent}>Date: {data.hospitalInformation.hospitalDate && formatDate(toJsDate(data.hospitalInformation.hospitalDate))}</Text>
              </View>
            )}
          </View>
        )}

        {/* ========== PASSENGERS ========== */}
        {data.passengers && data.passengers.length > 0 && (
          <View style={styles.section} wrap={false}>
            <Text style={styles.sectionTitle}>Passenger Details</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={styles.tableHeaderCell}>Name</Text>
                <Text style={styles.tableHeaderCell}>DOB</Text>
                <Text style={styles.tableHeaderCell}>Contact</Text>
              </View>
              {data.passengers.map((p, i) => (
                <View key={i} style={styles.tableRow}>
                  <Text style={styles.tableCell}>{p.name}</Text>
                  <Text style={styles.tableCell}>{p.dob}</Text>
                  <Text style={styles.tableCell}>{p.contactNumber}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ========== WITNESSES ========== */}
        {data.witnesses && data.witnesses.length > 0 && (
          <View style={styles.section} wrap={false}>
            <Text style={styles.sectionTitle}>Witness Details</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={styles.tableHeaderCell}>Name</Text>
                <Text style={styles.tableHeaderCell}>DOB</Text>
                <Text style={styles.tableHeaderCell}>Contact</Text>
              </View>
              {data.witnesses.map((w, i) => (
                <View key={i} style={styles.tableRow}>
                  <Text style={styles.tableCell}>{w.name}</Text>
                  <Text style={styles.tableCell}>{w.dob}</Text>
                  <Text style={styles.tableCell}>{w.contactNumber}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ========== POLICE & PARAMEDIC ========== */}
        {(data.policeOfficerName || data.paramedicNames) && (
          <View style={styles.section} wrap={false}>
            <Text style={styles.sectionTitle}>Emergency Response</Text>
            <View style={styles.card}>
              {data.policeOfficerName && (
                <>
                  <Text style={styles.cardContent}>Police Officer: {data.policeOfficerName}</Text>
                  <Text style={styles.cardContent}>Badge #: {data.policeBadgeNumber}</Text>
                  <Text style={styles.cardContent}>Station: {data.policeStation}</Text>
                  <Text style={styles.cardContent}>Incident #: {data.policeIncidentNumber}</Text>
                  <Text style={styles.cardContent}>Contact: {data.policeContactInfo}</Text>
                </>
              )}
              {data.paramedicNames && (
                <>
                  <Text style={styles.cardContent}>Paramedics: {data.paramedicNames}</Text>
                  <Text style={styles.cardContent}>Ambulance Ref: {data.ambulanceReference}</Text>
                  <Text style={styles.cardContent}>Service: {data.ambulanceService}</Text>
                </>
              )}
            </View>
          </View>
        )}

        {/* ========== FILE HANDLERS ========== */}
        <View style={styles.section} wrap={false}>
          <Text style={styles.sectionTitle}>File Handlers</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
             <View style={[styles.card, { width: '48%', borderLeftColor: '#6366F1' }]}>
                <Text style={styles.cardTitle}>AIE Handler</Text>
                <Text style={styles.cardContent}>{data.fileHandlers.aieHandler ?? 'N/A'}</Text>
             </View>
             {data.fileHandlers.legalHandler && (
               <View style={[styles.card, { width: '48%', borderLeftColor: '#8B5CF6' }]}>
                  <Text style={styles.cardTitle}>Legal Handler</Text>
                  <Text style={styles.cardContent}>Name: {data.fileHandlers.legalHandler.name}</Text>
                  <Text style={styles.cardContent}>Email: {data.fileHandlers.legalHandler.email}</Text>
                  <Text style={styles.cardContent}>Phone: {data.fileHandlers.legalHandler.phone}</Text>
               </View>
             )}
          </View>
        </View>

        {/* ========== PROGRESS HISTORY (CARD LIST - BREAKABLE) ========== */}
        <View style={[styles.section, { marginTop: 10, marginBottom: 20 }]}>
          <Text style={styles.sectionTitle}>Progress History</Text>
          
          {sortedHistory.length > 0 ? (
            sortedHistory.map((entry, index) => {
              const safeDate = toJsDate(entry.date);
              const displayIndex = sortedHistory.length - index; 

              return (
                <View 
                  key={index} 
                  // REMOVED 'wrap={false}' so individual cards can break across pages if needed
                  style={[styles.card, { borderLeftColor: '#10B981', marginBottom: 8, padding: 8 }]} 
                >
                  {/* Header: Date + Status */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ fontSize: 9, fontWeight: 'bold', color: '#374151' }}>
                      {format(safeDate, 'dd/MM/yyyy HH:mm')}
                    </Text>
                    <View style={{ 
                        backgroundColor: '#ECFDF5', 
                        paddingHorizontal: 6, 
                        paddingVertical: 2, 
                        borderRadius: 4 
                    }}>
                      <Text style={{ fontSize: 8, color: '#047857', fontWeight: 'bold' }}>{entry.status}</Text>
                    </View>
                  </View>

                  {/* Body: Note (Smaller Font) */}
                  <Text style={[styles.cardContent, { marginBottom: 5, lineHeight: 1.3, fontSize: 9 }]}>
                    {entry.note}
                  </Text>

                  {/* Footer: Author + Index */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 4 }}>
                      <Text style={{ fontSize: 8, color: '#9CA3AF' }}>#{displayIndex}</Text>
                      <Text style={{ fontSize: 8, color: '#6B7280' }}>By: {entry.author}</Text>
                  </View>
                </View>
              );
            })
          ) : (
            <View style={[styles.card, { alignItems: 'center', justifyContent: 'center', padding: 20 }]}>
              <Text style={{ fontSize: 9, color: '#9CA3AF' }}>No progress history recorded.</Text>
            </View>
          )}
        </View>

        {/* ========== FOOTER ========== */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            AIE Claims Ltd. Registered in England and Wales with company registration number: 15616639, Registered office address: United House, 39-41 North Road, London, N7 9DP
          </Text>
          <Text
            style={styles.pageNumber}
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
};

export default ClaimProgressDocument;