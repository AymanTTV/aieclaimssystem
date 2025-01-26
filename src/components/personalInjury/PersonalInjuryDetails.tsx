import React from 'react';
import { PersonalInjury } from '../../types/personalInjury';
import { format } from 'date-fns';
import StatusBadge from '../ui/StatusBadge';

interface PersonalInjuryDetailsProps {
  injury: PersonalInjury;
}

const PersonalInjuryDetails: React.FC<PersonalInjuryDetailsProps> = ({ injury }) => {
  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="border-t pt-6 mt-6 first:border-t-0 first:pt-0 first:mt-0">
      <h3 className="text-lg font-medium text-gray-900 mb-4">{title}</h3>
      {children}
    </div>
  );

  const Field = ({ label, value }: { label: string; value: string | React.ReactNode }) => (
    <div className="mb-4">
      <dt className="text-sm font-medium text-gray-500">{label}</dt>
      <dd className="mt-1 text-sm text-gray-900">{value}</dd>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Status */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Personal Injury Claim
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Reference: PI-{injury.id.slice(-8).toUpperCase()}
          </p>
        </div>
        <StatusBadge status={injury.status} />
      </div>

      {/* Personal Details */}
      <Section title="Personal Details">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Full Name" value={injury.fullName} />
          <Field label="Date of Birth" value={format(injury.dateOfBirth, 'dd/MM/yyyy')} />
          <Field label="Contact Number" value={injury.contactNumber} />
          <Field label="Email Address" value={injury.emailAddress} />
          <div className="col-span-2">
            <Field label="Address" value={
              <>
                {injury.address}
                <br />
                {injury.postcode}
              </>
            } />
          </div>
        </div>
      </Section>

      {/* Incident Details */}
      <Section title="Incident Details">
        <div className="grid grid-cols-2 gap-4">
          <Field 
            label="Date of Incident" 
            value={format(injury.incidentDate, 'dd/MM/yyyy')} 
          />
          <Field label="Time of Incident" value={injury.incidentTime} />
          <div className="col-span-2">
            <Field label="Location" value={injury.incidentLocation} />
          </div>
          <div className="col-span-2">
            <Field label="Description" value={injury.description} />
          </div>
        </div>
      </Section>

      {/* Injury Details */}
      <Section title="Injury Details">
        <Field label="Injuries" value={injury.injuries} />
        <Field 
          label="Medical Treatment" 
          value={injury.receivedMedicalTreatment ? 'Yes' : 'No'} 
        />
        {injury.medicalDetails && (
          <Field label="Medical Details" value={injury.medicalDetails} />
        )}
      </Section>

      {/* Witness Details */}
      {injury.hasWitnesses && injury.witnesses && injury.witnesses.length > 0 && (
        <Section title="Witness Details">
          {injury.witnesses.map((witness, index) => (
            <div key={index} className="mb-4 last:mb-0">
              <h4 className="font-medium">Witness {index + 1}</h4>
              <div className="mt-2 grid grid-cols-2 gap-4">
                <Field label="Name" value={witness.name} />
                <Field label="Contact Information" value={witness.contactInfo} />
              </div>
            </div>
          ))}
        </Section>
      )}

      {/* Additional Information */}
      <Section title="Additional Information">
        <Field 
          label="Reported to Authorities" 
          value={injury.reportedToAuthorities ? 'Yes' : 'No'} 
        />
        {injury.policeReferenceNumber && (
          <Field 
            label="Police Reference Number" 
            value={injury.policeReferenceNumber} 
          />
        )}
        <Field 
          label="Supporting Evidence" 
          value={injury.hasEvidence ? 'Yes' : 'No'} 
        />
      </Section>

      {/* Declaration */}
      <Section title="Declaration">
        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            {injury.signature && (
              <img 
                src={injury.signature} 
                alt="Signature" 
                className="max-h-24 object-contain bg-white rounded border"
              />
            )}
            <p className="text-sm text-gray-500 mt-2">
              Signed on {format(injury.signatureDate, 'dd/MM/yyyy')}
            </p>
          </div>
        </div>
      </Section>

      {/* Audit Information */}
      <div className="text-sm text-gray-500 border-t pt-4">
        <div className="flex justify-between">
          <div>Created: {format(injury.createdAt, 'dd/MM/yyyy HH:mm')}</div>
          <div>Last Updated: {format(injury.updatedAt, 'dd/MM/yyyy HH:mm')}</div>
        </div>
      </div>
    </div>
  );
};

export default PersonalInjuryDetails;
