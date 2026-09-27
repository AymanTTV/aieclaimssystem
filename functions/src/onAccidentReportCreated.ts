// functions/src/onAccidentReportCreated.ts
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import * as logger from 'firebase-functions/logger';
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Normalizes VRN string for reliable database lookup (removes spaces, hyphens, uppercase).
 */
function cleanVRN(vrn?: string): string {
  return (vrn || '').replace(/[\s-]/g, '').toUpperCase();
}

/**
 * Checks whether isDrivable indicates non-drivable / NO.
 * Handles 'NO', 'no', 'No', false, 'false', etc.
 */
function isNonDrivable(val: unknown): boolean {
  if (val === false) return true;
  if (typeof val === 'string') {
    const trimmed = val.trim().toLowerCase();
    return trimmed === 'no' || trimmed === 'false' || trimmed === 'non-drivable' || trimmed === 'nondrivable';
  }
  return false;
}

/**
 * Parses accident date & time into a Date or Firestore Timestamp.
 */
function parseBookingDateTime(dateStr?: string, timeStr?: string): Date {
  if (!dateStr) return new Date();
  try {
    if (timeStr && timeStr.trim().length > 0) {
      const combined = new Date(`${dateStr}T${timeStr.trim()}`);
      if (!isNaN(combined.getTime())) {
        return combined;
      }
    }
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
  } catch (err) {
    logger.warn('[onAccidentReportCreated] Date parse fallback to now:', err);
  }
  return new Date();
}

/**
 * Core processor for when an accident report indicates a non-drivable vehicle.
 */
async function processNonDrivableAccident(
  reportId: string,
  accidentData: Record<string, any>
) {
  const isDrivableVal = accidentData.isDrivable;
  logger.info(`[onAccidentReportCreated] Processing accident report ${reportId} with isDrivable:`, isDrivableVal);

  // 0. Verification check: isDrivable set to 'NO' / false?
  if (!isNonDrivable(isDrivableVal)) {
    logger.info(`[onAccidentReportCreated] Vehicle in report ${reportId} is drivable. No action required.`);
    return;
  }

  const vrm = (
    accidentData.vehicleVRN ||
    accidentData.vehicleRegistration ||
    accidentData.regNo ||
    accidentData.vrm ||
    ''
  ).trim();

  let vehicleId = accidentData.vehicleId?.trim();
  let vehicleDocData: admin.firestore.DocumentData | null = null;

  // 1. Locate Vehicle
  if (vehicleId) {
    const vSnap = await db.collection('vehicles').doc(vehicleId).get();
    if (vSnap.exists) {
      vehicleDocData = vSnap.data() || null;
    } else {
      vehicleId = undefined;
    }
  }

  // Lookup vehicle by VRM if vehicleId was not provided or not found
  if (!vehicleId && vrm) {
    const targetVRN = cleanVRN(vrm);
    const qSnap = await db.collection('vehicles').where('registrationNumber', '==', vrm).get();
    if (!qSnap.empty) {
      const firstDoc = qSnap.docs[0];
      vehicleId = firstDoc.id;
      vehicleDocData = firstDoc.data();
    } else {
      // Fallback: search all vehicles by cleaned VRN
      const allVehiclesSnap = await db.collection('vehicles').get();
      for (const docSnap of allVehiclesSnap.docs) {
        const vData = docSnap.data();
        if (cleanVRN(vData.registrationNumber) === targetVRN) {
          vehicleId = docSnap.id;
          vehicleDocData = vData;
          break;
        }
      }
    }
  }

  const batch = db.batch();

  // 1) Update the corresponding 'Vehicle' status to 'OFF ROAD (VOR)' in Firestore
  if (vehicleId) {
    const vehicleRef = db.collection('vehicles').doc(vehicleId);
    batch.set(
      vehicleRef,
      {
        status: 'OFF ROAD (VOR)',
        statusReason: 'OFF ROAD (VOR) - Accident Damage',
        offRoadReason: 'OFF ROAD (VOR) - Accident Damage',
        isOffRoad: true,
        isNonDrivable: true,
        roadCondition: 'OFF ROAD (VOR)',
        lastAccidentId: reportId,
        lastAccidentRef: accidentData.refNo || accidentData.referenceNo || null,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    logger.info(`[onAccidentReportCreated] Queued status update to 'OFF ROAD (VOR)' for vehicle ${vehicleId}`);
  } else {
    logger.warn(`[onAccidentReportCreated] Could not find vehicle record for VRM: "${vrm}" or vehicleId: "${accidentData.vehicleId}"`);
  }

  // 2) Increment the 'OFF ROAD (VOR)' summary count
  const summaryRef1 = db.collection('system_summaries').doc('maintenance');
  batch.set(
    summaryRef1,
    {
      offRoadVORCount: admin.firestore.FieldValue.increment(1),
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  const summaryRef2 = db.collection('maintenance_summaries').doc('dashboard');
  batch.set(
    summaryRef2,
    {
      offRoadVORCount: admin.firestore.FieldValue.increment(1),
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
  logger.info(`[onAccidentReportCreated] Queued increment for 'OFF ROAD (VOR)' summary count.`);

  // 3) Create a new document in the 'maintenance_tickets' collection with the accident details (VRM, date, reportedBy, notes)
  const bookingDate = parseBookingDateTime(
    accidentData.accidentDate,
    accidentData.accidentTime
  );

  const currentLocation =
    accidentData.towYard?.trim() ||
    accidentData.currentLocation?.trim() ||
    accidentData.accidentLocation?.trim() ||
    'Accident Site / Tow Yard';

  const notes = [
    `[OFF ROAD (VOR) ACCIDENT TICKET]`,
    `Accident Ref: #${accidentData.refNo || accidentData.referenceNo || reportId}`,
    `Location / Tow Yard: ${currentLocation}`,
    `Damage Details: ${accidentData.damageDetails || 'None specified'}`,
    accidentData.description ? `Accident Description: ${accidentData.description}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');

  const reportedBy =
    accidentData.reportedBy ||
    accidentData.submittedByName ||
    accidentData.referenceName ||
    accidentData.submittedBy ||
    'Accident Submitter';

  const vrmFinal = vehicleDocData?.registrationNumber || vrm || 'UNKNOWN VRM';
  const orderNumber = `VOR-${accidentData.refNo || accidentData.referenceNo || Date.now().toString().slice(-4)}`;

  const maintenanceTicketRef = db.collection('maintenance_tickets').doc();
  const maintenanceTicketData = {
    id: maintenanceTicketRef.id,
    vrm: vrmFinal,
    vehicleRegistration: vrmFinal,
    vehicleId: vehicleId || '',
    vehicleMake: vehicleDocData?.make || accidentData.vehicleMake || '',
    vehicleModel: vehicleDocData?.model || accidentData.vehicleModel || '',
    date: admin.firestore.Timestamp.fromDate(bookingDate),
    bookingDate: admin.firestore.Timestamp.fromDate(bookingDate),
    status: 'OFF ROAD (VOR)',
    ticketCategory: 'ACCIDENT DAMAGE',
    category: 'ACCIDENT DAMAGE',
    currentLocation,
    location: currentLocation,
    notes,
    initialNotes: notes,
    damageDetails: accidentData.damageDetails || '',
    description: `ACCIDENT DAMAGE (VOR): ${accidentData.damageDetails || accidentData.description || 'Non-drivable vehicle damage'}`,
    reportedBy,
    accidentReportId: reportId,
    accidentId: reportId,
    orderNumber,
    isOffRoad: true,
    isNonDrivable: true,
    dueToAccident: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  batch.set(maintenanceTicketRef, maintenanceTicketData);
  logger.info(`[onAccidentReportCreated] Queued new maintenance_tickets document: ${maintenanceTicketRef.id}`);

  // Also synchronize to maintenanceLogs so UI dashboard and job sheets immediately recognize it
  const maintenanceLogRef = db.collection('maintenanceLogs').doc();
  batch.set(maintenanceLogRef, {
    ...maintenanceTicketData,
    id: maintenanceLogRef.id,
    maintenanceTicketId: maintenanceTicketRef.id,
    type: 'accident-repair',
    status: 'workshop',
    statusDisplay: 'OFF ROAD (VOR)',
    roadCondition: 'OFF ROAD (VOR)',
    cost: 0,
    paidAmount: 0,
    remainingAmount: 0,
    laborCost: 0,
    parts: [],
    paymentStatus: 'unpaid',
    serviceProvider: accidentData.towYard || 'Accident Repair Service Center',
    vehicleDetails: {
      make: vehicleDocData?.make || accidentData.vehicleMake || '',
      model: vehicleDocData?.model || accidentData.vehicleModel || '',
      registrationNumber: vrmFinal,
    },
  });

  // Cross-reference back to the accident report document
  const accidentReportRef = db.collection('accident_reports').doc(reportId);
  batch.set(
    accidentReportRef,
    {
      maintenanceTicketId: maintenanceTicketRef.id,
      maintenanceLogId: maintenanceLogRef.id,
      vehicleStatusVOR: true,
      processedByFunctionAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  // Also update 'accidents' collection if document exists there
  const accidentRef = db.collection('accidents').doc(reportId);
  batch.set(
    accidentRef,
    {
      maintenanceTicketId: maintenanceTicketRef.id,
      maintenanceLogId: maintenanceLogRef.id,
      vehicleStatusVOR: true,
      processedByFunctionAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  // Commit all atomic operations
  await batch.commit();
  logger.info(`[onAccidentReportCreated] Successfully executed automated workflow for report ${reportId}`);
}

/**
 * Firebase Cloud Function triggered on a new 'accident_reports' document.
 * (v2 Cloud Firestore Trigger)
 */
export const onAccidentReportCreated = onDocumentCreated(
  'accident_reports/{reportId}',
  async (event) => {
    const snap = event.data;
    if (!snap) {
      logger.warn('[onAccidentReportCreated] No document snapshot associated with event');
      return;
    }
    const accidentData = snap.data();
    const reportId = event.params.reportId;
    await processNonDrivableAccident(reportId, accidentData);
  }
);

/**
 * Also export trigger for 'accidents/{reportId}' to ensure full compatibility with the existing frontend
 */
export const onAccidentCreated = onDocumentCreated(
  'accidents/{reportId}',
  async (event) => {
    const snap = event.data;
    if (!snap) {
      logger.warn('[onAccidentCreated] No document snapshot associated with event');
      return;
    }
    const accidentData = snap.data();
    const reportId = event.params.reportId;
    // Prevent double execution if already processed
    if (accidentData.maintenanceTicketId || accidentData.processedByFunctionAt) {
      logger.info(`[onAccidentCreated] Accident ${reportId} already has a linked maintenance ticket.`);
      return;
    }
    await processNonDrivableAccident(reportId, accidentData);
  }
);
