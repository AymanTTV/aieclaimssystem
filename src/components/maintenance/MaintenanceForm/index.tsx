{/* Previous imports remain the same */}

const MaintenanceForm: React.FC<MaintenanceFormProps> = ({ vehicles, onClose, editLog }) => {
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Previous sections remain the same */}

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