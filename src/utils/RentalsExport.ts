// src/utils/RentalsExport.ts

import { Rental, Vehicle, Customer } from '../types';
import { exportToExcel } from './excel';
import { formatDate } from './dateHelpers';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import toast from 'react-hot-toast';

export const exportRentals = async (rentals: Rental[]) => {
  try {
    // Create Excel export data
    const exportData = rentals.map(rental => ({
      'Start Date': formatDate(rental.startDate),
      'Start Time': new Date(rental.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      'End Date': formatDate(rental.endDate),
      'End Time': new Date(rental.endDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      'Type': rental.type,
      'Reason': rental.reason,
      'Status': rental.status,
      'Payment Status': rental.paymentStatus,
      'Total Cost': `£${rental.cost.toFixed(2)}`,
      'Paid Amount': `£${rental.paidAmount.toFixed(2)}`,
      'Remaining Amount': `£${rental.remainingAmount.toFixed(2)}`,
      'Created At': formatDate(rental.createdAt),
      'Updated At': formatDate(rental.updatedAt)
    }));

    // Export Excel file
    exportToExcel(exportData, 'rentals');

    // If documents should be included, create a ZIP file
    const zip = new JSZip();

    // Add documents to ZIP
    for (const rental of rentals) {
      if (rental.documents) {
        try {
          if (rental.documents.agreement) {
            const agreementResponse = await fetch(rental.documents.agreement);
            const agreementBlob = await agreementResponse.blob();
            zip.file(`agreements/rental_${rental.id}_agreement.pdf`, agreementBlob);
          }

          if (rental.documents.invoice) {
            const invoiceResponse = await fetch(rental.documents.invoice);
            const invoiceBlob = await invoiceResponse.blob();
            zip.file(`invoices/rental_${rental.id}_invoice.pdf`, invoiceBlob);
          }
        } catch (error) {
          console.error(`Error adding documents for rental ${rental.id}:`, error);
          // Continue with other rentals even if one fails
          continue;
        }
      }
    }

    // Generate and save ZIP file
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    saveAs(zipBlob, 'rental_documents.zip');

    toast.success('Rentals and documents exported successfully');
  } catch (error) {
    console.error('Error exporting rentals:', error);
    toast.error('Failed to export rentals');
  }
};

export const processRentalsImport = (data: any[]) => {
  return data.map(row => ({
    startDate: new Date(row['Start Date']),
    endDate: new Date(row['End Date']),
    type: row.Type?.toLowerCase() || 'daily',
    reason: row.Reason?.toLowerCase() || 'hired',
    status: row.Status?.toLowerCase() || 'scheduled',
    cost: parseFloat(row['Total Cost']?.replace('£', '')) || 0,
    paidAmount: parseFloat(row['Paid Amount']?.replace('£', '')) || 0,
    remainingAmount: parseFloat(row['Remaining Amount']?.replace('£', '')) || 0,
  }));
};
