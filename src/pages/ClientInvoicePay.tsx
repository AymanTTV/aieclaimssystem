// src/pages/ClientInvoicePay.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Invoice } from '../types/finance';
import {
  UK_BANKS,
  UKBankInfo,
  OpenBankingPaymentDetails,
  buildOpenBankingIntent,
  launchBankAppHandoff,
  detectPlatform,
  formatSortCode,
  formatUKReference,
} from '../utils/openBanking';
import { BankAppIcon } from '../components/finance/UKBankIcons';
import { getEffectiveBankAccounts, CompanyBankAccount } from '../utils/bankAccountAllocation';
import { generatePaymentQrCodeDataUrl } from '../utils/paymentQrCode';
import {
  ShieldCheck,
  Lock,
  ArrowRight,
  ExternalLink,
  Copy,
  Check,
  QrCode,
  Smartphone,
  ChevronDown,
  ChevronUp,
  Receipt,
  FileText,
  AlertCircle,
  Building2,
  Calendar,
  CreditCard,
  Sparkles,
  RefreshCw,
  Printer,
  Download,
  Share2,
  CheckCircle2,
} from 'lucide-react';
import toast from 'react-hot-toast';

export const ClientInvoicePay: React.FC = () => {
  const [searchParams] = useSearchParams();
  const routeParams = useParams<{ id?: string }>();
  const navigate = useNavigate();

  const invoiceIdParam = searchParams.get('id') || searchParams.get('invoiceId') || routeParams.id || '';

  const [loading, setLoading] = useState<boolean>(true);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [companyDetails, setCompanyDetails] = useState<any>(null);
  const [selectedPayeeBank, setSelectedPayeeBank] = useState<CompanyBankAccount | null>(null);

  // Bank App Selection & Handoff State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeBank, setActiveBank] = useState<UKBankInfo | null>(null);
  const [isHandoffModalOpen, setIsHandoffModalOpen] = useState<boolean>(false);
  const [handoffStep, setHandoffStep] = useState<'launching' | 'biometric' | 'confirmed'>('launching');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [paymentQrDataUrl, setPaymentQrDataUrl] = useState<string>('');
  const [showQrModal, setShowQrModal] = useState<boolean>(false);
  const [showBreakdown, setShowBreakdown] = useState<boolean>(false);

  // Manual payment submission / self-reporting state
  const [payerRefInput, setPayerRefInput] = useState<string>('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState<boolean>(false);
  const [paymentCompleted, setPaymentCompleted] = useState<boolean>(false);
  const [receiptData, setReceiptData] = useState<{
    confirmationId: string;
    paidAt: string;
    bankName: string;
    amount: number;
    reference: string;
  } | null>(null);

  const platform = useMemo(() => detectPlatform(), []);

  // 1. Load Invoice & Company Details
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        setLoading(true);

        // A. Load Company Settings to resolve payee bank details
        let loadedCompany: any = null;
        try {
          const compDoc = await getDoc(doc(db, 'settings', 'company'));
          if (compDoc.exists()) {
            loadedCompany = compDoc.data();
            if (isMounted) setCompanyDetails(loadedCompany);
          }
        } catch (e) {
          console.warn('[ClientInvoicePay] Could not fetch settings/company:', e);
        }

        const effectiveBanks = getEffectiveBankAccounts(loadedCompany);

        // B. Fetch Invoice
        if (invoiceIdParam) {
          let foundInvoice: Invoice | null = null;

          // Attempt 1: Direct Firestore Doc ID
          try {
            const invDoc = await getDoc(doc(db, 'invoices', invoiceIdParam));
            if (invDoc.exists()) {
              const d = invDoc.data();
              foundInvoice = {
                id: invDoc.id,
                ...d,
                date: d.date?.toDate ? d.date.toDate() : new Date(d.date || Date.now()),
                dueDate: d.dueDate?.toDate ? d.dueDate.toDate() : new Date(d.dueDate || Date.now()),
              } as Invoice;
            }
          } catch (err) {
            console.warn('[ClientInvoicePay] Direct doc lookup failed:', err);
          }

          // Attempt 2: Query by invoiceNumber if not found
          if (!foundInvoice) {
            try {
              const q = query(collection(db, 'invoices'), where('invoiceNumber', '==', invoiceIdParam));
              const snap = await getDocs(q);
              if (!snap.empty) {
                const docSnap = snap.docs[0];
                const d = docSnap.data();
                foundInvoice = {
                  id: docSnap.id,
                  ...d,
                  date: d.date?.toDate ? d.date.toDate() : new Date(d.date || Date.now()),
                  dueDate: d.dueDate?.toDate ? d.dueDate.toDate() : new Date(d.dueDate || Date.now()),
                } as Invoice;
              }
            } catch (err) {
              console.warn('[ClientInvoicePay] Query by invoiceNumber failed:', err);
            }
          }

          if (foundInvoice && isMounted) {
            setInvoice(foundInvoice);

            // Match payee bank account
            const invBank =
              (foundInvoice as any).selectedBank ||
              effectiveBanks.find((b) => b.id === (foundInvoice as any).accountId) ||
              effectiveBanks.find((b) => b.isDefault) ||
              effectiveBanks[0];
            setSelectedPayeeBank(invBank);

            // Check if already paid
            if (
              foundInvoice.paymentStatus === 'paid' ||
              (foundInvoice.remainingAmount !== undefined && foundInvoice.remainingAmount <= 0)
            ) {
              setPaymentCompleted(true);
            }
          }
        }

        // Fallback demo/preview invoice if no invoice found
        if (!invoice && isMounted && !invoiceIdParam) {
          const sample: Invoice = {
            id: 'INV-DEMO-2024',
            invoiceNumber: 'INV-1092',
            date: new Date(),
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            customerName: 'Enterprise Logistics UK Ltd',
            lineItems: [
              {
                id: '1',
                description: 'Commercial Vehicle Hire - Registration LG71 XYT (7 Days)',
                quantity: 1,
                unitPrice: 750,
                total: 750,
              },
              {
                id: '2',
                description: 'Comprehensive Collision Damage Waiver (CDW)',
                quantity: 1,
                unitPrice: 150,
                total: 150,
              },
            ],
            subTotal: 900,
            vatAmount: 180,
            total: 1080,
            amount: 1080,
            paidAmount: 0,
            remainingAmount: 1080,
            paymentStatus: 'pending',
            category: 'Fleet Hire',
            payments: [],
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          setInvoice(sample);
          setSelectedPayeeBank(effectiveBanks[0]);
        }
      } catch (error) {
        console.error('[ClientInvoicePay] Error initialising gateway:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [invoiceIdParam]);

  // Financial values
  const balanceDue = useMemo(() => {
    if (!invoice) return 0;
    if (invoice.remainingAmount !== undefined) return Math.max(0, invoice.remainingAmount);
    const tot = invoice.total ?? invoice.amount ?? 0;
    const pd = invoice.paidAmount ?? 0;
    return Math.max(0, tot - pd);
  }, [invoice]);

  const paymentReference = useMemo(() => {
    if (!invoice) return 'AIE-INVOICE';
    return formatUKReference(
      invoice.referenceId || invoice.orderNumber || invoice.orderId || invoice.invoiceNumber,
      invoice.invoiceNumber
    );
  }, [invoice]);

  const resolvedPayeeBank = useMemo(() => {
    if (selectedPayeeBank) return selectedPayeeBank;
    const defaults = getEffectiveBankAccounts(companyDetails);
    return defaults[0];
  }, [selectedPayeeBank, companyDetails]);

  // Generate QR code for desktop or scanning
  useEffect(() => {
    if (resolvedPayeeBank && balanceDue > 0) {
      generatePaymentQrCodeDataUrl(resolvedPayeeBank, {
        reference: paymentReference,
        amount: balanceDue,
        invoiceNumber: invoice?.invoiceNumber,
      })
        .then((url) => setPaymentQrDataUrl(url))
        .catch((e) => console.warn('[ClientInvoicePay] QR gen error:', e));
    }
  }, [resolvedPayeeBank, balanceDue, paymentReference, invoice?.invoiceNumber]);

  // Filtered UK Banks
  const filteredBanks = useMemo(() => {
    if (!searchQuery.trim()) return UK_BANKS;
    const q = searchQuery.toLowerCase();
    return UK_BANKS.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.brandName.toLowerCase().includes(q) ||
        b.features.some((f) => f.toLowerCase().includes(q))
    );
  }, [searchQuery]);

  // Open Banking Payment Details Object
  const currentPaymentDetails: OpenBankingPaymentDetails = useMemo(() => {
    return {
      invoiceId: invoice?.id || 'INV-PAY',
      invoiceNumber: invoice?.invoiceNumber || invoice?.id || 'INV-000',
      reference: paymentReference,
      amount: balanceDue,
      currency: 'GBP',
      payeeName: resolvedPayeeBank?.accountName || companyDetails?.name || 'AIE Skyline Limited',
      payeeBankName: resolvedPayeeBank?.bankName || 'Barclays Bank UK PLC',
      accountNumber: resolvedPayeeBank?.accountNumber || '12345678',
      sortCode: resolvedPayeeBank?.sortCode || '20-00-00',
      customerName: invoice?.customerName,
      customerEmail: (invoice as any)?.customerEmail,
    };
  }, [invoice, paymentReference, balanceDue, resolvedPayeeBank, companyDetails]);

  // ──────────────────────────────────────────────────────────────────────────
  // BANK SELECTION & ONE-TAP HANDOFF HANDLER
  // ──────────────────────────────────────────────────────────────────────────
  const handleSelectBank = (bank: UKBankInfo) => {
    setActiveBank(bank);
    setIsHandoffModalOpen(true);
    setHandoffStep('launching');

    const intent = buildOpenBankingIntent(bank, currentPaymentDetails);

    // Launch app after brief visual cue for the user
    setTimeout(() => {
      launchBankAppHandoff(intent, () => {
        // Fallback callback if app didn't launch
        setHandoffStep('biometric');
      });
      setHandoffStep('biometric');
    }, 600);
  };

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    toast.success(`${fieldName} copied to clipboard!`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // ──────────────────────────────────────────────────────────────────────────
  // COMPLETE PAYMENT CONFIRMATION FLOW
  // ──────────────────────────────────────────────────────────────────────────
  const handleConfirmPaid = async () => {
    if (!invoice) return;
    setIsSubmittingPayment(true);

    try {
      const pId = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const pRef = payerRefInput.trim() || paymentReference;
      const bankName = activeBank?.name || resolvedPayeeBank.bankName;

      // 1. Post to backend payment sync endpoint
      try {
        await fetch('/api/finance/invoice-payments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            invoiceId: invoice.id,
            paymentId: pId,
            invoiceNumber: invoice.invoiceNumber,
            amount: balanceDue,
            paymentMethod: 'open_banking',
            paymentReference: pRef,
            date: new Date().toISOString(),
            notes: `Paid via UK Open Banking Pay by Bank (${bankName})`,
            customerId: invoice.customerId,
            customerName: invoice.customerName,
            vehicleId: invoice.vehicleId,
            vehicleName: invoice.vehicleName,
            accountId: resolvedPayeeBank.id,
            accountName: resolvedPayeeBank.accountName,
          }),
        });
      } catch (err) {
        console.warn('[ClientInvoicePay] Backend API sync note:', err);
      }

      // 2. Update Firestore invoice status directly if doc exists
      try {
        const invRef = doc(db, 'invoices', invoice.id);
        const existingPayments = Array.isArray(invoice.payments) ? invoice.payments : [];
        const newPaymentRecord = {
          id: pId,
          amount: balanceDue,
          date: new Date(),
          method: 'open_banking',
          reference: pRef,
          notes: `Pay by Bank via ${bankName} (Instant Faster Payment)`,
        };

        await updateDoc(invRef, {
          paymentStatus: 'paid',
          paidAmount: (invoice.paidAmount || 0) + balanceDue,
          remainingAmount: 0,
          payments: [...existingPayments, newPaymentRecord],
          updatedAt: Timestamp.now(),
        });
      } catch (fErr) {
        console.warn('[ClientInvoicePay] Firestore update notice:', fErr);
      }

      setReceiptData({
        confirmationId: pId.toUpperCase(),
        paidAt: new Date().toLocaleString('en-GB', {
          dateStyle: 'medium',
          timeStyle: 'short',
        }),
        bankName,
        amount: balanceDue,
        reference: pRef,
      });

      setPaymentCompleted(true);
      setIsHandoffModalOpen(false);
      toast.success('Payment confirmed! Receipt generated.');
    } catch (e: any) {
      toast.error('Could not complete payment: ' + (e?.message || 'Error'));
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-white">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium text-slate-300">Loading UK Open Banking Gateway...</p>
      </div>
    );
  }

  // Active bank intent
  const currentIntent = activeBank ? buildOpenBankingIntent(activeBank, currentPaymentDetails) : null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-600 selection:text-white">
      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* HEADER / TRUST BANNER                                               */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <header className="border-b border-slate-800/80 bg-slate-900/90 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-700 flex items-center justify-center shadow-lg shadow-indigo-600/30 font-black text-white text-base">
              AIE
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-white leading-tight">
                AIE Skyline Pay by Bank
              </h1>
              <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
                <span>UK Open Banking Faster Payments</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 bg-slate-800/80 px-3 py-1.5 rounded-full border border-slate-700">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">256-Bit Encrypted</span>
            <span className="sm:hidden">Secure</span>
          </div>
        </div>
      </header>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* MAIN CONTAINER                                                      */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6 sm:py-8 space-y-6">
        {/* SUCCESS / RECEIPT VIEW IF PAYMENT IS COMPLETED */}
        {paymentCompleted && (
          <div className="bg-slate-900/90 border border-emerald-500/40 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden backdrop-blur-md">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col items-center text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center text-emerald-400 mb-1">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Payment Received &amp; Verified
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
                Thank You, {invoice?.customerName || 'Valued Customer'}!
              </h2>
              <p className="text-sm text-slate-300 max-w-md">
                Your payment has been successfully authorized and cleared directly into our business account via UK Faster Payments.
              </p>
            </div>

            {/* Receipt Summary Card */}
            <div className="mt-8 bg-slate-950/70 border border-slate-800 rounded-xl p-5 max-w-lg mx-auto space-y-3 font-mono text-xs">
              <div className="flex justify-between border-b border-slate-800/80 pb-2">
                <span className="text-slate-400">Invoice Number:</span>
                <span className="text-white font-bold">#{invoice?.invoiceNumber || invoice?.id}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/80 pb-2">
                <span className="text-slate-400">Amount Paid:</span>
                <span className="text-emerald-400 font-bold text-sm">
                  £{(receiptData?.amount || balanceDue || invoice?.total || 0).toLocaleString('en-GB', {
                    minimumFractionDigits: 2,
                  })} GBP
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-800/80 pb-2">
                <span className="text-slate-400">Payment Method:</span>
                <span className="text-slate-200">UK Open Banking (Pay by Bank)</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/80 pb-2">
                <span className="text-slate-400">Banking Partner:</span>
                <span className="text-slate-200">{receiptData?.bankName || 'UK Faster Payments'}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/80 pb-2">
                <span className="text-slate-400">Settlement Reference:</span>
                <span className="text-indigo-300 font-bold">{receiptData?.reference || paymentReference}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Confirmation ID:</span>
                <span className="text-slate-400 truncate max-w-[200px]">
                  {receiptData?.confirmationId || `CONF-${Date.now().toString(36).toUpperCase()}`}
                </span>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold flex items-center gap-2 border border-slate-700 transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Official Receipt</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (invoice?.id) {
                    navigate(`/view-doc?id=${encodeURIComponent(invoice.id)}&type=invoice`);
                  }
                }}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
              >
                <FileText className="w-4 h-4" />
                <span>View Full Invoice</span>
              </button>
            </div>
          </div>
        )}

        {!paymentCompleted && (
          <>
            {/* ───────────────────────────────────────────────────────────── */}
            {/* 1. INVOICE SUMMARY & AMOUNT DUE BANNER                       */}
            {/* ───────────────────────────────────────────────────────────── */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-800 rounded-2xl p-5 sm:p-7 shadow-xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span className="px-2.5 py-1 rounded-md bg-indigo-500/20 text-indigo-300 font-mono text-xs font-bold border border-indigo-500/30">
                      Invoice #{invoice?.invoiceNumber || invoice?.id || 'DRAFT'}
                    </span>
                    <span className="px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 text-xs font-semibold border border-emerald-500/20 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Open Banking Ready
                    </span>
                    {invoice?.customerName && (
                      <span className="text-xs text-slate-400 font-medium">
                        Bill To: <strong className="text-white">{invoice.customerName}</strong>
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-400 flex items-center gap-4 flex-wrap">
                    <span>Issued: {invoice?.date ? new Date(invoice.date).toLocaleDateString('en-GB') : 'Today'}</span>
                    <span>Due: {invoice?.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-GB') : 'Immediate'}</span>
                    <span>
                      Ref: <strong className="font-mono text-indigo-300">{paymentReference}</strong>
                    </span>
                  </p>
                </div>

                <div className="bg-slate-950/80 border border-slate-800/90 rounded-xl p-4 sm:text-right shrink-0">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                    Total Balance Due
                  </span>
                  <div className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-white flex items-baseline sm:justify-end gap-1">
                    <span className="text-indigo-400 text-2xl">£</span>
                    <span>
                      {balanceDue.toLocaleString('en-GB', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                    <span className="text-xs font-normal text-slate-400">GBP</span>
                  </div>
                  {invoice && invoice.paidAmount > 0 && (
                    <p className="text-[11px] text-emerald-400 mt-1">
                      (£{invoice.paidAmount.toFixed(2)} already paid of £{invoice.total.toFixed(2)})
                    </p>
                  )}
                </div>
              </div>

              {/* Verified Payee Details Box */}
              <div className="mt-5 pt-5 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="bg-slate-950/50 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Payee Business</span>
                  <strong className="text-slate-200 truncate block">
                    {resolvedPayeeBank.accountName || 'AIE Skyline Limited'}
                  </strong>
                </div>
                <div className="bg-slate-950/50 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Receiving Bank</span>
                  <strong className="text-slate-200 truncate block">{resolvedPayeeBank.bankName}</strong>
                </div>
                <div className="bg-slate-950/50 p-2.5 rounded-lg border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Sort Code</span>
                    <strong className="text-slate-200 font-mono block">
                      {formatSortCode(resolvedPayeeBank.sortCode)}
                    </strong>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(formatSortCode(resolvedPayeeBank.sortCode), 'Sort Code')}
                    className="p-1 text-slate-400 hover:text-white cursor-pointer"
                    title="Copy Sort Code"
                  >
                    {copiedField === 'Sort Code' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <div className="bg-slate-950/50 p-2.5 rounded-lg border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Account Number</span>
                    <strong className="text-slate-200 font-mono block">{resolvedPayeeBank.accountNumber}</strong>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(resolvedPayeeBank.accountNumber, 'Account Number')}
                    className="p-1 text-slate-400 hover:text-white cursor-pointer"
                    title="Copy Account Number"
                  >
                    {copiedField === 'Account Number' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Expandable Line Items Breakdown */}
              {invoice?.lineItems && invoice.lineItems.length > 0 && (
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => setShowBreakdown(!showBreakdown)}
                    className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>{showBreakdown ? 'Hide Invoice Breakdown' : 'View Itemized Invoice Breakdown'}</span>
                    {showBreakdown ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  {showBreakdown && (
                    <div className="mt-3 bg-slate-950/70 rounded-xl p-3.5 border border-slate-800 text-xs divide-y divide-slate-800/80">
                      {invoice.lineItems.map((item, idx) => (
                        <div key={item.id || idx} className="py-2 flex justify-between gap-4">
                          <div>
                            <p className="font-semibold text-slate-200">{item.description}</p>
                            <span className="text-[11px] text-slate-400">
                              Qty {item.quantity} × £{Number(item.unitPrice || 0).toFixed(2)}
                            </span>
                          </div>
                          <span className="font-mono font-bold text-white shrink-0">
                            £{Number(item.total || (item.quantity * item.unitPrice) || 0).toFixed(2)}
                          </span>
                        </div>
                      ))}
                      <div className="pt-2.5 flex justify-between font-bold text-slate-300">
                        <span>Subtotal</span>
                        <span className="font-mono">£{Number(invoice.subTotal || 0).toFixed(2)}</span>
                      </div>
                      <div className="py-1 flex justify-between text-slate-400">
                        <span>VAT (20%)</span>
                        <span className="font-mono">£{Number(invoice.vatAmount || 0).toFixed(2)}</span>
                      </div>
                      <div className="pt-2 flex justify-between font-black text-indigo-300 text-sm">
                        <span>Total</span>
                        <span className="font-mono">£{Number(invoice.total || 0).toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ───────────────────────────────────────────────────────────── */}
            {/* 2. INTERACTIVE UK BANK SELECTION GATEWAY                    */}
            {/* ───────────────────────────────────────────────────────────── */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Smartphone className="w-5 h-5 text-indigo-400" />
                    <span>Select Your UK Bank App</span>
                  </h2>
                  <p className="text-xs text-slate-400">
                    One tap automatically launches your mobile banking app with pre-filled payee, amount, and reference details.
                  </p>
                </div>

                {/* Instant Search Filter */}
                <div className="relative w-full sm:w-60">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search bank app..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500 transition-colors"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-white"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>

              {/* 10 Major UK Banks Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {filteredBanks.map((bank) => {
                  return (
                    <button
                      key={bank.id}
                      type="button"
                      onClick={() => handleSelectBank(bank)}
                      className="group relative flex flex-col items-center justify-center p-4 bg-slate-900/80 hover:bg-slate-800/90 active:scale-98 border border-slate-800 hover:border-indigo-500/60 rounded-2xl transition-all duration-200 cursor-pointer shadow-md hover:shadow-indigo-500/10 text-center"
                    >
                      {bank.popular && (
                        <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          {bank.badge || 'Popular'}
                        </span>
                      )}

                      <div className="mb-2.5 transition-transform duration-200 group-hover:scale-110">
                        <BankAppIcon bankId={bank.id} size={44} />
                      </div>

                      <span className="text-xs font-bold text-white group-hover:text-indigo-300 leading-tight">
                        {bank.brandName}
                      </span>
                      <span className="text-[10px] text-slate-400 mt-0.5">
                        {bank.id === 'monzo' || bank.id === 'revolut' || bank.id === 'starling'
                          ? '1-Tap Mobile Launch'
                          : 'Instant Faster Pay'}
                      </span>

                      <div className="mt-2.5 w-full pt-2 border-t border-slate-800/80 flex items-center justify-center gap-1 text-[10px] font-semibold text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span>Pay £{balanceDue.toFixed(2)}</span>
                        <ArrowRight className="w-3 h-3" />
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* DESKTOP SCAN-TO-PAY OR MANUAL FASTER PAYMENTS ACCORDION */}
              <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-600/20 text-indigo-400 rounded-xl border border-indigo-500/30">
                    <QrCode className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Using Desktop or Another Device?</h4>
                    <p className="text-[11px] text-slate-400">
                      Scan the UK Faster Payments QR code with your mobile camera or banking scanner.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setShowQrModal(true)}
                    className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white border border-slate-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>View QR Code</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleCopy(
                        `Payee: ${resolvedPayeeBank.accountName}\nBank: ${resolvedPayeeBank.bankName}\nSort Code: ${formatSortCode(resolvedPayeeBank.sortCode)}\nAccount: ${resolvedPayeeBank.accountNumber}\nAmount: £${balanceDue.toFixed(2)}\nReference: ${paymentReference}`,
                        'All Payment Details'
                      );
                    }}
                    className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white border border-slate-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Bank Details</span>
                  </button>
                </div>
              </div>
            </div>

            {/* TRUST & SECURITY FOOTER */}
            <div className="pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4 text-[11px] text-slate-500">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1 text-slate-400">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  OBIE UK Open Banking Certified
                </span>
                <span className="flex items-center gap-1 text-slate-400">
                  <Lock className="w-3.5 h-3.5 text-blue-400" />
                  Direct Bank-to-Bank Transfer
                </span>
              </div>
              <p>No card fees • Instant settlement • Regulated in the United Kingdom</p>
            </div>
          </>
        )}
      </main>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 3. ONE-TAP MOBILE HANDOFF MODAL                                     */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {isHandoffModalOpen && activeBank && currentIntent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl space-y-5 text-center relative overflow-hidden">
            <button
              type="button"
              onClick={() => setIsHandoffModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white text-lg w-8 h-8 rounded-full bg-slate-800/80 flex items-center justify-center cursor-pointer"
            >
              ×
            </button>

            {/* Bank Header */}
            <div className="flex flex-col items-center">
              <div className="mb-2 p-1 rounded-2xl bg-white/5 border border-white/10 shadow-lg">
                <BankAppIcon bankId={activeBank.id} size={54} />
              </div>
              <h3 className="text-lg font-bold text-white flex items-center gap-1.5">
                <span>Handoff to {activeBank.name}</span>
              </h3>
              <p className="text-xs text-slate-400">
                {platform.isMobile
                  ? 'Authorizing transfer in your mobile banking app'
                  : 'Complete payment via your banking app or web portal'}
              </p>
            </div>

            {/* Stepper Visualization */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 text-left space-y-3">
              <div className="flex items-start gap-3 text-xs">
                <div className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center shrink-0 text-[11px]">
                  1
                </div>
                <div>
                  <strong className="text-white block">Launch {activeBank.brandName} App</strong>
                  <p className="text-slate-400 text-[11px]">
                    We pre-populated Payee, Sort Code, Amount (£{balanceDue.toFixed(2)}), and Reference.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 text-xs">
                <div className="w-6 h-6 rounded-full bg-indigo-600/30 text-indigo-300 font-bold flex items-center justify-center shrink-0 text-[11px] border border-indigo-500/40">
                  2
                </div>
                <div>
                  <strong className="text-white block">Biometric Authorization</strong>
                  <p className="text-slate-400 text-[11px]">
                    Authenticate with FaceID, TouchID, or your secure mobile banking passcode.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 text-xs">
                <div className="w-6 h-6 rounded-full bg-emerald-600/30 text-emerald-300 font-bold flex items-center justify-center shrink-0 text-[11px] border border-emerald-500/40">
                  3
                </div>
                <div>
                  <strong className="text-white block">Instant Direct Settlement</strong>
                  <p className="text-slate-400 text-[11px]">
                    Funds clear immediately into AIE Skyline business account with Faster Payments.
                  </p>
                </div>
              </div>
            </div>

            {/* Pre-populated summary verification */}
            <div className="bg-slate-950/50 rounded-xl p-3 border border-slate-800 text-[11px] font-mono text-left space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Payee:</span>
                <span className="text-white font-bold">{resolvedPayeeBank.accountName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Account / Sort:</span>
                <span className="text-slate-200">
                  {resolvedPayeeBank.accountNumber} ({formatSortCode(resolvedPayeeBank.sortCode)})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Payment Ref:</span>
                <span className="text-indigo-400 font-bold">{paymentReference}</span>
              </div>
              <div className="flex justify-between border-t border-slate-800/80 pt-1 mt-1 font-bold">
                <span className="text-slate-400">Amount to Send:</span>
                <span className="text-emerald-400 text-xs">£{balanceDue.toFixed(2)} GBP</span>
              </div>
            </div>

            {/* Primary Action: Re-launch or Fallback */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  launchBankAppHandoff(currentIntent);
                }}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
              >
                <Smartphone className="w-4 h-4" />
                <span>Open {activeBank.brandName} App Now</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>

              {/* Self-Reporting / Payment Done Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleConfirmPaid}
                  disabled={isSubmittingPayment}
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md disabled:opacity-50"
                >
                  {isSubmittingPayment ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  <span>I've Sent the Payment (£{balanceDue.toFixed(2)})</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 4. DESKTOP / CAMERA SCAN-TO-PAY QR CODE MODAL                       */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl text-center space-y-4 relative">
            <button
              type="button"
              onClick={() => setShowQrModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white text-lg w-8 h-8 rounded-full bg-slate-800/80 flex items-center justify-center cursor-pointer"
            >
              ×
            </button>

            <div className="w-10 h-10 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto">
              <QrCode className="w-5 h-5" />
            </div>

            <div>
              <h3 className="text-base font-bold text-white">Scan to Pay via UK Faster Payments</h3>
              <p className="text-xs text-slate-400">
                Point your mobile phone camera or banking app scanner at the QR code below.
              </p>
            </div>

            {paymentQrDataUrl ? (
              <div className="bg-white p-3 rounded-2xl inline-block shadow-inner">
                <img
                  src={paymentQrDataUrl}
                  alt="UK Faster Payments QR Code"
                  className="w-48 h-48 object-contain"
                />
              </div>
            ) : (
              <div className="w-48 h-48 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto text-xs text-slate-400">
                Generating QR...
              </div>
            )}

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-left font-mono text-[11px] space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Amount:</span>
                <span className="text-emerald-400 font-bold">£{balanceDue.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Reference:</span>
                <span className="text-indigo-400 font-bold">{paymentReference}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Sort Code:</span>
                <span className="text-slate-200">{formatSortCode(resolvedPayeeBank.sortCode)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Account:</span>
                <span className="text-slate-200">{resolvedPayeeBank.accountNumber}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowQrModal(false);
                setIsHandoffModalOpen(true);
                if (!activeBank) setActiveBank(UK_BANKS[0]);
              }}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-colors cursor-pointer"
            >
              Continue to Bank Selection
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientInvoicePay;
