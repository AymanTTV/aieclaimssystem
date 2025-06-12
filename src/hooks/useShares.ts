// src/hooks/useShares.ts

import { useState, useEffect } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { ShareEntry } from '../types/share'

/**
 * Fetches all share‐docs and flattens payments & expenses
 * into a single array of ShareEntry.
 */
export function useShares() {
  const [records, setRecords] = useState<ShareEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'shares'), snapshot => {
      const all: ShareEntry[] = []

      snapshot.docs.forEach(docSnap => {
        const data = docSnap.data() as any
        const id   = docSnap.id

        // flatten payments → income entries
        Array.isArray(data.payments) &&
          data.payments.forEach((p: any) => {
            all.push({
              id,
              type: 'income',
              ...p
            })
          })

        // flatten expenses → expense entries
        Array.isArray(data.expenses) &&
          data.expenses.forEach((e: any) => {
            all.push({
              id,
              type: 'expense',
              ...e
            })
          })
      })

      setRecords(all)
      setLoading(false)
    })

    return () => unsub()
  }, [])

  return { records, loading }
}
