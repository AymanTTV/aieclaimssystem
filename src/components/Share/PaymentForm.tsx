// src/components/share/PaymentForm.tsx

import React, { useState, useEffect } from 'react'
import { addDoc, collection, updateDoc, doc } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import { useCustomers } from '../../hooks/useCustomers'
import SearchableSelect from '../ui/SearchableSelect'
import FormField from '../ui/FormField'
import { ShareEntry, Recipient } from '../../types/share'

const REASONS = ['VD','H','S','R','PI'] as const

interface Props {
  onClose(): void
  record?: ShareEntry & { id: string }
}

export default function PaymentForm({ onClose, record }: Props) {
  const isEdit = !!record
  const { user } = useAuth()
  const { customers } = useCustomers()

  // initialize from record or defaults
  const [custId, setCustId]           = useState(record?.clientId || '')
  const [clientName, setClientName]   = useState(record?.clientName || '')
  const [claimRef, setClaimRef]       = useState(record?.claimRef   || '')
  const [date, setDate]               = useState(record?.date.slice(0,10) || new Date().toISOString().slice(0,10))
  const [reasons, setReasons]         = useState<string[]>(record?.reasons || [])

  const [vdProfit,    setVdProfit]    = useState<number>((record as any)?.vdProfit    || 0)
  const [actualPaid,  setActualPaid]  = useState<number>((record as any)?.actualPaid  || 0)
  const [legalFeePct, setLegalFeePct] = useState<number>((record as any)?.legalFeePct || 0)
  const [legalFeeCost,setLegalFeeCost]= useState<number>((record as any)?.legalFeeCost|| 0)

  const [storageCost,  setStorageCost]  = useState<number>((record as any)?.storageCost  || 0)
  const [recoveryCost, setRecoveryCost] = useState<number>((record as any)?.recoveryCost || 0)
  const [piCost,       setPiCost]       = useState<number>((record as any)?.piCost       || 0)

  const [progress, setProgress] = useState<'in-progress'|'completed'>(record?.progress || 'in-progress')
  const [loading,  setLoading]  = useState(false)

  // autofill clientName when selecting existing customer
  useEffect(() => {
    const c = customers.find(c=>c.id===custId)
    if (c) setClientName(c.name)
  }, [custId, customers])

  // recalc legal fee cost
  useEffect(() => {
    setLegalFeeCost(Math.round((actualPaid * legalFeePct/100)*100)/100)
  }, [actualPaid, legalFeePct])

  const toggleReason = (r:string) =>
    setReasons(rs => rs.includes(r) ? rs.filter(x=>x!==r) : [...rs, r])

  const handleSubmit = async (e:React.FormEvent) => {
    e.preventDefault()
    if (!user) return toast.error('Must be signed in')

    setLoading(true)
    const amount =
      vdProfit +
      actualPaid +
      legalFeeCost +
      (reasons.includes('S') ? storageCost  : 0) +
      (reasons.includes('R') ? recoveryCost : 0) +
      (reasons.includes('PI')? piCost       : 0)

    const payment = {
      type:        'income' as const,
      clientName,
      clientId:    custId,
      claimRef,
      date,
      reasons,
      vdProfit,
      actualPaid,
      legalFeePct,
      legalFeeCost,
      ...(reasons.includes('S') ? { storageCost }  : {}),
      ...(reasons.includes('R') ? { recoveryCost } : {}),
      ...(reasons.includes('PI')? { piCost }       : {}),
      amount,
      progress,
      updatedAt:   new Date(),
      createdBy:   user.id,
    }

    try {
      if (isEdit && record?.id) {
        // overwrite the single‐element payments array
        await updateDoc(doc(db,'shares',record.id), {
          payments: [payment],
          progress
        })
        toast.success('Income updated')
      } else {
        // new doc
        const recipients: Recipient[] = [
          { name:'AIE Skyline', percentage:0, amount:0 },
          { name:'AbdulAziz',   percentage:0, amount:0 },
          { name:'JAY',         percentage:0, amount:0 },
        ]
        await addDoc(collection(db,'shares'), {
          payments:    [payment],
          expenses:    [],
          recipients,
          notes:       '',
          progress,
          createdAt:   new Date(),
          createdBy:   user.id
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
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Client */}
      <label className="block text-sm font-medium">Client</label>
      <div className="flex space-x-2">
        <SearchableSelect
          options={customers.map(c=>({ id:c.id,label:c.name }))}
          value={custId}
          onChange={setCustId}
        />
        <FormField
          placeholder="Manual…"
          value={clientName}
          onChange={e=>setClientName(e.target.value)}
        />
      </div>

      <FormField label="Claim Ref"
        value={claimRef}
        onChange={e=>setClaimRef(e.target.value)}
        required
      />
      <FormField label="Date" type="date"
        value={date}
        onChange={e=>setDate(e.target.value)}
        required
      />

      <fieldset>
        <legend className="text-sm font-medium">Reason(s)</legend>
        <div className="flex flex-wrap gap-2 mt-2">
          {REASONS.map(r=>(
            <label key={r} className="inline-flex items-center space-x-1">
              <input
                type="checkbox"
                checked={reasons.includes(r)}
                onChange={()=>toggleReason(r)}
                className="h-4 w-4 text-primary border-gray-300 rounded"
              />
              <span>{r}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="VD Profit" type="number"
          value={vdProfit}
          onChange={e=>setVdProfit(+e.target.value)}
        />
        <FormField label="Actual Paid" type="number"
          value={actualPaid}
          onChange={e=>setActualPaid(+e.target.value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Legal Fee (%)" type="number"
          min={0} max={100}
          value={legalFeePct}
          onChange={e=>setLegalFeePct(+e.target.value)}
        />
        <FormField label="Legal Fee Cost" type="number"
          value={legalFeeCost}
          readOnly
        />
      </div>

      {reasons.includes('S') && (
        <FormField label="Storage Cost" type="number"
          value={storageCost}
          onChange={e=>setStorageCost(+e.target.value)}
        />
      )}
      {reasons.includes('R') && (
        <FormField label="Recovery Cost" type="number"
          value={recoveryCost}
          onChange={e=>setRecoveryCost(+e.target.value)}
        />
      )}
      {reasons.includes('PI') && (
        <FormField label="PI Cost" type="number"
          value={piCost}
          onChange={e=>setPiCost(+e.target.value)}
        />
      )}

      <div>
        <label className="block text-sm font-medium">Progress</label>
        <select
          value={progress}
          onChange={e=>setProgress(e.target.value as any)}
          className="mt-1 block w-full rounded-md border-gray-300"
        >
          <option value="in-progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      <div className="flex justify-end space-x-2">
        <button type="button" onClick={onClose} className="px-4 py-2 border rounded">
          Cancel
        </button>
        <button type="submit" disabled={loading}
          className="px-4 py-2 bg-primary text-white rounded disabled:opacity-50"
        >
          {loading ? 'Saving…' : isEdit ? 'Update Income' : 'Save Income'}
        </button>
      </div>
    </form>
)
}
