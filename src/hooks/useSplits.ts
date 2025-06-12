// src/hooks/useSplits.ts

import { useState, useEffect } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { SplitRecord } from '../types/share'

/**
 * Subscribes to the top‐level "splits" collection in Firestore
 * and returns an up‐to‐date array of SplitRecord objects.
 */
export function useSplits(): SplitRecord[] {
  const [splits, setSplits] = useState<SplitRecord[]>([])

  useEffect(() => {
    // Listen to the "splits" collection
    const unsub = onSnapshot(
      collection(db, 'splits'),
      snapshot => {
        const data = snapshot.docs.map(docSnap => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<SplitRecord, 'id'>)
        } as SplitRecord))
        setSplits(data)
      },
      error => {
        console.error('useSplits onSnapshot error:', error)
      }
    )

    // Clean up listener on unmount
    return () => unsub()
  }, [])

  return splits
}
