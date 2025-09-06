// src/members/hooks/useMemberRentalDetails.ts
import { useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  Timestamp,
  where,
} from "firebase/firestore";
import { db } from "../../lib/firebase";

export interface MemberRentalView {
  context: "active" | "completed" | "none";
  rentalId?: string;
  // Vehicle (minimal, member-safe)
  vehicle?: {
    make?: string;
    model?: string;
    plate?: string;
  };
  // Dates
  startDate?: Date | null;
  estimatedEndDate?: Date | null; // for active
  completedDate?: Date | null;    // for completed
  // Money
  totalPaid?: number;             // total paid for this rental
  totalOutstanding?: number;      // outstanding for this rental
  // Last payment
  lastPayment?: {
    date?: Date | null;
    amount?: number;
  } | null;
}

type FireDate = Date | Timestamp | null | undefined;
function toDate(d: FireDate): Date | null {
  if (!d) return null;
  if (d instanceof Date) return d;
  if (d instanceof Timestamp) return d.toDate();
  // some systems store millis
  const n = Number(d);
  return Number.isFinite(n) ? new Date(n) : null;
}

function n(v: unknown, fallback = 0): number {
  const x = Number(v);
  return Number.isFinite(x) ? x : fallback;
}

/**
 * Tries to safely compute "total due" from common rental fields.
 * If your rentals already store a single "totalDue" (or "amountDue") field,
 * this will prefer it.
 */
function deriveTotalDue(rental: any): number {
  // prefer explicit fields if present
  const explicit =
    rental?.totalDue ??
    rental?.amountDue ??
    rental?.total ??
    rental?.grandTotal;

  if (Number.isFinite(Number(explicit))) return Number(explicit);

  // otherwise build it from parts (very defensive)
  const net = n(rental?.net);
  const vat = n(rental?.vat);
  const discount = n(rental?.discount);
  const ongoing = n(rental?.ongoingCharges) + n(rental?.overdueCharges);
  // totalDue = net + vat + ongoing - discount
  return Math.max(0, net + vat + ongoing - discount);
}

/**
 * Pulls last payment and total paid for a specific rental.
 * Adjust the field names if your "transactions" schema differs.
 *
 * We try two common patterns:
 *  1) transactions where rentalId == rental.id
 *  2) transactions for the same customer with refType == "rental" (looser fallback)
 */
async function readPaymentsForRental(opts: {
  customerId: string;
  rentalId?: string;
}): Promise<{ lastPayment: MemberRentalView["lastPayment"]; totalPaid: number }> {
  const paymentsCol = collection(db, "transactions");

  // Primary: match this rentalId directly
  let q1 = query(
    paymentsCol,
    where("customerId", "==", opts.customerId),
    where("type", "in", ["payment", "Payment", "PAYMENT", "rentalPayment"].filter(Boolean)),
    where("amount", ">", 0),
    ...(opts.rentalId ? [where("rentalId", "==", opts.rentalId)] : []),
    orderBy("createdAt", "desc"),
    limit(20)
  );

  const snap1 = await getDocs(q1);
  if (!snap1.empty) {
    let totalPaid = 0;
    let lastPayment: MemberRentalView["lastPayment"] = null;
    snap1.forEach((d, idx) => {
      const data = d.data();
      totalPaid += n(data.amount);
      if (idx === 0) {
        lastPayment = {
          amount: n(data.amount),
          date: toDate(data.createdAt) || toDate(data.date),
        };
      }
    });
    return { lastPayment, totalPaid };
  }

  // Fallback: looser matching via refType "rental"
  let q2 = query(
    paymentsCol,
    where("customerId", "==", opts.customerId),
    where("type", "in", ["payment", "Payment", "PAYMENT", "rentalPayment"].filter(Boolean)),
    where("refType", "in", ["rental", "Rental"].filter(Boolean)),
    orderBy("createdAt", "desc"),
    limit(20)
  );

  const snap2 = await getDocs(q2);
  if (!snap2.empty) {
    let totalPaid = 0;
    let lastPayment: MemberRentalView["lastPayment"] = null;
    snap2.forEach((d, idx) => {
      const data = d.data();
      totalPaid += n(data.amount);
      if (idx === 0) {
        lastPayment = {
          amount: n(data.amount),
          date: toDate(data.createdAt) || toDate(data.date),
        };
      }
    });
    return { lastPayment, totalPaid };
  }

  return { lastPayment: null, totalPaid: 0 };
}

/**
 * Optional vehicle lookup when rentals only store vehicleId.
 * If your rental already embeds make/model/plate, we’ll just use that.
 */
async function readVehicleMinimal(vehicleId?: string) {
  if (!vehicleId) return undefined;
  const ref = doc(db, "vehicles", vehicleId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return undefined;
  const v = snap.data() || {};
  return {
    make: v.make || v.brand || v.manufacturer || undefined,
    model: v.model || v.series || undefined,
    plate: v.registration || v.plate || v.reg || v.plateNumber || undefined,
  };
}

export function useMemberRentalDetails(customerId?: string) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<MemberRentalView>({
    context: "none",
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!customerId) return;

    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);

        const rentalsCol = collection(db, "rentals");

        // 1) Prefer ACTIVE/ONGOING rentals
        const qActive = query(
          rentalsCol,
          where("customerId", "==", customerId),
          where("status", "in", ["active", "ongoing", "in-progress"].filter(Boolean)),
          orderBy("startDate", "desc"),
          limit(1)
        );
        const activeSnap = await getDocs(qActive);

        const useCompletedInstead = activeSnap.empty;

        // 2) Or else the most recent COMPLETED
        let rentalDoc = activeSnap.docs[0];
        if (useCompletedInstead) {
          const qCompleted = query(
            rentalsCol,
            where("customerId", "==", customerId),
            where("status", "in", ["completed", "ended", "returned"].filter(Boolean)),
            orderBy("endDate", "desc"),
            limit(1)
          );
          const completedSnap = await getDocs(qCompleted);
          rentalDoc = completedSnap.docs[0];
        }

        if (!rentalDoc) {
          if (!cancelled) {
            setData({ context: "none" });
          }
          return;
        }

        const rental = rentalDoc.data() as any;
        const context: MemberRentalView["context"] = useCompletedInstead ? "completed" : "active";

        // Vehicle info (prefer embedded on rental; else look up)
        const embeddedVehicle = {
          make: rental?.vehicleMake || rental?.make,
          model: rental?.vehicleModel || rental?.model,
          plate:
            rental?.vehiclePlate || rental?.registration || rental?.vehicleReg || rental?.reg,
        };
        const vehicle =
          embeddedVehicle.make || embeddedVehicle.model || embeddedVehicle.plate
            ? embeddedVehicle
            : await readVehicleMinimal(rental?.vehicleId);

        // Dates
        const startDate = toDate(rental?.startDate) || toDate(rental?.rentalStartDate);
        const estimatedEndDate =
          context === "active"
            ? toDate(rental?.estimatedEndDate) ||
              toDate(rental?.expectedEndDate) ||
              toDate(rental?.endDate) // sometimes you only store planned end
            : null;

        const completedDate =
          context === "completed"
            ? toDate(rental?.endDate) || toDate(rental?.completedAt)
            : null;

        // Payments
        const { lastPayment, totalPaid } = await readPaymentsForRental({
          customerId,
          rentalId: rentalDoc.id,
        });

        // Outstanding
        const totalDue = deriveTotalDue(rental);
        const totalOutstanding = Math.max(0, totalDue - n(totalPaid));

        if (!cancelled) {
          setData({
            context,
            rentalId: rentalDoc.id,
            vehicle,
            startDate,
            estimatedEndDate,
            completedDate,
            lastPayment,
            totalPaid,
            totalOutstanding,
          });
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || "Failed to load rental details");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [customerId]);

  return useMemo(
    () => ({ loading, error, data }),
    [loading, error, data]
  );
}
