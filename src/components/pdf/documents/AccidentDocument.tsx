// src/components/pdf/documents/AccidentDocument.tsx
import React from 'react';
import { Text, View, Image } from '@react-pdf/renderer';
import { Accident } from '../../../types';
import BaseDocument from '../BaseDocument';
import { styles } from '../styles';
import { formatDate } from '../../../utils/dateHelpers';

interface AccidentDocumentProps {
  data: Accident;
  companyDetails: any;
}

const AccidentDocument: React.FC<AccidentDocumentProps> = ({ data, companyDetails }) => (
  <BaseDocument title="Accident Report" companyDetails={companyDetails}>
    <View style={styles.section}>
      <Text style={{ ...styles.sectionTitle, marginBottom: 8 }}>Reference No: {data.refNo}</Text>
    </View>

    {/* ===== Vehicle & Driver Details Side-by-Side ===== */}
    <View style={[styles.section, { flexDirection: 'row', justifyContent: 'space-between' }, styles.sectionBreak]}>
      {/* Vehicle Details Card */}
      <View style={{ width: '48%' }}>
        <Text style={styles.sectionTitle}>Vehicle Details</Text>
        <View style={styles.infoCard}>
          <View style={styles.row}>
            <Text style={styles.label}>Make:</Text>
            <Text style={styles.value}>{data.vehicleMake}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Model:</Text>
            <Text style={styles.value}>{data.vehicleModel}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>VRN:</Text>
            <Text style={styles.value}>{data.vehicleVRN}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Insurer:</Text>
            <Text style={styles.value}>{data.insuranceCompany}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Policy #:</Text>
            <Text style={styles.value}>{data.policyNumber}</Text>
          </View>
          {data.policyExcess && (
            <View style={styles.row}>
              <Text style={styles.label}>Excess:</Text>
              <Text style={styles.value}>£{data.policyExcess}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Driver Details Card */}
      <View style={{ width: '48%' }}>
        <Text style={styles.sectionTitle}>Driver Details</Text>
        <View style={styles.infoCard}>
          <View style={styles.row}>
            <Text style={styles.label}>Name:</Text>
            <Text style={styles.value}>{data.driverName}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Address:</Text>
            <Text style={styles.value}>{data.driverAddress}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Post Code:</Text>
            <Text style={styles.value}>{data.driverPostCode}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>DOB:</Text>
            <Text style={styles.value}>{data.driverDOB}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Phone:</Text>
            <Text style={styles.value}>{data.driverPhone}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Mobile:</Text>
            <Text style={styles.value}>{data.driverMobile}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>NIN:</Text>
            <Text style={styles.value}>{data.driverNIN}</Text>
          </View>
        </View>
      </View>
    </View>

    {/* ===== Accident Details (full-width, keep together) ===== */}
    <View style={[styles.section, styles.sectionBreak]}>
      <Text style={styles.sectionTitle}>Accident Details</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.label}>Date:</Text>
          <Text style={styles.value}>{formatDate(data.accidentDate)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Time:</Text>
          <Text style={styles.value}>{data.accidentTime}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Location:</Text>
          <Text style={styles.value}>{data.accidentLocation}</Text>
        </View>
        <View style={[styles.row, { marginTop: 8 }]}>
          <Text style={styles.label}>Description:</Text>
        </View>
        <View style={{ paddingLeft: 50, paddingRight: 10 }}>
          <Text style={styles.value}>{data.description}</Text>
        </View>
        <View style={[styles.row, { marginTop: 8 }]}>
          <Text style={styles.label}>Damage Details:</Text>
        </View>
        <View style={{ paddingLeft: 50, paddingRight: 10 }}>
          <Text style={styles.value}>{data.damageDetails}</Text>
        </View>
      </View>
    </View>

    {/* ===== Fault Party Details (full-width, keep together) ===== */}
    <View style={[styles.section, styles.sectionBreak]}>
      <Text style={styles.sectionTitle}>Fault Party Details</Text>
      <View style={styles.infoCard}>
        <View style={styles.row}>
          <Text style={styles.label}>Name:</Text>
          <Text style={styles.value}>{data.faultPartyName}</Text>
        </View>
        {data.faultPartyAddress && (
          <View style={styles.row}>
            <Text style={styles.label}>Address:</Text>
            <Text style={styles.value}>{data.faultPartyAddress}</Text>
          </View>
        )}
        {data.faultPartyPostCode && (
          <View style={styles.row}>
            <Text style={styles.label}>Post Code:</Text>
            <Text style={styles.value}>{data.faultPartyPostCode}</Text>
          </View>
        )}
        {data.faultPartyPhone && (
          <View style={styles.row}>
            <Text style={styles.label}>Phone:</Text>
            <Text style={styles.value}>{data.faultPartyPhone}</Text>
          </View>
        )}
        {data.faultPartyVehicle && (
          <View style={styles.row}>
            <Text style={styles.label}>Vehicle:</Text>
            <Text style={styles.value}>{data.faultPartyVehicle}</Text>
          </View>
        )}
        <View style={styles.row}>
          <Text style={styles.label}>VRN:</Text>
          <Text style={styles.value}>{data.faultPartyVRN}</Text>
        </View>
        {data.faultPartyInsurance && (
          <View style={styles.row}>
            <Text style={styles.label}>Insurer:</Text>
            <Text style={styles.value}>{data.faultPartyInsurance}</Text>
          </View>
        )}

        {/* description field */}
        {data.faultPartyDescription && (
          <>
            <View style={[styles.row, { marginTop: 8 }]}>
              <Text style={styles.label}>Description:</Text>
            </View>
            <View style={{ paddingLeft: 50, paddingRight: 10 }}>
              <Text style={styles.value}>{data.faultPartyDescription}</Text>
            </View>
          </>
        )}
      </View>
    </View>

    {/* ===== Passenger Details ===== */}
    {data.passengers?.length > 0 && (
      <View style={[styles.section, styles.sectionBreak]}>
        <Text style={styles.sectionTitle}>Passenger Details</Text>
        {data.passengers.map((p, i) => (
          <View key={i} style={styles.card}>
            <Text style={styles.cardTitle}>Passenger {i+1}</Text>
            {[
              ['Name', p.name],
              ['Address', p.address],
              ['Post Code', p.postCode],
              ['DOB', p.dob],
              ['Contact', p.contactNumber]
            ].map(([label, val]) => (
              <View style={styles.row} key={label}>
                <Text style={styles.label}>{label}:</Text>
                <Text style={styles.value}>{val}</Text>
              </View>
            ))}
          </View>
        ))}
      </View>
    )}

    {/* ===== Witness Details ===== */}
    {data.witnesses?.length > 0 && (
      <View style={[styles.section, styles.sectionBreak]}>
        <Text style={styles.sectionTitle}>Witness Details</Text>
        {data.witnesses.map((w, i) => (
          <View key={i} style={styles.card}>
            <Text style={styles.cardTitle}>Witness {i+1}</Text>
            {[
              ['Name', w.name],
              ['Address', w.address],
              ['Post Code', w.postCode],
              ['DOB', w.dob],
              ['Contact', w.contactNumber]
            ].map(([label, val]) => (
              <View style={styles.row} key={label}>
                <Text style={styles.label}>{label}:</Text>
                <Text style={styles.value}>{val}</Text>
              </View>
            ))}
          </View>
        ))}
      </View>
    )}

    {/* ===== Police Information ===== */}
    {data.policeOfficerName && (
      <View style={[styles.section, styles.sectionBreak]}>
        <Text style={styles.sectionTitle}>Police Information</Text>
        <View style={styles.infoCard}>
          <View style={styles.row}>
            <Text style={styles.label}>Officer Name:</Text>
            <Text style={styles.value}>{data.policeOfficerName}</Text>
          </View>
          {data.policeBadgeNumber && (
            <View style={styles.row}>
              <Text style={styles.label}>Badge #:</Text>
              <Text style={styles.value}>{data.policeBadgeNumber}</Text>
            </View>
          )}
          {data.policeStation && (
            <View style={styles.row}>
              <Text style={styles.label}>Station:</Text>
              <Text style={styles.value}>{data.policeStation}</Text>
            </View>
          )}
          {data.policeIncidentNumber && (
            <View style={styles.row}>
              <Text style={styles.label}>Incident #:</Text>
              <Text style={styles.value}>{data.policeIncidentNumber}</Text>
            </View>
          )}
          {data.policeContactInfo && (
            <View style={styles.row}>
              <Text style={styles.label}>Contact Info:</Text>
              <Text style={styles.value}>{data.policeContactInfo}</Text>
            </View>
          )}
        </View>
      </View>
    )}

    {/* ===== Paramedic Information ===== */}
    {data.paramedicNames && (
      <View style={[styles.section, styles.sectionBreak]}>
        <Text style={styles.sectionTitle}>Paramedic Information</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.label}>Paramedic Names:</Text>
            <Text style={styles.value}>{data.paramedicNames}</Text>
          </View>
          {data.ambulanceReference && (
            <View style={styles.row}>
              <Text style={styles.label}>Ambulance Ref:</Text>
              <Text style={styles.value}>{data.ambulanceReference}</Text>
            </View>
          )}
          {data.ambulanceService && (
            <View style={styles.row}>
              <Text style={styles.label}>Service:</Text>
              <Text style={styles.value}>{data.ambulanceService}</Text>
            </View>
          )}
        </View>
      </View>
    )}

    {/* ===== Images (last) ===== */}
    {data.images?.length > 0 && (
      <View style={[styles.section, styles.pageBreak]}>
        <Text style={styles.sectionTitle}>Accident Images</Text>
        <View style={styles.grid}>
          {data.images.map((url, i) => (
            <View key={i} style={styles.gridItem}>
              <Image src={url} style={styles.vehicleImage} />
            </View>
          ))}
        </View>
      </View>
    )}
  </BaseDocument>
);

export default AccidentDocument;
