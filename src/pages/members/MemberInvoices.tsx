// src/pages/members/MemberInvoices.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import useMemberCustomerId from './_useMemberCustomer';
import { useVehicles } from '../../hooks/useVehicles';
import { useCustomers } from '../../hooks/useCustomers';
import { Vehicle, Customer } from '../../types';
import Modal from '../../components/ui/Modal';
import StatusBadge from '../../components/ui/StatusBadge';
import { DataTable } from '../../components/DataTable/DataTable';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
// 👇 adjust if your main component lives elsewhere
import InvoiceDetails from '../../components/finance/InvoiceDetails';

type Invoice = {
  id: string;
  number?: string;
  date?: any;
  createdAt?: any;
  status?: 'paid' | 'unpaid' | 'partially_paid' | string;
  customerId?: string;
  vehicleId?: string;
  total?: number;
  netTotal?: number;
  vatTotal?: number;
};

const toJSDate = (v: any): Date | null => {
  if (!v) return null;
  if (typeof v?.toDate === 'function') return v.toDate();
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
};
const money = (n = 0) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(n || 0);

const SummaryCards: React.FC<{ total: number; paid: number; unpaid: number; count: number }> = ({ total, paid, unpaid, count }) => (
  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="text-sm text-gray-500">Total Invoices</div>
      <div className="mt-2 text-2xl font-semibold">{count}</div>
    </div>
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="text-sm text-gray-500">Total Amount</div>
      <div className="mt-2 text-2xl font-semibold">{money(total)}</div>
    </div>
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="text-sm text-gray-500">Paid</div>
      <div className="mt-2 text-2xl font-semibold text-green-700">{money(paid)}</div>
    </div>
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="text-sm text-gray-500">Unpaid</div>
      <div className="mt-2 text-2xl font-semibold text-amber-700">{money(unpaid)}</div>
    </div>
  </div>
);

const Filters: React.FC<{
  dateRange: { start: Date | null; end: Date | null };
  onDateRangeChange: (r: { start: Date | null; end: Date | null }) => void;
  status: 'all' | 'paid' | 'unpaid' | 'partially_paid';
  onStatusChange: (s: 'all' | 'paid' | 'unpaid' | 'partially_paid') => void;
}> = ({ dateRange, onDateRangeChange, status, onStatusChange }) => (
  <div className="rounded-2xl border bg-white p-4 shadow-sm">
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <div>
        <label className="block text-sm font-medium text-gray-700">From</label>
        <input
          type="date"
          value={dateRange.start ? new Date(dateRange.start).toISOString().split('T')[0] : ''}
          onChange={(e) => onDateRangeChange({ start: e.target.value ? new Date(e.target.value) : null, end: dateRange.end })}
          className="mt-1 w-full rounded-md border px-3 py-2"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">To</label>
        <input
          type="date"
          value={dateRange.end ? new Date(dateRange.end).toISOString().split('T')[0] : ''}
          onChange={(e) => onDateRangeChange({ start: dateRange.start, end: e.target.value ? new Date(e.target.value) : null })}
          className="mt-1 w-full rounded-md border px-3 py-2"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Status</label>
        <select
          value={status}
          onChange={(e) => onStatusChange(e.target.value as any)}
          className="mt-1 w-full rounded-md border px-3 py-2"
        >
          <option value="all">All</option>
          <option value="paid">Paid</option>
          <option value="unpaid">Unpaid</option>
          <option value="partially_paid">Partially Paid</option>
        </select>
      </div>
    </div>
  </div>
);

const MemberInvoices: React.FC = () => {
  const { customerId, loading: loadingCustomer } = useMemberCustomerId();
  const { vehicles } = useVehicles();
  const { customers } = useCustomers();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Invoice | null>(null);

  // fetch member-scoped invoices
  useEffect(() => {
    if (loadingCustomer) return;
    if (!customerId) { setInvoices([]); setLoading(false); return; }
    setLoading(true);
    (async () => {
      try {
        // member vehicles
        const vSnap = await getDocs(query(collection(db, 'vehicles'), where('customerId', '==', customerId)));
        const vehicleIds = vSnap.docs.map(d => d.id);

        const q1 = await getDocs(query(collection(db, 'invoices'), where('customerId', '==', customerId)));
        const combined = new Map<string, any>();
        q1.forEach(doc => combined.set(doc.id, { id: doc.id, ...(doc.data() as any) }));

        if (vehicleIds.length) {
          const q2 = await getDocs(query(collection(db, 'invoices'), where('vehicleId', 'in', vehicleIds.slice(0, 10))));
          q2.forEach(doc => combined.set(doc.id, { id: doc.id, ...(doc.data() as any) }));
        }

        const sorted = Array.from(combined.values()).sort((a, b) => {
          const da = toJSDate(a.date) || toJSDate(a.createdAt);
          const dbb = toJSDate(b.date) || toJSDate(b.createdAt);
          return (dbb?.getTime() || 0) - (da?.getTime() || 0);
        });

        setInvoices(sorted);
      } catch (e) {
        console.error(e);
        toast.error('Could not load invoices.');
      } finally {
        setLoading(false);
      }
    })();
  }, [customerId, loadingCustomer]);

  // filters
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({ start: null, end: null });
  const [status, setStatus] = useState<'all' | 'paid' | 'unpaid' | 'partially_paid'>('all');

  const filtered = useMemo(() => {
    return invoices.filter((inv) => {
      const d = toJSDate(inv.date) || toJSDate(inv.createdAt);
      if (!d) return false;
      if (dateRange.start && d < dateRange.start) return false;
      if (dateRange.end) {
        const end = new Date(dateRange.end);
        end.setHours(23, 59, 59, 999);
        if (d > end) return false;
      }
      if (status !== 'all' && (inv.status as any) !== status) return false;
      return true;
    });
  }, [invoices, dateRange, status]);

  // summary
  const total = filtered.reduce((s, i) => s + (i.total || i.netTotal || 0), 0);
  const paid = filtered.filter(i => i.status === 'paid').reduce((s, i) => s + (i.total || i.netTotal || 0), 0);
  const unpaid = total - paid;

  // table
  const columns = [
    { header: 'Date', cell: ({ row }: any) => {
      const d = toJSDate(row.original.date) || toJSDate(row.original.createdAt);
      return d ? format(d, 'dd/MM/yyyy') : '—';
    }},
    { header: 'Invoice #', cell: ({ row }: any) => row.original.number || row.original.id },
    { header: 'Status', cell: ({ row }: any) => <StatusBadge status={row.original.status || 'unpaid'} /> },
    { header: 'Total', cell: ({ row }: any) => money(row.original.total ?? row.original.netTotal ?? 0) },
  ];

  // find entities for details
  const findVehicle = (inv: Invoice): Vehicle | undefined => inv?.vehicleId ? vehicles.find(v => v.id === inv.vehicleId) : undefined;
  const findCustomer = (inv: Invoice): Customer | undefined => inv?.customerId ? customers.find(c => c.id === inv.customerId) : undefined;

  if (loadingCustomer || loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-gray-500" />
      </div>
    );
  }

  if (!customerId) {
    return (
      <div className="rounded-2xl border bg-white p-6 text-center text-gray-600">
        We couldn’t link your member login to a customer record yet.
        <br />
        Please make sure your account email or mobile matches your customer profile.
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      <h1 className="text-2xl font-bold">My Invoices</h1>

      <SummaryCards total={total} paid={paid} unpaid={unpaid} count={filtered.length} />

      <Filters
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        status={status}
        onStatusChange={setStatus}
      />

      <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
        <DataTable data={filtered} columns={columns} onRowClick={(i: Invoice) => setSelected(i)} />
      </div>

      <Modal
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        title="Invoice Details"
        size="xl"
      >
        {selected && (
          <InvoiceDetails
            invoice={selected as any}
            vehicle={findVehicle(selected)}
            customer={findCustomer(selected)}
          />
        )}
      </Modal>
    </div>
  );
};

export default MemberInvoices;
