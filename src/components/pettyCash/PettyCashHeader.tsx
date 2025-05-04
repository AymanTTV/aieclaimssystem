// src/components/pettyCash/PettyCashHeader.tsx

import React from 'react';
import { Plus, Download, Search } from 'lucide-react';
import { usePermissions } from '../../hooks/usePermissions';
import { useAuth } from '../../context/AuthContext';
import { exportToExcel } from '../../utils/excel';
import toast from 'react-hot-toast';



interface PettyCashHeaderProps {
  onSearch: (query: string) => void;
  onAdd: () => void;
  title?: string; // Add title prop
}

const PettyCashHeader: React.FC<PettyCashHeaderProps> = ({
  onSearch,
  onAdd,
  title = 'AIE Petty Cash' // Default title
}) => {
  
  const { can } = usePermissions();
  const { user } = useAuth();

  const handleExport = () => {
    try {
      // Export logic here
      toast.success('Transactions exported successfully');
    } catch (error) {
      console.error('Error exporting transactions:', error);
      toast.error('Failed to export transactions');
    }
  };

  // const handleGeneratePDF = async () => {
  //   try {
  //     // Get company details
  //     const companyDoc = await getDoc(doc(db, 'companySettings', 'details'));
  //     if (!companyDoc.exists()) {
  //       throw new Error('Company details not found');
  //     }
  //     const companyDetails = companyDoc.data();
  
  //     // Generate PDF with all filtered vehicles
  //     const pdfBlob = await generateBulkDocuments(
  //       VehicleBulkDocument,
  //       filteredVehicles,
  //       companyDetails
  //     );
  
  //     // Create URL and open in new tab
  //     const pdfUrl = URL.createObjectURL(pdfBlob);
  //     window.open(pdfUrl, '_blank');
  
  //     toast.success('Vehicle summary PDF generated successfully');
  //   } catch (error) {
  //     console.error('Error generating vehicle PDF:', error);
  //     toast.error('Failed to generate vehicle PDF');
  //   }
  // };

  return (
    <div className="space-y-4">
      {/* Title and Buttons */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        <div className="flex space-x-2">

        {/* <button
          onClick={handleGeneratePDF}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          <FileText className="h-5 w-5 mr-2" />
          Generate PDF
        </button> */}

          {user?.role === 'manager' && (
            <button
              onClick={handleExport}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <Download className="h-5 w-5 mr-2" />
              Export
            </button>
          )}
          {can('finance', 'create') && (
            <button
              onClick={onAdd}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-600"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add Transaction
            </button>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative flex-1">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Search by name, telephone, description..."
          onChange={(e) => onSearch(e.target.value)}
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
        />
      </div>
    </div>
  );
};

export default PettyCashHeader;
