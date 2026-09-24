// src/types/communicationLog.ts

export type CommunicationChannel = 'WhatsApp' | 'Email';

export type RecipientRole =
  | 'Driver'
  | 'Client'
  | 'Garage'
  | 'Customer'
  | 'Member'
  | 'Legal Handler'
  | 'Supplier'
  | 'Staff'
  | 'Other';

export type SourceModule =
  | 'Rental'
  | 'Maintenance'
  | 'Claim'
  | 'Driver Pay'
  | 'Invoice'
  | 'Finance'
  | 'Members'
  | 'Bulk Email'
  | 'Bulk Scheduler'
  | 'Broadcast';

export type DeliveryStatus = 'Sent' | 'Delivered' | 'Failed' | 'Opened';

export interface CommunicationAttachment {
  name?: string;
  url: string;
}

export interface CommunicationLog {
  id: string;
  timestamp: Date;
  sender_user_id: string; // System user email/name or "Automated Scheduler"
  communication_channel: CommunicationChannel;
  recipient_role: RecipientRole | string;
  recipient_name: string;
  recipient_contact: string; // Target Phone Number or Email Address
  source_module: SourceModule | string;
  record_id: string; // Reference ID (e.g., Agreement #, Claim #, Invoice #, etc.)
  template_name: string; // Name of the template used (or "Custom Message")
  message_body: string; // Full text content sent
  attachments: (string | CommunicationAttachment)[];
  delivery_status: DeliveryStatus;

  // Additional metadata for fast indexation & search
  subject?: string;
  customerId?: string;
  vehicleId?: string;
}
