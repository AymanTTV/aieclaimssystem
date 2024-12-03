export interface User {
  id: string;
  email: string;
  role: 'admin' | 'manager' | 'driver';
  name: string;
  createdAt: Date;
  photoURL?: string;
  phoneNumber?: string;
  address?: string;
  profileCompleted?: boolean;
}

export interface Vehicle {
  id: string;
  vin: string;
  make: string;
  model: string;
  year: number;
  registrationNumber: string;
  status: 'active' | 'maintenance' | 'unavailable';
  mileage: number;
  insuranceExpiry: Date;
  lastMaintenance: Date;
  nextMaintenance: Date;
  assignedDriver?: string;
}

export interface MaintenanceLog {
  id: string;
  vehicleId: string;
  date: Date;
  type: 'routine' | 'repair' | 'emergency';
  description: string;
  cost: number;
  serviceProvider: string;
  status: 'scheduled' | 'in-progress' | 'completed';
}

export interface Rental {
  id: string;
  vehicleId: string;
  renterId: string;
  startDate: Date;
  endDate: Date;
  status: 'scheduled' | 'active' | 'completed' | 'cancelled';
  cost: number;
  paymentStatus: 'pending' | 'paid' | 'overdue';
}

export interface Accident {
  id: string;
  vehicleId: string;
  driverId: string;
  date: Date;
  location: string;
  description: string;
  images: string[];
  status: 'reported' | 'investigating' | 'processing' | 'resolved';
  claimAmount?: number;
  claimStatus?: 'pending' | 'approved' | 'rejected';
}

export interface Transaction {
  id: string;
  type: 'income' | 'expense';
  date: Date;
  amount: number;
  category: string;
  description: string;
}