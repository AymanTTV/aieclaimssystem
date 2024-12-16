import React from 'react';
import { MaintenanceLog, Rental, Accident } from '../../types';
import { Clock, Calendar, AlertTriangle, Wrench } from 'lucide-react';
import Card from '../Card';
import { format } from 'date-fns';

interface RecentActivityProps {
  maintenanceLogs: MaintenanceLog[];
  rentals: Rental[];
  accidents: Accident[];
}

const RecentActivity: React.FC<RecentActivityProps> = ({ maintenanceLogs, rentals, accidents }) => {
  type Activity = {
    id: string;
    type: 'maintenance' | 'rental' | 'accident';
    date: Date;
    title: string;
    description: string;
  };

  const activities: Activity[] = [
    ...maintenanceLogs.map(log => ({
      id: log.id,
      type: 'maintenance' as const,
      date: log.date,
      title: `Maintenance ${log.status}`,
      description: log.description
    })),
    ...rentals.map(rental => ({
      id: rental.id,
      type: 'rental' as const,
      date: rental.startDate,
      title: `Rental ${rental.status}`,
      description: `From ${format(rental.startDate, 'MMM dd')} to ${format(rental.endDate, 'MMM dd')}`
    })),
    ...accidents.map(accident => ({
      id: accident.id,
      type: 'accident' as const,
      date: accident.date,
      title: `Accident Reported`,
      description: accident.location
    }))
  ].sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 5);

  const getIcon = (type: Activity['type']) => {
    switch (type) {
      case 'maintenance': return <Wrench className="w-5 h-5 text-yellow-500" />;
      case 'rental': return <Calendar className="w-5 h-5 text-blue-500" />;
      case 'accident': return <AlertTriangle className="w-5 h-5 text-red-500" />;
    }
  };

  return (
    <Card title="Recent Activity">
      <div className="space-y-4">
        {activities.map(activity => (
          <div key={activity.id} className="flex items-start space-x-3">
            {getIcon(activity.type)}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">{activity.title}</p>
              <p className="text-sm text-gray-500">{activity.description}</p>
            </div>
            <div className="flex items-center text-sm text-gray-500">
              <Clock className="w-4 h-4 mr-1" />
              {format(activity.date, 'MMM dd, HH:mm')}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default RecentActivity;