// src/utils/waitingExport.ts
import { format } from 'date-fns';
import { exportToExcel } from './excel';
import type { WaitingEntry } from '../types/waiting';

export interface WaitingExportRow {
  'Created Date': string;
  'Name': string;
  'Phone': string;
  'Email': string;
  'Reason': string;
  'Date Wanted': string;
  'Waiting Type': string;
  'Status': string;
  'Categories': string;
  'Groups': string;
  'Assigned To': string;
  'Offer Expiry': string;
  'Consent': string;
  'Consent Note': string;
}

const fmt = (d?: Date | null, pat = 'yyyy-MM-dd HH:mm') =>
  d ? format(d, pat) : '';

/**
 * Build export rows from entries + lookup maps
 */
export const buildWaitingExportRows = (
  entries: WaitingEntry[],
  categoriesById: Record<string, string>,
  groupsById: Record<string, string>
): WaitingExportRow[] => {
  return entries.map((e) => ({
    'Created Date': fmt(e.createdAt),
    'Name': e.fullName,
    'Phone': e.phone,
    'Email': e.email || '',
    'Reason': e.reason || '',
    'Date Wanted': fmt(e.dateWanted, 'yyyy-MM-dd'),
    'Waiting Type': e.waitingType === 'open' ? 'Open' : 'Specific Date',
    'Status': e.status,
    'Categories': (e.categoryIds || []).map(id => categoriesById[id] || id).join(' | '),
    'Groups': (e.groupIds || []).map(id => groupsById[id] || id).join(' | '),
    'Assigned To': e.assignedTo || '',
    'Offer Expiry': fmt(e.offerExpiryAt),
    'Consent': e.consentGiven ? 'yes' : 'no',
    'Consent Note': e.consentNote || '',
  }));
};

/**
 * Excel export (XLSX) – matches how your other pages export
 */
export const exportWaitingEntriesToExcel = (
  entries: WaitingEntry[],
  categoriesById: Record<string, string>,
  groupsById: Record<string, string>,
  filename = 'waiting-entries'
) => {
  const rows = buildWaitingExportRows(entries, categoriesById, groupsById);
  exportToExcel(rows, filename);
};

/**
 * CSV export – compatible with your current call site
 */
export const exportWaitingEntriesToCSV = (
  entries: WaitingEntry[],
  categoriesById: Record<string, string>,
  groupsById: Record<string, string>,
  filename = 'waiting-entries'
) => {
  const rows = buildWaitingExportRows(entries, categoriesById, groupsById);
  const headers = Object.keys(rows[0] || {}) as (keyof WaitingExportRow)[];
  const csv = [
    headers.join(','),
    ...rows.map((r) =>
      headers
        .map((k) => {
          const v = String(r[k] ?? '');
          return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
        })
        .join(',')
    ),
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};
