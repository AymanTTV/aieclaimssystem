// src/components/claims/ClaimDetailsModal.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { Claim } from '../../types';
import { format, differenceInDays } from 'date-fns';
import StatusBadge from '../ui/StatusBadge';
import { FileText, Download, Car, User, Mail, Phone, MapPin, Calendar, Activity } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';
import { isLegacyClaimProgress, deriveDisplayStatus } from '../../utils/claimProgress';
import clsx from 'clsx';
import { resolveNameFields, resolveAddressFields } from '../../utils/nameAddressUtils';

interface ClaimDetailsProps {
  claim: Claim;
  onDownloadDocument?: (url: string) => void;
}

const ClaimDetailsModal: React.FC<ClaimDetailsProps> = ({ claim, onDownloadDocument }) => {
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
          if (userDoc.exists()) setCreatedByName(userDoc.data().name);
          else setCreatedByName('Unknown User');
        } catch (error) { setCreatedByName('Unknown User'); }
      } else { setCreatedByName(null); }
    };
    fetchCreatedByName();
  }, [claim.createdBy]);

  function toJsDate(v?: Date | { toDate(): Date } | null): Date | null {
    if (!v) return null;
    if (typeof (v as any).toDate === 'function') {
        try { return (v as any).toDate(); } catch (e) { return null; }
    }
    if (v instanceof Date && !isNaN(v.getTime())) return v;
    const date = new Date(v as any);
    if (!isNaN(date.getTime())) return date;
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

  const checkIsExpiring = (dateVal: any) => {
    const d = toJsDate(dateVal);
    if (!d) return false;
    const now = new Date();
    now.setHours(0,0,0,0);
    d.setHours(0,0,0,0);
    return differenceInDays(d, now) <= 7;
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
      <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary-600 flex items-center">
        <FileText className="w-4 h-4 mr-1" />{label}
      </a>
    ) : (<span className="text-gray-400">No {label}</span>)
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Claim #{claim.id.slice(-8).toUpperCase()}</h2>
          <div className="mt-1 space-y-1">{claim.clientRef && <p className="text-sm text-gray-500">Client Ref: {claim.clientRef}</p>}</div>
        </div>
        <div className="space-y-1">
          <StatusBadge status={claim.claimType} />
          {Array.isArray(claim.claimReason) && claim.claimReason.map(reason => <StatusBadge key={reason} status={reason} />)}
          <StatusBadge status={claim.caseProgress} />
          <div className="flex items-center gap-2">
            <StatusBadge status={displayStatus} />
            {legacy && <span className="text-xs px-2 py-0.5 rounded bg-gray-200 text-gray-700">Legacy</span>}
          </div>
        </div>
      </div>

      <Section title="Client Information">
        {(() => {
          const clientName = resolveNameFields((claim as any).clientInfo);
          const clientAddress = resolveAddressFields((claim as any).clientInfo);
          return (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Field label="First Name" value={clientName.firstName || 'N/A'} />
              <Field label="Middle Name" value={clientName.middleName || 'N/A'} />
              <Field label="Last Name" value={clientName.lastName || 'N/A'} />
              <Field label="Date of Birth" value={formatDate((claim as any).clientInfo?.dateOfBirth)} />
              <div>
                <dt className="text-sm font-medium text-gray-500">Phone</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {(claim as any).clientInfo?.phone ? (
                    <a href={`tel:${(claim as any).clientInfo?.phone}`} className="text-blue-600 hover:underline">
                      {(claim as any).clientInfo?.phone}
                    </a>
                  ) : 'N/A'}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Email</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {(claim as any).clientInfo?.email ? (
                    <a href={`mailto:${(claim as any).clientInfo?.email}`} className="text-blue-600 hover:underline">
                      {(claim as any).clientInfo?.email}
                    </a>
                  ) : 'N/A'}
                </dd>
              </div>
              <Field label="Building Name / Flat Number" value={clientAddress.buildingFlat || 'N/A'} />
              <Field label="Street Name" value={clientAddress.streetName || 'N/A'} />
              <Field label="Town / City" value={clientAddress.townCity || 'N/A'} />
              <Field label="Postcode" value={clientAddress.postcode || 'N/A'} />
              <Field label="Country" value={clientAddress.country || 'N/A'} />
              <Field label="Driving License" value={(claim as any).clientInfo?.driverLicenseNumber ?? 'N/A'} />
              <Field label="License Expiry" value={formatDate((claim as any).clientInfo?.licenseExpiry)} />
              {Array.isArray(claim.claimReason) && claim.claimReason.includes('PI') && (
                <>
                  <div className="col-span-2 md:col-span-3"><Field label="Occupation" value={(claim as any).clientInfo?.occupation ?? 'N/A'} /></div>
                  <div className="col-span-2 md:col-span-3"><dt className="text-sm font-medium text-gray-500">Injury Details</dt><dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{(claim as any).clientInfo?.injuryDetails ?? 'N/A'}</dd></div>
                </>
              )}
            </div>
          );
        })()}
      </Section>

      {/* Vehicle Details */}
      {Array.isArray(claim.claimReason) && claim.claimReason.includes('VD') && (
        <Section title="Vehicle Details">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500">Registration</p>
              <p className="font-medium">{claim.clientVehicle?.registration ?? 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">MOT Expiry</p>
              <p className={`font-medium ${checkIsExpiring(claim.clientVehicle?.motExpiry) ? 'text-red-600' : ''}`}>
                {formatDate(claim.clientVehicle?.motExpiry)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Road Tax Expiry</p>
              <p className={`font-medium ${checkIsExpiring(claim.clientVehicle?.roadTaxExpiry) ? 'text-red-600' : ''}`}>
                {formatDate(claim.clientVehicle?.roadTaxExpiry)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Vehicle License (NSL)</p>
              <p className={`font-medium ${checkIsExpiring(claim.clientVehicle?.nslExpiry) ? 'text-red-600' : ''}`}>
                {formatDate(claim.clientVehicle?.nslExpiry)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Insurance Expiry</p>
              <p className={`font-medium ${checkIsExpiring(claim.clientVehicle?.insuranceExpiry) ? 'text-red-600' : ''}`}>
                {formatDate(claim.clientVehicle?.insuranceExpiry)}
              </p>
            </div>
          </div>
        </Section>
      )}

      {Array.isArray(claim.claimReason) && claim.claimReason.includes('VD') && (
        <Section title="Vehicle Documents">
          {Object.entries(claim.clientVehicle?.documents || {}).length > 0 ? (
            <div className="grid grid-cols-3 gap-4">
              {Object.entries(claim.clientVehicle?.documents || {}).map(([key, url]) => (
                 <DocumentLink key={key} url={typeof url === 'string' ? url : undefined} label={key} />
              ))}
            </div>
          ) : (<p className="text-gray-400">No vehicle documents uploaded</p>)}
        </Section>
      )}

      {(claim as any).registerKeeper?.enabled && (
        <Section title="Register Keeper">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Name" value={(claim as any).registerKeeper.name} />
            <Field label="Address" value={(claim as any).registerKeeper.address} />
            <div><dt className="text-sm font-medium text-gray-500">Phone</dt><dd className="mt-1 text-sm text-gray-900">{(claim as any).registerKeeper.phone ? <a href={`tel:${(claim as any).registerKeeper.phone}`} className="text-blue-600 hover:underline">{(claim as any).registerKeeper.phone}</a> : 'N/A'}</dd></div>
            <div><dt className="text-sm font-medium text-gray-500">Email</dt><dd className="mt-1 text-sm text-gray-900">{(claim as any).registerKeeper.email ? <a href={`mailto:${(claim as any).registerKeeper.email}`} className="text-blue-600 hover:underline">{(claim as any).registerKeeper.email}</a> : 'N/A'}</dd></div>
            <Field label="DOB / Est. Date" value={formatDate((claim as any).registerKeeper.dateOfBirth)} />
          </div>
          {(claim as any).registerKeeper.signature && (
            <div className="mt-4"><p className="text-sm text-gray-500">Signature</p><img src={(claim as any).registerKeeper.signature} alt="Signature" className="h-20 object-contain" /></div>
          )}
        </Section>
      )}

      <Section title="Incident Details">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center"><Calendar className="h-5 w-5 text-gray-400 mr-2" /><div><p className="text-sm text-gray-500">Date & Time</p><p className="font-medium">{formatDate(claim.incidentDetails?.date)} {claim.incidentDetails?.time ?? 'N/A'}</p></div></div>
          <div className="flex items-center"><MapPin className="h-5 w-5 text-gray-400 mr-2" /><div><p className="text-sm text-gray-500">Location</p><p className="font-medium">{claim.incidentDetails?.location ?? 'N/A'}</p></div></div>
          <div className="col-span-2"><p className="text-sm text-gray-500">Description</p><p className="mt-1 whitespace-pre-wrap">{claim.incidentDetails?.description ?? 'N/A'}</p></div>
          <div className="col-span-2"><p className="text-sm text-gray-500">Damage Details</p><p className="mt-1 whitespace-pre-wrap">{claim.incidentDetails?.damageDetails ?? 'N/A'}</p></div>
        </div>
      </Section>

      <Section title="Third Party Details">
        {(() => {
          const tpName = resolveNameFields((claim as any).thirdParty);
          const tpAddress = resolveAddressFields((claim as any).thirdParty);
          return (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Field label="First Name" value={tpName.firstName || 'N/A'} />
              <Field label="Middle Name" value={tpName.middleName || 'N/A'} />
              <Field label="Last Name" value={tpName.lastName || 'N/A'} />
              <div>
                <dt className="text-sm font-medium text-gray-500">Phone</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {claim.thirdParty?.phone ? (
                    <a href={`tel:${claim.thirdParty.phone}`} className="text-blue-600 hover:underline">
                      {claim.thirdParty.phone}
                    </a>
                  ) : 'N/A'}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Email</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {claim.thirdParty?.email ? (
                    <a href={`mailto:${claim.thirdParty.email}`} className="text-blue-600 hover:underline">
                      {claim.thirdParty.email}
                    </a>
                  ) : 'N/A'}
                </dd>
              </div>
              <Field label="Registration" value={claim.thirdParty?.registration ?? 'N/A'} />
              <Field label="Building Name / Flat Number" value={tpAddress.buildingFlat || 'N/A'} />
              <Field label="Street Name" value={tpAddress.streetName || 'N/A'} />
              <Field label="Town / City" value={tpAddress.townCity || 'N/A'} />
              <Field label="Postcode" value={tpAddress.postcode || 'N/A'} />
              <Field label="Country" value={tpAddress.country || 'N/A'} />
            </div>
          );
        })()}
      </Section>

      {claim.hireDetails?.enabled && Array.isArray(claim.claimReason) && claim.claimReason.includes('H') && (
        <Section title="Hire Details">
          <div className="grid grid-cols-2 gap-4">
            <div><div className="text-sm text-gray-500">Start Date & Time</div><div>{formatDate(claim.hireDetails.startDate)} {(claim.hireDetails as any).startTime ?? 'N/A'}</div></div>
            <div><div className="text-sm text-gray-500">End Date & Time</div><div>{formatDate(claim.hireDetails.endDate)} {(claim.hireDetails as any).endTime ?? 'N/A'}</div></div>
            <div><div className="text-sm text-gray-500">Days of Hire</div><div>{(claim.hireDetails as any).daysOfHire || 0} days</div></div>
            <div><div className="text-sm text-gray-500">Claim Rate</div><div>{formatCurrency(claim.hireDetails.claimRate || 0)}/day</div></div>
            <div><div className="text-sm text-gray-500">Total Cost</div><div>{formatCurrency(claim.hireDetails.totalCost || 0)}</div></div>
            {claim.hireDetails.vehicle && (
              <div className="col-span-2">
                <div className="text-sm font-medium text-gray-500 mb-1">Vehicle on Hire</div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <p>Make: {claim.hireDetails.vehicle.make}</p><p>Model: {claim.hireDetails.vehicle.model}</p>
                  <p>Registration: {claim.hireDetails.vehicle.registration}</p><p>Claim Rate: {formatCurrency(claim.hireDetails.vehicle.claimRate)}/day</p>
                </div>
              </div>
            )}
          </div>
        </Section>
      )}

      {claim.recovery?.enabled && Array.isArray(claim.claimReason) && (claim.claimReason.includes('S') || claim.claimReason.includes('VD')) && (
        <Section title="Recovery Details">
          <div className="grid grid-cols-2 gap-4">
            <div><div className="text-sm text-gray-500">Date</div><div className="font-medium">{formatDate(claim.recovery.date)}</div></div>
            <div><div className="text-sm text-gray-500">Cost</div><div className="font-medium">{formatCurrency(claim.recovery.cost || 0)}</div></div>
            <div><div className="text-sm text-gray-500">Pickup Location</div><div>{claim.recovery.locationPickup ?? 'N/A'}</div></div>
            <div><div className="text-sm text-gray-500">Dropoff Location</div><div>{claim.recovery.locationDropoff ?? 'N/A'}</div></div>
          </div>
        </Section>
      )}

      {claim.storage?.enabled && Array.isArray(claim.claimReason) && claim.claimReason.includes('S') && (
        <Section title="Storage Details">
          <div className="grid grid-cols-2 gap-4">
            <div><div className="text-sm text-gray-500">Start Date</div><div className="font-medium">{formatDate(claim.storage.startDate)}</div></div>
            <div><div className="text-sm text-gray-500">End Date</div><div className="font-medium">{formatDate(claim.storage.endDate)}</div></div>
            <div><div className="text-sm text-gray-500">Cost per Day</div><div className="font-medium">{formatCurrency(claim.storage.costPerDay || 0)}</div></div>
            <div><div className="text-sm text-gray-500">Total Cost</div><div className="font-medium">{formatCurrency(claim.storage.totalCost || 0)}</div></div>
          </div>
        </Section>
      )}

      {claim.gpInformation && Array.isArray(claim.claimReason) && claim.claimReason.includes('PI') && (
        <Section title="GP Information">
          <div className="space-y-4">
            <div className="flex items-center space-x-2"><Activity className="h-5 w-5 text-gray-400" /><span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${claim.gpInformation.visited ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{claim.gpInformation.visited ? 'GP Visited' : 'No GP Visit'}</span></div>
            {claim.gpInformation.visited && (
              <div className="grid grid-cols-2 gap-4 mt-4">
                {claim.gpInformation.gpName && <div><p className="text-sm text-gray-500">GP Name</p><p className="font-medium">{claim.gpInformation.gpName}</p></div>}
                {claim.gpInformation.gpDoctorName && <div><p className="text-sm text-gray-500">Doctor Name</p><p className="font-medium">{claim.gpInformation.gpDoctorName}</p></div>}
                {claim.gpInformation.gpAddress && <div className="col-span-2"><p className="text-sm text-gray-500">Address</p><p className="font-medium">{claim.gpInformation.gpAddress}</p></div>}
                {claim.gpInformation.gpDate && <div><p className="text-sm text-gray-500">Visit Date</p><p className="font-medium">{formatDate(claim.gpInformation.gpDate)}</p></div>}
                {claim.gpInformation.gpContactNumber && <div><p className="text-sm text-gray-500">Contact Number</p><p className="font-medium">{claim.gpInformation.gpContactNumber ? <a href={`tel:${claim.gpInformation.gpContactNumber}`} className="text-blue-600 hover:underline">{claim.gpInformation.gpContactNumber}</a> : 'N/A'}</p></div>}
                {(claim.gpInformation as any).gpNotes && <div className="col-span-2"><p className="text-sm text-gray-500">Notes</p><p className="font-medium whitespace-pre-wrap">{(claim.gpInformation as any).gpNotes}</p></div>}
              </div>
            )}
          </div>
        </Section>
      )}

       {claim.hospitalInformation && Array.isArray(claim.claimReason) && claim.claimReason.includes('PI') && (
        <Section title="Hospital Information">
          <div className="space-y-4">
            <div className="flex items-center space-x-2"><Activity className="h-5 w-5 text-gray-400" /><span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${claim.hospitalInformation.visited ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{claim.hospitalInformation.visited ? 'Hospital Visited' : 'No Hospital Visit'}</span></div>
            {claim.hospitalInformation.visited && (
              <div className="grid grid-cols-2 gap-4 mt-4">
                {claim.hospitalInformation.hospitalName && <div><p className="text-sm text-gray-500">Hospital Name</p><p className="font-medium">{claim.hospitalInformation.hospitalName}</p></div>}
                {claim.hospitalInformation.hospitalDoctorName && <div><p className="text-sm text-gray-500">Doctor Name</p><p className="font-medium">{claim.hospitalInformation.hospitalDoctorName}</p></div>}
                {claim.hospitalInformation.hospitalAddress && <div className="col-span-2"><p className="text-sm text-gray-500">Address</p><p className="font-medium">{claim.hospitalInformation.hospitalAddress}</p></div>}
                {claim.hospitalInformation.hospitalDate && <div><p className="text-sm text-gray-500">Visit Date</p><p className="font-medium">{formatDate(claim.hospitalInformation.hospitalDate)}</p></div>}
                {claim.hospitalInformation.hospitalContactNumber && <div><p className="text-sm text-gray-500">Contact Number</p><p className="font-medium">{claim.hospitalInformation.hospitalContactNumber ? <a href={`tel:${claim.hospitalInformation.hospitalContactNumber}`} className="text-blue-600 hover:underline">{claim.hospitalInformation.hospitalContactNumber}</a> : 'N/A'}</p></div>}
                {(claim.hospitalInformation as any).hospitalNotes && <div className="col-span-2"><p className="text-sm text-gray-500">Notes</p><p className="font-medium whitespace-pre-wrap">{(claim.hospitalInformation as any).hospitalNotes}</p></div>}
              </div>
            )}
          </div>
        </Section>
      )}

      <Section title="Evidence">
        {(claim as any).evidence?.images?.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Images</h4>
            <div className="grid grid-cols-3 gap-4">
              {(claim as any).evidence.images.map((url: string, index: number) => (
                <img key={index} src={url} alt={`Evidence ${index + 1}`} className="w-full h-32 object-cover rounded-lg cursor-pointer" onClick={() => onDownloadDocument?.(url)} />
              ))}
            </div>
          </div>
        )}
        {(claim as any).evidence?.videos?.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Videos</h4>
            <div className="grid grid-cols-3 gap-4">
              {(claim as any).evidence.videos.map((url: string, index: number) => (
                <div key={index} className="relative aspect-video bg-gray-100 rounded-lg">
                  <video src={url} className="w-full h-full object-cover rounded-lg" controls />
                  <button onClick={() => onDownloadDocument?.(url)} className="absolute top-2 right-2 p-1 bg-white rounded-full shadow hover:bg-gray-100"><Download className="h-4 w-4 text-gray-600" /></button>
                </div>
              ))}
            </div>
          </div>
        )}
        {(claim as any).evidence?.clientVehiclePhotos?.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Vehicle Photos</h4>
            <div className="grid grid-cols-3 gap-4">
              {(claim as any).evidence.clientVehiclePhotos.map((url: string, index: number) => (
                <img key={index} src={url} alt={`Vehicle photo ${index + 1}`} className="w-full h-32 object-cover rounded-lg cursor-pointer" onClick={() => onDownloadDocument?.(url)} />
              ))}
            </div>
          </div>
        )}
        <div className="space-y-2">
          {(claim as any).evidence?.engineerReport?.map((url: string, index: number) => (
            <button key={index} onClick={() => onDownloadDocument?.(url)} className="flex items-center text-primary hover:text-primary-600"><FileText className="h-4 w-4 mr-2" /><span>Engineer Report {index + 1}</span></button>
          ))}
          {(claim as any).evidence?.bankStatement?.map((url: string, index: number) => (
            <button key={index} onClick={() => onDownloadDocument?.(url)} className="flex items-center text-primary hover:text-primary-600"><FileText className="h-4 w-4 mr-2" /><span>Bank Statement {index + 1}</span></button>
          ))}
          {(claim as any).evidence?.adminDocuments?.map((url: string, index: number) => (
            <button key={index} onClick={() => onDownloadDocument?.(url)} className="flex items-center text-primary hover:text-primary-600"><FileText className="h-4 w-4 mr-2" /><span>Admin Document {index + 1}</span></button>
          ))}
          {!((claim as any).evidence?.engineerReport?.length > 0 || (claim as any).evidence?.bankStatement?.length > 0 || (claim as any).evidence?.adminDocuments?.length > 0) && (
             <p className="text-gray-400">No documents uploaded</p>
          )}
        </div>
      </Section>

      {claim.passengers && claim.passengers.length > 0 && (
        <Section title="Passenger Details">
          <div className="space-y-4">
            {claim.passengers.map((passenger, index) => (
              <div key={index} className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Passenger {index + 1}</h4>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Name" value={passenger.fullName} />
                  <Field label="Contact" value={passenger.contactNumber} />
                  <Field label="Address" value={(passenger as any).address} />
                  <Field label="Post Code" value={(passenger as any).postCode} />
                  <Field label="Date of Birth" value={(passenger as any).dob} />
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {claim.witnesses && claim.witnesses.length > 0 && (
        <Section title="Witness Details">
          <div className="space-y-4">
            {claim.witnesses.map((witness, index) => {
              const wName = resolveNameFields(witness);
              const wAddress = resolveAddressFields(witness);
              return (
                <div key={index} className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Witness {index + 1}</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <Field label="First Name" value={wName.firstName || 'N/A'} />
                    <Field label="Middle Name" value={wName.middleName || 'N/A'} />
                    <Field label="Last Name" value={wName.lastName || 'N/A'} />
                    <Field label="Contact" value={witness.contactNumber || 'N/A'} />
                    <Field label="Date of Birth" value={(witness as any).dob || 'N/A'} />
                    <Field label="Building Name / Flat Number" value={wAddress.buildingFlat || 'N/A'} />
                    <Field label="Street Name" value={wAddress.streetName || 'N/A'} />
                    <Field label="Town / City" value={wAddress.townCity || 'N/A'} />
                    <Field label="Postcode" value={wAddress.postcode || (witness as any).postCode || 'N/A'} />
                    <Field label="Country" value={wAddress.country || 'N/A'} />
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      )}

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

      {(claim.paramedicNames || claim.ambulanceReference || claim.ambulanceService) && (
        <Section title="Paramedic Information">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Paramedic Names" value={claim.paramedicNames} />
            <Field label="Ambulance Reference" value={claim.ambulanceReference} />
            <Field label="Ambulance Service" value={claim.ambulanceService} />
          </div>
        </Section>
      )}

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
                <div className="font-medium">{claim.fileHandlers.legalHandler.name}</div>
                <div className="text-sm text-gray-500">
                  Email: {claim.fileHandlers.legalHandler.email ? <a href={`mailto:${claim.fileHandlers.legalHandler.email}`} className="text-blue-600 hover:underline">{claim.fileHandlers.legalHandler.email}</a> : 'N/A'}
                </div>
                <div className="text-sm text-gray-500">
                  Phone: {claim.fileHandlers.legalHandler.phone ? <a href={`tel:${claim.fileHandlers.legalHandler.phone}`} className="text-blue-600 hover:underline">{claim.fileHandlers.legalHandler.phone}</a> : 'N/A'}
                </div>
                <div className="text-sm text-gray-500">Address: {claim.fileHandlers.legalHandler.address}</div>
              </div>
            ) : (<div className="font-medium">N/A</div>)}
          </div>
        </div>
      </Section>

      {claim.notes && claim.notes.length > 0 && (
        <Section title="Notes">
          <div className="space-y-4">
            {(claim.notes as any)
              .sort((a: any, b: any) => {
                 const dateA = toJsDate(a.createdAt);
                 const dateB = toJsDate(b.createdAt);
                 if (!dateA || !dateB) return 0;
                 return dateB.getTime() - dateA.getTime();
              })
              .map((n: any) => {
                const created = toJsDate(n.createdAt);
                const dueDate = toJsDate(n.dueDate);
                if (!created || !dueDate) return null;
                const isOverdue = dueDate < new Date();

                return (
                  <div key={n.id} className="border rounded-lg p-4 bg-gray-50 flex flex-col">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex-grow mr-4">
                        <p className="text-sm"><span className="font-medium">File Handler:</span> {n.author}</p>
                        {n.noteTitle && <p className="text-sm"><span className="font-medium">Title:</span> {n.noteTitle}</p>}
                      </div>
                      <div className="flex flex-col items-end text-right">
                        <div className="text-xs text-gray-500 mb-1">{format(created, 'dd/MM/yyyy HH:mm')}</div>
                      </div>
                    </div>
                    <div className="text-sm whitespace-pre-wrap mb-2">{n.text}</div>
                    <div className="flex items-center text-xs">
                       <Calendar className="h-3 w-3 text-gray-500 mr-1" />
                      <span className="font-medium mr-1">Due:</span>
                      <span className={clsx('ml-1', dueDate < new Date() ? 'text-red-600 font-semibold' : 'text-gray-700')}>{format(dueDate, 'dd/MM/yyyy')}</span>
                      {isOverdue && <span className="ml-2 bg-red-100 text-red-800 text-[10px] px-2 py-0.5 rounded">Overdue</span>}
                    </div>
                  </div>
                );
              })}
          </div>
        </Section>
      )}

      <Section title={
        <div className="flex justify-between items-center w-full">
          <span>{legacy ? 'Legacy Progress History (read‑only)' : 'Claim Progress History'}</span>
          {(claim as any).progressDocumentUrl && (
              <button onClick={() => onDownloadDocument?.((claim as any).progressDocumentUrl)} className="flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-800">
                  <FileText className="w-4 h-4 mr-1" />View Progress Record
              </button>
          )}
        </div>
      }>
        <div className="space-y-6">
          {historyToShow.length > 0 ? (
            historyToShow.map((h: any, i: number) => {
              const historyDate = toJsDate(h.date);
              if (!historyDate) return null;
              return (
                <div key={i} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <div className="flex justify-between items-center">
                    <StatusBadge status={h.status} />
                    <span className="text-xs text-gray-500">{formatDateTime(historyDate)}</span>
                  </div>
                  <div className="mt-4"><p className="text-sm text-gray-700 whitespace-pre-wrap">{h.note ?? 'N/A'}</p></div>
                  <div className="mt-3 text-xs text-gray-400 text-right">— {h.author ?? 'N/A'}</div>
                </div>
              );
            })
          ) : (<p className="text-sm text-gray-500">No progress updates yet.</p>)}
        </div>
      </Section>

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