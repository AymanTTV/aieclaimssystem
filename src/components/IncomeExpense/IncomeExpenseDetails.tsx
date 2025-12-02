import React from 'react';
import { IncomeExpenseEntry } from '../../types/incomeExpense';
import { format } from 'date-fns';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';
import { Phone, Mail, MapPin } from 'lucide-react';

interface Props {
  entry: IncomeExpenseEntry;
}

const IncomeExpenseDetails: React.FC<Props> = ({ entry }) => {
  const { formatCurrency } = useFormattedDisplay();

  return (
    <div className="space-y-6">
      {/* Basic Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         {/* Left: Customer */}
         <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="text-sm font-bold text-gray-900 mb-2">Customer / Payee</h4>
            <div className="text-lg font-medium text-gray-800 mb-1">{entry.customer}</div>
            <div className="space-y-1 text-sm text-gray-600">
                {entry.customerPhone && <div className="flex items-center"><Phone className="w-3 h-3 mr-2"/>{entry.customerPhone}</div>}
                {entry.customerEmail && <div className="flex items-center"><Mail className="w-3 h-3 mr-2"/>{entry.customerEmail}</div>}
                {entry.customerAddress && <div className="flex items-start"><MapPin className="w-3 h-3 mr-2 mt-1"/>{entry.customerAddress}</div>}
            </div>
         </div>

         {/* Right: Transaction Details */}
         <div className="bg-white p-2">
             <div className="grid grid-cols-2 gap-4">
                <div>
                    <dt className="text-xs font-medium text-gray-500 uppercase">Reference</dt>
                    <dd className="text-sm font-medium text-gray-900">{entry.reference}</dd>
                </div>
                <div>
                    <dt className="text-xs font-medium text-gray-500 uppercase">Date</dt>
                    <dd className="text-sm font-medium text-gray-900">{format(new Date(entry.date), 'dd/MM/yyyy')}</dd>
                </div>
                <div>
                    <dt className="text-xs font-medium text-gray-500 uppercase">Type</dt>
                    <dd className={`text-sm font-bold uppercase ${entry.type==='income'?'text-green-600':'text-red-600'}`}>{entry.type}</dd>
                </div>
                <div>
                    <dt className="text-xs font-medium text-gray-500 uppercase">Category</dt>
                    <dd className="text-sm font-medium text-gray-900">{entry.category || '—'}</dd>
                </div>
             </div>
         </div>
      </div>

      <hr className="border-gray-200"/>

      {entry.type === 'income' ? (
        <div>
           <h3 className="text-sm font-bold text-gray-900 mb-3">Income Details</h3>
           <div className="bg-white border rounded-lg p-4">
               <div className="mb-4">
                   <span className="text-gray-500 text-sm">Description:</span>
                   <span className="ml-2 text-gray-900 text-sm font-medium">{entry.description}</span>
               </div>
               
               <div className="grid grid-cols-3 gap-4 border-t pt-4">
                    <div>
                    <dt className="text-xs text-gray-500">Net</dt>
                    <dd className="text-sm font-medium">{formatCurrency(entry.net)}</dd>
                    </div>
                    <div>
                    <dt className="text-xs text-gray-500">VAT</dt>
                    <dd className="text-sm font-medium">{entry.vat ? '20%' : '0%'}</dd>
                    </div>
                    <div>
                    <dt className="text-xs text-gray-500">Total</dt>
                    <dd className="text-lg text-green-700 font-bold">{formatCurrency(entry.total)}</dd>
                    </div>
               </div>
           </div>
        </div>
      ) : (
        <div>
          <h3 className="text-sm font-bold text-gray-900 mb-3">Expense Items</h3>
          <div className="space-y-2">
            {(entry as any).items.map((item: any, i: number) => (
              <div key={i} className="p-3 bg-gray-50 rounded border border-gray-100">
                <div className="flex justify-between mb-1">
                    <span className="font-semibold text-sm">{item.type}</span>
                    <span className="font-bold text-sm">£{(item.quantity * item.unitPrice * (item.vat?1.2:1)).toFixed(2)}</span>
                </div>
                <div className="text-sm text-gray-600 mb-1">{item.description}</div>
                <div className="text-xs text-gray-400 flex gap-3">
                   <span>Qty: {item.quantity}</span>
                   <span>Unit: £{item.unitPrice.toFixed(2)}</span>
                   <span>VAT: {item.vat ? 'Yes' : 'No'}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between items-center mt-4 border-t pt-3">
             <span className="text-gray-600 font-medium">Total Expense</span>
             <span className="text-xl font-bold text-red-600">{formatCurrency((entry as any).totalCost)}</span>
          </div>
        </div>
      )}
      
      {entry.note && (
        <div className="bg-yellow-50 p-3 rounded-md border border-yellow-100 text-sm text-yellow-800">
           <strong>Note:</strong> {entry.note}
        </div>
      )}
      
      <div className="grid grid-cols-2 gap-4 text-sm text-gray-500 pt-4 border-t">
         <div>Payment Status: <span className="font-medium text-gray-900">{entry.status}</span></div>
         <div>Progress: <span className="font-medium text-gray-900">{entry.progress}</span></div>
      </div>
    </div>
  );
};

export default IncomeExpenseDetails;