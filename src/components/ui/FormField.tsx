import React, { forwardRef } from 'react';

interface FormFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  inputClassName?: string;
  helperText?: string;
  compulsoryNotice?: string;
}

const FormField = forwardRef<HTMLInputElement, FormFieldProps>(
  ({ label, error, helperText, compulsoryNotice, className = '', inputClassName = '', ...props }, ref) => {
    const isRequired = props.required;

    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <label className="block text-sm font-bold text-gray-900 leading-snug">
            {label}
          </label>
          {isRequired && (
            <span
              className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-red-100 text-red-800 border border-red-300 shadow-2xs shrink-0"
              title="Compulsory field - Must fill in"
            >
              <span className="text-red-600 font-black text-xs leading-none">*</span>
              {compulsoryNotice || 'Must fill in'}
            </span>
          )}
        </div>
        <input
          ref={ref}
          className={`form-input block w-full rounded-lg bg-white text-gray-950 font-medium placeholder:text-gray-400 border transition-all text-sm px-3.5 py-2.5 shadow-2xs ${
            error
              ? 'border-red-500 focus:border-red-600 focus:ring-2 focus:ring-red-200'
              : isRequired
              ? 'border-gray-300 border-l-4 border-l-red-500 focus:border-primary focus:ring-2 focus:ring-primary/20'
              : 'border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20'
          } ${className} ${inputClassName}`.trim()}
          {...props}
        />
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

FormField.displayName = 'FormField';

export default FormField;