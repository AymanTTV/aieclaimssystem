// src/types/highRiskDriver.ts
// Strict privacy compliance: Storing ONLY Full Name, Risk Level, Category, Reported Year, and Reporting Fleet.
// Zero Sensitive PII: No driver's license numbers, dates of birth, phone numbers, or home addresses.

export type RiskLevel = 'High Risk' | 'Caution' | 'Cleared';

export type IncidentCategory = 'Damage' | 'Non-Payment' | 'Breach of Terms' | 'Fraud / Terms Breach';

export type UserRole = 'staff' | 'manager';

export interface HighRiskDriver {
  id: string;
  fullName: string;
  badgeNumber?: string;
  riskLevel: RiskLevel;
  category: IncidentCategory;
  reportedYear: number;
  reportingFleet: string; // e.g. "Apex Rentals", "Metro Hire", "City Fleet"
  createdAt: string;
  categoryDetails?: string;
  isOverridden?: boolean;
  overriddenBy?: string;
  overrideReason?: string;
  overrideTimestamp?: string;
}

export interface NewDriverInput {
  fullName: string;
  badgeNumber?: string;
  riskLevel: RiskLevel;
  category: IncidentCategory;
  reportingFleet?: string;
  categoryDetails?: string;
}

export interface EditDriverInput {
  fullName: string;
  badgeNumber?: string;
  riskLevel: RiskLevel;
  category: IncidentCategory;
  reportingFleet: string;
  categoryDetails?: string;
}

export interface OverridePayload {
  managerName: string;
  managerPin: string;
  reason: string;
}
