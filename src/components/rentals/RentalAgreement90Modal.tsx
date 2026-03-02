import React, { useMemo, useState, useEffect } from 'react';
import { addDays, differenceInDays, format, isBefore, isValid, parseISO, startOfDay } from 'date-fns';
import FormField from '../ui/FormField';
import { Rental } from '../../types';
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface Props {
  rental: Rental;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (start: Date, end: Date, includeImages: boolean) => Promise<void>;
}

// Helper to format Date to YYYY-MM-DD for input[type="date"]
const fmtDate = (d: Date) => {
  if (!isValid(d)) return '';
  return format(d, 'yyyy-MM-dd');
};

export default function RentalAgreement90Modal({ rental, isOpen, onClose, onConfirm }: Props) {
  if (!isOpen) return null;

  // Rental Boundaries (Hard limit: Start date cannot be before original rental start)
  const hardMin = useMemo(() => startOfDay(new Date(rental.startDate)), [rental.startDate]);
  
  // NOTE: hardMax removed to allow future dates for ongoing rentals.

  // State
  const [startDateStr, setStartDateStr] = useState('');
  const [endDateStr, setEndDateStr] = useState('');
  const [includeImages, setIncludeImages] = useState(true);

  // Initialize dates when modal opens
  useEffect(() => {
    if (isOpen) {
      // Default Start: Rental Start
      // Default End: Rental Start + 89 days (Total 90 days inclusive)
      // We no longer clamp this to rental.endDate, allowing extension into the future.
      const initialStart = new Date(rental.startDate);
      const calculatedEnd = addDays(initialStart, 89);
      
      setStartDateStr(fmtDate(initialStart));
      setEndDateStr(fmtDate(calculatedEnd));
    }
  }, [isOpen, rental]);

  // Derived Values
  const selectedStart = parseISO(startDateStr);
  const selectedEnd = parseISO(endDateStr);

  const isValidDates = isValid(selectedStart) && isValid(selectedEnd);

  // Calculate Duration (Inclusive: Start to End counts as 1 day if they are the same)
  const durationInDays = isValidDates ? differenceInDays(selectedEnd, selectedStart) + 1 : 0;

  // Validations
  const isOver90Days = durationInDays > 90;
  const isNegativeDuration = durationInDays <= 0;
  
  // Check if inside bounds (Only checking min date now)
  const isWithinRentalBounds = 
    isValidDates &&
    !isBefore(selectedStart, hardMin);

  const canSubmit = isValidDates && !isOver90Days && !isNegativeDuration && isWithinRentalBounds;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-2xl">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Generate 90-day Hire Agreement</h2>
        
        <p className="text-sm text-gray-600 mb-6">
          Define the specific period for this agreement. The system will apply the original rental times to these dates automatically.
        </p>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField
              type="date"
              label="Start Date"
              value={startDateStr}
              min={fmtDate(hardMin)}
              // Max removed to allow future dates
              onChange={(e) => setStartDateStr(e.target.value)}
            />
            
            <FormField
              type="date"
              label="End Date"
              value={endDateStr}
              min={startDateStr} 
              // Max removed to allow future dates
              onChange={(e) => setEndDateStr(e.target.value)}
            />
          </div>

          {/* Validation Feedback */}
          <div className="bg-gray-50 rounded-md p-3 border border-gray-200 text-sm space-y-2">
            
            {/* 1. Duration Check */}
            <div className="flex items-center justify-between">
              <span className="text-gray-700">Duration:</span>
              <span className={`font-bold ${isOver90Days ? 'text-red-600' : 'text-green-600'}`}>
                {durationInDays} days
              </span>
            </div>
            
            {isOver90Days && (
              <div className="flex items-start gap-2 text-red-600 text-xs bg-red-50 p-2 rounded">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>Agreement cannot exceed 90 days. Please adjust the end date.</span>
              </div>
            )}

            {isNegativeDuration && (
              <div className="flex items-center gap-2 text-red-600 text-xs">
                <XCircle className="w-4 h-4" />
                <span>End date must be after Start date.</span>
              </div>
            )}

            {/* 2. Boundary Check */}
            {!isWithinRentalBounds && isValidDates && (
               <div className="flex items-start gap-2 text-orange-700 text-xs bg-orange-50 p-2 rounded border border-orange-100">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>
                  Start date cannot be before the original rental start date ({fmtDate(hardMin)}).
                </span>
              </div>
            )}

            {canSubmit && (
              <div className="flex items-center gap-2 text-green-700 text-xs">
                <CheckCircle className="w-4 h-4" />
                <span>Valid 90-day window selected.</span>
              </div>
            )}
          </div>

          {/* Include Images Checkbox */}
          <div className="flex items-center gap-2 pt-2 border-t mt-2">
            <input
              type="checkbox"
              id="includeImages90"
              checked={includeImages}
              onChange={(e) => setIncludeImages(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <label htmlFor="includeImages90" className="text-sm text-gray-700 cursor-pointer select-none font-medium">
              Include vehicle images in agreement
            </label>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 font-medium text-sm"
          >
            Cancel
          </button>
          <button
            disabled={!canSubmit}
            onClick={async () => { 
                // We pass the raw Date objects. 
                // The parent component (Rentals.tsx) handles merging the original Time components.
                await onConfirm(selectedStart, selectedEnd, includeImages); 
            }}
            className="px-4 py-2 rounded-md bg-primary text-white hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
          >
            Generate Agreement
          </button>
        </div>
      </div>
    </div>
  );
}