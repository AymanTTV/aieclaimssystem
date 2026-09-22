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
  theme?: 'default' | 'navy';
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
  theme = 'default',
}: ModalProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const isNavy = theme === 'navy';

  // Prevent background scrolling while modal is open & reset modal scroll to top
  useEffect(() => {
    if (isOpen) {
      const originalBodyOverflow = document.body.style.overflow;
      const originalHtmlOverflow = document.documentElement.style.overflow;
      document.body.style.setProperty('overflow', 'hidden', 'important');
      document.documentElement.style.setProperty('overflow', 'hidden', 'important');
      document.body.classList.add('modal-open');
      if (contentRef.current) {
        contentRef.current.scrollTop = 0;
      }
      return () => {
        document.body.style.overflow = originalBodyOverflow;
        document.documentElement.style.overflow = originalHtmlOverflow;
        document.body.classList.remove('modal-open');
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
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity cursor-pointer"
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
          'flex flex-col max-h-[90vh] rounded-2xl border border-slate-200',
          'bg-white text-slate-900 shadow-2xl modal-content overflow-hidden',
          sizes[size],
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - anchored and pinned at top */}
        <div
          className={clsx(
            'modal-header flex items-center justify-between px-6 py-4.5 border-b border-slate-200 shrink-0 rounded-t-2xl bg-slate-50'
          )}
        >
          <div>
            <h3
              id="modal-title"
              className="text-lg font-bold tracking-wide text-slate-900"
            >
              {title}
            </h3>
            {subtitle && (
              <p className="text-xs mt-0.5 text-slate-500 font-medium">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 transition-colors cursor-pointer ml-4"
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
            'flex-1 focus:outline-none min-h-0 bg-white text-slate-800',
            contentClassName?.includes('overflow-') ? '' : 'overflow-y-auto custom-scrollbar',
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