import React from 'react';
import { X } from 'lucide-react';
import AccidentClaimForm from './AccidentClaimForm';

interface AccidentClaimModalProps {
  accidentId: string;
  onClose: () => void;
}

const AccidentClaimModal: React.FC<AccidentClaimModalProps> = ({ accidentId, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={onClose} />

        <div className="relative w-full max-w-4xl bg-gray-50">
          <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Submit Claim Details</h2>
            <button
              type="button"
              className="text-gray-400 hover:text-gray-500"
              onClick={onClose}
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="px-6 py-4 max-h-[85vh] overflow-y-auto">
            <AccidentClaimForm accidentId={accidentId} onClose={onClose} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccidentClaimModal;