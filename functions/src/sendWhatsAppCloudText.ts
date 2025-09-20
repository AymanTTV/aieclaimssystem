// functions/src/sendWhatsAppCloudText.ts
import { onCall } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import * as logger from 'firebase-functions/logger';
import * as admin from 'firebase-admin';

try { admin.app(); } catch { admin.initializeApp(); }

// Set with CLI:
//   firebase functions:secrets:set WA_ACCESS_TOKEN
//   firebase functions:secrets:set WA_PHONE_NUMBER_ID
const WA_ACCESS_TOKEN = defineSecret('WA_ACCESS_TOKEN');
const WA_PHONE_NUMBER_ID = defineSecret('WA_PHONE_NUMBER_ID');

/**
 * Callable from the client:
 *   sendWhatsAppCloudText({ to: "+447700900123", body: "Hello 👋" })
 *
 * Notes:
 * - "to" should be E.164 (e.g., +447700900123). We’ll strip "+" for Meta.
 * - This sends a free-form text; to start or resume after 24h, use templates instead.
 */
export const sendWhatsAppCloudText = onCall(
  {
    region: 'europe-west2',
    secrets: [WA_ACCESS_TOKEN, WA_PHONE_NUMBER_ID],
    cors: true,
  },
  async (request) => {
    const data = (request.data ?? {}) as { to?: string; body?: string };

    const toInput = (data.to ?? '').toString().trim();
    const body = (data.body ?? '').toString().trim();

    if (!toInput) {
      return { ok: false, error: 'Missing "to" (E.164, e.g. +447700900123)' };
    }
    if (!body) {
      return { ok: false, error: 'Missing "body"' };
    }
    if (body.length > 4096) {
      return { ok: false, error: 'Body too long (max 4096 chars)' };
    }

    // WhatsApp Cloud API expects digits-only international number (no "+")
    const to = toInput.replace(/[^\d]/g, '');
    if (!/^\d{8,15}$/.test(to)) {
      return { ok: false, error: 'Invalid "to" number format' };
    }

    const token = WA_ACCESS_TOKEN.value();
    const phoneNumberId = WA_PHONE_NUMBER_ID.value();
    if (!token || !phoneNumberId) {
      logger.error('WhatsApp Cloud API secrets missing.');
      return { ok: false, error: 'Server not configured (missing WA secrets)' };
    }

    const url = `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`;
    const payload = {
      messaging_product: 'whatsapp',
      to,                 // digits only (no "+")
      type: 'text',
      text: { body, preview_url: false },
    };

    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        const errText = await resp.text().catch(() => '');
        logger.error('WA send error', { status: resp.status, body: errText });
        return { ok: false, error: `Meta API ${resp.status}: ${errText}` };
      }

      const json = await resp.json().catch(() => ({}));
      // { messages: [{ id: 'wamid.HBg...' }], ... }
      return { ok: true, response: json };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      logger.error('sendWhatsAppCloudText exception', msg);
      return { ok: false, error: msg };
    }
  }
);
