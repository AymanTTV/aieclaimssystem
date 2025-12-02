// src/components/share/ExpenseForm.tsx

import React, { useState, useEffect } from 'react'
import { addDoc, collection, updateDoc, doc, getDocs } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import { useCustomers } from '../../hooks/useCustomers'
import { useVehicles } from '../../hooks/useVehicles'
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
  const { vehicles } = useVehicles()

  const origItems = record?.items ?? []
  const hireItem  = origItems.find(i => i.type === 'Hire')
  const nonHire   = origItems.filter(i => i.type !== 'Hire')

  // -- State --
  const [custId, setCustId]           = useState(record?.clientId   || '')
  const [clientName, setClientName]   = useState(record?.clientName || '')
  const [clientPhone, setClientPhone] = useState(record?.clientPhone || '')
  const [clientEmail, setClientEmail] = useState(record?.clientEmail || '')
  const [clientAddress, setClientAddr]= useState(record?.clientAddress || '')

  const [vehicleId, setVehicleId]     = useState(record?.vehicleId || '')
  const [vehicleName, setVehicleName] = useState(record?.vehicleName || '')

  const [claimRef,    setClaimRef]    = useState(record?.claimRef   || '')
  const [date,        setDate]        = useState(record?.date.slice(0,10) || new Date().toISOString().slice(0,10))
  const [notes,       setNotes]       = useState(record?.notes || '')

  // Category State
  const [category, setCategory]       = useState(record?.category || '')
  const [availableCategories, setAvailableCategories] = useState<string[]>([])

  const [items,       setItems]       = useState<ExpenseItem[]>(nonHire)

  const [includeHire, setIncludeHire] = useState(!!hireItem)
  const [hireStart,   setHireStart]   = useState(hireItem?.description.split(' → ')[0] || '')
  const [hireEnd,     setHireEnd]     = useState(hireItem?.description.split(' → ')[1]?.split(' (')[0] || '') 
  const existingRegMatch = hireItem?.description.match(/Reg: ([^,)]+)/)
  const [hireReg, setHireReg]         = useState(existingRegMatch ? existingRegMatch[1] : '')
  const [hireQty, setHireQty]         = useState<number>(hireItem ? hireItem.quantity : 1)
  const [hireUnitCost, setHireUnitCost] = useState(0)

  const [progress,    setProgress]    = useState<'in-progress'|'completed'>(record?.progress || 'in-progress')
  const [loading,     setLoading]     = useState(false)

  // Fetch categories
  useEffect(() => {
    getDocs(collection(db, 'shareCategories')).then(snap => {
      setAvailableCategories(snap.docs.map(d => d.data().name).sort())
    })
  }, [])

  const handleClientChange = (id: string) => {
    setCustId(id)
    const c = customers.find(x => x.id === id)
    if (c) {
      setClientName(c.name)
      setClientPhone(c.mobile || '')
      setClientEmail(c.email || '')
      setClientAddr(c.address || '')
    } else if (id === '') {
      setClientName('')
    }
  }

  const handleVehicleChange = (id: string) => {
    setVehicleId(id)
    const v = vehicles.find(x => x.id === id)
    if (v) {
      setVehicleName(`${v.make} ${v.model} (${v.registrationNumber})`)
    } else if (id === '') {
      setVehicleName('')
    }
  }

  useEffect(() => {
    if (includeHire && hireStart && hireEnd) {
      const s = new Date(hireStart),
            e = new Date(hireEnd),
            weeks = Math.max(0, Math.ceil((e.getTime()-s.getTime())/(7*24*3600*1000)))
      setHireUnitCost(weeks * WEEKLY_RATE)
    } else {
      setHireUnitCost(0)
    }
  }, [includeHire, hireStart, hireEnd])

  const updateItem = (i:number, field:keyof ExpenseItem, val:any) =>
    setItems(it => it.map((x, idx) => idx === i ? { ...x, [field]: val } : x))

  const addRow = () =>
    setItems(it => [...it, { type:'', description:'', quantity:1, unitPrice:0, vat:false }])

  const removeRow = (i:number) =>
    setItems(it => it.filter((_, idx) => idx !== i))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return toast.error('Please sign in first')
    setLoading(true)

    const allItems: ExpenseItem[] = [...items]

    if (includeHire) {
        const regText = hireReg ? `(Reg: ${hireReg})` : ''
        allItems.unshift({
            type: 'Hire',
            description: `${hireStart} → ${hireEnd} ${regText}`,
            quantity: hireQty,
            unitPrice: hireUnitCost, 
            vat: false
        })
    }

    const totalCost = allItems.reduce(
      (sum, itm) => sum + (itm.quantity * itm.unitPrice * (itm.vat ? 1.2 : 1)),
      0
    )

    const expenseRec = {
      type:      'expense' as const,
      clientName,
      clientId:  custId,
      clientPhone,
      clientEmail,
      clientAddress,
      vehicleId,
      vehicleName,
      category, // save category
      claimRef,
      date,
      notes,
      items:     allItems,
      totalCost,
      progress,
      updatedAt: new Date(),
      createdBy: user.id,
    }

    try {
      if (isEdit && record!.id) {
        await updateDoc(doc(db, 'shares', record!.id), {
          expenses: [expenseRec],
          progress
        })
        toast.success('Expense updated')
      } else {
        const recipients: Recipient[] = [
          { name:'AIE Skyline', percentage:0, amount:0 },
          { name:'AbdulAziz',   percentage:0, amount:0 },
          { name:'JAY',         percentage:0, amount:0 },
        ]
        await addDoc(collection(db, 'shares'), {
          payments:   [],
          expenses:   [expenseRec],
          recipients,
          notes,
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
    <form onSubmit={handleSubmit} className="space-y-5">
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SearchableSelect
          label="Client"
          options={customers.map(c => ({ 
            id: c.id, 
            label: c.name, 
            subLabel: `${c.mobile || ''} ${c.email ? '- ' + c.email : ''}` 
          }))}
          value={custId}
          onChange={handleClientChange}
          placeholder="Search client..."
          isClearable
          required
        />
        
        <SearchableSelect
          label="Related Vehicle (Optional)"
          options={vehicles.map(v => ({ 
            id: v.id, 
            label: `${v.make} ${v.model}`, 
            subLabel: v.registrationNumber 
          }))}
          value={vehicleId}
          onChange={handleVehicleChange}
          placeholder="Search vehicle..."
          isClearable
        />
      </div>

      {/* Category, Ref, Date */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
         <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
            >
              <option value="">Select Category...</option>
              {availableCategories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
         </div>
         <FormField label="Claim Ref" value={claimRef} onChange={e=>setClaimRef(e.target.value)} required/>
         <FormField label="Date" type="date" value={date} onChange={e=>setDate(e.target.value)} required/>
      </div>

      <div className="border rounded-lg p-4 bg-gray-50">
        <label className="inline-flex items-center space-x-2 mb-4">
          <input
            type="checkbox"
            checked={includeHire}
            onChange={e => setIncludeHire(e.target.checked)}
            className="h-5 w-5 text-primary rounded border-gray-300 focus:ring-primary"
          />
          <span className="font-medium text-gray-900">Include Hire Expense</span>
        </label>

        {includeHire && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            <FormField label="Hire Start" type="date" value={hireStart} onChange={e=>setHireStart(e.target.value)} required/>
            <FormField label="Hire End"   type="date" value={hireEnd  } onChange={e=>setHireEnd(e.target.value)}   required/>
            
            <FormField 
               label="Vehicle Reg No." 
               placeholder="e.g. LB21 XY..." 
               value={hireReg} 
               onChange={e=>setHireReg(e.target.value)} 
            />

            <FormField 
              label="Qty (Vehicles)" 
              type="number" 
              min={1} 
              value={hireQty} 
              onChange={e=>setHireQty(+e.target.value)} 
            />
            
            <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">Total Hire Cost</label>
               <div className="px-3 py-2 bg-gray-200 rounded border border-gray-300 text-gray-700 font-semibold">
                 £{(hireUnitCost * hireQty).toLocaleString()}
               </div>
               <span className="text-xs text-gray-500 block mt-1">
                 (£{WEEKLY_RATE}/wk x wks x qty)
               </span>
            </div>
          </div>
        )}
      </div>

      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-2">Additional Expenses</h4>
        <div className="overflow-x-auto border rounded-lg">
            <table className="min-w-full table-auto border-collapse">
            <thead className="bg-gray-100 text-xs uppercase text-gray-500">
                <tr>
                <th className="p-2 text-left">Type</th>
                <th className="p-2 text-left w-1/3">Description</th>
                <th className="p-2 text-center">Qty</th>
                <th className="p-2 text-center">Unit (£)</th>
                <th className="p-2 text-center">VAT</th>
                <th className="p-2 text-center">Action</th>
                </tr>
            </thead>
            <tbody>
                {items.map((it, i) => (
                <tr key={i} className="border-b last:border-b-0 hover:bg-gray-50">
                    <td className="p-2">
                    <FormField value={it.type} onChange={e => updateItem(i, 'type', e.target.value)} required />
                    </td>
                    <td className="p-2">
                    <FormField value={it.description} onChange={e => updateItem(i, 'description', e.target.value)} required />
                    </td>
                    <td className="p-2 w-20">
                    <FormField type="number" value={it.quantity} onChange={e => updateItem(i, 'quantity', +e.target.value)} min={1} required />
                    </td>
                    <td className="p-2 w-24">
                    <FormField type="number" value={it.unitPrice} onChange={e => updateItem(i, 'unitPrice', +e.target.value)} min={0} step="0.01" required />
                    </td>
                    <td className="p-2 text-center">
                    <input type="checkbox" checked={it.vat} onChange={e => updateItem(i, 'vat', e.target.checked)} className="h-4 w-4 text-primary rounded" />
                    </td>
                    <td className="p-2 text-center">
                    <button type="button" onClick={() => removeRow(i)} className="text-red-600 hover:text-red-800 text-sm font-medium">Remove</button>
                    </td>
                </tr>
                ))}
                {items.length === 0 && (
                    <tr><td colSpan={6} className="p-4 text-center text-sm text-gray-500">No additional items</td></tr>
                )}
            </tbody>
            </table>
        </div>
        <button
            type="button"
            onClick={addRow}
            className="mt-2 px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm font-medium"
        >
            + Add Expense Item
        </button>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Notes</label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={2}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
          placeholder="Notes..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Progress</label>
        <select
            value={progress}
            onChange={e => setProgress(e.target.value as 'in-progress'|'completed')}
            className="mt-1 block w-full rounded-md border-gray-300 focus:border-primary focus:ring-primary"
        >
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
        </select>
      </div>

      <div className="flex justify-end space-x-3 pt-4 border-t">
        <button type="button" onClick={onClose} className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50">
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark disabled:opacity-50 shadow-sm"
        >
          {loading ? 'Saving…' : isEdit ? 'Update Expense' : 'Record Expense'}
        </button>
      </div>
    </form>
  )
}