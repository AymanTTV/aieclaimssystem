// src/components/ui/SignaturePad.tsx
import React, { useRef, useEffect } from 'react';
import SignatureCanvas from 'react-signature-canvas';

export interface SignaturePadProps {
  value: string;
  onChange: (signature: string) => void;
  className?: string;
}

const SignaturePad: React.FC<SignaturePadProps> = ({ value, onChange, className }) => {
  const padRef = useRef<SignatureCanvas>(null);

  const clear = () => {
    padRef.current?.clear();
    onChange('');
  };

  const save = () => {
    const signature = padRef.current?.toDataURL();
    if (signature) {
      onChange(signature);
    }
  };

  return (
    <div className={className}>
      <SignatureCanvas
        ref={padRef}
        canvasProps={{
          className: 'signature-canvas w-full h-48 border border-gray-300 rounded-md',
        }}
        onEnd={save}
      />
      <div className="mt-2 flex justify-end space-x-2">
        <button
          type="button"
          onClick={clear}
          className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900"
        >
          Clear
        </button>
      </div>
    </div>
  );
};

export default SignaturePad;
