import { pdf } from '@react-pdf/renderer';
import { Transaction } from '../types';
import { createElement } from 'react';
import { FinanceDocument } from '../components/pdf/documents';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export const generateFinancePDF = async (
  transactions: Transaction[],
  summary: {
    totalIncome: number;
    totalExpenses: number;
    netIncome: number;
    profitMargin: number;
  }
): Promise<Blob> => {
  try {
    // Get company details
    const companyDoc = await getDoc(doc(db, 'companySettings', 'details'));
    if (!companyDoc.exists()) {
      throw new Error('Company details not found');
    }
    const companyDetails = companyDoc.data();

    // Generate PDF
    return pdf(createElement(FinanceDocument, {
      data: { transactions, summary },
      companyDetails
    })).toBlob();
  } catch (error) {
    console.error('Error generating finance PDF:', error);
    throw new Error('Failed to generate finance PDF');
  }
};