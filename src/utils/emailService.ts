import emailjs from '@emailjs/browser';
import { Customer, Vehicle, Rental, Invoice, MaintenanceLog, ServiceCenter } from '../types';
import { format } from 'date-fns';

interface EmailParams {
  to_email: string;
  to_name: string;
  subject: string;
  message: string;
  show_bank_details?: boolean;
  reference?: string;
  reply_to?: string;
}

export const sendEmail = async (params: EmailParams) => {
  try {
    const templateParams = {
      to_email: params.to_email,
      to_name: params.to_name,
      subject: params.subject,
      message: params.message,
      show_bank_details: params.show_bank_details || false,
      reference: params.reference || '',
      reply_to: params.reply_to || 'admin@aieskyline.co.uk',
      from_name: 'AIE Fleet System',
      from_email: 'admin@aieskyline.co.uk',
      content: params.message,
      bank_details: params.show_bank_details,
      payment_reference: params.reference
    };

    const response = await emailjs.send(
      import.meta.env.VITE_EMAILJS_SERVICE_ID,
      import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
      templateParams,
      import.meta.env.VITE_EMAILJS_PUBLIC_KEY
    );

    return response;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

export const generateRentalEmailContent = (customer: Customer, rental: Rental, vehicle: Vehicle) => {
  const message = `Dear ${customer.name},

Here are the details of your vehicle rental:

Vehicle Information:
- Make & Model: ${vehicle.make} ${vehicle.model}
- Registration Number: ${vehicle.registrationNumber}

Rental Period:
- Start Date: ${format(rental.startDate, 'dd/MM/yyyy HH:mm')}
- End Date: ${format(rental.endDate, 'dd/MM/yyyy HH:mm')}
- Type: ${rental.type}
- Status: ${rental.status}

Payment Information:
- Total Cost: £${rental.cost.toFixed(2)}
- Amount Paid: £${rental.paidAmount.toFixed(2)}
- Remaining Balance: £${rental.remainingAmount.toFixed(2)}

Payment Details:
Bank: LLOYDS BANK
Account Name: AIE SKYLINE LIMITED
Account Number: 30513162
Sort Code: 30-99-50
Reference: ${vehicle.registrationNumber}

Please ensure the correct reference is used to avoid delays in processing your payment.

If you have any questions or concerns, please don't hesitate to contact us.

Best regards,
AIE Skyline Limited
📍 United House, 39-41 North Road, London, N7 9DP
📞 020 8050 5337 | 📱 +44 7999 558801
✉️ admin@aieskyline.co.uk
🌐 www.aieskyline.co.uk`;

  return {
    subject: `Vehicle Rental Details - ${vehicle.registrationNumber}`,
    message,
    show_bank_details: rental.remainingAmount > 0,
    reference: vehicle.registrationNumber
  };
};

export const generateMaintenanceEmailContent = (
  serviceCenter: ServiceCenter,
  maintenanceLog: MaintenanceLog,
  vehicle: Vehicle
) => {
  const message = `Dear ${serviceCenter.name},

I hope you are well. Kindly arrange a maintenance service for the following vehicle:

🔹 Vehicle Registration Number: ${vehicle.registrationNumber}
🔹 Service Type: ${maintenanceLog.type}
🔹 Preferred Date & Time: ${format(maintenanceLog.date, 'dd/MM/yyyy HH:mm')}
🔹 Location: ${maintenanceLog.location}
🔹 Additional Notes: ${maintenanceLog.description}

Please confirm the booking at your earliest convenience. Let me know if an alternative date or time is necessary.

Best regards,
AIE Skyline Limited
📍 United House, 39-41 North Road, London, N7 9DP
📞 020 8050 5337 | 📱 +44 7999 558801
✉️ admin@aieskyline.co.uk
🌐 www.aieskyline.co.uk`;

  return {
    subject: `Vehicle Maintenance Booking Request - ${vehicle.registrationNumber}`,
    message
  };
};

export const generateInvoiceEmailContent = (customer: Customer, invoice: Invoice) => {
  const message = `Dear ${customer.name},

This email is regarding Invoice #${invoice.id.slice(-8).toUpperCase()}.

Invoice Details:
- Date: ${format(invoice.date, 'dd/MM/yyyy')}
- Due Date: ${format(invoice.dueDate, 'dd/MM/yyyy')}
- Amount: £${invoice.amount.toFixed(2)}
- Amount Paid: £${invoice.paidAmount.toFixed(2)}
- Remaining Balance: £${invoice.remainingAmount.toFixed(2)}

Payment Details:
Bank: LLOYDS BANK
Account Name: AIE SKYLINE LIMITED
Account Number: 30513162
Sort Code: 30-99-50
Reference: INV-${invoice.id.slice(-8).toUpperCase()}

Please ensure to use the correct reference when making the payment to avoid any delays in processing.

If you have already made the payment, please disregard this message. For any queries, please don't hesitate to contact us.

Best regards,
AIE Skyline Limited
📍 United House, 39-41 North Road, London, N7 9DP
📞 020 8050 5337 | 📱 +44 7999 558801
✉️ admin@aieskyline.co.uk
🌐 www.aieskyline.co.uk`;

  return {
    subject: `AIE Skyline Invoice - #${invoice.id.slice(-8).toUpperCase()}`,
    message,
    show_bank_details: invoice.remainingAmount > 0,
    reference: `INV-${invoice.id.slice(-8).toUpperCase()}`
  };
};