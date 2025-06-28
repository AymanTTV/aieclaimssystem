import { collection, query, getDocs, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore'; 
import { db } from '../lib/firebase';
import toast from 'react-hot-toast';

export interface ServiceCenter {
  id?: string;
  name: string;
  address: string;
  postcode: string;
  phone: string;
  email: string;
  hourlyRate: number;
  specialties: string[];
}

// Removed: let cachedServiceCenters: ServiceCenter[] = [];

// Removed: export const fetchServiceCenters ... (logic will be handled by useServiceCenters hook)

export const addServiceCenter = async (center: Omit<ServiceCenter, 'id'>): Promise<ServiceCenter> => {
  try {
    const docRef = await addDoc(collection(db, 'serviceCenters'), {
      ...center,
      createdAt: new Date()
    });
    
    const newCenter = {
      id: docRef.id,
      ...center
    };
    
    // Removed: cachedServiceCenters = [...cachedServiceCenters, newCenter];
    toast.success('Service center added successfully');
    return newCenter;
  } catch (error) {
    console.error('Error adding service center:', error);
    toast.error('Failed to add service center');
    throw error;
  }
};

export const updateServiceCenter = async (id: string, updates: Partial<ServiceCenter>): Promise<void> => {
  try {
    const centerRef = doc(db, 'serviceCenters', id);
    await updateDoc(centerRef, {
      ...updates,
      updatedAt: new Date()
    });

    // Removed: cachedServiceCenters = cachedServiceCenters.map(center => 
    //   center.id === id ? { ...center, ...updates } : center
    // );
    
    toast.success('Service center updated successfully');
  } catch (error) {
    console.error('Error updating service center:', error);
    toast.error('Failed to update service center');
    throw error;
  }
};

export const deleteServiceCenter = async (centerId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, 'serviceCenters', centerId));
    
    // Removed: cachedServiceCenters = cachedServiceCenters.filter(center => center.id !== centerId);
    toast.success('Service center deleted successfully');
  } catch (error) {
    console.error('Error deleting service center:', error);
    toast.error('Failed to delete service center');
    throw error;
  }
};

// Removed: export const searchServiceCenters ... (logic will be handled in ServiceCenterDropdown)

export const SERVICE_CENTERS: ServiceCenter[] = [
  {
    name: "LEVC London Central",
    address: "8 Brewery Road, London",
    postcode: "N7 9NH",
    phone: "020 7700 0888",
    email: "service.central@levc.com",
    hourlyRate: 85,
    specialties: ["LEVC", "TX4", "Electric Taxi"]
  },
  {
    name: "LEVC Park Royal",
    address: "Unit 4, Premier Park Road, London",
    postcode: "NW10 7NZ",
    phone: "020 8838 3988",
    email: "service.parkroyal@levc.com",
    hourlyRate: 82,
    specialties: ["LEVC", "TX4", "Electric Taxi"]
  },
  {
    name: "KPM Taxi Engineering",
    address: "Unit 5, Thames Road Industrial Estate, London",
    postcode: "SE28 0RJ",
    phone: "020 8311 8250",
    email: "service@kpmtaxi.co.uk",
    hourlyRate: 75,
    specialties: ["TX4", "London Taxi"]
  },
  {
    name: "London Taxi Group",
    address: "Unit 7, Waterworks Road, London",
    postcode: "E16 2AT",
    phone: "020 7474 5050",
    email: "service@londontaxigroup.co.uk",
    hourlyRate: 78,
    specialties: ["TX4", "London Taxi", "Mercedes Vito"]
  },
  {
    name: "Mercedes-Benz Taxi Centre",
    address: "Western Avenue, London",
    postcode: "W3 0RZ",
    phone: "020 8749 3311",
    email: "taxi.service@mercedes-benz.co.uk",
    hourlyRate: 95,
    specialties: ["Mercedes Vito", "London Taxi"]
  },
  {
    name: "Vito Taxi Services",
    address: "Unit 2, Advent Way, London",
    postcode: "N18 3AF",
    phone: "020 8803 4411",
    email: "service@vitotaxi.co.uk",
    hourlyRate: 88,
    specialties: ["Mercedes Vito"]
  },
  {
    name: "London Taxi Maintenance",
    address: "Unit 10, River Road, Barking",
    postcode: "IG11 0DS",
    phone: "020 8594 1111",
    email: "service@londontaximaintenance.co.uk",
    hourlyRate: 72,
    specialties: ["TX4", "LEVC", "Mercedes Vito", "London Taxi"]
  }
];