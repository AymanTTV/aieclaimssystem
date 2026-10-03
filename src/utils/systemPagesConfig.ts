// src/utils/systemPagesConfig.ts
// ============================================================================
// PART 2: SYSTEM PAGES STRUCTURE & SCOPE CONSTANTS
// ============================================================================

export interface SubDocumentConfig {
  id: string;
  label: string;
  description?: string;
}

export interface SystemPageConfig {
  id: string;
  label: string;
  description: string;
  subDocuments: SubDocumentConfig[];
}

export const SYSTEM_PAGES: SystemPageConfig[] = [
  {
    id: 'ALL_MODULES',
    label: 'All Modules (Global Default)',
    description: 'Global fallback rule applied to all generated documents unless overridden.',
    subDocuments: [],
  },
  {
    id: 'RENTAL_PAGE',
    label: 'Rental Page (Rental Docs & Agreements)',
    description: 'Rental contracts, agreements, and vehicle check forms.',
    subDocuments: [
      { id: 'RENTAL_AGREEMENT', label: 'Rental Agreement / Credit Hire Agreement', description: 'Applies to all vehicle hire agreements (Weekly, Daily, and Credit Hire)' },
      { id: 'VEHICLE_HANDOVER', label: 'Vehicle Handover Protocol' },
      { id: 'CHECKIN_CHECKOUT', label: 'Check-in / Check-out Form' },
      { id: 'EXTENSION_AGREEMENT', label: 'Rental Extension Form' },
    ],
  },
  {
    id: 'CLAIMS_PAGE',
    label: 'Claims Page (Claims Docs, Mitigation & Credit Storage)',
    description: 'Direct claims management documentation and legal notices.',
    subDocuments: [
      { id: 'CREDIT_HIRE_MITIGATION', label: 'Credit Hire Mitigation (Mitigation Statement)' },
      { id: 'CREDIT_STORAGE_RECOVERY', label: 'Credit Storage & Recovery' },
      { id: 'RIGHT_TO_CANCEL', label: 'Right to Cancel' },
      { id: 'CONDITION_OF_HIRE', label: 'Condition of Hire' },
      { id: 'SATISFACTION_NOTICE', label: 'Satisfaction Notice & Claim Sign-Off' },
      { id: 'VD_CLAIM_RECORD', label: 'VD Claim Records (Vehicle Damage Records)' },
    ],
  },
  {
    id: 'VEHICLE_PAGE',
    label: 'Vehicle Page (Fleet & Vehicle Docs)',
    description: 'Fleet assignments, vehicle status, and inspection records.',
    subDocuments: [
      { id: 'VEHICLE_CONDITION_REPORT', label: 'Vehicle Condition Report' },
      { id: 'FLEET_ASSIGNMENT_FORM', label: 'Fleet Assignment Form' },
      { id: 'DEFECT_REPORT', label: 'Defect Report' },
    ],
  },
  {
    id: 'MAINTENANCE_PAGE',
    label: 'Maintenance Page (Maintenance Dockets & Workshop Docs)',
    description: 'Workshop job sheets and vehicle repair authorizations.',
    subDocuments: [
      { id: 'WORKSHOP_DOCKET', label: 'Workshop Docket' },
      { id: 'SERVICE_REPAIR_AUTHORIZATION', label: 'Service & Repair Authorization' },
      { id: 'MOT_INSPECTION_SHEET', label: 'MOT Inspection Sheet' },
    ],
  },
  {
    id: 'INVOICE_PAGE',
    label: 'Invoice Page (Invoice Docs & Billing)',
    description: 'Standard client billing invoices and credit statements.',
    subDocuments: [
      { id: 'CUSTOMER_INVOICE', label: 'Customer Billing Invoice' },
      { id: 'CREDIT_NOTE', label: 'Credit Note' },
      { id: 'STATEMENT_OF_ACCOUNT', label: 'Statement of Account' },
    ],
  },
  {
    id: 'VD_INVOICE_PAGE',
    label: 'VD Invoice Page (Vehicle Owner Invoice Docs)',
    description: 'Owner invoice statements and financial payout reports.',
    subDocuments: [
      { id: 'VD_STATEMENT', label: 'Vehicle Owner Statement' },
      { id: 'VD_COMMISSION_INVOICE', label: 'VD Commission Invoice' },
      { id: 'VD_PAYOUT_REMITTANCE', label: 'VD Payout Remittance' },
    ],
  },
  {
    id: 'FINANCE_PAGE',
    label: 'Finance Page (Finance Agreements & Statements)',
    description: 'Financial schedules and customer direct debit mandates.',
    subDocuments: [
      { id: 'FINANCE_AGREEMENT', label: 'Finance Agreement' },
      { id: 'PAYMENT_SCHEDULE', label: 'Payment Schedule' },
      { id: 'DIRECT_DEBIT_MANDATE', label: 'Direct Debit Mandate' },
    ],
  },
  {
    id: 'VD_FINANCE_PAGE',
    label: 'VD Finance Page (Vehicle Owner Finance Docs)',
    description: 'Owner yield, revenue sharing, and settlement documents.',
    subDocuments: [
      { id: 'VD_REVENUE_SHARE_AGREEMENT', label: 'VD Revenue Share Agreement' },
      { id: 'VD_FINANCIAL_SUMMARY', label: 'VD Financial Summary' },
    ],
  },
  {
    id: 'MEMBERS_PAGE',
    label: 'Members Page (Member Agreements & Profile Docs)',
    description: 'Membership terms, driver declarations, and user agreements.',
    subDocuments: [
      { id: 'MEMBER_AGREEMENT', label: 'Member Agreement' },
      { id: 'MEMBERSHIP_TERMS', label: 'Membership Terms & Conditions' },
      { id: 'DRIVER_DECLARATION', label: 'Driver Declaration Form' },
    ],
  },
];

// Helper to normalize scope ID across uppercase and lowercase formats
export const normalizeScopeId = (id?: string): string => {
  if (!id) return 'ALL_MODULES';
  const upper = id.toUpperCase();
  if (upper === 'ALL' || upper === 'ALL_MODULES') return 'ALL_MODULES';
  if (upper === 'RENTAL' || upper === 'RENTAL_PAGE') return 'RENTAL_PAGE';
  if (upper === 'CLAIMS' || upper === 'CLAIMS_PAGE') return 'CLAIMS_PAGE';
  if (upper === 'VEHICLE' || upper === 'VEHICLE_PAGE') return 'VEHICLE_PAGE';
  if (upper === 'MAINTENANCE' || upper === 'MAINTENANCE_PAGE') return 'MAINTENANCE_PAGE';
  if (upper === 'INVOICE' || upper === 'INVOICE_PAGE') return 'INVOICE_PAGE';
  if (upper === 'VD_INVOICE' || upper === 'VD_INVOICE_PAGE') return 'VD_INVOICE_PAGE';
  if (upper === 'FINANCE' || upper === 'FINANCE_PAGE') return 'FINANCE_PAGE';
  if (upper === 'VD_FINANCE' || upper === 'VD_FINANCE_PAGE') return 'VD_FINANCE_PAGE';
  if (upper === 'MEMBERS' || upper === 'MEMBERS_PAGE') return 'MEMBERS_PAGE';
  return upper;
};

// Helper to normalize sub-doc ID across formats
export const normalizeSubDocId = (id?: string): string => {
  if (!id || id === 'ALL' || id === 'all_page_docs' || id === 'all') return 'ALL';
  const upper = id.toUpperCase();
  if (upper === 'CREDIT_HIRE_AGREEMENT' || upper === 'HIRE_AGREEMENT') return 'RENTAL_AGREEMENT';
  return upper;
};

// --- Dynamic Mapping Engine Resolution Function ---
export const resolveTcTemplate = (templates: any[], pageId: string, documentTypeId?: string) => {
  if (!Array.isArray(templates) || templates.length === 0) return null;

  const targetPage = normalizeScopeId(pageId);
  const targetSubDoc = normalizeSubDocId(documentTypeId);

  // Priority 1: Exact match for Page Scope AND Sub-Document Type
  if (targetSubDoc !== 'ALL') {
    const exactMatch = templates.find((t) => {
      const scope = normalizeScopeId(t.scopeId || t.documentScope);
      const sub = normalizeSubDocId(t.subDocId || t.specificDocType);
      return scope === targetPage && sub === targetSubDoc;
    });
    if (exactMatch) return exactMatch;
  }

  // Priority 2: Page-level match ("All Documents on Page")
  const pageMatch = templates.find((t) => {
    const scope = normalizeScopeId(t.scopeId || t.documentScope);
    const sub = normalizeSubDocId(t.subDocId || t.specificDocType);
    return scope === targetPage && (sub === 'ALL' || !sub);
  });
  if (pageMatch) return pageMatch;

  // Priority 3: Fallback to Global Default ("All Modules")
  const globalMatch = templates.find((t) => {
    const scope = normalizeScopeId(t.scopeId || t.documentScope);
    return scope === 'ALL_MODULES';
  });
  return globalMatch || null;
};
