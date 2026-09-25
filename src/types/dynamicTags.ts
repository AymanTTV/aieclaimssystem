// src/types/dynamicTags.ts

export type TagCategory = 
  | 'global'
  | 'recipient'
  | 'vehicle'
  | 'rental'
  | 'maintenance'
  | 'claim'
  | 'finance'
  | 'invoice'
  | 'driverPay'
  | 'custom';

export interface DynamicTag {
  id: string;
  tag: string; // e.g. "{customer_name}", "{first_name}"
  label: string;
  category: TagCategory | string;
  description?: string;
  sampleValue: string;
  isCustom?: boolean;
  isSystem?: boolean;
  createdAt?: any;
  updatedAt?: any;
}
