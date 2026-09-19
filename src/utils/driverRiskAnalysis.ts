import { Accident } from '../types/accident';
import { Customer } from '../types/customer';
import { DriverRiskProfile, FleetRiskSummary, PolicyPeriod, RiskRating } from '../types/driverRisk';
import { isAccidentInPolicyPeriod } from './policyPeriods';
import { calculateReportingTiming } from './accidentCalculations';

export const getClaimIncurredCost = (accident: Accident): number => {
  if (accident.incurred !== undefined && accident.incurred !== null && Number(accident.incurred) > 0) {
    return Number(accident.incurred);
  }
  const paidSum = (Number(accident.adPaid) || 0) + (Number(accident.tpPaid) || 0);
  if (paidSum > 0) {
    return paidSum;
  }
  return Number(accident.amount) || 0;
};

export const isClaimLateReported = (accident: Accident): boolean => {
  if (accident.lateReporting === 'Yes' || accident.lateReporting === true) {
    return true;
  }
  if (accident.lateReporting === 'No' || accident.lateReporting === false) {
    return false;
  }
  if (accident.timeToReportHours !== undefined && accident.timeToReportHours !== null) {
    return Number(accident.timeToReportHours) > 24;
  }
  const timing = calculateReportingTiming({
    accidentDate: accident.accidentDate,
    accidentTime: accident.accidentTime,
    reportedDate: accident.reportedDate,
    reportedTime: accident.reportedTime,
    submittedAt: accident.submittedAt,
  });
  return timing.isLate;
};

export const normalizeFaultType = (accident: Accident): 'Fault' | 'Non-Fault' | 'Split' | 'Pending' => {
  const raw = (accident.fault || accident.faultType || accident.type || '').toString().trim().toLowerCase();
  if (raw.includes('non')) return 'Non-Fault';
  if (raw.includes('split')) return 'Split';
  if (raw.includes('fault')) return 'Fault';
  return 'Pending';
};

/**
 * Evaluates and assigns a Risk Rating & explanation
 */
export const calculateDriverRiskRating = (
  totalAccidents: number,
  faultCount: number,
  faultIncurred: number,
  totalIncurred: number
): { rating: RiskRating; reasons: string[] } => {
  const reasons: string[] = [];

  // High Risk Criteria
  if (totalAccidents >= 3) {
    reasons.push(`${totalAccidents} Claims in Policy Year (≥ 3 threshold)`);
  }
  if (faultIncurred >= 5000) {
    reasons.push(`High Fault Loss: £${faultIncurred.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`);
  } else if (totalIncurred >= 10000) {
    reasons.push(`High Incurred Loss: £${totalIncurred.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`);
  }
  if (totalAccidents >= 2 && faultCount >= 2) {
    reasons.push('Multiple At-Fault Claims (2+ Fault)');
  }

  if (reasons.length > 0) {
    return { rating: 'high', reasons };
  }

  // Medium Risk Criteria
  if (totalAccidents === 2) {
    reasons.push('2 Claims in Policy Year');
    return { rating: 'medium', reasons };
  }
  if (totalAccidents === 1 && faultCount === 1 && faultIncurred >= 2000) {
    reasons.push(`At-Fault Claim with Significant Loss (£${faultIncurred.toLocaleString('en-GB', { minimumFractionDigits: 0 })})`);
    return { rating: 'medium', reasons };
  }

  // Low Risk Criteria
  if (totalAccidents === 1) {
    reasons.push(faultCount === 1 ? 'Single At-Fault Claim (Low Loss)' : 'Single Non-Fault / Low-Impact Claim');
  } else {
    reasons.push('Clean Record (0 Claims)');
  }

  return { rating: 'low', reasons };
};

/**
 * Aggregates all fleet accidents for a given policy period into ranked Driver Risk Profiles
 */
export const analyzeDriverRisk = (
  accidents: Accident[],
  policyPeriod: PolicyPeriod,
  customers: Customer[] = []
): FleetRiskSummary => {
  // 1. Filter accidents by policy period
  const periodAccidents = accidents.filter((acc) =>
    isAccidentInPolicyPeriod(acc.accidentDate, policyPeriod)
  );

  // Quick lookup map for customers by name or NIN
  const customerMap = new Map<string, Customer>();
  customers.forEach((c) => {
    if (c.name) customerMap.set(c.name.trim().toLowerCase(), c);
    if (c.nin) customerMap.set(c.nin.trim().toLowerCase(), c);
  });

  // 2. Group accidents by driver
  const driverMap = new Map<string, Accident[]>();

  periodAccidents.forEach((acc) => {
    const rawName = acc.driverName || acc.referenceName || 'Unknown Driver';
    const key = rawName.trim().toLowerCase();
    const existing = driverMap.get(key) || [];
    existing.push(acc);
    driverMap.set(key, existing);
  });

  // 3. Transform groups into DriverRiskProfile records
  const driverProfiles: DriverRiskProfile[] = [];

  driverMap.forEach((driverAccidents, key) => {
    const primary = driverAccidents[0];
    const driverName = primary.driverName || primary.referenceName || 'Unknown Driver';

    // Try matching customer record
    const matchedCustomer = customerMap.get(key) || (primary.driverNIN ? customerMap.get(primary.driverNIN.trim().toLowerCase()) : undefined);

    let faultCount = 0;
    let nonFaultCount = 0;
    let splitCount = 0;
    let pendingCount = 0;
    let totalIncurred = 0;
    let faultIncurred = 0;
    let lateReportingCount = 0;
    let totalLatePenalties = 0;

    const claimSummaries = driverAccidents.map((acc) => {
      const incurred = getClaimIncurredCost(acc);
      const isLate = isClaimLateReported(acc);
      const faultType = normalizeFaultType(acc);
      const penalty = Number(acc.lateReportingPenalty) || Number(acc.penaltyPayment) || 0;

      totalIncurred += incurred;

      if (faultType === 'Fault') {
        faultCount += 1;
        faultIncurred += incurred;
      } else if (faultType === 'Non-Fault') {
        nonFaultCount += 1;
      } else if (faultType === 'Split') {
        splitCount += 1;
      } else {
        pendingCount += 1;
      }

      if (isLate) {
        lateReportingCount += 1;
        totalLatePenalties += penalty;
      }

      return {
        id: acc.id,
        accidentDate: acc.accidentDate,
        accidentTime: acc.accidentTime,
        refNo: acc.refNo,
        referenceName: acc.referenceName,
        vehicleVRN: acc.vehicleVRN || acc.regNo,
        vehicleModel: acc.vehicleModel,
        fault: faultType,
        incurred,
        status: acc.status || 'pending',
        isLateReport: isLate,
        timeToReportDisplay: acc.timeToReportDisplay,
        penaltyPayment: penalty,
      };
    });

    const { rating, reasons } = calculateDriverRiskRating(
      driverAccidents.length,
      faultCount,
      faultIncurred,
      totalIncurred
    );

    driverProfiles.push({
      rank: 0, // Assigned after sorting
      driverName,
      driverNIN: primary.driverNIN || matchedCustomer?.nin,
      driverMobile: primary.driverMobile || primary.driverPhone || matchedCustomer?.phone,
      driverPhone: primary.driverPhone,
      driverAddress: primary.driverAddress || (matchedCustomer?.address ? `${matchedCustomer.address.line1 || ''}, ${matchedCustomer.address.city || ''}` : undefined),
      customerId: matchedCustomer?.id,
      totalAccidents: driverAccidents.length,
      faultCount,
      nonFaultCount,
      splitCount,
      pendingCount,
      totalIncurred,
      faultIncurred,
      lateReportingCount,
      totalLatePenalties,
      riskRating: rating,
      riskReasons: reasons,
      accidents: claimSummaries,
      rawAccidents: driverAccidents,
    });
  });

  // 4. Sort drivers in descending order:
  // Primary: totalAccidents DESC (highest number of accidents at top)
  // Secondary: totalIncurred DESC
  // Tertiary: faultCount DESC
  driverProfiles.sort((a, b) => {
    if (b.totalAccidents !== a.totalAccidents) {
      return b.totalAccidents - a.totalAccidents;
    }
    if (b.totalIncurred !== a.totalIncurred) {
      return b.totalIncurred - a.totalIncurred;
    }
    return b.faultCount - a.faultCount;
  });

  // Assign ranks
  driverProfiles.forEach((d, idx) => {
    d.rank = idx + 1;
  });

  // 5. Calculate fleet-level aggregate totals
  const totalFleetAccidents = periodAccidents.length;
  const totalFleetIncurred = driverProfiles.reduce((sum, d) => sum + d.totalIncurred, 0);
  const totalFaultAccidents = driverProfiles.reduce((sum, d) => sum + d.faultCount, 0);
  const totalNonFaultAccidents = driverProfiles.reduce((sum, d) => sum + d.nonFaultCount, 0);
  const totalSplitAccidents = driverProfiles.reduce((sum, d) => sum + d.splitCount, 0);
  const totalLateReports = driverProfiles.reduce((sum, d) => sum + d.lateReportingCount, 0);
  const totalLatePenalties = driverProfiles.reduce((sum, d) => sum + d.totalLatePenalties, 0);

  const totalAdPaid = periodAccidents.reduce((sum, a) => sum + (Number(a.adPaid) || 0), 0);
  const totalAdEst = periodAccidents.reduce((sum, a) => sum + (Number(a.adEst) || 0), 0);
  const totalTpPaid = periodAccidents.reduce((sum, a) => sum + (Number(a.tpPaid) || 0), 0);
  const totalTpEst = periodAccidents.reduce((sum, a) => {
    if (a.totalTpEst !== undefined && a.totalTpEst !== null && Number(a.totalTpEst) > 0) {
      return sum + Number(a.totalTpEst);
    }
    const comps = (Number(a.tpPiEst) || 0) + (Number(a.tpDamageEst) || 0) + (Number(a.tpHireEst) || 0);
    return sum + comps;
  }, 0);
  const totalActRecovery = periodAccidents.reduce((sum, a) => sum + (Number(a.actRecovery) || 0), 0);

  const highRiskDriversCount = driverProfiles.filter((d) => d.riskRating === 'high').length;
  const mediumRiskDriversCount = driverProfiles.filter((d) => d.riskRating === 'medium').length;
  const lowRiskDriversCount = driverProfiles.filter((d) => d.riskRating === 'low').length;

  const faultPercentage = totalFleetAccidents > 0 ? (totalFaultAccidents / totalFleetAccidents) * 100 : 0;
  const lateReportPercentage = totalFleetAccidents > 0 ? (totalLateReports / totalFleetAccidents) * 100 : 0;

  const topRiskDrivers = driverProfiles.slice(0, 5);

  return {
    policyPeriod,
    totalFleetAccidents,
    totalFleetIncurred,
    totalFaultAccidents,
    totalNonFaultAccidents,
    totalSplitAccidents,
    faultPercentage,
    totalLateReports,
    lateReportPercentage,
    totalLatePenalties,
    highRiskDriversCount,
    mediumRiskDriversCount,
    lowRiskDriversCount,
    totalDriversWithAccidents: driverProfiles.length,
    topRiskDrivers,
    driverProfiles,
    totalAdPaid,
    totalAdEst,
    totalTpPaid,
    totalTpEst,
    totalActRecovery,
    periodAccidents,
  };
};

/**
 * Formats a number as GBP currency string: £X,XXX.XX
 */
export const formatGBP = (val: number): string => {
  return `£${(Number(val) || 0).toLocaleString('en-GB', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

/**
 * Generates CSV content for the Insurance Renewal Risk Report
 */
export const generateRenewalRiskCSV = (
  summary: FleetRiskSummary,
  companyName: string = 'Fleet Services Ltd'
): string => {
  const p = summary.policyPeriod;
  const dateGenerated = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const lines: string[] = [];

  // Metadata / Underwriter Header
  lines.push(`"INSURANCE POLICY RENEWAL RISK & FREQUENCY REPORT"`);
  lines.push(`"Company:","${companyName}"`);
  lines.push(`"Policy Period:","${p.name} (${p.startDate} to ${p.endDate})"`);
  lines.push(`"Report Generated:","${dateGenerated}"`);
  lines.push(`"Renewal Deadline:","18 December 2026"`);
  lines.push('');

  // Fleet Summary Section
  lines.push(`"FLEET RISK OVERVIEW"`);
  lines.push(`"Total Fleet Accidents in Period",${summary.totalFleetAccidents}`);
  lines.push(`"Total Financial Incurred (£)",${summary.totalFleetIncurred.toFixed(2)}`);
  lines.push(`"Fault Claims Count",${summary.totalFaultAccidents} (${summary.faultPercentage.toFixed(1)}%)`);
  lines.push(`"Non-Fault Claims Count",${summary.totalNonFaultAccidents}`);
  lines.push(`"Split Claims Count",${summary.totalSplitAccidents}`);
  lines.push(`"Late Reporting Count (>24h)",${summary.totalLateReports} (${summary.lateReportPercentage.toFixed(1)}%)`);
  lines.push(`"Total Late Reporting Penalties (£)",${summary.totalLatePenalties.toFixed(2)}`);
  lines.push(`"High Risk Drivers",${summary.highRiskDriversCount}`);
  lines.push(`"Medium Risk Drivers",${summary.mediumRiskDriversCount}`);
  lines.push(`"Low Risk Drivers",${summary.lowRiskDriversCount}`);
  lines.push(`"Total Drivers with Incident History",${summary.totalDriversWithAccidents}`);
  lines.push('');

  // Driver Table Header
  lines.push(`"DRIVER RISK RANKING SCHEDULE (SORTED BY ACCIDENT FREQUENCY)"`);
  lines.push(
    [
      '"Rank"',
      '"Driver Name"',
      '"Driver NIN"',
      '"Driver Mobile"',
      '"Risk Rating"',
      '"Total Accidents"',
      '"Fault Claims"',
      '"Non-Fault Claims"',
      '"Split Claims"',
      '"Total Incurred (£)"',
      '"Fault Incurred (£)"',
      '"Late Reports (>24h)"',
      '"Late Penalties (£)"',
      '"Primary Risk Factors"',
    ].join(',')
  );

  // Driver Table Rows
  summary.driverProfiles.forEach((d) => {
    lines.push(
      [
        d.rank,
        `"${d.driverName.replace(/"/g, '""')}"`,
        `"${(d.driverNIN || 'N/A').replace(/"/g, '""')}"`,
        `"${(d.driverMobile || 'N/A').replace(/"/g, '""')}"`,
        `"${d.riskRating.toUpperCase()}"`,
        d.totalAccidents,
        d.faultCount,
        d.nonFaultCount,
        d.splitCount,
        d.totalIncurred.toFixed(2),
        d.faultIncurred.toFixed(2),
        d.lateReportingCount,
        d.totalLatePenalties.toFixed(2),
        `"${d.riskReasons.join('; ').replace(/"/g, '""')}"`,
      ].join(',')
    );
  });

  return lines.join('\n');
};
