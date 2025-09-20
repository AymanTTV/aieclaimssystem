// src/hooks/useWhatsappHistory.ts
import { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import {
  collection, onSnapshot, orderBy, query, addDoc, Timestamp
} from 'firebase/firestore';
import { EmailType } from '../constants/emailTemplates';

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

export async function logWhatsappHistory(item: Omit<WhatsappHistoryItem,'id'>) {
  await addDoc(collection(db,'whatsappHistory'), {
    ...item,
    timestamp: Timestamp.fromDate(item.timestamp || new Date())
  });
}
