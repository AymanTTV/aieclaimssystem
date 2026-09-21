import React from 'react';
import { useVehicles } from '../hooks/useVehicles';
import { useMaintenanceLogs } from '../hooks/useMaintenanceLogs';
import { useRentals } from '../hooks/useRentals';
import { useFinances } from '../hooks/useFinances';
import { usePermissions } from '../hooks/usePermissions';
import { useAuth } from '../context/AuthContext';

import VehicleMetrics from '../components/dashboard/VehicleMetrics';
import MaintenanceOverview from '../components/dashboard/MaintenanceOverview';
import RentalOverview from '../components/dashboard/RentalOverview';
import FinancialSummary from '../components/dashboard/FinancialSummary';
import UrgentAlerts from '../components/dashboard/UrgentAlerts';
import { RevenueChart } from '../components/dashboard/RevenueChart';
import { FleetDistributionChart } from '../components/dashboard/FleetDistributionChart';

import { Loader2, Activity } from 'lucide-react';

const Dashboard = () => {
  const { vehicles, loading: vehiclesLoading } = useVehicles();
  const { logs: maintenanceLogs, loading: logsLoading } = useMaintenanceLogs();
  const { rentals, loading: rentalsLoading } = useRentals();
  const { transactions, loading: transactionsLoading } = useFinances();
  const { can } = usePermissions();
  const { user } = useAuth();

  if (vehiclesLoading || logsLoading || rentalsLoading || transactionsLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] space-y-4">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
        <p className="text-sm text-gray-500 font-medium animate-pulse">Syncing analytics data...</p>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto space-y-8 pb-12">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight font-display">Overview</h1>
          <p className="text-sm text-gray-500 mt-1 font-medium">Real-time analysis of your fleet operations and financial performance.</p>
        </div>
      </div>

      {/* TOP KPI RIBBON */}
      <div className="space-y-6">
        {can('vehicles', 'cards') && <VehicleMetrics />}
        
        {user?.role === 'manager' && (
          <div className="bg-[#0c101c] rounded-2xl border border-slate-800/90 shadow-xl overflow-hidden">
            <FinancialSummary transactions={transactions} period="month" />
          </div>
        )}
      </div>

      {/* CHARTS ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {user?.role === 'manager' && (
          <div className="lg:col-span-2">
            <RevenueChart transactions={transactions} />
          </div>
        )}
        <div className={user?.role === 'manager' ? 'lg:col-span-1' : 'lg:col-span-3'}>
          <FleetDistributionChart vehicles={vehicles} />
        </div>
      </div>

      {/* MAIN LAYOUT: 2/3 Main Content, 1/3 Sidebar */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
        
        {/* LEFT COLUMN: Main Operations */}
        <div className="xl:col-span-2 space-y-8">
          {/* Operations & Rental Split */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {can('rentals', 'view') && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden">
                <RentalOverview rentals={rentals} />
              </div>
            )}
            {can('maintenance', 'view') && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden">
                <MaintenanceOverview logs={maintenanceLogs} />
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Urgent Action Sidebar */}
        <div className="xl:col-span-1">
          {/* Sticky positioning keeps alerts visible as user scrolls */}
          <div className="sticky top-6">
            {can('vehicles', 'cards') && (
              <div className="bg-white rounded-2xl border border-rose-100 shadow-sm overflow-hidden">
                <div className="bg-rose-50/50 px-6 py-5 border-b border-rose-100 flex items-center justify-between">
                  <h2 className="text-base font-bold text-rose-800 flex items-center">
                    <Activity className="w-5 h-5 mr-2" />
                    Action Required
                  </h2>
                  <span className="bg-rose-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                    Urgent
                  </span>
                </div>
                <div className="p-2">
                  <UrgentAlerts vehicles={vehicles} maintenanceLogs={maintenanceLogs} />
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;