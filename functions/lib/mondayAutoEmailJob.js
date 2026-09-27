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
exports.mondayAutoEmailJob = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const logger = __importStar(require("firebase-functions/logger"));
const admin = __importStar(require("firebase-admin"));
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
/**
 * Format currency to 2 decimal places.
 */
function formatCurrency(amount) {
    const num = typeof amount === 'number' ? amount : parseFloat(String(amount || '0'));
    return isNaN(num) ? '0.00' : num.toFixed(2);
}
/**
 * Format a Date or Firestore Timestamp to DD/MM/YYYY.
 */
function formatDate(val) {
    if (!val) {
        const today = new Date();
        return `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
    }
    let d;
    if (typeof (val === null || val === void 0 ? void 0 : val.toDate) === 'function') {
        d = val.toDate();
    }
    else {
        d = new Date(val);
    }
    if (isNaN(d.getTime())) {
        return 'N/A';
    }
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
}
/**
 * Replace placeholders in template. Supports both {placeholder} and [placeholder] syntax.
 */
function replacePlaceholders(template, data) {
    let content = template;
    const replacements = {
        '{client_name}': data.client_name,
        '{rental_id}': data.rental_id,
        '{total_amount}': data.total_amount,
        '{paid_amount}': data.paid_amount,
        '{owing_amount}': data.owing_amount,
        '{due_date}': data.due_date,
        // Also support Bulk Email bracket placeholders
        '[Driver Name]': data.client_name,
        '[Driver\'s Name]': data.client_name,
        '[Customer Name]': data.client_name,
        '[Recipient Name]': data.client_name,
        '[Client Name]': data.client_name,
        '[Total Amount]': data.total_amount,
        '[Amount Paid]': data.paid_amount,
        '[Paid]': data.paid_amount,
        '[Owing]': data.owing_amount,
        '[Owing Balance]': data.owing_amount,
        '[owing Balance]': data.owing_amount,
        '[owing balance]': data.owing_amount,
        '[Outstanding Balance]': data.owing_amount,
        '[Due Date]': data.due_date,
        '[the current date]': data.due_date,
    };
    for (const [placeholder, value] of Object.entries(replacements)) {
        content = content.split(placeholder).join(value);
    }
    return content;
}
/**
 * Dispatches an email without attachments.
 * Integrates with EmailJS REST API, SMTP/provider envs, or records to Firestore for transmission.
 */
async function sendAutomatedEmail(params) {
    const emailServiceId = process.env.VITE_EMAILJS_SERVICE_ID || process.env.EMAILJS_SERVICE_ID;
    const emailTemplateId = process.env.VITE_EMAILJS_TEMPLATE_ID || process.env.EMAILJS_TEMPLATE_ID;
    const emailPublicKey = process.env.VITE_EMAILJS_PUBLIC_KEY || process.env.EMAILJS_PUBLIC_KEY;
    const emailPrivateKey = process.env.EMAILJS_PRIVATE_KEY;
    let deliveryStatus = 'sent';
    let deliveryError = null;
    if (emailServiceId && emailTemplateId && emailPublicKey) {
        try {
            const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    service_id: emailServiceId,
                    template_id: emailTemplateId,
                    user_id: emailPublicKey,
                    accessToken: emailPrivateKey,
                    template_params: {
                        to_email: params.toEmail,
                        to_name: params.toName,
                        subject: params.subject,
                        message: params.body,
                        reply_to: 'admin@aieskyline.com',
                        from_name: 'AIE Skyline Automated Reminders',
                        // STRICT REQUIREMENT: Exclude attachments
                        attachments: [],
                    },
                }),
            });
            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`EmailJS responded with ${response.status}: ${errText}`);
            }
        }
        catch (err) {
            logger.error(`Failed to send email via EmailJS for rental ${params.rentalId}:`, err);
            deliveryStatus = 'failed';
            deliveryError = (err === null || err === void 0 ? void 0 : err.message) || String(err);
        }
    }
    else {
        logger.info(`[SIMULATED DISPATCH - Email credentials not set in functions env] To: ${params.toEmail} | Subject: ${params.subject}`);
        deliveryStatus = 'simulated';
    }
    // Record dispatch in emailHistory collection (viewable in Email History UI)
    try {
        await db.collection('emailHistory').add({
            sentBy: 'System Automation (Monday Scheduled Job)',
            type: 'rental',
            templateId: params.templateId,
            recipients: [params.toEmail],
            subject: params.subject,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            rentalId: params.rentalId,
            status: deliveryStatus,
            error: deliveryError,
            hasAttachments: false, // Strict exclusion
        });
    }
    catch (logErr) {
        logger.error('Failed to log email history entry:', logErr);
    }
}
/**
 * Scheduled Backend Job:
 * - Runs every Monday at 12:00 AM (cron: 0 0 * * 1)
 * - Checks if global_auto_email_enabled is true
 * - Fetches active rentals where owing_amount > 0, enable_monday_auto_email is true,
 *   and category/status is NOT "Claims" or "Claim"
 * - Replaces placeholders: {client_name}, {rental_id}, {total_amount}, {paid_amount}, {owing_amount}, {due_date}
 * - Dispatches email strictly excluding attachments
 */
exports.mondayAutoEmailJob = (0, scheduler_1.onSchedule)({
    schedule: '0 0 * * 1', // Runs every Monday at 12:00 AM
    timeZone: 'Europe/London',
    region: 'europe-west2',
}, async (event) => {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    logger.info('=== Starting Monday Automated Rental Email Job ===');
    // 1. Check if global_auto_email_enabled is true
    let globalAutoEmailEnabled = true;
    try {
        const configDoc = await db.collection('system_settings').doc('global_config').get();
        if (configDoc.exists) {
            const configData = configDoc.data();
            if ((configData === null || configData === void 0 ? void 0 : configData.global_auto_email_enabled) === false) {
                globalAutoEmailEnabled = false;
            }
        }
        else {
            // Fallback check across system_settings collection
            const settingsSnap = await db.collection('system_settings').limit(1).get();
            if (!settingsSnap.empty) {
                const configData = settingsSnap.docs[0].data();
                if ((configData === null || configData === void 0 ? void 0 : configData.global_auto_email_enabled) === false) {
                    globalAutoEmailEnabled = false;
                }
            }
        }
    }
    catch (err) {
        logger.error('Error checking system_settings for global_auto_email_enabled:', err);
    }
    if (!globalAutoEmailEnabled) {
        logger.info('Global automated email is DISABLED (global_auto_email_enabled = false). Aborting job.');
        return;
    }
    // 2. Fetch the active template from Bulk Email system
    let template = {
        id: 'rental_reminder_monday',
        subjectTemplate: 'Rental Statement Breakdown - {rental_id}',
        bodyTemplate: `Dear {client_name},

We hope you had a productive week. This is your automated statement for the week starting Monday, {due_date}.

📄 Rental Statement Breakdown
Rental Reference: {rental_id}
Total Amount: £{total_amount}
Amount Paid: £{paid_amount}
Total Outstanding Balance: £{owing_amount}

Due Date: {due_date}

Please arrange for the Total Outstanding Balance to be settled today. Clearing your balance on Mondays ensures your account remains up to date and your vehicle hire continues without interruption.

If you have already made this payment, thank you—please feel free to ignore this reminder.

Kind regards,
Admin Team
AIE Skyline Limited`,
    };
    try {
        // Look up custom/active template in messageTemplates
        const templateDoc = await db.collection('messageTemplates').doc('rental_reminder_monday').get();
        if (templateDoc.exists) {
            const data = templateDoc.data();
            if (data === null || data === void 0 ? void 0 : data.bodyTemplate) {
                template = {
                    id: templateDoc.id,
                    subjectTemplate: data.subjectTemplate || template.subjectTemplate,
                    bodyTemplate: data.bodyTemplate,
                };
                logger.info('Using active template from messageTemplates: rental_reminder_monday');
            }
        }
        else {
            // Find any active template under rental category
            const tplSnap = await db
                .collection('messageTemplates')
                .where('category', '==', 'rental')
                .get();
            const activeTpl = tplSnap.docs.find((d) => d.id === 'rental_reminder_monday' ||
                (d.data().name && d.data().name.toLowerCase().includes('monday')));
            if (activeTpl) {
                const data = activeTpl.data();
                template = {
                    id: activeTpl.id,
                    subjectTemplate: data.subjectTemplate || template.subjectTemplate,
                    bodyTemplate: data.bodyTemplate || template.bodyTemplate,
                };
                logger.info(`Using active rental template: ${template.id}`);
            }
        }
    }
    catch (err) {
        logger.warn('Failed to fetch template from messageTemplates; using standard fallback:', err);
    }
    // 3. Fetch active rentals
    // Note: Query status == 'active', then filter in memory for robust field matching
    const rentalsSnap = await db
        .collection('rentals')
        .where('status', '==', 'active')
        .get();
    logger.info(`Found ${rentalsSnap.size} active rentals to evaluate.`);
    let eligibleCount = 0;
    let sentCount = 0;
    for (const rentalDoc of rentalsSnap.docs) {
        const rental = rentalDoc.data();
        const rentalId = rentalDoc.id;
        // STRICT EXCLUSION: Check the rental TYPE field/column. Automatically ignore and exclude all rentals where TYPE is "Claim" or "Claims".
        const rawType = String(rental.type || '').trim().toLowerCase();
        if (rawType === 'claim' || rawType === 'claims') {
            logger.info(`Rental ${rentalId} excluded: TYPE is set to "${rental.type}".`);
            continue;
        }
        // Additional safeguard check on category, reason, or status
        const category = String(rental.category || rental.reason || '').trim().toLowerCase();
        const status = String(rental.status || '').trim().toLowerCase();
        if (category === 'claims' ||
            category === 'claim' ||
            status === 'claims' ||
            status === 'claim') {
            logger.info(`Rental ${rentalId} excluded: category/reason/status is Claim/Claims.`);
            continue;
        }
        // Check enable_monday_auto_email (default true if undefined/null)
        const enableMondayAutoEmail = rental.enable_monday_auto_email !== undefined &&
            rental.enable_monday_auto_email !== null
            ? Boolean(rental.enable_monday_auto_email)
            : true;
        if (!enableMondayAutoEmail) {
            continue;
        }
        // Check owing_amount > 0
        const totalAmount = parseFloat((_c = (_b = (_a = rental.total_amount) !== null && _a !== void 0 ? _a : rental.cost) !== null && _b !== void 0 ? _b : rental.total) !== null && _c !== void 0 ? _c : 0);
        const paidAmount = parseFloat((_e = (_d = rental.paid_amount) !== null && _d !== void 0 ? _d : rental.paidAmount) !== null && _e !== void 0 ? _e : 0);
        const owingAmount = parseFloat((_h = (_g = (_f = rental.owing_amount) !== null && _f !== void 0 ? _f : rental.remainingAmount) !== null && _g !== void 0 ? _g : rental.owing) !== null && _h !== void 0 ? _h : (totalAmount - paidAmount));
        if (isNaN(owingAmount) || owingAmount <= 0) {
            continue;
        }
        eligibleCount++;
        // 4. Retrieve client/customer info
        let clientName = rental.customerName || rental.driverName || 'Valued Customer';
        let clientEmail = rental.customerEmail || rental.email || '';
        if ((!clientEmail || !clientName) && rental.customerId) {
            try {
                const custDoc = await db.collection('customers').doc(rental.customerId).get();
                if (custDoc.exists) {
                    const custData = custDoc.data();
                    clientName = (custData === null || custData === void 0 ? void 0 : custData.name) || (custData === null || custData === void 0 ? void 0 : custData.fullName) || clientName;
                    clientEmail = clientEmail || (custData === null || custData === void 0 ? void 0 : custData.email) || '';
                }
            }
            catch (custErr) {
                logger.warn(`Could not fetch customer doc ${rental.customerId}:`, custErr);
            }
        }
        if (!clientEmail) {
            logger.warn(`Rental ${rentalId} has outstanding balance £${owingAmount} but no customer email. Skipping.`);
            continue;
        }
        // Format placeholders
        const displayRentalId = rental.rentalAgreementNumber || rentalId;
        const formattedTotal = formatCurrency(totalAmount);
        const formattedPaid = formatCurrency(paidAmount);
        const formattedOwing = formatCurrency(owingAmount);
        const formattedDueDate = formatDate(rental.dueDate || rental.endDate || new Date());
        const placeholders = {
            client_name: clientName,
            rental_id: displayRentalId,
            total_amount: formattedTotal,
            paid_amount: formattedPaid,
            owing_amount: formattedOwing,
            due_date: formattedDueDate,
        };
        const finalSubject = replacePlaceholders(template.subjectTemplate, placeholders);
        const finalBody = replacePlaceholders(template.bodyTemplate, placeholders);
        logger.info(`Sending automated Monday email to ${clientEmail} for rental ${rentalId}...`);
        // Dispatch without attachments
        await sendAutomatedEmail({
            toEmail: clientEmail,
            toName: clientName,
            subject: finalSubject,
            body: finalBody,
            rentalId,
            templateId: template.id,
        });
        sentCount++;
    }
    logger.info(`=== Monday Automated Rental Email Job Completed: Evaluated ${rentalsSnap.size}, Eligible: ${eligibleCount}, Dispatched: ${sentCount} ===`);
});
//# sourceMappingURL=mondayAutoEmailJob.js.map