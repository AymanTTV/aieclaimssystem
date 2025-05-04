import React, { useState } from 'react';
import { VDInvoice, VDInvoicePart } from '../../types/vdInvoice';
import FormField from '../ui/FormField';
import SearchableSelect from '../ui/SearchableSelect';
import ServiceCenterDropdown from '../maintenance/ServiceCenterDropdown';
import { Customer, Vehicle } from '../../types';
import { format } from 'date-fns';

interface VDInvoiceFormProps {
  invoice?: VDInvoice;
  customers: Customer[];
  vehicles: Vehicle[];
  onSubmit: (data: Partial<VDInvoice>) => Promise<void>;
  onClose: () => void;
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

  const generateInvoiceNumber = () => {
    const timestamp = Date.now();
    return `INV-${timestamp.toString().slice(-8).toUpperCase()}`;
  };

  const [formData, setFormData] = useState({
    date: invoice?.date ? format(invoice.date, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
    invoiceNumber: invoice?.invoiceNumber || generateInvoiceNumber(),
    customerName: invoice?.customerName || '',
    customerAddress: invoice?.customerAddress || '',
    customerPostcode: invoice?.customerPostcode || '',
    customerEmail: invoice?.customerEmail || '',
    customerPhone: invoice?.customerPhone || '',
    customerId: invoice?.customerId || '',
    registration: invoice?.registration || '',
    make: invoice?.make || '',
    model: invoice?.model || '',
    color: invoice?.color || '',
    vehicleId: invoice?.vehicleId || '',
    serviceCenter: invoice?.serviceCenter || '',
    laborHours: invoice?.laborHours || 0,
    laborRate: invoice?.laborRate || 75,
    laborVAT: invoice?.laborVAT || false,
    parts: invoice?.parts || [{ name: '', quantity: 1, price: 0, includeVAT: false }] as VDInvoicePart[],
    paintMaterials: invoice?.paintMaterials || 0,
    paintMaterialsVAT: invoice?.paintMaterialsVAT || false,
    paymentMethod: invoice?.paymentMethod || 'CASH' as const,
    paidAmount: invoice?.paidAmount || 0,
    remainingAmount: invoice?.remainingAmount || 0,
    paymentStatus: invoice?.paymentStatus || 'pending' as const,
  });

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
        customerAddress: customer.address
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
        model: vehicle.model
      }));
    }
  };

  const calculateTotals = () => {
    // Calculate parts total with VAT
    const partsTotal = formData.parts.reduce((sum, part) => {
      const partTotal = part.price * part.quantity;
      return sum + (part.includeVAT ? partTotal * 1.2 : partTotal);
    }, 0);

    // Calculate labor cost with VAT
    const laborTotal = formData.laborHours * formData.laborRate;
    const laborCost = includeVATOnLabor ? laborTotal * 1.2 : laborTotal;

    // Calculate paint/materials with VAT
    const paintMaterialsTotal = includeVATOnPaintMaterials ? 
      formData.paintMaterials * 1.2 : 
      formData.paintMaterials;

    // Calculate VAT amounts
    const partsVAT = formData.parts.reduce((sum, part) => {
      return sum + (part.includeVAT ? part.price * part.quantity * 0.2 : 0);
    }, 0);
    const laborVAT = includeVATOnLabor ? laborTotal * 0.2 : 0;
    const paintMaterialsVAT = includeVATOnPaintMaterials ? formData.paintMaterials * 0.2 : 0;

    const subtotal = partsTotal + laborCost + paintMaterialsTotal;
    const vatAmount = partsVAT + laborVAT + paintMaterialsVAT;
    const total = subtotal + vatAmount;

    return {
      partsTotal,
      laborCost,
      paintMaterialsTotal,
      subtotal,
      vatAmount,
      total
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const totals = calculateTotals();
      const remainingAmount = totals.total - formData.paidAmount;
      const paymentStatus = formData.paidAmount === 0 ? 'pending' :
                          formData.paidAmount >= totals.total ? 'paid' :
                          'partially_paid';

      await onSubmit({
        ...formData,
        ...totals,
        remainingAmount,
        paymentStatus,
        laborVAT: includeVATOnLabor,
        paintMaterialsVAT: includeVATOnPaintMaterials,
        date: new Date(formData.date)
      });

      onClose();
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setLoading(false);
    }
  };

  const totals = calculateTotals();

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Invoice Details */}
      <div className="grid grid-cols-2 gap-4">
        <FormField
          type="date"
          label="Invoice Date"
          value={formData.date}
          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
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
              onChange={(e) => setManualCustomer(e.target.checked)}
              className="rounded border-gray-300"
            />
            <span>Manual Entry</span>
          </label>
        </div>

        {manualCustomer ? (
          <div className="grid grid-cols-2 gap-4">
            <FormField
              label="Customer Name"
              value={formData.customerName}
              onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
              required
            />
            <FormField
              label="Phone"
              value={formData.customerPhone}
              onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
              required
            />
            <FormField
              label="Email"
              type="email"
              value={formData.customerEmail}
              onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
            />
            <FormField
              label="Address"
              value={formData.customerAddress}
              onChange={(e) => setFormData({ ...formData, customerAddress: e.target.value })}
              required
            />
            <FormField
              label="Postcode"
              value={formData.customerPostcode}
              onChange={(e) => setFormData({ ...formData, customerPostcode: e.target.value })}
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
              onChange={(e) => setManualVehicle(e.target.checked)}
              className="rounded border-gray-300"
            />
            <span>Manual Entry</span>
          </label>
        </div>

        {manualVehicle ? (
          <div className="grid grid-cols-2 gap-4">
            <FormField
              label="Vehicle Make"
              value={formData.make}
              onChange={(e) => setFormData({ ...formData, make: e.target.value })}
              required
            />
            <FormField
              label="Vehicle Model"
              value={formData.model}
              onChange={(e) => setFormData({ ...formData, model: e.target.value })}
              required
            />
            <FormField
              label="Registration"
              value={formData.registration}
              onChange={(e) => setFormData({ ...formData, registration: e.target.value })}
              required
            />
            <FormField
              label="Color"
              value={formData.color}
              onChange={(e) => setFormData({ ...formData, color: e.target.value })}
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

      {/* Service Center and Labor */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Service Center</label>
          <ServiceCenterDropdown
            value={formData.serviceCenter}
            onChange={handleServiceCenterSelect}
            onInputChange={(value) => setFormData({ ...formData, serviceCenter: value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            type="number"
            label="Labor Hours"
            value={formData.laborHours}
            onChange={(e) => setFormData({ ...formData, laborHours: parseFloat(e.target.value) })}
            min="0"
            step="0.5"
            required
          />
          <div>
              <div className="flex justify-between">
                <label className="block text-sm font-medium text-gray-700">Labor Rate (per hour)</label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={manualLaborRate}
                    onChange={(e) => setManualLaborRate(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-xs text-gray-600">Manual</span>
                </label>
              </div>
              {manualLaborRate ? (
                <input
                  type="number"
                  value={formData.laborRate}
                  onChange={(e) => setFormData({ ...formData, laborRate: parseFloat(e.target.value) })}
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
                onChange={(e) => setIncludeVATOnLabor(e.target.checked)}
                className="rounded border-gray-300 text-primary focus:ring-primary"
              />
              <span className="text-sm text-gray-600">Include VAT on Labor</span>
            </label>
          </div>
        </div>
      </div>

      {/* Parts */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-medium">Parts</h3>
          <button
            type="button"
            onClick={() => setFormData({
              ...formData,
              parts: [...formData.parts, { name: '', quantity: 1, price: 0, includeVAT: false }]
            })}
            className="text-sm text-primary hover:text-primary-600"
          >
            Add Part
          </button>
        </div>
        {formData.parts.map((part, index) => (
          <div key={index} className="flex space-x-2 mb-2">
            <input
              type="text"
              value={part.name}
              onChange={(e) => {
                const newParts = [...formData.parts];
                newParts[index] = { ...part, name: e.target.value };
                setFormData({ ...formData, parts: newParts });
              }}
              placeholder="Part name"
              className="flex-1 rounded-md border-gray-300"
            />
            <input
              type="number"
              value={part.quantity}
              onChange={(e) => {
                const newParts = [...formData.parts];
                newParts[index] = { ...part, quantity: parseInt(e.target.value) || 0 };
                setFormData({ ...formData, parts: newParts });
              }}
              placeholder="Qty"
              className="w-20 rounded-md border-gray-300"
              min="1"
            />
            <input
              type="number"
              value={part.price}
              onChange={(e) => {
                const newParts = [...formData.parts];
                newParts[index] = { ...part, price: parseFloat(e.target.value) || 0 };
                setFormData({ ...formData, parts: newParts });
              }}
              placeholder="Price"
              className="w-24 rounded-md border-gray-300"
              min="0"
              step="0.01"
            />
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={part.includeVAT}
                onChange={(e) => {
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
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      {/* Paint/Materials */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <FormField
            type="number"
            label="Paint/Materials"
            value={formData.paintMaterials}
            onChange={(e) => setFormData({ ...formData, paintMaterials: parseFloat(e.target.value) || 0 })}
            min="0"
            step="0.01"
            required
          />
          <label className="flex items-center space-x-2 mt-6">
            <input
              type="checkbox"
              checked={includeVATOnPaintMaterials}
              onChange={(e) => setIncludeVATOnPaintMaterials(e.target.checked)}
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
            label="Amount Paid"
            value={formData.paidAmount}
            onChange={(e) => setFormData({ ...formData, paidAmount: parseFloat(e.target.value) || 0 })}
            min="0"
            max={totals.total}
            step="0.01"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700">Payment Method</label>
            <select
              value={formData.paymentMethod}
              onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value as 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'CHEQUE' })}
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
          <span>Parts Total:</span>
          <span>£{totals.partsTotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Labor Cost:</span>
          <span>£{totals.laborCost.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Paint/Materials:</span>
          <span>£{totals.paintMaterialsTotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm font-medium pt-2 border-t">
          <span>Subtotal:</span>
          <span>£{totals.subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>VAT:</span>
          <span>£{totals.vatAmount.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-lg font-bold pt-2 border-t">
          <span>Total:</span>
          <span>£{totals.total.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm text-green-600">
          <span>Amount Paid:</span>
          <span>£{formData.paidAmount.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm text-amber-600">
          <span>Remaining Amount:</span>
          <span>£{(totals.total - formData.paidAmount).toFixed(2)}</span>
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
          {loading ? 'Saving...' : invoice ? 'Update Invoice' : 'Create Invoice'}
        </button>
      </div>
    </form>
  );
};

export default VDInvoiceForm;