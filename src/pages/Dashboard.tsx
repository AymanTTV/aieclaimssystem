import React, { useState } from 'react';
import { useVehicles } from '../hooks/useVehicles';
import { useMaintenanceLogs } from '../hooks/useMaintenanceLogs';
import { useRentals } from '../hooks/useRentals';
import { useFinances } from '../hooks/useFinances';
import { usePermissions } from '../hooks/usePermissions';
import { useAuth } from '../context/AuthContext';

import VehicleMetrics from '../components/dashboard/VehicleMetrics';
import MaintenanceOverview from '../components/dashboard/MaintenanceOverview';
import RentalOverview from '../components/dashboard/RentalOverview';
import FleetStatusChart from '../components/dashboard/FleetStatusChart';
import FinancialSummary from '../components/dashboard/FinancialSummary';
import VehicleReport from '../components/dashboard/VehicleReport';
import UrgentAlerts from '../components/dashboard/UrgentAlerts';

// Icons for a polished loading state
import { Loader2, Activity } from 'lucide-react';

const Dashboard = () => {
  const { vehicles, loading: vehiclesLoading } = useVehicles();
  const { logs: maintenanceLogs, loading: logsLoading } = useMaintenanceLogs();
  const { rentals, loading: rentalsLoading } = useRentals();
  const { transactions, loading: transactionsLoading } = useFinances();
  const { can, isCompany } = usePermissions();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'operations' | 'fleet'>('operations');

  const fleetStatusData = {
    labels: ['Active', 'Maintenance', 'Rented', 'Claims', 'Unavailable'],
    datasets: [
      {
        data: [
          vehicles.filter(v => v.status === 'active').length,
          vehicles.filter(v => v.status === 'maintenance').length,
          vehicles.filter(v => v.status === 'rented').length,
          vehicles.filter(v => v.status === 'claim').length,
          vehicles.filter(v => v.status === 'unavailable').length,
        ],
        backgroundColor: [
          '#16A34A', // Active
          '#EAB308', // Maintenance
          '#3B82F6', // Rented
          '#FB7185', // Claims
          '#9CA3AF', // Unavailable
        ],
        borderWidth: 0, // Removes chart borders for a cleaner look
      },
    ],
  };

  if (vehiclesLoading || logsLoading || rentalsLoading || transactionsLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] space-y-4">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        <p className="text-sm text-gray-500 font-medium animate-pulse">Syncing fleet data...</p>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 pb-8">
      
      {/* HEADER SECTION */}
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Fleet Command Center</h1>
          <p className="text-sm text-gray-500 mt-1">Overview of your vehicles, claims, and financials.</p>
        </div>
      </div>

      {/* TOP KPI RIBBON */}
      <div className="space-y-6">
        {can('vehicles', 'cards') && <VehicleMetrics />}
        
        {user?.role === 'manager' && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <FinancialSummary transactions={transactions} period="month" />
          </div>
        )}
      </div>

      {/* MAIN LAYOUT: 2/3 Main Content, 1/3 Sidebar */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
        
        {/* LEFT COLUMN: Main Operations */}
        <div className="xl:col-span-2 space-y-8">
          
          {/* Operations & Rental Split */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {can('maintenance', 'view') && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-200">
                <MaintenanceOverview logs={maintenanceLogs} />
              </div>
            )}
            {can('rentals', 'view') && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-200">
                <RentalOverview rentals={rentals} />
              </div>
            )}
          </div>

          {/* Detailed Reports Section */}
          {can('vehicles', 'cards') && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              {/* Tab Navigation for cleaner UI */}
              <div className="flex border-b border-gray-100 bg-gray-50/50 px-6 pt-4">
                <button 
                  onClick={() => setActiveTab('operations')}
                  className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'operations' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                  Vehicle Status
                </button>
                <button 
                  onClick={() => setActiveTab('fleet')}
                  className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'fleet' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                  Fleet Distribution
                </button>
              </div>

              <div className="p-6">
                {activeTab === 'operations' ? (
                  <VehicleReport vehicles={vehicles} />
                ) : (
                  <div className="h-[350px] w-full flex items-center justify-center">
                    <FleetStatusChart data={fleetStatusData} />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Urgent Action Sidebar */}
        <div className="xl:col-span-1">
          {/* Sticky positioning keeps alerts visible as user scrolls */}
          <div className="sticky top-6">
            {can('vehicles', 'cards') && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="bg-red-50/80 px-5 py-4 border-b border-red-100 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-red-800 flex items-center">
                    <Activity className="w-4 h-4 mr-2" />
                    Action Required
                  </h2>
                  <span className="bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    Urgent
                  </span>
                </div>
                <div className="p-1">
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