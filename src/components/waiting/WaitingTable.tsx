// src/components/waiting/WaitingTable.tsx
import React from 'react';
import { Eye, Pencil, Bell, Phone, Trash2 } from 'lucide-react';
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
  onView,
  onEdit,
  onQuickContact,
  onReminder,
  onStatusChange,
  onDelete,
}) => {
  const { can } = usePermissions();

  return (
    <div className="bg-white border rounded">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 text-left">
            <th className="px-3 py-2">Name</th>
            <th className="px-3 py-2">Phone</th>
            <th className="px-3 py-2">Reason</th>
            <th className="px-3 py-2">Date Wanted</th>
            <th className="px-3 py-2">Type</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2">Category</th>
            <th className="px-3 py-2 w-36 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.id} className="border-t hover:bg-gray-50">
              <td className="px-3 py-2 font-medium">{e.fullName}</td>
              <td className="px-3 py-2">{e.phone}</td>
              <td className="px-3 py-2">{e.reason || '-'}</td>
              <td className="px-3 py-2">
                {e.dateWanted ? e.dateWanted.toLocaleDateString() : '—'}
              </td>
              <td className="px-3 py-2 capitalize">
                {e.waitingType === 'open' ? 'Open' : 'Specific Date'}
              </td>
              <td className="px-3 py-2">
                {can('waiting', 'update') ? (
                  <select
                    value={e.status}
                    onChange={(ev) => onStatusChange(e, ev.target.value as WaitingStatus)}
                    className="form-select text-xs w-full"
                  >
                    <option value="new">New</option>
                    <option value="contacted">Contacted</option>
                    <option value="waiting">Waiting</option>
                    <option value="offered">Offered</option>
                    <option value="booked">Booked</option>
                    <option value="not_proceeding">Not Proceeding</option>
                  </select>
                ) : (
                  <span className="capitalize text-xs font-medium px-2.5 py-1 rounded bg-gray-100 text-gray-700">
                    {e.status.replace('_', ' ')}
                  </span>
                )}
              </td>
              <td className="px-3 py-2">
                {(e.categoryIds || []).map((id) => categoriesById[id] || id).join(' | ') || '—'}
              </td>
              <td className="px-3 py-2">
                <div className="flex items-center justify-end gap-1.5">
                  {can('waiting', 'view') && (
                    <button
                      className="p-1.5 rounded hover:bg-gray-100 text-blue-600"
                      title="View"
                      onClick={() => onView(e)}
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  )}
                  {can('waiting', 'update') && (
                    <button
                      className="p-1.5 rounded hover:bg-gray-100 text-indigo-600"
                      title="Edit"
                      onClick={() => onEdit(e)}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  )}
                  {can('waiting', 'reminder') && (
                    <button
                      className="p-1.5 rounded hover:bg-gray-100 text-yellow-600"
                      title="Reminder"
                      onClick={() => onReminder(e)}
                    >
                      <Bell className="h-4 w-4" />
                    </button>
                  )}
                  {can('waiting', 'quickContact') && (
                    <button
                      className="p-1.5 rounded hover:bg-gray-100 text-green-600"
                      title="Quick Contact"
                      onClick={() => onQuickContact(e)}
                    >
                      <Phone className="h-4 w-4" />
                    </button>
                  )}
                  {can('waiting', 'delete') && (
                    <button
                      className="p-1.5 rounded hover:bg-red-50 text-red-600"
                      title="Delete"
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
              <td className="px-3 py-6 text-center text-gray-500" colSpan={8}>
                No entries found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default WaitingTable;