import React, { useState, useEffect } from 'react';
import { Claim } from '../../types';
import { format } from 'date-fns';
import StatusBadge from '../ui/StatusBadge';
import { FileText, Download, Car, User, Mail, Phone, MapPin, Calendar, DollarSign, Activity } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { ensureValidDate } from '../../utils/dateHelpers';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay'; 

interface ClaimDetailsProps {
  claim: Claim;
  onDownloadDocument?: (url: string) => void;
}

const ClaimDetailsModal: React.FC<ClaimDetailsProps> = ({ claim, onDownloadDocument }) => {
  const [createdByName, setCreatedByName] = useState<string | null>(null);
  const { formatCurrency } = useFormattedDisplay(); 
  

  useEffect(() => {
    const fetchCreatedByName = async () => {
      if (claim.updatedBy) {
        try {
          const userDoc = await getDoc(doc(db, 'users', claim.updatedBy));
          if (userDoc.exists()) {
            setCreatedByName(userDoc.data().name);
          } else {
            setCreatedByName('Unknown User');
          }
        } catch (error) {
          console.error('Error fetching user:', error);
          setCreatedByName('Unknown User');
        }
      }
    };

    fetchCreatedByName();
  }, [claim.updatedBy]);

  
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

  return (
    <div className="space-y-6">
      {/* Header with Status */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Claim #{claim.id.slice(-8).toUpperCase()}
          </h2>
          <div className="mt-1 space-y-1">
            {claim.clientRef && (
              <p className="text-sm text-gray-500">
                Client Ref: {claim.clientRef}
              </p>
            )}
          </div>
        </div>
        <div className="space-y-1">
          <StatusBadge status={claim.claimType} />
          <StatusBadge status={claim.claimReason} />
          <StatusBadge status={claim.caseProgress} />
          <StatusBadge status={claim.progress} />
        </div>
      </div>

      {/* Client Information */}
      <Section title="Client Information">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center">
            <User className="h-5 w-5 text-gray-400 mr-2" />
            <div>
              <p className="font-medium">{claim.clientInfo.name}</p>
              <p className="text-sm text-gray-500">{formatDateTime(claim.clientInfo.dateOfBirth)}</p>
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
        </div>
      </Section>

      {/* Vehicle Details */}
      <Section title="Vehicle Details">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Registration</p>
            <p className="font-medium">{claim.clientVehicle.registration}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">MOT Expiry</p>
            <p className="font-medium">{formatDateTime(claim.clientVehicle.motExpiry)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Road Tax Expiry</p>
            <p className="font-medium">{formatDateTime(claim.clientVehicle.roadTaxExpiry)}</p>
          </div>
        </div>
      </Section>

      {/* Incident Details */}
      <Section title="Incident Details">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center">
            <Calendar className="h-5 w-5 text-gray-400 mr-2" />
            <div>
              <p className="text-sm text-gray-500">Date & Time</p>
              <p className="font-medium">
                {formatDateTime(claim.incidentDetails.date)} {claim.incidentDetails.time}
              </p>
            </div>
          </div>
          <div className="flex items-center">
            <MapPin className="h-5 w-5 text-gray-400 mr-2" />
            <div>
              <p className="text-sm text-gray-500">Location</p>
              <p className="font-medium">{claim.incidentDetails.location}</p>
            </div>
          </div>
          <div className="col-span-2">
            <p className="text-sm text-gray-500">Description</p>
            <p className="mt-1 whitespace-pre-wrap">{claim.incidentDetails.description}</p>
          </div>
          <div className="col-span-2">
            <p className="text-sm text-gray-500">Damage Details</p>
            <p className="mt-1 whitespace-pre-wrap">{claim.incidentDetails.damageDetails}</p>
          </div>
        </div>
      </Section>

      {/* Third Party Information */}
      <Section title="Third Party Details">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Name</p>
            <p className="font-medium">{claim.thirdParty.name}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Phone</p>
            <p className="font-medium">{claim.thirdParty.phone}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Email</p>
            <p className="font-medium">{claim.thirdParty.email}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Registration</p>
            <p className="font-medium">{claim.thirdParty.registration}</p>
          </div>
          <div className="col-span-2">
            <p className="text-sm text-gray-500">Address</p>
            <p className="font-medium">{claim.thirdParty.address}</p>
          </div>
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
              <div className="text-sm text-gray-500">Days of Hire</div>
              <div>{claim.hireDetails.daysOfHire || 0} days</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Claim Rate</div>
              <div>{formatCurrency(claim.hireDetails.claimRate || 0)}/day</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Total Cost</div>
              <div>{formatCurrency(claim.hireDetails.totalCost || 0)}</div>
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
              <div className="font-medium">{formatCurrency(claim.recovery.cost || 0)}</div>
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
              <div className="font-medium">{formatCurrency(claim.storage.costPerDay || 0)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Total Cost</div>
              <div className="font-medium">{formatCurrency(claim.storage.totalCost || 0)}</div>
            </div>
          </div>
        </Section>
      )}

      {/* GP Information */}
      {claim.gpInformation && (
        <Section title="GP Information">
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-gray-400" />
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                claim.gpInformation.visited ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {claim.gpInformation.visited ? 'GP Visited' : 'No GP Visit'}
              </span>
            </div>

            {claim.gpInformation.visited && (
              <div className="grid grid-cols-2 gap-4 mt-4">
                {claim.gpInformation.gpName && (
                  <div>
                    <p className="text-sm text-gray-500">GP Name</p>
                    <p className="font-medium">{claim.gpInformation.gpName}</p>
                  </div>
                )}
                {claim.gpInformation.gpDoctorName && (
                  <div>
                    <p className="text-sm text-gray-500">Doctor Name</p>
                    <p className="font-medium">{claim.gpInformation.gpDoctorName}</p>
                  </div>
                )}
                {claim.gpInformation.gpAddress && (
                  <div className="col-span-2">
                    <p className="text-sm text-gray-500">Address</p>
                    <p className="font-medium">{claim.gpInformation.gpAddress}</p>
                  </div>
                )}
                {claim.gpInformation.gpDate && (
                  <div>
                    <p className="text-sm text-gray-500">Visit Date</p>
                    <p className="font-medium">{formatDateTime(claim.gpInformation.gpDate)}</p>
                  </div>
                )}
                {claim.gpInformation.gpContactNumber && (
                  <div>
                    <p className="text-sm text-gray-500">Contact Number</p>
                    <p className="font-medium">{claim.gpInformation.gpContactNumber}</p>
                  </div>
                )}
                {claim.gpInformation.gpNotes && (
                  <div className="col-span-2">
                    <p className="text-sm text-gray-500">Notes</p>
                    <p className="font-medium whitespace-pre-wrap">{claim.gpInformation.gpNotes}</p>
                  </div>
                )}
              </div>
            )}
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

      {/* Passengers */}
{claim.passengers && claim.passengers.length > 0 && (
  <Section title="Passenger Details">
    {claim.passengers.map((passenger, index) => (
      <div key={index} className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-medium mb-2">Passenger {index + 1}</h4>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Name" value={passenger.name} />
          <Field label="Contact" value={passenger.contactNumber} />
          <Field label="Address" value={passenger.address} />
          <Field label="Post Code" value={passenger.postCode} />
          <Field label="Date of Birth" value={passenger.dob} />
        </div>
      </div>
    ))}
  </Section>
)}

      {/* Witnesses */}
{claim.witnesses && claim.witnesses.length > 0 && (
  <Section title="Witness Details">
    {claim.witnesses.map((witness, index) => (
      <div key={index} className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-medium mb-2">Witness {index + 1}</h4>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Name" value={witness.name} />
          <Field label="Contact" value={witness.contactNumber} />
          <Field label="Address" value={witness.address} />
          <Field label="Post Code" value={witness.postCode} />
          <Field label="Date of Birth" value={witness.dob} />
        </div>
      </div>
    ))}
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


      {/* File Handlers */}
<Section title="File Handlers">
  <div className="grid grid-cols-2 gap-4">
    <div>
      <div className="text-sm text-gray-500">AIE Handler</div>
      <div className="font-medium">{claim.fileHandlers.aieHandler}</div>
    </div>
    <div>
      <div className="text-sm text-gray-500">Legal Handler</div>
      <div className="font-medium">{claim.fileHandlers.legalHandler}</div>
    </div>
  </div>
</Section>


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
          <div>Created by: {createdByName || claim.updatedBy || 'Loading...'}</div>
          <div>Last Updated: {formatDateTime(claim.updatedAt)}</div>
        </div>
      </div>
    </div>
  );
};

export default ClaimDetailsModal;