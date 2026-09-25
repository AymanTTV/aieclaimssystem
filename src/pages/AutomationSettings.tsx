// src/pages/AutomationSettings.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { db } from '../lib/firebase';
import { collection, getDocs, doc, setDoc, deleteDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { 
  Save, 
  Tag, 
  FileText, 
  MessageSquare, 
  Plus, 
  Undo2, 
  Redo2, 
  ShieldAlert, 
  Trash2, 
  Mail, 
  Play, 
  Loader2, 
  CheckCircle2, 
  Clock, 
  HelpCircle, 
  Search,
  Calendar,
  Sparkles,
  Sliders,
  RefreshCw,
  Folder,
  Send,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';
import { emailTemplates, EmailType } from '../constants/emailTemplates';
import { usePermissions } from '../hooks/usePermissions';
import { runMondayAutoEmailJob } from '../jobs/mondayAutoEmailJob';
import {
  DAYS_OF_WEEK,
  SCHEDULE_TIME_OPTIONS,
  formatTime12h,
  generateCronExpression,
  getDayInfo,
  fetchSchedulerPreferences,
  saveSchedulerPreferences,
} from '../utils/schedulerConfig';
import { 
  AppMessageTemplate, 
  loadTemplatesForCategory, 
  saveAppTemplate, 
  markTemplateAsDeleted,
  isTemplateInCategory 
} from '../utils/templateManager';
import { TemplateGuideModal } from '../components/common/TemplateGuideModal';
import { DynamicTag } from '../types/dynamicTags';
import {
  subscribeToDynamicTags,
  saveDynamicTag,
  deleteDynamicTag,
} from '../utils/dynamicTagsService';

// Categorized Dynamic Placeholders for all modules (A through H)
export interface TagSubgroup {
  label: string;
  tags: string[];
}

export interface TagCategorySection {
  id: string;
  name: string;
  badge: string;
  color: 'blue' | 'emerald' | 'purple' | 'amber' | 'rose' | 'teal' | 'indigo' | 'cyan';
  tags?: string[];
  subgroups?: TagSubgroup[];
}

export const CATEGORIZED_TAGS: TagCategorySection[] = [
  {
    id: 'global',
    name: 'A. Global & Customer Tags',
    badge: 'Global',
    color: 'blue',
    tags: [
      '{recipient_name}',
      '{customer_name}',
      '{driver_name}',
      '{today_date}',
      '{customer_phone}',
      '{customer_email}',
      '{customer_address}',
    ],
  },
  {
    id: 'vehicle',
    name: 'B. Vehicle Tags',
    badge: 'Fleet',
    color: 'emerald',
    tags: [
      '{vehicle_reg}',
      '{make_model}',
      '{year}',
      '{mileage}',
      '{purchased_date}',
      '{insurance_expiry}',
      '{mot_expiry}',
      '{tax_expiry}',
      '{last_maintenance}',
      '{next_maintenance}',
    ],
  },
  {
    id: 'rental',
    name: 'C. Rental & Financial Tags (Expanded)',
    badge: 'Rental',
    color: 'purple',
    subgroups: [
      {
        label: 'Timestamps',
        tags: [
          '{start_date}',
          '{start_time}',
          '{end_date}',
          '{end_time}',
          '{rental_duration_days}',
        ],
      },
      {
        label: 'Core Totals',
        tags: [
          '{net_amount}',
          '{vat_total}',
          '{grand_total}',
          '{total_amount}',
          '{subtotal}',
        ],
      },
      {
        label: 'Payment & Balances',
        tags: [
          '{amount_paid}',
          '{total_paid}',
          '{owing_amount}',
          '{outstanding_balance}',
          '{last_paid_amount}',
          '{payment_date}',
          '{last_txn_summary}',
        ],
      },
      {
        label: 'Breakdown Charges',
        tags: [
          '{extra_charges}',
          '{fuel_charges}',
          '{vehicle_damage_charges}',
          '{return_charges}',
          '{discount_amount}',
          '{holiday_discount_amount}',
        ],
      },
      {
        label: 'Payment Methods',
        tags: ['{payment_type}'],
      },
      {
        label: 'Document Links',
        tags: [
          '{pdf_doc_link}',
          '{agreement_number}',
          '{rental_status}',
        ],
      },
    ],
  },
  {
    id: 'maintenance',
    name: 'D. Maintenance Tags',
    badge: 'Maintenance',
    color: 'amber',
    tags: [
      '{maintenance_order_id}',
      '{service_type}',
      '{garage_name}',
      '{garage_address}',
      '{scheduled_date}',
      '{inspection_type}',
      '{maintenance_status}',
      '{maintenance_notes}',
    ],
  },
  {
    id: 'claim',
    name: 'E. Claim Tags',
    badge: 'Claims',
    color: 'rose',
    tags: [
      '{claim_id}',
      '{client_ref}',
      '{incident_date}',
      '{claim_status}',
      '{progress_stage}',
      '{legal_handler_name}',
      '{legal_handler_firm}',
      '{legal_handler_email}',
      '{legal_handler_phone}',
      '{latest_update_notes}',
      '{next_steps}',
    ],
  },
  {
    id: 'driverPay',
    name: 'F. Driver Pay Tags',
    badge: 'Driver Pay',
    color: 'teal',
    tags: [
      '{payment_id}',
      '{driver_pay_amount}',
      '{payment_status}',
      '{period_start}',
      '{period_end}',
      '{driver_pay_notes}',
    ],
  },
  {
    id: 'invoice',
    name: 'G. Invoice & Finance Tags',
    badge: 'Invoice / Finance',
    color: 'indigo',
    tags: [
      '{invoice_number}',
      '{invoice_date}',
      '{invoice_due_date}',
      '{invoice_status}',
      '{full_statement}',
      '{lloyds_bank_details}',
    ],
  },
  {
    id: 'members',
    name: 'H. Members Tags',
    badge: 'Members',
    color: 'cyan',
    tags: [
      '{member_id}',
      '{membership_type}',
      '{membership_status}',
      '{join_date}',
      '{renewal_date}',
    ],
  },
];

export const CATEGORIES: { id: string; label: string; icon: string }[] = [
  { id: 'finance', label: 'Finance', icon: '💼' },
  { id: 'rental', label: 'Rental', icon: '🚗' },
  { id: 'maintenance', label: 'Maintenance', icon: '🔧' },
  { id: 'invoice', label: 'Invoice', icon: '📄' },
  { id: 'claim', label: 'Claim', icon: '🛡️' },
  { id: 'driverPay', label: 'Driver Pay', icon: '👤' },
  { id: 'members', label: 'Members', icon: '👥' },
  { id: 'custom', label: 'Custom', icon: '⚙️' },
];

export interface ScheduledEmailTemplate {
  id: string;
  name: string;
  category: string;
  isScheduler: boolean;
  channel: 'email';
  triggerFrequency: 'weekly' | 'daily' | 'monthly' | 'custom';
  targetCondition: 'owing_positive' | 'expiring_7_days' | 'unpaid_invoices' | 'active_records' | 'custom_condition';
  isActive: boolean;
  subjectTemplate: string;
  bodyTemplate: string;
  updatedAt?: any;
}

export const DEFAULT_SCHEDULER_TEMPLATES: Record<string, ScheduledEmailTemplate[]> = {
  rental: [
    {
      id: 'sched_rental_weekly_statement',
      name: 'Weekly Rental Statement & Balance Reminder',
      category: 'rental',
      isScheduler: true,
      channel: 'email',
      triggerFrequency: 'weekly',
      targetCondition: 'owing_positive',
      isActive: true,
      subjectTemplate: 'Weekly Rental Statement & Balance - {vehicle_reg}',
      bodyTemplate: `Dear {recipient_name},

This is an automated reminder regarding your active vehicle rental ({vehicle_reg} - {make_model}).

Rental Summary:
• Agreement Number: {agreement_number}
• Period: {start_date} to {end_date}
• Total Amount: {total_amount}
• Total Paid: {total_paid}
• Outstanding Balance: {outstanding_balance}

Please ensure any owing balance is cleared promptly to keep your account in good standing.

Bank Transfer Details:
{lloyds_bank_details}

Kind regards,
AIE Skyline Limited`,
    },
    {
      id: 'sched_rental_daily_overdue',
      name: 'Daily Rental Overdue Payment Notice',
      category: 'rental',
      isScheduler: true,
      channel: 'email',
      triggerFrequency: 'daily',
      targetCondition: 'owing_positive',
      isActive: true,
      subjectTemplate: 'Daily Rental Payment Reminder - {vehicle_reg}',
      bodyTemplate: `Dear {customer_name},

Your daily rental for vehicle {vehicle_reg} ({make_model}) has an outstanding balance of {outstanding_balance}.

Total Amount: {total_amount}
Amount Paid: {amount_paid}
Owing Amount: {owing_amount}

Please remit payment using your document link: {pdf_doc_link} or via bank transfer.

AIE Skyline Limited`,
    },
  ],
  finance: [
    {
      id: 'sched_finance_ledger_statement',
      name: 'Automated Ledger Balance Statement',
      category: 'finance',
      isScheduler: true,
      channel: 'email',
      triggerFrequency: 'weekly',
      targetCondition: 'owing_positive',
      isActive: true,
      subjectTemplate: 'Statement of Account & Outstanding Balance - {customer_name}',
      bodyTemplate: `Dear {recipient_name},

Please find your automated account statement for {today_date}.

Account Summary:
• Total Billed: {grand_total}
• Total Paid: {total_paid}
• Outstanding Balance: {outstanding_balance}
• Last Payment: {payment_date} ({last_paid_amount})

Bank Transfer Details:
{lloyds_bank_details}

Kind regards,
Finance Department
AIE Skyline Limited`,
    },
  ],
  maintenance: [
    {
      id: 'sched_maintenance_service_reminder',
      name: 'Scheduled MOT & Maintenance Reminder',
      category: 'maintenance',
      isScheduler: true,
      channel: 'email',
      triggerFrequency: 'weekly',
      targetCondition: 'expiring_7_days',
      isActive: true,
      subjectTemplate: 'Scheduled Vehicle Maintenance Alert - {vehicle_reg}',
      bodyTemplate: `Dear {recipient_name},

Vehicle {vehicle_reg} ({make_model}) is scheduled for upcoming maintenance inspection.

Maintenance Details:
• Order ID: {maintenance_order_id}
• Service Type: {service_type}
• Garage: {garage_name} ({garage_address})
• Scheduled Date: {scheduled_date}
• MOT Expiry: {mot_expiry}
• Current Mileage: {mileage}

Please ensure the vehicle is presented at the garage on the scheduled date.

Workshop & Fleet Team
AIE Skyline Limited`,
    },
  ],
  invoice: [
    {
      id: 'sched_invoice_due_statement',
      name: 'Automated Invoice Due & Statement Notice',
      category: 'invoice',
      isScheduler: true,
      channel: 'email',
      triggerFrequency: 'weekly',
      targetCondition: 'unpaid_invoices',
      isActive: true,
      subjectTemplate: 'Invoice #{invoice_number} Payment Reminder - Due {invoice_due_date}',
      bodyTemplate: `Dear {customer_name},

This is an automated notification regarding Invoice #{invoice_number} issued on {invoice_date}.

Invoice Details:
• Invoice Number: {invoice_number}
• Due Date: {invoice_due_date}
• Total Amount: {total_amount}
• Outstanding Amount: {owing_amount}
• Status: {invoice_status}

Payment can be made directly to our account:
{lloyds_bank_details}

Kind regards,
Accounts Receivable
AIE Skyline Limited`,
    },
  ],
  claim: [
    {
      id: 'sched_claim_case_progress',
      name: 'Automated Claim Case Progress Notice',
      category: 'claim',
      isScheduler: true,
      channel: 'email',
      triggerFrequency: 'weekly',
      targetCondition: 'active_records',
      isActive: true,
      subjectTemplate: 'Claim #{claim_id} Progress Update - {vehicle_reg}',
      bodyTemplate: `Dear {client_ref},

Here is an automated update regarding Claim #{claim_id} for incident on {incident_date}.

Claim Summary:
• Claim Status: {claim_status}
• Current Stage: {progress_stage}
• Legal Handler: {legal_handler_name} ({legal_handler_firm})
• Handler Contact: {legal_handler_email} | {legal_handler_phone}

Latest Notes:
{latest_update_notes}

Next Steps:
{next_steps}

AIE Claims Ltd`,
    },
  ],
  driverPay: [
    {
      id: 'sched_driverpay_remittance',
      name: 'Weekly Driver Pay Remittance Summary',
      category: 'driverPay',
      isScheduler: true,
      channel: 'email',
      triggerFrequency: 'weekly',
      targetCondition: 'active_records',
      isActive: true,
      subjectTemplate: 'Driver Pay Statement - {driver_name} (Ref: {payment_id})',
      bodyTemplate: `Dear {driver_name},

Your driver pay settlement for period {period_start} to {period_end} has been processed.

Settlement Details:
• Payment Reference: {payment_id}
• Net Payout Amount: {driver_pay_amount}
• Payment Status: {payment_status}

Notes:
{driver_pay_notes}

AIE Skyline Fleet Management`,
    },
  ],
  members: [
    {
      id: 'sched_members_renewal_notice',
      name: 'Automated Membership Renewal Notice',
      category: 'members',
      isScheduler: true,
      channel: 'email',
      triggerFrequency: 'weekly',
      targetCondition: 'expiring_7_days',
      isActive: true,
      subjectTemplate: 'Membership Renewal Reminder - Member #{member_id}',
      bodyTemplate: `Dear {customer_name},

This is an automated notice regarding your membership #{member_id}.

Membership Details:
• Type: {membership_type}
• Status: {membership_status}
• Joined Date: {join_date}
• Renewal Due: {renewal_date}

Please contact us if you wish to adjust your membership tier or details.

Member Services Team
AIE Skyline Limited`,
    },
  ],
  custom: [
    {
      id: 'sched_custom_broadcast',
      name: 'Universal Scheduled Broadcast Notice',
      category: 'custom',
      isScheduler: true,
      channel: 'email',
      triggerFrequency: 'custom',
      targetCondition: 'active_records',
      isActive: true,
      subjectTemplate: 'Important Fleet Notification - {today_date}',
      bodyTemplate: `Dear {recipient_name},

Please review the following automated fleet notification for {today_date}.

Assigned Vehicle: {vehicle_reg} ({make_model})
Account Status: {outstanding_balance}

For any queries, please reach out to admin@aieskyline.co.uk.

AIE Skyline Limited`,
    },
  ],
};

export default function AutomationSettings() {
  const { can, isAdmin } = usePermissions();
  const canUpdate = isAdmin || can('automation', 'update') || can('automation', 'templateEdit') || can('whatsapp', 'template') || can('bulkEmail', 'template');
  const canDelete = isAdmin || can('automation', 'delete') || can('automation', 'templateDelete') || can('whatsapp', 'delete') || can('bulkEmail', 'delete');
  const canCreate = isAdmin || can('automation', 'create') || can('automation', 'templateCreate') || can('whatsapp', 'template') || can('bulkEmail', 'template');
  const canToggleMondayAutoEmail = isAdmin || can('automation', 'mondayAutoEmail') || can('automation', 'toggleGlobal') || can('automation', 'update');
  const canManageScheduler = isAdmin || can('automation', 'scheduler') || can('automation', 'update');

  // Top-Level Hub Mode: 'templates' (Message Templates Hub) or 'scheduler' (Automated Bulk Email Scheduler Hub)
  const [hubTab, setHubTab] = useState<'templates' | 'scheduler'>('templates');

  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('finance');
  const [channelFilter, setChannelFilter] = useState<'all' | 'whatsapp' | 'email'>('all');
  
  // Message Templates Editor State
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [tagSearchQuery, setTagSearchQuery] = useState('');

  // Dynamic Parameter Tags Management State
  const [customTags, setCustomTags] = useState<DynamicTag[]>([]);
  const [showAddTagModal, setShowAddTagModal] = useState<boolean>(false);
  const [newTagForm, setNewTagForm] = useState<{
    tag: string;
    label: string;
    category: string;
    sampleValue: string;
    description: string;
  }>({
    tag: '',
    label: '',
    category: 'global',
    sampleValue: '',
    description: '',
  });
  const [isSavingTag, setIsSavingTag] = useState<boolean>(false);

  // Subscribe to real-time dynamic tags updates
  useEffect(() => {
    const unsub = subscribeToDynamicTags((allTags) => {
      setCustomTags(allTags.filter((t) => t.isCustom));
    });
    return () => unsub();
  }, []);

  // Handle create/save new dynamic tag
  const handleSaveDynamicTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagForm.tag.trim()) {
      toast.error('Please enter a tag key (e.g. {customer_name})');
      return;
    }
    if (!newTagForm.label.trim()) {
      toast.error('Please enter a display label');
      return;
    }

    setIsSavingTag(true);
    try {
      await saveDynamicTag({
        tag: newTagForm.tag,
        label: newTagForm.label,
        category: newTagForm.category || 'global',
        sampleValue: newTagForm.sampleValue || 'Sample Value',
        description: newTagForm.description,
      });
      toast.success(`Dynamic tag ${newTagForm.tag} created & synced successfully!`);
      setShowAddTagModal(false);
      setNewTagForm({
        tag: '',
        label: '',
        category: 'global',
        sampleValue: '',
        description: '',
      });
    } catch (err: any) {
      console.error('Failed to save dynamic tag:', err);
      toast.error(err.message || 'Failed to save dynamic tag');
    } finally {
      setIsSavingTag(false);
    }
  };

  // Handle delete dynamic tag
  const handleDeleteDynamicTag = async (tagId: string, tagName: string) => {
    if (!window.confirm(`Are you sure you want to delete parameter tag ${tagName}?`)) {
      return;
    }
    try {
      await deleteDynamicTag(tagId);
      toast.success(`Tag ${tagName} removed.`);
    } catch (err: any) {
      console.error('Failed to delete dynamic tag:', err);
      toast.error('Failed to delete tag');
    }
  };

  // Field Tracking for Cursor Insertion in Message Templates
  const [activeField, setActiveField] = useState<'subjectTemplate' | 'bodyTemplate'>('bodyTemplate');
  const subjectRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  // Undo / Redo History Stack for Message Templates
  const [history, setHistory] = useState<any[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // ───────── AUTOMATED BULK EMAIL SCHEDULER STATE ─────────
  const [schedulerTemplates, setSchedulerTemplates] = useState<ScheduledEmailTemplate[]>([]);
  const [schedulerActiveCategory, setSchedulerActiveCategory] = useState<string>('rental');
  const [selectedSchedulerTemplateId, setSelectedSchedulerTemplateId] = useState<string | null>(null);
  const [editingSchedulerTemplate, setEditingSchedulerTemplate] = useState<ScheduledEmailTemplate | null>(null);
  const [savingScheduler, setSavingScheduler] = useState(false);
  const [schedulerActiveField, setSchedulerActiveField] = useState<'subjectTemplate' | 'bodyTemplate'>('bodyTemplate');
  const schedulerSubjectRef = useRef<HTMLInputElement>(null);
  const schedulerBodyRef = useRef<HTMLTextAreaElement>(null);
  const [schedulerHistory, setSchedulerHistory] = useState<ScheduledEmailTemplate[]>([]);
  const [schedulerHistoryIndex, setSchedulerHistoryIndex] = useState(-1);
  const schedulerDebounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Global Automated Weekly Email Scheduler State
  const [globalAutoEmailEnabled, setGlobalAutoEmailEnabled] = useState<boolean>(true);
  const [isUpdatingGlobalToggle, setIsUpdatingGlobalToggle] = useState<boolean>(false);
  const [isRunningMondayJob, setIsRunningMondayJob] = useState<boolean>(false);
  const [scheduleDay, setScheduleDay] = useState<number>(1);
  const [scheduleTime, setScheduleTime] = useState<string>('09:00');
  const [isSavingSchedule, setIsSavingSchedule] = useState<boolean>(false);

  // Load global_auto_email_enabled and scheduler preferences
  useEffect(() => {
    const loadGlobalSetting = async () => {
      try {
        const sched = await fetchSchedulerPreferences();
        setScheduleDay(sched.scheduleDay);
        setScheduleTime(sched.scheduleTime);

        const snap = await getDoc(doc(db, 'system_settings', 'global_config'));
        if (snap.exists()) {
          const data = snap.data();
          if (data?.schedule_day !== undefined) {
            setScheduleDay(Number(data.schedule_day));
          }
          if (data?.schedule_time) {
            setScheduleTime(data.schedule_time);
          }
          if (data?.global_auto_email_enabled !== undefined) {
            setGlobalAutoEmailEnabled(data.global_auto_email_enabled !== false);
            return;
          }
        }
        const setSnap = await getDoc(doc(db, 'settings', 'automation'));
        if (setSnap.exists()) {
          const data = setSnap.data();
          if (data?.global_auto_email_enabled !== undefined) {
            setGlobalAutoEmailEnabled(data.global_auto_email_enabled !== false);
            return;
          }
        }
        const local = localStorage.getItem('global_auto_email_enabled');
        if (local !== null) {
          setGlobalAutoEmailEnabled(local !== 'false');
        }
      } catch (err) {
        const local = localStorage.getItem('global_auto_email_enabled');
        if (local !== null) {
          setGlobalAutoEmailEnabled(local !== 'false');
        }
      }
    };
    loadGlobalSetting();
  }, []);

  const dayInfo = getDayInfo(scheduleDay);
  const formattedTime = formatTime12h(scheduleTime);
  const cronExpr = generateCronExpression(scheduleDay, scheduleTime);

  const canViewAutomation = can('automation', 'view');

  // Load both manual templates and scheduler templates
  const fetchAllTemplates = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch general templates
      const allTemplates = await loadTemplatesForCategory('all');
      setTemplates(allTemplates);

      // 2. Fetch scheduled email templates
      const snap = await getDocs(collection(db, 'messageTemplates'));
      const loadedSched: ScheduledEmailTemplate[] = [];
      snap.docs.forEach((d) => {
        const data = d.data();
        if (data.isDeleted) return;
        if (data.isScheduler === true || data.channel === 'bulk_email') {
          loadedSched.push({
            id: d.id,
            name: data.name || 'Scheduled Email Template',
            category: data.category || 'rental',
            isScheduler: true,
            channel: 'email',
            triggerFrequency: data.triggerFrequency || 'weekly',
            targetCondition: data.targetCondition || 'owing_positive',
            isActive: data.isActive !== false,
            subjectTemplate: data.subjectTemplate || '',
            bodyTemplate: data.bodyTemplate || '',
            updatedAt: data.updatedAt,
          });
        }
      });

      // Merge with defaults for categories
      const finalSched = [...loadedSched];
      Object.entries(DEFAULT_SCHEDULER_TEMPLATES).forEach(([catKey, defaultList]) => {
        defaultList.forEach((def) => {
          if (!finalSched.some((t) => t.id === def.id || (t.category === catKey && t.name === def.name))) {
            finalSched.push(def);
          }
        });
      });

      setSchedulerTemplates(finalSched);

      // Auto-select first scheduler template if none selected
      if (!selectedSchedulerTemplateId && finalSched.length > 0) {
        const initialRental = finalSched.find((t) => t.category === 'rental') || finalSched[0];
        setSelectedSchedulerTemplateId(initialRental.id);
        setEditingSchedulerTemplate({ ...initialRental });
        setSchedulerHistory([{ ...initialRental }]);
        setSchedulerHistoryIndex(0);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error('Failed to load templates.');
    } finally {
      setLoading(false);
    }
  }, [selectedSchedulerTemplateId]);

  useEffect(() => {
    if (canViewAutomation) {
      fetchAllTemplates();
    } else {
      setLoading(false);
    }

    const handleSync = () => {
      if (canViewAutomation) fetchAllTemplates();
    };
    window.addEventListener('template_saved', handleSync);
    window.addEventListener('template_deleted', handleSync);
    return () => {
      window.removeEventListener('template_saved', handleSync);
      window.removeEventListener('template_deleted', handleSync);
    };
  }, [canViewAutomation, fetchAllTemplates]);

  // Global toggle handler
  const handleToggleGlobalAutoEmail = async () => {
    if (!canToggleMondayAutoEmail) {
      toast.error('You do not have permission to modify Monday auto-email settings.');
      return;
    }
    if (isUpdatingGlobalToggle) return;
    const nextVal = !globalAutoEmailEnabled;
    setIsUpdatingGlobalToggle(true);

    try {
      setGlobalAutoEmailEnabled(nextVal);
      localStorage.setItem('global_auto_email_enabled', String(nextVal));

      try {
        await setDoc(doc(db, 'system_settings', 'global_config'), {
          global_auto_email_enabled: nextVal,
          updatedAt: serverTimestamp(),
        }, { merge: true });

        await setDoc(doc(db, 'settings', 'automation'), {
          global_auto_email_enabled: nextVal,
          updatedAt: serverTimestamp(),
        }, { merge: true });
      } catch (dbErr) {
        console.warn('Firestore write notice:', dbErr);
      }

      toast.success(
        nextVal
          ? 'Global automated bulk email scheduler enabled'
          : 'Global automated bulk email scheduler paused'
      );
    } catch (err) {
      console.error('Failed to update global auto-email setting:', err);
      toast.error('Failed to update global setting');
      setGlobalAutoEmailEnabled(!nextVal);
    } finally {
      setIsUpdatingGlobalToggle(false);
    }
  };

  const handleManualRunJob = async () => {
    if (!canToggleMondayAutoEmail) {
      toast.error('You do not have permission to run Monday auto-email batches.');
      return;
    }
    setIsRunningMondayJob(true);
    const toastId = toast.loading('Running Automated Bulk Email test batch...');
    try {
      const res = await runMondayAutoEmailJob({ isTestRun: true });
      toast.success(res.message, { id: toastId, duration: 6000 });
    } catch (err: any) {
      console.error('Error running test batch:', err);
      toast.error(`Test batch error: ${err?.message || 'Failed to execute'}`, { id: toastId });
    } finally {
      setIsRunningMondayJob(false);
    }
  };

  const handleSaveScheduleConfig = async (newDay: number, newTime: string) => {
    if (!canManageScheduler) {
      toast.error('You do not have permission to modify scheduler preferences.');
      return;
    }
    setIsSavingSchedule(true);
    const toastId = toast.loading('Saving schedule preferences...');
    try {
      await saveSchedulerPreferences(newDay, newTime);
      await setDoc(
        doc(db, 'system_settings', 'global_config'),
        {
          schedule_day: newDay,
          schedule_time: newTime,
          schedule_cron: generateCronExpression(newDay, newTime),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      toast.success('Schedule preferences saved successfully!', { id: toastId });
    } catch (err) {
      console.error('Failed to save schedule preferences:', err);
      toast.error('Failed to save schedule preferences.', { id: toastId });
    } finally {
      setIsSavingSchedule(false);
    }
  };

  // ───────── MESSAGE TEMPLATES HANDLERS ─────────
  const pushToHistory = useCallback((tpl: any) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(tpl);
      if (newHistory.length > 50) newHistory.shift(); 
      setHistoryIndex(newHistory.length - 1);
      return newHistory;
    });
  }, [historyIndex]);

  const handleSelectTemplate = (tpl: any) => {
    setSelectedTemplateId(tpl.id);
    setEditingTemplate({ ...tpl });
    setHistory([{ ...tpl }]);
    setHistoryIndex(0);
  };

  const undo = useCallback(() => {
    if (historyIndex > 0 && canUpdate) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setEditingTemplate(history[newIndex]);
    }
  }, [history, historyIndex, canUpdate]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1 && canUpdate) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setEditingTemplate(history[newIndex]);
    }
  }, [history, historyIndex, canUpdate]);

  const handleEditorChange = (field: 'subjectTemplate' | 'bodyTemplate' | 'name' | 'channel', value: string) => {
    if (!canUpdate) return;
    const newTpl = { ...editingTemplate, [field]: value };
    setEditingTemplate(newTpl);

    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      pushToHistory(newTpl);
    }, 500);
  };

  const handleCreateNew = () => {
    if (!canCreate) return;
    const newId = `${activeCategory}_custom_${Date.now()}`;
    const newTpl = {
      id: newId,
      category: activeCategory,
      channel: 'all',
      name: 'New Custom Template',
      subjectTemplate: '',
      bodyTemplate: '',
      requiredFields: []
    };
    setTemplates(prev => [...prev, newTpl]);
    handleSelectTemplate(newTpl);
    setTimeout(() => subjectRef.current?.focus(), 100);
  };

  const handleSave = async () => {
    if (!editingTemplate || !canUpdate) return;
    setSaving(true);
    try {
      const saved = await saveAppTemplate(editingTemplate);
      setTemplates(prev => prev.map(t => (t.id === saved.id ? saved : t)));
      toast.success('Template saved successfully!');
    } catch (error) {
      console.error(error);
      toast.error('Failed to save template.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editingTemplate || !canDelete) return;
    if (!window.confirm(`Are you sure you want to delete "${editingTemplate.name}"?\n\nThis will permanently remove it from your WhatsApp and Email template menus.`)) return;

    setSaving(true);
    try {
      await markTemplateAsDeleted(editingTemplate.id, editingTemplate.category);
      setTemplates(prev => prev.filter(t => t.id !== editingTemplate.id));
      setSelectedTemplateId(null);
      setEditingTemplate(null);
      toast.success('Template deleted successfully!');
    } catch (error) {
      console.error(error);
      toast.error('Failed to delete template.');
    } finally {
      setSaving(false);
    }
  };

  // ───────── SCHEDULER TEMPLATES HANDLERS ─────────
  const pushSchedulerToHistory = useCallback((tpl: ScheduledEmailTemplate) => {
    setSchedulerHistory(prev => {
      const newHistory = prev.slice(0, schedulerHistoryIndex + 1);
      newHistory.push(tpl);
      if (newHistory.length > 50) newHistory.shift(); 
      setSchedulerHistoryIndex(newHistory.length - 1);
      return newHistory;
    });
  }, [schedulerHistoryIndex]);

  const handleSelectSchedulerTemplate = (tpl: ScheduledEmailTemplate) => {
    setSelectedSchedulerTemplateId(tpl.id);
    setEditingSchedulerTemplate({ ...tpl });
    setSchedulerHistory([{ ...tpl }]);
    setSchedulerHistoryIndex(0);
  };

  const undoScheduler = useCallback(() => {
    if (schedulerHistoryIndex > 0 && canUpdate) {
      const newIndex = schedulerHistoryIndex - 1;
      setSchedulerHistoryIndex(newIndex);
      setEditingSchedulerTemplate(schedulerHistory[newIndex]);
    }
  }, [schedulerHistory, schedulerHistoryIndex, canUpdate]);

  const redoScheduler = useCallback(() => {
    if (schedulerHistoryIndex < schedulerHistory.length - 1 && canUpdate) {
      const newIndex = schedulerHistoryIndex + 1;
      setSchedulerHistoryIndex(newIndex);
      setEditingSchedulerTemplate(schedulerHistory[newIndex]);
    }
  }, [schedulerHistory, schedulerHistoryIndex, canUpdate]);

  const handleSchedulerEditorChange = (field: keyof ScheduledEmailTemplate, value: any) => {
    if (!canUpdate || !editingSchedulerTemplate) return;
    const newTpl = { ...editingSchedulerTemplate, [field]: value };
    setEditingSchedulerTemplate(newTpl);

    if (schedulerDebounceTimer.current) clearTimeout(schedulerDebounceTimer.current);
    schedulerDebounceTimer.current = setTimeout(() => {
      pushSchedulerToHistory(newTpl);
    }, 500);
  };

  const handleCreateSchedulerTemplate = () => {
    if (!canCreate) return;
    const catLabel = CATEGORIES.find(c => c.id === schedulerActiveCategory)?.label || 'Module';
    const newId = `sched_${schedulerActiveCategory}_${Date.now()}`;
    const newTpl: ScheduledEmailTemplate = {
      id: newId,
      name: `Scheduled ${catLabel} Automated Notice`,
      category: schedulerActiveCategory,
      isScheduler: true,
      channel: 'email',
      triggerFrequency: 'weekly',
      targetCondition: 'owing_positive',
      isActive: true,
      subjectTemplate: '',
      bodyTemplate: '',
    };
    setSchedulerTemplates(prev => [...prev, newTpl]);
    handleSelectSchedulerTemplate(newTpl);
    setTimeout(() => schedulerSubjectRef.current?.focus(), 100);
  };

  const handleSaveSchedulerTemplate = async () => {
    if (!editingSchedulerTemplate || !canUpdate) return;
    setSavingScheduler(true);
    try {
      const tplToSave = {
        ...editingSchedulerTemplate,
        isScheduler: true,
        channel: 'email',
        updatedAt: serverTimestamp(),
      };
      await setDoc(doc(db, 'messageTemplates', tplToSave.id), tplToSave, { merge: true });
      setSchedulerTemplates(prev => prev.map(t => (t.id === tplToSave.id ? tplToSave : t)));
      toast.success('Scheduled email template saved successfully!');
      window.dispatchEvent(new Event('template_saved'));
    } catch (error) {
      console.error('Failed saving scheduled template:', error);
      toast.error('Failed to save scheduled template.');
    } finally {
      setSavingScheduler(false);
    }
  };

  const handleDeleteSchedulerTemplate = async () => {
    if (!editingSchedulerTemplate || !canDelete) return;
    if (!window.confirm(`Are you sure you want to delete scheduled template "${editingSchedulerTemplate.name}"?\n\nThis will remove it from the Automated Bulk Email Scheduler.`)) return;

    setSavingScheduler(true);
    try {
      await setDoc(doc(db, 'messageTemplates', editingSchedulerTemplate.id), {
        isDeleted: true,
        deletedAt: serverTimestamp(),
      }, { merge: true });
      setSchedulerTemplates(prev => prev.filter(t => t.id !== editingSchedulerTemplate.id));
      setSelectedSchedulerTemplateId(null);
      setEditingSchedulerTemplate(null);
      toast.success('Scheduled email template deleted.');
      window.dispatchEvent(new Event('template_deleted'));
    } catch (error) {
      console.error('Failed deleting scheduled template:', error);
      toast.error('Failed to delete scheduled template.');
    } finally {
      setSavingScheduler(false);
    }
  };

  // ───────── UNIFIED DYNAMIC TAG INSERTION ─────────
  const insertTagAtCursor = (tag: string) => {
    if (!canUpdate) return;

    if (hubTab === 'scheduler') {
      if (!editingSchedulerTemplate) return;
      const ref = schedulerActiveField === 'subjectTemplate' ? schedulerSubjectRef.current : schedulerBodyRef.current;
      if (ref) {
        const start = ref.selectionStart || 0;
        const end = ref.selectionEnd || 0;
        const text = editingSchedulerTemplate[schedulerActiveField] || '';
        const newText = text.substring(0, start) + tag + text.substring(end);
        const newTpl = { ...editingSchedulerTemplate, [schedulerActiveField]: newText };
        setEditingSchedulerTemplate(newTpl);
        pushSchedulerToHistory(newTpl);
        setTimeout(() => {
          ref.focus();
          ref.setSelectionRange(start + tag.length, start + tag.length);
        }, 0);
      }
    } else {
      if (!editingTemplate) return;
      const ref = activeField === 'subjectTemplate' ? subjectRef.current : bodyRef.current;
      if (ref) {
        const start = ref.selectionStart || 0;
        const end = ref.selectionEnd || 0;
        const text = editingTemplate[activeField] || '';
        const newText = text.substring(0, start) + tag + text.substring(end);
        const newTpl = { ...editingTemplate, [activeField]: newText };
        setEditingTemplate(newTpl);
        pushToHistory(newTpl); 
        setTimeout(() => {
          ref.focus();
          ref.setSelectionRange(start + tag.length, start + tag.length);
        }, 0);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!canUpdate) return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      if (hubTab === 'scheduler') {
        if (e.shiftKey) redoScheduler();
        else undoScheduler();
      } else {
        if (e.shiftKey) redo();
        else undo();
      }
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
      e.preventDefault();
      if (hubTab === 'scheduler') redoScheduler();
      else redo();
    }
  };

  // Filter templates for active views
  const activeTemplates = templates.filter(t => {
    const matchesCat = isTemplateInCategory(t.category, activeCategory);
    if (!matchesCat) return false;
    if (channelFilter !== 'all' && t.channel && t.channel !== 'all' && t.channel !== channelFilter) {
      return false;
    }
    return true;
  });

  const activeSchedulerTemplates = schedulerTemplates.filter(t => 
    isTemplateInCategory(t.category, schedulerActiveCategory)
  );

  if (loading) return <div className="p-8 text-center text-gray-500 font-semibold">Loading Central Template Hub...</div>;

  if (!canViewAutomation) {
    return (
      <div className="max-w-7xl mx-auto flex flex-col items-center justify-center p-12 bg-white rounded-xl shadow-sm border border-gray-100 mt-10">
        <ShieldAlert className="w-16 h-16 text-red-400 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900">Access Denied</h2>
        <p className="text-gray-500 mt-2 text-center max-w-md">
          You do not have the required permissions to view or edit the Automation Templates. Please contact your system administrator if you believe this is an error.
        </p>
      </div>
    );
  }

  const getTagColorClass = (color: string) => {
    if (!canUpdate) return "text-[11px] px-2 py-1 bg-gray-50 text-gray-400 rounded-md border border-gray-200 cursor-not-allowed opacity-75 font-mono";
    switch (color) {
      case 'blue': return "text-[11px] px-2 py-1 bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 rounded-md font-mono transition cursor-grab active:cursor-grabbing font-semibold shadow-2xs";
      case 'emerald': return "text-[11px] px-2 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 rounded-md font-mono transition cursor-grab active:cursor-grabbing font-semibold shadow-2xs";
      case 'purple': return "text-[11px] px-2 py-1 bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 rounded-md font-mono transition cursor-grab active:cursor-grabbing font-semibold shadow-2xs";
      case 'amber': return "text-[11px] px-2 py-1 bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 rounded-md font-mono transition cursor-grab active:cursor-grabbing font-semibold shadow-2xs";
      case 'rose': return "text-[11px] px-2 py-1 bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 rounded-md font-mono transition cursor-grab active:cursor-grabbing font-semibold shadow-2xs";
      case 'teal': return "text-[11px] px-2 py-1 bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-100 rounded-md font-mono transition cursor-grab active:cursor-grabbing font-semibold shadow-2xs";
      case 'indigo': return "text-[11px] px-2 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 rounded-md font-mono transition cursor-grab active:cursor-grabbing font-semibold shadow-2xs";
      case 'cyan': return "text-[11px] px-2 py-1 bg-cyan-50 text-cyan-700 border border-cyan-200 hover:bg-cyan-100 rounded-md font-mono transition cursor-grab active:cursor-grabbing font-semibold shadow-2xs";
      default: return "text-[11px] px-2 py-1 bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 rounded-md font-mono transition cursor-grab active:cursor-grabbing font-semibold shadow-2xs";
    }
  };

  return (
    <div className="max-w-7xl mx-auto pb-20 space-y-6" onKeyDown={handleKeyDown}>
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl shadow-xs">
            <MessageSquare className="w-6 h-6 text-[#2563EB]" />
          </div>
          <div>
            <h1 className="text-[24px] font-bold text-[#0F172A] tracking-tight leading-tight">Automation Control &amp; Master Template Hub</h1>
            <p className="text-sm text-[#64748B] mt-0.5 font-medium">
              Centralized master control for WhatsApp &amp; Email communication templates, automated bulk schedules, and dynamic tags.
            </p>
          </div>
        </div>

        {/* Global Hub Navigation Tabs */}
        <div className="flex items-center gap-2 p-1.5 bg-gray-100/90 rounded-2xl border border-gray-200 w-fit shrink-0">
          <button
            type="button"
            onClick={() => setHubTab('templates')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition shadow-xs cursor-pointer ${
              hubTab === 'templates'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/80'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Message Templates</span>
          </button>

          <button
            type="button"
            onClick={() => setHubTab('scheduler')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition shadow-xs cursor-pointer ${
              hubTab === 'scheduler'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/80'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Automated Bulk Email Scheduler</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
              hubTab === 'scheduler' ? 'bg-indigo-800 text-indigo-100' : 'bg-indigo-100 text-indigo-700'
            }`}>
              Auto Triggers
            </span>
          </button>
        </div>
      </div>

      {/* ─────────────────── TAB 1: MESSAGE TEMPLATES (WHATSAPP & DIRECT EMAIL) ─────────────────── */}
      {hubTab === 'templates' && (
        <div className="space-y-6">
          {/* Quick Scheduler Preview Bar on Templates Hub */}
          <div className="bg-gradient-to-r from-indigo-50/70 via-white to-blue-50/70 rounded-2xl shadow-xs border border-indigo-100 p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-xs mt-0.5 shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-bold text-gray-900">Automated Bulk Email Scheduler Status</h3>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                    globalAutoEmailEnabled 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                      : 'bg-gray-100 text-gray-600 border-gray-200'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${globalAutoEmailEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
                    {globalAutoEmailEnabled ? 'Schedule Active' : 'Schedule Paused'}
                  </span>
                  <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                    Cron: {cronExpr} ({dayInfo.plural} at {formattedTime})
                  </span>
                </div>
                <p className="text-xs text-gray-600 mt-1 max-w-2xl leading-relaxed">
                  Automated batches scan active records, dynamically substitute placeholders, and deliver recurring statements on scheduled triggers.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
              <button
                type="button"
                onClick={() => setHubTab('scheduler')}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
              >
                <span>Configure Scheduled Templates &amp; Triggers</span>
                <Clock className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* 3-Column Layout: Categories & List | Editor | Available Tags Panel */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Left Column: Categories & Template List */}
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-3 bg-gray-50 border-b border-gray-200 font-semibold text-gray-700 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Folder className="w-4 h-4 text-blue-600" />
                  <span>Folder Categories</span>
                </div>
                <div className="flex flex-col">
                  {CATEGORIES.map(cat => {
                    const count = templates.filter(t => isTemplateInCategory(t.category, cat.id)).length;
                    const isActive = isTemplateInCategory(activeCategory, cat.id);
                    return (
                      <button
                        key={cat.id}
                        onClick={() => {
                          setActiveCategory(cat.id);
                          setSelectedTemplateId(null);
                          setEditingTemplate(null);
                        }}
                        className={`text-left px-4 py-3 text-sm font-medium transition-colors flex items-center justify-between ${
                          isActive ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-600 font-semibold' : 'text-gray-600 hover:bg-gray-50 border-l-4 border-transparent'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span>{cat.icon}</span>
                          <span>{cat.label}</span>
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-normal">
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col max-h-[520px]">
                <div className="p-3 bg-gray-50 border-b border-gray-200 font-semibold text-gray-700 flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-700">Templates</span>
                    <span className="text-xs text-gray-400 font-normal">{activeTemplates.length}</span>
                  </div>
                  <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-gray-200 text-xs">
                    <button
                      type="button"
                      onClick={() => setChannelFilter('all')}
                      className={`flex-1 py-1 rounded text-center font-medium transition-colors ${channelFilter === 'all' ? 'bg-blue-600 text-white shadow-2xs' : 'text-gray-600 hover:text-gray-900'}`}
                    >
                      All
                    </button>
                    <button
                      type="button"
                      onClick={() => setChannelFilter('whatsapp')}
                      className={`flex-1 py-1 rounded text-center font-medium transition-colors ${channelFilter === 'whatsapp' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-gray-600 hover:text-gray-900'}`}
                    >
                      WhatsApp
                    </button>
                    <button
                      type="button"
                      onClick={() => setChannelFilter('email')}
                      className={`flex-1 py-1 rounded text-center font-medium transition-colors ${channelFilter === 'email' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-gray-600 hover:text-gray-900'}`}
                    >
                      Email
                    </button>
                  </div>
                </div>
                <div className="overflow-y-auto flex-1 p-2 space-y-1">
                  {activeTemplates.length === 0 && <p className="text-xs text-gray-500 p-2">No templates found in this folder.</p>}
                  {activeTemplates.map(tpl => (
                    <button
                      key={tpl.id}
                      onClick={() => handleSelectTemplate(tpl)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between gap-2 ${
                        selectedTemplateId === tpl.id ? 'bg-blue-600 text-white' : 'hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      <span className="truncate flex-1 font-medium">{tpl.name}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-bold shrink-0 ${
                        selectedTemplateId === tpl.id
                          ? 'bg-blue-700 text-blue-100'
                          : tpl.channel === 'whatsapp'
                          ? 'bg-emerald-100 text-emerald-700'
                          : tpl.channel === 'email'
                          ? 'bg-indigo-100 text-indigo-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {tpl.channel === 'whatsapp' ? 'WA' : tpl.channel === 'email' ? 'Mail' : 'Both'}
                      </span>
                    </button>
                  ))}
                </div>
                
                {canCreate && (
                  <div className="p-3 border-t border-gray-200 bg-gray-50">
                    <button onClick={handleCreateNew} className="w-full flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 py-2 rounded-lg text-sm hover:bg-gray-100 transition cursor-pointer">
                      <Plus className="w-4 h-4" /> New Template
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Middle Column: Editor */}
            <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-[750px]">
              {editingTemplate ? (
                <>
                  <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                    <h2 className="font-bold text-gray-800 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-gray-500" />
                      Editing: {editingTemplate.name}
                    </h2>
                    
                    <div className="flex items-center gap-2">
                      <div className="flex items-center bg-white border border-gray-300 rounded-lg overflow-hidden mr-2">
                        <button onClick={undo} disabled={historyIndex <= 0 || !canUpdate} className="p-2 text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition">
                          <Undo2 className="w-4 h-4" />
                        </button>
                        <div className="w-px h-5 bg-gray-300"></div>
                        <button onClick={redo} disabled={historyIndex >= history.length - 1 || !canUpdate} className="p-2 text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition">
                          <Redo2 className="w-4 h-4" />
                        </button>
                      </div>

                      {canDelete && (
                        <button 
                          onClick={handleDelete} 
                          disabled={saving} 
                          title="Permanently delete this template"
                          className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4 text-rose-600" />
                          <span className="hidden sm:inline">Delete Template</span>
                        </button>
                      )}

                      <button onClick={handleSave} disabled={saving || !canUpdate} className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition ${canUpdate ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}>
                        <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Template'}
                      </button>
                    </div>
                  </div>
                  <div className="p-6 flex-1 overflow-y-auto space-y-6">
                    {!canUpdate && (
                      <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-md text-sm mb-4">
                        You are viewing this template in <strong>Read-Only</strong> mode. You do not have permission to make changes.
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Template Name (Internal)</label>
                        <input type="text" className="w-full border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500 text-sm" value={editingTemplate.name} onChange={e => handleEditorChange('name', e.target.value)} disabled={!canUpdate}/>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Target Channel</label>
                        <select
                          className="w-full border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500 text-sm font-medium"
                          value={editingTemplate.channel || 'all'}
                          onChange={e => handleEditorChange('channel', e.target.value)}
                          disabled={!canUpdate}
                        >
                          <option value="all">Both (WhatsApp &amp; Email)</option>
                          <option value="whatsapp">WhatsApp Only</option>
                          <option value="email">Email Only</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="flex justify-between text-sm font-semibold text-gray-700 mb-1">Subject Line</label>
                      <input ref={subjectRef} type="text" onFocus={() => setActiveField('subjectTemplate')} className="w-full border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500" value={editingTemplate.subjectTemplate} onChange={e => handleEditorChange('subjectTemplate', e.target.value)} disabled={!canUpdate}/>
                    </div>
                    <div className="flex-1 flex flex-col h-full">
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Message Body</label>
                      <textarea ref={bodyRef} onFocus={() => setActiveField('bodyTemplate')} className="w-full flex-1 border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 font-mono text-sm leading-relaxed min-h-[350px] disabled:bg-gray-50 disabled:text-gray-500" value={editingTemplate.bodyTemplate} onChange={e => handleEditorChange('bodyTemplate', e.target.value)} disabled={!canUpdate}/>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                  <MessageSquare className="w-16 h-16 mb-4 text-gray-200" />
                  <p>Select a template from the list to edit or create a new one.</p>
                </div>
              )}
            </div>

            {/* Right Column: Available Tags Reference */}
            {renderTagsPanel()}
          </div>
        </div>
      )}

      {/* ─────────────────── TAB 2: AUTOMATED BULK EMAIL SCHEDULER STUDIO ─────────────────── */}
      {hubTab === 'scheduler' && (
        <div className="space-y-6">
          {/* Global Scheduled Email System Controls Card */}
          <div className="bg-white rounded-2xl shadow-xs border border-[#E2E8F0] overflow-hidden">
            <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className={`p-3.5 rounded-2xl ${globalAutoEmailEnabled ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-100 text-gray-400'}`}>
                  <Mail className="w-7 h-7" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h2 className="text-lg font-black text-gray-900">
                      Automated Bulk Email Scheduler
                    </h2>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                      globalAutoEmailEnabled 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                        : 'bg-gray-100 text-gray-600 border-gray-200'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${globalAutoEmailEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
                      {globalAutoEmailEnabled ? 'Schedule Active' : 'Schedule Paused'}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                      <Clock className="w-3 h-3 text-indigo-600" /> Cron: {cronExpr} ({dayInfo.plural} at {formattedTime})
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 max-w-3xl leading-relaxed">
                    Automatically scans active records, evaluates trigger filters, dynamically replaces record placeholders, and dispatches automated statement reminders every {dayInfo.shortName} at {formattedTime}.
                  </p>

                  {/* Schedule Quick Config Row */}
                  <div className="mt-3.5 flex flex-wrap items-center gap-3 pt-3 border-t border-gray-100">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-700">Dispatch Day:</span>
                      <select
                        value={scheduleDay}
                        onChange={(e) => {
                          const newDay = Number(e.target.value);
                          setScheduleDay(newDay);
                          handleSaveScheduleConfig(newDay, scheduleTime);
                        }}
                        disabled={isSavingSchedule || !canManageScheduler}
                        className="px-2.5 py-1 text-xs font-bold bg-gray-50 border border-gray-300 rounded-lg text-gray-800 focus:ring-2 focus:ring-indigo-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {DAYS_OF_WEEK.map(d => (
                          <option key={d.value} value={d.value}>
                            {d.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-700">Dispatch Time:</span>
                      <select
                        value={scheduleTime}
                        onChange={(e) => {
                          const newTime = e.target.value;
                          setScheduleTime(newTime);
                          handleSaveScheduleConfig(scheduleDay, newTime);
                        }}
                        disabled={isSavingSchedule || !canManageScheduler}
                        className="px-2.5 py-1 text-xs font-bold bg-gray-50 border border-gray-300 rounded-lg text-gray-800 focus:ring-2 focus:ring-indigo-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {!SCHEDULE_TIME_OPTIONS.some(o => o.value === scheduleTime) && (
                          <option value={scheduleTime}>
                            {formattedTime} (Custom)
                          </option>
                        )}
                        {SCHEDULE_TIME_OPTIONS.map(t => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {isSavingSchedule && (
                      <span className="text-xs text-indigo-600 font-semibold flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" /> Saving schedule...
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Toggle Switch & Actions */}
              <div className="flex items-center gap-3 shrink-0 self-start md:self-center flex-wrap">
                <button
                  onClick={() => setShowGuideModal(true)}
                  className="flex items-center px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-300 transition cursor-pointer"
                  title="Learn how templates and placeholders work"
                >
                  <HelpCircle className="w-4 h-4 mr-1.5 text-slate-500" />
                  How Templates Work
                </button>

                <button
                  onClick={handleManualRunJob}
                  disabled={isRunningMondayJob || !canToggleMondayAutoEmail}
                  className="flex items-center px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl border border-indigo-200 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  title={!canToggleMondayAutoEmail ? "Permission required to run Monday auto-email" : "Trigger manual run of filtering logic and send emails immediately"}
                >
                  {isRunningMondayJob ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin text-indigo-600" />
                  ) : (
                    <Play className="w-4 h-4 mr-2 text-indigo-600 fill-indigo-600" />
                  )}
                  Run Test Email Batch
                </button>

                <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
                  <span className="text-xs font-bold text-gray-700">
                    {globalAutoEmailEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={globalAutoEmailEnabled}
                    disabled={isUpdatingGlobalToggle || !canToggleMondayAutoEmail}
                    onClick={handleToggleGlobalAutoEmail}
                    title={!canToggleMondayAutoEmail ? "Permission required to toggle Monday auto-email" : undefined}
                    className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                      globalAutoEmailEnabled ? 'bg-indigo-600' : 'bg-gray-300'
                    } ${isUpdatingGlobalToggle || !canToggleMondayAutoEmail ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    <span className="sr-only">Toggle Global Monday Auto-Email</span>
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out flex items-center justify-center ${
                        globalAutoEmailEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    >
                      {isUpdatingGlobalToggle ? (
                        <Loader2 className="w-3 h-3 text-gray-400 animate-spin" />
                      ) : null}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Scheduler Studio 3-Column Layout: Category Folders & Scheduler Templates | Scheduled Template Editor | Dynamic Tags */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Left Column: Dedicated Scheduler Category Folders & Template List */}
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-3 bg-gray-50 border-b border-gray-200 font-semibold text-gray-700 text-xs uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Folder className="w-4 h-4 text-indigo-600" />
                    <span>Scheduler Folders</span>
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                    Automated
                  </span>
                </div>
                <div className="flex flex-col">
                  {CATEGORIES.map(cat => {
                    const count = schedulerTemplates.filter(t => isTemplateInCategory(t.category, cat.id)).length;
                    const isActive = isTemplateInCategory(schedulerActiveCategory, cat.id);
                    return (
                      <button
                        key={cat.id}
                        onClick={() => {
                          setSchedulerActiveCategory(cat.id);
                          const firstInCat = schedulerTemplates.find(t => isTemplateInCategory(t.category, cat.id));
                          if (firstInCat) {
                            handleSelectSchedulerTemplate(firstInCat);
                          } else {
                            setSelectedSchedulerTemplateId(null);
                            setEditingSchedulerTemplate(null);
                          }
                        }}
                        className={`text-left px-4 py-3 text-sm font-medium transition-colors flex items-center justify-between ${
                          isActive 
                            ? 'bg-indigo-50 text-indigo-700 border-l-4 border-indigo-600 font-semibold' 
                            : 'text-gray-600 hover:bg-gray-50 border-l-4 border-transparent'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span>{cat.icon}</span>
                          <span>{cat.label}</span>
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                          isActive ? 'bg-indigo-100 text-indigo-800' : 'bg-gray-100 text-gray-500 font-normal'
                        }`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Scheduled Templates List */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col max-h-[520px]">
                <div className="p-3 bg-gray-50 border-b border-gray-200 font-semibold text-gray-700 flex justify-between items-center">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-700">Scheduled Templates</span>
                  <span className="text-xs text-gray-400 font-normal">{activeSchedulerTemplates.length}</span>
                </div>
                <div className="overflow-y-auto flex-1 p-2 space-y-1">
                  {activeSchedulerTemplates.length === 0 && (
                    <p className="text-xs text-gray-500 p-2 italic">No scheduled templates in this folder.</p>
                  )}
                  {activeSchedulerTemplates.map(tpl => (
                    <button
                      key={tpl.id}
                      onClick={() => handleSelectSchedulerTemplate(tpl)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between gap-2 ${
                        selectedSchedulerTemplateId === tpl.id ? 'bg-indigo-600 text-white shadow-2xs' : 'hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      <div className="truncate flex-1">
                        <span className="font-semibold block truncate">{tpl.name}</span>
                        <span className={`text-[10px] uppercase font-bold tracking-wider ${
                          selectedSchedulerTemplateId === tpl.id ? 'text-indigo-200' : 'text-gray-500'
                        }`}>
                          {tpl.triggerFrequency} • {tpl.isActive ? 'Active' : 'Paused'}
                        </span>
                      </div>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold shrink-0 ${
                        selectedSchedulerTemplateId === tpl.id
                          ? 'bg-indigo-700 text-indigo-100'
                          : tpl.isActive
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {tpl.isActive ? 'RUNNING' : 'PAUSED'}
                      </span>
                    </button>
                  ))}
                </div>
                
                {canCreate && (
                  <div className="p-3 border-t border-gray-200 bg-gray-50">
                    <button 
                      onClick={handleCreateSchedulerTemplate} 
                      className="w-full flex items-center justify-center gap-2 bg-indigo-50 border border-indigo-200 text-indigo-700 py-2 rounded-lg text-sm font-bold hover:bg-indigo-100 transition cursor-pointer"
                    >
                      <Plus className="w-4 h-4" /> New Scheduled Template
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Middle Column: Scheduled Template Editor */}
            <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-[750px]">
              {editingSchedulerTemplate ? (
                <>
                  <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                    <h2 className="font-bold text-gray-800 flex items-center gap-2 text-sm sm:text-base">
                      <Clock className="w-5 h-5 text-indigo-600" />
                      <span className="truncate">Editing Scheduled Email: {editingSchedulerTemplate.name}</span>
                    </h2>
                    
                    <div className="flex items-center gap-2">
                      <div className="flex items-center bg-white border border-gray-300 rounded-lg overflow-hidden mr-2">
                        <button onClick={undoScheduler} disabled={schedulerHistoryIndex <= 0 || !canUpdate} className="p-2 text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition">
                          <Undo2 className="w-4 h-4" />
                        </button>
                        <div className="w-px h-5 bg-gray-300"></div>
                        <button onClick={redoScheduler} disabled={schedulerHistoryIndex >= schedulerHistory.length - 1 || !canUpdate} className="p-2 text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition">
                          <Redo2 className="w-4 h-4" />
                        </button>
                      </div>

                      {canDelete && (
                        <button 
                          onClick={handleDeleteSchedulerTemplate} 
                          disabled={savingScheduler} 
                          title="Permanently delete this scheduled template"
                          className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4 text-rose-600" />
                          <span className="hidden sm:inline">Delete</span>
                        </button>
                      )}

                      <button 
                        onClick={handleSaveSchedulerTemplate} 
                        disabled={savingScheduler || !canUpdate} 
                        className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition ${
                          canUpdate ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs' : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        <Save className="w-4 h-4" /> {savingScheduler ? 'Saving...' : 'Save Scheduled Template'}
                      </button>
                    </div>
                  </div>

                  <div className="p-6 flex-1 overflow-y-auto space-y-5">
                    {!canUpdate && (
                      <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-md text-sm">
                        You are viewing this scheduled template in <strong>Read-Only</strong> mode.
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                          Template Name (Internal)
                        </label>
                        <input 
                          type="text" 
                          className="w-full border-gray-300 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500 disabled:bg-gray-50 disabled:text-gray-500 text-sm font-semibold" 
                          value={editingSchedulerTemplate.name} 
                          onChange={e => handleSchedulerEditorChange('name', e.target.value)} 
                          disabled={!canUpdate}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                          Assigned Category Folder
                        </label>
                        <select
                          className="w-full border-gray-300 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500 disabled:bg-gray-50 disabled:text-gray-500 text-sm font-semibold"
                          value={editingSchedulerTemplate.category}
                          onChange={e => handleSchedulerEditorChange('category', e.target.value)}
                          disabled={!canUpdate}
                        >
                          {CATEGORIES.map(c => (
                            <option key={c.id} value={c.id}>{c.icon} {c.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Scheduling Triggers & Filter Rules Box */}
                    <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-indigo-900 flex items-center gap-1.5">
                          <Sliders className="w-3.5 h-3.5 text-indigo-700" />
                          <span>Scheduling Triggers &amp; Target Rules</span>
                        </span>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <span className="text-xs font-bold text-gray-700">Automated Status:</span>
                          <input 
                            type="checkbox" 
                            checked={editingSchedulerTemplate.isActive} 
                            onChange={e => handleSchedulerEditorChange('isActive', e.target.checked)}
                            disabled={!canUpdate}
                            className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                          />
                          <span className={`text-xs font-bold ${editingSchedulerTemplate.isActive ? 'text-emerald-700' : 'text-gray-500'}`}>
                            {editingSchedulerTemplate.isActive ? 'Active (Scheduled)' : 'Paused'}
                          </span>
                        </label>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-gray-700 mb-1">
                            Frequency Trigger
                          </label>
                          <select
                            value={editingSchedulerTemplate.triggerFrequency || 'weekly'}
                            onChange={e => handleSchedulerEditorChange('triggerFrequency', e.target.value)}
                            disabled={!canUpdate}
                            className="w-full text-xs font-medium bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-indigo-500"
                          >
                            <option value="weekly">Weekly on Global Dispatch Day &amp; Time</option>
                            <option value="daily">Daily at Global Dispatch Time</option>
                            <option value="monthly">Monthly on 1st of Month</option>
                            <option value="custom">Custom Event / Condition Trigger</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-gray-700 mb-1">
                            Target Filter Condition
                          </label>
                          <select
                            value={editingSchedulerTemplate.targetCondition || 'owing_positive'}
                            onChange={e => handleSchedulerEditorChange('targetCondition', e.target.value)}
                            disabled={!canUpdate}
                            className="w-full text-xs font-medium bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-indigo-500"
                          >
                            <option value="owing_positive">Accounts with Outstanding Balance (&gt; £0)</option>
                            <option value="expiring_7_days">Upcoming Expiry / Maintenance Due in 7 Days</option>
                            <option value="unpaid_invoices">Unpaid &amp; Overdue Invoices</option>
                            <option value="active_records">All Active Contracts &amp; Records</option>
                            <option value="custom_condition">Custom Record Filter Rule</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="flex justify-between text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                        <span>Subject Line</span>
                        <span className="text-[11px] text-gray-400 font-normal">Supports dynamic tags</span>
                      </label>
                      <input 
                        ref={schedulerSubjectRef} 
                        type="text" 
                        onFocus={() => setSchedulerActiveField('subjectTemplate')} 
                        className="w-full border-gray-300 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500 disabled:bg-gray-50 disabled:text-gray-500 text-sm font-semibold" 
                        value={editingSchedulerTemplate.subjectTemplate} 
                        onChange={e => handleSchedulerEditorChange('subjectTemplate', e.target.value)} 
                        placeholder="e.g. Weekly Rental Statement &amp; Balance - {vehicle_reg}"
                        disabled={!canUpdate}
                      />
                    </div>

                    <div className="flex-1 flex flex-col h-full">
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                          Automated Email Body
                        </label>
                        <span className="text-[11px] text-gray-400">
                          Drag and drop or click tags on the right panel
                        </span>
                      </div>
                      <textarea 
                        ref={schedulerBodyRef} 
                        onFocus={() => setSchedulerActiveField('bodyTemplate')} 
                        className="w-full flex-1 border-gray-300 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500 font-mono text-sm leading-relaxed min-h-[300px] disabled:bg-gray-50 disabled:text-gray-500" 
                        value={editingSchedulerTemplate.bodyTemplate} 
                        onChange={e => handleSchedulerEditorChange('bodyTemplate', e.target.value)} 
                        placeholder="Compose scheduled automated email body with dynamic tags..."
                        disabled={!canUpdate}
                      />
                    </div>

                    {/* Actions bar at bottom of editor */}
                    <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100">
                      <button
                        type="button"
                        onClick={handleManualRunJob}
                        disabled={isRunningMondayJob || !canToggleMondayAutoEmail}
                        className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold transition cursor-pointer"
                        title="Run an immediate test evaluation of this scheduled template"
                      >
                        {isRunningMondayJob ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Send className="w-3.5 h-3.5" />
                        )}
                        <span>Run Test Dispatch With Live Variables</span>
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const original = schedulerTemplates.find(t => t.id === editingSchedulerTemplate.id);
                            if (original) {
                              setEditingSchedulerTemplate({ ...original });
                              toast('Reset changes to last saved version.');
                            }
                          }}
                          className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-bold transition cursor-pointer"
                        >
                          Discard Edits
                        </button>

                        <button 
                          onClick={handleSaveSchedulerTemplate} 
                          disabled={savingScheduler || !canUpdate} 
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>Save Scheduled Template</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8 text-center">
                  <Clock className="w-16 h-16 mb-4 text-gray-200" />
                  <p className="font-semibold text-gray-600">Select a scheduled template from the folder to configure its triggers and content.</p>
                  <p className="text-xs text-gray-400 mt-1">Or click "+ New Scheduled Template" to add an automated workflow for this category.</p>
                </div>
              )}
            </div>

            {/* Right Column: Available Tags Reference */}
            {renderTagsPanel()}
          </div>
        </div>
      )}

      {/* Guide Modal */}
      <TemplateGuideModal
        isOpen={showGuideModal}
        onClose={() => setShowGuideModal(false)}
        channel="all"
      />

      {/* Add Dynamic Parameter Tag Modal */}
      {showAddTagModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 border border-gray-200">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-gray-900">Add Dynamic Parameter Tag</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddTagModal(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveDynamicTag} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Tag Identifier (e.g. {'{customer_name}'} or {'{fleet_manager}'})
                </label>
                <input
                  type="text"
                  required
                  value={newTagForm.tag}
                  onChange={(e) => setNewTagForm({ ...newTagForm, tag: e.target.value })}
                  placeholder="{fleet_manager}"
                  className="w-full text-xs font-mono font-bold rounded-lg border-gray-300 text-gray-900 py-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Display Label
                </label>
                <input
                  type="text"
                  required
                  value={newTagForm.label}
                  onChange={(e) => setNewTagForm({ ...newTagForm, label: e.target.value })}
                  placeholder="e.g. Fleet Duty Manager"
                  className="w-full text-xs rounded-lg border-gray-300 text-gray-900 py-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Tag Category
                  </label>
                  <select
                    value={newTagForm.category}
                    onChange={(e) => setNewTagForm({ ...newTagForm, category: e.target.value })}
                    className="w-full text-xs rounded-lg border-gray-300 text-gray-900 py-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="global">Global / Customer</option>
                    <option value="vehicle">Vehicle / Fleet</option>
                    <option value="rental">Rental</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="claim">Claim</option>
                    <option value="finance">Finance</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Sample Value
                  </label>
                  <input
                    type="text"
                    value={newTagForm.sampleValue}
                    onChange={(e) => setNewTagForm({ ...newTagForm, sampleValue: e.target.value })}
                    placeholder="e.g. Alex Smith"
                    className="w-full text-xs rounded-lg border-gray-300 text-gray-900 py-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  value={newTagForm.description}
                  onChange={(e) => setNewTagForm({ ...newTagForm, description: e.target.value })}
                  placeholder="Explains what this placeholder resolves to"
                  className="w-full text-xs rounded-lg border-gray-300 text-gray-900 py-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddTagModal(false)}
                  className="px-4 py-2 border border-gray-300 text-xs font-semibold rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingTag}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5"
                >
                  {isSavingTag ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Save Parameter Tag
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );

  // ───────── RENDER REUSABLE AVAILABLE TAGS REFERENCE PANEL ─────────
  function renderTagsPanel() {
    return (
      <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden h-[750px] flex flex-col">
        <div className="p-3.5 bg-gray-50 border-b border-gray-200 font-semibold text-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-bold text-gray-900">Available Tags</span>
          </div>
          <div className="flex items-center gap-1.5">
            {canCreate && (
              <button
                type="button"
                onClick={() => setShowAddTagModal(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold rounded-lg shadow-xs transition"
                title="Create a new global dynamic parameter tag"
              >
                <Plus className="w-3 h-3" />
                <span>Add Tag</span>
              </button>
            )}
            <span className="text-[11px] font-bold text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-full">
              Dynamic Tags
            </span>
          </div>
        </div>

        {/* Tag Search Filter Input */}
        <div className="p-2.5 border-b border-gray-100 bg-white">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={tagSearchQuery}
              onChange={(e) => setTagSearchQuery(e.target.value)}
              placeholder="Search tags (e.g. mileage, balance)..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
            />
            {tagSearchQuery && (
              <button
                type="button"
                onClick={() => setTagSearchQuery('')}
                className="absolute right-2 top-2 text-gray-400 hover:text-gray-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        <div className="p-3.5 overflow-y-auto space-y-5 flex-1">
          {canUpdate ? (
            <p className="text-[11px] text-gray-500 leading-relaxed bg-blue-50/60 p-2 rounded-lg border border-blue-100">
              💡 <strong>Click</strong> a tag to insert at cursor, or <strong>drag and drop</strong> directly into the subject or body.
            </p>
          ) : (
            <p className="text-xs text-gray-400 italic bg-gray-50 p-2 rounded-lg border border-gray-200">
              Tag insertion is disabled in Read-Only mode.
            </p>
          )}

          {/* Custom Global Dynamic Tags (Admin Managed) */}
          {customTags.length > 0 && (
            <div className="space-y-2 pb-3 border-b border-gray-100 bg-blue-50/40 p-2.5 rounded-xl border border-blue-100">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black text-blue-900 tracking-tight flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  Custom Parameter Tags ({customTags.length})
                </h3>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-100 text-blue-700 border border-blue-200">
                  Custom
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {customTags.map((ct) => (
                  <div key={ct.id} className="inline-flex items-center rounded-lg border border-blue-200 bg-white shadow-2xs overflow-hidden">
                    <button
                      type="button"
                      draggable={canUpdate}
                      onDragStart={(e) => canUpdate && e.dataTransfer.setData('text/plain', ct.tag)}
                      onClick={() => insertTagAtCursor(ct.tag)}
                      className="px-2 py-1 text-xs font-mono font-bold text-blue-700 hover:bg-blue-50 transition"
                      title={`${ct.label} (Sample: ${ct.sampleValue}) - Click to insert`}
                    >
                      {ct.tag}
                    </button>
                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => handleDeleteDynamicTag(ct.id, ct.tag)}
                        className="px-1.5 py-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 border-l border-blue-100 transition"
                        title={`Delete parameter tag ${ct.tag}`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {CATEGORIZED_TAGS.map((section) => {
            const query = tagSearchQuery.toLowerCase().trim();

            // Filter logic for section
            if (section.subgroups) {
              const filteredSubgroups = section.subgroups
                .map((sg) => {
                  const matchedTags = sg.tags.filter(
                    (t) =>
                      !query ||
                      t.toLowerCase().includes(query) ||
                      sg.label.toLowerCase().includes(query) ||
                      section.name.toLowerCase().includes(query)
                  );
                  return { ...sg, tags: matchedTags };
                })
                .filter((sg) => sg.tags.length > 0);

              if (filteredSubgroups.length === 0) return null;

              return (
                <div key={section.id} className="space-y-3 pb-3 border-b border-gray-100 last:border-b-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black text-gray-900 tracking-tight">
                      {section.name}
                    </h3>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                      {section.badge}
                    </span>
                  </div>

                  <div className="space-y-3 pl-1">
                    {filteredSubgroups.map((sg) => (
                      <div key={sg.label} className="space-y-1.5">
                        <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
                          {sg.label}
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {sg.tags.map((tag) => (
                            <button
                              key={tag}
                              type="button"
                              draggable={canUpdate}
                              onDragStart={(e) => canUpdate && e.dataTransfer.setData('text/plain', tag)}
                              onClick={() => insertTagAtCursor(tag)}
                              className={getTagColorClass(section.color)}
                              disabled={!canUpdate}
                              title={`Click or drag to insert ${tag}`}
                            >
                              {tag}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            }

            // Standard flat tags section
            const matchedTags = (section.tags || []).filter(
              (t) =>
                !query ||
                t.toLowerCase().includes(query) ||
                section.name.toLowerCase().includes(query)
            );

            if (matchedTags.length === 0) return null;

            return (
              <div key={section.id} className="space-y-2 pb-3 border-b border-gray-100 last:border-b-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-gray-900 tracking-tight">
                    {section.name}
                  </h3>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-gray-100 text-gray-700 border border-gray-200">
                    {section.badge}
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5 pl-1">
                  {matchedTags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      draggable={canUpdate}
                      onDragStart={(e) => canUpdate && e.dataTransfer.setData('text/plain', tag)}
                      onClick={() => insertTagAtCursor(tag)}
                      className={getTagColorClass(section.color)}
                      disabled={!canUpdate}
                      title={`Click or drag to insert ${tag}`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Empty state when search yields no tags */}
          {tagSearchQuery &&
            CATEGORIZED_TAGS.every((section) => {
              const query = tagSearchQuery.toLowerCase().trim();
              if (section.subgroups) {
                return !section.subgroups.some((sg) =>
                  sg.tags.some(
                    (t) =>
                      t.toLowerCase().includes(query) ||
                      sg.label.toLowerCase().includes(query) ||
                      section.name.toLowerCase().includes(query)
                  )
                );
              }
              return !(section.tags || []).some(
                (t) =>
                  t.toLowerCase().includes(query) ||
                  section.name.toLowerCase().includes(query)
              );
            }) && (
              <div className="text-center py-6 text-gray-400 text-xs">
                No tags found matching &quot;{tagSearchQuery}&quot;
              </div>
            )}
        </div>
      </div>
    );
  }
}
