import { useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { updateVehicleStatus } from '../utils/vehicleStatus';
import { createFinanceTransaction } from '../utils/financeTransactions';

export const useRentalIntegration = () => {
  useEffect(() => {
    const rentalsQuery = query(
      collection(db, 'rentals'),
      where('status', 'in', ['scheduled', 'active', 'completed'])
    );

    return onSnapshot(rentalsQuery, snapshot => {
      snapshot.docChanges().forEach(async change => {
        const rental = { id: change.doc.id, ...change.doc.data() };
        
        if (change.type === 'modified') {
          // Update vehicle status
          if (rental.status === 'active') {
            await updateVehicleStatus(rental.vehicleId, 'rented', rental.id, 'rental');
          } else if (rental.status === 'completed') {
            await updateVehicleStatus(rental.vehicleId, 'available');
            // Create finance transaction
            await createFinanceTransaction({
              type: 'income',
              category: 'rental',
              amount: rental.cost,
              description: `Rental income for vehicle ${rental.vehicleId}`,
              referenceId: rental.id,
              vehicleId: rental.vehicleId
            });
          }
        }
      });
    });
  }, []);
};