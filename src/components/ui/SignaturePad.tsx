import React, { useRef, useEffect } from 'react';
import SignaturePad from 'react-signature-canvas';
import { X } from 'lucide-react';

interface SignaturePadProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  width?: number;
  height?: number;
  theme?: 'default' | 'navy';
}

const SignaturePadComponent: React.FC<SignaturePadProps> = ({
  value,
  onChange,
  className = '',
  width = 400,
  height = 200,
  theme = 'default'
}) => {
  const padRef = useRef<SignaturePad>(null);
  const isNavy = theme === 'navy';

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
    border: isNavy ? '1px solid #2B314E' : '1px solid #d1d5db',
    borderRadius: '0.75rem',
    overflow: 'hidden',
    backgroundColor: '#ffffff'
  };

  const signaturePadStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: '#ffffff'
  };

  return (
    <div className={`relative w-full ${className}`}>
      <div style={containerStyle} className={isNavy ? 'shadow-inner' : ''}>
        <SignaturePad
          ref={padRef}
          canvasProps={{
            className: 'signature-canvas w-full h-full cursor-crosshair',
            style: signaturePadStyle
          }}
          onEnd={handleEnd}
          penColor="#0f172a"
        />
      </div>
      <button
        type="button"
        onClick={handleClear}
        className={
          isNavy
            ? 'absolute top-2.5 right-2.5 flex items-center gap-1 text-xs font-semibold px-2.5 py-1 bg-[#1E2238] border border-[#2B314E] rounded-md shadow-xs text-slate-200 hover:text-rose-400 hover:bg-[#2B314E] transition-colors z-10 cursor-pointer'
            : 'absolute top-2 right-2 flex items-center gap-1 text-xs font-semibold px-2 py-1 bg-white border border-gray-300 rounded-md shadow-2xs text-gray-700 hover:text-red-600 hover:bg-gray-50 transition-colors z-10 cursor-pointer'
        }
        title="Clear signature"
      >
        <X className="w-3.5 h-3.5" />
        <span>Clear</span>
      </button>
      {!value && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
          <span className="text-slate-400 font-medium text-xs sm:text-sm">Sign here using mouse, stylus, or touch</span>
        </div>
      )}
    </div>
  );
};

export default SignaturePadComponent;