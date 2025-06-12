import React from 'react';
import { Transaction } from '../../types'; // Assuming Transaction type is imported here
import { DollarSign, TrendingUp, TrendingDown, Percent, Wallet } from 'lucide-react'; // Import Wallet icon
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay'; // Import the hook
import { usePermissions } from '../../hooks/usePermissions';
interface FinancialSummaryProps {
  totalIncome: number;
  totalExpenses: number;
  netIncome: number;
  profitMargin: number;
  totalOwingFromOwners: number; // New prop for total owing from owners
}

const FinancialSummary: React.FC<FinancialSummaryProps> = ({
  totalIncome,
  totalExpenses,
  netIncome,
  profitMargin,
  totalOwingFromOwners, // Destructure the new prop
}) => {
  const { formatCurrency, formatPercentage } = useFormattedDisplay(); // Use the hook

  const { can } = usePermissions();
  
    // Don't even render the cards if the user lacks the 'cards' permission
    if (!can('finance', 'cards')) {
      return null;
    }

  return (
    // Adjust grid columns if needed to accommodate the new card
    // Added xl:grid-cols-5 to potentially fit 5 cards per row on large screens
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">

      {/* Total Income Card */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center">
          <TrendingUp className="w-8 h-8 text-green-500" />
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-500">Total Income</p>
            <p className="text-2xl font-semibold text-gray-900">
              {formatCurrency(totalIncome)}
            </p>
          </div>
        </div>
      </div>

      {/* Total Expenses Card */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center">
          <TrendingDown className="w-8 h-8 text-red-500" />
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-500">Total Expenses</p>
            <p className="text-2xl font-semibold text-gray-900">
              {formatCurrency(totalExpenses)}
            </p>
          </div>
        </div>
      </div>

      {/* Net Income Card */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center">
          <DollarSign className="w-8 h-8 text-blue-500" />
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-500">Net Income</p>
            <p className="text-2xl font-semibold text-gray-900">
              {formatCurrency(netIncome)}
            </p>
          </div>
        </div>
      </div>

      {/* Profit Margin Card */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center">
          <Percent className="w-8 h-8 text-purple-500" />
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-500">Profit Margin</p>
            <p className="text-2xl font-semibold text-gray-900">
              {formatPercentage(profitMargin)}
            </p>
          </div>
        </div>
      </div>

      {/* Owing from Owners Card - New */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center">
          <Wallet className="w-8 h-8 text-orange-500" /> {/* Using Wallet icon and orange color */}
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-500">Owing from Owners</p> {/* Updated label */}
            <p className="text-2xl font-semibold text-gray-900">
              {formatCurrency(totalOwingFromOwners)}
            </p>
          </div>
        </div>
      </div>

       {/* Add more cards here if needed, e.g., Account Balances */}
       {/* You might want to move AccountBalanceCards content here or keep it separate */}

    </div>
  );
};

export default FinancialSummary;
