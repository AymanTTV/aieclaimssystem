// src/pages/members/MemberRentals.tsx
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
// 👇 adjust if your main component path differs
import RentalDetails from '../../components/rentals/RentalDetails';

type Rental = {
  id: string;
  customerId?: string;
  vehicleId?: string;
  startDate?: any;
  endDate?: any;
  createdAt?: any;
  status?: 'active' | 'completed' | 'pending' | string;
  totalDue?: number;
  totalPaid?: number;
};

const toJSDate = (v: any): Date | null => {
  if (!v) return null;
  if (typeof v?.toDate === 'function') return v.toDate();
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
};
const money = (n = 0) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(n || 0);

const SummaryCards: React.FC<{ active: number; completed: number; outstanding: number }> = ({ active, completed, outstanding }) => (
  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="text-sm text-gray-500">Active Rentals</div>
      <div className="mt-2 text-2xl font-semibold text-green-700">{active}</div>
    </div>
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="text-sm text-gray-500">Completed Rentals</div>
      <div className="mt-2 text-2xl font-semibold">{completed}</div>
    </div>
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="text-sm text-gray-500">Outstanding Balance</div>
      <div className="mt-2 text-2xl font-semibold text-amber-700">{money(outstanding)}</div>
    </div>
  </div>
);

const Filters: React.FC<{
  dateRange: { start: Date | null; end: Date | null };
  onDateRangeChange: (r: { start: Date | null; end: Date | null }) => void;
  status: 'all' | 'active' | 'completed' | 'pending';
  onStatusChange: (s: 'all' | 'active' | 'completed' | 'pending') => void;
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
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="pending">Pending</option>
        </select>
      </div>
    </div>
  </div>
);

const MemberRentals: React.FC = () => {
  const { customerId, loading: loadingCustomer } = useMemberCustomerId();
  const { vehicles } = useVehicles();
  const { customers } = useCustomers();

  const [rentals, setRentals] = useState<Rental[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Rental | null>(null);

  // fetch member-scoped rentals
  useEffect(() => {
    if (loadingCustomer) return;
    if (!customerId) { setRentals([]); setLoading(false); return; }
    setLoading(true);
    (async () => {
      try {
        // member vehicles
        const vSnap = await getDocs(query(collection(db, 'vehicles'), where('customerId', '==', customerId)));
        const vehicleIds = vSnap.docs.map(d => d.id);

        const q1 = await getDocs(query(collection(db, 'rentals'), where('customerId', '==', customerId)));
        const combined = new Map<string, any>();
        q1.forEach(doc => combined.set(doc.id, { id: doc.id, ...(doc.data() as any) }));

        if (vehicleIds.length) {
          const q2 = await getDocs(query(collection(db, 'rentals'), where('vehicleId', 'in', vehicleIds.slice(0, 10))));
          q2.forEach(doc => combined.set(doc.id, { id: doc.id, ...(doc.data() as any) }));
        }

        const sorted = Array.from(combined.values()).sort((a, b) => {
          const da = toJSDate(a.startDate) || toJSDate(a.createdAt);
          const dbb = toJSDate(b.startDate) || toJSDate(b.createdAt);
          return (dbb?.getTime() || 0) - (da?.getTime() || 0);
        });

        setRentals(sorted);
      } catch (e) {
        console.error(e);
        toast.error('Could not load rentals.');
      } finally {
        setLoading(false);
      }
    })();
  }, [customerId, loadingCustomer]);

  // filters
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({ start: null, end: null });
  const [status, setStatus] = useState<'all' | 'active' | 'completed' | 'pending'>('all');

  const filtered = useMemo(() => {
    return rentals.filter((r) => {
      const d = toJSDate(r.startDate) || toJSDate(r.createdAt);
      if (!d) return false;
      if (dateRange.start && d < dateRange.start) return false;
      if (dateRange.end) {
        const end = new Date(dateRange.end);
        end.setHours(23, 59, 59, 999);
        if (d > end) return false;
      }
      if (status !== 'all' && (r.status as any) !== status) return false;
      return true;
    });
  }, [rentals, dateRange, status]);

  // summary cards data
  const active = filtered.filter(r => r.status === 'active').length;
  const completed = filtered.filter(r => r.status === 'completed').length;
  const outstanding = filtered.reduce((sum, r) => {
    const due = (r.totalDue || 0) - (r.totalPaid || 0);
    return sum + (due > 0 ? due : 0);
  }, 0);

  const columns = [
    { header: 'Start Date', cell: ({ row }: any) => {
      const d = toJSDate(row.original.startDate) || toJSDate(row.original.createdAt);
      return d ? format(d, 'dd/MM/yyyy') : '—';
    }},
    { header: 'Status', cell: ({ row }: any) => <StatusBadge status={row.original.status || 'pending'} /> },
    { header: 'Total Due', cell: ({ row }: any) => money(row.original.totalDue || 0) },
    { header: 'Paid', cell: ({ row }: any) => money(row.original.totalPaid || 0) },
  ];

  const findVehicle = (r: Rental): Vehicle | undefined => r?.vehicleId ? vehicles.find(v => v.id === r.vehicleId) : undefined;
  const findCustomer = (r: Rental): Customer | undefined => r?.customerId ? customers.find(c => c.id === r.customerId) : undefined;

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
      <h1 className="text-2xl font-bold">My Rentals</h1>

      <SummaryCards active={active} completed={completed} outstanding={outstanding} />

      <Filters
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        status={status}
        onStatusChange={setStatus}
      />

      <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
        <DataTable data={filtered} columns={columns} onRowClick={(r: Rental) => setSelected(r)} />
      </div>

      <Modal
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        title="Rental Details"
        size="xl"
      >
        {selected && (
          <RentalDetails
            rental={selected as any}
            vehicle={findVehicle(selected)}
            customer={findCustomer(selected)}
          />
        )}
      </Modal>
    </div>
  );
};

export default MemberRentals;
