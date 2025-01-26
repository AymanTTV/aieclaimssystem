// src/components/claims/ClaimDetailsModal.tsx

import React from 'react';
import { Claim } from '../../types';
import { format } from 'date-fns';
import StatusBadge from '../ui/StatusBadge';
import { FileText, Download, Car, User, Mail, Phone, MapPin, Calendar, Clock, AlertTriangle } from 'lucide-react';

interface ClaimDetailsModalProps {
  claim: Claim;
  onClose: () => void;
  onDownloadDocument?: (url: string) => void;
}

const ClaimDetailsModal: React.FC<ClaimDetailsModalProps> = ({
  claim,
  onClose,
  onDownloadDocument
}) => {
  const formatDate = (date: Date | null | undefined): string => {
    if (!date) return 'N/A';
    
    try {
      // Handle Firestore Timestamp
      if (date?.toDate) {
        date = date.toDate();
      }
      
      // Ensure we have a valid Date object
      const dateObj = date instanceof Date ? date : new Date(date);
      
      if (isNaN(dateObj.getTime())) {
        return 'N/A';
      }
      
      return format(dateObj, 'dd/MM/yyyy');
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'N/A';
    }
  };

  const formatDateTime = (date: Date | null | undefined): string => {
    if (!date) return 'N/A';
    
    try {
      // Handle Firestore Timestamp
      if (date?.toDate) {
        date = date.toDate();
      }
      
      // Ensure we have a valid Date object
      const dateObj = date instanceof Date ? date : new Date(date);
      
      if (isNaN(dateObj.getTime())) {
        return 'N/A';
      }
      
      return format(dateObj, 'dd/MM/yyyy HH:mm');
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'N/A';
    }
  };

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="border-t pt-6 mt-6 first:border-t-0 first:pt-0 first:mt-0">
      <h3 className="text-lg font-medium text-gray-900 mb-4">{title}</h3>
      {children}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header with Status */}
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
          <StatusBadge status={claim.claimReason} />
          <StatusBadge status={claim.caseProgress} />
          <StatusBadge status={claim.progress} />
        </div>
      </div>

      {/* Generated Documents */}
      {claim.documents && Object.keys(claim.documents).length > 0 && (
        <Section title="Generated Documents">
          <div className="space-y-2">
            {Object.entries(claim.documents).map(([key, url]) => (
              url && (
                <button
                  key={key}
                  onClick={() => onDownloadDocument?.(url)}
                  className="flex items-center text-primary hover:text-primary-600"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                </button>
              )
            ))}
          </div>
        </Section>
      )}

      {/* Client Information */}
      <Section title="Client Information">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center">
            <User className="h-5 w-5 text-gray-400 mr-2" />
            <div>
              <div className="font-medium">{claim.clientInfo.name}</div>
              <div className="text-sm text-gray-500">{formatDate(claim.clientInfo.dateOfBirth)}</div>
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
            <div className="text-sm text-gray-500">National Insurance Number</div>
            <div>{claim.clientInfo.nationalInsuranceNumber}</div>
          </div>
        </div>
      </Section>

      {/* Vehicle Details */}
      <Section title="Vehicle Details">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-gray-500">Registration</div>
            <div className="font-medium">{claim.clientVehicle.registration}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">MOT Expiry</div>
            <div className="font-medium">{formatDate(claim.clientVehicle.motExpiry)}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Road Tax Expiry</div>
            <div className="font-medium">{formatDate(claim.clientVehicle.roadTaxExpiry)}</div>
          </div>
        </div>

        {/* Vehicle Documents */}
        {claim.clientVehicle.documents && Object.entries(claim.clientVehicle.documents).length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Documents</h4>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(claim.clientVehicle.documents).map(([key, url]) => (
                url && (
                  <button
                    key={key}
                    onClick={() => onDownloadDocument?.(url)}
                    className="flex items-center text-primary hover:text-primary-600"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                  </button>
                )
              ))}
            </div>
          </div>
        )}
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
            <div className="font-medium">{claim.thirdParty.name}</div>
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

      {/* Passengers */}
      {claim.passengers && claim.passengers.length > 0 && (
        <Section title="Passengers">
          <div className="space-y-4">
            {claim.passengers.map((passenger, index) => (
              <div key={index} className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Passenger {index + 1}</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-500">Name</div>
                    <div>{passenger.name}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Contact</div>
                    <div>{passenger.contactNumber}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Address</div>
                    <div>{passenger.address}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Post Code</div>
                    <div>{passenger.postCode}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Date of Birth</div>
                    <div>{passenger.dob}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Witnesses */}
      {claim.witnesses && claim.witnesses.length > 0 && (
        <Section title="Witnesses">
          <div className="space-y-4">
            {claim.witnesses.map((witness, index) => (
              <div key={index} className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Witness {index + 1}</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-500">Name</div>
                    <div>{witness.name}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Contact</div>
                    <div>{witness.contactNumber}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Address</div>
                    <div>{witness.address}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Post Code</div>
                    <div>{witness.postCode}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Date of Birth</div>
                    <div>{witness.dob}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Police Information */}
      {claim.policeOfficerName && (
        <Section title="Police Information">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-500">Officer Name</div>
              <div>{claim.policeOfficerName}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Badge Number</div>
              <div>{claim.policeBadgeNumber}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Police Station</div>
              <div>{claim.policeStation}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Incident Number</div>
              <div>{claim.policeIncidentNumber}</div>
            </div>
            {claim.policeContactInfo && (
              <div className="col-span-2">
                <div className="text-sm text-gray-500">Additional Contact Information</div>
                <div>{claim.policeContactInfo}</div>
              </div>
            )}
          </div>
        </Section>
      )}

      {/* Paramedic Information */}
      {claim.paramedicNames && (
        <Section title="Paramedic Information">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-500">Paramedic Names</div>
              <div>{claim.paramedicNames}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Ambulance Reference</div>
              <div>{claim.ambulanceReference}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Ambulance Service</div>
              <div>{claim.ambulanceService}</div>
            </div>
          </div>
        </Section>
      )}

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
        <div className="text-sm text-gray-500">Days of Hire</div>
        <div>{claim.hireDetails.daysOfHire || 0} days</div>
      </div>
      <div>
        <div className="text-sm text-gray-500">Claim Rate</div>
        <div>£{(claim.hireDetails.claimRate || 0).toFixed(2)}/day</div>
      </div>
      <div>
        <div className="text-sm text-gray-500">Total Cost</div>
        <div>£{(claim.hireDetails.totalCost || 0).toFixed(2)}</div>
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
        <div className="font-medium">{formatDate(claim.recovery.date)}</div>
      </div>
      <div>
        <div className="text-sm text-gray-500">Cost</div>
        <div className="font-medium">£{(claim.recovery.cost || 0).toFixed(2)}</div>
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
        <div className="font-medium">{formatDate(claim.storage.startDate)}</div>
      </div>
      <div>
        <div className="text-sm text-gray-500">End Date</div>
        <div className="font-medium">{formatDate(claim.storage.endDate)}</div>
      </div>
      <div>
        <div className="text-sm text-gray-500">Cost per Day</div>
        <div className="font-medium">£{(claim.storage.costPerDay || 0).toFixed(2)}</div>
      </div>
      <div>
        <div className="text-sm text-gray-500">Total Cost</div>
        <div className="font-medium">£{(claim.storage.totalCost || 0).toFixed(2)}</div>
      </div>
    </div>
  </Section>
)}

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
            className="w-full h-32 object-cover rounded-lg cursor-pointer"
            onClick={() => onDownloadDocument?.(url)}
          />
        ))}
      </div>
    </div>
  )}

  {/* Videos */}
  {claim.evidence.videos.length > 0 && (
    <div className="mb-4">
      <h4 className="text-sm font-medium text-gray-900 mb-2">Videos</h4>
      <div className="grid grid-cols-3 gap-4">
        {claim.evidence.videos.map((url, index) => (
          <div key={index} className="relative aspect-video bg-gray-100 rounded-lg">
            <video
              src={url}
              className="w-full h-full object-cover rounded-lg"
              controls
            />
            <button
              onClick={() => onDownloadDocument?.(url)}
              className="absolute top-2 right-2 p-1 bg-white rounded-full shadow hover:bg-gray-100"
            >
              <Download className="h-4 w-4 text-gray-600" />
            </button>
          </div>
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
            alt={`Vehicle photo ${index + 1}`}
            className="w-full h-32 object-cover rounded-lg cursor-pointer"
            onClick={() => onDownloadDocument?.(url)}
          />
        ))}
      </div>
    </div>
  )}

  {/* Documents */}
  <div className="space-y-2">
    {claim.evidence.engineerReport.map((url, index) => (
      <button
        key={index}
        onClick={() => onDownloadDocument?.(url)}
        className="flex items-center text-primary hover:text-primary-600"
      >
        <FileText className="h-4 w-4 mr-2" />
        <span>Engineer Report {index + 1}</span>
      </button>
    ))}
    {claim.evidence.bankStatement.map((url, index) => (
      <button
        key={index}
        onClick={() => onDownloadDocument?.(url)}
        className="flex items-center text-primary hover:text-primary-600"
      >
        <FileText className="h-4 w-4 mr-2" />
        <span>Bank Statement {index + 1}</span>
      </button>
    ))}
    {claim.evidence.adminDocuments.map((url, index) => (
      <button
        key={index}
        onClick={() => onDownloadDocument?.(url)}
        className="flex items-center text-primary hover:text-primary-600"
      >
        <FileText className="h-4 w-4 mr-2" />
        <span>Admin Document {index + 1}</span>
      </button>
    ))}
  </div>
</Section>


      {/* Status Description */}
      {claim.statusDescription && (
        <Section title="Status Description">
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{claim.statusDescription}</p>
          </div>
        </Section>
      )}

      {/* Progress History */}
      <Section title="Progress History">
        <div className="space-y-4">
          {claim.progressHistory.map((progress, index) => (
            <div key={index} className="bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between items-start">
                <div>
                  <StatusBadge status={progress.status} />
                  <p className="mt-2 text-sm text-gray-600">{progress.note}</p>
                </div>
                <div className="text-right text-sm text-gray-500">
                  <div>{formatDateTime(progress.date)}</div>
                  <div>By {progress.author}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Audit Information */}
      <div className="text-sm text-gray-500 border-t pt-4">
        <div className="flex justify-between">
          <div>Created: {formatDateTime(claim.submittedAt)}</div>
          <div>Last Updated: {formatDateTime(claim.updatedAt)}</div>
        </div>
      </div>
    </div>
  );
};

export default ClaimDetailsModal;
