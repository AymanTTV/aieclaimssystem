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
  Tag,
  X,
  Layers // ✅ Imported icon for groups
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

// ✅ Import Finance Groups Service
import financeGroupService, { FinanceGroup } from '../services/financeGroup.service';

const Vehicles: React.FC = () => {
  const { vehicles, loading } = useVehicles();
  const { can, isCompany } = usePermissions();
  
  const { user } = useAuth();
  useVehicleStatusManager();
  const [vehiclesState, setVehiclesState] = useState<Vehicle[]>([]);

  const SERVICE_THRESHOLD = 2_500;

  const {
    searchQuery, setSearchQuery,
    statusFilter, setStatusFilter,
    makeFilter, setMakeFilter,
    showSold, setShowSold,
    filteredVehicles, uniqueMakes,
    uniqueOwners, // ✅ Extracted uniqueOwners
    expiryFilter, setExpiryFilter,
    accountFilter, setAccountFilter,
    garageFilter, setGarageFilter,
    groupFilter, setGroupFilter, // ✅ Extracted groupFilter
    ownerFilter, setOwnerFilter, // ✅ Extracted ownerFilter
    typeFilter, setTypeFilter, 
    ageFilter, setAgeFilter,  
  } = useVehicleFilters(vehiclesState);

  const [accounts, setAccounts] = useState<{ id: string; name: string }[]>([]);

  // Multi-select
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Assign Garage State
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assigningSingleVehicle, setAssigningSingleVehicle] = useState<Vehicle | null>(null);
  const [companyUsers, setCompanyUsers] = useState<{id: string, name: string}[]>([]);
  const [selectedGarageId, setSelectedGarageId] = useState<string>('');

  // Assign Type State
  const [showAssignTypeModal, setShowAssignTypeModal] = useState(false);
  const [assigningTypeSingleVehicle, setAssigningTypeSingleVehicle] = useState<Vehicle | null>(null);
  const [selectedAssignmentType, setSelectedAssignmentType] = useState<string>('');

  // ✅ Assign Group State
  const [showAssignGroupModal, setShowAssignGroupModal] = useState(false);
  const [assigningGroupSingleVehicle, setAssigningGroupSingleVehicle] = useState<Vehicle | null>(null);
  const [financeGroups, setFinanceGroups] = useState<FinanceGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');

  // ✅ Fetch Finance Groups
  useEffect(() => {
    const loadGroups = async () => {
      try {
        const all = await financeGroupService.getAll();
        setFinanceGroups(all.sort((a,b) => a.name.localeCompare(b.name)));
      } catch (e) {
        console.error("Error loading groups:", e);
      }
    };
    loadGroups();
  }, []);

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

  useEffect(() => {
    if (can('vehicles', 'update') && !isCompany) {
      const fetchCompanies = async () => {
        try {
          const q = query(collection(db, 'users'), where('role', '==', 'company'));
          const snap = await getDocs(q);
          
          const uniqueCompaniesMap = new Map<string, {id: string, name: string}>();
          
          snap.docs.forEach(d => {
            const name = d.data().companyName || d.data().name || 'Unnamed Company';
            if (!uniqueCompaniesMap.has(name)) {
              uniqueCompaniesMap.set(name, { id: d.id, name: name });
            }
          });
          
          const companies = Array.from(uniqueCompaniesMap.values()).sort((a, b) => 
            a.name.localeCompare(b.name)
          );
          
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

  // Garage Assignment Submission
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

  // Type Assignment Submission
  const handleAssignTypeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!can('vehicles', 'update')) return;

    const targetType = selectedAssignmentType === 'clear' ? null : selectedAssignmentType;

    try {
      const batch = writeBatch(db);
      
      if (assigningTypeSingleVehicle) {
        batch.update(doc(db, 'vehicles', assigningTypeSingleVehicle.id), {
          assignmentType: targetType,
          updatedAt: new Date()
        });
      } else if (selectedIds.size > 0) {
        selectedIds.forEach(id => {
          batch.update(doc(db, 'vehicles', id), {
            assignmentType: targetType,
            updatedAt: new Date()
          });
        });
      }

      await batch.commit();
      toast.success(targetType ? `Successfully assigned to ${targetType}` : 'Successfully cleared type assignment');
      
      setShowAssignTypeModal(false);
      setAssigningTypeSingleVehicle(null);
      setSelectedIds(new Set());
      setSelectedAssignmentType('');
    } catch (err) {
      console.error(err);
      toast.error('Failed to assign type');
    }
  };

  // ✅ Group Assignment Submission
  const handleAssignGroupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!can('vehicles', 'update')) return;

    let targetGroupName: string | null = null;
    let targetGroupId: string | null = null;

    if (selectedGroupId && selectedGroupId !== 'clear') {
      const grp = financeGroups.find(g => g.id === selectedGroupId);
      if (grp) {
        targetGroupName = grp.name;
        targetGroupId = grp.id;
      }
    }

    try {
      const batch = writeBatch(db);
      
      if (assigningGroupSingleVehicle) {
        batch.update(doc(db, 'vehicles', assigningGroupSingleVehicle.id), {
          assignedGroupId: targetGroupId,
          assignedGroupName: targetGroupName,
          updatedAt: new Date()
        });
      } else if (selectedIds.size > 0) {
        selectedIds.forEach(id => {
          batch.update(doc(db, 'vehicles', id), {
            assignedGroupId: targetGroupId,
            assignedGroupName: targetGroupName,
            updatedAt: new Date()
          });
        });
      }

      await batch.commit();
      toast.success(targetGroupId ? 'Successfully assigned to group' : 'Successfully cleared group assignment');
      
      setShowAssignGroupModal(false);
      setAssigningGroupSingleVehicle(null);
      setSelectedIds(new Set());
      setSelectedGroupId('');
    } catch (err) {
      console.error(err);
      toast.error('Failed to assign group');
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

      {/* ✅ Filters with Passed Props */}
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
        garageFilter={garageFilter}
        onGarageFilterChange={setGarageFilter}
        garages={companyUsers}
        typeFilter={typeFilter} 
        onTypeFilterChange={setTypeFilter} 
        ageFilter={ageFilter}           
        onAgeFilterChange={setAgeFilter} 
        groupFilter={groupFilter}           // ✅ Added
        onGroupFilterChange={setGroupFilter} // ✅ Added
        groups={financeGroups}              // ✅ Added
        ownerFilter={ownerFilter}           // ✅ Added
        onOwnerFilterChange={setOwnerFilter} // ✅ Added
        owners={uniqueOwners}               // ✅ Added
      />

      {/* Bulk Actions Header */}
      {selectedIds.size > 0 && !isCompany && can('vehicles', 'update') && (
        <div className="bg-orange-50 border border-orange-200 p-3 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center text-orange-800 font-medium">
            <CheckCircle className="w-5 h-5 mr-2" />
            {selectedIds.size} vehicle{selectedIds.size > 1 ? 's' : ''} selected
          </div>
          <div className="flex gap-2 w-full sm:w-auto flex-wrap">
            <button
              onClick={() => { setSelectedIds(new Set()); }}
              className="flex-1 sm:flex-none px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-50 text-center"
            >
              Cancel
            </button>
            <button
              onClick={() => { setAssigningTypeSingleVehicle(null); setShowAssignTypeModal(true); }}
              className="flex-1 sm:flex-none px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded hover:bg-purple-700 flex items-center justify-center gap-2 shadow-sm"
            >
              <Tag className="w-4 h-4" /> Assign Type
            </button>
            <button
              onClick={() => { setAssigningSingleVehicle(null); setShowAssignModal(true); }}
              className="flex-1 sm:flex-none px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded hover:bg-orange-700 flex items-center justify-center gap-2 shadow-sm"
            >
              <Building2 className="w-4 h-4" /> Assign Garage
            </button>
            {/* ✅ Bulk Assign Group */}
            <button
              onClick={() => { setAssigningGroupSingleVehicle(null); setShowAssignGroupModal(true); }}
              className="flex-1 sm:flex-none px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 flex items-center justify-center gap-2 shadow-sm"
            >
              <Layers className="w-4 h-4" /> Assign Group
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
          selectedIds={selectedIds}
          onToggleAll={handleToggleAll}
          onToggleOne={handleToggleOne}
          onAssignGarage={(vehicle) => {
            setAssigningSingleVehicle(vehicle);
            setSelectedGarageId(vehicle.assignedGarageId || '');
            setShowAssignModal(true);
          }}
          onAssignType={(vehicle) => {
            setAssigningTypeSingleVehicle(vehicle);
            setSelectedAssignmentType(vehicle.assignmentType || '');
            setShowAssignTypeModal(true);
          }}
          // ✅ Added Assign Group prop
          onAssignGroup={(vehicle) => {
            setAssigningGroupSingleVehicle(vehicle);
            setSelectedGroupId(vehicle.assignedGroupId || '');
            setShowAssignGroupModal(true);
          }}
        />
      </div>

      {/* Assign to Garage Modal */}
      <Modal isOpen={showAssignModal} onClose={() => { setShowAssignModal(false); setAssigningSingleVehicle(null); }} title="Assign to Garage">
        <form onSubmit={handleAssignGarageSubmit} className="space-y-4">
          <p className="text-sm text-gray-600 mb-2">
            {assigningSingleVehicle 
              ? `Select a company/garage to assign to ${assigningSingleVehicle.registrationNumber}.`
              : `Select a company/garage to assign to the ${selectedIds.size} selected vehicles.`}
          </p>

          <div className="min-h-[250px]">
            <SearchableSelect
              label="Available Garages / Companies"
              options={[
                { id: 'clear', label: '🚫 -- Clear Assignment (Remove from Garage) --' },
                ...companyUsers.map(c => ({ id: c.id, label: c.name }))
              ]}
              value={selectedGarageId}
              onChange={(val) => setSelectedGarageId(val as string)}
              placeholder="Search companies..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button type="button" onClick={() => { setShowAssignModal(false); setAssigningSingleVehicle(null); }} className="px-4 py-2 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50 font-medium">
              Cancel
            </button>
            <button type="submit" disabled={!selectedGarageId} className="px-4 py-2 bg-orange-600 text-white rounded text-sm hover:bg-orange-700 disabled:opacity-50 font-medium shadow-sm">
              Confirm Assignment
            </button>
          </div>
        </form>
      </Modal>

      {/* Assign Type Modal */}
      <Modal isOpen={showAssignTypeModal} onClose={() => { setShowAssignTypeModal(false); setAssigningTypeSingleVehicle(null); }} title="Assign Vehicle Type">
        <form onSubmit={handleAssignTypeSubmit} className="space-y-4">
          <p className="text-sm text-gray-600 mb-2">
            {assigningTypeSingleVehicle 
              ? `Select a type to assign to ${assigningTypeSingleVehicle.registrationNumber}.`
              : `Select a type to assign to the ${selectedIds.size} selected vehicles.`}
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Vehicle Type
            </label>
            <select
              value={selectedAssignmentType}
              onChange={(e) => setSelectedAssignmentType(e.target.value)}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
            >
              <option value="" disabled>Select a type...</option>
              <option value="Claims">For Claims</option>
              <option value="Hire">For Hire</option>
              <option value="clear">🚫 Clear Assignment</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button type="button" onClick={() => { setShowAssignTypeModal(false); setAssigningTypeSingleVehicle(null); }} className="px-4 py-2 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50 font-medium">
              Cancel
            </button>
            <button type="submit" disabled={!selectedAssignmentType} className="px-4 py-2 bg-purple-600 text-white rounded text-sm hover:bg-purple-700 disabled:opacity-50 font-medium shadow-sm">
              Confirm Assignment
            </button>
          </div>
        </form>
      </Modal>

      {/* ✅ Assign Group Modal */}
      <Modal isOpen={showAssignGroupModal} onClose={() => { setShowAssignGroupModal(false); setAssigningGroupSingleVehicle(null); }} title="Assign Finance Group">
        <form onSubmit={handleAssignGroupSubmit} className="space-y-4">
          <p className="text-sm text-gray-600 mb-2">
            {assigningGroupSingleVehicle 
              ? `Select a finance group to assign to ${assigningGroupSingleVehicle.registrationNumber}.`
              : `Select a finance group to assign to the ${selectedIds.size} selected vehicles.`}
          </p>

          <div className="min-h-[250px]">
            <SearchableSelect
              label="Available Groups"
              options={[
                { id: 'clear', label: '🚫 -- Clear Group Assignment --' },
                ...financeGroups.map(g => ({ id: g.id, label: g.name }))
              ]}
              value={selectedGroupId}
              onChange={(val) => setSelectedGroupId(val as string)}
              placeholder="Search groups..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button type="button" onClick={() => { setShowAssignGroupModal(false); setAssigningGroupSingleVehicle(null); }} className="px-4 py-2 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50 font-medium">
              Cancel
            </button>
            <button type="submit" disabled={!selectedGroupId} className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50 font-medium shadow-sm">
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
            onSuccess={handleMileageUpdated}
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