import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface EditModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const EditModal: React.FC<EditModalProps> = ({
  isOpen,
  onClose,
  title,
  children
}) => {
  useEffect(() => {
    if (isOpen) {
      const orig = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = orig;
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto overflow-x-hidden flex min-h-screen items-center justify-center p-4 text-center">
      <div className="fixed inset-0 bg-black/75 backdrop-blur-xs transition-opacity cursor-pointer" onClick={onClose} />

      <div 
        className="relative z-10 bg-white border border-gray-200 rounded-2xl max-w-lg w-full text-gray-900 shadow-2xl flex flex-col max-h-[90vh] my-auto overflow-hidden text-left"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-gray-200 bg-gray-50 shrink-0">
          <h3 className="text-lg font-bold text-gray-900 tracking-wide">{title}</h3>
          <button
            type="button"
            className="text-gray-400 hover:text-gray-700 hover:bg-gray-100 p-1.5 rounded-xl transition cursor-pointer"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 bg-white text-gray-800">
          {children}
        </div>
      </div>
    </div>
  );
};

export default EditModal;