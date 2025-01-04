import React, { useRef, useEffect } from 'react';
import SignatureCanvas from 'react-signature-canvas';

interface SignaturePadProps {
  value: string;
  onChange: (signature: string) => void;
  className?: string;
  disabled?: boolean;
}

const SignaturePad: React.FC<SignaturePadProps> = ({
  value,
  onChange,
  className = '',
  disabled = false
}) => {
  const padRef = useRef<SignatureCanvas>(null);

  // Load existing signature if available
  useEffect(() => {
    if (value && padRef.current) {
      const img = new Image();
      img.onload = () => {
        const canvas = padRef.current;
        if (canvas) {
          canvas.clear();
          const ctx = canvas._canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
          }
        }
      };
      img.src = value;
    }
  }, [value]);

  const clear = () => {
    if (padRef.current) {
      padRef.current.clear();
      onChange('');
    }
  };

  // Get current signature data
  const getSignature = () => {
    if (padRef.current) {
      return padRef.current.toDataURL();
    }
    return '';
  };

  return (
    <div className={className}>
      <SignatureCanvas
        ref={padRef}
        canvasProps={{
          className: `signature-canvas w-full h-48 border border-gray-300 rounded-md ${
            disabled ? 'opacity-50 pointer-events-none' : ''
          }`,
        }}
        onEnd={() => {
          const signature = getSignature();
          onChange(signature);
        }}
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