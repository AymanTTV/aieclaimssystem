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

  // Load existing signature
  useEffect(() => {
    if (value && padRef.current) {
      const img = new Image();
      img.onload = () => {
        const canvas = padRef.current;
        if (canvas) {
          canvas.clear();
          const ctx = canvas._canvas.getContext('2d');
          if (ctx) {
            // Clear any existing content
            ctx.clearRect(0, 0, canvas._canvas.width, canvas._canvas.height);
            
            // Calculate dimensions to fit signature in canvas
            const padding = 20; // Add padding around signature
            const maxWidth = canvas._canvas.width - (padding * 2);
            const maxHeight = canvas._canvas.height - (padding * 2);
            
            // Calculate scale to fit while maintaining aspect ratio
            const scale = Math.min(
              maxWidth / img.width,
              maxHeight / img.height
            );
            
            // Calculate centered position
            const x = (canvas._canvas.width - (img.width * scale)) / 2;
            const y = (canvas._canvas.height - (img.height * scale)) / 2;
            
            // Draw the image centered and scaled
            ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
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

  const handleEnd = () => {
    try {
      if (padRef.current && !padRef.current.isEmpty()) {
        // Get the trimmed canvas with just the signature
        const trimmedCanvas = padRef.current.getTrimmedCanvas();
        
        // Create a new canvas with padding
        const finalCanvas = document.createElement('canvas');
        const padding = 20; // Padding around signature
        
        // Set dimensions with padding
        finalCanvas.width = trimmedCanvas.width + (padding * 2);
        finalCanvas.height = trimmedCanvas.height + (padding * 2);
        
        const ctx = finalCanvas.getContext('2d');
        if (ctx) {
          // Clear canvas and set white background
          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
          
          // Draw signature centered with padding
          ctx.drawImage(trimmedCanvas, padding, padding);
          
          // Convert to data URL and save
          const signature = finalCanvas.toDataURL('image/png');
          onChange(signature);
        }
      }
    } catch (error) {
      console.error('Error handling signature:', error);
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
          dotSize={1}
          minWidth={1}
          maxWidth={2}
          throttle={16}
          velocityFilterWeight={0.7}
          clearOnResize={false}
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