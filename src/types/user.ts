// src/types/user.ts
import type { Role, RolePermissions } from './roles';

export interface User {
  id: string;
  email: string;
  role: Role;
  name: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  createdAt: Date;
  photoURL?: string;
  phoneNumber?: string;
  address?: string;
  buildingFlat?: string;
  streetName?: string;
  townCity?: string;
  postcode?: string;
  country?: string;
  profileCompleted?: boolean;
  permissions?: RolePermissions;
  companyName?: string; // ✅ Added for the new Company role
}