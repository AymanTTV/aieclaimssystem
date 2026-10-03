// src/utils/documentTemplateTerms.ts

import { sanitizeAndInterpolateTerms, extractActiveCorporateEntityProfile } from './legalDocumentUtils';
export { sanitizeAndInterpolateTerms, extractActiveCorporateEntityProfile } from './legalDocumentUtils';

export type DocumentTypeKey =
  | 'invoice'
  | 'rental_agreement'
  | 'rental_invoice'
  | 'condition_of_hire'
  | 'hire_agreement'
  | 'notice_of_right_to_cancel'
  | 'credit_storage_recovery'
  | 'credit_hire_mitigation'
  | 'satisfaction_notice'
  | 'finance_statement'
  | 'maintenance_invoice'
  | 'general';

export type DocumentScope =
  | 'all'
  | 'rental'
  | 'claims'
  | 'vehicle'
  | 'maintenance'
  | 'invoice'
  | 'vd_invoice'
  | 'finance'
  | 'vd_finance'
  | 'members';

export interface SubDocTypeOption {
  id: string;
  label: string;
  description?: string;
}

export const SCOPE_PAGE_OPTIONS: { id: DocumentScope; label: string; tabName: string; icon: string; description: string }[] = [
  { id: 'all', label: 'All Modules (Global Default)', tabName: 'All Modules', icon: '🌐', description: 'Applies as global default across all system documents' },
  { id: 'rental', label: 'Rental Page (Rental Docs & Agreements)', tabName: 'Rental', icon: '🚗', description: 'Weekly, Daily & Credit Hire Agreements, Invoices & Handover documents' },
  { id: 'claims', label: 'Claims Page (Direct Claims Docs & Mitigation)', tabName: 'Claims', icon: '⚖️', description: 'Credit Hire Mitigation, Storage & Recovery, Right to Cancel, Condition of Hire, Satisfaction Notice & VD Claim Records' },
  { id: 'vehicle', label: 'Vehicle Page (Fleet & Vehicle Docs)', tabName: 'Vehicle', icon: '📋', description: 'Vehicle Handover & Fleet asset agreements' },
  { id: 'maintenance', label: 'Maintenance Page (Maintenance Dockets & Workshop Docs)', tabName: 'Maintenance', icon: '🔧', description: 'Fleet Maintenance Dockets & Workshop Job Cards' },
  { id: 'invoice', label: 'Invoice Page (Invoice Docs & Billing)', tabName: 'Invoice', icon: '🧾', description: 'Sales, Rental & Commercial Invoices' },
  { id: 'vd_invoice', label: 'VD Invoice Page (Vehicle Owner Invoice Docs)', tabName: 'VD Invoice', icon: '💼', description: 'Vehicle Owner Damage & Settlement Invoices' },
  { id: 'finance', label: 'Finance Page (Finance Agreements & Statements)', tabName: 'Finance', icon: '📊', description: 'Certified Account Statements & Financial Ledgers' },
  { id: 'vd_finance', label: 'VD Finance Page (Vehicle Owner Finance Docs)', tabName: 'VD Finance', icon: '📈', description: 'Vehicle Owner Finance Memos & Repair Ledgers' },
  { id: 'members', label: 'Members Page (Member Agreements & Profile Docs)', tabName: 'Members', icon: '👥', description: 'Member Partnership Agreements & Identification' },
];

export const SCOPE_SUB_DOCUMENTS: Record<DocumentScope, SubDocTypeOption[]> = {
  all: [
    { id: 'all_page_docs', label: 'All Documents on Page (Global Default)', description: 'Applies to every document generated system-wide' },
  ],
  rental: [
    { id: 'all_page_docs', label: 'All Documents on Page (Default)', description: 'Applies to all documents on Rental Page' },
    { id: 'rental_agreement', label: 'Rental Agreement / Credit Hire Agreement', description: 'Applies to all vehicle hire agreements (Weekly, Daily, and Credit Hire)' },
    { id: 'rental_invoice', label: 'Rental Invoice (VAT Breakdown & Rates)' },
    { id: 'parking_permit', label: 'Parking Permit Authorization Letter' },
    { id: 'handover_protocol', label: 'Vehicle Handover & Return Protocol' },
    { id: 'checkin_checkout', label: 'Check-in / Check-out Form' },
    { id: 'extension_agreement', label: 'Rental Extension Form' },
  ],
  claims: [
    { id: 'all_page_docs', label: 'All Documents on Page (Default)', description: 'Applies to all documents on Claims Page' },
    { id: 'credit_hire_mitigation', label: 'Credit Hire Mitigation (Mitigation Statement)' },
    { id: 'credit_storage_recovery', label: 'Credit Storage & Recovery (Storage and Recovery)' },
    { id: 'notice_of_right_to_cancel', label: 'Right to Cancel (Notice of Right to Cancel)' },
    { id: 'condition_of_hire', label: 'Condition of Hire (Statutory Terms)' },
    { id: 'satisfaction_notice', label: 'Satisfaction Notice & Claim Sign-Off' },
    { id: 'vd_claim_record', label: 'VD Claim Records (Vehicle Damage Records)' },
  ],
  vehicle: [
    { id: 'all_page_docs', label: 'All Documents on Page (Default)', description: 'Applies to all documents on Vehicle Page' },
    { id: 'vehicle_handover', label: 'Vehicle Handover & Check-In Sheet' },
    { id: 'vehicle_condition_report', label: 'Vehicle Condition Report' },
    { id: 'fleet_assignment_form', label: 'Fleet Assignment Form' },
    { id: 'defect_report', label: 'Defect Report' },
    { id: 'vehicle_asset_agreement', label: 'Vehicle Ownership & Lease Allocation' },
    { id: 'fleet_inspection_report', label: 'Fleet Asset Inspection Certificate' },
  ],
  maintenance: [
    { id: 'all_page_docs', label: 'All Documents on Page (Default)', description: 'Applies to all documents on Maintenance Page' },
    { id: 'maintenance_docket', label: 'Maintenance Docket & Workshop Job Card' },
    { id: 'service_repair_authorization', label: 'Service & Repair Authorization' },
    { id: 'workshop_invoice', label: 'Workshop Invoice & Parts Breakdown' },
    { id: 'mot_service_sheet', label: 'MOT & Fleet Safety Service Schedule' },
  ],
  invoice: [
    { id: 'all_page_docs', label: 'All Documents on Page (Default)', description: 'Applies to all documents on Invoice Page' },
    { id: 'commercial_invoice', label: 'Customer Billing Invoice' },
    { id: 'vat_invoice', label: 'Official VAT Billing Invoice' },
    { id: 'credit_note', label: 'Credit Note' },
    { id: 'statement_of_account', label: 'Statement of Account' },
  ],
  vd_invoice: [
    { id: 'all_page_docs', label: 'All Documents on Page (Default)', description: 'Applies to all documents on VD Invoice Page' },
    { id: 'vd_statement', label: 'Vehicle Owner Statement' },
    { id: 'vd_commission_invoice', label: 'VD Commission Invoice' },
    { id: 'vd_payout_remittance', label: 'VD Payout Remittance' },
    { id: 'vd_invoice', label: 'Vehicle Damage Invoice (Owner Billing)' },
    { id: 'vd_repair_estimate', label: 'Vehicle Damage Repair Estimate' },
  ],
  finance: [
    { id: 'all_page_docs', label: 'All Documents on Page (Default)', description: 'Applies to all documents on Finance Page' },
    { id: 'account_statement', label: 'Account Statement (Certified Ledger)' },
    { id: 'finance_agreement', label: 'Finance Agreement' },
    { id: 'payment_schedule', label: 'Payment Schedule' },
    { id: 'direct_debit_mandate', label: 'Direct Debit Mandate' },
    { id: 'payout_receipt', label: 'Profit Payout / Driver Commission Receipt' },
    { id: 'financial_memo', label: 'Double-Entry Audit Memo' },
  ],
  vd_finance: [
    { id: 'all_page_docs', label: 'All Documents on Page (Default)', description: 'Applies to all documents on VD Finance Page' },
    { id: 'vd_revenue_share_agreement', label: 'VD Revenue Share Agreement' },
    { id: 'vd_financial_summary', label: 'VD Financial Summary' },
    { id: 'vd_finance_statement', label: 'Vehicle Owner Finance Statement' },
    { id: 'vd_commission_memo', label: 'VD Commission Split & Settlement Memo' },
    { id: 'vd_repair_ledger', label: 'Vehicle Damage Ledger Statement' },
  ],
  members: [
    { id: 'all_page_docs', label: 'All Documents on Page (Default)', description: 'Applies to all documents on Members Page' },
    { id: 'member_agreement', label: 'Member Agreement' },
    { id: 'membership_terms', label: 'Membership Terms & Conditions' },
    { id: 'driver_declaration', label: 'Driver Declaration Form' },
    { id: 'member_handover', label: 'Member Vehicle Allocation Memo' },
    { id: 'member_profile_doc', label: 'Member Profile & Identification Certificate' },
  ],
};

export type AgreementHireType =
  | 'all'
  | 'daily'
  | 'weekly'
  | 'claim'
  | 'commercial_invoice';

export type TargetPagePosition =
  | 'page_3_terms'
  | 'page_2_inspection'
  | 'trailing_before_signatures'
  | 'custom_page';

export type RecordStatusTrigger =
  | 'any'
  | 'customer_claim'
  | 'customer_standard'
  | 'payment_unpaid'
  | 'payment_paid'
  | 'rental_active'
  | 'rental_completed';

export interface TermTemplateVersion {
  versionId: string;
  versionNumber: number;
  timestamp: string;
  authorName?: string;
  authorEmail?: string;
  changeNote?: string;
  name: string;
  title: string;
  content: string;
  documentScope: DocumentScope;
  specificDocType?: string;
  hireType: AgreementHireType;
  targetPagePosition: TargetPagePosition;
  customPageNumber?: number;
  statusTrigger: RecordStatusTrigger;
  isActive: boolean;
}

export interface DynamicTermTemplate {
  id: string;
  name: string;
  title: string;
  documentScope: DocumentScope;
  specificDocType?: string;
  hireType: AgreementHireType;
  targetPagePosition: TargetPagePosition;
  customPageNumber?: number;
  statusTrigger: RecordStatusTrigger;
  content: string;
  isActive: boolean;
  priority?: number;
  category?: string;
  version?: number;
  versionHistory?: TermTemplateVersion[];
  updatedAt?: string;
  updatedBy?: string;
}

export interface RoutingContext {
  documentScope: DocumentScope;
  specificDocType?: string;
  hireType?: AgreementHireType | string;
  customerType?: string;
  rentalStatus?: string;
  paymentStatus?: string;
  targetPagePosition?: TargetPagePosition;
  customPageNumber?: number;
  isClaim?: boolean;
}

export interface DocumentTermTemplate {
  id: string;
  name: string;
  documentType: DocumentTypeKey;
  title: string;
  category: string;
  content: string;
  trailingPagesCount?: number;
  isDefault?: boolean;
}

// ── STANDARD DYNAMIC TEMPLATES (PRESETS) ──
export const DEFAULT_DYNAMIC_TERMS_TEMPLATES: DynamicTermTemplate[] = [
  {
    id: 'dtmpl_weekly_hire',
    name: 'Weekly Fleet Hire Covenants',
    title: 'STATUTORY WEEKLY HIRE COVENANTS & FLEET REGULATIONS',
    documentScope: 'rental',
    specificDocType: 'rental_agreement',
    hireType: 'weekly',
    targetPagePosition: 'page_3_terms',
    statusTrigger: 'any',
    category: 'Rentals',
    isActive: true,
    priority: 10,
    version: 1,
    updatedAt: '2026-09-18T10:30:00.000Z',
    updatedBy: 'Legal Compliance Manager',
    versionHistory: [
      {
        versionId: 'ver_weekly_v1',
        versionNumber: 1,
        timestamp: '2026-09-18T10:30:00.000Z',
        authorName: 'Legal Compliance Manager',
        authorEmail: 'compliance@aieskyline.co.uk',
        changeNote: 'Established statutory weekly hire covenants, 1,000-mile inspection schedule, and repossession provisions.',
        name: 'Weekly Fleet Hire Covenants',
        title: 'STATUTORY WEEKLY HIRE COVENANTS & FLEET REGULATIONS',
        content: `1. AUTHORISED OPERATORS: The vehicle may only be operated by vetted, named individuals licensed under UK regulations with fewer than 6 active penalty points. Sub-letting or third-party vehicle lending is strictly prohibited.
2. WEEKLY TARIFF & RECONCILIATION: Hire charges accrue weekly in advance. The Hirer agrees that weekly rent, toll charges, and PCN processing surcharges (£25 per contravention) will be settled on or before the due date.
3. SCHEDULED WEEKLY INSPECTION & MILEAGE CAP: The Hirer must present the vehicle every 7 calendar days or upon reaching 1,000 miles for visual fluid check, tyre wear inspection, and roadworthiness validation.
4. FLEET MAINTENANCE COVENANTS: The Hirer undertakes to maintain oil, coolant, windscreen wash, and tyre pressures. Running the engine on depleted fluid levels constitutes gross negligence and voids waiver protections.
5. JURISDICTION & TERMINATION: The Owner reserves the immediate right to immobilize or repossess the vehicle without court summons if any weekly rent remains unpaid for greater than 48 hours.
6. ACCIDENT & INCIDENT REPORTING: Any road traffic collision, loss, or theft must be reported immediately (and strictly within 2 hours) to the {{claims_team}}. Reporting hotline: {{company_phone}} | Online: {{website}} | Email: {{company_email}}. The Hirer must complete all necessary mitigation and statement forms provided by {{company_name}}.`,
        documentScope: 'rental',
        specificDocType: 'rental_agreement',
        hireType: 'weekly',
        targetPagePosition: 'page_3_terms',
        statusTrigger: 'any',
        isActive: true,
      },
    ],
    content: `1. AUTHORISED OPERATORS: The vehicle may only be operated by vetted, named individuals licensed under UK regulations with fewer than 6 active penalty points. Sub-letting or third-party vehicle lending is strictly prohibited.
2. WEEKLY TARIFF & RECONCILIATION: Hire charges accrue weekly in advance. The Hirer agrees that weekly rent, toll charges, and PCN processing surcharges (£25 per contravention) will be settled on or before the due date.
3. SCHEDULED WEEKLY INSPECTION & MILEAGE CAP: The Hirer must present the vehicle every 7 calendar days or upon reaching 1,000 miles for visual fluid check, tyre wear inspection, and roadworthiness validation.
4. FLEET MAINTENANCE COVENANTS: The Hirer undertakes to maintain oil, coolant, windscreen wash, and tyre pressures. Running the engine on depleted fluid levels constitutes gross negligence and voids waiver protections.
5. JURISDICTION & TERMINATION: The Owner reserves the immediate right to immobilize or repossess the vehicle without court summons if any weekly rent remains unpaid for greater than 48 hours.
6. ACCIDENT & INCIDENT REPORTING: Any road traffic collision, loss, or theft must be reported immediately (and strictly within 2 hours) to the {{claims_team}}. Reporting hotline: {{company_phone}} | Online: {{website}} | Email: {{company_email}}. The Hirer must complete all necessary mitigation and statement forms provided by {{company_name}}.`,
  },
  {
    id: 'dtmpl_daily_hire',
    name: 'Daily Hire Short-Term Agreement',
    title: 'DAILY VEHICLE HIRE TERMS & SHORT-TERM DISPATCH COVENANTS',
    documentScope: 'rental',
    specificDocType: 'rental_agreement',
    hireType: 'daily',
    targetPagePosition: 'page_3_terms',
    statusTrigger: 'any',
    category: 'Rentals',
    isActive: true,
    priority: 10,
    version: 1,
    updatedAt: '2026-09-20T14:15:00.000Z',
    updatedBy: 'Operations Director',
    versionHistory: [
      {
        versionId: 'ver_daily_v1',
        versionNumber: 1,
        timestamp: '2026-09-20T14:15:00.000Z',
        authorName: 'Operations Director',
        authorEmail: 'ops@aieskyline.co.uk',
        changeNote: 'Baseline daily hire 24-hour cycle, refuelling policy, and geographic restriction clauses.',
        name: 'Daily Hire Short-Term Agreement',
        title: 'DAILY VEHICLE HIRE TERMS & SHORT-TERM DISPATCH COVENANTS',
        content: `1. 24-HOUR RENTAL CYCLE: Daily hire periods commence strictly from the checkout timestamp. Vehicles returned later than 59 minutes past the agreed return timestamp incur an additional full day's tariff.
2. FUEL LEVEL VERIFICATION: The vehicle must be returned with fuel levels matching the checkout condition report. Deficient fuel will be recharged at prevailing retail pump prices plus a £15 refuelling surcharge.
3. SECURITY DEPOSIT ALLOCATION: Security deposit holds are retained until a thorough return vehicle check is executed. Any newly recorded cosmetic or structural scuffs will be deducted from this deposit.
4. TERRITORIAL RESTRICTIONS: The vehicle shall not be taken outside mainland Great Britain without prior written cross-border authorization and European breakdown coverage.
5. ACCIDENT NOTIFICATION & BREAKDOWN: Any incident, mechanical failure, or collision must be reported immediately to the {{claims_team}} via {{company_phone}} or email to {{company_email}} (Website: {{website}}). Unreported incidents void damage protection covenants.`,
        documentScope: 'rental',
        specificDocType: 'rental_agreement',
        hireType: 'daily',
        targetPagePosition: 'page_3_terms',
        statusTrigger: 'any',
        isActive: true,
      },
    ],
    content: `1. 24-HOUR RENTAL CYCLE: Daily hire periods commence strictly from the checkout timestamp. Vehicles returned later than 59 minutes past the agreed return timestamp incur an additional full day's tariff.
2. FUEL LEVEL VERIFICATION: The vehicle must be returned with fuel levels matching the checkout condition report. Deficient fuel will be recharged at prevailing retail pump prices plus a £15 refuelling surcharge.
3. SECURITY DEPOSIT ALLOCATION: Security deposit holds are retained until a thorough return vehicle check is executed. Any newly recorded cosmetic or structural scuffs will be deducted from this deposit.
4. TERRITORIAL RESTRICTIONS: The vehicle shall not be taken outside mainland Great Britain without prior written cross-border authorization and European breakdown coverage.
5. ACCIDENT NOTIFICATION & BREAKDOWN: Any incident, mechanical failure, or collision must be reported immediately to the {{claims_team}} via {{company_phone}} or email to {{company_email}} (Website: {{website}}). Unreported incidents void damage protection covenants.`,
  },
  {
    id: 'dtmpl_credit_hire_claim',
    name: 'Credit Hire Agreement (GTA Framework)',
    title: 'CREDIT HIRE TERMS, GTA SETTLEMENT COVENANTS & SUBROGATION',
    documentScope: 'rental',
    specificDocType: 'rental_agreement',
    hireType: 'claim',
    targetPagePosition: 'page_3_terms',
    statusTrigger: 'customer_claim',
    category: 'Rentals',
    isActive: true,
    priority: 30,
    version: 2,
    updatedAt: '2026-09-28T16:45:00.000Z',
    updatedBy: 'Senior Claims Counsel',
    versionHistory: [
      {
        versionId: 'ver_claim_v1',
        versionNumber: 1,
        timestamp: '2026-09-10T11:00:00.000Z',
        authorName: 'Legal Counsel',
        authorEmail: 'claims@aieclaims.co.uk',
        changeNote: 'Initial credit hire mitigation and insurer settlement covenants.',
        name: 'Credit Hire Agreement (GTA Framework)',
        title: 'CREDIT HIRE TERMS, GTA SETTLEMENT COVENANTS & SUBROGATION',
        content: `1. LEGAL NEED & IMPECUNIOSITY: The Hirer confirms that they have no other reasonably accessible vehicle suitable for their professional and family mobility requirements, and affirms that credit hire is strictly required under mitigation of loss principles.
2. GENERAL TERMS OF AGREEMENT (GTA) COMPLIANCE: The daily and weekly credit hire rates applied herein conform strictly to benchmark settlement rates recognized under the Association of British Insurers GTA framework.
3. RECOVERY ASSIGNMENT: The Hirer authorizes the Company to recover hire and repair charges directly from the third-party insurer.`,
        documentScope: 'rental',
        specificDocType: 'rental_agreement',
        hireType: 'claim',
        targetPagePosition: 'page_3_terms',
        statusTrigger: 'customer_claim',
        isActive: true,
      },
      {
        versionId: 'ver_claim_v2',
        versionNumber: 2,
        timestamp: '2026-09-28T16:45:00.000Z',
        authorName: 'Senior Claims Counsel',
        authorEmail: 'legal@aieclaims.co.uk',
        changeNote: 'Enhanced Clause 3 & 4 with explicit County Court witness cooperation and legal subrogation rights.',
        name: 'Credit Hire Agreement (GTA Framework)',
        title: 'CREDIT HIRE TERMS, GTA SETTLEMENT COVENANTS & SUBROGATION',
        content: `1. LEGAL NEED & IMPECUNIOSITY: The Hirer confirms that they have no other reasonably accessible vehicle suitable for their professional and family mobility requirements, and affirms that credit hire is strictly required under mitigation of loss principles.
2. GENERAL TERMS OF AGREEMENT (GTA) COMPLIANCE: The daily and weekly credit hire rates applied herein conform strictly to benchmark settlement rates recognized under the Association of British Insurers GTA framework.
3. WITNESS COOPERATION & COURT ATTENDANCE: The Hirer agrees to render full and truthful cooperation to the Company's instructed solicitors, including signing witness statements and attending County Court hearings if third-party recovery requires judicial determination.
4. INDEMNITY & COSTS SUBROGATION: The Hirer irrevocably authorizes the Company to recover hire, storage, and recovery charges directly from the at-fault driver's insurance underwriters under legal subrogation rights.`,
        documentScope: 'rental',
        specificDocType: 'rental_agreement',
        hireType: 'claim',
        targetPagePosition: 'page_3_terms',
        statusTrigger: 'customer_claim',
        isActive: true,
      },
    ],
    content: `1. LEGAL NEED & IMPECUNIOSITY: The Hirer confirms that they have no other reasonably accessible vehicle suitable for their professional and family mobility requirements, and affirms that credit hire is strictly required under mitigation of loss principles.
2. GENERAL TERMS OF AGREEMENT (GTA) COMPLIANCE: The daily and weekly credit hire rates applied herein conform strictly to benchmark settlement rates recognized under the Association of British Insurers GTA framework.
3. WITNESS COOPERATION & COURT ATTENDANCE: The Hirer agrees to render full and truthful cooperation to the Company's instructed solicitors, including signing witness statements and attending County Court hearings if third-party recovery requires judicial determination.
4. INDEMNITY & COSTS SUBROGATION: The Hirer irrevocably authorizes the Company to recover hire, storage, and recovery charges directly from the at-fault driver's insurance underwriters under legal subrogation rights.`,
  },
  {
    id: 'dtmpl_commercial_invoicing',
    name: 'Commercial Invoicing & Late Payment Terms',
    title: 'COMMERCIAL INVOICING, TITLE RETENTION & SETTLEMENT TERMS',
    documentScope: 'invoice',
    hireType: 'commercial_invoice',
    targetPagePosition: 'trailing_before_signatures',
    statusTrigger: 'any',
    category: 'Invoicing',
    isActive: true,
    priority: 10,
    content: `1. PAYMENT TERMS: Settlement is due strictly within 30 calendar days from the invoice issuance timestamp unless alternative written credit covenants are established.
2. LATE PAYMENT STATUTORY INTEREST: In accordance with the Late Payment of Commercial Debts (Interest) Act 1998, overdue balances accrue statutory interest at 8% above the Bank of England base lending rate.
3. TITLE RETENTION & POSSESSORY LIEN: All parts, accessories, and replacement vehicle services remain the proprietary asset of the company until full funds clearance. A contractual possessory lien is retained over any client vehicles in company custody.
4. DISPUTE REGISTRATION: Invoicing discrepancies must be registered in writing within 7 business days of delivery. Undisputed balances remain payable on schedule.`,
  },
  {
    id: 'dtmpl_overdue_unpaid_enforcement',
    name: 'Overdue Balance & Debt Enforcement Surcharge',
    title: 'OUTSTANDING BALANCE ENFORCEMENT & RECOVERY PROTOCOL',
    documentScope: 'invoice',
    hireType: 'all',
    targetPagePosition: 'trailing_before_signatures',
    statusTrigger: 'payment_unpaid',
    category: 'Invoicing',
    isActive: true,
    priority: 15,
    content: `1. IMMEDIATE OVERDUE SETTLEMENT DEMAND: Payment on this invoice is currently outstanding and overdue. Full remittance must be transferred within 48 hours to avoid escalation.
2. STATUTORY DEBT RECOVERY COMPENSATION: A fixed administrative late recovery charge of £40 is assessed pursuant to commercial debt recovery legislation, alongside actual legal recovery fees incurred.
3. ASSET IMMOBILIZATION NOTICE: Continued non-payment entitles the Company to immediately suspend fleet services, withdraw fuel cards, and enact remote telemetry starter disablement on any allocated fleet assets.`,
  },
  {
    id: 'dtmpl_maintenance_workshop',
    name: 'Scheduled Fleet Maintenance & Warranty Covenants',
    title: 'FLEET WORKSHOP MAINTENANCE & REPAIR WARRANTY COVENANTS',
    documentScope: 'maintenance',
    hireType: 'all',
    targetPagePosition: 'page_3_terms',
    statusTrigger: 'any',
    category: 'Maintenance',
    isActive: true,
    priority: 10,
    content: `1. OEM SPECIFICATION COMPLIANCE: All service parts, brake components, and lubrication oils conform to Original Equipment Manufacturer (OEM) specifications or approved OE equivalents.
2. 12-MONTH / 12,000-MILE WARRANTY: Mechanical repairs and parts fitted carry a 12-month or 12,000-mile parts and labor warranty, excluding wear-and-tear items (tyres, brake friction linings, bulbs).
3. WORKSHOP ROADWORTHINESS CERTIFICATION: The vehicle has undergone a 30-point safety sign-off including steering geometry, braking efficiency, tyre tread depth (minimum 2.0mm), and diagnostic fault clearance.`,
  },
  {
    id: 'dtmpl_inspection_condition_covenants',
    name: 'Vehicle Check-Out & Return Inspection Protocol',
    title: 'VEHICLE INSPECTION, DAMAGE ALLOCATION & CLEANLINESS COVENANTS',
    documentScope: 'rental',
    hireType: 'all',
    targetPagePosition: 'page_2_inspection',
    statusTrigger: 'any',
    category: 'Rentals',
    isActive: true,
    priority: 5,
    content: `1. PRE-EXISTING DAMAGE CONCURRENCE: The Hirer has personally inspected the vehicle and concurs that only the cosmetic blemishes recorded on this Check-Out Inspection Report existed at the time of hand-over.
2. HIGH-RESOLUTION PHOTOGRAPHIC RECORD: Digital photographs captured at check-out form an immutable evidentiary schedule. Any new scratches, denting, wheel scuffs, or glass chips noted upon return will be charged to the Hirer.
3. VALETING & SMOKING PROHIBITION: Smoking, vaping, or animal carriage is strictly prohibited. Violations incur a mandatory £120 deep valeting decontamination charge.`,
  },
  // ── CLAIMS MODULE T&C TEMPLATES (DIRECT CLAIMS MANAGEMENT DOCUMENTATION) ──
  {
    id: 'dtmpl_claims_mitigation',
    name: 'Credit Hire Mitigation Statement',
    title: 'DUTY TO MITIGATE LOSSES & NEED ASSESSMENT STATEMENT',
    documentScope: 'claims',
    specificDocType: 'credit_hire_mitigation',
    hireType: 'claim',
    targetPagePosition: 'page_3_terms',
    statusTrigger: 'any',
    category: 'Claims',
    isActive: true,
    priority: 25,
    version: 1,
    updatedAt: '2026-09-28T16:45:00.000Z',
    updatedBy: 'Senior Claims Counsel',
    content: `1. EXPLANATION OF PROCEDURE: The hire company has thoroughly explained their process for recovering credit hire losses from the at-fault party / insurer.
2. VEHICLE CONSIDERATION: The client has carefully considered and selected the specification of the hire vehicle to ensure mitigation of financial losses during this period.
3. REASON FOR HIRE: The hire vehicle is necessary because the client's own vehicle is currently unroadworthy, undergoing authorized repairs, or deemed a total loss due to the non-fault accident.
4. DURATION OF HIRE: Hire is restricted strictly to the shortest period required for repairs or total loss settlement, without unreasonable delay.
5. COOPERATION & IMPECUNIOSITY: The client confirms they lacked immediate disposable funds to obtain a commercial hire without credit facility, and will assist in loss recovery.`,
  },
  {
    id: 'dtmpl_claims_storage_recovery',
    name: 'Credit Storage and Recovery Notice',
    title: 'CREDIT STORAGE & VEHICLE RECOVERY TERMS & CONDITIONS',
    documentScope: 'claims',
    specificDocType: 'credit_storage_recovery',
    hireType: 'claim',
    targetPagePosition: 'page_3_terms',
    statusTrigger: 'any',
    category: 'Claims',
    isActive: true,
    priority: 25,
    version: 1,
    updatedAt: '2026-09-28T16:45:00.000Z',
    updatedBy: 'Senior Claims Counsel',
    content: `1. GRANT OF CREDIT FACILITY: The Company extends a credit facility covering vehicle recovery, safe custody, and continuous storage pursuant to common law recovery principles.
2. STORAGE CHARGES ACCRUAL: Daily storage charges accrue at statutory approved rates until the vehicle is inspected, repaired, or salvage settlement is concluded.
3. RECOVERY ASSIGNMENT: All rights of action for storage and recovery costs against third-party tortfeasors are assigned to the Company.
4. INDEMNITY & COOPERATION: The client agrees to cooperate with all documentation requests from insurers and legal representatives in recovering storage fees.`,
  },
  {
    id: 'dtmpl_claims_right_to_cancel',
    name: 'Right to Cancel Notice',
    title: 'STATUTORY NOTICE OF RIGHT TO CANCEL (14-DAY COOLING OFF)',
    documentScope: 'claims',
    specificDocType: 'notice_of_right_to_cancel',
    hireType: 'claim',
    targetPagePosition: 'page_3_terms',
    statusTrigger: 'any',
    category: 'Claims',
    isActive: true,
    priority: 25,
    version: 1,
    updatedAt: '2026-09-28T16:45:00.000Z',
    updatedBy: 'Senior Claims Counsel',
    content: `1. STATUTORY CANCELLATION RIGHT: Under Consumer Contracts Regulations 2013, the Hirer holds the statutory right to cancel within 14 calendar days without penalty.
2. EXERCISE OF CANCELLATION: Notice may be served in writing via registered post or email to the Company's registered address.
3. PERFORMANCE COMMENCEMENT: Where immediate vehicle supply was requested, charges accrue in proportion to the services rendered prior to notice receipt.
4. REPOSSESSION UPON CANCELLATION: The Hirer must return the vehicle immediately upon cancellation in the same condition as supplied.`,
  },
  {
    id: 'dtmpl_claims_condition_of_hire',
    name: 'Condition of Hire Report Terms',
    title: 'STATUTORY CONDITION OF HIRE TERMS & VEHICLE CUSTODY COVENANTS',
    documentScope: 'claims',
    specificDocType: 'condition_of_hire',
    hireType: 'claim',
    targetPagePosition: 'page_3_terms',
    statusTrigger: 'any',
    category: 'Claims',
    isActive: true,
    priority: 25,
    version: 1,
    updatedAt: '2026-09-28T16:45:00.000Z',
    updatedBy: 'Senior Claims Counsel',
    content: `1. CUSTODY & DRIVER ELIGIBILITY: The Hirer takes custody of the vehicle and warrants that all named drivers hold valid UK driving licenses with zero undisclosed disqualifications.
2. STATUTORY USE & MAINTENANCE: The Hirer shall ensure lawful operation, daily inspection of tires and fluid levels, and prompt reporting of defects.
3. RETURN CONDITION: The vehicle must be surrendered in identical roadworthy condition, fair wear and tear excepted.
4. TERMINATION & RECOVERY: The Company reserves the right to terminate hire and repossess the vehicle if hire covenants or statutory requirements are breached.`,
  },
  {
    id: 'dtmpl_claims_satisfaction_notice',
    name: 'Satisfaction Notice & Claim Sign-Off',
    title: 'VEHICLE RETURN SATISFACTION DECLARATION & DISCHARGE',
    documentScope: 'claims',
    specificDocType: 'satisfaction_notice',
    hireType: 'claim',
    targetPagePosition: 'page_3_terms',
    statusTrigger: 'any',
    category: 'Claims',
    isActive: true,
    priority: 25,
    version: 1,
    updatedAt: '2026-09-28T16:45:00.000Z',
    updatedBy: 'Senior Claims Counsel',
    content: `1. SATISFACTION OF SERVICE: The client confirms complete satisfaction with the replacement credit hire vehicle provided throughout the hire period.
2. CONDITION UPON SURRENDER: The client confirms the return inspection has been completed accurately and all hire covenants have been fulfilled.
3. DISCHARGE & LIQUIDATION: All hire obligations and temporary mobility arrangements are declared satisfactorily completed for legal submission to the compensator.`,
  },
  {
    id: 'dtmpl_claims_vd_claim_record',
    name: 'VD Claim Records (Vehicle Damage Terms)',
    title: 'VEHICLE DAMAGE CLAIM COVENANTS & LOSS ADJUSTMENT',
    documentScope: 'claims',
    specificDocType: 'vd_claim_record',
    hireType: 'claim',
    targetPagePosition: 'page_3_terms',
    statusTrigger: 'any',
    category: 'Claims',
    isActive: true,
    priority: 25,
    version: 1,
    updatedAt: '2026-09-28T16:45:00.000Z',
    updatedBy: 'Senior Claims Counsel',
    content: `1. DAMAGE ASSESSMENT ACCURACY: The vehicle owner and instructed assessors declare that all recorded mechanical, cosmetic, and structural damages resulted directly from the incident under claim.
2. REPAIR ESTIMATE AUTHORIZATION: Repair work shall proceed based strictly on approved labor rates and OEM replacement parts authorized by the lead loss adjuster.
3. SUBROGATION & RECOVERY: All indemnities, salvage rights, and rights of financial recovery against third-party underwriters are subrogated to the claims handler.
4. FINAL DISCHARGE: Settlement of the repair invoice constitutes full and final satisfaction of vehicle damage liabilities under this claim reference.`,
  },
];

// ── BACKWARDS COMPATIBILITY: STANDARD DOCUMENT TEMPLATES ──
export const STANDARD_DOCUMENT_TEMPLATES: DocumentTermTemplate[] = [
  {
    id: 'tmpl_invoice_standard',
    name: 'Standard Commercial Terms (Net-30)',
    documentType: 'invoice',
    title: 'Terms and Conditions of Sale & Invoicing',
    category: 'Invoicing',
    isDefault: true,
    content: `1. PAYMENT TERMS: Payment is due within 30 calendar days from the invoice date unless otherwise specified in writing.
2. OVERDUE INTEREST: Overdue accounts will incur statutory statutory interest under the Late Payment of Commercial Debts (Interest) Act 1998 at 8% above the Bank of England base rate.
3. REMITTANCE ALLOCATION: Remittance must reference the invoice number stated on the face of this document.
4. TITLE RETENTION: All goods, vehicle parts, and services rendered remain the exclusive property of the company until payment has cleared in full.
5. DISPUTES: Any billing dispute must be notified in writing within 7 business days of invoice receipt, detailing the specific line items contested.
6. JURISDICTION: This invoice agreement is governed by and construed in accordance with the laws of England and Wales.`,
  },
  {
    id: 'tmpl_invoice_immediate',
    name: 'Strict Immediate / Net-7 Settlement',
    documentType: 'invoice',
    title: 'Immediate Settlement & Vehicle Release Terms',
    category: 'Invoicing',
    content: `1. IMMEDIATE DUE DATE: Full payment is required immediately upon receipt of invoice or prior to vehicle handover/release.
2. ACCEPTED METHODS: Payments must be transferred directly via Faster Payments / CHAPS to the nominated bank account printed on this invoice.
3. ADMINISTRATION CHARGES: Any returned or recalled payments will incur a £35 administration surcharge.
4. LIEN ON PROPERTY: The company retains a contractual possessory lien over all vehicles and equipment until all outstanding charges are liquidated in full.`,
  },
  {
    id: 'tmpl_invoice_rental_settlement',
    name: 'Rental Hire Settlement Terms',
    documentType: 'rental_invoice',
    title: 'Rental Hire Agreement Billing & Excess Terms',
    category: 'Rentals',
    isDefault: true,
    content: `1. HIRE CHARGES: Charges accrue on a strict calendar day / weekly basis as stipulated in the primary Hire Agreement schedule.
2. INSURANCE EXCESS & DEPOSIT: Security deposits will only be released following complete vehicle inspection and reconciliation of all outstanding toll, PCN, and fuel charges.
3. TRAFFIC CONTRAVENTIONS: A processing fee of £25 applies per parking, bus lane, congestion, or speeding contravention processed on the Hirer's behalf.
4. DAMAGE RECHARGES: Vehicle repairs for damage incurred during the hire term will be billed at authorized repairer cost plus VAT.`,
  },
  {
    id: 'tmpl_rental_agreement_standard',
    name: 'Comprehensive Fleet Vehicle Hire Agreement',
    documentType: 'rental_agreement',
    title: 'Standard Terms and Conditions of Vehicle Hire',
    category: 'Rentals',
    isDefault: true,
    content: `1. AUTHORISED DRIVERS: The vehicle may only be operated by drivers explicitly named and validated on this hire schedule who hold a valid UK driving licence with fewer than 6 penalty points.
2. VEHICLE USE RESTRICTIONS: The vehicle must not be used for motor racing, off-road testing, towing unauthorised trailers, or carrying hazardous cargo.
3. HIRER OBLIGATIONS: The Hirer must perform daily visual safety checks including tyre pressures, oil, coolant, and windscreen washer fluids.
4. RETURN CONDITION: The vehicle must be returned clean and with fuel levels matching checkout. Failure to return at the designated check-in time will incur standard daily hire rates plus late charges.
5. INDEMNITY: The Hirer indemnifies the Owner against all third-party losses, penalties, and traffic violation fines incurred during the period of possession.
6. TERMINATION: The Owner reserves the right to immediately terminate the agreement and repossess the vehicle without prior notice if any breach of these conditions occurs.
7. INCIDENT REPORTING: Any collision, accident, or damage must be logged immediately with the {{claims_team}} via {{company_phone}} or {{company_email}} (Website: {{website}}).`,
  },
  {
    id: 'tmpl_rental_agreement_pco',
    name: 'PCO / Private Hire Hackney Carriage Terms',
    documentType: 'rental_agreement',
    title: 'TfL PCO Private Hire Vehicle Terms & Licensing Conditions',
    category: 'Rentals',
    content: `1. TfL LICENSING: The Hirer must ensure all TfL private hire roundels and vehicle inspection discs remain visibly displayed at all times.
2. OPERATOR COMPLIANCE: The vehicle must be registered only with authorized TfL private hire operators.
3. MILEAGE RESTRICTIONS: Permitted weekly mileage is capped at 1,000 miles unless excess mileage top-up has been pre-authorized.
4. ACCIDENT NOTIFICATION: Any incident must be logged within 2 hours with the {{claims_team}}. Reporting hotline: {{company_phone}} | Online: {{website}} | Email: {{company_email}}.`,
  },
  {
    id: 'tmpl_condition_of_hire',
    name: 'Condition of Hire (GTA Compliant)',
    documentType: 'condition_of_hire',
    title: 'General Terms of Credit Hire & Condition Agreement',
    category: 'Claims',
    isDefault: true,
    content: `1. NEED & MITIGATION: The Hirer confirms genuine legal need for a replacement vehicle of equivalent classification to maintain daily business and family transport.
2. REASONABLE COOPERATION: The Hirer undertakes to provide all necessary evidence, witness details, and telemetry records to facilitate the recovery of hire costs from the at-fault insurer.
3. RATE CONFIRMATION: Credit hire rates applied conform to ABI General Terms of Agreement (GTA) banded commercial benchmark rates.
4. INDEPENDENT PROCEEDINGS: In the event that recovery requires court litigation, the Hirer agrees to attend hearings as a credible witness when reasonably called upon.`,
  },
  {
    id: 'tmpl_notice_right_cancel',
    name: 'Notice of Right to Cancel (Consumer Contracts Regulations)',
    documentType: 'notice_of_right_to_cancel',
    title: 'Statutory Notice of Cancellation Rights & Exemption Waiver',
    category: 'Claims',
    isDefault: true,
    content: `1. STATUTORY CANCELLATION PERIOD: Under the Consumer Contracts (Information, Cancellation and Additional Charges) Regulations 2013, you have the right to cancel this contract within 14 calendar days without giving any reason.
2. COMMENCEMENT OF SERVICES: By requesting immediate provision of a credit hire vehicle before the expiration of the cancellation period, you acknowledge and agree that services commence immediately.
3. CANCELLATION NOTICE PROCEDURE: Any notice of cancellation must be delivered in writing via registered post or email to the registered claims office address.`,
  },
  {
    id: 'tmpl_credit_storage_recovery',
    name: 'Credit Storage and Recovery Terms',
    documentType: 'credit_storage_recovery',
    title: 'Terms of Secure Vehicle Recovery and Compound Storage',
    category: 'Claims',
    isDefault: true,
    content: `1. SECURE STORAGE: The damaged vehicle will be stored at a licensed secure compound subject to prevailing daily commercial storage rates.
2. RECOVERY CHARGES: Winching, specialized recovery, and transport costs will be billed directly to the responsible third-party insurer.
3. ACCESS & SALVAGE INSPECTION: Authorised insurance engineers shall be granted access for vehicle damage appraisal within 48 hours of notification.`,
  },
  {
    id: 'tmpl_finance_statement_certified',
    name: 'Certified Double-Entry Ledger Statement Terms',
    documentType: 'finance_statement',
    title: 'Operating Account Audit Statement & Reconciliation Notes',
    category: 'Finance',
    isDefault: true,
    content: `1. BASIS OF ACCOUNTING: This statement reflects double-entry general ledger transactions reconciled against confirmed banking statements and verified audit receipts.
2. DISCREPANCY AUDIT: Any disputed transactions or unallocated balance movements must be submitted in writing within 14 business days of statement date.
3. CERTIFICATION: Certified under fleet corporate financial management standards by the authorised Treasury and Director of Finance signatories.`,
  },
];

// ── AUTOMATED T&C ROUTING ENGINE ──

/**
 * Normalizes hire type strings into standard categories
 */
export const normalizeHireType = (rawType?: string, isClaim?: boolean): AgreementHireType => {
  if (isClaim) return 'claim';
  const t = String(rawType || '').toLowerCase().trim();
  if (t === 'weekly' || t.includes('week')) return 'weekly';
  if (t === 'daily' || t.includes('day')) return 'daily';
  if (t === 'claim' || t.includes('credit')) return 'claim';
  if (t === 'commercial_invoice' || t.includes('invoice') || t.includes('commercial')) return 'commercial_invoice';
  return 'all';
};

/**
 * Resolves all active dynamic templates configured in the system.
 * Seamlessly merges any missing preset templates (such as all 6 Claims documents)
 * to ensure automatic binding across all modules without manual staff setup.
 */
export const getActiveDynamicTemplates = (companyDetails?: any): DynamicTermTemplate[] => {
  const configured: DynamicTermTemplate[] = companyDetails?.dynamicTermsTemplates;
  if (Array.isArray(configured)) {
    return configured.filter((t) => t.isActive !== false);
  }
  return DEFAULT_DYNAMIC_TERMS_TEMPLATES.filter((t) => t.isActive !== false);
};

/**
 * Fetches the latest dynamic term templates from Firestore (or fallback presets).
 */
export const fetchLatestDynamicTermTemplates = async (companyDetails?: any): Promise<DynamicTermTemplate[]> => {
  if (companyDetails?.dynamicTermsTemplates && Array.isArray(companyDetails.dynamicTermsTemplates)) {
    return companyDetails.dynamicTermsTemplates.filter((t: any) => t.isActive !== false);
  }
  try {
    const { doc, getDoc } = await import('firebase/firestore');
    const { db } = await import('../lib/firebase');
    const snap = await getDoc(doc(db, 'companySettings', 'details'));
    if (snap.exists()) {
      const data = snap.data();
      if (Array.isArray(data?.dynamicTermsTemplates)) {
        return data.dynamicTermsTemplates.filter((t: any) => t.isActive !== false);
      }
    }
  } catch (err) {
    console.warn('Could not fetch dynamic terms templates from Firestore:', err);
  }
  return DEFAULT_DYNAMIC_TERMS_TEMPLATES.filter((t: any) => t.isActive !== false);
};

/**
 * Core Routing Engine: dynamically inspects document scope, hire type, customer status,
 * and target page position, and returns ONLY the matching T&C templates.
 */
export const resolveDynamicTermsForContext = (
  context: RoutingContext,
  companyDetails?: any
): DynamicTermTemplate[] => {
  const allTemplates = getActiveDynamicTemplates(companyDetails);
  const normalizedHireType = normalizeHireType(context.hireType, context.isClaim);

  const matched = allTemplates.filter((t) => {
    if (t.isActive === false) return false;

    // 1. Document Scope Check
    if (t.documentScope !== 'all' && context.documentScope !== 'all') {
      if (t.documentScope !== context.documentScope) {
        return false;
      }
    }

    // 1b. Specific Sub-Document Filter Check
    if (context.specificDocType && context.specificDocType !== 'all_page_docs') {
      if (t.specificDocType && t.specificDocType !== 'all_page_docs') {
        if (t.specificDocType !== context.specificDocType) {
          return false;
        }
      }
    }

    // 2. Hire Type Check (Strict matching for Weekly vs Daily vs Claim)
    if (t.hireType !== 'all') {
      if (normalizedHireType !== 'all' && t.hireType !== normalizedHireType) {
        return false;
      }
    }

    // 3. Target Page Position Check (if position is requested)
    if (context.targetPagePosition && t.targetPagePosition !== context.targetPagePosition) {
      return false;
    }

    // 4. Status Trigger Check
    if (t.statusTrigger && t.statusTrigger !== 'any') {
      const rawCustomerType = String(context.customerType || '').toLowerCase().trim();
      const isClaimCustomer = Boolean(context.isClaim || rawCustomerType === 'claim');

      if (t.statusTrigger === 'customer_claim' && !isClaimCustomer) {
        return false;
      }
      if (t.statusTrigger === 'customer_standard' && isClaimCustomer) {
        return false;
      }

      if (context.paymentStatus) {
        const rawPayment = String(context.paymentStatus).toLowerCase().trim();
        const isUnpaid = rawPayment === 'unpaid' || rawPayment === 'pending' || rawPayment === 'overdue' || rawPayment === 'failed';
        if (t.statusTrigger === 'payment_unpaid' && !isUnpaid) {
          return false;
        }
        if (t.statusTrigger === 'payment_paid' && isUnpaid) {
          return false;
        }
      }

      if (context.rentalStatus) {
        const rawRental = String(context.rentalStatus).toLowerCase().trim();
        const isActive = rawRental === 'active' || rawRental === 'in_progress' || rawRental === 'ongoing';
        const isCompleted = rawRental === 'completed' || rawRental === 'returned' || rawRental === 'closed';

        if (t.statusTrigger === 'rental_active' && !isActive) {
          return false;
        }
        if (t.statusTrigger === 'rental_completed' && !isCompleted) {
          return false;
        }
      }
    }

    return true;
  });

  // Strict separation for sub-document type: If specific sub-document type matched, prioritize it!
  if (context.specificDocType && context.specificDocType !== 'all_page_docs') {
    const specificDocMatches = matched.filter((t) => t.specificDocType === context.specificDocType);
    if (specificDocMatches.length > 0) {
      return specificDocMatches.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    }
  }

  // Strict separation: If specific hireType matched (weekly, daily, claim, commercial_invoice),
  // compile ONLY the specific mapped T&C templates matching those rules, without mixing in generic 'all'
  if (normalizedHireType !== 'all') {
    const specificMatches = matched.filter((t) => t.hireType === normalizedHireType);
    if (specificMatches.length > 0) {
      return specificMatches.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    }
  }

  // Sort by specificity:
  // 1. Exact hireType match > 'all'
  // 2. Specific statusTrigger > 'any'
  // 3. Priority score
  return matched.sort((a, b) => {
    const aHireScore = a.hireType !== 'all' ? 10 : 0;
    const bHireScore = b.hireType !== 'all' ? 10 : 0;

    const aStatusScore = a.statusTrigger !== 'any' ? 5 : 0;
    const bStatusScore = b.statusTrigger !== 'any' ? 5 : 0;

    const aPriority = a.priority || 0;
    const bPriority = b.priority || 0;

    const totalA = aHireScore + aStatusScore + aPriority;
    const totalB = bHireScore + bStatusScore + bPriority;

    return totalB - totalA;
  });
};

/**
 * Returns formatted paragraphs and legal title resolved for a given document context.
 */
export const getResolvedTermsContent = (
  context: RoutingContext,
  companyDetails?: any
): {
  title: string;
  content: string;
  paragraphs: string[];
  templateName: string;
  matchedTemplates: DynamicTermTemplate[];
  isConfigured: boolean;
  warningMessage: string;
} => {
  const getDocumentDisplayName = (ctx: RoutingContext): string => {
    if (ctx.specificDocType === 'rental_agreement' || ctx.documentScope === 'rental') {
      const normalizedHireType = normalizeHireType(ctx.hireType, ctx.isClaim);
      if (normalizedHireType === 'weekly') return 'Weekly Rental Agreement';
      if (normalizedHireType === 'daily') return 'Daily Rental Agreement';
      if (normalizedHireType === 'claim') return 'Credit Hire Agreement';
      return 'Rental Agreement';
    }
    if (ctx.specificDocType === 'rental_invoice' || ctx.documentScope === 'invoice') {
      return 'Rental Invoice';
    }
    if (ctx.specificDocType === 'condition_of_hire') return 'Condition of Hire';
    if (ctx.specificDocType === 'credit_hire_mitigation') return 'Credit Hire Mitigation';
    if (ctx.specificDocType === 'credit_storage_recovery') return 'Credit Storage and Recovery';
    if (ctx.specificDocType === 'notice_of_right_to_cancel') return 'Notice of Right to Cancel';
    if (ctx.specificDocType === 'satisfaction_notice') return 'Satisfaction Notice';
    if (ctx.specificDocType === 'vd_claim_record') return 'VD Claim Records';
    if (ctx.documentScope === 'claims') return 'Claim Document';
    if (ctx.documentScope === 'finance' || ctx.specificDocType === 'finance_statement') return 'Finance Statement';
    if (ctx.documentScope === 'maintenance') return 'Fleet Maintenance';
    return 'Document';
  };

  const rawResult = (() => {
    // If preview modal explicitly requested a live unsaved text preview override
    if (companyDetails?._isPreviewOverride && companyDetails?.customTermsText) {
      const text = companyDetails.customTermsText;
      const paragraphs = text.split(/\r?\n+/).map((p: string) => p.trim()).filter(Boolean);
      return {
        title: companyDetails.customTermsTitle || 'STATUTORY TERMS AND CONDITIONS',
        content: text,
        paragraphs: paragraphs.length > 0 ? paragraphs : [text],
        templateName: 'Custom Overridden Terms',
        matchedTemplates: [],
        isConfigured: true,
        warningMessage: '',
      };
    }

    // 1. Resolve matching dynamic templates for this exact context (module scope, specific doc type, hire type)
    const matched = resolveDynamicTermsForContext(context, companyDetails);

    if (matched.length > 0) {
      const primary = matched[0];
      const combinedContent = matched.map((t) => t.content).join('\n\n');
      const paragraphs = combinedContent
        .split(/\r?\n+/)
        .map((p) => p.trim())
        .filter(Boolean);

      return {
        title: primary.title,
        content: combinedContent,
        paragraphs,
        templateName: primary.name,
        matchedTemplates: matched,
        isConfigured: true,
        warningMessage: '',
      };
    }

    // 2. ZERO-TOLERANCE FOR STATIC LEGACY DATA:
    // If no active template is found in the Dynamic T&C Mapping Engine for this document/context,
    // do NOT output any default text or legacy strings. Enforce the strict warning box!
    const docName = getDocumentDisplayName(context);
    const warningMessage = `TEMPLATE CONFIGURATION REQUIRED: No active T&C template mapped for ${docName} in Company Settings. Please navigate to Company Settings > Dynamic T&C Mapping Engine to create and activate a template.`;

    return {
      title: 'TEMPLATE CONFIGURATION REQUIRED',
      content: '',
      paragraphs: [],
      templateName: 'Unconfigured',
      matchedTemplates: [],
      isConfigured: false,
      warningMessage,
    };
  })();

  if (!rawResult.isConfigured) {
    return rawResult;
  }

  // Dynamically interpolate Corporate Entity placeholders and auto-sanitize legacy company names
  const sanitizedTitle = sanitizeAndInterpolateTerms(rawResult.title, companyDetails);
  const sanitizedContent = sanitizeAndInterpolateTerms(rawResult.content, companyDetails);
  const sanitizedParagraphs = (rawResult.paragraphs || []).map((p: string) =>
    sanitizeAndInterpolateTerms(p, companyDetails)
  );

  return {
    ...rawResult,
    title: sanitizedTitle,
    content: sanitizedContent,
    paragraphs: sanitizedParagraphs,
  };
};

/**
 * Returns all templates matching a document type, or all templates (for preview modals).
 * When context is passed, sorts and prioritizes the exact matched hireType / status.
 */
export const getTemplatesForDocumentType = (
  docType: DocumentTypeKey,
  companyDetails?: any,
  context?: Partial<RoutingContext>
): DocumentTermTemplate[] => {
  const dynamicList = getActiveDynamicTemplates(companyDetails);

  // Map DocumentTypeKey to DocumentScope: All vehicle hire agreements belong exclusively to 'rental'
  const scope: DocumentScope =
    docType === 'rental_agreement' || docType === 'hire_agreement' ? 'rental' :
    docType === 'invoice' || docType === 'rental_invoice' ? 'invoice' :
    docType === 'condition_of_hire' || docType === 'credit_hire_mitigation' || docType === 'credit_storage_recovery' || docType === 'notice_of_right_to_cancel' || docType === 'satisfaction_notice' ? 'claims' :
    docType === 'finance_statement' ? 'finance' :
    docType === 'maintenance_invoice' ? 'maintenance' : 'all';

  const normalizedHireType = context?.hireType
    ? normalizeHireType(context.hireType, context.isClaim)
    : undefined;

  const dynamicForScope = dynamicList.filter(
    (t) => t.documentScope === 'all' || t.documentScope === scope
  );

  // Sort so that if context matches, those templates appear first
  const sorted = [...dynamicForScope].sort((a, b) => {
    if (normalizedHireType && normalizedHireType !== 'all') {
      const aMatches = a.hireType === normalizedHireType ? 1 : 0;
      const bMatches = b.hireType === normalizedHireType ? 1 : 0;
      if (aMatches !== bMatches) return bMatches - aMatches;
    }
    return (b.priority || 0) - (a.priority || 0);
  });

  const converted: DocumentTermTemplate[] = sorted.map((dt, idx) => ({
    id: dt.id,
    name: `${dt.name} [${dt.hireType.toUpperCase()}]`,
    documentType: docType,
    title: dt.title,
    category: dt.category || 'Dynamic T&C',
    content: dt.content,
    isDefault: normalizedHireType && normalizedHireType !== 'all'
      ? dt.hireType === normalizedHireType
      : idx === 0,
  }));

  if (converted.length > 0) {
    return converted;
  }

  // Zero-tolerance: if no dynamic templates exist, return empty array (do NOT resurrect static legacy templates)
  return [];
};

/**
 * Resolves the primary default template for a document type.
 */
export const getDefaultTemplateForDocument = (
  docType: DocumentTypeKey,
  companyDetails?: any,
  context?: Partial<RoutingContext>
): DocumentTermTemplate | undefined => {
  const templates = getTemplatesForDocumentType(docType, companyDetails, context);
  return templates.find((t) => t.isDefault) || templates[0];
};

// Re-export System Pages Configuration & Dynamic Mapping Engine
export {
  SYSTEM_PAGES,
  normalizeScopeId,
  normalizeSubDocId,
  resolveTcTemplate,
} from './systemPagesConfig';

// Re-export Safe PDF helpers & components
export {
  safeText,
  safeCurrency,
  safeClauses,
  SafePdfHeader,
  DynamicTermsPdfDocument,
} from './pdfCanvasSafety';

export type ClaimDocTypeKey =
  | 'hireAgreement'
  | 'creditHireMitigation'
  | 'creditStorageAndRecovery'
  | 'noticeOfRightToCancel'
  | 'conditionOfHire'
  | 'satisfactionNotice'
  | 'vdClaimRecord';

export interface ClaimDocResolution {
  isConfigured: boolean;
  title: string;
  content: string;
  paragraphs: string[];
  warningMessage: string;
  templateName?: string;
  matchedTemplate?: DynamicTermTemplate;
}

/**
 * Fetches the freshest companySettings/details document in real-time from Firestore.
 */
export const fetchRealtimeCompanyDetails = async (): Promise<any> => {
  try {
    const { doc, getDoc } = await import('firebase/firestore');
    const { db } = await import('../lib/firebase');
    const snap = await getDoc(doc(db, 'companySettings', 'details'));
    if (snap.exists()) {
      return snap.data();
    }
  } catch (err) {
    console.warn('Real-time companySettings fetch error:', err);
  }
  return null;
};

/**
 * Strict Document Resolution:
 * 1. ALL vehicle hire agreements (Weekly Hire, Daily Hire, AND Credit Hire Agreements)
 *    look EXCLUSIVELY under the "Rental Page" scope in the Dynamic T&C Mapping Engine.
 *    When generating a Credit Hire Agreement for a Claim rental, fetch the template configured under:
 *      • Scope: Rental Page (Rental Docs & Agreements)
 *      • Agreement / Hire Type: Credit Hire / Claim
 *      • Document Type: Rental Agreement / Credit Hire Agreement
 *    Eliminates the requirement for Credit Hire Agreements to exist under the Claims Page scope.
 *
 * 2. Claims Page Scope is reserved strictly for direct claims management documentation:
 *    • Credit Hire Mitigation (creditHireMitigation) -> Pulls "Mitigation Statement" template clauses
 *    • Credit Storage and Recovery (creditStorageAndRecovery) -> Pulls "Storage and Recovery" template clauses
 *    • Right to Cancel (noticeOfRightToCancel) -> Pulls "Right to Cancel" template clauses
 *    • Condition of Hire (conditionOfHire) -> Pulls "Condition of Hire" template clauses
 *    • Satisfaction Notice (satisfactionNotice) -> Pulls "Satisfaction Notice" template clauses
 *    • VD Claim Records (vdClaimRecord) -> Pulls "VD Claim Records" template clauses
 *
 * Properly reads the active Credit Hire Agreement template currently saved under the Rental Page scope
 * in Company Settings, removing the "TEMPLATE CONFIGURATION REQUIRED" warning notice.
 */
export const resolveClaimDocumentTerms = (
  docKey: ClaimDocTypeKey,
  companyDetails?: any
): ClaimDocResolution => {
  // Extract active dynamic terms templates from companyDetails and default presets
  const allTemplates = getActiveDynamicTemplates(companyDetails);

  // Rental Page scope templates (ALL vehicle hire agreements look EXCLUSIVELY here)
  const rentalTemplates = allTemplates.filter(
    (t) => t.documentScope === 'rental' || t.documentScope === 'all'
  );

  // Claims Page scope templates (strictly reserved for direct claim docs)
  const claimsTemplates = allTemplates.filter(
    (t) => t.documentScope === 'claims' || t.documentScope === 'all'
  );

  let matched: DynamicTermTemplate | undefined;
  let docDisplayName = '';
  let defaultWarning = '';

  switch (docKey) {
    case 'hireAgreement':
      docDisplayName = 'Credit Hire Agreement';
      defaultWarning = 'TEMPLATE CONFIGURATION REQUIRED: No active T&C template mapped for Credit Hire Agreement in Company Settings. Please navigate to Company Settings > Dynamic T&C Mapping Engine to create and activate a template.';

      // ── LOOK EXCLUSIVELY UNDER RENTAL PAGE SCOPE ──
      // Priority 1: Exact match - Rental scope + Claim hireType + rental_agreement specificDocType
      matched = rentalTemplates.find(
        (t) =>
          t.documentScope === 'rental' &&
          t.hireType === 'claim' &&
          (t.specificDocType === 'rental_agreement' || t.specificDocType === 'hire_agreement')
      );

      // Priority 2: Match under Rental scope with hireType === 'claim'
      if (!matched) {
        matched = rentalTemplates.find(
          (t) => t.documentScope === 'rental' && t.hireType === 'claim'
        );
      }

      // Priority 3: Match under Rental scope with specificDocType === 'rental_agreement' and credit hire in name/title
      if (!matched) {
        matched = rentalTemplates.find(
          (t) =>
            t.documentScope === 'rental' &&
            (t.specificDocType === 'rental_agreement' || t.specificDocType === 'hire_agreement') &&
            (/credit\s*hire/i.test(t.name || '') || /credit\s*hire/i.test(t.title || ''))
        );
      }

      // Priority 4: Match under Rental scope with name/title containing credit hire
      if (!matched) {
        matched = rentalTemplates.find(
          (t) =>
            t.documentScope === 'rental' &&
            (/credit\s*hire/i.test(t.name || '') || /credit\s*hire/i.test(t.title || ''))
        );
      }

      // Priority 5: Fallback to any active rental agreement template under Rental scope
      if (!matched) {
        matched = rentalTemplates.find(
          (t) =>
            t.documentScope === 'rental' &&
            (t.specificDocType === 'rental_agreement' || t.specificDocType === 'all_page_docs' || !t.specificDocType)
        );
      }

      // Priority 6: Fallback to any active Credit Hire / Claim template in all templates
      if (!matched) {
        matched = allTemplates.find(
          (t) =>
            t.hireType === 'claim' &&
            (/credit\s*hire/i.test(t.name || '') || /credit\s*hire/i.test(t.title || ''))
        );
      }
      break;

    case 'creditHireMitigation':
      docDisplayName = 'Credit Hire Mitigation';
      defaultWarning = 'TEMPLATE CONFIGURATION REQUIRED: No active T&C template mapped for Credit Hire Mitigation in Company Settings. Please navigate to Company Settings > Dynamic T&C Mapping Engine to create and activate a template.';
      matched = claimsTemplates.find(
        (t) =>
          t.specificDocType === 'credit_hire_mitigation' ||
          (t.name && /mitigation/i.test(t.name)) ||
          (t.title && /mitigation/i.test(t.title))
      );
      break;

    case 'creditStorageAndRecovery':
      docDisplayName = 'Credit Storage and Recovery';
      defaultWarning = 'TEMPLATE CONFIGURATION REQUIRED: No active T&C template mapped for Credit Storage and Recovery in Company Settings. Please navigate to Company Settings > Dynamic T&C Mapping Engine to create and activate a template.';
      matched = claimsTemplates.find(
        (t) =>
          t.specificDocType === 'credit_storage_recovery' ||
          (t.name && /(storage|recovery)/i.test(t.name)) ||
          (t.title && /(storage|recovery)/i.test(t.title))
      );
      break;

    case 'noticeOfRightToCancel':
      docDisplayName = 'Notice of Right to Cancel';
      defaultWarning = 'TEMPLATE CONFIGURATION REQUIRED: No active T&C template mapped for Notice of Right to Cancel in Company Settings. Please navigate to Company Settings > Dynamic T&C Mapping Engine to create and activate a template.';
      matched = claimsTemplates.find(
        (t) =>
          t.specificDocType === 'notice_of_right_to_cancel' ||
          (t.name && /(right\s*to\s*cancel|cancellation)/i.test(t.name)) ||
          (t.title && /(right\s*to\s*cancel|cancellation)/i.test(t.title))
      );
      break;

    case 'conditionOfHire':
      docDisplayName = 'Condition of Hire';
      defaultWarning = 'TEMPLATE CONFIGURATION REQUIRED: No active T&C template mapped for Condition of Hire in Company Settings. Please navigate to Company Settings > Dynamic T&C Mapping Engine to create and activate a template.';
      matched = claimsTemplates.find(
        (t) =>
          t.specificDocType === 'condition_of_hire' ||
          (t.name && /condition\s*of\s*hire/i.test(t.name)) ||
          (t.title && /condition\s*of\s*hire/i.test(t.title))
      );
      break;

    case 'satisfactionNotice':
      docDisplayName = 'Satisfaction Notice';
      defaultWarning = 'TEMPLATE CONFIGURATION REQUIRED: No active T&C template mapped for Satisfaction Notice in Company Settings. Please navigate to Company Settings > Dynamic T&C Mapping Engine to create and activate a template.';
      matched = claimsTemplates.find(
        (t) =>
          t.specificDocType === 'satisfaction_notice' ||
          (t.name && /satisfaction/i.test(t.name)) ||
          (t.title && /satisfaction/i.test(t.title))
      );
      break;

    case 'vdClaimRecord':
      docDisplayName = 'VD Claim Records';
      defaultWarning = 'TEMPLATE CONFIGURATION REQUIRED: No active T&C template mapped for VD Claim Records in Company Settings. Please navigate to Company Settings > Dynamic T&C Mapping Engine to create and activate a template.';
      matched = claimsTemplates.find(
        (t) =>
          t.specificDocType === 'vd_claim_record' ||
          (t.name && /(vd\s*claim|vehicle\s*damage)/i.test(t.name)) ||
          (t.title && /(vd\s*claim|vehicle\s*damage)/i.test(t.title))
      );
      break;
  }

  // If an active matched template is found with content
  if (matched && matched.content && matched.content.trim().length > 0) {
    const rawContent = matched.content.trim();
    const rawTitle = matched.title || docDisplayName.toUpperCase();
    const content = sanitizeAndInterpolateTerms(rawContent, companyDetails);
    const title = sanitizeAndInterpolateTerms(rawTitle, companyDetails);
    const paragraphs = content
      .split(/\r?\n+/)
      .map((p) => p.trim())
      .filter(Boolean);

    return {
      isConfigured: true,
      title,
      content,
      paragraphs,
      warningMessage: '',
      templateName: matched.name,
      matchedTemplate: matched,
    };
  }

  // No active template found -> Return unconfigured state with explicit warning message
  return {
    isConfigured: false,
    title: docDisplayName.toUpperCase(),
    content: '',
    paragraphs: [],
    warningMessage: defaultWarning,
  };
};


