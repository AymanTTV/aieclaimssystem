// src/hooks/useMaintenanceCascadeDelete.ts

import { useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  cascadeDeleteMaintenanceRecord,
  cascadeDeleteMaintenancePayment,
  CascadeDeleteResult,
  CascadePaymentDeleteResult,
} from '../services/maintenanceDeletion.service';
import toast from 'react-hot-toast';

export interface UseMaintenanceCascadeDeleteReturn {
  deleteMaintenanceRecord: (logId: string) => Promise<CascadeDeleteResult | null>;
  deleteMaintenancePayment: (logId: string, paymentId: string) => Promise<CascadePaymentDeleteResult | null>;
  loading: boolean;
  error: string | null;
}

/**
 * Custom React hook for executing cascade deletes in the maintenance module.
 * Queries all linked Finance and Invoice collections by paymentId or referenceId
 * to ensure total data reconciliation across the application upon deletion.
 */
export const useMaintenanceCascadeDelete = (): UseMaintenanceCascadeDeleteReturn => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteMaintenanceRecord = useCallback(
    async (logId: string): Promise<CascadeDeleteResult | null> => {
      if (!logId) {
        toast.error('Invalid maintenance record ID');
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        const result = await cascadeDeleteMaintenanceRecord(logId, {
          user: user ? { id: user.id, name: user.name, email: user.email } : null,
        });

        toast.success(
          result.deletedFinanceTxIds.length > 0 || result.deletedInvoiceIds.length > 0
            ? `Record and all linked Finance (${result.deletedFinanceTxIds.length}) & Invoice (${result.deletedInvoiceIds.length}) records removed.`
            : 'Maintenance record deleted successfully.'
        );

        return result;
      } catch (err: any) {
        const errMsg = err?.message || 'Failed to cascade delete maintenance record';
        console.error('[useMaintenanceCascadeDelete] Record deletion error:', err);
        setError(errMsg);
        toast.error(errMsg);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  const deleteMaintenancePayment = useCallback(
    async (logId: string, paymentId: string): Promise<CascadePaymentDeleteResult | null> => {
      if (!logId || !paymentId) {
        toast.error('Invalid log ID or payment ID');
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        const result = await cascadeDeleteMaintenancePayment({
          logId,
          paymentId,
          user: user ? { id: user.id, name: user.name, email: user.email } : null,
        });

        toast.success(
          result.deletedFinanceTxIds.length > 0 || result.deletedInvoiceIds.length > 0
            ? `Payment removed everywhere. Finance ledger & invoices reconciled.`
            : 'Payment removed and job balance recalculated.'
        );

        return result;
      } catch (err: any) {
        const errMsg = err?.message || 'Failed to cascade delete payment';
        console.error('[useMaintenanceCascadeDelete] Payment deletion error:', err);
        setError(errMsg);
        toast.error(errMsg);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  return {
    deleteMaintenanceRecord,
    deleteMaintenancePayment,
    loading,
    error,
  };
};

export default useMaintenanceCascadeDelete;
