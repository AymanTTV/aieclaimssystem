// src/utils/tvMirrorService.ts
import { db } from '../lib/firebase';
import {
  collection,
  query,
  onSnapshot,
  getDocs,
} from 'firebase/firestore';
import {
  differenceInCalendarDays,
  startOfDay,
  isValid,
  format,
  isBefore,
  endOfDay,
} from 'date-fns';

export type TVFilterCategory = 'all' | 'maintenance' | 'rent-schedule' | 'available-vehicles';

export interface TVBoardItem {
  id: string;
  category: 'maintenance' | 'rental' | 'available';
  source: 'maintenance' | 'rental' | 'vehicle';
  title: string;
  type: string;
  description?: string;
  status: 'in-progress' | 'scheduled' | 'available';
  scheduledDate: Date;
  daysRemaining: number;
  isUrgent: boolean; // scheduled && daysRemaining < 7
  isWorkshop: boolean; // status === 'in-progress'
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleReg?: string;
  location?: string;
  serviceProvider?: string;
  customerName?: string;
  orderNumber?: string;
}

export type TVRotationSpeed = 15000 | 30000 | 60000 | 120000;

export const TV_ROTATION_SPEED_OPTIONS: { label: string; value: TVRotationSpeed }[] = [
  { label: '15 Seconds (Default)', value: 15000 },
  { label: '30 Seconds', value: 30000 },
  { label: '1 Minute', value: 60000 },
  { label: '2 Minutes', value: 120000 },
];

function parseValidDate(raw: any): Date {
  if (!raw) return new Date();
  if (raw.toDate && typeof raw.toDate === 'function') {
    return raw.toDate();
  }
  const d = new Date(raw);
  return isValid(d) ? d : new Date();
}

/**
 * Standardizes maintenance logs, rentals, and available vehicles into TVBoardItems
 */
export function buildTVBoardItems(
  maintenanceDocs: any[],
  rentalDocs: any[],
  vehicleDocs: any[]
): TVBoardItem[] {
  const now = new Date();
  const todayStart = startOfDay(now);
  const items: TVBoardItem[] = [];

  // Map vehicles by ID
  const vehiclesMap: Record<string, any> = {};
  vehicleDocs.forEach((v) => {
    vehiclesMap[v.id] = v;
  });

  // 1. Process Maintenance Records
  maintenanceDocs.forEach((m) => {
    const rawStatus = (m.status || '').toLowerCase().trim();
    if (['completed', 'cancelled', 'draft', 'closed'].includes(rawStatus)) {
      return;
    }

    const jobDate = parseValidDate(m.date || m.nextServiceDate || m.createdAt);
    const isInProgress =
      rawStatus === 'in-progress' ||
      rawStatus === 'in progress' ||
      rawStatus === 'active' ||
      rawStatus === 'ongoing' ||
      rawStatus === 'started';

    const daysRemaining = differenceInCalendarDays(jobDate, todayStart);
    const isUrgent = !isInProgress && daysRemaining < 7; // < 7 Days urgent rule

    const vInfo = vehiclesMap[m.vehicleId] || m.vehicleDetails || {};
    const reg =
      vInfo.registrationNumber ||
      vInfo.regNumber ||
      vInfo.reg ||
      m.registrationNumber ||
      m.vehicleDetails?.registrationNumber ||
      'UNKNOWN';
    const make = vInfo.make || m.vehicleDetails?.make || m.make || '';
    const model = vInfo.model || m.vehicleDetails?.model || m.model || '';

    items.push({
      id: `maint-${m.id}`,
      category: 'maintenance',
      source: 'maintenance',
      title: (m.type || m.serviceType || 'Maintenance').replace(/-/g, ' ').toUpperCase(),
      type: m.type || m.serviceType || 'Service & Repairs',
      description: m.description || m.notes || 'Workshop Maintenance',
      status: isInProgress ? 'in-progress' : 'scheduled',
      scheduledDate: jobDate,
      daysRemaining,
      isUrgent,
      isWorkshop: isInProgress,
      vehicleMake: make,
      vehicleModel: model,
      vehicleReg: reg,
      location: m.location || m.workshop || 'Main Workshop Bay',
      serviceProvider: m.serviceProvider || m.technician || 'Fleet Technician',
      orderNumber: m.orderNumber || m.invoiceNumber,
    });
  });

  // 2. Process Rental Schedule Records
  rentalDocs.forEach((r) => {
    const rawStatus = (r.status || '').toLowerCase().trim();
    if (['completed', 'cancelled', 'draft', 'returned'].includes(rawStatus)) {
      return;
    }

    const startDate = parseValidDate(r.startDate || r.pickupDate || r.createdAt);
    const isInProgress =
      rawStatus === 'active' ||
      rawStatus === 'in-progress' ||
      rawStatus === 'in progress' ||
      rawStatus === 'on-hire' ||
      rawStatus === 'hired';

    const daysRemaining = differenceInCalendarDays(startDate, todayStart);
    const isUrgent = !isInProgress && daysRemaining < 7;

    const vInfo = vehiclesMap[r.vehicleId] || {};
    const reg =
      vInfo.registrationNumber ||
      vInfo.regNumber ||
      r.vehicleRegistration ||
      r.registrationNumber ||
      'UNKNOWN';
    const make = vInfo.make || r.vehicleMake || r.make || '';
    const model = vInfo.model || r.vehicleModel || r.model || '';

    items.push({
      id: `rental-${r.id}`,
      category: 'rental',
      source: 'rental',
      title: `RENT SCHEDULE • ${(r.type || 'Driver Hire').toUpperCase()}`,
      type: r.type ? `${r.type.toUpperCase()} RENTAL` : 'FLEET HIRE',
      description: r.customerName
        ? `Driver / Hirer: ${r.customerName}`
        : r.reason || 'Active Taxi / Fleet Rental Contract',
      status: isInProgress ? 'in-progress' : 'scheduled',
      scheduledDate: startDate,
      daysRemaining,
      isUrgent,
      isWorkshop: isInProgress,
      vehicleMake: make,
      vehicleModel: model,
      vehicleReg: reg,
      customerName: r.customerName,
      location: r.pickupLocation || 'Main Hub',
      serviceProvider: r.driverName || r.customerName || 'Fleet Dispatch',
      orderNumber: r.agreementNumber || r.id?.slice(0, 8),
    });
  });

  // 3. Process Available Depot-Ready Vehicles
  vehicleDocs.forEach((v) => {
    const rawStatus = (v.status || '').toLowerCase().trim();
    if (rawStatus === 'available' || rawStatus === 'ready' || rawStatus === 'depot-ready') {
      const reg = v.registrationNumber || v.regNumber || v.reg || 'UNKNOWN';
      items.push({
        id: `veh-${v.id}`,
        category: 'available',
        source: 'vehicle',
        title: 'AVAILABLE DEPOT VEHICLE',
        type: v.fuelType ? `${v.fuelType.toUpperCase()} FLEET READY` : 'DEPOT READY',
        description: `${v.year ? v.year + ' ' : ''}${v.transmission || 'Automatic'} • Unassigned & Inspected`,
        status: 'available',
        scheduledDate: now,
        daysRemaining: 0,
        isUrgent: false,
        isWorkshop: false,
        vehicleMake: v.make || 'Toyota',
        vehicleModel: v.model || 'Prius',
        vehicleReg: reg,
        location: v.location || v.depotLocation || 'Depot Bay A',
        serviceProvider: 'Fleet Depot Ops',
        orderNumber: v.chassisNumber?.slice(-6) || v.vin?.slice(-6),
      });
    }
  });

  // Sort: In-Progress Workshop jobs first, then Urgent (< 7 days), then by scheduled date
  items.sort((a, b) => {
    if (a.isWorkshop && !b.isWorkshop) return -1;
    if (!a.isWorkshop && b.isWorkshop) return 1;
    if (a.isUrgent && !b.isUrgent) return -1;
    if (!a.isUrgent && b.isUrgent) return 1;
    return a.daysRemaining - b.daysRemaining;
  });

  return items;
}

/**
 * Filter items by selected TV category view
 */
export function filterTVItemsByCategory(
  items: TVBoardItem[],
  filter: TVFilterCategory
): TVBoardItem[] {
  if (filter === 'all') return items;
  if (filter === 'maintenance') return items.filter((i) => i.category === 'maintenance');
  if (filter === 'rent-schedule') return items.filter((i) => i.category === 'rental');
  if (filter === 'available-vehicles') return items.filter((i) => i.category === 'available');
  return items;
}

/**
 * Subscribe in real-time to all live TV mirror collections
 */
export function subscribeTVMirrorData(
  onData: (data: {
    maintenance: any[];
    rentals: any[];
    vehicles: any[];
    items: TVBoardItem[];
  }) => void
): () => void {
  let maintenance: any[] = [];
  let rentals: any[] = [];
  let vehicles: any[] = [];

  const update = () => {
    const items = buildTVBoardItems(maintenance, rentals, vehicles);
    onData({ maintenance, rentals, vehicles, items });
  };

  const unsubMaint = onSnapshot(
    collection(db, 'maintenanceLogs'),
    (snap) => {
      maintenance = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      update();
    },
    (err) => console.warn('[tvMirrorService] Maint listener note:', err)
  );

  const unsubRent = onSnapshot(
    collection(db, 'rentals'),
    (snap) => {
      rentals = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      update();
    },
    (err) => console.warn('[tvMirrorService] Rentals listener note:', err)
  );

  const unsubVeh = onSnapshot(
    collection(db, 'vehicles'),
    (snap) => {
      vehicles = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      update();
    },
    (err) => console.warn('[tvMirrorService] Vehicles listener note:', err)
  );

  return () => {
    unsubMaint();
    unsubRent();
    unsubVeh();
  };
}
