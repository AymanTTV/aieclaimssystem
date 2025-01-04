import React from 'react';
import SignaturePad from '../ui/SignaturePad';

interface CustomerSignatureProps {
  value: string;
  onChange: (signature: string) => void;
  disabled?: boolean;
  error?: string;
}

const CustomerSignature: React.FC<CustomerSignatureProps> = ({
  value,
  onChange,
  disabled = false,
  error
}) => {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        Customer Signature
      </label>
      
      <SignaturePad
        value={value}
        onChange={onChange}
        className={`${disabled ? 'opacity-50 pointer-events-none' : ''} ${error ? 'border-red-300' : ''}`}
      />
      
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
      
      <p className="text-sm text-gray-500">
        Please sign above to verify your details
      </p>
    </div>
  );
};

export default CustomerSignature;