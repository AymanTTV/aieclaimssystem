// src/components/share/SplitForm.tsx
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
  const { records } = useShares() 
  const { formatCurrency } = useFormattedDisplay()

  const [history, setHistory] = useState<SplitRecord[]>([])
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'splits'), snap => {
      setHistory(
        snap.docs.map(d => ({ id: d.id, ...(d.data() as any) } as SplitRecord))
      )
    })
    return () => unsub()
  }, [])

  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate]     = useState('')

  const [aiePct,   setAiePct]     = useState(0)
  const [abdulPct, setAbdulPct]   = useState(0)
  const [jayPct,   setJayPct]     = useState(0)
  const [balance,  setBalance]    = useState(0)
  const [loading,  setLoading]    = useState(false)

  // Prefill form when editing
  useEffect(() => {
    if (splitToEdit) {
      setStartDate(splitToEdit.startDate || '')
      setEndDate(splitToEdit.endDate   || '')
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
    if (splitToEdit) return
    if (startDate || endDate) return
    if (records.length === 0) return

    // Find earliest unsplit record
    const unsplitRecords = records.filter(r => {
      const rDate = r.date.slice(0, 10) // YYYY-MM-DD
      const isCovered = history.some(sp => 
        sp.startDate && sp.endDate &&
        rDate >= sp.startDate && rDate <= sp.endDate
      )
      return !isCovered
    })

    if (unsplitRecords.length === 0) return

    unsplitRecords.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    setStartDate(unsplitRecords[0].date.slice(0, 10))
    setEndDate(unsplitRecords[unsplitRecords.length - 1].date.slice(0, 10))

  }, [splitToEdit, records, history, startDate, endDate])


  // --- BALANCE CALCULATION ---
  useEffect(() => {
    if (!startDate || !endDate) {
      setBalance(0)
      return
    }

    const s = startDate;
    const e = endDate;
    
    let inc = 0, exp = 0, alreadySharedAmt = 0

    // 1. Sum up Income and Expense in range
    records.forEach(r => {
      const rDate = r.date.slice(0, 10);
      if (rDate < s || rDate > e) return;

      if (r.type === 'income') inc += (r as any).amount
      else                   exp += (r as any).totalCost
    })

    // 2. Subtract already split amounts
    history.forEach(sp => {
      if (sp.type === 'date') {
        if (splitToEdit && sp.id === splitToEdit.id) return

        const spStart = sp.startDate!;
        const spEnd = sp.endDate!;
        
        // Overlap Check (String Comparison)
        const overlaps = !(spEnd < s || spStart > e);
        
        if (overlaps) {
             alreadySharedAmt += sp.totalSplitAmount
        }
      }
    })

    setBalance(inc - exp - alreadySharedAmt)
  }, [startDate, endDate, records, history, splitToEdit])

  const isDeficit = balance < 0;
  const absBalance = Math.abs(balance);

  const aieAmt   = Math.round(absBalance * (aiePct   / 100) * 100) / 100
  const abdulAmt = Math.round(absBalance * (abdulPct / 100) * 100) / 100
  const jayAmt   = Math.round(absBalance * (jayPct   / 100) * 100) / 100

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
        
        const batch = writeBatch(db)
        let updateCount = 0
        const s = startDate;
        const e = endDate;

        records.forEach(r => {
          const rDate = r.date.slice(0, 10);
          if (rDate >= s && rDate <= e && r.progress !== 'completed') {
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
        <h3 className="text-lg font-medium text-gray-900 mb-2">Split History</h3>
        <div className="max-h-48 overflow-y-auto border rounded bg-white">
          {history.filter(sp => sp.type === 'date').map(sp => (
              <div key={sp.id} className="flex justify-between items-center p-2 hover:bg-gray-50">
                <div onClick={() => onEditRequested?.(sp)} className="cursor-pointer">
                  <span className="font-medium">{sp.startDate} → {sp.endDate}</span>
                  <span className={`ml-2 text-sm ${sp.totalSplitAmount < 0 ? 'text-red-600' : 'text-green-600'}`}>
                    ({formatCurrency(sp.totalSplitAmount)})
                  </span>
                </div>
                {user?.role === 'manager' && (
                  <button onClick={() => handleDelete(sp.id)} className="text-red-600 hover:text-red-800 p-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
          ))}
          {history.filter(sp => sp.type==='date').length === 0 && <p className="p-2 text-gray-500 text-sm">No splits yet</p>}
        </div>
      </div>

      {/* FORM */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Start Date" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required />
          <FormField label="End Date" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} required />
        </div>

        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <label className="block text-xs font-medium text-gray-500 uppercase">Available Balance</label>
          <p className={`mt-1 text-3xl font-bold ${isDeficit ? 'text-red-600' : 'text-gray-900'}`}>{formatCurrency(balance)}</p>
          {isDeficit && (
            <div className="mt-2 flex items-start gap-2 text-sm text-red-700">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>Negative balance detected. The calculations below indicate how much each shareholder must pay to cover the deficit.</span>
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
            <div key={name} className="p-3 border rounded-lg bg-white">
              <label className="block text-xs font-bold text-gray-600 mb-1">{name}</label>
              <div className="flex items-center gap-1 mb-2">
                <input type="number" min={0} max={100} value={pct} onChange={e => setPct(Number(e.target.value))} className="w-full text-center border-b border-gray-300 focus:border-primary focus:outline-none" />
                <span className="text-gray-500">%</span>
              </div>
              <p className={`text-sm font-bold text-center ${isDeficit ? 'text-red-600' : 'text-green-600'}`}>
                {isDeficit ? 'Pay: ' : 'Receive: '}
                {formatCurrency(amt)}
              </p>
            </div>
          ))}
        </div>

        <div className="flex justify-end space-x-2 pt-4 border-t">
          <button type="button" onClick={() => { onClose(); onEditRequested?.(null) }} className="px-4 py-2 border rounded hover:bg-gray-50 text-gray-700">Cancel</button>
          <button type="submit" disabled={loading} className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark disabled:opacity-50">{splitToEdit ? 'Update Split' : 'Save Split'}</button>
        </div>
      </form>
    </div>
  )
}