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
    <div className="bg-[#16192B] border border-white/10 rounded-2xl shadow-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#0F111A] text-left border-b border-white/10">
              <th className="px-5 py-4 text-xs font-bold text-white uppercase tracking-wider">Driver Name</th>
              <th className="px-5 py-4 text-xs font-bold text-white uppercase tracking-wider">Phone</th>
              <th className="px-5 py-4 text-xs font-bold text-white uppercase tracking-wider">Reason</th>
              <th className="px-5 py-4 text-xs font-bold text-white uppercase tracking-wider">Date Wanted</th>
              <th className="px-5 py-4 text-xs font-bold text-white uppercase tracking-wider">Type</th>
              <th className="px-5 py-4 text-xs font-bold text-white uppercase tracking-wider">Status</th>
              <th className="px-5 py-4 text-xs font-bold text-white uppercase tracking-wider">Category</th>
              <th className="px-5 py-4 text-xs font-bold text-white uppercase tracking-wider text-right w-44">Actions</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} className="border-t border-white/10 hover:bg-[#1E2238]/60 transition-colors">
                <td className="px-5 py-4 align-middle whitespace-nowrap">
                  <div className="font-bold text-white text-sm">{e.fullName}</div>
                  {e.email && <div className="text-xs text-slate-400 truncate max-w-[180px]">{e.email}</div>}
                </td>
                <td className="px-5 py-4 align-middle whitespace-nowrap">
                  <span className="text-sm font-semibold font-mono text-white tracking-wide">{e.phone}</span>
                </td>
                <td className="px-5 py-4 align-middle">
                  <div className="text-xs font-medium text-slate-200 max-w-[200px] truncate" title={e.reason || ''}>
                    {e.reason || '—'}
                  </div>
                </td>
                <td className="px-5 py-4 align-middle whitespace-nowrap">
                  <span className="text-xs font-bold text-white font-mono">
                    {e.dateWanted ? format(e.dateWanted, 'dd/MM/yyyy') : '—'}
                  </span>
                </td>
                <td className="px-5 py-4 align-middle whitespace-nowrap">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-[#1E2238] text-white border border-white/15">
                    {e.waitingType === 'open' ? 'Open' : 'Specific Date'}
                  </span>
                </td>
                <td className="px-5 py-4 align-middle whitespace-nowrap">
                  {can('waiting', 'update') ? (
                    <select
                      id={`waiting-status-${e.id}`}
                      value={e.status}
                      onChange={(ev) => onStatusChange(e, ev.target.value as WaitingStatus)}
                      className="px-3 py-1.5 bg-[#0F111A] border border-white/20 rounded-xl text-white text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-sm transition"
                    >
                      <option value="new" className="bg-[#0F111A] text-white py-1">New</option>
                      <option value="contacted" className="bg-[#0F111A] text-white py-1">Contacted</option>
                      <option value="waiting" className="bg-[#0F111A] text-white py-1">Waiting</option>
                      <option value="offered" className="bg-[#0F111A] text-white py-1">Offered</option>
                      <option value="booked" className="bg-[#0F111A] text-white py-1">Booked</option>
                      <option value="not_proceeding" className="bg-[#0F111A] text-white py-1">Not Proceeding</option>
                    </select>
                  ) : (
                    <span className="capitalize text-xs font-bold px-2.5 py-1 rounded-full bg-white/10 text-white border border-white/20">
                      {e.status.replace('_', ' ')}
                    </span>
                  )}
                </td>
                <td className="px-5 py-4 align-middle">
                  <div
                    className="text-xs font-medium text-slate-200 max-w-[180px] truncate"
                    title={(e.categoryIds || []).map((id) => categoriesById[id] || id).join(', ')}
                  >
                    {(e.categoryIds || []).map((id) => categoriesById[id] || id).join(', ') || '—'}
                  </div>
                </td>
                <td className="px-5 py-4 align-middle whitespace-nowrap text-right">
                  <div className="flex items-center justify-end gap-2">
                    {can('waiting', 'view') && (
                      <button
                        id={`waiting-view-${e.id}`}
                        className="p-2 rounded-xl bg-sky-500/10 hover:bg-sky-500/25 text-sky-400 hover:text-white border border-sky-400/20 hover:border-sky-400/50 transition shadow-xs"
                        title="View Details"
                        onClick={() => onView(e)}
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    )}
                    {can('waiting', 'update') && (
                      <button
                        id={`waiting-edit-${e.id}`}
                        className="p-2 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/25 text-indigo-400 hover:text-white border border-indigo-400/20 hover:border-indigo-400/50 transition shadow-xs"
                        title="Edit Entry"
                        onClick={() => onEdit(e)}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    )}
                    {can('waiting', 'reminder') && (
                      <button
                        id={`waiting-reminder-${e.id}`}
                        className="p-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/25 text-amber-400 hover:text-white border border-amber-400/20 hover:border-amber-400/50 transition shadow-xs"
                        title="Reminders & Notes"
                        onClick={() => onReminder(e)}
                      >
                        <Bell className="h-4 w-4" />
                      </button>
                    )}
                    {can('waiting', 'quickContact') && (
                      <button
                        id={`waiting-contact-${e.id}`}
                        className="p-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/25 text-emerald-400 hover:text-white border border-emerald-400/20 hover:border-emerald-400/50 transition shadow-xs"
                        title="Quick Contact"
                        onClick={() => onQuickContact(e)}
                      >
                        <Phone className="h-4 w-4" />
                      </button>
                    )}
                    {can('waiting', 'delete') && (
                      <button
                        id={`waiting-delete-${e.id}`}
                        className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/25 text-rose-400 hover:text-white border border-rose-400/20 hover:border-rose-400/50 transition shadow-xs"
                        title="Delete Entry"
                        onClick={() => onDelete?.(e)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td className="px-6 py-12 text-center text-slate-400" colSpan={8}>
                  <div className="flex flex-col items-center justify-center space-y-1">
                    <p className="text-sm font-bold text-white">No waiting entries found</p>
                    <p className="text-xs text-slate-400">Try adjusting your search criteria or filters.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default WaitingTable;