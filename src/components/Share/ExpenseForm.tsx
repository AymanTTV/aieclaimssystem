// src/components/share/ExpenseForm.tsx

import React, { useState, useEffect } from 'react'
import { addDoc, collection, updateDoc, doc } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import { useCustomers } from '../../hooks/useCustomers'
import SearchableSelect from '../ui/SearchableSelect'
import FormField from '../ui/FormField'
import { ExpenseEntry, ExpenseItem, Recipient } from '../../types/share'

const WEEKLY_RATE = 400

interface Props {
  onClose(): void
  record?: ExpenseEntry & { id: string }
}

export default function ExpenseForm({ onClose, record }: Props) {
  const isEdit = !!record
  const { user } = useAuth()
  const { customers } = useCustomers()

  // 1) Split out any existing “Hire” line from the record
  const origItems = record?.items ?? []
  const hireItem  = origItems.find(i => i.type === 'Hire')
  const nonHire   = origItems.filter(i => i.type !== 'Hire')

  // Basic info
  const [custId,      setCustId]      = useState(record?.clientId   || '')
  const [clientName,  setClientName]  = useState(record?.clientName || '')
  const [claimRef,    setClaimRef]    = useState(record?.claimRef   || '')
  const [date,        setDate]        = useState(record?.date.slice(0,10) || new Date().toISOString().slice(0,10))

  // expense lines (excluding hire)
  const [items,       setItems]       = useState<ExpenseItem[]>(nonHire)

  // hire controls
  const [includeHire, setIncludeHire] = useState(!!hireItem)
  const [hireStart,   setHireStart]   = useState(hireItem?.description.split(' → ')[0] || '')
  const [hireEnd,     setHireEnd]     = useState(hireItem?.description.split(' → ')[1] || '')
  const [hireAmount,  setHireAmount]  = useState(0)

  const [progress,    setProgress]    = useState<'in-progress'|'completed'>(record?.progress || 'in-progress')
  const [loading,     setLoading]     = useState(false)

  // Autofill client name when you pick from the dropdown
  useEffect(() => {
    const c = customers.find(c => c.id === custId)
    if (c) setClientName(c.name)
  }, [custId, customers])

  // Recompute hireAmount when dates change
  useEffect(() => {
    if (includeHire && hireStart && hireEnd) {
      const s = new Date(hireStart),
            e = new Date(hireEnd),
            weeks = Math.max(0, Math.ceil((e.getTime()-s.getTime())/(7*24*3600*1000)))
      setHireAmount(weeks * WEEKLY_RATE)
    } else {
      setHireAmount(0)
    }
  }, [includeHire, hireStart, hireEnd])

  // helpers to manipulate the non-hire lines
  const updateItem = (i:number, field:keyof ExpenseItem, val:any) =>
    setItems(it => it.map((x, idx) => idx === i ? { ...x, [field]: val } : x))

  const addRow = () =>
    setItems(it => [...it, { type:'', description:'', quantity:1, unitPrice:0, vat:false }])

  const removeRow = (i:number) =>
    setItems(it => it.filter((_, idx) => idx !== i))

  // onSubmit: re-build full items array (hire + others), compute totalCost, and write
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return toast.error('Please sign in first')
    setLoading(true)

    const allItems: ExpenseItem[] = includeHire
      ? [
          {
            type: 'Hire',
            description: `${hireStart} → ${hireEnd}`,
            quantity: 1,
            unitPrice: hireAmount,
            vat: false
          },
          ...items
        ]
      : items

    const totalCost = allItems.reduce(
      (sum, itm) => sum + itm.quantity * itm.unitPrice * (itm.vat ? 1.2 : 1),
      0
    )

    // build the Firestore object
    const expenseRec = {
      type:      'expense' as const,
      clientName,
      clientId:  custId,
      claimRef,
      date,
      items:     allItems,
      totalCost,
      progress,
      updatedAt: new Date(),
      createdBy: user.id,
    }

    try {
      if (isEdit && record!.id) {
        // update existing doc
        await updateDoc(doc(db, 'shares', record!.id), {
          expenses: [expenseRec],
          progress
        })
        toast.success('Expense updated')
      } else {
        // new doc: payments empty, one-element expenses
        const recipients: Recipient[] = [
          { name:'AIE Skyline', percentage:0, amount:0 },
          { name:'AbdulAziz',   percentage:0, amount:0 },
          { name:'JAY',         percentage:0, amount:0 },
        ]
        await addDoc(collection(db, 'shares'), {
          payments:   [],
          expenses:   [expenseRec],
          recipients,
          notes:      '',
          progress,
          createdAt:  new Date(),
          createdBy:  user.id
        })
        toast.success('Expense recorded')
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
      {/* CLIENT SELECT */}
      <label className="block text-sm font-medium">Client</label>
      <div className="flex space-x-2">
        <SearchableSelect
          options={customers.map(c=>({ id:c.id, label:c.name }))}
          value={custId}
          onChange={setCustId}
        />
        <FormField
          placeholder="Manual…"
          value={clientName}
          onChange={e => setClientName(e.target.value)}
        />
      </div>

      {/* CLAIM REF & DATE */}
      <FormField label="Claim Ref" value={claimRef} onChange={e=>setClaimRef(e.target.value)} required/>
      <FormField label="Date" type="date" value={date} onChange={e=>setDate(e.target.value)} required/>

      {/* HIRE TOGGLE */}
      <label className="inline-flex items-center space-x-2">
        <input
          type="checkbox"
          checked={includeHire}
          onChange={e => setIncludeHire(e.target.checked)}
          className="h-4 w-4 text-primary rounded border-gray-300"
        />
        <span>Include Hire Expense</span>
      </label>

      {includeHire && (
        <div className="grid grid-cols-3 gap-4">
          <FormField label="Hire Start" type="date" value={hireStart} onChange={e=>setHireStart(e.target.value)} required/>
          <FormField label="Hire End"   type="date" value={hireEnd  } onChange={e=>setHireEnd(e.target.value)}   required/>
          <FormField label="Hire £/wk"  type="number" value={hireAmount} readOnly/>
        </div>
      )}

      {/* EXPENSE LINES */}
      <div className="overflow-x-auto">
        <table className="min-w-full table-auto border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 text-left">Type</th>
              <th className="p-2 text-left w-1/2">Description</th>
              <th className="p-2 text-center">Qty</th>
              <th className="p-2 text-center">Unit</th>
              <th className="p-2 text-center">VAT</th>
              <th className="p-2 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => (
              <tr key={i} className="border-b">
                <td className="p-1">
                  <FormField
                    value={it.type}
                    onChange={e => updateItem(i, 'type', e.target.value)}
                    required
                  />
                </td>
                <td className="p-1">
                  <FormField
                    value={it.description}
                    onChange={e => updateItem(i, 'description', e.target.value)}
                    required
                  />
                </td>
                <td className="p-1 text-center">
                  <FormField
                    type="number"
                    value={it.quantity}
                    onChange={e => updateItem(i, 'quantity', +e.target.value)}
                    min={1}
                    required
                  />
                </td>
                <td className="p-1 text-center">
                  <FormField
                    type="number"
                    value={it.unitPrice}
                    onChange={e => updateItem(i, 'unitPrice', +e.target.value)}
                    min={0}
                    step="0.01"
                    required
                  />
                </td>
                <td className="p-1 text-center">
                  <input
                    type="checkbox"
                    checked={it.vat}
                    onChange={e => updateItem(i, 'vat', e.target.checked)}
                    className="h-4 w-4"
                  />
                </td>
                <td className="p-1 text-center">
                  <button
                    type="button"
                    onClick={() => removeRow(i)}
                    className="text-red-600"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        type="button"
        onClick={addRow}
        className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200"
      >
        + Add Expense Item
      </button>

      {/* PROGRESS */}
      <div>
  <label className="block text-sm font-medium">Progress</label>
  <select
    value={progress}
    onChange={e => setProgress(e.target.value as 'in-progress'|'completed')}
    className="mt-1 block w-full rounded-md border-gray-300"
  >
    <option value="in-progress">In Progress</option>
    <option value="completed">Completed</option>
  </select>
</div>


      {/* ACTIONS */}
      <div className="flex justify-end space-x-2">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 border rounded"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-primary text-white rounded disabled:opacity-50"
        >
          {loading ? 'Saving…' : isEdit ? 'Update Expense' : 'Record Expense'}
        </button>
      </div>
    </form>
  )
}
