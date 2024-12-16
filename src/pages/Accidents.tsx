import React, { useState } from 'react';
import { useVehicles } from '../hooks/useVehicles';
import { useAccidents } from '../hooks/useAccidents';
import { DataTable } from '../components/DataTable/DataTable';
import { format } from 'date-fns';
import { Plus, Download, Upload, Edit, Trash2, Eye } from 'lucide-react';
import AccidentClaimForm from '../components/accidents/AccidentClaimForm';
import Modal from '../components/ui/Modal';
import StatusBadge from '../components/StatusBadge';
import { exportAccidents, processAccidentsImport } from '../utils/AccidentExport';
import { addDoc, collection, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import toast from 'react-hot-toast';
import { Accident } from '../types';

const Accidents = () => {
  const { vehicles, loading: vehiclesLoading } = useVehicles();
  const { accidents, loading: accidentsLoading } = useAccidents();
  const [showForm, setShowForm] = useState(false);
  const [selectedAccident, setSelectedAccident] = useState<Accident | null>(null);
  const [editingAccident, setEditingAccident] = useState<Accident | null>(null);
  const [deletingAccidentId, setDeletingAccidentId] = useState<string | null>(null);

  const handleMarkAsFault = async (accident: Accident, isFault: boolean) => {
    try {
      await updateDoc(doc(db, 'accidents', accident.id), {
        type: isFault ? 'fault' : 'non-fault',
        status: 'processing'
      });

      // Create claim record
      await addDoc(collection(db, 'claims'), {
        accidentId: accident.id,
        type: isFault ? 'fault' : 'non-fault',
        status: 'submitted',
        createdAt: new Date(),
        updatedAt: new Date(),
        progressNotes: [{
          id: Date.now().toString(),
          date: new Date(),
          note: `Claim marked as ${isFault ? 'fault' : 'non-fault'}`,
          author: 'System'
        }]
      });

      toast.success('Accident processed and claim created');
    } catch (error) {
      console.error('Error processing accident:', error);
      toast.error('Failed to process accident');
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
      header: 'Date',
      cell: ({ row }) => format(row.original.date, 'MMM dd, yyyy'),
    },
    {
      header: 'Location',
      accessorKey: 'location',
    },
    {
      header: 'Status',
      cell: ({ row }) => (
        <div className="space-y-1">
          <StatusBadge status={row.original.status} />
          {row.original.type && (
            <StatusBadge status={row.original.type} />
          )}
        </div>
      ),
    },
    {
      header: 'Actions',
      cell: ({ row }) => {
        const accident = row.original;
        return (
          <div className="flex space-x-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedAccident(accident);
              }}
              className="text-blue-600 hover:text-blue-800"
              title="View Details"
            >
              <Eye className="h-4 w-4" />
            </button>
            {accident.status === 'reported' && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMarkAsFault(accident, true);
                  }}
                  className="text-red-600 hover:text-red-800"
                  title="Mark as Fault"
                >
                  Fault
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMarkAsFault(accident, false);
                  }}
                  className="text-green-600 hover:text-green-800"
                  title="Mark as Non-Fault"
                >
                  Non-Fault
                </button>
              </>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setDeletingAccidentId(accident.id);
              }}
              className="text-red-600 hover:text-red-800"
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        );
      },
    },
  ];

  if (vehiclesLoading || accidentsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Accidents</h1>
        <div className="flex space-x-2">
          <button
            onClick={() => exportAccidents(accidents)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <Download className="h-5 w-5 mr-2" />
            Export
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-600"
          >
            <Plus className="h-5 w-5 mr-2" />
            Report Accident
          </button>
        </div>
      </div>

      <DataTable
        data={accidents}
        columns={columns}
        onRowClick={(accident) => setSelectedAccident(accident)}
      />

      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title="Report Accident"
        size="xl"
      >
        <AccidentClaimForm onClose={() => setShowForm(false)} />
      </Modal>

      <Modal
        isOpen={!!selectedAccident}
        onClose={() => setSelectedAccident(null)}
        title="Accident Details"
        size="lg"
      >
        {selectedAccident && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Vehicle</h3>
                <p className="mt-1">
                  {vehicles.find(v => v.id === selectedAccident.vehicleId)?.registrationNumber}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Date</h3>
                <p className="mt-1">{format(selectedAccident.date, 'MMM dd, yyyy')}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Location</h3>
                <p className="mt-1">{selectedAccident.location}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Status</h3>
                <div className="mt-1">
                  <StatusBadge status={selectedAccident.status} />
                </div>
              </div>
              <div className="col-span-2">
                <h3 className="text-sm font-medium text-gray-500">Description</h3>
                <p className="mt-1">{selectedAccident.description}</p>
              </div>
              <div className="col-span-2">
                <h3 className="text-sm font-medium text-gray-500">Damage Details</h3>
                <p className="mt-1">{selectedAccident.damageDetails}</p>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={!!deletingAccidentId}
        onClose={() => setDeletingAccidentId(null)}
        title="Delete Accident"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Are you sure you want to delete this accident report? This action cannot be undone.
          </p>
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setDeletingAccidentId(null)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                try {
                  await deleteDoc(doc(db, 'accidents', deletingAccidentId));
                  toast.success('Accident deleted successfully');
                  setDeletingAccidentId(null);
                } catch (error) {
                  toast.error('Failed to delete accident');
                }
              }}
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

export default Accidents;