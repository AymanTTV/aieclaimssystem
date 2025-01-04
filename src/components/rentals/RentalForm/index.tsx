// Update the form data state to include negotiation fields
const [formData, setFormData] = useState({
  // ... existing fields ...
  customRate: '',
  negotiationNotes: '',
});

// Update the cost calculation
const startDateTime = new Date(`${formData.startDate}T${formData.startTime}`);
const endDateTime = formData.endDate ? 
  new Date(`${formData.endDate}T${formData.endTime}`) : 
  startDateTime;

const standardCost = calculateRentalCost(
  startDateTime,
  endDateTime,
  formData.type,
  formData.reason,
  formData.numberOfWeeks
);

const totalCost = formData.customRate ? 
  parseFloat(formData.customRate) : 
  standardCost;

// Add the negotiation section to the form JSX
<div className="space-y-6">
  {/* ... existing form fields ... */}

  <NegotiationSection
    standardRate={standardCost}
    customRate={formData.customRate}
    onCustomRateChange={(value) => setFormData({ ...formData, customRate: value })}
    negotiationNotes={formData.negotiationNotes}
    onNotesChange={(value) => setFormData({ ...formData, negotiationNotes: value })}
  />

  {/* Payment Summary */}
  <div className="bg-gray-50 p-4 rounded-lg space-y-2">
    <div className="flex justify-between text-sm">
      <span>Standard Rate:</span>
      <span className="font-medium">£{standardCost.toFixed(2)}</span>
    </div>
    {formData.customRate && (
      <div className="flex justify-between text-sm text-primary">
        <span>Negotiated Rate:</span>
        <span className="font-medium">£{formData.customRate}</span>
      </div>
    )}
    {/* ... rest of the payment summary ... */}
  </div>
</div>