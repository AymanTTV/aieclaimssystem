// src/components/maintenance/MaintenanceBulkCommunicationModal.tsx

import React, { useState, useEffect, useMemo } from 'react';
import Modal from '../ui/Modal';
import { MaintenanceLog, Vehicle, Customer, Rental } from '../../types';
import { ServiceCenter } from '../../utils/serviceCenters';
import { useAuth } from '../../context/AuthContext';
import { useRentals } from '../../hooks/useRentals';
import {
  ResolvedMaintenanceContext,
  MaintenanceChannelMode,
  MaintenanceRecipientType,
  MaintenanceTemplateOption,
  resolveMaintenanceContext,
  fetchMaintenanceTemplates,
  replaceMaintenancePlaceholders,
  executeMaintenanceWhatsApp,
  executeMaintenanceEmail,
} from '../../utils/maintenanceCommunication';
import { formatWhatsAppNumber, buildWaMeLink } from '../../utils/whatsapp';
import {
  MessageCircle,
  Mail,
  Send,
  Users,
  Wrench,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Copy,
  Check,
  Loader2,
  Car,
  Calendar,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface MaintenanceBulkCommunicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedLogs: MaintenanceLog[];
  vehiclesMap: Record<string, Vehicle>;
  customersMap: Record<string, Customer>;
  serviceCenters: ServiceCenter[];
  rentals?: Rental[];
  initialMode?: MaintenanceChannelMode;
}

export const MaintenanceBulkCommunicationModal: React.FC<
  MaintenanceBulkCommunicationModalProps
> = ({
  isOpen,
  onClose,
  selectedLogs,
  vehiclesMap,
  customersMap,
  serviceCenters,
  rentals,
  initialMode = 'email',
}) => {
  const { user } = useAuth();
  const { rentals: hookRentals } = useRentals();

  const activeRentals = useMemo(() => {
    return rentals && rentals.length > 0 ? rentals : hookRentals;
  }, [rentals, hookRentals]);

  const [mode, setMode] = useState<MaintenanceChannelMode>(initialMode);
  const [recipientType, setRecipientType] = useState<MaintenanceRecipientType>('driver');
  const [templates, setTemplates] = useState<MaintenanceTemplateOption[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

  // Batch sending state for email
  const [isSendingBatch, setIsSendingBatch] = useState(false);
  const [sentCount, setSentCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);

  // Sent tracking for WhatsApp row buttons
  const [openedWhatsAppLogs, setOpenedWhatsAppLogs] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setSentCount(0);
      setFailedCount(0);
      setIsSendingBatch(false);
      setOpenedWhatsAppLogs({});
    }
  }, [isOpen, initialMode]);

  // Load templates
  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    setLoadingTemplates(true);

    fetchMaintenanceTemplates()
      .then((items) => {
        if (isMounted) setTemplates(items);
      })
      .catch((err) => {
        console.error('Failed to load templates:', err);
      })
      .finally(() => {
        if (isMounted) setLoadingTemplates(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Select appropriate template
  useEffect(() => {
    if (!isOpen || templates.length === 0) return;

    let best = templates.find(
      (t) => t.recipientType === recipientType && t.channel === mode
    );
    if (!best) {
      best = templates.find((t) => t.recipientType === recipientType);
    }
    if (!best && templates.length > 0) {
      best = templates[0];
    }
    if (best) {
      setSelectedTemplateId(best.id);
    }
  }, [isOpen, templates, recipientType, mode]);

  // Resolve context for all selected logs
  const resolvedItems = useMemo(() => {
    const tmpl = templates.find((t) => t.id === selectedTemplateId);

    return selectedLogs.map((log) => {
      const ctx = resolveMaintenanceContext(
        log,
        vehiclesMap,
        customersMap,
        serviceCenters,
        activeRentals
      );

      const recipientName = recipientType === 'driver' ? ctx.driverName : ctx.garageName;
      const recipientContact =
        mode === 'whatsapp'
          ? recipientType === 'driver'
            ? ctx.driverPhone
            : ctx.garagePhone
          : recipientType === 'driver'
          ? ctx.driverEmail
          : ctx.garageEmail;

      const subject = tmpl
        ? replaceMaintenancePlaceholders(tmpl.subjectTemplate, ctx, recipientType)
        : `Maintenance Notification - ${ctx.vehicleReg}`;

      const message = tmpl
        ? replaceMaintenancePlaceholders(tmpl.bodyTemplate, ctx, recipientType)
        : '';

      const hasValidContact =
        mode === 'whatsapp'
          ? Boolean(formatWhatsAppNumber(recipientContact))
          : Boolean(recipientContact && recipientContact.includes('@'));

      return {
        log,
        ctx,
        recipientName,
        recipientContact,
        subject,
        message,
        hasValidContact,
      };
    });
  }, [
    selectedLogs,
    vehiclesMap,
    customersMap,
    serviceCenters,
    activeRentals,
    selectedTemplateId,
    templates,
    recipientType,
    mode,
  ]);

  const validItems = useMemo(() => resolvedItems.filter((i) => i.hasValidContact), [resolvedItems]);
  const invalidItems = useMemo(() => resolvedItems.filter((i) => !i.hasValidContact), [resolvedItems]);

  // Handle batch email send
  const handleSendBatchEmails = async () => {
    if (validItems.length === 0) {
      toast.error('No recipients have valid email addresses in the selected records.');
      return;
    }

    setIsSendingBatch(true);
    setSentCount(0);
    setFailedCount(0);

    let sent = 0;
    let failed = 0;

    for (let i = 0; i < validItems.length; i++) {
      const item = validItems[i];
      try {
        await executeMaintenanceEmail({
          toEmail: item.recipientContact,
          toName: item.recipientName,
          subject: item.subject,
          message: item.message,
          recipientType,
          log: item.log,
          userName: user?.name || user?.email || 'Fleet Coordinator',
        });
        sent++;
        setSentCount(sent);
      } catch (err) {
        console.error(`Failed to send email to ${item.recipientContact}:`, err);
        failed++;
        setFailedCount(failed);
      }
    }

    setIsSendingBatch(false);
    if (failed === 0) {
      toast.success(`Successfully sent ${sent} batch maintenance emails!`);
      onClose();
    } else {
      toast.error(`Finished with issues: ${sent} sent, ${failed} failed.`);
    }
  };

  // Handle single WhatsApp launch inside bulk modal
  const handleOpenRowWhatsApp = async (item: typeof resolvedItems[0]) => {
    const digits = formatWhatsAppNumber(item.recipientContact);
    if (!digits) {
      toast.error(`Invalid phone number for ${item.recipientName}`);
      return;
    }

    try {
      await executeMaintenanceWhatsApp({
        phone: digits,
        message: item.message,
        recipientName: item.recipientName,
        recipientType,
        log: item.log,
        userName: user?.name || user?.email || 'Fleet Coordinator',
      });
      setOpenedWhatsAppLogs((prev) => ({ ...prev, [item.log.id]: true }));
      toast.success(`Opened WhatsApp chat for ${item.recipientName}`);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to open WhatsApp');
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center ${
              mode === 'whatsapp'
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-sky-100 text-sky-700'
            }`}
          >
            {mode === 'whatsapp' ? (
              <MessageCircle className="w-5 h-5" />
            ) : (
              <Mail className="w-5 h-5" />
            )}
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900 leading-snug">
              Batch Maintenance {mode === 'whatsapp' ? 'WhatsApp' : 'Email'} Dispatch
            </h3>
            <p className="text-xs text-gray-500 font-normal">
              Targeting {selectedLogs.length} selected maintenance jobs
            </p>
          </div>
        </div>
      }
      size="xl"
    >
      <div className="space-y-4 pt-1">
        {/* CONTROLS BAR: RECIPIENT & CHANNEL SWITCHERS */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-200">
          {/* Recipient Switcher */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-gray-600 mr-1 hidden sm:inline">
              Recipient:
            </span>
            <div className="inline-flex p-1 bg-gray-200/80 rounded-xl">
              <button
                type="button"
                onClick={() => setRecipientType('driver')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  recipientType === 'driver'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                Send to Drivers (Active Rentals) ({selectedLogs.length})
              </button>
              <button
                type="button"
                onClick={() => setRecipientType('garage')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  recipientType === 'garage'
                    ? 'bg-white text-amber-700 shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Wrench className="w-3.5 h-3.5" />
                Send to Garages ({selectedLogs.length})
              </button>
            </div>
          </div>

          {/* Channel Switcher */}
          <div className="flex items-center gap-1.5 justify-end">
            <span className="text-xs font-semibold text-gray-600 mr-1 hidden sm:inline">
              Channel:
            </span>
            <div className="inline-flex p-1 bg-gray-200/80 rounded-xl">
              <button
                type="button"
                onClick={() => setMode('whatsapp')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  mode === 'whatsapp'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <MessageCircle className="w-3.5 h-3.5" />
                WhatsApp
              </button>
              <button
                type="button"
                onClick={() => setMode('email')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  mode === 'email'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Mail className="w-3.5 h-3.5" />
                Email
              </button>
            </div>
          </div>
        </div>

        {/* TEMPLATE SELECTION */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-gray-700">
            Select Active Template for Batch:
          </label>
          <select
            value={selectedTemplateId}
            onChange={(e) => setSelectedTemplateId(e.target.value)}
            className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-xs text-gray-800 focus:ring-2 focus:ring-indigo-500 font-medium"
          >
            {templates
              .filter((t) => t.recipientType === recipientType)
              .map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.channel.toUpperCase()})
                </option>
              ))}
            {templates
              .filter((t) => t.recipientType !== recipientType)
              .map((t) => (
                <option key={t.id} value={t.id}>
                  [Other] {t.name}
                </option>
              ))}
          </select>
        </div>

        {/* RECIPIENTS BATCH TABLE */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-600">
            <span className="font-semibold">
              Batch Queue: {validItems.length} ready{' '}
              {invalidItems.length > 0 && (
                <span className="text-amber-600 font-normal">
                  ({invalidItems.length} missing contact info)
                </span>
              )}
            </span>
            <span className="text-gray-400">
              Each record will have placeholders dynamically tailored
            </span>
          </div>

          <div className="border border-gray-200 rounded-xl overflow-hidden max-h-64 overflow-y-auto bg-white">
            <table className="min-w-full divide-y divide-gray-200 text-xs">
              <thead className="bg-gray-50 text-gray-600 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Vehicle & Order</th>
                  <th className="px-3 py-2 text-left font-semibold">
                    {recipientType === 'driver' ? 'Driver' : 'Garage'}
                  </th>
                  <th className="px-3 py-2 text-left font-semibold">
                    {mode === 'whatsapp' ? 'Phone' : 'Email'}
                  </th>
                  <th className="px-3 py-2 text-right font-semibold">Action / Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {resolvedItems.map((item) => (
                  <tr key={item.log.id} className="hover:bg-gray-50/70">
                    <td className="px-3 py-2 font-mono font-medium text-gray-900">
                      <div className="flex items-center gap-1.5">
                        <Car className="w-3.5 h-3.5 text-gray-400" />
                        <span>{item.ctx.vehicleReg}</span>
                      </div>
                      <span className="text-[10px] text-gray-400 block font-sans">
                        #{item.ctx.orderNumber} • {item.ctx.serviceType}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-medium text-gray-800">
                      {item.recipientName}
                    </td>
                    <td className="px-3 py-2">
                      {item.hasValidContact ? (
                        <span className="text-gray-700 font-mono text-[11px]">
                          {item.recipientContact}
                        </span>
                      ) : (
                        <span className="text-amber-600 text-[11px] font-medium flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 shrink-0" />
                          Missing contact
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {mode === 'whatsapp' ? (
                        <button
                          type="button"
                          onClick={() => handleOpenRowWhatsApp(item)}
                          disabled={!item.hasValidContact}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                            openedWhatsAppLogs[item.log.id]
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                          } disabled:opacity-40 disabled:pointer-events-none`}
                        >
                          {openedWhatsAppLogs[item.log.id] ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-700" />
                              Opened
                            </>
                          ) : (
                            <>
                              <MessageCircle className="w-3 h-3" />
                              Open WhatsApp
                            </>
                          )}
                        </button>
                      ) : (
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${
                            item.hasValidContact
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {item.hasValidContact ? 'Queued' : 'Skipped'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* PROGRESS INDICATOR DURING BATCH SENDING */}
        {isSendingBatch && (
          <div className="p-3 bg-sky-50 rounded-xl border border-sky-200 space-y-1.5 animate-pulse">
            <div className="flex items-center justify-between text-xs text-sky-800 font-bold">
              <span className="flex items-center gap-1.5">
                <Loader2 className="w-4 h-4 animate-spin text-sky-600" />
                Sending batch emails...
              </span>
              <span>
                {sentCount} / {validItems.length} sent
              </span>
            </div>
            <div className="w-full bg-sky-200 h-2 rounded-full overflow-hidden">
              <div
                className="bg-sky-600 h-2 transition-all duration-300 rounded-full"
                style={{
                  width: `${(sentCount / Math.max(validItems.length, 1)) * 100}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* FOOTER ACTIONS */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-200">
          <span className="text-xs text-gray-500">
            {mode === 'email'
              ? `${validItems.length} emails ready to dispatch`
              : 'Launch individual WhatsApp chats with pre-filled messages'}
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSendingBatch}
              className="px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-xl transition cursor-pointer"
            >
              Close
            </button>

            {mode === 'email' && (
              <button
                type="button"
                onClick={handleSendBatchEmails}
                disabled={isSendingBatch || validItems.length === 0}
                className="px-5 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 active:bg-sky-800 disabled:opacity-50 rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                {isSendingBatch ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing Batch...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Send Batch Emails ({validItems.length})</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default MaintenanceBulkCommunicationModal;
