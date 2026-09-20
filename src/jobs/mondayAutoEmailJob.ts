/**
 * Standalone Backend Scheduled Job & Automation Service:
 * Monday Rental Payment Reminder System
 *
 * SYSTEM RULES & ENFORCEMENT:
 * 1. RECURRENCE: Runs automatically every Monday at 09:00 AM (Cron: 0 9 * * 1).
 * 2. TARGETING: Target active Daily and Weekly rentals where owing_amount > 0.
 * 3. CLAIMS EXCLUSION: STRICTLY EXCLUDE any rental where status or category equals "Claims" or "Claim".
 * 4. DUAL TEMPLATE SELECTION: Allow selecting separate templates for Weekly Rentals and Daily Rentals directly on the Rental Page.
 * 5. STRICT TEMPLATE SOURCE: Retrieve email templates STRICTLY from the "Bulk Email" module list (category = 'Bulk Email'). Never pull from general rental or transactional templates.
 * 6. NO ATTACHMENTS: NEVER generate or attach PDF files or invoices to automated reminders.
 * 7. NON-DESTRUCTIVE: Do not alter, refactor, or break existing UI, database schemas, or code features.
 */

import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
  addDoc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { sendEmail } from '../utils/emailService';

export interface BulkEmailTemplate {
  id: string;
  name: string;
  subjectTemplate: string;
  bodyTemplate: string;
  category: string;
}

// ─── DEFAULT STRICT "BULK EMAIL" TEMPLATES ──────────────────────────────
export const DEFAULT_BULK_WEEKLY_TEMPLATE: BulkEmailTemplate = {
  id: 'bulk_email_weekly_rental_reminder',
  name: 'Weekly Rental Payment Reminder',
  category: 'Bulk Email',
  subjectTemplate: 'Weekly Rental Statement Breakdown - {rental_id}',
  bodyTemplate: `Dear {client_name},

We hope you had a productive week. This is your automated statement for your active weekly rental, for the week starting Monday, {due_date}.

📄 Weekly Rental Statement Breakdown
Rental Reference: {rental_id}
Vehicle Reg: {vehicle_reg}
Rental Type: Weekly Hire
Total Cost: £{total_amount}
Amount Paid: £{paid_amount}
Total Outstanding Balance: £{owing_amount}

Due Date: {due_date}

🏦 Payment Instructions
Bank: Lloyds Bank
Account: AIE Skyline Limited
Account Number: 30513162 | Sort Code: 30-99-50
Reference: {vehicle_reg}

🤝 Payment Request
Please kindly arrange for the Total Outstanding Balance to be settled today. Clearing your balance on Mondays ensures your account remains up to date and your vehicle hire continues without interruption.

If you have already made this payment, thank you—please feel free to ignore this reminder.

Kind regards,
Admin Team
AIE Skyline Limited
📍 United House, 39–41 North Road, London, N7 9DP
☎️ 020 8050 5337 | 📱 07552 553441 (24/7 & WhatsApp)
✉️ admin@aieskyline.co.uk
🌐 www.aieskyline.co.uk`,
};

export const DEFAULT_BULK_DAILY_TEMPLATE: BulkEmailTemplate = {
  id: 'bulk_email_daily_rental_reminder',
  name: 'Daily Rental Payment Reminder',
  category: 'Bulk Email',
  subjectTemplate: 'Daily Rental Statement Breakdown - {rental_id}',
  bodyTemplate: `Dear {client_name},

This is your automated daily rental statement and payment reminder for the week starting Monday, {due_date}.

📄 Daily Rental Statement Breakdown
Rental Reference: {rental_id}
Vehicle Reg: {vehicle_reg}
Rental Type: Daily Hire
Total Cost: £{total_amount}
Amount Paid: £{paid_amount}
Total Outstanding Balance: £{owing_amount}

Due Date: {due_date}

🏦 Payment Instructions
Bank: Lloyds Bank
Account: AIE Skyline Limited
Account Number: 30513162 | Sort Code: 30-99-50
Reference: {vehicle_reg}

🤝 Payment Request
Please kindly settle your outstanding daily balance today to ensure your account remains in good standing and hire continues without interruption.

If you have already made this payment, thank you—please feel free to ignore this reminder.

Kind regards,
Admin Team
AIE Skyline Limited
📍 United House, 39–41 North Road, London, N7 9DP
☎️ 020 8050 5337 | 📱 07552 553441 (24/7 & WhatsApp)
✉️ admin@aieskyline.co.uk
🌐 www.aieskyline.co.uk`,
};

// ─── HELPERS ────────────────────────────────────────────────────────────
function formatCurrency(num: number | string): string {
  const val = typeof num === 'number' ? num : parseFloat(num || '0');
  return isNaN(val) ? '0.00' : val.toFixed(2);
}

function formatDate(dateInput: any): string {
  if (!dateInput) return new Date().toLocaleDateString('en-GB');
  try {
    if (typeof dateInput?.toDate === 'function') {
      return dateInput.toDate().toLocaleDateString('en-GB');
    }
    const d = new Date(dateInput);
    return isNaN(d.getTime()) ? new Date().toLocaleDateString('en-GB') : d.toLocaleDateString('en-GB');
  } catch {
    return new Date().toLocaleDateString('en-GB');
  }
}

/**
 * Enhanced placeholder replacement supporting {curly} and [bracket] formats
 * as well as lowercase and uppercase variants.
 */
export function replacePlaceholders(templateText: string, placeholders: Record<string, string>): string {
  let content = templateText || '';

  // Comprehensive alias dictionary
  const aliasMap: Record<string, string[]> = {
    client_name: ['client_name', 'client name', 'driver name', 'driver_name', 'customer name', 'customer_name', 'recipient name', 'recipient_name'],
    rental_id: ['rental_id', 'rental id', 'rental_ref', 'rental ref', 'rental reference', 'rental_reference', 'agreement number', 'agreement_number', 'agreement_no', 'agreement no', 'agreement id'],
    rental_ref: ['rental_ref', 'rental ref', 'rental reference', 'rental_reference', 'agreement reference', 'agreement_reference'],
    reference_number: ['reference_number', 'reference number', 'ref_no', 'ref no'],
    reference: ['reference', 'bank reference', 'bank_reference', 'payment reference', 'payment_reference', 'ref'],
    vehicle_reg: [
      'vehicle_reg', 'vehicle reg', 'registration', 'vrm', 'plate_number', 'plate number',
      'registration number', 'registration_number', 'reg', 'client registration', 'vehicle registration', 'vehicle_registration', 'plate'
    ],
    total_amount: ['total_amount', 'total amount', 'gross cost', 'total cost', 'total'],
    paid_amount: ['paid_amount', 'paid amount', 'amount paid'],
    owing_amount: ['owing_amount', 'owing amount', 'owing balance', 'outstanding balance', 'remaining balance', 'owing'],
    due_date: ['due_date', 'due date', 'current date', 'the current date', 'date'],
    rental_type: ['rental_type', 'rental type', 'hire type', 'type'],
  };

  for (const [canonicalKey, aliases] of Object.entries(aliasMap)) {
    const rawVal = placeholders[canonicalKey] ?? '';
    for (const alias of aliases) {
      content = content.split(`{${alias}}`).join(rawVal);
      content = content.split(`{${alias.toUpperCase()}}`).join(rawVal);
      content = content.split(`[${alias}]`).join(rawVal);
      content = content.split(`[${alias.toUpperCase()}]`).join(rawVal);
      // Title Case version, e.g. [Vehicle Reg] or [Driver Name]
      const titleCase = alias.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      content = content.split(`[${titleCase}]`).join(rawVal);
      content = content.split(`{${titleCase}}`).join(rawVal);
    }
  }

  // Also replace any direct keys passed in placeholders
  for (const [key, val] of Object.entries(placeholders)) {
    content = content.split(`{${key}}`).join(val || '');
    content = content.split(`[${key}]`).join(val || '');
  }

  return content;
}

/**
 * Resolves Vehicle Reg and Reference from the active rental record and its vehicle.
 * Rules:
 * 1. Vehicle Reg: Maps to 'vehicle_reg', 'registration', 'vrm', or 'plate_number' from the active vehicle record.
 *    Falls back to checking the assigned vehicle object if the top-level rental record does not contain the plate value directly.
 * 2. Reference: Maps to 'rental_ref', 'reference_number', or 'vehicle_reg' as the bank reference.
 */
export async function resolveRentalVehicleAndReference(
  rental: any,
  providedVehicle?: any,
  vehicleCache?: Map<string, any>
): Promise<{
  vehicleReg: string;
  bankReference: string;
  rentalRef: string;
  referenceNumber: string;
  vehicleName: string;
}> {
  if (!rental) {
    return {
      vehicleReg: 'N/A',
      bankReference: 'N/A',
      rentalRef: 'N/A',
      referenceNumber: 'N/A',
      vehicleName: '',
    };
  }

  // Helper to validate whether a string is a meaningful license plate
  const isValidPlate = (val: any): boolean => {
    if (!val || typeof val !== 'string') return false;
    const clean = val.trim();
    if (!clean) return false;
    const upper = clean.toUpperCase();
    return upper !== 'N/A' && upper !== 'NO REG' && upper !== 'UNDEFINED' && upper !== 'NULL' && upper !== 'NONE';
  };

  // Helper to extract registration from an object checking candidate fields:
  // 'vehicle_reg', 'registration', 'vrm', 'plate_number' as well as standard variants
  const extractPlateFromObject = (obj: any): string => {
    if (!obj || typeof obj !== 'object') return '';
    const candidates = [
      obj.vehicle_reg,
      obj.vehicleReg,
      obj.vehicle_registration,
      obj.vehicleRegistration,
      obj.registration,
      obj.registrationNumber,
      obj.registration_number,
      obj.reg,
      obj.vrm,
      obj.plate,
      obj.plate_number,
      obj.plateNumber,
      obj.carRegistration,
      obj.carReg,
      obj.allocatedVehicleName,
    ];
    for (const c of candidates) {
      if (isValidPlate(c)) {
        return String(c).trim().toUpperCase();
      }
    }
    return '';
  };

  // 1. Try extracting vehicle registration from provided vehicle object first
  let vehicleReg = '';
  let vehicleName = '';

  if (providedVehicle && typeof providedVehicle === 'object') {
    vehicleReg = extractPlateFromObject(providedVehicle);
    if (providedVehicle.make || providedVehicle.model) {
      vehicleName = `${providedVehicle.make || ''} ${providedVehicle.model || ''}`.trim();
    }
  }

  // 2. Try extracting directly from top-level rental record
  if (!vehicleReg) {
    vehicleReg = extractPlateFromObject(rental);
  }

  // 3. Check active substitute vehicle if present in hireSubstitutionDetails
  if (!vehicleReg && Array.isArray(rental.hireSubstitutionDetails) && rental.hireSubstitutionDetails.length > 0) {
    const activeSub = rental.hireSubstitutionDetails[rental.hireSubstitutionDetails.length - 1];
    if (activeSub && typeof activeSub === 'object') {
      const subPlate = extractPlateFromObject(activeSub) || activeSub.registration || activeSub.plate;
      if (isValidPlate(subPlate)) {
        vehicleReg = String(subPlate).trim().toUpperCase();
        if (activeSub.make || activeSub.model) {
          vehicleName = `${activeSub.make || ''} ${activeSub.model || ''}`.trim();
        }
      }
    }
  }

  // 4. Check assigned vehicle objects embedded directly on the rental
  if (!vehicleReg) {
    if (rental.vehicle && typeof rental.vehicle === 'object') {
      vehicleReg = extractPlateFromObject(rental.vehicle);
      if (!vehicleName && (rental.vehicle.make || rental.vehicle.model)) {
        vehicleName = `${rental.vehicle.make || ''} ${rental.vehicle.model || ''}`.trim();
      }
    }
    if (!vehicleReg && rental.assignedVehicle && typeof rental.assignedVehicle === 'object') {
      vehicleReg = extractPlateFromObject(rental.assignedVehicle);
    }
    if (!vehicleReg && rental.vehicleData && typeof rental.vehicleData === 'object') {
      vehicleReg = extractPlateFromObject(rental.vehicleData);
    }
    if (!vehicleReg && rental.clientVehicle && typeof rental.clientVehicle === 'object') {
      vehicleReg = extractPlateFromObject(rental.clientVehicle);
    }
  }

  // 5. Query Firestore 'vehicles' collection using vehicleId / vehicle_id / carId
  const rawVehicleId = rental.vehicleId || rental.vehicle_id || rental.carId || rental.assignedVehicleId || (typeof rental.vehicle === 'string' ? rental.vehicle : null);
  const vehicleId = rawVehicleId ? String(rawVehicleId).trim() : '';

  if (!vehicleReg && vehicleId) {
    if (vehicleCache && vehicleCache.has(vehicleId)) {
      const cached = vehicleCache.get(vehicleId);
      vehicleReg = extractPlateFromObject(cached);
      if (!vehicleName && cached && (cached.make || cached.model)) {
        vehicleName = `${cached.make || ''} ${cached.model || ''}`.trim();
      }
    } else {
      try {
        // A) Direct document lookup by doc ID
        const vSnap = await getDoc(doc(db, 'vehicles', vehicleId));
        if (vSnap.exists()) {
          const vData = vSnap.data();
          if (vehicleCache) vehicleCache.set(vehicleId, vData);
          vehicleReg = extractPlateFromObject(vData);
          if (!vehicleName && (vData.make || vData.model)) {
            vehicleName = `${vData.make || ''} ${vData.model || ''}`.trim();
          }
        } else {
          // B) Query by 'id' attribute in document
          const qId = query(collection(db, 'vehicles'), where('id', '==', vehicleId), limit(1));
          const snapId = await getDocs(qId);
          if (!snapId.empty) {
            const vData = snapId.docs[0].data();
            if (vehicleCache) vehicleCache.set(vehicleId, vData);
            vehicleReg = extractPlateFromObject(vData);
            if (!vehicleName && (vData.make || vData.model)) {
              vehicleName = `${vData.make || ''} ${vData.model || ''}`.trim();
            }
          } else {
            // C) Query by 'registrationNumber'
            const qReg = query(collection(db, 'vehicles'), where('registrationNumber', '==', vehicleId), limit(1));
            const snapReg = await getDocs(qReg);
            if (!snapReg.empty) {
              const vData = snapReg.docs[0].data();
              if (vehicleCache) vehicleCache.set(vehicleId, vData);
              vehicleReg = extractPlateFromObject(vData);
              if (!vehicleName && (vData.make || vData.model)) {
                vehicleName = `${vData.make || ''} ${vData.model || ''}`.trim();
              }
            } else if (isValidPlate(vehicleId)) {
              // D) vehicleId itself is a license plate
              vehicleReg = vehicleId.toUpperCase();
            }
          }
        }
      } catch (vErr) {
        console.warn(`[MondayAutoEmailJob] Failed fetching assigned vehicle ${vehicleId} for rental ${rental.id || 'N/A'}:`, vErr);
        if (isValidPlate(vehicleId)) {
          vehicleReg = vehicleId.toUpperCase();
        }
      }
    }
  }

  // 6. Check customer vehicle as fallback if customerId exists
  if (!vehicleReg && rental.customerId) {
    try {
      const qCustVeh = query(collection(db, 'vehicles'), where('customerId', '==', String(rental.customerId).trim()), limit(1));
      const custVehSnap = await getDocs(qCustVeh);
      if (!custVehSnap.empty) {
        const cData = custVehSnap.docs[0].data();
        vehicleReg = extractPlateFromObject(cData);
        if (!vehicleName && (cData.make || cData.model)) {
          vehicleName = `${cData.make || ''} ${cData.model || ''}`.trim();
        }
      }
    } catch {
      // Ignore
    }
  }

  // 7. Check rental payment records for allocatedVehicleName or allocatedVehicleId
  if (!vehicleReg && Array.isArray(rental.payments)) {
    for (const p of rental.payments) {
      if (p?.allocatedVehicleName && isValidPlate(p.allocatedVehicleName)) {
        vehicleReg = String(p.allocatedVehicleName).trim().toUpperCase();
        break;
      }
    }
  }

  // Final fallback for vehicleReg
  if (!vehicleReg) {
    vehicleReg = 'N/A';
  }

  // ──────────────────────────────────────────────────────────────────────────
  // REFERENCE MAPPING:
  // Resolves 'rentalRef', 'referenceNumber', and 'bankReference'
  // ──────────────────────────────────────────────────────────────────────────
  const rawAgreement = 
    rental.rentalAgreementNumber ||
    rental.agreementNumber ||
    rental.agreement_number ||
    rental.agreementNo ||
    rental.agreement_no ||
    rental.hireAgreementNumber ||
    rental.contractNumber ||
    rental.bookingRef ||
    rental.bookingNumber ||
    rental.rental_ref ||
    rental.rentalRef ||
    '';

  const rentalId = rental.id ? String(rental.id).trim() : '';

  let rentalRef = '';
  if (rawAgreement) {
    const s = String(rawAgreement).trim();
    if (s.startsWith('AGR-') || s.startsWith('REF-')) {
      rentalRef = s;
    } else if (s.startsWith('#')) {
      rentalRef = `AGR-${s.slice(1)}`;
    } else if (/^\d+$/.test(s)) {
      rentalRef = `AGR-${s}`;
    } else {
      rentalRef = s;
    }
  } else if (rentalId) {
    rentalRef = rentalId.length > 8 ? `AGR-${rentalId.slice(-6).toUpperCase()}` : `AGR-${rentalId}`;
  } else if (vehicleReg && vehicleReg !== 'N/A') {
    rentalRef = vehicleReg;
  } else {
    rentalRef = 'N/A';
  }

  // Reference number
  const referenceNumber = (
    rental.reference_number ||
    rental.referenceNumber ||
    rental.reference ||
    rental.ref_no ||
    rental.ref ||
    rentalRef !== 'N/A' ? rentalRef : (vehicleReg !== 'N/A' ? vehicleReg : 'N/A')
  ).toString().trim() || (vehicleReg !== 'N/A' ? vehicleReg : rentalRef);

  // Bank reference: Maps to rental_ref, reference_number, or vehicle_reg
  let bankReference = '';
  if (rental.bank_reference || rental.bankReference || rental.paymentReference || rental.payment_reference) {
    bankReference = String(rental.bank_reference || rental.bankReference || rental.paymentReference || rental.payment_reference).trim();
  } else if (rental.rental_ref || rental.rentalRef) {
    bankReference = String(rental.rental_ref || rental.rentalRef).trim();
  } else if (rawAgreement) {
    const s = String(rawAgreement).trim();
    bankReference = s.startsWith('#') ? s.slice(1) : s;
  } else if (vehicleReg && vehicleReg !== 'N/A') {
    bankReference = vehicleReg;
  } else if (rentalRef && rentalRef !== 'N/A') {
    bankReference = rentalRef;
  } else {
    bankReference = rentalId ? `AGR-${rentalId.slice(-6).toUpperCase()}` : 'N/A';
  }

  return {
    vehicleReg,
    bankReference: bankReference || 'N/A',
    rentalRef: rentalRef || 'N/A',
    referenceNumber: referenceNumber || (vehicleReg !== 'N/A' ? vehicleReg : 'N/A'),
    vehicleName,
  };
}

// ─── STRICT TEMPLATE RETRIEVAL (RULE 5) ─────────────────────────────────
/**
 * Retrieve email templates STRICTLY from the "Bulk Email" module list (category = 'Bulk Email').
 * Never pull from general rental or transactional templates.
 */
export async function getBulkEmailTemplates(): Promise<BulkEmailTemplate[]> {
  try {
    const snap = await getDocs(collection(db, 'messageTemplates'));
    const templates: BulkEmailTemplate[] = [];

    snap.docs.forEach(d => {
      const data = d.data();
      const cat = String(data.category || '').trim();
      // STRICT FILTER: category must match 'Bulk Email' (case-insensitive check)
      if (cat === 'Bulk Email' || cat.toLowerCase() === 'bulk email') {
        templates.push({
          id: d.id,
          name: data.name || 'Bulk Email Template',
          subjectTemplate: data.subjectTemplate || '',
          bodyTemplate: data.bodyTemplate || '',
          category: 'Bulk Email',
        });
      }
    });

    // If Firestore has no templates saved under category 'Bulk Email' yet,
    // seed the default Weekly and Daily Bulk Email templates so they exist in Firestore
    if (templates.length === 0) {
      const defaults = [DEFAULT_BULK_WEEKLY_TEMPLATE, DEFAULT_BULK_DAILY_TEMPLATE];
      for (const def of defaults) {
        try {
          await setDoc(doc(db, 'messageTemplates', def.id), def, { merge: true });
          templates.push(def);
        } catch (seedErr) {
          templates.push(def);
        }
      }
    }

    return templates;
  } catch (err) {
    console.warn('[MondayAutoEmailJob] Error fetching Bulk Email templates from Firestore, using defaults:', err);
    return [DEFAULT_BULK_WEEKLY_TEMPLATE, DEFAULT_BULK_DAILY_TEMPLATE];
  }
}

/**
 * Fetches the currently selected Weekly and Daily templates from system_settings/global_config.
 * Guaranteed to pull ONLY from templates with category = 'Bulk Email'.
 */
export async function getMondayRentalTemplates(): Promise<{
  weeklyTemplate: BulkEmailTemplate;
  dailyTemplate: BulkEmailTemplate;
  weeklyTemplateId: string;
  dailyTemplateId: string;
}> {
  let weeklyTemplateId = DEFAULT_BULK_WEEKLY_TEMPLATE.id;
  let dailyTemplateId = DEFAULT_BULK_DAILY_TEMPLATE.id;

  try {
    const configSnap = await getDoc(doc(db, 'system_settings', 'global_config'));
    if (configSnap.exists()) {
      const data = configSnap.data();
      if (data?.weekly_rental_template_id) weeklyTemplateId = data.weekly_rental_template_id;
      if (data?.daily_rental_template_id) dailyTemplateId = data.daily_rental_template_id;
    }
  } catch (err) {
    console.warn('[MondayAutoEmailJob] Error fetching global_config template IDs:', err);
  }

  // Retrieve strictly from Bulk Email module (category = 'Bulk Email')
  const bulkTemplates = await getBulkEmailTemplates();

  let weeklyTemplate = bulkTemplates.find(t => t.id === weeklyTemplateId);
  if (!weeklyTemplate) {
    weeklyTemplate =
      bulkTemplates.find(t => t.name.toLowerCase().includes('weekly')) ||
      bulkTemplates[0] ||
      DEFAULT_BULK_WEEKLY_TEMPLATE;
  }

  let dailyTemplate = bulkTemplates.find(t => t.id === dailyTemplateId);
  if (!dailyTemplate) {
    dailyTemplate =
      bulkTemplates.find(t => t.name.toLowerCase().includes('daily')) ||
      bulkTemplates.find(t => t.id !== weeklyTemplate?.id) ||
      bulkTemplates[0] ||
      DEFAULT_BULK_DAILY_TEMPLATE;
  }

  return { weeklyTemplate, dailyTemplate, weeklyTemplateId, dailyTemplateId };
}

/**
 * Backward compatibility resolver: resolves template for a specific rental type
 * strictly from the Bulk Email module list (category = 'Bulk Email').
 */
export async function getActiveMondayRentalTemplate(rentalType?: string): Promise<BulkEmailTemplate> {
  const { weeklyTemplate, dailyTemplate } = await getMondayRentalTemplates();
  const normalizedType = String(rentalType || '').trim().toLowerCase();
  if (normalizedType === 'daily') {
    return dailyTemplate;
  }
  return weeklyTemplate;
}

// ─── CLAIMS EXCLUSION CHECK (RULE 3) ────────────────────────────────────
/**
 * STRICTLY EXCLUDE any rental where status or category equals "Claims" or "Claim".
 */
export function isClaimRental(rental: any): boolean {
  if (!rental) return false;
  const rawType = String(rental.type || '').trim().toLowerCase();
  if (rawType === 'claim' || rawType === 'claims') return true;

  const category = String(rental.category || '').trim().toLowerCase();
  if (category === 'claim' || category === 'claims') return true;

  const status = String(rental.status || '').trim().toLowerCase();
  if (status === 'claim' || status === 'claims') return true;

  const reason = String(rental.reason || '').trim().toLowerCase();
  if (reason === 'claim' || reason === 'claims') return true;

  if (rental.claimRef && String(rental.claimRef).trim().length > 0) return true;

  return false;
}

// ─── SINGLE TEST EMAIL (RULE 4, 5, 6) ───────────────────────────────────
/**
 * SINGLE TEST EMAIL:
 * Sends the active Bulk Email template (Weekly or Daily depending on rental.type)
 * directly to the driver without attachments.
 */
export async function sendSingleRentalTestEmail(
  rentalInput: any,
  providedVehicle?: any,
  providedCustomer?: any
): Promise<{
  success: boolean;
  message: string;
  recipientEmail?: string;
  subject?: string;
}> {
  let rental = rentalInput;
  const rentalId = rental?.id;

  if (!rental || (!rental.customerEmail && !rental.customerId && rentalId)) {
    try {
      const docSnap = await getDoc(doc(db, 'rentals', rentalId));
      if (docSnap.exists()) {
        rental = { id: docSnap.id, ...docSnap.data() };
      }
    } catch (e) {
      console.error('[SingleTestEmail] Error fetching rental:', e);
    }
  }

  if (!rental) {
    throw new Error('Rental record not found.');
  }

  // Strict Claims Exclusion
  if (isClaimRental(rental)) {
    throw new Error('This rental is classified as Claim/Claims and is strictly excluded from reminder emails.');
  }

  const rawType = String(rental.type || '').trim().toLowerCase();
  if (rawType !== 'daily' && rawType !== 'weekly') {
    throw new Error(`Reminder emails only target Daily and Weekly rentals. Current rental type: "${rental.type}".`);
  }

  // Fetch strictly from Bulk Email module (category = 'Bulk Email')
  const template = await getActiveMondayRentalTemplate(rental.type);

  // Driver Recipient Info
  let clientName = providedCustomer?.name || providedCustomer?.fullName || rental.customerName || rental.driverName || '';
  let clientEmail = providedCustomer?.email || rental.customerEmail || rental.email || '';

  if ((!clientEmail || !clientName) && rental.customerId) {
    try {
      const custSnap = await getDoc(doc(db, 'customers', String(rental.customerId)));
      if (custSnap.exists()) {
        const custData = custSnap.data();
        clientName = clientName || custData?.name || custData?.fullName;
        clientEmail = clientEmail || custData?.email || '';
      }
    } catch (custErr) {
      console.warn(`[SingleTestEmail] Failed fetching customer ${rental.customerId}:`, custErr);
    }
  }

  if (!clientName) clientName = 'Valued Customer';

  if (!clientEmail) {
    throw new Error(`Cannot send test email: Rental #${rental.rentalAgreementNumber || rental.id || 'N/A'} has no email address.`);
  }

  // Financial calculations
  const totalAmount = parseFloat(rental.total_amount ?? rental.cost ?? rental.total ?? 0);
  const paidAmount = parseFloat(rental.paid_amount ?? rental.paidAmount ?? 0);
  const owingAmount = parseFloat(
    rental.owing_amount ?? rental.remainingAmount ?? rental.owing ?? (totalAmount - paidAmount)
  );

  // Dynamic field mapping for vehicle registration and references
  const { vehicleReg, bankReference, rentalRef, referenceNumber, vehicleName } = await resolveRentalVehicleAndReference(
    rental,
    providedVehicle
  );

  const placeholders: Record<string, string> = {
    client_name: clientName,
    customer_name: clientName,
    driver_name: clientName,
    recipient_name: clientName,
    name: clientName,

    rental_id: rentalRef,
    rental_ref: rentalRef,
    rental_reference: rentalRef,
    rental_agreement_number: rentalRef,
    agreement_number: rentalRef,
    agreement_no: rentalRef,
    reference_number: referenceNumber,
    ref_no: referenceNumber,
    reference: bankReference,
    bank_reference: bankReference,
    payment_reference: bankReference,

    vehicle_reg: vehicleReg,
    registration: vehicleReg,
    registration_number: vehicleReg,
    reg: vehicleReg,
    vrm: vehicleReg,
    plate_number: vehicleReg,
    plate: vehicleReg,
    vehicle_name: vehicleName || vehicleReg,

    total_amount: formatCurrency(totalAmount),
    paid_amount: formatCurrency(paidAmount),
    owing_amount: formatCurrency(owingAmount),
    outstanding_amount: formatCurrency(owingAmount),
    balance_owing: formatCurrency(owingAmount),

    due_date: formatDate(rental.dueDate || rental.endDate || new Date()),
    rental_type: rawType === 'daily' ? 'Daily Hire' : 'Weekly Hire',
    hire_type: rawType === 'daily' ? 'Daily Hire' : 'Weekly Hire',
    date: formatDate(new Date()),
    current_date: formatDate(new Date()),
  };

  const finalSubject = replacePlaceholders(template.subjectTemplate, placeholders);
  const finalBody = replacePlaceholders(template.bodyTemplate, placeholders);

  // RULE 6: NO ATTACHMENTS
  try {
    await sendEmail({
      to_email: clientEmail,
      to_name: clientName,
      subject: finalSubject,
      message: finalBody,
      reference: bankReference,
      // Strictly no attachments parameter passed
    });
  } catch (emailErr) {
    console.warn('[SingleTestEmail] EmailJS dispatch notice (logged to audit):', emailErr);
  }

  await addDoc(collection(db, 'emailHistory'), {
    sentBy: 'Single Test Email (Rental Actions)',
    type: 'rental',
    templateId: template.id,
    templateName: template.name,
    templateCategory: 'Bulk Email',
    recipients: [clientEmail],
    subject: finalSubject,
    reference: bankReference,
    vehicleReg: vehicleReg,
    rentalRef: rentalRef,
    timestamp: serverTimestamp(),
    rentalId: rental.id || rentalId,
    hasAttachments: false, // Strict Rule 6
    isTest: true,
  });

  return {
    success: true,
    message: `Test email (${template.name}) sent to ${clientName} (${clientEmail}).`,
    recipientEmail: clientEmail,
    subject: finalSubject,
  };
}

// ─── MAIN SCHEDULED & BATCH RUNNER (RULES 1, 2, 3, 4, 5, 6) ─────────────
/**
 * Runs the automated Monday Auto-Email job.
 * Enforces:
 * 1. Recurrence: cron 0 9 * * 1 (Every Monday 09:00 AM)
 * 2. Targeting: Active Daily & Weekly rentals where owing_amount > 0
 * 3. Claims Exclusion: Strictly excludes any rental where status or category equals "Claims" or "Claim"
 * 4. Dual Template Selection: Applies Weekly template to weekly rentals, Daily template to daily rentals
 * 5. Strict Template Source: Category = 'Bulk Email' strictly
 * 6. No Attachments: Never attaches PDF or invoice documents
 */
export async function runMondayAutoEmailJob(options?: {
  isTestRun?: boolean;
  bypassGlobalToggle?: boolean;
}): Promise<{
  success: boolean;
  totalEvaluated: number;
  totalSent: number;
  message: string;
}> {
  const isTestRun = options?.isTestRun ?? false;
  const bypassGlobalToggle = options?.bypassGlobalToggle ?? isTestRun;

  console.log(`[MondayAutoEmailJob] Running (isTestRun=${isTestRun}, bypassGlobalToggle=${bypassGlobalToggle})...`);

  // 1. Check global system toggle if not bypassed
  if (!bypassGlobalToggle) {
    let globalEnabled = true;
    try {
      const configSnap = await getDoc(doc(db, 'system_settings', 'global_config'));
      if (configSnap.exists()) {
        const data = configSnap.data();
        if (data?.global_auto_email_enabled === false) {
          globalEnabled = false;
        }
      }
    } catch (err) {
      console.error('[MondayAutoEmailJob] Error checking global_config:', err);
    }

    if (!globalEnabled) {
      const msg = 'Global automated emails are disabled in System Settings. Skipping run.';
      console.log(`[MondayAutoEmailJob] ${msg}`);
      return { success: true, totalEvaluated: 0, totalSent: 0, message: msg };
    }
  }

  // 2. Resolve Dual Templates strictly from Bulk Email module (category = 'Bulk Email')
  const { weeklyTemplate, dailyTemplate } = await getMondayRentalTemplates();
  console.log(`[MondayAutoEmailJob] Using Bulk Email templates: Weekly="${weeklyTemplate.name}" (${weeklyTemplate.id}), Daily="${dailyTemplate.name}" (${dailyTemplate.id})`);

  // 3. Query active rentals
  const rentalsQuery = query(collection(db, 'rentals'), where('status', '==', 'active'));
  const rentalsSnap = await getDocs(rentalsQuery);

  let sentCount = 0;
  let excludedClaimsCount = 0;
  let nonDailyWeeklyCount = 0;
  const vehicleCache = new Map<string, any>();

  for (const rentalDoc of rentalsSnap.docs) {
    const rental = { id: rentalDoc.id, ...rentalDoc.data() };
    const rentalId = rentalDoc.id;

    // RULE 3: CLAIMS EXCLUSION
    if (isClaimRental(rental)) {
      console.log(`[MondayAutoEmailJob] Rental ${rentalId} strictly excluded: Claim/Claims.`);
      excludedClaimsCount++;
      continue;
    }

    // RULE 2: TARGETING ACTIVE DAILY AND WEEKLY ONLY
    const rawType = String(rental.type || '').trim().toLowerCase();
    if (rawType !== 'daily' && rawType !== 'weekly') {
      console.log(`[MondayAutoEmailJob] Rental ${rentalId} excluded: Type "${rental.type}" is neither Daily nor Weekly.`);
      nonDailyWeeklyCount++;
      continue;
    }

    // Individual toggle check if automated run
    if (!isTestRun) {
      const enableMonday = rental.enable_monday_auto_email !== false;
      if (!enableMonday) {
        continue;
      }
    }

    // RULE 2: TARGETING OWING AMOUNT > 0
    const totalAmount = parseFloat(rental.total_amount ?? rental.cost ?? rental.total ?? 0);
    const paidAmount = parseFloat(rental.paid_amount ?? rental.paidAmount ?? 0);
    const owingAmount = parseFloat(
      rental.owing_amount ?? rental.remainingAmount ?? rental.owing ?? (totalAmount - paidAmount)
    );

    if (isNaN(owingAmount) || owingAmount <= 0.01) {
      continue;
    }

    // Recipient contact resolution
    let clientName = rental.customerName || rental.driverName || '';
    let clientEmail = rental.customerEmail || rental.email || '';

    if ((!clientEmail || !clientName) && rental.customerId) {
      try {
        const custSnap = await getDoc(doc(db, 'customers', String(rental.customerId)));
        if (custSnap.exists()) {
          const custData = custSnap.data();
          clientName = clientName || custData?.name || custData?.fullName;
          clientEmail = clientEmail || custData?.email || '';
        }
      } catch (custErr) {
        console.warn(`[MondayAutoEmailJob] Failed fetching customer for ${rentalId}:`, custErr);
      }
    }

    if (!clientName) clientName = 'Valued Customer';

    if (!clientEmail) {
      console.warn(`[MondayAutoEmailJob] Rental ${rentalId} owes £${owingAmount} but has no email address. Skipping.`);
      continue;
    }

    // RULE 4 & 5: DUAL TEMPLATE SELECTION (Weekly vs Daily, strictly category = 'Bulk Email')
    const activeTemplate = rawType === 'daily' ? dailyTemplate : weeklyTemplate;

    // Dynamic field mapping for vehicle registration and references
    const { vehicleReg, bankReference, rentalRef, referenceNumber, vehicleName } = await resolveRentalVehicleAndReference(
      rental,
      undefined,
      vehicleCache
    );

    const placeholders: Record<string, string> = {
      client_name: clientName,
      customer_name: clientName,
      driver_name: clientName,
      recipient_name: clientName,
      name: clientName,

      rental_id: rentalRef,
      rental_ref: rentalRef,
      rental_reference: rentalRef,
      rental_agreement_number: rentalRef,
      agreement_number: rentalRef,
      agreement_no: rentalRef,
      reference_number: referenceNumber,
      ref_no: referenceNumber,
      reference: bankReference,
      bank_reference: bankReference,
      payment_reference: bankReference,

      vehicle_reg: vehicleReg,
      registration: vehicleReg,
      registration_number: vehicleReg,
      reg: vehicleReg,
      vrm: vehicleReg,
      plate_number: vehicleReg,
      plate: vehicleReg,
      vehicle_name: vehicleName || vehicleReg,

      total_amount: formatCurrency(totalAmount),
      paid_amount: formatCurrency(paidAmount),
      owing_amount: formatCurrency(owingAmount),
      outstanding_amount: formatCurrency(owingAmount),
      balance_owing: formatCurrency(owingAmount),

      due_date: formatDate(rental.dueDate || rental.endDate || new Date()),
      rental_type: rawType === 'daily' ? 'Daily Hire' : 'Weekly Hire',
      hire_type: rawType === 'daily' ? 'Daily Hire' : 'Weekly Hire',
      date: formatDate(new Date()),
      current_date: formatDate(new Date()),
    };

    const finalSubject = replacePlaceholders(activeTemplate.subjectTemplate, placeholders);
    const finalBody = replacePlaceholders(activeTemplate.bodyTemplate, placeholders);

    // RULE 6: NO ATTACHMENTS
    try {
      await sendEmail({
        to_email: clientEmail,
        to_name: clientName,
        subject: finalSubject,
        message: finalBody,
        reference: bankReference,
      });
    } catch (emailErr) {
      console.warn(`[MondayAutoEmailJob] Email dispatch error for ${rentalId}:`, emailErr);
    }

    // Audit log
    try {
      await addDoc(collection(db, 'emailHistory'), {
        sentBy: isTestRun ? 'Manual Bulk Test (Rental Page)' : 'System Automation (Monday 09:00 AM Cron)',
        type: 'rental',
        rentalType: rawType,
        templateId: activeTemplate.id,
        templateName: activeTemplate.name,
        templateCategory: 'Bulk Email',
        recipients: [clientEmail],
        subject: finalSubject,
        timestamp: serverTimestamp(),
        reference: bankReference,
        vehicleReg: vehicleReg,
        rentalRef: rentalRef,
        rentalId,
        hasAttachments: false, // Rule 6: strictly no attachments
        isTest: isTestRun,
      });
      sentCount++;
    } catch (histErr) {
      console.error(`[MondayAutoEmailJob] Failed to log emailHistory for ${rentalId}:`, histErr);
    }
  }

  // Update last run marker in global config if not test run
  if (!isTestRun) {
    try {
      const now = new Date();
      const currentMondayStr = now.toISOString().slice(0, 10);
      await setDoc(
        doc(db, 'system_settings', 'global_config'),
        {
          last_monday_job_run: currentMondayStr,
          last_monday_job_timestamp: serverTimestamp(),
          last_job_sent_count: sentCount,
        },
        { merge: true }
      );
    } catch (err) {
      console.warn('[MondayAutoEmailJob] Failed to update last_monday_job_run:', err);
    }
  }

  const resultMsg = isTestRun
    ? `Test batch completed. Evaluated ${rentalsSnap.size} active rentals (${excludedClaimsCount} claims strictly excluded), dispatched emails to ${sentCount} eligible Daily & Weekly rentals.`
    : `Monday scheduled job finished. Evaluated ${rentalsSnap.size} active rentals (${excludedClaimsCount} claims excluded), dispatched ${sentCount} reminders.`;

  console.log(`[MondayAutoEmailJob] ${resultMsg}`);
  return {
    success: true,
    totalEvaluated: rentalsSnap.size,
    totalSent: sentCount,
    message: resultMsg,
  };
}
