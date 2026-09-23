// src/utils/emailService.ts
/**
 * Unified Google Workspace Email Dispatch Service
 * 
 * Senders:
 * - Fleet / General / Bulk Email: admin@aieskyline.co.uk
 * - Claims Portal / Claims Communication: claims@aieclaims.co.uk
 * 
 * Replaces legacy EmailJS with direct Google Workspace Gmail API integration.
 */

import { 
  sendGoogleWorkspaceEmail, 
  SendGoogleEmailOptions, 
  resolveSenderInfo 
} from './googleWorkspaceEmailService';
import { SYSTEM_SENDERS } from './googleWorkspaceAuth';

export interface EmailParams {
  to_email: string;
  to_name: string;
  subject: string;
  message: string;
  show_bank_details?: boolean;
  reference?: string;
  reply_to?: string;
  attachments?: any;
  from_email?: string;
  from_name?: string;
  source_page?: 'claims' | 'bulk_email' | 'rentals' | 'invoices' | 'maintenance' | 'system' | string;
}

export { SYSTEM_SENDERS };

/**
 * Sends a single email via Google Workspace Gmail API
 */
export const sendEmail = async (params: EmailParams) => {
  try {
    const isClaims = 
      params.source_page === 'claims' || 
      params.from_email?.toLowerCase() === SYSTEM_SENDERS.CLAIMS.toLowerCase();

    const targetSenderEmail = isClaims ? SYSTEM_SENDERS.CLAIMS : SYSTEM_SENDERS.FLEET_ADMIN;
    const targetSenderName = params.from_name || (isClaims ? 'AIE Claims Department' : 'AIE Skyline Fleet System');
    const targetReplyTo = params.reply_to || targetSenderEmail;

    let fullMessage = params.message || '';

    // Bank Details Section if requested
    if (params.show_bank_details) {
      fullMessage += `\n\n--- PAYMENT & BANK DETAILS ---\nBank: Barclays Bank UK\nAccount Name: AIE Skyline Limited\nSort Code: 20-00-00\nAccount No: 12345678\nReference: ${params.reference || 'INVOICE'}`;
    }

    const options: SendGoogleEmailOptions = {
      toEmail: params.to_email,
      toName: params.to_name,
      subject: params.subject,
      messageText: fullMessage,
      fromEmail: targetSenderEmail,
      fromName: targetSenderName,
      replyTo: targetReplyTo,
      reference: params.reference,
      attachments: params.attachments,
      sourcePage: params.source_page || (isClaims ? 'claims' : 'system'),
    };

    const result = await sendGoogleWorkspaceEmail(options);
    return {
      status: 200,
      text: 'OK',
      messageId: result.id,
      sender: targetSenderEmail,
    };
  } catch (err: any) {
    console.error('Google Workspace email sending failed:', err);
    throw err;
  }
};
