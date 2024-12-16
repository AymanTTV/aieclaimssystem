import React, { useState } from 'react';
import { useVehicles } from '../hooks/useVehicles';
import { DataTable } from '../components/DataTable/DataTable';
import { format } from 'date-fns';
import { Plus, Download, Upload, Edit, Trash2, Eye } from 'lucide-react';
import ClaimDetails from '../components/claims/ClaimDetails';
import ClaimEditModal from '../components/claims/ClaimEditModal';
import ClaimDeleteModal from '../components/claims/ClaimDeleteModal';
import Modal from '../components/ui/Modal';
import StatusBadge from '../components/StatusBadge';
import { collection, query, orderBy, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Claim } from '../types';
import toast from 'react-hot-toast';
import { createFinanceTransaction } from '../utils/financeTransactions';

const Claims = () => {
  const { vehicles, loading: vehiclesLoading } = useVehicles();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [editingClaim, setEditingClaim] = useState<Claim | null>(null);
  const [deletingClaimId, setDeletingClaimId] = useState<string | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  React.useEffect(() => {
    fetchClaims();
  }, []);

  const fetchClaims = async () => {
    try {
      const claimsRef = collection(db, 'claims');
      const q = query(claimsRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const claimsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt.toDate(),
        updatedAt: doc.data().updatedAt.toDate()
      })) as Claim[];
      setClaims(claimsData);
    } catch (error) {
      console.error('Error fetching claims:', error);
      toast.error('Failed to fetch claims');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateClaimStatus = async (claim: Claim, newStatus: string, amount?: number) => {
    try {
      const claimRef = doc(db, 'claims', claim.id);
      const updateData: any = {
        status: newStatus,
        updatedAt: new Date(),
      };

      if (amount) {
        updateData.amount = amount;
      }

      await updateDoc(claimRef, updateData);

      // Create finance transaction for settled claims
      if (newStatus === 'settled') {
        await createFinanceTransaction({
          type: claim.type === 'fault' ? 'expense' : 'income',
          category: 'claim-settlement',
          amount: amount || 0,
          description: `Claim settlement for ${claim.type} claim`,
          referenceId: claim.id,
          vehicleId: claim.accidentId,
        });
      }

      toast.success('Claim status updated successfully');
      fetchClaims();
    } catch (error) {
      console.error('Error updating claim:', error);
      toast.error('Failed to update claim status');
    }
  };

  const columns = [
    {
      header: 'Vehicle',
      cell: ({ row }) => {
        const vehicle = vehicles.find(v => v.id === row.original.vehicleId);
        return vehicle ? (
          <div>
            <div className="font-medium">{vehicle.make} {vehicle.model}</div>
            <div className="text-gray-500">{vehicle.registrationNumber}</div>
          </div>
        ) : 'N/A';
      },
    },
    {
      header: 'Type',
      cell: ({ row }) => (
        <StatusBadge status={row.original.type} />
      ),
    },
    {
      header: 'Status',
      cell: ({ row }) => (
        <StatusBadge status={row.original.status} />
      ),
    },
    {
      header: 'Amount',
      cell: ({ row }) => row.original.amount ? 
        `£${row.original.amount.toFixed(2)}` : 'Pending',
    },
    {
      header: 'Created',
      cell: ({ row }) => format(row.original.createdAt, 'MMM dd, yyyy'),
    },
    {
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex space-x-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedClaim(row.original);
              setShowDetailsModal(true);
            }}
            className="text-blue-600 hover:text-blue-800"
            title="View Details"
          >
            <Eye className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setEditingClaim(row.original);
            }}
            className="text-blue-600 hover:text-blue-800"
            title="Edit"
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setDeletingClaimId(row.original.id);
            }}
            className="text-red-600 hover:text-red-800"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  if (loading || vehiclesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Claims Management</h1>
      </div>

      <DataTable
        data={claims}
        columns={columns}
        onRowClick={(claim) => {
          setSelectedClaim(claim);
          setShowDetailsModal(true);
        }}
      />

      <Modal
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedClaim(null);
        }}
        title="Claim Details"
        size="xl"
      >
        {selectedClaim && (
          <ClaimDetails
            claim={selectedClaim}
            onUpdate={fetchClaims}
            onUpdateStatus={handleUpdateClaimStatus}
          />
        )}
      </Modal>

      <Modal
        isOpen={!!editingClaim}
        onClose={() => setEditingClaim(null)}
        title="Edit Claim"
      >
        {editingClaim && (
          <ClaimEditModal
            claim={editingClaim}
            onClose={() => {
              setEditingClaim(null);
              fetchClaims();
            }}
          />
        )}
      </Modal>

      <Modal
        isOpen={!!deletingClaimId}
        onClose={() => setDeletingClaimId(null)}
        title="Delete Claim"
      >
        {deletingClaimId && (
          <ClaimDeleteModal
            claimId={deletingClaimId}
            onClose={() => {
              setDeletingClaimId(null);
              fetchClaims();
            }}
          />
        )}
      </Modal>
    </div>
  );
};

export default Claims;