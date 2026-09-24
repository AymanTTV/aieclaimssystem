// src/hooks/useWhatsappHistory.ts
import { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import {
  collection, onSnapshot, orderBy, query, addDoc, Timestamp
} from 'firebase/firestore';
import { EmailType } from '../constants/emailTemplates';
import { logCommunication } from '../services/communicationLogService';

export type WhatsappHistoryItem = {
  id: string;
  sentBy: string;
  type: EmailType;
  templateId: string;
  recipients: string[]; // ids
  subject: string;
  body: string;
  timestamp: Date;
};

export function useWhatsappHistory() {
  const [history, setHistory] = useState<WhatsappHistoryItem[]>([]);
  useEffect(() => {
    const q = query(collection(db,'whatsappHistory'), orderBy('timestamp','desc'));
    const unsub = onSnapshot(q, snap => {
      const arr: WhatsappHistoryItem[] = [];
      snap.forEach(d => {
        const data: any = d.data();
        arr.push({
          id: d.id,
          sentBy: data.sentBy,
          type: data.type,
          templateId: data.templateId,
          recipients: data.recipients || [],
          subject: data.subject || '',
          body: data.body || '',
          timestamp: (data.timestamp?.toDate?.() || new Date(data.timestamp)) || new Date(),
        });
      });
      setHistory(arr);
    });
    return () => unsub();
  }, []);
  return { history };
}

export async function logWhatsappHistory(item: Omit<WhatsappHistoryItem,'id'> & Record<string, any>) {
  await addDoc(collection(db,'whatsappHistory'), {
    ...item,
    timestamp: Timestamp.fromDate(item.timestamp || new Date())
  });

  if (!item.skipCommunicationLogs) {
    try {
      const recipientContact = Array.isArray(item.recipients) ? item.recipients.join(', ') : String(item.recipients || '');
      await logCommunication({
        communication_channel: 'WhatsApp',
        recipient_role: item.recipientRole || (item.type ? String(item.type).toUpperCase() : 'Customer'),
        recipient_name: item.recipientName || recipientContact || 'Recipient',
        recipient_contact: recipientContact,
        source_module: item.sourceModule || (item.type ? String(item.type).charAt(0).toUpperCase() + String(item.type).slice(1) : 'General'),
        record_id: item.recordId || item.rentalId || item.claimId || item.invoiceId || '',
        template_name: item.templateName || item.templateId || 'Custom WhatsApp',
        message_body: item.body || item.message || item.subject || '',
        attachments: item.attachments || [],
        delivery_status: 'Sent',
        subject: item.subject || '',
        sender_user_id: item.sentBy,
      });
    } catch (err) {
      console.warn('[logWhatsappHistory] Notice:', err);
    }
  }
}
