// src/pages/members/MemberFinance.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import useMemberCustomerId from './_useMemberCustomer';
import { Vehicle, Customer, Account, Transaction } from '../../types';
import { TrendingUp, TrendingDown, DollarSign, Percent } from 'lucide-react';
import { format } from 'date-fns';
import Modal from '../../components/ui/Modal';
import StatusBadge from '../../components/ui/StatusBadge';
import { DataTable } from '../../components/DataTable/DataTable';
import { useVehicles } from '../../hooks/useVehicles';
import { useCustomers } from '../../hooks/useCustomers';
import toast from 'react-hot-toast';
import TransactionDetails from '../../components/finance/TransactionDetails';

type MemberTransaction = Transaction;

// helpers
const toJSDate = (v: any): Date | null => {
  if (!v) return null;
  if (typeof v?.toDate === 'function') return v.toDate();
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
};
const formatCurrency = (n: number) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(n);
const safeNumber = (v: any) => (typeof v === 'number' && isFinite(v) ? v : Number(v || 0) || 0);

// summary cards
const MemberSummaryCards: React.FC<{
  totalIncome: number; totalExpenses: number; net: number; progressPct: number;
}> = ({ totalIncome, totalExpenses, net, progressPct }) => {
  const cards = [
    { key: 'paid', label: 'Total Paid', value: formatCurrency(totalIncome), tone: 'text-green-600', icon: <TrendingUp className="w-7 h-7" /> },
    { key: 'charges', label: 'Total Charges', value: formatCurrency(totalExpenses), tone: 'text-red-600', icon: <TrendingDown className="w-7 h-7" /> },
    { key: 'balance', label: 'Balance (Paid - Charges)', value: formatCurrency(net), tone: net >= 0 ? 'text-green-700' : 'text-amber-700', icon: <DollarSign className="w-7 h-7" /> },
    { key: 'progress', label: 'Payment Progress', value: new Intl.NumberFormat('en-GB', { style: 'percent', maximumFractionDigits: 0 }).format(progressPct / 100), tone: 'text-gray-900', icon: <Percent className="w-7 h-7" /> },
  ];
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map(c => (
        <div key={c.key} className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">{c.label}</div>
            <div className="opacity-60">{c.icon}</div>
          </div>
          <div className={`mt-2 text-2xl font-semibold ${c.tone}`}>{c.value}</div>
        </div>
      ))}
    </div>
  );
};

// filters (category removed)
const MemberFilters: React.FC<{
  dateRange: { start: Date | null; end: Date | null };
  onDateRangeChange: (r: { start: Date | null; end: Date | null }) => void;
  statusFilter: 'all' | 'paid' | 'unpaid' | 'partially_paid';
  onStatusFilterChange: (s: 'all' | 'paid' | 'unpaid' | 'partially_paid') => void;
}> = ({ dateRange, onDateRangeChange, statusFilter, onStatusFilterChange }) => (
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
        <label className="block text-sm font-medium text-gray-700">Payment Status</label>
        <select
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value as any)}
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

// table
const MemberTransactionsTable: React.FC<{
  transactions: Transaction[];
  onView: (t: Transaction) => void;
}> = ({ transactions, onView }) => {
  const columns = [
    { header: 'Date', cell: ({ row }: any) => {
      const d = toJSDate(row.original.date) || toJSDate(row.original.createdAt);
      return d ? format(d, 'dd/MM/yyyy') : '—';
    }},
    { header: 'Type', cell: ({ row }: any) => <StatusBadge status={row.original.type} /> },
    { header: 'Category', cell: ({ row }: any) => row.original.category || '—' },
    { header: 'Status', cell: ({ row }: any) => <StatusBadge status={row.original.paymentStatus} /> },
    { header: 'Amount', cell: ({ row }: any) => {
      const v = safeNumber(row.original.amount);
      const tone = (row.original.type || '').toLowerCase() === 'income' ? 'text-green-600' : 'text-red-600';
      return <span className={`font-medium ${tone}`}>{formatCurrency(v)}</span>;
    }},
  ];
  return <DataTable data={transactions} columns={columns} onRowClick={onView} />;
};

const MemberFinance: React.FC = () => {
  const { vehicles } = useVehicles();
  const { customers } = useCustomers();
  const { customerId, loading: loadingCustomer } = useMemberCustomerId();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<MemberTransaction[]>([]);
  const [loadingTx, setLoadingTx] = useState(true);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  // accounts for details modal (mirror main finance)
  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'accounts')), (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Account[];
      setAccounts(rows);
    }, () => toast.error('Failed to load accounts'));
    return () => unsub();
  }, []);

  // fetch transactions once we actually have/know the customerId
  useEffect(() => {
    if (loadingCustomer) return;               // <— don’t fetch yet
    if (!customerId) { setTransactions([]); setLoadingTx(false); return; }
    setLoadingTx(true);

    (async () => {
      try {
        // member vehicles
        const vSnap = await getDocs(query(collection(db, 'vehicles'), where('customerId', '==', customerId)));
        const vehicleIds = vSnap.docs.map(d => d.id);

        const queries = [
          getDocs(query(collection(db, 'transactions'), where('customerId', '==', customerId)))
        ];
        if (vehicleIds.length) {
          queries.push(getDocs(query(collection(db, 'transactions'), where('vehicleId', 'in', vehicleIds.slice(0, 10)))));
        }

        const results = await Promise.all(queries);
        const combined = new Map<string, any>();
        results.forEach(snap => snap.forEach(doc => combined.set(doc.id, { id: doc.id, ...(doc.data() as any) })));

        const sorted = Array.from(combined.values()).sort((a, b) => {
          const da = toJSDate(a.date) || toJSDate(a.createdAt);
          const dbb = toJSDate(b.date) || toJSDate(b.createdAt);
          return (dbb?.getTime() || 0) - (da?.getTime() || 0);
        });

        setTransactions(sorted as any);
      } catch (e) {
        console.error('Failed to fetch member transactions:', e);
        toast.error('Could not load transactions.');
      } finally {
        setLoadingTx(false);
      }
    })();
  }, [customerId, loadingCustomer]);

  // filters
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({ start: null, end: null });
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'unpaid' | 'partially_paid'>('all');

  const filteredTransactions: Transaction[] = useMemo(() => {
    return (transactions as any as Transaction[]).filter((t) => {
      const txDate = toJSDate((t as any).date) || toJSDate((t as any).createdAt);
      if (!txDate) return false;
      if (dateRange.start && txDate < dateRange.start) return false;
      if (dateRange.end) {
        const end = new Date(dateRange.end);
        end.setHours(23, 59, 59, 999);
        if (txDate > end) return false;
      }
      if (statusFilter !== 'all' && (t.paymentStatus as any) !== statusFilter) return false;
      return true;
    });
  }, [transactions, dateRange, statusFilter]);

  const totalIncome = filteredTransactions.filter((t) => (t.type || '').toLowerCase() === 'income').reduce((s, t) => s + safeNumber(t.amount), 0);
  const totalExpenses = filteredTransactions.filter((t) => (t.type || '').toLowerCase() === 'expense').reduce((s, t) => s + safeNumber(t.amount), 0);
  const net = totalIncome - totalExpenses;
  const progressPct = totalExpenses > 0 ? Math.max(0, Math.min(100, (totalIncome / totalExpenses) * 100)) : 100;

  const findVehicle = (t: Transaction) => t?.vehicleId ? vehicles.find(v => v.id === t.vehicleId) : undefined;
  const findCustomer = (t: Transaction) => t?.customerId ? customers.find(c => c.id === t.customerId) : undefined;

  // render
  if (loadingCustomer || loadingTx) {
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
      <h1 className="text-2xl font-bold">My Transactions</h1>

      <MemberSummaryCards
        totalIncome={totalIncome}
        totalExpenses={totalExpenses}
        net={net}
        progressPct={progressPct}
      />

      <MemberFilters
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
      />

      <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
        <MemberTransactionsTable
          transactions={filteredTransactions}
          onView={(t) => setSelectedTransaction(t)}
        />
      </div>

      <Modal
        isOpen={!!selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
        title="Transaction Details"
        size="xl"
      >
        {selectedTransaction && (
          <TransactionDetails
            transaction={selectedTransaction}
            vehicle={findVehicle(selectedTransaction)}
            customer={findCustomer(selectedTransaction)}
            accounts={accounts}
          />
        )}
      </Modal>
    </div>
  );
};

export default MemberFinance;
