// src/components/ui/FileHandlerDropdown.tsx
import React, { useState, useEffect } from 'react';
import { useFormContext, useController } from 'react-hook-form';

interface FileHandler {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
}

interface FileHandlerDropdownProps {
  name: string;
  label: string;
  // You might fetch these from an API in a real application
  options: FileHandler[];
  error?: string;
}

const FileHandlerDropdown: React.FC<FileHandlerDropdownProps> = ({ name, label, options, error }) => {
  const { control } = useFormContext();
  const { field } = useController({ name, control, defaultValue: [] });

  const [selectedHandlers, setSelectedHandlers] = useState<FileHandler[]>(field.value || []);

  useEffect(() => {
    field.onChange(selectedHandlers);
  }, [selectedHandlers, field]);

  const handleSelectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedIds = Array.from(event.target.selectedOptions, option => option.value);
    const newSelectedHandlers = options.filter(handler => selectedIds.includes(handler.id));
    setSelectedHandlers(newSelectedHandlers);
  };

  const handleRemoveHandler = (id: string) => {
    setSelectedHandlers(prev => prev.filter(handler => handler.id !== id));
  };

  return (
    <div className="mb-4">
      <label htmlFor={name} className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      <select
        id={name}
        multiple
        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
        value={selectedHandlers.map(h => h.id)}
        onChange={handleSelectChange}
      >
        {options.map((handler) => (
          <option key={handler.id} value={handler.id}>
            {handler.name}
          </option>
        ))}
      </select>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <div className="mt-2 space-y-2">
        {selectedHandlers.map((handler) => (
          <div key={handler.id} className="flex items-center justify-between bg-gray-100 p-2 rounded-md">
            <div>
              <p className="text-sm font-medium">{handler.name}</p>
              <p className="text-sm text-gray-500">{handler.email}</p>
              <p className="text-sm text-gray-500">{handler.phone}</p>
              <p className="text-sm text-gray-500">{handler.address}</p>
            </div>
            <button
              type="button"
              onClick={() => handleRemoveHandler(handler.id)}
              className="text-red-600 hover:text-red-900 text-sm"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FileHandlerDropdown;