import React from 'react';
import SignaturePad from '../../ui/SignaturePad';

interface SignatureCaptureProps {
  onCapture: (signature: string) => void;
  disabled?: boolean;
}

const SignatureCapture: React.FC<SignatureCaptureProps> = ({
  onCapture,
  disabled = false
}) => {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        Customer Signature
      </label>
      
      <SignaturePad
        value=""
        onChange={onCapture}
        className={disabled ? 'opacity-50 pointer-events-none' : ''}
      />
      
      <p className="text-sm text-gray-500">
        Please sign above to agree to the rental terms and conditions
      </p>
    </div>
  );
};

export default SignatureCapture;