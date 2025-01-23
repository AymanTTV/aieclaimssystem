// src/components/claims/ClaimDetailsModal.tsx

import React from 'react';
import { Claim } from '../../types';
import { format } from 'date-fns';
import StatusBadge from '../ui/StatusBadge';
import { 
  FileText, 
  Download, 
  Car, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Clock, 
  AlertTriangle,
  DollarSign,
  FileCheck,
  Ambulance,
  Shield
} from 'lucide-react';

interface ClaimDetailsModalProps {
  claim: Claim;
  onClose: () => void;
}

const ClaimDetailsModal: React.FC<ClaimDetailsModalProps> = ({ claim }) => {
  const formatDate = (date: Date): string => {
    return format(date, 'dd/MM/yyyy');
  };

  const formatDateTime = (date: Date): string => {
    return format(date, 'dd/MM/yyyy HH:mm');
  };

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="border-t pt-6 mt-6 first:border-t-0 first:pt-0 first:mt-0">
      <h3 className="text-lg font-medium text-gray-900 mb-4">{title}</h3>
      {children}
    </div>
  );

  const DocumentLink = ({ url, label }: { url?: string; label: string }) => (
    url ? (
      <a 
        href={url} 
        target="_blank" 
        rel="noopener noreferrer" 
        className="flex items-center text-primary hover:text-primary-600"
      >
        <FileText className="h-4 w-4 mr-2" />
        {label}
      </a>
    ) : null
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
  <div>
    <h2 className="text-2xl font-bold text-gray-900">
      Claim #{claim.id.slice(-8).toUpperCase()}
    </h2>
    <div className="text-sm text-gray-500 mt-1 space-y-1">
      {claim.clientRef && (
        <div className="flex items-center">
          <FileText className="h-4 w-4 text-gray-400 mr-1" />
          <span>Client Ref: {claim.clientRef}</span>
        </div>
      )}
      <div className="flex items-center">
        <Calendar className="h-4 w-4 text-gray-400 mr-1" />
        <span>Submitted on {formatDateTime(claim.submittedAt)}</span>
      </div>
      <div className="flex items-center">
        <User className="h-4 w-4 text-gray-400 mr-1" />
        <span>Type: {claim.submitterType}</span>
      </div>
    </div>
  </div>
  <div className="space-y-1">
    <StatusBadge status={claim.claimType} />
    <StatusBadge status={claim.progress} />
  </div>
</div>

      {/* Client Information */}
      <Section title="Client Information">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center">
            <User className="h-5 w-5 text-gray-400 mr-2" />
            <div>
              <div className="font-medium">{claim.clientInfo.name}</div>
              <div className="text-sm text-gray-500 capitalize">{claim.clientInfo.gender}</div>
            </div>
          </div>
          <div className="flex items-center">
            <Phone className="h-5 w-5 text-gray-400 mr-2" />
            <div>{claim.clientInfo.phone}</div>
          </div>
          <div className="flex items-center">
            <Mail className="h-5 w-5 text-gray-400 mr-2" />
            <div>{claim.clientInfo.email}</div>
          </div>
          <div className="flex items-center">
            <MapPin className="h-5 w-5 text-gray-400 mr-2" />
            <div>{claim.clientInfo.address}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Date of Birth</div>
            <div>{formatDate(claim.clientInfo.dateOfBirth)}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">NI Number</div>
            <div>{claim.clientInfo.nationalInsuranceNumber}</div>
          </div>
        </div>
      </Section>

      {/* Vehicle Details */}
      <Section title="Vehicle Details">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center">
            <Car className="h-5 w-5 text-gray-400 mr-2" />
            <div>
              <div className="font-medium">{claim.clientVehicle.registration}</div>
              <div className="text-sm text-gray-500">
                {claim.clientVehicle.make} {claim.clientVehicle.model}
              </div>
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500">MOT Expiry</div>
            <div>{formatDate(claim.clientVehicle.motExpiry)}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Road Tax Expiry</div>
            <div>{formatDate(claim.clientVehicle.roadTaxExpiry)}</div>
          </div>
        </div>

        {/* Vehicle Documents */}
        <div className="mt-4 space-y-2">
          <DocumentLink url={claim.clientVehicle.documents.licenseFront} label="License Front" />
          <DocumentLink url={claim.clientVehicle.documents.licenseBack} label="License Back" />
          <DocumentLink url={claim.clientVehicle.documents.logBook} label="Log Book" />
          <DocumentLink url={claim.clientVehicle.documents.nsl} label="NSL" />
          <DocumentLink url={claim.clientVehicle.documents.insuranceCertificate} label="Insurance Certificate" />
          <DocumentLink url={claim.clientVehicle.documents.tflBill} label="TfL Bill" />
        </div>
      </Section>

      {/* Incident Details */}
      <Section title="Incident Details">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center">
            <Calendar className="h-5 w-5 text-gray-400 mr-2" />
            <div>
              <div className="text-sm text-gray-500">Date</div>
              <div>{formatDate(claim.incidentDetails.date)}</div>
            </div>
          </div>
          <div className="flex items-center">
            <Clock className="h-5 w-5 text-gray-400 mr-2" />
            <div>
              <div className="text-sm text-gray-500">Time</div>
              <div>{claim.incidentDetails.time}</div>
            </div>
          </div>
          <div className="col-span-2">
            <div className="text-sm text-gray-500">Location</div>
            <div>{claim.incidentDetails.location}</div>
          </div>
          <div className="col-span-2">
            <div className="text-sm text-gray-500">Description</div>
            <div className="whitespace-pre-wrap">{claim.incidentDetails.description}</div>
          </div>
          <div className="col-span-2">
            <div className="text-sm text-gray-500">Damage Details</div>
            <div className="whitespace-pre-wrap">{claim.incidentDetails.damageDetails}</div>
          </div>
        </div>
      </Section>

      {/* Third Party Information */}
      <Section title="Third Party Information">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-gray-500">Name</div>
            <div>{claim.thirdParty.name}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Phone</div>
            <div>{claim.thirdParty.phone}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Email</div>
            <div>{claim.thirdParty.email}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Registration</div>
            <div>{claim.thirdParty.registration}</div>
          </div>
          <div className="col-span-2">
            <div className="text-sm text-gray-500">Address</div>
            <div>{claim.thirdParty.address}</div>
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
                  onClick={() => window.open(url, '_blank')}
                  style={{ cursor: 'pointer' }}
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
                  onClick={() => window.open(url, '_blank')}
                  style={{ cursor: 'pointer' }}
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

      {/* Hire Details */}
      {claim.hireDetails && (
        <Section title="Hire Details">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-500">Start Date & Time</div>
              <div>{formatDateTime(claim.hireDetails.startDate)} {claim.hireDetails.startTime}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">End Date & Time</div>
              <div>{formatDateTime(claim.hireDetails.endDate)} {claim.hireDetails.endTime}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Vehicle</div>
              <div>{claim.hireDetails.vehicle.make} {claim.hireDetails.vehicle.model}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Claim Rate</div>
              <div>£{claim.hireDetails.vehicle.claimRate}/day</div>
            </div>
          </div>
        </Section>
      )}

      {/* Recovery Details */}
      {claim.recovery && (
        <Section title="Recovery Details">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-500">Date</div>
              <div>{formatDate(claim.recovery.date)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Cost</div>
              <div>£{claim.recovery.cost.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Pickup Location</div>
              <div>{claim.recovery.locationPickup}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Dropoff Location</div>
              <div>{claim.recovery.locationDropoff}</div>
            </div>
          </div>
        </Section>
      )}

      {/* Storage Details */}
      {claim.storage && (
        <Section title="Storage Details">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-500">Start Date</div>
              <div>{formatDate(claim.storage.startDate)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">End Date</div>
              <div>{formatDate(claim.storage.endDate)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Cost per Day</div>
              <div>£{claim.storage.costPerDay.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Total Cost</div>
              <div>£{claim.storage.totalCost.toFixed(2)}</div>
            </div>
          </div>
        </Section>
      )}

      {/* File Handlers */}
      <Section title="File Handlers">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-gray-500">AIE Handler</div>
            <div>{claim.fileHandlers.aieHandler}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Legal Handler</div>
            <div>{claim.fileHandlers.legalHandler}</div>
          </div>
        </div>
      </Section>

      {/* Generated Documents */}
      {claim.documents && (
        <Section title="Generated Documents">
          <div className="space-y-2">
            <DocumentLink url={claim.documents.conditionOfHire} label="Condition of Hire" />
            <DocumentLink url={claim.documents.creditHireMitigation} label="Credit Hire Mitigation" />
            <DocumentLink url={claim.documents.noticeOfRightToCancel} label="Notice of Right to Cancel" />
            <DocumentLink url={claim.documents.creditStorageAndRecovery} label="Credit Storage and Recovery" />
            <DocumentLink url={claim.documents.hireAgreement} label="Hire Agreement" />
            <DocumentLink url={claim.documents.satisfactionNotice} label="Satisfaction Notice" />
          </div>
        </Section>
      )}

      {/* Progress History */}
      <Section title="Progress History">
        <div className="space-y-4">
          {claim.progressHistory.map((progress, index) => (
            <div key={index} className="flex justify-between items-start p-4 bg-gray-50 rounded-lg">
              <div>
                <StatusBadge status={progress.status} />
                <p className="mt-2 text-sm text-gray-600">{progress.note}</p>
              </div>
              <div className="text-right text-sm text-gray-500">
                <div>{formatDateTime(progress.date)}</div>
                <div>By {progress.author}</div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Audit Information */}
      <div className="text-sm text-gray-500 border-t pt-4">
        <div className="flex justify-between">
          <div>Created: {formatDateTime(claim.createdAt)}</div>
          <div>Last Updated: {formatDateTime(claim.updatedAt)}</div>
        </div>
      </div>
    </div>
  );
};

export default ClaimDetailsModal;
