// src/components/finance/EmailDispatchModal.tsx
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Transaction, Vehicle, Account, Customer } from '../../types';
import Modal from '../ui/Modal';
import { format, isValid } from 'date-fns';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';
import { useAuth } from '../../context/AuthContext';
import { 
  Mail, 
  Send, 
  Copy, 
  Check, 
  ExternalLink, 
  FileText, 
  Sparkles, 
  Search, 
  RefreshCw,
  Zap,
  Paperclip,
  Loader2,
  Building2,
  Download,
  Eye,
  FileCheck2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { sendEmail } from '../../utils/emailService';
import { logEmailHistory } from '../../hooks/useEmailHistory';
import { logCommunication } from '../../services/communicationLogService';
import { loadTemplatesForCategory, AppMessageTemplate } from '../../utils/templateManager';
import { CustomAttachmentUploader } from '../common/CustomAttachmentUploader';
import { CustomAttachment } from '../../utils/attachmentUpload';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../routes';
import { useSharedAccounts } from '../../hooks/useSharedAccounts';
import {
  RegisteredEntityAccount,
  DEFAULT_MANAGE_ACCOUNTS,
  calculateAccountBalances,
  formatAccountDropdownLabel,
  convertAccountToEntity,
  resolveDefaultAccountForTransaction,
  buildStatementDataForTransaction,
  compileStatementPdfBlob,
  uploadStatementPdfBlob,
  mergeFinanceTemplateVariables,
} from '../../utils/financeStatementBinding';
import AccountStatementPreviewModal from './AccountStatementPreviewModal';
import { AccountStatementData } from '../pdf/documents/AccountStatementDocument';

interface EmailDispatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  vehicles?: Vehicle[];
  accounts?: Account[];
  customers?: Customer[];
  runningBalance?: number;
  transactions?: Transaction[];
}

interface TemplateOption {
  id: string;
  name: string;
  category: string;
  subjectTemplate: string;
  bodyTemplate: string;
}

export const EmailDispatchModal: React.FC<EmailDispatchModalProps> = ({
  isOpen,
  onClose,
  transaction,
  vehicles = [],
  accounts = [],
  customers = [],
  runningBalance,
  transactions = [],
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { formatCurrency } = useFormattedDisplay();

  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  
  // Searchable dropdown state
  const [isTemplateDropdownOpen, setIsTemplateDropdownOpen] = useState(false);
  const [templateSearchQuery, setTemplateSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const hasPreselectedRef = useRef(false);

  // Form states
  const [recipientEmail, setRecipientEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [includePdfAttachment, setIncludePdfAttachment] = useState(true);
  const [customAttachments, setCustomAttachments] = useState<CustomAttachment[]>([]);

  // ── DYNAMIC FINANCE ACCOUNTS STORE (MANAGE ACCOUNTS COLLECTION) ──
  const { accounts: sharedAccounts } = useSharedAccounts();

  // Populate options exclusively with active records from Manage Accounts modal / accounts collection
  const activeAccounts: Account[] = useMemo(() => {
    if (accounts && accounts.length > 0) return accounts;
    if (sharedAccounts && sharedAccounts.length > 0) return sharedAccounts;
    return DEFAULT_MANAGE_ACCOUNTS;
  }, [accounts, sharedAccounts]);

  // Calculate real ledger balances from transaction rows
  const accountBalances = useMemo(() => {
    return calculateAccountBalances(activeAccounts, transactions);
  }, [activeAccounts, transactions]);

  // Automatically default to the account linked to the selected transaction row
  const [selectedAccountId, setSelectedAccountId] = useState<string>(() => {
    const defaultAcc = resolveDefaultAccountForTransaction(transaction, activeAccounts);
    return defaultAcc.id;
  });

  const selectedAccount = useMemo(() => {
    return activeAccounts.find((a) => a.id === selectedAccountId) || activeAccounts[0] || DEFAULT_MANAGE_ACCOUNTS[0];
  }, [activeAccounts, selectedAccountId]);

  const currentAccountBalance = useMemo(() => {
    return accountBalances.get(selectedAccount.id) ?? selectedAccount.balance ?? 0;
  }, [accountBalances, selectedAccount]);

  const selectedEntity = useMemo(() => {
    return convertAccountToEntity(selectedAccount, undefined, currentAccountBalance);
  }, [selectedAccount, currentAccountBalance]);

  // Re-sync entity & account selection when modal opens or transaction changes
  useEffect(() => {
    if (isOpen && transaction) {
      const defaultAcc = resolveDefaultAccountForTransaction(transaction, activeAccounts);
      setSelectedAccountId(defaultAcc.id);
    }
  }, [isOpen, transaction, activeAccounts]);

  // ── AUTOMATIC STATEMENT PDF GENERATION & BINDING STATE ──
  const [isCompilingStatement, setIsCompilingStatement] = useState(false);
  const [showStatementPreview, setShowStatementPreview] = useState(false);
  const [directPdfUrl, setDirectPdfUrl] = useState<string>('');
  const [compiledStatement, setCompiledStatement] = useState<{
    blob: Blob;
    blobUrl: string;
    filename: string;
    statementData: AccountStatementData;
    companyDetails: any;
    statementDateRange?: string;
  } | null>(null);

  // Automatically compile statement PDF for the selected account and transaction row
  useEffect(() => {
    if (!isOpen || !transaction) return;

    let isCancelled = false;
    const compile = async () => {
      setIsCompilingStatement(true);
      try {
        const { statementData, companyDetails, filename, statementDateRange } = buildStatementDataForTransaction(
          transaction,
          selectedEntity,
          transactions,
          runningBalance
        );

        const { blob, blobUrl } = await compileStatementPdfBlob(statementData, companyDetails);

        if (!isCancelled) {
          setCompiledStatement({
            blob,
            blobUrl,
            filename,
            statementData,
            companyDetails,
            statementDateRange,
          });
          // Immediate local blob URL fallback for instant preview/dispatch
          setDirectPdfUrl(blobUrl);
        }

        // Asynchronously persist to Firebase Storage for permanent public access link
        uploadStatementPdfBlob(blob, filename, transaction.id)
          .then((cloudUrl) => {
            if (!isCancelled && cloudUrl) {
              setDirectPdfUrl(cloudUrl);
            }
          })
          .catch((err) => {
            console.warn('Storage upload fallback:', err);
          });
      } catch (err) {
        console.error('Failed to automatically compile statement PDF:', err);
      } finally {
        if (!isCancelled) {
          setIsCompilingStatement(false);
        }
      }
    };

    compile();

    return () => {
      isCancelled = true;
    };
  }, [isOpen, transaction, selectedEntity, transactions, runningBalance]);

  // Download compiled statement locally
  const handleDownloadCompiledStatement = () => {
    if (!compiledStatement) return;
    const link = document.createElement('a');
    link.href = compiledStatement.blobUrl;
    link.download = compiledStatement.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Downloaded ${compiledStatement.filename}`);
  };

  // Associated entities
  const associatedVehicle = useMemo(() => {
    if (!transaction?.vehicleId) return undefined;
    return vehicles.find((v) => v.id === transaction.vehicleId);
  }, [transaction?.vehicleId, vehicles]);

  const associatedCustomer = useMemo(() => {
    if (transaction?.customerId) {
      const c = customers.find((cust) => cust.id === transaction.customerId);
      if (c) return c;
    }
    if (transaction?.customerName) {
      const c = customers.find(
        (cust) => cust.name?.toLowerCase() === transaction.customerName?.toLowerCase()
      );
      if (c) return c;
    }
    return undefined;
  }, [transaction, customers]);

  const associatedAccount = useMemo(() => {
    const accId = transaction?.type === 'income' 
      ? transaction.accountsTo?.[0] 
      : transaction?.accountsFrom?.[0];
    if (!accId) return undefined;
    return accounts.find((a) => a.id === accId);
  }, [transaction, accounts]);

  const customerName = useMemo(() => {
    return (
      transaction?.customerName ||
      associatedCustomer?.name ||
      associatedVehicle?.owner?.name ||
      'Valued Client'
    );
  }, [transaction, associatedCustomer, associatedVehicle]);

  const defaultEmail = useMemo(() => {
    return (
      (transaction as any)?.customerEmail ||
      associatedCustomer?.email ||
      ''
    );
  }, [transaction, associatedCustomer]);

  const statementDocUrl = useMemo(() => {
    return transaction?.documentUrl || transaction?.receiptUrl || '';
  }, [transaction]);

  // Sync recipient email on open
  useEffect(() => {
    if (isOpen) {
      setRecipientEmail(defaultEmail);
      setIncludePdfAttachment(true);
      setCustomAttachments([]);
      setIsTemplateDropdownOpen(false);
      setTemplateSearchQuery('');
      hasPreselectedRef.current = false;
    }
  }, [isOpen, defaultEmail]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsTemplateDropdownOpen(false);
      }
    };
    if (isTemplateDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isTemplateDropdownOpen]);

  // Fetch templates from Automation Control
  const fetchTemplates = useCallback(async () => {
    setLoadingTemplates(true);
    try {
      const list = await loadTemplatesForCategory('finance', 'email', { includeCustom: true });
      const mapped: TemplateOption[] = list.map((t: AppMessageTemplate) => ({
        id: t.id,
        name: t.name,
        category: t.category || 'finance',
        subjectTemplate: t.subjectTemplate || '',
        bodyTemplate: t.bodyTemplate || '',
      }));
      setTemplates(mapped);
    } catch (err) {
      console.error('Failed to load Email templates from Automation Control:', err);
    } finally {
      setLoadingTemplates(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    fetchTemplates();

    const handleSync = () => {
      fetchTemplates();
    };

    window.addEventListener('template_saved', handleSync);
    window.addEventListener('template_deleted', handleSync);
    return () => {
      window.removeEventListener('template_saved', handleSync);
      window.removeEventListener('template_deleted', handleSync);
    };
  }, [isOpen, fetchTemplates]);

  // Helper date formatter
  const formatDateValue = (d: any): string => {
    if (!d) return 'N/A';
    try {
      const date = d?.toDate ? d.toDate() : d instanceof Date ? d : new Date(d);
      if (!isValid(date)) return 'N/A';
      return format(date, 'dd/MM/yyyy');
    } catch {
      return 'N/A';
    }
  };

  // ── DYNAMIC VARIABLE REPLACEMENT ENGINE ──
  const populateTemplate = useCallback(
    (rawText: string): string => {
      return mergeFinanceTemplateVariables({
        rawText,
        transaction,
        customerName,
        selectedEntity,
        runningBalance,
        statementDateRange: compiledStatement?.statementDateRange,
        directStatementPdfLink: directPdfUrl || (compiledStatement?.blobUrl ? compiledStatement.blobUrl : statementDocUrl),
        statementDocUrl,
        associatedVehicle,
        formatCurrency,
      });
    },
    [
      transaction,
      customerName,
      selectedEntity,
      runningBalance,
      compiledStatement,
      directPdfUrl,
      statementDocUrl,
      associatedVehicle,
      formatCurrency,
    ]
  );

  // Pre-select template
  useEffect(() => {
    if (!isOpen || templates.length === 0 || !transaction || hasPreselectedRef.current) return;

    hasPreselectedRef.current = true;
    const isCredit = transaction.type === 'income' || transaction.entryType === 'CREDIT';

    let matched: TemplateOption | undefined;
    if (isCredit) {
      matched = templates.find((t) => {
        const n = t.name.toLowerCase();
        return n.includes('receipt') || n.includes('payment received') || n.includes('confirmation');
      });
    } else {
      matched = templates.find((t) => {
        const n = t.name.toLowerCase();
        return n.includes('statement notification') || n.includes('reminder') || n.includes('statement of account');
      });
    }

    if (!matched) {
      matched = templates.find((t) => t.name.toLowerCase().includes('statement notification')) || templates[0];
    }

    if (matched) {
      setSelectedTemplateId(matched.id);
    }
  }, [isOpen, templates, transaction]);

  // Update subject and message body when template or selected entity or direct PDF link changes
  useEffect(() => {
    const tpl = templates.find((t) => t.id === selectedTemplateId);
    if (tpl) {
      setSubject(populateTemplate(tpl.subjectTemplate || 'Statement Notification'));
      setMessage(populateTemplate(tpl.bodyTemplate));
    }
  }, [selectedTemplateId, templates, populateTemplate, selectedEntity, directPdfUrl]);

  const selectedTemplate = useMemo(() => {
    return templates.find((t) => t.id === selectedTemplateId);
  }, [templates, selectedTemplateId]);

  const filteredTemplates = useMemo(() => {
    if (!templateSearchQuery.trim()) return templates;
    const q = templateSearchQuery.toLowerCase();
    return templates.filter((t) => t.name.toLowerCase().includes(q) || t.subjectTemplate.toLowerCase().includes(q));
  }, [templates, templateSearchQuery]);

  // 1-Click Send Email
  const handleSendEmail = async () => {
    if (!recipientEmail.trim() || !recipientEmail.includes('@')) {
      toast.error('Please enter a valid recipient email address.');
      return;
    }
    if (!subject.trim()) {
      toast.error('Subject line cannot be empty.');
      return;
    }
    if (!message.trim()) {
      toast.error('Message body cannot be empty.');
      return;
    }

    setSendingEmail(true);
    const toastId = toast.loading('Sending email dispatch...');

    try {
      let finalBody = message;
      if (includePdfAttachment) {
        const stmtName = compiledStatement?.filename || `Statement_${selectedEntity.tradingName.replace(/\s+/g, '_')}.pdf`;
        finalBody = `${finalBody}\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📄 Official Bank Statement Attached: ${stmtName}\nIssued on behalf of: ${selectedEntity.name}\nDesignated Bank: ${selectedEntity.bankName} (Sort Code: ${selectedEntity.sortCode}, Account: ${selectedEntity.accountNumber})`;
      }

      const attachmentsToSend = customAttachments
        .filter((a) => a.selected && a.url)
        .map((a) => ({ filename: a.name, path: a.url }));

      if (includePdfAttachment && compiledStatement) {
        let attachedUrl = statementDocUrl;
        if (!attachedUrl) {
          try {
            attachedUrl = await uploadStatementPdfBlob(
              compiledStatement.blob,
              compiledStatement.filename,
              transaction.id
            );
          } catch {
            attachedUrl = compiledStatement.blobUrl;
          }
        }
        attachmentsToSend.push({
          filename: compiledStatement.filename,
          path: attachedUrl,
        });
      }

      await sendEmail({
        to: recipientEmail.trim(),
        subject: subject.trim(),
        text: finalBody,
        html: `<div style="font-family: Arial, sans-serif; white-space: pre-wrap; line-height: 1.5; color: #1e293b;">${finalBody.replace(/\n/g, '<br/>')}</div>`,
        attachments: attachmentsToSend.length > 0 ? attachmentsToSend : undefined,
      });

      toast.success('Email dispatched successfully!', { id: toastId });

      logCommunication({
        recipientType: 'customer',
        recipientId: transaction?.customerId || 'general',
        recipientName: customerName,
        recipientEmail: recipientEmail,
        channel: 'email',
        direction: 'outbound',
        subject: subject.trim(),
        message: finalBody,
        status: 'sent',
        module: 'finance',
        recordId: transaction?.id,
        senderEmail: user?.email || undefined,
        senderName: user?.displayName || undefined,
      });

      logEmailHistory({
        customerId: transaction?.customerId || 'general',
        customerName: customerName,
        email: recipientEmail,
        subject: subject.trim(),
        body: finalBody,
        type: 'finance',
        status: 'sent',
        senderName: user?.displayName || 'Finance Office',
      });

      onClose();
    } catch (err: any) {
      console.error('Failed to send email dispatch:', err);
      toast.error(`Email delivery failed: ${err?.message || 'Server error'}`, { id: toastId });
    } finally {
      setSendingEmail(false);
    }
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(message);
    setCopied(true);
    toast.success('Email body copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen || !transaction) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Email Dispatch Hub (Automation Templates)"
      size="2xl"
    >
      <div className="space-y-5 text-left text-slate-800">
        {/* Top Header Card */}
        <div className="bg-gradient-to-r from-sky-950 via-slate-900 to-indigo-950 text-white rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-lg bg-sky-500/20 text-sky-300 border border-sky-400/30">
                <Mail className="w-4 h-4 text-sky-300" />
              </span>
              <span className="text-xs text-sky-200 font-mono font-bold">
                Email Dispatch Service
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-300 font-mono">
                Ref: {transaction.referenceId || transaction.id.slice(-8).toUpperCase()}
              </span>
            </div>
            <h3 className="text-base font-bold text-white tracking-tight">
              {transaction.description || 'Account Transaction Notification'}
            </h3>
            <p className="text-xs text-sky-100 flex items-center gap-2">
              <span>Customer: <strong className="text-white">{customerName}</strong></span>
              <span>•</span>
              <span>Amount: <strong className="text-emerald-400 font-mono">{formatCurrency(transaction.amount)}</strong></span>
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              onClose();
              navigate(ROUTES.AUTOMATION);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-600/60 hover:bg-sky-600 text-white text-xs font-semibold rounded-xl border border-sky-400/40 transition cursor-pointer shadow-xs shrink-0"
            title="Open Automation Control"
          >
            <Zap className="w-3.5 h-3.5 text-amber-300" />
            <span>Automation Control</span>
            <ExternalLink className="w-3 h-3 text-sky-200" />
          </button>
        </div>

        {/* ========================================================================= */}
        {/* 1. ACCOUNT / ENTITY SELECTOR DROPDOWN (DYNAMIC FINANCE ACCOUNTS STORE)    */}
        {/* ========================================================================= */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-2xs">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-sky-600" />
              <span>Account / Entity Selector</span>
            </label>
            <span className="text-[11px] text-slate-500 font-medium">
              Manage Accounts Ledger ({activeAccounts.length} Active Accounts)
            </span>
          </div>

          <div className="relative">
            <select
              value={selectedAccountId}
              onChange={(e) => {
                setSelectedAccountId(e.target.value);
              }}
              className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20 cursor-pointer shadow-2xs transition"
            >
              {activeAccounts.map((acc) => {
                const bal = accountBalances.get(acc.id) ?? acc.balance ?? 0;
                return (
                  <option key={acc.id} value={acc.id}>
                    {formatAccountDropdownLabel(acc, bal)}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Quick Info Grid for Selected Account */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[11px] text-slate-600">
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80">
              <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">Account / Header</span>
              <span className="font-bold text-slate-800 truncate block mt-0.5">{selectedAccount.name}</span>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80">
              <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">Ledger Balance</span>
              <span className={`font-mono font-bold truncate block mt-0.5 ${currentAccountBalance >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                {formatCurrency(currentAccountBalance)}
              </span>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80">
              <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">Designated Bank & Sort Code</span>
              <span className="font-bold text-slate-800 truncate block mt-0.5">
                {selectedEntity.bankName} ({selectedEntity.sortCode})
              </span>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. AUTOMATIC STATEMENT PDF GENERATION & ATTACHMENT BADGE                  */}
        {/* ========================================================================= */}
        <div className="p-4 bg-gradient-to-r from-sky-50 via-indigo-50/60 to-sky-50/40 border border-sky-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              {isCompilingStatement ? (
                <Loader2 className="w-5 h-5 text-white animate-spin" />
              ) : (
                <FileText className="w-5 h-5 text-white" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-slate-900 truncate font-mono text-xs">
                  📄 {compiledStatement?.filename || `Statement_${selectedAccount.name.replace(/\s+/g, '_')}.pdf`}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border shrink-0 ${
                  isCompilingStatement 
                    ? 'bg-amber-100 text-amber-800 border-amber-300' 
                    : 'bg-sky-100 text-sky-800 border-sky-300/60'
                }`}>
                  {isCompilingStatement ? 'Compiling PDF...' : 'Auto-Generated PDF'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1 truncate flex items-center gap-1.5">
                <span>Account: <strong className="text-slate-700">{selectedAccount.name}</strong></span>
                <span>•</span>
                <span>Balance: <strong className="text-emerald-700 font-mono">{formatCurrency(currentAccountBalance)}</strong></span>
                <span>•</span>
                <span>Bank: <strong className="text-slate-700">{selectedEntity.bankName}</strong> ({selectedEntity.sortCode})</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            <button
              type="button"
              onClick={() => setShowStatementPreview(true)}
              disabled={!compiledStatement || isCompilingStatement}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-sky-50 text-sky-800 text-xs font-bold rounded-xl border border-sky-300 transition cursor-pointer shadow-2xs disabled:opacity-50"
              title="Preview Statement PDF"
            >
              <Eye className="w-3.5 h-3.5 text-sky-700" />
              <span>Preview Statement</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadCompiledStatement}
              disabled={!compiledStatement || isCompilingStatement}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-2xs disabled:opacity-50"
              title="Download Statement PDF"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF</span>
            </button>
          </div>
        </div>

        {/* Recipient & Subject Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              Recipient Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="customer@example.com"
                className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              Subject Line
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject line..."
              className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            />
          </div>
        </div>

        {/* Automation Control Template Selector */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>Dynamic Email Template</span>
            </label>
            <span className="text-[11px] text-slate-500">
              Source: <strong className="text-indigo-600">Automation Control (Finance Folder)</strong>
            </span>
          </div>

          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsTemplateDropdownOpen(!isTemplateDropdownOpen)}
              className="w-full flex items-center justify-between px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800 shadow-2xs hover:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 cursor-pointer"
            >
              <div className="flex items-center gap-2 truncate">
                <span className="font-bold text-slate-900">
                  {selectedTemplate?.name || 'Select template...'}
                </span>
                {selectedTemplate && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-50 text-sky-700 font-mono uppercase">
                    {selectedTemplate.category}
                  </span>
                )}
              </div>
              <RefreshCw className={`w-3.5 h-3.5 text-slate-400 ${loadingTemplates ? 'animate-spin' : ''}`} />
            </button>

            {isTemplateDropdownOpen && (
              <div className="absolute left-0 right-0 mt-1 z-30 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden animate-in fade-in">
                <div className="p-2 border-b border-slate-100 bg-slate-50">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search automation templates..."
                      value={templateSearchQuery}
                      onChange={(e) => setTemplateSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500"
                      autoFocus
                    />
                  </div>
                </div>

                <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 text-xs">
                  {filteredTemplates.map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => {
                        setSelectedTemplateId(tpl.id);
                        setIsTemplateDropdownOpen(false);
                      }}
                      className={`w-full text-left p-3 flex items-start justify-between gap-2 hover:bg-slate-50 cursor-pointer transition ${
                        tpl.id === selectedTemplateId ? 'bg-sky-50/60 font-semibold' : ''
                      }`}
                    >
                      <div>
                        <p className="text-slate-900 font-bold">{tpl.name}</p>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5 max-w-md">
                          {tpl.subjectTemplate || tpl.bodyTemplate.slice(0, 80)}...
                        </p>
                      </div>
                      {tpl.id === selectedTemplateId && <Check className="w-4 h-4 text-sky-600 shrink-0" />}
                    </button>
                  ))}
                  {filteredTemplates.length === 0 && (
                    <div className="p-4 text-center text-slate-400 text-xs">
                      No matching templates found.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Template Body Preview Editor */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              Template Body Preview (Resolved Content)
            </label>
            <button
              type="button"
              onClick={handleCopyMessage}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-700 hover:text-sky-900 cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Text'}</span>
            </button>
          </div>

          <textarea
            rows={8}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full p-3.5 text-xs bg-white border border-slate-300 rounded-xl font-sans focus:outline-none focus:ring-2 focus:ring-sky-500/20 leading-relaxed text-slate-800"
          />
        </div>

        {/* Attached Statement PDF */}
        {statementDocUrl && (
          <div className="p-3 bg-sky-50/70 border border-sky-200 rounded-xl flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 truncate">
              <FileText className="w-4 h-4 text-sky-700 shrink-0" />
              <div className="truncate">
                <span className="font-bold text-sky-950 block truncate">
                  Statement PDF Attached
                </span>
                <span className="text-[11px] text-sky-800/80 truncate block font-mono">
                  {statementDocUrl}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <a
                href={statementDocUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-bold text-sky-700 hover:text-sky-900 inline-flex items-center gap-1 cursor-pointer"
              >
                <span>View</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-sky-950">
                <input
                  type="checkbox"
                  checked={includePdfAttachment}
                  onChange={(e) => setIncludePdfAttachment(e.target.checked)}
                  className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                />
                <span>Attach to Email</span>
              </label>
            </div>
          </div>
        )}

        {/* Custom Supporting File Attachments */}
        <div className="border border-slate-200 rounded-xl p-3 bg-white space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Paperclip className="w-3.5 h-3.5 text-slate-500" />
              <span>Additional Supporting Attachments</span>
            </span>
            <span className="text-[11px] text-slate-400">PDF, PNG, JPG</span>
          </div>
          <CustomAttachmentUploader
            attachments={customAttachments}
            onChange={setCustomAttachments}
            moduleContext="finance"
            recordId={transaction.id}
          />
        </div>

        {/* Modal Footer Controls */}
        <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyMessage}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5 text-slate-500" />
              <span>Copy Text</span>
            </button>

            <button
              type="button"
              onClick={handleSendEmail}
              disabled={sendingEmail}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-sky-600 to-indigo-700 hover:from-sky-700 hover:to-indigo-800 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
            >
              {sendingEmail ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Sending Email...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>1-Click Send Email</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Account Statement Real-time Preview Modal */}
      {showStatementPreview && compiledStatement && (
        <AccountStatementPreviewModal
          isOpen={showStatementPreview}
          onClose={() => setShowStatementPreview(false)}
          statementData={compiledStatement.statementData}
          companyDetails={compiledStatement.companyDetails}
          onDownloadPDF={handleDownloadCompiledStatement}
          isGeneratingPDF={isCompilingStatement}
        />
      )}
    </Modal>
  );
};

export default EmailDispatchModal;
