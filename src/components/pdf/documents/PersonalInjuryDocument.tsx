import React from 'react';
import { Text, View, Image } from '@react-pdf/renderer';
import { PersonalInjury } from '../../../types/personalInjury';
import BaseDocument from '../BaseDocument';
import { formatDate } from '../../../utils/dateHelpers';
import { styles } from '../styles';

interface PersonalInjuryDocumentProps {
  data: PersonalInjury;
  companyDetails: any;
}

const PersonalInjuryDocument: React.FC<PersonalInjuryDocumentProps> = ({ data, companyDetails }) => (
  <BaseDocument title="Personal Injury Report" companyDetails={companyDetails}>
    {/* Reference Information */}
    {data.reference && (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Reference Information</Text>
        <View style={styles.infoCard}>
          <View style={styles.row}>
            <Text style={styles.label}>Reference Number:</Text>
            <Text style={styles.value}>{data.reference}</Text>
          </View>
        </View>
      </View>
    )}

    {/* Personal Details */}
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Personal Information</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.label}>Full Name:</Text>
          <Text style={styles.value}>{data.fullName}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Date of Birth:</Text>
          <Text style={styles.value}>{formatDate(data.dateOfBirth)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Contact Number:</Text>
          <Text style={styles.value}>{data.contactNumber}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Email Address:</Text>
          <Text style={styles.value}>{data.emailAddress}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Address:</Text>
          <Text style={styles.value}>{data.address}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Post Code:</Text>
          <Text style={styles.value}>{data.postcode}</Text>
        </View>
      </View>
    </View>

    {/* Incident Details */}
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Incident Details</Text>
      <View style={styles.infoCard}>
        <View style={styles.row}>
          <Text style={styles.label}>Date:</Text>
          <Text style={styles.value}>{formatDate(data.incidentDate)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Time:</Text>
          <Text style={styles.value}>{data.incidentTime}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Location:</Text>
          <Text style={styles.value}>{data.incidentLocation}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Description:</Text>
          <Text style={styles.value}>{data.description}</Text>
        </View>
      </View>
    </View>

    {/* Injury Details */}
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Injury Details</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.label}>Injuries:</Text>
          <Text style={styles.value}>{data.injuries}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Medical Treatment:</Text>
          <Text style={styles.value}>{data.receivedMedicalTreatment ? 'Yes' : 'No'}</Text>
        </View>
        {data.medicalDetails && (
          <View style={styles.row}>
            <Text style={styles.label}>Medical Details:</Text>
            <Text style={styles.value}>{data.medicalDetails}</Text>
          </View>
        )}
      </View>
    </View>

    {/* Witness Information */}
    {data.hasWitnesses && data.witnesses && data.witnesses.length > 0 && (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Witness Information</Text>
        {data.witnesses.map((witness, index) => (
          <View key={index} style={styles.infoCard}>
            <Text style={styles.cardTitle}>Witness {index + 1}</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Name:</Text>
              <Text style={styles.value}>{witness.name}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Contact Info:</Text>
              <Text style={styles.value}>{witness.contactInfo}</Text>
            </View>
          </View>
        ))}
      </View>
    )}

    {/* Additional Information */}
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Additional Information</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.label}>Reported to Authorities:</Text>
          <Text style={styles.value}>{data.reportedToAuthorities ? 'Yes' : 'No'}</Text>
        </View>
        {data.policeReferenceNumber && (
          <View style={styles.row}>
            <Text style={styles.label}>Police Reference:</Text>
            <Text style={styles.value}>{data.policeReferenceNumber}</Text>
          </View>
        )}
        <View style={styles.row}>
          <Text style={styles.label}>Supporting Evidence:</Text>
          <Text style={styles.value}>{data.hasEvidence ? 'Yes' : 'No'}</Text>
        </View>
      </View>
    </View>

    {/* Evidence Files */}
    {data.evidenceFiles && data.evidenceFiles.length > 0 && (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Evidence Files</Text>
        <View style={styles.grid}>
          {data.evidenceFiles.map((url, index) => (
            <View key={index} style={styles.gridItem}>
              <Image src={url} style={styles.vehicleImage} />
            </View>
          ))}
        </View>
      </View>
    )}

    {/* Status History */}
    {data.statusHistory && data.statusHistory.length > 0 && (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Status History</Text>
        {data.statusHistory.map((status, index) => (
          <View key={index} style={styles.infoCard}>
            <View style={styles.row}>
              <Text style={styles.label}>Status:</Text>
              <Text style={styles.value}>{status.status}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Notes:</Text>
              <Text style={styles.value}>{status.notes}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Updated:</Text>
              <Text style={styles.value}>{formatDate(status.updatedAt)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>By:</Text>
              <Text style={styles.value}>{status.updatedBy}</Text>
            </View>
          </View>
        ))}
      </View>
    )}

    {/* Declaration */}
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Declaration</Text>
      <View style={styles.signatureSection}>
        <View style={styles.signatureBox}>
          <Text>Claimant Signature:</Text>
          {data.signature && (
            <Image src={data.signature} style={styles.signature} />
          )}
          <Text style={styles.signatureLine}>{data.fullName}</Text>
          <Text>Date: {formatDate(data.signatureDate)}</Text>
        </View>
        {companyDetails.signature && (
          <View style={styles.signatureBox}>
            <Text>Company Representative:</Text>
            <Image src={companyDetails.signature} style={styles.signature} />
            <Text style={styles.signatureLine}>For and on behalf of {companyDetails.fullName}</Text>
            <Text>Date: {formatDate(new Date())}</Text>
          </View>
        )}
      </View>
    </View>

    {/* Terms and Conditions */}
    {companyDetails.personalInjuryTerms && (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Terms & Conditions</Text>
        <Text style={styles.text}>{companyDetails.personalInjuryTerms}</Text>
      </View>
    )}

    {/* Record Information */}
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Record Information</Text>
      <View style={styles.infoCard}>
        <View style={styles.row}>
          <Text style={styles.label}>Status:</Text>
          <Text style={styles.value}>{data.status}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Created:</Text>
          <Text style={styles.value}>{formatDate(data.createdAt)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Last Updated:</Text>
          <Text style={styles.value}>{formatDate(data.updatedAt)}</Text>
        </View>
      </View>
    </View>
  </BaseDocument>
);

export default PersonalInjuryDocument;