// src/utils/emailService.ts

import emailjs from '@emailjs/browser';

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
      // FIX: Changed from .co.uk to .com to match your SMTP User credentials
      reply_to: params.reply_to || 'admin@aieskyline.com',
      from_name: 'AIE Fleet System',
      from_email: 'admin@aieskyline.com',
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