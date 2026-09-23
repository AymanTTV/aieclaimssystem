// src/utils/googleWorkspaceEmailService.ts
import { 
  getGoogleAccessToken, 
  connectGoogleWorkspace, 
  SYSTEM_SENDERS 
} from './googleWorkspaceAuth';

export interface EmailAttachment {
  filename: string;
  url?: string;
  data?: string; // Base64 data string
  contentType?: string;
}

export interface SendGoogleEmailOptions {
  toEmail: string;
  toName?: string;
  subject: string;
  messageHtml?: string;
  messageText?: string;
  fromEmail?: string;
  fromName?: string;
  replyTo?: string;
  reference?: string;
  attachments?: (EmailAttachment | any)[];
  sourcePage?: 'claims' | 'bulk_email' | 'rentals' | 'invoices' | 'maintenance' | 'system' | string;
}

/**
 * Resolves the official sender email and display name based on source page / request
 */
export function resolveSenderInfo(options: Partial<SendGoogleEmailOptions>): {
  senderEmail: string;
  senderName: string;
  replyTo: string;
} {
  const isClaims = 
    options.sourcePage === 'claims' || 
    options.fromEmail?.toLowerCase() === SYSTEM_SENDERS.CLAIMS.toLowerCase();

  if (isClaims) {
    return {
      senderEmail: SYSTEM_SENDERS.CLAIMS,
      senderName: options.fromName || 'AIE Claims Department',
      replyTo: options.replyTo || SYSTEM_SENDERS.CLAIMS,
    };
  }

  return {
    senderEmail: SYSTEM_SENDERS.FLEET_ADMIN,
    senderName: options.fromName || 'AIE Skyline Fleet System',
    replyTo: options.replyTo || SYSTEM_SENDERS.FLEET_ADMIN,
  };
}

/**
 * Base64URL encoder conforming to RFC 4648
 */
function toBase64Url(str: string): string {
  // Convert UTF-8 string to base64
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Encode byte array to base64 string
 */
function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Formats subject header with RFC 2047 if containing non-ASCII characters
 */
function formatSubjectHeader(subject: string): string {
  const hasNonAscii = /[\u0080-\uFFFF]/.test(subject);
  if (!hasNonAscii) return subject;
  const utf8Bytes = new TextEncoder().encode(subject);
  const base64 = bytesToBase64(utf8Bytes);
  return `=?UTF-8?B?${base64}?=`;
}

/**
 * Resolves an attachment into Base64 and MIME type
 */
async function resolveAttachmentData(att: any): Promise<{ filename: string; contentType: string; base64: string } | null> {
  try {
    const filename = att.filename || att.name || 'attachment.pdf';
    let contentType = att.contentType || 'application/octet-stream';
    let base64 = '';

    if (filename.endsWith('.pdf')) contentType = 'application/pdf';
    else if (filename.match(/\.(jpg|jpeg)$/i)) contentType = 'image/jpeg';
    else if (filename.endsWith('.png')) contentType = 'image/png';
    else if (filename.endsWith('.docx')) contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    else if (filename.endsWith('.xlsx')) contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    if (att.data && typeof att.data === 'string') {
      // Data may be a data URL or raw base64
      if (att.data.includes('base64,')) {
        base64 = att.data.split('base64,')[1];
      } else {
        base64 = att.data;
      }
    } else if (att.url && typeof att.url === 'string') {
      if (att.url.startsWith('data:')) {
        const parts = att.url.split('base64,');
        base64 = parts[1] || '';
      } else {
        // Fetch remote URL
        const resp = await fetch(att.url);
        const arrayBuf = await resp.arrayBuffer();
        base64 = bytesToBase64(new Uint8Array(arrayBuf));
        const respType = resp.headers.get('content-type');
        if (respType) contentType = respType;
      }
    }

    if (!base64) return null;
    return { filename, contentType, base64 };
  } catch (err) {
    console.warn('Failed to resolve attachment payload:', att, err);
    return null;
  }
}

/**
 * Builds RFC 2822 email payload
 */
async function buildMimeMessage(options: SendGoogleEmailOptions): Promise<string> {
  const { senderEmail, senderName, replyTo } = resolveSenderInfo(options);
  const boundaryMixed = `mixed_boundary_${Date.now()}`;
  const boundaryAlt = `alt_boundary_${Date.now()}`;

  const cleanSubject = formatSubjectHeader(options.subject || 'Notification from AIE Skyline');
  const toHeader = options.toName ? `"${options.toName.replace(/"/g, '')}" <${options.toEmail}>` : options.toEmail;
  const fromHeader = `"${senderName.replace(/"/g, '')}" <${senderEmail}>`;

  const textBody = options.messageText || options.messageHtml?.replace(/<[^>]+>/g, '') || '';
  const htmlBody = options.messageHtml || (
    `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #1e293b;">
      ${textBody.replace(/\n/g, '<br/>')}
    </div>`
  );

  // Prepare attachments
  const resolvedAttachments: { filename: string; contentType: string; base64: string }[] = [];
  if (options.attachments && options.attachments.length > 0) {
    for (const rawAtt of options.attachments) {
      const resolved = await resolveAttachmentData(rawAtt);
      if (resolved) resolvedAttachments.push(resolved);
    }
  }

  const hasAttachments = resolvedAttachments.length > 0;

  let mime = '';
  mime += `From: ${fromHeader}\r\n`;
  mime += `To: ${toHeader}\r\n`;
  mime += `Reply-To: ${replyTo}\r\n`;
  mime += `Subject: ${cleanSubject}\r\n`;
  mime += `MIME-Version: 1.0\r\n`;

  if (hasAttachments) {
    mime += `Content-Type: multipart/mixed; boundary="${boundaryMixed}"\r\n\r\n`;
    mime += `--${boundaryMixed}\r\n`;
    mime += `Content-Type: multipart/alternative; boundary="${boundaryAlt}"\r\n\r\n`;
    
    // Plain text part
    mime += `--${boundaryAlt}\r\n`;
    mime += `Content-Type: text/plain; charset="UTF-8"\r\n`;
    mime += `Content-Transfer-Encoding: 7bit\r\n\r\n`;
    mime += `${textBody}\r\n\r\n`;

    // HTML part
    mime += `--${boundaryAlt}\r\n`;
    mime += `Content-Type: text/html; charset="UTF-8"\r\n`;
    mime += `Content-Transfer-Encoding: 7bit\r\n\r\n`;
    mime += `${htmlBody}\r\n\r\n`;
    mime += `--${boundaryAlt}--\r\n\r\n`;

    // Attachment parts
    for (const att of resolvedAttachments) {
      mime += `--${boundaryMixed}\r\n`;
      mime += `Content-Type: ${att.contentType}; name="${att.filename}"\r\n`;
      mime += `Content-Disposition: attachment; filename="${att.filename}"\r\n`;
      mime += `Content-Transfer-Encoding: base64\r\n\r\n`;
      mime += `${att.base64}\r\n\r\n`;
    }

    mime += `--${boundaryMixed}--\r\n`;
  } else {
    mime += `Content-Type: multipart/alternative; boundary="${boundaryAlt}"\r\n\r\n`;
    
    // Plain text part
    mime += `--${boundaryAlt}\r\n`;
    mime += `Content-Type: text/plain; charset="UTF-8"\r\n`;
    mime += `Content-Transfer-Encoding: 7bit\r\n\r\n`;
    mime += `${textBody}\r\n\r\n`;

    // HTML part
    mime += `--${boundaryAlt}\r\n`;
    mime += `Content-Type: text/html; charset="UTF-8"\r\n`;
    mime += `Content-Transfer-Encoding: 7bit\r\n\r\n`;
    mime += `${htmlBody}\r\n\r\n`;
    mime += `--${boundaryAlt}--\r\n`;
  }

  return mime;
}

/**
 * Sends an email directly via the Google Workspace Gmail API
 */
export async function sendGoogleWorkspaceEmail(options: SendGoogleEmailOptions): Promise<{ id: string; threadId?: string }> {
  const { senderEmail } = resolveSenderInfo(options);

  let token = await getGoogleAccessToken();

  if (!token) {
    // Prompt Google Workspace connection with targeted sender email
    const authResult = await connectGoogleWorkspace(senderEmail);
    token = authResult.accessToken;
  }

  const mimeString = await buildMimeMessage(options);
  const rawBase64Url = toBase64Url(mimeString);

  let response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw: rawBase64Url }),
  });

  // If token expired, re-prompt once
  if (response.status === 401) {
    console.warn('Google Workspace token expired. Requesting refreshed authorization...');
    const refreshed = await connectGoogleWorkspace(senderEmail);
    token = refreshed.accessToken;

    response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw: rawBase64Url }),
    });
  }

  if (!response.ok) {
    const errorJson = await response.json().catch(() => ({}));
    const errorMessage = errorJson?.error?.message || `HTTP ${response.status}: ${response.statusText}`;
    throw new Error(`Google Workspace Gmail dispatch error: ${errorMessage}`);
  }

  const result = await response.json();
  return result;
}
