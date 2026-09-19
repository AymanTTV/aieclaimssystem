// src/utils/exportFleetExperiencePDF.ts
import { createElement } from 'react';
import { pdf } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';
import toast from 'react-hot-toast';
import { Accident } from '../types/accident';
import { Customer } from '../types/customer';
import { PolicyPeriod } from '../types/driverRisk';
import { POLICY_PERIODS, getCurrentPolicyPeriod, getPolicyPeriodForDate } from './policyPeriods';
import { analyzeDriverRisk } from './driverRiskAnalysis';
import FleetClaimExperiencePDFDocument from '../components/pdf/documents/FleetClaimExperiencePDFDocument';

interface ExportFleetPDFOptions {
  accidents: Accident[];
  policyPeriod?: PolicyPeriod;
  companyDetails?: any;
  customers?: Customer[];
  highlightedAccidentId?: string;
  sourceClaim?: Accident;
}

export const exportFleetClaimExperiencePDF = async ({
  accidents,
  policyPeriod,
  companyDetails,
  customers = [],
  highlightedAccidentId,
  sourceClaim,
}: ExportFleetPDFOptions): Promise<Blob | null> => {
  const toastId = toast.loading('Generating Insurance-Ready Fleet Claim Experience PDF Report...');

  try {
    // Determine the policy period:
    // 1. If explicit policyPeriod provided, use it
    // 2. If triggered from a specific claim, find that claim's annual policy period
    // 3. Otherwise, use current policy period (18 Dec 2025 - 17 Dec 2026)
    let selectedPeriod = policyPeriod;

    if (!selectedPeriod && sourceClaim?.accidentDate) {
      selectedPeriod = getPolicyPeriodForDate(sourceClaim.accidentDate);
    }

    if (!selectedPeriod) {
      selectedPeriod = getCurrentPolicyPeriod() || POLICY_PERIODS[0];
    }

    // Run Driver Risk & Fleet Insurance Bordereau analysis
    const summary = analyzeDriverRisk(accidents, selectedPeriod, customers);

    // Create React-PDF instance and render to Blob
    const docElement = createElement(FleetClaimExperiencePDFDocument, {
      summary,
      companyDetails,
      highlightedAccidentId: highlightedAccidentId || sourceClaim?.id,
    });

    const pdfBlob = await pdf(docElement).toBlob();

    const fileName = `Fleet_Claim_Experience_Report_${selectedPeriod.startDate}_to_${selectedPeriod.endDate}.pdf`;
    saveAs(pdfBlob, fileName);

    toast.success(
      `Fleet Claim Experience PDF Report exported for policy period (${selectedPeriod.startDate} to ${selectedPeriod.endDate})`,
      { id: toastId }
    );

    return pdfBlob;
  } catch (error) {
    console.error('Error generating Fleet Claim Experience PDF:', error);
    toast.error('Failed to generate Fleet Claim Experience PDF Report', { id: toastId });
    return null;
  }
};
