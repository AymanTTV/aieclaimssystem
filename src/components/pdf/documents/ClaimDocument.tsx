import React from 'react';
import { Text, View, Image } from '@react-pdf/renderer';
import { Claim } from '../../../types';
import BaseDocument from '../BaseDocument';
import { formatDate } from '../../../utils/dateHelpers';
import { styles } from '../styles';

interface ClaimDocumentProps {
  data: Claim;
  companyDetails: any;
}

const ClaimDocument: React.FC<ClaimDocumentProps> = ({ data, companyDetails }) => (
  <BaseDocument title="Claim Record" companyDetails={companyDetails}>
    {/* Reference Information */}
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Reference Information</Text>
      <View style={styles.infoCard}>
        {data.clientRef && (
          <View style={styles.row}>
            <Text style={styles.label}>Client Reference:</Text>
            <Text style={styles.value}>{data.clientRef}</Text>
          </View>
        )}
        <View style={styles.row}>
          <Text style={styles.label}>Submitter Type:</Text>
          <Text style={styles.value}>{data.submitterType}</Text>
        </View>
      </View>
    </View>

    {/* Client Information */}
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Client Information</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.label}>Name:</Text>
          <Text style={styles.value}>{data.clientInfo.name}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Phone:</Text>
          <Text style={styles.value}>{data.clientInfo.phone}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Email:</Text>
          <Text style={styles.value}>{data.clientInfo.email}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Date of Birth:</Text>
          <Text style={styles.value}>{formatDate(data.clientInfo.dateOfBirth)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>NI Number:</Text>
          <Text style={styles.value}>{data.clientInfo.nationalInsuranceNumber}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Address:</Text>
          <Text style={styles.value}>{data.clientInfo.address}</Text>
        </View>
      </View>
    </View>

    {/* Vehicle Details */}
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Vehicle Details</Text>
      <View style={styles.infoCard}>
        <View style={styles.row}>
          <Text style={styles.label}>Registration:</Text>
          <Text style={styles.value}>{data.clientVehicle.registration}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>MOT Expiry:</Text>
          <Text style={styles.value}>{formatDate(data.clientVehicle.motExpiry)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Road Tax Expiry:</Text>
          <Text style={styles.value}>{formatDate(data.clientVehicle.roadTaxExpiry)}</Text>
        </View>
      </View>
    </View>

    {/* Incident Details */}
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Incident Details</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.label}>Date:</Text>
          <Text style={styles.value}>{formatDate(data.incidentDetails.date)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Time:</Text>
          <Text style={styles.value}>{data.incidentDetails.time}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Location:</Text>
          <Text style={styles.value}>{data.incidentDetails.location}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Description:</Text>
          <Text style={styles.value}>{data.incidentDetails.description}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Damage Details:</Text>
          <Text style={styles.value}>{data.incidentDetails.damageDetails}</Text>
        </View>
      </View>
    </View>

    {/* Third Party Details */}
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Third Party Details</Text>
      <View style={styles.infoCard}>
        <View style={styles.row}>
          <Text style={styles.label}>Name:</Text>
          <Text style={styles.value}>{data.thirdParty.name}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Phone:</Text>
          <Text style={styles.value}>{data.thirdParty.phone}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Email:</Text>
          <Text style={styles.value}>{data.thirdParty.email}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Address:</Text>
          <Text style={styles.value}>{data.thirdParty.address}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Registration:</Text>
          <Text style={styles.value}>{data.thirdParty.registration}</Text>
        </View>
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

    {/* Evidence */}
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Evidence</Text>
      
      {/* Images */}
      {data.evidence.images.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Images</Text>
          <View style={styles.grid}>
            {data.evidence.images.map((url, index) => (
              <View key={index} style={styles.gridItem}>
                <Image src={url} style={styles.vehicleImage} />
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Videos */}
      {data.evidence.videos.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Videos</Text>
          <Text style={styles.text}>
            {data.evidence.videos.length} video(s) available in digital format
          </Text>
        </View>
      )}

      {/* Vehicle Photos */}
      {data.evidence.clientVehiclePhotos.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Vehicle Photos</Text>
          <View style={styles.grid}>
            {data.evidence.clientVehiclePhotos.map((url, index) => (
              <View key={index} style={styles.gridItem}>
                <Image src={url} style={styles.vehicleImage} />
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Documents */}
      {(data.evidence.engineerReport.length > 0 ||
        data.evidence.bankStatement.length > 0 ||
        data.evidence.adminDocuments.length > 0) && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Documents</Text>
          {data.evidence.engineerReport.map((url, index) => (
            <Text key={index} style={styles.text}>Engineer Report {index + 1}</Text>
          ))}
          {data.evidence.bankStatement.map((url, index) => (
            <Text key={index} style={styles.text}>Bank Statement {index + 1}</Text>
          ))}
          {data.evidence.adminDocuments.map((url, index) => (
            <Text key={index} style={styles.text}>Admin Document {index + 1}</Text>
          ))}
        </View>
      )}
    </View>

    {/* File Handlers */}
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>File Handlers</Text>
      <View style={styles.infoCard}>
        <View style={styles.row}>
          <Text style={styles.label}>AIE Handler:</Text>
          <Text style={styles.value}>{data.fileHandlers.aieHandler}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Legal Handler:</Text>
          <Text style={styles.value}>{data.fileHandlers.legalHandler}</Text>
        </View>
      </View>
    </View>

    {/* Status and Progress */}
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Status Information</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.label}>Claim Type:</Text>
          <Text style={styles.value}>{data.claimType}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Claim Reason:</Text>
          <Text style={styles.value}>{data.claimReason}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Case Progress:</Text>
          <Text style={styles.value}>{data.caseProgress}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Current Progress:</Text>
          <Text style={styles.value}>{data.progress}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Status Description:</Text>
          <Text style={styles.value}>{data.statusDescription}</Text>
        </View>
      </View>
    </View>

    {/* Progress History */}
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Progress History</Text>
      {data.progressHistory.map((progress, index) => (
        <View key={index} style={styles.infoCard}>
          <View style={styles.row}>
            <Text style={styles.label}>Status:</Text>
            <Text style={styles.value}>{progress.status}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Note:</Text>
            <Text style={styles.value}>{progress.note}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Date:</Text>
            <Text style={styles.value}>{formatDate(progress.date)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>By:</Text>
            <Text style={styles.value}>{progress.author}</Text>
          </View>
        </View>
      ))}
    </View>

    {/* Signature Section */}
    {data.clientInfo.signature && (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Signatures</Text>
        <View style={styles.signatureSection}>
          <View style={styles.signatureBox}>
            <Text>Client Signature:</Text>
            <Image src={data.clientInfo.signature} style={styles.signature} />
            <Text style={styles.signatureLine}>{data.clientInfo.name}</Text>
          </View>
          {companyDetails.signature && (
            <View style={styles.signatureBox}>
              <Text>Company Representative:</Text>
              <Image src={companyDetails.signature} style={styles.signature} />
              <Text style={styles.signatureLine}>For and on behalf of {companyDetails.fullName}</Text>
            </View>
          )}
        </View>
      </View>
    )}

    {/* Record Information */}
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Record Information</Text>
      <View style={styles.infoCard}>
        <View style={styles.row}>
          <Text style={styles.label}>Submitted At:</Text>
          <Text style={styles.value}>{formatDate(data.submittedAt)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Last Updated:</Text>
          <Text style={styles.value}>{formatDate(data.updatedAt)}</Text>
        </View>
      </View>
    </View>
  </BaseDocument>
);

export default ClaimDocument;