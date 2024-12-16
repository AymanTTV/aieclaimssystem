export interface Accident {
  id: string;
  vehicleId: string;
  driverId: string;
  date: Date;
  location: string;
  description: string;
  damageDetails: string;
  images?: string[];
  status: 'reported' | 'investigating' | 'processing' | 'resolved';
  claimStatus?: 'pending' | 'approved' | 'rejected';
  claimAmount?: number;
  createdAt: Date;
}