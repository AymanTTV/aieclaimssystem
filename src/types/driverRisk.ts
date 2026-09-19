import { Accident } from './accident';

export type RiskRating = 'high' | 'medium' | 'low';

export interface PolicyPeriod {
  id: string;
  name: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  isCurrent?: boolean;
  isUpcoming?: boolean;
  isPrevious?: boolean;
  label: string;
}

export interface DriverClaimSummary {
  id: string;
  accidentDate: string;
  accidentTime?: string;
  refNo?: number;
  referenceName?: string;
  vehicleVRN?: string;
  vehicleModel?: string;
  fault?: string;
  incurred: number;
  status: string;
  isLateReport: boolean;
  timeToReportDisplay?: string;
  penaltyPayment?: number;
}

export interface DriverRiskProfile {
  rank: number;
  driverName: string;
  driverNIN?: string;
  driverMobile?: string;
  driverPhone?: string;
  driverAddress?: string;
  customerId?: string;
  totalAccidents: number;
  faultCount: number;
  nonFaultCount: number;
  splitCount: number;
  pendingCount: number;
  totalIncurred: number;
  faultIncurred: number;
  lateReportingCount: number;
  totalLatePenalties: number;
  riskRating: RiskRating;
  riskReasons: string[];
  accidents: DriverClaimSummary[];
  rawAccidents: Accident[];
}

export interface FleetRiskSummary {
  policyPeriod: PolicyPeriod;
  totalFleetAccidents: number;
  totalFleetIncurred: number;
  totalFaultAccidents: number;
  totalNonFaultAccidents: number;
  totalSplitAccidents: number;
  faultPercentage: number;
  totalLateReports: number;
  lateReportPercentage: number;
  totalLatePenalties: number;
  highRiskDriversCount: number;
  mediumRiskDriversCount: number;
  lowRiskDriversCount: number;
  totalDriversWithAccidents: number;
  topRiskDrivers: DriverRiskProfile[];
  driverProfiles: DriverRiskProfile[];
  totalAdPaid: number;
  totalAdEst: number;
  totalTpPaid: number;
  totalTpEst: number;
  totalActRecovery: number;
  periodAccidents: Accident[];
}
