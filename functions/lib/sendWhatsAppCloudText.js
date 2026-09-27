"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendWhatsAppCloudText = void 0;
// functions/src/sendWhatsAppCloudText.ts
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const logger = __importStar(require("firebase-functions/logger"));
const admin = __importStar(require("firebase-admin"));
try {
    admin.app();
}
catch (_a) {
    admin.initializeApp();
}
// Set with CLI:
//   firebase functions:secrets:set WA_ACCESS_TOKEN
//   firebase functions:secrets:set WA_PHONE_NUMBER_ID
const WA_ACCESS_TOKEN = (0, params_1.defineSecret)('WA_ACCESS_TOKEN');
const WA_PHONE_NUMBER_ID = (0, params_1.defineSecret)('WA_PHONE_NUMBER_ID');
/**
 * Callable from the client:
 *   sendWhatsAppCloudText({ to: "+447700900123", body: "Hello 👋" })
 *
 * Notes:
 * - "to" should be E.164 (e.g., +447700900123). We’ll strip "+" for Meta.
 * - This sends a free-form text; to start or resume after 24h, use templates instead.
 */
exports.sendWhatsAppCloudText = (0, https_1.onCall)({
    region: 'europe-west2',
    secrets: [WA_ACCESS_TOKEN, WA_PHONE_NUMBER_ID],
    cors: true,
}, async (request) => {
    var _a, _b, _c;
    const data = ((_a = request.data) !== null && _a !== void 0 ? _a : {});
    const toInput = ((_b = data.to) !== null && _b !== void 0 ? _b : '').toString().trim();
    const body = ((_c = data.body) !== null && _c !== void 0 ? _c : '').toString().trim();
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
        to, // digits only (no "+")
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
    }
    catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        logger.error('sendWhatsAppCloudText exception', msg);
        return { ok: false, error: msg };
    }
});
//# sourceMappingURL=sendWhatsAppCloudText.js.map