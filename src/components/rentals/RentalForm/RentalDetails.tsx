import React from 'react';
import FormField from '../../ui/FormField';
import { addWeeks } from 'date-fns';

interface RentalDetailsProps {
  formData: {
    type: string;
    reason: string;
    startDate: string;
    startTime: string;
    endDate: string;
    endTime: string;
    numberOfWeeks: number;
  };
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  disabled?: boolean;
  errors?: Record<string, string>;
}

const RentalDetails: React.FC<RentalDetailsProps> = ({
  formData,
  onChange,
  disabled = false,
  errors = {}
}) => {
  // Calculate end date for weekly rentals
  const handleWeeklyRental = (e: React.ChangeEvent<HTMLInputElement>) => {
    const weeks = parseInt(e.target.value) || 1;
    const startDate = new Date(`${formData.startDate}T${formData.startTime}`);
    const endDate = addWeeks(startDate, weeks);
    
    onChange({
      ...e,
      target: { name: 'numberOfWeeks', value: weeks.toString() }
    } as React.ChangeEvent<HTMLInputElement>);
    
    onChange({
      ...e,
      target: { name: 'endDate', value: endDate.toISOString().split('T')[0] }
    } as React.ChangeEvent<HTMLInputElement>);

    onChange({
      ...e,
      target: { name: 'endTime', value: formData.startTime }
    } as React.ChangeEvent<HTMLInputElement>);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Rental Type</label>
          <select
            name="type"
            value={formData.type}
            onChange={onChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
            disabled={disabled}
            required
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="claim">Claim</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Reason</label>
          <select
            name="reason"
            value={formData.reason}
            onChange={onChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
            disabled={disabled}
            required
          >
            <option value="hired">Hired</option>
            <option value="claim">Claim</option>
            <option value="o/d">O/D</option>
            <option value="staff">Staff</option>
            <option value="workshop">Workshop</option>
            <option value="c-substitute">C Substitute</option>
            <option value="h-substitute">H Substitute</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField
          type="date"
          label="Start Date"
          name="startDate"
          value={formData.startDate}
          onChange={onChange}
          disabled={disabled}
          required
          error={errors.startDate}
        />

        <FormField
          type="time"
          label="Start Time"
          name="startTime"
          value={formData.startTime}
          onChange={onChange}
          disabled={disabled}
          required
          error={errors.startTime}
        />

        {formData.type === 'weekly' ? (
          <FormField
            type="number"
            label="Number of Weeks"
            name="numberOfWeeks"
            value={formData.numberOfWeeks}
            onChange={handleWeeklyRental}
            min="1"
            required
            error={errors.numberOfWeeks}
          />
        ) : (
          <>
            <FormField
              type="date"
              label="End Date"
              name="endDate"
              value={formData.endDate}
              onChange={onChange}
              disabled={disabled}
              required
              min={formData.startDate}
              error={errors.endDate}
            />

            <FormField
              type="time"
              label="End Time"
              name="endTime"
              value={formData.endTime}
              onChange={onChange}
              disabled={disabled}
              required
              error={errors.endTime}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default RentalDetails;