// src/services/highRiskExportImport.ts
import * as XLSX from 'xlsx';
import {
  HighRiskDriver,
  RiskLevel,
  IncidentCategory,
} from '../types/highRiskDriver';

export interface ParseResult {
  validDrivers: HighRiskDriver[];
  skippedCount: number;
  duplicateCount: number;
  errors: string[];
}

/**
 * Standardize risk level string into valid RiskLevel
 */
function normalizeRiskLevel(raw?: string): RiskLevel {
  if (!raw) return 'High Risk';
  const lower = raw.toString().trim().toLowerCase();
  if (lower.includes('caution') || lower.includes('warn') || lower.includes('medium')) {
    return 'Caution';
  }
  if (lower.includes('clear') || lower.includes('low') || lower.includes('safe') || lower.includes('pass')) {
    return 'Cleared';
  }
  return 'High Risk';
}

/**
 * Standardize category string into valid IncidentCategory
 */
function normalizeCategory(raw?: string): IncidentCategory {
  if (!raw) return 'Damage';
  const lower = raw.toString().trim().toLowerCase();
  if (lower.includes('non-pay') || lower.includes('payment') || lower.includes('arrear') || lower.includes('unpaid') || lower.includes('debt')) {
    return 'Non-Payment';
  }
  if (lower.includes('fraud')) {
    return 'Fraud / Terms Breach';
  }
  if (lower.includes('breach') || lower.includes('terms') || lower.includes('contract') || lower.includes('sublet')) {
    return 'Breach of Terms';
  }
  return 'Damage';
}

/**
 * Find property value case-insensitively from a row object
 */
function getProp(row: Record<string, any>, possibleKeys: string[]): any {
  const rowKeys = Object.keys(row);
  for (const targetKey of possibleKeys) {
    const targetLower = targetKey.toLowerCase().replace(/[^a-z0-9]/g, '');
    const found = rowKeys.find(
      (k) => k.toLowerCase().replace(/[^a-z0-9]/g, '') === targetLower
    );
    if (found && row[found] !== undefined && row[found] !== null && String(row[found]).trim() !== '') {
      return row[found];
    }
  }
  return undefined;
}

/**
 * Parse an uploaded CSV, Excel (.xlsx, .xls) or JSON file
 */
export async function parseHighRiskImportFile(
  file: File,
  existingDrivers: HighRiskDriver[] = []
): Promise<ParseResult> {
  const existingNames = new Set(
    existingDrivers.map((d) => d.fullName.toLowerCase().trim())
  );
  const existingBadges = new Set(
    existingDrivers.map((d) => (d.badgeNumber ? d.badgeNumber.toLowerCase().trim() : ''))
  );

  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onerror = () => {
      resolve({
        validDrivers: [],
        skippedCount: 0,
        duplicateCount: 0,
        errors: ['Failed to read file. Please ensure file is not corrupted.'],
      });
    };

    const fileName = file.name.toLowerCase();

    // Handling JSON format directly
    if (fileName.endsWith('.json')) {
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const parsed = JSON.parse(text);
          const rawRows: Record<string, any>[] = Array.isArray(parsed)
            ? parsed
            : parsed.drivers && Array.isArray(parsed.drivers)
            ? parsed.drivers
            : [parsed];

          processRawRows(rawRows, existingNames, existingBadges, resolve);
        } catch (err: any) {
          resolve({
            validDrivers: [],
            skippedCount: 0,
            duplicateCount: 0,
            errors: [`Invalid JSON syntax: ${err?.message || 'Check JSON formatting.'}`],
          });
        }
      };
      reader.readAsText(file);
      return;
    }

    // Handling Excel (.xlsx, .xls) or CSV via XLSX engine
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, {
          type: 'array',
          cellDates: true,
          cellNF: false,
          cellText: false,
        });

        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) {
          throw new Error('Workbook contains no sheets.');
        }

        const sheet = workbook.Sheets[firstSheetName];
        const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, {
          defval: '',
          raw: false,
        });

        if (!rawRows || rawRows.length === 0) {
          resolve({
            validDrivers: [],
            skippedCount: 0,
            duplicateCount: 0,
            errors: ['The uploaded spreadsheet is empty or has no data rows.'],
          });
          return;
        }

        processRawRows(rawRows, existingNames, existingBadges, resolve);
      } catch (err: any) {
        resolve({
          validDrivers: [],
          skippedCount: 0,
          duplicateCount: 0,
          errors: [`Failed to parse spreadsheet file: ${err?.message || 'Check file format.'}`],
        });
      }
    };

    reader.readAsArrayBuffer(file);
  });
}

function processRawRows(
  rawRows: Record<string, any>[],
  existingNames: Set<string>,
  existingBadges: Set<string>,
  resolve: (res: ParseResult) => void
) {
  const validDrivers: HighRiskDriver[] = [];
  const errors: string[] = [];
  let skippedCount = 0;
  let duplicateCount = 0;

  rawRows.forEach((row, index) => {
    // 1. Extract Full Name
    const fullNameRaw = getProp(row, [
      'fullName',
      'full_name',
      'full name',
      'name',
      'driverName',
      'driver_name',
      'driver',
      'driver full name',
      'customerName',
      'person',
    ]);

    const fullName = fullNameRaw ? String(fullNameRaw).trim() : '';

    if (!fullName || fullName.length < 2) {
      skippedCount++;
      return;
    }

    // 2. Extract Badge
    const badgeRaw = getProp(row, [
      'badgeNumber',
      'badge_number',
      'badge number',
      'badge',
      'badge#',
      'badgeno',
      'badge_no',
      'driverId',
      'id',
      'license',
    ]);
    const badgeNumber = badgeRaw
      ? String(badgeRaw).trim()
      : `BDG-${Math.floor(1000 + Math.random() * 9000)}`;

    // 3. Extract Risk Level
    const riskRaw = getProp(row, [
      'riskLevel',
      'risk_level',
      'risk level',
      'risk',
      'level',
      'status',
      'severity',
    ]);
    const riskLevel = normalizeRiskLevel(riskRaw);

    // 4. Extract Category
    const categoryRaw = getProp(row, [
      'category',
      'incidentCategory',
      'incident_category',
      'incident category',
      'incident',
      'violationType',
      'type',
      'reason',
    ]);
    const category = normalizeCategory(categoryRaw);

    // 5. Extract Category Details
    const detailsRaw = getProp(row, [
      'categoryDetails',
      'category_details',
      'category details',
      'details',
      'incidentDetails',
      'incident details',
      'description',
      'notes',
      'reasonDetails',
      'reason details',
      'remarks',
    ]);
    const categoryDetails = detailsRaw
      ? String(detailsRaw).trim()
      : `${category} default recorded`;

    // 6. Extract Reporting Fleet
    const fleetRaw = getProp(row, [
      'reportingFleet',
      'reporting_fleet',
      'reporting fleet',
      'fleet',
      'company',
      'reportingCompany',
      'reporting company',
      'source',
      'partner',
      'rentalCompany',
    ]);
    const reportingFleet = fleetRaw ? String(fleetRaw).trim() : 'Skyline Fleet';

    // 7. Extract Reported Year
    const yearRaw = getProp(row, [
      'reportedYear',
      'reported_year',
      'reported year',
      'year',
      'incidentYear',
    ]);
    let reportedYear = new Date().getFullYear();
    if (yearRaw) {
      const parsedYear = parseInt(String(yearRaw).replace(/[^0-9]/g, ''), 10);
      if (parsedYear >= 2000 && parsedYear <= 2100) {
        reportedYear = parsedYear;
      }
    }

    // Check duplicate
    const isNameDup = existingNames.has(fullName.toLowerCase());
    const isBadgeDup = badgeNumber && existingBadges.has(badgeNumber.toLowerCase());
    if (isNameDup || isBadgeDup) {
      duplicateCount++;
    }

    const driverId = `hrd-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 6)}`;

    validDrivers.push({
      id: driverId,
      fullName,
      badgeNumber,
      riskLevel,
      category,
      categoryDetails,
      reportingFleet,
      reportedYear,
      createdAt: new Date().toISOString(),
    });
  });

  if (validDrivers.length === 0 && skippedCount > 0) {
    errors.push('No valid driver records could be extracted. Please check the file headers.');
  }

  resolve({
    validDrivers,
    skippedCount,
    duplicateCount,
    errors,
  });
}

/**
 * Export drivers to CSV with UTF-8 BOM
 */
export function exportHighRiskToCSV(
  drivers: HighRiskDriver[],
  filenamePrefix = 'fleet_high_risk_registry'
) {
  const headers = [
    'Full Name',
    'Badge Number',
    'Risk Level',
    'Incident Category',
    'Incident Details',
    'Reporting Fleet',
    'Reported Year',
    'Manager Override',
    'Overridden By',
    'Override Reason',
    'Record Created At',
  ];

  const escapeCSV = (val: any) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = drivers.map((d) => [
    escapeCSV(d.fullName),
    escapeCSV(d.badgeNumber || 'N/A'),
    escapeCSV(d.riskLevel),
    escapeCSV(d.category),
    escapeCSV(d.categoryDetails || ''),
    escapeCSV(d.reportingFleet),
    escapeCSV(d.reportedYear),
    escapeCSV(d.isOverridden ? 'YES' : 'NO'),
    escapeCSV(d.overriddenBy || ''),
    escapeCSV(d.overrideReason || ''),
    escapeCSV(d.createdAt ? new Date(d.createdAt).toISOString().split('T')[0] : ''),
  ]);

  const csvContent = '\uFEFF' + [headers.map(escapeCSV).join(','), ...rows.map((r) => r.join(','))].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, `${filenamePrefix}_${getFormattedDate()}.csv`);
}

/**
 * Export drivers to Excel (.xlsx)
 */
export function exportHighRiskToExcel(
  drivers: HighRiskDriver[],
  filenamePrefix = 'fleet_high_risk_registry'
) {
  const exportData = drivers.map((d) => ({
    'Full Name': d.fullName,
    'Badge Number': d.badgeNumber || 'N/A',
    'Risk Level': d.riskLevel,
    'Incident Category': d.category,
    'Incident Details': d.categoryDetails || '',
    'Reporting Fleet': d.reportingFleet,
    'Reported Year': d.reportedYear,
    'Manager Override': d.isOverridden ? 'YES' : 'NO',
    'Overridden By': d.overriddenBy || '',
    'Override Reason': d.overrideReason || '',
    'Created Date': d.createdAt ? new Date(d.createdAt).toLocaleDateString() : '',
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);

  // Set friendly column widths
  worksheet['!cols'] = [
    { wch: 22 }, // Full Name
    { wch: 15 }, // Badge Number
    { wch: 14 }, // Risk Level
    { wch: 20 }, // Category
    { wch: 45 }, // Details
    { wch: 20 }, // Reporting Fleet
    { wch: 14 }, // Reported Year
    { wch: 16 }, // Manager Override
    { wch: 18 }, // Overridden By
    { wch: 30 }, // Override Reason
    { wch: 14 }, // Created Date
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'High Risk Registry');
  XLSX.writeFile(workbook, `${filenamePrefix}_${getFormattedDate()}.xlsx`);
}

/**
 * Export drivers to JSON format (full fidelity backup)
 */
export function exportHighRiskToJSON(
  drivers: HighRiskDriver[],
  filenamePrefix = 'fleet_high_risk_registry'
) {
  const jsonContent = JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      system: 'Skyline Fleet Management - High Risk Registry',
      protocol: 'Dual-Portal Zero-PII High Risk Protocol',
      totalRecords: drivers.length,
      drivers,
    },
    null,
    2
  );

  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
  triggerDownload(blob, `${filenamePrefix}_${getFormattedDate()}.json`);
}

/**
 * Download sample CSV or Excel import template
 */
export function downloadHighRiskTemplate(format: 'csv' | 'xlsx' = 'csv') {
  const sampleData = [
    {
      'Full Name': 'John Smith',
      'Badge Number': 'BDG-8821',
      'Risk Level': 'High Risk',
      'Category': 'Damage',
      'Category Details': 'Unpaid Vehicle Damage ($3,400 repair default)',
      'Reporting Fleet': 'Apex Rentals',
      'Reported Year': 2025,
    },
    {
      'Full Name': 'Robert Johnson',
      'Badge Number': 'BDG-4409',
      'Risk Level': 'Caution',
      'Category': 'Non-Payment',
      'Category Details': 'Outstanding Rental Balance & Unsettled Invoices',
      'Reporting Fleet': 'Metro Hire',
      'Reported Year': 2025,
    },
    {
      'Full Name': 'Michael Brown',
      'Badge Number': 'BDG-1904',
      'Risk Level': 'High Risk',
      'Category': 'Breach of Terms',
      'Category Details': 'Vehicle Abandonment & Unauthorized Commercial Subletting',
      'Reporting Fleet': 'City Fleet',
      'Reported Year': 2024,
    },
    {
      'Full Name': 'Sarah Jenkins',
      'Badge Number': 'BDG-6120',
      'Risk Level': 'Caution',
      'Category': 'Fraud / Terms Breach',
      'Category Details': 'Unverified identification attempt & payment dispute',
      'Reporting Fleet': 'Skyline Fleet',
      'Reported Year': 2025,
    },
  ];

  if (format === 'xlsx') {
    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    worksheet['!cols'] = [
      { wch: 22 },
      { wch: 15 },
      { wch: 14 },
      { wch: 22 },
      { wch: 45 },
      { wch: 20 },
      { wch: 14 },
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Import Template');
    XLSX.writeFile(workbook, 'high_risk_drivers_template.xlsx');
  } else {
    const headers = [
      'Full Name',
      'Badge Number',
      'Risk Level',
      'Category',
      'Category Details',
      'Reporting Fleet',
      'Reported Year',
    ];
    const escapeCSV = (val: any) => `"${String(val || '').replace(/"/g, '""')}"`;

    const rows = sampleData.map((d) => [
      escapeCSV(d['Full Name']),
      escapeCSV(d['Badge Number']),
      escapeCSV(d['Risk Level']),
      escapeCSV(d['Category']),
      escapeCSV(d['Category Details']),
      escapeCSV(d['Reporting Fleet']),
      escapeCSV(d['Reported Year']),
    ]);

    const csvContent =
      '\uFEFF' +
      [headers.map(escapeCSV).join(','), ...rows.map((r) => r.join(','))].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    triggerDownload(blob, 'high_risk_drivers_template.csv');
  }
}

function triggerDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function getFormattedDate(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
