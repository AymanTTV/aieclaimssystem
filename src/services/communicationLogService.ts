// src/services/communicationLogService.ts

import {
  collection,
  addDoc,
  serverTimestamp,
  getDocs,
  query,
  orderBy,
  limit,
  Timestamp,
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { CommunicationLog, DeliveryStatus } from '../types/communicationLog';

export interface CreateCommunicationLogInput {
  id?: string;
  timestamp?: Date;
  sender_user_id?: string;
  communication_channel: 'WhatsApp' | 'Email';
  recipient_role: string;
  recipient_name: string;
  recipient_contact: string;
  source_module: string;
  record_id: string;
  template_name?: string;
  message_body: string;
  attachments?: (string | { name?: string; url: string })[];
  delivery_status?: DeliveryStatus;
  subject?: string;
  customerId?: string;
  vehicleId?: string;
}

/**
 * Persists a new record to the communication_logs table
 */
export async function logCommunication(input: CreateCommunicationLogInput): Promise<string> {
  try {
    const currentUser = auth.currentUser;
    const sender =
      input.sender_user_id ||
      currentUser?.displayName ||
      currentUser?.email ||
      currentUser?.uid ||
      'Automated Scheduler';

    const cleanAttachments = (input.attachments || []).map((att) => {
      if (typeof att === 'string') return att;
      return {
        name: att.name || 'Attachment',
        url: att.url || '',
      };
    });

    const docPayload = {
      timestamp: serverTimestamp(),
      sender_user_id: sender,
      communication_channel: input.communication_channel,
      recipient_role: input.recipient_role || 'Customer',
      recipient_name: input.recipient_name || 'Recipient',
      recipient_contact: input.recipient_contact || '',
      source_module: input.source_module || 'General',
      record_id: String(input.record_id || ''),
      template_name: input.template_name || 'Custom Message',
      message_body: input.message_body || '',
      attachments: cleanAttachments,
      delivery_status: input.delivery_status || 'Sent',
      subject: input.subject || '',
      customerId: input.customerId || '',
      vehicleId: input.vehicleId || '',
    };

    const docRef = await addDoc(collection(db, 'communication_logs'), docPayload);

    // Notify active listeners across windows/tabs
    try {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('communication_log_created', {
            detail: { id: docRef.id, ...docPayload, timestamp: new Date() },
          })
        );
      }
    } catch {
      // Ignore in non-browser environments
    }

    return docRef.id;
  } catch (error) {
    console.error('[communicationLogService] Error logging communication:', error);
    // Don't fail the user interaction if logging fails
    return '';
  }
}

/**
 * Fetch logs directly from Firestore
 */
export async function fetchRecentCommunicationLogs(maxCount: number = 300): Promise<CommunicationLog[]> {
  try {
    const q = query(
      collection(db, 'communication_logs'),
      orderBy('timestamp', 'desc'),
      limit(maxCount)
    );
    const snap = await getDocs(q);
    return snap.docs.map((docSnap) => {
      const data = docSnap.data();
      let ts = new Date();
      if (data.timestamp instanceof Timestamp) {
        ts = data.timestamp.toDate();
      } else if (data.timestamp?.toDate) {
        ts = data.timestamp.toDate();
      } else if (data.timestamp) {
        ts = new Date(data.timestamp);
      }
      return {
        id: docSnap.id,
        timestamp: ts,
        sender_user_id: data.sender_user_id || 'System',
        communication_channel: data.communication_channel || 'Email',
        recipient_role: data.recipient_role || 'Customer',
        recipient_name: data.recipient_name || '',
        recipient_contact: data.recipient_contact || '',
        source_module: data.source_module || 'General',
        record_id: data.record_id || '',
        template_name: data.template_name || 'Custom Message',
        message_body: data.message_body || '',
        attachments: data.attachments || [],
        delivery_status: data.delivery_status || 'Sent',
        subject: data.subject || '',
        customerId: data.customerId || '',
        vehicleId: data.vehicleId || '',
      };
    });
  } catch (error) {
    console.error('[communicationLogService] Failed to fetch logs:', error);
    return [];
  }
}
