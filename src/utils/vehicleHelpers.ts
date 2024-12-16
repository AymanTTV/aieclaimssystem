import { Vehicle } from '../types';
import { exportVehicles, processVehiclesImport } from './VehiclesExport';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../lib/firebase';
import toast from 'react-hot-toast';

export const handleVehicleExport = (vehicles: Vehicle[]) => {
  try {
    exportVehicles(vehicles);
    toast.success('Vehicles exported successfully');
  } catch (error) {
    console.error('Error exporting vehicles:', error);
    toast.error('Failed to export vehicles');
  }
};

export const handleVehicleImport = async (file: File) => {
  try {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result;
      const rows = text?.toString().split('\n').map(row => row.split(','));
      if (rows) {
        const importedData = processVehiclesImport(rows);
        
        for (const vehicle of importedData) {
          await addDoc(collection(db, 'vehicles'), vehicle);
        }
        
        toast.success(`${importedData.length} vehicles imported successfully`);
      }
    };
    reader.readAsText(file);
  } catch (error) {
    console.error('Error importing vehicles:', error);
    toast.error('Failed to import vehicles');
  }
};