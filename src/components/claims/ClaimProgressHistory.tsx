import React from 'react';
import { format } from 'date-fns';
import { ProgressNote } from '../../types';
import StatusBadge from '../StatusBadge';

interface ClaimProgressHistoryProps {
  history: ProgressNote[];
}

const ClaimProgressHistory: React.FC<ClaimProgressHistoryProps> = ({ history }) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">Claim Progress History</h3>
      <div className="space-y-4">
        {history.map((note) => (
          <div key={note.id} className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between items-start">
              <div>
                <StatusBadge status={note.status} />
                <p className="mt-2 text-sm text-gray-600">{note.note}</p>
                {note.amount && (
                  <p className="mt-1 text-sm font-medium">
                    Amount: £{note.amount.toFixed(2)}
                  </p>
                )}
              </div>
              <div className="text-right text-sm text-gray-500">
                <p>{format(note.date, 'MMM dd, yyyy HH:mm')}</p>
                <p className="mt-1">By {note.author}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ClaimProgressHistory;