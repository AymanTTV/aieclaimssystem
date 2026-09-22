// src/components/maintenance/MaintenanceForm.tsx
import React, { useState, useEffect } from 'react';
import { addDoc, collection, updateDoc, doc, deleteField, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Vehicle, MaintenanceLog, Part, VehicleOwner } from '../../types';
import { addYears, format, addDays } from 'date-fns';
import toast from 'react-hot-toast';
import FileUpload from '../ui/FileUpload';
import ServiceCenterDropdown from './ServiceCenterDropdown';
import FormField from '../ui/FormField';
import { createFinanceTransaction } from '../../utils/financeTransactions';
import { createMileageHistoryRecord } from '../../utils/mileageUtils';
import { usePermissions } from '../../hooks/usePermissions';
import { useAuth } from '../../context/AuthContext';
import SearchableSelect from '../ui/SearchableSelect';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';
import { uploadMaintenanceAttachments } from '../../utils/maintenanceUpload';
import productService from '../../services/product.service';
import maintenanceCategoryService from '../../services/maintenanceCategory.service';
import ProductFormModal from '../products/ProductFormModal'; 
import { PlusCircle, Car, Wrench, Layers, CreditCard, Paperclip, ArrowRight, ArrowLeft } from 'lucide-react'; 

interface MaintenanceFormProps {
  vehicles: Vehicle[];
  onClose: () => void;
  editLog?: MaintenanceLog;
}

type FormTab = 'vehicle_service' | 'parts_labor' | 'billing_payment' | 'attachments';

interface PartSuggestion {
  id: string;
  partNumber: string;
  name: string;
  lastCost: number;
}

const MaintenanceForm: React.FC<MaintenanceFormProps> = ({ vehicles, onClose, editLog }) => {
  const { user } = useAuth();
  const { can, isCompany } = usePermissions(); 
  const [loading, setLoading] = useState(false);
  const [isGeneratingNumbers, setIsGeneratingNumbers] = useState(false);
  const [activeTab, setActiveTab] = useState<FormTab>('vehicle_service');

  const [manualEntry, setManualEntry] = useState(
    !!(editLog?.vehicleDetails && !editLog.vehicleId)
  );
  
  const [manualMake, setManualMake] = useState(editLog?.vehicleDetails?.make || '');
  const [manualModel, setManualModel] = useState(editLog?.vehicleDetails?.model || '');
  const [manualRegNumber, setManualRegNumber] = useState(editLog?.vehicleDetails?.registrationNumber || '');
  const [manualMileage, setManualMileage] = useState(0);

  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(editLog?.vehicleId || '');
  const [existingAttachments, setExistingAttachments] = useState<
    { name: string; url: string }[]
  >(editLog?.attachments || []);

  const [newAttachments, setNewAttachments] = useState<File[]>([]);

  const [parts, setParts] = useState<Part[]>(
    editLog?.parts.map(p => ({
      ...p,
      includeVAT: editLog.vatDetails?.partsVAT.find(v => v.partName === p.name)
        ?.includeVAT ?? false,
      discount: p.discount ?? 0,
    })) || [{ name: '', quantity: 1, cost: 0, includeVAT: false, discount: 0 }]
  );

  const [showPartSuggestions, setShowPartSuggestions] = useState<boolean[]>([]);
  const [includeVATOnLabor, setIncludeVATOnLabor] = useState(editLog?.vatDetails?.laborVAT || false);
  const [existingPaidAmount, setExistingPaidAmount] = useState(editLog?.paidAmount || 0);
  const [additionalPayment, setAdditionalPayment] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState(editLog?.paymentMethod || 'cash');
  const [paymentReference, setPaymentReference] = useState(editLog?.paymentReference || '');
  const { formatCurrency } = useFormattedDisplay();

  const [maintenanceTypes, setMaintenanceTypes] = useState<string[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(false);

  const [showProductModal, setShowProductModal] = useState(false);
  const [pendingPartIndex, setPendingPartIndex] = useState<number | null>(null);

  const toDateTimeInput = (date?: Date | string | any) => {
    if (!date) return format(new Date(), "yyyy-MM-dd'T'HH:mm");
    let d = date;
    if (d && typeof d.toDate === 'function') {
      d = d.toDate();
    } else if (typeof d === 'string') {
      d = new Date(d);
    }
    if (!d || !(d instanceof Date) || isNaN(d.getTime())) return "";
    return format(d, "yyyy-MM-dd'T'HH:mm");
  };

  const [orderNumber, setOrderNumber] = useState(editLog?.orderNumber || '');
  const [invoiceNumber, setInvoiceNumber] = useState(editLog?.invoiceNumber || '');
  
  const [invoiceDate, setInvoiceDate] = useState(editLog?.invoiceDate ? toDateTimeInput(editLog.invoiceDate) : '');
  const [invoiceDueDate, setInvoiceDueDate] = useState(editLog?.invoiceDueDate ? toDateTimeInput(editLog.invoiceDueDate) : '');
  const [completedDate, setCompletedDate] = useState(editLog?.completedDate ? toDateTimeInput(editLog.completedDate) : '');

  useEffect(() => {
    setLoadingTypes(true);
    maintenanceCategoryService.getAll()
      .then(docs => {
        const seen = new Set<string>();
        const unique: string[] = [];
        docs.forEach(d => {
          const name = d.name?.trim();
          if (name) {
            const key = name.toLowerCase();
            if (!seen.has(key)) {
              seen.add(key);
              unique.push(name);
            }
          }
        });
        setMaintenanceTypes(unique);
      })
      .catch(err => {
        console.error('Failed to load maintenance categories:', err);
        toast.error('Could not load maintenance categories');
      })
      .finally(() => setLoadingTypes(false));
  }, []);

  const [formData, setFormData] = useState({
    type: editLog?.type || '',
    description: editLog?.description || '',
    serviceProvider: editLog?.serviceProvider || '',
    location: editLog?.location || '',
    date: toDateTimeInput(editLog?.date),
    currentMileage: editLog?.currentMileage || 0,
    laborHours: editLog?.laborHours || 0,
    laborRate: editLog?.laborRate || 75,
    nextServiceMileage: editLog?.nextServiceMileage || 0,
    nextServiceDate: toDateTimeInput(editLog?.nextServiceDate) || toDateTimeInput(addYears(new Date(), 1)),
    notes: editLog?.notes || '',
    status: editLog?.status || 'scheduled',
  });

  useEffect(() => {
    if (editLog) return;
    
    if (!formData.type) {
      setOrderNumber('');
      setInvoiceNumber('');
      return;
    }

    const generateNumbers = async () => {
      setIsGeneratingNumbers(true);
      try {
        const prefix = formData.type.charAt(0).toUpperCase();
        
        const q = query(
          collection(db, 'maintenanceLogs'), 
          where('type', '==', formData.type)
        );
        const snapshot = await getDocs(q);

        let maxOrder = 0;
        let maxInvoice = 0;

        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          
          if (data.orderNumber) {
            const orderMatch = data.orderNumber.match(/\d+/);
            if (orderMatch) {
              const num = parseInt(orderMatch[0], 10);
              if (num > maxOrder) maxOrder = num;
            }
          }
          
          if (data.invoiceNumber) {
            const invoiceMatch = data.invoiceNumber.match(/\d+/);
            if (invoiceMatch) {
              const num = parseInt(invoiceMatch[0], 10);
              if (num > maxInvoice) maxInvoice = num;
            }
          }
        });

        setOrderNumber(`${prefix}${maxOrder + 1}`);
        setInvoiceNumber(`${prefix}${maxInvoice + 1}`);

      } catch (error) {
        console.error("Error generating auto-numbers:", error);
      } finally {
        setIsGeneratingNumbers(false);
      }
    };

    generateNumbers();
  }, [formData.type, editLog]);

  const computeCosts = () => {
    const round = (n: number) => Math.round(n * 100) / 100;
    let totalDiscount = 0;

    const partsTotal = round(
      parts.reduce((sum, p) => {
        const lineGross = round(p.cost * p.quantity);
        const discAmt = round((p.discount / 100) * lineGross);
        totalDiscount = round(totalDiscount + discAmt);
        const net = round(lineGross - discAmt);
        const vat = p.includeVAT ? round(net * 0.2) : 0;
        return round(sum + net + vat);
      }, 0)
    );

    const laborBase = round(formData.laborHours * formData.laborRate);
    const laborTotal = includeVATOnLabor ? round(laborBase * 1.2) : laborBase;
    const subtotal = round(partsTotal + laborTotal);

    const vatAmount = round(
      parts.reduce((acc, p) => {
        const lineGross = round(p.cost * p.quantity);
        const discAmt = round((p.discount / 100) * lineGross);
        const net = round(lineGross - discAmt);
        return acc + (p.includeVAT ? round(net * 0.2) : 0);
      }, 0)
      + (includeVATOnLabor ? round(laborBase * 0.2) : 0)
    );

    const netAmount = round(subtotal - vatAmount);

    return {
      partsTotal,
      laborTotal,
      netAmount,
      vatAmount,
      totalAmount: subtotal,
      totalDiscount
    };
  };
  
  const { netAmount, vatAmount, totalAmount, totalDiscount, laborTotal } = computeCosts();

  const maxAdditionalPayment = parseFloat((totalAmount - existingPaidAmount).toFixed(2));
  const totalPaidAmount = existingPaidAmount + additionalPayment;
  const remainingAmount = totalAmount - totalPaidAmount;
  const paymentStatus = totalPaidAmount >= totalAmount ? 'paid' : totalPaidAmount > 0 ? 'partially_paid' : 'unpaid';

  useEffect(() => { if (editLog) setExistingPaidAmount(editLog.paidAmount || 0); }, [editLog]);

  useEffect(() => {
    if (!manualEntry && selectedVehicleId) {
      const v = vehicles.find(v => v.id === selectedVehicleId);
      if (v) {
        setFormData(prev => ({
          ...prev,
          currentMileage: v.mileage || 0,
          nextServiceMileage: v.nextServiceMileage || 0
        }));
      }
    }
  }, [manualEntry, selectedVehicleId, vehicles]);

  useEffect(() => {
    if (!editLog) {
      const d = new Date(formData.date);
      if(!isNaN(d.getTime())) {
         setFormData(prev => ({ ...prev, nextServiceDate: toDateTimeInput(addYears(d, 1)) }));
      }
    }
  }, [formData.date, editLog]);

  const [partSuggestionsList, setPartSuggestionsList] = useState<PartSuggestion[]>([]);
  useEffect(() => {
    productService.getAll()
      .then(ps =>
        setPartSuggestionsList(
          ps.map(p => ({
            id: p.id,
            partNumber: p.partNumber ?? '',
            name: p.name ?? '',
            lastCost: Number(p.retailPrice ?? p.price ?? 0),
          }))
        )
      )
      .catch(console.error);
  }, []);
  
  useEffect(() => setShowPartSuggestions(new Array(parts.length).fill(false)), [parts.length]);

  const handleProductCreated = (product: any) => {
    const newSuggestion = {
      id: product.id,
      partNumber: product.partNumber ?? '',
      name: product.name ?? '',
      lastCost: Number(product.retailPrice ?? 0),
    };
    
    setPartSuggestionsList(prev => [...prev, newSuggestion]);

    if (pendingPartIndex !== null && pendingPartIndex >= 0 && pendingPartIndex < parts.length) {
      const newParts = [...parts];
      newParts[pendingPartIndex] = {
        ...newParts[pendingPartIndex],
        name: newSuggestion.name,
        cost: newSuggestion.lastCost
      };
      setParts(newParts);
      const arr = [...showPartSuggestions]; 
      arr[pendingPartIndex] = false; 
      setShowPartSuggestions(arr);
    }
    setPendingPartIndex(null);
  };

  const handleServiceCenterSelect = (c: any) => setFormData(prev => ({
    ...prev,
    serviceProvider: c.name,
    location: `${c.address}, ${c.postcode}`,
    laborRate: c.hourlyRate
  }));
  
  const handleAdditionalPaymentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = parseFloat(e.target.value);
    if (!isNaN(v)) {
      v = Math.min(Math.max(0, v), maxAdditionalPayment);
      setAdditionalPayment(Math.round(v * 100) / 100);
    } else {
      setAdditionalPayment(0);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('Please log in');
      return;
    }

    if (!manualEntry && !selectedVehicleId) {
      toast.error('Please select a vehicle');
      setActiveTab('vehicle_service');
      return;
    }
    if (
      manualEntry &&
      (!manualMake.trim() || !manualModel.trim() || !manualRegNumber.trim())
    ) {
      toast.error('Please fill in all vehicle fields');
      setActiveTab('vehicle_service');
      return;
    }

    if (!formData.type) {
      toast.error('Please select a maintenance type');
      setActiveTab('vehicle_service');
      return;
    }

    if (formData.status === 'completed') {
      if (!orderNumber.trim()) {
        toast.error('Maintenance Order Number is required when setting status to Completed.');
        if (!isCompany) setActiveTab('billing_payment');
        else setActiveTab('vehicle_service');
        return;
      }
      if (!isCompany && !invoiceNumber.trim()) {
        toast.error('Maintenance Invoice Number is required when setting status to Completed.');
        setActiveTab('billing_payment');
        return;
      }
    }
  
    setLoading(true);
    try {
      const commonMaintenanceData = {
        type: formData.type,
        description: formData.description,
        serviceProvider: formData.serviceProvider,
        location: formData.location,
        date: new Date(formData.date), 
        currentMileage: formData.currentMileage,
        nextServiceMileage: formData.nextServiceMileage,
        nextServiceDate: new Date(formData.nextServiceDate),
        orderNumber,
        invoiceNumber,
        invoiceDate: invoiceDate ? new Date(invoiceDate) : null,
        invoiceDueDate: invoiceDueDate ? new Date(invoiceDueDate) : null,
        completedDate: completedDate ? new Date(completedDate) : null,
        parts: parts.map(p => ({
          name: p.name,
          quantity: p.quantity,
          cost: p.cost,
          discount: p.discount,
          includeVAT: p.includeVAT,
        })),
        laborHours: formData.laborHours,
        laborRate: formData.laborRate,
        laborCost: laborTotal,
        cost: totalAmount,
        netAmount,
        vatAmount,
        paidAmount: totalPaidAmount,
        remainingAmount,
        paymentStatus,
        paymentMethod,
        paymentReference,
        status: formData.status,
        notes: formData.notes,
        totalDiscount,
        vatDetails: {
          partsVAT: parts.map(p => ({ partName: p.name, includeVAT: p.includeVAT })),
          laborVAT: includeVATOnLabor,
        },
      };
  
      let maintenanceData;
      // ✅ Update internal type to hold assignedGroupId for Group assignment referencing
      let vehicleToUseForTransaction: { 
        id?: string; 
        make: string; 
        model: string; 
        registrationNumber: string; 
        owner?: VehicleOwner; 
        assignedGroupId?: string | null;
        assignedGroupName?: string | null;
        assignedDepartmentId?: string | null;
        assignedDepartmentName?: string | null;
      };
  
      if (manualEntry) {
        maintenanceData = {
          ...commonMaintenanceData,
          vehicleDetails: {
            make: manualMake.trim(),
            model: manualModel.trim(),
            registrationNumber: manualRegNumber.trim(),
          },
          vehicleId: deleteField() as any, 
        };
        vehicleToUseForTransaction = {
          make: manualMake.trim(),
          model: manualModel.trim(),
          registrationNumber: manualRegNumber.trim(),
          assignedGroupId: null,
          assignedGroupName: null,
          assignedDepartmentId: null,
          assignedDepartmentName: null
        };
      } else {
        const existingVehicle = vehicles.find(v => v.id === selectedVehicleId)!;

        maintenanceData = {
          ...commonMaintenanceData,
          vehicleId: selectedVehicleId,
          vehicleDetails: {
            make: existingVehicle.make,
            model: existingVehicle.model,
            registrationNumber: existingVehicle.registrationNumber,
          },
        };
        vehicleToUseForTransaction = existingVehicle;
      }
  
      const vehicleOwner = vehicleToUseForTransaction.owner ? { 
        name: vehicleToUseForTransaction.owner.name, 
        isDefault: vehicleToUseForTransaction.owner.isDefault ?? false,
        accountId: vehicleToUseForTransaction.owner.accountId,
        accountName: vehicleToUseForTransaction.owner.accountName
      } : undefined;
  
      if (editLog) {
        await updateDoc(doc(db, 'maintenanceLogs', editLog.id), {
          ...maintenanceData,
          updatedAt: new Date(),
          updatedBy: user.id,
        });
  
        if (additionalPayment > 0) {
          await createFinanceTransaction({
              type: 'expense',
              category: maintenanceData.type,
              amount: additionalPayment,
              description: maintenanceData.notes || maintenanceData.description,
              customerName: maintenanceData.serviceProvider,
              referenceId: editLog.id,
              vehicleId: vehicleToUseForTransaction.id,
              vehicleName: `${vehicleToUseForTransaction.make} ${vehicleToUseForTransaction.model} (${vehicleToUseForTransaction.registrationNumber})`,
              vehicleOwner,
              accountFrom: vehicleOwner?.accountId || undefined,
              paymentMethod: paymentMethod,
              paymentReference: paymentReference || undefined,
              paymentStatus: maintenanceData.paymentStatus,
              status: 'completed',
              date: new Date(),
              groupId: vehicleToUseForTransaction.assignedGroupId || undefined, // ✅ Attach Group ID
              // ✅ ADD THESE LINES:
              groupName: vehicleToUseForTransaction.assignedGroupName || undefined,
              departmentId: vehicleToUseForTransaction.assignedDepartmentId || undefined,
              departmentName: vehicleToUseForTransaction.assignedDepartmentName || undefined
          });
        }
  
        if (newAttachments.length) {
          const uploaded = await uploadMaintenanceAttachments(editLog.id, newAttachments);
          const merged = [...existingAttachments, ...uploaded];
          await updateDoc(doc(db, 'maintenanceLogs', editLog.id), {
            attachments: merged,
          });
          setExistingAttachments(merged);
          setNewAttachments([]);
        }
  
        toast.success('Maintenance updated successfully');
      } else { 
        const docRef = await addDoc(collection(db, 'maintenanceLogs'), {
          ...maintenanceData,
          vehicleId: manualEntry ? null : selectedVehicleId,
          vehicleDetails: manualEntry ? maintenanceData.vehicleDetails : null,
          createdAt: new Date(),
          createdBy: user.id,
        });
  
        if (totalPaidAmount > 0) {
          await createFinanceTransaction({
            type: 'expense',
            category: maintenanceData.type,
            amount: totalPaidAmount,
            description: `Maintenance: ${maintenanceData.type} | Order: ${orderNumber} | Inv: ${invoiceNumber}`,
            customerName: maintenanceData.serviceProvider,
            referenceId: docRef.id,
            vehicleId: vehicleToUseForTransaction.id,
            vehicleName: `${vehicleToUseForTransaction.make} ${vehicleToUseForTransaction.model} (${vehicleToUseForTransaction.registrationNumber})`,
            vehicleOwner,
            accountFrom: vehicleOwner?.accountId || undefined,
            paymentMethod: paymentMethod,
            paymentReference: invoiceNumber || paymentReference || undefined, 
            paymentStatus: maintenanceData.paymentStatus,
            status: 'completed',
            date: new Date(),
            groupId: vehicleToUseForTransaction.assignedGroupId || undefined, // ✅ Attach Group ID
            // ✅ ADD THESE LINES:
            groupName: vehicleToUseForTransaction.assignedGroupName || undefined,
            departmentId: vehicleToUseForTransaction.assignedDepartmentId || undefined,
            departmentName: vehicleToUseForTransaction.assignedDepartmentName || undefined
          });
        }
  
        if (newAttachments.length) {
          const uploaded = await uploadMaintenanceAttachments(docRef.id, newAttachments);
          await updateDoc(doc(db, 'maintenanceLogs', docRef.id), {
            attachments: uploaded,
          });
          setExistingAttachments(uploaded);
          setNewAttachments([]);
        }
  
         if (!manualEntry && formData.currentMileage !== (vehicles.find(v=>v.id === selectedVehicleId)!).mileage) {
          await createMileageHistoryRecord(
            vehicles.find(v=>v.id === selectedVehicleId)!,
            formData.currentMileage,
            user.name || 'System',
            'Updated during maintenance'
          );
        }
  
        toast.success('Maintenance scheduled successfully');
      }
  
      onClose();
    } catch (error) {
      console.error(error);
      toast.error(
        editLog ? 'Failed to update maintenance' : 'Failed to schedule maintenance'
      );
    } finally {
      setLoading(false);
    }
  };

  const formTabs: { id: FormTab; label: string; icon: React.ComponentType<{ className?: string }>; count?: number }[] = [
    { id: 'vehicle_service', label: 'Vehicle & Service', icon: Car },
    ...(!isCompany ? [{ id: 'parts_labor' as FormTab, label: 'Parts & Labor', icon: Layers, count: parts.filter(p => p.name.trim()).length + (formData.laborHours ? 1 : 0) }] : []),
    ...(!isCompany ? [{ id: 'billing_payment' as FormTab, label: 'Billing & Payment', icon: CreditCard }] : []),
    { id: 'attachments', label: 'Attachments', icon: Paperclip, count: existingAttachments.length + newAttachments.length },
  ];

  const currentTabIndex = formTabs.findIndex(t => t.id === activeTab);
  const prevTab = currentTabIndex > 0 ? formTabs[currentTabIndex - 1] : null;
  const nextTab = currentTabIndex < formTabs.length - 1 ? formTabs[currentTabIndex + 1] : null;

  return (
    <>
      <ProductFormModal 
        isOpen={showProductModal}
        onClose={() => setShowProductModal(false)}
        onProductCreated={handleProductCreated}
      />

      <div className="flex flex-col flex-1 h-full min-h-0 overflow-hidden text-slate-900">
        {/* Modal Navigation Tabs */}
        <div className="flex border-b border-[#E2E8F0] px-4 sm:px-6 shrink-0 bg-[#F8FAFC] overflow-x-auto no-scrollbar">
          {formTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-3 px-4 border-b-2 font-medium text-sm transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'border-blue-600 text-blue-600 font-bold bg-white rounded-t-lg shadow-xs'
                    : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-600'
                }`}
              >
                <Icon className="w-4 h-4 pointer-events-none shrink-0" />
                <span>{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span className={`ml-1.5 px-2 py-0.2 rounded-full text-xs font-bold ${
                    isActive ? 'bg-blue-600 text-white' : 'bg-[#2B314E] text-slate-700'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* Scrollable Tab Content Body */}
          <div className="flex-1 overflow-y-auto min-h-[500px] p-5 sm:p-6 space-y-6 custom-scrollbar text-slate-900">
            
            {/* TAB 1: VEHICLE & SERVICE */}
            {activeTab === 'vehicle_service' && (
              <div className="space-y-5 animate-in fade-in duration-200">
                {/* Vehicle Selection Card */}
                <div className="bg-slate-50 p-5 rounded-2xl border border-[#E2E8F0] space-y-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Car className="w-5 h-5 text-blue-600" />
                      <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Vehicle Details</h4>
                    </div>
                    <label className="flex items-center cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={manualEntry}
                        onChange={e => setManualEntry(e.target.checked)}
                        className="rounded border-gray-600 bg-white text-primary focus:ring-primary h-4 w-4"
                      />
                      <span className="ml-2 text-xs font-semibold text-slate-700">Enter vehicle manually</span>
                    </label>
                  </div>

                  {/* Manual Entry or Searchable Select */}
                  {manualEntry ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        type="text"
                        label="Make"
                        value={manualMake}
                        onChange={e => setManualMake(e.target.value)}
                        required
                        placeholder="e.g. Ford, Toyota"
                      />
                      <FormField
                        type="text"
                        label="Model"
                        value={manualModel}
                        onChange={e => setManualModel(e.target.value)}
                        required
                        placeholder="e.g. Transit, Corolla"
                      />
                      <FormField
                        type="text"
                        label="Registration Number"
                        value={manualRegNumber}
                        onChange={e => setManualRegNumber(e.target.value)}
                        required
                        placeholder="e.g. AB12 CDE"
                      />
                      {!editLog && (
                        <FormField
                          type="number"
                          label="Current Mileage"
                          value={manualMileage}
                          onChange={e => setManualMileage(parseInt(e.target.value) || 0)}
                          required
                          min={0}
                        />
                      )}
                    </div>
                  ) : (
                    <SearchableSelect
                      label="Vehicle"
                      options={vehicles.map(v => ({
                        id: v.id,
                        label: `${v.make} ${v.model}`,
                        subLabel: v.registrationNumber
                      }))}
                      value={selectedVehicleId}
                      onChange={setSelectedVehicleId}
                      placeholder="Search vehicles…"
                      required
                    />
                  )}
                </div>

                {/* Service Scheduling Card */}
                <div className="bg-slate-50 p-5 rounded-2xl border border-[#E2E8F0] space-y-4 shadow-sm">
                  <div className="flex items-center gap-2">
                    <Wrench className="w-5 h-5 text-amber-600" />
                    <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Service Scheduling & Parameters</h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Type (Searchable) */}
                    <div className="sm:col-span-2">
                      {loadingTypes ? (
                        <div className="text-sm text-slate-500 mt-2">Loading types…</div>
                      ) : (
                        <SearchableSelect
                          label="Maintenance Type"
                          options={maintenanceTypes.map(t => ({
                            id: t,
                            label: t.charAt(0).toUpperCase() + t.slice(1).replace(/-/g, ' ')
                          }))}
                          value={formData.type}
                          onChange={val => setFormData(prev => ({ ...prev, type: Array.isArray(val) ? val[0] : (val || '') }))}
                          placeholder="Search or select maintenance type…"
                          required
                        />
                      )}
                    </div>

                    <FormField
                      type="datetime-local"
                      label="Booking Start Date"
                      value={formData.date}
                      onChange={e => setFormData(prev => ({ ...prev, date: e.target.value }))}
                      required
                    />
                    
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">Completed Date</label>
                        <span className="text-xs text-blue-600 font-medium">Optional</span>
                      </div>
                      <input
                        type="datetime-local"
                        value={completedDate}
                        onChange={e => setCompletedDate(e.target.value)}
                        className="block w-full rounded-xl border border-[#E2E8F0] bg-white text-slate-900 px-3.5 py-2 shadow-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 sm:text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Service Center</label>
                      <ServiceCenterDropdown
                        value={formData.serviceProvider}
                        onChange={handleServiceCenterSelect}
                        onInputChange={value => setFormData(prev => ({ ...prev, serviceProvider: value }))}
                      />
                    </div>

                    <div>
                      <SearchableSelect
                        label="Status"
                        options={[
                          { id: 'scheduled', label: 'Scheduled' },
                          { id: 'in-progress', label: 'In Progress' },
                          ...(can('maintenance', 'complete') ? [{ id: 'completed', label: 'Completed' }] : []),
                          ...(can('maintenance', 'completed') && !isCompany ? [{ id: 'cancelled', label: 'Cancelled' }] : []),
                        ]}
                        value={formData.status}
                        onChange={val => setFormData(prev => ({ ...prev, status: (Array.isArray(val) ? val[0] : val) as any }))}
                        placeholder="Search or select status…"
                      />
                    </div>

                    <FormField
                      type="number"
                      label="Current Mileage"
                      value={formData.currentMileage}
                      onChange={e => setFormData(prev => ({ ...prev, currentMileage: parseInt(e.target.value) || 0 }))}
                      required
                      min={0}
                    />

                    <FormField
                      type="number"
                      label="Next Service Mileage"
                      value={formData.nextServiceMileage}
                      onChange={e => setFormData(prev => ({ ...prev, nextServiceMileage: parseInt(e.target.value) || 0 }))}
                      required
                      min={formData.currentMileage}
                    />

                    <div className="sm:col-span-2">
                      <FormField
                        type="datetime-local"
                        label="Next Service Date"
                        value={formData.nextServiceDate}
                        onChange={e => setFormData(prev => ({ ...prev, nextServiceDate: e.target.value }))}
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Description & Notes */}
                <div className="bg-slate-50 p-5 rounded-2xl border border-[#E2E8F0] space-y-4 shadow-sm">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Service Description <span className="text-rose-600">*</span>
                    </label>
                    <textarea
                      rows={3}
                      value={formData.description}
                      onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Enter description of maintenance work required or performed…"
                      className="block w-full rounded-xl border border-[#E2E8F0] bg-white text-slate-900 p-3 shadow-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm leading-relaxed"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Internal Notes
                    </label>
                    <textarea
                      rows={2}
                      value={formData.notes}
                      onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Optional notes, technician observations, or special instructions…"
                      className="block w-full rounded-xl border border-[#E2E8F0] bg-white text-slate-900 p-3 shadow-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm leading-relaxed"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: PARTS & LABOR */}
            {activeTab === 'parts_labor' && !isCompany && (
              <div className="space-y-5 animate-in fade-in duration-200">
                {/* Parts Section */}
                <div className="bg-slate-50 p-5 rounded-2xl border border-[#E2E8F0] space-y-4 shadow-sm">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Layers className="w-5 h-5 text-indigo-600" />
                      <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Parts & Materials ({parts.length})</h4>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setParts([
                          ...parts,
                          { name: '', quantity: 1, cost: 0, includeVAT: false, discount: 0 }
                        ])
                      }
                      className="px-3 py-1.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 text-xs font-bold flex items-center gap-1.5 transition-colors"
                    >
                      <PlusCircle className="w-4 h-4" /> Add Part
                    </button>
                  </div>

                  <div className="space-y-3">
                    {parts.map((part, index) => (
                      <div
                        key={index}
                        className="grid grid-cols-1 sm:grid-cols-6 gap-3 items-end p-4 border border-[#E2E8F0] rounded-xl bg-white text-slate-900 shadow-sm"
                      >
                        <div className="relative col-span-1 sm:col-span-2">
                          <FormField
                            label="Part Name / Search"
                            value={part.name}
                            onChange={e => {
                              const newParts = [...parts];
                              newParts[index] = { ...newParts[index], name: e.target.value };
                              setParts(newParts);
                            }}
                            onFocus={() => {
                              const arr = [...showPartSuggestions]; arr[index] = true; setShowPartSuggestions(arr);
                            }}
                            onBlur={() => {
                              setTimeout(() => {
                                const arr = [...showPartSuggestions]; arr[index] = false; setShowPartSuggestions(arr);
                              }, 200); 
                            }}
                            placeholder="Type to search products…"
                            inputClassName="w-full"
                          />

                          {showPartSuggestions[index] && (
                            <ul className="absolute z-20 w-full bg-white border border-[#E2E8F0] rounded-xl shadow-2xl mt-1 max-h-48 overflow-y-auto text-slate-900">
                              {partSuggestionsList
                                .filter(s => {
                                  const q = part.name?.toLowerCase() || '';
                                  return s.name.toLowerCase().includes(q) || s.partNumber.toLowerCase().includes(q);
                                })
                                .map((s) => (
                                <li
                                  key={s.id}
                                  className="px-4 py-2 cursor-pointer hover:bg-slate-100 flex items-center justify-between text-slate-900 transition-colors"
                                  onMouseDown={() => {
                                    const newParts = [...parts];
                                    newParts[index] = {
                                      ...newParts[index],
                                      name: s.name,
                                      cost: s.lastCost,
                                    };
                                    setParts(newParts);
                                    const arr = [...showPartSuggestions]; arr[index] = false; setShowPartSuggestions(arr);
                                  }}
                                  title={`${s.name} (${s.partNumber})`}
                                >
                                  <span className="truncate text-slate-900 font-medium text-xs">
                                    {s.name}
                                    {s.partNumber ? <span className="text-slate-500"> — {s.partNumber}</span> : null}
                                  </span>
                                  <span className="text-slate-700 font-mono text-xs ml-2">
                                    {formatCurrency(s.lastCost)}
                                  </span>
                                </li>
                              ))}

                              <li 
                                className="px-4 py-2.5 text-blue-600 font-semibold cursor-pointer hover:bg-slate-100 border-t border-[#E2E8F0] flex items-center gap-2 sticky bottom-0 bg-white text-xs"
                                onMouseDown={(e) => {
                                  e.preventDefault(); 
                                  setPendingPartIndex(index);
                                  setShowProductModal(true);
                                }}
                              >
                                <PlusCircle className="w-4 h-4" />
                                Create New Product
                              </li>
                            </ul>
                          )}
                        </div>

                        <FormField
                          type="number"
                          label="Quantity"
                          value={part.quantity}
                          onChange={e => {
                            const newParts = [...parts];
                            newParts[index] = { ...newParts[index], quantity: parseInt(e.target.value) || 0 };
                            setParts(newParts);
                          }}
                          min={1}
                          inputClassName="w-full"
                        />

                        <FormField
                          type="number"
                          label="Unit Price (£)"
                          value={part.cost}
                          onChange={e => {
                            const newParts = [...parts];
                            newParts[index] = { ...newParts[index], cost: parseFloat(e.target.value) || 0 };
                            setParts(newParts);
                          }}
                          min={0}
                          step={0.01}
                          inputClassName="w-full"
                        />

                        <FormField
                          type="number"
                          label="Discount (%)"
                          value={part.discount}
                          onChange={e => {
                            const newParts = [...parts];
                            newParts[index] = { ...newParts[index], discount: parseFloat(e.target.value) || 0 };
                            setParts(newParts);
                          }}
                          min={0}
                          max={100}
                          step={0.1}
                          inputClassName="w-full"
                        />

                        <div className="flex items-center justify-between sm:justify-end space-x-3 pt-2 sm:pt-0">
                          <label className="flex items-center space-x-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={part.includeVAT}
                              onChange={e => {
                                const newParts = [...parts];
                                newParts[index] = { ...newParts[index], includeVAT: e.target.checked };
                                setParts(newParts);
                              }}
                              className="rounded border-gray-600 bg-slate-50 text-primary focus:ring-primary h-4 w-4"
                            />
                            <span className="text-xs font-bold text-slate-700">+VAT</span>
                          </label>
                          <button
                            type="button"
                            onClick={() => setParts(parts.filter((_, i) => i !== index))}
                            className="px-2.5 py-1 text-xs font-bold text-rose-600 bg-rose-500/10 hover:bg-rose-500/20 rounded-lg border border-rose-500/30 transition-colors"
                            title="Remove Part"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Labor Section */}
                <div className="bg-slate-50 p-5 rounded-2xl border border-[#E2E8F0] space-y-4 shadow-sm">
                  <div className="flex items-center gap-2">
                    <Wrench className="w-5 h-5 text-blue-600" />
                    <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Labor Charge</h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end bg-white p-4 rounded-xl border border-[#E2E8F0]">
                    <div>
                      <FormField
                        type="number"
                        label="Labor Hours"
                        value={formData.laborHours}
                        onChange={e => setFormData(prev => ({ ...prev, laborHours: parseFloat(e.target.value) || 0 }))}
                        min={0}
                        step="any"
                        placeholder="0"
                      />
                    </div>

                    <div>
                      <FormField
                        type="number"
                        label="Rate per Hour (£)"
                        value={formData.laborRate}
                        onChange={e => setFormData(prev => ({ ...prev, laborRate: parseFloat(e.target.value) || 0 }))}
                        min={0}
                        step={0.01}
                        placeholder="0.00"
                      />
                    </div>

                    <div className="pb-2">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={includeVATOnLabor}
                          onChange={e => setIncludeVATOnLabor(e.target.checked)}
                          className="rounded border-gray-600 bg-slate-50 text-primary focus:ring-primary h-4 w-4"
                        />
                        <span className="text-xs font-bold text-slate-700">+20% VAT on Labor</span>
                      </label>
                    </div>

                    <div className="text-right pb-1">
                      <span className="text-xs text-slate-500 block uppercase tracking-wider">Labor Total</span>
                      <span className="text-lg font-mono font-bold text-emerald-600">
                        {formatCurrency(includeVATOnLabor
                          ? formData.laborHours * formData.laborRate * 1.2
                          : formData.laborHours * formData.laborRate
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: BILLING & PAYMENT */}
            {activeTab === 'billing_payment' && !isCompany && (
              <div className="space-y-5 animate-in fade-in duration-200">
                {/* Order & Invoice Details Card */}
                <div className="bg-slate-50 p-5 rounded-2xl border border-[#E2E8F0] space-y-4 shadow-sm">
                  <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Order & Invoice Identifiers</h4>
                  
                  {!editLog && !formData.type && (
                    <p className="text-xs font-medium text-amber-800 bg-amber-50 p-3 rounded-xl border border-amber-200 text-amber-800">
                      💡 Tip: Select the maintenance type on the Vehicle & Service tab to automatically generate the sequence numbers.
                    </p>
                  )}

                  {isGeneratingNumbers && (
                    <p className="text-xs font-semibold text-blue-600 animate-pulse">
                      Generating next sequence numbers…
                    </p>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField 
                      label="Maintenance Order Number" 
                      value={orderNumber} 
                      onChange={e => setOrderNumber(e.target.value)} 
                      placeholder="e.g. ORD-1234"
                      required={formData.status === 'completed'}
                    />

                    <FormField 
                      label="Maintenance Invoice Number" 
                      value={invoiceNumber} 
                      onChange={e => setInvoiceNumber(e.target.value)} 
                      placeholder="e.g. INV-1234"
                      required={formData.status === 'completed'}
                    />

                    <FormField 
                      type="datetime-local"
                      label="Invoice Date" 
                      value={invoiceDate} 
                      onChange={e => setInvoiceDate(e.target.value)} 
                    />

                    <FormField 
                      type="datetime-local"
                      label="Invoice Due Date" 
                      value={invoiceDueDate} 
                      onChange={e => setInvoiceDueDate(e.target.value)} 
                    />
                  </div>
                </div>

                {/* Payment Breakdown Card */}
                <div className="bg-slate-50 p-5 rounded-2xl border border-[#E2E8F0] space-y-4 shadow-sm">
                  <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Payment Details</h4>
                  
                  {editLog && (
                    <div className="bg-white p-4 rounded-xl border border-[#E2E8F0]">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-700 font-semibold">Previously Paid Amount:</span>
                        <span className="font-bold font-mono text-emerald-600">{formatCurrency(existingPaidAmount)}</span>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      type="number"
                      step={0.01}
                      label={editLog ? "Additional Payment" : "Amount to Pay Now"}
                      value={additionalPayment}
                      onChange={handleAdditionalPaymentChange}
                      min={0}
                      max={maxAdditionalPayment}
                      placeholder={`Up to ${formatCurrency(maxAdditionalPayment)}`}
                    />

                    <div>
                      <SearchableSelect
                        label="Payment Method"
                        options={[
                          { id: 'cash', label: 'Cash' },
                          { id: 'card', label: 'Card' },
                          { id: 'bank_transfer', label: 'Bank Transfer' },
                          { id: 'cheque', label: 'Cheque' },
                        ]}
                        value={paymentMethod}
                        onChange={val => setPaymentMethod(Array.isArray(val) ? val[0] : (val || 'cash'))}
                        placeholder="Select payment method…"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <FormField
                        label="Payment Reference"
                        value={paymentReference}
                        onChange={e => setPaymentReference(e.target.value)}
                        placeholder="Enter payment reference or transaction ID"
                      />
                    </div>
                  </div>

                  {/* Complete Live Summary */}
                  <div className="bg-white p-4.5 rounded-xl border border-[#E2E8F0] space-y-2.5 text-slate-900 shadow-md">
                    <div className="flex justify-between text-sm text-[#000000]">
                      <span className="text-[#000000] font-semibold">NET Total:</span>
                      <span className="font-mono text-[#000000] font-semibold">{formatCurrency(netAmount)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-[#2563EB]">
                      <span className="text-[#2563EB] font-semibold">VAT:</span>
                      <span className="font-mono text-[#2563EB] font-semibold">{formatCurrency(vatAmount)}</span>
                    </div>
                    {totalDiscount > 0 && (
                      <div className="flex justify-between text-sm text-[#D97706] font-semibold">
                        <span>Discount:</span>
                        <span className="font-mono text-[#D97706] font-semibold">–{formatCurrency(totalDiscount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-base font-bold pt-2 border-t border-[#E2E8F0] text-[#D97706]">
                      <span>Total:</span>
                      <span className="font-mono text-xl font-bold text-[#D97706]">{formatCurrency(totalAmount)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-[#15803D] font-bold">
                      <span>Paid:</span>
                      <span className="font-mono font-bold text-[#15803D]">{formatCurrency(totalPaidAmount)}</span>
                    </div>
                    <div className={`flex justify-between text-sm font-bold ${remainingAmount > 0.001 ? 'text-[#DC2626]' : 'text-[#15803D]'}`}>
                      <span>Owing:</span>
                      <span className="font-mono font-bold">{formatCurrency(remainingAmount)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: ATTACHMENTS */}
            {activeTab === 'attachments' && (
              <div className="space-y-5 animate-in fade-in duration-200">
                <div className="bg-slate-50 p-5 rounded-2xl border border-[#E2E8F0] space-y-4 shadow-sm">
                  <div className="flex items-center gap-2">
                    <Paperclip className="w-5 h-5 text-blue-600" />
                    <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Attachments & Documents</h4>
                  </div>

                  <FileUpload
                    label="Add Attachments"
                    accept="image/*,.pdf,.doc,.docx"
                    multiple
                    value={newAttachments}
                    onChange={setNewAttachments}
                    showPreview
                  />

                  {existingAttachments.length > 0 && (
                    <div className="pt-3 border-t border-[#E2E8F0]">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">Existing Attachments</h4>
                      <ul className="space-y-2">
                        {existingAttachments.map((att, idx) => (
                          <li key={idx} className="flex items-center justify-between bg-white border border-[#E2E8F0] p-3 rounded-xl">
                            <a
                              href={att.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-300 font-semibold text-sm truncate max-w-[80%]"
                            >
                              {att.name}
                            </a>
                            <button
                              type="button"
                              onClick={() =>
                                setExistingAttachments(existingAttachments.filter((_, i) => i !== idx))
                              }
                              className="px-2.5 py-1 text-xs font-bold text-rose-600 bg-rose-500/10 hover:bg-rose-500/20 rounded-lg border border-rose-500/30 transition-colors"
                            >
                              Remove
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>

          {/* Pinned Bottom Actions */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 p-4 shrink-0 bg-[#F8FAFC] border-t border-[#E2E8F0]">
            <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 border border-[#E2E8F0] rounded-xl hover:bg-[#2B314E] hover:text-slate-900 transition-colors"
              >
                Cancel
              </button>
              {prevTab && (
                <button
                  type="button"
                  onClick={() => setActiveTab(prevTab.id)}
                  className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 border border-[#E2E8F0] rounded-xl hover:bg-[#2B314E] hover:text-slate-900 flex items-center gap-1.5 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" /> {prevTab.label}
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              {!isCompany && (
                <div className="hidden sm:block mr-2 text-right">
                  <span className="text-[10px] text-slate-500 block uppercase font-bold">Total Cost</span>
                  <span className="text-sm font-mono font-black text-slate-900">{formatCurrency(totalAmount)}</span>
                </div>
              )}
              {nextTab && (
                <button
                  type="button"
                  onClick={() => setActiveTab(nextTab.id)}
                  className="px-4 py-2 text-sm font-semibold text-blue-600 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 flex items-center gap-1.5 transition-colors"
                >
                  {nextTab.label} <ArrowRight className="w-4 h-4" />
                </button>
              )}
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 text-sm font-semibold text-slate-900 bg-blue-600 border border-transparent rounded-xl hover:bg-blue-700 shadow-xs transition-colors cursor-pointer text-white"
              >
                {loading ? 'Saving…' : editLog ? 'Update Maintenance' : 'Schedule Maintenance'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </>
  );
};

export default MaintenanceForm;