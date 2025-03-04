import React from 'react';
import { Part } from '../../../../types';

interface PartsSectionProps {
  parts: (Part & { includeVAT: boolean })[];
  setParts: (parts: (Part & { includeVAT: boolean })[]) => void;
}

const PartsSection: React.FC<PartsSectionProps> = ({ parts, setParts }) => {
  const handleAddPart = () => {
    setParts([...parts, { name: '', quantity: 1, cost: 0, includeVAT: false }]);
  };

  const handlePartChange = (index: number, field: keyof (Part & { includeVAT: boolean }), value: any) => {
    const newParts = [...parts];
    newParts[index] = { ...newParts[index], [field]: value };
    setParts(newParts);
  };

  const handleRemovePart = (index: number) => {
    setParts(parts.filter((_, i) => i !== index));
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <label className="block text-sm font-medium text-gray-700">Parts</label>
        <button
          type="button"
          onClick={handleAddPart}
          className="px-2 py-1 text-sm text-primary hover:bg-primary-50 rounded-md"
        >
          Add Part
        </button>
      </div>
      {parts.map((part, index) => (
        <div key={index} className="flex space-x-2 mb-2">
          <input
            type="text"
            value={part.name}
            onChange={(e) => handlePartChange(index, 'name', e.target.value)}
            placeholder="Part name"
            className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
          />
          <input
            type="number"
            value={part.quantity}
            onChange={(e) => handlePartChange(index, 'quantity', parseInt(e.target.value))}
            placeholder="Qty"
            className="w-20 rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
            min="1"
          />
          <input
            type="number"
            value={part.cost}
            onChange={(e) => handlePartChange(index, 'cost', parseFloat(e.target.value))}
            placeholder="Cost"
            className="w-24 rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
            min="0"
            step="0.01"
          />
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={part.includeVAT}
              onChange={(e) => handlePartChange(index, 'includeVAT', e.target.checked)}
              className="rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span className="text-sm text-gray-600">+VAT</span>
          </label>
          <button
            type="button"
            onClick={() => handleRemovePart(index)}
            className="px-2 py-1 text-sm text-red-600 hover:bg-red-50 rounded-md"
          >
            Remove
          </button>
        </div>
      ))}
    </div>
  );
};

export default PartsSection;