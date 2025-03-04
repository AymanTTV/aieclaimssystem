import React, { useState, useEffect } from 'react';
import { addDoc, collection, updateDoc, doc, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { VDFinanceRecord, VDFinancePart } from '../../types/vdFinance';
import { useAuth } from '../../context/AuthContext';
import FormField from '../ui/FormField';
import SearchableSelect from '../ui/SearchableSelect';
import ServiceCenterDropdown from '../maintenance/ServiceCenterDropdown';
import toast from 'react-hot-toast';
import { Vehicle, Claim } from '../../types';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';

interface VDFinanceFormProps {
  record?: VDFinanceRecord;
  vehicles: Vehicle[];
  onClose: () => void;
}

const VDFinanceForm: React.FC<VDFinanceFormProps> = ({ record, vehicles, onClose }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [parts, setParts] = useState<(VDFinancePart & { includeVAT: boolean })[]>(
    record?.parts.map(part => ({
      ...part,
      includeVAT: record.vatDetails?.partsVAT.find(v => v.partName === part.name)?.includeVAT || false
    })) || []
  );
  const [claims, setClaims] = useState<Claim[]>([]);
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [manualEntry, setManualEntry] = useState(false);
  const [includeVATOnLabor, setIncludeVATOnLabor] = useState(
    record?.vatDetails?.laborVAT || false
  );
  const { formatCurrency } = useFormattedDisplay();
  const [formData, setFormData] = useState({
    name: record?.name || '',
    reference: record?.reference || '',
    registration: record?.registration || '',
    totalAmount: record?.totalAmount || 0,
    vatRate: record?.vatRate || 0,
    description: record?.description || '',
    clientRepairPercentage: record?.clientRepairPercentage || 20,
    clientRepairAmount: record?.clientRepairAmount || 0,
    salvage: record?.salvage || 0,
    clientReferralFee: record?.clientReferralFee || 0,
    solicitorFee: record?.solicitorFee ?? (record?.netAmount ? record.netAmount * 0.1 : 0),
    laborHours: record?.laborHours || 0,
    laborRate: record?.laborRate || 75,
    serviceCenter: record?.serviceCenter || '',
    date: record?.date ? new Date(record.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    time: record?.date ? new Date(record.date).toLocaleTimeString('en-GB') : new Date().toLocaleTimeString('en-GB'),
  });

  const laborTotal = formData.laborHours * formData.laborRate * (includeVATOnLabor ? 1.2 : 1);

  const handleFormChange = (field: string, value: any) => {
    setFormData(prevData => {
      const updatedData = { ...prevData, [field]: value };

      if (field === 'clientRepairPercentage' && value !== '') {
        updatedData.clientRepairAmount = 0;
      } else if (field === 'clientRepairAmount' && value !== '') {
        updatedData.clientRepairPercentage = 0;
      }

      if (field === 'solicitorFee') {
        updatedData.solicitorFee = parseFloat(value) || 0;
      }

      return updatedData;
    });
  };

  useEffect(() => {
    const fetchClaims = async () => {
      try {
        const q = query(
          collection(db, 'claims'),
          where('progress', '!=', 'Claim Complete')
        );
        const snapshot = await getDocs(q);
        const claimsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Claim[];
        setClaims(claimsData);

        if (record?.claimId) {
          const claim = claimsData.find(c => c.id === record.claimId);
          if (claim) {
            setSelectedClaim(claim);
            setManualEntry(false);
          }
        }
      } catch (error) {
        console.error('Error fetching claims:', error);
        toast.error('Failed to fetch claims');
      }
    };

    fetchClaims();
  }, [record?.claimId]);

  const calculateCosts = () => {
    const round = (num: number) => Math.round(num * 100) / 100;
    const totalAmount = round(parseFloat(formData.totalAmount.toString()));
    const vatRate = round((formData.vatRate ? parseFloat(formData.vatRate.toString()) : 0) / 100);
    const netAmount = round(totalAmount / (1 + vatRate));
    const vatIn = round(totalAmount - netAmount);
    const solicitorFee = formData.solicitorFee !== undefined ? round(parseFloat(formData.solicitorFee.toString()) || 0) : round(netAmount * 0.1);

    const partsTotal = round(parts.reduce((sum, part) => {
        const partTotal = round(part.price * part.quantity);
        return round(sum + (part.includeVAT ? round(partTotal * 1.2) : partTotal));
    }, 0));

    const laborTotal = round(formData.laborHours * formData.laborRate * (includeVATOnLabor ? 1.2 : 1));

    const purchasedItems = round(partsTotal + laborTotal);

    const vatOut = round(parts.reduce((sum, part) => {
        return round(sum + (part.includeVAT ? round(part.price * part.quantity * 0.2) : 0));
    }, 0) + (includeVATOnLabor ? round(formData.laborHours * formData.laborRate * 0.2) : 0));

    let clientRepair = formData.clientRepairAmount > 0 ? formData.clientRepairAmount : round(netAmount * (formData.clientRepairPercentage / 100));

    const profit = round(netAmount - clientRepair - purchasedItems - solicitorFee - formData.salvage - formData.clientReferralFee);

    return {
        netAmount: Number(netAmount),
        vatIn: Number(vatIn),
        solicitorFee: Number(solicitorFee),
        purchasedItems: Number(purchasedItems),
        vatOut: Number(vatOut),
        clientRepair: Number(clientRepair),
        profit: Number(profit),
        salvage: Number(formData.salvage),
        clientReferralFee: Number(formData.clientReferralFee)
    };
};

  const handleServiceCenterSelect = (center: {
    name: string;
    address: string;
    postcode: string;
    hourlyRate: number;
  }) => {
    setFormData(prev => ({
      ...prev,
      serviceCenter: center.name,
      laborRate: center.hourlyRate
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      const calculatedValues = calculateCosts();
      const dateTimeString = `${formData.date}T${formData.time}`;
      const dateObject = new Date(dateTimeString);
  
      if (isNaN(dateObject.getTime())) {
        toast.error('Invalid date or time');
        setLoading(false);
        return;
      }
  
      const recordData = {
        ...formData,
        ...calculatedValues,
        parts: parts.map(({ includeVAT, ...part }) => part),
        vatDetails: {
          partsVAT: parts.map(part => ({ partName: part.name, includeVAT: part.includeVAT })),
          laborVAT: includeVATOnLabor
        },
        date: dateObject,
        updatedAt: new Date(),
        createdBy: user.id,
        ...(selectedClaim && { claimId: selectedClaim.id }) // Conditionally add claimId
      };
  
      if (record) {
        await updateDoc(doc(db, 'vdFinance', record.id), recordData);
        toast.success('Record updated successfully');
      } else {
        await addDoc(collection(db, 'vdFinance'), {
          ...recordData,
          createdAt: new Date(),
          createdBy: user.id
        });
        toast.success('Record created successfully');
      }
      onClose();
    } catch (error) {
      console.error('Error saving record:', error);
      toast.error('Failed to save record');
    } finally {
      setLoading(false);
    }
  };


  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Claim Details</h3>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={manualEntry}
              onChange={(e) => {
                setManualEntry(e.target.checked);
                if (e.target.checked) {
                  setSelectedClaim(null);
                }
              }}
              className="rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span className="text-sm text-gray-600">Manual Entry</span>
          </label>
        </div>

        {!manualEntry && (
          <SearchableSelect
            label="Select Claim"
            options={claims.map(claim => ({
              id: claim.id,
              label: claim.clientInfo.name,
              subLabel: `Ref: ${claim.clientRef || 'N/A'} | Reg: ${claim.clientVehicle.registration}`
            }))}
            value={selectedClaim?.id || ''}
            onChange={(claimId) => {
              const claim = claims.find(c => c.id === claimId);
              if (claim) {
                setSelectedClaim(claim);
                setFormData(prev => ({
                  ...prev,
                  name: claim.clientInfo.name,
                  reference: claim.clientRef || '',
                  registration: claim.clientVehicle.registration,
                  description: claim.incidentDetails.description
                }));
              }
            }}
            placeholder="Search claims..."
          />
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField
          label="Name"
          value={formData.name}
          onChange={(e) => handleFormChange('name', e.target.value)}
          required
          disabled={!manualEntry && !!selectedClaim}
        />

        <FormField
          label="Reference"
          value={formData.reference}
          onChange={(e) => handleFormChange('reference', e.target.value)}
          required
          disabled={!manualEntry && !!selectedClaim}
        />

        <FormField
          label="Vehicle Registration"
          value={formData.registration}
          onChange={(e) => handleFormChange('registration', e.target.value)}
          required
          disabled={!manualEntry && !!selectedClaim}
        />

        <FormField
          type="number"
          label="Total Amount"
          value={formData.totalAmount}
          onChange={(e) => handleFormChange('totalAmount', parseFloat(e.target.value))}
          required
          min="0"
          step="0.01"
        />

        <FormField
          type="number"
          label="VAT Rate (%)"
          value={formData.vatRate}
          onChange={(e) => handleFormChange('vatRate', parseFloat(e.target.value))}
          required
          min="0"
          max="100"
          step="0.1"
        />

        <div className="col-span-2">
  <label className="block text-sm font-medium text-gray-700">Description</label>
  <textarea
    value={formData.description}
    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
    rows={3}
    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
    placeholder="Enter description..."
  />
</div>

      </div>

      <div>
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-medium text-gray-900">Parts</h3>
          <button
            type="button"
            onClick={() => setParts([...parts, { id: Date.now().toString(), name: '', quantity: 1, price: 0, includeVAT: false }])}
            className="text-sm text-primary hover:text-primary-600"
          >
            Add Part
          </button>
        </div>
        {parts.map((part, index) => (
  <div key={index} className="grid grid-cols-4 gap-4 items-end mb-2">
    <FormField
      label="Part Name"
      value={part.name}
      onChange={(e) => {
        const newParts = [...parts];
        newParts[index].name = e.target.value;
        setParts(newParts);
      }}
    />
    <FormField
      type="number"
      label="Quantity"
      value={part.quantity}
      onChange={(e) => {
        const newParts = [...parts];
        newParts[index].quantity = parseInt(e.target.value) || 0;
        setParts(newParts);
      }}
      min="1"
    />
    <FormField
      type="number"
      label="Price"
      value={part.price}
      onChange={(e) => {
        const newParts = [...parts];
        newParts[index].price = parseFloat(e.target.value) || 0;
        setParts(newParts);
      }}
      min="0"
      step="0.01"
    />
    <div className="flex items-center space-x-4">
      <label className="flex items-center space-x-2">
        <input
          type="checkbox"
          checked={part.includeVAT}
          onChange={(e) => {
            const newParts = [...parts];
            newParts[index].includeVAT = e.target.checked;
            setParts(newParts);
          }}
          className="rounded border-gray-300 text-primary focus:ring-primary"
        />
        <span className="text-sm text-gray-600">Include VAT</span>
      </label>
      <button
        type="button"
        onClick={() => setParts(parts.filter((_, i) => i !== index))}
        className="text-red-600 hover:text-red-800"
      >
        Remove
      </button>
    </div>
  </div>
))}

      </div>

      <div>
  <label className="block text-sm font-medium text-gray-700">Labor</label>
  <div className="flex items-center space-x-2">
    <input
      type="number"
      value={formData.laborHours}
      onChange={(e) => setFormData(prev => ({ ...prev, laborHours: parseFloat(e.target.value) || 0 }))}
      placeholder="Hours"
      className="w-24 rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
      min="0"
      step="0.5"
    />
    <span className="py-2">×</span>
    <input
      type="number"
      value={formData.laborRate}
      onChange={(e) => setFormData(prev => ({ ...prev, laborRate: parseFloat(e.target.value) || 0 }))}
      placeholder="Rate/hour"
      className="w-24 rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
      min="0"
      step="0.01"
    />
    <label className="flex items-center space-x-2">
      <input
        type="checkbox"
        checked={includeVATOnLabor}
        onChange={(e) => setIncludeVATOnLabor(e.target.checked)}
        className="rounded border-gray-300 text-primary focus:ring-primary"
      />
      <span className="text-sm text-gray-600">+VAT</span>
    </label>
    <span className="py-2">= £{laborTotal.toFixed(2)}</span>
  </div>
</div>


      <div>
        <label className="block text-sm font-medium text-gray-700">Service Center</label>
        <ServiceCenterDropdown
          value={formData.serviceCenter}
          onChange={handleServiceCenterSelect}
          onInputChange={(value) => setFormData(prev => ({ ...prev, serviceCenter: value }))}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField
          type="date"
          label="Date"
          value={formData.date}
          onChange={(e) => handleFormChange('date', e.target.value)}
          required
        />
        <FormField
          type="time"
          label="Time"
          value={formData.time}
          onChange={(e) => handleFormChange('time', e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Client Repair Percentage
        </label>
        <div className="flex items-center space-x-2">
          <input
            type="number"
            value={formData.clientRepairPercentage}
            onChange={(e) => handleFormChange('clientRepairPercentage', e.target.value)}
            className="w-24 rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
            min="0"
            max="100"
            step="0.1"
          />
          <span className="text-sm text-gray-600">%</span>
        </div>
        <FormField
          label="Client Repair Amount (£)"
          value={formData.clientRepairAmount}
          onChange={(e) => handleFormChange('clientRepairAmount', e.target.value)}
          type="number"
        />
      </div>

      <FormField
        label="Salvage (£)"
        value={formData.salvage}
        onChange={(e) => handleFormChange('salvage', e.target.value)}
        type="number"
      />

      <FormField
        label="Client Referral Fee (£)"
        value={formData.clientReferralFee}
        onChange={(e) => handleFormChange('clientReferralFee', e.target.value)}
        type="number"
      />

      <div className="space-y-2">
        <label>Solicitor Fee :</label>
        <FormField
          label="Solicitor Fee (£)"
          value={formData.solicitorFee}
          onChange={(e) => handleFormChange('solicitorFee', e.target.value)}
          type="number"
        />
      </div>

      <div className="bg-gray-50 p-4 rounded-lg space-y-2">
        <div className="flex justify-between text-sm">
          <span>Net Amount:</span>
          <span className="font-medium">{formatCurrency(calculateCosts().netAmount || 0)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>VAT In:</span>
          <span className="font-medium">{formatCurrency(calculateCosts().vatIn || 0)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Solicitor Fee:</span>
          <span className="font-medium">{formatCurrency(calculateCosts().solicitorFee || 0)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Purchased Items:</span>
          <span className="font-medium">{formatCurrency(calculateCosts().purchasedItems || 0)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>VAT Out:</span>
          <span className="font-medium">{formatCurrency(calculateCosts().vatOut || 0)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Client Repair:</span>
          <span className="font-medium">{formatCurrency(calculateCosts().clientRepair || 0)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Salvage:</span>
          <span className="font-medium">{formatCurrency(calculateCosts().salvage || 0)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Client Referral Fee:</span>
          <span className="font-medium">{formatCurrency(calculateCosts().clientReferralFee || 0)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Profit:</span>
          <span className="font-medium">{formatCurrency(calculateCosts().profit || 0)}</span>
        </div>
      </div>

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md hover:bg-primary-600"
        >
          {loading ? 'Saving...' : record ? 'Update Record' : 'Create Record'}
        </button>
      </div>
    </form>
  );
};

export default VDFinanceForm;