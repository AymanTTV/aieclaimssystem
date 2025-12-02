import React, { useState, useEffect } from 'react'
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  writeBatch
} from 'firebase/firestore'
import { db } from '../../lib/firebase'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import { SplitRecord, Recipient } from '../../types/share'
import { useShares } from '../../hooks/useShares'
import FormField from '../ui/FormField'
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay'
import { Trash2, AlertTriangle } from 'lucide-react'
import { usePermissions } from '../../hooks/usePermissions';

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

  // --- AUTO-FILL DATES Logic ---
  useEffect(() => {
    // 1. Only run if NOT editing an existing split
    if (splitToEdit) return
    
    // 2. Only run if dates are currently empty
    if (startDate || endDate) return

    // 3. Ensure we have records to work with
    if (records.length === 0) return

    // 4. Find records that are NOT covered by any existing split
    // This allows backdated records to be picked up if they weren't in a split
    const unsplitRecords = records.filter(r => {
      const rDate = r.date // YYYY-MM-DD
      const isCovered = history.some(sp => 
        sp.startDate && sp.endDate &&
        rDate >= sp.startDate && rDate <= sp.endDate
      )
      return !isCovered
    })

    if (unsplitRecords.length === 0) return

    // 5. Sort these records by date ascending
    unsplitRecords.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    // 6. Set Start to the earliest unsplit record, End to the latest
    setStartDate(unsplitRecords[0].date.slice(0, 10))
    setEndDate(unsplitRecords[unsplitRecords.length - 1].date.slice(0, 10))

  }, [splitToEdit, records, history, startDate, endDate])


  // recompute balance: income − expense − other splits (excluding the one we’re editing)
  useEffect(() => {
    if (!startDate || !endDate) {
      setBalance(0)
      return
    }
    const s = new Date(startDate)
    const e = new Date(endDate) 
    
    let inc = 0, exp = 0, sharedAmt = 0

    records.forEach(r => {
      const d = new Date(r.date)
      // Standard comparison
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

    // NOTE: We now allow negative balance to show deficit
    setBalance(inc - exp - sharedAmt)
  }, [startDate, endDate, records, history, splitToEdit])

  // Calculation Logic (Handles Income Split OR Deficit Contribution)
  const isDeficit = balance < 0;
  const absBalance = Math.abs(balance);

  const aieAmt   = Math.round(absBalance * (aiePct   / 100) * 100) / 100
  const abdulAmt = Math.round(absBalance * (abdulPct / 100) * 100) / 100
  const jayAmt   = Math.round(absBalance * (jayPct   / 100) * 100) / 100

  // save or update
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return toast.error('Please sign in')
    if (!startDate || !endDate) return toast.error('Enter both dates')
    if (aiePct+abdulPct+jayPct > 100)
      return toast.error('Total percentage cannot exceed 100%')

    setLoading(true)

    // Store amounts. If deficit, these are technically "amounts to pay in"
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
      // If deficit, the split amount is negative technically, but usually we just track the total processed
      totalSplitAmount: isDeficit ? -absBalance : absBalance,
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
        
        // --- AUTOMATIC STATUS UPDATE ---
        const batch = writeBatch(db)
        let updateCount = 0
        const s = new Date(startDate)
        const e = new Date(endDate)

        records.forEach(r => {
          const d = new Date(r.date)
          if (d >= s && d <= e && r.progress !== 'completed') {
            const ref = doc(db, 'shares', r.id)
            batch.update(ref, { progress: 'completed' })
            updateCount++
          }
        })

        if (updateCount > 0) {
          await batch.commit()
          toast.success(`Marked ${updateCount} records as Completed`)
        }
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
                  <span className={`ml-2 text-sm ${sp.totalSplitAmount < 0 ? 'text-red-600' : 'text-green-600'}`}>
                    ({formatCurrency(sp.totalSplitAmount)})
                  </span>
                </div>
                {user?.role === 'manager' && (
                  <button
                    onClick={() => handleDelete(sp.id)}
                    className="text-red-600 hover:text-red-800 p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
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

        {/* BALANCE DISPLAY */}
        <div>
          <label className="block text-sm font-medium">Balance</label>
          <p className={`mt-1 text-2xl font-semibold ${isDeficit ? 'text-red-600' : 'text-gray-900'}`}>
            {formatCurrency(balance)}
          </p>
          {isDeficit && (
             <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md flex items-start">
               <AlertTriangle className="w-5 h-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
               <div className="text-sm text-red-700">
                 <strong>Warning: Negative Balance.</strong><br/>
                 The calculations below now show how much each recipient must <u>pay</u> to clear the deficit.
               </div>
             </div>
          )}
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
              <p className={`mt-1 text-sm font-medium ${isDeficit ? 'text-red-600' : 'text-green-600'}`}>
                {isDeficit ? 'Pay: ' : 'Get: '} {formatCurrency(amt)}
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