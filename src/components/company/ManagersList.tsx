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

        <div className="rounded-2xl border border-[#2B314E] shadow-xl overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead className="bg-[#16192B] text-white">
                <tr className="border-b border-[#2B314E]">
                  <th className="px-5 py-4 text-left text-xs font-bold text-white uppercase tracking-wider select-none whitespace-nowrap">
                    Username
                  </th>
                  <th className="px-5 py-4 text-left text-xs font-bold text-white uppercase tracking-wider select-none whitespace-nowrap">
                    Groups
                  </th>
                  <th className="px-5 py-4 text-left text-xs font-bold text-white uppercase tracking-wider select-none whitespace-nowrap">
                    Location
                  </th>
                  <th className="px-5 py-4 text-left text-xs font-bold text-white uppercase tracking-wider select-none whitespace-nowrap">
                    Last action
                  </th>
                  <th className="px-5 py-4 text-left text-xs font-bold text-white uppercase tracking-wider select-none whitespace-nowrap">
                    Contacts
                  </th>
                  <th className="px-5 py-4 text-left text-xs font-bold text-white uppercase tracking-wider select-none whitespace-nowrap">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="px-5 py-12 text-center text-sm text-slate-500 bg-white" colSpan={6}>
                    <div className="text-center">
                      <p className="font-bold text-slate-800 mb-1">All of your managers will be displayed here.</p>
                      <p className="text-slate-500">Add your first manager using the button above.</p>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Consistent Dark Navy Footer */}
          <div className="bg-[#16192B] border-t border-[#2B314E] px-5 py-3.5 flex items-center justify-between text-xs text-slate-300">
            <div>
              Showing <span className="font-bold text-white">0</span> managers
            </div>
            <div className="text-slate-400">
              Manager Directory
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManagersList;