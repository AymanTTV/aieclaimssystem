import { useEffect } from 'react';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Rental } from '../types';
import { isWithinInterval, isBefore, isAfter } from 'date-fns';
import toast from 'react-hot-toast';

export const useRentalStatusUpdates = () => {
  useEffect(() => {
    const updateRentalStatuses = async () => {
      const now = new Date();
      const rentalsRef = collection(db, 'rentals');
      
      try {
        // Get scheduled rentals that should be active
        const scheduledQuery = query(
          rentalsRef,
          where('status', '==', 'scheduled')
        );

        // Get active rentals that should be completed
        const activeQuery = query(
          rentalsRef,
          where('status', 'in', ['hired', 'claim'])
        );

        // Update scheduled to hired/claim
        const scheduledSnapshot = await getDocs(scheduledQuery);
        for (const rentalDoc of scheduledSnapshot.docs) {
          const rental = { id: rentalDoc.id, ...rentalDoc.data() } as Rental;
          const startDate = new Date(rental.startDate);
          const endDate = new Date(rental.endDate);

          if (isWithinInterval(now, { start: startDate, end: endDate })) {
            await updateDoc(doc(db, 'rentals', rental.id), {
              status: rental.type === 'claim' ? 'claim' : 'hired',
              updatedAt: now
            });
          }
        }

        // Update hired/claim to completed
        const activeSnapshot = await getDocs(activeQuery);
        for (const rentalDoc of activeSnapshot.docs) {
          const rental = { id: rentalDoc.id, ...rentalDoc.data() } as Rental;
          const endDate = new Date(rental.endDate);

          if (isAfter(now, endDate)) {
            await updateDoc(doc(db, 'rentals', rental.id), {
              status: 'completed',
              updatedAt: now
            });
          }
        }
      } catch (error) {
        console.error('Error updating rental statuses:', error);
      }
    };

    // Run immediately and then every 5 minutes
    updateRentalStatuses();
    const interval = setInterval(updateRentalStatuses, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);
};