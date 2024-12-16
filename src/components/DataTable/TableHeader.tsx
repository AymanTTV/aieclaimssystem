import React from 'react';
import { 
  Download,
  Upload,
  Plus,
  Search
} from 'lucide-react';
import { usePermissions } from '../../hooks/usePermissions';

interface TableHeaderProps {
  title: string;
  module: string;
  onAdd?: () => void;
  onImport?: (file: File) => void;
  onExport?: () => void;
  onSearch?: (query: string) => void;
  showAddButton?: boolean;
}

const TableHeader: React.FC<TableHeaderProps> = ({
  title,
  module,
  onAdd,
  onImport,
  onExport,
  onSearch,
  showAddButton = true,
}) => {
  const { can } = usePermissions();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && onImport) {
      onImport(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
      <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
      
      <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
        {onSearch && (
          <div className="relative flex-grow sm:flex-grow-0">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search..."
              onChange={(e) => onSearch(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm"
            />
          </div>
        )}

        <div className="flex gap-2">
          {can(module as any, 'create') && (
            <>
              {onExport && (
                <button
                  onClick={onExport}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </button>
              )}

              {onImport && (
                <>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImport}
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                  />
                  
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Import
                  </button>
                </>
              )}
            </>
          )}

          {showAddButton && can(module as any, 'create') && onAdd && (
            <button
              onClick={onAdd}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add New
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TableHeader;