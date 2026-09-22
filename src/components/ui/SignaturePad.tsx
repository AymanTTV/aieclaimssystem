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
    width: '100%',
    height: '100%',
    minHeight: '140px',
    position: 'relative',
    border: '1px solid #d1d5db',
    borderRadius: '0.5rem',
    overflow: 'hidden',
    backgroundColor: '#ffffff'
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
    <div className={`relative w-full ${className}`}>
      <div style={containerStyle}>
        <SignaturePad
          ref={padRef}
          canvasProps={{
            className: 'signature-canvas w-full h-full',
            style: signaturePadStyle
          }}
          onEnd={handleEnd}
          penColor="#0f172a"
        />
      </div>
      <button
        type="button"
        onClick={handleClear}
        className="absolute top-2 right-2 flex items-center gap-1 text-xs font-semibold px-2 py-1 bg-white border border-gray-300 rounded-md shadow-2xs text-gray-700 hover:text-red-600 hover:bg-gray-50 transition-colors z-10"
        title="Clear signature"
      >
        <X className="w-3.5 h-3.5" />
        <span>Clear</span>
      </button>
      {!value && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
          <span className="text-gray-400 font-medium text-xs sm:text-sm">Sign here using mouse, stylus, or touch</span>
        </div>
      )}
    </div>
  );
};

export default SignaturePadComponent;