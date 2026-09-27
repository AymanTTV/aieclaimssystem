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
exports.whatsappCloudInbound = void 0;
// functions/src/whatsappCloudInbound.ts
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
// Set with: firebase functions:secrets:set WA_VERIFY_TOKEN
const VERIFY_TOKEN = (0, params_1.defineSecret)('WA_VERIFY_TOKEN');
/**
 * WhatsApp Cloud API webhook:
 *  - GET: verification (echo hub.challenge)
 *  - POST: inbound messages -> writes lastInboundAt to Firestore
 */
exports.whatsappCloudInbound = (0, https_1.onRequest)({ region: 'europe-west2', secrets: [VERIFY_TOKEN] }, async (req, res) => {
    var _a, _b, _c, _d;
    // 1) Webhook verification
    if (req.method === 'GET') {
        const mode = req.query['hub.mode'];
        const token = req.query['hub.verify_token'];
        const challenge = req.query['hub.challenge'];
        if (mode === 'subscribe' && token === VERIFY_TOKEN.value()) {
            res.status(200).send(String(challenge !== null && challenge !== void 0 ? challenge : ''));
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
            const entries = Array.isArray(body === null || body === void 0 ? void 0 : body.entry) ? body.entry : [];
            for (const entry of entries) {
                const changes = Array.isArray(entry === null || entry === void 0 ? void 0 : entry.changes) ? entry.changes : [];
                for (const change of changes) {
                    const value = change === null || change === void 0 ? void 0 : change.value;
                    const messages = Array.isArray(value === null || value === void 0 ? void 0 : value.messages) ? value.messages : [];
                    for (const msg of messages) {
                        const from = msg === null || msg === void 0 ? void 0 : msg.from; // E.164 like "+447700900123"
                        if (from && from.startsWith('+')) {
                            await admin.firestore()
                                .collection('whatsappContacts')
                                .doc(from)
                                .set({
                                lastInboundAt: admin.firestore.FieldValue.serverTimestamp(),
                                lastMessage: {
                                    id: (_a = msg === null || msg === void 0 ? void 0 : msg.id) !== null && _a !== void 0 ? _a : null,
                                    type: (_b = msg === null || msg === void 0 ? void 0 : msg.type) !== null && _b !== void 0 ? _b : null,
                                    text: (_d = (_c = msg === null || msg === void 0 ? void 0 : msg.text) === null || _c === void 0 ? void 0 : _c.body) !== null && _d !== void 0 ? _d : null,
                                    timestampMs: (msg === null || msg === void 0 ? void 0 : msg.timestamp) ? Number(msg.timestamp) * 1000 : null,
                                },
                            }, { merge: true });
                        }
                    }
                }
            }
            // Always 200 to avoid retries
            res.status(200).send('ok');
            return;
        }
        catch (e) {
            logger.error('whatsappCloudInbound error', e);
            // Still 200 to prevent repeated retries from Meta
            res.status(200).send('ok');
            return;
        }
    }
    res.status(405).send('Method not allowed');
});
//# sourceMappingURL=whatsappCloudInbound.js.map