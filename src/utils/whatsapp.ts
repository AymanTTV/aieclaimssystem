import { Customer, Vehicle, Invoice, Claim, DriverPay } from '../types';
import { format } from 'date-fns';

const COMPANY_SIGNATURE = `
Best regards,
AIE Skyline Limited
📍 United House, 39-41 North Road, London, N7 9DP
📞 020 8050 5337 | 📱 +44 7999 558801
✉️ admin@aieskyline.co.uk
🌐 www.aieskyline.co.uk`;

interface WhatsAppMessage {
  phone: string;
  message: string;
  attachments?: string[];
}

export const formatWhatsAppNumber = (phone: string): string => {
  // Remove any non-numeric characters
  const cleanNumber = phone.replace(/\D/g, '');
  
  // Add UK country code if not present
  if (cleanNumber.startsWith('0')) {
    return '44' + cleanNumber.substring(1);
  }
  
  return cleanNumber;
};

export const sendWhatsAppMessage = ({ phone, message, attachments }: WhatsAppMessage) => {
  const formattedNumber = formatWhatsAppNumber(phone);
  const encodedMessage = encodeURIComponent(message + '\n\n' + COMPANY_SIGNATURE);
  const whatsappUrl = `https://wa.me/${formattedNumber}?text=${encodedMessage}`;
  window.open(whatsappUrl, '_blank');
};

// Rental notifications
export const sendRentalReminder = (customer: Customer, rental: any) => {
  const message = `Dear ${customer.name},

Your rental payment of £${rental.remainingAmount} is due.
Rental Period: ${format(rental.startDate, 'dd/MM/yyyy')} - ${format(rental.endDate, 'dd/MM/yyyy')}
Vehicle: ${rental.vehicleName}
${rental.discountAmount ? `Discount Applied: £${rental.discountAmount}` : ''}

Please arrange payment at your earliest convenience.`;

  return sendWhatsAppMessage({
    phone: customer.mobile,
    message,
    attachments: rental.documents ? [rental.documents.invoice] : undefined
  });
};

// Invoice notifications
export const sendInvoiceReminder = (customer: Customer, invoice: Invoice) => {
  const message = `Dear ${customer.name},

This is a reminder about unpaid invoice #${invoice.id.slice(-8).toUpperCase()}.
Amount Due: £${invoice.remainingAmount}
Due Date: ${format(invoice.dueDate, 'dd/MM/yyyy')}

Please process the payment as soon as possible.`;

  return sendWhatsAppMessage({
    phone: customer.mobile,
    message,
    attachments: [invoice.documentUrl]
  });
};

// Vehicle document expiry notifications
export const sendVehicleDocumentReminder = (customer: Customer, vehicle: Vehicle) => {
  const message = `Dear ${customer.name},

Important reminder about your vehicle ${vehicle.registrationNumber}:

${vehicle.motExpiry && isExpiringOrExpired(vehicle.motExpiry) ? `MOT expires on ${format(vehicle.motExpiry, 'dd/MM/yyyy')}\n` : ''}
${vehicle.insuranceExpiry && isExpiringOrExpired(vehicle.insuranceExpiry) ? `Insurance expires on ${format(vehicle.insuranceExpiry, 'dd/MM/yyyy')}\n` : ''}
${vehicle.roadTaxExpiry && isExpiringOrExpired(vehicle.roadTaxExpiry) ? `Road Tax expires on ${format(vehicle.roadTaxExpiry, 'dd/MM/yyyy')}\n` : ''}
${vehicle.nslExpiry && isExpiringOrExpired(vehicle.nslExpiry) ? `NSL expires on ${format(vehicle.nslExpiry, 'dd/MM/yyyy')}` : ''}

Please ensure to renew these documents before expiry.`;

  return sendWhatsAppMessage({
    phone: customer.mobile,
    message
  });
};

// Claim notifications
export const sendClaimNotification = (customer: Customer, claim: Claim) => {
  const message = `Dear ${customer.name},

A new claim has been submitted:
Reference: ${claim.clientRef || claim.id.slice(-8).toUpperCase()}
Type: ${claim.claimType}
Status: ${claim.progress}

We will keep you updated on the progress.`;

  return sendWhatsAppMessage({
    phone: customer.mobile,
    message,
    attachments: claim.documents ? Object.values(claim.documents) : undefined
  });
};

// Driver Pay notifications
export const sendDriverPayNotification = (customer: Customer, driverPay: DriverPay) => {
  const message = `Dear ${customer.name},

Your driver payment has been processed:
Period: ${format(driverPay.startDate, 'dd/MM/yyyy')} - ${format(driverPay.endDate, 'dd/MM/yyyy')}
Total Amount: £${driverPay.totalAmount}
Commission (${driverPay.commissionPercentage}%): £${driverPay.commissionAmount}
Net Pay: £${driverPay.netPay}
Status: ${driverPay.status}

Collection Point: ${driverPay.collection}`;

  return sendWhatsAppMessage({
    phone: customer.mobile,
    message
  });
};

// Customer document expiry notifications
export const sendCustomerDocumentReminder = (customer: Customer) => {
  const message = `Dear ${customer.name},

Important reminder about your documents:

${isExpiringOrExpired(customer.licenseExpiry) ? `Driver's License expires on ${format(customer.licenseExpiry, 'dd/MM/yyyy')}\n` : ''}
${isExpiringOrExpired(customer.billExpiry) ? `Bill expires on ${format(customer.billExpiry, 'dd/MM/yyyy')}` : ''}

Please ensure to renew these documents before expiry.`;

  return sendWhatsAppMessage({
    phone: customer.mobile,
    message
  });
};

// Helper function to check if date is expiring or expired
const isExpiringOrExpired = (date: Date): boolean => {
  const now = new Date();
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  return date <= thirtyDaysFromNow;
};