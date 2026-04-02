// src/pages/Vehicles.tsx

import React, { useState, useEffect } from 'react';
import { useVehicles } from '../hooks/useVehicles';
import { useVehicleFilters } from '../hooks/useVehicleFilters';
import { usePermissions } from '../hooks/usePermissions';
import { useAuth } from '../context/AuthContext';
import { useVehicleStatusManager, resetAllVehicleStatuses } from '../hooks/useVehicleStatusManager';
import VehicleFilters from '../components/vehicles/VehicleFilters';
import VehicleTable from '../components/vehicles/VehicleTable';
import SetServiceMileageModal from '../components/vehicles/SetServiceMileageModal';
import VehicleForm from '../components/vehicles/VehicleForm';
import VehicleSaleModal from '../components/vehicles/VehicleSaleModal';
import VehicleUndoSaleModal from '../components/vehicles/VehicleUndoSaleModal';
import VehicleDetailsModal from '../components/vehicles/VehicleDetailsModal';
import VehicleDeleteModal from '../components/vehicles/VehicleDeleteModal';
import Modal from '../components/ui/Modal';
import MileageUpdateForm from '../components/vehicles/MileageUpdateForm';
import {
  Plus,
  Download,
  RefreshCw,
  FileText,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Building2,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, collection, addDoc, updateDoc, getDoc, getDocs, setDoc, writeBatch, query, where, arrayUnion } from 'firebase/firestore'; 
import { db, storage } from '../lib/firebase';
import { Vehicle } from '../types';
import { handleVehicleExport } from '../utils/vehicleHelpers';
import { syncVehicleStatuses } from '../utils/vehicleStatusManager';
import { generateAndUploadDocument, generateBulkDocuments } from '../utils/documentGenerator';
import { VehicleDocument, VehicleBulkDocument } from '../components/pdf/documents';
import SearchableSelect from '../components/ui/SearchableSelect'; 

const Vehicles: React.FC = () => {
  const { vehicles, loading } = useVehicles();
  const { can, isCompany } = usePermissions();
  
  const { user } = useAuth();
  useVehicleStatusManager();
  const [vehiclesState, setVehiclesState] = useState<Vehicle[]>([]);

  const SERVICE_THRESHOLD = 2_500;

  const {
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    makeFilter,
    setMakeFilter,
    showSold,
    setShowSold,
    filteredVehicles,
    uniqueMakes,
    expiryFilter,
    setExpiryFilter,
    accountFilter,
    setAccountFilter,
  } = useVehicleFilters(vehiclesState);

  const [accounts, setAccounts] = useState<{ id: string; name: string }[]>([]);

  // ✅ Multi-select & Assign Garage State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assigningSingleVehicle, setAssigningSingleVehicle] = useState<Vehicle | null>(null);
  const [companyUsers, setCompanyUsers] = useState<{id: string, name: string}[]>([]);
  const [selectedGarageId, setSelectedGarageId] = useState<string>('');
  

  const injectMissingVehicle = async () => {
    try {
      const vehicleRef = doc(db, 'vehicles', 'Dir82nWqqffHnMj8zrAX');
      
      await setDoc(vehicleRef, {
        activeStatuses: ['rented'],
        claimRentalPrice: 340,
        createdAt: new Date('2025-05-29T20:01:23+03:00'),
        dailyRentalPrice: 60,
        documents: {
          v5Image: [
            "https://firebasestorage.googleapis.com/v0/b/aie-claims.firebasestorage.app/o/vehicle-documents%2F1748629842753_FIRST_REGISTER.jpg?alt=media&token=d765ef30-94d6-48e7-99e7-f932c1d1aa46"
          ]
        },
        image: "https://firebasestorage.googleapis.com/v0/b/aie-claims.firebasestorage.app/o/vehicle-main%2F1748629845036_AIE_Skyline_Courtesy_Vehicle_Where_Excellence_Meets_the_Road.png?alt=media&token=38d1031d-9f42-40d4-9d62-1f84c0306f01",
        insuranceExpiry: new Date('2025-12-17T03:00:00+03:00'),
        lastMaintenance: new Date('2025-05-30T02:00:00+03:00'),
        make: "LEVC",
        mileage: 18952,
        model: "TX VISTA COMFORT PLUS (BLACK)",
        motExpiry: new Date('2026-05-30T02:00:00+03:00'),
        motTestDate: new Date('2025-11-30T03:00:00+03:00'),
        nextMaintenance: new Date('2026-05-30T02:00:00+03:00'),
        nextServiceMileage: 25000,
        nslExpiry: new Date('2026-05-30T02:00:00+03:00'),
        owner: {
          address: "39-41 North Road, London, N7 9DP",
          isDefault: false,
          name: "AIE Skyline Limited"
        },
        purchasedDate: new Date('2025-05-30T02:00:00+03:00'),
        registrationNumber: "LM25JVC",
        roadTaxExpiry: new Date('2026-06-01T02:00:00+03:00'),
        status: "rented",
        updatedAt: new Date('2026-01-27T16:17:30+03:00'),
        vin: "SECRET45T3PA013101",
        weeklyRentalPrice: 360,
        year: 2025
      });
      
      toast.success('Vehicle successfully injected into database!');
    } catch (error) {
      console.error("Error adding document: ", error);
      toast.error('Failed to inject vehicle');
    }
  };

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'accounts'));
        const accs = querySnapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name,
        }));
        setAccounts(accs.sort((a, b) => a.name.localeCompare(b.name)));
      } catch (error) {
        console.error("Error fetching accounts:", error);
      }
    };
    fetchAccounts();
  }, []);

  // ✅ Fetch Companies for the Assign Dropdown
  useEffect(() => {
    if (can('vehicles', 'update') && !isCompany) {
      const fetchCompanies = async () => {
        try {
          const q = query(collection(db, 'users'), where('role', '==', 'company'));
          const snap = await getDocs(q);
          const companies = snap.docs.map(d => ({
            id: d.id,
            name: d.data().companyName || d.data().name || 'Unnamed Company'
          }));
          setCompanyUsers(companies);
        } catch (error) {
          console.error("Failed to load companies:", error);
        }
      };
      fetchCompanies();
    }
  }, [can, isCompany]);

  const [showForm, setShowForm] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [deletingVehicle, setDeletingVehicle] = useState<Vehicle | null>(null);
  const [sellingVehicle, setSellingVehicle] = useState<Vehicle | null>(null);
  const [undoingSaleVehicle, setUndoingSaleVehicle] = useState<Vehicle | null>(null);
  const [serviceVehicle, setServiceVehicle] = useState<Vehicle | null>(null);
  

  const overdue = filteredVehicles.filter(v => v.nextServiceMileage <= v.mileage);
  const dueSoonArr = filteredVehicles.filter(
    v => v.nextServiceMileage > v.mileage && v.nextServiceMileage - v.mileage <= SERVICE_THRESHOLD
  );

  const [showDueSoon, setShowDueSoon] = useState(false);
  const displayedVehicles = showDueSoon ? dueSoonArr : filteredVehicles;

  const handleExport = () => {
    try {
      handleVehicleExport(vehicles);
      toast.success('Vehicles exported successfully');
    } catch (err) {
      console.error(err);
      toast.error('Failed to export vehicles');
    }
  };

  const handleGenerateDocument = async (vehicle: Vehicle) => {
    try {
      await generateAndUploadDocument(
        VehicleDocument,
        vehicle,
        'vehicles',
        vehicle.id,
        'vehicles'
      );
      toast.success('Document generated successfully');
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate document');
    }
  };

  const handleViewDocument = (url: string) => {
    window.open(url, '_blank');
  };

  const handleGeneratePDF = async () => {
    try {
      const companyDoc = await getDoc(doc(db, 'companySettings', 'details'));
      if (!companyDoc.exists()) throw new Error();
      const companyDetails = companyDoc.data();
      const pdfBlob = await generateBulkDocuments(
        VehicleBulkDocument,
        filteredVehicles,
        companyDetails
      );
      const pdfUrl = URL.createObjectURL(pdfBlob);
      window.open(pdfUrl, '_blank');
      toast.success('Vehicle summary PDF generated successfully');
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate vehicle PDF');
    }
  };

  useEffect(() => {
  setVehiclesState(vehicles);
}, [vehicles]);

const handleMileageUpdated = (updatedVehicle: Vehicle) => {
  setVehiclesState((prev) =>
    prev.map((v) => (v.id === updatedVehicle.id ? updatedVehicle : v))
  );
};

  const handleSubmit = async (data: Partial<Vehicle>) => {
    try {
      let imageUrl = (data.image as string) || editingVehicle?.image || '';
      if (data.image instanceof File) {
        const imageRef = ref(storage, `vehicles/${Date.now()}_${data.image.name}`);
        const snap = await uploadBytes(imageRef, data.image);
        imageUrl = await getDownloadURL(snap.ref);
      }

      const payload: Partial<Vehicle> = {
        ...data,
        image: imageUrl,
        updatedAt: new Date(),
        nextServiceMileage: data.nextServiceMileage,
      };

      if (editingVehicle?.id) {
        // ✅ NEW: If the mileage was changed during the edit, log it so the warning clears
        if (data.mileage !== undefined && data.mileage !== editingVehicle.mileage) {
          payload.mileageUpdates = arrayUnion({
            date: new Date(),
            mileage: data.mileage,
            note: 'Updated via Edit Form',
            updatedBy: user?.name || 'Staff',
            source: 'form'
          }) as any;
        }

        await updateDoc(doc(db, 'vehicles', editingVehicle.id), payload);
        toast.success('Vehicle updated successfully');
      } else {
        // ✅ NEW: For newly created vehicles, seed the first mileage update so it doesn't instantly warn
        if (data.mileage !== undefined) {
          payload.mileageUpdates = [{
            date: new Date(),
            mileage: data.mileage,
            note: 'Initial vehicle setup',
            updatedBy: user?.name || 'Staff',
            source: 'form'
          }] as any;
        }

        await addDoc(collection(db, 'vehicles'), {
          ...payload,
          createdAt: new Date(),
        });
        toast.success('Vehicle added successfully');
      }

      setEditingVehicle(null);
      setShowForm(false);
    } catch (err) {
      console.error(err);
      toast.error('Failed to save vehicle');
    }
  };

  const handleResetStatuses = async () => {
    await resetAllVehicleStatuses(vehicles);
  };

  // ✅ Checkbox Handlers
  const handleToggleAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(displayedVehicles.map(v => v.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleToggleOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  // ✅ Garage Assignment Submission
  const handleAssignGarageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!can('vehicles', 'update')) return;

    let targetGarageName: string | null = null;
    let targetGarageId: string | null = null;

    if (selectedGarageId && selectedGarageId !== 'clear') {
      const comp = companyUsers.find(c => c.id === selectedGarageId);
      if (comp) {
        targetGarageName = comp.name;
        targetGarageId = comp.id;
      }
    }

    try {
      const batch = writeBatch(db);
      
      if (assigningSingleVehicle) {
        batch.update(doc(db, 'vehicles', assigningSingleVehicle.id), {
          assignedGarageId: targetGarageId,
          assignedGarageName: targetGarageName,
          updatedAt: new Date()
        });
      } else if (selectedIds.size > 0) {
        selectedIds.forEach(id => {
          batch.update(doc(db, 'vehicles', id), {
            assignedGarageId: targetGarageId,
            assignedGarageName: targetGarageName,
            updatedAt: new Date()
          });
        });
      }

      await batch.commit();
      toast.success(targetGarageId ? 'Successfully assigned to garage' : 'Successfully cleared assignment');
      
      setShowAssignModal(false);
      setAssigningSingleVehicle(null);
      setSelectedIds(new Set());
      setSelectedGarageId('');
    } catch (err) {
      console.error(err);
      toast.error('Failed to assign garage');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}

      {can('vehicles', 'cards') && (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-green-50 border-l-4 border-green-400 p-4 flex items-center">
          <CheckCircle className="h-6 w-6 text-green-500 mr-3" />
          <div>
            <p className="text-sm font-medium text-green-700">All Vehicles</p>
            <p className="mt-1 text-xl font-semibold">{filteredVehicles.length}</p>
          </div>
        </div>

        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 flex items-center">
          <AlertTriangle className="h-6 w-6 text-yellow-500 mr-3" />
          <div>
            <p className="text-sm font-medium text-yellow-700">
              Due within {SERVICE_THRESHOLD.toLocaleString()} mi
            </p>
            <p className="mt-1 text-xl font-semibold">{dueSoonArr.length}</p>
          </div>
        </div>

        <div className="bg-red-50 border-l-4 border-red-400 p-4 flex items-center">
          <AlertCircle className="h-6 w-6 text-red-500 mr-3" />
          <div>
            <p className="text-sm font-medium text-red-700">Overdue</p>
            <p className="mt-1 text-xl font-semibold">{overdue.length}</p>
          </div>
        </div>
      </div>

      )}

      {/* Header & Actions */}
      <div className="space-y-3 sm:space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            AIE Vehicles
          </h1>

          <div className="w-full grid grid-cols-1 min-[380px]:grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:w-auto">
            
            {can('vehicles', 'export') && (
            <button
              onClick={handleGeneratePDF}
              className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 w-full sm:w-auto"
            >
              <FileText className="h-5 w-5 mr-2" />
              Generate PDF
            </button>
            )}
            {can('vehicles', 'create') && (
            <button
              onClick={handleExport}
              className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 w-full sm:w-auto"
            >
              <Download className="h-5 w-5 mr-2" />
              Export
            </button>
            )}
          
            {can('vehicles', 'syncStatus') && (
              
                <button
                  onClick={syncVehicleStatuses}
                  className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 w-full sm:w-auto"
                >
                  <RefreshCw className="h-5 w-5 mr-2" />
                  Sync Statuses
                </button>

            )}
              {can('vehicles', 'create') && (
                <button
                  onClick={() => setShowForm(true)}
                  className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-600 w-full sm:w-auto"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Add Vehicle
                </button>
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      <VehicleFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        makeFilter={makeFilter}
        onMakeFilterChange={setMakeFilter}
        makes={uniqueMakes}
        showSold={showSold}
        onShowSoldChange={setShowSold}
        showDueSoon={showDueSoon}
        onShowDueSoonChange={setShowDueSoon}
        expiryFilter={expiryFilter}
        onExpiryFilterChange={setExpiryFilter}
        accountFilter={accountFilter}
        onAccountFilterChange={setAccountFilter}
        accounts={accounts}
      />

      {/* ✅ Bulk Actions Header */}
      {selectedIds.size > 0 && !isCompany && can('vehicles', 'update') && (
        <div className="bg-orange-50 border border-orange-200 p-3 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center text-orange-800 font-medium">
            <CheckCircle className="w-5 h-5 mr-2" />
            {selectedIds.size} vehicle{selectedIds.size > 1 ? 's' : ''} selected
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={() => { setSelectedIds(new Set()); }}
              className="flex-1 sm:flex-none px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-50 text-center"
            >
              Cancel Selection
            </button>
            <button
              onClick={() => { setAssigningSingleVehicle(null); setShowAssignModal(true); }}
              className="flex-1 sm:flex-none px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded hover:bg-orange-700 flex items-center justify-center gap-2 shadow-sm"
            >
              <Building2 className="w-4 h-4" /> Assign Garage
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <VehicleTable
          vehicles={displayedVehicles}
          onView={setSelectedVehicle}
          onEdit={setEditingVehicle}
          onDelete={setDeletingVehicle}
          onMarkAsSold={setSellingVehicle}
          onUndoSale={setUndoingSaleVehicle}
          onGenerateDocument={handleGenerateDocument}
          onViewDocument={handleViewDocument}
          onSetServiceMileage={setServiceVehicle}
          // ✅ Multi-Select Props
          selectedIds={selectedIds}
          onToggleAll={handleToggleAll}
          onToggleOne={handleToggleOne}
          onAssignGarage={(vehicle) => {
            setAssigningSingleVehicle(vehicle);
            setSelectedGarageId(vehicle.assignedGarageId || '');
            setShowAssignModal(true);
          }}
        />
      </div>

      {/* ✅ Assign to Garage Modal */}
      <Modal isOpen={showAssignModal} onClose={() => { setShowAssignModal(false); setAssigningSingleVehicle(null); }} title="Assign to Garage">
        <form onSubmit={handleAssignGarageSubmit} className="space-y-4">
          <p className="text-sm text-gray-600">
            {assigningSingleVehicle 
              ? `Select a company/garage to assign to ${assigningSingleVehicle.registrationNumber}.`
              : `Select a company/garage to assign to the ${selectedIds.size} selected vehicles.`}
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Company / Garage</label>
            <SearchableSelect
              options={[
                { id: 'clear', label: '-- Clear Assignment (Remove from Garage) --' },
                ...companyUsers.map(c => ({ id: c.id, label: c.name }))
              ]}
              value={selectedGarageId}
              onChange={(val) => setSelectedGarageId(val)}
              placeholder="Search companies..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => { setShowAssignModal(false); setAssigningSingleVehicle(null); }} className="px-4 py-2 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={!selectedGarageId} className="px-4 py-2 bg-orange-600 text-white rounded text-sm hover:bg-orange-700 disabled:opacity-50">
              Confirm Assignment
            </button>
          </div>
        </form>
      </Modal>

      {serviceVehicle && (
  <Modal
    isOpen
    onClose={() => setServiceVehicle(null)}
    title="Update Mileage"
  >
    <MileageUpdateForm
      vehicle={serviceVehicle}
      onClose={() => setServiceVehicle(null)}
      onSuccess={handleMileageUpdated} // 🔥 THIS FIXES YOUR ISSUE
    />
  </Modal>
)}

      {/* Modals */}
      {selectedVehicle && (
        <VehicleDetailsModal vehicle={selectedVehicle} onClose={() => setSelectedVehicle(null)} />
      )}

      {(showForm || editingVehicle) && (
        <Modal
          isOpen
          onClose={() => {
            setShowForm(false);
            setEditingVehicle(null);
          }}
          title={editingVehicle ? 'Edit Vehicle' : 'Add Vehicle'}
          size="xl"
        >
          <VehicleForm
            vehicle={editingVehicle || undefined}
            onClose={() => {
              setShowForm(false);
              setEditingVehicle(null);
            }}
            onSubmit={handleSubmit}
          />
        </Modal>
      )}

      {sellingVehicle && (
        <VehicleSaleModal vehicle={sellingVehicle} onClose={() => setSellingVehicle(null)} />
      )}

      {undoingSaleVehicle && (
        <VehicleUndoSaleModal vehicle={undoingSaleVehicle} onClose={() => setUndoingSaleVehicle(null)} />
      )}

      {deletingVehicle && (
        <VehicleDeleteModal vehicle={deletingVehicle} onClose={() => setDeletingVehicle(null)} />
      )}
    </div>
  );
};

export default Vehicles;