import React from 'react';

interface LaborSectionProps {
  formData: {
    laborHours: number;
    laborRate: number;
  };
  setFormData: (data: any) => void;
  includeVATOnLabor: boolean;
  setIncludeVATOnLabor: (include: boolean) => void;
  calculateLaborCost: () => number;
}

const LaborSection: React.FC<LaborSectionProps> = ({
  formData,
  setFormData,
  includeVATOnLabor,
  setIncludeVATOnLabor,
  calculateLaborCost,
}) => {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">Labor</label>
      <div className="flex items-center space-x-2 mt-1">
        <input
          type="number"
          value={formData.laborHours}
          onChange={(e) => setFormData({ ...formData, laborHours: parseFloat(e.target.value) })}
          placeholder="Hours"
          className="w-24 rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
          min="0"
          step="0.5"
        />
        <span className="py-2">×</span>
        <input
          type="number"
          value={formData.laborRate}
          onChange={(e) => setFormData({ ...formData, laborRate: parseFloat(e.target.value) })}
          placeholder="Rate/hour"
          className="w-24 rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
          min="0"
          step="0.01"
        />
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={includeVATOnLabor}
            onChange={(e) => setIncludeVATOnLabor(e.target.checked)}
            className="rounded border-gray-300 text-primary focus:ring-primary"
          />
          <span className="text-sm text-gray-600">+VAT</span>
        </label>
        <span className="py-2">= £{calculateLaborCost().toFixed(2)}</span>
      </div>
    </div>
  );
};

export default LaborSection;