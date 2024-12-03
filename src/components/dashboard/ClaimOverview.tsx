import React from 'react';
import { AlertTriangle } from 'lucide-react';
import Card from '../Card';
import StatusBadge from '../StatusBadge';

interface ClaimsSummary {
  id: string;
  date: Date;
  status: string;
  location: string;
  description: string;
}

interface ClaimsOverviewProps {
  recentClaims: ClaimsSummary[];
}

const ClaimsOverview: React.FC<ClaimsOverviewProps> = ({ recentClaims }) => {
  return (
    <Card title="Recent Claims">
      <div className="space-y-4">
        {recentClaims.map(claim => (
          <div key={claim.id} className="flex items-start justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-primary mt-1" />
              <div>
                <p className="font-medium text-gray-900">
                  Claim #{claim.id.slice(0, 8)}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {claim.location}
                </p>
              </div>
            </div>
            <StatusBadge status={claim.status} />
          </div>
        ))}
        {recentClaims.length === 0 && (
          <p className="text-center text-gray-500 py-4">No recent claims</p>
        )}
      </div>
    </Card>
  );
};

export default ClaimsOverview;