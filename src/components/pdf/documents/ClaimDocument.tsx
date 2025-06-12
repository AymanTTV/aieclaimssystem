// src/components/pdf/documents/ClaimDocument.tsx
import React from 'react';
import { Document, Page, Text, View, Image } from '@react-pdf/renderer';
import { Claim } from '../../../types';
import { formatDate } from '../../../utils/dateHelpers';
import { styles } from '../styles';
import aieClaimsLogo from '../../../assets/aieclaim.png';
import { doc, getDoc } from 'firebase/firestore';

interface ClaimDocumentProps {
  data: Claim;
}

const ClaimDocument: React.FC<ClaimDocumentProps> = ({ data }) => {
  // fixed header details
  const headerDetails = {
    logoUrl: aieClaimsLogo,
    fullName: 'AIE Claims LTD',
    officialAddress: 'United House, 39-41 North Road, London, N7 9DP',
    phone: '+442080505337',
    email: 'claims@aieclaims.co.uk',
  };

  const licenseNo = data.clientInfo.driverLicenseNumber || 'N/A';
  const licenseExpiry = data.clientInfo.licenseExpiry
    ? formatDate(data.clientInfo.licenseExpiry)
    : 'N/A';

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* ========== HEADER ========== */}
        <View style={styles.header}>
          <Image src={headerDetails.logoUrl} style={styles.logo} />
          <View style={styles.companyInfo}>
            <Text style={styles.companyName}>{headerDetails.fullName}</Text>
            <Text style={styles.companyDetail}>{headerDetails.officialAddress}</Text>
            <Text style={styles.companyDetail}>Tel: {headerDetails.phone}</Text>
            <Text style={styles.companyDetail}>Email: {headerDetails.email}</Text>
          </View>
        </View>

        {/* ========== TITLE ========== */}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Claim Record</Text>
        </View>

        {/* ========== CLIENT & REFERENCE ========== */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }} wrap={false}>
          <View style={[styles.card, { width: '48%' }]}>
            <Text style={styles.cardTitle}>Client Information</Text>
            <Text style={styles.cardContent}>Name: {data.clientInfo.name}</Text>
            <Text style={styles.cardContent}>DOB: {formatDate(data.clientInfo.dateOfBirth)}</Text>
            {/* <Text style={styles.cardContent}>License #: {licenseNo}</Text>
            <Text style={styles.cardContent}>License Expiry: {licenseExpiry}</Text> */}
            <Text style={styles.cardContent}>Address: {data.clientInfo.address}</Text>

            {/* -- only when PI is selected -- */}
            {data.claimReason.includes('PI') && (
              <>
                <Text style={styles.cardContent}>Phone: {data.clientInfo.phone}</Text>
                <Text style={styles.cardContent}>Email: {data.clientInfo.email}</Text>
                <Text style={styles.cardContent}>
                  NI No: {data.clientInfo.nationalInsuranceNumber}
                </Text>
                <Text style={styles.cardContent}>
                  Occupation: {data.clientInfo.occupation ?? 'N/A'}
                </Text>
              </>
            )}

          </View>
          <View style={[styles.card, { width: '48%' }]}>
            <Text style={styles.cardTitle}>Reference Details</Text>
            {data.clientRef && <Text style={styles.cardContent}>Client Ref: {data.clientRef}</Text>}
            <Text style={styles.cardContent}>Type: {data.claimType}</Text>
            <Text style={styles.cardContent}>Reason: {data.claimReason.join(', ')}</Text>
            <Text style={styles.cardContent}>Case Progress: {data.caseProgress}</Text>
            <Text style={styles.cardContent}>Status: {data.progress}</Text>
          </View>
        </View>

        {/* ========== CLIENT VEHICLE ========== */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Client Vehicle</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.tableHeaderCell}>Registration</Text>
              <Text style={styles.tableHeaderCell}>MOT Expiry</Text>
              <Text style={styles.tableHeaderCell}>Road Tax Expiry</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.tableCell}>{data.clientVehicle.registration}</Text>
              <Text style={styles.tableCell}>{formatDate(data.clientVehicle.motExpiry)}</Text>
              <Text style={styles.tableCell}>{formatDate(data.clientVehicle.roadTaxExpiry)}</Text>
            </View>
          </View>
        </View>

        {/* ========== ACCIDENT DETAILS ========== */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Accident Details</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.tableHeaderCell}>Date</Text>
              <Text style={styles.tableHeaderCell}>Time</Text>
              <Text style={styles.tableHeaderCell}>Location</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.tableCell}>{formatDate(data.incidentDetails.date)}</Text>
              <Text style={styles.tableCell}>{data.incidentDetails.time}</Text>
              <Text style={styles.tableCell}>{data.incidentDetails.location}</Text>
            </View>
          </View>
          <View style={[styles.card, { borderLeftColor: '#F59E0B' }]}>
            <Text style={styles.cardTitle}> Description</Text>
            {/* <Text style={styles.cardContent}>{data.incidentDetails.damageDetails}</Text> */}
            <Text style={[styles.cardContent, { marginTop: 5 }]}>{data.incidentDetails.description}</Text>
          </View>
        </View>

        {/* ========== INJURY DETAILS (only for PI) ========== */}
        {data.claimReason.includes('PI') && (
          <View style={[styles.card, { borderLeftColor: '#F87171', marginBottom: 20 }]}>
            <Text style={styles.cardTitle}>Injury Details</Text>
            <Text style={[styles.cardContent, { marginTop: 5 }]}>
              {data.clientInfo.injuryDetails ?? 'N/A'}
            </Text>
          </View>
        )}

        {/* ========== THIRD PARTY & REGISTER KEEPER ========== */}
<View
  style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}
  wrap={false}
>
  {/* Third Party */}
  <View style={[styles.card, { width: '48%' }]}>
    <Text style={styles.cardTitle}>Third Party Information</Text>
    <Text style={styles.cardContent}>Name: {data.thirdParty.name}</Text>
    <Text style={styles.cardContent}>Phone: {data.thirdParty.phone}</Text>
    <Text style={styles.cardContent}>Email: {data.thirdParty.email}</Text>
    <Text style={styles.cardContent}>Address: {data.thirdParty.address}</Text>
    <Text style={styles.cardContent}>Registration: {data.thirdParty.registration}</Text>
  </View>

  {/* Register Keeper (only if enabled) */}
  {data.registerKeeper?.enabled && (
    <View style={[styles.card, { width: '48%' }]}>
      <Text style={styles.cardTitle}>Register Keeper</Text>
      <Text style={styles.cardContent}>Name: {data.registerKeeper.name}</Text>
      <Text style={styles.cardContent}>Phone: {data.registerKeeper.phone}</Text>
      <Text style={styles.cardContent}>Email: {data.registerKeeper.email}</Text>
      <Text style={styles.cardContent}>
        DOB / Established:{' '}
        {data.registerKeeper.dateOfBirth && formatDate(data.registerKeeper.dateOfBirth)}
      </Text>
      {data.registerKeeper.signature && (
        <Image
          src={data.registerKeeper.signature}
          style={{ width: '100%', height: 60, marginTop: 8 }}
        />
      )}
    </View>
  )}
</View>


        {/* GP and Hospital Info Side by Side */}
    {(data.gpInformation?.visited || data.hospitalInformation?.visited) && (
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }} wrap={false}>
        {data.gpInformation?.visited && (
          <View style={[styles.card, { width: '48%' }]}>
            <Text style={styles.cardTitle}>GP Information</Text>
            <Text style={styles.cardContent}>Name: {data.gpInformation.gpName}</Text>
            <Text style={styles.cardContent}>Doctor: {data.gpInformation.gpDoctorName}</Text>
            <Text style={styles.cardContent}>Address: {data.gpInformation.gpAddress}</Text>
            <Text style={styles.cardContent}>Contact: {data.gpInformation.gpContactNumber}</Text>
            <Text style={styles.cardContent}>Date: {data.gpInformation.gpDate && formatDate(data.gpInformation.gpDate)}</Text>
            <Text style={styles.cardContent}>Notes: {data.gpInformation.gpNotes}</Text>
          </View>
        )}

        {data.hospitalInformation?.visited && (
          <View style={[styles.card, { width: '48%' }]}>
            <Text style={styles.cardTitle}>Hospital Information</Text>
            <Text style={styles.cardContent}>Name: {data.hospitalInformation.hospitalName}</Text>
            <Text style={styles.cardContent}>Doctor: {data.hospitalInformation.hospitalDoctorName}</Text>
            <Text style={styles.cardContent}>Address: {data.hospitalInformation.hospitalAddress}</Text>
            <Text style={styles.cardContent}>Contact: {data.hospitalInformation.hospitalContactNumber}</Text>
            <Text style={styles.cardContent}>Date: {data.hospitalInformation.hospitalDate && formatDate(data.hospitalInformation.hospitalDate)}</Text>
            <Text style={styles.cardContent}>Notes: {data.hospitalInformation.hospitalNotes}</Text>
          </View>
        )}
      </View>
    )}

    {/* Passengers Table */}
    {data.passengers && data.passengers.length > 0 && (
      <View style={styles.section}>
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

    {/* Witnesses Table */}
    {data.witnesses && data.witnesses.length > 0 && (
      <View style={styles.section}>
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

    {/* Police & Paramedic */}
    {(data.policeOfficerName || data.paramedicNames) && (
      <View style={styles.section}>
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

    {/* Evidence Images Only */}
    {/* {data.evidence.images.length > 0 && (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Evidence Images</Text>
        <View style={styles.grid}>
          {data.evidence.images.map((url, idx) => (
            <View key={idx} style={styles.gridItem}>
              <Image src={url} style={styles.vehicleImage} />
            </View>
          ))}
        </View>
      </View>
    )} */}

        {/* ========== FOOTER ========== */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            AIE Claims Ltd. Registered in England and Wales with company registration number: 15616639
          </Text>
          <Text style={styles.footerText}>
            Registered office address: United House, 39-41 North Road, London, N7 9DP
          </Text>
        </View>
      </Page>
    </Document>
  );
};

export default ClaimDocument;
