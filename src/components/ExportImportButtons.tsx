import React from 'react';
import { Download, Upload } from 'lucide-react';

interface ExportImportButtonsProps {
  onExport: () => void;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  importLabel?: string;
  exportLabel?: string;
  acceptedFileTypes?: string;
}

const ExportImportButtons: React.FC<ExportImportButtonsProps> = ({
  onExport,
  onImport,
  importLabel = 'Import',
  exportLabel = 'Export',
  acceptedFileTypes = '.xlsx,.xls',
}) => {
  return (
    <div className="flex space-x-2">
      <button
        onClick={onExport}
        className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
      >
        <Download className="w-5 h-5 mr-2" />
        {exportLabel}
      </button>
      <label className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 cursor-pointer">
        <Upload className="w-5 h-5 mr-2" />
        {importLabel}
        <input
          type="file"
          className="hidden"
          accept={acceptedFileTypes}
          onChange={onImport}
        />
      </label>
    </div>
  );
};

export default ExportImportButtons;