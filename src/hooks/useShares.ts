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
        
        const createdAt = data.createdAt 

        // FIX: Helper to prioritize Root document recurrence settings over Array Item settings.
        // If Root has a value (even null), use it. Otherwise fall back to Item.
        const getRecurrence = (itemVal: any, rootVal: any) => {
            return rootVal !== undefined ? rootVal : itemVal;
        }

        // 1. Flatten 'payments' array -> Income Entries
        if (Array.isArray(data.payments)) {
          data.payments.forEach((p: any) => {
            all.push({
              id,
              type: 'income',
              ...p, 
              createdAt, 
              // FIX: Prioritize Root document settings
              isRecurring: getRecurrence(p.isRecurring, data.isRecurring),
              recurringFrequency: getRecurrence(p.recurringFrequency, data.recurringFrequency),
              nextRecurringDate: getRecurrence(p.nextRecurringDate, data.nextRecurringDate),
            })
          })
        }

        // 2. Flatten 'expenses' array -> Expense Entries
        if (Array.isArray(data.expenses)) {
          data.expenses.forEach((e: any) => {
            all.push({
              id,
              type: 'expense',
              ...e, 
              createdAt,
              // FIX: Prioritize Root document settings
              isRecurring: getRecurrence(e.isRecurring, data.isRecurring),
              recurringFrequency: getRecurrence(e.recurringFrequency, data.recurringFrequency),
              nextRecurringDate: getRecurrence(e.nextRecurringDate, data.nextRecurringDate),
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