/**
 * Firestore Migration Script: Backfill auto-email fields
 *
 * 1. Backfills `enable_monday_auto_email: true` on all documents in the `rentals` collection
 *    where the field is currently undefined or null.
 * 2. Initializes/updates `global_auto_email_enabled: true` in the `system_settings` document.
 */
import { collection, getDocs, doc, writeBatch, setDoc } from 'firebase/firestore';
import { db } from '../src/lib/firebase';

export async function migrateAutoEmailSettings() {
  console.log('--- Starting Migration: Auto-Email Settings ---');

  // 1. Migrate rentals collection in batches of 500
  const rentalsRef = collection(db, 'rentals');
  const rentalsSnapshot = await getDocs(rentalsRef);

  let batch = writeBatch(db);
  let operationCount = 0;
  let rentalsUpdated = 0;

  for (const rentalDoc of rentalsSnapshot.docs) {
    const data = rentalDoc.data();
    if (data.enable_monday_auto_email === undefined || data.enable_monday_auto_email === null) {
      batch.update(rentalDoc.ref, {
        enable_monday_auto_email: true,
        updatedAt: new Date(),
      });
      operationCount++;
      rentalsUpdated++;

      if (operationCount >= 450) {
        await batch.commit();
        batch = writeBatch(db);
        operationCount = 0;
      }
    }
  }

  if (operationCount > 0) {
    await batch.commit();
  }
  console.log(`Rentals migration completed. ${rentalsUpdated} documents updated with enable_monday_auto_email: true.`);

  // 2. Migrate system_settings singleton document
  const settingsDocRef = doc(db, 'system_settings', 'global_config');
  await setDoc(
    settingsDocRef,
    {
      global_auto_email_enabled: true,
      updatedAt: new Date(),
    },
    { merge: true }
  );
  console.log('System settings migration completed: global_auto_email_enabled set to true.');

  console.log('--- Migration Finished Successfully ---');
}
