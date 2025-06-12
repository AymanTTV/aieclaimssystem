// src/components/share/ShareForm.tsx

import React, { useState, useEffect } from 'react'
import { updateDoc, doc } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import { usePermissions } from '../../hooks/usePermissions'
import SearchableSelect from '../ui/SearchableSelect'
import FormField from '../ui/FormField'
import { ShareRecord, PaymentRecord, Expense, Recipient } from '../../types/share'
import { useCustomers } from '../../hooks/useCustomers'

interface Props {
  record: ShareRecord
  onClose: () => void
}

const REASONS = ['VD','H','S','PI','Additional']
const WEEKLY_RATE = 400

export default function ShareForm({ record, onClose }: Props) {
  const isEdit = Boolean(record.id)
  const { user } = useAuth()
  const { can } = usePermissions()
  const { customers } = useCustomers()

  // --- PAYMENTS (only first)
  const pr = record.payments[0]
  const [custId, setCustId] = useState('')
  const [clientName, setClientName] = useState(pr.clientName)
  const [claimRef, setClaimRef] = useState(pr.claimRef)
  const [date, setDate] = useState(pr.date)
  const [amount, setAmount] = useState(pr.amount)
  const [reasons, setReasons] = useState<string[]>([...pr.reasons])
  const [vdProfit, setVdProfit] = useState(pr.vdProfit)
  const [actualPaid, setActualPaid] = useState(pr.actualPaid)
  const [legalFeePct, setLegalFeePct] = useState(pr.legalFeePct)
  const [legalFeeCost, setLegalFeeCost] = useState(pr.legalFeeCost)
  const [startDate, setStartDate] = useState(pr.startDate ?? '')
  const [endDate, setEndDate] = useState(pr.endDate ?? '')
  const [vHireAmount, setVHireAmount] = useState(pr.vHireAmount ?? 0)

  // --- EXPENSES
  const [expenses, setExpenses] = useState<Expense[]>([...record.expenses])

  // --- SPLIT
  const [recipients, setRecipients] = useState<Recipient[]>([...record.recipients])

  // --- NOTES & PROGRESS
  const [notes, setNotes] = useState(record.notes ?? '')
  const [progress, setProgress] = useState(record.progress)

  // loading
  const [loading, setLoading] = useState(false)

  // fetch custId if possible
  useEffect(()=>{
    const cust = customers.find(c=>c.name===record.payments[0].clientName)
    if(cust) setCustId(cust.id)
  },[customers,record])

  // recalc legalFeeCost & vHireAmount
  useEffect(()=> {
    setLegalFeeCost(Math.round((actualPaid * legalFeePct/100)*100)/100)
  },[actualPaid,legalFeePct])
  useEffect(()=>{
    if(reasons.includes('H')&& startDate && endDate) {
      const s=new Date(startDate), e=new Date(endDate)
      const weeks=Math.max(0,Math.ceil((e.getTime()-s.getTime())/(7*24*3600*1000)))
      setVHireAmount(weeks * WEEKLY_RATE)
    } else setVHireAmount(0)
  },[reasons,startDate,endDate])

  // handlers for arrays
  const toggleReason = (r:string)=>
    setReasons(rs=>rs.includes(r)? rs.filter(x=>x!==r) : [...rs,r])

  const updateExp = (i:number,f:keyof Expense,v:any)=>
    setExpenses(es=>es.map((e,idx)=>idx===i?{...e,[f]:v}:e))
  const addExp = () =>
    setExpenses(es=>[...es,{type:'',description:'',quantity:1,unitPrice:0,vat:false}])
  const removeExp = (i:number) =>
    setExpenses(es=>es.filter((_,idx)=>idx!==i))

  const updateRec = (i:number,f:keyof Recipient,v:any)=>
    setRecipients(rs=>rs.map((r,idx)=>idx===i?{...r,[f]:v}:r))

  // save
  const handleSubmit = async(e:React.FormEvent)=>{
    e.preventDefault()
    if(!user||!can('share','update')){
      toast.error('Not authorized');return
    }
    setLoading(true)
    const updated: ShareRecord = {
      payments: [{
        clientName,
        claimRef,
        date,
        amount,
        reasons,
        vdProfit,
        actualPaid,
        legalFeePct,
        legalFeeCost,
        startDate: reasons.includes('H')? startDate:undefined,
        endDate: reasons.includes('H')? endDate:undefined,
        vHireAmount: reasons.includes('H')? vHireAmount:undefined,
      }],
      expenses,
      recipients,
      notes,
      progress,
      createdAt: record.createdAt,
      createdBy: record.createdBy
    }
    try {
      await updateDoc(doc(db,'shares',record.id!),updated)
      toast.success('Updated successfully')
      onClose()
    } catch {
      toast.error('Update failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Payments */}
      <div className="space-y-2">
        <h3 className="text-lg font-medium">📥 Payment</h3>
        <SearchableSelect
          label="Client"
          options={customers.map(c=>({ id:c.id,label:c.name }))}
          value={custId}
          onChange={v=>setCustId(v)}
          placeholder="Search…"
          required
        />
        <FormField label="Claim Ref" value={claimRef} onChange={e=>setClaimRef(e.target.value)} required/>
        <FormField label="Date" type="date" value={date} onChange={e=>setDate(e.target.value)} required/>
        <FormField label="Amount" type="number" value={amount} onChange={e=>setAmount(+e.target.value)} required/>
        <fieldset>
          <legend className="text-sm">Reason(s)</legend>
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
          <FormField label="VD Profit" type="number" value={vdProfit} onChange={e=>setVdProfit(+e.target.value)} />
          <FormField label="Actual Paid" type="number" value={actualPaid} onChange={e=>setActualPaid(+e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Legal Fee %" type="number" value={legalFeePct} onChange={e=>setLegalFeePct(+e.target.value)} min={0} max={100}/>
          <FormField label="Legal Fee Cost" type="number" value={legalFeeCost} readOnly/>
        </div>
        {reasons.includes('H') && (
          <div className="grid grid-cols-3 gap-4">
            <FormField label="Hire Start" type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} />
            <FormField label="Hire End"   type="date" value={endDate}   onChange={e=>setEndDate(e.target.value)}   />
            <FormField label="Hire Income" type="number" value={vHireAmount} readOnly/>
          </div>
        )}
      </div>

      {/* Expenses */}
      <div className="space-y-2">
        <h3 className="text-lg font-medium">🧾 Expenses</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2 text-left">Type</th>
                <th className="p-2 text-left">Desc</th>
                <th className="p-2">Qty</th>
                <th className="p-2">Unit</th>
                <th className="p-2">VAT</th>
                <th className="p-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((e,i)=>(
                <tr key={i} className="border-b">
                  <td className="p-1"><FormField value={e.type} onChange={v=>updateExp(i,'type',v.target.value)} /></td>
                  <td className="p-1"><FormField value={e.description} onChange={v=>updateExp(i,'description',v.target.value)} /></td>
                  <td className="p-1"><FormField type="number" value={e.quantity} onChange={v=>updateExp(i,'quantity',+v.target.value)} min={1} /></td>
                  <td className="p-1"><FormField type="number" value={e.unitPrice} onChange={v=>updateExp(i,'unitPrice',+v.target.value)} min={0} step="0.01" /></td>
                  <td className="p-1 text-center"><input type="checkbox" checked={e.vat} onChange={v=>updateExp(i,'vat',v.target.checked)} className="h-4 w-4"/></td>
                  <td className="p-1 text-center"><button type="button" onClick={()=>removeExp(i)} className="text-red-600">Remove</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button type="button" onClick={addExp} className="px-2 py-1 bg-gray-100 rounded hover:bg-gray-200">
          + Expense
        </button>
      </div>

      {/* Split */}
      <div className="space-y-2">
        <h3 className="text-lg font-medium">📊 Split</h3>
        <div className="grid grid-cols-3 gap-4">
          {recipients.map((r,i)=>(
            <div key={r.name}>
              <label className="block text-sm">{r.name} %</label>
              <input
                type="number"
                value={r.percentage}
                onChange={e=>updateRec(i,'percentage',+e.target.value)}
                className="mt-1 block w-full border-gray-300 rounded"
                min={0} max={100}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Notes & Progress */}
      <FormField
        label="Notes"
        as="textarea"
        rows={3}
        value={notes}
        onChange={e=>setNotes(e.target.value)}
      />
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

      {/* Actions */}
      <div className="flex justify-end space-x-2">
        <button type="button" onClick={onClose} className="px-4 py-2 border rounded">
          Cancel
        </button>
        <button type="submit" disabled={loading} className="px-4 py-2 bg-primary text-white rounded">
          {loading ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </form>
  )
}
