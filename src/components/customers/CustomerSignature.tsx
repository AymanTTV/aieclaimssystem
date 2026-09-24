import React from 'react';
import SignaturePad from '../ui/SignaturePad';

interface CustomerSignatureProps {
  value: string;
  onChange: (signature: string) => void;
  termsAccepted?: boolean;
  onTermsAcceptedChange?: (accepted: boolean) => void;
  requireTerms?: boolean;
  disabled?: boolean;
  error?: string;
}

const CustomerSignature: React.FC<CustomerSignatureProps> = ({
  value,
  onChange,
  termsAccepted = false,
  onTermsAcceptedChange,
  requireTerms = true,
  disabled = false,
  error
}) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-semibold text-gray-800">
          Customer / Member Electronic Signature
        </label>
        {value && (
          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            Signature Captured
          </span>
        )}
      </div>
      
      <div className="bg-white border rounded-lg overflow-hidden shadow-2xs">
        <SignaturePad
          value={value}
          onChange={onChange}
          className={`${disabled ? 'opacity-50 pointer-events-none' : ''} ${error ? 'border-red-300' : ''}`}
        />
      </div>
      
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      {/* Mandatory Terms & Conditions Tick Box */}
      {requireTerms && (
        <div className="pt-1.5">
          <label className="flex items-start space-x-2.5 cursor-pointer select-none group">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => onTermsAcceptedChange?.(e.target.checked)}
              disabled={disabled}
              className="mt-0.5 h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded cursor-pointer disabled:cursor-not-allowed"
            />
            <span className="text-xs text-gray-700 leading-snug font-medium group-hover:text-gray-900">
              I agree to the <strong className="text-gray-900 underline">Terms &amp; Conditions</strong> and confirm this electronic signature is legally binding.
            </span>
          </label>
          {Boolean(value && !termsAccepted) && (
            <p className="text-xs text-amber-600 font-medium mt-1">
              ⚠️ Terms &amp; Conditions tick box must be checked before submitting.
            </p>
          )}
        </div>
      )}
      
      <p className="text-xs text-gray-500">
        Please sign above to verify member details. Signature timestamp and legal metadata will be recorded automatically.
      </p>
    </div>
  );
};

export default CustomerSignature;