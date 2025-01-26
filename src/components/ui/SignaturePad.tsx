// src/components/ui/SignaturePad.tsx

import React, { useRef, useEffect } from 'react';
import SignatureCanvas from 'react-signature-canvas';

interface SignaturePadProps {
  value: string;
  onChange: (signature: string) => void;
  className?: string;
  disabled?: boolean;
}

// src/components/ui/SignaturePad.tsx

const SignaturePad: React.FC<SignaturePadProps> = ({
  value,
  onChange,
  className = '',
  disabled = false
}) => {
  const padRef = useRef<SignatureCanvas>(null);

  // Initialize points array
  useEffect(() => {
    if (padRef.current) {
      padRef.current._data = []; // Initialize empty points array
    }
  }, []);

  // Load existing signature if available
  useEffect(() => {
    if (value && padRef.current) {
      const img = new Image();
      img.onload = () => {
        const canvas = padRef.current;
        if (canvas) {
          canvas.clear();
          canvas._data = []; // Reset points array
          const ctx = canvas._canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
          }
        }
      };
      img.src = value;
    }
  }, [value]);

  // Rest of the component remains the same...


  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (padRef.current) {
        const canvas = padRef.current._canvas;
        const ratio = Math.max(window.devicePixelRatio || 1, 1);
        canvas.width = canvas.offsetWidth * ratio;
        canvas.height = canvas.offsetHeight * ratio;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.scale(ratio, ratio);
        }
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const clear = () => {
    if (padRef.current) {
      padRef.current.clear();
      padRef.current._data = []; // Add this line
      onChange('');
    }
  };

  const handleEnd = () => {
    if (padRef.current) {
      const trimmed = padRef.current.getTrimmedCanvas();
      const signature = trimmed.toDataURL('image/png');
      onChange(signature);
    }
  };

  return (
    <div className={`w-full ${className}`}>
      <div className={`border border-gray-300 rounded-md ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
        <SignatureCanvas
          ref={padRef}
          canvasProps={{
            className: 'signature-canvas',
            style: {
              width: '100%',
              height: '200px',
              backgroundColor: '#fff'
            }
          }}
          onEnd={handleEnd}
          dotSize={2}
          minWidth={2}
          maxWidth={4}
          throttle={16}
          velocityFilterWeight={0.7}
        />
      </div>
      <div className="mt-2 flex justify-end">
        <button
          type="button"
          onClick={clear}
          className="text-sm text-gray-600 hover:text-gray-900"
        >
          Clear
        </button>
      </div>
    </div>
  );
};

export default SignaturePad;
