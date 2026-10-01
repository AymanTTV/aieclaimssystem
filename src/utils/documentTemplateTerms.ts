// src/utils/documentTemplateTerms.ts

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
  | 'general';

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

export const STANDARD_DOCUMENT_TEMPLATES: DocumentTermTemplate[] = [
  // ── INVOICE TEMPLATES ──
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

  // ── RENTAL AGREEMENT TEMPLATES ──
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
6. TERMINATION: The Owner reserves the right to immediately terminate the agreement and repossess the vehicle without prior notice if any breach of these conditions occurs.`,
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
4. ACCIDENT NOTIFICATION: Any incident must be logged within 2 hours with the AIE fleet management dispatch team.`,
  },

  // ── CLAIMS TEMPLATES ──
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

  // ── FINANCE STATEMENT TEMPLATES ──
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

/**
 * Returns all templates matching a document type, or all templates.
 */
export const getTemplatesForDocumentType = (
  docType: DocumentTypeKey,
  companyDetails?: any
): DocumentTermTemplate[] => {
  // If companyDetails has custom defined terms, we can build dynamic custom templates
  const list = STANDARD_DOCUMENT_TEMPLATES.filter(
    (t) => t.documentType === docType || (docType === 'rental_agreement' && t.category === 'Rentals')
  );

  // If specific company term text exists, inject it as an editable company default
  if (companyDetails) {
    let customText = '';
    let customName = 'Company Configured Terms';

    if (docType === 'invoice' && companyDetails.generalInvoiceTerms) {
      customText = companyDetails.generalInvoiceTerms;
      customName = 'Custom General Invoice Terms (From Company Settings)';
    } else if (docType === 'rental_agreement' && companyDetails.hireAgreementText) {
      customText = companyDetails.hireAgreementText;
      customName = 'Custom Hire Agreement Terms (From Company Settings)';
    } else if (docType === 'condition_of_hire' && companyDetails.conditionOfHireText) {
      customText = companyDetails.conditionOfHireText;
      customName = 'Custom Condition of Hire (From Company Settings)';
    }

    if (customText) {
      list.unshift({
        id: `tmpl_company_${docType}`,
        name: customName,
        documentType: docType,
        title: 'Company Configured Terms & Conditions',
        category: 'Company Settings',
        content: customText,
        isDefault: true,
      });
    }
  }

  return list.length > 0 ? list : [STANDARD_DOCUMENT_TEMPLATES[0]];
};

/**
 * Resolves the primary default template for a document type.
 */
export const getDefaultTemplateForDocument = (
  docType: DocumentTypeKey,
  companyDetails?: any
): DocumentTermTemplate => {
  const templates = getTemplatesForDocumentType(docType, companyDetails);
  return templates.find((t) => t.isDefault) || templates[0];
};
