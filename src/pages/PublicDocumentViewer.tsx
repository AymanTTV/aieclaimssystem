// src/pages/PublicDocumentViewer.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  FileText,
  Download,
  Printer,
  ArrowLeft,
  ExternalLink,
  Loader2,
  AlertCircle,
  Landmark,
  QrCode,
  PenTool,
  CheckCircle2,
  ShieldCheck,
  Copy,
  Check,
  ChevronRight,
  Maximize2,
  CreditCard,
  Building2,
  Smartphone,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Rental, Vehicle, Customer, Invoice, Claim } from '../types';
import { generateRentalDocuments } from '../utils/generateRentalDocuments';
import SignaturePadComponent from '../components/ui/SignaturePad';
import {
  CompanyBankAccount,
  DEFAULT_COMPANY_BANK_ACCOUNTS,
  getEffectiveBankAccounts,
  getDefaultBankAccount,
} from '../utils/bankAccountAllocation';
import { generatePaymentQrCodeDataUrl } from '../utils/paymentQrCode';
import { formatSignatureTimestamp, stampSignatureImage } from '../utils/signatureStamp';

export const PublicDocumentViewer: React.FC = () => {
  const [searchParams] = useSearchParams();
  const params = useParams<{ rentalId?: string; docType?: string; id?: string }>();
  const navigate = useNavigate();

  const docId = params.id || params.rentalId || searchParams.get('id') || searchParams.get('rentalId') || '';
  const rawDocType = params.docType || searchParams.get('type') || searchParams.get('docType') || 'hireAgreement';
  const docType = rawDocType.trim().toLowerCase();
  const docRef = searchParams.get('ref') || docId;
  const bankParam = searchParams.get('bank') || '';
  const directUrl = searchParams.get('url') || '';

  const [pdfUrl, setPdfUrl] = useState<string>(directUrl && !directUrl.startsWith('blob:') ? directUrl : '');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [docTitle, setDocTitle] = useState<string>('Document Review');

  // Generic document payload state
  const [rental, setRental] = useState<Rental | null>(null);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [claim, setClaim] = useState<Claim | null>(null);
  const [companyDetails, setCompanyDetails] = useState<any>(null);

  // Bank & Payment QR state
  const [selectedBank, setSelectedBank] = useState<CompanyBankAccount | null>(null);
  const [paymentQrUrl, setPaymentQrUrl] = useState<string>('');
  const [copiedBank, setCopiedBank] = useState<boolean>(false);

  // E-Signature state
  const [signerName, setSignerName] = useState<string>('');
  const [signatureData, setSignatureData] = useState<string>('');
  const [agreeTerms, setAgreeTerms] = useState<boolean>(false);
  const [submittingSignature, setSubmittingSignature] = useState<boolean>(false);
  const [isSigned, setIsSigned] = useState<boolean>(false);
  const [signedAtTimestamp, setSignedAtTimestamp] = useState<string>('');

  // Mobile tab state
  const [mobileTab, setMobileTab] = useState<'preview' | 'payment' | 'sign'>('preview');

  // Friendly title mapping
  useEffect(() => {
    if (docType.includes('invoice')) {
      setDocTitle('Rental & Services Invoice');
    } else if (docType.includes('claimhire') || docType.includes('claim_hire')) {
      setDocTitle('Claim Hire Agreement');
    } else if (docType.includes('hire') || docType.includes('agreement')) {
      setDocTitle('Vehicle Hire Agreement');
    } else if (docType.includes('permit')) {
      setDocTitle('Vehicle Parking Permit');
    } else if (docType.includes('condition')) {
      setDocTitle('Condition of Hire');
    } else if (docType.includes('claim')) {
      setDocTitle('Incident & Claim Record');
    } else {
      setDocTitle('Official Corporate Document');
    }
  }, [docType]);

  // Load document and company bank details
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      setLoading(true);
      setError(null);

      try {
        // 1. Fetch Company Settings to resolve multi-bank accounts
        let baseCompany: any = null;
        try {
          const compSnap = await getDoc(doc(db, 'company', 'details'));
          if (compSnap.exists()) {
            baseCompany = compSnap.data();
            if (isMounted) setCompanyDetails(baseCompany);
          }
        } catch (compErr) {
          console.warn('[PublicDocumentViewer] Failed to load company settings:', compErr);
        }

        const availableBanks = getEffectiveBankAccounts(baseCompany);
        let matchedBank: CompanyBankAccount | undefined;

        if (bankParam) {
          matchedBank = availableBanks.find((b) => b.id === bankParam);
        }

        // 2. Fetch specific document record (Invoice, Rental, or Claim)
        let loadedCustomerName = '';
        let loadedDocRef = docRef;
        let amountCandidate = 0;

        if (docType.includes('invoice')) {
          try {
            const invSnap = await getDoc(doc(db, 'invoices', docId));
            if (invSnap.exists()) {
              const invData = { id: invSnap.id, ...invSnap.data() } as Invoice;
              if (isMounted) setInvoice(invData);
              loadedCustomerName = invData.customerName || '';
              loadedDocRef = invData.invoiceNumber || docId;
              amountCandidate = invData.remainingAmount || invData.totalAmount || 0;

              if (!matchedBank && (invData as any).bankAllocation?.id) {
                matchedBank = availableBanks.find((b) => b.id === (invData as any).bankAllocation.id);
              }
              if (invData.pdfUrl) {
                if (isMounted) setPdfUrl(invData.pdfUrl);
              }
              if ((invData as any).isSigned || (invData as any).signedAt) {
                if (isMounted) {
                  setIsSigned(true);
                  setSignedAtTimestamp((invData as any).signatureTimestamp || 'Signed online');
                }
              }
            }
          } catch (invErr) {
            console.warn('[PublicDocumentViewer] Not found in invoices:', invErr);
          }
        }

        // If not found or if rental/claim doc, check rentals
        if (!invoice && (docType.includes('rental') || docType.includes('hire') || docType.includes('agreement') || !docType)) {
          try {
            const rentalSnap = await getDoc(doc(db, 'rentals', docId));
            if (rentalSnap.exists()) {
              const rentalData = { id: rentalSnap.id, ...rentalSnap.data() } as Rental;
              if (isMounted) setRental(rentalData);
              loadedCustomerName = (rentalData as any).customerName || (rentalData as any).customer?.name || '';
              loadedDocRef = rentalData.rentalAgreementNumber || docId;

              if (!matchedBank && (rentalData as any).bankAllocation?.id) {
                matchedBank = availableBanks.find((b) => b.id === (rentalData as any).bankAllocation.id);
              }

              // Check existing documents
              const docs = (rentalData.documents as any) || {};
              let targetUrl = '';
              if (docType.includes('invoice')) {
                targetUrl = docs.invoice || '';
              } else if (docType.includes('permit')) {
                targetUrl = docs.permit || '';
              } else {
                targetUrl = docs.hireAgreement || docs.agreement || '';
              }

              if (targetUrl && (targetUrl.startsWith('http://') || targetUrl.startsWith('https://'))) {
                if (isMounted) setPdfUrl(targetUrl);
              } else {
                // Dynamically compile on the fly
                const gen = await generateRentalDocuments(
                  rentalData,
                  rentalData.vehicle || ({ make: '', model: '', registrationNumber: 'N/A' } as any),
                  rentalData.customer || ({ name: loadedCustomerName || 'Customer' } as any)
                );
                const generatedBlob = docType.includes('invoice') ? gen.invoice : gen.agreement;
                if (generatedBlob && isMounted) {
                  setPdfUrl(URL.createObjectURL(generatedBlob));
                }
              }

              if ((rentalData as any).isSigned || (rentalData as any).signedAt) {
                if (isMounted) {
                  setIsSigned(true);
                  setSignedAtTimestamp((rentalData as any).signatureTimestamp || 'Signed online');
                }
              }
            }
          } catch (rErr) {
            console.warn('[PublicDocumentViewer] Failed to load rental:', rErr);
          }
        }

        // Check claims collection if claim
        if (docType.includes('claim')) {
          try {
            const claimSnap = await getDoc(doc(db, 'claims', docId));
            if (claimSnap.exists()) {
              const claimData = { id: claimSnap.id, ...claimSnap.data() } as Claim;
              if (isMounted) setClaim(claimData);
              loadedCustomerName = claimData.clientName || claimData.driverName || '';
              loadedDocRef = claimData.clientRef || docId;

              if (!matchedBank && (claimData as any).bankAllocation?.id) {
                matchedBank = availableBanks.find((b) => b.id === (claimData as any).bankAllocation.id);
              }
            }
          } catch (cErr) {
            console.warn('[PublicDocumentViewer] Failed to load claim:', cErr);
          }
        }

        // Set default resolved bank
        const finalBank = matchedBank || getDefaultBankAccount(baseCompany) || availableBanks[0] || DEFAULT_COMPANY_BANK_ACCOUNTS[0];
        if (isMounted) {
          setSelectedBank(finalBank);
          if (loadedCustomerName) {
            setSignerName(loadedCustomerName);
          }
        }

        // 3. Generate scannable payment QR code linking to this bank and document
        if (finalBank) {
          const qr = await generatePaymentQrCodeDataUrl(finalBank, {
            reference: loadedDocRef || 'AIE-DOC',
            amount: amountCandidate > 0 ? amountCandidate : undefined,
          });
          if (isMounted) setPaymentQrUrl(qr);
        }

        if (isMounted) setLoading(false);
      } catch (err: any) {
        console.error('[PublicDocumentViewer] Error loading document:', err);
        if (isMounted) {
          setError(err?.message || 'Could not load document preview.');
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [docId, docType, bankParam, directUrl]);

  // Handle Copy Bank Details
  const handleCopyBank = async () => {
    if (!selectedBank) return;
    const details = [
      `Bank: ${selectedBank.bankName}`,
      `Account Name: ${selectedBank.accountName}`,
      `Sort Code: ${selectedBank.sortCode}`,
      `Account Number: ${selectedBank.accountNumber}`,
      selectedBank.iban ? `IBAN: ${selectedBank.iban}` : '',
      `Reference: ${docRef || 'AIE-PAYMENT'}`,
    ]
      .filter(Boolean)
      .join('\n');

    try {
      await navigator.clipboard.writeText(details);
      setCopiedBank(true);
      toast.success('Bank transfer details copied to clipboard!');
      setTimeout(() => setCopiedBank(false), 2500);
    } catch {
      toast.error('Failed to copy bank details');
    }
  };

  // Handle Online E-Signature Submission
  const handleSignDocument = async () => {
    if (!signatureData) {
      toast.error('Please provide your signature on the pad above.');
      return;
    }
    if (!agreeTerms) {
      toast.error('Please confirm that you agree to the document terms and conditions.');
      return;
    }

    setSubmittingSignature(true);
    try {
      const now = new Date();
      const timestampText = formatSignatureTimestamp(now);
      const stamped = await stampSignatureImage(signatureData, timestampText, signerName || 'Client');

      // Attempt saving to Firestore document if record exists
      if (docId) {
        try {
          if (invoice) {
            await updateDoc(doc(db, 'invoices', docId), {
              isSigned: true,
              signature: stamped,
              signatureTimestamp: timestampText,
              signedAt: now,
              signerName: signerName || 'Client',
              termsAccepted: true,
            });
          } else if (rental) {
            await updateDoc(doc(db, 'rentals', docId), {
              isSigned: true,
              signature: stamped,
              signatureTimestamp: timestampText,
              signedAt: now,
              signerName: signerName || 'Client',
              termsAccepted: true,
            });
          } else if (claim) {
            await updateDoc(doc(db, 'claims', docId), {
              isSigned: true,
              signature: stamped,
              signatureTimestamp: timestampText,
              signedAt: now,
              signerName: signerName || 'Client',
              termsAccepted: true,
            });
          }
        } catch (dbErr) {
          console.warn('[PublicDocumentViewer] Note: Firestore update skipped:', dbErr);
        }
      }

      setIsSigned(true);
      setSignedAtTimestamp(timestampText);
      toast.success('Document electronically signed and authorized successfully!');
    } catch (err: any) {
      console.error('[PublicDocumentViewer] Signature submission failed:', err);
      toast.error('Failed to authorize signature. Please try again.');
    } finally {
      setSubmittingSignature(false);
    }
  };

  // Download PDF
  const handleDownload = async () => {
    if (!pdfUrl) return;
    try {
      const a = document.createElement('a');
      a.href = pdfUrl;
      a.download = `${docTitle.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_')}_${docRef}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      window.open(pdfUrl, '_blank');
    }
  };

  // Print PDF via iframe
  const handlePrint = () => {
    if (!pdfUrl) return;
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = pdfUrl;
    document.body.appendChild(iframe);
    iframe.onload = () => {
      setTimeout(() => {
        iframe.focus();
        iframe.contentWindow?.print();
      }, 500);
    };
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* ── HEADER NAVIGATION BAR ── */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-30 px-4 py-3 sm:px-8 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600/30 text-indigo-400 border border-indigo-500/40 rounded-xl">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-bold text-white tracking-wide">{docTitle}</h1>
              {isSigned && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  Signed
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400">
              Ref: <span className="font-mono font-semibold text-slate-300">{docRef}</span> • Secure Client Portal
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {pdfUrl && (
            <>
              <button
                type="button"
                onClick={handlePrint}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg border border-slate-700 transition cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print</span>
              </button>
              <button
                type="button"
                onClick={handleDownload}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg shadow-sm transition active:scale-95 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download PDF</span>
              </button>
            </>
          )}
        </div>
      </header>

      {/* ── MOBILE TAB SWITCHER ── */}
      <div className="lg:hidden flex border-b border-slate-800 bg-slate-900 px-2 py-1.5 gap-1">
        <button
          type="button"
          onClick={() => setMobileTab('preview')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition ${
            mobileTab === 'preview'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Document</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('payment')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition ${
            mobileTab === 'payment'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <QrCode className="w-3.5 h-3.5" />
          <span>Payment &amp; QR</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('sign')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition ${
            mobileTab === 'sign'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <PenTool className="w-3.5 h-3.5" />
          <span>Sign Online</span>
        </button>
      </div>

      {/* ── MAIN CONTENT AREA ── */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 flex flex-col lg:flex-row gap-6 min-h-0">
        {loading ? (
          <div className="flex-1 bg-slate-900/60 rounded-2xl p-12 border border-slate-800 flex flex-col items-center justify-center text-center">
            <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
            <h2 className="text-base font-bold text-white">Loading Secure Document...</h2>
            <p className="text-xs text-slate-400 mt-1">
              Preparing document preview, bank allocation credentials, and signing pad.
            </p>
          </div>
        ) : error ? (
          <div className="flex-1 bg-slate-900/60 rounded-2xl p-12 border border-rose-900/50 flex flex-col items-center justify-center text-center">
            <div className="p-3 bg-rose-500/20 text-rose-400 rounded-full mb-3 border border-rose-500/30">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h2 className="text-base font-bold text-white">Document Currently Unavailable</h2>
            <p className="text-xs text-rose-400 mt-1 mb-4 max-w-md">{error}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-500 transition"
            >
              Reload Document
            </button>
          </div>
        ) : (
          <>
            {/* ── LEFT: DOCUMENT PREVIEW CANVAS ── */}
            <div
              className={`flex-1 lg:flex-[1.4] bg-slate-900 rounded-2xl border border-slate-800 shadow-xl overflow-hidden flex flex-col min-h-[600px] ${
                mobileTab !== 'preview' ? 'hidden lg:flex' : 'flex'
              }`}
            >
              <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs">
                <span className="font-bold text-slate-300 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-indigo-400" />
                  <span>Document View</span>
                </span>
                <span className="text-[11px] text-slate-500 font-mono">
                  {docRef ? `Reference: ${docRef}` : 'Live Preview'}
                </span>
              </div>

              <div className="flex-1 bg-slate-950 p-2 sm:p-4 flex items-center justify-center overflow-auto min-h-[500px]">
                {pdfUrl ? (
                  <iframe
                    src={`${pdfUrl}#toolbar=0&navpanes=0`}
                    title={docTitle}
                    className="w-full h-full min-h-[600px] border-0 rounded-xl bg-white shadow-md"
                  />
                ) : (
                  <div className="text-center p-8 text-slate-400 text-xs">
                    <p className="font-semibold text-slate-300 mb-2">PDF Document Ready</p>
                    <p className="mb-4">Click below to open or download the complete PDF file:</p>
                    <button
                      type="button"
                      onClick={handleDownload}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold"
                    >
                      Download Document
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* ── RIGHT: SETTLEMENT BANK & E-SIGNATURE CONTROL PANEL ── */}
            <div
              className={`flex-1 lg:flex-[1.0] flex flex-col gap-4 overflow-y-auto ${
                mobileTab === 'preview' ? 'hidden lg:flex' : 'flex'
              }`}
            >
              {/* SECTION 1: BANK ALLOCATION & QR CODE (Shown if on desktop or payment mobile tab) */}
              {(mobileTab === 'payment' || mobileTab === 'preview' || mobileTab === 'sign') && (
                <div className="bg-slate-900 rounded-2xl border border-indigo-500/30 p-4 sm:p-5 shadow-lg space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                        <Landmark className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                          <span>Bank Remittance &amp; Payment</span>
                        </h3>
                        <p className="text-[10px] text-slate-400">
                          {selectedBank?.bankName || 'LLOYDS BANK'} • Direct Settlement
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleCopyBank}
                      className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-indigo-500/30 transition flex items-center gap-1 cursor-pointer"
                    >
                      {copiedBank ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedBank ? 'Copied!' : 'Copy'}</span>
                    </button>
                  </div>

                  {/* QR Code and Bank Credentials Card */}
                  <div className="flex flex-col sm:flex-row gap-4 items-center bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                    {/* Live Scannable QR Code */}
                    <div className="relative p-2 bg-white rounded-xl shadow-md border-2 border-indigo-500/30 flex-shrink-0 text-center group">
                      {paymentQrUrl ? (
                        <img
                          src={paymentQrUrl}
                          alt="Payment QR Code"
                          className="w-24 h-24 object-contain mx-auto"
                        />
                      ) : (
                        <div className="w-24 h-24 flex items-center justify-center text-slate-400">
                          <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
                        </div>
                      )}
                      <span className="text-[8px] font-black uppercase tracking-wider text-slate-900 block mt-1">
                        Scan to Pay
                      </span>
                    </div>

                    {/* Bank Details */}
                    <div className="flex-1 min-w-0 space-y-1.5 text-xs w-full">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Beneficiary:</span>
                        <span className="font-semibold text-white truncate max-w-[65%]">
                          {selectedBank?.accountName || 'AIE Skyline Limited'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Sort Code:</span>
                        <span className="font-mono font-bold text-indigo-300">
                          {selectedBank?.sortCode || '30-99-50'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Account No:</span>
                        <span className="font-mono font-bold text-indigo-300">
                          {selectedBank?.accountNumber || '30513162'}
                        </span>
                      </div>
                      {selectedBank?.iban && (
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-400">IBAN:</span>
                          <span className="font-mono text-slate-300 text-[10px] truncate max-w-[65%]">
                            {selectedBank.iban}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800">
                        <span className="text-slate-400">Reference:</span>
                        <span className="font-mono font-black text-amber-400 truncate max-w-[65%]">
                          {docRef}
                        </span>
                      </div>
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-400 italic">
                    📱 Open your mobile banking app (Barclays, Lloyds, Monzo, Revolut, HSBC, etc.) and scan the QR code to auto-populate transfer details.
                  </p>

                  <button
                    type="button"
                    onClick={() => {
                      const targetId = invoice?.id || (invoice as any)?.invoiceNumber || docId;
                      window.open(`/invoice-pay?id=${encodeURIComponent(targetId)}`, '_blank');
                    }}
                    className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
                  >
                    <Smartphone className="w-4 h-4" />
                    <span>Pay by Bank App (UK Open Banking)</span>
                    <ExternalLink className="w-3.5 h-3.5 text-indigo-200" />
                  </button>
                </div>
              )}

              {/* SECTION 2: E-SIGNATURE EXECUTION AREA */}
              {(mobileTab === 'sign' || mobileTab === 'preview') && (
                <div className="bg-slate-900 rounded-2xl border border-slate-800 p-4 sm:p-5 shadow-lg space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
                        <PenTool className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                          <span>E-Signature Execution Area</span>
                        </h3>
                        <p className="text-[10px] text-slate-400">
                          Legally binding digital sign-off under UK Electronic Communications Act
                        </p>
                      </div>
                    </div>
                  </div>

                  {isSigned ? (
                    <div className="p-4 bg-emerald-950/40 border border-emerald-500/40 rounded-xl space-y-2 text-center">
                      <div className="w-10 h-10 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/40">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <h4 className="text-xs sm:text-sm font-bold text-white">Document Executed &amp; Signed</h4>
                      <p className="text-[11px] text-slate-300">
                        Signer: <span className="font-bold text-white">{signerName || 'Client'}</span>
                      </p>
                      <p className="text-[10px] font-mono text-emerald-400">
                        Verification Stamp: {signedAtTimestamp}
                      </p>
                      <p className="text-[10px] text-slate-400 pt-1">
                        A secure digital copy has been archived with the operator.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                          Full Name of Signatory
                        </label>
                        <input
                          type="text"
                          value={signerName}
                          onChange={(e) => setSignerName(e.target.value)}
                          placeholder="e.g. John Smith"
                          className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-semibold text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                          Digital Signature Pad
                        </label>
                        <div className="rounded-xl overflow-hidden border border-slate-700 bg-white">
                          <SignaturePadComponent
                            value={signatureData}
                            onChange={(val) => setSignatureData(val)}
                            height={160}
                          />
                        </div>
                      </div>

                      {/* Terms Acceptance Checkbox */}
                      <label className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={agreeTerms}
                          onChange={(e) => setAgreeTerms(e.target.checked)}
                          className="mt-0.5 w-4 h-4 rounded text-indigo-600 focus:ring-0 bg-slate-900 border-slate-700 cursor-pointer"
                        />
                        <span className="text-[11px] text-slate-300 leading-tight">
                          I confirm that I have reviewed this document, acknowledge receipt of all vehicle and payment schedules, and authorize this electronic signature.
                        </span>
                      </label>

                      {/* Submit Signature Button */}
                      <button
                        type="button"
                        onClick={handleSignDocument}
                        disabled={submittingSignature || !signatureData || !agreeTerms}
                        className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer ${
                          submittingSignature || !signatureData || !agreeTerms
                            ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                            : 'bg-emerald-600 hover:bg-emerald-500 text-white active:scale-98'
                        }`}
                      >
                        {submittingSignature ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Authorizing Signature...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Sign &amp; Authorize Document</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default PublicDocumentViewer;
