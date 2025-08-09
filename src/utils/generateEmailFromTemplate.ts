// src/utils/generateEmailFromTemplate.ts

import { format } from 'date-fns';
import { Customer, Rental, Vehicle, Invoice, MaintenanceLog, Claim } from '../types';

interface TemplateFillerParams {
  templateId: string;
  templateSubject: string;
  templateBody: string;
  record: any; // e.g., Rental, MaintenanceLog, etc.
  vehicle?: Vehicle;
  customer?: Customer;
  maintenance?: MaintenanceLog;
  invoice?: Invoice;
  claim?: Claim;
}

export const generateEmailFromTemplate = ({
  templateId,
  templateSubject,
  templateBody,
  record,
  vehicle,
  customer,
  maintenance,
  invoice,
  claim,
}: TemplateFillerParams): { subject: string; body: string } => {
  let subject = templateSubject;
  let body = templateBody;

  const replacements: Record<string, string> = {
    '[Driver\'s Name]': customer?.name || customer?.fullName || 'N/A',
    '[Driver’s Full Name]': customer?.name || customer?.fullName || 'N/A',
    '[Vehicle Registration Number]': vehicle?.registrationNumber || 'N/A',
    '[Vehicle Reg No]': vehicle?.registrationNumber || 'N/A',
    '[Vehicle Registration]': vehicle?.registrationNumber || 'N/A',
    '[Vehicle Make and Model]': vehicle ? `${vehicle.make} ${vehicle.model}` : 'N/A',
    '[Vehicle Make]': vehicle?.make || 'N/A',
    '[Vehicle Model]': vehicle?.model || 'N/A',
    '[Vehicle Year]': vehicle?.year?.toString() || 'N/A',
    '[Date & Time of Appointment]': maintenance?.date ? format(maintenance.date, 'dd/MM/yyyy HH:mm') : 'N/A',
    '[Service Type]': maintenance?.type.replace(/-/g, ' ') || 'N/A',
    '[Service Centre Name or Address]': maintenance?.location || 'N/A',
    '[Insert Today’s Date]': format(new Date(), 'dd/MM/yyyy'),
    '[Start Date]': record?.startDate ? format(record.startDate, 'dd/MM/yyyy') : 'N/A',
    '[End Date]': record?.endDate ? format(record.endDate, 'dd/MM/yyyy') : 'N/A',
    '[Rental Type]': record?.type || 'N/A',
    '[Total Amount]': record?.cost?.toFixed(2) || record?.amount?.toFixed(2) || '0.00',
    '[Amount Paid]': record?.paidAmount?.toFixed(2) || '0.00',
    '[Outstanding Balance]': record?.remainingAmount?.toFixed(2) || '0.00',
    '[Original Due Date]': record?.dueDate ? format(record.dueDate, 'dd/MM/yyyy') : 'N/A',
    '[Invoice Number]': invoice?.id?.slice(-8).toUpperCase() || 'N/A',
    '[Invoice Date]': invoice?.date ? format(invoice.date, 'dd/MM/yyyy') : 'N/A',
    '[Due Date]': invoice?.dueDate ? format(invoice.dueDate, 'dd/MM/yyyy') : 'N/A',
    '[Amount]': invoice?.amount?.toFixed(2) || '0.00',
    '[Invoice Description]': invoice?.category || invoice?.customCategory || 'N/A',
    '[Repair Date]': maintenance?.date ? format(maintenance.date, 'dd/MM/yyyy') : 'N/A',
    '[Repair Service]': maintenance?.type || 'N/A',
    '[Invoice/Repair Reference Number]': maintenance?.id || invoice?.id || 'N/A',
    '[Claim Reference]': claim?.claimId || claim?.id.slice(-8).toUpperCase() || 'N/A',
    '[Client Name]': claim?.submitter?.fullName || claim?.driver?.fullName || 'N/A',
    '[Client Registration]': claim?.vehicle?.registration || 'N/A',
    '[TP Registration]': claim?.faultParty?.vehicleRegistration || 'N/A',
    '[Incident Date]': claim?.dateOfEvent ? format(claim.dateOfEvent, 'dd/MM/yyyy') : 'N/A',
    '[Incident Time]': claim?.incidentTime || 'N/A',
    '[Incident Location]': claim?.locationOfEvent || 'N/A',
    '[Description]': claim?.accidentDetails?.cause || 'N/A',
    '[Recipient\'s Name]': customer?.name || customer?.fullName || 'N/A',
  };

  // Replace all fields
  Object.entries(replacements).forEach(([placeholder, value]) => {
    subject = subject.replaceAll(placeholder, value);
    body = body.replaceAll(placeholder, value);
  });

  return { subject, body };
};
