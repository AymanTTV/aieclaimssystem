import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

export async function logWaitingActivity(
  entryId: string,
  by: string,
  type: string,
  message: string,
  meta?: any
) {
  const ref = collection(db, 'waiting_entries', entryId, 'activity');
  await addDoc(ref, { type, message, meta: meta ?? null, at: serverTimestamp(), by });
}
