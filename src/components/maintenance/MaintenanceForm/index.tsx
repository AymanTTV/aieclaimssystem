import React from 'react';
import { useMaintenanceForm } from './useMaintenanceForm';
import { Vehicle, MaintenanceLog } from '../../../types';
import { usePermissions } from '../../../hooks/usePermissions';
import MaintenanceDetails from './sections/MaintenanceDetails';
import ServiceCenterSection from './sections/ServiceCenterSection';
import PartsSection from './sections/PartsSection';
import LaborSection from './sections/LaborSection';
import CostSummary from './sections/CostSummary';
import VehicleSelect from '../../VehicleSelect';

interface MaintenanceFormProps {
  vehicles: Vehicle[];
  onClose: () => void;
  editLog?: MaintenanceLog;
}

const MaintenanceForm: React.FC<MaintenanceFormProps> = ({ vehicles, onClose, editLog }) => {
  const { can } = usePermissions();
  const {
    loading,
    selectedVehicleId,
    setSelectedVehicleId,
    formData,
    setFormData,
    parts,
    setParts,
    includeVATOnLabor,
    setIncludeVATOnLabor,
    handleServiceCenterSelect,
    handleSubmit,
    calculatePartsCost,
    calculateLaborCost,
    calculateTotalCost,
  } = useMaintenanceForm({ vehicles, onClose, editLog });

  if (!can('maintenance', editLog ? 'update' : 'create')) {
    return <div>You don't have permission to {editLog ? 'edit' : 'create'} maintenance records.</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <VehicleSelect
        vehicles={vehicles}
        selectedVehicleId={selectedVehicleId}
        onSelect={setSelectedVehicleId}
        required
      />

      <MaintenanceDetails
        formData={formData}
        setFormData={setFormData}
      />

      <ServiceCenterSection
        formData={formData}
        onServiceCenterSelect={handleServiceCenterSelect}
      />

      <PartsSection
        parts={parts}
        setParts={setParts}
      />

      <LaborSection
        formData={formData}
        setFormData={setFormData}
        includeVATOnLabor={includeVATOnLabor}
        setIncludeVATOnLabor={setIncludeVATOnLabor}
        calculateLaborCost={calculateLaborCost}
      />

      <CostSummary
        calculatePartsCost={calculatePartsCost}
        calculateLaborCost={calculateLaborCost}
        calculateTotalCost={calculateTotalCost}
        parts={parts}
        includeVATOnLabor={includeVATOnLabor}
        laborHours={formData.laborHours}
        laborRate={formData.laborRate}
      />

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md hover:bg-primary-600"
        >
          {loading ? 'Saving...' : editLog ? 'Update Maintenance' : 'Schedule Maintenance'}
        </button>
      </div>
    </form>
  );
};

export default MaintenanceForm;