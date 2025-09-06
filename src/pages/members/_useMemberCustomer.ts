// src/pages/members/_useMemberCustomer.ts
import { useEffect, useMemo, useState } from "react";
import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useAuth } from "../../context/AuthContext";

const normalizeUk = (raw?: string | null) => {
  if (!raw) return null;
  const s = String(raw).replace(/[^\d+]/g, "");
  if (s.startsWith("+44")) return "0" + s.slice(3);
  if (s.startsWith("44")) return "0" + s.slice(2);
  return s;
};

/**
 * Resolves the current member's customerId and exposes a loading flag to avoid UI flashing.
 * Order: memberUid → email(lower) → email(as-is) → mobile
 */
export default function useMemberCustomerId() {
  const { user } = useAuth();
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const uid = user?.uid || null;
  const email = user?.email || null;
  const emailLower = email?.toLowerCase().trim() || null;
  const mobile = normalizeUk((user as any)?.phoneNumber ?? (user as any)?.mobile ?? null);

  useEffect(() => {
    let cancelled = false;

    async function resolve() {
      setLoading(true);
      try {
        // 1) memberUid
        if (uid) {
          const q1 = query(collection(db, "customers"), where("memberUid", "==", uid), limit(1));
          const s1 = await getDocs(q1);
          if (!cancelled && !s1.empty) { setCustomerId(s1.docs[0].id); setLoading(false); return; }
        }
        // 2) email lower
        if (emailLower) {
          const q2 = query(collection(db, "customers"), where("email", "==", emailLower), limit(1));
          const s2 = await getDocs(q2);
          if (!cancelled && !s2.empty) { setCustomerId(s2.docs[0].id); setLoading(false); return; }
        }
        // 3) email as-is (legacy)
        if (email) {
          const q3 = query(collection(db, "customers"), where("email", "==", email), limit(1));
          const s3 = await getDocs(q3);
          if (!cancelled && !s3.empty) { setCustomerId(s3.docs[0].id); setLoading(false); return; }
        }
        // 4) mobile
        if (mobile) {
          const q4 = query(collection(db, "customers"), where("mobile", "==", mobile), limit(1));
          const s4 = await getDocs(q4);
          if (!cancelled && !s4.empty) { setCustomerId(s4.docs[0].id); setLoading(false); return; }
        }

        if (!cancelled) { setCustomerId(null); setLoading(false); }
      } catch {
        if (!cancelled) { setCustomerId(null); setLoading(false); }
      }
    }

    resolve();
    return () => { cancelled = true; };
  }, [uid, email, emailLower, mobile]);

  return useMemo(() => ({ customerId, loading }), [customerId, loading]);
}
