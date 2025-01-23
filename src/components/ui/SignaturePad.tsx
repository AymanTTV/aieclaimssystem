// src/components/ui/SignaturePad.tsx

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
  const containerRef = useRef<HTMLDivElement>(null);

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

  // Resize canvas when container size changes
  useEffect(() => {
    const resizeCanvas = () => {
      if (containerRef.current && padRef.current) {
        const canvas = padRef.current._canvas;
        const container = containerRef.current;
        const ratio = Math.max(window.devicePixelRatio || 1, 1);
        
        canvas.width = container.offsetWidth * ratio;
        canvas.height = 200 * ratio;
        canvas.style.width = `${container.offsetWidth}px`;
        canvas.style.height = '200px';
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.scale(ratio, ratio);
        }
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  const clear = () => {
    if (padRef.current) {
      padRef.current.clear();
      onChange('');
    }
  };

  return (
    <div className={`w-full ${className}`} ref={containerRef}>
      <div className="border border-gray-300 rounded-md">
        <SignatureCanvas
          ref={padRef}
          canvasProps={{
            className: `signature-canvas ${disabled ? 'opacity-50 pointer-events-none' : ''}`,
            style: {
              width: '100%',
              height: '200px',
              backgroundColor: '#fff'
            }
          }}
          onEnd={() => {
            if (padRef.current) {
              const signature = padRef.current.toDataURL();
              onChange(signature);
            }
          }}
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
