import { useState, useEffect } from 'react';
import { addDoc, collection, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Vehicle, MaintenanceLog, Part } from '../../../types';
import { addYears } from 'date-fns';
import toast from 'react-hot-toast';
import { createFinanceTransaction } from '../../../utils/financeTransactions';
import { createMileageHistoryRecord } from '../../../utils/mileageUtils';

const VAT_RATE = 0.20;

export const useMaintenanceForm = ({ vehicles, onClose, editLog }: {
  vehicles: Vehicle[];
  onClose: () => void;
  editLog?: MaintenanceLog;
}) => {
  const [loading, setLoading] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(editLog?.vehicleId || '');
  const [parts, setParts] = useState<(Part & { includeVAT: boolean })[]>(
    editLog?.parts.map(part => ({ ...part, includeVAT: false })) || []
  );
  const [includeVATOnLabor, setIncludeVATOnLabor] = useState(false);
  
  const [formData, setFormData] = useState({
    type: editLog?.type || 'yearly-service',
    description: editLog?.description || '',
    serviceProvider: editLog?.serviceProvider || '',
    location: editLog?.location || '',
    date: editLog?.date ? editLog.date.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    currentMileage: editLog?.currentMileage || 0,
    laborHours: editLog?.laborCost ? editLog.laborCost / 75 : 0,
    laborRate: 75,
  });

  useEffect(() => {
    if (selectedVehicleId) {
      const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId);
      if (selectedVehicle) {
        setFormData(prev => ({
          ...prev,
          currentMileage: selectedVehicle.mileage
        }));
      }
    }
  }, [selectedVehicleId, vehicles]);

  const handleServiceCenterSelect = (center: {
    name: string;
    address: string;
    postcode: string;
    hourlyRate: number;
  }) => {
    setFormData(prev => ({
      ...prev,
      serviceProvider: center.name,
      location: `${center.address}, ${center.postcode}`,
      laborRate: center.hourlyRate,
    }));
  };

  const calculatePartsCost = (): number => {
    return parts.reduce((sum, part) => {
      const partCost = part.cost * part.quantity;
      return sum + (part.includeVAT ? partCost * (1 + VAT_RATE) : partCost);
    }, 0);
  };

  const calculateLaborCost = (): number => {
    const baseCost = formData.laborHours * formData.laborRate;
    return includeVATOnLabor ? baseCost * (1 + VAT_RATE) : baseCost;
  };

  const calculateTotalCost = (): number => {
    return calculatePartsCost() + calculateLaborCost();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicleId) {
      toast.error('Please select a vehicle');
      return;
    }

    setLoading(true);

    try {
      const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId);
      if (!selectedVehicle) {
        throw new Error('Vehicle not found');
      }

      const maintenanceData = {
        vehicleId: selectedVehicleId,
        type: formData.type,
        description: formData.description,
        serviceProvider: formData.serviceProvider,
        location: formData.location,
        date: new Date(formData.date),
        currentMileage: formData.currentMileage,
        nextServiceMileage: formData.currentMileage + 25000,
        nextServiceDate: addYears(new Date(formData.date), 1),
        parts: parts.map(({ includeVAT, ...part }) => part),
        laborCost: calculateLaborCost(),
        cost: calculateTotalCost(),
        status: 'scheduled' as const,
        vatDetails: {
          partsVAT: parts.map(part => ({
            partName: part.name,
            includeVAT: part.includeVAT
          })),
          laborVAT: includeVATOnLabor
        }
      };

      if (editLog) {
        await updateDoc(doc(db, 'maintenanceLogs', editLog.id), maintenanceData);
      } else {
        const docRef = await addDoc(collection(db, 'maintenanceLogs'), maintenanceData);

        await createFinanceTransaction({
          type: 'expense',
          category: 'maintenance',
          amount: calculateTotalCost(),
          description: `Maintenance cost for ${formData.description}`,
          referenceId: docRef.id,
          vehicleId: selectedVehicleId,
        });

        if (formData.currentMileage !== selectedVehicle.mileage) {
          await createMileageHistoryRecord(
            selectedVehicle,
            formData.currentMileage,
            'System',
            'Updated during maintenance'
          );
        }
      }

      toast.success(editLog ? 'Maintenance log updated successfully' : 'Maintenance scheduled successfully');
      onClose();
    } catch (error) {
      console.error('Error:', error);
      toast.error(editLog ? 'Failed to update maintenance log' : 'Failed to schedule maintenance');
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    selectedVehicleId,
    setSelectedVehicleId,
    formData,
    setFormData,
    parts,
    setParts,
    includeVATOnLabor,
    setIncludeVATOnLabor,
    handleServiceCenterSelect,
    handleSubmit,
    calculatePartsCost,
    calculateLaborCost,
    calculateTotalCost,
  };
};