// functions/src/whatsappCloudInbound.ts
import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import * as logger from 'firebase-functions/logger';
import * as admin from 'firebase-admin';

try { admin.app(); } catch { admin.initializeApp(); }

// Set with: firebase functions:secrets:set WA_VERIFY_TOKEN
const VERIFY_TOKEN = defineSecret('WA_VERIFY_TOKEN');

/**
 * WhatsApp Cloud API webhook:
 *  - GET: verification (echo hub.challenge)
 *  - POST: inbound messages -> writes lastInboundAt to Firestore
 */
export const whatsappCloudInbound = onRequest(
  { region: 'europe-west2', secrets: [VERIFY_TOKEN] },
  async (req, res): Promise<void> => {
    // 1) Webhook verification
    if (req.method === 'GET') {
      const mode = req.query['hub.mode'];
      const token = req.query['hub.verify_token'];
      const challenge = req.query['hub.challenge'];

      if (mode === 'subscribe' && token === VERIFY_TOKEN.value()) {
        res.status(200).send(String(challenge ?? ''));
        return;
      }
      res.status(403).send('Verification failed');
      return;
    }

    // 2) Inbound messages
    if (req.method === 'POST') {
      try {
        const body = req.body;
        logger.info('WA inbound payload', { body });

        const entries = Array.isArray(body?.entry) ? body.entry : [];
        for (const entry of entries) {
          const changes = Array.isArray(entry?.changes) ? entry.changes : [];
          for (const change of changes) {
            const value = change?.value;
            const messages = Array.isArray(value?.messages) ? value.messages : [];
            for (const msg of messages) {
              const from = msg?.from as string | undefined; // E.164 like "+447700900123"
              if (from && from.startsWith('+')) {
                await admin.firestore()
                  .collection('whatsappContacts')
                  .doc(from)
                  .set(
                    {
                      lastInboundAt: admin.firestore.FieldValue.serverTimestamp(),
                      lastMessage: {
                        id: msg?.id ?? null,
                        type: msg?.type ?? null,
                        text: msg?.text?.body ?? null,
                        timestampMs: msg?.timestamp ? Number(msg.timestamp) * 1000 : null,
                      },
                    },
                    { merge: true }
                  );
              }
            }
          }
        }

        // Always 200 to avoid retries
        res.status(200).send('ok');
        return;
      } catch (e) {
        logger.error('whatsappCloudInbound error', e);
        // Still 200 to prevent repeated retries from Meta
        res.status(200).send('ok');
        return;
      }
    }

    res.status(405).send('Method not allowed');
  }
);
