// src/components/claims/ClaimDetailsModal.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { Claim } from '../../types';
import { format } from 'date-fns';
import StatusBadge from '../ui/StatusBadge';
import { FileText, Download, Car, User, Mail, Phone, MapPin, Calendar, Activity } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';
import { isLegacyClaimProgress, deriveDisplayStatus } from '../../utils/claimProgress';
import clsx from 'clsx';

interface ClaimDetailsProps {
  claim: Claim;
  onDownloadDocument?: (url: string) => void;
}

const ClaimDetailsModal: React.FC<ClaimDetailsProps> = ({ claim, onDownloadDocument }) => {
  // Initialize createdByName state
  const [createdByName, setCreatedByName] = useState<string | null>(null);
  const { formatCurrency } = useFormattedDisplay();
  const legacy = useMemo(() => isLegacyClaimProgress(claim), [claim]);
  const displayStatus = useMemo(() => deriveDisplayStatus(claim) ?? 'N/A', [claim]);
  const [serverHistory, setServerHistory] = useState(claim.progressHistory || []);
  const historyToShow = (serverHistory?.length ? serverHistory : (claim.progressHistory || []));

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'claims', claim.id));
        if (!snap.exists()) return;
        const data = snap.data() as any;
        const hist = (data.progressHistory || []).map((h: any) => ({
          ...h,
          date: h?.date?.toDate ? h.date.toDate() : new Date(h.date),
        }));
        setServerHistory(hist);
      } catch (e) {
        console.warn('Failed to refresh progress history:', e);
      }
    })();
  }, [claim.id]);

  useEffect(() => {
    const fetchCreatedByName = async () => {
      if (claim.createdBy) {
        try {
          const userDoc = await getDoc(doc(db, 'users', claim.createdBy));
          if (userDoc.exists()) {
            setCreatedByName(userDoc.data().name);
          } else {
            console.warn(`User with ID ${claim.createdBy} not found.`);
            setCreatedByName('Unknown User');
          }
        } catch (error) {
          console.error(`Error fetching user ${claim.createdBy}:`, error);
          setCreatedByName('Unknown User');
        }
      } else {
        setCreatedByName(null);
      }
    };
    fetchCreatedByName();
  }, [claim.createdBy]);

  // helper to coerce either a Date or Firestore Timestamp into a JS Date
  function toJsDate(v?: Date | { toDate(): Date } | null): Date | null {
    if (!v) return null;
    if (typeof (v as any).toDate === 'function') {
        try {
            return (v as any).toDate();
        } catch (e) {
            console.error('Error converting Firestore Timestamp:', e);
            return null;
        }
    }
    if (v instanceof Date && !isNaN(v.getTime())) {
        return v;
    }
     const date = new Date(v as any);
     if (!isNaN(date.getTime())) {
        return date;
     }
    console.warn('Could not convert value to Date:', v);
    return null;
  }

  const formatDate = (date: Date | null | undefined): string => {
    const jsDate = toJsDate(date);
    if (!jsDate) return 'N/A';
    return format(jsDate, 'dd/MM/yyyy');
  };

  const formatDateTime = (date: Date | null | undefined): string => {
    const jsDate = toJsDate(date);
    if (!jsDate) return 'N/A';
    return format(jsDate, 'dd/MM/yyyy HH:mm');
  };

  const Section = ({ title, children }: { title: React.ReactNode; children: React.ReactNode }) => (
    <div className="border-t pt-6 mt-6 first:border-t-0 first:pt-0 first:mt-0">
      <div className="text-lg font-medium text-gray-900 mb-4">{title}</div>
      {children}
    </div>
  );

  const Field = ({ label, value }: { label: string; value: string | number | React.ReactNode | null | undefined }) => (
    <div className="mb-4">
      <dt className="text-sm font-medium text-gray-500">{label}</dt>
      <dd className="mt-1 text-sm text-gray-900">{value ?? 'N/A'}</dd>
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
          {Array.isArray(claim.claimReason) && claim.claimReason.map(reason => (
            <StatusBadge key={reason} status={reason} />
          ))}
          <StatusBadge status={claim.caseProgress} />
          <div className="flex items-center gap-2">
            <StatusBadge status={displayStatus} />
            {legacy && (
              <span className="text-xs px-2 py-0.5 rounded bg-gray-200 text-gray-700">
                Legacy
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Client Information */}
      <Section title="Client Information">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center">
            <User className="h-5 w-5 text-gray-400 mr-2" />
            <div>
              <p className="font-medium">{claim.clientInfo.name}</p>
              <p className="text-sm text-gray-500">{formatDate(claim.clientInfo.dateOfBirth)}</p>
            </div>
          </div>
          <div className="flex items-center">
            <Phone className="h-5 w-5 text-gray-400 mr-2" />
            <div>
              {claim.clientInfo.phone ? (
                <a href={`tel:${claim.clientInfo.phone}`} className="text-blue-600 hover:underline">
                  {claim.clientInfo.phone}
                </a>
              ) : 'N/A'}
            </div>
          </div>
          <div className="flex items-center">
            <Mail className="h-5 w-5 text-gray-400 mr-2" />
            <div>
              {claim.clientInfo.email ? (
                <a href={`mailto:${claim.clientInfo.email}`} className="text-blue-600 hover:underline">
                  {claim.clientInfo.email}
                </a>
              ) : 'N/A'}
            </div>
          </div>
          <div className="flex items-center">
            <MapPin className="h-5 w-5 text-gray-400 mr-2" />
            <div>{claim.clientInfo.address ?? 'N/A'}</div>
          </div>
           <div className="flex items-center">
            <Car className="h-5 w-5 text-gray-400 mr-2" />
            <div>
              <p className="text-sm text-gray-500">Driving License</p>
              <p className="font-medium">{claim.clientInfo.driverLicenseNumber ?? 'N/A'}</p>
            </div>
          </div>
           <div className="flex items-center">
             <Calendar className="h-5 w-5 text-gray-400 mr-2" />
            <div>
               <p className="text-sm text-gray-500">License Expiry</p>
               <p className="font-medium">{formatDate(claim.clientInfo.licenseExpiry)}</p>
             </div>
           </div>
          {Array.isArray(claim.claimReason) && claim.claimReason.includes('PI') && (
            <>
              <div className="col-span-2">
                <Field
                  label="Occupation"
                  value={claim.clientInfo.occupation ?? 'N/A'}
                />
              </div>
              <div className="col-span-2">
                <dt className="text-sm font-medium text-gray-500">Injury Details</dt>
                <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">
                  {claim.clientInfo.injuryDetails ?? 'N/A'}
                </dd>
              </div>
            </>
          )}
        </div>
      </Section>

      {/* Vehicle Details */}
      {Array.isArray(claim.claimReason) && claim.claimReason.includes('VD') && (
        <Section title="Vehicle Details">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Registration</p>
              <p className="font-medium">{claim.clientVehicle.registration ?? 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">MOT Expiry</p>
              <p className="font-medium">{formatDate(claim.clientVehicle.motExpiry)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Road Tax Expiry</p>
              <p className="font-medium">{formatDate(claim.clientVehicle.roadTaxExpiry)}</p>
            </div>
          </div>
        </Section>
      )}

      {/* Vehicle Documents */}
       {Array.isArray(claim.claimReason) && claim.claimReason.includes('VD') && (
        <Section title="Vehicle Documents">
          {Object.entries(claim.clientVehicle?.documents || {}).length > 0 ? (
            <div className="grid grid-cols-3 gap-4">
              {Object.entries(claim.clientVehicle.documents).map(([key, url]) => (
                 <DocumentLink key={key} url={typeof url === 'string' ? url : undefined} label={key} />
              ))}
            </div>
          ) : (
            <p className="text-gray-400">No vehicle documents uploaded</p>
          )}
        </Section>
      )}

      {/* Register Keeper */}
      {claim.registerKeeper?.enabled && (
        <Section title="Register Keeper">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Name" value={claim.registerKeeper.name} />
            <Field label="Address" value={claim.registerKeeper.address} />
            <div>
              <dt className="text-sm font-medium text-gray-500">Phone</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {claim.registerKeeper.phone ? (
                  <a href={`tel:${claim.registerKeeper.phone}`} className="text-blue-600 hover:underline">
                    {claim.registerKeeper.phone}
                  </a>
                ) : 'N/A'}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Email</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {claim.registerKeeper.email ? (
                  <a href={`mailto:${claim.registerKeeper.email}`} className="text-blue-600 hover:underline">
                    {claim.registerKeeper.email}
                  </a>
                ) : 'N/A'}
              </dd>
            </div>
            <Field label="DOB / Est. Date" value={formatDate(claim.registerKeeper.dateOfBirth)} />
          </div>
          {claim.registerKeeper.signature && (
            <div className="mt-4">
              <p className="text-sm text-gray-500">Signature</p>
              <img src={claim.registerKeeper.signature} alt="Signature" className="h-20 object-contain" />
            </div>
          )}
        </Section>
      )}

      {/* Incident Details */}
      <Section title="Incident Details">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center">
            <Calendar className="h-5 w-5 text-gray-400 mr-2" />
            <div>
              <p className="text-sm text-gray-500">Date & Time</p>
              <p className="font-medium">
                {formatDate(claim.incidentDetails.date)} {claim.incidentDetails.time ?? 'N/A'}
              </p>
            </div>
          </div>
          <div className="flex items-center">
            <MapPin className="h-5 w-5 text-gray-400 mr-2" />
            <div>
              <p className="text-sm text-gray-500">Location</p>
              <p className="font-medium">{claim.incidentDetails.location ?? 'N/A'}</p>
            </div>
          </div>
          <div className="col-span-2">
            <p className="text-sm text-gray-500">Description</p>
            <p className="mt-1 whitespace-pre-wrap">{claim.incidentDetails.description ?? 'N/A'}</p>
          </div>
          <div className="col-span-2">
            <p className="text-sm text-gray-500">Damage Details</p>
            <p className="mt-1 whitespace-pre-wrap">{claim.incidentDetails.damageDetails ?? 'N/A'}</p>
          </div>
        </div>
      </Section>

      {/* Third Party Information */}
      <Section title="Third Party Details">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Name</p>
            <p className="font-medium">{claim.thirdParty.name ?? 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Phone</p>
            <p className="font-medium">
              {claim.thirdParty.phone ? (
                <a href={`tel:${claim.thirdParty.phone}`} className="text-blue-600 hover:underline">
                  {claim.thirdParty.phone}
                </a>
              ) : 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Email</p>
            <p className="font-medium">
              {claim.thirdParty.email ? (
                <a href={`mailto:${claim.thirdParty.email}`} className="text-blue-600 hover:underline">
                  {claim.thirdParty.email}
                </a>
              ) : 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Registration</p>
            <p className="font-medium">{claim.thirdParty.registration ?? 'N/A'}</p>
          </div>
          <div className="col-span-2">
            <p className="text-sm text-gray-500">Address</p>
            <p className="font-medium">{claim.thirdParty.address ?? 'N/A'}</p>
          </div>
        </div>
      </Section>

      {/* Hire Details */}
      {claim.hireDetails?.enabled && Array.isArray(claim.claimReason) && claim.claimReason.includes('H') && (
        <Section title="Hire Details">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-500">Start Date & Time</div>
              <div>{formatDate(claim.hireDetails.startDate)} {claim.hireDetails.startTime ?? 'N/A'}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">End Date & Time</div>
              <div>{formatDate(claim.hireDetails.endDate)} {claim.hireDetails.endTime ?? 'N/A'}</div>
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
            {claim.hireDetails.vehicle && (
              <div className="col-span-2">
                <div className="text-sm font-medium text-gray-500 mb-1">Vehicle on Hire</div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <p>Make: {claim.hireDetails.vehicle.make}</p>
                  <p>Model: {claim.hireDetails.vehicle.model}</p>
                  <p>Registration: {claim.hireDetails.vehicle.registration}</p>
                  <p>Claim Rate: {formatCurrency(claim.hireDetails.vehicle.claimRate)}/day</p>
                </div>
              </div>
            )}
          </div>
        </Section>
      )}

      {/* Recovery Details */}
      {claim.recovery?.enabled && Array.isArray(claim.claimReason) && (claim.claimReason.includes('S') || claim.claimReason.includes('VD')) && (
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
              <div>{claim.recovery.locationPickup ?? 'N/A'}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Dropoff Location</div>
              <div>{claim.recovery.locationDropoff ?? 'N/A'}</div>
            </div>
          </div>
        </Section>
      )}

      {/* Storage Details */}
      {claim.storage?.enabled && Array.isArray(claim.claimReason) && claim.claimReason.includes('S') && (
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
      {claim.gpInformation && Array.isArray(claim.claimReason) && claim.claimReason.includes('PI') && (
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
                    <p className="font-medium">{formatDate(claim.gpInformation.gpDate)}</p>
                  </div>
                )}
                {claim.gpInformation.gpContactNumber && (
                  <div>
                    <p className="text-sm text-gray-500">Contact Number</p>
                    <p className="font-medium">
                      {claim.gpInformation.gpContactNumber ? (
                        <a href={`tel:${claim.gpInformation.gpContactNumber}`} className="text-blue-600 hover:underline">
                          {claim.gpInformation.gpContactNumber}
                        </a>
                      ) : 'N/A'}
                    </p>
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

       {/* Hospital Information */}
       {claim.hospitalInformation && Array.isArray(claim.claimReason) && claim.claimReason.includes('PI') && (
        <Section title="Hospital Information">
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-gray-400" />
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                claim.hospitalInformation.visited ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {claim.hospitalInformation.visited ? 'Hospital Visited' : 'No Hospital Visit'}
              </span>
            </div>

            {claim.hospitalInformation.visited && (
              <div className="grid grid-cols-2 gap-4 mt-4">
                {claim.hospitalInformation.hospitalName && (
                  <div>
                    <p className="text-sm text-gray-500">Hospital Name</p>
                    <p className="font-medium">{claim.hospitalInformation.hospitalName}</p>
                  </div>
                )}
                {claim.hospitalInformation.hospitalDoctorName && (
                  <div>
                    <p className="text-sm text-gray-500">Doctor Name</p>
                    <p className="font-medium">{claim.hospitalInformation.hospitalDoctorName}</p>
                  </div>
                )}
                {claim.hospitalInformation.hospitalAddress && (
                  <div className="col-span-2">
                    <p className="text-sm text-gray-500">Address</p>
                    <p className="font-medium">{claim.hospitalInformation.hospitalAddress}</p>
                  </div>
                )}
                {claim.hospitalInformation.hospitalDate && (
                  <div>
                    <p className="text-sm text-gray-500">Visit Date</p>
                    <p className="font-medium">{formatDate(claim.hospitalInformation.hospitalDate)}</p>
                  </div>
                )}
                {claim.hospitalInformation.hospitalContactNumber && (
                  <div>
                    <p className="text-sm text-gray-500">Contact Number</p>
                    <p className="font-medium">
                      {claim.hospitalInformation.hospitalContactNumber ? (
                        <a href={`tel:${claim.hospitalInformation.hospitalContactNumber}`} className="text-blue-600 hover:underline">
                          {claim.hospitalInformation.hospitalContactNumber}
                        </a>
                      ) : 'N/A'}
                    </p>
                  </div>
                )}
                {claim.hospitalInformation.hospitalNotes && (
                  <div className="col-span-2">
                    <p className="text-sm text-gray-500">Notes</p>
                    <p className="font-medium whitespace-pre-wrap">{claim.hospitalInformation.hospitalNotes}</p>
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
        {claim.evidence?.images && claim.evidence.images.length > 0 && (
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
        {claim.evidence?.videos && claim.evidence.videos.length > 0 && (
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
        {claim.evidence?.clientVehiclePhotos && claim.evidence.clientVehiclePhotos.length > 0 && (
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
          {claim.evidence?.engineerReport?.length > 0 && claim.evidence.engineerReport.map((url, index) => (
            <button
              key={index}
              onClick={() => onDownloadDocument?.(url)}
              className="flex items-center text-primary hover:text-primary-600"
            >
              <FileText className="h-4 w-4 mr-2" />
              <span>Engineer Report {index + 1}</span>
            </button>
          ))}
          {claim.evidence?.bankStatement?.length > 0 && claim.evidence.bankStatement.map((url, index) => (
            <button
              key={index}
              onClick={() => onDownloadDocument?.(url)}
              className="flex items-center text-primary hover:text-primary-600"
            >
              <FileText className="h-4 w-4 mr-2" />
              <span>Bank Statement {index + 1}</span>
            </button>
          ))}
          {claim.evidence?.adminDocuments?.length > 0 && claim.evidence.adminDocuments.map((url, index) => (
            <button
              key={index}
              onClick={() => onDownloadDocument?.(url)}
              className="flex items-center text-primary hover:text-primary-600"
            >
              <FileText className="h-4 w-4 mr-2" />
              <span>Admin Document {index + 1}</span>
            </button>
          ))}
          {!(claim.evidence?.engineerReport?.length > 0 || claim.evidence?.bankStatement?.length > 0 || claim.evidence?.adminDocuments?.length > 0) && (
             <p className="text-gray-400">No documents uploaded</p>
          )}
        </div>
      </Section>

      {/* Passengers */}
      {claim.passengers && claim.passengers.length > 0 && (
        <Section title="Passenger Details">
          <div className="space-y-4">
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
          </div>
        </Section>
      )}

      {/* Witnesses */}
      {claim.witnesses && claim.witnesses.length > 0 && (
        <Section title="Witness Details">
          <div className="space-y-4">
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
          </div>
        </Section>
      )}

      {/* Police Information */}
      {(claim.policeOfficerName || claim.policeBadgeNumber || claim.policeStation || claim.policeIncidentNumber || claim.policeContactInfo) && (
        <Section title="Police Information">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Officer Name" value={claim.policeOfficerName} />
            <Field label="Badge Number" value={claim.policeBadgeNumber} />
            <Field label="Police Station" value={claim.policeStation} />
            <Field label="Incident Number" value={claim.policeIncidentNumber} />
            <div className="col-span-2">
              <Field label="Additional Contact Info" value={claim.policeContactInfo} />
            </div>
          </div>
        </Section>
      )}

      {/* Paramedic Information */}
      {(claim.paramedicNames || claim.ambulanceReference || claim.ambulanceService) && (
        <Section title="Paramedic Information">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Paramedic Names" value={claim.paramedicNames} />
            <Field label="Ambulance Reference" value={claim.ambulanceReference} />
            <Field label="Ambulance Service" value={claim.ambulanceService} />
          </div>
        </Section>
      )}

       {/* File Handlers */}
      <Section title="File Handlers">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-gray-500">AIE Handler</div>
            <div className="font-medium">
              {claim.fileHandlers.aieHandler ?? 'N/A'}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Legal Handler</div>
            {claim.fileHandlers.legalHandler ? (
              <div className="space-y-1">
                <div className="font-medium">
                  {claim.fileHandlers.legalHandler.name}
                </div>
                <div className="text-sm text-gray-500">
                  Email: {claim.fileHandlers.legalHandler.email ? (
                    <a href={`mailto:${claim.fileHandlers.legalHandler.email}`} className="text-blue-600 hover:underline">
                      {claim.fileHandlers.legalHandler.email}
                    </a>
                  ) : 'N/A'}
                </div>
                <div className="text-sm text-gray-500">
                  Phone: {claim.fileHandlers.legalHandler.phone ? (
                    <a href={`tel:${claim.fileHandlers.legalHandler.phone}`} className="text-blue-600 hover:underline">
                      {claim.fileHandlers.legalHandler.phone}
                    </a>
                  ) : 'N/A'}
                </div>
                <div className="text-sm text-gray-500">
                  Address: {claim.fileHandlers.legalHandler.address}
                </div>
              </div>
            ) : (
              <div className="font-medium">N/A</div>
            )}
          </div>
        </div>
      </Section>

      {/* Notes */}
      {claim.notes && claim.notes.length > 0 && (
        <Section title="Notes">
          <div className="space-y-4">
            {claim.notes
              .sort((a, b) => {
                 const dateA = toJsDate(a.createdAt);
                 const dateB = toJsDate(b.createdAt);
                 if (!dateA || !dateB) return 0;
                 return dateB.getTime() - dateA.getTime();
              })
              .map(n => {
                const created = toJsDate(n.createdAt);
                const dueDate = toJsDate(n.dueDate);
                if (!created || !dueDate) {
                     console.warn('Skipping note with invalid dates:', n);
                     return null;
                }
                const isOverdue = dueDate < new Date();

                return (
                  <div key={n.id} className="border rounded-lg p-4 bg-gray-50 flex flex-col">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex-grow mr-4">
                        <p className="text-sm"><span className="font-medium">File Handler:</span> {n.author}</p>
                        {n.noteTitle && (
                           <p className="text-sm"><span className="font-medium">Title:</span> {n.noteTitle}</p>
                        )}
                      </div>
                      <div className="flex flex-col items-end text-right">
                        <div className="text-xs text-gray-500 mb-1">
                         {format(created, 'dd/MM/yyyy HH:mm')}
                        </div>
                      </div>
                    </div>
                    <div className="text-sm whitespace-pre-wrap mb-2">{n.text}</div>
                    <div className="flex items-center text-xs">
                       <Calendar className="h-3 w-3 text-gray-500 mr-1" />
                      <span className="font-medium mr-1">Due:</span>
                      <span
                        className={clsx(
                          'ml-1',
                          dueDate < new Date() ? 'text-red-600 font-semibold' : 'text-gray-700'
                        )}
                      >
                        {format(dueDate, 'dd/MM/yyyy')}
                      </span>
                      {isOverdue && (
                        <span className="ml-2 bg-red-100 text-red-800 text-[10px] px-2 py-0.5 rounded">
                          Overdue
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </Section>
      )}

      {/* Progress History */}
      <Section title={
        <div className="flex justify-between items-center w-full">
          <span>{legacy ? 'Legacy Progress History (read‑only)' : 'Claim Progress History'}</span>
          {(claim as any).progressDocumentUrl && (
              <button
                  onClick={() => onDownloadDocument?.((claim as any).progressDocumentUrl)}
                  className="flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-800"
              >
                  <FileText className="w-4 h-4 mr-1" />
                  View Progress Record
              </button>
          )}
        </div>
      }>
        <div className="space-y-6">
          {historyToShow.length > 0 ? (
            historyToShow.map((h, i) => {
              const historyDate = toJsDate(h.date);
              if (!historyDate) return null;
              return (
                <div key={i} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <div className="flex justify-between items-center">
                    <StatusBadge status={h.status} />
                    <span className="text-xs text-gray-500">{formatDateTime(historyDate)}</span>
                  </div>
                  <div className="mt-4">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{h.note ?? 'N/A'}</p>
                  </div>
                  <div className="mt-3 text-xs text-gray-400 text-right">— {h.author ?? 'N/A'}</div>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-gray-500">No progress updates yet.</p>
          )}
        </div>
      </Section>

      {/* Audit Information */}
      <div className="text-sm text-gray-500 border-t pt-4">
        <div className="flex justify-between">
          <div>Created by: {createdByName ?? claim.updatedBy ?? 'N/A'}</div>
          <div>Last Updated: {formatDateTime(claim.updatedAt)}</div>
        </div>
      </div>
    </div>
  );
};

export default ClaimDetailsModal;