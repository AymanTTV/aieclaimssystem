// src/components/waiting/WaitingTable.tsx
import React from 'react';
import { Eye, Pencil, Bell, Phone, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import type { WaitingEntry, WaitingStatus } from '../../types/waiting';
import { usePermissions } from '../../hooks/usePermissions';

type Props = {
  entries: WaitingEntry[];
  categoriesById: Record<string, string>;
  groupsById?: Record<string, string>;
  onView: (e: WaitingEntry) => void;
  onEdit: (e: WaitingEntry) => void;
  onQuickContact: (e: WaitingEntry) => void;
  onReminder: (e: WaitingEntry) => void;
  onStatusChange: (e: WaitingEntry, status: WaitingStatus) => void;
  onDelete?: (e: WaitingEntry) => void;
};

const WaitingTable: React.FC<Props> = ({
  entries,
  categoriesById,
  groupsById,
  onView,
  onEdit,
  onQuickContact,
  onReminder,
  onStatusChange,
  onDelete,
}) => {
  const { can } = usePermissions();

  return (
    <div className="rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead className="bg-[#F8FAFC] text-[#334155] border-b-2 border-[#E2E8F0]">
            <tr className="border-b-2 border-[#E2E8F0]">
              <th className="px-5 py-4 text-xs font-semibold text-[#334155] uppercase tracking-wider text-left select-none whitespace-nowrap">Driver Name</th>
              <th className="px-5 py-4 text-xs font-semibold text-[#334155] uppercase tracking-wider text-left select-none whitespace-nowrap">Phone</th>
              <th className="px-5 py-4 text-xs font-semibold text-[#334155] uppercase tracking-wider text-left select-none whitespace-nowrap">Reason</th>
              <th className="px-5 py-4 text-xs font-semibold text-[#334155] uppercase tracking-wider text-left select-none whitespace-nowrap">Date Wanted</th>
              <th className="px-5 py-4 text-xs font-semibold text-[#334155] uppercase tracking-wider text-left select-none whitespace-nowrap">Type</th>
              <th className="px-5 py-4 text-xs font-semibold text-[#334155] uppercase tracking-wider text-left select-none whitespace-nowrap">Status</th>
              <th className="px-5 py-4 text-xs font-semibold text-[#334155] uppercase tracking-wider text-left select-none whitespace-nowrap">Category</th>
              <th className="px-5 py-4 text-xs font-semibold text-[#334155] uppercase tracking-wider text-right w-44 select-none whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e, idx) => {
              const isEven = idx % 2 === 1;
              const rowBg = isEven ? 'bg-[#EEF5FD]' : 'bg-white';

              return (
                <tr key={e.id} className={`group border-b border-[#E2E8F0] ${rowBg} hover:bg-[#DCEBFA] transition-all duration-150 ease-in-out`}>
                  <td className="px-5 py-3.5 align-middle whitespace-nowrap">
                    <div className="font-bold text-slate-900 text-sm">{e.fullName}</div>
                    {e.email && <div className="text-xs text-slate-500 truncate max-w-[180px]">{e.email}</div>}
                  </td>
                  <td className="px-5 py-3.5 align-middle whitespace-nowrap">
                    <span className="text-sm font-semibold font-mono text-slate-800 tracking-wide">{e.phone}</span>
                  </td>
                  <td className="px-5 py-3.5 align-middle">
                    <div className="text-xs font-medium text-slate-700 max-w-[200px] truncate" title={e.reason || ''}>
                      {e.reason || '—'}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 align-middle whitespace-nowrap">
                    <span className="text-xs font-bold text-slate-800 font-mono">
                      {e.dateWanted ? format(e.dateWanted, 'dd/MM/yyyy') : '—'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 align-middle whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-white text-slate-700 border border-slate-300 shadow-2xs">
                      {e.waitingType === 'open' ? 'Open' : 'Specific Date'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 align-middle whitespace-nowrap">
                    {can('waiting', 'update') ? (
                      <select
                        id={`waiting-status-${e.id}`}
                        value={e.status}
                        onChange={(ev) => onStatusChange(e, ev.target.value as WaitingStatus)}
                        className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-slate-800 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer shadow-2xs transition"
                      >
                        <option value="new">New</option>
                        <option value="contacted">Contacted</option>
                        <option value="waiting">Waiting</option>
                        <option value="offered">Offered</option>
                        <option value="booked">Booked</option>
                        <option value="not_proceeding">Not Proceeding</option>
                      </select>
                    ) : (
                      <span className="capitalize text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-300">
                        {e.status.replace('_', ' ')}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 align-middle">
                    <div
                      className="text-xs font-medium text-slate-700 max-w-[180px] truncate"
                      title={(e.categoryIds || []).map((id) => categoriesById[id] || id).join(', ')}
                    >
                      {(e.categoryIds || []).map((id) => categoriesById[id] || id).join(', ') || '—'}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 align-middle whitespace-nowrap text-right" onClick={(ev) => ev.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1.5">
                      {can('waiting', 'view') && (
                        <button
                          id={`waiting-view-${e.id}`}
                          className="p-1.5 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 transition shadow-2xs"
                          title="View Details"
                          onClick={() => onView(e)}
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      )}
                      {can('waiting', 'update') && (
                        <button
                          id={`waiting-edit-${e.id}`}
                          className="p-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition shadow-2xs"
                          title="Edit Entry"
                          onClick={() => onEdit(e)}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      )}
                      {can('waiting', 'reminder') && (
                        <button
                          id={`waiting-reminder-${e.id}`}
                          className="p-1.5 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 transition shadow-2xs"
                          title="Reminders & Notes"
                          onClick={() => onReminder(e)}
                        >
                          <Bell className="h-4 w-4" />
                        </button>
                      )}
                      {can('waiting', 'quickContact') && (
                        <button
                          id={`waiting-contact-${e.id}`}
                          className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition shadow-2xs"
                          title="Quick Contact"
                          onClick={() => onQuickContact(e)}
                        >
                          <Phone className="h-4 w-4" />
                        </button>
                      )}
                      {can('waiting', 'delete') && (
                        <button
                          id={`waiting-delete-${e.id}`}
                          className="p-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition shadow-2xs"
                          title="Delete Entry"
                          onClick={() => onDelete?.(e)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {entries.length === 0 && (
              <tr>
                <td className="px-6 py-12 text-center text-slate-500" colSpan={8}>
                  <div className="flex flex-col items-center justify-center space-y-1">
                    <p className="text-sm font-bold text-slate-700">No waiting entries found</p>
                    <p className="text-xs text-slate-500">Try adjusting your search criteria or filters.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Light Footer */}
      <div className="bg-[#F8FAFC] border-t border-[#E2E8F0] px-5 py-3.5 flex items-center justify-between text-xs text-slate-600">
        <div>
          Showing <span className="font-bold text-slate-900">{entries.length}</span> waiting list entries
        </div>
        <div className="text-slate-500">
          Waiting List Overview
        </div>
      </div>
    </div>
  );
};

export default WaitingTable;