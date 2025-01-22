import { collection, query, getDocs, addDoc, deleteDoc, doc } from 'firebase/firestore'; 
import { db } from '../lib/firebase';

interface ServiceCenter {
  name: string;
  address: string;
  postcode: string;
  phone: string;
  hourlyRate: number;
  specialties: string[];
}

let cachedServiceCenters: ServiceCenter[] = [];

// Function to fetch service centers from Firestore
export const fetchServiceCenters = async (): Promise<ServiceCenter[]> => {
  const q = query(collection(db, 'serviceCenters'));
  const snapshot = await getDocs(q);
  const centers = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as ServiceCenter));
  
  // Update cache
  cachedServiceCenters = centers;
  return centers;
};



// Function to add a new service center
export const addServiceCenter = async (center: Omit<ServiceCenter, 'id'>): Promise<ServiceCenter> => {
  const docRef = await addDoc(collection(db, 'serviceCenters'), {
    ...center,
    createdAt: new Date()
  });
  
  const newCenter = {
    id: docRef.id,
    ...center
  };
  
  // Update cache
  cachedServiceCenters = [...cachedServiceCenters, newCenter];
  
  return newCenter;
};

export const SERVICE_CENTERS: ServiceCenter[] = [
  // LEVC Service Centers
  {
    name: "LEVC London Central",
    address: "8 Brewery Road, London",
    postcode: "N7 9NH",
    phone: "020 7700 0888",
    hourlyRate: 85,
    specialties: ["LEVC", "TX4", "Electric Taxi"]
  },
  {
    name: "LEVC Park Royal",
    address: "Unit 4, Premier Park Road, London",
    postcode: "NW10 7NZ",
    phone: "020 8838 3988",
    hourlyRate: 82,
    specialties: ["LEVC", "TX4", "Electric Taxi"]
  },
  // TX4 Specialists
  {
    name: "KPM Taxi Engineering",
    address: "Unit 5, Thames Road Industrial Estate, London",
    postcode: "SE28 0RJ",
    phone: "020 8311 8250",
    hourlyRate: 75,
    specialties: ["TX4", "London Taxi"]
  },
  {
    name: "London Taxi Group",
    address: "Unit 7, Waterworks Road, London",
    postcode: "E16 2AT",
    phone: "020 7474 5050",
    hourlyRate: 78,
    specialties: ["TX4", "London Taxi", "Mercedes Vito"]
  },
  // Mercedes Vito Specialists
  {
    name: "Mercedes-Benz Taxi Centre",
    address: "Western Avenue, London",
    postcode: "W3 0RZ",
    phone: "020 8749 3311",
    hourlyRate: 95,
    specialties: ["Mercedes Vito", "London Taxi"]
  },
  {
    name: "Vito Taxi Services",
    address: "Unit 2, Advent Way, London",
    postcode: "N18 3AF",
    phone: "020 8803 4411",
    hourlyRate: 88,
    specialties: ["Mercedes Vito"]
  },
  // General Taxi Services
  {
    name: "London Taxi Maintenance",
    address: "Unit 10, River Road, Barking",
    postcode: "IG11 0DS",
    phone: "020 8594 1111",
    hourlyRate: 72,
    specialties: ["TX4", "LEVC", "Mercedes Vito", "London Taxi"]
  }
];

// Search function now uses cached data
export const searchServiceCenters = (query: string): ServiceCenter[] => {
  const searchTerm = query.toLowerCase();
  return cachedServiceCenters.filter(center => 
    center.name.toLowerCase().includes(searchTerm) ||
    center.address.toLowerCase().includes(searchTerm) ||
    center.postcode.toLowerCase().includes(searchTerm) ||
    center.specialties.some(specialty => specialty.toLowerCase().includes(searchTerm))
  );
};

// Add this function
export const deleteServiceCenter = async (centerId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, 'serviceCenters', centerId));
    
    // Update cache
    cachedServiceCenters = cachedServiceCenters.filter(center => center.id !== centerId);
  } catch (error) {
    console.error('Error deleting service center:', error);
    throw error;
  }
};