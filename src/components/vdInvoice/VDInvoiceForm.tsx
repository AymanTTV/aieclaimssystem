// src/components/invoice/VDInvoiceForm.tsx
import React, { useState, useEffect } from 'react';
import { VDInvoice, VDInvoicePart } from '../../types/vdInvoice';
import FormField from '../ui/FormField';
import SearchableSelect from '../ui/SearchableSelect';
import ServiceCenterDropdown from '../maintenance/ServiceCenterDropdown';
import { Customer, Vehicle } from '../../types';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import productService from '../../services/product.service'; // For fetching products
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';

interface VDInvoiceFormProps {
  invoice?: VDInvoice;
  customers: Customer[];
  vehicles: Vehicle[];
  onSubmit: (data: Partial<VDInvoice>) => Promise<void>;
  onClose: () => void;
}

interface PartSuggestion {
  name: string;
  lastPrice: number;
}

const VDInvoiceForm: React.FC<VDInvoiceFormProps> = ({
  invoice,
  customers,
  vehicles,
  onSubmit,
  onClose
}) => {
  const [loading, setLoading] = useState(false);
  const [manualCustomer, setManualCustomer] = useState(!invoice?.customerId);
  const [manualVehicle, setManualVehicle] = useState(!invoice?.vehicleId);
  const [includeVATOnLabor, setIncludeVATOnLabor] = useState(invoice?.laborVAT || false);
  const [includeVATOnPaintMaterials, setIncludeVATOnPaintMaterials] = useState(invoice?.paintMaterialsVAT || false);
  const [manualLaborRate, setManualLaborRate] = useState(false);
  const { formatCurrency } = useFormattedDisplay();

  const [formData, setFormData] = useState({
    date: invoice?.date ? format(invoice.date, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
    invoiceNumber: invoice?.invoiceNumber || `INV-${Date.now().toString().slice(-8).toUpperCase()}`,
    // Customer fields
    customerName: invoice?.customerName || '',
    customerAddress: invoice?.customerAddress || '',
    customerPostcode: invoice?.customerPostcode || '',
    customerEmail: invoice?.customerEmail || '',
    customerPhone: invoice?.customerPhone || '',
    customerId: invoice?.customerId || '',
    // Vehicle fields
    registration: invoice?.registration || '',
    make: invoice?.make || '',
    model: invoice?.model || '',
    color: invoice?.color || '',
    vehicleId: invoice?.vehicleId || '',
    // Service center & labor
    serviceCenter: invoice?.serviceCenter || '',
    laborHours: invoice?.laborHours || 0,
    laborRate: invoice?.laborRate || 75,
    // Parts array, now with discount
    parts: invoice?.parts?.length
      ? invoice.parts.map(part => ({
          ...part,
          includeVAT: invoice.vatDetails?.partsVAT.find(v => v.partName === part.name)?.includeVAT || false,
          discount: (part as any).discount ?? 0
        }))
      : [{ name: '', quantity: 1, price: 0, includeVAT: false, discount: 0 }] as (VDInvoicePart & { includeVAT: boolean; discount: number })[],
    // Paint/materials
    paintMaterials: invoice?.paintMaterials || 0,
    // Payment
    paymentMethod: invoice?.paymentMethod || 'CASH' as const,
    paidAmount: invoice?.paidAmount || 0,
    remainingAmount: invoice?.remainingAmount || 0,
    paymentStatus: invoice?.paymentStatus || 'pending' as const,
  });

  // Part suggestions fetched from productService
  const [partSuggestions, setPartSuggestions] = useState<PartSuggestion[]>([]);
  const [showPartSuggestions, setShowPartSuggestions] = useState<boolean[]>([]);

  useEffect(() => {
    const fetchProductSuggestions = async () => {
      try {
        const products = await productService.getAll();
        const suggestions: PartSuggestion[] = products.map(p => ({
          name: p.name,
          lastPrice: p.price
        }));
        setPartSuggestions(suggestions);
      } catch (error) {
        console.error('Error fetching product suggestions:', error);
      }
    };
    fetchProductSuggestions();
  }, []);

  // Re‐initialize “show suggestions” whenever parts count changes
  useEffect(() => {
    setShowPartSuggestions(new Array(formData.parts.length).fill(false));
  }, [formData.parts.length]);

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
    setManualLaborRate(false);
  };

  const handleCustomerSelect = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    if (customer) {
      setFormData(prev => ({
        ...prev,
        customerId,
        customerName: customer.name,
        customerPhone: customer.mobile,
        customerEmail: customer.email,
        customerAddress: customer.address,
        customerPostcode: customer.postcode,
      }));
    }
  };

  const handleVehicleSelect = (vehicleId: string) => {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (vehicle) {
      setFormData(prev => ({
        ...prev,
        vehicleId,
        registration: vehicle.registrationNumber,
        make: vehicle.make,
        model: vehicle.model,
        color: vehicle.color || '',
      }));
    }
  };

  /**
   * calculateTotals():
   *   1. For each part, apply discount first:
   *         lineTotal = price * quantity
   *         discountAmt = (discount% of lineTotal)
   *         netAfterDiscount = lineTotal – discountAmt
   *         vatOnThat = 20% × netAfterDiscount if includeVAT
   *   2. Sum up all netAfterDiscount to get netParts.
   *   3. Sum up all partVAT to get partsVAT.
   *   4. netLabor = laborHours × laborRate
   *      laborVAT = 20% × netLabor if flagged.
   *   5. netPaint = paintMaterials
   *      paintVAT = 20% × netPaint if flagged.
   *   6. subtotal = netParts + netLabor + netPaint
   *   7. vatAmount = partsVAT + laborVAT + paintVAT
   *   8. total = subtotal + vatAmount
   */
  const calculateTotals = () => {
    let netParts = 0;
    let partsVAT = 0;

    formData.parts.forEach(part => {
      const lineTotal = part.price * part.quantity;
      const discountAmt = (part.discount / 100) * lineTotal;
      const afterDiscount = lineTotal - discountAmt;
      netParts += afterDiscount;
      if (part.includeVAT) {
        partsVAT += afterDiscount * 0.2;
      }
    });

    const netLabor = formData.laborHours * formData.laborRate;
    const laborVAT = includeVATOnLabor ? netLabor * 0.2 : 0;

    const netPaint = formData.paintMaterials;
    const paintVAT = includeVATOnPaintMaterials ? netPaint * 0.2 : 0;

    const subtotal = netParts + netLabor + netPaint;
    const vatAmount = partsVAT + laborVAT + paintVAT;
    const total = subtotal + vatAmount;

    return {
      partsTotal: netParts,
      laborCost: netLabor,
      vatAmount,
      subtotal,
      total
    };
  };

  // Recompute totals on every render
  const { partsTotal, laborCost, vatAmount, subtotal, total } = calculateTotals();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const totals = calculateTotals();
      const remainingAmount = totals.total - formData.paidAmount;
      const paymentStatus = formData.paidAmount === 0
        ? 'pending'
        : formData.paidAmount >= totals.total
        ? 'paid'
        : 'partially_paid';

      const payload: Partial<VDInvoice> = {
        date: new Date(formData.date),
        invoiceNumber: formData.invoiceNumber,

        // Customer
        customerName: formData.customerName,
        customerAddress: formData.customerAddress,
        customerPostcode: formData.customerPostcode,
        customerEmail: formData.customerEmail,
        customerPhone: formData.customerPhone,
        // Use null instead of undefined to avoid Firestore errors
        customerId: formData.customerId || null,

        // Vehicle
        registration: formData.registration,
        make: formData.make,
        model: formData.model,
        color: formData.color,
        vehicleId: formData.vehicleId || null,

        // Service Center + Labor
        serviceCenter: formData.serviceCenter,
        laborHours: formData.laborHours,
        laborRate: formData.laborRate,
        laborVAT: includeVATOnLabor,

        // Parts (strip out includeVAT before sending, but keep discount)
        parts: formData.parts.map(({ includeVAT, ...rest }) => rest as VDInvoicePart),

        // Paint + its VAT flag
        paintMaterials: formData.paintMaterials,
        paintMaterialsVAT: includeVATOnPaintMaterials,

        // Computed fields
        partsTotal,
        laborCost,
        vatAmount,
        subtotal,
        total,

        // Payment
        paidAmount: formData.paidAmount,
        remainingAmount,
        paymentStatus,
        paymentMethod: formData.paymentMethod,
      };

      await onSubmit(payload);
      onClose();
    } catch (error) {
      console.error('Error submitting invoice:', error);
      toast.error('Failed to submit invoice');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Invoice Details */}
      <div className="grid grid-cols-2 gap-4">
        <FormField
          type="date"
          label="Invoice Date"
          value={formData.date}
          onChange={e => setFormData({ ...formData, date: e.target.value })}
          required
        />
        <FormField
          label="Invoice Number"
          value={formData.invoiceNumber}
          readOnly
          className="bg-gray-50"
        />
      </div>

      {/* Customer Information */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Customer Information</h3>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={manualCustomer}
              onChange={e => setManualCustomer(e.target.checked)}
              className="rounded border-gray-300"
            />
            <span className="text-sm text-gray-600">Manual Entry</span>
          </label>
        </div>

        {manualCustomer ? (
          <div className="grid grid-cols-2 gap-4">
            <FormField
              label="Customer Name"
              value={formData.customerName}
              onChange={e => setFormData({ ...formData, customerName: e.target.value })}
              required
            />
            <FormField
              label="Phone"
              value={formData.customerPhone}
              onChange={e => setFormData({ ...formData, customerPhone: e.target.value })}
              required
            />
            <FormField
              label="Email"
              type="email"
              value={formData.customerEmail}
              onChange={e => setFormData({ ...formData, customerEmail: e.target.value })}
            />
            <FormField
              label="Address"
              value={formData.customerAddress}
              onChange={e => setFormData({ ...formData, customerAddress: e.target.value })}
              required
            />
            <FormField
              label="Postcode"
              value={formData.customerPostcode}
              onChange={e => setFormData({ ...formData, customerPostcode: e.target.value })}
              required
            />
          </div>
        ) : (
          <SearchableSelect
            label="Select Customer"
            options={customers.map(c => ({
              id: c.id,
              label: c.name,
              subLabel: `${c.mobile} - ${c.email}`
            }))}
            value={formData.customerId}
            onChange={handleCustomerSelect}
            placeholder="Search customers..."
          />
        )}
      </div>

      {/* Vehicle Information */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Vehicle Information</h3>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={manualVehicle}
              onChange={e => setManualVehicle(e.target.checked)}
              className="rounded border-gray-300"
            />
            <span className="text-sm text-gray-600">Manual Entry</span>
          </label>
        </div>

        {manualVehicle ? (
          <div className="grid grid-cols-2 gap-4">
            <FormField
              label="Vehicle Make"
              value={formData.make}
              onChange={e => setFormData({ ...formData, make: e.target.value })}
              required
            />
            <FormField
              label="Vehicle Model"
              value={formData.model}
              onChange={e => setFormData({ ...formData, model: e.target.value })}
              required
            />
            <FormField
              label="Registration"
              value={formData.registration}
              onChange={e => setFormData({ ...formData, registration: e.target.value })}
              required
            />
            <FormField
              label="Color"
              value={formData.color}
              onChange={e => setFormData({ ...formData, color: e.target.value })}
              required
            />
          </div>
        ) : (
          <SearchableSelect
            label="Select Vehicle"
            options={vehicles.map(v => ({
              id: v.id,
              label: `${v.make} ${v.model}`,
              subLabel: v.registrationNumber
            }))}
            value={formData.vehicleId}
            onChange={handleVehicleSelect}
            placeholder="Search vehicles..."
          />
        )}
      </div>

      {/* Service Center & Labor */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Service Center</label>
          <ServiceCenterDropdown
            value={formData.serviceCenter}
            onChange={handleServiceCenterSelect}
            onInputChange={value => setFormData({ ...formData, serviceCenter: value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField
            type="number"
            label="Labor Hours"
            value={formData.laborHours}
            onChange={e => setFormData({ ...formData, laborHours: parseFloat(e.target.value) || 0 })}
            min="0"
            step="0.5"
            required
          />
          <div>
            <div className="flex justify-between">
              <label className="block text-sm font-medium text-gray-700">Labor Rate (£/hr)</label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={manualLaborRate}
                  onChange={e => setManualLaborRate(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <span className="text-xs text-gray-600">Manual</span>
              </label>
            </div>
            {manualLaborRate ? (
              <input
                type="number"
                value={formData.laborRate}
                onChange={e => setFormData({ ...formData, laborRate: parseFloat(e.target.value) || 0 })}
                className="mt-1 block w-full rounded-md border-gray-300"
              />
            ) : (
              <input
                type="number"
                value={formData.laborRate}
                readOnly
                className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50"
              />
            )}
          </div>
          <div className="col-span-2">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={includeVATOnLabor}
                onChange={e => setIncludeVATOnLabor(e.target.checked)}
                className="rounded border-gray-300 text-primary focus:ring-primary"
              />
              <span className="text-sm text-gray-600">Include VAT on Labor</span>
            </label>
          </div>
        </div>
      </div>

      {/* Parts Section (with Discount + VAT) */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-medium">Parts</h3>
          <button
            type="button"
            onClick={() =>
              setFormData({
                ...formData,
                parts: [
                  ...formData.parts,
                  { name: '', quantity: 1, price: 0, includeVAT: false, discount: 0 }
                ]
              })
            }
            className="text-sm text-primary hover:text-primary-600"
          >
            Add Part
          </button>
        </div>
        <div className="space-y-3">
          {formData.parts.map((part, index) => (
            <div
              key={index}
              className="grid grid-cols-1 sm:grid-cols-5 gap-4 items-end p-3 border border-gray-200 rounded-md bg-gray-50"
            >
              {/* Part Name + suggestions */}
              <div className="relative col-span-1 sm:col-span-2">
                <FormField
                  label="Part Name"
                  value={part.name}
                  onChange={e => {
                    const newParts = [...formData.parts];
                    newParts[index] = { ...part, name: e.target.value };
                    setFormData({ ...formData, parts: newParts });
                  }}
                  onFocus={() => {
                    const arr = [...showPartSuggestions];
                    arr[index] = true;
                    setShowPartSuggestions(arr);
                  }}
                  onBlur={() => {
                    setTimeout(() => {
                      const arr = [...showPartSuggestions];
                      arr[index] = false;
                      setShowPartSuggestions(arr);
                    }, 100);
                  }}
                  placeholder="Start typing to see product suggestions"
                  inputClassName="w-full"
                />
                {showPartSuggestions[index] &&
                  part.name &&
                  partSuggestions
                    .filter(suggestion =>
                      suggestion.name.toLowerCase().includes(part.name.toLowerCase())
                    )
                    .length > 0 && (
                    <ul className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg mt-1 max-h-48 overflow-y-auto">
                      {partSuggestions
                        .filter(suggestion =>
                          suggestion.name.toLowerCase().includes(part.name.toLowerCase())
                        )
                        .map((suggestion, i) => (
                          <li
                            key={i}
                            className="px-4 py-2 cursor-pointer hover:bg-gray-100"
                            onMouseDown={() => {
                              const newParts = [...formData.parts];
                              newParts[index] = {
                                ...part,
                                name: suggestion.name,
                                price: suggestion.lastPrice
                              };
                              setFormData({ ...formData, parts: newParts });
                              const arr = [...showPartSuggestions];
                              arr[index] = false;
                              setShowPartSuggestions(arr);
                            }}
                          >
                            {suggestion.name}{' '}
                            <span className="text-gray-500 text-sm">
                              (Last price: {formatCurrency(suggestion.lastPrice)})
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
                onChange={e => {
                  const newParts = [...formData.parts];
                  newParts[index] = { ...part, quantity: parseInt(e.target.value) || 0 };
                  setFormData({ ...formData, parts: newParts });
                }}
                min="1"
                inputClassName="w-full"
              />

              {/* Unit Price */}
              <FormField
                type="number"
                label="Price (£)"
                value={part.price}
                onChange={e => {
                  const newParts = [...formData.parts];
                  newParts[index] = { ...part, price: parseFloat(e.target.value) || 0 };
                  setFormData({ ...formData, parts: newParts });
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
                onChange={e => {
                  const newParts = [...formData.parts];
                  newParts[index] = { ...part, discount: parseFloat(e.target.value) || 0 };
                  setFormData({ ...formData, parts: newParts });
                }}
                min="0"
                max="100"
                step="0.1"
                inputClassName="w-full"
              />

              {/* VAT + Remove */}
              <div className="flex items-center space-x-4 col-span-1 sm:col-span-1">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={part.includeVAT}
                    onChange={e => {
                      const newParts = [...formData.parts];
                      newParts[index] = { ...part, includeVAT: e.target.checked };
                      setFormData({ ...formData, parts: newParts });
                    }}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-gray-600">+VAT</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const newParts = formData.parts.filter((_, i) => i !== index);
                    setFormData({ ...formData, parts: newParts });
                  }}
                  className="text-red-600 hover:text-red-800"
                  title="Remove Part"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Paint/Materials */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <FormField
            type="number"
            label="Paint/Materials (£)"
            value={formData.paintMaterials}
            onChange={e => setFormData({ ...formData, paintMaterials: parseFloat(e.target.value) || 0 })}
            min="0"
            step="0.01"
            required
          />
          <label className="flex items-center space-x-2 mt-6">
            <input
              type="checkbox"
              checked={includeVATOnPaintMaterials}
              onChange={e => setIncludeVATOnPaintMaterials(e.target.checked)}
              className="rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span className="text-sm text-gray-600">Include VAT on Paint/Materials</span>
          </label>
        </div>
      </div>

      {/* Payment Details */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Payment Details</h3>
        <div className="grid grid-cols-2 gap-4">
          <FormField
            type="number"
            label="Amount Paid (£)"
            value={formData.paidAmount}
            onChange={e => setFormData({ ...formData, paidAmount: parseFloat(e.target.value) || 0 })}
            min="0"
            max={total}
            step="0.01"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700">Payment Method</label>
            <select
              value={formData.paymentMethod}
              onChange={e => setFormData({ ...formData, paymentMethod: e.target.value as 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'CHEQUE' })}
              className="mt-1 block w-full rounded-md border-gray-300"
              required
            >
              <option value="CASH">Cash</option>
              <option value="CARD">Card</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="CHEQUE">Cheque</option>
            </select>
          </div>
        </div>
      </div>

      {/* Cost Summary */}
      <div className="bg-gray-50 p-4 rounded-lg space-y-2">
        <div className="flex justify-between text-sm">
          <span>Parts Total (after discounts):</span>
          <span>£{partsTotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Labor Cost (net):</span>
          <span>£{laborCost.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Paint/Materials:</span>
          <span>£{formData.paintMaterials.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm font-medium pt-2 border-t">
          <span>Subtotal (net):</span>
          <span>£{subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>VAT:</span>
          <span>£{vatAmount.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-lg font-bold pt-2 border-t">
          <span>Total:</span>
          <span>£{total.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm text-green-600">
          <span>Amount Paid:</span>
          <span>£{formData.paidAmount.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm text-amber-600">
          <span>Remaining Amount:</span>
          <span>£{(total - formData.paidAmount).toFixed(2)}</span>
        </div>
      </div>

      {/* Actions */}
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
          {loading ? 'Saving...' : invoice ? 'Update Invoice' : 'Create Invoice'}
        </button>
      </div>
    </form>
  );
};

export default VDInvoiceForm;
