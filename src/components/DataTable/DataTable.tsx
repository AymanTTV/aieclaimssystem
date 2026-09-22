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
  /** Visual theme for the table - default or navy with alternating light blue rows */
  theme?: 'default' | 'navy';
  /** If true, optimizes table spacing, padding, and layout to fit inside the screen without horizontal scrolling */
  compact?: boolean;
  /** If true, renders full-width separated horizontal rows */
  separatedRows?: boolean;
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
  theme = 'navy',
  compact = false,
  separatedRows = false,
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
          {rows.map((row, idx) => {
            const cells = row.getVisibleCells();

            const infoCells = cells.filter(c => {
              const label = String(headerMap.get(c.column.id) ?? '').trim();
              return label.toLowerCase() !== 'actions';
            });

            const titleCell = infoCells[0];
            const subtitleCell = infoCells[1];

            const customCls = rowClassName ? rowClassName({ original: row.original }) : '';
            const isEven = idx % 2 === 1;
            const defaultCardBg = isEven ? 'bg-[#EEF5FD] border-[#DCEBFA]' : 'bg-white border-slate-200';
            const rowCls = customCls
              ? customCls
              : `${defaultCardBg} hover:bg-[#DCEBFA] transition-all`;

            return (
              <div
                key={row.id}
                className={`rounded-xl border p-4 shadow-sm transition-colors ${rowCls}`}
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
                  <div
                    className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap gap-2"
                    onClick={(e) => { e.stopPropagation(); }}
                  >
                    {cells
                      .filter(c => String(headerMap.get(c.column.id) ?? '').trim().toLowerCase() === 'actions')
                      .map(c => (
                        <div key={c.id} className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                          {flexRender(c.column.columnDef.cell ?? c.column.columnDef.header, c.getContext())}
                        </div>
                      ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Mobile Pagination - Consistent Dark Navy Bar */}
        <div className="bg-[#16192B] border border-[#2B314E] rounded-2xl p-4 shadow-xl flex items-center justify-between text-xs text-slate-300">
          <div className="flex items-center gap-1.5">
            <button
              className="p-1.5 rounded-lg bg-[#1E2238] border border-[#2B314E] text-white hover:bg-[#2B314E] disabled:opacity-30 disabled:hover:bg-[#1E2238] transition-colors"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
              aria-label="First page"
              title="First page"
            >
              <ChevronsLeft className="h-4 w-4" />
            </button>
            <button
              className="p-1.5 rounded-lg bg-[#1E2238] border border-[#2B314E] text-white hover:bg-[#2B314E] disabled:opacity-30 disabled:hover:bg-[#1E2238] transition-colors"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              aria-label="Previous page"
              title="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>

          <span className="text-slate-300 font-medium">
            Page <span className="font-bold text-white">{pagination.pageIndex + 1}</span> of{' '}
            <span className="font-bold text-white">{table.getPageCount() || 1}</span>
          </span>

          <div className="flex items-center gap-1.5">
            <button
              className="p-1.5 rounded-lg bg-[#1E2238] border border-[#2B314E] text-white hover:bg-[#2B314E] disabled:opacity-30 disabled:hover:bg-[#1E2238] transition-colors"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              aria-label="Next page"
              title="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              className="p-1.5 rounded-lg bg-[#1E2238] border border-[#2B314E] text-white hover:bg-[#2B314E] disabled:opacity-30 disabled:hover:bg-[#1E2238] transition-colors"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
              aria-label="Last page"
              title="Last page"
            >
              <ChevronsRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  // -------- Desktop table renderer (>= lg) --------
  const renderDesktopTable = () => {
    const rows = table.getRowModel().rows;
    const startIdx = rows.length > 0 ? pagination.pageIndex * pagination.pageSize + 1 : 0;
    const endIdx = Math.min((pagination.pageIndex + 1) * pagination.pageSize, data.length);

    return (
      <div className="hidden lg:block">
        <div className={`${compact ? 'w-full overflow-hidden' : 'overflow-x-auto'} rounded-2xl border border-[#2B314E] shadow-xl ${separatedRows ? 'bg-slate-100/75' : 'bg-white'}`}>
          <div className={separatedRows ? 'p-3' : ''}>
            <table className={`w-full ${separatedRows ? 'border-separate border-spacing-y-2' : 'border-collapse'}`}>
              <thead className="bg-[#16192B] text-white">
                {table.getHeaderGroups().map(headerGroup => (
                  <tr key={headerGroup.id} className={separatedRows ? 'shadow-xs' : 'border-b border-[#2B314E]'}>
                    {headerGroup.headers.map((header, hIdx) => {
                      const isFirst = hIdx === 0;
                      const isLast = hIdx === headerGroup.headers.length - 1;
                      return (
                        <th
                          key={header.id}
                          className={`${compact ? 'px-2.5 py-3 text-xs' : 'px-5 py-4 text-xs'} text-left font-bold text-white uppercase tracking-wider select-none whitespace-nowrap ${
                            separatedRows
                              ? `bg-[#16192B] border-y border-[#2B314E] ${isFirst ? 'rounded-l-xl border-l' : ''} ${isLast ? 'rounded-r-xl border-r' : ''}`
                              : ''
                          } ${(header.column.columnDef.meta as any)?.headerClassName || (header.column.columnDef.meta as any)?.className || ''}`}
                        >
                          {header.isPlaceholder ? null : (
                            <div
                              className={`flex items-center gap-1.5 ${
                                header.column.getCanSort() ? 'cursor-pointer select-none hover:text-blue-300 transition-colors' : ''
                              }`}
                              onClick={header.column.getToggleSortingHandler()}
                            >
                              <span>{flexRender(header.column.columnDef.header, header.getContext())}</span>
                              {header.column.getCanSort() && (
                                <span className="text-slate-400 text-xs">
                                  {{
                                    asc: ' ▴',
                                    desc: ' ▾',
                                  }[header.column.getIsSorted() as string] ?? ' ↕'}
                                </span>
                              )}
                            </div>
                          )}
                        </th>
                      );
                    })}
                  </tr>
                ))}
              </thead>
              <tbody>
                {rows.map((row, idx) => {
                  const isEven = idx % 2 === 1;
                  const baseBg = separatedRows ? 'bg-white' : (isEven ? 'bg-[#EEF5FD]' : 'bg-white');
                  const customCls = rowClassName ? rowClassName({ original: row.original }) : '';
                  const rowCls = customCls
                    ? customCls
                    : `${baseBg} hover:bg-[#DCEBFA] transition-all duration-150 ease-in-out`;

                  return (
                    <tr
                      key={row.id}
                      onClick={() => (!module || can(module as any, 'view')) && onRowClick?.(row.original as T)}
                      className={`group ${
                        separatedRows
                          ? 'shadow-xs hover:shadow-md transition-all duration-150 rounded-xl'
                          : 'border-b border-[#E2E8F0]'
                      } ${onRowClick && (!module || can(module as any, 'view')) ? 'cursor-pointer' : ''} ${rowCls}`}
                    >
                      {row.getVisibleCells().map((cell, cIdx) => {
                        const isFirst = cIdx === 0;
                        const isLast = cIdx === row.getVisibleCells().length - 1;
                        const headerStr = typeof cell.column.columnDef.header === 'string' ? cell.column.columnDef.header : '';
                        const isActionCol = String(cell.column.id).toLowerCase().includes('action') || headerStr.toLowerCase().includes('action');
                        return (
                          <td
                            key={cell.id}
                            className={`${compact ? 'px-2.5 py-2.5 text-xs' : 'px-5 py-3.5 text-sm'} text-slate-800 align-middle ${
                              separatedRows
                                ? `border-y border-slate-200/90 ${isFirst ? 'rounded-l-xl border-l' : ''} ${isLast ? 'rounded-r-xl border-r' : ''}`
                                : 'bg-transparent'
                            } ${(cell.column.columnDef.meta as any)?.className || ''}`}
                            onClick={isActionCol ? (e) => e.stopPropagation() : undefined}
                          >
                            {flexRender(cell.column.columnDef.cell ?? cell.column.columnDef.header, cell.getContext())}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={columns.length} className={`${compact ? 'px-3 py-8 text-xs' : 'px-5 py-12 text-sm'} text-center text-slate-500 font-medium ${separatedRows ? 'bg-white rounded-xl border border-slate-200' : ''}`}>
                      No data available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Seamless Dark Navy Footer Bar */}
          <div className="bg-[#16192B] border-t border-[#2B314E] px-5 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-300">
            <div>
              Showing <span className="font-bold text-white">{startIdx}</span> to{' '}
              <span className="font-bold text-white">{endIdx}</span> of{' '}
              <span className="font-bold text-white">{data.length}</span> total entries
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-slate-400">Rows:</span>
                <select
                  className="bg-[#0F111A] border border-[#2B314E] text-white rounded-lg px-2.5 py-1 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none cursor-pointer"
                  value={pagination.pageSize}
                  onChange={e => setPageSize(Number(e.target.value))}
                >
                  {[10, 20, 30, 40, 50, 100].map(pageSize => (
                    <option key={pageSize} value={pageSize} className="bg-[#16192B] text-white">
                      {pageSize}
                    </option>
                  ))}
                </select>
              </div>

              <div className="text-slate-300">
                Page <span className="font-bold text-white">{pagination.pageIndex + 1}</span> of{' '}
                <span className="font-bold text-white">{table.getPageCount() || 1}</span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  className="p-1.5 rounded-lg bg-[#1E2238] border border-[#2B314E] text-white hover:bg-[#2B314E] disabled:opacity-30 disabled:hover:bg-[#1E2238] transition-colors cursor-pointer"
                  onClick={() => table.setPageIndex(0)}
                  disabled={!table.getCanPreviousPage()}
                  aria-label="First page"
                  title="First page"
                >
                  <ChevronsLeft className="h-4 w-4" />
                </button>
                <button
                  className="p-1.5 rounded-lg bg-[#1E2238] border border-[#2B314E] text-white hover:bg-[#2B314E] disabled:opacity-30 disabled:hover:bg-[#1E2238] transition-colors cursor-pointer"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                  aria-label="Previous page"
                  title="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  className="p-1.5 rounded-lg bg-[#1E2238] border border-[#2B314E] text-white hover:bg-[#2B314E] disabled:opacity-30 disabled:hover:bg-[#1E2238] transition-colors cursor-pointer"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                  aria-label="Next page"
                  title="Next page"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <button
                  className="p-1.5 rounded-lg bg-[#1E2238] border border-[#2B314E] text-white hover:bg-[#2B314E] disabled:opacity-30 disabled:hover:bg-[#1E2238] transition-colors cursor-pointer"
                  onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                  disabled={!table.getCanNextPage()}
                  aria-label="Last page"
                  title="Last page"
                >
                  <ChevronsRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {renderCardList()}
      {renderDesktopTable()}
    </div>
  );
}

export default DataTable;