// src/components/workshop/SupervisorPinModal.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ShieldCheck,
  Lock,
  X,
  AlertTriangle,
  KeyRound,
  Delete,
  CheckCircle2,
} from 'lucide-react';
import {
  SupervisorPinConfig,
  verifySupervisorPin,
  DEFAULT_SUPERVISOR_PIN,
} from '../../utils/supervisorPinService';

export interface SupervisorPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  actionTitle?: string;
  actionDescription?: string;
  pinConfig: SupervisorPinConfig;
}

export const SupervisorPinModal: React.FC<SupervisorPinModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  actionTitle = 'Perform Protected TV Action',
  actionDescription = 'Supervisor authentication is required to modify this TV broadcast kiosk.',
  pinConfig,
}) => {
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isShaking, setIsShaking] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setPin('');
      setError('');
      setIsShaking(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  const handleSubmit = useCallback(
    (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      if (!pin) {
        setError('Please enter the 4-digit supervisor PIN.');
        return;
      }

      const isValid = verifySupervisorPin(pin, pinConfig);
      if (isValid) {
        setError('');
        onSuccess();
      } else {
        setError('Incorrect Supervisor PIN. Please try again.');
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 500);
        setPin('');
        inputRef.current?.focus();
      }
    },
    [pin, pinConfig, onSuccess]
  );

  // Keypad click handlers
  const handleDigitClick = (digit: string) => {
    if (pin.length < 8) {
      const nextPin = pin + digit;
      setPin(nextPin);
      setError('');
      // Auto-submit if PIN reaches 4 digits and matches
      if (nextPin.length === 4 && verifySupervisorPin(nextPin, pinConfig)) {
        setTimeout(() => {
          onSuccess();
        }, 150);
      }
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setError('');
  };

  const handleClear = () => {
    setPin('');
    setError('');
  };

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleDigitClick(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Enter') {
        handleSubmit();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, pin, handleSubmit, onClose]);

  if (!isOpen) return null;

  const isDefaultPin = (pinConfig.pin || DEFAULT_SUPERVISOR_PIN) === DEFAULT_SUPERVISOR_PIN;

  return (
    <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn select-none">
      <div
        className={`w-full max-w-md bg-[#121524] border border-[#2B314E] rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col space-y-5 transition-transform duration-150 ${
          isShaking ? 'animate-shake' : ''
        }`}
      >
        {/* Header with Security Badge */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-amber-500 to-rose-600 rounded-2xl shadow-lg border border-amber-400/40 text-white flex items-center justify-center">
              <Lock className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-white tracking-wide">
                  Kiosk Security Lock
                </h3>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-950/80 text-amber-400 border border-amber-500/40">
                  PIN REQUIRED
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {actionTitle}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
            title="Cancel and remain in TV Mode"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Explanation Notice */}
        <div className="bg-[#16192B] border border-[#2B314E] rounded-2xl p-3.5 text-xs text-slate-300 flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-white">Workshop Floor Protection:</span>{' '}
            {actionDescription}
          </div>
        </div>

        {/* PIN Mask Dots Indicator */}
        <div className="flex flex-col items-center justify-center space-y-3 py-1">
          <div className="flex items-center gap-3">
            {[0, 1, 2, 3].map((idx) => {
              const isFilled = pin.length > idx;
              return (
                <div
                  key={idx}
                  className={`w-4 h-4 rounded-full transition-all duration-200 border ${
                    isFilled
                      ? 'bg-amber-400 border-amber-300 scale-110 shadow-[0_0_12px_rgba(251,191,36,0.8)]'
                      : 'bg-slate-900 border-[#2B314E]'
                  }`}
                />
              );
            })}
          </div>

          {/* Hidden Screen Reader / Direct Keyboard Input */}
          <input
            ref={inputRef}
            type="password"
            maxLength={8}
            value={pin}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '');
              setPin(val);
              setError('');
            }}
            className="sr-only"
            autoComplete="off"
            aria-label="Supervisor PIN"
          />

          {/* Error Message Alert */}
          {error && (
            <div className="flex items-center gap-1.5 text-xs font-bold text-rose-400 bg-rose-950/60 border border-rose-500/40 px-3 py-1.5 rounded-xl animate-fadeIn">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Default PIN Hint if unchanged */}
          {isDefaultPin && !error && (
            <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
              <KeyRound className="w-3 h-3 text-amber-400/80" />
              <span>Default Supervisor PIN: <strong className="text-amber-300 font-mono">1234</strong></span>
            </div>
          )}
        </div>

        {/* Tactile On-Screen Numeric Keypad (for touch displays & mouse TV users) */}
        <div className="grid grid-cols-3 gap-2.5 max-w-[280px] mx-auto w-full">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleDigitClick(digit)}
              className="h-13 rounded-2xl bg-[#1A1E35] hover:bg-[#252B4D] active:scale-95 border border-[#2B314E] text-white text-lg font-black font-mono shadow-md transition-all cursor-pointer flex items-center justify-center hover:border-blue-500/50"
            >
              {digit}
            </button>
          ))}

          {/* Clear Button */}
          <button
            type="button"
            onClick={handleClear}
            className="h-13 rounded-2xl bg-slate-900 hover:bg-slate-800 active:scale-95 border border-slate-700/60 text-slate-400 hover:text-white text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center"
          >
            Clear
          </button>

          {/* Zero Button */}
          <button
            type="button"
            onClick={() => handleDigitClick('0')}
            className="h-13 rounded-2xl bg-[#1A1E35] hover:bg-[#252B4D] active:scale-95 border border-[#2B314E] text-white text-lg font-black font-mono shadow-md transition-all cursor-pointer flex items-center justify-center hover:border-blue-500/50"
          >
            0
          </button>

          {/* Backspace Button */}
          <button
            type="button"
            onClick={handleBackspace}
            className="h-13 rounded-2xl bg-slate-900 hover:bg-slate-800 active:scale-95 border border-slate-700/60 text-slate-400 hover:text-rose-300 transition-all cursor-pointer flex items-center justify-center"
            title="Backspace"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3 pt-2 border-t border-[#2B314E]/60">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-xs font-bold transition cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={pin.length === 0}
            className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-black tracking-wide shadow-lg shadow-blue-900/40 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Unlock</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SupervisorPinModal;
