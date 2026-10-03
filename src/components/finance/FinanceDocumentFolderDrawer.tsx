// src/components/finance/FinanceDocumentFolderDrawer.tsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Transaction, Vehicle, Account } from '../../types';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { 
  Folder, 
  X, 
  FileText, 
  Upload, 
  ExternalLink, 
  Download, 
  Trash2, 
  MessageCircle, 
  Mail, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles,
  Paperclip,
  Calendar,
  Wallet,
  Copy,
  Check,
  Tag,
  Eye,
  Image as ImageIcon,
  Receipt,
  CreditCard,
  FileCheck,
  Building,
  Plus
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';
import { formatFileSize, uploadCustomAttachment } from '../../utils/attachmentUpload';

export interface StoredFinanceDocument {
  id: string;
  name: string;
  url: string;
  size?: number;
  type?: string;
  category: 'receipt' | 'deposit_slip' | 'payment_proof' | 'invoice' | 'statement' | 'other';
  uploadedAt: string;
  uploadedBy?: string;
}

interface FinanceDocumentFolderDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  vehicles?: Vehicle[];
  accounts?: Account[];
  onGenerateDocument?: (transaction: Transaction) => Promise<string | undefined> | void;
  onWhatsApp?: (transaction: Transaction) => void;
  onEmail?: (transaction: Transaction) => void;
}

export const FinanceDocumentFolderDrawer: React.FC<FinanceDocumentFolderDrawerProps> = ({
  isOpen,
  onClose,
  transaction,
  vehicles = [],
  accounts = [],
  onGenerateDocument,
  onWhatsApp,
  onEmail,
}) => {
  const { formatCurrency } = useFormattedDisplay();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [documents, setDocuments] = useState<StoredFinanceDocument[]>([]);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('all');
  const [selectedUploadCategory, setSelectedUploadCategory] = useState<StoredFinanceDocument['category']>('receipt');
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Sync documents from transaction attachments
  useEffect(() => {
    if (transaction) {
      const existing = (transaction as any).attachments || [];
      if (Array.isArray(existing)) {
        // Normalize existing attachments
        const normalized: StoredFinanceDocument[] = existing.map((a: any, idx: number) => ({
          id: a.id || `doc_${Date.now()}_${idx}`,
          name: a.name || 'Untitled Document',
          url: a.url || '',
          size: a.size || 0,
          type: a.type || 'application/octet-stream',
          category: a.category || 'other',
          uploadedAt: a.uploadedAt || new Date().toISOString(),
          uploadedBy: a.uploadedBy,
        }));
        setDocuments(normalized);
      } else {
        setDocuments([]);
      }
    }
  }, [transaction]);

  if (!isOpen || !transaction) return null;

  const txnRef =
    transaction.referenceId ||
    transaction.orderNumber ||
    transaction.invoiceNumber ||
    transaction.id.slice(-8).toUpperCase();

  const isCredit = transaction.type === 'income' || transaction.entryType === 'CREDIT';
  const primaryDocUrl = transaction.documentUrl || transaction.receiptUrl;

  const associatedAccount = accounts.find((a) => {
    const accId = isCredit ? transaction.accountsTo?.[0] : transaction.accountsFrom?.[0];
    return a.id === accId;
  });

  const associatedVehicle = vehicles.find((v) => v.id === transaction.vehicleId);

  // Persist updated list to Firestore
  const persistDocuments = async (updated: StoredFinanceDocument[]) => {
    setDocuments(updated);
    try {
      const docRef = doc(db, 'transactions', transaction.id);
      await updateDoc(docRef, {
        attachments: updated,
        updatedAt: new Date(),
      });
      (transaction as any).attachments = updated;
    } catch (err) {
      console.error('Failed to sync documents to Firestore:', err);
      toast.error('Failed to update document drawer records in database.');
    }
  };

  // Upload handler
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const fileList = Array.from(files);

    setIsUploading(true);
    const toastId = toast.loading(`Uploading ${fileList.length} file${fileList.length > 1 ? 's' : ''}...`);

    try {
      const newlyUploaded: StoredFinanceDocument[] = [];

      for (const file of fileList) {
        try {
          const url = await uploadCustomAttachment(file, 'finance', transaction.id);
          newlyUploaded.push({
            id: `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            name: file.name,
            url,
            size: file.size,
            type: file.type,
            category: selectedUploadCategory,
            uploadedAt: new Date().toISOString(),
          });
        } catch (err) {
          console.error(`Upload error for ${file.name}:`, err);
          toast.error(`Failed to upload ${file.name}`);
        }
      }

      if (newlyUploaded.length > 0) {
        const fullList = [...documents, ...newlyUploaded];
        await persistDocuments(fullList);
        toast.success(
          `${newlyUploaded.length} document${newlyUploaded.length > 1 ? 's' : ''} stored successfully!`,
          { id: toastId }
        );
      } else {
        toast.dismiss(toastId);
      }
    } catch (err: any) {
      toast.error(`Upload failed: ${err?.message || 'Server error'}`, { id: toastId });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Delete document
  const handleDeleteDocument = async (id: string) => {
    if (!confirm('Are you sure you want to remove this document from the transaction folder?')) return;
    const filtered = documents.filter((d) => d.id !== id);
    await persistDocuments(filtered);
    toast.success('Document removed from folder.');
  };

  // Generate official document
  const handleTriggerGenerate = async () => {
    if (!onGenerateDocument) return;
    setIsGenerating(true);
    try {
      const url = await onGenerateDocument(transaction);
      if (url) {
        transaction.documentUrl = url;
        toast.success('Official statement document compiled and stored!');
      }
    } catch (err: any) {
      console.error('Generation error:', err);
      toast.error('Failed to compile statement document.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Copy link
  const handleCopyLink = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    toast.success('Link copied to clipboard!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: documents.length + (primaryDocUrl ? 1 : 0),
      receipt: documents.filter((d) => d.category === 'receipt').length,
      deposit_slip: documents.filter((d) => d.category === 'deposit_slip').length,
      payment_proof: documents.filter((d) => d.category === 'payment_proof').length,
      invoice: documents.filter((d) => d.category === 'invoice').length,
      statement: primaryDocUrl ? 1 : 0,
      other: documents.filter((d) => d.category === 'other').length,
    };
    return counts;
  }, [documents, primaryDocUrl]);

  // Filtered documents
  const filteredDocuments = useMemo(() => {
    if (activeCategoryFilter === 'all') return documents;
    if (activeCategoryFilter === 'statement') return [];
    return documents.filter((d) => d.category === activeCategoryFilter);
  }, [documents, activeCategoryFilter]);

  const getCategoryBadge = (cat: StoredFinanceDocument['category']) => {
    switch (cat) {
      case 'receipt':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">Receipt</span>;
      case 'deposit_slip':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">Bank Deposit Slip</span>;
      case 'payment_proof':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800">Payment Proof</span>;
      case 'invoice':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">Invoice / Bill</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">Attachment</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Slide-over Drawer Panel */}
      <aside
        aria-label="Finance Transaction Document Folder Drawer"
        className="relative w-full max-w-2xl bg-white border-l border-slate-200 shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-300 h-full overflow-hidden text-slate-800"
      >
        {/* Drawer Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 to-indigo-950 border-b border-slate-800 flex items-center justify-between gap-4 flex-shrink-0 text-white">
          <div className="flex items-center gap-3 min-w-0">
            <span className="p-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-400/30">
              <Folder className="w-5 h-5 text-amber-400" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white truncate">
                  Document Folder Drawer
                </h2>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                  isCredit
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-400/30'
                }`}>
                  {isCredit ? 'Credit Income' : 'Debit Expense'}
                </span>
              </div>
              <p className="text-xs text-slate-300 truncate">
                Ref: <span className="text-indigo-300 font-mono font-bold">{txnRef}</span> • Amount: <span className="text-emerald-400 font-mono font-bold">{formatCurrency(transaction.amount)}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            title="Close Drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Record Details Context Bar */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div>
            <span className="text-[10px] text-slate-400 block uppercase font-bold">Transaction Date</span>
            <span className="font-semibold text-slate-800">
              {transaction.date ? new Date(transaction.date).toLocaleDateString('en-GB') : 'N/A'}
            </span>
          </div>

          <div>
            <span className="text-[10px] text-slate-400 block uppercase font-bold">Customer / Entity</span>
            <span className="font-semibold text-slate-800 truncate block">
              {transaction.customerName || 'N/A'}
            </span>
          </div>

          <div>
            <span className="text-[10px] text-slate-400 block uppercase font-bold">Assigned Account</span>
            <span className="font-semibold text-slate-800 truncate block">
              {associatedAccount?.name || 'General Operating'}
            </span>
          </div>

          <div>
            <span className="text-[10px] text-slate-400 block uppercase font-bold">Vehicle Reg</span>
            <span className="font-mono font-bold text-indigo-700">
              {transaction.vehicleName || associatedVehicle?.registrationNumber || '—'}
            </span>
          </div>
        </div>

        {/* Category Filter Chips */}
        <div className="px-6 py-2.5 bg-white border-b border-slate-200 flex items-center gap-1.5 overflow-x-auto">
          {[
            { id: 'all', label: 'All Files', count: categoryCounts.all },
            { id: 'receipt', label: 'Receipts', count: categoryCounts.receipt },
            { id: 'deposit_slip', label: 'Deposit Slips', count: categoryCounts.deposit_slip },
            { id: 'payment_proof', label: 'Payment Proofs', count: categoryCounts.payment_proof },
            { id: 'invoice', label: 'Invoices / Bills', count: categoryCounts.invoice },
            { id: 'statement', label: 'Official Statement', count: categoryCounts.statement },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveCategoryFilter(tab.id)}
              className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                activeCategoryFilter === tab.id
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                activeCategoryFilter === tab.id ? 'bg-indigo-700 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Drawer Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 1. UPLOAD NEW DOCUMENT BOX WITH CATEGORY SELECTOR */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5 text-indigo-600" />
                <span>Upload Document to This Transaction</span>
              </span>
              <span className="text-[11px] text-slate-400">PDF, PNG, JPG, WEBP (Max 15MB)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Document Type
                </label>
                <select
                  value={selectedUploadCategory}
                  onChange={(e) => setSelectedUploadCategory(e.target.value as any)}
                  className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="receipt">🧾 Receipt</option>
                  <option value="deposit_slip">🏦 Bank Deposit Slip</option>
                  <option value="payment_proof">💳 Payment Proof</option>
                  <option value="invoice">📑 Invoice / Bill</option>
                  <option value="other">📎 Other Supporting File</option>
                </select>
              </div>

              <div className="sm:col-span-2 flex items-end">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => handleFileUpload(e.target.files)}
                  multiple
                  className="hidden"
                  id="drawer-file-input"
                />
                <label
                  htmlFor="drawer-file-input"
                  className={`w-full py-2 px-4 rounded-xl border border-dashed text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition ${
                    isUploading
                      ? 'bg-slate-100 text-slate-400 border-slate-300'
                      : 'bg-white hover:bg-indigo-50/50 text-indigo-700 border-indigo-300 hover:border-indigo-500'
                  }`}
                >
                  <Plus className="w-4 h-4 text-indigo-600" />
                  <span>{isUploading ? 'Uploading to Storage...' : 'Select File or Drop Here'}</span>
                </label>
              </div>
            </div>
          </div>

          {/* 2. PRIMARY OFFICIAL STATEMENT / RECEIPT CARD */}
          {(activeCategoryFilter === 'all' || activeCategoryFilter === 'statement') && (
            <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Primary Official Statement PDF</span>
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                  primaryDocUrl ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {primaryDocUrl ? 'Generated & Stored' : 'Not Generated Yet'}
                </span>
              </div>

              {primaryDocUrl ? (
                <div className="p-3 bg-indigo-50/40 border border-indigo-100 rounded-xl flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 truncate">
                    <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="truncate">
                      <p className="text-xs font-bold text-indigo-950 truncate">
                        Statement_Receipt_{txnRef}.pdf
                      </p>
                      <p className="text-[10px] text-slate-500 truncate font-mono">
                        {primaryDocUrl}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleCopyLink(primaryDocUrl, 'primary')}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
                      title="Copy Link"
                    >
                      {copiedId === 'primary' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <a
                      href={primaryDocUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>View PDF</span>
                    </a>
                  </div>
                </div>
              ) : (
                <div className="p-4 border border-dashed border-slate-300 rounded-xl text-center space-y-2">
                  <p className="text-xs text-slate-500">
                    No official PDF document has been compiled for this transaction yet.
                  </p>
                  {onGenerateDocument && (
                    <button
                      type="button"
                      onClick={handleTriggerGenerate}
                      disabled={isGenerating}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
                    >
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      <span>{isGenerating ? 'Compiling Official PDF...' : 'Generate Official Statement Document'}</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 3. STORED DOCUMENTS & ATTACHMENTS LIST */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Folder className="w-3.5 h-3.5 text-amber-500" />
                <span>Linked Files in Folder ({filteredDocuments.length})</span>
              </span>
            </div>

            {filteredDocuments.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300 text-slate-400 space-y-2">
                <Paperclip className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs font-medium">No documents stored under this category.</p>
                <p className="text-[11px] text-slate-400">
                  Upload receipts, deposit slips, or payment proofs using the form above.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2.5">
                {filteredDocuments.map((docItem) => {
                  const isImg = docItem.type?.startsWith('image/') || /\.(png|jpe?g|webp|gif)$/i.test(docItem.name);
                  return (
                    <div
                      key={docItem.id}
                      className="p-3 bg-white border border-slate-200 hover:border-slate-300 rounded-xl flex items-center justify-between gap-3 shadow-2xs transition"
                    >
                      <div className="flex items-center gap-3 truncate">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden">
                          {isImg ? (
                            <img src={docItem.url} alt={docItem.name} className="w-full h-full object-cover" />
                          ) : (
                            <FileText className="w-5 h-5 text-slate-600" />
                          )}
                        </div>

                        <div className="truncate">
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-bold text-slate-900 truncate">
                              {docItem.name}
                            </h4>
                            {getCategoryBadge(docItem.category)}
                          </div>
                          <p className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                            <span>{formatFileSize(docItem.size || 0)}</span>
                            <span>•</span>
                            <span>{docItem.uploadedAt ? new Date(docItem.uploadedAt).toLocaleDateString('en-GB') : 'Stored'}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleCopyLink(docItem.url, docItem.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
                          title="Copy Link"
                        >
                          {copiedId === docItem.id ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                        </button>

                        <a
                          href={docItem.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 transition cursor-pointer"
                          title="View / Download Document"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>

                        <button
                          type="button"
                          onClick={() => handleDeleteDocument(docItem.id)}
                          className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition cursor-pointer"
                          title="Delete File"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Drawer Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            {onWhatsApp && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onWhatsApp(transaction);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-xs"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>WhatsApp Dispatch</span>
              </button>
            )}

            {onEmail && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEmail(transaction);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-xs"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Email Dispatch</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </aside>
    </div>
  );
};

export default FinanceDocumentFolderDrawer;
