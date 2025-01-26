import { doc, updateDoc, collection, query, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import toast from 'react-hot-toast';

const progressMappings = {
  'in-progress': 'Claim in Progress',
  'completed': 'Claim Complete'
} as const;

export const migrateClaimProgress = async () => {
  try {
    const claimsRef = collection(db, 'claims');
    const snapshot = await getDocs(claimsRef);
    
    const updates = snapshot.docs.map(async (doc) => {
      const claim = doc.data();
      const oldProgress = claim.progress;
      
      // Only update if using old progress values
      if (oldProgress in progressMappings) {
        await updateDoc(doc.ref, {
          progress: progressMappings[oldProgress as keyof typeof progressMappings],
          updatedAt: new Date()
        });
      }
    });

    await Promise.all(updates);
    toast.success('Claims progress migrated successfully');
  } catch (error) {
    console.error('Error migrating claims:', error);
    toast.error('Failed to migrate claims progress');
  }
};