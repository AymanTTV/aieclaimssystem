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
  Plus, Download, RefreshCw, FileText, AlertTriangle, AlertCircle, CheckCircle, Building2, Tag, X, Layers, Briefcase 
} from 'lucide-react';
import toast from 'react-hot-toast';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, collection, addDoc, updateDoc, getDoc, getDocs, setDoc, writeBatch, query, where, arrayUnion, onSnapshot } from 'firebase/firestore'; 
import { db, storage } from '../lib/firebase';
import { Vehicle } from '../types';
import { handleVehicleExport } from '../utils/vehicleHelpers';
import { syncVehicleStatuses } from '../utils/vehicleStatusManager';
import { generateAndUploadDocument, generateBulkDocuments } from '../utils/documentGenerator';
import { VehicleDocument, VehicleBulkDocument } from '../components/pdf/documents';
import SearchableSelect from '../components/ui/SearchableSelect'; 

import financeGroupService, { FinanceGroup } from '../services/financeGroup.service';

// ✅ Import the Shared Manage Modal from Finance & the Vehicle Assign Modal
import ManageFinanceDepartmentsModal from '../components/finance/ManageFinanceDepartmentsModal';
import AssignVehicleDepartmentModal from '../components/vehicles/AssignVehicleDepartmentModal';

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
    uniqueOwners, 
    expiryFilter, setExpiryFilter,
    accountFilter, setAccountFilter,
    garageFilter, setGarageFilter,
    groupFilter, setGroupFilter, 
    departmentFilter, setDepartmentFilter, 
    ownerFilter, setOwnerFilter, 
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

  // Assign Group State
  const [showAssignGroupModal, setShowAssignGroupModal] = useState(false);
  const [assigningGroupSingleVehicle, setAssigningGroupSingleVehicle] = useState<Vehicle | null>(null);
  const [financeGroups, setFinanceGroups] = useState<FinanceGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');

  // ✅ Department State
  const [showManageDepartments, setShowManageDepartments] = useState(false);
  const [showAssignDepartmentModal, setShowAssignDepartmentModal] = useState(false);
  const [assigningDepartmentSingleVehicle, setAssigningDepartmentSingleVehicle] = useState<Vehicle | null>(null);
  const [departments, setDepartments] = useState<{id: string, name: string}[]>([]);

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

  // ✅ Fetch SAME Departments real-time as Finance/Invoices
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'financeDepartments'), snap => {
      setDepartments(snap.docs.map(d => ({ id: d.id, name: d.data().name })));
    });
    return () => unsub();
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
        <div
          className="bg-[#F0F9FF] border-[#BAE6FD] rounded-2xl p-5 sm:p-6 flex items-center justify-between shadow-xs transition-all"
          style={{ borderWidth: '1.5px', borderStyle: 'solid' }}
        >
          <div>
            <p className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#0284C7]">All Vehicles</p>
            <p className="mt-1 text-3xl sm:text-4xl font-black font-mono text-[#0284C7] tracking-tight">{filteredVehicles.length}</p>
          </div>
          <div className="p-3 rounded-xl border border-[#BAE6FD] bg-white text-[#0284C7] shadow-xs">
            <CheckCircle className="h-7 w-7" />
          </div>
        </div>

        <div
          className="bg-[#FFFBEB] border-[#FDE68A] rounded-2xl p-5 sm:p-6 flex items-center justify-between shadow-xs transition-all"
          style={{ borderWidth: '1.5px', borderStyle: 'solid' }}
        >
          <div>
            <p className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#D97706]">
              Due within {SERVICE_THRESHOLD.toLocaleString()} mi
            </p>
            <p className="mt-1 text-3xl sm:text-4xl font-black font-mono text-[#D97706] tracking-tight">{dueSoonArr.length}</p>
          </div>
          <div className="p-3 rounded-xl border border-[#FDE68A] bg-white text-[#D97706] shadow-xs">
            <AlertTriangle className="h-7 w-7" />
          </div>
        </div>

        <div
          className="bg-[#FEF2F2] border-[#FECACA] rounded-2xl p-5 sm:p-6 flex items-center justify-between shadow-xs transition-all"
          style={{ borderWidth: '1.5px', borderStyle: 'solid' }}
        >
          <div>
            <p className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#DC2626]">Overdue</p>
            <p className="mt-1 text-3xl sm:text-4xl font-black font-mono text-[#DC2626] tracking-tight">{overdue.length}</p>
          </div>
          <div className="p-3 rounded-xl border border-[#FECACA] bg-white text-[#DC2626] shadow-xs">
            <AlertCircle className="h-7 w-7" />
          </div>
        </div>
      </div>
      )}

      {/* Header & Actions */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 sm:p-5 shadow-xs text-[#0F172A]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 font-bold shadow-xs">
              🚗
            </div>
            <div>
              <h1 className="text-[24px] font-bold text-[#0F172A] tracking-tight leading-tight">
                AIE Vehicles
              </h1>
              <p className="text-xs text-[#64748B]">Fleet management, documents, maintenance tracking, and assignments</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-nowrap overflow-x-auto w-full sm:w-auto scrollbar-none py-1">
            
            {/* ✅ Added Departments Header Button */}
            {!isCompany && can('vehicles', 'departments') && (
               <button
                 type="button"
                 onClick={() => setShowManageDepartments(true)}
                 className="inline-flex whitespace-nowrap flex-shrink-0 items-center justify-center px-4 py-2.5 border border-teal-200 rounded-xl shadow-xs text-sm font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 hover:border-teal-300 hover:text-teal-800 active:scale-95 transition-all cursor-pointer"
               >
                 <Briefcase className="h-4 w-4 mr-2 text-teal-600 pointer-events-none" />
                 Depts
               </button>
            )}

            {can('vehicles', 'export') && (
            <button
              type="button"
              onClick={handleGeneratePDF}
              className="inline-flex whitespace-nowrap flex-shrink-0 items-center justify-center px-4 py-2.5 border border-rose-200 rounded-xl shadow-xs text-sm font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 hover:border-rose-300 hover:text-rose-800 active:scale-95 transition-all cursor-pointer"
            >
              <FileText className="h-4 w-4 mr-2 text-rose-600 pointer-events-none" />
              Generate PDF
            </button>
            )}
            {can('vehicles', 'create') && (
            <button
              type="button"
              onClick={handleExport}
              className="inline-flex whitespace-nowrap flex-shrink-0 items-center justify-center px-4 py-2.5 border border-indigo-200 rounded-xl shadow-xs text-sm font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 hover:border-indigo-300 hover:text-indigo-800 active:scale-95 transition-all cursor-pointer"
            >
              <Download className="h-4 w-4 mr-2 text-indigo-600 pointer-events-none" />
              Export
            </button>
            )}
          
            {can('vehicles', 'syncStatus') && (
                <button
                  type="button"
                  onClick={syncVehicleStatuses}
                  className="inline-flex whitespace-nowrap flex-shrink-0 items-center justify-center px-4 py-2.5 border border-amber-200 rounded-xl shadow-xs text-sm font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 hover:border-amber-300 hover:text-amber-900 active:scale-95 transition-all cursor-pointer"
                >
                  <RefreshCw className="h-4 w-4 mr-2 text-amber-600 pointer-events-none" />
                  Sync Statuses
                </button>
            )}
              {can('vehicles', 'create') && (
                <button
                  type="button"
                  onClick={() => setShowForm(true)}
                  className="inline-flex whitespace-nowrap flex-shrink-0 items-center justify-center px-4 py-2.5 border border-emerald-600 rounded-xl shadow-xs text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 transition-all cursor-pointer"
                >
                  <Plus className="h-4.5 w-4.5 mr-1.5 pointer-events-none" />
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
        groupFilter={groupFilter}           
        onGroupFilterChange={setGroupFilter} 
        groups={financeGroups}              
        departmentFilter={departmentFilter} // ✅ Added
        onDepartmentFilterChange={setDepartmentFilter} // ✅ Added
        departments={departments} // ✅ Added
        ownerFilter={ownerFilter}           
        onOwnerFilterChange={setOwnerFilter} 
        owners={uniqueOwners}               
      />

      {/* Bulk Actions Header */}
      {selectedIds.size > 0 && !isCompany && can('vehicles', 'update') && (
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs text-blue-900">
          <div className="flex items-center text-blue-950 font-bold text-sm">
            <CheckCircle className="w-5 h-5 mr-2 text-emerald-600" />
            <span>{selectedIds.size} vehicle{selectedIds.size > 1 ? 's' : ''} selected</span>
          </div>
          <div className="flex gap-2 w-full sm:w-auto flex-wrap">
            <button
              type="button"
              onClick={() => { setSelectedIds(new Set()); }}
              className="flex-1 sm:flex-none px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 active:scale-95 transition-all text-center cursor-pointer shadow-xs"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => { setAssigningTypeSingleVehicle(null); setShowAssignTypeModal(true); }}
              className="flex-1 sm:flex-none px-4 py-2 text-sm font-semibold text-white bg-purple-600 rounded-xl hover:bg-purple-500 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
            >
              <Tag className="w-4 h-4 pointer-events-none" /> Assign Type
            </button>
            <button
              type="button"
              onClick={() => { setAssigningSingleVehicle(null); setShowAssignModal(true); }}
              className="flex-1 sm:flex-none px-4 py-2 text-sm font-semibold text-white bg-orange-600 rounded-xl hover:bg-orange-500 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
            >
              <Building2 className="w-4 h-4 pointer-events-none" /> Assign Garage
            </button>
            <button
              type="button"
              onClick={() => { setAssigningGroupSingleVehicle(null); setShowAssignGroupModal(true); }}
              className="flex-1 sm:flex-none px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-500 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
            >
              <Layers className="w-4 h-4 pointer-events-none" /> Assign Group
            </button>
            {/* ✅ Bulk Assign Department */}
            <button
              type="button"
              onClick={() => { setAssigningDepartmentSingleVehicle(null); setShowAssignDepartmentModal(true); }}
              className="flex-1 sm:flex-none px-4 py-2 text-sm font-semibold text-white bg-teal-600 rounded-xl hover:bg-teal-500 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
            >
              <Briefcase className="w-4 h-4 pointer-events-none" /> Assign Dept
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-xs border border-[#E2E8F0] overflow-hidden">
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
          onAssignGroup={(vehicle) => {
            setAssigningGroupSingleVehicle(vehicle);
            setSelectedGroupId(vehicle.assignedGroupId || '');
            setShowAssignGroupModal(true);
          }}
          onAssignDepartment={(vehicle) => {
            setAssigningDepartmentSingleVehicle(vehicle); 
            setShowAssignDepartmentModal(true); 
          }} 
        />
      </div>

      {/* ✅ Mount Modals */}
      <ManageFinanceDepartmentsModal isOpen={showManageDepartments} onClose={() => setShowManageDepartments(false)} />
      
      <AssignVehicleDepartmentModal 
        isOpen={showAssignDepartmentModal} 
        onClose={() => setShowAssignDepartmentModal(false)}
        selectedIds={selectedIds}
        singleVehicle={assigningDepartmentSingleVehicle}
        departments={departments}
        onSuccess={() => {
          setShowAssignDepartmentModal(false);
          setAssigningDepartmentSingleVehicle(null);
          setSelectedIds(new Set());
        }}
      />

      {/* Assign to Garage Modal */}
      <Modal isOpen={showAssignModal} onClose={() => { setShowAssignModal(false); setAssigningSingleVehicle(null); }} title="Assign to Garage">
        <form onSubmit={handleAssignGarageSubmit} className="space-y-4">
          <p className="text-sm text-slate-700">
            {assigningSingleVehicle 
              ? `Select a company/garage to assign to ${assigningSingleVehicle.registrationNumber}.`
              : `Select a company/garage to assign to the ${selectedIds.size} selected vehicles.`}
          </p>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-2xs min-h-[220px]">
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

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => { setShowAssignModal(false); setAssigningSingleVehicle(null); }}
              className="px-5 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-700 bg-white hover:bg-slate-100 font-semibold transition-all cursor-pointer shadow-2xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedGarageId}
              className="px-5 py-2.5 bg-orange-600 text-white rounded-xl text-sm hover:bg-orange-700 disabled:opacity-50 font-bold shadow-md transition-all cursor-pointer"
            >
              Confirm Assignment
            </button>
          </div>
        </form>
      </Modal>

      {/* Assign Type Modal */}
      <Modal isOpen={showAssignTypeModal} onClose={() => { setShowAssignTypeModal(false); setAssigningTypeSingleVehicle(null); }} title="Assign Vehicle Type">
        <form onSubmit={handleAssignTypeSubmit} className="space-y-4">
          <p className="text-sm text-slate-700">
            {assigningTypeSingleVehicle 
              ? `Select a type to assign to ${assigningTypeSingleVehicle.registrationNumber}.`
              : `Select a type to assign to the ${selectedIds.size} selected vehicles.`}
          </p>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-xs">
            <label className="block text-sm font-semibold text-slate-800 mb-2">
              Vehicle Type
            </label>
            <select
              value={selectedAssignmentType}
              onChange={(e) => setSelectedAssignmentType(e.target.value)}
              className="block w-full px-4 py-2.5 text-sm bg-white border-[1.5px] border-[#CBD5E1] text-[#0F172A] focus:outline-none focus:ring-1 focus:ring-blue-500 rounded-xl"
            >
              <option value="" disabled>Select a type...</option>
              <option value="Claims">For Claims</option>
              <option value="Hire">For Hire</option>
              <option value="clear">🚫 Clear Assignment</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => { setShowAssignTypeModal(false); setAssigningTypeSingleVehicle(null); }}
              className="px-5 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-700 bg-white hover:bg-slate-100 font-semibold transition-all cursor-pointer shadow-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedAssignmentType}
              className="px-5 py-2.5 bg-purple-600 text-white rounded-xl text-sm hover:bg-purple-700 disabled:opacity-50 font-bold shadow-md transition-all cursor-pointer"
            >
              Confirm Assignment
            </button>
          </div>
        </form>
      </Modal>

      {/* Assign Group Modal */}
      <Modal isOpen={showAssignGroupModal} onClose={() => { setShowAssignGroupModal(false); setAssigningGroupSingleVehicle(null); }} title="Assign Finance Group">
        <form onSubmit={handleAssignGroupSubmit} className="space-y-4">
          <p className="text-sm text-slate-700">
            {assigningGroupSingleVehicle 
              ? `Select a finance group to assign to ${assigningGroupSingleVehicle.registrationNumber}.`
              : `Select a finance group to assign to the ${selectedIds.size} selected vehicles.`}
          </p>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-2xs min-h-[220px]">
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

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => { setShowAssignGroupModal(false); setAssigningGroupSingleVehicle(null); }}
              className="px-5 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-700 bg-white hover:bg-slate-100 font-semibold transition-all cursor-pointer shadow-2xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedGroupId}
              className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm hover:bg-blue-700 disabled:opacity-50 font-bold shadow-md transition-all cursor-pointer"
            >
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
          contentClassName="p-0 flex flex-col flex-1 overflow-hidden min-h-0"
        >
          <VehicleForm
            vehicle={editingVehicle || undefined}
            departments={departments}
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