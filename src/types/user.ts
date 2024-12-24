export interface User {
  id: string;
  email: string;
  role: 'admin' | 'manager' | 'finance';
  name: string;
  createdAt: Date;
  photoURL?: string;
  phoneNumber?: string;
  address?: string;
  profileCompleted?: boolean;
  permissions?: RolePermissions;
}

// Import this from roles.ts to avoid circular dependency
import { RolePermissions } from './roles';