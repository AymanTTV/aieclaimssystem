import React, { useMemo, useState } from 'react';
import { addDays, isAfter, isBefore, isValid } from 'date-fns';
import FormField from '../ui/FormField';
import { Rental } from '../../types';

interface Props {
  rental: Rental;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (start: Date, end: Date) => Promise<void>;
}

const fmtLocal = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function RentalAgreement90Modal({ rental, isOpen, onClose, onConfirm }: Props) {
  if (!isOpen) return null;

  // Default: snap to originalStartDate (fallback to startDate)
  const defaultStart = useMemo(() => {
    const base = (rental.originalStartDate as any)?.toDate?.() ?? new Date(rental.originalStartDate || rental.startDate);
    return isValid(base) ? base : new Date(rental.startDate);
  }, [rental]);

  const [startInput, setStartInput] = useState(fmtLocal(defaultStart));
  const startDate = new Date(startInput);
  const computedEnd = useMemo(() => addDays(startDate, 89), [startDate]);

  const hardMin = new Date(rental.startDate);
  const hardMax = new Date(rental.endDate);

  const withinRental =
    isValid(startDate) &&
    !isBefore(startDate, hardMin) &&
    !isAfter(computedEnd, hardMax);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="w-full max-w-lg rounded-lg bg-white p-4 shadow-xl">
        <h2 className="text-lg font-semibold mb-4">Generate 90-day Hire Agreement</h2>

        <div className="space-y-4">
          <FormField
            type="datetime-local"
            label="Window Start (local)"
            value={startInput}
            min={fmtLocal(hardMin)}
            max={fmtLocal(addDays(hardMax, -89))}
            onChange={(e) => setStartInput(e.target.value)}
          />
          <div className="text-sm">
            <div><span className="text-gray-500">Auto End:&nbsp;</span>{fmtLocal(computedEnd)}</div>
            <div className={`mt-1 ${withinRental ? 'text-green-600' : 'text-red-600'}`}>
              {withinRental
                ? '✓ 90-day window fits inside this rental period.'
                : 'The 90-day window must fully fit within the rental period.'}
            </div>
            <div className="text-gray-500 mt-1">
              Rental period: {fmtLocal(hardMin)} → {fmtLocal(hardMax)}
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            disabled={!withinRental}
            onClick={async () => { await onConfirm(startDate, computedEnd); }}
            className="px-3 py-2 rounded-md bg-primary text-white hover:bg-primary-600 disabled:opacity-50"
          >
            Generate
          </button>
        </div>
      </div>
    </div>
  );
}
