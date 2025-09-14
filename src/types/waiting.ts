// src/components/waiting/types.ts
export type WaitingStatus =
  | 'new'
  | 'contacted'
  | 'waiting'
  | 'offered'
  | 'booked'
  | 'not_proceeding';

export type ContactPreference = 'call' | 'sms' | 'whatsapp' | 'email';

export interface WaitingEntry {
  id: string;
  fullName: string;
  phone: string;
  email?: string;
  reason?: string;
  dateWanted?: Date | null;
  waitingType: 'open' | 'specific_date';
  preferredNotes?: string;
  contactPreference: ContactPreference;
  consentGiven: boolean;
  consentNote?: string;
  status: WaitingStatus;
  categoryIds: string[];
  groupIds: string[];
  assignedTo?: string | null;
  offerExpiryAt?: Date | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  lastActivityAt?: Date | null;
  createdBy: string;
}

export interface WaitingCategory { id: string; name: string }
export interface WaitingGroup { id: string; name: string }

export interface WaitingNote {
  id: string;
  text: string;
  createdAt: Date | null;
  createdBy: string;
}

export interface WaitingReminder {
  id: string;
  message: string;
  dueAt: Date | null;
  assignedTo?: string | null;
  isDone?: boolean;
  createdAt: Date | null;
  createdBy: string;
}

// Firestore Timestamp → Date
export const toDate = (v: any): Date | null => (v?.toDate ? v.toDate() : v ?? null);
