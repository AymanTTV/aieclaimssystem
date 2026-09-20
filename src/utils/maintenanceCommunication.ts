// src/utils/maintenanceCommunication.ts

import { MaintenanceLog, Vehicle, Customer, Rental } from '../types';
import { ServiceCenter } from './serviceCenters';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { formatWhatsAppNumber, buildWaMeLink } from './whatsapp';
import { sendEmail } from './emailService';
import { logWhatsappHistory } from '../hooks/useWhatsappHistory';
import { logEmailHistory } from '../hooks/useEmailHistory';
import { emailTemplates } from '../constants/emailTemplates';

export type MaintenanceRecipientType = 'driver' | 'garage';
export type MaintenanceChannelMode = 'whatsapp' | 'email';

export interface ResolvedMaintenanceContext {
  logId: string;
  orderNumber: string;
  serviceType: string;
  scheduledDate: string;
  scheduledTime: string;
  scheduledDateTime: string;
  additionalNotes: string;
  description: string;
  notes: string;
  currentMileage?: number;
  nextServiceMileage?: number;
  partsRequired?: string;
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
  category?: string;
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
 * Parse a date value safely from Firestore Timestamp, Date, string, or number
 */
export function parseMaintenanceDate(dateVal?: any): Date | null {
  if (!dateVal) return null;
  if (typeof dateVal?.toDate === 'function') {
    const d = dateVal.toDate();
    return isNaN(d.getTime()) ? null : d;
  }
  if (dateVal instanceof Date) {
    return isNaN(dateVal.getTime()) ? null : dateVal;
  }
  if (typeof dateVal === 'string' || typeof dateVal === 'number') {
    const d = new Date(dateVal);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/**
 * Format a Date object to DD/MM/YYYY (e.g. "21/09/2026")
 */
export function formatDisplayDate(dateVal?: any): string {
  const d = parseMaintenanceDate(dateVal);
  if (!d) return 'N/A';

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Format appointment time in 12-hour AM/PM format (e.g. "10:00 AM")
 */
export function formatDisplayTime(dateVal?: any, explicitTime?: string): string {
  // 1. If explicit time string exists on record (e.g. log.time, log.appointmentTime, log.scheduledTime)
  if (explicitTime && typeof explicitTime === 'string' && explicitTime.trim()) {
    const trimmed = explicitTime.trim();
    if (/am|pm/i.test(trimmed)) {
      return trimmed.toUpperCase();
    }
    const match = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (match) {
      let hours = parseInt(match[1], 10);
      const minutes = match[2];
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      if (hours === 0) hours = 12;
      const hoursStr = String(hours).padStart(2, '0');
      return `${hoursStr}:${minutes} ${ampm}`;
    }
    return trimmed;
  }

  // 2. Parse from dateVal
  if (!dateVal) return '';
  if (typeof dateVal === 'string' && !dateVal.includes('T') && !dateVal.includes(':') && !dateVal.includes(' ')) {
    // Pure date string without time component
    return '';
  }

  const d = parseMaintenanceDate(dateVal);
  if (!d) return '';

  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  if (hours === 0) hours = 12;
  const hoursStr = String(hours).padStart(2, '0');
  return `${hoursStr}:${minutes} ${ampm}`;
}

/**
 * Format combined scheduled date and time value (e.g. "21/09/2026 at 10:00 AM")
 */
export function formatDisplayDateTime(dateVal?: any, explicitTime?: string): string {
  const dateStr = formatDisplayDate(dateVal);
  if (dateStr === 'N/A') return 'N/A';

  const timeStr = formatDisplayTime(dateVal, explicitTime);
  if (timeStr) {
    return `${dateStr} at ${timeStr}`;
  }
  return dateStr;
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

  // Time and Date-Time resolution
  const explicitTime =
    (log as any).time ||
    (log as any).appointmentTime ||
    (log as any).scheduledTime ||
    '';
  const scheduledTime = formatDisplayTime(log.date, explicitTime);
  const scheduledDateTime = formatDisplayDateTime(log.date, explicitTime);

  // Description and Notes resolution
  const logNotes = typeof log.notes === 'string' ? log.notes.trim() : '';
  const logDesc = typeof log.description === 'string' ? log.description.trim() : '';
  const additionalNotes = logNotes || logDesc || '';

  const currentMileage = typeof log.currentMileage === 'number' ? log.currentMileage : undefined;
  const nextServiceMileage = typeof log.nextServiceMileage === 'number' ? log.nextServiceMileage : undefined;
  const partsRequired =
    log.parts && log.parts.length > 0
      ? log.parts.map((p) => p.name).filter(Boolean).join(', ')
      : '';

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
    scheduledTime,
    scheduledDateTime,
    additionalNotes,
    description: logDesc,
    notes: logNotes,
    currentMileage,
    nextServiceMileage,
    partsRequired,
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
 * - Driver placeholders: {driver_name}, {vehicle_reg}, {maintenance_id}, {service_type}, {date_time}, {date}, {time}, {additional_notes}, {scheduled_date}, {garage_name}, {garage_address}.
 * - Garage placeholders: {garage_name}, {vehicle_reg}, {maintenance_id}, {service_type}, {date_time}, {date}, {time}, {additional_notes}, {scheduled_date}, {driver_name}, {driver_phone}.
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

  // If additional notes are empty or omitted:
  // Cleanly omit dedicated "• Additional Notes: [Additional Notes]" or "Additional Notes: {additional_notes}" lines
  if (!ctx.additionalNotes || !ctx.additionalNotes.trim()) {
    content = content.replace(
      /^[ \t]*(?:[•\-*]|🔹)?\s*(?:Additional\s+Notes|Notes)\s*:\s*(?:\[Additional Notes\]|\[additional notes\]|\{additional_notes\}|\{notes\})[ \t]*\r?\n?/gim,
      ''
    );
  }

  const replacements: Record<string, string> = {
    // 1. DATE & TIME (e.g. "21/09/2026 at 10:00 AM")
    '[Date & Time of Appointment]': ctx.scheduledDateTime,
    '[Preferred Date & Time]': ctx.scheduledDateTime,
    '[Appointment Date & Time]': ctx.scheduledDateTime,
    '[Scheduled Date & Time]': ctx.scheduledDateTime,
    '[Date and Time]': ctx.scheduledDateTime,
    '[date and time]': ctx.scheduledDateTime,
    '[Date & Time]': ctx.scheduledDateTime,
    '[Date & time]': ctx.scheduledDateTime,
    '[date & time]': ctx.scheduledDateTime,
    '{scheduled_date_time}': ctx.scheduledDateTime,
    '{appointment_date_time}': ctx.scheduledDateTime,
    '{date_and_time}': ctx.scheduledDateTime,
    '{date_time}': ctx.scheduledDateTime,
    '{date_Time}': ctx.scheduledDateTime,
    '{Date_Time}': ctx.scheduledDateTime,
    '{dateTime}': ctx.scheduledDateTime,
    '{DateTime}': ctx.scheduledDateTime,

    // 2. ADDITIONAL NOTES (mapped to maintenance description or notes, or empty string)
    '[Additional Notes]': ctx.additionalNotes,
    '[Additional notes]': ctx.additionalNotes,
    '[additional notes]': ctx.additionalNotes,
    '[Maintenance Notes]': ctx.additionalNotes,
    '[Notes]': ctx.additionalNotes,
    '[notes]': ctx.additionalNotes,
    '[Description]': ctx.description || ctx.additionalNotes,
    '[description]': ctx.description || ctx.additionalNotes,
    '{additional_notes}': ctx.additionalNotes,
    '{additionalNotes}': ctx.additionalNotes,
    '{Additional_Notes}': ctx.additionalNotes,
    '{maintenance_notes}': ctx.additionalNotes,
    '{notes}': ctx.additionalNotes,
    '{Notes}': ctx.additionalNotes,
    '{description}': ctx.description || ctx.additionalNotes,
    '{Description}': ctx.description || ctx.additionalNotes,

    // 3. DATE
    '[Scheduled Date]': ctx.scheduledDate,
    '[scheduled date]': ctx.scheduledDate,
    '[Maintenance Date]': ctx.scheduledDate,
    '[maintenance date]': ctx.scheduledDate,
    '[Appointment Date]': ctx.scheduledDate,
    '[the maintenance date]': ctx.scheduledDate,
    '[Date]': ctx.scheduledDate,
    '[date]': ctx.scheduledDate,
    '{scheduled_date}': ctx.scheduledDate,
    '{scheduled_Date}': ctx.scheduledDate,
    '{scheduledDate}': ctx.scheduledDate,
    '{appointment_date}': ctx.scheduledDate,
    '{date}': ctx.scheduledDate,
    '{Date}': ctx.scheduledDate,

    // 4. TIME
    '[Scheduled Time]': ctx.scheduledTime,
    '[scheduled time]': ctx.scheduledTime,
    '[Appointment Time]': ctx.scheduledTime,
    '[appointment time]': ctx.scheduledTime,
    '[Time]': ctx.scheduledTime,
    '[time]': ctx.scheduledTime,
    '{scheduled_time}': ctx.scheduledTime,
    '{scheduled_Time}': ctx.scheduledTime,
    '{scheduledTime}': ctx.scheduledTime,
    '{appointment_time}': ctx.scheduledTime,
    '{time}': ctx.scheduledTime,
    '{Time}': ctx.scheduledTime,

    // 5. VEHICLE REGISTRATION (PRESERVED)
    '{vehicle_reg}': ctx.vehicleReg,
    '{vehicle_Reg}': ctx.vehicleReg,
    '{vehicleReg}': ctx.vehicleReg,
    '[Vehicle Reg]': ctx.vehicleReg,
    '[Vehicle Registration]': ctx.vehicleReg,
    '[Registration Number]': ctx.vehicleReg,
    '[Reg]': ctx.vehicleReg,
    '[Registration]': ctx.vehicleReg,

    // 6. SERVICE TYPE (PRESERVED)
    '{service_type}': ctx.serviceType,
    '{service_Type}': ctx.serviceType,
    '{serviceType}': ctx.serviceType,
    '[Service Type]': ctx.serviceType,
    '[Maintenance Type]': ctx.serviceType,
    '[Type]': ctx.serviceType,

    // 7. REFERENCE & ORDER NUMBERS (PRESERVED)
    '{maintenance_id}': ctx.orderNumber,
    '{maintenance_Id}': ctx.orderNumber,
    '{maintenanceId}': ctx.orderNumber,
    '[Maintenance ID]': ctx.orderNumber,
    '[Order Number]': ctx.orderNumber,
    '[Order #]': ctx.orderNumber,
    '[Reference Number]': ctx.orderNumber,
    '[Reference]': ctx.orderNumber,
    '[Work Order]': ctx.orderNumber,

    // 8. DRIVER DETAILS (PRESERVED)
    '{driver_name}': driverNameVal,
    '{driver_Name}': driverNameVal,
    '{driverName}': driverNameVal,
    '{client_name}': driverNameVal,
    '[Driver Name]': driverNameVal,
    '[Driver\'s Name]': driverNameVal,
    '[Customer Name]': driverNameVal,
    '[Recipient Name]': recipientType === 'driver' ? driverNameVal : ctx.garageName,
    '[Client Name]': driverNameVal,
    '{driver_phone}': driverPhoneVal,
    '{driver_Phone}': driverPhoneVal,
    '{driverPhone}': driverPhoneVal,
    '[Driver Phone]': driverPhoneVal,
    '[Driver Mobile]': driverPhoneVal,
    '[Phone]': recipientType === 'driver' ? driverPhoneVal : ctx.garagePhone,
    '{driver_email}': ctx.driverEmail || 'N/A',
    '{driverEmail}': ctx.driverEmail || 'N/A',
    '[Driver Email]': ctx.driverEmail || 'N/A',
    '[Email]': recipientType === 'driver' ? (ctx.driverEmail || 'N/A') : (ctx.garageEmail || 'N/A'),

    // 9. GARAGE DETAILS (PRESERVED)
    '{garage_name}': ctx.garageName,
    '{garage_Name}': ctx.garageName,
    '{garageName}': ctx.garageName,
    '[Garage Name]': ctx.garageName,
    '[Garage]': ctx.garageName,
    '[Service Provider]': ctx.garageName,
    '[Service Center]': ctx.garageName,
    '{garage_address}': ctx.garageAddress,
    '{garage_Address}': ctx.garageAddress,
    '{garageAddress}': ctx.garageAddress,
    '[Garage Address]': ctx.garageAddress,
    '[Location]': ctx.garageAddress,
    '[Address]': ctx.garageAddress,
    '{garage_phone}': ctx.garagePhone || 'N/A',
    '[Garage Phone]': ctx.garagePhone || 'N/A',
    '{garage_email}': ctx.garageEmail || 'N/A',
    '[Garage Email]': ctx.garageEmail || 'N/A',

    // 10. VEHICLE & RENTAL EXTENSIONS (PRESERVED)
    '{vehicle_model}': ctx.vehicleMakeModel,
    '[Vehicle]': `${ctx.vehicleMakeModel} (${ctx.vehicleReg})`,
    '[Vehicle Make/Model]': ctx.vehicleMakeModel,
    '{rental_agreement}': ctx.rentalAgreementNumber || 'N/A',
    '[Rental Agreement]': ctx.rentalAgreementNumber || 'N/A',
    '[Rental Agreement Number]': ctx.rentalAgreementNumber || 'N/A',
    '[Mileage]': ctx.currentMileage !== undefined ? String(ctx.currentMileage) : 'N/A',
    '[Current Mileage]': ctx.currentMileage !== undefined ? String(ctx.currentMileage) : 'N/A',
    '{mileage}': ctx.currentMileage !== undefined ? String(ctx.currentMileage) : 'N/A',
    '{current_mileage}': ctx.currentMileage !== undefined ? String(ctx.currentMileage) : 'N/A',
    '[NextMileage]': ctx.nextServiceMileage !== undefined ? String(ctx.nextServiceMileage) : 'N/A',
    '[Next Service Mileage]': ctx.nextServiceMileage !== undefined ? String(ctx.nextServiceMileage) : 'N/A',
    '{next_mileage}': ctx.nextServiceMileage !== undefined ? String(ctx.nextServiceMileage) : 'N/A',
    '[Part(s) Required]': ctx.partsRequired || 'Standard service parts',
    '[Parts Required]': ctx.partsRequired || 'Standard service parts',
    '{parts_required}': ctx.partsRequired || 'Standard service parts',
  };

  // Sort keys by descending string length so compound placeholders (e.g. [Date & Time], [Additional Notes])
  // are replaced before their subcomponents (e.g. [Date], [Time], [Notes])
  const sortedKeys = Object.keys(replacements).sort((a, b) => b.length - a.length);

  for (const key of sortedKeys) {
    content = content.split(key).join(replacements[key]);
  }

  // Case-insensitive regex replacements for any remaining variations
  content = content
    .replace(/\{date[_\s-]?time\}/gi, ctx.scheduledDateTime)
    .replace(/\[date\s*(?:&|and)\s*time(?:\s+of\s+appointment)?\]/gi, ctx.scheduledDateTime)
    .replace(/\[preferred\s+date\s*(?:&|and)\s*time\]/gi, ctx.scheduledDateTime)
    .replace(/\{additional[_\s-]?notes\}/gi, ctx.additionalNotes)
    .replace(/\[additional\s+notes\]/gi, ctx.additionalNotes)
    .replace(/\{scheduled[_\s-]?time\}|\{appointment[_\s-]?time\}|\{time\}/gi, ctx.scheduledTime)
    .replace(/\[(?:scheduled\s+time|appointment\s+time|time)\]/gi, ctx.scheduledTime)
    .replace(/\{scheduled[_\s-]?date\}|\{appointment[_\s-]?date\}|\{date\}/gi, ctx.scheduledDate)
    .replace(/\[(?:scheduled\s+date|maintenance\s+date|appointment\s+date|the\s+maintenance\s+date|date)\]/gi, ctx.scheduledDate);

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
    category: 'Maintenance',
    subjectTemplate: 'Vehicle Maintenance Scheduled - {vehicle_reg}',
    bodyTemplate: `Dear {driver_name},

This is a reminder that your vehicle is scheduled for maintenance:

🚗 Vehicle: {vehicle_reg}
🔧 Service: {service_type}
📅 Date & Time: {date_time}
🔖 Reference: {maintenance_id}

📍 Garage Location:
{garage_name}
{garage_address}
• Additional Notes: {additional_notes}

Please ensure the vehicle is delivered promptly. If you have any questions or need to adjust your booking, please reply directly.

Best regards,
AIE Skyline Limited`,
  },
  {
    id: 'maint_driver_scheduled_email',
    name: 'Driver: Maintenance Booking Confirmation (Email)',
    recipientType: 'driver',
    channel: 'email',
    category: 'Maintenance',
    subjectTemplate: 'Maintenance Booking Confirmation - {vehicle_reg} [{service_type}]',
    bodyTemplate: `Dear {driver_name},

We have booked your vehicle in for its scheduled maintenance. Please find the confirmed details below:

• Vehicle Registration: {vehicle_reg}
• Work Order Reference: {maintenance_id}
• Service Type: {service_type}
• Date & Time: {date_time}

Garage Details:
• Garage: {garage_name}
• Address: {garage_address}
• Additional Notes: {additional_notes}

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
    category: 'Maintenance',
    subjectTemplate: 'Vehicle Service Due - {vehicle_reg}',
    bodyTemplate: `Dear {driver_name},

Your vehicle ({vehicle_reg}) has reached its service interval for {service_type}.

Service Reference: {maintenance_id}
Date & Time: {date_time}
Garage: {garage_name} - {garage_address}
• Additional Notes: {additional_notes}

Please contact us if you need to confirm your drop-off window.

Best regards,
AIE Skyline Limited`,
  },
  {
    id: 'maint_driver_appointment_details_bracket',
    name: 'Driver: Detailed Appointment Confirmation (Email)',
    recipientType: 'driver',
    channel: 'email',
    category: 'Maintenance',
    subjectTemplate: 'Vehicle Maintenance Appointment – [Vehicle Reg]',
    bodyTemplate: `Dear [Driver Name],

Please be advised that an appointment has been scheduled for your vehicle:

📅 Appointment Details
• Maintenance Type: [Maintenance Type]
• Date: [Date]
• Time: [Time]
• Date & Time: [Date & Time]
• Location: [Garage Name] - [Location]
• Reference: [Order Number]
• Additional Notes: [Additional Notes]

Please ensure the vehicle is clean and arrives at the service centre promptly.

Kind regards,
Fleet Operations Team
AIE Skyline Limited`,
  },

  // --- GARAGE TEMPLATES ---
  {
    id: 'maint_garage_work_order_email',
    name: 'Garage: Service Work Order & Vehicle Booking (Email)',
    recipientType: 'garage',
    channel: 'email',
    category: 'Maintenance',
    subjectTemplate: 'Maintenance Work Order: {vehicle_reg} - {service_type} ({maintenance_id})',
    bodyTemplate: `Dear {garage_name},

Please find the maintenance booking details for vehicle {vehicle_reg}:

📋 Work Order: {maintenance_id}
🔧 Service Type: {service_type}
📅 Date & Time: {date_time}
• Additional Notes: {additional_notes}

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
    category: 'Maintenance',
    subjectTemplate: 'Vehicle Booking - {vehicle_reg}',
    bodyTemplate: `Dear {garage_name},

Maintenance booking confirmation for vehicle {vehicle_reg}:

Order #: {maintenance_id}
Service: {service_type}
Date & Time: {date_time}
Driver: {driver_name} ({driver_phone})
• Additional Notes: {additional_notes}

Please confirm receipt and let us know if additional parts or authorization are needed.

Kind regards,
AIE Skyline Limited`,
  },
  {
    id: 'maint_garage_repair_authorization',
    name: 'Garage: Repair Authorization (Email)',
    recipientType: 'garage',
    channel: 'email',
    category: 'Maintenance',
    subjectTemplate: 'Repair Authorization - {vehicle_reg} ({maintenance_id})',
    bodyTemplate: `Dear {garage_name},

We authorize the inspection and scheduled {service_type} for vehicle {vehicle_reg} on {date_time}.

Order Reference: {maintenance_id}
Driver: {driver_name} ({driver_phone})
• Additional Notes: {additional_notes}

Please proceed with the initial assessment and provide an itemized invoice or estimate before conducting any non-standard repairs.

Best regards,
Fleet Maintenance Team
AIE Skyline Limited`,
  },
];

/**
 * STRICT CATEGORY FILTERING (MAINTENANCE ONLY):
 * Restrict template dropdown loading on the Maintenance Page so it ONLY fetches and displays
 * templates where category = "Maintenance" (case-insensitive).
 *
 * Excludes templates from other categories (Finance, Rental, Invoice, Claim, Custom, Bulk Email, etc.)
 * across both WhatsApp and Email channels.
 */
export async function fetchMaintenanceTemplates(
  channelFilter?: MaintenanceChannelMode
): Promise<MaintenanceTemplateOption[]> {
  const standardEmailTemplates: MaintenanceTemplateOption[] = (emailTemplates.maintenance || []).map((et) => {
    const isGarage =
      et.name.toLowerCase().includes('garage') ||
      et.name.toLowerCase().includes('supplier') ||
      et.name.toLowerCase().includes('service center') ||
      et.name.toLowerCase().includes('provider');

    return {
      id: et.id,
      name: `Email: ${et.name}`,
      recipientType: isGarage ? 'garage' : 'driver',
      channel: 'email' as const,
      category: 'Maintenance',
      subjectTemplate: et.subjectTemplate,
      bodyTemplate: et.bodyTemplate,
    };
  });

  const baseTemplates = [...DEFAULT_MAINTENANCE_TEMPLATES, ...standardEmailTemplates];

  try {
    // 1. STRICT QUERY: Filter Firestore messageTemplates strictly by category = "Maintenance"
    let queryDocs: any[] = [];
    try {
      const q = query(
        collection(db, 'messageTemplates'),
        where('category', 'in', ['maintenance', 'Maintenance', 'MAINTENANCE'])
      );
      const snap = await getDocs(q);
      queryDocs = snap.docs;
    } catch (queryErr) {
      console.warn('Direct category query failed, falling back to full collection with strict filter:', queryErr);
      const snap = await getDocs(collection(db, 'messageTemplates'));
      queryDocs = snap.docs;
    }

    const customTemplates: MaintenanceTemplateOption[] = [];
    queryDocs.forEach((doc) => {
      const data = doc.data();
      const rawName = data.name || 'Maintenance Template';
      const cat = String(data.category || '').toLowerCase().trim();

      // STRICT CATEGORY FILTERING ENFORCEMENT:
      // ONLY allow category === 'maintenance'.
      // Exclude templates from other categories (Finance, Rental, Invoice, Claim, Custom, Bulk Email, etc.)
      if (cat !== 'maintenance') {
        return;
      }

      const isGarage =
        data.recipientType === 'garage' ||
        rawName.toLowerCase().includes('garage') ||
        rawName.toLowerCase().includes('supplier') ||
        rawName.toLowerCase().includes('provider') ||
        rawName.toLowerCase().includes('service center');

      const explicitChannel = String(data.channel || data.platform || data.type || '').toLowerCase().trim();
      const isWhatsApp =
        explicitChannel === 'whatsapp' ||
        rawName.toLowerCase().includes('(whatsapp)') ||
        rawName.toLowerCase().includes('whatsapp');
      const isEmail =
        explicitChannel === 'email' ||
        rawName.toLowerCase().includes('(email)') ||
        rawName.toLowerCase().includes('email');

      const subjectTemplate = data.subjectTemplate || data.subject || 'Maintenance Update - {vehicle_reg}';
      const bodyTemplate = data.bodyTemplate || data.body || data.content || '';

      if (isWhatsApp) {
        // WhatsApp Template: Query strictly from WhatsApp Communication -> category = "Maintenance"
        customTemplates.push({
          id: doc.id,
          name: rawName,
          recipientType: isGarage ? 'garage' : 'driver',
          channel: 'whatsapp',
          category: 'Maintenance',
          subjectTemplate,
          bodyTemplate,
        });
      } else if (isEmail) {
        // Email Template: Query strictly from Email / Bulk Email -> category = "Maintenance"
        customTemplates.push({
          id: doc.id,
          name: rawName,
          recipientType: isGarage ? 'garage' : 'driver',
          channel: 'email',
          category: 'Maintenance',
          subjectTemplate,
          bodyTemplate,
        });
      } else {
        // Multi-channel Maintenance Template: Available for both WhatsApp and Email
        customTemplates.push({
          id: `${doc.id}_whatsapp`,
          name: `${rawName} (WhatsApp)`,
          recipientType: isGarage ? 'garage' : 'driver',
          channel: 'whatsapp',
          category: 'Maintenance',
          subjectTemplate,
          bodyTemplate,
        });
        customTemplates.push({
          id: doc.id,
          name: `${rawName} (Email)`,
          recipientType: isGarage ? 'garage' : 'driver',
          channel: 'email',
          category: 'Maintenance',
          subjectTemplate,
          bodyTemplate,
        });
      }
    });

    const combined = [...customTemplates, ...baseTemplates];
    const seen = new Set<string>();
    const deduplicated: MaintenanceTemplateOption[] = [];
    for (const t of combined) {
      if (!seen.has(t.id)) {
        seen.add(t.id);
        deduplicated.push(t);
      }
    }

    if (channelFilter) {
      return deduplicated.filter((t) => t.channel === channelFilter);
    }
    return deduplicated;
  } catch (err) {
    console.warn('Could not fetch custom messageTemplates from Firestore, using defaults:', err);
  }

  const seen = new Set<string>();
  const deduplicated: MaintenanceTemplateOption[] = [];
  for (const t of baseTemplates) {
    if (!seen.has(t.id)) {
      seen.add(t.id);
      deduplicated.push(t);
    }
  }
  if (channelFilter) {
    return deduplicated.filter((t) => t.channel === channelFilter);
  }
  return deduplicated;
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
