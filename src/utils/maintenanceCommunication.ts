// src/utils/maintenanceCommunication.ts

import { MaintenanceLog, Vehicle, Customer, Rental } from '../types';
import { ServiceCenter } from './serviceCenters';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { formatWhatsAppNumber, buildWaMeLink } from './whatsapp';
import { sendEmail } from './emailService';
import { logWhatsappHistory } from '../hooks/useWhatsappHistory';
import { logEmailHistory } from '../hooks/useEmailHistory';

export type MaintenanceRecipientType = 'driver' | 'garage';
export type MaintenanceChannelMode = 'whatsapp' | 'email';

export interface ResolvedMaintenanceContext {
  logId: string;
  orderNumber: string;
  serviceType: string;
  scheduledDate: string;
  rawDate?: Date;

  // Vehicle
  vehicleId: string;
  vehicleReg: string;
  vehicleMakeModel: string;

  // Driver & Dynamic Active Rental resolution
  hasActiveRental: boolean;
  activeRentalId?: string;
  rentalAgreementNumber?: string;
  driverName: string;
  driverPhone: string;
  driverEmail: string;

  // Garage
  garageName: string;
  garageAddress: string;
  garagePhone: string;
  garageEmail: string;
}

export interface MaintenanceTemplateOption {
  id: string;
  name: string;
  recipientType: MaintenanceRecipientType;
  channel: MaintenanceChannelMode;
  subjectTemplate: string;
  bodyTemplate: string;
}

/**
 * Clean and format service type names (e.g. 'yearly-service' -> 'Yearly Service', 'mot' -> 'MOT')
 */
export function formatServiceType(typeStr?: string): string {
  if (!typeStr) return 'General Maintenance';
  const upperExceptions: Record<string, string> = {
    mot: 'MOT',
    tfl: 'TfL Inspection',
    nsl: 'NSL Inspection',
    iem: 'IEM',
    erad: 'ERAD',
  };
  const lower = typeStr.toLowerCase().trim();
  if (upperExceptions[lower]) return upperExceptions[lower];

  return lower
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Format a Date object to DD/MM/YYYY
 */
export function formatDisplayDate(dateVal?: any): string {
  if (!dateVal) return 'N/A';
  let d: Date;
  if (typeof dateVal?.toDate === 'function') {
    d = dateVal.toDate();
  } else if (dateVal instanceof Date) {
    d = dateVal;
  } else {
    d = new Date(dateVal);
  }
  if (isNaN(d.getTime())) return 'N/A';

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Resolves context for a maintenance log record including driver (from active rental), vehicle, and garage details
 */
export function resolveMaintenanceContext(
  log: MaintenanceLog,
  vehiclesMap: Record<string, Vehicle> = {},
  customersMap: Record<string, Customer> = {},
  serviceCenters: ServiceCenter[] = [],
  rentals: Rental[] = []
): ResolvedMaintenanceContext {
  const logId = log.id || '';
  const orderNumber = log.orderNumber || log.id?.slice(0, 10) || 'N/A';
  const serviceType = formatServiceType(log.type);
  const scheduledDate = formatDisplayDate(log.date);

  // Vehicle resolution
  const vehicleObj = log.vehicleId
    ? vehiclesMap[log.vehicleId]
    : Object.values(vehiclesMap).find(
        (v) =>
          v.registrationNumber &&
          log.vehicleDetails?.registrationNumber &&
          v.registrationNumber.trim().toUpperCase() ===
            log.vehicleDetails.registrationNumber.trim().toUpperCase()
      );
  const vehicleId = vehicleObj?.id || log.vehicleId || '';
  const vehicleReg =
    log.vehicleDetails?.registrationNumber ||
    vehicleObj?.registrationNumber ||
    'N/A';
  const vehicleMakeModel =
    `${log.vehicleDetails?.make || vehicleObj?.make || ''} ${
      log.vehicleDetails?.model || vehicleObj?.model || ''
    }`.trim() || 'Fleet Vehicle';

  // 1. DYNAMIC DRIVER LOOKUP FROM ACTIVE RENTAL
  // Automatically look up the active rental associated with the maintenance record's vehicle_id
  let activeRental: Rental | undefined = undefined;

  if (vehicleId || vehicleReg !== 'N/A') {
    // 1a. Check for rental with matching vehicleId or registration and status === 'active'
    const matchingRentals = rentals.filter((r) => {
      const vIdMatch = Boolean(vehicleId && (r.vehicleId === vehicleId || (vehicleObj && r.vehicleId === vehicleObj.id)));
      const regMatch = Boolean(
        vehicleReg !== 'N/A' &&
        (r as any).vehicleDetails?.registrationNumber &&
        String((r as any).vehicleDetails.registrationNumber).trim().toUpperCase() === vehicleReg.trim().toUpperCase()
      );
      return (vIdMatch || regMatch) && r.status === 'active';
    });

    if (matchingRentals.length > 0) {
      // Pick most recently started active rental
      matchingRentals.sort((a, b) => {
        const timeA = a.startDate instanceof Date ? a.startDate.getTime() : new Date(a.startDate).getTime();
        const timeB = b.startDate instanceof Date ? b.startDate.getTime() : new Date(b.startDate).getTime();
        return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
      });
      activeRental = matchingRentals[0];
    }

    // 1b. Fallback: If no explicit status === 'active', check if current date is within rental start and end date
    if (!activeRental) {
      const now = new Date();
      activeRental = rentals.find((r) => {
        const vIdMatch = Boolean(vehicleId && (r.vehicleId === vehicleId || (vehicleObj && r.vehicleId === vehicleObj.id)));
        const regMatch = Boolean(
          vehicleReg !== 'N/A' &&
          (r as any).vehicleDetails?.registrationNumber &&
          String((r as any).vehicleDetails.registrationNumber).trim().toUpperCase() === vehicleReg.trim().toUpperCase()
        );
        if (!vIdMatch && !regMatch) return false;
        if (r.status === 'completed' || r.status === 'cancelled') return false;
        const s = r.startDate instanceof Date ? r.startDate : new Date(r.startDate);
        const e = r.endDate instanceof Date ? r.endDate : new Date(r.endDate);
        return !isNaN(s.getTime()) && !isNaN(e.getTime()) && now >= s && now <= e;
      });
    }
  }

  // Check if active rental exists
  const hasActiveRental = Boolean(activeRental);

  let driverName = '';
  let driverPhone = '';
  let driverEmail = '';
  const rentalAgreementNumber = activeRental?.rentalAgreementNumber || undefined;

  if (activeRental) {
    const customer = activeRental.customerId ? customersMap[activeRental.customerId] : undefined;
    driverName =
      customer?.name ||
      (customer as any)?.fullName ||
      (customer ? `${(customer as any).firstName || ''} ${(customer as any).lastName || ''}`.trim() : '') ||
      (activeRental as any).customerName ||
      (activeRental as any).driverName ||
      '';
    driverPhone =
      customer?.mobile ||
      (customer as any)?.phone ||
      (activeRental as any).customerMobile ||
      (activeRental as any).driverPhone ||
      '';
    driverEmail =
      customer?.email ||
      (activeRental as any).customerEmail ||
      (activeRental as any).driverEmail ||
      '';
  }

  // Garage resolution
  const garageName = log.serviceProvider || 'Service Garage';
  const garageAddress = log.location || '';

  // Match in service centers
  const matchedCenter = serviceCenters.find(
    (c) =>
      c.name.toLowerCase().trim() === garageName.toLowerCase().trim() ||
      garageName.toLowerCase().includes(c.name.toLowerCase()) ||
      c.name.toLowerCase().includes(garageName.toLowerCase())
  );

  const garagePhone = matchedCenter?.phone || '';
  const garageEmail = matchedCenter?.email || '';
  const resolvedAddress = matchedCenter
    ? `${matchedCenter.address || ''} ${matchedCenter.postcode || ''}`.trim() || garageAddress
    : garageAddress;

  return {
    logId,
    orderNumber,
    serviceType,
    scheduledDate,
    rawDate: log.date,
    vehicleId,
    vehicleReg,
    vehicleMakeModel,
    hasActiveRental,
    activeRentalId: activeRental?.id,
    rentalAgreementNumber,
    driverName,
    driverPhone,
    driverEmail,
    garageName,
    garageAddress: resolvedAddress,
    garagePhone,
    garageEmail,
  };
}

/**
 * Replace placeholders based on recipient context:
 * - Driver placeholders: {driver_name}, {vehicle_reg}, {maintenance_id}, {service_type}, {scheduled_date}, {garage_name}, {garage_address}.
 * - Garage placeholders: {garage_name}, {vehicle_reg}, {maintenance_id}, {service_type}, {scheduled_date}, {driver_name}, {driver_phone}.
 */
export function replaceMaintenancePlaceholders(
  templateText: string,
  ctx: ResolvedMaintenanceContext,
  recipientType: MaintenanceRecipientType = 'driver'
): string {
  let content = templateText || '';

  const driverNameVal =
    ctx.driverName ||
    (recipientType === 'driver' ? 'Valued Driver' : 'Unassigned / No Active Driver');
  const driverPhoneVal = ctx.driverPhone || 'N/A';

  const replacements: Record<string, string> = {
    // User-specified Driver & Garage placeholders:
    '{driver_name}': driverNameVal,
    '{vehicle_reg}': ctx.vehicleReg,
    '{maintenance_id}': ctx.orderNumber,
    '{service_type}': ctx.serviceType,
    '{scheduled_date}': ctx.scheduledDate,
    '{garage_name}': ctx.garageName,
    '{garage_address}': ctx.garageAddress,
    '{driver_phone}': driverPhoneVal,

    // Case variations
    '{driver_Name}': driverNameVal,
    '{vehicle_Reg}': ctx.vehicleReg,
    '{maintenance_Id}': ctx.orderNumber,
    '{service_Type}': ctx.serviceType,
    '{scheduled_Date}': ctx.scheduledDate,
    '{garage_Name}': ctx.garageName,
    '{garage_Address}': ctx.garageAddress,
    '{driver_Phone}': driverPhoneVal,

    // Extra handy placeholders
    '{driver_email}': ctx.driverEmail || 'N/A',
    '{garage_phone}': ctx.garagePhone || 'N/A',
    '{garage_email}': ctx.garageEmail || 'N/A',
    '{vehicle_model}': ctx.vehicleMakeModel,
    '{client_name}': driverNameVal,
    '{rental_agreement}': ctx.rentalAgreementNumber || 'N/A',

    // Common Bracket placeholders
    '[Driver Name]': driverNameVal,
    '[Driver\'s Name]': driverNameVal,
    '[Customer Name]': driverNameVal,
    '[Recipient Name]': recipientType === 'driver' ? driverNameVal : ctx.garageName,
    '[Client Name]': driverNameVal,
    '[Driver Phone]': driverPhoneVal,
    '[Driver Mobile]': driverPhoneVal,
    '[Phone]': recipientType === 'driver' ? driverPhoneVal : ctx.garagePhone,
    '[Vehicle Reg]': ctx.vehicleReg,
    '[Vehicle Registration]': ctx.vehicleReg,
    '[Registration Number]': ctx.vehicleReg,
    '[Vehicle]': `${ctx.vehicleMakeModel} (${ctx.vehicleReg})`,
    '[Maintenance ID]': ctx.orderNumber,
    '[Order Number]': ctx.orderNumber,
    '[Order #]': ctx.orderNumber,
    '[Service Type]': ctx.serviceType,
    '[Maintenance Type]': ctx.serviceType,
    '[Type]': ctx.serviceType,
    '[Scheduled Date]': ctx.scheduledDate,
    '[Maintenance Date]': ctx.scheduledDate,
    '[the maintenance date]': ctx.scheduledDate,
    '[Date]': ctx.scheduledDate,
    '[Garage Name]': ctx.garageName,
    '[Garage]': ctx.garageName,
    '[Service Provider]': ctx.garageName,
    '[Service Center]': ctx.garageName,
    '[Garage Address]': ctx.garageAddress,
    '[Location]': ctx.garageAddress,
    '[Address]': ctx.garageAddress,
  };

  for (const [key, val] of Object.entries(replacements)) {
    content = content.split(key).join(val);
  }

  return content;
}

/**
 * Built-in default active templates for Driver and Garage across WhatsApp and Email
 */
export const DEFAULT_MAINTENANCE_TEMPLATES: MaintenanceTemplateOption[] = [
  // --- DRIVER TEMPLATES ---
  {
    id: 'maint_driver_scheduled_whatsapp',
    name: 'Driver: Maintenance Appointment Reminder (WhatsApp)',
    recipientType: 'driver',
    channel: 'whatsapp',
    subjectTemplate: 'Vehicle Maintenance Scheduled - {vehicle_reg}',
    bodyTemplate: `Dear {driver_name},

This is a reminder that your vehicle is scheduled for maintenance:

🚗 Vehicle: {vehicle_reg}
🔧 Service: {service_type}
📅 Date: {scheduled_date}
🔖 Reference: {maintenance_id}

📍 Garage Location:
{garage_name}
{garage_address}

Please ensure the vehicle is delivered promptly. If you have any questions or need to adjust your booking, please reply directly.

Best regards,
AIE Skyline Limited`,
  },
  {
    id: 'maint_driver_scheduled_email',
    name: 'Driver: Maintenance Booking Confirmation (Email)',
    recipientType: 'driver',
    channel: 'email',
    subjectTemplate: 'Maintenance Booking Confirmation - {vehicle_reg} [{service_type}]',
    bodyTemplate: `Dear {driver_name},

We have booked your vehicle in for its scheduled maintenance. Please find the confirmed details below:

• Vehicle Registration: {vehicle_reg}
• Work Order Reference: {maintenance_id}
• Service Type: {service_type}
• Scheduled Date: {scheduled_date}

Garage Details:
• Garage: {garage_name}
• Address: {garage_address}

Please ensure the vehicle arrives at the service centre on time. Maintaining your vehicle according to schedule ensures safe operating standards and keeps your contract in full compliance.

Kind regards,
Fleet Operations Team
AIE Skyline Limited`,
  },
  {
    id: 'maint_driver_service_due',
    name: 'Driver: Routine Service Due (WhatsApp & Email)',
    recipientType: 'driver',
    channel: 'whatsapp',
    subjectTemplate: 'Vehicle Service Due - {vehicle_reg}',
    bodyTemplate: `Dear {driver_name},

Your vehicle ({vehicle_reg}) has reached its service interval for {service_type}.

Service Reference: {maintenance_id}
Scheduled Date: {scheduled_date}
Garage: {garage_name} - {garage_address}

Please contact us if you need to confirm your drop-off window.

Best regards,
AIE Skyline Limited`,
  },

  // --- GARAGE TEMPLATES ---
  {
    id: 'maint_garage_work_order_email',
    name: 'Garage: Service Work Order & Vehicle Booking (Email)',
    recipientType: 'garage',
    channel: 'email',
    subjectTemplate: 'Maintenance Work Order: {vehicle_reg} - {service_type} ({maintenance_id})',
    bodyTemplate: `Dear {garage_name},

Please find the maintenance booking details for vehicle {vehicle_reg}:

📋 Work Order: {maintenance_id}
🔧 Service Type: {service_type}
📅 Scheduled Date: {scheduled_date}

Driver & Vehicle Details:
• Vehicle: {vehicle_reg}
• Driver Name: {driver_name}
• Driver Contact: {driver_phone}

Please carry out the requested service and notify fleet management once inspection and repairs are completed.

Kind regards,
Fleet Management
AIE Skyline Limited
Tel: 020 8050 5337`,
  },
  {
    id: 'maint_garage_work_order_whatsapp',
    name: 'Garage: Vehicle Booking Notification (WhatsApp)',
    recipientType: 'garage',
    channel: 'whatsapp',
    subjectTemplate: 'Vehicle Booking - {vehicle_reg}',
    bodyTemplate: `Dear {garage_name},

Maintenance booking confirmation for vehicle {vehicle_reg}:

Order #: {maintenance_id}
Service: {service_type}
Date: {scheduled_date}
Driver: {driver_name} ({driver_phone})

Please confirm receipt and let us know if additional parts or authorization are needed.

Kind regards,
AIE Skyline Limited`,
  },
  {
    id: 'maint_garage_repair_authorization',
    name: 'Garage: Repair Authorization (Email)',
    recipientType: 'garage',
    channel: 'email',
    subjectTemplate: 'Repair Authorization - {vehicle_reg} ({maintenance_id})',
    bodyTemplate: `Dear {garage_name},

We authorize the inspection and scheduled {service_type} for vehicle {vehicle_reg} on {scheduled_date}.

Order Reference: {maintenance_id}
Driver: {driver_name} ({driver_phone})

Please proceed with the initial assessment and provide an itemized invoice or estimate before conducting any non-standard repairs.

Best regards,
Fleet Maintenance Team
AIE Skyline Limited`,
  },
];

/**
 * Fetches active templates from Firestore `messageTemplates` where category is 'maintenance',
 * merging with the default templates.
 */
export async function fetchMaintenanceTemplates(): Promise<MaintenanceTemplateOption[]> {
  try {
    const snap = await getDocs(collection(db, 'messageTemplates'));

    const customTemplates: MaintenanceTemplateOption[] = [];
    snap.forEach((doc) => {
      const data = doc.data();
      const cat = String(data.category || '').toLowerCase().trim();
      if (cat === 'maintenance') {
        const rawName = data.name || 'Maintenance Template';
        const isGarage =
          data.recipientType === 'garage' ||
          rawName.toLowerCase().includes('garage') ||
          rawName.toLowerCase().includes('supplier') ||
          rawName.toLowerCase().includes('provider');

        customTemplates.push({
          id: doc.id,
          name: rawName,
          recipientType: isGarage ? 'garage' : 'driver',
          channel: data.channel === 'whatsapp' ? 'whatsapp' : 'email',
          subjectTemplate: data.subjectTemplate || data.subject || 'Maintenance Update - {vehicle_reg}',
          bodyTemplate: data.bodyTemplate || data.body || data.content || '',
        });
      }
    });

    if (customTemplates.length > 0) {
      // Merge with defaults avoiding duplicate IDs
      const customIds = new Set(customTemplates.map((t) => t.id));
      const filteredDefaults = DEFAULT_MAINTENANCE_TEMPLATES.filter((t) => !customIds.has(t.id));
      return [...customTemplates, ...filteredDefaults];
    }
  } catch (err) {
    console.warn('Could not fetch custom messageTemplates from Firestore, using defaults:', err);
  }

  return DEFAULT_MAINTENANCE_TEMPLATES;
}

/**
 * Execute a single WhatsApp action
 */
export async function executeMaintenanceWhatsApp(params: {
  phone: string;
  message: string;
  recipientName: string;
  recipientType: MaintenanceRecipientType;
  log: MaintenanceLog;
  userName?: string;
}): Promise<{ url: string }> {
  const digits = formatWhatsAppNumber(params.phone);
  if (!digits) {
    throw new Error('A valid phone number with country code is required for WhatsApp.');
  }

  const url = buildWaMeLink(digits, params.message);
  window.open(url, '_blank', 'noopener,noreferrer');

  // Log to whatsapp history
  try {
    await logWhatsappHistory({
      sentBy: params.userName || 'Admin',
      type: 'maintenance',
      templateId: 'maintenance_direct',
      recipients: [params.phone],
      subject: `Maintenance ${params.log.orderNumber || params.log.id}`,
      body: params.message,
      timestamp: new Date(),
    });
  } catch (err) {
    console.warn('Failed to log WhatsApp history:', err);
  }

  return { url };
}

/**
 * Execute a single Email action
 */
export async function executeMaintenanceEmail(params: {
  toEmail: string;
  toName: string;
  subject: string;
  message: string;
  recipientType: MaintenanceRecipientType;
  log: MaintenanceLog;
  userName?: string;
}): Promise<void> {
  if (!params.toEmail || !params.toEmail.includes('@')) {
    throw new Error('A valid email address is required to send this email.');
  }

  await sendEmail({
    to_email: params.toEmail,
    to_name: params.toName,
    subject: params.subject,
    message: params.message,
    reference: params.log.orderNumber || params.log.id,
  });

  // Log to email history
  try {
    await logEmailHistory({
      sentBy: params.userName || 'Admin',
      type: 'maintenance',
      templateId: 'maintenance_direct',
      recipients: [params.toEmail],
      subject: params.subject,
      timestamp: new Date(),
    });
  } catch (err) {
    console.warn('Failed to log Email history:', err);
  }
}
