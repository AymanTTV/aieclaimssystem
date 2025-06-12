import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc } from 'firebase/firestore';
import { storage, db } from '../lib/firebase';

export async function uploadMaintenanceAttachments(
  logId: string,
  files: File[]
): Promise<Attachment[]> {
  const uploads: Attachment[] = [];

  for (const file of files) {
    const path = `maintenance/${logId}/${file.name}`;
    const storageRef = ref(storage, path);
    const snap = await uploadBytes(storageRef, file);
    const url = await getDownloadURL(snap.ref);

    uploads.push({
      name: file.name,
      url,
      type: file.type,
    });
  }

  // Merge into Firestore
  const logRef = doc(db, 'maintenanceLogs', logId);
  await updateDoc(logRef, {
    attachments: uploads,
  });

  return uploads;
}
