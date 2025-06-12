// src/components/share/SplitForm.tsx

import React, { useState, useEffect } from 'react'
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc
} from 'firebase/firestore'
import { db } from '../../lib/firebase'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import { SplitRecord, Recipient } from '../../types/share'
import { useShares } from '../../hooks/useShares'
import FormField from '../ui/FormField'
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay'
import { Trash2 } from 'lucide-react'

interface Props {
  onClose(): void
  splitToEdit?: SplitRecord | null
  onEditRequested?: (split: SplitRecord | null) => void
}

export default function SplitForm({
  onClose,
  splitToEdit = null,
  onEditRequested
}: Props) {
  const { user } = useAuth()
  const { records } = useShares()             // all income/expense entries
  const { formatCurrency } = useFormattedDisplay()

  // --- load all past splits ---
  const [history, setHistory] = useState<SplitRecord[]>([])
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'splits'), snap => {
      setHistory(
        snap.docs.map(d => ({ id: d.id, ...(d.data() as any) } as SplitRecord))
      )
    })
    return () => unsub()
  }, [])

  // form state: only date mode
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate]     = useState('')

  const [aiePct,   setAiePct]     = useState(0)
  const [abdulPct, setAbdulPct]   = useState(0)
  const [jayPct,   setJayPct]     = useState(0)
  const [balance,  setBalance]    = useState(0)
  const [loading,  setLoading]    = useState(false)

  // prefill form when editing
  useEffect(() => {
    if (splitToEdit) {
      setStartDate(splitToEdit.startDate || '')
      setEndDate(splitToEdit.endDate   || '')
      // map percentages
      const map = splitToEdit.recipients.reduce<Record<string,number>>(
        (acc, r) => { acc[r.name] = r.percentage; return acc },
        {}
      )
      setAiePct(  map['AIE Skyline'] || 0)
      setAbdulPct(map['AbdulAziz']   || 0)
      setJayPct(  map['JAY']         || 0)
    }
  }, [splitToEdit])

  // recompute balance: income − expense − other splits (excluding the one we’re editing)
  useEffect(() => {
    if (!startDate || !endDate) {
      setBalance(0)
      return
    }
    const s = new Date(startDate), e = new Date(endDate)
    let inc = 0, exp = 0, sharedAmt = 0

    records.forEach(r => {
      const d = new Date(r.date)
      if (d < s || d > e) return
      if (r.type === 'income') inc += (r as any).amount
      else                   exp += (r as any).totalCost
    })

    history.forEach(sp => {
      if (sp.type === 'date') {
        // skip the split being edited
        if (splitToEdit && sp.id === splitToEdit.id) return

        const ss = new Date(sp.startDate!), ee = new Date(sp.endDate!)
        if (!(ee < s || ss > e)) sharedAmt += sp.totalSplitAmount
      }
    })

    setBalance(Math.max(0, inc - exp - sharedAmt))
  }, [startDate, endDate, records, history, splitToEdit])

  const aieAmt   = Math.round(balance * (aiePct   / 100) * 100) / 100
  const abdulAmt = Math.round(balance * (abdulPct / 100) * 100) / 100
  const jayAmt   = Math.round(balance * (jayPct   / 100) * 100) / 100

  // save or update
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return toast.error('Please sign in')
    if (!startDate || !endDate) return toast.error('Enter both dates')
    if (aiePct+abdulPct+jayPct > 100)
      return toast.error('Total percentage cannot exceed 100%')

    setLoading(true)

    const recipients: Recipient[] = (
      [
        ['AIE Skyline',  aiePct,   aieAmt],
        ['AbdulAziz',    abdulPct, abdulAmt],
        ['JAY',          jayPct,   jayAmt]
      ] as const
    ).map(([name, percentage, amount]) => ({ name, percentage, amount }))

    const payload: Omit<SplitRecord,'id'> = {
      type:       'date',
      startDate,
      endDate,
      recipients,
      totalSplitAmount: recipients.reduce((s,r)=>s+r.amount, 0),
      createdAt:  new Date().toISOString(),
      createdBy:  user.id
    }

    try {
      if (splitToEdit && splitToEdit.id) {
        await updateDoc(doc(db,'splits',splitToEdit.id), payload)
        toast.success('Split updated')
      } else {
        await addDoc(collection(db,'splits'), payload)
        toast.success('Split created')
      }
      onClose()
      onEditRequested?.(null)
    } catch (err) {
      console.error(err)
      toast.error('Save failed')
    } finally {
      setLoading(false)
    }
  }

  // delete any split
  const handleDelete = async (id: string) => {
    if (!confirm('Delete this split?')) return
    try {
      await deleteDoc(doc(db,'splits',id))
      toast.success('Split deleted')
      if (splitToEdit?.id === id) {
        onEditRequested?.(null)
      }
    } catch (err) {
      console.error(err)
      toast.error('Delete failed')
    }
  }

  return (
    <div className="space-y-6">
      {/* HISTORY */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Split History
        </h3>
        <div className="max-h-48 overflow-y-auto border rounded bg-white">
          {history
            .filter(sp => sp.type === 'date')
            .map(sp => (
              <div
                key={sp.id}
                className="flex justify-between items-center p-2 hover:bg-gray-50"
              >
                <div
                  onClick={() => onEditRequested?.(sp)}
                  className="cursor-pointer"
                >
                  <span className="font-medium">
                    {sp.startDate} → {sp.endDate}
                  </span>
                  <span className="ml-2 text-sm text-gray-500">
                    (£{formatCurrency(sp.totalSplitAmount)})
                  </span>
                </div>
                <button
                  onClick={() => handleDelete(sp.id)}
                  className="text-red-600 hover:text-red-800 p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          }
          {history.filter(sp => sp.type==='date').length === 0 && (
            <p className="p-2 text-gray-500 text-sm">No splits yet</p>
          )}
        </div>
      </div>

      {/* FORM */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            label="Start Date"
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            required
          />
          <FormField
            label="End Date"
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Balance</label>
          <p className="mt-1 text-2xl font-semibold">
            {formatCurrency(balance)}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {(
            [
              ['AIE Skyline',  aiePct,   setAiePct,   aieAmt],
              ['AbdulAziz',    abdulPct, setAbdulPct, abdulAmt],
              ['JAY',          jayPct,   setJayPct,   jayAmt]
            ] as const
          ).map(([name, pct, setPct, amt]) => (
            <div key={name}>
              <label className="block text-sm font-medium">{name} %</label>
              <input
                type="number"
                min={0} max={100}
                value={pct}
                onChange={e => setPct(Number(e.target.value))}
                className="mt-1 block w-full rounded border-gray-300 focus:ring-primary focus:border-primary sm:text-sm"
                required
              />
              <p className="mt-1 text-sm text-gray-500">
                {formatCurrency(amt)}
              </p>
            </div>
          ))}
        </div>

        <div className="flex justify-end space-x-2">
          <button
            type="button"
            onClick={() => {
              onClose()
              onEditRequested?.(null)
            }}
            className="px-4 py-2 border rounded"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-primary text-white rounded disabled:opacity-50"
          >
            {splitToEdit ? 'Update Split' : 'Save Split'}
          </button>
        </div>
      </form>
    </div>
  )
}
