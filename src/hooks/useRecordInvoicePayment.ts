// src/hooks/useRecordInvoicePayment.ts
import { useState, useCallback } from 'react';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  updateDoc,
  where,
  addDoc,
  deleteDoc,
  setDoc,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Invoice, Vehicle, Account, Customer } from '../types';
import { useAuth } from '../context/AuthContext';
import { calculateProfitMetrics } from '../utils/profitCalculator';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';

export interface RecordPaymentParams {
  invoice: Invoice | any;
  paymentAmount: number;
  paymentMethod: string;
  paymentId?: string;
  paymentDate?: Date | string;
  paymentReference?: string;
  notes?: string;
  documentUrl?: string | null;
  allocatedVehicleId?: string;
  accountToId?: string;
  accountTo2Id?: string;
  vehicles?: Vehicle[];
  accounts?: Account[];
  customers?: Customer[];
  groups?: any[];
}

export interface RecordPaymentResult {
  success: boolean;
  paymentId?: string;
  transactionDocId?: string;
  action?: 'created' | 'updated';
  newPaidAmount?: number;
  newRemaining?: number;
  paymentStatus?: string;
  error?: string;
}

export function useRecordInvoicePayment() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recordInvoicePayment = useCallback(
    async (params: RecordPaymentParams): Promise<RecordPaymentResult> => {
      const {
        invoice,
        paymentAmount,
        paymentMethod,
        paymentDate,
        paymentReference,
        notes,
        documentUrl,
        allocatedVehicleId,
        accountToId,
        accountTo2Id,
        vehicles = [],
        accounts = [],
        customers = [],
        groups = [],
      } = params;

      if (!invoice || !invoice.id) {
        toast.error('Invalid invoice provided');
        return { success: false, error: 'Invalid invoice' };
      }

      if (!paymentAmount || paymentAmount <= 0) {
        toast.error('Please enter a valid positive payment amount');
        return { success: false, error: 'Invalid payment amount' };
      }

      setLoading(true);
      setError(null);

      try {
        const selectedPaymentDate = paymentDate ? new Date(paymentDate) : new Date();
        const newPaymentId =
          params.paymentId || `inv_pay_${Date.now()}_${uuidv4().substring(0, 6)}`;

        const resolvedInvoiceNumber =
          invoice.invoiceNumber ||
          invoice.invNum ||
          invoice.number ||
          invoice.paymentReference ||
          '';

        const actualReference =
          paymentReference?.trim() ||
          (resolvedInvoiceNumber ? `INV #${resolvedInvoiceNumber}` : 'Payment');

        // Resolve vehicle
        const targetVehicle = allocatedVehicleId
          ? vehicles.find((v) => v.id === allocatedVehicleId)
          : invoice.vehicleId
          ? vehicles.find((v) => v.id === invoice.vehicleId)
          : undefined;

        const allocatedVehicleName = targetVehicle
          ? `${targetVehicle.make} ${targetVehicle.model} (${targetVehicle.registrationNumber})`
          : invoice.vehicleName || undefined;

        let mappedVehicleOwner = undefined;
        if (targetVehicle) {
          if (targetVehicle.owner) {
            mappedVehicleOwner = {
              name: targetVehicle.owner.name,
              isDefault: targetVehicle.owner.isDefault ?? false,
            };
          } else {
            mappedVehicleOwner = { name: 'AIE Skyline Limited', isDefault: true };
          }
        }

        // Resolve Accounts
        let finalAccountId = accountToId;
        if (!finalAccountId) {
          const defaultAcc = accounts.find((a) =>
            a.name.toUpperCase().includes('AIE SKYLINE ACCOUNT')
          );
          if (defaultAcc) finalAccountId = defaultAcc.id;
        }

        const mergedAccountsTo: string[] = [];
        if (finalAccountId) mergedAccountsTo.push(finalAccountId);
        if (accountTo2Id) mergedAccountsTo.push(accountTo2Id);

        // 1. Prepare New Payment Chip Object
        const newPaymentChip = {
          id: newPaymentId,
          date: selectedPaymentDate,
          amount: paymentAmount,
          method: paymentMethod,
          reference: actualReference,
          document: documentUrl || null,
          notes: notes || null,
          createdAt: new Date(),
          createdBy: user?.id || 'system',
          allocatedVehicleId: targetVehicle?.id || null,
          allocatedVehicleName: allocatedVehicleName || null,
        };

        const existingPayments = Array.isArray(invoice.payments) ? invoice.payments : [];
        const existingChipIdx = existingPayments.findIndex((p: any) => p.id === newPaymentId);
        let updatedPayments: any[];
        if (existingChipIdx >= 0) {
          updatedPayments = [...existingPayments];
          updatedPayments[existingChipIdx] = newPaymentChip;
        } else {
          updatedPayments = [...existingPayments, newPaymentChip];
        }
        const newPaidAmount = Number(
          updatedPayments.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0).toFixed(2)
        );
        const billedTotal = Math.max(
          0,
          Number(invoice.customerBilled ?? invoice.total ?? invoice.amount ?? 0)
        );
        const newRemaining = Math.max(0, Number((billedTotal - newPaidAmount).toFixed(2)));

        // Status calculation rule:
        // if (owing <= 0) return 'paid';
        // if (paid > 0) return 'partially_paid';
        // return 'unpaid';
        let newStatus = 'unpaid';
        if (newRemaining <= 0.001 || (billedTotal > 0 && newPaidAmount >= billedTotal - 0.001)) {
          newStatus = 'paid';
        } else if (newPaidAmount > 0.001) {
          newStatus = 'partially_paid';
        } else {
          newStatus = 'unpaid';
        }

        // 2. Calculate Profit Metrics
        const subCost = Number(invoice.subcontractorCost ?? invoice.dealerCost ?? 0);
        const profitMetrics = calculateProfitMetrics(paymentAmount, (subCost / (billedTotal || 1)) * paymentAmount);

        // 3. Update Invoice Document in Firestore
        const invRef = doc(db, 'invoices', invoice.id);
        await updateDoc(invRef, {
          paidAmount: newPaidAmount,
          remainingAmount: newRemaining,
          paymentStatus: newStatus,
          payments: updatedPayments,
          updatedAt: new Date(),
        });

        // 4. UPSERT & DEDUPLICATION ENFORCEMENT ON FINANCE LEDGER (`transactions`)
        // Query Finance Ledger for an existing entry matching paymentId OR (invoiceId + paymentReference)
        const txCol = collection(db, 'transactions');
        let existingTxDocId: string | null = null;

        // Query by paymentId
        const qPayId = query(txCol, where('paymentId', '==', newPaymentId));
        const snapPayId = await getDocs(qPayId);
        if (!snapPayId.empty) {
          existingTxDocId = snapPayId.docs[0].id;
        } else {
          // Query by invoiceId + paymentReference
          const qInvPay = query(
            txCol,
            where('invoiceId', '==', invoice.id),
            where('paymentReference', '==', actualReference)
          );
          const snapInvPay = await getDocs(qInvPay);
          const match = snapInvPay.docs.find((d) => {
            const data = d.data();
            const dType = String(data.type || '').toLowerCase();
            return dType === 'income';
          });
          if (match) {
            existingTxDocId = match.id;
          } else {
            const qRefPay = query(
              txCol,
              where('linkedInvoiceRef', '==', invoice.id),
              where('paymentReference', '==', actualReference)
            );
            const snapRefPay = await getDocs(qRefPay);
            const matchRef = snapRefPay.docs.find((d) => {
              const data = d.data();
              return String(data.type || '').toLowerCase() === 'income';
            });
            if (matchRef) existingTxDocId = matchRef.id;
          }
        }

        const rawGroupId = targetVehicle?.assignedGroupId || invoice.groupId;
        const resolvedGroupName =
          groups.find((g: any) => g.id === rawGroupId || g.name === rawGroupId)?.name ||
          invoice.groupName;

        const targetDeptId = invoice.departmentId || targetVehicle?.assignedDepartmentId;
        const targetDeptName = invoice.departmentName || targetVehicle?.assignedDepartmentName;

        const actualCategory =
          invoice.category === 'Other' && invoice.customCategory
            ? invoice.customCategory
            : invoice.category || 'Invoice Payment';

        const rawTargetOrder = invoice.orderNumber || invoice.orderId || invoice.maintenanceOrderId;
        const targetRefId =
          (rawTargetOrder ? (rawTargetOrder.startsWith('#') ? rawTargetOrder : `#${rawTargetOrder}`) : null) ||
          (resolvedInvoiceNumber ? (resolvedInvoiceNumber.startsWith('#') ? resolvedInvoiceNumber : `#${resolvedInvoiceNumber}`) : null) ||
          invoice.id;

        const description = [
          targetRefId ? `Order ${targetRefId}` : (resolvedInvoiceNumber ? `Invoice #${resolvedInvoiceNumber}` : `Invoice ${invoice.id.slice(0, 6)}`),
          `Payment (${paymentMethod.toUpperCase()})`,
          notes ? `Note: ${notes}` : null,
          actualReference ? `Ref: ${actualReference}` : null,
        ]
          .filter(Boolean)
          .join(' - ');

        const financePayload: Record<string, any> = {
          type: 'income',
          transactionType: 'INCOME',
          entryType: 'CREDIT',
          category: actualCategory,
          amount: paymentAmount,
          grossBilling: paymentAmount,
          paid: paymentAmount,
          paidAmount: paymentAmount,
          remainingAmount: 0,
          owing: 0,
          customerBilled: paymentAmount,
          subcontractorCost: profitMetrics.subcontractorCost,
          dealerCost: profitMetrics.subcontractorCost,
          netProfit: profitMetrics.netProfit,
          profitMarginPercent: profitMetrics.profitMarginPercent,
          isProfitEdited: true,
          isEdited: true,
          description,
          paymentMethod,
          paymentReference: actualReference,
          paymentId: newPaymentId,
          paymentStatus: 'paid',
          status: 'completed',
          date: selectedPaymentDate,
          updatedAt: new Date(),
          updatedBy: user?.name || user?.email || 'system',
          invoiceId: invoice.id,
          referenceId: targetRefId,
          sourceReferenceId: invoice.id,
          linkedInvoiceRef: invoice.id,
          entityId: invoice.id,
          entityType: 'INVOICE',
          isInvoicePayment: true,
          orderId: rawTargetOrder || null,
          orderNumber: rawTargetOrder || null,
          invoiceNumber: resolvedInvoiceNumber,
          customerId: invoice.customerId || null,
          customerName: invoice.customerName || null,
          vehicleId: targetVehicle?.id || invoice.vehicleId || null,
          vehicleName: allocatedVehicleName || invoice.vehicleName || null,
          vehicleOwner: mappedVehicleOwner || null,
          accountsTo: mergedAccountsTo,
          accountsFrom: [],
          groupId: rawGroupId || null,
          groupName: resolvedGroupName || null,
          departmentId: targetDeptId || null,
          departmentName: targetDeptName || null,
        };

        let action: 'created' | 'updated' = 'created';
        let txId = '';

        if (existingTxDocId) {
          // UPDATE in-place
          console.log(`[FinanceLedger UPSERT] Updating existing Income transaction ${existingTxDocId}`);
          await updateDoc(doc(db, 'transactions', existingTxDocId), financePayload);
          try {
            await setDoc(doc(db, 'finance_ledger', existingTxDocId), { id: existingTxDocId, ...financePayload }, { merge: true });
          } catch {}
          txId = existingTxDocId;
          action = 'updated';
        } else {
          // INSERT new Income transaction row
          console.log(`[FinanceLedger UPSERT] Inserting new Income transaction for payment ${newPaymentId}`);
          const newDocRef = await addDoc(txCol, {
            ...financePayload,
            createdAt: new Date(),
            createdBy: user?.name || user?.email || 'system',
          });
          txId = newDocRef.id;
          try {
            await setDoc(doc(db, 'finance_ledger', txId), { id: txId, ...financePayload, createdAt: new Date() }, { merge: true });
          } catch {}
          action = 'created';
        }

        // 5. UPDATE LINKED EXPENSE STATUS (REALIZE PROFIT)
        // When invoice is paid, query Finance Ledger for any existing 'EXPENSE' transactions with same referenceId (Order #A1)
        const candidateRefs = [
          targetRefId,
          rawTargetOrder,
          rawTargetOrder ? rawTargetOrder.replace(/^#/, '') : null,
          rawTargetOrder ? `#${rawTargetOrder.replace(/^#/, '')}` : null,
          invoice.orderNumber,
          invoice.orderId,
          invoice.id,
          invoice.invoiceNumber,
        ].filter(Boolean) as string[];

        const normTarget = rawTargetOrder ? rawTargetOrder.toLowerCase().replace(/[^a-z0-9]/g, '') : '';

        try {
          const allTxSnap = await getDocs(query(txCol));
          for (const d of allTxSnap.docs) {
            const data = d.data();
            const dType = String(data.type || '').toLowerCase();
            const dTxType = String(data.transactionType || '').toUpperCase();
            const isExpense = dType === 'expense' || dTxType === 'EXPENSE';
            if (!isExpense) continue;

            const dOrderId = String(data.orderId || data.orderNumber || data.maintenanceOrderId || '').trim();
            const dNormOrder = dOrderId.toLowerCase().replace(/[^a-z0-9]/g, '');
            const dRefId = String(data.referenceId || data.sourceReferenceId || data.linkedInvoiceRef || data.invoiceId || '').trim();
            const dDesc = String(data.description || '').toLowerCase();

            const isMatchedExpense =
              candidateRefs.includes(dRefId) ||
              candidateRefs.includes(dOrderId) ||
              candidateRefs.includes(data.orderNumber) ||
              (normTarget && dNormOrder && dNormOrder === normTarget) ||
              (normTarget && dDesc.includes(normTarget));

            if (isMatchedExpense) {
              console.log(`[FinanceLedger] Updating linked Expense entry ${d.id} to PAID to realize profit`);
              const expGross = Number(data.grossBilling ?? data.customerBilled ?? data.amount ?? paymentAmount);
              const expDealer = Number(data.dealerCost ?? data.subcontractorCost ?? 0);
              const expNetProfit = Number((expGross - expDealer).toFixed(2));
              const expMargin = expGross > 0 ? Number(((expNetProfit / expGross) * 100).toFixed(1)) : 0;

              const expenseUpdate = {
                paymentStatus: 'paid',
                status: 'PAID',
                paid: expGross,
                paidAmount: expGross,
                owing: 0,
                remainingAmount: 0,
                netProfit: expNetProfit,
                profitMarginPercent: expMargin,
                isProfitEdited: true,
                isEdited: true,
                updatedAt: new Date(),
              };

              await updateDoc(doc(db, 'transactions', d.id), expenseUpdate);
              try {
                await updateDoc(doc(db, 'finance_ledger', d.id), expenseUpdate);
              } catch {}

              // Dispatch event so Finance page and cache immediately realize profit
              if (typeof window !== 'undefined') {
                window.dispatchEvent(
                  new CustomEvent('financeRecordUpdated', {
                    detail: {
                      id: d.id,
                      entityId: d.id,
                      ...expenseUpdate,
                    },
                  })
                );
              }
            }
          }
        } catch (expErr) {
          console.warn('Error updating linked expense status:', expErr);
        }

        // 5. Update Account Balance in Firestore
        for (const accId of mergedAccountsTo) {
          try {
            const accRef = doc(db, 'accounts', accId);
            const accSnap = await getDoc(accRef);
            if (accSnap.exists()) {
              const currentBal = Number(accSnap.data().balance || 0);
              await updateDoc(accRef, {
                balance: Number((currentBal + paymentAmount).toFixed(2)),
                updatedAt: new Date(),
              });
            }
          } catch (accErr) {
            console.warn('Error updating account balance:', accErr);
          }
        }

        // 6. Sync with Backend REST API (server-side persistence)
        try {
          await fetch(`/api/invoices/${invoice.id}/payments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              paymentId: newPaymentId,
              invoiceId: invoice.id,
              invoiceNumber: resolvedInvoiceNumber,
              referenceId: targetRefId,
              orderId: rawTargetOrder || null,
              orderNumber: rawTargetOrder || null,
              amount: paymentAmount,
              paymentMethod,
              paymentReference: actualReference,
              date: selectedPaymentDate.toISOString(),
              notes,
              customerId: invoice.customerId,
              customerName: invoice.customerName,
              vehicleId: targetVehicle?.id || invoice.vehicleId,
              vehicleName: allocatedVehicleName,
              accountId: finalAccountId,
              currentUser: { id: user?.id, name: user?.name, email: user?.email },
            }),
          });
        } catch (serverErr) {
          // Non-blocking background sync
          console.warn('Backend payment sync response:', serverErr);
        }

        // 7. Dispatch Window Events for Instant Re-rendering on Finance Page
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('invoiceRecordUpdated', {
              detail: {
                id: invoice.id,
                invoiceId: invoice.id,
                paidAmount: newPaidAmount,
                remainingAmount: newRemaining,
                paymentStatus: newStatus,
                payments: updatedPayments,
                entityId: invoice.id,
                entityType: 'INVOICE',
              },
            })
          );
          window.dispatchEvent(
            new CustomEvent('financeRecordUpdated', {
              detail: {
                id: txId,
                transactionId: txId,
                entityId: invoice.id,
                invoiceId: invoice.id,
                paymentId: newPaymentId,
                referenceId: targetRefId,
                orderId: rawTargetOrder || null,
                orderNumber: rawTargetOrder || null,
                isInvoicePayment: true,
                amount: paymentAmount,
                grossBilling: paymentAmount,
                paid: paymentAmount,
                paidAmount: paymentAmount,
                remainingAmount: 0,
                owing: 0,
                type: 'income',
                transactionType: 'INCOME',
                entryType: 'CREDIT',
                category: actualCategory,
                description,
                paymentMethod,
                paymentReference: actualReference,
                paymentStatus: 'paid',
                status: 'completed',
                date: selectedPaymentDate,
                customerId: invoice.customerId || null,
                customerName: invoice.customerName || null,
                vehicleId: targetVehicle?.id || invoice.vehicleId || null,
                vehicleName: allocatedVehicleName || invoice.vehicleName || null,
                accountsTo: mergedAccountsTo,
                dealerCost: profitMetrics.subcontractorCost,
                subcontractorCost: profitMetrics.subcontractorCost,
                netProfit: profitMetrics.netProfit,
                profitMarginPercent: profitMetrics.profitMarginPercent,
                isProfitEdited: true,
                isEdited: true,
                action,
              },
            })
          );
          window.dispatchEvent(
            new CustomEvent('invoice_payment_recorded', {
              detail: {
                invoiceId: invoice.id,
                paymentId: newPaymentId,
                amount: paymentAmount,
                method: paymentMethod,
                transactionId: txId,
              },
            })
          );
        }

        toast.success(`Payment of £${paymentAmount.toFixed(2)} recorded & synced to Finance Ledger!`);

        return {
          success: true,
          paymentId: newPaymentId,
          transactionDocId: txId,
          action,
          newPaidAmount,
          newRemaining,
          paymentStatus: newStatus,
        };
      } catch (err: any) {
        console.error('Error recording invoice payment:', err);
        const errMsg = err?.message || 'Failed to record invoice payment';
        setError(errMsg);
        toast.error(errMsg);
        return { success: false, error: errMsg };
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  const deleteInvoicePayment = useCallback(
    async (invoice: Invoice, paymentId: string): Promise<boolean> => {
      if (!invoice || !paymentId) return false;
      setLoading(true);
      try {
        const existingPayments = Array.isArray(invoice.payments) ? invoice.payments : [];
        const paymentToDelete = existingPayments.find((p: any) => p.id === paymentId);
        const amountToDeduct = Number(paymentToDelete?.amount || 0);

        const updatedPayments = existingPayments.filter((p: any) => p.id !== paymentId);
        const newPaidAmount = Number(
          updatedPayments.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0).toFixed(2)
        );
        const invoiceTotal = Number(invoice.total || invoice.amount || 0);
        const newRemaining = Math.max(0, Number((invoiceTotal - newPaidAmount).toFixed(2)));

        let newStatus = 'unpaid';
        if (newPaidAmount >= invoiceTotal - 0.01 && invoiceTotal > 0) newStatus = 'paid';
        else if (newPaidAmount > 0) newStatus = 'partially_paid';

        // 1. Update invoice in Firestore
        await updateDoc(doc(db, 'invoices', invoice.id), {
          payments: updatedPayments,
          paidAmount: newPaidAmount,
          remainingAmount: newRemaining,
          paymentStatus: newStatus,
          updatedAt: new Date(),
        });

        // 2. Remove matching Income transaction from Finance Ledger
        const txCol = collection(db, 'transactions');
        const qPay = query(txCol, where('paymentId', '==', paymentId));
        const snapPay = await getDocs(qPay);
        for (const docSnap of snapPay.docs) {
          await deleteDoc(doc(db, 'transactions', docSnap.id));
        }

        // 3. Delete from backend ledger
        try {
          await fetch(`/api/invoices/${invoice.id}/payments/${paymentId}`, {
            method: 'DELETE',
          });
        } catch {}

        // 4. Dispatch re-render event
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('invoiceRecordUpdated', {
              detail: {
                id: invoice.id,
                paidAmount: newPaidAmount,
                remainingAmount: newRemaining,
                paymentStatus: newStatus,
                payments: updatedPayments,
              },
            })
          );
          window.dispatchEvent(
            new CustomEvent('financeRecordUpdated', {
              detail: {
                entityId: invoice.id,
                deletedPaymentId: paymentId,
              },
            })
          );
        }

        toast.success('Payment removed and cleared from Finance Ledger');
        return true;
      } catch (err: any) {
        console.error('Error deleting payment:', err);
        toast.error('Failed to delete payment');
        return false;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    recordInvoicePayment,
    deleteInvoicePayment,
    loading,
    error,
  };
}
