// src/components/share/PaymentForm.tsx

import React, { useState, useEffect } from 'react'
import { addDoc, collection, updateDoc, doc, getDocs } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import { useCustomers } from '../../hooks/useCustomers'
import { useVehicles } from '../../hooks/useVehicles' 
import SearchableSelect from '../ui/SearchableSelect'
import FormField from '../ui/FormField'
import { ShareEntry, Recipient } from '../../types/share'
import { RefreshCw } from 'lucide-react'
import { addDays, addWeeks, addMonths, addYears, isValid } from 'date-fns'

const REASONS = ['VD','H','S','R','PI'] as const

interface Props {
  onClose(): void
  record?: ShareEntry & { id: string }
}

export default function PaymentForm({ onClose, record }: Props) {
  const isEdit = !!record
  const { user } = useAuth()
  const { customers } = useCustomers()
  const { vehicles } = useVehicles()

  const toDateTimeLocal = (val: any) => {
    let d = new Date()
    if(val) {
        const parsed = new Date(val)
        if(isValid(parsed)) d = parsed
    }
    const pad = (n: number) => n.toString().padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  // -- Form State --
  const [custId, setCustId]           = useState(record?.clientId || '')
  const [clientName, setClientName]   = useState(record?.clientName || '')
  const [clientPhone, setClientPhone] = useState(record?.clientPhone || '')
  const [clientEmail, setClientEmail] = useState(record?.clientEmail || '')
  const [clientAddress, setClientAddr]= useState(record?.clientAddress || '')

  const [vehicleId, setVehicleId]     = useState(record?.vehicleId || '')
  const [vehicleName, setVehicleName] = useState(record?.vehicleName || '')

  const [claimRef, setClaimRef]       = useState(record?.claimRef   || '')
  const [date, setDate]               = useState(toDateTimeLocal(record?.date))
  const [reasons, setReasons]         = useState<string[]>(record?.reasons || [])
  const [notes, setNotes]             = useState(record?.notes || '')
  const [category, setCategory]       = useState(record?.category || '')
  const [availableCategories, setAvailableCategories] = useState<string[]>([])

  // --- RECURRING STATE ---
  const [isRecurring, setIsRecurring] = useState(!!record?.isRecurring)
  const [frequency, setFrequency]     = useState<string>(record?.recurringFrequency || 'monthly')

  const [vdProfit,    setVdProfit]    = useState<number>((record as any)?.vdProfit    || 0)
  const [actualPaid,  setActualPaid]  = useState<number>((record as any)?.actualPaid  || 0)
  
  const [legalFeePct, setLegalFeePct] = useState<number>((record as any)?.legalFeePct || 0)
  const [legalFeeCost,setLegalFeeCost]= useState<number>((record as any)?.legalFeeCost|| 0)

  // -- NEW COMMISSION STATE --
  const [commissionPct, setCommissionPct] = useState<number>((record as any)?.commissionPct || 0)
  const [commissionCost, setCommissionCost] = useState<number>((record as any)?.commissionCost || 0)
  // --------------------------

  const [storageCost,  setStorageCost]  = useState<number>((record as any)?.storageCost  || 0)
  const [recoveryCost, setRecoveryCost] = useState<number>((record as any)?.recoveryCost || 0)
  const [piCost,       setPiCost]       = useState<number>((record as any)?.piCost       || 0)

  const [progress, setProgress] = useState<'in-progress'|'completed'>(record?.progress || 'in-progress')
  const [loading,  setLoading]  = useState(false)

  useEffect(() => {
    getDocs(collection(db, 'shareCategories')).then(snap => {
      setAvailableCategories(snap.docs.map(d => d.data().name).sort())
    })
  }, [])

  const handleClientChange = (id: string) => {
    setCustId(id)
    const c = customers.find(cx => cx.id === id)
    if (c) {
      setClientName(c.name); setClientPhone(c.mobile || ''); setClientEmail(c.email || ''); setClientAddr(c.address || '')
    } else if(id === '') { setClientName(''); setClientPhone(''); setClientEmail(''); setClientAddr('') }
  }

  const handleVehicleChange = (id: string) => {
    setVehicleId(id)
    const v = vehicles.find(vx => vx.id === id)
    if (v) setVehicleName(`${v.make} ${v.model} (${v.registrationNumber})`)
    else if(id === '') setVehicleName('')
  }

  useEffect(() => {
    setLegalFeeCost(Math.round((actualPaid * legalFeePct/100)*100)/100)
  }, [actualPaid, legalFeePct])

  // -- Calculate Commission Cost --
  useEffect(() => {
    setCommissionCost(Math.round((actualPaid * commissionPct/100)*100)/100)
  }, [actualPaid, commissionPct])
  // ------------------------------

  const toggleReason = (r:string) => setReasons(rs => rs.includes(r) ? rs.filter(x=>x!==r) : [...rs, r])

  const calculateNextDate = (dateStr: string, freq: string): string => {
    const d = new Date(dateStr);
    let next: Date;
    switch (freq) {
      case 'daily': next = addDays(d, 1); break;
      case 'weekly': next = addWeeks(d, 1); break;
      case 'monthly': next = addMonths(d, 1); break;
      case 'quarterly': next = addMonths(d, 3); break;
      case 'biannually': next = addMonths(d, 6); break;
      case 'yearly': next = addYears(d, 1); break;
      default: next = addMonths(d, 1);
    }
    return next.toISOString();
  };

  const handleSubmit = async (e:React.FormEvent) => {
    e.preventDefault()
    if (!user) return toast.error('Must be signed in')
    const userId = (user as any).uid || user.id || 'unknown';
    setLoading(true)

    // Formula: Total = VD + Actual + Legal - Commission + (Extras)
    const amount = vdProfit + actualPaid + legalFeeCost - commissionCost + 
                   (reasons.includes('S') ? storageCost : 0) + 
                   (reasons.includes('R') ? recoveryCost : 0) + 
                   (reasons.includes('PI')? piCost : 0)

    const payment: any = {
      type:        'income' as const,
      clientName, clientId: custId, clientPhone, clientEmail, clientAddress,
      vehicleId, vehicleName, category, claimRef,
      date: new Date(date).toISOString(), 
      reasons, notes,
      vdProfit, actualPaid, 
      legalFeePct, legalFeeCost,
      commissionPct, commissionCost, // Save commission fields
      ...(reasons.includes('S') ? { storageCost }  : {}),
      ...(reasons.includes('R') ? { recoveryCost } : {}),
      ...(reasons.includes('PI')? { piCost }       : {}),
      amount, progress,
      updatedAt:   new Date(),
      createdBy:   userId,
    }

    // --- RECURRING LOGIC FIX ---
    if (isRecurring) {
        payment.isRecurring = true;
        payment.recurringFrequency = frequency;
        
        // Only set next date if it's a NEW record OR it wasn't recurring before
        // This prevents resetting the cycle on edit
        if (!record || !record.isRecurring) {
            payment.nextRecurringDate = calculateNextDate(date, frequency);
        }
    } else {
        payment.isRecurring = false;
        payment.recurringFrequency = null;
        payment.nextRecurringDate = null;
    }
    // ---------------------------

    try {
      if (isEdit && record?.id) {
        await updateDoc(doc(db,'shares',record.id), {
          ...payment,
          payments: [payment] // Update wrapper
        })
        toast.success('Income updated')
      } else {
        const recipients: Recipient[] = [
          { name:'AIE Skyline', percentage:0, amount:0 },
          { name:'AbdulAziz',   percentage:0, amount:0 },
          { name:'JAY',         percentage:0, amount:0 },
        ]
        await addDoc(collection(db,'shares'), {
          ...payment,
          payments:    [payment],
          expenses:    [],
          recipients,
          createdAt:   new Date(),
          createdBy:   userId
        })
        toast.success('Income created')
      }
      onClose()
    } catch (err) {
      console.error(err)
      toast.error('Save failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      
      {/* Recurring Box */}
      <div className="border border-indigo-100 bg-indigo-50/50 rounded-md p-4 space-y-3">
        <div className="flex items-center">
             <input id="isRecurring" type="checkbox" checked={isRecurring} onChange={(e) => setIsRecurring(e.target.checked)} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded" />
              <label htmlFor="isRecurring" className="ml-2 block text-sm font-medium text-gray-900 flex items-center">
                <RefreshCw className="w-4 h-4 mr-1 text-indigo-600" />
                Re-occurring Transaction
              </label>
        </div>
        {isRecurring && (
          <div className="animate-fadeIn">
            <label className="block text-xs font-medium text-gray-700 uppercase tracking-wide">Frequency</label>
            <select value={frequency} onChange={(e) => setFrequency(e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
              <option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="quarterly">Quarterly (3 Months)</option><option value="biannually">Biannually (6 Months)</option><option value="yearly">Yearly</option>
            </select>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SearchableSelect label="Client" options={customers.map(c => ({ id: c.id, label: c.name, subLabel: c.mobile }))} value={custId} onChange={handleClientChange} placeholder="Search client..." isClearable required />
        <SearchableSelect label="Related Vehicle (Optional)" options={vehicles.map(v => ({ id: v.id, label: `${v.make} ${v.model}`, subLabel: v.registrationNumber }))} value={vehicleId} onChange={handleVehicleChange} placeholder="Search vehicle..." isClearable />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
         <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm">
              <option value="">Select Category...</option>{availableCategories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
         </div>
         <FormField label="Claim Ref" value={claimRef} onChange={e=>setClaimRef(e.target.value)} required />
         
         <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date & Time</label>
            <input type="datetime-local" value={date} onChange={e=>setDate(e.target.value)} required className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm" />
         </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Reason(s)</label>
        <div className="flex flex-wrap gap-3">
            {REASONS.map(r=>(
            <label key={r} className="inline-flex items-center space-x-2 bg-white px-3 py-1 rounded border border-gray-300 cursor-pointer hover:border-primary">
                <input type="checkbox" checked={reasons.includes(r)} onChange={()=>toggleReason(r)} className="h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary" />
                <span className="text-sm font-medium">{r}</span>
            </label>
            ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="VD Profit" type="number" value={vdProfit} onChange={e=>setVdProfit(+e.target.value)} />
        <FormField label="Actual Paid" type="number" value={actualPaid} onChange={e=>setActualPaid(+e.target.value)} />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Legal Fee (%)" type="number" min={0} max={100} value={legalFeePct} onChange={e=>setLegalFeePct(+e.target.value)} />
        <FormField label="Legal Fee Cost" type="number" value={legalFeeCost} readOnly className="bg-gray-100" />
      </div>

      {/* --- NEW COMMISSION SECTION --- */}
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Commission (%)" type="number" min={0} max={100} value={commissionPct} onChange={e=>setCommissionPct(+e.target.value)} />
        <FormField label="Commission Cost (Deducted)" type="number" value={commissionCost} readOnly className="bg-red-50 text-red-700" />
      </div>
      {/* ----------------------------- */}

      {(reasons.includes('S') || reasons.includes('R') || reasons.includes('PI')) && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-blue-50 rounded-lg">
          {reasons.includes('S') && <FormField label="Storage Cost" type="number" value={storageCost} onChange={e=>setStorageCost(+e.target.value)} />}
          {reasons.includes('R') && <FormField label="Recovery Cost" type="number" value={recoveryCost} onChange={e=>setRecoveryCost(+e.target.value)} />}
          {reasons.includes('PI') && <FormField label="PI Cost" type="number" value={piCost} onChange={e=>setPiCost(+e.target.value)} />}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700">Notes</label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary" placeholder="Notes..." />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Progress</label>
        <select value={progress} onChange={e=>setProgress(e.target.value as any)} className="mt-1 block w-full rounded-md border-gray-300 focus:border-primary focus:ring-primary">
          <option value="in-progress">In Progress</option><option value="completed">Completed</option>
        </select>
      </div>

      <div className="flex justify-end space-x-3 pt-4 border-t">
        <button type="button" onClick={onClose} className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50">Cancel</button>
        <button type="submit" disabled={loading} className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark disabled:opacity-50 shadow-sm">{loading ? 'Saving…' : isEdit ? 'Update Income' : 'Save Income'}</button>
      </div>
    </form>
  )
}