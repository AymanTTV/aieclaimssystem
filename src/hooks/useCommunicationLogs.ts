// src/hooks/useCommunicationLogs.ts

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  limit,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { CommunicationLog } from '../types/communicationLog';

export interface UseCommunicationLogsOptions {
  recordId?: string;
  customerId?: string;
  sourceModule?: string;
  matchKeys?: (string | undefined | null)[];
  maxLimit?: number;
}

export function useCommunicationLogs(options: UseCommunicationLogsOptions = {}) {
  const { recordId, customerId, sourceModule, matchKeys = [], maxLimit = 300 } = options;
  const [commLogs, setCommLogs] = useState<CommunicationLog[]>([]);
  const [autoLogs, setAutoLogs] = useState<CommunicationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const cleanMatchKeys = useMemo(() => {
    const list = new Set<string>();
    if (recordId) list.add(String(recordId).trim().toLowerCase());
    if (customerId) list.add(String(customerId).trim().toLowerCase());
    for (const k of matchKeys) {
      if (k) {
        const val = String(k).trim().toLowerCase();
        if (val.length > 1) {
          list.add(val);
          // If digits, also add normalized digits and digits without country code or leading 0
          const digitsOnly = val.replace(/\D/g, '');
          if (digitsOnly.length >= 7) {
            list.add(digitsOnly);
            if (digitsOnly.startsWith('44') && digitsOnly.length > 2) {
              list.add('0' + digitsOnly.slice(2));
              list.add(digitsOnly.slice(2));
            } else if (digitsOnly.startsWith('0') && digitsOnly.length > 1) {
              list.add('44' + digitsOnly.slice(1));
              list.add(digitsOnly.slice(1));
            }
          }
        }
      }
    }
    return Array.from(list);
  }, [recordId, customerId, JSON.stringify(matchKeys)]);

  useEffect(() => {
    setLoading(true);
    setError(null);

    // 1. Stream communication_logs
    const q = query(
      collection(db, 'communication_logs'),
      orderBy('timestamp', 'desc'),
      limit(maxLimit)
    );

    const unsubscribe1 = onSnapshot(
      q,
      (snap) => {
        const list: CommunicationLog[] = [];
        snap.forEach((docSnap) => {
          const data = docSnap.data();
          let ts = new Date();
          if (data.timestamp instanceof Timestamp) {
            ts = data.timestamp.toDate();
          } else if (data.timestamp?.toDate) {
            ts = data.timestamp.toDate();
          } else if (data.timestamp) {
            ts = new Date(data.timestamp);
          }

          list.push({
            id: docSnap.id,
            timestamp: ts,
            sender_user_id: data.sender_user_id || 'System User',
            communication_channel: (data.communication_channel as any) || 'Email',
            recipient_role: data.recipient_role || 'Customer',
            recipient_name: data.recipient_name || '',
            recipient_contact: data.recipient_contact || '',
            source_module: data.source_module || 'General',
            record_id: String(data.record_id || ''),
            template_name: data.template_name || 'Custom Message',
            message_body: data.message_body || '',
            attachments: data.attachments || [],
            delivery_status: (data.delivery_status as any) || 'Sent',
            subject: data.subject || '',
            customerId: data.customerId || '',
            vehicleId: data.vehicleId || '',
          });
        });

        setCommLogs(list);
        setLoading(false);
      },
      (err) => {
        console.warn('[useCommunicationLogs] Realtime stream notice:', err);
        setError(err);
        setLoading(false);
      }
    );

    // 2. Stream automated_email_logs
    let unsubscribe2 = () => {};
    try {
      const q2 = query(
        collection(db, 'automated_email_logs'),
        orderBy('timestamp', 'desc'),
        limit(maxLimit)
      );

      unsubscribe2 = onSnapshot(
        q2,
        (snap) => {
          const list: CommunicationLog[] = [];
          snap.forEach((docSnap) => {
            const data = docSnap.data();
            let ts = new Date();
            if (data.timestamp instanceof Timestamp) {
              ts = data.timestamp.toDate();
            } else if (data.timestamp?.toDate) {
              ts = data.timestamp.toDate();
            } else if (data.timestamp) {
              ts = new Date(data.timestamp);
            } else if (data.dateSent?.toDate) {
              ts = data.dateSent.toDate();
            } else if (data.dateSent) {
              ts = new Date(data.dateSent);
            } else if (data.createdAt?.toDate) {
              ts = data.createdAt.toDate();
            } else if (data.createdAt) {
              ts = new Date(data.createdAt);
            }

            const recContact =
              data.recipient_contact ||
              (Array.isArray(data.recipients) ? data.recipients.join(', ') : data.recipients) ||
              data.to_email ||
              data.email ||
              data.phone ||
              '';

            const attachments = Array.isArray(data.attachments) ? [...data.attachments] : [];
            const pdf = data.invoicePdfUrl || data.pdfUrl || data.documentUrl;
            if (pdf && !attachments.some((a: any) => (typeof a === 'string' ? a : a?.url) === pdf)) {
              attachments.push({ name: 'Invoice PDF', url: pdf });
            }

            list.push({
              id: docSnap.id,
              timestamp: ts,
              sender_user_id: data.sender_user_id || data.sentBy || 'Automated Scheduler',
              communication_channel: (data.communication_channel as any) || (data.channel as any) || 'Email',
              recipient_role: data.recipient_role || data.role || 'Customer',
              recipient_name: data.recipient_name || data.to_name || data.customerName || 'Customer',
              recipient_contact: String(recContact),
              source_module: data.source_module || 'Invoice',
              record_id: String(data.record_id || data.recordId || data.invoiceId || data.invoiceNumber || ''),
              template_name: data.template_name || data.templateId || 'Automated Email',
              message_body: data.message_body || data.body || data.message || '',
              attachments: attachments,
              delivery_status: (data.delivery_status as any) || data.status || 'Sent',
              subject: data.subject || '',
              customerId: data.customerId || '',
              vehicleId: data.vehicleId || '',
            });
          });
          setAutoLogs(list);
        },
        () => {
          // If query with orderBy fails (missing timestamp index or field), try without orderBy
          try {
            unsubscribe2 = onSnapshot(
              collection(db, 'automated_email_logs'),
              (fallbackSnap) => {
                const list: CommunicationLog[] = [];
                fallbackSnap.forEach((docSnap) => {
                  const data = docSnap.data();
                  let ts = new Date();
                  if (data.timestamp?.toDate) ts = data.timestamp.toDate();
                  else if (data.timestamp) ts = new Date(data.timestamp);
                  else if (data.dateSent?.toDate) ts = data.dateSent.toDate();
                  else if (data.dateSent) ts = new Date(data.dateSent);

                  const recContact =
                    data.recipient_contact ||
                    (Array.isArray(data.recipients) ? data.recipients.join(', ') : data.recipients) ||
                    data.to_email ||
                    '';

                  const attachments = Array.isArray(data.attachments) ? [...data.attachments] : [];
                  const pdf = data.invoicePdfUrl || data.pdfUrl || data.documentUrl;
                  if (pdf && !attachments.some((a: any) => (typeof a === 'string' ? a : a?.url) === pdf)) {
                    attachments.push({ name: 'Invoice PDF', url: pdf });
                  }

                  list.push({
                    id: docSnap.id,
                    timestamp: ts,
                    sender_user_id: data.sender_user_id || data.sentBy || 'Automated Scheduler',
                    communication_channel: (data.communication_channel as any) || 'Email',
                    recipient_role: data.recipient_role || data.role || 'Customer',
                    recipient_name: data.recipient_name || data.to_name || 'Customer',
                    recipient_contact: String(recContact),
                    source_module: data.source_module || 'Invoice',
                    record_id: String(data.record_id || data.recordId || data.invoiceId || data.invoiceNumber || ''),
                    template_name: data.template_name || data.templateId || 'Automated Email',
                    message_body: data.message_body || data.body || data.message || '',
                    attachments: attachments,
                    delivery_status: (data.delivery_status as any) || 'Sent',
                    subject: data.subject || '',
                    customerId: data.customerId || '',
                    vehicleId: data.vehicleId || '',
                  });
                });
                setAutoLogs(list);
              },
              () => {
                // Silently ignore if automated_email_logs is empty or inaccessible
              }
            );
          } catch {
            // ignore
          }
        }
      );
    } catch {
      // ignore
    }

    return () => {
      unsubscribe1();
      unsubscribe2();
    };
  }, [maxLimit]);

  // Combined and sorted logs
  const logs = useMemo(() => {
    const map = new Map<string, CommunicationLog>();
    for (const l of commLogs) {
      map.set(l.id, l);
    }
    for (const l of autoLogs) {
      if (!map.has(l.id)) {
        map.set(l.id, l);
      }
    }
    const merged = Array.from(map.values());
    merged.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    return merged;
  }, [commLogs, autoLogs]);

  // Filter logs based on matching criteria
  const filteredLogs = useMemo(() => {
    if (cleanMatchKeys.length === 0 && !sourceModule) {
      return logs;
    }

    return logs.filter((log) => {
      // Direct match on record_id, customerId, or contact
      const directMatch = cleanMatchKeys.some((key) => {
        return (
          log.record_id.toLowerCase() === key ||
          (log.customerId && log.customerId.toLowerCase() === key) ||
          log.recipient_contact.toLowerCase().includes(key)
        );
      });

      // If module filter specified
      if (sourceModule && log.source_module.toLowerCase() !== sourceModule.toLowerCase()) {
        if (!directMatch) return false;
      }

      if (cleanMatchKeys.length === 0) return true;
      if (directMatch) return true;

      // Check if any match key matches record_id, customerId, recipient_contact, or recipient_name
      const recId = log.record_id.toLowerCase();
      const cId = (log.customerId || '').toLowerCase();
      const contact = (log.recipient_contact || '').toLowerCase();
      const contactDigits = contact.replace(/\D/g, '');
      const rName = (log.recipient_name || '').toLowerCase();
      const subj = (log.subject || '').toLowerCase();

      return cleanMatchKeys.some((key) => {
        const keyDigits = key.replace(/\D/g, '');
        const phoneMatch = keyDigits.length >= 7 && contactDigits.length >= 7 && (contactDigits.includes(keyDigits) || keyDigits.includes(contactDigits));

        return (
          recId === key ||
          recId.includes(key) ||
          key.includes(recId) ||
          cId === key ||
          contact.includes(key) ||
          phoneMatch ||
          rName.includes(key) ||
          subj.includes(key)
        );
      });
    });
  }, [logs, cleanMatchKeys, sourceModule]);

  return {
    logs: filteredLogs,
    allLogs: logs,
    loading,
    error,
  };
}
