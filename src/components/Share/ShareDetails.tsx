import React, { useState, useEffect } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { ShareEntry } from '../../types/share'
import { format, parseISO } from 'date-fns'
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay'
import { Calendar, User, Tag, DollarSign } from 'lucide-react'

interface Props { entry: ShareEntry }

const ShareDetails: React.FC<Props> = ({ entry }) => {
  const { formatCurrency } = useFormattedDisplay()
  const [createdByName, setCreatedByName] = useState<string>('—')

  useEffect(() => {
    if (!entry.createdBy) return
    getDoc(doc(db,'users',entry.createdBy)).then(u=>{
      setCreatedByName(u.exists()?u.data().name:'Unknown')
    })
  }, [entry.createdBy])

  const Section = ({ icon: Icon, title, children }: any) => (
    <div className="border-t pt-6 mt-6 first:border-t-0 first:pt-0 first:mt-0">
      <div className="flex items-center mb-4 space-x-2 text-gray-700">
        <Icon className="w-5 h-5"/> 
        <h3 className="text-lg font-medium">{title}</h3>
      </div>
      {children}
    </div>
  )

  const Field = ({ label, value, color='' }: any) => (
    <div className="mb-4">
      <dt className="text-sm font-medium text-gray-500">{label}</dt>
      <dd className={`mt-1 text-sm ${color}`}>{value}</dd>
    </div>
  )

  const dateStr = !entry.date
    ? '—'
    : format(parseISO(entry.date), 'dd/MM/yyyy')

  return (
    <div className="space-y-6">
      <Section icon={User} title="Basic Info">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Client" value={entry.clientName}/>
          <Field label="Claim Ref" value={entry.claimRef}/>
          <Field label="Date" value={dateStr}/>
          <Field label="Progress" value={entry.progress.replace('-',' ')}/>
        </div>
      </Section>

      {entry.type==='income' ? (
        <>
          <Section icon={DollarSign} title="Income Details">
            <div className="grid grid-cols-2 gap-4">
              <Field label="VD Profit" value={`£${formatCurrency((entry as any).vdProfit)}`}/>
              <Field label="Actual Paid" value={`£${formatCurrency((entry as any).actualPaid)}`}/>
              <Field label={`Legal Fee (${(entry as any).legalFeePct}%)`} value={`£${formatCurrency((entry as any).legalFeeCost)}`}/>
              { (entry as any).storageCost != null && (
                <Field label="Storage Cost" value={`£${formatCurrency((entry as any).storageCost)}`}/>
              )}
              { (entry as any).recoveryCost != null && (
                <Field label="Recovery Cost" value={`£${formatCurrency((entry as any).recoveryCost)}`}/>
              )}
              { (entry as any).piCost != null && (
                <Field label="PI Cost" value={`£${formatCurrency((entry as any).piCost)}`}/>
              )}
              <Field label="Total" value={`£${formatCurrency((entry as any).amount)}`} color="text-green-600 font-semibold"/>
            </div>
          </Section>
        </>
      ) : (
        <Section icon={Calendar} title="Expense Details">
          <div className="space-y-4">
            { (entry as any).items.map((it:any,i:number)=>(
              <div key={i} className="bg-gray-50 p-4 rounded-lg">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Type</dt>
                    <dd className="mt-1 text-sm text-gray-900">{it.type}</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-sm font-medium text-gray-500">Desc</dt>
                    <dd className="mt-1 text-sm text-gray-900">{it.description}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Qty</dt>
                    <dd className="mt-1 text-sm text-gray-900">{it.quantity}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Unit</dt>
                    <dd className="mt-1 text-sm text-gray-900">£{formatCurrency(it.unitPrice)}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">VAT</dt>
                    <dd className="mt-1 text-sm text-gray-900">{it.vat ? '20%' : '0%'}</dd>
                  </div>
                  <div className="col-span-3">
                    <dt className="text-sm font-medium text-gray-500">Total</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      £{formatCurrency(it.quantity * it.unitPrice * (it.vat ? 1.2 : 1))}
                    </dd>
                  </div>
                </div>
              </div>
            ))}
            <div className="flex justify-between text-lg font-semibold">
              <span>Total Expense:</span>
              <span>£{formatCurrency((entry as any).totalCost)}</span>
            </div>
          </div>
        </Section>
      )}

      {/* Audit */}
      <div className="text-sm text-gray-500 border-t pt-4">
        <div className="flex justify-between">
          <span>Created by: {createdByName}</span>
          <span>At: {new Date(entry.createdAt).toLocaleString()}</span>
        </div>
      </div>
    </div>
  )
}

export default ShareDetails;