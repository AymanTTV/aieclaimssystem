import { createFinanceTransaction } from './financeTransactions';
import { Invoice, Vehicle } from '../types';

export const createInvoiceTransaction = async (
  invoice: Invoice,
  vehicle?: Vehicle,
  isReversal: boolean = false
) => {
  const amount = isReversal ? -invoice.amount : invoice.amount;
  const vehicleName = vehicle ? `${vehicle.make} ${vehicle.model}` : undefined;
  const isPaid = invoice.paymentStatus === 'paid';

  return createFinanceTransaction({
    type: isPaid ? 'income' : 'expense',
    category: invoice.category,
    amount,
    description: isReversal 
      ? `Reversal of ${isPaid ? 'paid' : 'unpaid'} invoice #${invoice.id.slice(-8).toUpperCase()}`
      : `${isPaid ? 'Payment received for' : 'Unpaid'} invoice #${invoice.id.slice(-8).toUpperCase()}`,
    referenceId: invoice.id,
    vehicleId: invoice.vehicleId,
    vehicleName,
    paymentStatus: invoice.paymentStatus
  });
};