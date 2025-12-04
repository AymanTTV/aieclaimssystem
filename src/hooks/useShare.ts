// src/hooks/useShares.ts

import { useState, useEffect } from 'react'
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { ShareEntry } from '../types/share'

/**
 * Fetches all share-docs and flattens payments & expenses
 * into a single array of ShareEntry.
 */
export function useShares() {
  const [records, setRecords] = useState<ShareEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Order by createdAt desc so the flattened list respects time
    const q = query(collection(db, 'shares'), orderBy('createdAt', 'desc'));

    const unsub = onSnapshot(q, (snapshot) => {
      const all: ShareEntry[] = []

      snapshot.docs.forEach((docSnap) => {
        const data = docSnap.data() as any
        const id = docSnap.id
        
        // Capture creation time from the parent document
        // Crucial for the "Split" logic to work correctly
        const createdAt = data.createdAt 

        // 1. Flatten 'payments' array -> Income Entries
        if (Array.isArray(data.payments)) {
          data.payments.forEach((p: any) => {
            all.push({
              id,
              type: 'income',
              ...p, // Spread the inner payment data
              createdAt, // Ensure the entry has the doc's creation time
              // Ensure recurring fields persist from parent doc if missing in array item
              isRecurring: p.isRecurring ?? data.isRecurring,
              recurringFrequency: p.recurringFrequency ?? data.recurringFrequency,
              nextRecurringDate: p.nextRecurringDate ?? data.nextRecurringDate,
            })
          })
        }

        // 2. Flatten 'expenses' array -> Expense Entries
        if (Array.isArray(data.expenses)) {
          data.expenses.forEach((e: any) => {
            all.push({
              id,
              type: 'expense',
              ...e, // Spread the inner expense data
              createdAt,
              // Ensure recurring fields persist
              isRecurring: e.isRecurring ?? data.isRecurring,
              recurringFrequency: e.recurringFrequency ?? data.recurringFrequency,
              nextRecurringDate: e.nextRecurringDate ?? data.nextRecurringDate,
            })
          })
        }
      })

      setRecords(all)
      setLoading(false)
    }, (error) => {
      console.error("Error fetching shares:", error);
      setLoading(false);
    })

    return () => unsub()
  }, [])

  return { records, loading }
}