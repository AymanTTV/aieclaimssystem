import React from 'react';
import { Rental } from '../../types';
import { Calendar, Clock, FileText, CheckCircle } from 'lucide-react';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';

interface RentalSummaryCardsProps {
  rentals: Rental[];
}

const RentalSummaryCards: React.FC<RentalSummaryCardsProps> = ({ rentals }) => {
  const { formatCurrency } = useFormattedDisplay();

  // Calculate rental type counts and financial details
  const summary = rentals.reduce((acc, rental) => {
    // Count by type
    acc.counts[rental.type] = (acc.counts[rental.type] || 0) + 1;
    
    // Sum total cost by type
    acc.totalCost[rental.type] = (acc.totalCost[rental.type] || 0) + rental.cost;
    
    // Sum paid amount by type
    acc.paidAmount[rental.type] = (acc.paidAmount[rental.type] || 0) + rental.paidAmount;
    
    // Sum discount amount by type
    acc.discountAmount[rental.type] = (acc.discountAmount[rental.type] || 0) + (rental.discountAmount || 0);
    
    // Sum remaining amount by type
    acc.remainingAmount[rental.type] = (acc.remainingAmount[rental.type] || 0) + rental.remainingAmount;
    
    // Count by status
    if (rental.status === 'active') acc.active++;
    if (rental.status === 'scheduled') acc.scheduled++;
    if (rental.status === 'completed') acc.completed++;
    
    return acc;
  }, {
    counts: {} as Record<string, number>,
    totalCost: {} as Record<string, number>,
    paidAmount: {} as Record<string, number>,
    discountAmount: {} as Record<string, number>,
    remainingAmount: {} as Record<string, number>,
    active: 0,
    scheduled: 0,
    completed: 0
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
      {/* Daily Rentals Card */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Daily Rentals</p>
            <p className="mt-2 text-3xl font-semibold text-gray-900">
              {summary.counts.daily || 0}
            </p>
          </div>
          <Calendar className="h-10 w-10 text-blue-500" />
        </div>
        <div className="mt-2 space-y-1">
          <p className="text-sm text-blue-600">
            Total: {formatCurrency(summary.totalCost.daily || 0)}
          </p>
          <p className="text-sm text-green-600">
            Paid: {formatCurrency(summary.paidAmount.daily || 0)}
          </p>
          {(summary.discountAmount.daily || 0) > 0 && (
            <p className="text-sm text-purple-600">
              Discount: {formatCurrency(summary.discountAmount.daily || 0)}
            </p>
          )}
          <p className="text-sm text-amber-600">
            Unpaid: {formatCurrency(summary.remainingAmount.daily || 0)}
          </p>
        </div>
      </div>

      {/* Weekly Rentals Card */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Weekly Rentals</p>
            <p className="mt-2 text-3xl font-semibold text-gray-900">
              {summary.counts.weekly || 0}
            </p>
          </div>
          <Calendar className="h-10 w-10 text-green-500" />
        </div>
        <div className="mt-2 space-y-1">
          <p className="text-sm text-blue-600">
            Total: {formatCurrency(summary.totalCost.weekly || 0)}
          </p>
          <p className="text-sm text-green-600">
            Paid: {formatCurrency(summary.paidAmount.weekly || 0)}
          </p>
          {(summary.discountAmount.weekly || 0) > 0 && (
            <p className="text-sm text-purple-600">
              Discount: {formatCurrency(summary.discountAmount.weekly || 0)}
            </p>
          )}
          <p className="text-sm text-amber-600">
            Unpaid: {formatCurrency(summary.remainingAmount.weekly || 0)}
          </p>
        </div>
      </div>

      {/* Claim Rentals Card */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Claim Rentals</p>
            <p className="mt-2 text-3xl font-semibold text-gray-900">
              {summary.counts.claim || 0}
            </p>
          </div>
          <FileText className="h-10 w-10 text-purple-500" />
        </div>
        <div className="mt-2 space-y-1">
          <p className="text-sm text-blue-600">
            Total: {formatCurrency(summary.totalCost.claim || 0)}
          </p>
          <p className="text-sm text-green-600">
            Paid: {formatCurrency(summary.paidAmount.claim || 0)}
          </p>
          {(summary.discountAmount.claim || 0) > 0 && (
            <p className="text-sm text-purple-600">
              Discount: {formatCurrency(summary.discountAmount.claim || 0)}
            </p>
          )}
          <p className="text-sm text-amber-600">
            Unpaid: {formatCurrency(summary.remainingAmount.claim || 0)}
          </p>
        </div>
      </div>

      {/* Status Summary Card */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-medium text-gray-500">Rental Status</p>
          <Clock className="h-10 w-10 text-orange-500" />
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-blue-600">Active:</span>
            <span className="font-medium">{summary.active}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-yellow-600">Scheduled:</span>
            <span className="font-medium">{summary.scheduled}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-green-600">Completed:</span>
            <span className="font-medium">{summary.completed}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RentalSummaryCards;
