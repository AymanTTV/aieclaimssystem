// src/components/Share/SplitForm.tsx
import React, { useState, useEffect } from 'react'
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, writeBatch } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import { SplitRecord, Recipient } from '../../types/share'
import { useShares } from '../../hooks/useShares'
import FormField from '../ui/FormField'
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay'
import { Trash2, AlertTriangle, X, Plus } from 'lucide-react'

interface Props {
  onClose(): void
  splitToEdit?: SplitRecord | null
  onEditRequested?: (split: SplitRecord | null) => void
}

interface Shareholder {
  id: string;
  name: string;
  defaultPercentage: number;
}

export default function SplitForm({ onClose, splitToEdit = null, onEditRequested }: Props) {
  const { user } = useAuth()
  const { records } = useShares() 
  const { formatCurrency } = useFormattedDisplay()

  const [history, setHistory] = useState<SplitRecord[]>([])
  const [shareholders, setShareholders] = useState<Shareholder[]>([])
  
  // Dynamic Recipients State
  const [recipients, setRecipients] = useState<{name: string, percentage: number}[]>([])
  const [initialized, setInitialized] = useState(false)

  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate]     = useState('')
  const [balance,  setBalance]    = useState(0)
  const [loading,  setLoading]    = useState(false)

  // Fetch Split History
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'splits'), snap => {
      setHistory(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) } as SplitRecord)))
    })
    return () => unsub()
  }, [])

  // Fetch Dynamic Shareholders
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'shareholders'), snap => {
      setShareholders(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) } as Shareholder)))
    })
    return () => unsub()
  }, [])

  // Initialize Split Form Data
  useEffect(() => {
    if (splitToEdit) {
      setStartDate(splitToEdit.startDate || '')
      setEndDate(splitToEdit.endDate   || '')
      setRecipients(splitToEdit.recipients.map(r => ({ name: r.name, percentage: r.percentage })))
      setInitialized(true)
    } else if (!initialized && shareholders.length > 0) {
      // Default initialization logic for a brand new split
      const aie = shareholders.find(s => s.name.toLowerCase() === 'aie skyline');
      if (aie) {
        setRecipients([{ name: aie.name, percentage: aie.defaultPercentage }])
      }
      setInitialized(true)
    }
  }, [splitToEdit, shareholders, initialized])

  // --- AUTO-FILL DATES Logic ---
  useEffect(() => {
    if (splitToEdit || startDate || endDate || records.length === 0) return

    const unsplitRecords = records.filter(r => {
      const rDate = r.date.slice(0, 10) 
      const isCovered = history.some(sp => sp.startDate && sp.endDate && rDate >= sp.startDate && rDate <= sp.endDate)
      return !isCovered
    })

    if (unsplitRecords.length === 0) return
    unsplitRecords.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    setStartDate(unsplitRecords[0].date.slice(0, 10))
    setEndDate(unsplitRecords[unsplitRecords.length - 1].date.slice(0, 10))
  }, [splitToEdit, records, history, startDate, endDate])

  // --- BALANCE CALCULATION ---
  useEffect(() => {
    if (!startDate || !endDate) return setBalance(0)

    const s = startDate; const e = endDate;
    let inc = 0, exp = 0, alreadySharedAmt = 0

    records.forEach(r => {
      const rDate = r.date.slice(0, 10);
      if (rDate < s || rDate > e) return;
      if (r.type === 'income') inc += (r as any).amount
      else exp += (r as any).totalCost
    })

    history.forEach(sp => {
      if (sp.type === 'date') {
        if (splitToEdit && sp.id === splitToEdit.id) return
        const overlaps = !(sp.endDate! < s || sp.startDate! > e);
        if (overlaps) alreadySharedAmt += sp.totalSplitAmount
      }
    })

    setBalance(inc - exp - alreadySharedAmt)
  }, [startDate, endDate, records, history, splitToEdit])

  const isDeficit = balance < 0;
  const absBalance = Math.abs(balance);

  // Derive calculated amounts & totals dynamically
  const calculatedRecipients = recipients.map(r => ({
    name: r.name,
    percentage: r.percentage,
    amount: Math.round(absBalance * (r.percentage / 100) * 100) / 100
  }));
  const totalPct = recipients.reduce((sum, r) => sum + r.percentage, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return toast.error('Please sign in')
    if (!startDate || !endDate) return toast.error('Enter both dates')
    if (totalPct > 100) return toast.error(`Total percentage cannot exceed 100%. Currently at ${totalPct}%`)

    setLoading(true)

    const payload: Omit<SplitRecord,'id'> = {
      type: 'date',
      startDate,
      endDate,
      recipients: calculatedRecipients,
      totalSplitAmount: isDeficit ? -absBalance : absBalance,
      createdAt: new Date().toISOString(),
      createdBy: user.id
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
        records.forEach(r => {
          const rDate = r.date.slice(0, 10);
          if (rDate >= startDate && rDate <= endDate && r.progress !== 'completed') {
            batch.update(doc(db, 'shares', r.id), { progress: 'completed' })
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
      if (splitToEdit?.id === id) onEditRequested?.(null)
    } catch (err) {
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
                  <span className="font-medium text-sm">{sp.startDate} → {sp.endDate}</span>
                  <span className={`ml-2 text-sm font-semibold ${sp.totalSplitAmount < 0 ? 'text-red-600' : 'text-green-600'}`}>
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

      <hr className="border-gray-200" />

      {/* FORM */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Start Date" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required />
          <FormField label="End Date" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} required />
        </div>

        <div className="bg-gray-50 p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col items-center justify-center">
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest">Available Balance</label>
          <p className={`mt-2 text-4xl font-extrabold tracking-tight ${isDeficit ? 'text-red-600' : 'text-gray-900'}`}>{formatCurrency(balance)}</p>
          {isDeficit && (
            <div className="mt-3 flex items-start gap-2 text-sm text-red-700 bg-red-50 p-2 rounded-lg border border-red-100">
              <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <span>Negative balance detected. The calculations below indicate how much each shareholder must pay to cover the deficit.</span>
            </div>
          )}
        </div>

        {/* Dynamic Shareholders List */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-sm font-bold text-gray-800 uppercase tracking-wide">Shareholders Allocation</h4>
            <div className="relative">
              <select 
                className="appearance-none bg-indigo-50 border border-indigo-200 text-indigo-700 text-sm font-medium rounded-lg px-8 py-1.5 hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                onChange={(e) => {
                  const name = e.target.value;
                  if(!name) return;
                  const sh = shareholders.find(s => s.name === name);
                  if(sh) setRecipients(prev => [...prev, { name: sh.name, percentage: sh.defaultPercentage }]);
                  e.target.value = '';
                }}
              >
                <option value="">+ Add Person</option>
                {shareholders.filter(s => !recipients.some(r => r.name === s.name)).map(s => (
                  <option key={s.id} value={s.name}>{s.name}</option>
                ))}
              </select>
              <Plus className="absolute left-2.5 top-[7px] w-3.5 h-3.5 text-indigo-600 pointer-events-none" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {calculatedRecipients.map((rec, i) => (
              <div key={rec.name} className="p-4 border border-gray-200 rounded-xl bg-white shadow-sm relative group transition-all hover:border-gray-300 hover:shadow-md">
                <button type="button" onClick={() => setRecipients(prev => prev.filter((_, idx) => idx !== i))} className="absolute top-2 right-2 text-gray-400 hover:text-red-500 bg-gray-50 rounded-md p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <X className="w-4 h-4"/>
                </button>
                <label className="block text-xs font-bold text-gray-600 mb-2 pr-6 truncate" title={rec.name}>{rec.name}</label>
                <div className="flex items-center gap-1 mb-3">
                  <input type="number" min={0} max={100} value={rec.percentage} onChange={e => {
                    const val = Number(e.target.value);
                    setRecipients(prev => prev.map((r, idx) => idx === i ? {...r, percentage: val} : r));
                  }} className="w-full text-center text-lg font-semibold bg-gray-50 border border-gray-200 rounded-md py-1 focus:ring-2 focus:ring-primary focus:outline-none" />
                  <span className="text-gray-500 font-medium px-1">%</span>
                </div>
                <div className={`text-sm font-bold text-center py-1.5 rounded-lg ${isDeficit ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                  {isDeficit ? 'Pay: ' : 'Receive: '}
                  {formatCurrency(rec.amount)}
                </div>
              </div>
            ))}
            {calculatedRecipients.length === 0 && (
              <div className="col-span-3 text-center py-6 border-2 border-dashed border-gray-200 rounded-xl text-gray-500">
                No shareholders selected. Please add someone to split the balance.
              </div>
            )}
          </div>

          {totalPct > 100 && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center text-red-700 text-sm font-medium animate-pulse">
               <AlertTriangle className="w-5 h-5 mr-2 flex-shrink-0" />
               Warning: Total percentage exceeds 100% ({totalPct}%). Please edit the percentages above.
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-3 pt-6 mt-2 border-t">
          <button type="button" onClick={() => { onClose(); onEditRequested?.(null) }} className="px-5 py-2 text-sm font-medium border rounded-lg hover:bg-gray-50 text-gray-700 transition-colors">Cancel</button>
          <button type="submit" disabled={loading} className="px-5 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 transition-colors">
            {loading ? 'Saving...' : splitToEdit ? 'Update Split' : 'Save Split'}
          </button>
        </div>
      </form>
    </div>
  )
}