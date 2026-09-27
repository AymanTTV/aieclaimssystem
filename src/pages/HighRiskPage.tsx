// src/pages/HighRiskPage.tsx
import React, { useState, useEffect } from 'react';
import { useSearchParams, useLocation, Link } from 'react-router-dom';
import { HighRiskHeader } from '../components/highRisk/HighRiskHeader';
import { InternalStaffCheck } from '../components/highRisk/InternalStaffCheck';
import { ExternalPartnerSearch } from '../components/highRisk/ExternalPartnerSearch';
import {
  getStoredHighRiskDrivers,
  subscribeToHighRiskDrivers,
  addHighRiskDriver,
  updateHighRiskDriver,
  updateDriverStatus,
  overrideHighRiskDriver,
  removeHighRiskDriver,
  resetToSampleDrivers,
} from '../services/highRiskService';
import {
  HighRiskDriver,
  NewDriverInput,
  EditDriverInput,
  OverridePayload,
  UserRole,
  RiskLevel,
} from '../types/highRiskDriver';
import { Lock, ShieldAlert, ArrowLeft, Building2, Copy, ExternalLink, X, CheckCircle2, Share2 } from 'lucide-react';
import { ROUTES } from '../routes';
import toast from 'react-hot-toast';

interface HighRiskPageProps {
  embedded?: boolean;
}

export const HighRiskPage: React.FC<HighRiskPageProps> = ({ embedded = false }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const tabParam = searchParams.get('tab');
  const isPartnerPath = location.pathname.includes('partner');

  const [activeTab, setActiveTab] = useState<'internal' | 'external'>(
    tabParam === 'external' || tabParam === 'partner' || isPartnerPath ? 'external' : 'internal'
  );
  const [userRole, setUserRole] = useState<UserRole>('manager');
  const [drivers, setDrivers] = useState<HighRiskDriver[]>([]);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  // Sync tab with URL if changed
  useEffect(() => {
    if (tabParam === 'external' || tabParam === 'partner' || isPartnerPath) {
      setActiveTab('external');
    } else if (tabParam === 'internal') {
      setActiveTab('internal');
    }
  }, [tabParam, isPartnerPath]);

  // Subscribe to real-time driver updates across tabs, windows, and database
  useEffect(() => {
    const unsubscribe = subscribeToHighRiskDrivers((updated) => {
      setDrivers(updated);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  const handleTabChange = (tab: 'internal' | 'external') => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const handleAddDriver = (input: NewDriverInput) => {
    const created = addHighRiskDriver(input);
    setDrivers((prev) => [created, ...prev.filter((d) => d.id !== created.id)]);
    toast.success(`Driver "${created.fullName}" registered in High Risk database!`);
  };

  const handleEditDriver = (driverId: string, input: EditDriverInput) => {
    const updated = updateHighRiskDriver(driverId, input);
    setDrivers(updated);
    toast.success('High Risk driver record updated.');
  };

  const handleUpdateStatus = (driverId: string, status: RiskLevel) => {
    const updated = updateDriverStatus(driverId, status);
    setDrivers(updated);
    toast.success(`Status updated to ${status}.`);
  };

  const handleOverrideDriver = (driverId: string, payload: OverridePayload) => {
    const updated = overrideHighRiskDriver(driverId, payload);
    setDrivers(updated);
    toast.success('Manager override recorded.');
  };

  const handleDeleteDriver = (driverId: string) => {
    const updated = removeHighRiskDriver(driverId);
    setDrivers(updated);
    toast.success('Driver removed from High Risk database.');
  };

  const handleResetDrivers = () => {
    const resetted = resetToSampleDrivers();
    setDrivers(resetted);
    toast.success('Reset to standard sample high risk records.');
  };

  const partnerPortalUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/partner`
    : '/partner';

  const copyToClipboard = async (text: string) => {
    let succeeded = false;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        succeeded = true;
      }
    } catch {
      // Fallback below
    }

    if (!succeeded) {
      try {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        succeeded = document.execCommand('copy');
        textArea.remove();
      } catch {
        succeeded = false;
      }
    }

    return succeeded;
  };

  const handleCopyPartnerLink = async () => {
    const success = await copyToClipboard(partnerPortalUrl);
    setCopiedLink(true);
    if (success) {
      toast.success('Partner Portal Link copied to clipboard!');
    } else {
      toast.success('Link ready to share!');
    }
    setShowShareModal(true);
    setTimeout(() => setCopiedLink(false), 3500);
  };

  // Content body
  const content = (
    <div className="space-y-6">
      <HighRiskHeader
        activeTab={activeTab}
        onTabChange={handleTabChange}
        databaseCount={drivers.length}
        onCopyPartnerLink={handleCopyPartnerLink}
        copied={copiedLink}
        userRole={userRole}
        onRoleChange={setUserRole}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {activeTab === 'internal' ? (
          <InternalStaffCheck
            drivers={drivers}
            onAddDriver={handleAddDriver}
            onEditDriver={handleEditDriver}
            onUpdateStatus={handleUpdateStatus}
            onOverrideDriver={handleOverrideDriver}
            onDeleteDriver={handleDeleteDriver}
            onResetDrivers={handleResetDrivers}
            userRole={userRole}
          />
        ) : (
          <ExternalPartnerSearch
            drivers={drivers}
            onPartnerReportDriver={handleAddDriver}
          />
        )}
      </div>

      {/* Sleek Dark Navy Footer */}
      <div className="bg-[#0b132b] border-t border-slate-800/80 text-xs text-slate-400 py-4 mt-8 shadow-inner">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-black text-white tracking-wider">HIGH RISK REGISTRY</span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-300 font-semibold">Automotive Fleet Cross-Verification Protocol</span>
          </div>

          <div className="flex items-center gap-3 text-[11px] text-slate-400">
            <span className="flex items-center gap-1 text-emerald-400 font-bold">
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              Strict Zero-PII Compliance Enforced
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-300 font-medium">Full Name Verification Only</span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-300 font-medium">Confidential Partner Privacy Shield</span>
          </div>
        </div>
      </div>

      {/* Share Partner Portal Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg bg-[#111a33] border-2 border-slate-700 rounded-2xl p-6 shadow-2xl text-slate-100 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-950">
                  <Share2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white uppercase tracking-tight">
                    Partner Fleet Search Portal Link
                  </h3>
                  <p className="text-xs text-indigo-300 font-medium">
                    Cross-Fleet Verification Sharing Link
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowShareModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <p className="text-xs text-slate-300 leading-relaxed">
                Send this link to external partner rental fleets or open it in a separate window. Partner fleets can instantly query high-risk drivers with strict Zero-PII compliance.
              </p>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Direct Partner Portal URL
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={partnerPortalUrl}
                    className="flex-1 px-3 py-2 text-xs font-mono bg-slate-900 border border-slate-700 rounded-xl text-indigo-300 font-bold select-all focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      await copyToClipboard(partnerPortalUrl);
                      setCopiedLink(true);
                      toast.success('Copied link!');
                      setTimeout(() => setCopiedLink(false), 3000);
                    }}
                    className="px-3.5 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-md transition flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedLink ? <CheckCircle2 className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4 text-white" />}
                    <span>{copiedLink ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#0c1427] border border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-300 font-medium">Open portal now in a new browser tab:</span>
                <a
                  href={partnerPortalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 font-bold transition text-xs"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Open Portal</span>
                </a>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setShowShareModal(false)}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // If embedded in Layout (default within the system), render cleanly into the system layout
  if (embedded) {
    return (
      <div className="min-h-full bg-[#0a0f1d] text-slate-100 font-sans pb-12">
        {content}
      </div>
    );
  }

  // Standalone mode (for public /partner link) with top return bar
  return (
    <div className="min-h-screen bg-[#0a0f1d] text-slate-100 flex flex-col font-sans">
      <div className="bg-[#0b132b] border-b border-slate-800 px-4 py-2.5 flex items-center justify-between text-xs shadow-md">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-md bg-red-600 text-white shadow-sm shadow-red-900/50">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <span className="font-black text-white uppercase tracking-wide">Skyline Fleet Management</span>
          <span className="text-slate-600">•</span>
          <span className="text-slate-300 font-medium">Partner Portal</span>
        </div>

        <Link
          to={ROUTES.DASHBOARD}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs border border-slate-700 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return to Fleet Management System</span>
        </Link>
      </div>

      <div className="flex-1">
        {content}
      </div>
    </div>
  );
};

export default HighRiskPage;
