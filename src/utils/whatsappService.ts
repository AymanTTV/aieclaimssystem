// src/utils/whatsappService.ts
import { httpsCallable } from 'firebase/functions';
import { functions } from '../lib/firebase';

// to: E.164 like "+447700900123" (we’ll strip "+" server-side for Meta)
export async function sendWhatsapp(args: { to: string; body: string }): Promise<void> {
  const fn = httpsCallable(functions, 'sendWhatsAppCloudText');
  const res: any = await fn(args);
  if (!res?.data?.ok) {
    throw new Error(res?.data?.error || 'WhatsApp send failed');
  }
}
