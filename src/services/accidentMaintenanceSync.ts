// src/services/accidentMaintenanceSync.ts
/**
 * Automated Workflow: Accident Form -> Maintenance Module Sync
 *
 * Execution Logic:
 * When an Accident Report is submitted or updated where vehicle is not drivable
 * (isDrivable = 'NO' or false):
 * 1. Automatically update Vehicle status in the database to 'OFF ROAD (VOR)'.
 * 2. Automatically generate a new Maintenance Ticket / Job Sheet pre-filled with accident data.
 * 3. The new Maintenance Ticket is immediately loaded by the real-time Firestore listener
 *    in `useMaintenanceLogs`, which automatically increments the "OFF ROAD (VOR)" summary card
 *    on the Maintenance Dashboard!
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  updateDoc,
  addDoc,
  setDoc,
  increment,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Vehicle } from '../types/vehicle';
import type { MaintenanceLog } from '../types/maintenance';
import toast from 'react-hot-toast';

export interface AccidentReportData {
  id?: string;
  refNo?: number | string | null;
  referenceNo?: number | string | null;
  referenceName?: string;
  vehicleId?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleVRN?: string;
  regNo?: string;
  isDrivable?: boolean | string;
  isVehicleDrivable?: boolean | string;
  drivable?: boolean | string;
  accidentDate?: string;
  accidentTime?: string;
  accidentLocation?: string;
  towYard?: string;
  currentLocation?: string;
  description?: string;
  damageDetails?: string;
  submittedBy?: string;
  submittedByName?: string;
  reportedBy?: string;
  [key: string]: any;
}

export interface SyncResult {
  triggered: boolean;
  ticketId?: string;
  vehicleId?: string;
  message?: string;
}

/**
 * Checks whether isDrivable indicates non-drivable / NO.
 * Handles 'NO', 'no', 'No', false, 'false', 'nondrivable', 'off-road', etc.
 */
export function isVehicleNonDrivable(val: unknown): boolean {
  if (val === false || val === 0) return true;
  if (typeof val === 'string') {
    const s = val.trim().toLowerCase();
    return (
      s === 'no' ||
      s === 'false' ||
      s === '0' ||
      s === 'non-drivable' ||
      s === 'nondrivable' ||
      s === 'non drivable' ||
      s === 'off road' ||
      s === 'off-road' ||
      s === 'vor' ||
      s === 'n'
    );
  }
  return false;
}

/**
 * Parses accident date & time into a valid Date instance for the Maintenance ticket booking date.
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
    console.warn('[accidentMaintenanceSync] Date parse fallback to now:', err);
  }
  return new Date();
}

/**
 * Normalizes VRN string for reliable database lookup (removes spaces, uppercase).
 */
function cleanVRN(vrn?: string): string {
  return (vrn || '').replace(/[\s-]/g, '').toUpperCase();
}

/**
 * Locates the vehicle in the `vehicles` collection by ID or registration number (VRM).
 */
async function findVehicle(
  vehicleId?: string,
  vehicleVRN?: string
): Promise<{ id: string; data: Vehicle } | null> {
  // 1. Direct ID lookup
  if (vehicleId && typeof vehicleId === 'string' && vehicleId.trim().length > 0) {
    try {
      const snap = await getDoc(doc(db, 'vehicles', vehicleId.trim()));
      if (snap.exists()) {
        return { id: snap.id, data: snap.data() as Vehicle };
      }
    } catch (err) {
      console.warn('[accidentMaintenanceSync] Lookup by ID failed:', err);
    }
  }

  // 2. Lookup by Registration Number (VRM)
  const targetVRN = cleanVRN(vehicleVRN);
  if (!targetVRN) return null;

  try {
    // Try exact match first
    const q1 = query(
      collection(db, 'vehicles'),
      where('registrationNumber', '==', vehicleVRN?.trim())
    );
    const snap1 = await getDocs(q1);
    if (!snap1.empty) {
      const first = snap1.docs[0];
      return { id: first.id, data: first.data() as Vehicle };
    }

    // Try all vehicles and match stripped VRN
    const allVehiclesSnap = await getDocs(collection(db, 'vehicles'));
    for (const vDoc of allVehiclesSnap.docs) {
      const vData = vDoc.data() as Vehicle;
      if (cleanVRN(vData.registrationNumber) === targetVRN) {
        return { id: vDoc.id, data: vData };
      }
    }
  } catch (err) {
    console.warn('[accidentMaintenanceSync] Lookup by VRM failed:', err);
  }

  return null;
}

/**
 * AUTOMATED WORKFLOW TRIGGER:
 * `triggerAfterAccidentReportInsert`
 *
 * Runs immediately whenever a new Accident Report is created or updated in the database.
 * If `isDrivable === false` or `isDrivable === 'NO'`:
 *   a. Automatically updates the Vehicle status to 'OFF ROAD (VOR)' in Firestore.
 *   b. Increments the 'OFF ROAD (VOR)' summary counts.
 *   c. Pre-fills and inserts a new Maintenance Ticket / Job Sheet into both
 *      `maintenanceLogs` (for UI display and VOR cards) and `maintenance_tickets`.
 */
export async function triggerAfterAccidentReportInsert(
  accidentId: string,
  accidentData: AccidentReportData,
  currentUser?: { id?: string; name?: string; email?: string; displayName?: string } | null
): Promise<SyncResult> {
  // 1. Check condition: Is the vehicle non-drivable?
  const nonDrivable =
    isVehicleNonDrivable(accidentData.isDrivable) ||
    isVehicleNonDrivable(accidentData.isVehicleDrivable) ||
    isVehicleNonDrivable(accidentData.drivable) ||
    accidentData.isOffRoad === true ||
    accidentData.isNonDrivable === true;

  if (!nonDrivable) {
    return {
      triggered: false,
      message: 'Vehicle is drivable. No off-road maintenance ticket required.',
    };
  }

  try {
    const vrm = (
      accidentData.vehicleVRN ||
      accidentData.vehicleRegistration ||
      accidentData.regNo ||
      accidentData.vrm ||
      ''
    ).trim();

    const vehicleResult = await findVehicle(accidentData.vehicleId, vrm);
    const vehicleId = vehicleResult?.id || accidentData.vehicleId || '';
    const vehicleData = vehicleResult?.data;

    // 2. Automatically update the Vehicle status in the database to 'OFF ROAD (VOR)'
    if (vehicleId) {
      try {
        const vehicleRef = doc(db, 'vehicles', vehicleId);
        await updateDoc(vehicleRef, {
          status: 'OFF ROAD (VOR)',
          statusReason: 'OFF ROAD (VOR) - Accident Damage',
          offRoadReason: 'OFF ROAD (VOR) - Accident Damage',
          isOffRoad: true,
          isNonDrivable: true,
          roadCondition: 'OFF ROAD (VOR)',
          lastAccidentId: accidentId,
          lastAccidentRef: accidentData.refNo || accidentData.referenceNo || null,
          updatedAt: Timestamp.now(),
        });
      } catch (vehErr) {
        console.error('[accidentMaintenanceSync] Error updating vehicle status:', vehErr);
      }
    }

    // 3. Pre-fill Maintenance Ticket Data Mapping
    // - Vehicle Registration (VRM) <- Copy from Accident Form
    const vrmFinal = vehicleData?.registrationNumber || vrm || 'UNKNOWN VRM';
    const makeFinal = vehicleData?.make || accidentData.vehicleMake || '';
    const modelFinal = vehicleData?.model || accidentData.vehicleModel || '';

    // - Booking Date (Maintenance) <- Copy Date & Time from Accident Form
    const bookingDate = parseBookingDateTime(
      accidentData.accidentDate,
      accidentData.accidentTime
    );
    const bookingTimestamp = Timestamp.fromDate(bookingDate);

    // - Current Location / Tow Yard <- Copy from Accident Form
    const currentLocationOrTowYard =
      accidentData.towYard?.trim() ||
      accidentData.currentLocation?.trim() ||
      accidentData.accidentLocation?.trim() ||
      'Accident Site / Tow Recovery Yard';

    // - Initial Maintenance Notes <- Copy from Accident Damage Description
    const damageDesc = (accidentData.damageDetails || '').trim();
    const incidentDesc = (accidentData.description || '').trim();
    const initialNotes = [
      `[AUTOMATIC JOB SHEET GENERATED FROM ACCIDENT REPORT]`,
      `Vehicle Status: OFF ROAD (VOR) - Non-Drivable`,
      `Accident Ref: #${accidentData.refNo || accidentData.referenceNo || 'N/A'} - ${accidentData.referenceName || 'Claim'}`,
      `Current Location / Tow Yard: ${currentLocationOrTowYard}`,
      `Damage Description:\n${damageDesc || 'No specific damage breakdown provided.'}`,
      incidentDesc ? `Incident Details:\n${incidentDesc}` : '',
    ]
      .filter(Boolean)
      .join('\n\n');

    // - Reported By <- Copy from Accident Form Submitter
    const reportedBy =
      currentUser?.displayName ||
      currentUser?.name ||
      currentUser?.email ||
      accidentData.submittedByName ||
      accidentData.reportedBy ||
      accidentData.referenceName ||
      'Accident Reporting Submitter';

    const orderNumber = `VOR-${accidentData.refNo || accidentData.referenceNo || Date.now().toString().slice(-4)}`;

    // Prepare complete Maintenance Ticket payload
    const maintenanceTicketData: Partial<MaintenanceLog> & Record<string, any> = {
      // Vehicle Identification
      vehicleId: vehicleId || '',
      vehicleDetails: {
        make: makeFinal,
        model: modelFinal,
        registrationNumber: vrmFinal,
      },
      // Job & Order Number
      orderNumber,
      // Category & Type Mapping
      type: 'accident-repair',
      category: 'ACCIDENT DAMAGE',
      ticketCategory: 'ACCIDENT DAMAGE',
      // Status & Road Condition Mapping
      status: 'off-road', // Status: OFF ROAD (VOR)
      statusDisplay: 'OFF ROAD (VOR)',
      roadCondition: 'OFF ROAD (VOR)',
      isOffRoad: true,
      isNonDrivable: true,
      dueToAccident: true,
      // Date Mapping (stored as Firestore Timestamp so useMaintenanceLogs converts safely)
      date: bookingTimestamp,
      bookingDate: bookingTimestamp,
      // Location Mapping
      location: currentLocationOrTowYard,
      currentLocation: currentLocationOrTowYard,
      serviceProvider: accidentData.towYard || 'Accident Recovery & Bodywork Workshop',
      // Description & Initial Notes Mapping
      description: `ACCIDENT DAMAGE (VOR): ${damageDesc || incidentDesc || 'Vehicle non-drivable off-road following accident'}`,
      notes: initialNotes,
      initialNotes,
      damageDetails: damageDesc,
      // Submitter Tracking
      reportedBy,
      createdBy: currentUser?.id || accidentData.submittedBy || 'system',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      updatedBy: currentUser?.id || accidentData.submittedBy || 'system',
      // Associated Accident References
      accidentId,
      accidentReportId: accidentId,
      accidentRef: String(accidentData.refNo || accidentData.referenceNo || accidentData.referenceName || ''),
      // Default Financial / Inventory values
      cost: 0,
      netAmount: 0,
      vatAmount: 0,
      laborCost: 0,
      currentMileage: Number(accidentData.mileage || vehicleData?.mileage || 0),
      nextServiceMileage: 0,
      parts: [],
      paymentStatus: 'unpaid',
      payments: [],
    };

    // 4. Insert the new Maintenance Ticket into Firestore 'maintenanceLogs' (powers Maintenance Page)
    const ticketDocRef = await addDoc(
      collection(db, 'maintenanceLogs'),
      maintenanceTicketData
    );

    // 5. Also insert into 'maintenance_tickets' collection as requested
    try {
      await addDoc(collection(db, 'maintenance_tickets'), {
        ...maintenanceTicketData,
        maintenanceLogId: ticketDocRef.id,
      });
    } catch (ticketErr) {
      console.warn('[accidentMaintenanceSync] Note writing to maintenance_tickets collection:', ticketErr);
    }

    // 6. Increment summary cards
    try {
      await setDoc(
        doc(db, 'maintenance_summaries', 'dashboard'),
        {
          offRoadVORCount: increment(1),
          lastUpdated: Timestamp.now(),
        },
        { merge: true }
      );
      await setDoc(
        doc(db, 'system_summaries', 'maintenance'),
        {
          offRoadVORCount: increment(1),
          lastUpdated: Timestamp.now(),
        },
        { merge: true }
      );
    } catch (sumErr) {
      console.warn('[accidentMaintenanceSync] Summary increment note:', sumErr);
    }

    // 7. Cross-reference ticket ID back into accident collections
    try {
      await updateDoc(doc(db, 'accidents', accidentId), {
        maintenanceTicketId: ticketDocRef.id,
        maintenanceJobSheetCreated: true,
        vehicleStatusVOR: true,
        isDrivable: false,
        isVehicleDrivable: 'NO',
        updatedAt: Timestamp.now(),
      });
    } catch {
      // Document might be in accident_reports
    }

    try {
      await setDoc(
        doc(db, 'accident_reports', accidentId),
        {
          ...accidentData,
          maintenanceTicketId: ticketDocRef.id,
          maintenanceJobSheetCreated: true,
          vehicleStatusVOR: true,
          isDrivable: 'NO',
          updatedAt: Timestamp.now(),
        },
        { merge: true }
      );
    } catch {
      // Ignore if accident_reports does not exist
    }

    toast.success(
      `Vehicle marked OFF ROAD (VOR). Maintenance Ticket ${orderNumber} created automatically!`,
      { duration: 5500 }
    );

    return {
      triggered: true,
      ticketId: ticketDocRef.id,
      vehicleId,
      message: `Maintenance Ticket ${orderNumber} generated for VOR vehicle ${vrmFinal}.`,
    };
  } catch (error) {
    console.error('[accidentMaintenanceSync] Error during automated workflow:', error);
    toast.error('Accident reported, but auto-creation of maintenance job sheet encountered an issue.');
    return {
      triggered: false,
      message: String(error),
    };
  }
}
