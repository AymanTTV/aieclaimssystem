import React from 'react';
import { Vehicle } from '../../types';
import { PieChart, BarChart2, TrendingUp } from 'lucide-react';
import Card from '../Card';

interface VehicleAnalyticsProps {
  vehicles: Vehicle[];
}

const VehicleAnalytics: React.FC<VehicleAnalyticsProps> = ({ vehicles }) => {
  const statusCounts = vehicles.reduce((acc, vehicle) => {
    acc[vehicle.status] = (acc[vehicle.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'maintenance': return 'bg-yellow-100 text-yellow-800';
      case 'unavailable': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card title="Vehicle Analytics">
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          {Object.entries(statusCounts).map(([status, count]) => (
            <div key={status} className="text-center">
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(status)}`}>
                {count}
              </div>
              <p className="mt-1 text-sm font-medium text-gray-600 capitalize">{status}</p>
            </div>
          ))}
        </div>
        
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center">
            <TrendingUp className="w-4 h-4 text-gray-400 mr-2" />
            <span className="text-sm text-gray-600">Fleet Utilization</span>
          </div>
          <span className="text-lg font-semibold text-gray-900">
            {((statusCounts.active || 0) / vehicles.length * 100).toFixed(1)}%
          </span>
        </div>
      </div>
    </Card>
  );
};

export default VehicleAnalytics;