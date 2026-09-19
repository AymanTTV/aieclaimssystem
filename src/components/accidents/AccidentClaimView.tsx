import React, { useState, useEffect, useMemo } from 'react';
import { Accident } from '../../types';
import { format } from 'date-fns';
import StatusBadge from '../StatusBadge';
import { Car, Calendar, MapPin, User, Phone, Shield, AlertTriangle, PoundSterling, Clock, CheckCircle2 } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore'; 
import { db } from '../../lib/firebase'; 
import { calculateReportingTiming } from '../../utils/accidentCalculations'; 

interface AccidentClaimViewProps {
  accident: Accident;
}

const AccidentClaimView: React.FC<AccidentClaimViewProps> = ({ accident }) => {
  const [submittedByName, setSubmittedByName] = useState<string | null>(null);

  useEffect(() => {
    const fetchSubmittedByName = async () => {
      if (accident.submittedBy) {
        try {
          const userDoc = await getDoc(doc(db, 'users', accident.submittedBy)); 
          if (userDoc.exists()) {
            setSubmittedByName(userDoc.data().name); 
          } else {
            setSubmittedByName('Unknown User');
          }
        } catch (error) {
          console.error('Error fetching user:', error);
          setSubmittedByName('Unknown User');
        }
      }
    };

    fetchSubmittedByName();
  }, [accident.submittedBy]);

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="border-t pt-4">
      <h3 className="text-lg font-medium text-gray-900 mb-4">{title}</h3>
      {children}
    </div>
  );

  const Field = ({ label, value }: { label: string; value: string | number | undefined }) => (
    <div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="font-medium">{value || 'Not provided'}</p>
    </div>
  );

  const timing = useMemo(() => {
    return calculateReportingTiming({
      accidentDate: accident.accidentDate,
      accidentTime: accident.accidentTime,
      reportedDate: accident.reportedDate,
      reportedTime: accident.reportedTime,
      submittedAt: accident.submittedAt,
      existingPenalty: accident.lateReportingPenalty || accident.penaltyPayment || 0,
    });
  }, [
    accident.accidentDate,
    accident.accidentTime,
    accident.reportedDate,
    accident.reportedTime,
    accident.submittedAt,
    accident.lateReportingPenalty,
    accident.penaltyPayment,
  ]);

  return (
    <div className="space-y-6">

      {/* Reference Details */}
      <Section title="Reference Details">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Field label="Reference No" value={accident.refNo || accident.referenceNo} />
          </div>
          <div>
            <Field label="Reference Name" value={accident.referenceName} />
          </div>
        </div>
      </Section>

      {/* Status Information */}
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <StatusBadge status={accident.status} />
          {accident.type && accident.type !== 'pending' && (
            <StatusBadge status={accident.type} />
          )}
        </div>
        <div className="text-sm text-gray-500">
          Submitted: {format(accident.submittedAt, 'dd/MM/yyyy HH:mm')}
        </div>
      </div>

      {/* Driver Details */}
      <Section title="Driver Details">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-start space-x-2">
            <User className="w-5 h-5 text-gray-400 mt-1" />
            <div>
              <Field label="Name" value={accident.driverName} />
              <Field label="NIN" value={accident.driverNIN} />
            </div>
          </div>
          <div className="flex items-start space-x-2">
            <Phone className="w-5 h-5 text-gray-400 mt-1" />
            <div>
              <Field label="Mobile" value={accident.driverMobile} />
              <Field label="Phone" value={accident.driverPhone} />
            </div>
          </div>
          <div className="col-span-2 flex items-start space-x-2">
            <MapPin className="w-5 h-5 text-gray-400 mt-1" />
            <div>
              <Field label="Address" value={accident.driverAddress} />
              {/* Post Code Display Removed */}
            </div>
          </div>
          <Field label="Date of Birth" value={accident.driverDOB} />
        </div>
      </Section>

      {/* Vehicle Details */}
      <Section title="Vehicle Details">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-start space-x-2">
            <Car className="w-5 h-5 text-gray-400 mt-1" />
            <div>
              <Field label="Make & Model" value={`${accident.vehicleMake} ${accident.vehicleModel}`} />
              <Field label="VRN" value={accident.vehicleVRN} />
            </div>
          </div>
          <div>
            <Field label="Registered Keeper" value={accident.registeredKeeperName} />
            {accident.registeredKeeperAddress && (
              <Field label="Keeper Address" value={accident.registeredKeeperAddress} />
            )}
          </div>
          <div>
            <Field label="Insurance Company" value={accident.insuranceCompany} />
            <Field label="Policy Number" value={accident.policyNumber} />
            {accident.policyExcess && (
              <Field label="Policy Excess" value={`£${accident.policyExcess}`} />
            )}
          </div>
        </div>
      </Section>

      {/* Accident Details */}
      <Section title="Accident Details">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-gray-400" />
              <Field label="Date" value={accident.accidentDate} />
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-gray-400" />
              <Field label="Time" value={accident.accidentTime} />
            </div>
            <div className="col-span-2 flex items-start space-x-2">
              <MapPin className="w-5 h-5 text-gray-400 mt-1" />
              <Field label="Location" value={accident.accidentLocation} />
            </div>
            <div className="col-span-2 flex items-start space-x-2">
              <PoundSterling className="w-5 h-5 text-gray-400 mt-1" />
              <Field label="Accident Amount" value={accident.amount} />
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-500">Description</p>
            <p className="mt-1 whitespace-pre-wrap">{accident.description}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Damage Details</p>
            <p className="mt-1 whitespace-pre-wrap">{accident.damageDetails}</p>
          </div>
        </div>
      </Section>

      {/* Fault Party Details */}
      <Section title="Fault Party Details">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Field label="Name" value={accident.faultPartyName} />
            {accident.faultPartyPhone && (
              <div className="flex items-center mt-1">
                <Phone className="w-4 h-4 text-gray-400 mr-2" />
                <span>{accident.faultPartyPhone}</span>
              </div>
            )}
          </div>
          <div>
            <Field label="Vehicle" value={accident.faultPartyVehicle} />
            <Field label="VRN" value={accident.faultPartyVRN} />
          </div>
          {accident.faultPartyAddress && (
            <div className="col-span-2">
              <Field label="Address" value={accident.faultPartyAddress} />
              {/* Post Code Display Removed */}
            </div>
          )}
          {accident.faultPartyInsurance && (
            <Field label="Insurance Company" value={accident.faultPartyInsurance} />
          )}
        </div>
      </Section>

      {/* Passengers */}
      {accident.passengers && accident.passengers.length > 0 && (
        <Section title="Passengers">
          <div className="space-y-4">
            {accident.passengers.map((passenger, index) => (
              <div key={index} className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Passenger {index + 1}</h4>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Name" value={passenger.name} />
                  <Field label="Contact" value={passenger.contactNumber} />
                  <Field label="Address" value={passenger.address} />
                  {/* Post Code Display Removed */}
                  <Field label="Date of Birth" value={passenger.dob} />
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Witnesses */}
      {accident.witnesses && accident.witnesses.length > 0 && (
        <Section title="Witnesses">
          <div className="space-y-4">
            {accident.witnesses.map((witness, index) => (
              <div key={index} className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Witness {index + 1}</h4>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Name" value={witness.name} />
                  <Field label="Contact" value={witness.contactNumber} />
                  <Field label="Address" value={witness.address} />
                  {/* Post Code Display Removed */}
                  <Field label="Date of Birth" value={witness.dob} />
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Police Information */}
      {accident.policeOfficerName && (
        <Section title="Police Information">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-start space-x-2">
              <Shield className="w-5 h-5 text-gray-400 mt-1" />
              <div>
                <Field label="Officer Name" value={accident.policeOfficerName} />
                <Field label="Badge Number" value={accident.policeBadgeNumber} />
              </div>
            </div>
            <div>
              <Field label="Police Station" value={accident.policeStation} />
              <Field label="Incident Number" value={accident.policeIncidentNumber} />
            </div>
            {accident.policeContactInfo && (
              <div className="col-span-2">
                <Field label="Additional Contact Information" value={accident.policeContactInfo} />
              </div>
            )}
          </div>
        </Section>
      )}

      {/* Paramedic Information */}
      {accident.paramedicNames && (
        <Section title="Paramedic Information">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="w-5 h-5 text-gray-400 mt-1" />
              <div>
                <Field label="Paramedic Names" value={accident.paramedicNames} />
                <Field label="Ambulance Reference" value={accident.ambulanceReference} />
              </div>
            </div>
            <Field label="Ambulance Service" value={accident.ambulanceService} />
          </div>
        </Section>
      )}

      {/* Insurance Response Details */}
      {(accident.claimNo || accident.insuranceRefNo || accident.insuranceClaimStatus || accident.dateFormReceivedFromInsurance || accident.reportedDate || accident.accCd) && (
        <Section title="Insurance Response Details">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Field label="Claim No" value={accident.claimNo || accident.refNo || accident.referenceNo} />
            <Field label="Insurance Ref No" value={accident.insuranceRefNo} />
            <Field label="Acc Cd (Accident Code)" value={accident.accCd} />
            <div>
              <p className="text-sm text-gray-500">Insurance Claim Status</p>
              <p className="font-medium capitalize">{accident.insuranceClaimStatus?.replace('_', ' ') || 'Pending'}</p>
            </div>
            <Field 
              label="Reported Date & Time" 
              value={`${accident.reportedDate ? format(new Date(accident.reportedDate), 'dd/MM/yyyy') : 'Not provided'}${accident.reportedTime ? ` at ${accident.reportedTime}` : ''}`} 
            />
            <div>
              <p className="text-sm text-gray-500">Time to Report (Locked)</p>
              <div className="flex items-center space-x-1 font-semibold text-gray-900 mt-0.5">
                <Clock className="w-3.5 h-3.5 text-blue-600 inline" />
                <span>{timing.timeToReportDisplay}</span>
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-500">24-Hour Late Rule</p>
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold mt-1 ${
                timing.isLate ? 'bg-rose-100 text-rose-800 border border-rose-200' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
              }`}>
                {timing.lateReporting} {timing.isLate ? '(> 24h)' : '(≤ 24h)'}
              </span>
            </div>
            <div>
              <p className="text-sm text-gray-500">Penalty Payment</p>
              <p className={`font-bold text-base mt-0.5 ${timing.isLate && timing.penaltyPayment > 0 ? 'text-rose-700' : 'text-gray-900'}`}>
                £{timing.penaltyPayment.toFixed(2)}
              </p>
            </div>
            <Field label="Claim Reported By" value={accident.claimReportedBy} />
            <Field 
              label="Date Form Received from Insurance" 
              value={accident.dateFormReceivedFromInsurance ? format(new Date(accident.dateFormReceivedFromInsurance), 'dd/MM/yyyy') : undefined} 
            />
          </div>
        </Section>
      )}

      {/* Outside Settlement */}
      {(accident.settledOutsideInsurance !== undefined || accident.outsideSettlementAmount || accident.settlementNotes) && (
        <Section title="Outside Settlement">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Settled Outside Insurance?</p>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${
                accident.settledOutsideInsurance ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {accident.settledOutsideInsurance ? 'Yes' : 'No'}
              </span>
            </div>
            {accident.outsideSettlementAmount !== undefined && (
              <Field label="Outside Settlement Amount Paid Out" value={`£${accident.outsideSettlementAmount.toFixed(2)}`} />
            )}
            {accident.settlementNotes && (
              <div className="md:col-span-2">
                <Field label="Settlement Notes" value={accident.settlementNotes} />
              </div>
            )}
          </div>
        </Section>
      )}

      {/* Financials & Fault Tracking */}
      {(accident.fault || accident.faultType || accident.adEst !== undefined || accident.adPaid !== undefined || accident.totalTpEst !== undefined || accident.actRecovery !== undefined || accident.incurred !== undefined) && (
        <Section title="Financials & Fault Tracking">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500">Fault Type</p>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold mt-1 ${
                (accident.fault || accident.faultType) === 'Non-Fault'
                  ? 'bg-emerald-100 text-emerald-800'
                  : (accident.fault || accident.faultType) === 'Split'
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-rose-100 text-rose-800'
              }`}>
                {accident.fault || accident.faultType || 'Fault'}
              </span>
            </div>
            <div>
              <p className="text-sm text-gray-500">Late Reporting?</p>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold mt-1 ${
                accident.lateReporting === 'Yes' || accident.lateReporting === true
                  ? 'bg-rose-100 text-rose-800'
                  : 'bg-gray-100 text-gray-700'
              }`}>
                {accident.lateReporting === 'Yes' || accident.lateReporting === true ? 'Yes' : 'No'}
              </span>
            </div>
            <div>
              <p className="text-sm text-gray-500">Excess Applies?</p>
              <p className="font-medium">{accident.excessApplies ? 'Yes' : 'No'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Excess Recovered?</p>
              <p className="font-medium">{accident.excessRecovered ? 'Yes' : 'No'}</p>
            </div>
            <Field label="AD Est" value={accident.adEst !== undefined ? `£${accident.adEst.toFixed(2)}` : undefined} />
            <Field label="AD Paid" value={accident.adPaid !== undefined ? `£${accident.adPaid.toFixed(2)}` : undefined} />
            <Field label="TP Paid" value={accident.tpPaid !== undefined ? `£${accident.tpPaid.toFixed(2)}` : undefined} />
            <Field label="Incurred (AD+TP)" value={accident.incurred !== undefined ? `£${accident.incurred.toFixed(2)}` : undefined} />
            <Field label="TP PI Est" value={accident.tpPiEst !== undefined ? `£${accident.tpPiEst.toFixed(2)}` : undefined} />
            <Field label="TP Damage Est" value={accident.tpDamageEst !== undefined ? `£${accident.tpDamageEst.toFixed(2)}` : undefined} />
            <Field label="TP Hire Est" value={accident.tpHireEst !== undefined ? `£${accident.tpHireEst.toFixed(2)}` : undefined} />
            <Field label="Total TP Est" value={accident.totalTpEst !== undefined ? `£${accident.totalTpEst.toFixed(2)}` : undefined} />
            <Field label="Act Recovery" value={accident.actRecovery !== undefined ? `£${accident.actRecovery.toFixed(2)}` : undefined} />
            <div className="md:col-span-2">
              <Field label="Outstanding Recovery" value={accident.outstandingRecovery !== undefined ? `£${accident.outstandingRecovery.toFixed(2)}` : undefined} />
            </div>
          </div>
        </Section>
      )}

      {/* Images */}
      {accident.images && accident.images.length > 0 && (
        <Section title="Images">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {accident.images.map((image, index) => (
              <img
                key={index}
                src={image}
                alt={`Accident image ${index + 1}`}
                className="w-full h-48 object-cover rounded-lg"
              />
            ))}
          </div>
        </Section>
      )}

      {/* Audit Information */}
      <div className="border-t pt-4 text-sm text-gray-500">
        <div className="flex justify-between">
          <div>Submitted by: {submittedByName || accident.submittedBy || 'Loading...'}</div>
          <div>Last Updated: {format(accident.updatedAt, 'dd/MM/yyyy HH:mm')}</div>
        </div>
      </div>
    </div>
  );
};

export default AccidentClaimView;