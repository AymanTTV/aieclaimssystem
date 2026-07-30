// src/components/driverPay/DriverPayForm.tsx
import React, { useState, useEffect } from 'react';
import { addDoc, collection, updateDoc, doc, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { DriverPay, CollectionPoint } from '../../types/driverPay';
import { useAuth } from '../../context/AuthContext';
import FormField from '../ui/FormField';
import TextArea from '../ui/TextArea';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';
import { ensureValidDate } from '../../utils/dateHelpers';
import { useDriverGroups } from '../../hooks/useDriverGroups';

// ---------- helpers ----------
const round2 = (n: number) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

const normalizeDriverNo = (raw?: string | null) => {
  const s = (raw ?? '').toString().trim();
  if (!s) return '';
  const cleaned = s.replace(/[\s-]/g, '').toUpperCase();
  const m = cleaned.match(/^DR(\d+)$/);
  if (!m) return cleaned;
  const n = String(parseInt(m[1], 10));
  return `DR${n}`;
};
const normalizeName = (raw?: string | null) =>
  (raw ?? '').toString().trim().toUpperCase().replace(/\s+/g, ' ');
const normalizePhone = (raw?: string | null) =>
  (raw ?? '').toString().replace(/\D/g, '');

const mergePeriodsKeepAll = (lists: any[][]) => {
  const seen = new Set<string>();
  const out: any[] = [];
  for (const arr of lists) {
    for (const p of arr || []) {
      if (p?.id) {
        if (seen.has(p.id)) continue;
        seen.add(p.id);
        out.push(p);
      } else {
        out.push(p);
      }
    }
  }
  return out;
};
// --------------------------------

interface DriverPayFormProps {
  record?: DriverPay;
  onClose: () => void;
  collectionName?: string;
}

const DriverPayForm: React.FC<DriverPayFormProps> = ({
  record,
  onClose,
  collectionName = 'driverPay'
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  // the doc we will prefer to update (the one with most periods among duplicates)
  const [baseRecord, setBaseRecord] = useState<DriverPay | undefined>(record || undefined);
  const { groups } = useDriverGroups();
  // Basic info
  const [formData, setFormData] = useState({
    driverNo: record?.driverNo || '',
    tidNo: record?.tidNo?.toString() || '',
    name: record?.name || '',
    phoneNumber: record?.phoneNumber || '',
    groupId: record?.groupId || '',
    collection: (record?.collection || 'OFFICE') as CollectionPoint,
    customCollection: record?.customCollection || '',
  });

  // Period editor state
  const [periods, setPeriods] = useState<Array<{
    id?: string;
    startDate: string;
    endDate: string;
    totalAmount: string;
    commissionPercentageA: string;
    commissionPercentageB: string;
    notes?: string;
  }>>(() => {
    if (record?.paymentPeriods?.length) {
      return record.paymentPeriods.map(period => ({
        id: period.id,
        startDate: format(ensureValidDate(period.startDate), 'yyyy-MM-dd'),
        endDate: format(ensureValidDate(period.endDate), 'yyyy-MM-dd'),
        totalAmount: (period.totalAmount ?? 0).toString(),
        commissionPercentageA: (period.commissionPercentageA ?? (period as any).commissionPercentage ?? record.defaultCommissionA ?? 6).toString(),
        commissionPercentageB: (period.commissionPercentageB ?? record.defaultCommissionB ?? 0).toString(),
        notes: period.notes || '',
      }));
    }
    const today = new Date();
    return [{
      id: uuidv4(),
      startDate: format(today, 'yyyy-MM-dd'),
      endDate: format(today, 'yyyy-MM-dd'),
      totalAmount: '',
      // 🟢 Automatically grab base fallback defaults if this is an entirely new driver entry sheet
      commissionPercentageA: record?.defaultCommissionA?.toString() ?? '6',
      commissionPercentageB: record?.defaultCommissionB?.toString() ?? '0',
      notes: '',
    }];
  });

  // -------- Hydrate all periods across duplicate docs for this driver --------
  useEffect(() => {
    const hydrate = async () => {
      // Only bother when editing an existing row
      if (!record) return;

      const key = {
        id: record?.id,
        driverNo: normalizeDriverNo(record?.driverNo),
        name: normalizeName(record?.name),
        phone: normalizePhone(record?.phoneNumber),
        tid: record?.tidNo ? Number(record.tidNo) : null
      };
      if (!key.id && !key.driverNo && !key.tid && !(key.name && key.phone)) return;

      try {
        const snap = await getDocs(collection(db, collectionName));
        const allDocs = snap.docs.map(d => ({ id: d.id, ...(d.data() as DriverPay) }));

        const sameDriverDocs = allDocs.filter(d => {
          if (d.id === key.id) return true;
          const dn = normalizeDriverNo(d.driverNo);
          const tid = d.tidNo != null ? Number(d.tidNo) : null;
          if (key.tid && tid && key.tid > 0 && tid === key.tid) return true;
          if (key.driverNo && dn && key.driverNo === dn) return true;
          return false;
        });

        if (sameDriverDocs.length === 0) return;

        const base = sameDriverDocs.reduce((best, cur) =>
          (cur.paymentPeriods?.length ?? 0) > (best.paymentPeriods?.length ?? 0) ? cur : best,
          sameDriverDocs[0]
        );

        const allPeriods = mergePeriodsKeepAll(
          sameDriverDocs.map(d => (Array.isArray(d.paymentPeriods) ? d.paymentPeriods : []))
        ).sort(
          (a, b) => ensureValidDate(a.startDate).getTime() - ensureValidDate(b.startDate).getTime()
        );

        const merged: DriverPay = { ...base, paymentPeriods: allPeriods };
        setBaseRecord(merged);

        setFormData(fd => ({
          driverNo: fd.driverNo || merged.driverNo || '',
          tidNo: (fd.tidNo || (merged.tidNo != null ? String(merged.tidNo) : '')) || '',
          name: fd.name || merged.name || '',
          phoneNumber: fd.phoneNumber || merged.phoneNumber || '',
          collection: (fd.collection || merged.collection || 'OFFICE') as CollectionPoint,
          customCollection: fd.customCollection || merged.customCollection || '',
        }));

        setPeriods(
          (merged.paymentPeriods || []).map(p => ({
            id: p.id,
            startDate: format(ensureValidDate(p.startDate), 'yyyy-MM-dd'),
            endDate: format(ensureValidDate(p.endDate), 'yyyy-MM-dd'),
            totalAmount: (p.totalAmount ?? 0).toString(),
            commissionPercentageA: (p.commissionPercentageA ?? (p as any).commissionPercentage ?? merged.defaultCommissionA ?? 6).toString(),
            commissionPercentageB: (p.commissionPercentageB ?? merged.defaultCommissionB ?? 0).toString(),
            notes: p.notes || '',
          }))
        );
      } catch (e) {
        console.error('DriverPayForm hydrate failed:', e);
      }
    };
    hydrate();
  }, [record?.id, record?.driverNo, record?.tidNo, record?.name, record?.phoneNumber, collectionName]);

  const addPeriod = () => {
    const today = new Date();
    setPeriods(prev => [
      ...prev,
      {
        id: uuidv4(),
        startDate: format(today, 'yyyy-MM-dd'),
        endDate: format(today, 'yyyy-MM-dd'),
        totalAmount: '',
        // 🟢 Fallback sequentially on BaseRecord, then original Record prop, then static literal defaults
        commissionPercentageA: baseRecord?.defaultCommissionA?.toString() ?? record?.defaultCommissionA?.toString() ?? '6',
        commissionPercentageB: baseRecord?.defaultCommissionB?.toString() ?? record?.defaultCommissionB?.toString() ?? '0',
        notes: '',
      }
    ]);
  };

  const removePeriod = (index: number) => {
    setPeriods(prev => prev.filter((_, i) => i !== index));
  };

  const updatePeriod = (index: number, field: string, value: string) => {
    setPeriods(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      const searchPool = baseRecord?.paymentPeriods ?? record?.paymentPeriods ?? [];

      const processedPeriods = periods.map(period => {
        const totalAmount = Number(period.totalAmount) || 0;
        const commPctA = Number(period.commissionPercentageA) || 0;
        const commPctB = Number(period.commissionPercentageB) || 0;
        
        const commissionAmountA = round2((totalAmount * commPctA) / 100);
        const commissionAmountB = round2((totalAmount * commPctB) / 100);
        const netPay = round2(totalAmount - (commissionAmountA + commissionAmountB));

        const existing = period.id ? searchPool.find(p => p.id === period.id) : undefined;

        if (period.id && existing) {
          const paidAmount = round2(existing?.paidAmount ?? 0);
          const remainingAmount = round2(netPay - paidAmount);
          return {
            ...existing,
            id: period.id,
            startDate: new Date(period.startDate),
            endDate: new Date(period.endDate),
            totalAmount,
            commissionPercentageA: commPctA,
            commissionPercentageB: commPctB,
            commissionAmountA,
            commissionAmountB,
            netPay,
            paidAmount,
            remainingAmount,
            status:
              remainingAmount <= 0 ? 'paid' : paidAmount > 0 ? 'partially_paid' : 'unpaid',
            notes: period.notes,
            payments: existing?.payments || []
          };
        } else {
          return {
            id: period.id || uuidv4(),
            startDate: new Date(period.startDate),
            endDate: new Date(period.endDate),
            totalAmount,
            commissionPercentageA: commPctA,
            commissionPercentageB: commPctB,
            commissionAmountA,
            commissionAmountB,
            netPay,
            paidAmount: 0,
            remainingAmount: netPay,
            status: 'unpaid' as const,
            payments: [],
            notes: period.notes,
          };
        }
      });

      const totals = processedPeriods.reduce(
        (acc, p) => {
          acc.totalAmount += Number(p.totalAmount) || 0;
          acc.commissionAmountA += Number(p.commissionAmountA) || 0;
          acc.commissionAmountB += Number(p.commissionAmountB) || 0;
          acc.netPay += Number(p.netPay) || 0;
          acc.paidAmount += Number(p.paidAmount) || 0;
          acc.remainingAmount += Number(p.remainingAmount) || 0;
          return acc;
        },
        { totalAmount: 0, commissionAmountA: 0, commissionAmountB: 0, netPay: 0, paidAmount: 0, remainingAmount: 0 }
      );

      const overallStatus =
        totals.remainingAmount <= 0 ? 'paid' : totals.paidAmount > 0 ? 'partially_paid' : 'unpaid';
      const selectedGroup = groups.find(g => g.id === formData.groupId);
      const driverPayData = {
        ...formData,
        tidNo: Number(formData.tidNo) || 0,
        paymentPeriods: processedPeriods,
        totalAmount: round2(totals.totalAmount),
        groupName: selectedGroup ? selectedGroup.name : '',
        commissionAmountA: round2(totals.commissionAmountA),
        commissionAmountB: round2(totals.commissionAmountB),
        netPay: round2(totals.netPay),
        paidAmount: round2(totals.paidAmount),
        remainingAmount: round2(totals.remainingAmount),
        status: overallStatus,
        updatedAt: new Date()
      };

      const targetDocId = baseRecord?.id || record?.id;

      if (targetDocId) {
        await updateDoc(doc(db, collectionName, targetDocId), driverPayData);
        toast.success('Driver pay record updated successfully');
      } else {
        await addDoc(collection(db, collectionName), {
          ...driverPayData,
          createdBy: user.id,
          createdAt: new Date()
        });
        toast.success('Driver pay record created successfully');
      }

      onClose();
    } catch (error: any) {
      console.error('Error saving driver pay record:', error);
      toast.error(`Failed to ${record ? 'update' : 'create'} driver pay record`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <FormField
          label="Driver No"
          value={formData.driverNo}
          onChange={e => setFormData({ ...formData, driverNo: e.target.value })}
          required
        />
        <FormField
          type="number"
          label="TID No"
          value={formData.tidNo}
          onChange={e => setFormData({ ...formData, tidNo: e.target.value })}
          required
        />
        <FormField
          label="Name"
          value={formData.name}
          onChange={e => setFormData({ ...formData, name: e.target.value })}
          required
        />
        <FormField
          type="tel"
          label="Phone Number"
          value={formData.phoneNumber}
          onChange={e => setFormData({ ...formData, phoneNumber: e.target.value })}
          required
        />
        <div>
          <label className="block text-sm font-medium text-gray-700">Collection Point</label>
          <select
            value={formData.collection}
            onChange={e => setFormData({ ...formData, collection: e.target.value as CollectionPoint })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
            required
          >
            <option value="OFFICE">OFFICE</option>
            <option value="CC">CC</option>
            <option value="ABDULAZIZ">ABDULAZIZ</option>
            <option value="OTHER">OTHER</option>
          </select>
        </div>

        <div>
  <label className="block text-sm font-medium text-gray-700">Driver Group</label>
  <select
    value={formData.groupId}
    onChange={e => setFormData({ ...formData, groupId: e.target.value })}
    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
  >
    <option value="">No Group</option>
    {groups.map((group) => (
      <option key={group.id} value={group.id}>{group.name}</option>
    ))}
  </select>
</div>
        {formData.collection === 'OTHER' && (
          <FormField
            label="Custom Collection Point"
            value={formData.customCollection}
            onChange={e => setFormData({ ...formData, customCollection: e.target.value })}
            required
          />
        )}
      </div>

      {periods.map((period, idx) => (
        <div key={period.id ?? idx} className="border-t pt-4 mt-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">Payment Period {idx + 1}</h3>
            {periods.length > 1 && (
              <button
                type="button"
                onClick={() => removePeriod(idx)}
                className="text-red-600 hover:text-red-800"
              >
                Remove Period
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              type="date"
              label="Start Date"
              value={period.startDate}
              onChange={e => updatePeriod(idx, 'startDate', e.target.value)}
              required
            />
            <FormField
              type="date"
              label="End Date"
              value={period.endDate}
              onChange={e => updatePeriod(idx, 'endDate', e.target.value)}
              required
              min={period.startDate}
            />
            <FormField
              type="number"
              label="Total Amount"
              value={period.totalAmount}
              onChange={e => updatePeriod(idx, 'totalAmount', e.target.value)}
              required
              min="0"
              step="0.01"
            />
            <div className="grid grid-cols-2 gap-2">
              <FormField
                type="number"
                label="Commission A %"
                value={period.commissionPercentageA}
                onChange={e => updatePeriod(idx, 'commissionPercentageA', e.target.value)}
                required
                min="0"
                max="100"
                step="0.01"
              />
              <FormField
                type="number"
                label="Commission B %"
                value={period.commissionPercentageB}
                onChange={e => updatePeriod(idx, 'commissionPercentageB', e.target.value)}
                required
                min="0"
                max="100"
                step="0.01"
              />
            </div>
            <div className="col-span-2">
              <TextArea
                label="Notes"
                value={period.notes || ''}
                onChange={e => updatePeriod(idx, 'notes', e.target.value)}
                placeholder="Any notes for this period"
              />
            </div>
          </div>

          {period.totalAmount && (period.commissionPercentageA || period.commissionPercentageB) && (
            <div className="col-span-2 bg-gray-50 p-4 rounded-lg space-y-2 mt-4">
              <div className="flex justify-between text-sm">
                <span>Total Amount:</span>
                <span>£{parseFloat(period.totalAmount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Commission A ({period.commissionPercentageA}%):</span>
                <span className="text-yellow-600">
                  £{((parseFloat(period.totalAmount) * parseFloat(period.commissionPercentageA || '0')) / 100).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Commission B ({period.commissionPercentageB}%):</span>
                <span className="text-yellow-600">
                  £{((parseFloat(period.totalAmount) * parseFloat(period.commissionPercentageB || '0')) / 100).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-sm font-medium pt-2 border-t">
                <span>Net Pay:</span>
                <span className="text-green-600">
                  £{(
                    parseFloat(period.totalAmount) -
                    (parseFloat(period.totalAmount) * parseFloat(period.commissionPercentageA || '0')) / 100 -
                    (parseFloat(period.totalAmount) * parseFloat(period.commissionPercentageB || '0')) / 100
                  ).toFixed(2)}
                </span>
              </div>
            </div>
          )}
        </div>
      ))}

      <button
        type="button"
        onClick={addPeriod}
        className="text-primary hover:text-primary-600"
      >
        Add Payment Period
      </button>

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
          {loading ? (record ? 'Updating...' : 'Creating...') : (record ? 'Update Record' : 'Create Record')}
        </button>
      </div>
    </form>
  );
};

export default DriverPayForm;