// src/utils/paymentStatusHelper.ts

export type DerivedPaymentStatus = 'paid' | 'partially_paid' | 'unpaid';

/**
 * Dynamically derives payment status from billed total, paid, and owing amounts.
 * Strict rules:
 * - If owing <= 0.001 -> 'paid' (Prevents "Unpaid" badge display when Owing is £0.00)
 * - If paid > 0.001   -> 'partially_paid'
 * - Else              -> 'unpaid'
 */
export function derivePaymentStatus(params?: {
  owing?: number | null;
  remainingAmount?: number | null;
  amountOwing?: number | null;
  paid?: number | null;
  paidAmount?: number | null;
  total?: number | null;
  cost?: number | null;
  amount?: number | null;
  customerBilled?: number | null;
  paymentStatus?: string | null;
  payments?: Array<{ amount: number }>;
} | null): DerivedPaymentStatus {
  if (!params) return 'unpaid';

  const total = Math.max(
    0,
    Number(
      params.customerBilled ??
      params.total ??
      params.amount ??
      params.cost ??
      0
    )
  );

  const hasPaymentsArray = Array.isArray(params.payments);
  const paymentsSum = hasPaymentsArray
    ? params.payments!.reduce((s, p) => s + (Number(p.amount) || 0), 0)
    : 0;

  // When payments history is present and empty ("No payments"), paid is strictly 0
  const paid = hasPaymentsArray
    ? paymentsSum
    : Math.max(
        0,
        Number(params.paidAmount ?? params.paid ?? 0)
      );

  // If paid >= billed total (e.g. Paid = Billed and Owing = £0.00), owing MUST be 0
  let owing: number;
  if (total > 0 && paid >= total - 0.001) {
    owing = 0;
  } else if (hasPaymentsArray) {
    owing = Math.max(0, Number((total - paid).toFixed(2)));
  } else if (params.owing !== undefined && params.owing !== null) {
    owing = Number(params.owing);
  } else if (params.remainingAmount !== undefined && params.remainingAmount !== null) {
    owing = Number(params.remainingAmount);
  } else if (params.amountOwing !== undefined && params.amountOwing !== null) {
    owing = Number(params.amountOwing);
  } else {
    owing = Math.max(0, Number((total - paid).toFixed(2)));
  }

  // Ensure if paid >= total, owing cannot be positive
  if (total > 0 && paid >= total - 0.001) {
    owing = 0;
  }

  // Exact requirement rule:
  // if (owing <= 0) return 'paid';
  // if (paid > 0) return 'partially_paid';
  // return 'unpaid';
  if (owing <= 0.001) {
    return 'paid';
  }
  if (paid > 0.001) {
    return 'partially_paid';
  }
  return 'unpaid';
}
