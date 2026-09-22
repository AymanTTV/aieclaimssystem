import React from 'react';
import { RentalPayment } from '../../types';
import { Download, CreditCard, Banknote, Building, Receipt } from 'lucide-react';
import { formatDate } from '../../utils/dateHelpers';

interface RentalPaymentHistoryProps {
  payments: RentalPayment[];
  onDownloadDocument?: (url: string) => void;
}

const RentalPaymentHistory: React.FC<RentalPaymentHistoryProps> = ({
  payments,
  onDownloadDocument
}) => {
  const getMethodIcon = (method: string) => {
    const m = (method || '').toLowerCase();
    if (m.includes('card')) return <CreditCard className="w-4 h-4 text-blue-400" />;
    if (m.includes('cash')) return <Banknote className="w-4 h-4 text-emerald-400" />;
    if (m.includes('transfer') || m.includes('bank')) return <Building className="w-4 h-4 text-purple-400" />;
    return <Receipt className="w-4 h-4 text-amber-400" />;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Receipt className="w-5 h-5 text-emerald-400" />
          Recorded Payments ({payments.length})
        </h3>
        {payments.length > 0 && (
          <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
            Total Paid: £{payments.reduce((acc, p) => acc + (p.amount || 0), 0).toFixed(2)}
          </span>
        )}
      </div>

      <div className="space-y-2.5">
        {payments.map((payment) => (
          <div key={payment.id} className="bg-[#121524] border border-[#2B314E] hover:border-slate-600 transition-colors p-4 rounded-xl shadow-xs">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-lg font-mono font-black text-emerald-400">
                    £{payment.amount.toFixed(2)}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-800 text-slate-200 border border-slate-700">
                    {getMethodIcon(payment.method)}
                    {payment.method.replace('_', ' ')}
                  </span>
                </div>
                
                {payment.allocatedVehicleName && (
                  <div className="text-xs text-blue-400 font-medium">
                    Allocated Vehicle: <span className="text-white font-bold">{payment.allocatedVehicleName}</span>
                  </div>
                )}

                {payment.reference && (
                  <div className="text-xs text-slate-300">
                    Ref: <span className="font-mono text-slate-100">{payment.reference}</span>
                  </div>
                )}

                {payment.notes && (
                  <div className="text-xs text-slate-400 italic bg-[#0F111A] p-2 rounded-lg border border-[#2B314E]/60 mt-1">
                    "{payment.notes}"
                  </div>
                )}
              </div>

              <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0">
                <div className="text-xs text-slate-400 font-mono">
                  {formatDate(payment.date, true)}
                </div>
                {payment.document && onDownloadDocument && (
                  <button
                    type="button"
                    onClick={() => onDownloadDocument(payment.document!)}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-xs font-bold rounded-lg border border-blue-500/30 transition-colors cursor-pointer"
                    title="Download receipt or payment document"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Receipt
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {payments.length === 0 && (
          <div className="text-center py-8 bg-[#121524] border border-[#2B314E] rounded-xl text-slate-400">
            <Receipt className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-50" />
            <p className="text-sm font-medium">No payments recorded for this rental yet.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RentalPaymentHistory;