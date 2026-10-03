// src/components/finance/TransactionForm.tsx

import React, { useState, useEffect, useMemo } from 'react';
import {
  collection,
  updateDoc,
  doc,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Vehicle, Customer, Account, Transaction } from '../../types';
import { useAuth, checkUserPermission } from '../../context/AuthContext';
import FormField from '../ui/FormField';
import SearchableSelect from '../ui/SearchableSelect';
import toast from 'react-hot-toast';
import financeCategoryService from '../../services/financeCategory.service';
import financeGroupService from '../../services/financeGroup.service';
import {
  Info,
  RefreshCw,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Percent,
  PieChart,
  Building2,
  User,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';
import { addDays, addWeeks, addMonths, addYears } from 'date-fns';
import { calculateProfitMetrics } from '../../utils/profitCalculator';
import { syncTransactionRecord } from '../../services/unifiedSync.service';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';
import {
  calculateVehicleProfitAndShare,
  executeProfitPayoutSettlement,
  VehicleProfitCalculation,
} from '../../services/sharedOwnershipPayout.service';

interface TransactionFormProps {
  type: 'income' | 'expense';
  initialIsRecurring?: boolean;
  transaction?: Transaction;
  accounts: Account[];
  vehicles: Vehicle[];
  customers: Customer[];
  departments?: { id: string; name: string }[];
  transactions?: Transaction[];
  onClose: () => void;
}

type PeriodPreset = 'this_month' | 'last_month' | 'this_quarter' | 'year_to_date' | 'all_time' | 'custom';

const TransactionForm: React.FC<TransactionFormProps> = ({
  type: initialType,
  initialIsRecurring = false,
  transaction,
  accounts = [],
  vehicles = [],
  customers = [],
  departments = [],
  transactions = [],
  onClose,
}) => {
  const { user } = useAuth();
  const { formatCurrency } = useFormattedDisplay();
  const [loading, setLoading] = useState(false);
  const [manualEntry, setManualEntry] = useState(false);
  const [manualVehicleEntry, setManualVehicleEntry] = useState(false); 
  
  const [currentType, setCurrentType] = useState<'income' | 'expense'>(initialType);
  const [isRecurring, setIsRecurring] = useState(initialIsRecurring || !!transaction?.isRecurring);
  const [frequency, setFrequency] = useState<string>(transaction?.recurringFrequency || 'monthly');

  // Permission Check for Profit Payout Settlement
  const canProcessProfitPayout = Boolean(
    typeof user?.hasPermission === 'function'
      ? user.hasPermission('can_process_profit_payout')
      : checkUserPermission(user, 'can_process_profit_payout')
  );

  // Payment Type Selector (Regular vs Profit Share Settlement)
  const [paymentType, setPaymentType] = useState<'regular' | 'profit_share'>('regular');

  useEffect(() => {
    if (transaction) {
      setCurrentType(transaction.type);
    } else {
      setCurrentType(initialType);
    }
  }, [transaction, initialType]);

  const handleTypeChange = (newType: 'income' | 'expense') => {
    if (newType === currentType) return;
    setCurrentType(newType);

    setFormData((prev) => {
      const updated = { ...prev };
      if (newType === 'income') {
        if (!updated.accountTo && updated.accountFrom) {
          updated.accountTo = updated.accountFrom;
        } else if (!updated.accountTo && accounts.length > 0) {
          updated.accountTo = defaultCompanyAccount?.id || accounts[0]?.id || '';
        }
      } else {
        if (!updated.accountFrom && updated.accountTo) {
          updated.accountFrom = updated.accountTo;
        } else if (!updated.accountFrom && accounts.length > 0) {
          updated.accountFrom = defaultCompanyAccount?.id || accounts[0]?.id || '';
        }
      }
      return updated;
    });
  };

  const isEditing = useMemo(() => !!transaction?.id, [transaction]);
  const isEditingMultiAccount = useMemo(() =>
      isEditing && ((transaction?.accountsFrom && transaction.accountsFrom.length > 1) || (transaction?.accountsTo && transaction.accountsTo.length > 1)),
      [isEditing, transaction]
  );
  const isInvoiceLinked = useMemo(() => isEditing && !!transaction?.referenceId, [isEditing, transaction?.referenceId]);

  const restrictAccountFields = useMemo(() =>
      user?.role !== 'manager' && (isEditingMultiAccount || isInvoiceLinked),
      [isEditingMultiAccount, isInvoiceLinked, user?.role]
  );
  const restrictFinancialFields = restrictAccountFields;

  const [financeCategories, setFinanceCategories] = useState<string[]>([]);
  const [catsLoading, setCatsLoading] = useState(false);
  
  useEffect(() => {
     let isMounted = true;
     setCatsLoading(true);
     financeCategoryService.getAll()
       .then((docs) => { if (isMounted) setFinanceCategories(docs.map((c) => c.name).sort()); })
       .catch((err) => { console.error('Error loading finance categories:', err); toast.error('Could not load finance categories'); })
       .finally(() => { if (isMounted) setCatsLoading(false); });
     return () => { isMounted = false; };
  }, []);

  const prioritizedCategories = useMemo(() => {
    const incomeCategoryKeywords = ['rent', 'hire', 'income', 'sale', 'lease', 'claim', 'received', 'client', 'revenue', 'deposit', 'customer'];
    const expenseCategoryKeywords = ['maint', 'repair', 'service', 'mot', 'tyre', 'brake', 'fuel', 'tax', 'wash', 'accident', 'part', 'cost', 'expense', 'provided', 'subcontractor', 'fee', 'charge', 'utility', 'toll', 'fine'];

    const list = financeCategories.length > 0
      ? [...financeCategories]
      : currentType === 'income'
      ? ['Rental Payment', 'Vehicle Hire', 'Vehicle Leasing', 'Service & MOT', 'Insurance Claim', 'Loan Received', 'Other Income']
      : ['Maintenance', 'Repair', 'Subcontractor Cost', 'Service & MOT', 'Fuel', 'Tyres & Brakes', 'Insurance', 'Licensing & Road Tax', 'Other Expense'];

    return list.sort((a, b) => {
      const aLower = a.toLowerCase();
      const bLower = b.toLowerCase();
      const keywords = currentType === 'income' ? incomeCategoryKeywords : expenseCategoryKeywords;
      const aMatch = keywords.some(k => aLower.includes(k));
      const bMatch = keywords.some(k => bLower.includes(k));
      if (aMatch && !bMatch) return -1;
      if (!aMatch && bMatch) return 1;
      return a.localeCompare(b);
    });
  }, [financeCategories, currentType]);

  const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  
  useEffect(() => {
     let alive = true;
     setGroupsLoading(true);
     financeGroupService.getAll()
       .then((docs) => { if (alive) setGroups(docs.map(g => ({ id: g.id, name: g.name })).sort((a,b)=> a.name.localeCompare(b.name))); })
       .catch((err) => { console.error('Error loading groups:', err); toast.error('Could not load groups'); })
       .finally(() => { if (alive) setGroupsLoading(false); });
     return () => { alive = false; };
  }, []);

  const getFirstAccount = (accArray?: string[]): string => (accArray && accArray.length > 0) ? accArray[0] : '';
  const getSecondAccount = (accArray?: string[]): string => (accArray && accArray.length > 1) ? accArray[1] : '';
  
  const getThirdAccount = (txn: Transaction | undefined, type: 'income' | 'expense'): string => {
    if (!txn) return '';
    if (type === 'income') return getFirstAccount(txn.accountsFrom); 
    if (type === 'expense') return getFirstAccount(txn.accountsTo);   
    return '';
  };

  const toDateTimeLocal = (date: Date) => {
    const pad = (num: number) => num.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  const [formData, setFormData] = useState({
    date: transaction?.date 
      ? toDateTimeLocal(transaction.date instanceof Timestamp ? transaction.date.toDate() : new Date(transaction.date))
      : toDateTimeLocal(new Date()),
    amount: transaction?.amount ? Math.abs(transaction.amount).toString() : '',
    category: transaction?.category || '',
    description: transaction?.description || '',
    paymentMethod: transaction?.paymentMethod || 'cash',
    paymentReference: transaction?.paymentReference || '',
    paymentStatus: transaction?.paymentStatus || 'pending',
    status: transaction?.status || 'completed',
    customerId: transaction?.customerId || '',
    customerName: transaction?.customerName || '',
    vehicleId: transaction?.vehicleId || '',
    vehicleName: transaction?.vehicleName || '',
    manualVehicleMake: '',
    manualVehicleModel: '',
    manualVehicleReg: '',
    groupId: transaction?.groupId || '',
    departmentId: transaction?.departmentId || '',
    subcontractorCost: transaction?.subcontractorCost !== undefined ? String(transaction.subcontractorCost) : '0',
    accountTo: getFirstAccount(transaction?.accountsTo),
    accountFrom: getFirstAccount(transaction?.accountsFrom),
    accountTo2: getSecondAccount(transaction?.accountsTo),
    accountFrom2: getSecondAccount(transaction?.accountsFrom),
    accountThird: getThirdAccount(transaction, transaction?.type || initialType), 
  });

  useEffect(() => {
    if (transaction) {
      setManualEntry(!!transaction.customerName && !transaction.customerId);
      const isManualVeh = !!transaction.vehicleName && !transaction.vehicleId;
      setManualVehicleEntry(isManualVeh);
      
      let make = '', model = '', reg = '';
      if (isManualVeh && transaction.vehicleName) {
         const match = transaction.vehicleName.match(/(.+?)\s+\((.+?)\)$/);
         if (match) {
             const makeModel = match[1];
             reg = match[2];
             const parts = makeModel.split(' ');
             make = parts[0] || '';
             model = parts.slice(1).join(' ') || '';
         } else {
             make = transaction.vehicleName; 
         }
      }

      setFormData({
         date: toDateTimeLocal(transaction.date instanceof Timestamp ? transaction.date.toDate() : new Date(transaction.date)),
         amount: Math.abs(transaction.amount).toString(),
         category: transaction.category || '',
         description: transaction.description || '',
         paymentMethod: transaction.paymentMethod || 'cash',
         paymentReference: transaction.paymentReference || '',
         paymentStatus: transaction.paymentStatus || 'pending',
         status: transaction.status || 'completed',
         customerId: transaction.customerId || '',
         customerName: transaction.customerName || '',
         vehicleId: transaction.vehicleId || '',
         vehicleName: transaction.vehicleName || '',
         manualVehicleMake: make,
         manualVehicleModel: model,
         manualVehicleReg: reg,
         groupId: transaction.groupId || '',
         departmentId: transaction.departmentId || '',
         accountTo: getFirstAccount(transaction.accountsTo),
         accountFrom: getFirstAccount(transaction.accountsFrom),
         accountTo2: getSecondAccount(transaction.accountsTo),
         accountFrom2: getSecondAccount(transaction.accountsFrom),
         accountThird: getThirdAccount(transaction, transaction.type),
         subcontractorCost: transaction.subcontractorCost !== undefined ? String(transaction.subcontractorCost) : '0',
      });
      setIsRecurring(!!transaction.isRecurring);
      setFrequency(transaction.recurringFrequency || 'monthly');
    } else {
        setFormData(prev => ({ 
          ...prev, date: toDateTimeLocal(new Date()), amount: '', category: '', description: '', paymentMethod: 'cash', 
          paymentReference: '', paymentStatus: 'pending', status: 'completed', customerId: '', customerName: '', 
          vehicleId: '', vehicleName: '', manualVehicleMake: '', manualVehicleModel: '', manualVehicleReg: '', 
          groupId: '', departmentId: '', subcontractorCost: '0', accountTo: '', accountFrom: '', accountTo2: '', accountFrom2: '', accountThird: '' 
        }));
        setManualEntry(false);
        setManualVehicleEntry(false);
    }
  }, [transaction]);

  // =========================================================================
  // PROFIT SHARE PAYOUT SETTLEMENT STATE & LOGIC
  // =========================================================================
  const coOwnedVehicles = useMemo(() => {
    return vehicles.filter(
      (v) =>
        v.isSharedOwnership ||
        (v.sharedOwnership && v.sharedOwnership.length > 0) ||
        (v.owner?.sharedOwnership && v.owner.sharedOwnership.length > 0)
    );
  }, [vehicles]);

  const [payoutVehicleId, setPayoutVehicleId] = useState<string>(
    coOwnedVehicles[0]?.id || vehicles[0]?.id || ''
  );

  const selectedPayoutVehicle = useMemo(() => {
    return vehicles.find((v) => v.id === payoutVehicleId);
  }, [vehicles, payoutVehicleId]);

  const selectedPayoutVehicleAccount = useMemo(() => {
    if (!payoutVehicleId && !selectedPayoutVehicle) return null;
    return (
      accounts.find(
        (a) =>
          (payoutVehicleId && a.vehicleId === payoutVehicleId) ||
          (selectedPayoutVehicle?.registrationNumber &&
            a.name.toLowerCase().includes(selectedPayoutVehicle.registrationNumber.toLowerCase()))
      ) || null
    );
  }, [accounts, payoutVehicleId, selectedPayoutVehicle]);

  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('this_month');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  const defaultCompanyAccount = useMemo(() => {
    return (
      accounts.find((a) => a.name.toUpperCase().includes('AIE SKYLINE ACCOUNT')) ||
      accounts.find((a) => a.name.toUpperCase().includes('AIE SKYLINE')) ||
      accounts.find((a) => a.name.toUpperCase().includes('MAIN') || a.name.toUpperCase().includes('COMPANY')) ||
      accounts[0]
    );
  }, [accounts]);

  const [payoutCompanyAccountId, setPayoutCompanyAccountId] = useState<string>(
    defaultCompanyAccount?.id || accounts[0]?.id || ''
  );

  const [payoutReference, setPayoutReference] = useState<string>(
    `PAYOUT-${Date.now().toString().slice(-6)}`
  );
  const [payoutDate, setPayoutDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [periodCoveredText, setPeriodCoveredText] = useState<string>('');
  const [payoutClearOwing, setPayoutClearOwing] = useState<boolean>(true);
  const [payoutNotes, setPayoutNotes] = useState<string>('');
  const [payoutLoading, setPayoutLoading] = useState(false);

  // Date range for profit payout
  const { payoutDateFrom, payoutDateTo } = useMemo(() => {
    const now = new Date();
    if (periodPreset === 'this_month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      return { payoutDateFrom: start, payoutDateTo: end };
    }
    if (periodPreset === 'last_month') {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return { payoutDateFrom: start, payoutDateTo: end };
    }
    if (periodPreset === 'this_quarter') {
      const quarter = Math.floor(now.getMonth() / 3);
      const start = new Date(now.getFullYear(), quarter * 3, 1);
      const end = new Date(now.getFullYear(), quarter * 3 + 3, 0, 23, 59, 59, 999);
      return { payoutDateFrom: start, payoutDateTo: end };
    }
    if (periodPreset === 'year_to_date') {
      const start = new Date(now.getFullYear(), 0, 1);
      const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      return { payoutDateFrom: start, payoutDateTo: end };
    }
    if (periodPreset === 'custom') {
      const start = customStartDate ? new Date(customStartDate) : null;
      const end = customEndDate ? new Date(`${customEndDate}T23:59:59`) : null;
      return { payoutDateFrom: start, payoutDateTo: end };
    }
    return { payoutDateFrom: null, payoutDateTo: null };
  }, [periodPreset, customStartDate, customEndDate]);

  // Compute live profit strictly scoped to selected vehicle account
  const payoutProfitData: VehicleProfitCalculation = useMemo(() => {
    return calculateVehicleProfitAndShare({
      vehicleId: payoutVehicleId || undefined,
      accountId: selectedPayoutVehicleAccount?.id || undefined,
      startDate: payoutDateFrom,
      endDate: payoutDateTo,
      transactions: transactions || [],
      accounts,
      vehicles,
    });
  }, [payoutVehicleId, selectedPayoutVehicleAccount, payoutDateFrom, payoutDateTo, transactions, accounts, vehicles]);

  useEffect(() => {
    if (periodPreset === 'this_month') {
      const monthStr = new Date().toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
      setPeriodCoveredText(`Profit Share Payout: ${monthStr}`);
    } else if (periodPreset === 'last_month') {
      const lastMonth = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1);
      const monthStr = lastMonth.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
      setPeriodCoveredText(`Profit Share Payout: ${monthStr}`);
    } else {
      setPeriodCoveredText(`Profit Share Payout: ${payoutProfitData.periodLabel}`);
    }
  }, [periodPreset, payoutProfitData.periodLabel]);

  // Handle Profit Share Payout Execution
  const handleExecuteProfitPayout = async () => {
    if (!canProcessProfitPayout) {
      toast.error('Unauthorized: You do not have permission to process profit payouts.');
      return;
    }
    if (payoutProfitData.netProfit <= 0) {
      toast.error('Cannot payout: Net profit for selected period must be greater than £0.00');
      return;
    }
    if (!payoutCompanyAccountId) {
      toast.error('Please select a Company Account to receive the company share.');
      return;
    }
    if (!payoutReference.trim()) {
      toast.error('Please enter a payout reference number.');
      return;
    }

    setPayoutLoading(true);
    try {
      const compAcc = accounts.find((a) => a.id === payoutCompanyAccountId);
      const res = await executeProfitPayoutSettlement({
        vehicleId: payoutProfitData.vehicleId,
        vehicleName: payoutProfitData.vehicleName,
        sourceAccountId: payoutProfitData.accountId || selectedPayoutVehicleAccount?.id || 'source_acc',
        sourceAccountName: payoutProfitData.accountName || selectedPayoutVehicleAccount?.name || 'Vehicle Account',
        companyAccountId: payoutCompanyAccountId,
        companyAccountName: compAcc?.name || 'AIE SKYLINE ACCOUNTS',
        grossBilled: payoutProfitData.revenue,
        expenses: payoutProfitData.expenses,
        totalProfit: payoutProfitData.netProfit,
        companySharePct: payoutProfitData.companySharePct,
        companyShareAmount: payoutProfitData.companyShareAmount,
        ownerName: payoutProfitData.ownerName,
        ownerSharePct: payoutProfitData.ownerSharePct,
        ownerShareAmount: payoutProfitData.ownerShareAmount,
        payoutReference: payoutReference.trim(),
        payoutDate: new Date(payoutDate),
        periodCovered: periodCoveredText.trim() || payoutProfitData.periodLabel,
        clearOwingBalance: payoutClearOwing,
        clearedBalanceAmount: payoutClearOwing ? payoutProfitData.currentOwingBalance : 0,
        notes: payoutNotes.trim(),
        currentUser: {
          id: user?.id,
          name: user?.name || user?.email,
          email: user?.email,
        },
      });

      if (res.success) {
        toast.success(
          `Successfully processed profit payout! £${payoutProfitData.companyShareAmount} transferred to Company, £${payoutProfitData.ownerShareAmount} paid to ${payoutProfitData.ownerName}.`
        );
        onClose();
      } else {
        toast.error(res.message || 'Failed to process payout settlement');
      }
    } catch (err: any) {
      console.error('Error executing payout settlement:', err);
      toast.error(err?.message || 'Error executing payout settlement');
    } finally {
      setPayoutLoading(false);
    }
  };

  const calculateNextDate = (dateStr: string, freq: string): Date => {
    const date = new Date(dateStr);
    switch (freq) {
      case 'daily': return addDays(date, 1);
      case 'weekly': return addWeeks(date, 1);
      case 'monthly': return addMonths(date, 1);
      case 'quarterly': return addMonths(date, 3);
      case 'biannually': return addMonths(date, 6);
      case 'yearly': return addYears(date, 1);
      default: return addMonths(date, 1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { toast.error('User not authenticated'); return; }
    setLoading(true);

    try {
      const selectedVehicle = vehicles.find((v) => v.id === formData.vehicleId);
      const selectedCustomer = customers.find((c) => c.id === formData.customerId);
      const dept = departments.find((d) => d.id === formData.departmentId);
      const vehicleOwner = manualVehicleEntry ? null : (selectedVehicle ? (selectedVehicle.owner || null) : { name: 'AIE Skyline Limited', isDefault: true });
      const newAmount = Math.abs(parseFloat(formData.amount || '0'));
      
      if (isNaN(newAmount) || newAmount <= 0) { toast.error('Please enter a valid positive amount.'); setLoading(false); return; }

      const getAccName = (id: string) => accounts.find(a => a.id === id)?.name || '';

      const combinedManualVehicleName = manualVehicleEntry 
        ? `${formData.manualVehicleMake.trim()} ${formData.manualVehicleModel.trim()} (${formData.manualVehicleReg.trim()})`.trim()
        : null;

      const billed = newAmount;
      const hasEditedProfit = isEditing && !!transaction;
      const subCost = hasEditedProfit
        ? Math.max(0, parseFloat(formData.subcontractorCost) || 0)
        : billed;
      const profitMetrics = hasEditedProfit
        ? calculateProfitMetrics(billed, subCost)
        : { customerBilled: billed, subcontractorCost: billed, netProfit: 0, profitMarginPercent: 0 };

      const basePayload: any = {
          category: formData.category,
          description: formData.description,
          paymentMethod: formData.paymentMethod,
          paymentReference: formData.paymentReference || null,
          paymentStatus: formData.paymentStatus || 'pending',
          status: formData.status || 'completed',
          customerId: manualEntry ? null : (formData.customerId || null),
          customerName: manualEntry ? formData.customerName : selectedCustomer?.name || null,
          vehicleId: manualVehicleEntry ? null : (formData.vehicleId || null),
          vehicleName: manualVehicleEntry ? combinedManualVehicleName : (selectedVehicle ? `${selectedVehicle.make} ${selectedVehicle.model} (${selectedVehicle.registrationNumber})` : null),
          vehicleOwner: vehicleOwner,
          groupId: formData.groupId || null,
          departmentId: formData.departmentId || null,
          departmentName: dept ? dept.name : null,
          updatedAt: new Date(),
          updatedBy: user.name || user.email || '',
          amount: newAmount,
          isProfitEdited: hasEditedProfit,
          subcontractorCost: profitMetrics.subcontractorCost,
          customerBilled: billed,
          netProfit: profitMetrics.netProfit,
          profitMarginPercent: profitMetrics.profitMarginPercent,
          date: new Date(formData.date),
      };

      if (!restrictFinancialFields) {
          basePayload.date = new Date(formData.date);
          basePayload.amount = newAmount;
      } else if (isEditing && transaction) {
          basePayload.date = transaction.date;
          basePayload.amount = transaction.amount;
      }

      if (isRecurring) {
        basePayload.isRecurring = true;
        basePayload.recurringFrequency = frequency as any;
        if (!transaction || !transaction.isRecurring) {
             basePayload.nextRecurringDate = calculateNextDate(formData.date, frequency);
        }
      } else {
        basePayload.isRecurring = false;
        basePayload.recurringFrequency = null;
        basePayload.nextRecurringDate = null;
      }

      if (isEditing && transaction) {
          const finalAccountsFrom: string[] = [];
          const finalAccountsTo: string[] = [];

          if (currentType === 'income') {
             if (formData.accountTo) finalAccountsTo.push(formData.accountTo);
             if (formData.accountTo2) finalAccountsTo.push(formData.accountTo2);
             if (formData.accountThird) finalAccountsFrom.push(formData.accountThird);
          } else {
             if (formData.accountFrom) finalAccountsFrom.push(formData.accountFrom);
             if (formData.accountFrom2) finalAccountsFrom.push(formData.accountFrom2);
             if (formData.accountThird) finalAccountsTo.push(formData.accountThird);
          }

          if (finalAccountsFrom.length === 0 && finalAccountsTo.length === 0) {
              toast.error("At least one account must be selected.");
              setLoading(false);
              return;
          }

          const updatePayload: any = {
              ...basePayload,
              accountsFrom: finalAccountsFrom,
              accountsTo: finalAccountsTo,
              type: currentType,
          };

          // Optimistic UI update: instantly close modal and notify user
          toast.success('Transaction updated successfully');
          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('financeRecordUpdated', {
                detail: {
                  id: transaction.id,
                  entityId: transaction.id,
                  ...updatePayload,
                  action: 'UPDATE_TRANSACTION',
                  timestamp: Date.now(),
                },
              })
            );
          }
          onClose();

          // Execute Firestore update in the background
          const cleanUpdatePayload: any = {};
          for (const [k, v] of Object.entries(updatePayload)) {
            if (v !== undefined) cleanUpdatePayload[k] = v;
          }
          updateDoc(doc(db, 'transactions', transaction.id), cleanUpdatePayload).catch((bgErr) => {
            console.error('Background transaction update error:', bgErr);
            toast.error('Failed to sync transaction update to server');
          });
          return;
      } else {
        const batch = writeBatch(db);
        let operationCount = 0;
        const optimisticCreatedList: any[] = [];

        const mainPrimaryId = currentType === 'income' ? formData.accountTo : formData.accountFrom;
        const mainSecondaryId = currentType === 'income' ? formData.accountTo2 : formData.accountFrom2;
        const contraAccountId = formData.accountThird;

        const primaryName = getAccName(mainPrimaryId);
        const secondaryName = getAccName(mainSecondaryId);
        const debitSideString = [primaryName, secondaryName].filter(Boolean).join(', ');
        const creditSideString = getAccName(contraAccountId);

        const sanitizeData = (rawObj: any) => {
          const sanitized: any = {};
          for (const [k, v] of Object.entries(rawObj)) {
            if (v !== undefined) sanitized[k] = v;
          }
          return sanitized;
        };

        if (mainPrimaryId) {
            const ref = doc(collection(db, 'transactions'));
            const data: any = {
                ...basePayload,
                id: ref.id,
                type: currentType,
                createdAt: new Date(),
                createdBy: user.name || user.email || '',
                relatedAccountName: contraAccountId ? (creditSideString || null) : null,
            };

            if (currentType === 'income') {
                data.accountsTo = [mainPrimaryId];
                data.accountsFrom = [];
            } else {
                data.accountsFrom = [mainPrimaryId];
                data.accountsTo = [];
            }

            batch.set(ref, sanitizeData(data));
            optimisticCreatedList.push(data);
            operationCount++;
        }

        if (mainSecondaryId) {
            const ref = doc(collection(db, 'transactions'));
            const data: any = {
                ...basePayload,
                id: ref.id,
                type: currentType,
                createdAt: new Date(),
                createdBy: user.name || user.email || '',
                relatedAccountName: contraAccountId ? (creditSideString || null) : null,
            };

            if (currentType === 'income') {
                data.accountsTo = [mainSecondaryId];
                data.accountsFrom = [];
            } else {
                data.accountsFrom = [mainSecondaryId];
                data.accountsTo = [];
            }

            batch.set(ref, sanitizeData(data));
            optimisticCreatedList.push(data);
            operationCount++;
        }

        if (formData.accountThird) {
            const ref = doc(collection(db, 'transactions'));
            const contraType = currentType === 'income' ? 'expense' : 'income';
            
            const contraData: any = {
                ...basePayload,
                id: ref.id,
                type: contraType,
                createdAt: new Date(),
                createdBy: user.name || user.email || '',
                description: `(Transfer) ${formData.description}`,
            };

            if (contraType === 'income') {
                contraData.accountsTo = [formData.accountThird];
                contraData.accountsFrom = [];
                contraData.relatedAccountName = debitSideString || null; 
            } else {
                contraData.accountsFrom = [formData.accountThird];
                contraData.accountsTo = [];
                contraData.relatedAccountName = creditSideString || null; 
            }

            batch.set(ref, sanitizeData(contraData));
            optimisticCreatedList.push(contraData);
            operationCount++;
        }

        if (operationCount === 0) {
            toast.error("Please select at least one account.");
            setLoading(false);
            return;
        }

        // Optimistic UI update: instantly close modal and notify user
        toast.success(`Created ${operationCount} transaction record(s)`);
        if (typeof window !== 'undefined') {
          optimisticCreatedList.forEach((item) => {
            window.dispatchEvent(
              new CustomEvent('financeRecordUpdated', {
                detail: {
                  ...item,
                  action: 'CREATE_TRANSACTION',
                  timestamp: Date.now(),
                },
              })
            );
          });
        }
        onClose();

        // Commit batch in the background
        batch.commit().catch((bgErr) => {
          console.error('Background transaction batch commit error:', bgErr);
          toast.error('Failed to sync new transaction(s) to server');
        });
        return;
      }
    } catch (error) {
      console.error('Error saving transaction:', error);
      toast.error(`Failed to save transaction.`);
    } finally {
      setLoading(false);
    }
  };

  const currentBilled = Math.max(0, parseFloat(formData.amount) || 0);
  const currentSubCost = Math.max(0, parseFloat(formData.subcontractorCost) || 0);
  const liveProfitMetrics = calculateProfitMetrics(currentBilled, currentSubCost);

  return (
    <div className="space-y-6">
      {/* INTERACTIVE TRANSACTION TYPE SELECTOR */}
      {!transaction && (
        <div className="p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200 grid grid-cols-2 gap-2 shadow-inner">
          <button
            type="button"
            onClick={() => handleTypeChange('income')}
            className={`flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl font-bold text-sm transition-all cursor-pointer ${
              currentType === 'income'
                ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-500/20 scale-[1.01]'
                : 'text-slate-600 hover:text-emerald-700 hover:bg-white/70'
            }`}
          >
            <div className={`p-1.5 rounded-lg ${currentType === 'income' ? 'bg-emerald-700/60 text-white' : 'bg-emerald-100 text-emerald-700'}`}>
              <TrendingUp className="w-4 h-4" />
            </div>
            <div className="text-left leading-tight">
              <span className="block font-black tracking-wide">Income / Credit</span>
              <span className={`text-[10px] block font-medium ${currentType === 'income' ? 'text-emerald-100' : 'text-slate-500'}`}>
                Inflow &amp; Receivables
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleTypeChange('expense')}
            className={`flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl font-bold text-sm transition-all cursor-pointer ${
              currentType === 'expense'
                ? 'bg-rose-600 text-white shadow-md ring-2 ring-rose-500/20 scale-[1.01]'
                : 'text-slate-600 hover:text-rose-700 hover:bg-white/70'
            }`}
          >
            <div className={`p-1.5 rounded-lg ${currentType === 'expense' ? 'bg-rose-700/60 text-white' : 'bg-rose-100 text-rose-700'}`}>
              <TrendingDown className="w-4 h-4" />
            </div>
            <div className="text-left leading-tight">
              <span className="block font-black tracking-wide">Expense / Debit</span>
              <span className={`text-[10px] block font-medium ${currentType === 'expense' ? 'text-rose-100' : 'text-slate-500'}`}>
                Outflow &amp; Subcontractors
              </span>
            </div>
          </button>
        </div>
      )}

      {/* 1. PERMISSION-GATED PAYMENT SELECTOR (REGULAR vs PROFIT SHARE) */}
      {canProcessProfitPayout && !isEditing && (
        <div className="p-4 bg-linear-to-r from-slate-50 to-indigo-50/50 border-2 border-indigo-100 rounded-2xl shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-black text-slate-800 uppercase tracking-wider">
              Payment Settlement Type
            </label>
            <span className="px-2 py-0.5 text-[10px] font-extrabold bg-indigo-100 text-indigo-800 rounded-full flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-indigo-600" />
              Authorized Officer
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label
              className={`flex items-start gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                paymentType === 'regular'
                  ? 'bg-white border-indigo-600 shadow-xs ring-2 ring-indigo-500/20'
                  : 'bg-white/60 border-slate-200 hover:bg-white hover:border-slate-300'
              }`}
            >
              <input
                type="radio"
                name="paymentTypeOption"
                value="regular"
                checked={paymentType === 'regular'}
                onChange={() => setPaymentType('regular')}
                className="mt-0.5 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
              />
              <div>
                <span className="block text-xs font-bold text-slate-900">
                  Regular {currentType === 'income' ? 'Income' : 'Expense'} Payment
                </span>
                <span className="text-[11px] text-slate-500 leading-tight block mt-0.5">
                  Standard general ledger transaction entry
                </span>
              </div>
            </label>

            <label
              className={`flex items-start gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                paymentType === 'profit_share'
                  ? 'bg-indigo-50/80 border-indigo-600 shadow-xs ring-2 ring-indigo-500/20'
                  : 'bg-white/60 border-slate-200 hover:bg-white hover:border-slate-300'
              }`}
            >
              <input
                type="radio"
                name="paymentTypeOption"
                value="profit_share"
                checked={paymentType === 'profit_share'}
                onChange={() => setPaymentType('profit_share')}
                className="mt-0.5 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
              />
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-indigo-950">
                    Profit Share Payout Settlement
                  </span>
                  <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 text-[9px] font-extrabold uppercase rounded">
                    Co-Owner
                  </span>
                </div>
                <span className="text-[11px] text-indigo-700/80 leading-tight block mt-0.5">
                  Split net profit & execute atomic transfer
                </span>
              </div>
            </label>
          </div>
        </div>
      )}

      {/* 2. PROFIT SHARE PAYOUT SETTLEMENT EXECUTION VIEW */}
      {paymentType === 'profit_share' && canProcessProfitPayout ? (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Target Co-Owned Vehicle / Account Selector & Accounting Period */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Target Vehicle Account
              </label>
              <select
                value={payoutVehicleId}
                onChange={(e) => setPayoutVehicleId(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {vehicles.map((v) => {
                  const isShared =
                    v.isSharedOwnership ||
                    (v.sharedOwnership && v.sharedOwnership.length > 0) ||
                    (v.owner?.sharedOwnership && v.owner.sharedOwnership.length > 0);
                  const linkedAcc = accounts.find(
                    (a) =>
                      a.vehicleId === v.id ||
                      (v.registrationNumber &&
                        a.name.toLowerCase().includes(v.registrationNumber.toLowerCase()))
                  );
                  return (
                    <option key={v.id} value={v.id}>
                      {v.make} {v.model} ({v.registrationNumber}) {linkedAcc ? `• Acc: ${linkedAcc.name}` : ''} {isShared ? '⭐ [Shared]' : ''}
                    </option>
                  );
                })}
              </select>
              {selectedPayoutVehicleAccount && (
                <p className="text-[11px] text-slate-500 mt-1 font-medium">
                  Scoped Account: <strong className="text-slate-800">{selectedPayoutVehicleAccount.name}</strong> (Balance: {formatCurrency(Number(selectedPayoutVehicleAccount.balance || 0))})
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Accounting Period
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'this_month', label: 'This Month' },
                  { id: 'last_month', label: 'Last Month' },
                  { id: 'this_quarter', label: 'Quarter' },
                  { id: 'year_to_date', label: 'YTD' },
                  { id: 'all_time', label: 'All Time' },
                  { id: 'custom', label: 'Custom' },
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPeriodPreset(p.id as PeriodPreset)}
                    className={`py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer border ${
                      periodPreset === p.id
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {periodPreset === 'custom' && (
              <div className="col-span-1 md:col-span-2 grid grid-cols-2 gap-3 pt-2">
                <FormField
                  label="From Date"
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                />
                <FormField
                  label="To Date"
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Configured Ownership Split Badge Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-2xl">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 text-xs font-extrabold uppercase tracking-wider bg-indigo-600 text-white rounded-lg shadow-xs">
                Configured Split
              </span>
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-900">
                {payoutProfitData.shares.map((s, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-0.5 rounded-full bg-white border border-indigo-200 shadow-2xs text-indigo-800"
                  >
                    {s.ownerName}: <strong className="text-indigo-950">{s.sharePercentage}%</strong>
                  </span>
                ))}
              </div>
            </div>

            <div className="text-xs text-slate-500 font-medium">
              Covering: <strong className="text-slate-800">{payoutProfitData.periodLabel}</strong> ({payoutProfitData.matchedTransactionsCount} entries strictly scoped)
            </div>
          </div>

          {/* ONLY 3 CLEAN ACCOUNT SUMMARY CARDS */}
          <div>
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-xs flex items-center justify-center font-bold">1</span>
              Vehicle Account Financial Summary ({payoutProfitData.periodLabel})
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* 1. ACCOUNT TOTAL INCOME Card */}
              <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-4 shadow-2xs">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-extrabold text-emerald-800 uppercase tracking-wider">
                    ACCOUNT TOTAL INCOME
                  </p>
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded-md">
                    Realized Cash
                  </span>
                </div>
                <p className="text-2xl font-black font-mono text-emerald-900 mt-1.5">
                  {formatCurrency(payoutProfitData.revenue)}
                </p>
                <p className="text-[11px] text-emerald-700 mt-0.5 font-medium">
                  Realized / Collected cash only
                </p>
              </div>

              {/* 2. ACCOUNT TOTAL EXPENSES Card */}
              <div className="bg-rose-50/60 border border-rose-200 rounded-2xl p-4 shadow-2xs">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-extrabold text-rose-800 uppercase tracking-wider">
                    ACCOUNT TOTAL EXPENSES
                  </p>
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-rose-100 text-rose-800 rounded-md">
                    Actual Outflow
                  </span>
                </div>
                <p className="text-2xl font-black font-mono text-rose-900 mt-1.5">
                  {formatCurrency(payoutProfitData.expenses)}
                </p>
                <p className="text-[11px] text-rose-700 mt-0.5 font-medium">
                  Actual expenses incurred
                </p>
              </div>

              {/* 3. ACCOUNT NET PROFIT Card */}
              <div
                className={`border rounded-2xl p-4 shadow-xs ${
                  payoutProfitData.netProfit > 0
                    ? 'bg-indigo-50/70 border-indigo-300'
                    : 'bg-slate-100/80 border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <p
                    className={`text-xs font-extrabold uppercase tracking-wider ${
                      payoutProfitData.netProfit > 0 ? 'text-indigo-900' : 'text-slate-700'
                    }`}
                  >
                    ACCOUNT NET PROFIT
                  </p>
                  <span
                    className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${
                      payoutProfitData.netProfit > 0
                        ? 'bg-indigo-100 text-indigo-800'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    Income - Expenses
                  </span>
                </div>
                <p
                  className={`text-2xl font-black font-mono mt-1.5 ${
                    payoutProfitData.netProfit > 0
                      ? 'text-indigo-950'
                      : payoutProfitData.netProfit < 0
                      ? 'text-rose-700'
                      : 'text-slate-800'
                  }`}
                >
                  {formatCurrency(payoutProfitData.netProfit)}
                </p>
                <p
                  className={`text-[11px] mt-0.5 font-semibold ${
                    payoutProfitData.netProfit > 0 ? 'text-indigo-700' : 'text-slate-500'
                  }`}
                >
                  {payoutProfitData.netProfit > 0
                    ? 'Distributable Net Profit'
                    : 'No distributable profit available'}
                </p>
              </div>
            </div>

            {/* Handle Negative / Zero Profit Warning */}
            {payoutProfitData.netProfit <= 0 && (
              <div className="mt-3 p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3 text-amber-900 text-xs">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <div>
                  <strong className="font-bold">No distributable profit available: </strong>
                  Vehicle Account Net Profit is {formatCurrency(payoutProfitData.netProfit)} (must be greater than £0.00). Profit share payout is disabled for this period.
                </div>
              </div>
            )}
          </div>

          {/* STEP 2: AUTOMATED SHARE SPLITTING */}
          <div>
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-xs flex items-center justify-center font-bold">2</span>
              Proposed Profit Distribution
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* COMPANY SHARE CARD */}
              <div className="bg-white border-2 border-indigo-200 rounded-2xl p-5 shadow-xs relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Company Share</p>
                      <h5 className="text-base font-bold text-slate-900">AIE Skyline Limited</h5>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full font-extrabold text-sm">
                    {payoutProfitData.companySharePct}% Share
                  </span>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-baseline justify-between">
                  <span className="text-xs font-semibold text-slate-600">Company Transfer Amount:</span>
                  <span className="text-2xl font-black font-mono text-indigo-600">
                    {formatCurrency(payoutProfitData.companyShareAmount)}
                  </span>
                </div>

                <div className="mt-3">
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Destination Company Account (Internal Transfer):
                  </label>
                  <select
                    value={payoutCompanyAccountId}
                    onChange={(e) => setPayoutCompanyAccountId(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({formatCurrency(Number(a.balance || 0))})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* CO-OWNER / PARTNER SHARE CARD */}
              <div className="bg-white border-2 border-emerald-200 rounded-2xl p-5 shadow-xs relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Partner Share</p>
                      <h5 className="text-base font-bold text-slate-900">{payoutProfitData.ownerName}</h5>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full font-extrabold text-sm">
                    {payoutProfitData.ownerSharePct}% Share
                  </span>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-baseline justify-between">
                  <span className="text-xs font-semibold text-slate-600">Partner Payout Amount:</span>
                  <span className="text-2xl font-black font-mono text-emerald-600">
                    {formatCurrency(payoutProfitData.ownerShareAmount)}
                  </span>
                </div>

                <div className="mt-3 p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center justify-between text-xs">
                  <span className="font-semibold text-emerald-900">Current "Owing to Owner" Balance:</span>
                  <span className="font-bold font-mono text-rose-700">
                    {formatCurrency(payoutProfitData.currentOwingBalance)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* STEP 3: SETTLEMENT EXECUTION DETAILS */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-xs flex items-center justify-center font-bold">3</span>
              Record Settlement Details & Commit Payout
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <FormField
                label="Period Covered"
                value={periodCoveredText}
                onChange={(e) => setPeriodCoveredText(e.target.value)}
                placeholder="e.g. Profit Share Payout: Sep 2026"
                required
              />

              <FormField
                label="Payout Reference #"
                value={payoutReference}
                onChange={(e) => setPayoutReference(e.target.value)}
                placeholder="e.g. PAYOUT-2026-09"
                required
              />

              <FormField
                label="Date Paid"
                type="date"
                value={payoutDate}
                onChange={(e) => setPayoutDate(e.target.value)}
                required
              />
            </div>

            <div className="flex items-start gap-3 p-3 bg-white rounded-xl border border-slate-200">
              <input
                type="checkbox"
                id="clearOwingCheckboxForm"
                checked={payoutClearOwing}
                onChange={(e) => setPayoutClearOwing(e.target.checked)}
                className="mt-1 w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
              />
              <label htmlFor="clearOwingCheckboxForm" className="text-xs text-slate-700 cursor-pointer">
                <strong className="block text-slate-900 font-bold">
                  Zero out / Reconcile "Owing to Owner" balance
                </strong>
                Clear and zero out the owing balance for this vehicle period via atomic ledger entries.
              </label>
            </div>

            <FormField
              label="Notes / Terms (Optional)"
              value={payoutNotes}
              onChange={(e) => setPayoutNotes(e.target.value)}
              placeholder="Additional notes for settlement..."
            />
          </div>

          {/* PROFIT SHARE COMMIT ACTION BUTTON */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleExecuteProfitPayout}
              disabled={payoutLoading || payoutProfitData.netProfit <= 0}
              className="px-5 py-2.5 text-xs font-bold text-white bg-linear-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {payoutLoading ? (
                'Processing Settlement...'
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Confirm & Execute Profit Share Settlement
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        /* 3. STANDARD REGULAR INCOME / EXPENSE TRANSACTION FORM */
        <form onSubmit={handleSubmit} className="space-y-6">
          {restrictAccountFields && (
            <div className="p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <Info className="h-5 w-5 text-yellow-400" aria-hidden="true" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">
                    Editing a linked or multi-account transaction. Amount, Date, and Accounts cannot be changed by your role.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="border border-indigo-100 bg-indigo-50/50 rounded-md p-4 space-y-3">
            <div className="flex items-center">
              <input
                id="isRecurring"
                type="checkbox"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="isRecurring" className="ml-2 block text-sm font-medium text-gray-900 flex items-center">
                <RefreshCw className="w-4 h-4 mr-1 text-indigo-600" />
                Re-occurring Transaction
              </label>
            </div>
            {isRecurring && (
              <div className="animate-fadeIn">
                <label className="block text-xs font-medium text-gray-700 uppercase tracking-wide">
                  Frequency
                </label>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value)}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="biannually">Biannually</option>
                  <option value="yearly">Yearly</option>
                </select>
                <p className="mt-2 text-xs text-indigo-600">
                  Next occurrence will be automatically generated based on the date/time selected below + frequency. <br />
                  <strong>Note:</strong> Separate recurring series will be created for each selected account.
                </p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Date & Time</label>
            <input
              type="datetime-local"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
              disabled={restrictFinancialFields}
              className="form-input mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          <FormField
            type="number"
            label={currentType === 'income' ? 'Income Amount (£)' : 'Expense Amount (£)'}
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            min="0"
            step="0.01"
            required
            placeholder="Enter total amount"
            disabled={restrictFinancialFields}
          />

          {/* Dealer / Subcontractor Cost & Live Profit Tracking Card */}
          <div className="bg-slate-50 p-4 rounded-xl border-2 border-indigo-100 space-y-3 text-slate-900 shadow-2xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-indigo-100 text-indigo-700 rounded-lg">
                  <DollarSign className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Dealer / Subcontractor Cost & Profit Tracking
                  </h4>
                  <p className="text-[11px] text-slate-500">Live profit margin preview based on transaction amount</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Customer Billed (Revenue)
                </label>
                <div className="px-3 py-2 bg-white border border-slate-200 rounded-lg font-mono font-bold text-slate-900 text-base">
                  {formatCurrency(currentBilled)}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Dealer / Subcontractor Cost
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.subcontractorCost}
                  onChange={(e) => setFormData({ ...formData, subcontractorCost: e.target.value })}
                  placeholder="0.00"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200/80">
              <div className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-slate-200">
                <span className="text-xs font-bold text-slate-600">Net Profit:</span>
                <span
                  className={`text-sm font-black font-mono ${
                    liveProfitMetrics.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'
                  }`}
                >
                  {formatCurrency(liveProfitMetrics.netProfit)}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-slate-200">
                <span className="text-xs font-bold text-slate-600">Profit Margin:</span>
                <span
                  className={`text-sm font-black font-mono ${
                    liveProfitMetrics.profitMarginPercent >= 0 ? 'text-indigo-700' : 'text-rose-700'
                  }`}
                >
                  {liveProfitMetrics.profitMarginPercent.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          {/* Account Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {currentType === 'income' ? 'Primary Receiving Account (Credit / Inflow)' : 'Primary Paying Account (Debit / Outflow)'}
              </label>
              <select
                value={currentType === 'income' ? formData.accountTo : formData.accountFrom}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    ...(currentType === 'income' ? { accountTo: e.target.value } : { accountFrom: e.target.value }),
                  })
                }
                disabled={restrictAccountFields}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              >
                <option value="">Select account...</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({formatCurrency(Number(a.balance || 0))})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {currentType === 'income' ? 'Secondary Receiving Account (Optional)' : 'Secondary Paying Account (Optional)'}
              </label>
              <select
                value={currentType === 'income' ? formData.accountTo2 : formData.accountFrom2}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    ...(currentType === 'income' ? { accountTo2: e.target.value } : { accountFrom2: e.target.value }),
                  })
                }
                disabled={restrictAccountFields}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">None</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({formatCurrency(Number(a.balance || 0))})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Contra Account for Transfer */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contra / Offset Transfer Account (Optional)
            </label>
            <select
              value={formData.accountThird}
              onChange={(e) => setFormData({ ...formData, accountThird: e.target.value })}
              disabled={restrictAccountFields}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">None (Standard Transaction)</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({formatCurrency(Number(a.balance || 0))})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Category</label>
              {catsLoading ? (
                <div className="text-sm text-gray-500">Loading...</div>
              ) : (
                <SearchableSelect
                  options={prioritizedCategories.map((c) => ({ id: c, label: c }))}
                  value={formData.category}
                  onChange={(v) => setFormData({ ...formData, category: v || '' })}
                  placeholder={`Select ${currentType} category...`}
                  required
                />
              )}
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Group (Optional)</label>
              {groupsLoading ? (
                <div className="text-sm text-gray-500">Loading...</div>
              ) : (
                <SearchableSelect
                  options={groups.map((g) => ({ id: g.id, label: g.name }))}
                  value={formData.groupId}
                  onChange={(id) => setFormData({ ...formData, groupId: id || '' })}
                  placeholder="Select group..."
                  isClearable
                />
              )}
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Department (Optional)</label>
              <SearchableSelect
                options={departments.map((d) => ({ id: d.id, label: d.name }))}
                value={formData.departmentId}
                onChange={(id) => setFormData({ ...formData, departmentId: id || '' })}
                placeholder="Select department..."
                isClearable
              />
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={manualVehicleEntry}
                  onChange={(e) => {
                    setManualVehicleEntry(e.target.checked);
                    setFormData({
                      ...formData,
                      vehicleId: '',
                      manualVehicleMake: '',
                      manualVehicleModel: '',
                      manualVehicleReg: '',
                    });
                  }}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                /> 
                <span className="text-sm text-gray-700">Enter Vehicle Manually</span>
              </label>
            </div>
            {manualVehicleEntry ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField
                  label="Make"
                  value={formData.manualVehicleMake}
                  onChange={(e) => setFormData({ ...formData, manualVehicleMake: e.target.value })}
                  placeholder="e.g. Toyota"
                  required={manualVehicleEntry}
                />
                <FormField
                  label="Model"
                  value={formData.manualVehicleModel}
                  onChange={(e) => setFormData({ ...formData, manualVehicleModel: e.target.value })}
                  placeholder="e.g. Prius"
                  required={manualVehicleEntry}
                />
                <FormField
                  label="Registration"
                  value={formData.manualVehicleReg}
                  onChange={(e) => setFormData({ ...formData, manualVehicleReg: e.target.value })}
                  placeholder="e.g. AB12 CDE"
                  required={manualVehicleEntry}
                />
              </div>
            ) : (
              <SearchableSelect 
                label="Related Vehicle (Optional)" 
                options={vehicles.map((v) => ({
                  id: v.id,
                  label: `${v.make} ${v.model} (${v.registrationNumber})`,
                  subLabel: v.registrationNumber,
                }))} 
                value={formData.vehicleId} 
                onChange={(id) => setFormData({ ...formData, vehicleId: id || '' })} 
                placeholder="Search vehicles..." 
                isClearable 
              />
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={manualEntry}
                  onChange={(e) => {
                    setManualEntry(e.target.checked);
                    setFormData({
                      ...formData,
                      customerId: '',
                      customerName: e.target.checked ? formData.customerName : '',
                    });
                  }}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                /> 
                <span className="text-sm text-gray-700">
                  {currentType === 'income' ? 'Enter Customer Manually' : 'Enter Payee / Supplier Manually'}
                </span>
              </label>
            </div>
            {manualEntry ? (
              <FormField
                label={currentType === 'income' ? 'Customer Name' : 'Payee / Supplier Name'}
                value={formData.customerName}
                onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                placeholder={currentType === 'income' ? 'Enter customer name' : 'Enter payee or supplier name'}
              />
            ) : (
              <SearchableSelect
                label={currentType === 'income' ? 'Customer (Optional)' : 'Payee / Customer (Optional)'}
                options={customers.map((c) => ({
                  id: c.id,
                  label: c.name,
                  subLabel: `${c.mobile || ''} - ${c.email || ''}`,
                }))}
                value={formData.customerId}
                onChange={(id) => {
                  const c = customers.find((cu) => cu.id === id);
                  setFormData({ ...formData, customerId: id || '', customerName: c?.name || '' });
                }}
                placeholder={currentType === 'income' ? 'Search customers...' : 'Search payees / customers...'}
                isClearable
              />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="form-textarea mt-1 w-full shadow-sm focus:ring-primary focus:border-primary border-gray-300 rounded-md"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Payment Method</label>
            <select
              value={formData.paymentMethod}
              onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value as any })}
              className="form-select mt-1 w-full shadow-sm focus:ring-primary focus:border-primary border-gray-300 rounded-md"
              required
            >
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="cheque">Cheque</option>
              <option value="mobile_money">Mobile Money</option>
              <option value="other">Other</option>
            </select>
          </div>

          <FormField
            label="Payment Reference (Optional)"
            value={formData.paymentReference}
            onChange={(e) => setFormData({ ...formData, paymentReference: e.target.value })}
            placeholder="e.g., Invoice #, Txn ID"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700">Payment Status</label>
            <select
              value={formData.paymentStatus}
              onChange={(e) => setFormData({ ...formData, paymentStatus: e.target.value as any })}
              className="form-select mt-1 w-full shadow-sm focus:ring-primary focus:border-primary border-gray-300 rounded-md"
              required
            >
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="partially_paid">Partially Paid</option>
              <option value="unpaid">Unpaid</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Transaction Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              className="form-select mt-1 w-full shadow-sm focus:ring-primary focus:border-primary border-gray-300 rounded-md"
              required
            >
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="cancelled">Cancelled</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`px-5 py-2.5 rounded-xl shadow-xs text-sm font-bold text-white transition-all cursor-pointer disabled:opacity-50 ${
                currentType === 'income'
                  ? 'bg-emerald-600 hover:bg-emerald-700 ring-2 ring-emerald-500/20'
                  : 'bg-rose-600 hover:bg-rose-700 ring-2 ring-rose-500/20'
              }`}
            >
              {loading
                ? 'Saving...'
                : transaction
                ? 'Update Transaction'
                : currentType === 'income'
                ? '+ Record Income / Credit'
                : '+ Record Expense / Debit'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default TransactionForm;
