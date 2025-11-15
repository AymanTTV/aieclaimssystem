// src/components/pettyCash/PettyCashImportModal.tsx

import React, { useState } from 'react';
import { collection, writeBatch, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { UploadCloud, File, X } from 'lucide-react';

interface PettyCashImportModalProps {
  onClose: () => void;
  collectionName: 'pettyCash' | 'aiePettyCash';
}

// Define the shape of a row expected from the Excel file
interface ImportRow {
  DateTime: string | number; // Excel dates can be numbers or strings
  Name: string;
  Telephone: string;
  Description: string;
  Category?: string;
  Group?: string;
  AmountIn: number;
  AmountOut: number;
  Status: string;
  Note?: string;
}

const PettyCashImportModal: React.FC<PettyCashImportModalProps> = ({
  onClose,
  collectionName,
}) => {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFile = e.target.files[0];
      if (
        selectedFile.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        selectedFile.type === 'text/csv'
      ) {
        setFile(selectedFile);
        setError(null);
      } else {
        setError('Invalid file type. Please upload an .xlsx or .csv file.');
        setFile(null);
      }
    }
  };

  // Helper to parse Excel's date serial number
  const parseExcelDate = (excelDate: number | string) => {
    if (typeof excelDate === 'string') {
      const date = new Date(excelDate);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
    // Handle Excel's serial date format (number of days since 1900-01-01)
    if (typeof excelDate === 'number') {
      return new Date(Math.round((excelDate - 25569) * 864e5));
    }
    return new Date(); // Fallback
  };

  const handleImport = async () => {
    if (!file || !user) return;

    setLoading(true);
    setError(null);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json<ImportRow>(worksheet);

        if (json.length === 0) {
          throw new Error('File is empty or data could not be read.');
        }

        const batch = writeBatch(db);
        const transactionsCol = collection(db, collectionName);
        let validTransactions = 0;

        for (const row of json) {
          // --- Data Validation ---
          if (!row.Name || !row.Telephone || !row.Description) {
            console.warn('Skipping row due to missing required fields:', row);
            continue; // Skip rows without required data
          }

          const status = (row.Status?.toLowerCase() || 'pending') as 'pending' | 'paid' | 'unpaid';
          if (!['pending', 'paid', 'unpaid'].includes(status)) {
            console.warn('Skipping row due to invalid status:', row);
            continue; // Skip rows with invalid status
          }

          const date = parseExcelDate(row.DateTime);
          if (isNaN(date.getTime())) {
            console.warn('Skipping row due to invalid date:', row);
            continue;
          }

          const newTransaction = {
            name: row.Name,
            telephone: String(row.Telephone),
            description: row.Description,
            categoryName: row.Category || null,
            groupId: null, // We only import the name, not the ID
            groupName: row.Group || null,
            categoryId: null, // We only import the name, not the ID
            amountIn: Number(row.AmountIn) || 0,
            amountOut: Number(row.AmountOut) || 0,
            note: row.Note || null,
            status: status,
            date: date,
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: user.id,
          };

          // Add to batch
          batch.set(doc(transactionsCol), newTransaction);
          validTransactions++;
        }

        if (validTransactions > 0) {
          await batch.commit();
          toast.success(`Successfully imported ${validTransactions} transactions.`);
          onClose();
        } else {
          throw new Error('No valid transactions were found in the file.');
        }

      } catch (err: any) {
        console.error('Error during import:', err);
        setError(`Import failed: ${err.message}`);
        toast.error('Import failed. Check console for details.');
      } finally {
        setLoading(false);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="space-y-4">
      <div
        className="relative w-full border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary-500 transition-colors"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (e.dataTransfer.files) {
            handleFileChange({ target: { files: e.dataTransfer.files } } as any);
          }
        }}
      >
        <input
          type="file"
          id="file-upload"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          onChange={handleFileChange}
          accept=".xlsx, .csv"
        />
        <label htmlFor="file-upload" className="cursor-pointer">
          <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-sm text-gray-600">
            <span className="font-medium text-primary">Click to upload</span> or drag and drop
          </p>
          <p className="text-xs text-gray-500">.XLSX or .CSV files</p>
        </label>
      </div>

      {file && (
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md border">
          <div className="flex items-center space-x-2">
            <File className="h-5 w-5 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">{file.name}</span>
          </div>
          <button
            onClick={() => setFile(null)}
            className="p-1 rounded-full hover:bg-gray-200"
          >
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleImport}
          disabled={!file || loading}
          className="px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md hover:bg-primary-600 disabled:bg-gray-300"
        >
          {loading ? 'Importing...' : 'Import Transactions'}
        </button>
      </div>
    </div>
  );
};

export default PettyCashImportModal;