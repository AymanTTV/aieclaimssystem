import React from 'react';
import clsx from 'clsx';

interface Column<T> {
  header: string;
  accessor: keyof T | ((item: T) => React.ReactNode);
  className?: string;
}

interface TableProps<T> {
  data: T[];
  columns: Column<T>[];
  onRowClick?: (item: T) => void;
  isLoading?: boolean;
}

export default function Table<T extends { id: string }>({
  data,
  columns,
  onRowClick,
  isLoading = false,
}: TableProps<T>) {
  if (isLoading) {
    return (
      <div className="min-h-[200px] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden bg-white">
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead className="bg-[#F8FAFC] text-[#334155] border-b-2 border-[#E2E8F0]">
            <tr className="border-b-2 border-[#E2E8F0]">
              {columns.map((column, index) => (
                <th
                  key={index}
                  scope="col"
                  className={clsx(
                    'px-5 py-4 text-left text-xs font-semibold text-[#334155] uppercase tracking-wider select-none whitespace-nowrap',
                    column.className
                  )}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((item, idx) => {
              const isEven = idx % 2 === 1;
              const rowBg = isEven ? 'bg-[#EEF5FD]' : 'bg-white';
              return (
                <tr
                  key={item.id}
                  onClick={() => onRowClick?.(item)}
                  className={clsx(
                    'group border-b border-[#E2E8F0] transition-all duration-150 ease-in-out',
                    rowBg,
                    'hover:bg-[#DCEBFA]',
                    onRowClick && 'cursor-pointer'
                  )}
                >
                  {columns.map((column, index) => (
                    <td
                      key={index}
                      className={clsx(
                        'px-5 py-3.5 whitespace-nowrap text-sm text-slate-800 font-medium',
                        column.className
                      )}
                    >
                      {typeof column.accessor === 'function'
                        ? column.accessor(item)
                        : (item[column.accessor] as React.ReactNode)}
                    </td>
                  ))}
                </tr>
              );
            })}
            {data.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-5 py-12 text-center text-sm text-slate-500 font-medium">
                  No records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Consistent Light Footer */}
      <div className="bg-[#F8FAFC] border-t border-[#E2E8F0] px-5 py-3.5 flex items-center justify-between text-xs text-slate-600">
        <div>
          Showing <span className="font-bold text-slate-900">{data.length}</span> record{data.length === 1 ? '' : 's'}
        </div>
      </div>
    </div>
  );
}