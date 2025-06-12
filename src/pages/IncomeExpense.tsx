import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { saveAs } from 'file-saver';
import { db } from '../lib/firebase';
import { pdf } from '@react-pdf/renderer';
import { useIncomeExpenses } from '../hooks/useIncomeExpenses';
import { useIncomeExpenseFilters } from '../hooks/useIncomeExpenseFilters';
import { usePermissions } from '../hooks/usePermissions';
import IncomeExpenseSummary from '../components/IncomeExpense/IncomeExpenseSummary';
import IncomeExpenseFilters from '../components/IncomeExpense/IncomeExpenseFilters';
import IncomeExpenseTable from '../components/IncomeExpense/IncomeExpenseTable';
import IncomeForm from '../components/IncomeExpense/IncomeForm';
import ExpenseForm from '../components/IncomeExpense/ExpenseForm';
import ProfitShareForm from '../components/IncomeExpense/ProfitShareForm';
import IncomeExpenseDetails from '../components/IncomeExpense/IncomeExpenseDetails';
import Modal from '../components/ui/Modal';
import { deleteDoc, doc } from 'firebase/firestore';
import { generateAndUploadDocument, generateBulkDocuments } from '../utils/documentGenerator';
import IncomeExpenseDocument from '../components/pdf/documents/IncomeExpenseDocument'; 
import ProfitSharesDocument from '../components/pdf/documents/ProfitSharesDocument'; 
import IncomeExpenseBulkDocument from '../components/pdf/documents/IncomeExpenseBulkDocument';
import { IncomeExpenseEntry } from '../types/incomeExpense';
import { useProfitShares } from '../hooks/useProfitShares';
import { getCompanyDetails } from '../utils/documentGenerator';
import { useAuth } from '../context/AuthContext';

import SharesModal from '../components/IncomeExpense/SharesModal';



export default function IncomeExpense() {
  const { records, loading } = useIncomeExpenses();
  const { can } = usePermissions();
  const filter = useIncomeExpenseFilters(records);
  const { shares } = useProfitShares('profitShares');
  const [shareToEdit, setShareToEdit] = useState<ProfitShare | null>(null);
  const [showShares, setShowShares] = useState(false);
    const { user } = useAuth();
  const [viewing, setViewing] = useState<IncomeExpenseEntry | null>(null);
  const [showIncome, setShowIncome] = useState(false);
  const [showExpense, setShowExpense] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [recordBeingEdited, setRecordBeingEdited] = useState<IncomeExpenseEntry | null>(null);
  const [showShareHistory, setShowShareHistory] = useState(false);
  const [deletingEntry, setDeletingEntry] = useState<IncomeExpenseEntry | null>(null);


  const [companyDetails] = useState({
    fullName: 'AIE Skyline',
    email: 'info@aie.com',
    phone: '+44 1234567890'
  });

  
 
const handleGenerateDocument = async (entry: IncomeExpenseEntry) => {
  try {
    const companyDetails = await getCompanyDetails(); // ✅ Get it inside

    const downloadURL = await generateAndUploadDocument(
      (props) => <IncomeExpenseDocument {...props} companyDetails={companyDetails} />,
      entry,
      'incomeExpenses',
      entry.id,
      'incomeExpenses'  // ✅ not 'IncomeExpense-pdfs' (this was a mistake in Firestore path)
    );

    window.open(downloadURL, '_blank');
    toast.success('PDF generated');
  } catch (err) {
    console.error(err);
    toast.error('Failed to generate PDF');
  }
};


//  const downloadProfitSharesPDF = async (shares, startDate?, endDate?) => {
//   try {
//     const blob = await pdf(
//       <ProfitSharesDocument shares={shares} startDate={startDate} endDate={endDate} />
//     ).toBlob();

//     saveAs(blob, 'profit_shares_history.pdf');
//   } catch (err) {
//     console.error('Failed to generate PDF:', err);
//   }
// };
  const handleExportBulkPDF = async () => {
    try {
      const blob = await generateBulkDocuments(
        IncomeExpenseBulkDocument,
        filter.filteredEntries,
        { ...companyDetails, shares }
      );
      saveAs(blob, 'income_expense_summary.pdf');
      toast.success('PDF downloaded');
    } catch {
      toast.error('Failed to generate bulk PDF');
    }
  };

  const handleDownloadProfitSharesPDF = async () => {
    try {
      const companyDetails = await getCompanyDetails(); // ✅ safely fetch company info
  
      const blob = await pdf(
        <ProfitSharesDocument
          shares={shares}
          companyDetails={companyDetails} // ✅ fix: pass full object
        />
      ).toBlob();
  
      saveAs(blob, 'profit_shares_history.pdf');
      toast.success('PDF downloaded');
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      toast.error('Failed to generate PDF');
    }
  };
  
  

  const handleEdit = (entry: IncomeExpenseEntry) => {
    setRecordBeingEdited(entry);
    if (entry.type === 'income') {
      setShowIncome(true);
    } else {
      setShowExpense(true);
    }
  };

  const clearModals = () => {
    setShowIncome(false);
    setShowExpense(false);
    setShowShare(false);
    setViewing(null);
    setRecordBeingEdited(null);
    setShareToEdit(null); // ✅ clear on close
  };

  const handleDelete = async () => {
    if (!deletingEntry?.id) return;
    try {
      await deleteDoc(doc(db, 'incomeExpenses', deletingEntry.id));
      toast.success('Entry deleted');
      setDeletingEntry(null);
    } catch {
      toast.error('Delete failed');
    }
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!loading && <IncomeExpenseSummary entries={filter.filteredEntries} shares={shares} />}

      <div className="flex justify-end space-x-2">
        {can('finance', 'create') && (
          <button onClick={() => { setShowIncome(true); setRecordBeingEdited(null); }} className="px-4 py-2 bg-primary text-white rounded">
            + Add Income
          </button>
        )}
        <button onClick={() => { setShowExpense(true); setRecordBeingEdited(null); }} className="px-4 py-2 border rounded">
          + Add Expense
        </button>
        {/* <button onClick={() => setShowShareHistory(true)} className="px-4 py-2 border rounded">Shares</button> */}
        {can('finance', 'create') && (
        <button onClick={() => setShowShares(true)} className="px-4 py-2 border rounded">Shares</button>)}
        {can('finance', 'create') && (
        <button onClick={() => setShowShare(true)} className="px-4 py-2 border rounded">Share Profit</button>
        )}
        {user?.role === 'manager' && (
        <button onClick={handleExportBulkPDF} className="px-4 py-2 border rounded">Export PDF</button>

        )}
      </div>

      <IncomeExpenseFilters
        search={filter.search}
        onSearch={filter.setSearch}
        typeFilter={filter.typeFilter}
        onType={filter.setTypeFilter}
        progress={filter.progress}
        onProgress={filter.setProgress}
        dateRange={filter.dateRange}
        onDateRange={filter.setDateRange}
      />

      <div className="bg-white rounded-lg shadow">
      <IncomeExpenseTable
        entries={filter.filteredEntries}
        onView={setViewing}
        onEdit={handleEdit}
        onDelete={setDeletingEntry} // ✅ trigger modal
        onGenerateDocument={handleGenerateDocument}
      />


      </div>

      <Modal
  isOpen={!!deletingEntry}
  onClose={() => setDeletingEntry(null)}
  title="Delete Entry"
>
  <div className="space-y-4">
    <p>Are you sure you want to delete this entry?</p>
    <div className="flex justify-end space-x-2">
      <button onClick={() => setDeletingEntry(null)} className="px-4 py-2 border rounded">Cancel</button>
      <button onClick={handleDelete} className="px-4 py-2 bg-red-600 text-white rounded">Delete</button>
    </div>
  </div>
</Modal>

      <Modal isOpen={!!viewing} onClose={clearModals} title="Record Details" size="xl">
        {viewing && <IncomeExpenseDetails entry={viewing} />}
      </Modal>

      {/*  */}

      <Modal isOpen={showShares} onClose={() => setShowShares(false)} title="Profit Share History" size="xl">
  <SharesModal
    shares={shares}
    onClose={() => setShowShares(false)}
    onGeneratePDF={handleDownloadProfitSharesPDF}
    collectionName="profitShares" // ✅ AIE collection
  />
</Modal>



<Modal
        isOpen={showIncome}
        onClose={clearModals}
        title={recordBeingEdited ? 'Edit Income' : 'Add Income'}
        size="xl"              // ← add this
     >
      <IncomeForm 
        onClose={clearModals} 
        record={recordBeingEdited?.type === 'income' ? recordBeingEdited : undefined}
        collectionName="incomeExpenses"

      />

      </Modal>

      <Modal isOpen={showExpense} onClose={clearModals} title={recordBeingEdited ? 'Edit Expense' : 'Add Expense' } size="xl">
        <ExpenseForm 
          onClose={clearModals} 
          record={recordBeingEdited?.type === 'expense' ? recordBeingEdited : undefined}
          collectionName="incomeExpenses"
        />
      </Modal>

      <Modal isOpen={showShare} onClose={clearModals} title="Share Profit" size="xl">
      <ProfitShareForm
        onClose={clearModals}
        shareToEdit={shareToEdit}
        onEditRequested={setShareToEdit}
        collectionName="profitShares"
        records={records}
      />

</Modal>

    </div>
  );
}
