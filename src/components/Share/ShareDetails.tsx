// src/components/share/ShareDetails.tsx
import React, { useState, useEffect } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { ShareEntry } from '../../types/share'
import { format, parseISO } from 'date-fns'
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay'
import { Calendar, User, Tag, DollarSign, Truck, FileText, Phone, Mail, MapPin } from 'lucide-react'

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
      <div className="flex items-center mb-4 space-x-2 text-primary">
        <Icon className="w-5 h-5"/> 
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
      </div>
      {children}
    </div>
  )

  const Field = ({ label, value, color='', full=false }: any) => (
    <div className={`mb-4 ${full ? 'col-span-2' : ''}`}>
      <dt className="text-xs uppercase tracking-wider font-medium text-gray-500">{label}</dt>
      <dd className={`mt-1 text-sm font-medium ${color}`}>{value || '—'}</dd>
    </div>
  )

  const dateStr = !entry.date
    ? '—'
    : format(parseISO(entry.date), 'dd/MM/yyyy')

  return (
    <div className="space-y-2">
      
      {/* Client & Vehicle Info */}
      <Section icon={User} title="Client & Vehicle">
        <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1 bg-gray-50 p-3 rounded-lg">
                <h4 className="text-sm font-bold text-gray-900 mb-2">{entry.clientName}</h4>
                <div className="space-y-1 text-sm text-gray-600">
                    {entry.clientPhone && <div className="flex items-center"><Phone className="w-3 h-3 mr-2"/>{entry.clientPhone}</div>}
                    {entry.clientEmail && <div className="flex items-center"><Mail className="w-3 h-3 mr-2"/>{entry.clientEmail}</div>}
                    {entry.clientAddress && <div className="flex items-start"><MapPin className="w-3 h-3 mr-2 mt-1"/>{entry.clientAddress}</div>}
                </div>
            </div>
            
            <div className="col-span-2 sm:col-span-1 bg-gray-50 p-3 rounded-lg">
                 <h4 className="text-sm font-bold text-gray-900 mb-2">Related Vehicle</h4>
                 {entry.vehicleName ? (
                     <div className="flex items-center text-sm text-gray-600">
                         <Truck className="w-4 h-4 mr-2 text-gray-400"/>
                         {entry.vehicleName}
                     </div>
                 ) : (
                     <span className="text-sm text-gray-400 italic">No vehicle linked</span>
                 )}
            </div>
        </div>
      </Section>

      <Section icon={Tag} title="Claim Details">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Claim Reference" value={entry.claimRef}/>
            <Field label="Date" value={dateStr}/>
            <Field label="Status" value={entry.progress.replace('-',' ')} color={entry.progress === 'completed' ? 'text-green-600' : 'text-orange-600'}/>
            {entry.type === 'income' && (
                <Field label="Reasons" value={(entry as any).reasons?.join(', ')}/>
            )}
          </div>
      </Section>

      {entry.type==='income' ? (
        <>
          <Section icon={DollarSign} title="Financials">
            <div className="grid grid-cols-2 gap-4">
              <Field label="VD Profit" value={`£${formatCurrency((entry as any).vdProfit)}`}/>
              <Field label="Actual Paid" value={`£${formatCurrency((entry as any).actualPaid)}`}/>
              <Field label={`Legal Fee (${(entry as any).legalFeePct}%)`} value={`£${formatCurrency((entry as any).legalFeeCost)}`}/>
              { (entry as any).storageCost != 0 && (
                <Field label="Storage Cost" value={`£${formatCurrency((entry as any).storageCost)}`}/>
              )}
              { (entry as any).recoveryCost != 0 && (
                <Field label="Recovery Cost" value={`£${formatCurrency((entry as any).recoveryCost)}`}/>
              )}
              { (entry as any).piCost != 0 && (
                <Field label="PI Cost" value={`£${formatCurrency((entry as any).piCost)}`}/>
              )}
              <div className="col-span-2 border-t border-gray-200 mt-2 pt-2">
                 <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-gray-700">Total Income</span>
                    <span className="text-xl font-bold text-green-600">£{formatCurrency((entry as any).amount)}</span>
                 </div>
              </div>
            </div>
          </Section>
        </>
      ) : (
        <Section icon={Calendar} title="Expense Breakdown">
          <div className="space-y-3">
            { (entry as any).items.map((it:any,i:number)=>(
              <div key={i} className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                <div className="flex justify-between items-start mb-1">
                    <span className="font-semibold text-gray-800 text-sm">{it.type}</span>
                    <span className="font-bold text-gray-900 text-sm">£{formatCurrency(it.quantity * it.unitPrice * (it.vat ? 1.2 : 1))}</span>
                </div>
                <div className="text-sm text-gray-600 mb-1">{it.description}</div>
                <div className="text-xs text-gray-400 flex gap-3">
                    <span>Qty: {it.quantity}</span>
                    <span>Unit: £{formatCurrency(it.unitPrice)}</span>
                    <span>VAT: {it.vat ? 'Yes' : 'No'}</span>
                </div>
              </div>
            ))}
            <div className="flex justify-between items-center border-t pt-3 mt-2">
              <span className="text-lg font-bold text-gray-700">Total Expense</span>
              <span className="text-xl font-bold text-red-600">£{formatCurrency((entry as any).totalCost)}</span>
            </div>
          </div>
        </Section>
      )}

      {/* Notes Section */}
      {entry.notes && (
          <Section icon={FileText} title="Notes">
              <div className="bg-yellow-50 p-4 rounded-lg text-sm text-gray-800 whitespace-pre-wrap border border-yellow-100">
                  {entry.notes}
              </div>
          </Section>
      )}

      {/* Audit */}
      <div className="text-xs text-gray-400 border-t pt-4 mt-6">
        <div className="flex justify-between">
          <span>Created by: {createdByName}</span>
          <span>At: {new Date(entry.createdAt).toLocaleString()}</span>
        </div>
      </div>
    </div>
  )
}

export default ShareDetails;