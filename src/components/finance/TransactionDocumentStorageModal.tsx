// src/components/finance/TransactionDocumentStorageModal.tsx
import React, { useState, useEffect } from 'react';
import { Transaction, Vehicle, Account } from '../../types';
import Modal from '../ui/Modal';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { 
  Folder, 
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
  Check
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';
import { CustomAttachmentUploader } from '../common/CustomAttachmentUploader';
import { CustomAttachment, formatFileSize } from '../../utils/attachmentUpload';

interface TransactionDocumentStorageModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  vehicles?: Vehicle[];
  accounts?: Account[];
  onGenerateDocument?: (transaction: Transaction) => Promise<string | undefined> | void;
  onWhatsApp?: (transaction: Transaction) => void;
  onEmail?: (transaction: Transaction) => void;
}

export const TransactionDocumentStorageModal: React.FC<TransactionDocumentStorageModalProps> = ({
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
  const [attachments, setAttachments] = useState<CustomAttachment[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Initialize attachments from transaction data
  useEffect(() => {
    if (transaction) {
      const existing = (transaction as any).attachments || [];
      if (Array.isArray(existing)) {
        setAttachments(existing);
      } else {
        setAttachments([]);
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

  // Persist attachment updates to Firestore
  const handleAttachmentsChange = async (updated: CustomAttachment[]) => {
    setAttachments(updated);
    setIsSaving(true);
    try {
      const docRef = doc(db, 'transactions', transaction.id);
      await updateDoc(docRef, {
        attachments: updated,
        updatedAt: new Date(),
      });
      // Also update local reference if needed
      (transaction as any).attachments = updated;
    } catch (err) {
      console.error('Failed to sync attachments to Firestore:', err);
      toast.error('Failed to save attachments to database.');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Generate Document
  const handleTriggerGenerate = async () => {
    if (!onGenerateDocument) return;
    setIsGenerating(true);
    try {
      const url = await onGenerateDocument(transaction);
      if (url) {
        transaction.documentUrl = url;
        toast.success('Document generated and stored successfully!');
      }
    } catch (err: any) {
      console.error('Document generation error:', err);
      toast.error('Failed to generate document.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Copy URL helper
  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(true);
    toast.success('Document link copied to clipboard!');
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Transaction Document Storage Vault"
      size="2xl"
    >
      <div className="space-y-6 text-left text-slate-800">
        {/* Header Summary Banner */}
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-400/30">
                <Folder className="w-3.5 h-3.5 text-amber-300" />
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                isCredit
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-400/30'
              }`}>
                {isCredit ? 'Credit Income' : 'Debit Expense'}
              </span>
              <span className="text-xs text-indigo-300 font-mono">Ref: {txnRef}</span>
            </div>
            <h3 className="text-base font-bold text-white tracking-tight">
              {transaction.description || 'General Account Transaction'}
            </h3>
            <p className="text-xs text-slate-300 flex items-center gap-2">
              <span>Customer: <strong className="text-white">{transaction.customerName || 'N/A'}</strong></span>
              <span>•</span>
              <span>Amount: <strong className="text-emerald-400 font-mono">{formatCurrency(transaction.amount)}</strong></span>
            </p>
          </div>

          {/* Quick Communication Actions */}
          <div className="flex items-center gap-2">
            {onWhatsApp && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onWhatsApp(transaction);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/80 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-xs"
                title="Send via WhatsApp (Automation Templates)"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </button>
            )}
            {onEmail && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEmail(transaction);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-600/80 hover:bg-sky-600 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-xs"
                title="Send via Email (Automation Templates)"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Email</span>
              </button>
            )}
          </div>
        </div>

        {/* 1. Official Primary Statement / Receipt Document */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-indigo-600" />
              <span>Official System Statement Document / Receipt</span>
            </span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
              primaryDocUrl ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
            }`}>
              {primaryDocUrl ? 'Stored & Ready' : 'Pending Generation'}
            </span>
          </div>

          {primaryDocUrl ? (
            <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-3 truncate">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-indigo-600" />
                </div>
                <div className="truncate">
                  <h4 className="text-xs font-bold text-slate-900 truncate">
                    Official Transaction Statement #{txnRef}.pdf
                  </h4>
                  <p className="text-[10px] text-slate-400 font-mono truncate">{primaryDocUrl}</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => handleCopyUrl(primaryDocUrl)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
                  title="Copy Document URL"
                >
                  {copiedUrl ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
                <a
                  href={primaryDocUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg border border-indigo-200 transition cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>View PDF</span>
                </a>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-white border border-dashed border-slate-300 rounded-xl text-center space-y-2">
              <p className="text-xs text-slate-500">
                No formal receipt or statement PDF has been compiled for this transaction yet.
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

        {/* 2. File Storage Vault & Attachments Uploader */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5 text-slate-500" />
                <span>Supporting Files &amp; Receipts Vault ({attachments.length})</span>
              </span>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Upload receipts, invoices, proof of bank transfer, and PCN evidence.
              </p>
            </div>
            {isSaving && (
              <span className="text-[10px] text-indigo-600 font-bold animate-pulse">
                Saving to Storage...
              </span>
            )}
          </div>

          <CustomAttachmentUploader
            attachments={attachments}
            onChange={handleAttachmentsChange}
            moduleContext="finance"
            recordId={transaction.id}
          />
        </div>

        {/* Modal Footer Controls */}
        <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition cursor-pointer"
          >
            Close
          </button>

          <span className="text-[11px] text-slate-400">
            Secure cloud storage attached to Transaction ID <code className="font-mono text-slate-600">{transaction.id}</code>
          </span>
        </div>
      </div>
    </Modal>
  );
};

export default TransactionDocumentStorageModal;
