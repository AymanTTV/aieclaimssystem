import React from 'react';
import { Rental } from '../../types';
import { Calendar, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import Card from '../Card';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay'; // Import the hook
import { usePermissions } from '../../hooks/usePermissions';
interface RentalOverviewProps {
  rentals: Rental[];
}

const RentalOverview: React.FC<RentalOverviewProps> = ({ rentals }) => {
  const { formatCurrency } = useFormattedDisplay(); // Use the hook
  const { can } = usePermissions();
  const completedCount = rentals.filter(rental => rental.status === 'completed').length;
  const activeCount = rentals.filter(rental => rental.status === 'active').length;
  const scheduledCount = rentals.filter(rental => rental.status === 'scheduled').length;

  const totalIncome = rentals.reduce((sum, rental) => sum + rental.cost, 0);

  // Don't even render the cards if the user lacks the 'cards' permission
  if (!can('rentals', 'cards')) {
    return null;
  }
  return (
    <Card title="Rental Overview">
      <div className="space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="ml-2 text-xl font-semibold text-gray-900">{completedCount}</span>
            </div>
            <p className="mt-1 text-sm text-gray-600">Completed</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-500" />
              <span className="ml-2 text-xl font-semibold text-gray-900">{activeCount}</span>
            </div>
            <p className="mt-1 text-sm text-gray-600">Active</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center">
              <Calendar className="w-5 h-5 text-blue-500" />
              <span className="ml-2 text-xl font-semibold text-gray-900">{scheduledCount}</span>
            </div>
            <p className="mt-1 text-sm text-gray-600">Scheduled</p>
          </div>
        </div>

        <div className="pt-4 border-t">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Total Rental Income</span>
            <span className="text-lg font-semibold text-gray-900">
              {formatCurrency(totalIncome)}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default RentalOverview;