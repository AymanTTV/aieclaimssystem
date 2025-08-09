// src/utils/emailService.ts

import emailjs from '@emailjs/browser';
import { format } from 'date-fns';

export interface EmailParams {
  to_email: string;
  to_name: string;
  subject: string;
  message: string;
  show_bank_details?: boolean;
  reference?: string;
  reply_to?: string;
}

/**
 * Sends a single email via EmailJS.
 */
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
    };

    const resp = await emailjs.send(
      import.meta.env.VITE_EMAILJS_SERVICE_ID!,
      import.meta.env.VITE_EMAILJS_TEMPLATE_ID!,
      templateParams,
      import.meta.env.VITE_EMAILJS_PUBLIC_KEY!
    );
    return resp;
  } catch (err) {
    console.error('Error sending email:', err);
    throw err;
  }
};
