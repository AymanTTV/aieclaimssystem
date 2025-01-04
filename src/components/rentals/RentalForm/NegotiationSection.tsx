import React from 'react';
import FormField from '../../ui/FormField';
import TextArea from '../../ui/TextArea';
import { useAuth } from '../../../context/AuthContext';

interface NegotiationSectionProps {
  standardRate: number;
  customRate: string;
  onCustomRateChange: (value: string) => void;
  negotiationNotes: string;
  onNotesChange: (value: string) => void;
}

const NegotiationSection: React.FC<NegotiationSectionProps> = ({
  standardRate,
  customRate,
  onCustomRateChange,
  negotiationNotes,
  onNotesChange
}) => {
  const { user } = useAuth();
  const canNegotiate = user?.role === 'admin' || user?.role === 'manager';

  if (!canNegotiate) return null;

  return (
    <div className="space-y-4 border-t pt-4">
      <h3 className="text-lg font-medium text-gray-900">Rate Negotiation</h3>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Standard Rate</label>
          <p className="mt-1 text-lg font-medium">£{standardRate.toFixed(2)}</p>
        </div>

        <FormField
          type="number"
          label="Negotiated Rate (Optional)"
          value={customRate}
          onChange={(e) => onCustomRateChange(e.target.value)}
          min="0"
          step="0.01"
          placeholder="Enter custom rate"
        />
      </div>

      {customRate && (
        <>
          <TextArea
            label="Negotiation Notes"
            value={negotiationNotes}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder="Enter reason for rate negotiation..."
            required
          />

          <div className="p-2 bg-yellow-50 border border-yellow-200 rounded">
            <p className="text-sm text-yellow-800">
              Custom rate will be approved by {user.name} ({user.role})
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export default NegotiationSection;