// src/components/driverPay/DriverPayBulkWhatsAppModal.tsx
import React, { useState, useEffect, useMemo } from 'react';
import Modal from '../ui/Modal';
import { DriverPay } from '../../types/driverPay';
import {
  DriverPayTemplateOption,
  resolveDriverPayContext,
  replaceDriverPayPlaceholders,
  fetchDriverPayTemplates,
  getActiveDriverPayTemplate,
  buildDriverPayWhatsAppLink,
  dispatchDriverPayWhatsApp,
} from '../../utils/driverPayWhatsApp';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import {
  MessageCircle,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  SkipForward,
  RotateCcw,
  User,
  CreditCard,
  Phone,
  Check,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface DriverPayBulkWhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: DriverPay[];
  onComplete?: () => void;
}

interface QueueItem {
  record: DriverPay;
  status: 'pending' | 'dispatched' | 'skipped';
  isValidPhone: boolean;
  phoneDigits: string;
}

export const DriverPayBulkWhatsAppModal: React.FC<DriverPayBulkWhatsAppModalProps> = ({
  isOpen,
  onClose,
  records,
  onComplete,
}) => {
  const { user } = useAuth();
  const { can, isAdmin } = usePermissions();

  const canSendWhatsApp = isAdmin || can('driverPay', 'whatsapp') || can('driverPay', 'send');
  const [templates, setTemplates] = useState<DriverPayTemplateOption[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  // Queue state
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);

  // Initialize templates and queue on open
  useEffect(() => {
    if (isOpen && records.length > 0) {
      setLoadingTemplates(true);
      fetchDriverPayTemplates()
        .then((tpls) => {
          setTemplates(tpls);
          const activeTpl = getActiveDriverPayTemplate(tpls);
          setSelectedTemplateId(activeTpl.id);
        })
        .finally(() => setLoadingTemplates(false));

      const items: QueueItem[] = records.map((rec) => {
        const { isValidPhone, phoneDigits } = buildDriverPayWhatsAppLink(rec, '');
        return {
          record: rec,
          status: 'pending',
          isValidPhone,
          phoneDigits,
        };
      });
      setQueue(items);
      setCurrentIndex(0);
    }
  }, [isOpen, records]);

  // Current template
  const currentTemplate = useMemo(() => {
    return templates.find((t) => t.id === selectedTemplateId) || templates[0];
  }, [templates, selectedTemplateId]);

  // Current driver being processed in sequential queue
  const currentItem = queue[currentIndex];

  // Current driver message preview
  const currentMessage = useMemo(() => {
    if (!currentItem || !currentTemplate) return '';
    const ctx = resolveDriverPayContext(currentItem.record);
    return replaceDriverPayPlaceholders(currentTemplate.bodyTemplate, ctx);
  }, [currentItem, currentTemplate]);

  // Dispatched count
  const dispatchedCount = queue.filter((q) => q.status === 'dispatched').length;
  const progressPercent = queue.length > 0 ? Math.round((dispatchedCount / queue.length) * 100) : 0;
  const isFinished = queue.length > 0 && queue.every((q) => q.status !== 'pending');

  // Handle single dispatch from sequential button
  const handleDispatchCurrent = async () => {
    if (!currentItem) return;
    if (!canSendWhatsApp) {
      toast.error('You do not have permission to dispatch WhatsApp messages for driver pay.');
      return;
    }

    if (!currentItem.isValidPhone) {
      toast.error(`Cannot send to ${currentItem.record.name}: Invalid phone number.`);
      return;
    }

    const res = await dispatchDriverPayWhatsApp(
      currentItem.record,
      currentMessage,
      user?.email,
      selectedTemplateId
    );

    if (res.success) {
      toast.success(`WhatsApp opened for ${currentItem.record.name}`);
      setQueue((prev) =>
        prev.map((item, idx) => (idx === currentIndex ? { ...item, status: 'dispatched' } : item))
      );

      // Advance to next pending item
      const nextPendingIndex = queue.findIndex(
        (item, idx) => idx > currentIndex && item.status === 'pending'
      );
      if (nextPendingIndex !== -1) {
        setCurrentIndex(nextPendingIndex);
      } else {
        const wrapIndex = queue.findIndex((item) => item.status === 'pending');
        if (wrapIndex !== -1) {
          setCurrentIndex(wrapIndex);
        }
      }
    } else {
      toast.error(res.error || 'Failed to dispatch WhatsApp');
    }
  };

  // Handle individual dispatch directly from table row
  const handleDispatchSpecific = async (index: number) => {
    if (!canSendWhatsApp) {
      toast.error('You do not have permission to dispatch WhatsApp messages for driver pay.');
      return;
    }
    const item = queue[index];
    if (!item) return;

    if (!item.isValidPhone) {
      toast.error(`Cannot send to ${item.record.name}: Invalid phone number.`);
      return;
    }

    const ctx = resolveDriverPayContext(item.record);
    const msg = replaceDriverPayPlaceholders(currentTemplate?.bodyTemplate || '', ctx);

    const res = await dispatchDriverPayWhatsApp(item.record, msg, user?.email, selectedTemplateId);
    if (res.success) {
      toast.success(`WhatsApp opened for ${item.record.name}`);
      setQueue((prev) =>
        prev.map((it, idx) => (idx === index ? { ...it, status: 'dispatched' } : it))
      );
    } else {
      toast.error(res.error || 'Failed to dispatch WhatsApp');
    }
  };

  // Handle Skip
  const handleSkipCurrent = () => {
    if (!currentItem) return;
    setQueue((prev) =>
      prev.map((item, idx) => (idx === currentIndex ? { ...item, status: 'skipped' } : item))
    );
    const nextPendingIndex = queue.findIndex(
      (item, idx) => idx > currentIndex && item.status === 'pending'
    );
    if (nextPendingIndex !== -1) {
      setCurrentIndex(nextPendingIndex);
    } else {
      const wrapIndex = queue.findIndex((item) => item.status === 'pending');
      if (wrapIndex !== -1) {
        setCurrentIndex(wrapIndex);
      }
    }
  };

  // Reset Queue
  const handleResetQueue = () => {
    setQueue((prev) => prev.map((it) => ({ ...it, status: 'pending' })));
    setCurrentIndex(0);
    toast.success('Queue reset');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Batch WhatsApp Dispatch Queue" size="xl">
      <div className="space-y-5">
        {/* Progress header */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <div>
              <span className="text-sm font-semibold text-gray-900">
                Dispatch Progress: {dispatchedCount} of {queue.length} Sent ({progressPercent}%)
              </span>
              <p className="text-xs text-gray-500 mt-0.5">
                Due to browser popup restrictions, WhatsApp links launch sequentially with one click per driver.
              </p>
            </div>
            {dispatchedCount > 0 && (
              <button
                type="button"
                onClick={handleResetQueue}
                className="text-xs text-gray-600 hover:text-gray-900 flex items-center gap-1 border border-gray-300 rounded px-2 py-1 bg-white hover:bg-gray-50"
              >
                <RotateCcw className="h-3 w-3" />
                Reset Queue
              </button>
            )}
          </div>

          {/* Progress bar */}
          <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-emerald-600 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Template Selector */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
            WhatsApp Custom Template
          </label>
          <select
            value={selectedTemplateId}
            onChange={(e) => setSelectedTemplateId(e.target.value)}
            disabled={loadingTemplates}
            className="w-full border border-gray-300 rounded-md py-2 px-3 text-sm focus:ring-emerald-500 focus:border-emerald-500 bg-white"
          >
            {templates.map((tpl) => (
              <option key={tpl.id} value={tpl.id}>
                {tpl.name}
              </option>
            ))}
          </select>
        </div>

        {/* Current Driver in Queue Callout */}
        {!isFinished && currentItem ? (
          <div className="border-2 border-emerald-500 bg-emerald-50/40 rounded-lg p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="bg-emerald-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  Queue #{currentIndex + 1}
                </span>
                <span className="font-bold text-gray-900 text-base">{currentItem.record.name}</span>
                <span className="text-xs font-mono bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                  {currentItem.record.driverNo || currentItem.record.id}
                </span>
              </div>

              <div className="flex items-center gap-3 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5 text-gray-400" />
                  {currentItem.record.phoneNumber || (
                    <span className="text-red-500 font-medium">No Phone</span>
                  )}
                </span>
                <span className="flex items-center gap-1 font-semibold text-emerald-900">
                  <CreditCard className="h-3.5 w-3.5 text-emerald-600" />
                  £{Number(currentItem.record.paidAmount || 0).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Message Preview Box */}
            <div className="bg-white border border-gray-200 rounded p-3 text-xs font-sans text-gray-700 max-h-36 overflow-y-auto whitespace-pre-wrap leading-relaxed">
              {currentMessage}
            </div>

            {/* Action Buttons for current */}
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={handleSkipCurrent}
                className="inline-flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                <SkipForward className="h-3.5 w-3.5" />
                Skip Driver
              </button>

              <button
                type="button"
                onClick={handleDispatchCurrent}
                disabled={!currentItem.isValidPhone || !canSendWhatsApp}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 border border-transparent rounded text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 shadow transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title={!canSendWhatsApp ? "Permission required to dispatch WhatsApp messages" : undefined}
              >
                <MessageCircle className="h-4 w-4" />
                <span>Launch WhatsApp for {currentItem.record.name}</span>
                <ExternalLink className="h-3.5 w-3.5 ml-0.5 opacity-80" />
              </button>
            </div>
          </div>
        ) : isFinished ? (
          <div className="bg-emerald-100 border border-emerald-300 rounded-lg p-5 text-center space-y-2">
            <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto" />
            <h4 className="text-base font-bold text-emerald-900">All Driver Messages Dispatched!</h4>
            <p className="text-xs text-emerald-700 max-w-md mx-auto">
              All selected driver payment WhatsApp links have been processed and logged to communication history.
            </p>
          </div>
        ) : null}

        {/* Selected Drivers List Table */}
        <div>
          <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
            Selected Driver Records ({queue.length})
          </h4>
          <div className="border border-[#E2E8F0] rounded-xl overflow-hidden max-h-56 overflow-y-auto bg-white shadow-xs">
            <table className="min-w-full border-collapse text-xs">
              <thead className="bg-[#F8FAFC] text-[#334155] border-b-2 border-[#E2E8F0] sticky top-0 z-10 shadow-xs">
                <tr className="border-b-2 border-[#E2E8F0]">
                  <th className="py-2.5 px-3.5 text-left text-xs font-semibold text-[#334155] uppercase tracking-wider select-none">#</th>
                  <th className="py-2.5 px-3.5 text-left text-xs font-semibold text-[#334155] uppercase tracking-wider select-none">Driver Name</th>
                  <th className="py-2.5 px-3.5 text-left text-xs font-semibold text-[#334155] uppercase tracking-wider select-none">Phone</th>
                  <th className="py-2.5 px-3.5 text-left text-xs font-semibold text-[#334155] uppercase tracking-wider select-none">Paid</th>
                  <th className="py-2.5 px-3.5 text-left text-xs font-semibold text-[#334155] uppercase tracking-wider select-none">Status</th>
                  <th className="py-2.5 px-3.5 text-right text-xs font-semibold text-[#334155] uppercase tracking-wider select-none">Action</th>
                </tr>
              </thead>
              <tbody>
                {queue.map((item, idx) => {
                  const isCurrent = idx === currentIndex && item.status === 'pending';
                  const isEven = idx % 2 === 1;
                  const rowBg = isCurrent
                    ? 'bg-emerald-50 font-medium'
                    : isEven
                    ? 'bg-[#EEF5FD]'
                    : 'bg-white';
                  return (
                    <tr
                      key={item.record.id}
                      className={`group border-b border-[#E2E8F0] ${rowBg} hover:bg-[#DCEBFA] transition-all duration-150 ease-in-out`}
                    >
                      <td className="py-2 px-3.5 font-bold text-slate-500">{idx + 1}</td>
                      <td className="py-2 px-3.5 text-slate-900 font-bold">
                        {item.record.name}
                        <span className="text-[10px] text-slate-500 block font-normal">
                          {item.record.driverNo || item.record.id}
                        </span>
                      </td>
                      <td className="py-2 px-3.5">
                        {item.record.phoneNumber ? (
                          <span className="text-slate-800 font-mono font-medium">{item.record.phoneNumber}</span>
                        ) : (
                          <span className="text-rose-600 font-semibold">Missing</span>
                        )}
                      </td>
                      <td className="py-2 px-3.5 text-slate-900 font-black">
                        £{Number(item.record.paidAmount || 0).toFixed(2)}
                      </td>
                      <td className="py-2 px-3.5">
                        {item.status === 'dispatched' && (
                          <span className="inline-flex items-center gap-1 text-emerald-800 bg-emerald-100 font-semibold px-2 py-0.5 rounded text-[11px] border border-emerald-200">
                            <Check className="h-3 w-3" /> Dispatched
                          </span>
                        )}
                        {item.status === 'skipped' && (
                          <span className="text-slate-600 bg-slate-100 font-medium px-2 py-0.5 rounded text-[11px] border border-slate-200">
                            Skipped
                          </span>
                        )}
                        {item.status === 'pending' && (
                          <span className="text-amber-800 bg-amber-100 font-semibold px-2 py-0.5 rounded text-[11px] border border-amber-200">
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setCurrentIndex(idx);
                            handleDispatchSpecific(idx);
                          }}
                          disabled={!item.isValidPhone || !canSendWhatsApp}
                          className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-900 font-bold disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                          title={!canSendWhatsApp ? "Permission required to dispatch WhatsApp" : "Open WhatsApp chat for this driver"}
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                          <span>Open</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={() => {
              if (onComplete) onComplete();
              onClose();
            }}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            {isFinished ? 'Close' : 'Cancel'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default DriverPayBulkWhatsAppModal;
