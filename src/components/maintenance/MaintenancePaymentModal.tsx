// src/components/maintenance/MaintenancePaymentModal.tsx
import React, { useState, useMemo } from 'react';
import { doc, updateDoc, collection, query, where, getDocs, deleteDoc, addDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { MaintenanceLog, Vehicle } from '../../types';
import { Account } from '../../types/finance';
import { mapVehicleToDepartmentAccount, VehicleDepartmentAccountMapping } from '../../utils/vehicleDepartmentAccount';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import { createFinanceTransaction, reverseFinanceTransaction } from '../../utils/financeTransactions';
import FormField from '../ui/FormField';
import toast from 'react-hot-toast';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';
import { Pencil, Trash2, DollarSign, TrendingUp, TrendingDown, Percent, AlertCircle, Landmark, Receipt, Layers } from 'lucide-react';
import { calculateProfitMetrics } from '../../utils/profitCalculator';
import { fetchUnifiedProfitAndCosts, syncMaintenanceRecord, syncInvoiceRecord, sanitizeForFirestore, purgeOrphanedMaintenanceIncomeEntries } from '../../services/unifiedSync.service';
import { useMaintenanceCascadeDelete } from '../../hooks/useMaintenanceCascadeDelete';

const formatDateForInput = (t?: any) => {
  if (!t) return new Date().toISOString().slice(0, 10);
  const d = t?.toDate ? t.toDate() : new Date(t);
  if (isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 10);
};

const formatDateDisplay = (t?: any) => {
  if (!t) return 'N/A';
  const d = t?.toDate ? t.toDate() : new Date(t);
  return isNaN(d.getTime()) ? 'N/A' : d.toLocaleDateString();
};

interface MaintenancePayment {
  id: string;
  date: any;
  amount: number;
  method: string;
  reference?: string;
  notes?: string;
  createdAt: any;
  createdBy: string;
}

type ExtendedMaintenanceLog = MaintenanceLog & { payments?: MaintenancePayment[] };

interface MaintenancePaymentModalProps {
  log: ExtendedMaintenanceLog;
  vehicle?: Vehicle;
  accounts?: Account[];
  onClose: () => void;
}

const MaintenancePaymentModal: React.FC<MaintenancePaymentModalProps> = ({
  log,
  vehicle,
  accounts: propAccounts = [],
  onClose
}) => {
  const { user } = useAuth();
  const { canDeletePayments } = usePermissions();
  const hasDeletePermission = Boolean(canDeletePayments);
  const { formatCurrency } = useFormattedDisplay();
  const { deleteMaintenancePayment } = useMaintenanceCascadeDelete();
  const [loading, setLoading] = useState(false);

  const [accounts, setAccounts] = useState<Account[]>(propAccounts);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [selectedAccountName, setSelectedAccountName] = useState<string>('');

  React.useEffect(() => {
    if (accounts.length === 0) {
      (async () => {
        try {
          const snap = await getDocs(collection(db, 'accounts'));
          const fetched = snap.docs.map(d => ({ id: d.id, ...d.data() } as Account));
          setAccounts(fetched.sort((a, b) => a.name.localeCompare(b.name)));
        } catch (err) {
          console.warn('Error loading accounts in MaintenancePaymentModal:', err);
        }
      })();
    }
  }, []);

  const mappedDepartmentAccount: VehicleDepartmentAccountMapping = useMemo(() => {
    return mapVehicleToDepartmentAccount(vehicle, accounts);
  }, [vehicle, accounts]);

  React.useEffect(() => {
    if (mappedDepartmentAccount.accountId && !selectedAccountId) {
      setSelectedAccountId(mappedDepartmentAccount.accountId);
      setSelectedAccountName(mappedDepartmentAccount.accountName);
    }
  }, [mappedDepartmentAccount, selectedAccountId]);

  const effectiveAccountId = selectedAccountId || mappedDepartmentAccount.accountId || vehicle?.owner?.accountId || '';
  const effectiveAccountName = (accounts.find(a => a.id === effectiveAccountId)?.name) || selectedAccountName || mappedDepartmentAccount.accountName || vehicle?.owner?.name || 'General Fleet Account';

  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [localPayments, setLocalPayments] = useState<MaintenancePayment[] | null>(null);
  const [paymentToDeleteConfirm, setPaymentToDeleteConfirm] = useState<MaintenancePayment | null>(null);
  const [destination, setDestination] = useState<'both' | 'finance' | 'invoice'>('both');
  const [subcontractorCost, setSubcontractorCost] = useState<string>(
    log.subcontractorCost !== undefined && Number(log.subcontractorCost) > 0
      ? String(log.subcontractorCost)
      : '0'
  );

  React.useEffect(() => {
    if (log.subcontractorCost !== undefined && Number(log.subcontractorCost) > 0) {
      setSubcontractorCost(String(log.subcontractorCost));
    } else {
      fetchUnifiedProfitAndCosts({
        id: log.id,
        orderNumber: log.orderNumber || log.orderId,
        invoiceNumber: log.invoiceNumber,
      }).then((unified) => {
        if (unified && unified.subcontractorCost !== undefined && unified.subcontractorCost > 0) {
          setSubcontractorCost(String(unified.subcontractorCost));
        }
      });
    }
  }, [log.id, log.subcontractorCost, log.orderNumber, log.orderId, log.invoiceNumber]);
  
  React.useEffect(() => {
    purgeOrphanedMaintenanceIncomeEntries(log.orderNumber || log.orderId || 'A1');
  }, [log.orderNumber, log.orderId]);
  
  const [formData, setFormData] = useState({
    paymentDate: formatDateForInput(new Date()),
    amountToPay: '0',
    method: 'cash' as const,
    reference: '',
    notes: ''
  });

  const allPayments = useMemo(() => {
    if (localPayments !== null) {
      return localPayments;
    }
    if (log.payments && log.payments.length > 0) {
      return log.payments;
    }
    
    if ((log.paidAmount || 0) > 0) {
      return [{
        id: 'legacy_migration', 
        date: log.date,
        amount: log.paidAmount!,
        method: log.paymentMethod || 'cash',
        reference: log.paymentReference || 'Legacy Record',
        notes: 'Legacy payment (migrated)',
        createdAt: new Date(),
        createdBy: 'system'
      }] as MaintenancePayment[];
    }

    return [] as MaintenancePayment[];
  }, [log, localPayments]);

  const editingPayment = useMemo(
    () => allPayments.find(p => p.id === editingPaymentId) || null,
    [allPayments, editingPaymentId]
  );

  const totalCost = log.cost || 0;
  const billedAmount = log.customerBilled !== undefined ? Number(log.customerBilled) : totalCost;
  const subCostNum = Math.max(0, parseFloat(subcontractorCost) || 0);
  const profitMetrics = calculateProfitMetrics(billedAmount, subCostNum);
  
  const calculatedPaid = useMemo(() => {
    return allPayments.reduce((sum, p) => sum + p.amount, 0);
  }, [allPayments]);

  const remaining = Math.max(0, totalCost - calculatedPaid);

  React.useEffect(() => {
    if (!editingPaymentId && (formData.amountToPay === '0' || formData.amountToPay === '') && remaining > 0) {
      setFormData(prev => ({ ...prev, amountToPay: remaining.toString() }));
    }
  }, [remaining, editingPaymentId, formData.amountToPay]);

  const resetForm = () => {
    setEditingPaymentId(null);
    setFormData({
      paymentDate: formatDateForInput(new Date()),
      amountToPay: '0',
      method: 'cash',
      reference: '',
      notes: ''
    });
  };

  const prefillFromPayment = (p: MaintenancePayment) => {
    setFormData({
      paymentDate: formatDateForInput(p.date),
      amountToPay: p.amount.toString(),
      method: p.method as any,
      reference: p.reference || '',
      notes: p.notes || ''
    });
  };

  const handleDeleteClick = (payment: MaintenancePayment) => {
    if (!hasDeletePermission) {
      toast.error('You do not have permission to delete payments');
      return;
    }
    setPaymentToDeleteConfirm(payment);
  };

  const confirmDeletePayment = async (paymentToDelete: MaintenancePayment) => {
    if (!hasDeletePermission) {
      toast.error('You do not have permission to delete payments');
      setPaymentToDeleteConfirm(null);
      return;
    }

    setLoading(true);
    try {
      // 1. Verify and notify backend API with RBAC security validation
      try {
        const apiRes = await fetch(`/api/maintenance/${log.id}/payments/${paymentToDelete.id}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'x-user-permissions': JSON.stringify(user?.permissions || {}),
            'x-user-role': user?.role || '',
            'x-user-id': user?.id || '',
            'x-user-email': user?.email || '',
          },
          body: JSON.stringify({
            user: {
              id: user?.id,
              email: user?.email,
              role: user?.role,
              permissions: user?.permissions,
              can_delete_payments: (user as any)?.can_delete_payments,
              manage_maintenance_finance: (user as any)?.manage_maintenance_finance,
            },
          }),
        });

        if (apiRes.status === 403) {
          const resData = await apiRes.json().catch(() => ({}));
          toast.error(resData.message || 'You do not have permission to delete payments');
          setPaymentToDeleteConfirm(null);
          setLoading(false);
          return;
        }
      } catch (apiErr) {
        console.warn('API payment delete check warning:', apiErr);
      }

      // 2. Cascade delete payment across linked Finance and Invoice collections
      const result = await deleteMaintenancePayment(log.id, paymentToDelete.id);

      if (result?.success) {
        const updatedPayments = allPayments.filter(p => p.id !== paymentToDelete.id);
        setLocalPayments(updatedPayments);
        if (editingPaymentId === paymentToDelete.id) resetForm();
        setPaymentToDeleteConfirm(null);
      }
    } catch (err) {
      console.error('Error deleting payment:', err);
      toast.error('Failed to delete payment');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('User not authenticated.');
      return;
    }

    const paymentAmount = parseFloat(formData.amountToPay);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      toast.error('Please enter a valid amount.');
      return;
    }
    
    const originalAmt = editingPayment?.amount ?? 0;
    const effectiveMax = editingPaymentId ? remaining + originalAmt : (remaining > 0 ? remaining : (totalCost || billedAmount));
    if (effectiveMax > 0 && paymentAmount > effectiveMax + 0.05) {
      toast.error(`Amount cannot exceed ${formatCurrency(effectiveMax)}`);
      return;
    }

    setLoading(true);
    try {
      const parsedPaymentDate = new Date(formData.paymentDate);
      
      const isLegacyEdit = editingPaymentId === 'legacy_migration';
      const paymentId = (editingPaymentId && !isLegacyEdit) ? editingPaymentId : Date.now().toString();
      
      let updatedPayments = [...allPayments];
      
      const currentUserId = user?.id || (user as any)?.uid || 'system';
      const currentUserName = user?.displayName || (user as any)?.name || user?.email || currentUserId;

      // Store a detailed record in the Maintenance Payment History list (Amount, Date, Payment Method, Reference, Created By)
      const newPaymentObj: MaintenancePayment = {
        id: paymentId,
        date: parsedPaymentDate,
        amount: paymentAmount,
        method: formData.method,
        reference: formData.reference?.trim() || '',
        notes: formData.notes?.trim() || '',
        createdAt: editingPayment ? editingPayment.createdAt : new Date(),
        createdBy: editingPayment ? editingPayment.createdBy : currentUserName
      };

      if (editingPaymentId) {
        updatedPayments = updatedPayments.map(p => p.id === editingPaymentId ? newPaymentObj : p);
      } else {
        updatedPayments.push(newPaymentObj);
      }

      // Ensure all payment objects are clean and free of undefined fields
      const cleanedPayments = updatedPayments.map(p => ({
        id: p.id,
        date: p.date,
        amount: Number(p.amount) || 0,
        method: p.method || 'cash',
        reference: p.reference?.trim() || '',
        notes: p.notes?.trim() || '',
        createdAt: p.createdAt || new Date(),
        createdBy: p.createdBy || currentUserName
      }));

      // Automatically mark the Maintenance Job status as "PAID" (or "PARTIALLY PAID" if partial)
      const newPaid = cleanedPayments.reduce((sum, p) => sum + p.amount, 0);
      const newRemaining = Math.max(0, totalCost - newPaid);
      const newPaymentStatus: 'paid' | 'unpaid' | 'partially_paid' = newRemaining <= 0.001 ? 'paid' : newPaid > 0 ? 'partially_paid' : 'unpaid';

      const targetInvoiceNum = log.invoiceNumber && log.invoiceNumber.trim()
        ? log.invoiceNumber.trim()
        : (log.orderNumber ? `INV-${String(log.orderNumber).replace(/^#/, '')}` : `INV-MAINT-${log.id.slice(-6).toUpperCase()}`);

      // ── OPTIMISTIC UI UPDATE: Instantly update React local state, notify, and close modal ──
      setLocalPayments(cleanedPayments);

      const optimisticEventDetail = {
        logId: log.id,
        orderId: log.orderNumber || log.id,
        orderNumber: log.orderNumber || log.id,
        invoiceNumber: targetInvoiceNum,
        dealerCost: profitMetrics.subcontractorCost,
        subcontractorCost: profitMetrics.subcontractorCost,
        customerBilled: billedAmount,
        netProfit: profitMetrics.netProfit,
        profitMarginPercent: profitMetrics.profitMarginPercent,
        isProfitEdited: true,
        isEdited: true,
        paidAmount: newPaid,
        remainingAmount: newRemaining,
        paymentStatus: newPaymentStatus,
        payments: cleanedPayments,
        timestamp: new Date().toISOString(),
      };

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('maintenanceRecordUpdated', { detail: optimisticEventDetail }));
        window.dispatchEvent(new CustomEvent('maintenanceCostUpdated', { detail: optimisticEventDetail }));
        window.dispatchEvent(new CustomEvent('financeRecordUpdated', { detail: optimisticEventDetail }));
        window.dispatchEvent(new CustomEvent('finance_updated'));
        window.dispatchEvent(new CustomEvent('invoices_updated'));
        window.dispatchEvent(new CustomEvent('maintenance_updated'));
      }

      toast.success(
        destination === 'both'
          ? 'Payment recorded: Posted as Expense & Invoice generated'
          : destination === 'finance'
          ? (editingPaymentId ? 'Expense updated in Finance Ledger' : 'Payment recorded: Posted as Expense')
          : 'Payment recorded: Invoice generated in Invoicing module'
      );
      onClose();

      // ── BACKGROUND ASYNC FIRESTORE PERSISTENCE ──
      (async () => {
        let linkedInvoiceId: string | undefined = undefined;

        // ===================================================================
        // OPTION A ("both") & OPTION C ("invoice"): GENERATE OFFICIAL INVOICE
        // ===================================================================
        if (destination === 'both' || destination === 'invoice') {
          try {
            const invRefCol = collection(db, 'invoices');
            const qByRef = query(invRefCol, where('referenceId', '==', log.id));
            const snapByRef = await getDocs(qByRef);

            let existingInvDoc = snapByRef.docs[0];

            if (!existingInvDoc && targetInvoiceNum) {
              const qByNum = query(invRefCol, where('invoiceNumber', '==', targetInvoiceNum));
              const snapByNum = await getDocs(qByNum);
              if (!snapByNum.empty) {
                existingInvDoc = snapByNum.docs[0];
              }
            }

            const invoicePayload: Record<string, any> = {
              invoiceNumber: targetInvoiceNum,
              referenceId: log.id,
              maintenanceJobId: log.id,
              maintenanceOrderId: log.orderNumber || log.id,
              paymentId: paymentId,
              orderId: log.orderNumber || log.id,
              orderNumber: log.orderNumber || log.id,
              date: parsedPaymentDate,
              dueDate: log.invoiceDueDate 
                ? (log.invoiceDueDate instanceof Date ? log.invoiceDueDate : (log.invoiceDueDate as any).toDate ? (log.invoiceDueDate as any).toDate() : new Date(log.invoiceDueDate))
                : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              completedDate: log.completedDate 
                ? (log.completedDate instanceof Date ? log.completedDate : (log.completedDate as any).toDate ? (log.completedDate as any).toDate() : new Date(log.completedDate))
                : null,
              category: log.type || 'Maintenance',
              description: `Maintenance Job: ${log.type || 'Service'} | Order: ${log.orderNumber || log.id}${formData.notes ? ` - ${formData.notes}` : ''}`,
              notes: formData.notes || log.notes || null,
              vehicleId: log.vehicleId || vehicle?.id || null,
              vehicleName: vehicle 
                ? `${vehicle.make} ${vehicle.model} (${vehicle.registrationNumber})`
                : (log.vehicleDetails ? `${log.vehicleDetails.make} ${log.vehicleDetails.model} (${log.vehicleDetails.registrationNumber})` : null),
              customerId: log.customerId || null,
              customerName: log.serviceProvider || vehicle?.owner?.name || 'Fleet Service Provider',
              amount: billedAmount,
              netAmount: log.netAmount || parseFloat((billedAmount / 1.2).toFixed(2)),
              vatAmount: log.vatAmount || parseFloat((billedAmount - (log.netAmount || (billedAmount / 1.2))).toFixed(2)),
              total: billedAmount,
              subTotal: log.netAmount || parseFloat((billedAmount / 1.2).toFixed(2)),
              paidAmount: 0,
              remainingAmount: billedAmount,
              amountOwing: billedAmount,
              owing: billedAmount,
              paymentStatus: 'unpaid',
              status: 'unpaid',
              subcontractorCost: profitMetrics.subcontractorCost,
              dealerCost: profitMetrics.subcontractorCost,
              customerBilled: billedAmount,
              netProfit: profitMetrics.netProfit,
              profitMarginPercent: profitMetrics.profitMarginPercent,
              isProfitEdited: true,
              isEdited: true,
              payments: [],
              paymentMethod: null,
              paymentReference: null,
              accountId: effectiveAccountId || null,
              accountName: effectiveAccountName || null,
              accountFrom: effectiveAccountId || null,
              accountTo: effectiveAccountId || null,
              groupId: mappedDepartmentAccount.groupId || vehicle?.assignedGroupId || null,
              groupName: mappedDepartmentAccount.groupName || vehicle?.assignedGroupName || null,
              departmentId: mappedDepartmentAccount.departmentId || vehicle?.assignedDepartmentId || null,
              departmentName: mappedDepartmentAccount.departmentName || vehicle?.assignedDepartmentName || null,
              lineItems: [
                {
                  description: log.description || `Maintenance: ${log.type || 'Service'}`,
                  quantity: 1,
                  unitPrice: billedAmount,
                  net: log.netAmount || parseFloat((billedAmount / 1.2).toFixed(2)),
                  vat: log.vatAmount || parseFloat((billedAmount - (log.netAmount || (billedAmount / 1.2))).toFixed(2)),
                  total: billedAmount,
                  subcontractorCost: profitMetrics.subcontractorCost,
                  dealerCost: profitMetrics.subcontractorCost,
                  netProfit: profitMetrics.netProfit,
                  profitMarginPercent: profitMetrics.profitMarginPercent,
                  vehicleId: log.vehicleId || vehicle?.id || null,
                  vehicleName: vehicle ? `${vehicle.make} ${vehicle.model} (${vehicle.registrationNumber})` : null,
                }
              ],
              type: 'income',
              transactionType: 'INCOME',
              skipLedgerIncome: true,
              preventFinanceSync: true,
              entityType: 'MAINTENANCE',
              updatedAt: new Date(),
            };

            if (existingInvDoc) {
              linkedInvoiceId = existingInvDoc.id;
              await updateDoc(doc(db, 'invoices', existingInvDoc.id), sanitizeForFirestore(invoicePayload));
            } else {
              invoicePayload.createdAt = new Date();
              invoicePayload.createdBy = currentUserId;
              const newDoc = await addDoc(collection(db, 'invoices'), sanitizeForFirestore(invoicePayload));
              linkedInvoiceId = newDoc.id;
            }
          } catch (invErr) {
            console.warn('Error creating/updating invoice for maintenance payment:', invErr);
          }
        }

        await syncMaintenanceRecord(log.id, {
          payments: cleanedPayments,
          paidAmount: newPaid,
          remainingAmount: newRemaining,
          paymentStatus: newPaymentStatus,
          paymentMethod: formData.method,
          paymentReference: formData.reference?.trim() || null,
          notes: formData.notes?.trim() || log.notes || null,
          subcontractorCost: profitMetrics.subcontractorCost,
          dealerCost: profitMetrics.subcontractorCost,
          customerBilled: billedAmount,
          netProfit: profitMetrics.netProfit,
          profitMarginPercent: profitMetrics.profitMarginPercent,
          orderId: log.orderNumber || log.id,
          orderNumber: log.orderNumber || log.id,
          invoiceNumber: targetInvoiceNum,
          invoiceId: linkedInvoiceId,
          updatedAt: new Date(),
          updatedBy: currentUserId
        });

        await updateDoc(
          doc(db, 'maintenanceLogs', log.id),
          sanitizeForFirestore({
            payments: cleanedPayments,
            paidAmount: newPaid,
            remainingAmount: newRemaining,
            paymentStatus: newPaymentStatus,
            updatedAt: new Date(),
            updatedBy: currentUserId
          })
        );

        const vehicleOwner = vehicle?.owner
          ? {
              name: vehicle.owner.name,
              isDefault: vehicle.owner.isDefault ?? false,
            }
          : undefined;

        if (editingPaymentId) {
          await reverseFinanceTransaction({
            referenceId: log.id,
            paymentId: isLegacyEdit ? undefined : editingPaymentId
          });
        }

        if (destination === 'both' || destination === 'finance') {
          const totalLogCost = log.cost || 1; 
          const vatRatio = (log.vatAmount || 0) / totalLogCost;
          const netRatio = (log.netAmount || log.cost || 0) / totalLogCost;
      
          const paymentVatAmount = paymentAmount * vatRatio;
          const paymentNetAmount = paymentAmount * netRatio;

          const isPassThroughLog = profitMetrics.subcontractorCost > 0 && Math.abs(profitMetrics.subcontractorCost - billedAmount) < 0.01;
          const actualExpenseDebit = (!isPassThroughLog && profitMetrics.subcontractorCost > 0)
            ? profitMetrics.subcontractorCost
            : paymentAmount;

          await createFinanceTransaction({
            type: 'expense',
            transactionType: 'EXPENSE',
            entryType: 'DEBIT',
            category: log.type || 'Maintenance',
            amount: actualExpenseDebit,
            netAmount: parseFloat(paymentNetAmount.toFixed(2)),
            vatAmount: parseFloat(paymentVatAmount.toFixed(2)),
            description: `Maintenance Expense | Order: ${log.orderNumber || 'N/A'} | Inv: ${targetInvoiceNum}${formData.notes ? ` - ${formData.notes}` : ''}`,
            customerName: log.serviceProvider || vehicle?.owner?.name,
            referenceId: log.id,
            sourceReferenceId: log.id,
            maintenanceJobId: log.id,
            maintenanceOrderId: log.orderNumber || log.id,
            vehicleId: log.vehicleId,
            vehicleName: vehicle ? `${vehicle.make} ${vehicle.model} (${vehicle.registrationNumber})` : undefined,
            vehicleOwner,
            accountFrom: effectiveAccountId || undefined,
            accountTo: effectiveAccountId || undefined,
            accountName: effectiveAccountName || undefined,
            paymentMethod: formData.method,
            paymentReference: targetInvoiceNum || paymentId, 
            paymentId: paymentId,
            paymentStatus: 'expense',
            status: 'completed',
            date: parsedPaymentDate,
            dealerCost: profitMetrics.subcontractorCost,
            subcontractorCost: profitMetrics.subcontractorCost,
            customerBilled: billedAmount,
            netProfit: profitMetrics.netProfit,
            profitMarginPercent: profitMetrics.profitMarginPercent,
            isProfitEdited: true,
            isEdited: true,
            linkedInvoiceRef: log.id,
            invoiceId: linkedInvoiceId,
            entityType: 'MAINTENANCE',
            orderId: log.orderNumber || log.id,
            orderNumber: log.orderNumber || log.id,
            invoiceNumber: targetInvoiceNum,
            groupId: mappedDepartmentAccount.groupId || vehicle?.assignedGroupId || undefined,
            groupName: mappedDepartmentAccount.groupName || vehicle?.assignedGroupName || undefined,
            departmentId: mappedDepartmentAccount.departmentId || vehicle?.assignedDepartmentId || undefined,
            departmentName: mappedDepartmentAccount.departmentName || vehicle?.assignedDepartmentName || undefined
          });

          await purgeOrphanedMaintenanceIncomeEntries(log.orderNumber || log.id || 'A1');
        }
      })().catch((err) => {
        console.error('Background maintenance payment sync error:', err);
        toast.error('Failed to sync maintenance payment to server');
      });
      return;
    } catch (err) {
      console.error('Error recording maintenance payment:', err);
      toast.error('Failed to process payment destination');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      
      {/* Existing Payments List */}
      {allPayments.length > 0 && (
        <div className="space-y-2 mb-4 border-b border-gray-200 pb-4">
          <h3 className="text-sm font-medium text-gray-700">Payment History</h3>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {allPayments.map((p) => {
                const dateObj = p.date && (p.date as any).toDate ? (p.date as any).toDate() : new Date(p.date);
                
                return (
                  <div
                    key={p.id}
                    className={`flex items-start justify-between p-3 rounded-md border ${p.id === 'legacy_migration' ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-100'}`}
                  >
                    <div>
                      <div className="font-medium text-gray-900">{formatCurrency(p.amount)}</div>
                      <div className="text-xs text-gray-500 capitalize flex items-center gap-2">
                        <span>{p.method.replace('_', ' ')}</span>
                        <span className="text-gray-300">|</span>
                        <span>{dateObj.toLocaleDateString()}</span>
                      </div>
                      {p.reference && <div className="text-xs text-gray-400 mt-0.5">Ref: {p.reference}</div>}
                      {p.id === 'legacy_migration' && <span className="text-[10px] text-amber-600 font-bold uppercase tracking-wider">Old Record</span>}
                    </div>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingPaymentId(p.id);
                          prefillFromPayment(p);
                        }}
                        className="p-1 text-gray-500 hover:text-indigo-600 hover:bg-white rounded"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        disabled={!hasDeletePermission}
                        onClick={() => handleDeleteClick(p)}
                        className={`p-1 rounded transition-colors ${
                          !hasDeletePermission
                            ? 'text-gray-300 cursor-not-allowed opacity-40'
                            : 'text-gray-500 hover:text-red-600 hover:bg-white cursor-pointer'
                        }`}
                        title={!hasDeletePermission ? 'You do not have permission to delete payments' : 'Delete payment'}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
            })}
          </div>
          {editingPaymentId && (
            <div className="flex items-center justify-between text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
              <span>Editing {editingPaymentId === 'legacy_migration' ? 'Old Payment' : 'Payment'}...</span>
              <button type="button" onClick={resetForm} className="underline font-medium hover:text-amber-900">Cancel</button>
            </div>
          )}
        </div>
      )}

      {/* Summary */}
      <div className="bg-gray-50 p-4 rounded-lg space-y-2">
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600 mb-3 pb-3 border-b border-gray-200">
          <div><span className="font-semibold text-gray-700">Completed:</span> {formatDateDisplay(log.completedDate)}</div>
          <div><span className="font-semibold text-gray-700">Invoice:</span> {formatDateDisplay(log.invoiceDate)}</div>
          <div><span className="font-semibold text-gray-700">Due:</span> {formatDateDisplay(log.invoiceDueDate)}</div>
        </div>

        <div className="flex justify-between text-sm font-semibold text-[#2563EB]">
          <span>NET:</span>
          <span className="font-mono">{formatCurrency(log.netAmount || 0)}</span>
        </div>
        <div className="flex justify-between text-sm font-semibold text-[#2563EB]">
          <span>VAT:</span>
          <span className="font-mono">{formatCurrency(log.vatAmount || 0)}</span>
        </div>
        {log.totalDiscount! > 0 && (
          <div className="flex justify-between text-sm font-semibold text-[#D97706]">
            <span>Discount:</span>
            <span className="font-mono">–{formatCurrency(log.totalDiscount!)}</span>
          </div>
        )}
        <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200 text-[#D97706]">
          <span>Total:</span>
          <span className="font-mono">{formatCurrency(log.cost)}</span>
        </div>
        <div className="flex justify-between text-sm text-[#059669] font-bold">
          <span>Paid:</span>
          <span className="font-mono">{formatCurrency(calculatedPaid)}</span>
        </div>
        <div className={`flex justify-between text-sm font-bold ${remaining > 0.001 ? 'text-[#DC2626]' : 'text-[#059669]'}`}>
          <span>Owing:</span>
          <span className="font-mono">{formatCurrency(remaining)}</span>
        </div>
      </div>

      {/* Dealer / Subcontractor Cost & Live Profit Tracking Card */}
      <div className="bg-slate-50 p-4 rounded-xl border-2 border-indigo-200/90 space-y-3 text-slate-900 shadow-sm">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-100 text-indigo-700 rounded-lg">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Dealer / Subcontractor Cost & Profit Tracking
              </h4>
              <p className="text-[11px] text-slate-500">
                Adjust dealer cost at payment recording to update live profit metrics
              </p>
            </div>
          </div>
          <span className="text-xs font-mono font-semibold px-2 py-0.5 bg-white border border-slate-200 text-slate-700 rounded-md">
            Job Total: {formatCurrency(billedAmount)}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Dealer / Subcontractor Cost (£)
            </label>
            <div className="relative rounded-lg shadow-2xs">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 text-sm font-bold">
                £
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={subcontractorCost}
                onChange={(e) => setSubcontractorCost(e.target.value)}
                placeholder="0.00"
                className="w-full pl-8 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-semibold font-mono text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          {/* Live Profit Preview Badges */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div
              className={`p-2.5 rounded-lg border flex flex-col justify-between ${
                profitMetrics.netProfit >= 0
                  ? 'bg-emerald-50/80 border-emerald-200'
                  : 'bg-rose-50/80 border-rose-200'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 uppercase">
                <span>Live Net Profit</span>
                {profitMetrics.netProfit >= 0 ? (
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <TrendingDown className="w-3.5 h-3.5 text-rose-600" />
                )}
              </div>
              <p
                className={`text-base font-black font-mono mt-0.5 ${
                  profitMetrics.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'
                }`}
              >
                {profitMetrics.netProfit >= 0 ? '+' : ''}
                {formatCurrency(profitMetrics.netProfit)}
              </p>
              <span className="text-[10px] text-slate-500">Billed – Dealer Cost</span>
            </div>

            <div
              className={`p-2.5 rounded-lg border flex flex-col justify-between ${
                profitMetrics.profitMarginPercent >= 0
                  ? 'bg-indigo-50/80 border-indigo-200'
                  : 'bg-rose-50/80 border-rose-200'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 uppercase">
                <span>Profit Margin</span>
                <Percent className="w-3.5 h-3.5 text-indigo-600" />
              </div>
              <p
                className={`text-base font-black font-mono mt-0.5 ${
                  profitMetrics.profitMarginPercent >= 0 ? 'text-indigo-700' : 'text-rose-700'
                }`}
              >
                {profitMetrics.profitMarginPercent.toFixed(1)}%
              </p>
              <span className="text-[10px] text-slate-500">Margin on billed</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3-Destination Posting Selector (Where Payment Goes) */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-2.5">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
            Posting Destination
          </label>
          <span className="text-[11px] text-slate-500 font-medium">
            Select multi-destination routing
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {/* OPTION A: BOTH */}
          <label
            className={`relative flex flex-col p-3 rounded-xl border-2 cursor-pointer transition-all ${
              destination === 'both'
                ? 'bg-purple-50/80 border-purple-600 shadow-xs ring-1 ring-purple-500/20'
                : 'bg-slate-50/60 border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <input
                  type="radio"
                  name="postDestination"
                  value="both"
                  checked={destination === 'both'}
                  onChange={() => setDestination('both')}
                  className="text-purple-600 focus:ring-purple-500 cursor-pointer"
                />
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                  Both
                </span>
              </div>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 border border-purple-200">
                Dual Post
              </span>
            </div>
            <p className="text-[11px] text-slate-600 leading-tight">
              Post Expense to <strong>Finance Ledger</strong> + Generate Outstanding <strong>Invoice</strong>
            </p>
          </label>

          {/* OPTION B: FINANCE PAGE ONLY */}
          <label
            className={`relative flex flex-col p-3 rounded-xl border-2 cursor-pointer transition-all ${
              destination === 'finance'
                ? 'bg-blue-50/80 border-blue-600 shadow-xs ring-1 ring-blue-500/20'
                : 'bg-slate-50/60 border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <input
                  type="radio"
                  name="postDestination"
                  value="finance"
                  checked={destination === 'finance'}
                  onChange={() => setDestination('finance')}
                  className="text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1">
                  <Landmark className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  Finance Only
                </span>
              </div>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200">
                Expense
              </span>
            </div>
            <p className="text-[11px] text-slate-600 leading-tight">
              Post strictly as Expense on <strong>Finance Ledger</strong>. No invoice created.
            </p>
          </label>

          {/* OPTION C: INVOICE PAGE ONLY */}
          <label
            className={`relative flex flex-col p-3 rounded-xl border-2 cursor-pointer transition-all ${
              destination === 'invoice'
                ? 'bg-indigo-50/80 border-indigo-600 shadow-xs ring-1 ring-indigo-500/20'
                : 'bg-slate-50/60 border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <input
                  type="radio"
                  name="postDestination"
                  value="invoice"
                  checked={destination === 'invoice'}
                  onChange={() => setDestination('invoice')}
                  className="text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1">
                  <Receipt className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  Invoice Only
                </span>
              </div>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 border border-indigo-200">
                Unpaid Inv
              </span>
            </div>
            <p className="text-[11px] text-slate-600 leading-tight">
              Generate official <strong>Invoice</strong> (Status: Outstanding). No direct ledger expense.
            </p>
          </label>
        </div>

        {/* Informative Context Notice */}
        {destination === 'both' && (
          <div className="p-3 bg-purple-50/90 border border-purple-200 rounded-xl flex items-start gap-2.5 text-xs text-purple-900 animate-in fade-in duration-150">
            <AlertCircle className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-bold text-purple-950">
                Option A: Both (Finance Expense + Outstanding Invoice)
              </p>
              <p className="text-purple-800 text-[11px] leading-relaxed">
                Posts an Expense transaction to the central Finance Ledger for the recorded amount, AND generates an official Invoice in the Invoicing module with status <span className="font-bold">OUTSTANDING / UNPAID</span> for <span className="font-mono font-bold">{formatCurrency(billedAmount)}</span> as Owing until manually settled.
              </p>
            </div>
          </div>
        )}

        {destination === 'finance' && (
          <div className="p-3 bg-blue-50/90 border border-blue-200 rounded-xl flex items-start gap-2.5 text-xs text-blue-900 animate-in fade-in duration-150">
            <AlertCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-bold text-blue-950">
                Option B: Finance Page Only
              </p>
              <p className="text-blue-800 text-[11px] leading-relaxed">
                Posts the payment strictly as an Expense on the central Finance Ledger assigned to account <span className="font-bold">{effectiveAccountName}</span>. No invoice will be created in the Invoicing module.
              </p>
            </div>
          </div>
        )}

        {destination === 'invoice' && (
          <div className="p-3 bg-indigo-50/90 border border-indigo-200 rounded-xl flex items-start gap-2.5 text-xs text-indigo-900 animate-in fade-in duration-150">
            <AlertCircle className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-bold text-indigo-950">
                Option C: Invoice Page Only
              </p>
              <p className="text-indigo-800 text-[11px] leading-relaxed">
                Generates an official Invoice in the Invoicing module with status <span className="font-bold">OUTSTANDING / UNPAID</span> for the full billed total of <span className="font-bold font-mono">{formatCurrency(billedAmount)}</span> as Owing. No direct expense is posted to the Finance Ledger.
              </p>
            </div>
          </div>
        )}

        {/* Automatic Account & Category Inheritance Display & Selection */}
        <div className="space-y-2 bg-slate-50 border border-slate-200 rounded-xl p-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5 truncate">
              <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">Department Account:</span>
              <span className="font-mono text-slate-900 bg-white px-2 py-0.5 rounded-lg border border-slate-300 font-semibold shadow-2xs">
                {effectiveAccountName}
              </span>
              {mappedDepartmentAccount.departmentName && (
                <span className="text-[10px] font-bold text-teal-800 bg-teal-100/90 px-1.5 py-0.5 rounded border border-teal-200">
                  Dept: {mappedDepartmentAccount.departmentName}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">Category:</span>
              <span className="font-medium text-slate-900 bg-white px-1.5 py-0.5 rounded border border-slate-200 capitalize">
                {log.type || 'Maintenance'}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              Account Allocation (Auto-Populated from Vehicle Department)
            </label>
            <select
              value={effectiveAccountId}
              onChange={(e) => {
                const aId = e.target.value;
                setSelectedAccountId(aId);
                const acc = accounts.find(a => a.id === aId);
                setSelectedAccountName(acc ? acc.name : '');
              }}
              className="w-full px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs cursor-pointer"
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} {a.id === mappedDepartmentAccount.accountId ? '★ (Auto-Mapped Dept Account)' : ''}
                </option>
              ))}
              {accounts.length > 0 && !accounts.some(a => a.id === effectiveAccountId) && effectiveAccountId && (
                <option value={effectiveAccountId}>{effectiveAccountName} (Vehicle Assigned Account)</option>
              )}
              {accounts.length === 0 && (
                <option value={effectiveAccountId || 'default'}>{effectiveAccountName}</option>
              )}
            </select>
            <p className="text-[10px] text-slate-500 mt-1">
              Pre-populated via vehicle department mapping. Populates the transaction account on the Finance Ledger and the owing account on generated Invoices.
            </p>
          </div>
        </div>
      </div>

      {/* Payment / Invoice Inputs */}
      <div className="grid grid-cols-2 gap-4">
        <FormField
          type="date"
          label={
            destination === 'invoice'
              ? 'Invoice Date'
              : destination === 'both'
              ? 'Payment & Invoice Date'
              : 'Payment Date'
          }
          value={formData.paymentDate}
          onChange={(e) => setFormData(prev => ({ ...prev, paymentDate: e.target.value }))}
          required
        />
        <FormField
          type="number"
          label={
            destination === 'invoice'
              ? 'Invoice Owing Amount (£)'
              : editingPaymentId
              ? 'New Payment Amount (£)'
              : 'Payment Amount (£)'
          }
          value={formData.amountToPay}
          onChange={(e) => setFormData(prev => ({ ...prev, amountToPay: e.target.value }))}
          required
          min="0.01"
          step="0.01"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Payment Method</label>
        <select
          value={formData.method}
          onChange={(e) => setFormData(prev => ({ ...prev, method: e.target.value as any }))}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
          required
        >
          <option value="cash">Cash</option>
          <option value="card">Card</option>
          <option value="bank_transfer">Bank Transfer</option>
          <option value="cheque">Cheque</option>
        </select>
      </div>

      <FormField
        label={
          destination === 'invoice'
            ? 'Invoice Reference / PO # (Optional)'
            : destination === 'both'
            ? 'Payment & Invoice Reference (Optional)'
            : 'Reference (Optional)'
        }
        value={formData.reference}
        onChange={(e) => setFormData(prev => ({ ...prev, reference: e.target.value }))}
        placeholder={
          destination === 'invoice'
            ? 'Custom PO / Invoice reference'
            : 'Transaction ID, check number, or receipt ref'
        }
      />

      <div>
        <label className="block text-sm font-medium text-gray-700">Notes (Optional)</label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          rows={3}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
          placeholder={destination === 'invoice' ? 'Add invoice notes or terms' : 'Add payment notes'}
        />
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center pt-2">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 cursor-pointer"
        >
          Close
        </button>
        <button
          type="submit"
          disabled={loading}
          className={`px-4 py-2 text-sm font-bold text-white rounded-md disabled:opacity-50 transition-colors cursor-pointer ${
            destination === 'both'
              ? 'bg-purple-600 hover:bg-purple-700'
              : destination === 'invoice'
              ? 'bg-indigo-600 hover:bg-indigo-700'
              : 'bg-primary hover:bg-primary-600'
          }`}
        >
          {loading
            ? 'Processing...'
            : destination === 'both'
            ? (editingPaymentId ? 'Update Both (Finance & Invoice)' : 'Post Expense & Generate Invoice')
            : destination === 'finance'
            ? (editingPaymentId ? 'Update Expense in Finance' : 'Post Expense to Finance Ledger')
            : 'Generate Official Invoice (Unpaid)'}
        </button>
      </div>

      {/* Confirmation Dialog for Deleting Payment */}
      {paymentToDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-red-100 text-red-600 rounded-xl">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Delete Payment Confirmation</h3>
                <p className="text-xs text-slate-500">This action will adjust the job's financial balance.</p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-sm text-slate-700 space-y-2">
              <p className="font-semibold text-slate-900">
                Are you sure you want to delete this payment of <span className="font-mono font-bold text-red-600">{formatCurrency(paymentToDeleteConfirm.amount)}</span>?
              </p>
              <div className="text-xs text-slate-500 space-y-1 pt-1 border-t border-slate-200">
                <div className="flex justify-between">
                  <span>Method:</span>
                  <span className="font-medium text-slate-700 capitalize">{paymentToDeleteConfirm.method.replace('_', ' ')}</span>
                </div>
                {paymentToDeleteConfirm.reference && (
                  <div className="flex justify-between">
                    <span>Reference:</span>
                    <span className="font-mono text-slate-700">{paymentToDeleteConfirm.reference}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Date:</span>
                  <span className="text-slate-700">{formatDateDisplay(paymentToDeleteConfirm.date)}</span>
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-500">
              Upon confirmation, this payment will be removed, the job's Paid amount and Outstanding Balance will be recalculated (reverting to Unpaid if empty), and linked entries across both Finance and Invoice pages will be cascade deleted.
            </p>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={loading}
                onClick={() => setPaymentToDeleteConfirm(null)}
                className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => confirmDeletePayment(paymentToDeleteConfirm)}
                className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 active:bg-red-800 rounded-xl transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {loading ? 'Deleting...' : 'Delete Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
};

export default MaintenancePaymentModal;