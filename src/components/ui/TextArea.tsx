import React, { forwardRef } from 'react';

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  helperText?: string;
  compulsoryNotice?: string;
}

const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ label, error, helperText, compulsoryNotice, className = '', ...props }, ref) => {
    const isRequired = props.required;

    return (
      <div className="space-y-1.5 min-w-0">
        <label className="block text-sm font-bold text-gray-900 leading-snug truncate max-w-full">
          {label}
          {isRequired && (
            <span className="text-red-500 ml-1 font-bold select-none" aria-hidden="true">*</span>
          )}
        </label>
        <div className="relative rounded-lg overflow-hidden">
          {isRequired && !error && (
            <span
              className="absolute left-0 inset-y-0 w-1 bg-red-500 pointer-events-none rounded-l-lg z-10"
              aria-hidden="true"
            />
          )}
          <textarea
            ref={ref}
            aria-required={isRequired ? 'true' : undefined}
            rows={props.rows || 4}
            className={`form-textarea block w-full rounded-lg bg-white text-gray-950 font-medium placeholder:text-gray-400 border transition-all text-sm ${
              isRequired && !error ? 'pl-4 pr-3' : 'p-3'
            } shadow-2xs ${
              error
                ? 'border-red-500 focus:border-red-600 focus:ring-2 focus:ring-red-200'
                : 'border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20'
            } ${className}`.trim()}
            {...props}
          />
        </div>
        {helperText && <p className="text-xs text-gray-500 font-medium">{helperText}</p>}
        {error && (
          <p className="text-xs font-semibold text-red-600 flex items-center gap-1">
            <span>⚠️</span> {error}
          </p>
        )}
      </div>
    );
  }
);

TextArea.displayName = 'TextArea';

export default TextArea;