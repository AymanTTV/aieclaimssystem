import React from 'react';
import { Plus } from 'lucide-react';

interface ManagersListProps {
  onAddManager: () => void;
  onSelectManager?: (managerId: string) => void;
}

const ManagersList: React.FC<ManagersListProps> = ({ onAddManager, onSelectManager }) => {
  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-medium text-gray-900">Managers</h2>
          <button
            onClick={onAddManager}
            className="inline-flex items-center px-3 py-1.5 border border-primary text-sm font-medium rounded text-primary hover:bg-primary hover:text-white transition-colors"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Manager
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Username
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Groups
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last action
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contacts
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              <tr>
                <td className="px-6 py-8 text-center text-sm text-gray-500" colSpan={6}>
                  <div className="text-center">
                    <p className="font-medium text-gray-900 mb-1">All of your managers will be displayed here.</p>
                    <p className="text-gray-500">Add your first manager.</p>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ManagersList;