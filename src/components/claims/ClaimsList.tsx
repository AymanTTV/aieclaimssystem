import React from 'react';
import { Claim } from '../../types';
import { format } from 'date-fns';
import StatusBadge from '../StatusBadge';
import { FileText, Calendar, User, MapPin } from 'lucide-react';

interface ClaimsListProps {
  claims: Claim[];
  onSelectClaim: (claim: Claim) => void;
}

const ClaimsList: React.FC<ClaimsListProps> = ({ claims, onSelectClaim }) => {
  return (
    <div className="space-y-4">
      {claims.map(claim => (
        <div
          key={claim.id}
          onClick={() => onSelectClaim(claim)}
          className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow cursor-pointer"
        >
          <div className="flex justify-between items-start">
            <div className="flex items-center">
              <FileText className="h-5 w-5 text-primary mr-2" />
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  Claim #{claim.id.slice(0, 8)}
                </h3>
                <p className="text-sm text-gray-500">
                  {claim.type === 'fault' ? 'Fault' : 'Non-Fault'} Claim
                </p>
              </div>
            </div>
            <StatusBadge status={claim.status} />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center">
              <Calendar className="h-4 w-4 text-gray-400 mr-2" />
              <span>{format(claim.createdAt, 'MMM dd, yyyy')}</span>
            </div>
            <div className="flex items-center">
              <User className="h-4 w-4 text-gray-400 mr-2" />
              <span>{claim.claimDetails.driverName}</span>
            </div>
            <div className="flex items-center col-span-2">
              <MapPin className="h-4 w-4 text-gray-400 mr-2" />
              <span>{claim.claimDetails.accidentLocation}</span>
            </div>
          </div>
        </div>
      ))}
      {claims.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg">
          <p className="text-gray-500">No claims found</p>
        </div>
      )}
    </div>
  );
};

export default ClaimsList;