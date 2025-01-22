// src/utils/rentalStatusManager.ts
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Rental } from '../types';

export const updateRentalStatus = async (
  rental: Rental,
  newStatus: 'completed' | 'active' | 'scheduled' | 'cancelled',
  updateDate: boolean = true
) => {
  try {
    const updates: Partial<Rental> = {
      status: newStatus,
      updatedAt: new Date()
    };

    // If marking as completed, update end date to current date
    if (newStatus === 'completed' && updateDate) {
      updates.endDate = new Date();
    }

    await updateDoc(doc(db, 'rentals', rental.id), updates);
    return true;
  } catch (error) {
    console.error('Error updating rental status:', error);
    return false;
  }
};

export const checkRentalStatus = async (rental: Rental): Promise<void> => {
  const now = new Date();
  const endDate = new Date(rental.endDate);

  // Only update status if rental is active and past end date
  if (rental.status === 'active' && now > endDate) {
    // Don't automatically complete the rental, just update pricing if needed
    const updates: Partial<Rental> = {
      updatedAt: now
    };

    // Calculate overdue costs if applicable
    if (rental.type === 'claim') {
      // Apply claim rate for extra days
      const extraDays = Math.ceil((now.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24));
      updates.overdueAmount = extraDays * (rental.vehicle?.claimRentalPrice || 340);
    } else {
      // Apply regular overdue calculations
      const extraDays = Math.ceil((now.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24));
      if (extraDays > 5) {
        updates.overdueAmount = Math.floor(extraDays / 7) * (rental.vehicle?.weeklyRentalPrice || 360) +
          (extraDays % 7) * (rental.vehicle?.dailyRentalPrice || 60);
      } else {
        updates.overdueAmount = extraDays * (rental.vehicle?.dailyRentalPrice || 60);
      }
    }

    await updateDoc(doc(db, 'rentals', rental.id), updates);
  }
};
