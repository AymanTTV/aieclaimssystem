import { collection, doc, getDocs, limit, query, setDoc, where } from "firebase/firestore";
import { db } from "../../lib/firebase";

/**
 * Backfill memberUid on an existing customer when a member logs in.
 * Only sets memberUid if currently empty. Returns linked customerId or null.
 */
export async function linkExistingCustomerIfMissing(params: {
  uid: string;
  email?: string | null;
  mobile?: string | null;
}): Promise<string | null> {
  const { uid, email, mobile } = params;
  const emailLower = email?.trim().toLowerCase();

  if (emailLower) {
    const snap = await getDocs(
      query(collection(db, "customers"), where("email", "==", emailLower), limit(3))
    );
    if (!snap.empty) {
      for (const d of snap.docs) {
        const data = d.data() as any;
        if (!data.memberUid) {
          await setDoc(
            doc(db, "customers", d.id),
            { memberUid: uid, email: emailLower }, // keep email normalized
            { merge: true }
          );
          return d.id;
        }
        if (data.memberUid === uid) return d.id; // already linked to this member
      }
      return null; // matched but already linked to another uid
    }
  }

  if (mobile) {
    const snap = await getDocs(
      query(collection(db, "customers"), where("mobile", "==", mobile), limit(2))
    );
    if (!snap.empty) {
      for (const d of snap.docs) {
        const data = d.data() as any;
        if (!data.memberUid) {
          await setDoc(doc(db, "customers", d.id), { memberUid: uid }, { merge: true });
          return d.id;
        }
        if (data.memberUid === uid) return d.id;
      }
    }
  }

  return null;
}
