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
import { usePersistentPagination } from '../../hooks/usePersistentPagination';

type AnyRow = { [k: string]: any };

interface DataTableProps<T extends AnyRow> {
  data: T[];
  columns: ColumnDef<T, any>[];
  onRowClick?: (row: T) => void;
  /** Your module key already used in permissions (helps auto-keying pagination) */
  module?: string;
  /** Optional: override the auto storage key if you want */
  tableId?: string;
  /** Optional default size (10 by default) */
  initialPageSize?: number;
  /** Optional: class per row (you already pass this in VehicleTable) */
  rowClassName?: (row: { original: T }) => string;
}

/** small stable hash for column signature */
function hashColumns(cols: ColumnDef<any, any>[]) {
  try {
    const ids = cols.map((c: any) => c.id || c.accessorKey || c.header?.toString?.() || '').join('|');
    let h = 0;
    for (let i = 0; i < ids.length; i++) {
      h = (h * 31 + ids.charCodeAt(i)) | 0;
    }
    return Math.abs(h).toString(36);
  } catch {
    return 'cols';
  }
}

export function DataTable<T extends AnyRow>({
  data,
  columns,
  onRowClick,
  module,
  tableId,
  initialPageSize = 10,
  rowClassName,
}: DataTableProps<T>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const { can } = usePermissions();

  // ---- Controlled + persistent pagination (no page edits needed anywhere) ----
  const autoKeyPart =
    typeof window !== 'undefined' ? window.location.pathname.replace(/\W+/g, ':') : 'route';
  const colsSig = hashColumns(columns as any);
  const persistKey = tableId || `${autoKeyPart}:${module || 'mod'}:${colsSig}`;

  const { pagination, setPagination, setPageIndex, setPageSize } = usePersistentPagination(
    persistKey,
    { pageSize: initialPageSize }
  );

  const table = useReactTable({
    data,
    columns,
    state: { sorting, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    // @ts-expect-error exists at runtime; prevents jump to page 1 on data change
    autoResetPageIndex: false,
  });

  // Clamp to last page if data shrinks (e.g. delete)
  React.useEffect(() => {
    queueMicrotask?.(() => {
      const total = table.getPageCount?.() ?? 1;
      if (pagination.pageIndex > total - 1) {
        setPageIndex(Math.max(0, total - 1));
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.length]);

  // -------- Mobile/Tablet card renderer (<= lg) --------
  const renderCardList = () => {
    const headerGroups = table.getHeaderGroups();
    const headerMap = new Map<string, React.ReactNode>();
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {rows.map(row => {
            const cells = row.getVisibleCells();

            const infoCells = cells.filter(c => {
              const label = String(headerMap.get(c.column.id) ?? '').trim();
              return label.toLowerCase() !== 'actions';
            });

            const titleCell = infoCells[0];
            const subtitleCell = infoCells[1];

            const rowCls = rowClassName ? rowClassName({ original: row.original }) : '';

            return (
              <div
                key={row.id}
                className={`rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-colors ${rowCls ? rowCls : 'hover:bg-gray-50'}`}
                onClick={() => {
                  if (onRowClick && (!module || can(module as any, 'view'))) {
                    onRowClick(row.original as T);
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
            Page {pagination.pageIndex + 1} of {table.getPageCount()}
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
  const renderDesktopTable = () => (
    <div className="hidden lg:block space-y-4">
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <th key={header.id} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
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
            {table.getRowModel().rows.map(row => {
              // Get custom row classes (e.g., bg-red-100 from warnings)
              const customCls = rowClassName ? rowClassName({ original: row.original }) : '';
              
              // Only apply hover:bg-gray-50 if there is NO custom color assigned to this row
              const rowCls = customCls ? customCls : 'hover:bg-gray-50';

              return (
                <tr
                  key={row.id}
                  onClick={() => (!module || can(module as any, 'view')) && onRowClick?.(row.original as T)}
                  className={`transition-colors group ${onRowClick && (!module || can(module as any, 'view')) ? 'cursor-pointer' : ''} ${rowCls}`}
                >
                  {row.getVisibleCells().map(cell => (
                    // bg-transparent ensures the cell doesn't have its own background color blocking the row color
                    <td key={cell.id} className="px-6 py-4 bg-transparent">
                      {flexRender(cell.column.columnDef.cell ?? cell.column.columnDef.header, cell.getContext())}
                    </td>
                  ))}
                </tr>
              );
            })}
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
            value={pagination.pageSize}
            onChange={e => setPageSize(Number(e.target.value))}
          >
            {[10, 20, 30, 40, 50].map(pageSize => (
              <option key={pageSize} value={pageSize}>
                Show {pageSize}
              </option>
            ))}
          </select>
          <span className="text-sm text-gray-700">
            Page {pagination.pageIndex + 1} of {table.getPageCount()}
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {renderCardList()}
      {renderDesktopTable()}
    </div>
  );
}

export default DataTable;