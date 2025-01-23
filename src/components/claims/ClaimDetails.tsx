import React from 'react';
import { Claim } from '../../types';
import { format } from 'date-fns';
import StatusBadge from '../ui/StatusBadge';
import { 
  User, 
  Car, 
  Calendar, 
  MapPin, 
  FileText, 
  Upload,
  DollarSign,
  Clock,
  AlertTriangle
} from 'lucide-react';

interface ClaimDetailsProps {
  claim: Claim;
  onUpdate: () => void;
}

const ClaimDetails: React.FC<ClaimDetailsProps> = ({ claim, onUpdate }) => {
  const formatDate = (date: Date): string => {
    return format(date, 'dd/MM/yyyy');
  };

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="border-t pt-6 mt-6 first:border-t-0 first:pt-0 first:mt-0">
      <h3 className="text-lg font-medium text-gray-900 mb-4">{title}</h3>
      {children}
    </div>
  );

  const Field = ({ label, value }: { label: string; value: string | number | React.ReactNode }) => (
    <div className="mb-4">
      <dt className="text-sm font-medium text-gray-500">{label}</dt>
      <dd className="mt-1 text-sm text-gray-900">{value}</dd>
    </div>
  );

  const DocumentLink = ({ url, label }: { url?: string; label: string }) => (
    url ? (
      <a 
        href={url} 
        target="_blank" 
        rel="noopener noreferrer" 
        className="text-primary hover:text-primary-600 flex items-center"
      >
        <FileText className="w-4 h-4 mr-1" />
        {label}
      </a>
    ) : (
      <span className="text-gray-400">No {label}</span>
    )
  );

  return (
    <div className="space-y-6">
      {/* Header with Status */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Claim #{claim.id.slice(-8).toUpperCase()}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {claim.clientRef && `Ref: ${claim.clientRef} | `}
            Created on {formatDate(claim.createdAt)}
          </p>
        </div>
        <div className="space-y-1">
          <StatusBadge status={claim.claimType} />
          <StatusBadge status={claim.progress} />
        </div>
      </div>

      {/* Client Information */}
      <Section title="Client Information">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Name" value={claim.clientInfo.name} />
          <Field label="Phone" value={claim.clientInfo.phone} />
          <Field label="Email" value={claim.clientInfo.email} />
          <Field label="Gender" value={claim.clientInfo.gender} />
          <Field label="Date of Birth" value={formatDate(claim.clientInfo.dateOfBirth)} />
          <Field label="NI Number" value={claim.clientInfo.nationalInsuranceNumber} />
          <div className="col-span-2">
            <Field label="Address" value={claim.clientInfo.address} />
          </div>
        </div>
      </Section>

      {/* Incident Details */}
      <Section title="Incident Details">
        <div className="grid grid-cols-2 gap-4">
          <Field 
            label="Date & Time" 
            value={`${formatDate(claim.incidentDetails.date)} ${claim.incidentDetails.time}`} 
          />
          <Field label="Location" value={claim.incidentDetails.location} />
          <div className="col-span-2">
            <Field label="Description" value={claim.incidentDetails.description} />
          </div>
          <div className="col-span-2">
            <Field label="Damage Details" value={claim.incidentDetails.damageDetails} />
          </div>
        </div>
      </Section>

      {/* Client Vehicle */}
      <Section title="Client Vehicle">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Registration" value={claim.clientVehicle.registration} />
          <Field label="MOT Expiry" value={formatDate(claim.clientVehicle.motExpiry)} />
          <Field label="Road Tax Expiry" value={formatDate(claim.clientVehicle.roadTaxExpiry)} />
          
          {/* Documents */}
          <div className="col-span-2 mt-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Documents</h4>
            <div className="grid grid-cols-2 gap-4">
              <DocumentLink url={claim.clientVehicle.documents.licenseFront} label="License Front" />
              <DocumentLink url={claim.clientVehicle.documents.licenseBack} label="License Back" />
              <DocumentLink url={claim.clientVehicle.documents.logBook} label="Log Book" />
              <DocumentLink url={claim.clientVehicle.documents.nsl} label="NSL" />
              <DocumentLink url={claim.clientVehicle.documents.insuranceCertificate} label="Insurance Certificate" />
              <DocumentLink url={claim.clientVehicle.documents.tflBill} label="TfL Bill" />
            </div>
          </div>
        </div>
      </Section>

      {/* Evidence */}
      <Section title="Evidence">
        {/* Images */}
        {claim.evidence.images.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Images</h4>
            <div className="grid grid-cols-3 gap-4">
              {claim.evidence.images.map((url, index) => (
                <img
                  key={index}
                  src={url}
                  alt={`Evidence ${index + 1}`}
                  className="w-full h-32 object-cover rounded-lg"
                />
              ))}
            </div>
          </div>
        )}

        {/* Vehicle Photos */}
        {claim.evidence.clientVehiclePhotos.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Vehicle Photos</h4>
            <div className="grid grid-cols-3 gap-4">
              {claim.evidence.clientVehiclePhotos.map((url, index) => (
                <img
                  key={index}
                  src={url}
                  alt={`Vehicle Photo ${index + 1}`}
                  className="w-full h-32 object-cover rounded-lg"
                />
              ))}
            </div>
          </div>
        )}

        {/* Documents */}
        <div className="space-y-2">
          <DocumentLink url={claim.evidence.engineerReport} label="Engineer Report" />
          <DocumentLink url={claim.evidence.bankStatement} label="Bank Statement" />
          {claim.evidence.adminDocuments.map((url, index) => (
            <DocumentLink key={index} url={url} label={`Admin Document ${index + 1}`} />
          ))}
        </div>
      </Section>

      {/* Third Party Information */}
      <Section title="Third Party Information">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Name" value={claim.thirdParty.name} />
          <Field label="Phone" value={claim.thirdParty.phone} />
          <Field label="Email" value={claim.thirdParty.email} />
          <Field label="Registration" value={claim.thirdParty.registration} />
          <div className="col-span-2">
            <Field label="Address" value={claim.thirdParty.address} />
          </div>
        </div>
      </Section>

      {/* PI Report */}
      {claim.piReport && (
        <Section title="PI Report">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Injury Description" value={claim.piReport.injuryDescription} />
            <Field label="National Source Number" value={claim.piReport.nationalSourceNumber} />
          </div>
        </Section>
      )}

      {/* Hire Details */}
      <Section title="Hire Details">
        <div className="grid grid-cols-2 gap-4">
          <Field 
            label="Start Date & Time" 
            value={`${formatDate(claim.hireDetails.startDate)} ${claim.hireDetails.startTime}`} 
          />
          <Field 
            label="End Date & Time" 
            value={`${formatDate(claim.hireDetails.endDate)} ${claim.hireDetails.endTime}`} 
          />
          <Field 
            label="Vehicle" 
            value={`${claim.hireDetails.vehicle.make} ${claim.hireDetails.vehicle.model}`} 
          />
          <Field label="Registration" value={claim.hireDetails.vehicle.registration} />
          <Field label="Claim Rate" value={`£${claim.hireDetails.vehicle.claimRate}/day`} />
        </div>
      </Section>

      {/* Recovery Details */}
      {claim.recovery && (
        <Section title="Recovery Details">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Date" value={formatDate(claim.recovery.date)} />
            <Field label="Cost" value={`£${claim.recovery.cost.toFixed(2)}`} />
            <Field label="Pickup Location" value={claim.recovery.locationPickup} />
            <Field label="Dropoff Location" value={claim.recovery.locationDropoff} />
          </div>
        </Section>
      )}

      {/* Storage Details */}
      {claim.storage && (
        <Section title="Storage Details">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Start Date" value={formatDate(claim.storage.startDate)} />
            <Field label="End Date" value={formatDate(claim.storage.endDate)} />
            <Field label="Cost per Day" value={`£${claim.storage.costPerDay.toFixed(2)}`} />
            <Field label="Total Cost" value={`£${claim.storage.totalCost.toFixed(2)}`} />
          </div>
        </Section>
      )}

      {/* Witness Information */}
      {claim.witness && (
        <Section title="Witness Information">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Name" value={claim.witness.name} />
            <Field label="Phone" value={claim.witness.phone} />
            <Field label="Email" value={claim.witness.email} />
            <div className="col-span-2">
              <Field label="Address" value={claim.witness.address} />
            </div>
          </div>
        </Section>
      )}

      {/* File Handlers */}
      <Section title="File Handlers">
        <div className="grid grid-cols-2 gap-4">
          <Field label="AIE Handler" value={claim.fileHandlers.aieHandler} />
          <Field label="Legal Handler" value={claim.fileHandlers.legalHandler} />
        </div>
      </Section>

      {/* Status History */}
      <Section title="Status History">
        <div className="space-y-4">
          {claim.statusHistory.map((status, index) => (
            <div key={index} className="flex justify-between items-start p-4 bg-gray-50 rounded-lg">
              <div>
                <StatusBadge status={status.status} />
                <p className="mt-2 text-sm text-gray-600">{status.description}</p>
              </div>
              <div className="text-sm text-gray-500">
                {formatDate(status.date)}
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Audit Information */}
      <div className="text-sm text-gray-500 border-t pt-4">
        <div className="flex justify-between">
          <div>Created: {formatDate(claim.createdAt)}</div>
          <div>Last Updated: {formatDate(claim.updatedAt)}</div>
        </div>
      </div>
    </div>
  );
};

export default ClaimDetails;
