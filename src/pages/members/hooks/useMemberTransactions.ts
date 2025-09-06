// src/pages/members/hooks/useMemberTransactions.ts
import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where, DocumentData, Unsubscribe, getDocs } from "firebase/firestore";
import { db } from "../../../lib/firebase";

export interface MemberTransaction {
  id: string;
  customerId?: string;
  vehicleId?: string;
  amount?: number;
  type?: string;
  date?: any;
  createdAt?: any;
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

export function useMemberTransactions(customerId: string | null | undefined) {
  const [transactions, setTransactions] = useState<MemberTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribers: Unsubscribe[] = [];
    let cancelled = false;

    async function attach() {
      setLoading(true);
      // clear if no customer
      if (!customerId) {
        setTransactions([]);
        setLoading(false);
        return;
      }

      // 1) listen to transactions by customerId
      const base = collection(db, "transactions");
      const unsubByCustomer = onSnapshot(
        query(base, where("customerId", "==", customerId)),
        (snap) => {
          if (cancelled) return;
          const list = new Map<string, MemberTransaction>();
          snap.forEach((d) => list.set(d.id, { id: d.id, ...(d.data() as DocumentData) } as any));
          mergeAndPush(list);
        }
      );
      unsubscribers.push(unsubByCustomer);

      // 2) find vehicles for this customer
      const vehSnap = await getDocs(query(collection(db, "vehicles"), where("customerId", "==", customerId)));
      const vehicleIds = vehSnap.docs.map((d) => d.id);
      if (vehicleIds.length) {
        for (const ids of chunk(vehicleIds, 10)) {
          const unsubByVehicle = onSnapshot(
            query(base, where("vehicleId", "in", ids)),
            (snap) => {
              if (cancelled) return;
              const list = new Map<string, MemberTransaction>();
              snap.forEach((d) => list.set(d.id, { id: d.id, ...(d.data() as DocumentData) } as any));
              mergeAndPush(list);
            }
          );
          unsubscribers.push(unsubByVehicle);
        }
      }

      setLoading(false);
    }

    // merge current results and sort by date/createdAt
    const mergeAndPush = (incoming: Map<string, MemberTransaction>) => {
      setTransactions((prev) => {
        const map = new Map<string, MemberTransaction>();
        prev.forEach((p) => map.set(p.id, p));
        incoming.forEach((v, k) => map.set(k, v));
        const arr = Array.from(map.values()).sort((a, b) => {
          const da = toDate(a.date) || toDate(a.createdAt) || new Date(0);
          const dbb = toDate(b.date) || toDate(b.createdAt) || new Date(0);
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

  return { transactions, loading };
}
