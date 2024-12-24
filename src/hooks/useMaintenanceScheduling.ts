import { useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { updateVehicleStatus } from '../utils/vehicleStatus';
import { createFinanceTransaction } from '../utils/financeTransactions';

export const useMaintenanceScheduling = () => {
  useEffect(() => {
    const maintenanceQuery = query(
      collection(db, 'maintenanceLogs'),
      where('status', 'in', ['scheduled', 'in-progress', 'completed'])
    );

    return onSnapshot(maintenanceQuery, snapshot => {
      snapshot.docChanges().forEach(async change => {
        const maintenance = { id: change.doc.id, ...change.doc.data() };
        
        if (change.type === 'modified') {
          if (maintenance.status === 'in-progress') {
            await updateVehicleStatus(maintenance.vehicleId, 'maintenance', maintenance.id, 'maintenance');
          } else if (maintenance.status === 'completed') {
            await updateVehicleStatus(maintenance.vehicleId, 'available');
            // Create finance transaction
            await createFinanceTransaction({
              type: 'expense',
              category: 'maintenance',
              amount: maintenance.cost,
              description: maintenance.description,
              referenceId: maintenance.id,
              vehicleId: maintenance.vehicleId
            });
          }
        }
      });
    });
  }, []);
};