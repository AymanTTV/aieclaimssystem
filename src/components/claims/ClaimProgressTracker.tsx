import React from 'react';
import { Claim } from '../../types';
import { format } from 'date-fns';
import { CheckCircle, Clock, XCircle, AlertTriangle } from 'lucide-react';

interface ClaimProgressTrackerProps {
  claim: Claim;
}

const ClaimProgressTracker: React.FC<ClaimProgressTrackerProps> = ({ claim }) => {
  const getStatusIcon = (status: Claim['status']) => {
    switch (status) {
      case 'won':
        return <CheckCircle className="w-6 h-6 text-green-500" />;
      case 'lost':
        return <XCircle className="w-6 h-6 text-red-500" />;
      case 'settled':
        return <CheckCircle className="w-6 h-6 text-blue-500" />;
      case 'in-progress':
        return <Clock className="w-6 h-6 text-yellow-500" />;
      default:
        return <AlertTriangle className="w-6 h-6 text-gray-500" />;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-medium text-gray-900">Claim Progress</h3>
        <div className="flex items-center">
          {getStatusIcon(claim.status)}
          <span className="ml-2 text-sm font-medium capitalize">{claim.status}</span>
        </div>
      </div>

      <div className="space-y-4">
        {claim.progressNotes.map((note) => (
          <div key={note.id} className="border-l-2 border-gray-200 pl-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-gray-600">{note.note}</p>
                <p className="text-xs text-gray-400 mt-1">By {note.author}</p>
              </div>
              <span className="text-xs text-gray-400">
                {format(note.date, 'MMM dd, yyyy HH:mm')}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ClaimProgressTracker;