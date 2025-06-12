// cleanNonVehicleOwners.ts
import { collection, query, where, getDocs, doc, updateDoc, deleteField } from 'firebase/firestore';
import { db } from './src/lib/firebase'; // Adjust path as needed based on your project
import { Transaction } from './src/types/finance'; // Adjust path as needed

const cleanNonVehicleOwners = async () => {
  console.log('Starting scan for transactions without a vehicleId but with a vehicleOwner...');

  // Query for transactions where vehicleId is null (or not existing)
  // And vehicleOwner field exists (Firestore allows querying for presence of a map field)
  const q = query(
    collection(db, 'transactions'),
    where('vehicleId', '==', null), // This will match documents where vehicleId is null or non-existent
    // You might also need to add a condition for vehicleOwner existence if your rules allow it not to be there.
    // For now, we assume it's always there if we're checking its subfields.
  );

  try {
    const querySnapshot = await getDocs(q);
    let updatedCount = 0;

    if (querySnapshot.empty) {
      console.log('No transactions found without a vehicleId that might need owner cleanup.');
      return;
    }

    console.log(`Found ${querySnapshot.size} potential transactions to check.`);

    for (const document of querySnapshot.docs) {
      const transaction = document.data() as Transaction;
      const transactionRef = doc(db, 'transactions', document.id);

      // Check if vehicleOwner exists for transactions without a vehicleId
      // and if its name is "AIE Skyline" (or any other name you want to remove)
      if (transaction.vehicleOwner && transaction.vehicleOwner.name) {
        console.log(`\nProcessing transaction ID: ${document.id}`);
        console.log(`  vehicleId: ${transaction.vehicleId === undefined ? 'undefined' : transaction.vehicleId === null ? 'null' : transaction.vehicleId}`);
        console.log(`  Current vehicleOwner.name: "${transaction.vehicleOwner.name}"`);
        console.log(`  Current vehicleOwner.isDefault: ${transaction.vehicleOwner.isDefault}`);

        await updateDoc(transactionRef, {
          vehicleOwner: deleteField(), // This removes the entire vehicleOwner field
        });
        updatedCount++;
        console.log('  Successfully removed vehicleOwner field.');
      } else {
        console.log(`\nTransaction ID: ${document.id} - vehicleOwner is already null/undefined or has no name. Skipping.`);
      }
    }

    console.log('\n--- Cleanup Summary ---');
    console.log(`Total transactions scanned without vehicleId: ${querySnapshot.size}`);
    console.log(`Total transactions had vehicleOwner removed: ${updatedCount}`);
    console.log('Finished cleaning up non-vehicle owners.');

  } catch (error: any) {
    console.error('Error cleaning up non-vehicle owners:', error.message);
  } finally {
    process.exit(0);
  }
};

// Run the function
cleanNonVehicleOwners();