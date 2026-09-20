// src/types/groupMessaging.ts

export type RecipientCategory = 'all' | 'members' | 'companies' | 'claims';

export type MessagingChannel = 'email' | 'whatsapp';

export interface MessagingRecipient {
  id: string;
  name: string;
  firstName?: string;
  email: string;
  phone: string;
  category: 'members' | 'companies' | 'claims';
  companyName?: string;
  source: 'customer' | 'claim';
  accountStatus?: string;
}

export interface MessagingAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  storagePath?: string;
  uploadedAt: Date;
}

export interface GlobalMessageTemplate {
  id: string;
  name: string;
  subjectTemplate: string;
  bodyTemplate: string;
  category: string;
  channel?: 'both' | 'email' | 'whatsapp';
  isCustom?: boolean;
  createdAt?: any;
  updatedAt?: any;
}

export interface BatchSendProgress {
  total: number;
  completed: number;
  successful: number;
  failed: number;
  isSending: boolean;
  errors: Array<{ recipientName: string; error: string }>;
}
