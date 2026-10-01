// src/components/finance/AccountStatementPreviewModal.tsx
import React, { useMemo } from 'react';
import {
  AccountStatementDocument,
  AccountStatementData,
} from '../pdf/documents/AccountStatementDocument';
import SplitDocumentPreviewModal from '../common/SplitDocumentPreviewModal';
import { Wallet, Calendar, TrendingUp, TrendingDown, Layers, FileCheck2 } from 'lucide-react';

interface AccountStatementPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  statementData: AccountStatementData | null;
  companyDetails?: any;
  onDownloadPDF: () => void;
  isGeneratingPDF?: boolean;
}

export const AccountStatementPreviewModal: React.FC<AccountStatementPreviewModalProps> = ({
  isOpen,
  onClose,
  statementData,
  companyDetails,
  onDownloadPDF,
  isGeneratingPDF = false,
}) => {
  const fmtCurrency = (val?: number) =>
    `£${Number(val || 0).toLocaleString('en-GB', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const extraTab = useMemo(() => {
    if (!statementData) return undefined;
    return {
      label: 'Statement Metrics',
      icon: <Layers className="w-3.5 h-3.5" />,
      content: (
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-800/40 space-y-3">
            <h4 className="text-xs font-bold text-slate-300 border-b border-slate-700/60 pb-2 flex items-center justify-between">
              <span>Financial Ledger Summary</span>
              <span className="font-mono text-indigo-400">{statementData.statementReference}</span>
            </h4>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Wallet className="w-3.5 h-3.5 text-indigo-400" /> Account:
                </span>
                <span className="font-bold text-white">{statementData.account.name}</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" /> Period:
                </span>
                <span className="font-medium text-slate-200">{statementData.periodLabel}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase font-bold block mb-0.5">
                  Opening Balance
                </span>
                <span className="font-mono font-bold text-slate-200 text-sm">
                  {fmtCurrency(statementData.openingBalance)}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-emerald-400 uppercase font-bold flex items-center gap-1 mb-0.5">
                  <TrendingUp className="w-3 h-3" /> Total Inflows ({statementData.inflowCount})
                </span>
                <span className="font-mono font-bold text-emerald-400 text-sm">
                  +{fmtCurrency(statementData.totalInflows)}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-rose-400 uppercase font-bold flex items-center gap-1 mb-0.5">
                  <TrendingDown className="w-3 h-3" /> Total Outflows ({statementData.outflowCount})
                </span>
                <span className="font-mono font-bold text-rose-400 text-sm">
                  -{fmtCurrency(statementData.totalOutflows)}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-indigo-950/40 border border-indigo-500/40">
                <span className="text-[10px] text-indigo-400 uppercase font-bold block mb-0.5">
                  Closing Balance
                </span>
                <span className="font-mono font-bold text-indigo-300 text-sm">
                  {fmtCurrency(statementData.closingBalance)}
                </span>
              </div>
            </div>

            <div className="text-[11px] text-slate-400 pt-2 flex items-center gap-1.5">
              <FileCheck2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>
                {statementData.transactions.length} verified general ledger transaction lines compiled.
              </span>
            </div>
          </div>
        </div>
      ),
    };
  }, [statementData]);

  if (!isOpen || !statementData) return null;

  return (
    <SplitDocumentPreviewModal
      isOpen={isOpen}
      onClose={onClose}
      documentType="finance_statement"
      documentTitle="Account Statement"
      documentReference={statementData.statementReference}
      baseCompanyDetails={companyDetails}
      renderDocument={(effectiveCompanyDetails) => (
        <AccountStatementDocument
          data={statementData}
          companyDetails={effectiveCompanyDetails}
        />
      )}
      onCommitAndGenerate={onDownloadPDF}
      isGeneratingPDF={isGeneratingPDF}
      initialEntityKey="aie_skyline"
      extraControlsTab={extraTab}
    />
  );
};

export default AccountStatementPreviewModal;
