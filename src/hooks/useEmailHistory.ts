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
export async function logEmailHistory(entry: Omit<EmailHistoryEntry, 'id'>) {
  await addDoc(collection(db, 'emailHistory'), {
    ...entry,
    timestamp: serverTimestamp(),
  });
}
