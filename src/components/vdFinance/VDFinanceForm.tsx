// src/components/finance/VDFinanceForm.tsx
import React, { useState, useEffect } from 'react';
import {
  addDoc,
  collection,
  updateDoc,
  doc,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { VDFinanceRecord, VDFinancePart } from '../../types/vdFinance';
import { useAuth } from '../../context/AuthContext';
import FormField from '../ui/FormField';
import SearchableSelect from '../ui/SearchableSelect';
import ServiceCenterDropdown from '../maintenance/ServiceCenterDropdown';
import toast from 'react-hot-toast';
import { Vehicle, Claim } from '../../types';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';
import productService from '../../services/product.service'; // <-- import productService for parts

interface VDFinanceFormProps {
  record?: VDFinanceRecord;
  vehicles: Vehicle[];
  onClose: () => void;
}

interface PartSuggestion {
  name: string;
  lastPrice: number;
}

const VDFinanceForm: React.FC<VDFinanceFormProps> = ({ record, vehicles, onClose }) => {
  const { user } = useAuth();
  const { formatCurrency } = useFormattedDisplay();
  const [loading, setLoading] = useState(false);

  // ─── PARTS STATE ────────────────────────────────────────────────────────────────
  // Each part now tracks includeVAT + discount (%)
  const [parts, setParts] = useState<(VDFinancePart & {
    includeVAT: boolean;
    discount: number;
  })[]>(
    record?.parts.map((part) => ({
      ...part,
      includeVAT:
        record.vatDetails?.partsVAT.find((v) => v.partName === part.name)?.includeVAT ||
        false,
      discount: 0,
    })) || []
  );

  // ─── CLAIMS & MANUAL ENTRY ───────────────────────────────────────────────────────
  const [claims, setClaims] = useState<Claim[]>([]);
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [manualEntry, setManualEntry] = useState(false);

  // ─── VAT ON LABOR ────────────────────────────────────────────────────────────────
  const [includeVATOnLabor, setIncludeVATOnLabor] = useState(
    record?.vatDetails?.laborVAT || false
  );

  // ─── PART‐SUGGESTIONS ────────────────────────────────────────────────────────────
  const [partSuggestions, setPartSuggestions] = useState<PartSuggestion[]>([]);
  const [showPartSuggestions, setShowPartSuggestions] = useState<boolean[]>([]);

  // ─── FORM DATA ───────────────────────────────────────────────────────────────────
  const [formData, setFormData] = useState({
    name: record?.name || '',
    reference: record?.ref || '',
    registration: record?.reg || '',
    totalAmount: record?.totalAmount || 0,
    vatRate: record?.vatPercentage || 0,
    description: record?.description || '',
    clientRepairPercentage: record?.clientRepairAmount ? 0 : 20,
    clientRepairAmount: record?.clientRepairAmount || 0,
    salvage: record?.salvage || 0,
    clientReferralFee: record?.clientReferralFee || 0,
    solicitorFee:
      record?.solicitorFee !== undefined
        ? record.solicitorFee
        : record?.netAmount
        ? record.netAmount * 0.1
        : 0,
    laborHours: record?.laborCharge
      ? record.laborCharge / (record.laborRate || 75)
      : 0,
    laborRate: record?.laborRate || 75,
    serviceCenter: record?.serviceCenter || '',
    date: record?.date
      ? new Date(record.date).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
    time: record?.date
      ? new Date(record.date).toLocaleTimeString('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
        })
      : new Date().toLocaleTimeString('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
        }),
  });

  // ─── HANDLER: Generic form‐field changes ─────────────────────────────────────────
  const handleFormChange = (field: string, value: any) => {
    setFormData((prev) => {
      const updated: any = { ...prev, [field]: value };

      // If user edits percentage, zero out the amount; and vice versa
      if (field === 'clientRepairPercentage' && value !== '') {
        updated.clientRepairAmount = 0;
      } else if (field === 'clientRepairAmount' && value !== '') {
        updated.clientRepairPercentage = 0;
      }

      return updated;
    });
  };

  // ─── FETCH OPEN CLAIMS ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchClaims = async () => {
      try {
        const q = query(collection(db, 'claims'), where('progress', '!=', 'Claim Complete'));
        const snapshot = await getDocs(q);
        const claimsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Claim[];
        setClaims(claimsData);

        if (record?.claimId) {
          const found = claimsData.find((c) => c.id === record.claimId);
          if (found) {
            setSelectedClaim(found);
            setManualEntry(false);
          }
        }
      } catch (err) {
        console.error('Error fetching claims:', err);
        toast.error('Failed to fetch claims');
      }
    };
    fetchClaims();
  }, [record?.claimId]);

  // ─── FETCH PRODUCT SUGGESTIONS ────────────────────────────────────────────────────
  useEffect(() => {
    const fetchProductSuggestions = async () => {
      try {
        const products = await productService.getAll();
        const suggestions: PartSuggestion[] = products.map((p) => ({
          name: p.name,
          lastPrice: p.price,
        }));
        setPartSuggestions(suggestions);
      } catch (err) {
        console.error('Error fetching product suggestions:', err);
      }
    };
    fetchProductSuggestions();
  }, []);

  // Initialize suggestion‐visibility array whenever `parts.length` changes
  useEffect(() => {
    setShowPartSuggestions(new Array(parts.length).fill(false));
  }, [parts.length]);

  // ─── COST CALCULATIONS ───────────────────────────────────────────────────────────
  const calculateCosts = () => {
    const round = (n: number) => Math.round(n * 100) / 100;
    // TotalAmount & VAT (in)
    const gross = round(parseFloat(formData.totalAmount.toString()));
    const vatFraction = round((formData.vatRate ? parseFloat(formData.vatRate.toString()) : 0) / 100);
    const netAmount = round(gross / (1 + vatFraction));
    const vatIn = round(gross - netAmount);

    // Solicitor Fee
    const solicitorFeeVal =
      formData.solicitorFee !== undefined
        ? round(parseFloat(formData.solicitorFee.toString()) || 0)
        : round(netAmount * 0.1);

    // 1) PARTS total with discount + VAT per‐line
    let totalDiscountAcc = 0;
    const partsTotal = round(
      parts.reduce((sum, p) => {
        const lineGross = round(p.price * p.quantity);
        const discAmt = round((p.discount / 100) * lineGross);
        totalDiscountAcc = round(totalDiscountAcc + discAmt);
        const afterDisc = round(lineGross - discAmt);
        const vatAmt = p.includeVAT ? round(afterDisc * 0.2) : 0;
        return round(sum + afterDisc + vatAmt);
      }, 0)
    );

    // 2) LABOR total with VAT if flagged
    const laborBase = round(formData.laborHours * formData.laborRate);
    const laborTotal = includeVATOnLabor ? round(laborBase * 1.2) : laborBase;

    // PurchasedItems (partsTotal + laborTotal)
    const purchasedItemsVal = round(partsTotal + laborTotal);

    // VAT OUT: sum of VAT on parts + VAT on labor
    const vatOutVal = round(
      parts.reduce((sum, p) => {
        const lineGross = round(p.price * p.quantity);
        const discAmt = round((p.discount / 100) * lineGross);
        const afterDisc = round(lineGross - discAmt);
        return p.includeVAT ? round(sum + afterDisc * 0.2) : sum;
      }, 0) +
        (includeVATOnLabor ? round(laborBase * 0.2) : 0)
    );

    // Client Repair amount (either fixed or % of netAmount)
    const clientRepairVal =
      formData.clientRepairAmount > 0
        ? formData.clientRepairAmount
        : round(netAmount * (formData.clientRepairPercentage / 100));

    // Profit
    const profitVal = round(
      netAmount -
        clientRepairVal -
        purchasedItemsVal -
        solicitorFeeVal -
        formData.salvage -
        formData.clientReferralFee
    );

    return {
      netAmount,
      vatIn,
      solicitorFee: solicitorFeeVal,
      purchasedItems: purchasedItemsVal,
      vatOut: vatOutVal,
      clientRepair: clientRepairVal,
      profit: profitVal,
      salvage: formData.salvage,
      clientReferralFee: formData.clientReferralFee,
      totalDiscount: totalDiscountAcc,
    };
  };

  const {
    netAmount,
    vatIn,
    solicitorFee,
    purchasedItems,
    vatOut,
    clientRepair,
    profit,
    salvage,
    clientReferralFee,
    totalDiscount,
  } = calculateCosts();

  // ─── HANDLERS FOR PART-NAME AUTOCOMPLETE ─────────────────────────────────────────
  const handlePartNameChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    index: number
  ) => {
    const newParts = [...parts];
    newParts[index] = { ...newParts[index], name: e.target.value };
    setParts(newParts);
    const showArr = [...showPartSuggestions];
    showArr[index] = true;
    setShowPartSuggestions(showArr);
  };

  const handlePartNameSelect = (suggestion: PartSuggestion, index: number) => {
    const newParts = [...parts];
    newParts[index] = {
      ...newParts[index],
      name: suggestion.name,
      price: suggestion.lastPrice,
    };
    setParts(newParts);
    const showArr = [...showPartSuggestions];
    showArr[index] = false;
    setShowPartSuggestions(showArr);
  };

  const handlePartInputFocus = (index: number) => {
    const showArr = [...showPartSuggestions];
    showArr[index] = true;
    setShowPartSuggestions(showArr);
  };

  const handlePartInputBlur = (index: number) => {
    setTimeout(() => {
      const showArr = [...showPartSuggestions];
      showArr[index] = false;
      setShowPartSuggestions(showArr);
    }, 100);
  };

  // ─── SUBMIT HANDLER ──────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      const calculated = calculateCosts();
      const dateTimeString = `${formData.date}T${formData.time}`;
      const dateObj = new Date(dateTimeString);
      if (isNaN(dateObj.getTime())) {
        toast.error('Invalid date/time');
        setLoading(false);
        return;
      }

      const recordData: any = {
        ...formData,
        ref: formData.reference,
        reg: formData.registration,
        vatPercentage: formData.vatRate,
        laborCharge: includeVATOnLabor
          ? formData.laborHours * formData.laborRate * 1.2
          : formData.laborHours * formData.laborRate,
        ...calculated,
        parts: parts.map(({ includeVAT, discount, ...p }) => p),
        vatDetails: {
          partsVAT: parts.map((p) => ({
            partName: p.name,
            includeVAT: p.includeVAT,
          })),
          laborVAT: includeVATOnLabor,
        },
        date: dateObj,
        updatedAt: new Date(),
        createdBy: user.id,
        ...(selectedClaim && { claimId: selectedClaim.id }),
      };

      if (record) {
        await updateDoc(doc(db, 'vdFinance', record.id), recordData);
        toast.success('Record updated successfully');
      } else {
        await addDoc(collection(db, 'vdFinance'), {
          ...recordData,
          createdAt: new Date(),
          createdBy: user.id,
        });
        toast.success('Record created successfully');
      }

      onClose();
    } catch (err) {
      console.error('Error saving record:', err);
      toast.error('Failed to save record');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* ─── CLAIM DETAILS / MANUAL ENTRY ───────────────────────────────────────────── */}
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
            options={claims.map((claim) => ({
              id: claim.id,
              label: claim.clientInfo.name,
              subLabel: `Ref: ${claim.clientRef || 'N/A'} | Reg: ${claim.clientVehicle.registration}`,
            }))}
            value={selectedClaim?.id || ''}
            onChange={(claimId) => {
              const found = claims.find((c) => c.id === claimId);
              if (found) {
                setSelectedClaim(found);
                setFormData((prev) => ({
                  ...prev,
                  name: found.clientInfo.name,
                  reference: found.clientRef || '',
                  registration: found.clientVehicle.registration,
                  description: found.incidentDetails.description,
                }));
              }
            }}
            placeholder="Search claims..."
          />
        )}
      </div>

      {/* ─── NAME, REFERENCE, REGISTRATION, TOTAL AMOUNT & VAT ────────────────────────── */}
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
          label="Total Amount (£)"
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
            onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
            rows={3}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
            placeholder="Enter description..."
          />
        </div>
      </div>

      {/* ─── PARTS SECTION (Name, Quantity, Unit Price, Discount %, +VAT) ─────────────── */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-medium text-gray-900">Parts</h3>
          <button
            type="button"
            onClick={() =>
              setParts([
                ...parts,
                { id: Date.now().toString(), name: '', quantity: 1, price: 0, includeVAT: false, discount: 0 },
              ])
            }
            className="text-sm text-primary hover:text-primary-600 px-3 py-1 border border-primary rounded-md"
          >
            Add Part
          </button>
        </div>

        <div className="space-y-3">
          {parts.map((part, index) => (
            <div
              key={index}
              className="grid grid-cols-1 sm:grid-cols-5 gap-4 items-end p-3 border border-gray-200 rounded-md bg-gray-50"
            >
              {/* Part Name + Suggestions */}
              <div className="relative col-span-1 sm:col-span-2">
                <FormField
                  label="Part Name"
                  value={part.name}
                  onChange={(e) => handlePartNameChange(e, index)}
                  onFocus={() => handlePartInputFocus(index)}
                  onBlur={() => handlePartInputBlur(index)}
                  placeholder="Start typing to see product suggestions"
                  inputClassName="w-full"
                />
                {showPartSuggestions[index] &&
                  part.name &&
                  partSuggestions
                    .filter((s) => s.name.toLowerCase().includes(part.name.toLowerCase()))
                    .length > 0 && (
                    <ul className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg mt-1 max-h-48 overflow-y-auto">
                      {partSuggestions
                        .filter((s) =>
                          s.name.toLowerCase().includes(part.name.toLowerCase())
                        )
                        .map((sugg, i) => (
                          <li
                            key={i}
                            className="px-4 py-2 cursor-pointer hover:bg-gray-100"
                            onMouseDown={() => handlePartNameSelect(sugg, index)}
                          >
                            {sugg.name}{' '}
                            <span className="text-gray-500 text-sm">
                              (Last price: {formatCurrency(sugg.lastPrice)})
                            </span>
                          </li>
                        ))}
                    </ul>
                  )}
              </div>

              {/* Quantity */}
              <FormField
                type="number"
                label="Quantity"
                value={part.quantity}
                onChange={(e) => {
                  const newParts = [...parts];
                  newParts[index] = { ...part, quantity: parseInt(e.target.value) || 0 };
                  setParts(newParts);
                }}
                min="1"
                inputClassName="w-full"
              />

              {/* Unit Price */}
              <FormField
                type="number"
                label="Unit Price (£)"
                value={part.price}
                onChange={(e) => {
                  const newParts = [...parts];
                  newParts[index] = { ...part, price: parseFloat(e.target.value) || 0 };
                  setParts(newParts);
                }}
                min="0"
                step="0.01"
                inputClassName="w-full"
              />

              {/* Discount (%) */}
              <FormField
                type="number"
                label="Discount (%)"
                value={part.discount}
                onChange={(e) => {
                  const newParts = [...parts];
                  newParts[index] = { ...part, discount: parseFloat(e.target.value) || 0 };
                  setParts(newParts);
                }}
                min="0"
                max="100"
                step="0.1"
                inputClassName="w-full"
              />

              {/* VAT Checkbox + Remove */}
              <div className="flex items-center space-x-4 col-span-1 sm:col-span-1">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={part.includeVAT}
                    onChange={(e) => {
                      const newParts = [...parts];
                      newParts[index] = { ...part, includeVAT: e.target.checked };
                      setParts(newParts);
                    }}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-gray-600">+VAT</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const newParts = parts.filter((_, i) => i !== index);
                    setParts(newParts);
                  }}
                  className="text-red-600 hover:text-red-800 p-1 rounded-full hover:bg-red-100"
                  title="Remove Part"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── LABOR SECTION ───────────────────────────────────────────────────────────── */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Labor</label>
        <div className="flex items-center space-x-2 mt-1">
          <input
            type="number"
            value={formData.laborHours}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, laborHours: parseFloat(e.target.value) || 0 }))
            }
            placeholder="Hours"
            className="w-28 rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
            min="0"
            step="0.5"
          />
          <span className="py-2">×</span>
          <input
            type="number"
            value={formData.laborRate}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, laborRate: parseFloat(e.target.value) || 0 }))
            }
            placeholder="Rate/hour"
            className="w-28 rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
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
          <span className="py-2 font-medium text-gray-800">
            ={' '}
            {formatCurrency(
              includeVATOnLabor
                ? formData.laborHours * formData.laborRate * 1.2
                : formData.laborHours * formData.laborRate
            )}
          </span>
        </div>
      </div>

      {/* ─── SERVICE CENTER ───────────────────────────────────────────────────────────── */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Service Center</label>
        <ServiceCenterDropdown
          value={formData.serviceCenter}
          onChange={(center) => {
            setFormData((prev) => ({
              ...prev,
              serviceCenter: center.name,
              laborRate: center.hourlyRate,
            }));
          }}
          onInputChange={(val) => setFormData((prev) => ({ ...prev, serviceCenter: val }))}
        />
      </div>

      {/* ─── DATE & TIME ──────────────────────────────────────────────────────────────── */}
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

      {/* ─── CLIENT REPAIR PERCENTAGE & AMOUNT ───────────────────────────────────────── */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Client Repair Percentage
        </label>
        <div className="flex items-center space-x-2">
          <input
            type="number"
            value={formData.clientRepairPercentage}
            onChange={(e) => handleFormChange('clientRepairPercentage', parseFloat(e.target.value))}
            className="w-24 rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
            min="0"
            max="100"
            step="0.1"
          />
          <span className="text-sm text-gray-600">%</span>
        </div>
        <FormField
          type="number"
          label="Client Repair Amount (£)"
          value={formData.clientRepairAmount}
          onChange={(e) => handleFormChange('clientRepairAmount', parseFloat(e.target.value))}
        />
      </div>

      {/* ─── SALVAGE & CLIENT REFERRAL FEE ────────────────────────────────────────────── */}
      <FormField
        type="number"
        label="Salvage (£)"
        value={formData.salvage}
        onChange={(e) => handleFormChange('salvage', parseFloat(e.target.value))}
      />

      <FormField
        type="number"
        label="Client Referral Fee (£)"
        value={formData.clientReferralFee}
        onChange={(e) => handleFormChange('clientReferralFee', parseFloat(e.target.value))}
      />

      {/* ─── SOLICITOR FEE ────────────────────────────────────────────────────────────── */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Solicitor Fee (£)</label>
        <FormField
          type="number"
          value={formData.solicitorFee}
          onChange={(e) => handleFormChange('solicitorFee', parseFloat(e.target.value))}
        />
      </div>

      {/* ─── COST SUMMARY ────────────────────────────────────────────────────────────── */}
      <div className="bg-gray-50 p-4 rounded-lg space-y-2">
        <div className="flex justify-between text-sm">
          <span>Net Amount:</span>
          <span className="font-medium">{formatCurrency(netAmount)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>VAT In:</span>
          <span>{formatCurrency(vatIn)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Solicitor Fee:</span>
          <span>{formatCurrency(solicitorFee)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Purchased Items:</span>
          <span>{formatCurrency(purchasedItems)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>VAT Out:</span>
          <span>{formatCurrency(vatOut)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Client Repair:</span>
          <span>{formatCurrency(clientRepair)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Salvage:</span>
          <span>{formatCurrency(salvage)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Client Referral Fee:</span>
          <span>{formatCurrency(clientReferralFee)}</span>
        </div>

        <div className="flex justify-between text-sm text-red-600">
          <span>Total Discount:</span>
          <span>- {formatCurrency(totalDiscount)}</span>
        </div>
        
        <div className="flex justify-between text-sm">
          <span>Profit:</span>
          <span>{formatCurrency(profit)}</span>
        </div>
        
      </div>

      {/* ─── FORM ACTIONS ───────────────────────────────────────────────────────────── */}
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
