// Modal.tsx
import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import clsx from 'clsx';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  contentClassName?: string;
  subtitle?: string;
  className?: string;
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  contentClassName,
  subtitle,
  className,
}: ModalProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  // Prevent background scrolling while modal is open & reset modal scroll to top
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      if (contentRef.current) {
        contentRef.current.scrollTop = 0;
      }
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    '2xl': 'max-w-6xl',
    '3xl': 'max-w-7xl',
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto overflow-x-hidden flex min-h-screen items-center justify-center p-3 sm:p-5 md:p-6 text-center">
      {/* Dark overlay backdrop with blur */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-xs transition-opacity cursor-pointer"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog - Perfectly centered in viewport across all table rows and page headers */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={clsx(
          'relative z-10 w-full my-auto text-left transition-all',
          'flex flex-col max-h-[90vh] rounded-2xl border border-white/15',
          'bg-[#15172b] text-white shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85)] modal-content overflow-hidden',
          sizes[size],
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - anchored and pinned at top */}
        <div className="modal-header flex items-center justify-between px-6 py-4.5 border-b border-white/10 bg-[#121327] shrink-0 rounded-t-2xl">
          <div>
            <h3 id="modal-title" className="text-lg font-bold text-white tracking-wide">
              {title}
            </h3>
            {subtitle && (
              <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            className="text-slate-400 hover:text-white hover:bg-white/10 p-2 rounded-xl transition-colors cursor-pointer ml-4"
            onClick={onClose}
            title="Close modal"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Content Body - User can scroll down smoothly */}
        <div
          ref={contentRef}
          className={clsx(
            'overflow-y-auto flex-1 bg-[#15172b] text-slate-200 focus:outline-none custom-scrollbar',
            contentClassName?.includes('p-') ? '' : 'p-6',
            contentClassName
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

export default Modal;