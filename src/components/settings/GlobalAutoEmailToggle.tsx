import React, { useState } from 'react';
import { MailCheck, MailX, AlertTriangle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface GlobalAutoEmailToggleProps {
  initialValue?: boolean;
  onSave?: (newValue: boolean) => Promise<void> | void;
  disabled?: boolean;
}

/**
 * System Settings Toggle for master automated email dispatch.
 * Controls global_auto_email_enabled (default: true).
 */
export const GlobalAutoEmailToggle: React.FC<GlobalAutoEmailToggleProps> = ({
  initialValue = true,
  onSave,
  disabled = false,
}) => {
  const [isEnabled, setIsEnabled] = useState<boolean>(initialValue);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [showWarningModal, setShowWarningModal] = useState<boolean>(false);

  const applyToggle = async (targetValue: boolean) => {
    setIsUpdating(true);
    try {
      if (onSave) {
        await onSave(targetValue);
      }
      setIsEnabled(targetValue);
      toast.success(
        targetValue
          ? 'Global automated emails are now enabled'
          : 'Global automated emails are now paused system-wide'
      );
    } catch (error) {
      console.error('Failed to update global auto-email setting:', error);
      toast.error('Failed to save global setting');
    } finally {
      setIsUpdating(false);
      setShowWarningModal(false);
    }
  };

  const handleToggleClick = () => {
    if (disabled || isUpdating) return;

    // If currently enabled and user wants to turn it off, prompt confirmation
    if (isEnabled) {
      setShowWarningModal(true);
    } else {
      applyToggle(true);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            {isEnabled ? (
              <MailCheck className="w-5 h-5 text-emerald-600" />
            ) : (
              <MailX className="w-5 h-5 text-amber-500" />
            )}
            <h3 className="text-base font-semibold text-slate-900">
              Global Automated Emails
            </h3>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                isEnabled
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}
            >
              {isEnabled ? 'Active' : 'Disabled'}
            </span>
          </div>
          <p className="text-sm text-slate-500 max-w-xl">
            Master switch controlling all automated scheduled email dispatches across the system,
            including weekly rental reminders and Monday statements.
          </p>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-center">
          <button
            type="button"
            role="switch"
            aria-checked={isEnabled}
            disabled={disabled || isUpdating}
            onClick={handleToggleClick}
            className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
              isEnabled ? 'bg-emerald-600' : 'bg-slate-300'
            } ${disabled || isUpdating ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            <span className="sr-only">Toggle Global Automated Emails</span>
            <span
              aria-hidden="true"
              className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out flex items-center justify-center ${
                isEnabled ? 'translate-x-7' : 'translate-x-0'
              }`}
            >
              {isUpdating ? (
                <Loader2 className="w-3.5 h-3.5 text-slate-500 animate-spin" />
              ) : null}
            </span>
          </button>
        </div>
      </div>

      {/* Confirmation Modal when disabling global emails */}
      {showWarningModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center gap-3 text-amber-600 mb-3">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h4 className="text-lg font-bold text-slate-900">Disable Global Automated Emails?</h4>
            </div>
            <p className="text-sm text-slate-600 mb-5 leading-relaxed">
              Disabling this master switch will pause <strong>all</strong> scheduled automated email dispatches
              for all customers and rentals across the entire platform.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                disabled={isUpdating}
                onClick={() => setShowWarningModal(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isUpdating}
                onClick={() => applyToggle(false)}
                className="px-4 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors flex items-center gap-2"
              >
                {isUpdating && <Loader2 className="w-4 h-4 animate-spin" />}
                Confirm Pause
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GlobalAutoEmailToggle;
