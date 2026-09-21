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
          'flex flex-col max-h-[90vh] rounded-2xl border border-gray-200',
          'bg-white text-gray-900 shadow-2xl modal-content overflow-hidden',
          sizes[size],
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - anchored and pinned at top */}
        <div className="modal-header flex items-center justify-between px-6 py-4.5 border-b border-gray-200 bg-gray-50 shrink-0 rounded-t-2xl">
          <div>
            <h3 id="modal-title" className="text-lg font-bold text-gray-900 tracking-wide">
              {title}
            </h3>
            {subtitle && (
              <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            className="text-gray-400 hover:text-gray-700 hover:bg-gray-100 p-2 rounded-xl transition-colors cursor-pointer ml-4"
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
            'overflow-y-auto flex-1 bg-white text-gray-800 focus:outline-none custom-scrollbar',
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