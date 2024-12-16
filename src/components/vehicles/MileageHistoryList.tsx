import React from 'react';
import { format } from 'date-fns';
import { MileageHistory } from '../../types/vehicle';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface MileageHistoryListProps {
  history: MileageHistory[];
}

const MileageHistoryList: React.FC<MileageHistoryListProps> = ({ history }) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">Mileage History</h3>
      <div className="space-y-2">
        {history.map((record) => {
          const difference = record.newMileage - record.previousMileage;
          const isIncrease = difference > 0;

          return (
            <div
              key={record.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center space-x-3">
                {isIncrease ? (
                  <ArrowUpRight className="w-5 h-5 text-red-500" />
                ) : (
                  <ArrowDownRight className="w-5 h-5 text-green-500" />
                )}
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {record.previousMileage.toLocaleString()} → {record.newMileage.toLocaleString()}
                  </p>
                  {record.notes && (
                    <p className="text-sm text-gray-500">{record.notes}</p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">
                  {format(record.date, 'MMM dd, yyyy')}
                </p>
                <p className="text-xs text-gray-400">
                  By {record.recordedBy}
                </p>
              </div>
            </div>
          );
        })}
        {history.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-4">
            No mileage history available
          </p>
        )}
      </div>
    </div>
  );
};

export default MileageHistoryList;