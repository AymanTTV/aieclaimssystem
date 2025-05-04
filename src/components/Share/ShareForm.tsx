// src/components/share/ShareForm.tsx

import React, { useState, useEffect } from 'react';
import { addDoc, updateDoc, collection, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import toast from 'react-hot-toast';
import { ShareRecord, Expense } from '../../types/share';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import { useCustomers } from '../../hooks/useCustomers';
import SearchableSelect from '../ui/SearchableSelect';
import FormField from '../ui/FormField';

interface ShareFormProps {
  record?: ShareRecord;
  onClose: () => void;
}

const reasonsOptions = ['VD', 'H', 'S', 'PI'];
const emptyExpense: Expense = { type: '', description: '', amount: 0, vat: false };

const ShareForm: React.FC<ShareFormProps> = ({ record, onClose }) => {
  const isEdit = Boolean(record);
  const { user } = useAuth();
  const { can } = usePermissions();
  const { customers } = useCustomers();
  const [loading, setLoading] = useState(false);

  // === Input State ===
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [clientName, setClientName] = useState<string>(record?.clientName || '');
  const [selectedReasons, setSelectedReasons] = useState<string[]>(
    record?.reason.split('') || []
  );
  const [vdProfit, setVdProfit] = useState<number>(record?.vdProfit || 0);
  const [actualPaid, setActualPaid] = useState<number>(record?.actualPaid || 0);
  const [vehicleCost, setVehicleCost] = useState<number>(
    record?.vehicleRunningCost || 0
  );
  const [legalPct, setLegalPct] = useState<number>(
    record?.legalFeePercentage || 0
  );
  const [startDate, setStartDate] = useState<string>(record?.startDate || '');
  const [endDate, setEndDate] = useState<string>(record?.endDate || '');
  const [expenses, setExpenses] = useState<Expense[]>(
    record?.expenses.length ? record.expenses : [{ ...emptyExpense }]
  );
  const [aiePct, setAiePct] = useState<number>(
    record?.aieSkylinePercentage || 0
  );
  const [abdulPct, setAbdulPct] = useState<number>(
    record?.abdulAzizPercentage || 0
  );
  const [jayPct, setJayPct] = useState<number>(record?.jayPercentage || 0);
  const [progress, setProgress] = useState<ShareRecord['progress']>(
    record?.progress || 'in-progress'
  );

  // === Computed State ===
  const [legalCost, setLegalCost] = useState<number>(0);
  const [vHireAmt, setVHireAmt] = useState<number>(0);
  const [totalNet, setTotalNet] = useState<number>(0);
  const [aieAmt, setAieAmt] = useState<number>(0);
  const [abdulAmt, setAbdulAmt] = useState<number>(0);
  const [jayAmt, setJayAmt] = useState<number>(0);

  // Prefill customer selection when editing
  useEffect(() => {
    if (record) {
      const cust = customers.find(c => c.name === record.clientName);
      if (cust) {
        setSelectedCustomerId(cust.id);
        setClientName(cust.name);
      }
    }
  }, [record, customers]);

  // Recalculate whenever any input changes
  useEffect(() => {
    // 1) Legal fee cost
    const lc = (actualPaid * legalPct) / 100;
    setLegalCost(lc);

    // 2) V-hire amount if 'H'
    let vh = 0;
    if (selectedReasons.includes('H') && startDate && endDate) {
      const s = new Date(startDate),
            e = new Date(endDate);
      const weeks = Math.ceil(
        (e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24 * 7)
      );
      vh = Math.max(0, weeks) * 400;
    }
    setVHireAmt(vh);

    // 3) Total expenses
    const expTotal = expenses.reduce(
      (sum, ex) => sum + ex.amount * (ex.vat ? 1.2 : 1),
      0
    );

    // 4) Total net
    const net = vdProfit + actualPaid - vehicleCost - lc - expTotal;
    setTotalNet(net);

    // 5) Share amounts
    setAieAmt((net * aiePct) / 100);
    setAbdulAmt((net * abdulPct) / 100);
    setJayAmt((net * jayPct) / 100);
  }, [
    vdProfit,
    actualPaid,
    vehicleCost,
    legalPct,
    selectedReasons,
    startDate,
    endDate,
    expenses,
    aiePct,
    abdulPct,
    jayPct,
  ]);

  // === Handlers ===
  const toggleReason = (r: string) =>
    setSelectedReasons(rs =>
      rs.includes(r) ? rs.filter(x => x !== r) : [...rs, r]
    );

  const updateExpense = (i: number, field: keyof Expense, val: any) =>
    setExpenses(exs => {
      const arr = [...exs];
      (arr[i] as any)[field] = val;
      return arr;
    });

  const addExpense = () =>
    setExpenses(exs => [...exs, { ...emptyExpense }]);

  const removeExpense = (i: number) =>
    setExpenses(exs => exs.filter((_, idx) => idx !== i));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !can('share', isEdit ? 'update' : 'create')) {
      toast.error('Not authorized');
      return;
    }
    setLoading(true);

    const payload: Omit<ShareRecord, 'id'> = {
      clientName,
      reason: selectedReasons.join(''),
      vdProfit,
      actualPaid,
      vehicleRunningCost: vehicleCost,
      legalFeePercentage: legalPct,
      legalFeeCost: legalCost,               // use legalCost variable
      ...(selectedReasons.includes('H') ? { startDate, endDate } : {}),
      vHireAmount: vHireAmt,      // corrected to vHireAmt
      expenses,
      totalNet,
      aieSkylinePercentage: aiePct,
      aieSkylineAmount: aieAmt,
      abdulAzizPercentage: abdulPct,
      abdulAzizAmount: abdulAmt,
      jayPercentage: jayPct,
      jayAmount: jayAmt,
      progress,
    };

    try {
      if (isEdit && record?.id) {
        await updateDoc(doc(db, 'shares', record.id), payload);
        toast.success('Record updated');
      } else {
        await addDoc(collection(db, 'shares'), {
          ...payload,
          createdAt: new Date(),
          createdBy: user.id,
        });
        toast.success('Record created');
      }
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Save failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Client Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Client Name
        </label>
        <SearchableSelect
          options={customers.map(c => ({ id: c.id, label: c.name }))}
          value={selectedCustomerId}
          onChange={id => {
            setSelectedCustomerId(id);
            const c = customers.find(x => x.id === id);
            setClientName(c ? c.name : '');
          }}
          allowManualEntry
        />
      </div>

      {/* Reason(s) */}
      <fieldset>
        <legend className="text-sm font-medium text-gray-700">
          Reason(s)
        </legend>
        <div className="mt-2 flex flex-wrap gap-4">
          {reasonsOptions.map(r => (
            <label key={r} className="inline-flex items-center space-x-2">
              <input
                type="checkbox"
                checked={selectedReasons.includes(r)}
                onChange={() => toggleReason(r)}
                className="h-4 w-4 text-primary border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">{r}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {/* Financial Inputs */}
      <div className="grid grid-cols-3 gap-4">
        <FormField
          label="VD Profit"
          type="number"
          value={vdProfit}
          onChange={e => setVdProfit(Number(e.target.value))}
          required
        />
        <FormField
          label="Actual Paid"
          type="number"
          value={actualPaid}
          onChange={e => setActualPaid(Number(e.target.value))}
          required
        />
        <FormField
          label="Vehicle Cost"
          type="number"
          value={vehicleCost}
          onChange={e => setVehicleCost(Number(e.target.value))}
          required
        />
      </div>

      {/* Legal Fee */}
      <div className="grid grid-cols-2 gap-4">
        <FormField
          label="Legal Fee %"
          type="number"
          value={legalPct}
          onChange={e => setLegalPct(Number(e.target.value))}
        />
        <FormField
          label="Legal Fee Cost"
          type="number"
          value={legalCost}
          readOnly
        />
      </div>

      {/* Hire Dates */}
      {selectedReasons.includes('H') && (
        <div className="grid grid-cols-3 gap-4">
          <FormField
            label="Start Date"
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            required
          />
          <FormField
            label="End Date"
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            required
          />
          <FormField
            label="V Hire Amount"
            type="number"
            value={vHireAmt}
            readOnly
          />
        </div>
      )}

      {/* Expenses */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Expenses
        </label>
        <table className="w-full mt-2 table-auto border">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-2">Type</th>
              <th className="p-2">Desc</th>
              <th className="p-2">Amt</th>
              <th className="p-2">VAT</th>
              <th className="p-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((exp, i) => (
              <tr key={i} className="border-t">
                <td className="p-2">
                  <input
                    className="w-full border-gray-300 rounded-md"
                    value={exp.type}
                    onChange={e => updateExpense(i, 'type', e.target.value)}
                  />
                </td>
                <td className="p-2">
                  <input
                    className="w-full border-gray-300 rounded-md"
                    value={exp.description}
                    onChange={e =>
                      updateExpense(i, 'description', e.target.value)
                    }
                  />
                </td>
                <td className="p-2">
                  <input
                    type="number"
                    className="w-full border-gray-300 rounded-md"
                    value={exp.amount}
                    onChange={e =>
                      updateExpense(i, 'amount', Number(e.target.value))
                    }
                  />
                </td>
                <td className="p-2 text-center">
                  <input
                    type="checkbox"
                    checked={exp.vat}
                    onChange={e => updateExpense(i, 'vat', e.target.checked)}
                  />
                </td>
                <td className="p-2">
                  <button
                    type="button"
                    onClick={() => removeExpense(i)}
                    className="text-red-600 hover:text-red-800"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button
          type="button"
          onClick={addExpense}
          className="mt-2 px-3 py-1 bg-gray-200 rounded-md"
        >
          Add Expense
        </button>
      </div>

      {/* Shares */}
      <div className="grid grid-cols-3 gap-4">
        <FormField
          label="AIE Skyline %"
          type="number"
          value={aiePct}
          onChange={e => setAiePct(Number(e.target.value))}
        />
        <FormField
          label="AIE Skyline Amt"
          type="number"
          value={aieAmt}
          readOnly
        />
        <FormField
          label="AbdulAziz %"
          type="number"
          value={abdulPct}
          onChange={e => setAbdulPct(Number(e.target.value))}
        />
        <FormField
          label="AbdulAziz Amt"
          type="number"
          value={abdulAmt}
          readOnly
        />
        <FormField
          label="JAY %"
          type="number"
          value={jayPct}
          onChange={e => setJayPct(Number(e.target.value))}
        />
        <FormField
          label="JAY Amt"
          type="number"
          value={jayAmt}
          readOnly
        />
      </div>

      {/* Total & Progress */}
      <div className="grid grid-cols-2 gap-4">
        <FormField
          label="Total Net"
          type="number"
          value={totalNet}
          readOnly
        />
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Progress
          </label>
          <select
            value={progress}
            onChange={e => setProgress(e.target.value as any)}
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm"
          >
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
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
          {loading ? 'Saving...' : isEdit ? 'Update Record' : 'Create Record'}
        </button>
      </div>
    </form>
  );
};

export default ShareForm;
