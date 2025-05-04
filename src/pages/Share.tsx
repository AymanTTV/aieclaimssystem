import React, { useState } from 'react';


import { useShares } from '../hooks/useShares';
import { useShareFilters } from '../hooks/useShareFilters';


import ShareSummary from '../components/Share/ShareSummary.tsx';
import ShareTable from '../components/Share/ShareTable';
import ShareFilters from '../components/Share/ShareFilters.tsx';
import ShareForm from '../components/Share/ShareForm';
import ShareDetails from '../components/Share/ShareDetails';
import Modal from '../components/ui/Modal';
import { Plus, Download } from 'lucide-react';
import { deleteShare } from '../services/share.service';
import toast from 'react-hot-toast';
import { usePermissions } from '../hooks/usePermissions';
import { handleShareExport } from '../utils/shareHelpers';

const Share = () => {
  const { shares, loading } = useShares();
  const {
    searchQuery,
    setSearchQuery,
    selectedReasons,
    setSelectedReasons,
    progressFilter,
    setProgressFilter,
    filteredRecords,
  } = useShareFilters(shares);
  const { can } = usePermissions();

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [viewing, setViewing] = useState<any>(null);
  const [deleting, setDeleting] = useState<any>(null);

  const totalNet = filteredRecords.reduce((sum, r) => sum + r.totalNet, 0);
  const totalExpenses = filteredRecords.reduce(
    (sum, r) => sum + r.expenses.reduce((s2, e) => s2 + e.amount * (e.vat ? 1.2 : 1), 0),
    0
  );
  const totalProfit = totalNet - totalExpenses;

  const handleDelete = async (rec: any) => {
    try {
      await deleteShare(rec.id);
      toast.success('Deleted successfully');
      setDeleting(null);
    } catch {
      toast.error('Delete failed');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Share</h1>
      </div>

      {/* Summary Cards */}
      <ShareSummary net={totalNet} expenses={totalExpenses} profit={totalProfit} />

      {/* Filters */}
      <ShareFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedReasons={selectedReasons}
        onReasonChange={setSelectedReasons}
        progressFilter={progressFilter}
        onProgressChange={setProgressFilter}
      />

      {/* Actions */}
      <div className="flex justify-end space-x-2">
        <button
          onClick={() => handleShareExport(filteredRecords)}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          <Download className="h-5 w-5 mr-2" />
          Export
        </button>
        {can('share', 'create') && (
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-600"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Record
          </button>
        )}
      </div>

      {/* Data Table */}
      <ShareTable
        records={filteredRecords}
        onView={setViewing}
        onEdit={setEditing}
        onDelete={setDeleting}
      />

      {/* Modals */}
      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title="Add Share Record"
        size="xl"
      >
        <ShareForm onClose={() => setShowForm(false)} />
      </Modal>

      <Modal
        isOpen={!!editing}
        onClose={() => setEditing(null)}
        title="Edit Share Record"
        size="xl"
      >
        {editing && <ShareForm record={editing} onClose={() => setEditing(null)} />}
      </Modal>

      <Modal
        isOpen={!!viewing}
        onClose={() => setViewing(null)}
        title="Share Record Details"
        size="lg"
      >
        {viewing && <ShareDetails record={viewing} />}
      </Modal>

      <Modal
        isOpen={!!deleting}
        onClose={() => setDeleting(null)}
        title="Delete Confirmation"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Are you sure you want to delete this record? This action cannot be undone.
          </p>
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setDeleting(null)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={() => deleting && handleDelete(deleting)}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700"
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Share;