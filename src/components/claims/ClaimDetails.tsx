import React from 'react';
import { Claim } from '../../types';
import { format } from 'date-fns';
import StatusBadge from '../StatusBadge';
import ClaimProgressTracker from './ClaimProgressTracker';
import ClaimDocuments from './ClaimDocuments';
import ClaimStatusUpdate from './ClaimStatusUpdate';
import { useAuth } from '../../context/AuthContext';

interface ClaimDetailsProps {
  claim: Claim;
  onUpdate: () => void;
}

const ClaimDetails: React.FC<ClaimDetailsProps> = ({ claim, onUpdate }) => {
  const { user } = useAuth();
  const isManager = user?.role === 'admin' || user?.role === 'manager';

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Claim #{claim.id.slice(0, 8)}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Submitted on {format(claim.createdAt, 'MMMM dd, yyyy')}
            </p>
          </div>
          <StatusBadge status={claim.status} />
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Driver Details</h3>
            <dl className="space-y-2">
              <div>
                <dt className="text-sm font-medium text-gray-500">Name</dt>
                <dd className="text-sm text-gray-900">{claim.claimDetails.driverName}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Address</dt>
                <dd className="text-sm text-gray-900">{claim.claimDetails.driverAddress}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Contact</dt>
                <dd className="text-sm text-gray-900">{claim.claimDetails.driverPhone}</dd>
              </div>
            </dl>
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Vehicle Details</h3>
            <dl className="space-y-2">
              <div>
                <dt className="text-sm font-medium text-gray-500">Make & Model</dt>
                <dd className="text-sm text-gray-900">
                  {claim.claimDetails.vehicleMake} {claim.claimDetails.vehicleModel}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Registration</dt>
                <dd className="text-sm text-gray-900">{claim.claimDetails.vehicleVRN}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Insurance</dt>
                <dd className="text-sm text-gray-900">
                  {claim.claimDetails.insuranceCompany} - {claim.claimDetails.policyNumber}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <ClaimProgressTracker claim={claim} />
        <ClaimDocuments claim={claim} />
      </div>

      {isManager && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Update Status</h3>
          <ClaimStatusUpdate claim={claim} onUpdate={onUpdate} />
        </div>
      )}
    </div>
  );
};

export default ClaimDetails;