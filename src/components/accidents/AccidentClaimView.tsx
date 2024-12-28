import React from 'react';
import { Accident } from '../../types';
import { format } from 'date-fns';
import StatusBadge from '../StatusBadge';
import { Car, Calendar, MapPin, User, Phone, FileText, Shield, AlertTriangle, Mail, Clock } from 'lucide-react';

interface AccidentClaimViewProps {
  accident: Accident;
}

const AccidentClaimView: React.FC<AccidentClaimViewProps> = ({ accident }) => {
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

  return (
    <div className="space-y-6">
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
              <Field label="Post Code" value={accident.driverPostCode} />
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
              {accident.faultPartyPostCode && (
                <Field label="Post Code" value={accident.faultPartyPostCode} />
              )}
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
                  <Field label="Post Code" value={passenger.postCode} />
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
                  <Field label="Post Code" value={witness.postCode} />
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
          <div>Submitted by: {accident.submittedBy}</div>
          <div>Last Updated: {format(accident.updatedAt, 'dd/MM/yyyy HH:mm')}</div>
        </div>
      </div>
    </div>
  );
};

export default AccidentClaimView;