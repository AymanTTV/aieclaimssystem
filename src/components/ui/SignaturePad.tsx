import React, { useRef, useEffect } from 'react';
import SignaturePad from 'react-signature-canvas';
import { X } from 'lucide-react';

interface SignaturePadProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  width?: number;
  height?: number;
}

const SignaturePadComponent: React.FC<SignaturePadProps> = ({
  value,
  onChange,
  className = '',
  width = 400,
  height = 200
}) => {
  const padRef = useRef<SignaturePad>(null);

  useEffect(() => {
    if (padRef.current && value) {
      if (padRef.current.isEmpty()) { // Conditional load.
        padRef.current.fromDataURL(value);
      }
    }
  }, [value]);

  const handleClear = () => {
    if (padRef.current) {
      padRef.current.clear();
      onChange('');
    }
  };

  const handleEnd = () => {
    if (padRef.current) {
      const trimmedDataURL = padRef.current.getTrimmedCanvas().toDataURL('image/png');
      onChange(trimmedDataURL);
    }
  };

  const containerStyle: React.CSSProperties = {
    width: `${width}px`,
    height: `${height}px`,
    position: 'relative',
    border: '1px solid #e5e7eb',
    borderRadius: '0.375rem',
    overflow: 'hidden'
  };

  const signaturePadStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: '#fff'
  };

  return (
    <div className={`relative ${className}`}>
      <div style={containerStyle}>
        <SignaturePad
          ref={padRef}
          canvasProps={{
            className: 'signature-canvas',
            style: signaturePadStyle
          }}
          onEnd={handleEnd}
          penColor="black"
        />
      </div>
      <button
        type="button"
        onClick={handleClear}
        className="absolute top-2 right-2 p-1 bg-white rounded-full shadow hover:bg-gray-100"
      >
        <X className="w-4 h-4 text-gray-500" />
      </button>
      {!value && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-gray-400">Sign here</span>
        </div>
      )}
    </div>
  );
};

export default SignaturePadComponent;