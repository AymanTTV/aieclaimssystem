import { utils, writeFile } from 'xlsx';
import { ShareRecord } from '../types/share';

/**
 * Export the given ShareRecords to an Excel file.
 */
export function handleShareExport(records: ShareRecord[]) {
  if (!records.length) {
    return;
  }

  // Map your records into a flat object for the sheet
  const data = records.map(r => ({
    'Client Name': r.clientName,
    'Reason': r.reason,
    'VD Profit': r.vdProfit,
    'Actual Paid': r.actualPaid,
    'Vehicle Running Cost': r.vehicleRunningCost,
    'Legal Fee %': r.legalFeePercentage,
    'Legal Fee Cost': r.legalFeeCost,
    'Start Date': r.startDate || '',
    'End Date': r.endDate || '',
    'V Hire Amount': r.vHireAmount,
    'Total Net': r.totalNet,
    'AIE Skyline %': r.aieSkylinePercentage,
    'AIE Skyline Amount': r.aieSkylineAmount,
    'AbdulAziz %': r.abdulAzizPercentage,
    'AbdulAziz Amount': r.abdulAzizAmount,
    'JAY %': r.jayPercentage,
    'JAY Amount': r.jayAmount,
    'Progress': r.progress,
    'Expenses': r.expenses
      .map(exp => `${exp.type}: ${exp.amount}${exp.vat ? ' (VAT)' : ''}`)
      .join('; ')
  }));

  // Create a worksheet and a workbook
  const worksheet = utils.json_to_sheet(data);
  const workbook = utils.book_new();
  utils.book_append_sheet(workbook, worksheet, 'Shares');

  // Trigger download
  writeFile(workbook, 'share-records.xlsx');
}
