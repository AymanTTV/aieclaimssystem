// src/components/invoices/StatementSchedulerModal.tsx

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Customer, Invoice } from '../../types';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';
import { useAuth } from '../../context/AuthContext';
import { useCompanyDetails } from '../../hooks/useCompanyDetails';
import {
  CalendarClock,
  Calendar,
  Clock,
  Mail,
  Send,
  FileText,
  CheckCircle2,
  AlertCircle,
  Play,
  Pause,
  Trash2,
  Edit3,
  Plus,
  Users,
  Sparkles,
  Info,
  Check,
  X,
  RefreshCw,
  Building2,
  Wallet,
  ArrowRight,
  ChevronRight,
  ShieldCheck,
  CheckCheck,
} from 'lucide-react';
import {
  format,
  subMonths,
  startOfMonth,
  endOfMonth,
  subQuarters,
  startOfQuarter,
  endOfQuarter,
  addMonths,
  addDays,
} from 'date-fns';
import { toast } from 'react-hot-toast';
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { pdf } from '@react-pdf/renderer';
import Modal from '../ui/Modal';
import {
  AccountStatementDocument,
  AccountStatementData,
  StatementTransactionItem,
} from '../pdf/documents/AccountStatementDocument';
import { sendEmail } from '../../utils/emailService';

export interface StatementSchedule {
  id: string;
  name: string;
  enabled: boolean;
  frequency: 'monthly' | 'quarterly';
  // Monthly specifics:
  monthlyDay: '1' | '15' | 'last' | string;
  // Quarterly specifics:
  quarterlyTiming: 'quarter_start' | 'quarter_end';
  deliveryTime: string; // e.g. "09:00"
  audienceFilter: 'all_with_invoices' | 'with_outstanding' | 'with_activity' | 'selected';
  selectedCustomerIds?: string[];
  statementPeriodSource: 'previous_cycle' | 'current_cycle';
  includeSignature: boolean;
  includeLedger: boolean;
  includeBankDetails: boolean;
  emailSubject: string;
  emailMessage: string;
  ccEmails: string;
  createdAt?: string;
  updatedAt?: string;
  lastRunAt?: string | null;
  lastRunStatus?: 'success' | 'failed' | 'partial' | null;
  lastRunCount?: number;
  nextRunDate?: string;
}

export interface StatementDeliveryLog {
  id: string;
  scheduleId?: string;
  scheduleName: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  periodLabel: string;
  status: 'sent' | 'failed';
  dispatchedAt: string;
  dispatchedBy: string;
  totalInvoiced: number;
  totalOutstanding: number;
  notes?: string;
}

interface StatementSchedulerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  invoices: Invoice[];
}

const DEFAULT_SCHEDULES: StatementSchedule[] = [
  {
    id: 'sched-monthly-1st',
    name: 'Automated Monthly Client Account Statements',
    enabled: true,
    frequency: 'monthly',
    monthlyDay: '1',
    quarterlyTiming: 'quarter_start',
    deliveryTime: '09:00',
    audienceFilter: 'all_with_invoices',
    selectedCustomerIds: [],
    statementPeriodSource: 'previous_cycle',
    includeSignature: true,
    includeLedger: true,
    includeBankDetails: true,
    emailSubject: 'Monthly Account Statement for {customer_name} - {period}',
    emailMessage:
      'Dear {customer_name},\n\nPlease find attached your official Account Statement for {period}.\n\nThis statement provides a verified reconciliation of all billed hire invoices, recorded payments, and your current outstanding account balance of {balance}.\n\nIf you have any questions or require any clarification regarding individual items, please reply directly to this email.\n\nThank you for choosing AIE Skyline.\n\nFinance Department\nAIE Skyline Limited\nTel: +44 20 8123 4567 • Email: finance@aieskyline.com',
    ccEmails: 'finance@aieskyline.com',
    createdAt: new Date().toISOString(),
    lastRunAt: null,
    nextRunDate: '1st of next month at 09:00 AM',
  },
  {
    id: 'sched-quarterly-review',
    name: 'Quarterly Corporate Debtor Review Statements',
    enabled: true,
    frequency: 'quarterly',
    monthlyDay: '1',
    quarterlyTiming: 'quarter_start',
    deliveryTime: '09:00',
    audienceFilter: 'with_outstanding',
    selectedCustomerIds: [],
    statementPeriodSource: 'previous_cycle',
    includeSignature: true,
    includeLedger: true,
    includeBankDetails: true,
    emailSubject: 'Quarterly Account Ledger Statement: {customer_name} ({period})',
    emailMessage:
      'Dear Accounts Team,\n\nPlease find attached the quarterly consolidated ledger statement for {customer_name} covering {period}.\n\nCurrent Balance Owing: {balance}\n\nPlease review the attached certified PDF statement and ensure outstanding invoices are cleared within your agreed terms.\n\nBank Payment Details:\nBank: Lloyds Bank\nAccount Name: AIE SKYLINE LIMITED\nSort Code: 30-99-50\nAccount Number: 86450668\n\nKind regards,\nFinance & Accounts Department\nAIE Skyline Limited',
    ccEmails: 'finance@aieskyline.com',
    createdAt: new Date().toISOString(),
    lastRunAt: null,
    nextRunDate: '1st day of next financial quarter at 09:00 AM',
  },
];

export const StatementSchedulerModal: React.FC<StatementSchedulerModalProps> = ({
  isOpen,
  onClose,
  customers = [],
  invoices = [],
}) => {
  const { formatCurrency } = useFormattedDisplay();
  const { user } = useAuth();
  const { companyDetails } = useCompanyDetails();

  // Active View Tab
  const [activeTab, setActiveTab] = useState<'schedules' | 'editor' | 'logs'>('schedules');

  // Stored Schedules
  const [schedules, setSchedules] = useState<StatementSchedule[]>([]);
  const [loadingSchedules, setLoadingSchedules] = useState<boolean>(true);

  // Delivery Logs
  const [deliveryLogs, setDeliveryLogs] = useState<StatementDeliveryLog[]>([]);

  // Currently Editing Schedule
  const [editingSchedule, setEditingSchedule] = useState<StatementSchedule | null>(null);

  // Form State
  const [formData, setFormData] = useState<StatementSchedule>(DEFAULT_SCHEDULES[0]);

  // Test Run / Manual Dispatch State
  const [isDispatching, setIsDispatching] = useState<boolean>(false);
  const [dispatchProgress, setDispatchProgress] = useState<{ current: number; total: number } | null>(null);
  const [testCustomerId, setTestCustomerId] = useState<string>('');

  // 1. Subscribe to schedules in Firestore
  useEffect(() => {
    if (!isOpen) return;

    setLoadingSchedules(true);
    const schedRef = collection(db, 'statementSchedules');
    const unsub = onSnapshot(
      schedRef,
      (snapshot) => {
        if (snapshot.empty) {
          // Initialize with default template schedules in Firestore
          DEFAULT_SCHEDULES.forEach(async (ds) => {
            try {
              await setDoc(doc(db, 'statementSchedules', ds.id), ds);
            } catch (err) {
              console.error('Error seeding default schedule:', err);
            }
          });
          setSchedules(DEFAULT_SCHEDULES);
        } else {
          const list: StatementSchedule[] = [];
          snapshot.forEach((d) => {
            list.push({ ...(d.data() as StatementSchedule), id: d.id });
          });
          setSchedules(list);
        }
        setLoadingSchedules(false);
      },
      (err) => {
        console.error('Error loading statement schedules:', err);
        setSchedules(DEFAULT_SCHEDULES);
        setLoadingSchedules(false);
      }
    );

    // Subscribe to logs
    const logsRef = collection(db, 'statementDeliveryLogs');
    const unsubLogs = onSnapshot(
      logsRef,
      (snapshot) => {
        const list: StatementDeliveryLog[] = [];
        snapshot.forEach((d) => {
          list.push({ ...(d.data() as StatementDeliveryLog), id: d.id });
        });
        list.sort((a, b) => new Date(b.dispatchedAt).getTime() - new Date(a.dispatchedAt).getTime());
        setDeliveryLogs(list);
      },
      (err) => {
        console.error('Error loading delivery logs:', err);
      }
    );

    return () => {
      unsub();
      unsubLogs();
    };
  }, [isOpen]);

  // Customers with Invoices Summary
  const customerAccountMetrics = useMemo(() => {
    const map = new Map<
      string,
      {
        customer: Customer;
        invoices: Invoice[];
        totalInvoiced: number;
        totalPaid: number;
        totalOutstanding: number;
      }
    >();

    customers.forEach((cust) => {
      const custInvoices = invoices.filter((inv) => inv.customerId === cust.id);
      let totalInvoiced = 0;
      let totalPaid = 0;
      let totalOutstanding = 0;

      custInvoices.forEach((inv) => {
        totalInvoiced += Number(inv.total) || 0;
        totalPaid += Number(inv.paidAmount) || 0;
        totalOutstanding += Number(inv.remainingAmount) || 0;
      });

      map.set(cust.id, {
        customer: cust,
        invoices: custInvoices,
        totalInvoiced,
        totalPaid,
        totalOutstanding,
      });
    });

    return map;
  }, [customers, invoices]);

  // Compute Qualifying Audience for a given schedule filter
  const getQualifyingCustomers = useCallback(
    (schedule: StatementSchedule) => {
      const list: Array<{
        customer: Customer;
        totalOutstanding: number;
        totalInvoiced: number;
        invoiceCount: number;
      }> = [];

      customers.forEach((cust) => {
        const data = customerAccountMetrics.get(cust.id);
        const invCount = data?.invoices.length || 0;
        const outstanding = data?.totalOutstanding || 0;
        const invoiced = data?.totalInvoiced || 0;

        if (schedule.audienceFilter === 'all_with_invoices') {
          if (invCount > 0) {
            list.push({ customer: cust, totalOutstanding: outstanding, totalInvoiced: invoiced, invoiceCount: invCount });
          }
        } else if (schedule.audienceFilter === 'with_outstanding') {
          if (outstanding > 0.01) {
            list.push({ customer: cust, totalOutstanding: outstanding, totalInvoiced: invoiced, invoiceCount: invCount });
          }
        } else if (schedule.audienceFilter === 'selected') {
          if (schedule.selectedCustomerIds?.includes(cust.id)) {
            list.push({ customer: cust, totalOutstanding: outstanding, totalInvoiced: invoiced, invoiceCount: invCount });
          }
        } else {
          // with_activity
          if (invCount > 0) {
            list.push({ customer: cust, totalOutstanding: outstanding, totalInvoiced: invoiced, invoiceCount: invCount });
          }
        }
      });

      return list;
    },
    [customers, customerAccountMetrics]
  );

  // Audience preview for currently active form
  const qualifyingAudience = useMemo(() => {
    return getQualifyingCustomers(formData);
  }, [getQualifyingCustomers, formData]);

  // Handle Edit Schedule
  const handleStartEdit = (sched: StatementSchedule) => {
    setEditingSchedule(sched);
    setFormData({ ...sched });
    setActiveTab('editor');
  };

  // Handle New Schedule
  const handleStartNew = () => {
    const newId = `sched-${Date.now()}`;
    const fresh: StatementSchedule = {
      id: newId,
      name: 'New Custom Delivery Schedule',
      enabled: true,
      frequency: 'monthly',
      monthlyDay: '1',
      quarterlyTiming: 'quarter_start',
      deliveryTime: '09:00',
      audienceFilter: 'all_with_invoices',
      selectedCustomerIds: [],
      statementPeriodSource: 'previous_cycle',
      includeSignature: true,
      includeLedger: true,
      includeBankDetails: true,
      emailSubject: 'Account Statement for {customer_name} - {period}',
      emailMessage:
        'Dear {customer_name},\n\nPlease find attached your official Account Statement for {period}.\n\nTotal Balance: {balance}\n\nThank you,\nFinance Office\nAIE Skyline Limited',
      ccEmails: 'finance@aieskyline.com',
      createdAt: new Date().toISOString(),
      lastRunAt: null,
      nextRunDate: '1st of next month at 09:00 AM',
    };
    setEditingSchedule(null);
    setFormData(fresh);
    setActiveTab('editor');
  };

  // Toggle Schedule Enabled/Disabled
  const handleToggleSchedule = async (sched: StatementSchedule) => {
    const updated = !sched.enabled;
    try {
      await setDoc(
        doc(db, 'statementSchedules', sched.id),
        { enabled: updated, updatedAt: new Date().toISOString() },
        { merge: true }
      );
      toast.success(`Schedule "${sched.name}" ${updated ? 'activated' : 'paused'}`);
    } catch (err) {
      console.error('Error toggling schedule:', err);
      toast.error('Failed to update schedule status');
    }
  };

  // Delete Schedule
  const handleDeleteSchedule = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete the schedule "${name}"?`)) return;
    try {
      await deleteDoc(doc(db, 'statementSchedules', id));
      toast.success('Schedule deleted');
      if (editingSchedule?.id === id) {
        setActiveTab('schedules');
      }
    } catch (err) {
      console.error('Error deleting schedule:', err);
      toast.error('Failed to delete schedule');
    }
  };

  // Save Schedule to Firestore
  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Please provide a schedule name');
      return;
    }

    try {
      // Calculate next run date label
      let nextRun = '';
      if (formData.frequency === 'monthly') {
        const dayLabel =
          formData.monthlyDay === '1'
            ? '1st'
            : formData.monthlyDay === '15'
            ? '15th'
            : formData.monthlyDay === 'last'
            ? 'Last day'
            : `Day ${formData.monthlyDay}`;
        nextRun = `${dayLabel} of every month at ${formData.deliveryTime || '09:00'}`;
      } else {
        nextRun = `${
          formData.quarterlyTiming === 'quarter_start' ? '1st day' : 'Last day'
        } of every quarter at ${formData.deliveryTime || '09:00'}`;
      }

      const payload: StatementSchedule = {
        ...formData,
        nextRunDate: nextRun,
        updatedAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'statementSchedules', payload.id), payload);
      toast.success('Statement schedule saved successfully!');
      setActiveTab('schedules');
    } catch (err) {
      console.error('Error saving schedule:', err);
      toast.error('Failed to save statement schedule');
    }
  };

  // Build Statement Data for a specific Customer
  const buildCustomerStatementData = useCallback(
    (customer: Customer, schedule: StatementSchedule): AccountStatementData => {
      const now = new Date();
      let dateFrom = startOfMonth(subMonths(now, 1));
      let dateTo = endOfMonth(subMonths(now, 1));
      let periodLabel = `${format(dateFrom, 'MMMM yyyy')}`;
      let stmtType: 'monthly' | 'quarterly' | 'custom' = 'monthly';

      if (schedule.frequency === 'quarterly') {
        stmtType = 'quarterly';
        dateFrom = startOfQuarter(subQuarters(now, 1));
        dateTo = endOfQuarter(subQuarters(now, 1));
        const qNum = Math.floor(dateFrom.getMonth() / 3) + 1;
        periodLabel = `Q${qNum} ${dateFrom.getFullYear()} (${format(dateFrom, '01 MMM')} – ${format(dateTo, 'dd MMM yyyy')})`;
      }

      const custInvoices = invoices.filter((inv) => inv.customerId === customer.id);

      // Build statement items
      const statementItems: StatementTransactionItem[] = [];
      let totalBilled = 0;
      let totalPaid = 0;

      custInvoices.forEach((inv) => {
        const invDate = inv.date ? new Date(inv.date) : now;
        totalBilled += Number(inv.total) || 0;
        totalPaid += Number(inv.paidAmount) || 0;

        statementItems.push({
          id: inv.id,
          date: invDate,
          reference: inv.invoiceNumber || inv.id.slice(-6).toUpperCase(),
          description: `Invoice: ${inv.vehicleDetails || inv.items?.[0]?.description || 'Vehicle Hire Service'}`,
          category: inv.category || 'Rental Invoice',
          type: 'debit',
          amount: Number(inv.total) || 0,
        });

        // If there were recorded payments
        if (Number(inv.paidAmount) > 0) {
          statementItems.push({
            id: `pay-${inv.id}`,
            date: inv.paidAt ? new Date(inv.paidAt) : invDate,
            reference: `PAY-${inv.invoiceNumber || inv.id.slice(-6).toUpperCase()}`,
            description: `Payment Received for Invoice ${inv.invoiceNumber || ''}`,
            category: 'Customer Payment',
            type: 'credit',
            amount: Number(inv.paidAmount) || 0,
          });
        }
      });

      // Sort chronological
      statementItems.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      const balance = Math.max(0, totalBilled - totalPaid);
      const ref = `STMT-${format(now, 'yyyyMM')}-${(customer.id.slice(-4) || 'CUST').toUpperCase()}`;

      return {
        statementReference: ref,
        statementPeriodType: stmtType,
        periodLabel: periodLabel,
        dateFrom: dateFrom,
        dateTo: dateTo,
        generatedDate: now,
        account: {
          id: customer.id,
          name: customer.name,
          accountType: 'Client Commercial Ledger',
          currency: 'GBP (£)',
        },
        openingBalance: 0,
        totalInflows: totalPaid,
        totalOutflows: totalBilled,
        netMovement: totalPaid - totalBilled,
        closingBalance: balance,
        inflowCount: statementItems.filter((i) => i.type === 'credit').length,
        outflowCount: statementItems.filter((i) => i.type === 'debit').length,
        statementNotes: schedule.includeBankDetails
          ? 'Lloyds Bank • Sort Code: 30-99-50 • Account: 86450668 • Beneficiary: AIE SKYLINE LIMITED'
          : undefined,
        transactions: statementItems,
        includeLedger: schedule.includeLedger,
      };
    },
    [invoices]
  );

  // Send a Single Statement to a Customer
  const dispatchStatementForCustomer = async (
    customer: Customer,
    schedule: StatementSchedule,
    isTest = false
  ) => {
    if (!customer.email || !customer.email.includes('@')) {
      throw new Error(`Customer ${customer.name} has no valid email address.`);
    }

    const data = buildCustomerStatementData(customer, schedule);

    // Render PDF blob
    const docInstance = <AccountStatementDocument data={data} companyDetails={companyDetails} />;
    const pdfBlob = await pdf(docInstance).toBlob();

    // Replace variables in email template
    const replaceTags = (text: string) => {
      return text
        .replace(/{customer_name}/g, customer.name || 'Valued Client')
        .replace(/{period}/g, data.periodLabel)
        .replace(/{balance}/g, formatCurrency(data.closingBalance))
        .replace(/{company_name}/g, companyDetails?.tradingName || 'AIE Skyline Limited')
        .replace(/{account_number}/g, customer.id.slice(-6).toUpperCase());
    };

    const finalSubject = replaceTags(schedule.emailSubject);
    const finalBody = replaceTags(schedule.emailMessage);

    // Convert PDF blob to base64 attachment or send email parameters
    const reader = new FileReader();
    const base64Promise = new Promise<string>((resolve) => {
      reader.onloadend = () => {
        resolve((reader.result as string) || '');
      };
      reader.readAsDataURL(pdfBlob);
    });
    const base64Data = await base64Promise;

    // Send via emailService
    await sendEmail({
      to_email: customer.email,
      to_name: customer.name,
      subject: finalSubject,
      message: finalBody,
      reference: data.statementReference,
      show_bank_details: schedule.includeBankDetails,
      reply_to: schedule.ccEmails || 'finance@aieskyline.com',
      attachments: [
        {
          name: `${data.statementReference}.pdf`,
          data: base64Data,
        },
      ],
    });

    // Record Delivery Log in Firestore
    const logItem: StatementDeliveryLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      scheduleId: schedule.id,
      scheduleName: schedule.name,
      customerId: customer.id,
      customerName: customer.name,
      customerEmail: customer.email,
      periodLabel: data.periodLabel,
      status: 'sent',
      dispatchedAt: new Date().toISOString(),
      dispatchedBy: user?.email || 'Automated Scheduler',
      totalInvoiced: data.totalOutflows,
      totalOutstanding: data.closingBalance,
      notes: isTest ? 'Manual Test Dispatch' : 'Automated Scheduled Delivery',
    };

    await setDoc(doc(db, 'statementDeliveryLogs', logItem.id), logItem);
    return logItem;
  };

  // Run a Full Schedule Now
  const handleExecuteScheduleNow = async (sched: StatementSchedule) => {
    const targets = getQualifyingCustomers(sched);
    if (targets.length === 0) {
      toast.error('No qualifying customer accounts found for this schedule rule.');
      return;
    }

    if (
      !window.confirm(
        `Are you sure you want to trigger "${sched.name}" now? This will generate and deliver certified PDF statements to ${targets.length} customer(s).`
      )
    ) {
      return;
    }

    setIsDispatching(true);
    setDispatchProgress({ current: 0, total: targets.length });
    const toastId = toast.loading(`Dispatching statements to ${targets.length} customers...`);

    let sentCount = 0;
    let failCount = 0;

    for (let i = 0; i < targets.length; i++) {
      const item = targets[i];
      setDispatchProgress({ current: i + 1, total: targets.length });

      try {
        await dispatchStatementForCustomer(item.customer, sched, false);
        sentCount++;
      } catch (err: any) {
        console.error(`Failed to send to ${item.customer.name}:`, err);
        failCount++;
      }
    }

    // Update lastRunAt on schedule
    await setDoc(
      doc(db, 'statementSchedules', sched.id),
      {
        lastRunAt: new Date().toISOString(),
        lastRunCount: sentCount,
        lastRunStatus: failCount === 0 ? 'success' : 'partial',
      },
      { merge: true }
    );

    setIsDispatching(false);
    setDispatchProgress(null);

    if (failCount === 0) {
      toast.success(`Successfully dispatched ${sentCount} account statements!`, { id: toastId });
    } else {
      toast.success(`Dispatched ${sentCount} statements (${failCount} skipped/failed).`, { id: toastId });
    }
  };

  // Send Single Test Statement
  const handleSendTestStatement = async () => {
    const targetCust = customers.find((c) => c.id === testCustomerId) || qualifyingAudience[0]?.customer;
    if (!targetCust) {
      toast.error('Please select a customer to send the test statement to.');
      return;
    }
    if (!targetCust.email) {
      toast.error(`Customer ${targetCust.name} does not have an email address configured.`);
      return;
    }

    const toastId = toast.loading(`Generating & sending test statement to ${targetCust.email}...`);
    try {
      await dispatchStatementForCustomer(targetCust, formData, true);
      toast.success(`Test statement successfully delivered to ${targetCust.email}!`, { id: toastId });
    } catch (err: any) {
      console.error('Test dispatch error:', err);
      toast.error(`Error delivering test statement: ${err.message || 'Check EmailJS setup'}`, { id: toastId });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Automated Statement Delivery Scheduler"
      size="xl"
      className="max-w-5xl w-full"
    >
      <div className="space-y-5 text-slate-800">
        {/* ── HEADER BANNER ── */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                Automated Dispatch
              </span>
              <span className="text-xs text-indigo-300 font-mono flex items-center gap-1">
                <Clock className="w-3 h-3" /> Monthly &amp; Quarterly Cycles
              </span>
            </div>
            <h3 className="text-lg font-bold mt-1 text-white tracking-tight flex items-center gap-2">
              <span>Customer Statement Email Automation</span>
            </h3>
            <p className="text-xs text-slate-300 mt-0.5 max-w-2xl leading-relaxed">
              Configure scheduled recurring delivery of certified PDF account statements to customers with verified
              opening/closing balances, aged debtor breakdown, and official digital signature.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
            <div className="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center text-white border border-white/10 shadow-xs">
              <CalendarClock className="w-6 h-6 text-indigo-300" />
            </div>
          </div>
        </div>

        {/* ── TOP NAVIGATION TABS ── */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setActiveTab('schedules')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'schedules'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarClock className="w-3.5 h-3.5" />
              <span>Configured Schedules</span>
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-black bg-indigo-100 text-indigo-800">
                {schedules.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (activeTab !== 'editor') handleStartNew();
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'editor'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{editingSchedule ? 'Edit Schedule' : 'New Schedule'}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('logs')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'logs' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>Dispatch History</span>
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-black bg-slate-200 text-slate-700">
                {deliveryLogs.length}
              </span>
            </button>
          </div>

          {activeTab === 'schedules' && (
            <button
              type="button"
              onClick={handleStartNew}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Schedule</span>
            </button>
          )}
        </div>

        {/* ── DISPATCH PROGRESS BAR (WHEN RUNNING) ── */}
        {isDispatching && dispatchProgress && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 space-y-2 animate-pulse">
            <div className="flex justify-between items-center text-xs font-bold text-indigo-900">
              <span className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
                <span>Generating &amp; emailing PDF account statements...</span>
              </span>
              <span>
                {dispatchProgress.current} / {dispatchProgress.total} Complete
              </span>
            </div>
            <div className="w-full h-2 bg-indigo-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-600 transition-all duration-300"
                style={{ width: `${(dispatchProgress.current / dispatchProgress.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* ── TAB 1: CONFIGURED SCHEDULES LIST ── */}
        {activeTab === 'schedules' && (
          <div className="space-y-4">
            {loadingSchedules ? (
              <div className="text-center py-12 text-slate-500 text-sm flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
                <span>Loading active statement schedules...</span>
              </div>
            ) : schedules.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 border border-slate-200 rounded-2xl p-6">
                <CalendarClock className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-slate-800">No statement schedules configured</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  Set up your first automated monthly or quarterly schedule to deliver certified PDF statements to clients.
                </p>
                <button
                  type="button"
                  onClick={handleStartNew}
                  className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition"
                >
                  Create Schedule Now
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3.5">
                {schedules.map((sched) => {
                  const audience = getQualifyingCustomers(sched);
                  const isMonthly = sched.frequency === 'monthly';

                  return (
                    <div
                      key={sched.id}
                      className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                        sched.enabled
                          ? 'bg-white border-slate-200 hover:border-indigo-300 shadow-2xs'
                          : 'bg-slate-50/70 border-slate-200/70 opacity-75'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                                sched.enabled
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  sched.enabled ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                                }`}
                              />
                              {sched.enabled ? 'Active Schedule' : 'Paused'}
                            </span>

                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase">
                              {isMonthly ? 'Monthly Cadence' : 'Quarterly Cadence'}
                            </span>

                            <span className="text-xs font-bold text-slate-500 font-mono">
                              {sched.deliveryTime || '09:00'} UK Time
                            </span>
                          </div>

                          <h4 className="text-sm font-bold text-slate-900 tracking-tight">{sched.name}</h4>

                          <p className="text-xs text-slate-500 leading-relaxed">
                            {isMonthly ? (
                              <>
                                Dispatched on{' '}
                                <strong className="text-slate-800">
                                  {sched.monthlyDay === '1'
                                    ? 'Day 1 of month'
                                    : sched.monthlyDay === '15'
                                    ? 'Day 15 of month'
                                    : sched.monthlyDay === 'last'
                                    ? 'Last calendar day of month'
                                    : `Day ${sched.monthlyDay}`}
                                </strong>{' '}
                                for previous calendar month activity.
                              </>
                            ) : (
                              <>
                                Dispatched on{' '}
                                <strong className="text-slate-800">
                                  {sched.quarterlyTiming === 'quarter_start'
                                    ? '1st day of every financial quarter (Jan, Apr, Jul, Oct)'
                                    : 'Last day of quarter'}
                                </strong>{' '}
                                for quarterly ledger review.
                              </>
                            )}
                          </p>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                          <button
                            type="button"
                            onClick={() => handleExecuteScheduleNow(sched)}
                            disabled={isDispatching}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                            title="Run automated statement dispatch immediately"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>Run Now</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleSchedule(sched)}
                            className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                              sched.enabled
                                ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            }`}
                            title={sched.enabled ? 'Pause automated execution' : 'Activate automated execution'}
                          >
                            {sched.enabled ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleStartEdit(sched)}
                            className="p-2 rounded-xl bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200 text-xs font-bold transition-all cursor-pointer"
                            title="Edit schedule configuration"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteSchedule(sched.id, sched.name)}
                            className="p-2 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 text-xs font-bold transition-all cursor-pointer"
                            title="Delete schedule"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Metric pills row */}
                      <div className="mt-3.5 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1 text-slate-600 font-medium">
                            <Users className="w-3.5 h-3.5 text-indigo-500" />
                            <span>Target:</span>
                            <strong className="text-slate-900 font-semibold">{audience.length} clients</strong>
                          </span>

                          <span className="flex items-center gap-1 text-slate-600 font-medium">
                            <Mail className="w-3.5 h-3.5 text-slate-400" />
                            <span>Email + PDF:</span>
                            <strong className="text-emerald-700 font-semibold">Enabled</strong>
                          </span>
                        </div>

                        <div className="text-[11px] text-slate-500">
                          {sched.lastRunAt ? (
                            <span>Last executed: {format(new Date(sched.lastRunAt), 'dd MMM yyyy, HH:mm')}</span>
                          ) : (
                            <span className="text-indigo-600 font-medium">Next run: {sched.nextRunDate || 'Pending'}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── TAB 2: SCHEDULE CONFIGURATION EDITOR ── */}
        {activeTab === 'editor' && (
          <form onSubmit={handleSaveSchedule} className="space-y-4">
            {/* 1. Schedule Basic Info */}
            <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200/90 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <CalendarClock className="w-4 h-4 text-indigo-600" />
                  <span>1. Schedule Identity &amp; Status</span>
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-medium">Schedule Enabled:</span>
                  <input
                    type="checkbox"
                    checked={formData.enabled}
                    onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Schedule Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Monthly Client Statement Dispatch"
                    className="w-full px-3 py-2 text-xs font-bold bg-white border border-slate-300 rounded-xl text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Delivery Time (24h)
                  </label>
                  <select
                    value={formData.deliveryTime}
                    onChange={(e) => setFormData({ ...formData, deliveryTime: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-bold bg-white border border-slate-300 rounded-xl text-slate-800"
                  >
                    {['06:00', '07:00', '08:00', '08:30', '09:00', '09:30', '10:00', '11:00', '12:00', '14:00', '17:00'].map(
                      (t) => (
                        <option key={t} value={t}>
                          {t} ({parseInt(t) < 12 ? `${t} AM` : `${parseInt(t) - (parseInt(t) > 12 ? 12 : 0)}:00 PM`})
                        </option>
                      )
                    )}
                  </select>
                </div>
              </div>
            </div>

            {/* 2. Recurrence Frequency (Monthly vs Quarterly) */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 space-y-3 shadow-2xs">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-indigo-600" />
                <span>2. Delivery Frequency &amp; Timing</span>
              </label>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, frequency: 'monthly' })}
                  className={`p-3.5 rounded-xl border text-left transition cursor-pointer ${
                    formData.frequency === 'monthly'
                      ? 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-500/20'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">Monthly Statements</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-indigo-100 text-indigo-700">
                      Every Month
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Deliver previous calendar month accounting statement automatically.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, frequency: 'quarterly' })}
                  className={`p-3.5 rounded-xl border text-left transition cursor-pointer ${
                    formData.frequency === 'quarterly'
                      ? 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-500/20'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">Quarterly Statements</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-purple-100 text-purple-700">
                      Every 3 Months
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Deliver comprehensive 3-month financial quarter statement.
                  </p>
                </button>
              </div>

              {/* Monthly Specifics */}
              {formData.frequency === 'monthly' && (
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-2">
                  <label className="block text-[11px] font-bold text-slate-600 uppercase">
                    Dispatch On Which Day of Month?
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { val: '1', label: '1st of Month (Recommended)', desc: 'Full prior month statement' },
                      { val: '15', label: '15th of Month', desc: 'Mid-month review' },
                      { val: 'last', label: 'Last Day of Month', desc: 'Month-end closing' },
                    ].map((opt) => (
                      <button
                        key={opt.val}
                        type="button"
                        onClick={() => setFormData({ ...formData, monthlyDay: opt.val })}
                        className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                          formData.monthlyDay === opt.val
                            ? 'bg-white border-indigo-600 ring-1 ring-indigo-600 shadow-2xs'
                            : 'bg-white/60 border-slate-200 hover:bg-white'
                        }`}
                      >
                        <span className="block text-xs font-bold text-slate-900">{opt.label}</span>
                        <span className="block text-[10px] text-slate-400 mt-0.5">{opt.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quarterly Specifics */}
              {formData.frequency === 'quarterly' && (
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-2">
                  <label className="block text-[11px] font-bold text-slate-600 uppercase">
                    Quarterly Execution Timing
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      {
                        val: 'quarter_start',
                        label: '1st Day of New Quarter (Recommended)',
                        desc: '01 Jan, 01 Apr, 01 Jul, 01 Oct',
                      },
                      {
                        val: 'quarter_end',
                        label: 'Last Day of Quarter',
                        desc: '31 Mar, 30 Jun, 30 Sep, 31 Dec',
                      },
                    ].map((opt) => (
                      <button
                        key={opt.val}
                        type="button"
                        onClick={() => setFormData({ ...formData, quarterlyTiming: opt.val as any })}
                        className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                          formData.quarterlyTiming === opt.val
                            ? 'bg-white border-indigo-600 ring-1 ring-indigo-600 shadow-2xs'
                            : 'bg-white/60 border-slate-200 hover:bg-white'
                        }`}
                      >
                        <span className="block text-xs font-bold text-slate-900">{opt.label}</span>
                        <span className="block text-[10px] text-slate-400 mt-0.5">{opt.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 3. Target Audience / Customer Scope */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-indigo-600" />
                  <span>3. Recipient Audience Rule</span>
                </label>
                <span className="text-xs font-bold font-mono text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-lg border border-indigo-200">
                  {qualifyingAudience.length} Clients Qualify Currently
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {[
                  {
                    val: 'all_with_invoices',
                    label: 'All Active Clients',
                    desc: 'Every client account with registered invoice history',
                  },
                  {
                    val: 'with_outstanding',
                    label: 'Outstanding Debtors Only',
                    desc: 'Clients with current unpaid balance (> £0)',
                  },
                  {
                    val: 'selected',
                    label: 'Specific Selected Clients',
                    desc: 'Choose custom corporate clients manually',
                  },
                ].map((aud) => (
                  <button
                    key={aud.val}
                    type="button"
                    onClick={() => setFormData({ ...formData, audienceFilter: aud.val as any })}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                      formData.audienceFilter === aud.val
                        ? 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-500/20'
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span className="block text-xs font-bold text-slate-900">{aud.label}</span>
                    <span className="block text-[10px] text-slate-500 mt-1 leading-snug">{aud.desc}</span>
                  </button>
                ))}
              </div>

              {/* Specific Client Multi-Select */}
              {formData.audienceFilter === 'selected' && (
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                  <span className="text-xs font-bold text-slate-700 block">
                    Choose Specific Clients ({formData.selectedCustomerIds?.length || 0} selected):
                  </span>
                  <div className="max-h-40 overflow-y-auto space-y-1.5 bg-white p-2.5 rounded-xl border border-slate-200">
                    {customers.map((cust) => {
                      const isChecked = formData.selectedCustomerIds?.includes(cust.id);
                      return (
                        <label
                          key={cust.id}
                          className="flex items-center justify-between text-xs p-1.5 rounded-lg hover:bg-slate-50 cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={Boolean(isChecked)}
                              onChange={(e) => {
                                const current = formData.selectedCustomerIds || [];
                                if (e.target.checked) {
                                  setFormData({ ...formData, selectedCustomerIds: [...current, cust.id] });
                                } else {
                                  setFormData({
                                    ...formData,
                                    selectedCustomerIds: current.filter((id) => id !== cust.id),
                                  });
                                }
                              }}
                              className="w-4 h-4 text-indigo-600 rounded"
                            />
                            <span className="font-semibold text-slate-800">{cust.name}</span>
                          </div>
                          <span className="text-slate-400 font-mono text-[11px]">{cust.email || 'No Email'}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* 4. PDF Statement Options */}
            <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200/90 space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-indigo-600" />
                <span>4. Certified Statement Content Options</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label className="flex items-center gap-2 p-2.5 bg-white rounded-xl border border-slate-200 cursor-pointer text-xs font-semibold text-slate-800">
                  <input
                    type="checkbox"
                    checked={formData.includeSignature}
                    onChange={(e) => setFormData({ ...formData, includeSignature: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span>Include Digital Signature</span>
                </label>

                <label className="flex items-center gap-2 p-2.5 bg-white rounded-xl border border-slate-200 cursor-pointer text-xs font-semibold text-slate-800">
                  <input
                    type="checkbox"
                    checked={formData.includeLedger}
                    onChange={(e) => setFormData({ ...formData, includeLedger: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span>Include Itemized Ledger</span>
                </label>

                <label className="flex items-center gap-2 p-2.5 bg-white rounded-xl border border-slate-200 cursor-pointer text-xs font-semibold text-slate-800">
                  <input
                    type="checkbox"
                    checked={formData.includeBankDetails}
                    onChange={(e) => setFormData({ ...formData, includeBankDetails: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span>Include Bank Pay Details</span>
                </label>
              </div>
            </div>

            {/* 5. Email Template Configuration */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 space-y-3 shadow-2xs">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-indigo-600" />
                <span>5. Email Delivery Message &amp; Placeholders</span>
              </label>

              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Subject Line Template
                  </label>
                  <input
                    type="text"
                    value={formData.emailSubject}
                    onChange={(e) => setFormData({ ...formData, emailSubject: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:bg-white"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-1 text-[11px]">
                  <span className="text-slate-400 font-bold uppercase text-[10px] mr-1">Available Tags:</span>
                  {['{customer_name}', '{period}', '{balance}', '{company_name}', '{account_number}'].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setFormData({ ...formData, emailMessage: formData.emailMessage + ' ' + tag })}
                      className="px-2 py-0.5 rounded bg-slate-100 text-indigo-700 font-mono text-[10px] hover:bg-indigo-50 border border-slate-200 transition cursor-pointer"
                    >
                      {tag}
                    </button>
                  ))}
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Email Body Message
                  </label>
                  <textarea
                    rows={5}
                    value={formData.emailMessage}
                    onChange={(e) => setFormData({ ...formData, emailMessage: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:bg-white leading-relaxed font-sans"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      CC Internal Email
                    </label>
                    <input
                      type="email"
                      value={formData.ccEmails}
                      onChange={(e) => setFormData({ ...formData, ccEmails: e.target.value })}
                      placeholder="finance@aieskyline.com"
                      className="w-full px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-300 rounded-xl text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      PDF Attachment
                    </label>
                    <div className="px-3 py-2 text-xs font-bold text-indigo-700 bg-indigo-50/70 border border-indigo-200 rounded-xl flex items-center gap-2">
                      <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span>Certified Account Statement.pdf (Auto-attached)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 6. Test Send & Actions Bar */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select
                  value={testCustomerId}
                  onChange={(e) => setTestCustomerId(e.target.value)}
                  className="px-3 py-2 text-xs font-bold bg-white border border-slate-300 rounded-xl text-slate-800 max-w-xs"
                >
                  <option value="">Sample Client for Test Send</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.email || 'No email'})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleSendTestStatement}
                  className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold shadow-xs transition cursor-pointer flex items-center gap-1.5 shrink-0"
                >
                  <Send className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Send Test Email</span>
                </button>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setActiveTab('schedules')}
                  className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Save Schedule</span>
                </button>
              </div>
            </div>
          </form>
        )}

        {/* ── TAB 3: DISPATCH HISTORY / AUDIT LOGS ── */}
        {activeTab === 'logs' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Delivered Statements Audit Log ({deliveryLogs.length} Total)
              </h4>
              {deliveryLogs.length > 0 && (
                <button
                  type="button"
                  onClick={async () => {
                    if (!window.confirm('Clear all local dispatch logs?')) return;
                    deliveryLogs.forEach(async (l) => {
                      try {
                        await deleteDoc(doc(db, 'statementDeliveryLogs', l.id));
                      } catch {}
                    });
                    setDeliveryLogs([]);
                    toast.success('Logs cleared');
                  }}
                  className="text-xs text-rose-600 hover:underline cursor-pointer"
                >
                  Clear History
                </button>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-xs">
              <div className="overflow-x-auto max-h-96">
                <table className="min-w-full divide-y divide-slate-100 text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3 text-left">Timestamp</th>
                      <th className="px-4 py-3 text-left">Client</th>
                      <th className="px-4 py-3 text-left">Email Address</th>
                      <th className="px-4 py-3 text-left">Period Covered</th>
                      <th className="px-4 py-3 text-right">Balance</th>
                      <th className="px-4 py-3 text-center">Status</th>
                      <th className="px-4 py-3 text-left">Trigger Type</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {deliveryLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap font-mono text-[11px]">
                          {format(new Date(log.dispatchedAt), 'dd/MM/yyyy HH:mm')}
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-900">{log.customerName}</td>
                        <td className="px-4 py-3 font-mono text-slate-600">{log.customerEmail}</td>
                        <td className="px-4 py-3 font-medium">{log.periodLabel}</td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                          {formatCurrency(log.totalOutstanding)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            <CheckCheck className="w-3 h-3 mr-0.5 text-emerald-600" /> Delivered
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500">{log.notes || 'Automated'}</td>
                      </tr>
                    ))}
                    {deliveryLogs.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-slate-400 font-medium">
                          No statement dispatches logged yet. Use "Run Now" or "Send Test Email" to test.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default StatementSchedulerModal;
