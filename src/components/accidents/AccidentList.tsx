import React from 'react';
import { Accident, Vehicle } from '../../types';
import AccidentCard from '../AccidentCard';

interface AccidentListProps {
  accidents: Accident[];
  vehicles: Record<string, Vehicle>;
  onSubmitClaim: (accidentId: string) => void;
}

const AccidentList: React.FC<AccidentListProps> = ({ accidents, vehicles, onSubmitClaim }) => {
  if (accidents.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg">
        <p className="text-gray-500">No accidents found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {accidents.map(accident => (
        <div key={accident.id} className="relative">
          <AccidentCard
            accident={accident}
            vehicle={vehicles[accident.vehicleId]}
          />
          <div className="absolute top-4 right-4">
            <button
              onClick={() => onSubmitClaim(accident.id)}
              className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-600"
            >
              Submit Claim
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default AccidentList;