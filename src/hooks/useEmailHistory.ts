// src/hooks/useEmailHistory.ts

import { useState, useEffect } from 'react';
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  addDoc,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { EmailType } from '../constants/emailTemplates';
import { logCommunication } from '../services/communicationLogService';

export interface EmailHistoryEntry {
  id: string;
  sentBy: string;
  type: EmailType;
  templateId: string;
  recipients: string[];
  timestamp: Date;
  subject: string;
}

/**
 * Hook to stream and write email-history.
 */
export function useEmailHistory() {
  const [history, setHistory] = useState<EmailHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'emailHistory'),
      orderBy('timestamp', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      const data: EmailHistoryEntry[] = snap.docs.map((doc) => {
        const d = doc.data() as any;
        return {
          id: doc.id,
          sentBy: d.sentBy,
          type: d.type,
          templateId: d.templateId,
          recipients: d.recipients,
          timestamp: d.timestamp.toDate(),
          subject: d.subject,
        };
      });
      setHistory(data);
      setLoading(false);
    });
    return unsub;
  }, []);

  return { history, loading };
}

/**
 * Write a new history record.
 */
export async function logEmailHistory(entry: Omit<EmailHistoryEntry, 'id'> & Record<string, any>) {
  await addDoc(collection(db, 'emailHistory'), {
    ...entry,
    timestamp: serverTimestamp(),
  });

  if (!entry.skipCommunicationLogs) {
    try {
      const recipientContact = Array.isArray(entry.recipients) ? entry.recipients.join(', ') : String(entry.recipients || '');
      await logCommunication({
        communication_channel: 'Email',
        recipient_role: entry.recipientRole || (entry.type ? String(entry.type).toUpperCase() : 'Customer'),
        recipient_name: entry.recipientName || recipientContact || 'Recipient',
        recipient_contact: recipientContact,
        source_module: entry.sourceModule || (entry.type ? String(entry.type).charAt(0).toUpperCase() + String(entry.type).slice(1) : 'General'),
        record_id: entry.recordId || entry.rentalId || entry.claimId || entry.invoiceId || '',
        template_name: entry.templateName || entry.templateId || 'Custom Email',
        message_body: entry.message || entry.body || entry.subject || '',
        attachments: entry.attachments || [],
        delivery_status: 'Sent',
        subject: entry.subject || '',
        sender_user_id: entry.sentBy,
      });
    } catch (err) {
      console.warn('[logEmailHistory] Notice:', err);
    }
  }
}
