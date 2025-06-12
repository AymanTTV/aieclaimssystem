// Modal.tsx
import React, { Fragment } from 'react';
import { X } from 'lucide-react';
import clsx from 'clsx';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
}: ModalProps) {
  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4 text-center sm:p-0">
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          // Remove or comment out this line to prevent closing on outside click
          // onClick={onClose}
        />

        <div
          className={clsx(
            'relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 w-full modal-content',
            sizes[size]
          )}
        >
          <div className="modal-header flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">{title}</h3>
            <button
              type="button"
              className="text-gray-400 hover:text-gray-500 transition-colors"
              onClick={onClose}
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          <div className="p-6 bg-white">{children}</div>
        </div>
      </div>
    </div>
  );
}