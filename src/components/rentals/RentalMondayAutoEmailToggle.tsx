import React, { useState, useEffect } from 'react';
import { Mail, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface RentalMondayAutoEmailToggleProps {
  rentalId: string;
  enabled?: boolean;
  onToggle?: (rentalId: string, newState: boolean) => Promise<void> | void;
  disabled?: boolean;
}

/**
 * Toggle component to enable or disable Monday automated emails for a specific rental.
 * Defaults to true.
 */
export const RentalMondayAutoEmailToggle: React.FC<RentalMondayAutoEmailToggleProps> = ({
  rentalId,
  enabled = true,
  onToggle,
  disabled = false,
}) => {
  const [isChecked, setIsChecked] = useState<boolean>(enabled);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  useEffect(() => {
    setIsChecked(enabled);
  }, [enabled]);

  const handleToggle = async () => {
    if (disabled || isUpdating) return;
    const nextState = !isChecked;
    setIsUpdating(true);

    try {
      if (onToggle) {
        await onToggle(rentalId, nextState);
      }
      setIsChecked(nextState);
      toast.success(
        nextState
          ? 'Monday automated email enabled for this rental'
          : 'Monday automated email disabled for this rental'
      );
    } catch (error) {
      console.error('Failed to update Monday auto-email setting:', error);
      toast.error('Failed to update auto-email preference');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="inline-flex items-center gap-3 py-1.5 px-3 rounded-lg bg-slate-50 border border-slate-200">
      <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
        <Mail className={`w-4 h-4 ${isChecked ? 'text-indigo-600' : 'text-slate-400'}`} />
        <span>Monday Auto-Email</span>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={isChecked}
        disabled={disabled || isUpdating}
        onClick={handleToggle}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
          isChecked ? 'bg-indigo-600' : 'bg-slate-300'
        } ${disabled || isUpdating ? 'opacity-60 cursor-not-allowed' : ''}`}
      >
        <span className="sr-only">Toggle Monday Auto-Email</span>
        <span
          aria-hidden="true"
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out flex items-center justify-center ${
            isChecked ? 'translate-x-5' : 'translate-x-0'
          }`}
        >
          {isUpdating ? (
            <Loader2 className="w-3 h-3 text-slate-400 animate-spin" />
          ) : null}
        </span>
      </button>

      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 min-w-[28px]">
        {isChecked ? 'On' : 'Off'}
      </span>
    </div>
  );
};

export default RentalMondayAutoEmailToggle;
