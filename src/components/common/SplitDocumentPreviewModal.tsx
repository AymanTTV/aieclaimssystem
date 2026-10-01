// src/components/common/SplitDocumentPreviewModal.tsx
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { pdf } from '@react-pdf/renderer';
import {
  X,
  Download,
  Printer,
  ArrowLeft,
  Loader2,
  FileCheck2,
  RefreshCw,
  Building2,
  Landmark,
  FileText,
  Layers,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  Sliders,
  CheckCircle2,
  Shield,
  CreditCard,
  FileSignature,
  Upload,
} from 'lucide-react';
import {
  CompanyEntity,
  getAvailableCompanyEntities,
  buildEffectiveDocumentCompanyDetails,
  getDefaultEntityKeyForDocument,
  getPageLayoutOptions,
  getDefaultPageTemplateMapping,
  PageTemplateMappingConfig,
} from '../../utils/entityBranding';
import {
  CompanyBankAccount,
  getEffectiveBankAccounts,
  getDefaultBankAccount,
  formatBankAllocationLabel,
} from '../../utils/bankAccountAllocation';
import {
  DocumentTypeKey,
  DocumentTermTemplate,
  getTemplatesForDocumentType,
  getDefaultTemplateForDocument,
} from '../../utils/documentTemplateTerms';

export interface SplitDocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentType: DocumentTypeKey;
  documentTitle: string;
  documentReference?: string;
  baseCompanyDetails?: any;
  /**
   * Render function that returns the React-PDF Document component.
   * Receives effectiveCompanyDetails with all entity, bank, and T&C overrides applied.
   */
  renderDocument: (effectiveCompanyDetails: any) => React.ReactElement;
  onCommitAndGenerate?: (effectiveCompanyDetails: any) => Promise<void> | void;
  isGeneratingPDF?: boolean;
  initialEntityKey?: string;
  initialBankId?: string;
  initialTemplateId?: string;
  initialPageTemplateMapping?: PageTemplateMappingConfig;
  extraControlsTab?: {
    label: string;
    icon: React.ReactNode;
    content: React.ReactNode;
  };
}

export const SplitDocumentPreviewModal: React.FC<SplitDocumentPreviewModalProps> = ({
  isOpen,
  onClose,
  documentType,
  documentTitle,
  documentReference = 'DOC-PREVIEW',
  baseCompanyDetails,
  renderDocument,
  onCommitAndGenerate,
  isGeneratingPDF = false,
  initialEntityKey,
  initialBankId,
  initialTemplateId,
  initialPageTemplateMapping,
  extraControlsTab,
}) => {
  // ── 1. ENTITY & BRANDING OVERRIDES STATE ──
  const availableEntities = useMemo(
    () => getAvailableCompanyEntities(baseCompanyDetails),
    [baseCompanyDetails]
  );

  const [selectedEntityKey, setSelectedEntityKey] = useState<string>(() => {
    if (initialEntityKey) return initialEntityKey;
    return getDefaultEntityKeyForDocument(documentType, baseCompanyDetails);
  });

  useEffect(() => {
    if (initialEntityKey) {
      setSelectedEntityKey(initialEntityKey);
    }
  }, [initialEntityKey]);

  const selectedEntity = useMemo(
    () => availableEntities.find((e) => e.key === selectedEntityKey) || availableEntities[0],
    [availableEntities, selectedEntityKey]
  );

  // ── PAGE-LEVEL TEMPLATE MAPPING CONFIG STATE ──
  const layoutOptions = useMemo(
    () => getPageLayoutOptions(documentType),
    [documentType]
  );

  const [pageTemplateMapping, setPageTemplateMapping] = useState<PageTemplateMappingConfig>(() => {
    if (initialPageTemplateMapping) return initialPageTemplateMapping;
    return getDefaultPageTemplateMapping(documentType);
  });

  // Editable branding fields for on-the-fly customization per document
  const [customCompanyName, setCustomCompanyName] = useState<string>('');
  const [customTradingName, setCustomTradingName] = useState<string>('');
  const [customRegNumber, setCustomRegNumber] = useState<string>('');
  const [customVatNumber, setCustomVatNumber] = useState<string>('');
  const [customOfficialAddress, setCustomOfficialAddress] = useState<string>('');
  const [customPhone, setCustomPhone] = useState<string>('');
  const [customEmail, setCustomEmail] = useState<string>('');
  const [customWebsite, setCustomWebsite] = useState<string>('');
  const [customLogoUrl, setCustomLogoUrl] = useState<string>('');
  const [customHeaderText, setCustomHeaderText] = useState<string>('');
  const [customFooterText, setCustomFooterText] = useState<string>('');

  // Sync entity fields when entity selection changes
  useEffect(() => {
    if (selectedEntity) {
      setCustomCompanyName(selectedEntity.fullName || '');
      setCustomTradingName(selectedEntity.tradingName || '');
      setCustomRegNumber(selectedEntity.registrationNumber || '');
      setCustomVatNumber(selectedEntity.vatNumber || '');
      setCustomOfficialAddress(selectedEntity.officialAddress || '');
      setCustomPhone(selectedEntity.phone || '');
      setCustomEmail(selectedEntity.email || '');
      setCustomWebsite(selectedEntity.website || '');
      setCustomLogoUrl(selectedEntity.logoUrl || '');
      setCustomHeaderText(selectedEntity.headerDisclaimer || '');
      setCustomFooterText(selectedEntity.footerDisclaimer || '');
    }
  }, [selectedEntity]);

  // ── 2. MULTI-BANK ACCOUNT ALLOCATION STATE ──
  const availableBanks = useMemo(
    () => getEffectiveBankAccounts(baseCompanyDetails),
    [baseCompanyDetails]
  );

  const [selectedBankId, setSelectedBankId] = useState<string>(() => {
    if (initialBankId) return initialBankId;
    if (documentType.includes('claim')) {
      const claimsBank = availableBanks.find((b) => b.id.includes('claims') || b.id.includes('natwest'));
      if (claimsBank) return claimsBank.id;
    }
    const def = getDefaultBankAccount(baseCompanyDetails);
    return def?.id || availableBanks[0]?.id || '';
  });

  useEffect(() => {
    if (initialBankId) {
      setSelectedBankId(initialBankId);
    }
  }, [initialBankId]);

  const selectedBank = useMemo(
    () => availableBanks.find((b) => b.id === selectedBankId) || availableBanks[0],
    [availableBanks, selectedBankId]
  );

  // ── 3. DRAFT T&C AUTO-BINDING & TEMPLATES STATE ──
  const availableTemplates = useMemo(
    () => getTemplatesForDocumentType(documentType, baseCompanyDetails),
    [documentType, baseCompanyDetails]
  );

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(() => {
    if (initialTemplateId) return initialTemplateId;
    const defTmpl = getDefaultTemplateForDocument(documentType, baseCompanyDetails);
    return defTmpl?.id || availableTemplates[0]?.id || '';
  });

  const selectedTemplate = useMemo(
    () => availableTemplates.find((t) => t.id === selectedTemplateId) || availableTemplates[0],
    [availableTemplates, selectedTemplateId]
  );

  const [includeTrailingTC, setIncludeTrailingTC] = useState<boolean>(true);
  const [customTermsTitle, setCustomTermsTitle] = useState<string>('');
  const [draftTermsContent, setDraftTermsContent] = useState<string>('');

  useEffect(() => {
    if (selectedTemplate) {
      setCustomTermsTitle(selectedTemplate.title || 'Terms and Conditions');
      setDraftTermsContent(selectedTemplate.content || '');
    }
  }, [selectedTemplate]);

  // ── 4. RIGHT-SIDE TABS NAVIGATION ──
  const [activeTab, setActiveTab] = useState<'entity' | 'layouts' | 'bank' | 'terms' | 'extra'>('entity');

  // ── 5. PDF CANVAS STATE & NAVIGATION ──
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState<boolean>(true);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [renderKey, setRenderKey] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // Build the effective company details with all real-time overrides
  const effectiveCompanyDetails = useMemo(() => {
    const isP3Active = includeTrailingTC && pageTemplateMapping.includePage3 && pageTemplateMapping.page3Template !== 'none';
    return buildEffectiveDocumentCompanyDetails(baseCompanyDetails, selectedEntity, {
      fullName: customCompanyName,
      tradingName: customTradingName,
      registrationNumber: customRegNumber,
      vatNumber: customVatNumber,
      officialAddress: customOfficialAddress,
      phone: customPhone,
      email: customEmail,
      website: customWebsite,
      logoUrl: customLogoUrl,
      customHeaderText: customHeaderText,
      customFooterText: customFooterText,
      selectedBank: selectedBank,
      // Terms overrides
      includeTrailingTC: isP3Active,
      customTermsTitle: customTermsTitle,
      customTermsText: draftTermsContent,
      // Page Template Mapping
      pageTemplateMapping: {
        ...pageTemplateMapping,
        includePage3: isP3Active,
      },
      // Backward compatibility fields
      bankName: selectedBank?.bankName,
      accountNumber: selectedBank?.accountNumber,
      sortCode: selectedBank?.sortCode,
      accountName: selectedBank?.accountName,
      iban: selectedBank?.iban,
      bic: selectedBank?.bic,
    });
  }, [
    baseCompanyDetails,
    selectedEntity,
    customCompanyName,
    customTradingName,
    customRegNumber,
    customVatNumber,
    customOfficialAddress,
    customPhone,
    customEmail,
    customWebsite,
    customLogoUrl,
    customHeaderText,
    customFooterText,
    selectedBank,
    includeTrailingTC,
    customTermsTitle,
    draftTermsContent,
    pageTemplateMapping,
  ]);

  // Debounced PDF compilation
  useEffect(() => {
    if (!isOpen) {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
        setBlobUrl(null);
      }
      return;
    }

    let isCancelled = false;
    setIsRendering(true);
    setRenderError(null);

    const timer = setTimeout(async () => {
      try {
        const docElement = renderDocument(effectiveCompanyDetails);
        const blob = await pdf(docElement).toBlob();

        if (!isCancelled) {
          const url = URL.createObjectURL(blob);
          setBlobUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return url;
          });
          setIsRendering(false);
        }
      } catch (err: any) {
        if (!isCancelled) {
          console.error('[SplitDocumentPreviewModal] PDF Render error:', err);
          setRenderError(err?.message || 'Failed to render PDF preview');
          setIsRendering(false);
        }
      }
    }, 180);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [isOpen, effectiveCompanyDetails, renderKey, renderDocument]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [blobUrl]);

  // Safe print via isolated iframe (strict adherence to no window.open / window.alert)
  const handlePrint = useCallback(() => {
    if (blobUrl) {
      try {
        const printFrame = document.createElement('iframe');
        printFrame.style.position = 'fixed';
        printFrame.style.right = '0';
        printFrame.style.bottom = '0';
        printFrame.style.width = '0';
        printFrame.style.height = '0';
        printFrame.style.border = '0';
        printFrame.src = blobUrl;
        document.body.appendChild(printFrame);
        printFrame.onload = () => {
          try {
            printFrame.contentWindow?.focus();
            printFrame.contentWindow?.print();
          } catch (e) {
            console.warn('[Print] Print dialog failed:', e);
          }
          setTimeout(() => {
            if (document.body.contains(printFrame)) {
              document.body.removeChild(printFrame);
            }
          }, 3000);
        };
      } catch (err) {
        console.error('Error invoking print dialog:', err);
      }
    }
  }, [blobUrl]);

  const handleCommit = async () => {
    if (onCommitAndGenerate) {
      await onCommitAndGenerate(effectiveCompanyDetails);
    }
  };

  const handlePageChange = (direction: 'next' | 'prev') => {
    if (direction === 'next') {
      setCurrentPage((p) => p + 1);
    } else {
      setCurrentPage((p) => Math.max(1, p - 1));
    }
    // Update iframe view hash if possible
    if (iframeRef.current && blobUrl) {
      const targetPage = direction === 'next' ? currentPage + 1 : Math.max(1, currentPage - 1);
      iframeRef.current.src = `${blobUrl}#page=${targetPage}&view=FitH&zoom=${zoomLevel}`;
    }
  };

  const jumpToPage = (pageNum: number) => {
    setCurrentPage(pageNum);
    if (iframeRef.current && blobUrl) {
      iframeRef.current.src = `${blobUrl}#page=${pageNum}&view=FitH&zoom=${zoomLevel}`;
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-fadeIn"
    >
      <div
        className={`bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-200 ${
          isFullscreen
            ? 'w-full h-full rounded-none border-0'
            : 'w-full max-w-7xl h-[94vh] max-h-[960px]'
        }`}
      >
        {/* ── TOP HEADER BAR ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-slate-800/95 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-300 hover:text-white bg-slate-700/70 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>

            <div className="h-4 w-px bg-slate-700" />

            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span>{documentTitle}</span>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 rounded-md">
                  {documentReference}
                </span>
              </h2>
            </div>
          </div>

          {/* Quick Actions Header */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setRenderKey((k) => k + 1)}
              className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-700/60 rounded-lg transition-colors cursor-pointer"
              title="Refresh Live Preview"
            >
              <RefreshCw className={`w-4 h-4 ${isRendering ? 'animate-spin' : ''}`} />
            </button>

            <button
              type="button"
              onClick={handlePrint}
              disabled={!blobUrl || isRendering}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-700/80 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              title="Print Document via In-App Frame"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Print</span>
            </button>

            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-700/60 rounded-lg transition-colors cursor-pointer"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={handleCommit}
              disabled={isGeneratingPDF}
              className="inline-flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white text-xs font-bold rounded-lg shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              {isGeneratingPDF ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Generating PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Commit &amp; Generate PDF</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/70 rounded-lg transition-colors cursor-pointer ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── TWO-COLUMN SPLIT LAYOUT ── */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0 bg-slate-950">
          {/* ══════════════════════════════════════════════════════════════
              LEFT SIDE: LIVE PDF PREVIEW CANVAS & PAGE NAVIGATION
             ══════════════════════════════════════════════════════════════ */}
          <div className="flex-1 lg:flex-[1.4] flex flex-col border-b lg:border-b-0 lg:border-r border-slate-800 bg-slate-950 relative min-h-0">
            {/* Canvas Navigation Sub-Bar */}
            <div className="flex items-center justify-between px-3 py-2 bg-slate-900/90 border-b border-slate-800 text-xs text-slate-300">
              {/* Page-by-Page Navigation Controls */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handlePageChange('prev')}
                  disabled={currentPage <= 1}
                  className="p-1.5 rounded-md hover:bg-slate-800 text-slate-300 disabled:opacity-40 cursor-pointer"
                  title="Previous Page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <span className="font-mono font-bold text-slate-200 px-2 py-0.5 bg-slate-800/80 rounded border border-slate-700/60">
                  Page {currentPage}
                </span>

                <button
                  type="button"
                  onClick={() => handlePageChange('next')}
                  className="p-1.5 rounded-md hover:bg-slate-800 text-slate-300 cursor-pointer"
                  title="Next Page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                <div className="h-3 w-px bg-slate-700 mx-1" />

                {/* Quick Jump Buttons */}
                <button
                  type="button"
                  onClick={() => jumpToPage(1)}
                  className={`px-2 py-1 rounded text-[11px] font-medium transition cursor-pointer ${
                    currentPage === 1
                      ? 'bg-indigo-600 text-white font-bold'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                  }`}
                >
                  Main Page
                </button>

                {includeTrailingTC && (
                  <button
                    type="button"
                    onClick={() => jumpToPage(2)}
                    className={`px-2 py-1 rounded text-[11px] font-medium transition cursor-pointer ${
                      currentPage >= 2
                        ? 'bg-indigo-600 text-white font-bold'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    }`}
                  >
                    Trailing T&amp;C
                  </button>
                )}
              </div>

              {/* Zoom & Canvas Status */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.max(60, z - 15))}
                  className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>

                <span className="text-[10px] font-mono text-slate-400">{zoomLevel}%</span>

                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.min(160, z + 15))}
                  className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => setZoomLevel(100)}
                  className="px-1.5 py-0.5 text-[10px] rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  Fit
                </button>
              </div>
            </div>

            {/* Live PDF Viewer Container */}
            <div className="flex-1 relative overflow-hidden bg-slate-950 flex items-center justify-center p-2">
              {isRendering ? (
                <div className="flex flex-col items-center justify-center gap-3 text-slate-400 py-12">
                  <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                  <div className="text-sm font-semibold text-slate-200">
                    Compiling Live @react-pdf/renderer Preview...
                  </div>
                  <div className="text-xs text-slate-500">
                    Binding real-time branding, multi-bank details &amp; draft T&amp;C
                  </div>
                </div>
              ) : renderError ? (
                <div className="flex flex-col items-center justify-center gap-3 p-6 bg-slate-900 border border-rose-800/60 rounded-xl text-center max-w-md">
                  <FileCheck2 className="w-8 h-8 text-rose-400" />
                  <div className="text-sm font-bold text-rose-300">Preview Render Notice</div>
                  <p className="text-xs text-slate-400">{renderError}</p>
                  <button
                    type="button"
                    onClick={() => setRenderKey((k) => k + 1)}
                    className="mt-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg border border-slate-700 cursor-pointer"
                  >
                    Retry Render
                  </button>
                </div>
              ) : blobUrl ? (
                <div className="w-full h-full rounded-xl overflow-hidden shadow-2xl border border-slate-800 bg-white">
                  <iframe
                    ref={iframeRef}
                    src={`${blobUrl}#page=${currentPage}&toolbar=1&navpanes=0&view=FitH&zoom=${zoomLevel}`}
                    title="Live Document Preview Canvas"
                    className="w-full h-full border-0 rounded-xl"
                  />
                </div>
              ) : (
                <div className="text-xs text-slate-500">No preview available.</div>
              )}
            </div>

            {/* Canvas Footer Indicator */}
            <div className="px-3 py-1.5 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
              <div className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" />
                <span>Live @react-pdf/renderer Canvas</span>
              </div>
              <div className="text-slate-400 font-mono text-[10px] truncate max-w-[60%] text-right">
                Entity: {customTradingName || selectedEntity.tradingName} • P1: {pageTemplateMapping.page1Template} • Bank: {selectedBank?.bankName || 'LLOYDS'}
              </div>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════
              RIGHT SIDE: DOCUMENT CONTROLS, BRANDING, BANK & T&C SETTINGS
             ══════════════════════════════════════════════════════════════ */}
          <div className="flex-1 lg:flex-[1.0] flex flex-col bg-slate-900 overflow-hidden min-h-0">
            {/* Quick Entity Brand & Logo Selector Bar */}
            <div className="px-4 py-2.5 bg-slate-900/95 border-b border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-white p-1 flex items-center justify-center border border-slate-700 flex-shrink-0 shadow-xs">
                  {customLogoUrl || selectedEntity.logoUrl ? (
                    <img
                      src={customLogoUrl || selectedEntity.logoUrl}
                      alt={customTradingName || selectedEntity.tradingName}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <Building2 className="w-5 h-5 text-indigo-600" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">
                      Entity Logo &amp; Profile
                    </span>
                    {selectedEntity.isDefault && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-500/20 text-indigo-300">
                        Primary Default
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-bold text-slate-100 truncate">
                    {customTradingName || selectedEntity.tradingName}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <select
                  value={selectedEntityKey}
                  onChange={(e) => setSelectedEntityKey(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs font-bold text-white focus:outline-none focus:border-indigo-500 cursor-pointer shadow-xs"
                  title="Override Document Entity Profile & Logo"
                >
                  {availableEntities.map((ent) => (
                    <option key={ent.key} value={ent.key}>
                      {ent.tradingName} ({ent.registrationNumber ? `Reg: ${ent.registrationNumber}` : ent.fullName.slice(0, 16)})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Control Tabs Header */}
            <div className="flex items-center border-b border-slate-800 bg-slate-900/90 overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => setActiveTab('entity')}
                className={`flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold border-b-2 transition whitespace-nowrap cursor-pointer ${
                  activeTab === 'entity'
                    ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Entity &amp; Logo</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('layouts')}
                className={`flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold border-b-2 transition whitespace-nowrap cursor-pointer ${
                  activeTab === 'layouts'
                    ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Page Template Mapping</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('bank')}
                className={`flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold border-b-2 transition whitespace-nowrap cursor-pointer ${
                  activeTab === 'bank'
                    ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Landmark className="w-3.5 h-3.5" />
                <span>Bank Allocation</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('terms')}
                className={`flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold border-b-2 transition whitespace-nowrap cursor-pointer ${
                  activeTab === 'terms'
                    ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileSignature className="w-3.5 h-3.5" />
                <span>Draft T&amp;C Binding</span>
              </button>

              {extraControlsTab && (
                <button
                  type="button"
                  onClick={() => setActiveTab('extra')}
                  className={`flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold border-b-2 transition whitespace-nowrap cursor-pointer ${
                    activeTab === 'extra'
                      ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {extraControlsTab.icon}
                  <span>{extraControlsTab.label}</span>
                </button>
              )}
            </div>

            {/* Tab Body: Scrollable Form Settings */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs text-slate-200">
              {/* ──────────────────────────────────────────────────────────
                  TAB 1: DYNAMIC PAGE-SPECIFIC ENTITY & BRANDING OVERRIDES
                 ────────────────────────────────────────────────────────── */}
              {activeTab === 'entity' && (
                <div className="space-y-4 animate-fadeIn">
                  {/* Entity Preset Selector */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                      Select Corporate Entity Profile
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {availableEntities.map((ent) => {
                        const isSelected = ent.key === selectedEntityKey;
                        return (
                          <button
                            key={ent.id}
                            type="button"
                            onClick={() => setSelectedEntityKey(ent.key)}
                            className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                              isSelected
                                ? 'border-indigo-500 bg-indigo-500/15 text-white ring-1 ring-indigo-500/50'
                                : 'border-slate-700 bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-bold text-[11px] truncate">{ent.tradingName}</span>
                              {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />}
                            </div>
                            <div className="text-[10px] text-slate-500 truncate">
                              Reg: {ent.registrationNumber || 'N/A'}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Logo Image Override */}
                  <div className="p-3 rounded-xl border border-slate-800 bg-slate-800/40 flex items-center gap-3">
                    <div className="relative w-12 h-12 rounded-lg bg-white p-1 flex items-center justify-center border border-slate-700 flex-shrink-0 group">
                      {customLogoUrl ? (
                        <>
                          <img
                            src={customLogoUrl}
                            alt="Logo Preview"
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => setCustomLogoUrl('')}
                            className="absolute -top-1 -right-1 p-0.5 bg-red-600 hover:bg-red-700 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-xs"
                            title="Clear logo"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </>
                      ) : (
                        <Building2 className="w-6 h-6 text-slate-700" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[10px] font-semibold text-slate-400">
                          Entity Logo (Upload or URL Override)
                        </label>
                        {customLogoUrl && customLogoUrl.startsWith('data:image') && (
                          <span className="text-[9px] font-semibold text-emerald-400 bg-emerald-950/60 px-1 py-0.5 rounded border border-emerald-800">
                            Base64 Uploaded
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={customLogoUrl}
                          onChange={(e) => setCustomLogoUrl(e.target.value)}
                          placeholder="https://... or click Upload"
                          className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-white focus:outline-none focus:border-indigo-500 truncate"
                        />
                        <input
                          type="file"
                          id="modal-override-logo-upload"
                          accept="image/png,image/jpeg,image/webp,image/jpg"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (event) => {
                                if (event.target?.result) {
                                  setCustomLogoUrl(event.target.result as string);
                                }
                              };
                              reader.readAsDataURL(file);
                              e.target.value = '';
                            }
                          }}
                          className="hidden"
                        />
                        <label
                          htmlFor="modal-override-logo-upload"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-500 transition-all shadow-2xs whitespace-nowrap cursor-pointer active:scale-95"
                          title="Upload PNG / JPEG logo from device"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>Upload</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Editable Branding Fields */}
                  <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-800/40 space-y-3">
                    <h4 className="text-xs font-bold text-slate-300 flex items-center justify-between border-b border-slate-700/60 pb-2">
                      <span>Document Entity Details (Adjust on the Fly)</span>
                      <span className="text-[10px] text-slate-500">Live Overrides</span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                          Company Name (Full Legal)
                        </label>
                        <input
                          type="text"
                          value={customCompanyName}
                          onChange={(e) => setCustomCompanyName(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                          Trading Name / Brand
                        </label>
                        <input
                          type="text"
                          value={customTradingName}
                          onChange={(e) => setCustomTradingName(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                          Company Registration Number
                        </label>
                        <input
                          type="text"
                          value={customRegNumber}
                          onChange={(e) => setCustomRegNumber(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                          VAT Number
                        </label>
                        <input
                          type="text"
                          value={customVatNumber}
                          onChange={(e) => setCustomVatNumber(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                        Registered / Official Address
                      </label>
                      <input
                        type="text"
                        value={customOfficialAddress}
                        onChange={(e) => setCustomOfficialAddress(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                          Phone
                        </label>
                        <input
                          type="text"
                          value={customPhone}
                          onChange={(e) => setCustomPhone(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                          Email
                        </label>
                        <input
                          type="email"
                          value={customEmail}
                          onChange={(e) => setCustomEmail(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    {/* Header & Footer Custom Disclaimers */}
                    <div className="pt-2 border-t border-slate-700/60 space-y-3">
                      <div>
                        <label className="block text-[10px] font-semibold text-indigo-300 mb-1">
                          Custom Header Disclaimer / Subtitle
                        </label>
                        <input
                          type="text"
                          value={customHeaderText}
                          onChange={(e) => setCustomHeaderText(e.target.value)}
                          placeholder="e.g. Authorized Credit Hire &amp; Fleet Mobility Management"
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold text-indigo-300 mb-1">
                          Custom Footer Disclaimer (Replaces default footer)
                        </label>
                        <textarea
                          rows={2}
                          value={customFooterText}
                          onChange={(e) => setCustomFooterText(e.target.value)}
                          placeholder="Leave blank to use automated dual-row statutory footer"
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ──────────────────────────────────────────────────────────
                  TAB 2: PAGE-LEVEL TEMPLATE MAPPING & LAYOUT SELECTOR
                 ────────────────────────────────────────────────────────── */}
              {activeTab === 'layouts' && (
                <div className="space-y-4 animate-fadeIn">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-indigo-400" />
                        <span>Page Template &amp; Layout Mapping</span>
                      </label>
                      <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded">
                        Live PDF Multi-Page
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Configure page layout assignments and brand/logo routing on a page-by-page basis. The live PDF preview will dynamically update.
                    </p>
                  </div>

                  {/* Quick Pack Presets */}
                  <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/80 space-y-1.5">
                    <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">
                      Quick Layout Presets:
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setPageTemplateMapping({
                            ...pageTemplateMapping,
                            page1Template: layoutOptions.page1Options[0]?.id || '',
                            page2Template: layoutOptions.page2Options[0]?.id || '',
                            page3Template: layoutOptions.page3Options[0]?.id || '',
                            includePage2: true,
                            includePage3: true,
                          });
                          setIncludeTrailingTC(true);
                        }}
                        className="p-1.5 text-center rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600/70 text-[10px] font-bold text-indigo-300 hover:text-indigo-200 transition cursor-pointer"
                      >
                        📄 3-Page Full Pack
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setPageTemplateMapping({
                            ...pageTemplateMapping,
                            page1Template: layoutOptions.page1Options[0]?.id || '',
                            page2Template: layoutOptions.page2Options[0]?.id || '',
                            page3Template: 'none',
                            includePage2: true,
                            includePage3: false,
                          });
                          setIncludeTrailingTC(false);
                        }}
                        className="p-1.5 text-center rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600/70 text-[10px] font-bold text-slate-200 hover:text-white transition cursor-pointer"
                      >
                        📑 2-Page Contract
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setPageTemplateMapping({
                            ...pageTemplateMapping,
                            page1Template: layoutOptions.page1Options[0]?.id || '',
                            page2Template: 'none',
                            page3Template: 'none',
                            includePage2: false,
                            includePage3: false,
                          });
                          setIncludeTrailingTC(false);
                        }}
                        className="p-1.5 text-center rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600/70 text-[10px] font-bold text-slate-200 hover:text-white transition cursor-pointer"
                      >
                        📝 1-Page Summary
                      </button>
                    </div>
                  </div>

                  {/* PAGE 1 CONFIGURATION CARD */}
                  <div className="p-3.5 rounded-xl border border-indigo-500/40 bg-indigo-950/20 space-y-3">
                    <div className="flex items-center justify-between border-b border-indigo-500/30 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-indigo-600 text-white">
                          Page 1
                        </span>
                        <span className="font-bold text-xs text-indigo-200">
                          Primary Document Page
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-400">Required</span>
                    </div>

                    <div className="space-y-2.5">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                          Page 1 Layout Template
                        </label>
                        <select
                          value={pageTemplateMapping.page1Template}
                          onChange={(e) =>
                            setPageTemplateMapping((prev) => ({
                              ...prev,
                              page1Template: e.target.value,
                            }))
                          }
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-semibold text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                        >
                          {layoutOptions.page1Options.map((opt) => (
                            <option key={opt.id} value={opt.id}>
                              {opt.name} {opt.badge ? `[${opt.badge}]` : ''}
                            </option>
                          ))}
                        </select>
                        {layoutOptions.page1Options.find((o) => o.id === pageTemplateMapping.page1Template)?.description && (
                          <p className="text-[10px] text-slate-400 mt-1 italic">
                            {layoutOptions.page1Options.find((o) => o.id === pageTemplateMapping.page1Template)?.description}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                          Page 1 Entity Logo &amp; Header Override
                        </label>
                        <select
                          value={pageTemplateMapping.page1EntityKey || ''}
                          onChange={(e) =>
                            setPageTemplateMapping((prev) => ({
                              ...prev,
                              page1EntityKey: e.target.value,
                            }))
                          }
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
                        >
                          <option value="">Default ({customTradingName || selectedEntity.tradingName})</option>
                          {availableEntities.map((ent) => (
                            <option key={ent.key} value={ent.key}>
                              {ent.tradingName} — {ent.fullName}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* PAGE 2 CONFIGURATION CARD */}
                  <div className={`p-3.5 rounded-xl border transition-all ${
                    pageTemplateMapping.includePage2 && pageTemplateMapping.page2Template !== 'none'
                      ? 'border-indigo-500/40 bg-indigo-950/20'
                      : 'border-slate-800 bg-slate-800/30 opacity-75'
                  } space-y-3`}>
                    <div className="flex items-center justify-between border-b border-slate-700/60 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-slate-700 text-slate-200">
                          Page 2
                        </span>
                        <span className="font-bold text-xs text-slate-200">
                          Vehicle Inspection &amp; Schedule
                        </span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={pageTemplateMapping.includePage2 && pageTemplateMapping.page2Template !== 'none'}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setPageTemplateMapping((prev) => ({
                              ...prev,
                              includePage2: checked,
                              page2Template: checked && prev.page2Template === 'none'
                                ? (layoutOptions.page2Options[0]?.id || 'checkout_inspection_condition')
                                : prev.page2Template,
                            }));
                          }}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                      </label>
                    </div>

                    {pageTemplateMapping.includePage2 && pageTemplateMapping.page2Template !== 'none' && (
                      <div className="space-y-2.5">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                            Page 2 Layout Template
                          </label>
                          <select
                            value={pageTemplateMapping.page2Template}
                            onChange={(e) =>
                              setPageTemplateMapping((prev) => ({
                                ...prev,
                                page2Template: e.target.value,
                              }))
                            }
                            className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-semibold text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                          >
                            {layoutOptions.page2Options.map((opt) => (
                              <option key={opt.id} value={opt.id}>
                                {opt.name} {opt.badge ? `[${opt.badge}]` : ''}
                              </option>
                            ))}
                          </select>
                          {layoutOptions.page2Options.find((o) => o.id === pageTemplateMapping.page2Template)?.description && (
                            <p className="text-[10px] text-slate-400 mt-1 italic">
                              {layoutOptions.page2Options.find((o) => o.id === pageTemplateMapping.page2Template)?.description}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                            Page 2 Entity Logo &amp; Header Override
                          </label>
                          <select
                            value={pageTemplateMapping.page2EntityKey || ''}
                            onChange={(e) =>
                              setPageTemplateMapping((prev) => ({
                                ...prev,
                                page2EntityKey: e.target.value,
                              }))
                            }
                            className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
                          >
                            <option value="">Default ({customTradingName || selectedEntity.tradingName})</option>
                            {availableEntities.map((ent) => (
                              <option key={ent.key} value={ent.key}>
                                {ent.tradingName} — {ent.fullName}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* PAGE 3 CONFIGURATION CARD */}
                  <div className={`p-3.5 rounded-xl border transition-all ${
                    includeTrailingTC && pageTemplateMapping.includePage3 && pageTemplateMapping.page3Template !== 'none'
                      ? 'border-indigo-500/40 bg-indigo-950/20'
                      : 'border-slate-800 bg-slate-800/30 opacity-75'
                  } space-y-3`}>
                    <div className="flex items-center justify-between border-b border-slate-700/60 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-slate-700 text-slate-200">
                          Page 3
                        </span>
                        <span className="font-bold text-xs text-slate-200">
                          Trailing Legal Terms &amp; Conditions
                        </span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={includeTrailingTC && pageTemplateMapping.includePage3 && pageTemplateMapping.page3Template !== 'none'}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setIncludeTrailingTC(checked);
                            setPageTemplateMapping((prev) => ({
                              ...prev,
                              includePage3: checked,
                              page3Template: checked && prev.page3Template === 'none'
                                ? (layoutOptions.page3Options[0]?.id || 'statutory_hire_terms')
                                : prev.page3Template,
                            }));
                          }}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                      </label>
                    </div>

                    {includeTrailingTC && pageTemplateMapping.includePage3 && pageTemplateMapping.page3Template !== 'none' && (
                      <div className="space-y-2.5">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                            Page 3 Terms Template &amp; Clauses
                          </label>
                          <select
                            value={pageTemplateMapping.page3Template}
                            onChange={(e) =>
                              setPageTemplateMapping((prev) => ({
                                ...prev,
                                page3Template: e.target.value,
                              }))
                            }
                            className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-semibold text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                          >
                            {layoutOptions.page3Options.map((opt) => (
                              <option key={opt.id} value={opt.id}>
                                {opt.name} {opt.badge ? `[${opt.badge}]` : ''}
                              </option>
                            ))}
                          </select>
                          {layoutOptions.page3Options.find((o) => o.id === pageTemplateMapping.page3Template)?.description && (
                            <p className="text-[10px] text-slate-400 mt-1 italic">
                              {layoutOptions.page3Options.find((o) => o.id === pageTemplateMapping.page3Template)?.description}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                            Page 3 Entity Logo &amp; Header Override
                          </label>
                          <select
                            value={pageTemplateMapping.page3EntityKey || ''}
                            onChange={(e) =>
                              setPageTemplateMapping((prev) => ({
                                ...prev,
                                page3EntityKey: e.target.value,
                              }))
                            }
                            className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
                          >
                            <option value="">Default ({customTradingName || selectedEntity.tradingName})</option>
                            {availableEntities.map((ent) => (
                              <option key={ent.key} value={ent.key}>
                                {ent.tradingName} — {ent.fullName}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ──────────────────────────────────────────────────────────
                  TAB 2: MULTI-BANK ACCOUNT ALLOCATION DROPDOWN
                 ────────────────────────────────────────────────────────── */}
              {activeTab === 'bank' && (
                <div className="space-y-4 animate-fadeIn">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                      Select Payment Bank Allocation
                    </label>
                    <p className="text-slate-400 text-xs mb-3">
                      Choose which company bank account will print on this document's payment section.
                    </p>

                    <div className="relative">
                      <select
                        value={selectedBankId}
                        onChange={(e) => setSelectedBankId(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs font-bold text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                      >
                        {availableBanks.map((bank) => (
                          <option key={bank.id} value={bank.id} className="bg-slate-900 text-white">
                            {formatBankAllocationLabel(bank)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Active Bank Card Preview */}
                  {selectedBank && (
                    <div className="p-4 rounded-xl border border-indigo-500/40 bg-indigo-950/20 space-y-3">
                      <div className="flex items-center justify-between border-b border-indigo-500/30 pb-2">
                        <span className="font-bold text-indigo-300 flex items-center gap-1.5">
                          <Landmark className="w-4 h-4 text-indigo-400" />
                          <span>{selectedBank.bankName}</span>
                        </span>
                        {selectedBank.isDefault && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-indigo-500/30 text-indigo-200 border border-indigo-400/40">
                            Primary Account
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-slate-400 block text-[10px]">Beneficiary Name</span>
                          <span className="font-bold text-slate-200">{selectedBank.accountName}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Currency</span>
                          <span className="font-bold text-slate-200">{selectedBank.currency || 'GBP (£)'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Account Number</span>
                          <span className="font-mono font-bold text-slate-100 text-sm">
                            {selectedBank.accountNumber}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Sort Code</span>
                          <span className="font-mono font-bold text-slate-100 text-sm">
                            {selectedBank.sortCode}
                          </span>
                        </div>
                        {selectedBank.iban && (
                          <div className="col-span-2">
                            <span className="text-slate-400 block text-[10px]">IBAN</span>
                            <span className="font-mono text-slate-300 text-[11px]">{selectedBank.iban}</span>
                          </div>
                        )}
                      </div>

                      {selectedBank.notes && (
                        <div className="text-[11px] text-slate-400 italic pt-1 border-t border-indigo-500/20">
                          {selectedBank.notes}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/60 text-slate-400 text-xs">
                    💡 Manage and add permanent company bank accounts inside{' '}
                    <span className="text-indigo-400 font-semibold">Company &amp; Roles → Bank Details</span>.
                  </div>
                </div>
              )}

              {/* ──────────────────────────────────────────────────────────
                  TAB 3: DRAFT T&C AUTO-BINDING & TEMPLATE NAVIGATION
                 ────────────────────────────────────────────────────────── */}
              {activeTab === 'terms' && (
                <div className="space-y-4 animate-fadeIn">
                  {/* Trailing T&C Page Toggle */}
                  <div className="flex items-center justify-between p-3 rounded-xl border border-slate-800 bg-slate-800/50">
                    <div>
                      <span className="font-bold text-slate-200 block text-xs">
                        Auto-Bind Trailing T&amp;C Page(s)
                      </span>
                      <span className="text-slate-400 text-[11px]">
                        Appends statutory terms &amp; conditions directly to trailing page(s).
                      </span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeTrailingTC}
                        onChange={(e) => setIncludeTrailingTC(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>

                  {/* Template Picker */}
                  {includeTrailingTC && (
                    <>
                      <div>
                        <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                          Select Document Terms Template
                        </label>
                        <select
                          value={selectedTemplateId}
                          onChange={(e) => setSelectedTemplateId(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs font-bold text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                        >
                          {availableTemplates.map((tmpl) => (
                            <option key={tmpl.id} value={tmpl.id} className="bg-slate-900 text-white">
                              {tmpl.name} ({tmpl.category})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                          Terms &amp; Conditions Title
                        </label>
                        <input
                          type="text"
                          value={customTermsTitle}
                          onChange={(e) => setCustomTermsTitle(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[10px] font-semibold text-slate-400">
                            Draft Terms &amp; Conditions Text (Live Editor)
                          </label>
                          <span className="text-[10px] text-slate-500">Auto-bound to trailing page</span>
                        </div>
                        <textarea
                          rows={8}
                          value={draftTermsContent}
                          onChange={(e) => setDraftTermsContent(e.target.value)}
                          className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* ──────────────────────────────────────────────────────────
                  TAB 4: EXTRA CONTROLS
                 ────────────────────────────────────────────────────────── */}
              {activeTab === 'extra' && extraControlsTab && (
                <div className="animate-fadeIn">{extraControlsTab.content}</div>
              )}
            </div>

            {/* Right Side Footer Action Panel */}
            <div className="p-3.5 bg-slate-800/95 border-t border-slate-800 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 text-xs font-bold text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                Cancel / Edit
              </button>

              <button
                type="button"
                onClick={handleCommit}
                disabled={isGeneratingPDF}
                className="inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                {isGeneratingPDF ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Committing...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5" />
                    <span>Commit &amp; Generate PDF</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SplitDocumentPreviewModal;
