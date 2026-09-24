// src/components/company/CompanyDocumentManager.tsx
import React, { useState, useMemo, useEffect } from 'react';
import {
  FileText,
  Scale,
  Shield,
  AlertCircle,
  CheckSquare,
  Share2,
  Eye,
  PenTool,
  CheckCircle2,
  Clock,
  ExternalLink,
  Copy,
  MessageSquare,
  Mail,
  UserCheck,
  Search,
  Filter,
  Check,
  ChevronDown,
  Info
} from 'lucide-react';
import { useCustomers } from '../../hooks/useCustomers';
import { Customer } from '../../types/customer';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { formatSignatureTimestamp } from '../../utils/signatureStamp';
import toast from 'react-hot-toast';

export type CustomerDocumentCategory = 'claim' | 'non-claim';

interface DocumentWorkflowItem {
  id: string;
  name: string;
  category: 'claim' | 'standard';
  description: string;
  docType: string;
  icon: React.ComponentType<{ className?: string }>;
  termsField: string;
}

const CLAIM_DOCUMENTS: DocumentWorkflowItem[] = [
  {
    id: 'hire_agreement',
    name: 'Hire Agreement',
    category: 'claim',
    description: 'Comprehensive vehicle hire agreement contract with rate breakdown and claim terms.',
    docType: 'claimHireAgreement',
    icon: FileText,
    termsField: 'hireAgreementText'
  },
  {
    id: 'credit_hire_mitigation',
    name: 'Credit Hire Mitigation',
    category: 'claim',
    description: 'Mitigation statement documenting vehicle necessity and lack of alternative transport.',
    docType: 'creditHireMitigation',
    icon: Scale,
    termsField: 'creditHireMitigationText'
  },
  {
    id: 'credit_storage_and_recovery',
    name: 'Credit Storage and Recovery',
    category: 'claim',
    description: 'Legal agreement covering recovery costs, storage charges, and indemnity clauses.',
    docType: 'creditStorageAndRecovery',
    icon: Shield,
    termsField: 'creditStorageAndRecoveryText'
  },
  {
    id: 'right_to_cancel',
    name: 'Right to Cancel',
    category: 'claim',
    description: 'Statutory cancellation notice under Consumer Contracts Regulations.',
    docType: 'noticeOfRightToCancel',
    icon: AlertCircle,
    termsField: 'noticeOfRightToCancelText'
  },
  {
    id: 'condition_of_hire',
    name: 'Condition of Hire',
    category: 'claim',
    description: 'Vehicle condition audit, liability terms, fuel policy, and handover acknowledgment.',
    docType: 'conditionOfHire',
    icon: CheckSquare,
    termsField: 'conditionOfHireText'
  }
];

const NON_CLAIM_DOCUMENTS: DocumentWorkflowItem[] = [
  {
    id: 'hire_agreement_tc',
    name: 'Hire Agreement Terms & Conditions (T&C)',
    category: 'standard',
    description: 'Standard operational hire agreement terms & conditions for weekly, daily, and commercial rentals.',
    docType: 'hireAgreement',
    icon: FileText,
    termsField: 'hireAgreementText'
  }
];

export const CompanyDocumentManager: React.FC = () => {
  const { customers } = useCustomers();
  const [activeCategory, setActiveCategory] = useState<CustomerDocumentCategory>('claim');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [companySettings, setCompanySettings] = useState<any>(null);
  const [copiedDocId, setCopiedDocId] = useState<string | null>(null);
  const [sendingSignatureId, setSendingSignatureId] = useState<string | null>(null);

  // Load company settings
  useEffect(() => {
    async function loadSettings() {
      try {
        const snap = await getDoc(doc(db, 'companySettings', 'details'));
        if (snap.exists()) {
          setCompanySettings(snap.data());
        }
      } catch (err) {
        console.error('Error fetching company details in Document Manager:', err);
      }
    }
    loadSettings();
  }, []);

  // Filtered customer list
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const q = customerSearch.toLowerCase();
      const matchSearch =
        c.name.toLowerCase().includes(q) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.mobile && c.mobile.includes(q));
      return matchSearch;
    });
  }, [customers, customerSearch]);

  // Selected customer object
  const selectedCustomer = useMemo(() => {
    if (!selectedCustomerId) {
      // Pick first matching customer or null
      return customers.find((c) => (activeCategory === 'claim' ? c.type === 'claim' : c.type !== 'claim')) || customers[0] || null;
    }
    return customers.find((c) => c.id === selectedCustomerId) || null;
  }, [customers, selectedCustomerId, activeCategory]);

  // Sync activeCategory when selected customer changes
  const handleSelectCustomer = (c: Customer) => {
    setSelectedCustomerId(c.id);
    if (c.type === 'claim') {
      setActiveCategory('claim');
    } else {
      setActiveCategory('non-claim');
    }
  };

  // Determine active documents list based on Category (Claim vs Non-Claim)
  const activeDocuments = useMemo(() => {
    return activeCategory === 'claim' ? CLAIM_DOCUMENTS : NON_CLAIM_DOCUMENTS;
  }, [activeCategory]);

  // Generate share link
  const getDocumentShareUrl = (docItem: DocumentWorkflowItem): string => {
    if (!selectedCustomer) return window.location.origin;
    return `${window.location.origin}/view-document?docType=${encodeURIComponent(docItem.docType)}&customerId=${encodeURIComponent(selectedCustomer.id)}`;
  };

  // Copy share link
  const handleCopyLink = async (docItem: DocumentWorkflowItem) => {
    const url = getDocumentShareUrl(docItem);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedDocId(docItem.id);
      toast.success(`${docItem.name} link copied to clipboard!`);
      setTimeout(() => setCopiedDocId(null), 2500);
    } catch {
      toast.error('Could not copy link');
    }
  };

  // Open in WhatsApp
  const handleOpenWhatsApp = (docItem: DocumentWorkflowItem) => {
    const url = getDocumentShareUrl(docItem);
    const phone = selectedCustomer?.mobile?.replace(/\D/g, '') || '';
    const text = `Hello ${selectedCustomer?.name || 'Customer'},\n\nPlease find your ${docItem.name} document link below:\n${url}\n\nKind regards,\n${companySettings?.tradingName || 'AIE Skyline'}`;
    const waUrl = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  // Open in Email
  const handleOpenEmail = (docItem: DocumentWorkflowItem) => {
    const url = getDocumentShareUrl(docItem);
    const email = selectedCustomer?.email || '';
    const subject = encodeURIComponent(`${docItem.name} - ${companySettings?.tradingName || 'AIE Skyline'}`);
    const body = encodeURIComponent(
      `Dear ${selectedCustomer?.name || 'Customer'},\n\nPlease review your ${docItem.name} document using the secure link below:\n${url}\n\nKind regards,\n${companySettings?.fullName || 'AIE Skyline Limited'}`
    );
    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
  };

  // View Document in new window
  const handleViewDocument = (docItem: DocumentWorkflowItem) => {
    const url = getDocumentShareUrl(docItem);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Signature workflow: Send signature request link
  const handleSendSignatureRequest = async (docItem: DocumentWorkflowItem) => {
    if (!selectedCustomer) {
      toast.error('Please select a customer to send a signature request.');
      return;
    }

    setSendingSignatureId(docItem.id);
    const toastId = toast.loading(`Generating secure signature link for ${selectedCustomer.name}...`);

    try {
      const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour validity

      const custRef = doc(db, 'customers', selectedCustomer.id);
      await updateDoc(custRef, {
        signatureRequestToken: token,
        signatureRequestExpiresAt: expiresAt,
        updatedAt: new Date()
      });

      const signUrl = `${window.location.origin}/sign/${selectedCustomer.id}?token=${token}`;

      // Copy signature link to clipboard
      await navigator.clipboard.writeText(signUrl);

      // Offer WhatsApp dispatch if phone exists
      if (selectedCustomer.mobile) {
        const text = `Hello ${selectedCustomer.name},\n\nPlease electronically sign your ${docItem.name} using this secure link (valid for 1 hour):\n${signUrl}\n\nNote: Terms & Conditions agreement is required to submit your signature.\n\nKind regards,\n${companySettings?.tradingName || 'AIE Skyline'}`;
        const phone = selectedCustomer.mobile.replace(/\D/g, '');
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
      }

      toast.success(`Signature request link generated and copied! Link valid for 1 hour.`, { id: toastId });
    } catch (err) {
      console.error('Error generating signature request link:', err);
      toast.error('Failed to generate signature link', { id: toastId });
    } finally {
      setSendingSignatureId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Scope Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-200">
              <Share2 className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Share &amp; Attach Documents Workflow
            </h2>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Conditional document mapping, live viewing, link sharing, and e-signature execution for Claim vs. Non-Claim customers.
          </p>
        </div>

        {/* Claim vs. Non-Claim Category Switcher */}
        <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 shrink-0 self-start md:self-auto">
          <button
            type="button"
            onClick={() => setActiveCategory('claim')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeCategory === 'claim'
                ? 'bg-white text-indigo-700 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Shield className="w-4 h-4 text-amber-600" />
            <span>Claim Customers</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
              5 Docs
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveCategory('non-claim')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeCategory === 'non-claim'
                ? 'bg-white text-indigo-700 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4 text-emerald-600" />
            <span>Non-Claim Customers</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
              Standard T&amp;C
            </span>
          </button>
        </div>
      </div>

      {/* Target Policy Explanation Banner */}
      {activeCategory === 'claim' ? (
        <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-4 flex items-start gap-3 text-amber-950">
          <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs leading-relaxed">
            <strong className="font-bold text-amber-900 block text-sm mb-0.5">
              Claim Customer Document Mapping Active (Customer Type = "Claim")
            </strong>
            The system automatically maps and includes all 5 specific Claim Documents required for credit hire operations:
            <span className="font-semibold text-amber-900"> Hire Agreement, Credit Hire Mitigation, Credit Storage and Recovery, Right to Cancel, and Condition of Hire</span>.
            All 5 claim documents are fully accessible for document viewing, client sharing, and legally binding signature execution.
          </div>
        </div>
      ) : (
        <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-4 flex items-start gap-3 text-emerald-950">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="text-xs leading-relaxed">
            <strong className="font-bold text-emerald-900 block text-sm mb-0.5">
              Non-Claim Customer Policy Active (Customer Type = "Weekly", "Daily", "Standard", or "Non-Claim")
            </strong>
            All claim-specific documents (Credit Hire Mitigation, Credit Storage &amp; Recovery, Right to Cancel, Condition of Hire) are strictly <span className="font-bold text-emerald-900">excluded</span>.
            The system automatically attaches and presents <span className="font-bold text-emerald-900">ONLY the standard Hire Agreement Terms &amp; Conditions (T&amp;C)</span> document.
          </div>
        </div>
      )}

      {/* Customer Quick Selector */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-slate-700" />
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Select Recipient Customer
            </span>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search customer name or phone..."
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white text-slate-900 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Customer Quick Cards Row */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
          {filteredCustomers.slice(0, 8).map((c) => {
            const isSelected = selectedCustomer?.id === c.id;
            const isClaimType = c.type === 'claim';

            return (
              <button
                key={c.id}
                type="button"
                onClick={() => handleSelectCustomer(c)}
                className={`flex-shrink-0 text-left px-3 py-2 rounded-lg border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-xs truncate max-w-[130px]">{c.name}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : isClaimType
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {c.type || 'Standard'}
                  </span>
                </div>
                <div
                  className={`text-[11px] truncate max-w-[140px] mt-0.5 ${
                    isSelected ? 'text-indigo-100' : 'text-slate-500'
                  }`}
                >
                  {c.mobile || c.email || 'No contact'}
                </div>
              </button>
            );
          })}
        </div>

        {selectedCustomer && (
          <div className="mt-3 pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium">Selected Customer:</span>
              <strong className="text-slate-900">{selectedCustomer.name}</strong>
              <span className="text-slate-400">•</span>
              <span className="text-slate-600 font-mono">{selectedCustomer.mobile || 'No mobile'}</span>
              <span className="text-slate-400">•</span>
              <span className="text-slate-600">{selectedCustomer.email || 'No email'}</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-500">Signature Status:</span>
              {selectedCustomer.signature ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Legally Signed &amp; Verified
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                  <Clock className="w-3 h-3 text-amber-600" />
                  Signature Pending
                </span>
              )}
              {selectedCustomer.signatureTimestamp && (
                <span className="text-[10px] text-slate-500 font-mono">
                  ({selectedCustomer.signatureTimestamp})
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Document Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {activeDocuments.map((docItem, index) => {
          const Icon = docItem.icon;
          const isCopied = copiedDocId === docItem.id;
          const isSending = sendingSignatureId === docItem.id;

          return (
            <div
              key={docItem.id}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`p-2 rounded-lg ${
                        docItem.category === 'claim'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-400">0{index + 1}.</span>
                        <h3 className="text-sm font-bold text-slate-900">{docItem.name}</h3>
                      </div>
                      <span
                        className={`inline-block mt-0.5 px-2 py-0.5 text-[10px] font-bold uppercase rounded-md ${
                          docItem.category === 'claim'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {docItem.category === 'claim' ? 'Claim Document' : 'Standard Agreement'}
                      </span>
                    </div>
                  </div>

                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-600">
                    Ready
                  </span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed mb-4">
                  {docItem.description}
                </p>
              </div>

              {/* Action Buttons Toolbar */}
              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {/* View Document */}
                  <button
                    type="button"
                    onClick={() => handleViewDocument(docItem)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                    title="View Document"
                  >
                    <Eye className="w-3.5 h-3.5 text-slate-600" />
                    <span>View</span>
                  </button>

                  {/* Copy Direct Link */}
                  <button
                    type="button"
                    onClick={() => handleCopyLink(docItem)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                    title="Copy Share Link"
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-600" />
                        <span>Link</span>
                      </>
                    )}
                  </button>

                  {/* Share in WhatsApp */}
                  <button
                    type="button"
                    onClick={() => handleOpenWhatsApp(docItem)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
                    title="Share via WhatsApp"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                    <span>WhatsApp</span>
                  </button>

                  {/* Share via Email */}
                  <button
                    type="button"
                    onClick={() => handleOpenEmail(docItem)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors cursor-pointer"
                    title="Share via Email"
                  >
                    <Mail className="w-3.5 h-3.5 text-blue-600" />
                    <span>Email</span>
                  </button>
                </div>

                {/* Signature Workflow Action */}
                <button
                  type="button"
                  onClick={() => handleSendSignatureRequest(docItem)}
                  disabled={isSending}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 rounded-lg shadow-2xs transition-all cursor-pointer"
                  title="Generate Signature Request Link (Enforces T&C and Timestamps)"
                >
                  <PenTool className="w-3.5 h-3.5" />
                  <span>{isSending ? 'Generating...' : 'Request Signature'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CompanyDocumentManager;
