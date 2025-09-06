// src/pages/members/hooks/useMemberRentals.ts
import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where, DocumentData, Unsubscribe, getDocs } from "firebase/firestore";
import { db } from "../../../lib/firebase";

export interface MemberRental {
  id: string;
  customerId?: string;
  vehicleId?: string;
  status?: string;
  startDate?: any;
  endDate?: any;
  createdAt?: any;
  totalDue?: number;
  totalPaid?: number;
  [k: string]: any;
}

const toDate = (v: any): Date | null => {
  if (!v) return null;
  if (typeof v?.toDate === "function") return v.toDate();
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
};

const chunk = <T,>(arr: T[], size = 10) => {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

export function useMemberRentals(customerId: string | null | undefined) {
  const [rentals, setRentals] = useState<MemberRental[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribers: Unsubscribe[] = [];
    let cancelled = false;

    async function attach() {
      setLoading(true);
      if (!customerId) {
        setRentals([]);
        setLoading(false);
        return;
      }

      const base = collection(db, "rentals");

      // by customerId
      const unsubByCustomer = onSnapshot(
        query(base, where("customerId", "==", customerId)),
        (snap) => {
          if (cancelled) return;
          const list = new Map<string, MemberRental>();
          snap.forEach((d) => list.set(d.id, { id: d.id, ...(d.data() as DocumentData) } as any));
          mergeAndPush(list);
        }
      );
      unsubscribers.push(unsubByCustomer);

      // by vehicleId
      const vehSnap = await getDocs(query(collection(db, "vehicles"), where("customerId", "==", customerId)));
      const vehicleIds = vehSnap.docs.map((d) => d.id);
      if (vehicleIds.length) {
        for (const ids of chunk(vehicleIds, 10)) {
          const unsubByVehicle = onSnapshot(
            query(base, where("vehicleId", "in", ids)),
            (snap) => {
              if (cancelled) return;
              const list = new Map<string, MemberRental>();
              snap.forEach((d) => list.set(d.id, { id: d.id, ...(d.data() as DocumentData) } as any));
              mergeAndPush(list);
            }
          );
          unsubscribers.push(unsubByVehicle);
        }
      }

      setLoading(false);
    }

    const mergeAndPush = (incoming: Map<string, MemberRental>) => {
      setRentals((prev) => {
        const map = new Map<string, MemberRental>();
        prev.forEach((p) => map.set(p.id, p));
        incoming.forEach((v, k) => map.set(k, v));
        const arr = Array.from(map.values()).sort((a, b) => {
          const da = toDate(a.startDate) || toDate(a.createdAt) || new Date(0);
          const dbb = toDate(b.startDate) || toDate(b.createdAt) || new Date(0);
          return dbb.getTime() - da.getTime();
        });
        return arr;
      });
    };

    attach();
    return () => {
      cancelled = true;
      unsubscribers.forEach((u) => u && u());
    };
  }, [customerId]);

  return { rentals, loading };
}
