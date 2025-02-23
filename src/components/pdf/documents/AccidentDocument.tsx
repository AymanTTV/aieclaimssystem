import React from 'react';
import { Text, View, Image } from '@react-pdf/renderer';
import { Accident } from '../../../types';
import BaseDocument from '../BaseDocument';
import { formatDate } from '../../../utils/dateHelpers';
import { styles } from '../styles';

interface AccidentDocumentProps {
  data: Accident;
  companyDetails: any;
}

const AccidentDocument: React.FC<AccidentDocumentProps> = ({ data, companyDetails }) => (
  <BaseDocument title="Accident Report" companyDetails={companyDetails}>
    {/* Reference Information */}
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Reference Information</Text>
      <View style={styles.infoCard}>
        <View style={styles.row}>
          <Text style={styles.label}>Reference No:</Text>
          <Text style={styles.value}>{data.refNo}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Reference Name:</Text>
          <Text style={styles.value}>{data.referenceName}</Text>
        </View>
      </View>
    </View>

    {/* Driver Details */}
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Driver Details</Text>
      <View style={styles.card}>
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
          <Text style={styles.label}>Date of Birth:</Text>
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

    {/* Vehicle Details */}
    <View style={styles.section}>
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
          <Text style={styles.label}>Insurance Company:</Text>
          <Text style={styles.value}>{data.insuranceCompany}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Policy Number:</Text>
          <Text style={styles.value}>{data.policyNumber}</Text>
        </View>
        {data.policyExcess && (
          <View style={styles.row}>
            <Text style={styles.label}>Policy Excess:</Text>
            <Text style={styles.value}>£{data.policyExcess}</Text>
          </View>
        )}
      </View>
    </View>

    {/* Accident Details */}
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Accident Details</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.label}>Date:</Text>
          <Text style={styles.value}>{data.accidentDate}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Time:</Text>
          <Text style={styles.value}>{data.accidentTime}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Location:</Text>
          <Text style={styles.value}>{data.accidentLocation}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Description:</Text>
          <Text style={styles.value}>{data.description}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Damage Details:</Text>
          <Text style={styles.value}>{data.damageDetails}</Text>
        </View>
      </View>
    </View>

    {/* Fault Party Details */}
    <View style={styles.section}>
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
            <Text style={styles.label}>Insurance:</Text>
            <Text style={styles.value}>{data.faultPartyInsurance}</Text>
          </View>
        )}
      </View>
    </View>

    {/* Passengers */}
    {data.passengers && data.passengers.length > 0 && (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Passenger Details</Text>
        {data.passengers.map((passenger, index) => (
          <View key={index} style={styles.card}>
            <Text style={styles.cardTitle}>Passenger {index + 1}</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Name:</Text>
              <Text style={styles.value}>{passenger.name}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Address:</Text>
              <Text style={styles.value}>{passenger.address}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Post Code:</Text>
              <Text style={styles.value}>{passenger.postCode}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Date of Birth:</Text>
              <Text style={styles.value}>{passenger.dob}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Contact:</Text>
              <Text style={styles.value}>{passenger.contactNumber}</Text>
            </View>
          </View>
        ))}
      </View>
    )}

    {/* Witnesses */}
    {data.witnesses && data.witnesses.length > 0 && (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Witness Details</Text>
        {data.witnesses.map((witness, index) => (
          <View key={index} style={styles.card}>
            <Text style={styles.cardTitle}>Witness {index + 1}</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Name:</Text>
              <Text style={styles.value}>{witness.name}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Address:</Text>
              <Text style={styles.value}>{witness.address}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Post Code:</Text>
              <Text style={styles.value}>{witness.postCode}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Date of Birth:</Text>
              <Text style={styles.value}>{witness.dob}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Contact:</Text>
              <Text style={styles.value}>{witness.contactNumber}</Text>
            </View>
          </View>
        ))}
      </View>
    )}

    {/* Police Information */}
    {data.policeOfficerName && (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Police Information</Text>
        <View style={styles.infoCard}>
          <View style={styles.row}>
            <Text style={styles.label}>Officer Name:</Text>
            <Text style={styles.value}>{data.policeOfficerName}</Text>
          </View>
          {data.policeBadgeNumber && (
            <View style={styles.row}>
              <Text style={styles.label}>Badge Number:</Text>
              <Text style={styles.value}>{data.policeBadgeNumber}</Text>
            </View>
          )}
          {data.policeStation && (
            <View style={styles.row}>
              <Text style={styles.label}>Police Station:</Text>
              <Text style={styles.value}>{data.policeStation}</Text>
            </View>
          )}
          {data.policeIncidentNumber && (
            <View style={styles.row}>
              <Text style={styles.label}>Incident Number:</Text>
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

    {/* Paramedic Information */}
    {data.paramedicNames && (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Paramedic Information</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.label}>Paramedic Names:</Text>
            <Text style={styles.value}>{data.paramedicNames}</Text>
          </View>
          {data.ambulanceReference && (
            <View style={styles.row}>
              <Text style={styles.label}>Ambulance Reference:</Text>
              <Text style={styles.value}>{data.ambulanceReference}</Text>
            </View>
          )}
          {data.ambulanceService && (
            <View style={styles.row}>
              <Text style={styles.label}>Ambulance Service:</Text>
              <Text style={styles.value}>{data.ambulanceService}</Text>
            </View>
          )}
        </View>
      </View>
    )}

    {/* Images */}
    {data.images && data.images.length > 0 && (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Accident Images</Text>
        <View style={styles.grid}>
          {data.images.map((url, index) => (
            <View key={index} style={styles.gridItem}>
              <Image src={url} style={styles.vehicleImage} />
            </View>
          ))}
        </View>
      </View>
    )}

    {/* Terms and Conditions */}
    {companyDetails.accidentTerms && (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Terms & Conditions</Text>
        <Text style={styles.text}>{companyDetails.accidentTerms}</Text>
      </View>
    )}
  </BaseDocument>
);

export default AccidentDocument;