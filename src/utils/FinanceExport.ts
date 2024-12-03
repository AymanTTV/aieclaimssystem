import { Transaction } from '../types';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';

export const exportFinanceData = (transactions: Transaction[]) => {
  const exportData = transactions.map(transaction => ({
    Date: format(transaction.date, 'yyyy-MM-dd'),
    Type: transaction.type,
    Category: transaction.category,
    Amount: transaction.amount.toFixed(2),
    Description: transaction.description
  }));

  const ws = XLSX.utils.json_to_sheet(exportData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Transactions');
  XLSX.writeFile(wb, 'finance_transactions.xlsx');
};

export const importFinanceData = async (file: File): Promise<Partial<Transaction>[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        const transactions = jsonData.map(row => ({
          date: new Date(row.Date),
          type: row.Type?.toLowerCase() as 'income' | 'expense',
          category: row.Category,
          amount: parseFloat(row.Amount),
          description: row.Description
        }));

        resolve(transactions);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsBinaryString(file);
  });
};