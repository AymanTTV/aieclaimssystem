"use strict";
/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.onAccidentCreated = exports.onAccidentReportCreated = exports.mondayAutoEmailJob = exports.whatsappCloudInbound = exports.sendWhatsAppCloudText = void 0;
const firebase_functions_1 = require("firebase-functions");
// functions/src/index.ts
// functions/src/index.ts
// functions/src/index.ts
var sendWhatsAppCloudText_1 = require("./sendWhatsAppCloudText");
Object.defineProperty(exports, "sendWhatsAppCloudText", { enumerable: true, get: function () { return sendWhatsAppCloudText_1.sendWhatsAppCloudText; } });
var whatsappCloudInbound_1 = require("./whatsappCloudInbound"); // (your webhook)
Object.defineProperty(exports, "whatsappCloudInbound", { enumerable: true, get: function () { return whatsappCloudInbound_1.whatsappCloudInbound; } });
var mondayAutoEmailJob_1 = require("./mondayAutoEmailJob");
Object.defineProperty(exports, "mondayAutoEmailJob", { enumerable: true, get: function () { return mondayAutoEmailJob_1.mondayAutoEmailJob; } });
var onAccidentReportCreated_1 = require("./onAccidentReportCreated");
Object.defineProperty(exports, "onAccidentReportCreated", { enumerable: true, get: function () { return onAccidentReportCreated_1.onAccidentReportCreated; } });
Object.defineProperty(exports, "onAccidentCreated", { enumerable: true, get: function () { return onAccidentReportCreated_1.onAccidentCreated; } });
// Start writing functions
// https://firebase.google.com/docs/functions/typescript
// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
(0, firebase_functions_1.setGlobalOptions)({ maxInstances: 10 });
// export const helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });
//# sourceMappingURL=index.js.map