// src/components/DataTable/DataTable.tsx
import React from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  SortingState,
  ColumnDef,
} from '@tanstack/react-table';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { usePermissions } from '../../hooks/usePermissions';

interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T, any>[];
  onRowClick?: (row: T) => void;
  /**
   * Optional module key used by your permissions system to gate row click.
   * If omitted, clicking is allowed when onRowClick is provided.
   */
  module?: string;
}

export function DataTable<T>({ data, columns, onRowClick, module }: DataTableProps<T>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const { can } = usePermissions();

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  // -------- Mobile/Tablet card renderer (<= lg) --------
  const CardList = () => {
    const headerGroups = table.getHeaderGroups();
    const headerMap = new Map<string, React.ReactNode>();
    // Build a map of columnId -> header label
    headerGroups.forEach(hg => {
      hg.headers.forEach(h => {
        if (h.column) {
          headerMap.set(h.column.id, flexRender(h.column.columnDef.header, h.getContext()));
        }
      });
    });

    const rows = table.getRowModel().rows;

    return (
      <div className="lg:hidden space-y-4">
        {/* Cards grid: 1 per row on very small screens, 2 per row on small+ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {rows.map(row => {
            const cells = row.getVisibleCells();

            // Heuristic: first non-"Actions" cell is the title, second becomes subtitle if sensible
            const infoCells = cells.filter(c => {
              const label = String(headerMap.get(c.column.id) ?? '').trim();
              return label.toLowerCase() !== 'actions';
            });

            const titleCell = infoCells[0];
            const subtitleCell = infoCells[1];

            return (
              <div
                key={row.id}
                className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                onClick={() => {
                  if (onRowClick && (!module || can(module as any, 'view'))) {
                    onRowClick(row.original as unknown as T);
                  }
                }}
                role={onRowClick ? 'button' : undefined}
              >
                <div className="mb-3">
                  <div className="text-base font-semibold text-gray-900">
                    {titleCell
                      ? flexRender(
                          titleCell.column.columnDef.cell ?? titleCell.column.columnDef.header,
                          titleCell.getContext()
                        )
                      : null}
                  </div>
                  {subtitleCell ? (
                    <div className="text-sm text-gray-600 mt-0.5">
                      {flexRender(
                        subtitleCell.column.columnDef.cell ?? subtitleCell.column.columnDef.header,
                        subtitleCell.getContext()
                      )}
                    </div>
                  ) : null}
                </div>

                {/* Inline label:value pairs */}
                <div className="grid grid-cols-1 gap-y-2">
                  {infoCells.slice(2).map(cell => {
                    const label = headerMap.get(cell.column.id);
                    return (
                      <div key={cell.id} className="min-w-0">
                        <div className="text-sm text-gray-900">
                          <div className="flex flex-wrap items-baseline">
                            <span className="text-[11px] uppercase tracking-wide text-gray-500 mr-1 whitespace-nowrap">
                              {label}:
                            </span>
                            <span className="break-words">
                              {flexRender(
                                cell.column.columnDef.cell ?? cell.column.columnDef.header,
                                cell.getContext()
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* If there is an Actions column, render it as a toolbar at the bottom */}
                {cells.some(c => String(headerMap.get(c.column.id) ?? '').trim().toLowerCase() === 'actions') && (
                  <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap gap-2">
                    {cells
                      .filter(c => String(headerMap.get(c.column.id) ?? '').trim().toLowerCase() === 'actions')
                      .map(c => (
                        <div key={c.id} className="flex gap-2">
                          {flexRender(c.column.columnDef.cell ?? c.column.columnDef.header, c.getContext())}
                        </div>
                      ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Mobile Pagination */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              className="btn btn-outline p-2"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
              aria-label="First page"
            >
              <ChevronsLeft className="h-4 w-4" />
            </button>
            <button
              className="btn btn-outline p-2"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>

          <span className="text-sm text-gray-700">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </span>

          <div className="flex items-center gap-2">
            <button
              className="btn btn-outline p-2"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              className="btn btn-outline p-2"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
              aria-label="Last page"
            >
              <ChevronsRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  // -------- Desktop table renderer (>= lg) --------
  const DesktopTable = () => (
    <div className="hidden lg:block space-y-4">
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <th key={header.id} className="table-header px-6 py-3">
                    {header.isPlaceholder ? null : (
                      <div
                        className={header.column.getCanSort() ? 'cursor-pointer select-none' : ''}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {table.getRowModel().rows.map(row => (
              <tr
                key={row.id}
                onClick={() => (!module || can(module as any, 'view')) && onRowClick?.(row.original as unknown as T)}
                className={`table-row ${onRowClick && (!module || can(module as any, 'view')) ? 'cursor-pointer' : ''}`}
              >
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id} className="table-cell px-6 py-4">
                    {flexRender(cell.column.columnDef.cell ?? cell.column.columnDef.header, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            className="btn btn-outline p-1"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
            aria-label="First page"
          >
            <ChevronsLeft className="h-4 w-4" />
          </button>
          <button
            className="btn btn-outline p-1"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            className="btn btn-outline p-1"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            className="btn btn-outline p-1"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
            aria-label="Last page"
          >
            <ChevronsRight className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <select
            className="select"
            value={table.getState().pagination.pageSize}
            onChange={e => table.setPageSize(Number(e.target.value))}
          >
            {[10, 20, 30, 40, 50].map(pageSize => (
              <option key={pageSize} value={pageSize}>
                Show {pageSize}
              </option>
            ))}
          </select>
          <span className="text-sm text-gray-700">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </span>
        </div>
      </div>
    </div>
  );

  // ---- Render ----
  return (
    <div className="space-y-4">
      {/* Mobile & Tablet cards */}
      <CardList />
      {/* Desktop table */}
      <DesktopTable />
    </div>
  );
}

export default DataTable;
